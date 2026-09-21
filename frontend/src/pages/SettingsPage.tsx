import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_BRANDING, useBranding, type Branding } from '../branding/BrandingContext';

type Toast = { kind: 'success' } | null;

const PRIMARY_PRESETS = ['#2563eb', '#0f766e', '#4d7c0f', '#92400e', '#7c3aed', '#475569'];
const SIDEBAR_PRESETS = ['#0f172a', '#1f2937', '#14342b', '#3f3f46', '#422006', '#1e3a5f'];

export function SettingsPage() {
  const { t } = useTranslation();
  const { branding, saveBranding, resetBranding } = useBranding();
  const [form, setForm] = useState<Branding>(branding);
  const [toast, setToast] = useState<Toast>(null);

  function set<K extends keyof Branding>(key: K, value: Branding[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('logoUrl', String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    saveBranding({ ...form, companyName: form.companyName.trim() || DEFAULT_BRANDING.companyName });
    setToast({ kind: 'success' });
    setTimeout(() => setToast(null), 2500);
  }

  function handleReset() {
    resetBranding();
    setForm(DEFAULT_BRANDING);
  }

  return (
    <div className="page narrow">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('settings.eyebrow')}</p>
          <h1>{t('settings.title')}</h1>
          <p className="muted">{t('settings.subtitle')}</p>
        </div>
      </header>

      {toast && (
        <p className="toast success" role="status">
          {t('settings.saved')}
        </p>
      )}

      <form className="card form" onSubmit={handleSubmit}>
        <label className="field">
          <span>{t('settings.companyName')}</span>
          <input type="text" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>{t('settings.tagline')}</span>
          <input type="text" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
        </label>
        <label className="field">
          <span>{t('settings.logoUrl')}</span>
          <input
            type="url"
            placeholder="https://…/logo.png"
            value={form.logoUrl.startsWith('data:') ? '' : form.logoUrl}
            onChange={(e) => set('logoUrl', e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t('settings.logoUpload')}</span>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleFile} />
          <small className="muted">{t('settings.logoHint')}</small>
        </label>
        {form.logoUrl && (
          <div className="field">
            <span>{t('settings.logoPreview')}</span>
            <img src={form.logoUrl} alt="" className="logo-preview" />
          </div>
        )}
        <div className="grid2">
          <label className="field">
            <span>{t('settings.email')}</span>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </label>
          <label className="field">
            <span>{t('settings.phone')}</span>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>{t('settings.address')}</span>
          <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </label>
        <div className="grid2">
          <div className="field">
            <span>{t('settings.primaryColor')}</span>
            <div className="color-row">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => set('primaryColor', e.target.value)}
                aria-label={t('settings.primaryColor')}
              />
              {PRIMARY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`swatch${form.primaryColor === preset ? ' selected' : ''}`}
                  style={{ background: preset }}
                  aria-label={preset}
                  onClick={() => set('primaryColor', preset)}
                />
              ))}
            </div>
          </div>
          <div className="field">
            <span>{t('settings.sidebarColor')}</span>
            <div className="color-row">
              <input
                type="color"
                value={form.sidebarColor}
                onChange={(e) => set('sidebarColor', e.target.value)}
                aria-label={t('settings.sidebarColor')}
              />
              {SIDEBAR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`swatch${form.sidebarColor === preset ? ' selected' : ''}`}
                  style={{ background: preset }}
                  aria-label={preset}
                  onClick={() => set('sidebarColor', preset)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={handleReset}>
            {t('settings.reset')}
          </button>
          <button type="submit" className="btn primary">
            {t('settings.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
