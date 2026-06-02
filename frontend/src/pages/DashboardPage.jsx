import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { authService, webauthnService } from '../services/authService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { FingerprintRegisterButton } from '../components/FingerprintButton';

export default function DashboardPage() {
  const { user, logout, updateProfile, isAdmin } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  const profileForm = useForm({
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  });

  const pwdForm = useForm();

  useEffect(() => {
    profileForm.reset({ name: user?.name || '', email: user?.email || '' });
  }, [user]);

  useEffect(() => {
    webauthnService.listCredentials().then(({ data }) => {
      setCredentials(data.data || []);
    }).catch(() => {});
  }, []);

  const onProfileSubmit = async (data) => {
    setProfileMsg('');
    setProfileErr('');
    try {
      await updateProfile(data);
      setProfileMsg('Profile updated');
    } catch (err) {
      setProfileErr(err.response?.data?.message || 'Update failed');
    }
  };

  const onPasswordSubmit = async (data) => {
    setPwdMsg('');
    setPwdErr('');
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPwdMsg('Password changed. Other sessions were signed out.');
      pwdForm.reset();
    } catch (err) {
      setPwdErr(err.response?.data?.message || 'Password change failed');
    }
  };

  const removeCredential = async (id) => {
    await webauthnService.deleteCredential(id);
    setCredentials((c) => c.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold">
              FP
            </span>
            <span className="font-semibold text-white">Dashboard</span>
            {isAdmin && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">{user?.email}</span>
            <Button variant="ghost" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">Profile</h2>
          <p className="mt-1 text-sm text-slate-400">
            Role: <span className="text-slate-200">{user?.role}</span>
          </p>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <Alert type="error" message={profileErr} />
            <Alert type="success" message={profileMsg} />
            <Input label="Name" {...profileForm.register('name')} />
            <Input label="Email" type="email" {...profileForm.register('email')} />
            <div className="sm:col-span-2">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">Fingerprint / Passkeys</h2>
          <p className="mt-1 text-sm text-slate-400">
            Register Touch ID, Face ID, or Windows Hello for passwordless sign-in.
          </p>
          <div className="mt-4 max-w-md">
            <FingerprintRegisterButton />
          </div>
          {credentials.length > 0 && (
            <ul className="mt-6 space-y-2">
              {credentials.map((cred) => (
                <li
                  key={cred.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm"
                >
                  <div>
                    <span className="text-slate-200">{cred.deviceType || 'Passkey'}</span>
                    <span className="ml-2 text-slate-500">
                      Added {new Date(cred.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    className="!py-1.5 !text-xs"
                    onClick={() => removeCredential(cred.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">Change password</h2>
          <form
            onSubmit={pwdForm.handleSubmit(onPasswordSubmit)}
            className="mt-4 max-w-md space-y-4"
          >
            <Alert type="error" message={pwdErr} />
            <Alert type="success" message={pwdMsg} />
            <Input
              label="Current password"
              type="password"
              {...pwdForm.register('currentPassword', { required: true })}
            />
            <Input
              label="New password"
              type="password"
              {...pwdForm.register('newPassword', { required: true, minLength: 8 })}
            />
            <Button type="submit">Update password</Button>
          </form>
        </section>

        <p className="text-center text-sm text-slate-500">
          <Link to="/" className="text-brand-400 hover:text-brand-300">
            Home
          </Link>
        </p>
      </main>
    </div>
  );
}
