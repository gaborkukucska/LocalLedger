import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-change-me';

export const security = {
  encrypt: (text: string): string => {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  },
  decrypt: (cipherText: string): string => {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
};
