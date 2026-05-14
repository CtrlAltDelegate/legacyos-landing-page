import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, fullName);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-medium text-ink">LegacyOS</h1>
          <p className="text-sm text-muted mt-1">The family office your advisor can't sell you</p>
        </div>

        <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-medium text-ink mb-5">Create your account</h2>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30 focus:border-flo-600"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30 focus:border-flo-600"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30 focus:border-flo-600"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink/80 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-flo-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
