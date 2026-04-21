import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFile = path.join(LOG_DIR, 'app.log');

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  AUDIT = 'AUDIT',
}

export const logger = {
  log: (level: LogLevel, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
    
    // Console output
    console.log(entry.trim());
    
    // File output
    try {
      fs.appendFileSync(logFile, entry);
    } catch (err) {
      console.error('Failed to write to log file', err);
    }
  },
  info: (message: string, data?: any) => logger.log(LogLevel.INFO, message, data),
  warn: (message: string, data?: any) => logger.log(LogLevel.WARN, message, data),
  error: (message: string, data?: any) => logger.log(LogLevel.ERROR, message, data),
  debug: (message: string, data?: any) => logger.log(LogLevel.DEBUG, message, data),
  audit: (message: string, data?: any) => logger.log(LogLevel.AUDIT, message, data),
};
