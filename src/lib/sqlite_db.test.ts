import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './sqlite_db';

describe('Password Hashing Functions', () => {
  it('should generate a hash and salt', () => {
    const password = 'mySuperSecretPassword123!';
    const { hash, salt } = hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    
    expect(salt).toBeDefined();
    expect(typeof salt).toBe('string');
    expect(salt.length).toBeGreaterThan(0);
  });

  it('should verify a correct password', () => {
    const password = 'correctHorseBatteryStaple';
    const { hash, salt } = hashPassword(password);
    
    const isValid = verifyPassword(password, hash, salt);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', () => {
    const password = 'correctHorseBatteryStaple';
    const { hash, salt } = hashPassword(password);
    
    const isInvalid = verifyPassword('wrongpassword', hash, salt);
    expect(isInvalid).toBe(false);
  });

  it('should produce different salts for the same password', () => {
    const password = 'samePassword';
    const result1 = hashPassword(password);
    const result2 = hashPassword(password);
    
    expect(result1.salt).not.toBe(result2.salt);
    expect(result1.hash).not.toBe(result2.hash);
  });
});
