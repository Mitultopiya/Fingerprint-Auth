import { prisma } from '../config/database.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt.js';
import { hashToken, generateSecureToken } from '../utils/hash.js';
import { UnauthorizedError } from '../utils/errors.js';

export function buildTokenPayload(user) {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
}

export function issueAccessToken(user) {
  return signAccessToken(buildTokenPayload(user));
}

export async function issueRefreshToken(user) {
  const rawToken = generateSecureToken(48);
  const tokenHash = hashToken(rawToken);
  const expiresAt = getRefreshTokenExpiry();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const jwtRefresh = signRefreshToken({ sub: user.id, jti: tokenHash });

  return { refreshToken: jwtRefresh, rawTokenHash: tokenHash };
}

export async function rotateRefreshToken(oldJwt, user) {
  let decoded;
  try {
    decoded = verifyRefreshToken(oldJwt);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const tokenHash = decoded.jti;
  if (!tokenHash) {
    throw new UnauthorizedError('Invalid refresh token format');
  }

  const stored = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      userId: user.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!stored) {
    throw new UnauthorizedError('Refresh token revoked or expired');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueRefreshToken(user);
}

export async function revokeRefreshToken(jwt) {
  try {
    const decoded = verifyRefreshToken(jwt);
    if (decoded.jti) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: decoded.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  } catch {
    // Token may already be invalid on logout
  }
}

export async function revokeAllUserRefreshTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function authResponse(user, accessToken, refreshToken) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}
