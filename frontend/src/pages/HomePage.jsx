import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold shadow-lg shadow-brand-600/30">
          FP
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Fingerprint Authentication System
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Production-ready auth with email/password, JWT refresh tokens, and
          WebAuthn passkeys (Touch ID, Face ID, Windows Hello).
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button>Get started</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary">Sign in</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
