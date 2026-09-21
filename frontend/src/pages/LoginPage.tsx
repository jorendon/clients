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
    <div className="login-wrap">
      <div className="login-top">
        <LanguageSwitcher />
      </div>
      <form className="card form login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-brand">
          {branding.logoUrl && !logoBroken ? (
            <img
              src={branding.logoUrl}
              alt={`${branding.companyName} logo`}
              className="login-logo"
              onError={() => setLogoBroken(true)}
            />
          ) : (
            <span className="brand-mark big">OC</span>
          )}
          <h1>{branding.companyName}</h1>
          {branding.tagline && <p className="muted">{branding.tagline}</p>}
        </div>
        <h2>{t('auth.title')}</h2>
        <label className="field">
          <span>{t('auth.email')}</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </label>
        <label className="field">
          <span>{t('auth.password')}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn primary block" disabled={saving}>
          {saving ? t('common.saving') : t('auth.submit')}
        </button>
      </form>
    </div>
  );
}
