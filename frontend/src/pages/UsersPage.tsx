import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createUser, deleteUser, fetchUsers, restoreUser, updateUser } from '../api/users';
import type { CreateUserInput, Role, User } from '../types/user';
import { UserForm } from '../components/UserForm';
import { UserTable } from '../components/UserTable';
import { getApiErrorMessage } from '../utils/apiErrors';

type Toast = { kind: 'success' | 'error'; message: string } | null;

export function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [showDeleted, setShowDeleted] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      setUsers(await fetchUsers(showDeleted));
    } catch (error) {
      setLoadError(getApiErrorMessage(t, error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
      if (!term) return true;
      return (
        user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
      );
    });
  }, [users, search, roleFilter]);

  const activeCount = users.filter((u) => !u.deletedAt).length;

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(input: CreateUserInput) {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = await updateUser(editing.id, input);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setToast({ kind: 'success', message: t('toast.updated', { name: updated.name }) });
      } else {
        const created = await createUser(input);
        setUsers((prev) => [created, ...prev]);
        setToast({ kind: 'success', message: t('toast.created', { name: created.name }) });
      }
      setShowForm(false);
      setEditing(null);
    } catch (error) {
      setFormError(getApiErrorMessage(t, error));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    try {
      const removed = await deleteUser(confirmDelete.id);
      // Activar automáticamente "Mostrar inactivos" para que el admin vea al usuario desactivado
      if (!showDeleted) {
        setShowDeleted(true);
      } else {
        setUsers((prev) => prev.map((u) => (u.id === removed.id ? removed : u)));
      }
      setToast({ kind: 'success', message: t('toast.deleted', { name: confirmDelete.name }) });
    } catch (error) {
      setToast({ kind: 'error', message: getApiErrorMessage(t, error) });
    } finally {
      setConfirmDelete(null);
    }
  }

  async function handleRestore(user: User) {
    try {
      const restored = await restoreUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === restored.id ? restored : u)));
      setToast({ kind: 'success', message: t('toast.restored', { name: user.name }) });
    } catch (error) {
      setToast({ kind: 'error', message: getApiErrorMessage(t, error) });
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('users.eyebrow')}</p>
          <h1>{t('users.title')}</h1>
          <p className="muted">
            {t('users.subtitleActive', { count: activeCount })} {t('users.subtitleSuffix')}
          </p>
        </div>
        <button type="button" className="btn success" onClick={openCreate}>
          {t('users.new')}
        </button>
      </header>

      <section className="toolbar card" aria-label={t('users.title')}>
        <input
          type="search"
          placeholder={t('users.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('users.searchLabel')}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'ALL' | Role)}
          aria-label={t('users.roleFilterLabel')}
        >
          <option value="ALL">{t('users.roleAll')}</option>
          <option value="ADMIN">{t('users.roleAdmin')}</option>
          <option value="EMPLEADO">{t('users.roleEmployee')}</option>
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          {t('users.showDeleted')}
        </label>
      </section>

      {toast && (
        <p className={`toast ${toast.kind}`} role="status">
          {toast.message}
        </p>
      )}

      {loadError ? (
        <div className="card empty">
          <p className="empty-title">{t('users.loadErrorTitle')}</p>
          <p className="muted">{loadError}</p>
          <button type="button" className="btn primary" onClick={load}>
            {t('users.retry')}
          </button>
        </div>
      ) : (
        <UserTable
          users={filtered}
          loading={loading}
          onEdit={openEdit}
          onDelete={setConfirmDelete}
          onRestore={handleRestore}
        />
      )}

      {showForm && (
        <div className="overlay" role="dialog" aria-modal="true">
          <UserForm
            initialUser={editing}
            saving={saving}
            formError={formError}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {confirmDelete && (
        <div className="overlay" role="alertdialog" aria-modal="true" aria-label={t('deleteDialog.title', { name: confirmDelete.name })}>
          <div className="card form">
            <h2>{t('deleteDialog.title', { name: confirmDelete.name })}</h2>
            <p className="muted">{t('deleteDialog.description')}</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmDelete(null)}
              >
                {t('deleteDialog.cancel')}
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleConfirmDelete}
              >
                {t('deleteDialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
