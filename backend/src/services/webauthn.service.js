import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import {
  issueAccessToken,
  issueRefreshToken,
  authResponse,
} from './token.service.js';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors.js';

// In-memory challenge store (use Redis in production at scale)
const challenges = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const WEBAUTHN_TIMEOUT_MS = 120_000;

function mapAllowCredentials(credentials) {
  return credentials.map((cred) => {
    const entry = { id: cred.credentialId };
    if (cred.transports?.length) {
      entry.transports = cred.transports;
    }
    return entry;
  });
}

function setChallenge(key, challenge) {
  challenges.set(key, { challenge, expires: Date.now() + CHALLENGE_TTL_MS });
}

function getChallenge(key) {
  const entry = challenges.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    challenges.delete(key);
    return null;
  }
  challenges.delete(key);
  return entry.challenge;
}

function bufferToBase64url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function base64urlToBuffer(value) {
  return Buffer.from(value, 'base64url');
}

/** Normalize credential id from browser or Prisma (must match registration response.id). */
function normalizeCredentialId(id) {
  if (typeof id === 'string') {
    return id.trim();
  }
  if (Buffer.isBuffer(id) || id instanceof Uint8Array) {
    return bufferToBase64url(id);
  }
  return bufferToBase64url(Buffer.from(id));
}

async function findStoredCredential(webAuthnCredentialId) {
  const normalized = normalizeCredentialId(webAuthnCredentialId);

  let stored = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: normalized },
    include: { user: true },
  });
  if (stored) return stored;

  // Padding / encoding variants
  try {
    const buf = Buffer.from(normalized, 'base64url');
    const alt = buf.toString('base64url');
    if (alt !== normalized) {
      stored = await prisma.webAuthnCredential.findUnique({
        where: { credentialId: alt },
        include: { user: true },
      });
    }
  } catch {
    /* ignore */
  }

  return stored;
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  emailVerified: true,
  createdAt: true,
};

export async function getRegistrationOptions(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { webauthnCredentials: true },
  });
  if (!user) throw new NotFoundError('User not found');

  const options = await generateRegistrationOptions({
    rpName: env.webauthn.rpName,
    rpID: env.webauthn.rpID,
    userName: user.email,
    userDisplayName: user.name || user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    timeout: WEBAUTHN_TIMEOUT_MS,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
    excludeCredentials: mapAllowCredentials(user.webauthnCredentials),
  });

  setChallenge(`reg:${userId}`, options.challenge);
  return options;
}

export async function verifyRegistration(userId, response) {
  const expectedChallenge = getChallenge(`reg:${userId}`);
  if (!expectedChallenge) {
    throw new ValidationError('Registration challenge expired or invalid');
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: env.webauthn.origin,
    expectedRPID: env.webauthn.rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new ValidationError('WebAuthn registration verification failed');
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  // Must match response.id used on login (browser base64url)
  const credentialId = normalizeCredentialId(response.id);

  await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports || [],
    },
  });

  return { verified: true, credentialId };
}

export async function getAuthenticationOptions(email) {
  const normalizedEmail =
    typeof email === 'string' ? email.trim().toLowerCase() : '';
  let user;

  if (normalizedEmail) {
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { webauthnCredentials: true },
    });
    if (!user || user.webauthnCredentials.length === 0) {
      throw new NotFoundError(
        'No passkeys for this account. Sign in with password, then register one on the Dashboard.'
      );
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: env.webauthn.rpID,
    timeout: WEBAUTHN_TIMEOUT_MS,
    userVerification: 'preferred',
    allowCredentials: user?.webauthnCredentials?.length
      ? mapAllowCredentials(user.webauthnCredentials)
      : undefined,
  });

  const challengeKey = normalizedEmail
    ? `auth:${normalizedEmail}`
    : `auth:discoverable:${options.challenge}`;
  setChallenge(challengeKey, options.challenge);

  return { options, email: user?.email };
}

export async function verifyAuthentication(response, emailHint) {
  const storedCred = await findStoredCredential(response.id);

  if (!storedCred) {
    throw new UnauthorizedError(
      'Unknown passkey. Remove old passkeys on the Dashboard and register Touch ID again.'
    );
  }

  const email = (emailHint || storedCred.user.email).trim().toLowerCase();

  if (emailHint && storedCred.user.email !== email) {
    throw new UnauthorizedError('This passkey does not belong to that email address');
  }

  const expectedChallenge = getChallenge(`auth:${email}`);
  if (!expectedChallenge) {
    throw new ValidationError('Authentication challenge expired or invalid');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: env.webauthn.origin,
    expectedRPID: env.webauthn.rpID,
    credential: {
      id: base64urlToBuffer(storedCred.credentialId),
      publicKey: storedCred.publicKey,
      counter: Number(storedCred.counter),
      transports: storedCred.transports,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    throw new UnauthorizedError('Passkey verification failed');
  }

  const newCounter = verification.authenticationInfo.newCounter;
  const prevCounter = Number(storedCred.counter);

  // Platform passkeys (Touch ID / Face ID) often keep counter at 0 — only enforce when it increases
  if (newCounter > 0 && newCounter <= prevCounter) {
    throw new UnauthorizedError('Passkey counter validation failed — possible cloned credential');
  }

  const nextCounter = newCounter > prevCounter ? newCounter : prevCounter;

  await prisma.webAuthnCredential.update({
    where: { id: storedCred.id },
    data: {
      counter: BigInt(nextCounter),
      lastUsedAt: new Date(),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: storedCred.userId },
    select: userSelect,
  });

  const accessToken = issueAccessToken(user);
  const { refreshToken } = await issueRefreshToken(user);

  return authResponse(user, accessToken, refreshToken);
}

export async function listCredentials(userId) {
  return prisma.webAuthnCredential.findMany({
    where: { userId },
    select: {
      id: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}

export async function deleteCredential(userId, credentialId) {
  const cred = await prisma.webAuthnCredential.findFirst({
    where: { id: credentialId, userId },
  });
  if (!cred) throw new NotFoundError('Credential not found');
  await prisma.webAuthnCredential.delete({ where: { id: credentialId } });
  return { message: 'Passkey removed' };
}
