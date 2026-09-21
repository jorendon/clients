import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_BRANDING, useBranding, type Branding, type ContactField } from '../branding/BrandingContext';
import { Trash2, Check } from 'lucide-react';

type Toast = { kind: 'success' } | null;

const PRIMARY_PRESETS = ['#2563eb', '#0f766e', '#4d7c0f', '#92400e', '#7c3aed', '#475569'];
const SIDEBAR_PRESETS = ['#0f172a', '#1f2937', '#14342b', '#3f3f46', '#422006', '#1e3a5f'];

function DynamicFieldArray({
  items,
  setItems,
  label,
  type,
  addLabel
}: {
  items: ContactField[];
  setItems: (items: ContactField[]) => void;
  label: string;
  type: string;
  addLabel: string;
}) {
  const { t } = useTranslation();

  function handleAdd() {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), value: '', isPrimary: items.length === 0 }]);
  }

  function handleUpdate(index: number, val: string) {
    const next = [...items];
    next[index].value = val;
    setItems(next);
  }

  function handleSetPrimary(index: number) {
    setItems(items.map((item, i) => ({ ...item, isPrimary: i === index })));
  }

  function handleRemove(index: number) {
    const next = items.filter((_, i) => i !== index);
    if (next.length > 0 && items[index].isPrimary) {
      next[0].isPrimary = true;
    }
    setItems(next);
  }

  return (
    <div className="field">
      <span>{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, index) => (
          <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="radio"
              name={`primary-${label}`}
              checked={item.isPrimary}
              onChange={() => handleSetPrimary(index)}
              title={t('settings.default')}
            />
            <input
              type={type}
              value={item.value}
              onChange={(e) => handleUpdate(index, e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn small danger-outline icon-only" onClick={() => handleRemove(index)} title={t('common.delete')}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button type="button" className="btn small" onClick={handleAdd} style={{ alignSelf: 'flex-start' }}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}

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
    <div className="page">
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

      <form onSubmit={handleSubmit}>
        <div className="grid-wide-left">
          {/* Columna Izquierda: Identidad y Contacto */}
          <div className="card form" style={{ width: '100%' }}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem' }}>Identidad y Contacto</h2>
            <label className="field">
              <span>{t('settings.companyName')}</span>
              <input type="text" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} autoFocus />
            </label>
            <label className="field">
              <span>{t('settings.tagline')}</span>
              <input type="text" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
            </label>
            <DynamicFieldArray items={form.emails} setItems={(v) => set('emails', v)} label={t('settings.email')} type="email" addLabel={t('settings.addEmail')} />
            <DynamicFieldArray items={form.phones} setItems={(v) => set('phones', v)} label={t('settings.phone')} type="tel" addLabel={t('settings.addPhone')} />
            <DynamicFieldArray items={form.addresses} setItems={(v) => set('addresses', v)} label={t('settings.address')} type="text" addLabel={t('settings.addAddress')} />
          </div>

          {/* Columna Derecha: Branding Visual */}
          <div className="card form" style={{ width: '100%' }}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem' }}>Branding Visual</h2>
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
                <img src={form.logoUrl} alt="" className="logo-preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
              </div>
            )}
            <div className="grid2" style={{ marginTop: '1rem' }}>
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
                    >
                      {form.primaryColor === preset && <Check size={16} color="#fff" />}
                    </button>
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
                    >
                      {form.sidebarColor === preset && <Check size={16} color="#fff" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="form-actions card" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem 1.5rem' }}>
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
