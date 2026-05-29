import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Gem } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <Gem className="h-5 w-5 text-brand-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">LegacyOS</span>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">📬</div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">Check your inbox</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                If an account exists for <strong>{email}</strong>, we've sent a reset link.
                It expires in 1 hour.
              </p>
              <Link to="/login" className="mt-6 btn-primary w-full justify-center block text-center">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h1>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email and we'll send a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-500">
                Remember your password?{' '}
                <Link to="/login" className="text-brand-600 font-medium hover:text-brand-800">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
