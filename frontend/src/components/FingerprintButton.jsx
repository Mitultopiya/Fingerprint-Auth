import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import { webauthnService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { formatWebAuthnError } from '../utils/webauthnErrors';

/**
 * Safari/macOS require a fresh user gesture for WebAuthn.
 * Fetch options first, then run biometric on a second click.
 */
export function FingerprintRegisterButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingOptions, setPendingOptions] = useState(null);

  const prepareRegistration = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setPendingOptions(null);
    try {
      const { data: optionsRes } = await webauthnService.registrationOptions();
      setPendingOptions(optionsRes.data);
    } catch (err) {
      setError(formatWebAuthnError(err));
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    if (!pendingOptions) return;
    setLoading(true);
    setError('');
    try {
      const attResp = await startRegistration({
        optionsJSON: pendingOptions,
        useBrowserNativeUI: true,
      });
      await webauthnService.verifyRegistration(attResp);
      setSuccess('Fingerprint / passkey registered successfully.');
      setPendingOptions(null);
    } catch (err) {
      setError(formatWebAuthnError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!pendingOptions ? (
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={prepareRegistration}
          className="w-full"
        >
          Register fingerprint / passkey
        </Button>
      ) : (
        <>
          <p className="text-center text-sm text-slate-400">
            Ready — confirm with Touch ID / Face ID
          </p>
          <Button
            type="button"
            loading={loading}
            onClick={completeRegistration}
            className="w-full"
          >
            Confirm with Touch ID
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full !text-xs"
            onClick={() => setPendingOptions(null)}
          >
            Cancel
          </Button>
        </>
      )}
      <Alert type="error" message={error} />
      <Alert type="success" message={success} />
    </div>
  );
}

export function FingerprintLoginButton({ email }) {
  const { loginWithWebAuthn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingOptions, setPendingOptions] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');

  const prepareLogin = async () => {
    const normalizedEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail) {
      setError('Enter your email first to use fingerprint login.');
      return;
    }
    setLoading(true);
    setError('');
    setPendingOptions(null);
    try {
      const { data: optionsRes } =
        await webauthnService.loginOptions(normalizedEmail);
      setPendingOptions(optionsRes.data);
      setPendingEmail(normalizedEmail);
    } catch (err) {
      setError(formatWebAuthnError(err));
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = async () => {
    if (!pendingOptions || !pendingEmail) return;
    setLoading(true);
    setError('');
    try {
      const authResp = await startAuthentication({
        optionsJSON: pendingOptions,
        useBrowserNativeUI: true,
      });
      const { data: verifyRes } = await webauthnService.verifyLogin(
        authResp,
        pendingEmail
      );
      await loginWithWebAuthn(verifyRes.data);
      setPendingOptions(null);
      setPendingEmail('');
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatWebAuthnError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!pendingOptions ? (
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={prepareLogin}
          className="w-full"
        >
          Sign in with fingerprint
        </Button>
      ) : (
        <>
          <p className="text-center text-sm text-slate-400">
            Ready — confirm with Touch ID / Face ID
          </p>
          <Button
            type="button"
            loading={loading}
            onClick={completeLogin}
            className="w-full"
          >
            Confirm with Touch ID
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full !text-xs"
            onClick={() => {
              setPendingOptions(null);
              setPendingEmail('');
            }}
          >
            Cancel
          </Button>
        </>
      )}
      <Alert type="error" message={error} />
    </div>
  );
}
