import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  dissociateContractor,
  fetchClientContractors,
} from '../api/clients';
import { updateContractor } from '../api/contractors';
import { fetchDocumentTypes } from '../api/documentTypes';
import type { DocumentType, PartyContractor, PartyInput } from '../types/party';
import { getApiErrorMessage } from '../utils/apiErrors';
import { useSortableTable } from '../hooks/useSortableTable';
import { Edit2, Unlink, Download, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import { PartyDetailModal } from './PartyDetailModal';
import { PartyForm } from './PartyForm';

export function ClientContractorsSection({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  const [contractors, setContractors] = useState<PartyContractor[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE'>('ALL');
  const [viewingParty, setViewingParty] = useState<PartyContractor | null>(null);
  const [editingParty, setEditingParty] = useState<PartyContractor | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [contractorToDissociate, setContractorToDissociate] = useState<PartyContractor | null>(null);

  const { items: sortedContractors, requestSort, getSortIndicator } = useSortableTable(
    contractors.filter(c => {
      const matchSearch = localSearch ? (c.fullName.toLowerCase().includes(localSearch.toLowerCase()) || (c.documentNumber && c.documentNumber.includes(localSearch))) : true;
      const matchStatus = statusFilter === 'ALL' ? true : (statusFilter === 'COMPLETE' ? c.isComplete : !c.isComplete);
      return matchSearch && matchStatus;
    }),
    { key: 'fullName', direction: 'asc' }
  );

  async function load() {
    setLoading(true);
    try {
      const [contractorsData, docTypesData] = await Promise.all([
        fetchClientContractors(clientId),
        fetchDocumentTypes()
      ]);
      setContractors(contractorsData);
      setDocTypes(docTypesData);
    } catch (err) {
      setError(getApiErrorMessage(t, err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function handleDissociateConfirm() {
    if (!contractorToDissociate) return;
    setError(null);
    try {
      setContractors(await dissociateContractor(clientId, contractorToDissociate.id));
      setContractorToDissociate(null);
    } catch (err) {
      setError(getApiErrorMessage(t, err));
    }
  }

  async function handleUpdateContractor(input: PartyInput) {
    if (!editingParty) return;
    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateContractor(editingParty.id, input);
      setContractors(prev => prev.map(c => c.id === updated.id ? updated as PartyContractor : c));
      setEditingParty(null);
    } catch (err) {
      setFormError(getApiErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    const data = sortedContractors.map(c => ({
      Nombre: c.fullName,
      Tipo: c.kind === 'COMPANY' ? 'Empresa' : 'Persona',
      TipoDocumento: c.documentType?.code || '',
      NumeroDocumento: c.documentNumber || '',
      Email: c.email || '',
      Telefono: c.phone || '',
      Estado: c.isComplete ? t('contractors.statusComplete', 'Completo') : t('contractors.statusIncomplete', 'Incompleto')
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contratistas_${statusFilter.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card">
      <header className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>
          {t('clients.detail.contractors')} ({contractors.length})
        </h2>
        <Link to={`/clients/${clientId}/contractors/import`} className="btn secondary small">
          <span className="side-icon" aria-hidden="true" style={{ marginRight: '0.5rem' }}><Upload size={16} /></span>
          {t('clients.detail.importContractors', 'Carga Masiva')}
        </Link>
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div role="status" aria-label={t('table.loading')}>
          <div className="skeleton" />
        </div>
      ) : contractors.length === 0 ? (
        <p className="muted" style={{ marginTop: '2rem' }}>{t('clients.detail.noContractors')}</p>
      ) : (
        <>
          <div className="toolbar" style={{ marginBottom: '1rem', marginTop: '2rem' }}>
            <input
              type="search"
              placeholder={t('clients.detail.filterPlaceholder')}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              aria-label={t('clients.detail.filterPlaceholder')}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="ALL">{t('contractors.filterAll', 'Todos los estados')}</option>
              <option value="COMPLETE">{t('contractors.filterComplete', 'Completos')}</option>
              <option value="INCOMPLETE">{t('contractors.filterIncomplete', 'Incompletos')}</option>
            </select>
            <button type="button" className="btn ghost" onClick={handleExport} title={t('common.exportCsv', 'Exportar a CSV')} style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
              <Download size={16} />
              {t('common.export', 'Exportar')}
            </button>
          </div>
          <div className="table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('fullName')}>
                    {t('contractors.colName')}{getSortIndicator('fullName')}
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('kind')}>
                    {t('contractors.colKind')}{getSortIndicator('kind')}
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('documentNumber')}>
                    {t('contractors.colId')}{getSortIndicator('documentNumber')}
                  </th>
                  <th className="actions-col" style={{ textAlign: 'center' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedContractors.map((contractor) => (
                  <tr key={contractor.id} onClick={() => setViewingParty(contractor)} style={{ cursor: 'pointer' }}>
                    <td className="strong">
                      {contractor.fullName}{' '}
                      {contractor.isClient && (
                        <span className="badge admin">{t('contractors.isClientBadge')}</span>
                      )}
                      {contractor.isComplete ? (
                        <span className="badge ok" style={{ marginLeft: '4px' }}>{t('contractors.statusComplete', 'COMPLETO')}</span>
                      ) : (
                        <span className="badge warning" style={{ marginLeft: '4px' }}>{t('contractors.statusIncomplete', 'INCOMPLETO')}</span>
                      )}
                    </td>
                    <td className="muted">
                      {contractor.kind === 'COMPANY' ? t('clients.kindCompany') : t('clients.kindPerson')}
                    </td>
                    <td className="muted mono">
                      {contractor.documentNumber ?? ''}
                    </td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn small ghost icon-only"
                          onClick={() => setEditingParty(contractor)}
                          data-tooltip={t('common.edit')}
                          aria-label={t('common.edit')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn small danger-outline icon-only"
                          onClick={() => setContractorToDissociate(contractor)}
                          data-tooltip={t('clients.detail.dissociate')}
                          aria-label={t('clients.detail.dissociate')}
                        >
                          <Unlink size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {viewingParty && (
        <PartyDetailModal party={viewingParty} onClose={() => setViewingParty(null)} />
      )}
      
      {editingParty && (
        <div className="drawer-overlay" role="dialog" aria-modal="true" onClick={() => setEditingParty(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <PartyForm
              initialParty={editingParty}
              documentTypes={docTypes}
              saving={saving}
              formError={formError}
              submitLabel={t('party.saveContractor')}
              title={t('party.editContractorTitle')}
              onSubmit={handleUpdateContractor}
              onCancel={() => setEditingParty(null)}
            />
          </div>
        </div>
      )}

      {contractorToDissociate && (
        <div className="overlay" role="alertdialog" aria-modal="true" aria-label={t('clients.detail.confirmDissociateTitle', 'Quitar contratista')}>
          <div className="card" style={{ maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0 }}>
              {t('clients.detail.confirmDissociateTitle', 'Quitar contratista')}
            </h2>
            <p className="muted" style={{ marginBottom: '1.5rem' }}>
              {t('clients.detail.confirmDissociate', `¿Estás seguro de que deseas quitar a ${contractorToDissociate.fullName} de este cliente?`)}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" onClick={() => setContractorToDissociate(null)}>
                {t('common.cancel', 'Cancelar')}
              </button>
              <button type="button" className="btn danger" onClick={handleDissociateConfirm}>
                {t('clients.detail.dissociate', 'Quitar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
