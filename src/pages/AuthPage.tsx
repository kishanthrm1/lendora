import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left side — branding */}
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden bg-teal-700 p-8 text-white lg:p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-teal-300 blur-3xl" />
          <div className="absolute right-0 top-1/2 h-96 w-96 rounded-full bg-teal-400 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-400 blur-3xl" />
        </div>

        <Link to="/" className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <RefreshCw className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold">Lendora</span>
        </Link>

        <div className="relative">
          <h1 className="font-display text-3xl font-bold leading-tight lg:text-4xl">
            Try it before
            <br />
            you buy it.
          </h1>
          <p className="mt-4 max-w-sm text-teal-100">
            Borrow anything from your community. Test it, live with it, and only buy it if you love it.
          </p>

          <div className="mt-8 flex gap-6">
            <div>
              <p className="font-display text-2xl font-bold">2,400+</p>
              <p className="text-sm text-teal-200">Items listed</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold">18k+</p>
              <p className="text-sm text-teal-200">Happy borrowers</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold">4.9</p>
              <p className="text-sm text-teal-200">Avg rating</p>
            </div>
          </div>
        </div>

        <p className="relative text-sm text-teal-200">© 2026 Lendora. All rights reserved.</p>
      </div>

      {/* Right side — form */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm animate-slide-up">
          <h2 className="font-display text-2xl font-bold text-gray-900">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {mode === 'signup'
              ? 'Start borrowing or lending items today.'
              : 'Sign in to manage your items and bookings.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="input-field pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError(null);
              }}
              className="font-semibold text-teal-600 hover:text-teal-700"
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
