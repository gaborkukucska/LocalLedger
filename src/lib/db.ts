import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY; // Should be 32 bytes for AES-256
const IV_LENGTH = 16; // For AES, this is always 16

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function encrypt(text: string) {
  if (!ENCRYPTION_KEY) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
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
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    logger.error('Decryption failed, returning raw (might be unencrypted)', err);
    return text;
  }
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

export type IdentityType = 'PERSONAL' | 'SOLE_TRADER' | 'COMPANY';
export type AccountingMethod = 'CASH' | 'ACCRUAL';

export interface TaxIdentity {
  id: string;
  userId: string;
  name: string;
  type: IdentityType;
  accountingMethod: AccountingMethod;
  abn?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  identityId: string;
  date: string;
  description: string;
  amount: number; // Final amount in base currency (AUD)
  currency: string; // e.g. 'USD', 'AUD'
  originalAmount?: number; // Amount in foreign currency
  exchangeRate?: number;
  category: string;
  gstAmount: number;
  taxCode: 'GST' | 'FREE' | 'ITS' | 'EXM';
  status: 'PENDING' | 'REVIEWED' | 'RECONCILED';
  aiConfidence?: number; // 0 to 1
}

export interface InventoryItem {
  id: string;
  userId: string;
  identityId: string;
  name: string;
  sku: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
  category: string;
}

export interface LearningRule {
  id: string;
  userId: string;
  identityId: string;
  pattern: string;
  category: string;
  taxCode: Transaction['taxCode'];
}

export interface BankAccount {
  id: string;
  userId: string;
  identityId: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT';
  balance: number;
  currency: string;
}

interface AppData {
  users: User[];
  identities: TaxIdentity[];
  transactions: Transaction[];
  rules: LearningRule[];
  accounts: BankAccount[];
  inventory: InventoryItem[];
}

const defaultData: AppData = {
  users: [],
  identities: [],
  transactions: [],
  rules: [],
  accounts: [],
  inventory: [],
};

// In-Memory Cache
let cachedData: AppData | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

export const db = {
  read: (): AppData => {
    if (cachedData) return cachedData;
    
    try {
      if (!fs.existsSync(DB_FILE)) {
        cachedData = defaultData;
        return cachedData;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const decrypted = decrypt(raw);
      const data = JSON.parse(decrypted);
      
      // Migrations
      if (!data.users) data.users = [];
      if (!data.identities) data.identities = [];
      if (!data.inventory) data.inventory = [];
      
      // Update existing records with default currency if missing
      data.transactions = data.transactions.map((t: any) => ({
        ...t,
        currency: t.currency || 'AUD'
      }));
      data.accounts = data.accounts.map((a: any) => ({
        ...a,
        currency: a.currency || 'AUD'
      }));

      cachedData = data;
      return cachedData;
    } catch (err) {
      logger.error('Failed to read DB', err);
      cachedData = defaultData;
      return cachedData;
    }
  },
  write: (data: AppData) => {
    cachedData = data; // Instantly update memory
    
    // Debounce the actual disk save to prevent IO thrashing
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        const json = JSON.stringify(cachedData, null, 2);
        const encrypted = encrypt(json);
        fs.writeFileSync(DB_FILE, encrypted);
        logger.info('Database flushed to disk securely.');
      } catch (err) {
        logger.error('Failed to write DB', err);
      }
    }, 500); // 500ms debounce
  },
  // Users
  addUser: (username: string, passwordHash: string) => {
    const data = db.read();
    const newUser = { id: crypto.randomUUID(), username, passwordHash };
    data.users.push(newUser);
    
    // Auto-create a default Personal identity for new users
    const personalIdentity: TaxIdentity = {
      id: crypto.randomUUID(),
      userId: newUser.id,
      name: 'Personal Wallet',
      type: 'PERSONAL',
      accountingMethod: 'CASH'
    };
    data.identities.push(personalIdentity);
    
    db.write(data);
    return newUser;
  },
  // Identities
  getIdentities: (userId: string) => db.read().identities.filter(i => i.userId === userId),
  addIdentity: (userId: string, name: string, type: IdentityType, accountingMethod: AccountingMethod = 'CASH', abn?: string) => {
    const data = db.read();
    const newId: TaxIdentity = { id: crypto.randomUUID(), userId, name, type, accountingMethod, abn };
    data.identities.push(newId);
    db.write(data);
    return newId;
  },
  // Scoped Data Actions
  getTransactions: (userId: string, identityId: string) => 
    db.read().transactions.filter(t => t.userId === userId && t.identityId === identityId),
  
  addTransaction: (userId: string, identityId: string, tx: Omit<Transaction, 'id' | 'userId' | 'identityId'>) => {
    const data = db.read();
    const newTx = { ...tx, id: crypto.randomUUID(), userId, identityId };
    data.transactions.push(newTx);
    db.write(data);
    return newTx;
  },
  updateTransaction: (userId: string, identityId: string, id: string, updates: Partial<Transaction>) => {
    const data = db.read();
    const index = data.transactions.findIndex(t => t.id === id && t.userId === userId && t.identityId === identityId);
    if (index !== -1) {
      data.transactions[index] = { ...data.transactions[index], ...updates };
      db.write(data);
    }
  },
  getRules: (userId: string, identityId: string) => 
    db.read().rules.filter(r => r.userId === userId && r.identityId === identityId),
  
  addRule: (userId: string, identityId: string, rule: Omit<LearningRule, 'id' | 'userId' | 'identityId'>) => {
    const data = db.read();
    const newRule = { ...rule, id: crypto.randomUUID(), userId, identityId };
    data.rules.push(newRule);
    db.write(data);
    return newRule;
  },
  // Inventory
  getInventory: (userId: string, identityId: string) => 
    db.read().inventory.filter(i => i.userId === userId && i.identityId === identityId),
  
  addInventoryItem: (userId: string, identityId: string, item: Omit<InventoryItem, 'id' | 'userId' | 'identityId'>) => {
    const data = db.read();
    const newItem = { ...item, id: crypto.randomUUID(), userId, identityId };
    data.inventory.push(newItem);
    db.write(data);
    return newItem;
  },

  updateInventoryItem: (userId: string, identityId: string, id: string, updates: Partial<InventoryItem>) => {
    const data = db.read();
    const index = data.inventory.findIndex(i => i.id === id && i.userId === userId && i.identityId === identityId);
    if (index !== -1) {
      data.inventory[index] = { ...data.inventory[index], ...updates };
      db.write(data);
    }
  },

  deleteInventoryItem: (userId: string, identityId: string, id: string) => {
    const data = db.read();
    data.inventory = data.inventory.filter(i => !(i.id === id && i.userId === userId && i.identityId === identityId));
    db.write(data);
  }
};
