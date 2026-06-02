import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }

  if (err instanceof AppError) {
    const body = {
      success: false,
      code: err.code,
      message: err.message,
    };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  console.error('[Error]', err);

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: env.isProduction ? 'Internal server error' : err.message,
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
