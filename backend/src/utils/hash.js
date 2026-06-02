import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { env } from '../config/env.js';

export async function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptRounds);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
