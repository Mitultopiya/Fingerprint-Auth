import { Router } from 'express';
import authRoutes from './auth.routes.js';
import webauthnRoutes from './webauthn.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/webauthn', webauthnRoutes);
router.use('/admin', adminRoutes);

export default router;
