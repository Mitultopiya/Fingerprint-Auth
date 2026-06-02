import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [users, credentials, activeTokens] = await Promise.all([
      prisma.user.count(),
      prisma.webAuthnCredential.count(),
      prisma.refreshToken.count({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);

    res.json({
      success: true,
      data: { users, passkeys: credentials, activeRefreshTokens: activeTokens },
    });
  })
);

export default router;
