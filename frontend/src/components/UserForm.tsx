import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateUserInput, Role, User } from '../types/user';

interface UserFormProps {
  initialUser?: User | null;
  saving: boolean;
  formError: string | null;
  onSubmit: (input: CreateUserInput) => void;
  onCancel: () => void;
}

const EMPTY: CreateUserInput = { email: '', name: '', password: '', role: 'EMPLEADO' };

export function UserForm({ initialUser, saving, formError, onSubmit, onCancel }: UserFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateUserInput>({
    email: initialUser?.email ?? '',
    name: initialUser?.name ?? '',
    password: '',
    role: initialUser?.role ?? 'EMPLEADO',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField<K extends keyof CreateUserInput>(key: K, value: CreateUserInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      next.email = t('form.errors.email');
    if (!form.name.trim()) next.name = t('form.errors.name');
    if (!initialUser && form.password.length < 6) next.password = t('form.errors.password');
    if (initialUser && form.password && form.password.length < 6)
      next.password = t('form.errors.password');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    // En edición, si no se cambió password, no lo enviamos
    if (initialUser && !form.password) {
      const { password: _omit, ...rest } = form;
      onSubmit(rest as CreateUserInput);
    } else {
      onSubmit(form);
    }
  }

  return (
    <form
      className="card form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={initialUser ? t('form.editLabel') : t('form.createLabel')}
    >
      <h2>{initialUser ? t('form.editTitle', { name: initialUser.name }) : t('form.createTitle')}</h2>

      <label className="field">
        <span>{t('form.name')}</span>
        <input
          type="text"
          placeholder={t('form.namePlaceholder')}
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          aria-invalid={Boolean(errors.name)}
          autoFocus
        />
        {errors.name && <small className="error">{errors.name}</small>}
      </label>

      <label className="field">
        <span>{t('form.email')}</span>
        <input
          type="email"
          placeholder="ana@w9.com"
          value={form.email}
          onChange={(e) => setField('email', e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <small className="error">{errors.email}</small>}
      </label>

      <label className="field">
        <span>{initialUser ? t('form.passwordOptional') : t('form.password')}</span>
        <input
          type="password"
          placeholder="••••••"
          value={form.password}
          onChange={(e) => setField('password', e.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password && <small className="error">{errors.password}</small>}
      </label>

      <label className="field">
        <span>{t('form.role')}</span>
        <select
          value={form.role}
          onChange={(e) => setField('role', e.target.value as Role)}
        >
          <option value="EMPLEADO">{t('form.roleEmployee')}</option>
          <option value="ADMIN">{t('form.roleAdmin')}</option>
        </select>
      </label>

      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
          {t('form.cancel')}
        </button>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? t('form.saving') : initialUser ? t('form.saveChanges') : t('form.submitCreate')}
        </button>
      </div>
    </form>
  );
}

export { EMPTY };
