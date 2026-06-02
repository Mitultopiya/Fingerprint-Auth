import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { authService } from '../services/authService';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ password }) => {
    if (!token) {
      setError('Invalid reset link. Request a new one.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({ token, password });
      navigate('/login', { state: { message: 'Password reset. Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <Alert type="error" message="Missing reset token." />
        <Link to="/forgot-password" className="mt-4 block text-center text-brand-400">
          Request new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" subtitle="Choose a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Alert type="error" message={error} />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
          })}
        />
        <Button type="submit" loading={loading} className="w-full">
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
