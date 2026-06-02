import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: passwordSchema,
    name: z.string().min(1).max(100).trim().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: passwordSchema,
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    email: z.string().email().toLowerCase().trim().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  }),
});

export const webauthnLoginOptionsSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim().optional(),
  }),
});
