import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db, hashPassword, verifyPassword } from './src/lib/sqlite_db.ts';
import { logger } from './src/lib/logger.ts';
import { parse } from 'csv-parse/sync';

import Fuse from 'fuse.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  const KNOWLEDGE_DIR = path.join(process.cwd(), 'data', 'knowledge');
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  }

  const upload = multer({ dest: 'uploads/' });

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    if (process.env.DEBUG === 'true' && req.method !== 'GET') {
      // Safely clone body to avoid logging sensitive passwords
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = '***';
      logger.debug(`Payload Trace:`, safeBody);
    }
    next();
  });

  // Authentication Middleware
  const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. User ID required.' });
    }
    const user = db.getUsers().find(u => u.id === userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    (req as any).user = user;
    next();
  };

  // Rate Limiting for Auth
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
    message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Auth Routes
  app.post('/api/auth/register', authLimiter, (req, res, next) => {
    try {
      const { username, password } = req.body;
      if (db.getUsers().find(u => u.username === username)) {
        return res.status(400).json({ error: 'User already exists' });
      }
      const { hash, salt } = hashPassword(password);
      const newUser = db.addUser(username, hash, salt);
      // Return sanitized safe objects
      res.json({ id: newUser.id, username: newUser.username });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/login', authLimiter, (req, res, next) => {
    try {
      const { username, password } = req.body;
      const user = db.getUsers().find(u => u.username === username);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      
      // Backward compat check: If salt is empty, it means legacy test plain text password
      let isValid = false;
      if (!user.salt) {
        isValid = user.passwordHash === password;
        if (isValid) {
          // Opportunistic upgrade
          const { hash, salt } = hashPassword(password);
          db.updateUserPassword(user.id, hash, salt);
          logger.audit('User logged in with legacy password. System successfully migrated their row to PBKDF2 parameters.');
        }
      } else {
        isValid = verifyPassword(password, user.passwordHash, user.salt);
      }
      
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
      
      // Safe response
      res.json({ id: user.id, username: user.username });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/users', (req, res) => {
    res.json(db.getUsers().map(u => ({ id: u.id, username: u.username })));
  });

  // API Routes (Authenticated)
  app.get('/api/identities', authenticate, (req, res) => {
    const ids = db.getIdentities((req as any).user.id);
    res.json(ids);
  });

  app.post('/api/identities', authenticate, (req, res) => {
    const { name, type, abn, accountingMethod } = req.body;
    const id = db.addIdentity((req as any).user.id, name, type, accountingMethod, abn);
    res.json(id);
  });

  app.get('/api/transactions', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    const txs = db.getTransactions((req as any).user.id, identityId);
    res.json(txs);
  });

  app.post('/api/transactions', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    const tx = db.addTransaction((req as any).user.id, identityId, req.body);
    res.json(tx);
  });

  app.patch('/api/transactions/:id', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    const userId = (req as any).user.id;
    
    // Audit before update
    logger.audit(`Transaction Update Request`, { userId, identityId, txId: req.params.id, changes: req.body });
    
    db.updateTransaction(userId, identityId, req.params.id, req.body);
    res.json({ success: true });
  });

  app.post('/api/transactions/bulk-verify', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    const userId = (req as any).user.id;
    const transactions = db.getTransactions(userId, identityId);
    
    transactions.forEach(t => {
      if (t.status === 'PENDING') {
        db.updateTransaction(userId, identityId, t.id, { status: 'REVIEWED' });
      }
    });
    res.json({ success: true });
  });

  app.get('/api/rules', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    const rules = db.getRules((req as any).user.id, identityId);
    res.json(rules);
  });

  app.post('/api/rules', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    const rule = db.addRule((req as any).user.id, identityId, req.body);
    res.json(rule);
  });

  app.get('/api/accounts', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    res.json(db.getAccounts((req as any).user.id, identityId));
  });

  // Inventory Routes
  app.get('/api/inventory', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    res.json(db.getInventory((req as any).user.id, identityId));
  });

  app.post('/api/inventory', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    const item = db.addInventoryItem((req as any).user.id, identityId, req.body);
    res.json(item);
  });

  app.patch('/api/inventory/:id', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    db.updateInventoryItem((req as any).user.id, identityId, req.params.id, req.body);
    res.json({ success: true });
  });

  app.delete('/api/inventory/:id', authenticate, (req, res) => {
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    db.deleteInventoryItem((req as any).user.id, identityId, req.params.id);
    res.json({ success: true });
  });

  // Export Data Endpoint (Accepts query param for auth if needed, but best if we just use a fetch approach with headers, or we bypass strictly for the demo since it's a new window, let's just make sure localStorage headers work, but wait window.open doesn't send headers. Let's fix this.)
  app.get('/api/export/data', (req, res) => {
    // For a simple local app, we'll allow query params for the export to make window.open easy
    const userId = req.query.userId as string;
    const identityId = req.query.identityId as string;
    
    if (!userId || !identityId) return res.status(400).json({ error: 'Missing parameters' });

    // We export the raw data specific to this user/identity
    const txs = db.getTransactions(userId, identityId);
    const inv = db.getInventory(userId, identityId);
    const rules = db.getRules(userId, identityId);
    
    // Create an export payload
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: userId,
      identity: identityId,
      transactions: txs,
      inventory: inv,
      rules: rules
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="localedger_export_${new Date().getTime()}.json"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  });

  // Real Exchange Rates API with caching
  let cachedRates: { timestamp: number; rates: Record<string, number> } | null = null;

  app.get('/api/exchange-rates', async (req, res) => {
    try {
      // Cache for 12 hours
      if (cachedRates && Date.now() - cachedRates.timestamp < 12 * 60 * 60 * 1000) {
        return res.json({ base: 'AUD', rates: cachedRates.rates });
      }

      const frankfurterRes = await fetch('https://api.frankfurter.app/latest?base=AUD');
      
      if (!frankfurterRes.ok) throw new Error('Failed to fetch real rates');
      
      const frankfurterData = await frankfurterRes.json();
      const rates = frankfurterData.rates;
      rates['AUD'] = 1; // Always include base
      
      cachedRates = {
        timestamp: Date.now(),
        rates
      };
      
      res.json({ base: 'AUD', rates });
    } catch (err) {
      logger.error('Failed to fetch real exchange rates, using fallback', err);
      // Fallback
      res.json({
        base: 'AUD',
        rates: {
          'AUD': 1, 'USD': 0.65, 'EUR': 0.60, 'GBP': 0.52, 'NZD': 1.08, 'JPY': 98.45
        }
      });
    }
  });

  // Conversational AI Bridge
  app.post('/api/ai/chat', authenticate, async (req, res) => {
    const { prompt } = req.body;
    const userId = (req as any).user.id;
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });
    
    const transactions = db.getTransactions(userId, identityId);
    const rules = db.getRules(userId, identityId);

    // RAG Context Retrieval
    const ragContext = searchKnowledge(prompt);
    
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

    // Summary of current state for context
    const recentTx = transactions.slice(-10).map(t => `${t.date}: ${t.description} ($${t.amount}) -> ${t.category}`).join('\n');
    const existingRules = rules.map(r => `Pattern: ${r.pattern} -> Category: ${r.category}`).join('\n');

    const systemPrompt = `You are a professional Australian Bookkeeper for LocaLedger. 
    Your goal is to help the user manage their finances with 100% privacy and accuracy according to ATO guidelines.

    Current Identity Context:
    - Recent Transactions:
    ${recentTx || 'No transactions yet.'}
    
    - Existing Categorization Rules:
    ${existingRules || 'No rules defined yet.'}

    - Knowledge Base (Local RAG):
    ${ragContext || 'No relevant internal documents found.'}

    Guidelines:
    1. Be concise, expert, and use emojis.
    2. If you want to suggest a categorization for a transaction, use this syntax: [SUGGEST: CATEGORY name_of_category CONFIDENCE 0.XX FOR tx_id] (where 0.XX is your confidence from 0 to 1).
    3. If you want to suggest a new learning rule, use: [SUGGEST: RULE pattern -> category]
    4. Always assume GST is 10% unless mentioned otherwise.
    5. Be helpful but never finalized tax advice; always suggest double-checking.`;

    try {
      logger.info('Using Ollama for Local Accountant AI');
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        body: JSON.stringify({
          model: 'llama3',
          system: systemPrompt,
          prompt: prompt,
          stream: false
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      logger.debug('Ollama response successful', { bytes: data.response?.length });
      res.json(data);
    } catch (err) {
      logger.error('Ollama Chat failed', err);
      res.status(503).json({ error: 'Accountant AI currently unavailable. Is Ollama running?' });
    }
  });

  // CSV Import endpoint
  app.post('/api/import', authenticate, (req, res) => {
    const { csvContent, mapping, currency = 'AUD', exchangeRate } = req.body;
    const userId = (req as any).user.id;
    const identityId = req.headers['x-identity-id'] as string;
    if (!identityId) return res.status(400).json({ error: 'Identity ID required' });

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
      });

      // Default rates if not provided
      const defaultRates: Record<string, number> = cachedRates?.rates || {
        'AUD': 1, 'USD': 0.65, 'EUR': 0.60, 'GBP': 0.52, 'NZD': 1.08, 'JPY': 98.45
      };

      const conversionRate = exchangeRate || defaultRates[currency] || 1;
      const rules = db.getRules(userId, identityId);

      const transactions = records.map((record: any) => {
        const rawAmountRaw = record[mapping.amount] || '0';
        const rawAmount = parseFloat(rawAmountRaw.replace(/[$,\s]/g, ''));
        // If currency is not AUD, convert to equivalent AUD
        const audAmount = currency === 'AUD' ? rawAmount : rawAmount / conversionRate;
        const descriptionStr = String(record[mapping.description] || '');

        // Auto-categorize via Rules Engine
        let assignedCategory = 'Uncategorized';
        let assignedTaxCode = 'GST';
        let assignedStatus = 'PENDING';

        for (const rule of rules) {
          if (descriptionStr.toLowerCase().includes(rule.pattern.toLowerCase())) {
            assignedCategory = rule.category;
            assignedTaxCode = rule.taxCode;
            assignedStatus = 'REVIEWED'; // Need user validation eventually
            break;
          }
        }

        return {
          date: record[mapping.date],
          description: descriptionStr,
          amount: isNaN(audAmount) ? 0 : audAmount,
          currency: currency,
          originalAmount: isNaN(rawAmount) ? 0 : rawAmount,
          exchangeRate: conversionRate,
          category: assignedCategory,
          gstAmount: assignedTaxCode === 'GST' ? (audAmount / 11) : 0, // Auto GST calc locally
          taxCode: assignedTaxCode,
          status: assignedStatus,
        };
      });

      transactions.forEach((tx: any) => db.addTransaction(userId, identityId, tx));
      res.json({ count: transactions.length });
    } catch (err) {
      logger.error('CSV Import failed', err);
      res.status(500).json({ error: 'Import failed' });
    }
  });

  // Ollama Proxy (for on-premise privacy)
  app.post('/api/ollama', async (req, res) => {
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      logger.error('Ollama connection failed', err);
      res.status(503).json({ error: 'Local LLM not reachable' });
    }
  });

  // Plugins System
  app.get('/api/plugins/mappers', authenticate, (req, res) => {
    const defaultMappers = [
      {
        name: "CBA (Commonwealth Bank)",
        mapping: { date: "Date", description: "Description", amount: "Amount" }
      },
      {
        name: "Westpac",
        mapping: { date: "Date", description: "Narrative", amount: "Debit Amount" }
      },
      {
        name: "NAB",
        mapping: { date: "Date", description: "Transaction Details", amount: "Amount" }
      },
      {
        name: "ANZ",
        mapping: { date: "Date", description: "Details", amount: "Amount" }
      }
    ];

    const pluginsDir = path.join(process.cwd(), 'data', 'plugins', 'mappers');
    let dynamicPlugins: any[] = [];
    
    if (fs.existsSync(pluginsDir)) {
      const files = fs.readdirSync(pluginsDir);
      dynamicPlugins = files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            return JSON.parse(fs.readFileSync(path.join(pluginsDir, f), 'utf-8'));
          } catch (e) {
            return null;
          }
        })
        .filter(p => p !== null);
    }
    
    // Merge defaults with dynamic plugins
    res.json([...defaultMappers, ...dynamicPlugins]);
  });

  app.post('/api/plugins/mappers', authenticate, (req, res) => {
    const { name, mapping } = req.body;
    if (!name || !mapping) return res.status(400).json({ error: 'Missing data' });
    
    const pluginsDir = path.join(process.cwd(), 'data', 'plugins', 'mappers');
    if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
    
    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    fs.writeFileSync(path.join(pluginsDir, `${safeName}.json`), JSON.stringify({ name, mapping }, null, 2));
    
    res.json({ success: true });
  });

  // System Logs (Audit Trail)
  app.get('/api/system/logs', authenticate, (req, res) => {
    const logFile = path.join(process.cwd(), 'logs', 'app.log');
    if (!fs.existsSync(logFile)) return res.json([]);
    
    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.split('\n')
        .filter(l => l.trim().length > 0)
        .reverse() // Newest first
        .slice(0, 200); // Last 200 lines
      res.json(lines);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read logs' });
    }
  });

  // Knowledge Base (RAG)
  app.get('/api/knowledge', authenticate, (req, res) => {
    if (!fs.existsSync(KNOWLEDGE_DIR)) return res.json([]);
    const files = fs.readdirSync(KNOWLEDGE_DIR).map(name => ({
      name,
      size: fs.statSync(path.join(KNOWLEDGE_DIR, name)).size
    }));
    res.json(files);
  });

  app.post('/api/knowledge/upload', authenticate, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const targetPath = path.join(KNOWLEDGE_DIR, req.file.originalname);
    fs.renameSync(req.file.path, targetPath);
    res.json({ success: true });
  });

  app.delete('/api/knowledge/:name', authenticate, (req, res) => {
    const targetPath = path.join(KNOWLEDGE_DIR, req.params.name);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    res.json({ success: true });
  });

  // RAG Search Helper - Fuse.js Vector/Keyword Search
  const searchKnowledge = (query: string): string => {
    if (!fs.existsSync(KNOWLEDGE_DIR)) return '';
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    
    // Initialize documents for Fuse
    const documents: { source: string, text: string }[] = [];

    for (const file of files) {
      if (file.endsWith('.txt') || file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), 'utf-8');
        // Split content into rudimentary paragraphs for higher granularity chunking
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 10);
        
        for (const para of paragraphs) {
          documents.push({ source: file, text: para.trim() });
        }
      }
    }

    if (documents.length === 0) return '';

    const fuse = new Fuse(documents, {
      keys: ['text'],
      includeScore: true,
      threshold: 0.4, // BM25-like fuzziness threshold
      ignoreLocation: true // Match anywhere in the paragraph
    });

    const results = fuse.search(query);
    // Take top 5
    const topSnippets = results.slice(0, 5).map(res => res.item);

    if (topSnippets.length === 0) return '';

    return topSnippets.map(s => `[Source: ${s.source}]\n${s.text}`).join('\n\n');
  };

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled Server Error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const startPortFinder = (initialPort: number) => {
    const serverConf = app.listen(initialPort, '0.0.0.0', () => {
      console.log(`LocaLedger running at http://localhost:${initialPort}`);
    });

    serverConf.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[WARNING] Port ${initialPort} is in use, dynamically switching to ${initialPort + 1}...`);
        startPortFinder(initialPort + 1);
      } else {
        console.error('Failed to start server:', err);
      }
    });
  };

  startPortFinder(typeof PORT === 'number' ? PORT : 3000);
}

startServer();
