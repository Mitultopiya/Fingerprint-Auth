import { prisma } from '../config/database.js';
import { hashPassword, comparePassword, hashToken, generateSecureToken } from '../utils/hash.js';
import {
  issueAccessToken,
  issueRefreshToken,
  authResponse,
  revokeAllUserRefreshTokens,
} from './token.service.js';
import { sendPasswordResetEmail } from './email.service.js';
import { env } from '../config/env.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
};

export async function register({ email, password, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: userSelect,
  });

  const accessToken = issueAccessToken(user);
  const { refreshToken } = await issueRefreshToken(user);

  return authResponse(user, accessToken, refreshToken);
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const safeUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: userSelect,
  });

  const accessToken = issueAccessToken(safeUser);
  const { refreshToken } = await issueRefreshToken(safeUser);

  return authResponse(safeUser, accessToken, refreshToken);
}

export async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to prevent email enumeration
  if (!user) return { message: 'If the email exists, a reset link has been sent' };

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.passwordResetExpiresHours * 60 * 60 * 1000
  );

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return { message: 'If the email exists, a reset link has been sent' };
}

export async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);
  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!resetRecord) {
    throw new ValidationError('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { message: 'Password reset successful' };
}

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSelect,
      webauthnCredentials: {
        select: {
          id: true,
          deviceType: true,
          createdAt: true,
          lastUsedAt: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function updateProfile(userId, { name, email }) {
  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });
    if (taken) throw new ConflictError('Email already in use');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { ...(name !== undefined && { name }), ...(email && { email }) },
    select: userSelect,
  });
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await revokeAllUserRefreshTokens(userId);
  return { message: 'Password updated successfully' };
}
