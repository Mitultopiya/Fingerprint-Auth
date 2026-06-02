import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as webauthnController from '../controllers/webauthn.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { webauthnLoginOptionsSchema } from '../validators/auth.validator.js';

const router = Router();

const webauthnLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/register/options',
  authenticate,
  webauthnLimiter,
  webauthnController.registrationOptions
);

router.post(
  '/register/verify',
  authenticate,
  webauthnLimiter,
  webauthnController.verifyRegistration
);

router.post(
  '/login/options',
  webauthnLimiter,
  validate(webauthnLoginOptionsSchema),
  webauthnController.authenticationOptions
);

router.post(
  '/login/verify',
  webauthnLimiter,
  webauthnController.verifyAuthentication
);

router.get('/credentials', authenticate, webauthnController.listCredentials);

router.delete(
  '/credentials/:credentialId',
  authenticate,
  webauthnController.deleteCredential
);

export default router;
