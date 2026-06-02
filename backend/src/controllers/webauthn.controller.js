import * as webauthnService from '../services/webauthn.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const registrationOptions = asyncHandler(async (req, res) => {
  const options = await webauthnService.getRegistrationOptions(req.user.id);
  res.json({ success: true, data: options });
});

export const verifyRegistration = asyncHandler(async (req, res) => {
  const result = await webauthnService.verifyRegistration(
    req.user.id,
    req.body
  );
  res.json({ success: true, data: result });
});

export const authenticationOptions = asyncHandler(async (req, res) => {
  const { options } = await webauthnService.getAuthenticationOptions(
    req.body.email
  );
  res.json({ success: true, data: options });
});

export const verifyAuthentication = asyncHandler(async (req, res) => {
  const { email, ...credentialResponse } = req.body;
  const data = await webauthnService.verifyAuthentication(
    credentialResponse,
    email
  );
  res.json({ success: true, data });
});

export const listCredentials = asyncHandler(async (req, res) => {
  const credentials = await webauthnService.listCredentials(req.user.id);
  res.json({ success: true, data: credentials });
});

export const deleteCredential = asyncHandler(async (req, res) => {
  const result = await webauthnService.deleteCredential(
    req.user.id,
    req.params.credentialId
  );
  res.json({ success: true, ...result });
});
