import * as authService from '../services/auth.service.js';
import * as tokenService from '../services/token.service.js';
import { verifyRefreshToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/database.js';
import { UnauthorizedError } from '../utils/errors.js';

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  res.status(201).json({ success: true, data });
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.json({ success: true, data });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken =
    req.body.refreshToken || req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }

  const decoded = verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) throw new UnauthorizedError('User not found');

  const accessToken = tokenService.issueAccessToken(user);
  const { refreshToken: newRefresh } = await tokenService.rotateRefreshToken(
    refreshToken,
    user
  );

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken: newRefresh,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken =
    req.body.refreshToken || req.cookies?.refreshToken;
  if (refreshToken) {
    await tokenService.revokeRefreshToken(refreshToken);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json({ success: true, ...result });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json({ success: true, ...result });
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  res.json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await authService.updateProfile(req.user.id, req.body);
  res.json({ success: true, data: profile });
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body);
  res.json({ success: true, ...result });
});
