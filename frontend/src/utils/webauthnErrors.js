export function formatWebAuthnError(err) {
  const message = err?.message || '';
  const name = err?.name || '';

  if (
    name === 'NotAllowedError' ||
    message.includes('timed out') ||
    message.includes('not allowed')
  ) {
    return (
      'Touch ID was cancelled or blocked. Steps: (1) Use Chrome or Safari on http://localhost:5173. ' +
      '(2) Sign in with password → Dashboard → register passkey again (old passkeys may not work). ' +
      '(3) Click Confirm with Touch ID when the system dialog appears.'
    );
  }

  if (name === 'SecurityError' || message.includes('relying party')) {
    return 'WebAuthn security error — use http://localhost:5173 and check WEBAUTHN_ORIGIN in backend .env.';
  }

  if (name === 'InvalidStateError') {
    return 'This passkey is already registered on this device.';
  }

  return err?.response?.data?.message || message || 'Passkey operation failed';
}
