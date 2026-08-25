// ============================================================
// LoginPage — role-aware demo login screen
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const DEMO_ACCOUNTS = [
  { email: 'farmer@sentinel.demo',  role: 'Farmer',        color: '#15803d' },
  { email: 'paravet@sentinel.demo', role: 'Para-vet',      color: '#0284c7' },
  { email: 'vet@sentinel.demo',     role: 'Veterinarian',  color: '#7c3aed' },
  { email: 'lab@sentinel.demo',     role: 'Lab Tech',      color: '#b45309' },
  { email: 'officer@sentinel.demo', role: 'Gov. Officer',  color: '#dc2626' },
  { email: 'admin@sentinel.demo',   role: 'Admin',         color: '#374151' },
];

export function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login, loginError }   = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 400)); // simulate latency
    const ok = login(email, password);
    setLoading(false);
    if (ok) navigate('/dashboard');
  };

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo1234');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sentinel-950 via-sentinel-900 to-sentinel-800 flex flex-col items-center justify-center p-4">
      {/* Card */}
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-400/20 border border-green-400/30 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-green-300" />
          </div>
          <h1 className="text-2xl font-800 text-white">Livestock Sentinel</h1>
          <p className="text-green-300/70 text-sm mt-1">Animal Health Response System</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 text-xs font-500">Hackathon Prototype · SIH 2025</span>
          </div>
        </div>

        {/* Login form */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-600 text-green-100 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-400"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-600 text-green-100 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-400 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="text-red-300 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2 bg-green-500 hover:bg-green-400"
            >
              <LogIn size={16} />
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Quick demo login */}
          <div className="mt-5">
            <p className="text-xs font-600 text-white/40 uppercase tracking-wider mb-3 text-center">
              Quick Demo Login
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickLogin(acc.email)}
                  className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-700"
                    style={{ backgroundColor: acc.color + '66' }}
                  >
                    {acc.role[0]}
                  </div>
                  <span className="text-white/70 text-xs font-500 leading-tight text-center">
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-center text-white/30 text-xs mt-2">
              Password for all demo accounts: <code className="text-white/50">demo1234</code>
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-white/30 text-xs mt-5 leading-relaxed">
          This system is a hackathon prototype. It is NOT a replacement for NADRES, INAPH, e-GOPALA, or WAHIS.
          All data shown is synthetic.
        </p>
      </div>
    </div>
  );
}
