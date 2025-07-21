import * as crypto from 'crypto';
import { writeEnvFile, readEnvFile } from './handleEnv.js';

const ALGORITHM = 'aes-256-gcm';

// Generate a random 32-byte key (hex) for AES-256
function generateKey() {
   return crypto.randomBytes(32).toString('hex');
}

function encryptData(data, key) {
   const plainText = typeof data === 'string' ? data : JSON.stringify(data);
   const iv = crypto.randomBytes(12);
   const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
   let encrypted = cipher.update(plainText, 'utf8', 'hex');
   encrypted += cipher.final('hex');
   const tag = cipher.getAuthTag();
   return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decryptData(cipherText, key, { json = false } = {}) {
   const [ivHex, tagHex, encrypted] = cipherText.split(':');
   const iv = Buffer.from(ivHex, 'hex');
   const tag = Buffer.from(tagHex, 'hex');
   const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
   decipher.setAuthTag(tag);
   let decrypted = decipher.update(encrypted, 'hex', 'utf8');
   decrypted += decipher.final('utf8');
   if (json) return JSON.parse(decrypted);
   return decrypted;
}

function ensureSecretKeyInEnv(envPath = '.env') {
   const envObj = readEnvFile(envPath);
   if (envObj.XCC_SECRET_KEY) return; // Already exists, do nothing

   const key = generateKey();
   writeEnvFile({ XCC_SECRET_KEY: key }, envPath);
}

export { encryptData, decryptData, ensureSecretKeyInEnv }