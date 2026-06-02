import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtp.host || !env.smtp.user) {
    console.warn('[Email] SMTP not configured — emails will be logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });

  return transporter;
}

export async function sendPasswordResetEmail(email, resetUrl) {
  const subject = 'Reset your password';
  const html = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset. Click the link below (valid for ${env.passwordResetExpiresHours} hour(s)):</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you did not request this, ignore this email.</p>
  `;

  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email] Password reset for ${email}: ${resetUrl}`);
    return;
  }

  await transport.sendMail({
    from: env.emailFrom,
    to: email,
    subject,
    html,
    text: `Reset your password: ${resetUrl}`,
  });
}
