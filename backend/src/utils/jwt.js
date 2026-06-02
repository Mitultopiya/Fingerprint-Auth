import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
    issuer: 'fingerprint-auth-api',
    audience: 'fingerprint-auth-client',
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
    issuer: 'fingerprint-auth-api',
    audience: 'fingerprint-auth-client',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret, {
    issuer: 'fingerprint-auth-api',
    audience: 'fingerprint-auth-client',
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret, {
    issuer: 'fingerprint-auth-api',
    audience: 'fingerprint-auth-client',
  });
}

export function getRefreshTokenExpiry() {
  const match = env.jwt.refreshExpiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [, amount, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(Date.now() + parseInt(amount, 10) * multipliers[unit]);
}
