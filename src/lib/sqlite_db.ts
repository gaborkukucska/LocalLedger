import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { logger } from './logger.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json'); // Legacy
const SQLITE_FILE = path.join(DATA_DIR, 'localedger.db');
const KEY_FILE = path.join(DATA_DIR, 'master.key');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure local encryption key exists
let ENCRYPTION_KEY: Buffer | undefined;

try {
  let rawKey = '';
  if (fs.existsSync(KEY_FILE)) {
    rawKey = fs.readFileSync(KEY_FILE, 'utf-8').trim();
  } else {
    // Generate secure local key at install time if not configured
    rawKey = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(KEY_FILE, rawKey, 'utf-8');
    logger.info('Generated new local master.key for SQLite database encryption.');
  }

  // Safely ensure the key is always 32 bytes by hashing the input using SHA-256
  // This supports users manually swapping the target master.key string securely
  ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest();
} catch (err) {
  logger.error('Failed to initialize local encryption key', err);
}

const IV_LENGTH = 16;

function encrypt(text: string) {
  if (!ENCRYPTION_KEY) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string) {
  if (!ENCRYPTION_KEY) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    logger.error('Decryption failed, returning raw', err);
    return text;
  }
}

// Field-level encryption wrappers
function encF(val: any) {
  if (val === null || val === undefined) return null;
  return encrypt(val.toString());
}

function decF(val: any, type: 'string' | 'number' = 'string') {
  if (val === null || val === undefined) return null;
  const decrypted = decrypt(val.toString());
  return type === 'number' ? Number(decrypted) : decrypted;
}

export interface User { id: string; username: string; passwordHash: string; salt: string; }
export type IdentityType = 'PERSONAL' | 'SOLE_TRADER' | 'COMPANY';
export type AccountingMethod = 'CASH' | 'ACCRUAL';
export interface TaxIdentity { id: string; userId: string; name: string; type: IdentityType; accountingMethod: AccountingMethod; abn?: string; }
export interface Transaction { id: string; userId: string; identityId: string; date: string; description: string; amount: number; currency: string; originalAmount?: number; exchangeRate?: number; category: string; gstAmount: number; taxCode: 'GST' | 'FREE' | 'ITS' | 'EXM'; status: 'PENDING' | 'REVIEWED' | 'RECONCILED'; aiConfidence?: number; }
export interface InventoryItem { id: string; userId: string; identityId: string; name: string; sku: string; quantity: number; costPrice: number; salePrice: number; category: string; }
export interface LearningRule { id: string; userId: string; identityId: string; pattern: string; category: string; taxCode: Transaction['taxCode']; }
export interface BankAccount { id: string; userId: string; identityId: string; name: string; type: 'CHECKING' | 'SAVINGS' | 'CREDIT'; balance: number; currency: string; }

// --- Password Hashing Utilities ---
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const hashVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
}

// Init SQLite
const sqlDb = new Database(SQLITE_FILE);

sqlDb.pragma('journal_mode = WAL');

sqlDb.exec(`
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, passwordHash TEXT, salt TEXT);
  CREATE TABLE IF NOT EXISTS identities (id TEXT PRIMARY KEY, userId TEXT, name TEXT, type TEXT, accountingMethod TEXT, abn TEXT);
  CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, userId TEXT, identityId TEXT, date TEXT, description TEXT, amount TEXT, category TEXT, gstAmount TEXT, taxCode TEXT, status TEXT, currency TEXT, exchangeRate TEXT, originalAmount TEXT);
  CREATE TABLE IF NOT EXISTS rules (id TEXT PRIMARY KEY, userId TEXT, identityId TEXT, pattern TEXT, category TEXT, taxCode TEXT);
  CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, userId TEXT, identityId TEXT, name TEXT, sku TEXT, quantity INTEGER, costPrice TEXT, salePrice TEXT, category TEXT);
  CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, userId TEXT, identityId TEXT, name TEXT, type TEXT, balance TEXT, currency TEXT);
`);

// MIGRATION: Add salt column to existing users table if it doesn't exist
const userCols = sqlDb.prepare('PRAGMA table_info(users)').all() as any[];
if (!userCols.find(c => c.name === 'salt')) {
  logger.info('Migrating users table to support password salts...');
  sqlDb.exec('ALTER TABLE users ADD COLUMN salt TEXT DEFAULT ""');
}

// MIGRATION: If sqlite users is empty, but old db.json exists, migrate it
const userCount = sqlDb.prepare('SELECT count(*) as count FROM users').get() as {count: number};
if (userCount.count === 0 && fs.existsSync(DB_FILE)) {
  logger.info('Migrating legacy JSON DB to SQLite with Column-Level Encryption...');
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const oldData = JSON.parse(decrypt(raw));
    
    sqlDb.transaction(() => {
      const insUser = sqlDb.prepare('INSERT INTO users VALUES (?, ?, ?, "")');
      for (const u of (oldData.users || [])) insUser.run(u.id, u.username, u.passwordHash);

      const insId = sqlDb.prepare('INSERT INTO identities VALUES (?, ?, ?, ?, ?, ?)');
      for (const i of (oldData.identities || [])) insId.run(i.id, i.userId, i.name, i.type, i.accountingMethod, i.abn || null);

      const insTx = sqlDb.prepare('INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const t of (oldData.transactions || [])) {
        insTx.run(t.id, t.userId, t.identityId, t.date, encF(t.description), encF(t.amount), t.category, encF(t.gstAmount), t.taxCode, t.status, t.currency || 'AUD', encF(t.exchangeRate), encF(t.originalAmount));
      }

      const insRule = sqlDb.prepare('INSERT INTO rules VALUES (?, ?, ?, ?, ?, ?)');
      for (const r of (oldData.rules || [])) insRule.run(r.id, r.userId, r.identityId, r.pattern, r.category, r.taxCode);

      const insInv = sqlDb.prepare('INSERT INTO inventory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const i of (oldData.inventory || [])) insInv.run(i.id, i.userId, i.identityId, encF(i.name), i.sku, i.quantity, encF(i.costPrice), encF(i.salePrice), i.category);

      const insAcc = sqlDb.prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const a of (oldData.accounts || [])) insAcc.run(a.id, a.userId, a.identityId, encF(a.name), a.type, encF(a.balance), a.currency || 'AUD');
    })();

    fs.renameSync(DB_FILE, DB_FILE + '.bak');
    logger.info('Migration complete. db.json moved to db.json.bak.');
  } catch (err) {
    logger.error('Migration failed!', err);
  }
}

// Database Export Object mirroring original db.ts
export const db = {
  // Users
  getUsers: (): User[] => sqlDb.prepare('SELECT * FROM users').all() as User[],
  addUser: (username: string, passwordHash: string, salt: string = "") => {
    const id = crypto.randomUUID();
    sqlDb.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').run(id, username, passwordHash, salt);
    const idId = crypto.randomUUID();
    sqlDb.prepare('INSERT INTO identities VALUES (?, ?, ?, ?, ?, ?)').run(idId, id, 'Personal Wallet', 'PERSONAL', 'CASH', null);
    return { id, username, passwordHash, salt };
  },
  updateUserPassword: (id: string, passwordHash: string, salt: string) => {
    sqlDb.prepare('UPDATE users SET passwordHash = ?, salt = ? WHERE id = ?').run(passwordHash, salt, id);
  },

  // Identities
  getIdentities: (userId: string): TaxIdentity[] => sqlDb.prepare('SELECT * FROM identities WHERE userId = ?').all(userId) as TaxIdentity[],
  addIdentity: (userId: string, name: string, type: IdentityType, accountingMethod: AccountingMethod = 'CASH', abn?: string) => {
    const id = crypto.randomUUID();
    sqlDb.prepare('INSERT INTO identities VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, name, type, accountingMethod, abn || null);
    return { id, userId, name, type, accountingMethod, abn };
  },

  // Transactions
  getTransactions: (userId: string, identityId: string): Transaction[] => {
    const rows = sqlDb.prepare('SELECT * FROM transactions WHERE userId = ? AND identityId = ?').all(userId, identityId) as any[];
    return rows.map(r => ({
      ...r,
      description: decF(r.description, 'string'),
      amount: decF(r.amount, 'number'),
      gstAmount: decF(r.gstAmount, 'number'),
      exchangeRate: decF(r.exchangeRate, 'number'),
      originalAmount: decF(r.originalAmount, 'number')
    }));
  },
  addTransaction: (userId: string, identityId: string, tx: Omit<Transaction, 'id' | 'userId' | 'identityId'>) => {
    const id = crypto.randomUUID();
    sqlDb.prepare('INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, userId, identityId, tx.date, encF(tx.description), encF(tx.amount), tx.category, encF(tx.gstAmount), tx.taxCode, tx.status, tx.currency || 'AUD', encF(tx.exchangeRate), encF(tx.originalAmount)
    );
    return { ...tx, id, userId, identityId };
  },
  updateTransaction: (userId: string, identityId: string, id: string, updates: Partial<Transaction>) => {
    // A bit manual, but dynamic update:
    const validKeys = ['date', 'description', 'amount', 'category', 'gstAmount', 'taxCode', 'status', 'currency', 'exchangeRate', 'originalAmount'];
    const sets: string[] = [];
    const values: any[] = [];
    for (const k of validKeys) {
      if (k in updates) {
        sets.push(`${k} = ?`);
        let val = (updates as any)[k];
        if (['description', 'amount', 'gstAmount', 'exchangeRate', 'originalAmount'].includes(k)) {
            val = encF(val);
        }
        values.push(val);
      }
    }
    if (sets.length === 0) return;
    values.push(id, userId, identityId);
    sqlDb.prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ? AND userId = ? AND identityId = ?`).run(...values);
  },

  // Rules
  getRules: (userId: string, identityId: string): LearningRule[] => sqlDb.prepare('SELECT * FROM rules WHERE userId = ? AND identityId = ?').all(userId, identityId) as LearningRule[],
  addRule: (userId: string, identityId: string, rule: Omit<LearningRule, 'id' | 'userId' | 'identityId'>) => {
    const id = crypto.randomUUID();
    sqlDb.prepare('INSERT INTO rules VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, identityId, rule.pattern, rule.category, rule.taxCode);
    return { ...rule, id, userId, identityId };
  },

  // Inventory
  getInventory: (userId: string, identityId: string): InventoryItem[] => {
    const rows = sqlDb.prepare('SELECT * FROM inventory WHERE userId = ? AND identityId = ?').all(userId, identityId) as any[];
    return rows.map(r => ({
      ...r,
      name: decF(r.name, 'string'),
      costPrice: decF(r.costPrice, 'number'),
      salePrice: decF(r.salePrice, 'number')
    }));
  },
  addInventoryItem: (userId: string, identityId: string, item: Omit<InventoryItem, 'id' | 'userId' | 'identityId'>) => {
    const id = crypto.randomUUID();
    sqlDb.prepare('INSERT INTO inventory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, userId, identityId, encF(item.name), item.sku, item.quantity, encF(item.costPrice), encF(item.salePrice), item.category
    );
    return { ...item, id, userId, identityId };
  },
  updateInventoryItem: (userId: string, identityId: string, id: string, updates: Partial<InventoryItem>) => {
    const validKeys = ['name', 'sku', 'quantity', 'costPrice', 'salePrice', 'category'];
    const sets: string[] = [];
    const values: any[] = [];
    for (const k of validKeys) {
      if (k in updates) {
        sets.push(`${k} = ?`);
        let val = (updates as any)[k];
        if (['name', 'costPrice', 'salePrice'].includes(k)) val = encF(val);
        values.push(val);
      }
    }
    if (sets.length === 0) return;
    values.push(id, userId, identityId);
    sqlDb.prepare(`UPDATE inventory SET ${sets.join(', ')} WHERE id = ? AND userId = ? AND identityId = ?`).run(...values);
  },
  deleteInventoryItem: (userId: string, identityId: string, id: string) => {
    sqlDb.prepare('DELETE FROM inventory WHERE id = ? AND userId = ? AND identityId = ?').run(id, userId, identityId);
  },

  // Accounts
  getAccounts: (userId: string, identityId: string): BankAccount[] => {
    const rows = sqlDb.prepare('SELECT * FROM accounts WHERE userId = ? AND identityId = ?').all(userId, identityId) as any[];
    return rows.map(r => ({
      ...r,
      name: decF(r.name, 'string'),
      balance: decF(r.balance, 'number')
    }));
  }
};
