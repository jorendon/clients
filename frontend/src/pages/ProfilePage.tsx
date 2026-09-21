import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { fetchProfile, updateProfile, type ProfileData } from '../api/profile';
import { useAuth } from '../auth/AuthContext';
import { getApiErrorMessage } from '../utils/apiErrors';

export function ProfilePage() {
  const { t } = useTranslation();
  const { updateSessionUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setEmail(p.email);
      })
      .catch((err) => setError(getApiErrorMessage(t, err)))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password && password !== confirmPassword) {
      setError(t('profile.passwordMismatch'));
      return;
    }

    if (password && password.length < 6) {
      setError(t('form.errors.password'));
      return;
    }

    setSaving(true);
    try {
      const input: Record<string, string> = {};
      if (name !== profile?.name) input.name = name;
      if (email !== profile?.email) input.email = email;
      if (password) input.password = password;

      if (Object.keys(input).length === 0) {
        setSuccess(t('profile.noChanges'));
        setSaving(false);
        return;
      }

      const updated = await updateProfile(input);
      setProfile(updated);
      setPassword('');
      setConfirmPassword('');
      setSuccess(t('profile.saved'));

      // Actualizar la sesión local si cambió nombre o email
      if (input.name || input.email) {
        updateSessionUser({
          name: updated.name,
          email: updated.email,
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card empty">
        <p className="empty-title">{t('common.saving')}…</p>
      </div>
    );
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <p className="eyebrow">{t('profile.eyebrow')}</p>
          <h1>{t('profile.title')}</h1>
          <p className="muted">{t('profile.subtitle')}</p>
        </div>
      </div>
      <form className="card form" onSubmit={handleSubmit} noValidate>
        <div className="profile-avatar">
          <User size={48} />
          <div>
            <strong>{profile?.name}</strong>
            <p className="muted">{profile?.role === 'ADMIN' ? t('users.roleAdmin') : t('users.roleEmployee')} · {profile?.email}</p>
          </div>
        </div>

        <label className="field">
          <span>{t('profile.name')}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>{t('profile.email')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <hr />
        <p className="muted" style={{ marginBottom: '0.5rem' }}>{t('profile.passwordHint')}</p>

        <label className="field">
          <span>{t('profile.newPassword')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('profile.newPasswordPlaceholder')}
            autoComplete="new-password"
          />
        </label>

        <label className="field">
          <span>{t('profile.confirmPassword')}</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('profile.confirmPasswordPlaceholder')}
            autoComplete="new-password"
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        {success && <p className="success" role="status">{success}</p>}

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </section>
  );
}
