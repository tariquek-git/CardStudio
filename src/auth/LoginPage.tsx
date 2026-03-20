import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthProvider';

export default function LoginPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      onNavigate('/');
    } catch {
      // error is set in context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" />
              <rect x="4" y="7" width="4" height="3" rx="0.5" fill="white" opacity="0.8" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-200">Sign in to Card Studio</h1>
          <p className="text-sm text-slate-500 mt-1">Design payment cards in 3D</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
              <button type="button" onClick={clearError} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => onNavigate('/register')}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            Don't have an account? Sign up
          </button>
          <div>
            <button
              onClick={() => onNavigate('/')}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Continue without account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
