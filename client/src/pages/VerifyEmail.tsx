import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Gem } from 'lucide-react';
import { api } from '@/api/client';
import Spinner from '@/components/Spinner';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <Gem className="h-5 w-5 text-brand-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">LegacyOS</span>
        </div>

        <div className="card text-center py-8">
          {status === 'loading' && (
            <>
              <Spinner className="h-8 w-8 text-brand-600 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-3xl mb-3">✅</div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">Email verified!</h1>
              <p className="text-sm text-gray-500 mb-6">Your account is fully activated.</p>
              <Link to="/dashboard" className="btn-primary w-full justify-center">Go to dashboard</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-3xl mb-3">⚠️</div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">Verification failed</h1>
              <p className="text-sm text-gray-500 mb-6">
                This link is invalid or has already been used. You can request a new one from your account settings.
              </p>
              <Link to="/dashboard" className="btn-primary w-full justify-center">Go to dashboard</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
