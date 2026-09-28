import crypto from 'crypto';

/**
 * Hashes a plain-text password using a random 16-byte salt and PBKDF2.
 * Returns the hash in salt:hash hex format.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain-text password against a salt:hash string stored in the database.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  const salt = parts[0];
  const originalHash = parts[1];
  
  if (!salt || !originalHash) {
    return false;
  }
  
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}
