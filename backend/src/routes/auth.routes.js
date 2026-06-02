import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many requests, try again later' },
});

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register
);

router.post('/login', authLimiter, validate(loginSchema), authController.login);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refresh
);

router.post('/logout', authController.logout);

router.post(
  '/forgot-password',
  strictLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

router.get('/profile', authenticate, authController.getProfile);

router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  authController.updateProfile
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
