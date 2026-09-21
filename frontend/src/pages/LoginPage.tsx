import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useBranding } from '../branding/BrandingContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { getApiErrorMessage } from '../utils/apiErrors';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { branding } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="login-wrap split-view">
      {/* Panel Izquierdo: Branding */}
      <div className="login-visual-panel">
        <div className="login-visual-content">
          {branding.logoUrl && !logoBroken ? (
            <img
              src={branding.logoUrl}
              alt={`${branding.companyName} logo`}
              className="login-logo-hero"
              onError={() => setLogoBroken(true)}
            />
          ) : (
            <span className="brand-mark huge">{branding.companyName.charAt(0).toUpperCase()}</span>
          )}
          <h1 className="hero-title">{branding.companyName}</h1>
          {branding.tagline && <p className="hero-tagline">{branding.tagline}</p>}
        </div>
        <div className="visual-background-mesh"></div>
      </div>

      {/* Panel Derecho: Formulario */}
      <div className="login-form-panel">
        <div className="login-top">
          <LanguageSwitcher />
        </div>
        <div className="login-form-container">
          <form className="form login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-form-header">
              <h2>{t('auth.title')}</h2>
              <p className="muted">{t('auth.subtitle', 'Welcome back! Please enter your details.')}</p>
            </div>
            <label className="field modern">
              <span>{t('auth.email')}</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                placeholder="name@company.com"
              />
            </label>
            <label className="field modern">
              <span>{t('auth.password')}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn primary block modern-btn" disabled={saving}>
              {saving ? t('common.saving') : t('auth.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
