import * as bcrypt from 'bcryptjs';

const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    const valid = await bcrypt.compare(plain, stored);
    return { valid, needsRehash: false };
  }
  // Legacy plain text — compare directly, flag for rehash on success
  const valid = plain === stored;
  return { valid, needsRehash: valid };
}
