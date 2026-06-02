import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';

async function start() {
  try {
    await prisma.$connect();
    console.log('[DB] Connected to PostgreSQL');

    app.listen(env.port, () => {
      console.log(`[Server] Running on ${env.apiUrl} (${env.nodeEnv})`);
      console.log(`[WebAuthn] RP ID: ${env.webauthn.rpID}, Origin: ${env.webauthn.origin}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
