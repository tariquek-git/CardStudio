import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthProvider';

export default function RegisterPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { register, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password, name || undefined);
      onNavigate('/');
    } catch {
      // error set in context
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || error;

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
          <h1 className="text-xl font-bold text-slate-200">Create an Account</h1>
          <p className="text-sm text-slate-500 mt-1">Save designs to the cloud and collaborate</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {displayError}
              <button type="button" onClick={() => { setLocalError(null); clearError(); }} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
              placeholder="Jane Smith"
            />
          </div>

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
              autoComplete="new-password"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => onNavigate('/login')}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            Already have an account? Sign in
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
