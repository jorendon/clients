import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Pencil, UserX } from 'lucide-react';
import {
  createClient,
  fetchClientDetail,
  fetchClients,
  unmarkClient,
  updateClient,
} from '../api/clients';
import { fetchDocumentTypes } from '../api/documentTypes';
import { PartyForm } from '../components/PartyForm';
import { PartyDetailModal } from '../components/PartyDetailModal';
import type { ClientType, DocumentType, Party, PartyInput } from '../types/party';
import { getClientTypes, VISIBLE_CLIENT_TYPES } from '../types/party';
import { getApiErrorMessage } from '../utils/apiErrors';
import { useSortableTable } from '../hooks/useSortableTable';

type Toast = { kind: 'success' | 'error'; message: string } | null;

import { MaskedDocument } from '../components/MaskedDocument';

export function ClientsPage() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<Party[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [confirmUnmark, setConfirmUnmark] = useState<Party | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ClientType>('ALL');
  const [toast, setToast] = useState<Toast>(null);
  const [viewingClient, setViewingClient] = useState<Party | null>(null);

  const { items: sortedClients, requestSort, getSortIndicator } = useSortableTable(clients, { key: 'fullName', direction: 'asc' }, (item, key) => {
    if (key === 'clientType') return clientTypeLabel(item);
    if (key === 'idCode') return item.documentType?.code;
    if (key === 'idNumber') return item.documentNumber ?? item.registryNumber;
    if (key === 'contractorsCount') return item._count?.clientLinks ?? 0;
    return item[key as keyof Party];
  });

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [list, types] = await Promise.all([fetchClients(search.trim(), typeFilter), fetchDocumentTypes()]);
      setClients(list);
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
  }, [search, typeFilter]);

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

  async function openEdit(client: Party) {
    setFormError(null);
    try {
      setEditing(await fetchClientDetail(client.id));
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
        const updated = await updateClient(editing.id, input);
        setClients((prev) => prev.map((c) => (c.id === updated.id ? { ...updated, _count: c._count } : c)));
      } else {
        const created = await createClient(input);
        setClients((prev) => [...prev, created].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      }
      setShowForm(false);
      setEditing(null);
    } catch (error) {
      setFormError(getApiErrorMessage(t, error));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmUnmark() {
    if (!confirmUnmark) return;
    try {
      await unmarkClient(confirmUnmark.id);
      setClients((prev) => prev.filter((c) => c.id !== confirmUnmark.id));
    } catch (error) {
      setToast({ kind: 'error', message: getApiErrorMessage(t, error) });
    } finally {
      setConfirmUnmark(null);
    }
  }

  function clientTypeLabel(client: Party): string {
    const types = getClientTypes(client);
    if (types.length === 0) return t('common.notAssigned');
    return types
      .map((type) => (type === 'ACCOUNTING' ? t('clients.typeAccounting') : t('clients.typePayroll')))
      .join(', ');
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('clients.eyebrow')}</p>
          <h1>{t('clients.title')}</h1>
          <p className="muted">{t('clients.subtitle', { count: clients.length })}</p>
        </div>
        <div className="btn-row">
          <Link to="/clients/import" className="btn">
            {t('import.bulkClients')}
          </Link>
          <button type="button" className="btn primary" onClick={openCreate}>
            {t('clients.new')}
          </button>
        </div>
      </header>

      <section className="toolbar card" aria-label={t('clients.title')}>
        <input
          type="search"
          placeholder={t('clients.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('clients.searchLabel')}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'ALL' | ClientType)}
          aria-label={t('clients.typeLabel')}
        >
          <option value="ALL">{t('clients.typeAll')}</option>
          {VISIBLE_CLIENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === 'ACCOUNTING' ? t('clients.typeAccounting') : t('clients.typePayroll')}
            </option>
          ))}
        </select>
      </section>

      {toast && (
        <p className={`toast ${toast.kind}`} role="status">
          {toast.message}
        </p>
      )}

      {loadError ? (
        <div className="card empty">
          <p className="empty-title">{t('clients.loadErrorTitle')}</p>
          <p className="muted">{loadError}</p>
          <button type="button" className="btn primary" onClick={load}>
            {t('common.retry')}
          </button>
        </div>
      ) : loading ? (
        <div className="card" role="status" aria-label={t('clients.title')}>
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : clients.length === 0 ? (
        <div className="card empty">
          <p className="empty-title">{t('clients.emptyTitle')}</p>
          <p className="muted">{t('clients.emptyHint')}</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('fullName')}>
                  {t('clients.colName')}{getSortIndicator('fullName')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('kind')}>
                  {t('clients.colKind')}{getSortIndicator('kind')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('clientType')}>
                  {t('clients.colClientType')}{getSortIndicator('clientType')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('idCode')}>
                  {t('clients.colIdType')}{getSortIndicator('idCode')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('idNumber')}>
                  {t('clients.colId')}{getSortIndicator('idNumber')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('contractorsCount')}>
                  {t('clients.colContractors')}{getSortIndicator('contractorsCount')}
                </th>
                <th className="actions-col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((client) => (
                <tr key={client.id} onClick={() => setViewingClient(client)} style={{ cursor: 'pointer' }}>
                  <td className="strong" onClick={(e) => e.stopPropagation()}>
                    {client.fullName}
                  </td>
                  <td>
                    <span className={`badge ${client.kind === 'COMPANY' ? 'admin' : 'empleado'}`}>
                      {client.kind === 'COMPANY' ? t('clients.kindCompany') : t('clients.kindPerson')}
                    </span>
                  </td>
                  <td className="muted">{clientTypeLabel(client)}</td>
                  <td className="muted mono">{client.documentType?.code ?? '—'}</td>
                  <td className="muted mono">
                    <MaskedDocument partyId={client.id} initialMasked={client.documentNumber} fallback={client.registryNumber ?? '—'} />
                  </td>
                  <td>{client._count?.clientLinks ?? '—'}</td>
                  <td className="actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      type="button" 
                      className="btn small icon-only" 
                      onClick={() => openEdit(client)}
                      title={t('common.edit')}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn small danger-outline icon-only"
                      onClick={() => setConfirmUnmark(client)}
                      title={t('clients.detail.unmark')}
                    >
                      <UserX size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="drawer-overlay" role="dialog" aria-modal="true" onClick={() => {
          setShowForm(false);
          setEditing(null);
        }}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <PartyForm
              clientMode
              initialParty={editing}
              documentTypes={docTypes}
              saving={saving}
              formError={formError}
              title={editing ? t('party.editClientTitle') : t('party.newClientTitle')}
              submitLabel={editing ? t('party.saveClient') : t('party.createClient')}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </div>
        </div>
      )}

      {viewingClient && (
        <PartyDetailModal party={viewingClient} onClose={() => setViewingClient(null)} />
      )}

      {confirmUnmark && (
        <div className="overlay" role="alertdialog" aria-modal="true">
          <div className="card form">
            <h2>{t('clients.detail.unmarkTitle', { name: confirmUnmark.fullName })}</h2>
            <p className="muted">{t('clients.detail.unmarkDescription')}</p>
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setConfirmUnmark(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn danger" onClick={handleConfirmUnmark}>
                {t('clients.detail.unmark')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
