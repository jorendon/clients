import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import {
  createContractor,
  deleteContractor,
  fetchContractor,
  fetchContractors,
  updateContractor,
} from '../api/contractors';
import { fetchDocumentTypes as fetchTypes } from '../api/documentTypes';
import { PartyForm } from '../components/PartyForm';
import type { DocumentType, Party, PartyInput, PartyKind } from '../types/party';
import { getApiErrorMessage } from '../utils/apiErrors';
import { useSortableTable } from '../hooks/useSortableTable';

type Toast = { kind: 'success' | 'error'; message: string } | null;

export function ContractorsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Party[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Party | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | PartyKind>('ALL');
  const [onlyNonClients, setOnlyNonClients] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const { items: sortedItems, requestSort, getSortIndicator } = useSortableTable(
    items,
    { key: 'fullName', direction: 'asc' },
    (item, key) => {
      if (key === 'idCode') return item.documentType?.code;
      if (key === 'idNumber') return item.documentNumber;
      if (key === 'clientsCount') return item._count?.contractorLinks ?? 0;
      return item[key as keyof Party];
    }
  );

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [list, types] = await Promise.all([
        fetchContractors({
          search: search.trim() || undefined,
          kind: kindFilter === 'ALL' ? undefined : kindFilter,
          contractorsOnly: onlyNonClients || undefined,
        }),
        fetchTypes(),
      ]);
      setItems(list);
      setDocTypes(types);
    } catch (error) {
      setLoadError(getApiErrorMessage(t, error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kindFilter, onlyNonClients]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setShowForm(true);
  }

  async function openEdit(item: Party) {
    setFormError(null);
    try {
      const [detail, types] = await Promise.all([fetchContractor(item.id), fetchTypes()]);
      setEditing(detail);
      setDocTypes(types);
      setShowForm(true);
    } catch (error) {
      setToast({ kind: 'error', message: getApiErrorMessage(t, error) });
    }
  }

  async function handleSubmit(input: PartyInput) {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = await updateContractor(editing.id, input);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...updated, _count: i._count } : i)));
      } else {
        const created = await createContractor(input);
        setItems((prev) => [...prev, created].sort((a, b) => a.fullName.localeCompare(b.fullName)));
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
      await deleteContractor(confirmDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== confirmDelete.id));
    } catch (error) {
      setToast({ kind: 'error', message: getApiErrorMessage(t, error) });
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('contractors.eyebrow')}</p>
          <h1>{t('contractors.title')}</h1>
          <p className="muted">{t('contractors.subtitle')}</p>
        </div>
        <button type="button" className="btn primary" onClick={openCreate}>
          {t('contractors.new')}
        </button>
      </header>

      <section className="toolbar card" aria-label={t('contractors.title')}>
        <input
          type="search"
          placeholder={t('contractors.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('contractors.searchLabel')}
        />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as 'ALL' | PartyKind)}
          aria-label={t('contractors.kindLabel')}
        >
          <option value="ALL">{t('contractors.kindAll')}</option>
          <option value="PERSON">{t('contractors.kindPerson')}</option>
          <option value="COMPANY">{t('contractors.kindCompany')}</option>
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={onlyNonClients}
            onChange={(e) => setOnlyNonClients(e.target.checked)}
          />
          {t('contractors.onlyNonClients')}
        </label>
      </section>

      {toast && (
        <p className={`toast ${toast.kind}`} role="status">
          {toast.message}
        </p>
      )}

      {loadError ? (
        <div className="card empty">
          <p className="empty-title">{t('contractors.loadErrorTitle')}</p>
          <p className="muted">{loadError}</p>
          <button type="button" className="btn primary" onClick={load}>
            {t('common.retry')}
          </button>
        </div>
      ) : loading ? (
        <div className="card" role="status" aria-label={t('contractors.title')}>
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : items.length === 0 ? (
        <div className="card empty">
          <p className="empty-title">{t('contractors.emptyTitle')}</p>
          <p className="muted">{t('contractors.emptyHint')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('fullName')}>
                  {t('contractors.colName')}{getSortIndicator('fullName')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('kind')}>
                  {t('contractors.colKind')}{getSortIndicator('kind')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('idCode')}>
                  {t('contractors.colIdType')}{getSortIndicator('idCode')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('idNumber')}>
                  {t('contractors.colId')}{getSortIndicator('idNumber')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('clientsCount')}>
                  {t('contractors.colClients')}{getSortIndicator('clientsCount')}
                </th>
                <th className="actions-col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id}>
                  <td className="strong">
                    {item.fullName}{' '}
                    {item.isClient && (
                      <span className="badge admin">{t('contractors.isClientBadge')}</span>
                    )}
                  </td>
                  <td className="muted">
                    {item.kind === 'COMPANY' ? t('clients.kindCompany') : t('clients.kindPerson')}
                  </td>
                  <td className="muted mono">{item.documentType?.code ?? '—'}</td>
                  <td className="muted mono">{item.documentNumber ?? '—'}</td>
                  <td>{item._count?.contractorLinks ?? '—'}</td>
                  <td className="actions">
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
                      onClick={() => setConfirmDelete(item)}
                      title={t('common.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="overlay" role="dialog" aria-modal="true">
          <PartyForm
            initialParty={editing}
            documentTypes={docTypes}
            saving={saving}
            formError={formError}
            title={editing ? t('party.editContractorTitle') : t('party.newContractorTitle')}
            submitLabel={editing ? t('party.saveContractor') : t('party.createContractor')}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {confirmDelete && (
        <div className="overlay" role="alertdialog" aria-modal="true">
          <div className="card form">
            <h2>{t('contractors.deleteTitle', { name: confirmDelete.fullName })}</h2>
            <p className="muted">{t('contractors.deleteDescription')}</p>
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setConfirmDelete(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn danger" onClick={handleConfirmDelete}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
