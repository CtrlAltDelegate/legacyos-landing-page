import { useState } from 'react';
import { GetServerSideProps } from 'next';
import { getSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials. Please try again.');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoType: 'johnson' | 'rodriguez') => {
    setLoading(true);
    
    const demoCredentials = {
      johnson: { email: 'demo@johnson.com', password: 'demo123' },
      rodriguez: { email: 'demo@rodriguez.com', password: 'demo123' }
    };

    const creds = demoCredentials[demoType];
    
    const result = await signIn('credentials', {
      email: creds.email,
      password: creds.password,
      redirect: false,
    });

    if (!result?.error) {
      router.push('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Login - LegacyOS</title>
        <meta name="description" content="Access your family office dashboard" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-2000"></div>
        </div>

        {/* Back to Home Link */}
        <Link 
          href="/"
          className="absolute top-6 left-6 bg-white/20 text-white px-4 py-2 rounded-lg font-medium backdrop-blur-sm hover:bg-white/30 transition-all"
        >
          ← Back to Home
        </Link>

        {/* Login Container */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-br from-neutral-800 to-neutral-700 text-white px-8 py-12 text-center relative">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-white rounded-full"></div>
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent mb-2">
                LegacyOS
              </h1>
              <p className="text-neutral-300 text-lg">Your Family Office Platform</p>
            </div>
          </div>

          {/* Login Form */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">Welcome Back</h2>
              <p className="text-neutral-600">Continue building your family's legacy</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-neutral-200 rounded-xl bg-neutral-50 focus:border-primary-500 focus:bg-white focus:outline-none transition-all"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-neutral-200 rounded-xl bg-neutral-50 focus:border-primary-500 focus:bg-white focus:outline-none transition-all pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-primary-500"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 text-primary-500 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-neutral-700">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-primary-500 hover:text-primary-600 font-medium">
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
              >
                Access Your Family Office
              </Button>
            </form>

            {/* Demo Section */}
            <div className="mt-8 bg-neutral-50 rounded-xl p-6 border border-neutral-200">
              <div className="flex items-center gap-2 font-semibold text-neutral-800 mb-4">
                <span>🎮</span>
                <span>Try a Demo Account</span>
              </div>
              
              <div className="space-y-3">
                <DemoAccountCard
                  avatar="JJ"
                  name="The Johnson Family"
                  stats="Net Worth: $47K • 6 wings active"
                  score="73"
                  onClick={() => handleDemoLogin('johnson')}
                  loading={loading}
                />
                
                <DemoAccountCard
                  avatar="MR"
                  name="The Rodriguez Family"
                  stats="Net Worth: $425K • 6 wings active"
                  score="89"
                  onClick={() => handleDemoLogin('rodriguez')}
                  loading={loading}
                />
              </div>
            </div>

            <div className="text-center mt-6 text-neutral-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary-500 hover:text-primary-600 font-semibold">
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DemoAccountCard({ 
  avatar, 
  name, 
  stats, 
  score, 
  onClick, 
  loading 
}: {
  avatar: string;
  name: string;
  stats: string;
  score: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full bg-white border border-neutral-200 rounded-lg p-4 hover:border-primary-500 hover:bg-neutral-50 transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
          {avatar}
        </div>
        <div className="text-left">
          <div className="font-semibold text-neutral-800 text-sm">{name}</div>
          <div className="text-neutral-600 text-xs">{stats}</div>
        </div>
      </div>
      <div className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-semibold">
        Score: {score}
      </div>
    </button>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  if (session) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return { props: {} };
}; 