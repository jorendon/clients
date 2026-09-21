import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import {
  createDocumentType,
  deleteDocumentType,
  fetchDocumentTypes,
  restoreDocumentType,
  updateDocumentType,
} from '../api/documentTypes';
import type { DocumentType, DocumentTypeInput } from '../types/party';
import { getApiErrorMessage } from '../utils/apiErrors';
import { useSortableTable } from '../hooks/useSortableTable';

type Toast = { kind: 'success' | 'error'; message: string } | null;

export function DocumentTypesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const { items: sortedItems, requestSort, getSortIndicator } = useSortableTable(items, { key: 'code', direction: 'asc' }, (item, key) => {
    if (key === 'status') return Boolean(item.deletedAt) ? 1 : 0;
    return item[key as keyof DocumentType];
  });
  const [form, setForm] = useState<DocumentTypeInput>({ code: '', name: '', description: '', isActive: true });

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await fetchDocumentTypes(showDeleted));
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

  function openCreate() {
    setEditing(null);
    setForm({ code: '', name: '', description: '', isActive: true });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(item: DocumentType) {
    setEditing(item);
    setForm({ code: item.code, name: item.name, description: item.description ?? '', isActive: item.isActive });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        description: form.description?.trim() ? form.description.trim() : undefined,
      };
      if (editing) {
        const updated = await updateDocumentType(editing.id, payload);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const created = await createDocumentType(payload);
        setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowForm(false);
      setEditing(null);
    } catch (error) {
      setFormError(getApiErrorMessage(t, error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: DocumentType) {
    try {
      const removed = await deleteDocumentType(item.id);
      setItems((prev) =>
        showDeleted ? prev.map((i) => (i.id === removed.id ? removed : i)) : prev.filter((i) => i.id !== removed.id),
      );
    } catch (error) {
      setToast({ kind: 'error', message: getApiErrorMessage(t, error) });
    }
  }

  async function handleRestore(item: DocumentType) {
    try {
      const restored = await restoreDocumentType(item.id);
      setItems((prev) => prev.map((i) => (i.id === restored.id ? restored : i)));
    } catch (error) {
      setToast({ kind: 'error', message: getApiErrorMessage(t, error) });
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('docTypes.eyebrow')}</p>
          <h1>{t('docTypes.title')}</h1>
          <p className="muted">{t('docTypes.subtitle')}</p>
        </div>
        <button type="button" className="btn primary" onClick={openCreate}>
          {t('docTypes.new')}
        </button>
      </header>

      <section className="toolbar card">
        <span />
        <label className="check">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
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
          <p className="empty-title">{t('docTypes.loadErrorTitle')}</p>
          <p className="muted">{loadError}</p>
          <button type="button" className="btn primary" onClick={load}>
            {t('common.retry')}
          </button>
        </div>
      ) : loading ? (
        <div className="card" role="status" aria-label={t('docTypes.title')}>
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : items.length === 0 ? (
        <div className="card empty">
          <p className="empty-title">{t('docTypes.emptyTitle')}</p>
          <p className="muted">{t('docTypes.emptyHint')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('code')}>
                  {t('docTypes.colCode')}{getSortIndicator('code')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('name')}>
                  {t('docTypes.colName')}{getSortIndicator('name')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('description')}>
                  {t('docTypes.colDescription')}{getSortIndicator('description')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('status')}>
                  {t('docTypes.colStatus')}{getSortIndicator('status')}
                </th>
                <th className="actions-col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id} className={item.deletedAt ? 'deleted' : undefined}>
                  <td className="strong mono">{item.code}</td>
                  <td>{item.name}</td>
                  <td className="muted">{item.description ?? '—'}</td>
                  <td>
                    {!item.isActive ? (
                      <span className="badge">{t('common.inactive')}</span>
                    ) : item.deletedAt ? (
                      <span className="badge danger">{t('common.inactive')}</span>
                    ) : (
                      <span className="badge ok">{t('common.active')}</span>
                    )}
                  </td>
                  <td className="actions">
                    {!item.deletedAt ? (
                      <>
                        <button 
                          type="button" 
                          className="btn small icon-only" 
                          onClick={() => openEdit(item)}
                          title={t('common.edit')}
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          type="button" 
                          className="btn small danger-outline icon-only" 
                          onClick={() => handleDelete(item)}
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <button 
                        type="button" 
                        className="btn small primary icon-only" 
                        onClick={() => handleRestore(item)}
                        title={t('common.restore')}
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="overlay" role="dialog" aria-modal="true">
          <form className="card form" onSubmit={handleSubmit} noValidate>
            <h2>{editing ? t('docTypes.formEditTitle') : t('docTypes.formTitle')}</h2>
            <label className="field">
              <span>{t('docTypes.code')}</span>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="SSN"
                autoFocus
              />
              <small className="muted">{t('docTypes.codeHint')}</small>
            </label>
            <label className="field">
              <span>{t('docTypes.name')}</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>{t('docTypes.description')}</span>
              <input
                type="text"
                value={form.description ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              {t('docTypes.isActive')}
            </label>
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setShowForm(false)} disabled={saving}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? t('common.saving') : editing ? t('common.save') : t('common.create')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
