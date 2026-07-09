import { scrypt, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ENCRYPTION_SECRET = process.env.SESSION_SECRET || 'project_hub_fallback_secret_key_32_characters_long_minimum';

/**
 * Hash a plain text password using scrypt with a random salt.
 * Returns the hash formatted as salt:derivedKey.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a plain text password against a stored salt:derivedKey hash.
 * Employs timingSafeEqual to protect against timing attacks.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split(':');
  if (parts.length !== 2) return false;
  
  const [salt, key] = parts;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  
  return timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Encrypt a string symmetrically using AES-256-GCM.
 */
export function encryptToken(token: string): string {
  if (!token) return '';
  const iv = randomBytes(IV_LENGTH);
  const salt = randomBytes(SALT_LENGTH);
  const key = pbkdf2Sync(ENCRYPTION_SECRET, salt, 100000, KEY_LENGTH, 'sha256');
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    encrypted.toString('hex'),
    tag.toString('hex')
  ].join(':');
}

/**
 * Decrypt a string symmetrically using AES-256-GCM.
 */
export function decryptToken(encryptedString: string | null | undefined): string {
  if (!encryptedString) return '';
  
  const parts = encryptedString.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted token format');
  }
  
  const [saltHex, ivHex, encryptedHex, tagHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const key = pbkdf2Sync(ENCRYPTION_SECRET, salt, 100000, KEY_LENGTH, 'sha256');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  return decipher.update(encrypted) + decipher.final('utf8');
}
