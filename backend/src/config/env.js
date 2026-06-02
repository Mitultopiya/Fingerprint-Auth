import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function resolvePort() {
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10);
  }
  const apiUrl = process.env.API_URL;
  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      if (parsed.port) return parseInt(parsed.port, 10);
      return parsed.protocol === 'https:' ? 443 : 80;
    } catch {
      /* fall through */
    }
  }
  return 5000;
}

const port = resolvePort();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  apiUrl: process.env.API_URL || `http://localhost:${port}`,
  clientUrl: requireEnv('CLIENT_URL'),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  webauthn: {
    rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    rpName: process.env.WEBAUTHN_RP_NAME || 'Fingerprint Auth System',
    origin: process.env.WEBAUTHN_ORIGIN || process.env.CLIENT_URL,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  emailFrom: process.env.EMAIL_FROM || 'Fingerprint Auth <noreply@localhost>',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  passwordResetExpiresHours: parseInt(process.env.PASSWORD_RESET_EXPIRES_HOURS || '1', 10),
  isProduction: process.env.NODE_ENV === 'production',
};
