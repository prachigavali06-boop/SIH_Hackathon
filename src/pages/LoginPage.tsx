import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n/useLanguage';
import { LanguageSelector } from '../components/layout/LanguageSelector';

const DEMO_ACCOUNTS = [
  { email: 'farmer@sentinel.demo',  roleKey: 'farmer',        color: '#15803d' },
  { email: 'paravet@sentinel.demo', roleKey: 'paravet',       color: '#0284c7' },
  { email: 'vet@sentinel.demo',     roleKey: 'veterinarian',  color: '#7c3aed' },
  { email: 'lab@sentinel.demo',     roleKey: 'lab_tech',      color: '#b45309' },
  { email: 'officer@sentinel.demo', roleKey: 'gov_officer',   color: '#dc2626' },
  { email: 'admin@sentinel.demo',   roleKey: 'admin',         color: '#374151' },
];

export function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login, loginError }   = useAuthStore();
  const { t, tRole }            = useLanguage();
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
    <div className="min-h-screen bg-gradient-to-br from-sentinel-950 via-sentinel-900 to-sentinel-800 flex flex-col items-center justify-center p-4 relative">
      {/* Top language selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector variant="pills" />
      </div>

      {/* Card */}
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-400/20 border border-green-400/30 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-green-300" />
          </div>
          <h1 className="text-2xl font-800 text-white">{t('login.title', 'Livestock Sentinel')}</h1>
          <p className="text-green-300/70 text-sm mt-1">{t('login.subtitle', 'Animal Health Response System')}</p>
        </div>

        {/* Login form */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-600 text-green-100 mb-1.5">
                {t('login.emailLabel', 'Email Address')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder', 'Enter your email')}
                className="form-input bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-400"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-600 text-green-100 mb-1.5">
                {t('login.passwordLabel', 'Password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder', 'Enter password')}
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
              className="btn btn-primary w-full mt-2 bg-green-500 hover:bg-green-400 font-700"
            >
              <LogIn size={16} />
              {loading ? t('login.signingIn', 'Signing in…') : t('login.signInButton', 'Sign In')}
            </button>
          </form>

          {/* Quick demo login */}
          <div className="mt-5">
            <p className="text-xs font-600 text-white/40 uppercase tracking-wider mb-3 text-center">
              {t('login.quickDemoLogin', 'Quick Demo Login')}
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
                    {acc.roleKey[0].toUpperCase()}
                  </div>
                  <span className="text-white/70 text-xs font-500 leading-tight text-center">
                    {tRole(acc.roleKey)}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-center text-white/30 text-xs mt-2">
              {t('login.demoPasswordHint', 'Password for all demo accounts:')} <code className="text-white/50">demo1234</code>
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-white/30 text-xs mt-5 leading-relaxed">
          {t('login.disclaimer', 'Authorized surveillance & response platform. All clinical decisions require verified credentials.')}
        </p>
      </div>
    </div>
  );
}
