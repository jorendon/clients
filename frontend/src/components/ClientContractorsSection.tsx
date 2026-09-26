import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  associateContractor,
  dissociateContractor,
  fetchClientContractors,
  fetchClientDetail,
} from '../api/clients';
import { ExportModal, type ExportFormat } from './ExportModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { createContractor, updateContractor } from '../api/contractors';
import { fetchDocumentTypes } from '../api/documentTypes';
import type { DocumentType, PartyContractor, PartyInput } from '../types/party';
import { getApiErrorMessage } from '../utils/apiErrors';
import { useSortableTable } from '../hooks/useSortableTable';
import { useBranding } from '../branding/BrandingContext';
import { Pencil, UserX, Download, Upload, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PartyDetailModal } from './PartyDetailModal';
import { PartyForm } from './PartyForm';
import { MaskedDocument } from './MaskedDocument';

export function ClientContractorsSection({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  const { branding } = useBranding();
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

  const [creatingParty, setCreatingParty] = useState(false);
  const [selectedContractors, setSelectedContractors] = useState<Set<number>>(new Set());
  const [bulkDissociating, setBulkDissociating] = useState(false);
  const [showBulkDissociateConfirm, setShowBulkDissociateConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [clientName, setClientName] = useState<string>('');

  const { items: sortedContractors, requestSort, getSortIndicator } = useSortableTable(
    contractors.filter(c => {
      const matchSearch = localSearch ? (c.fullName.toLowerCase().includes(localSearch.toLowerCase()) || (c.documentNumber && c.documentNumber.includes(localSearch))) : true;
      const matchStatus = statusFilter === 'ALL' ? true : (statusFilter === 'COMPLETE' ? c.isComplete : !c.isComplete);
      return matchSearch && matchStatus;
    }),
    { key: 'fullName', direction: 'asc' }
  );

  const allSelected = sortedContractors.length > 0 && selectedContractors.size === sortedContractors.length;
  const someSelected = selectedContractors.size > 0 && selectedContractors.size < sortedContractors.length;

  function toggleAll() {
    if (allSelected) {
      setSelectedContractors(new Set());
    } else {
      setSelectedContractors(new Set(sortedContractors.map(c => c.id)));
    }
  }

  function toggleOne(id: number) {
    const next = new Set(selectedContractors);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContractors(next);
  }

  async function load() {
    setLoading(true);
    try {
      const [contractorsData, docTypesData, clientData] = await Promise.all([
        fetchClientContractors(clientId),
        fetchDocumentTypes(),
        fetchClientDetail(clientId)
      ]);
      setContractors(contractorsData);
      setDocTypes(docTypesData);
      setClientName(clientData.fullName);
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

  async function handleCreateContractor(input: PartyInput) {
    setSaving(true);
    setFormError(null);
    try {
      const newContractor = await createContractor(input);
      await associateContractor(clientId, newContractor.id);
      setCreatingParty(false);
      load();
    } catch (err) {
      setFormError(getApiErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  }

  function handleBulkDissociateClick() {
    if (selectedContractors.size === 0) return;
    setShowBulkDissociateConfirm(true);
  }

  async function executeBulkDissociate() {
    setBulkDissociating(true);
    setError(null);
    try {
      await Promise.all(
        Array.from(selectedContractors).map(contractorId => 
          dissociateContractor(clientId, contractorId)
        )
      );
      setSelectedContractors(new Set());
      setShowBulkDissociateConfirm(false);
      load();
    } catch (err) {
      setError(getApiErrorMessage(t, err));
      setBulkDissociating(false);
    }
  }

  async function handleExportConfirm(format: ExportFormat, selectedColumns: string[]) {
    setBulkDissociating(true);
    try {
      const exportDataList = await fetchClientContractors(clientId, true);
      
      // Filtramos según el estado y búsqueda actual
      const filteredDataList = exportDataList.filter(c => {
        const matchSearch = localSearch ? (c.fullName.toLowerCase().includes(localSearch.toLowerCase()) || (c.documentNumber && c.documentNumber.includes(localSearch))) : true;
        const matchStatus = statusFilter === 'ALL' ? true : (statusFilter === 'COMPLETE' ? c.isComplete : !c.isComplete);
        return matchSearch && matchStatus;
      });

      const data = filteredDataList.map(c => {
        const row: Record<string, string> = {};
        if (selectedColumns.includes('Nombre')) row[t('contractors.colName', 'Nombre')] = c.fullName;
        if (selectedColumns.includes('Tipo')) row[t('contractors.colKind', 'Tipo')] = c.kind === 'COMPANY' ? t('clients.kindCompany', 'Empresa') : t('clients.kindPerson', 'Persona');
        if (selectedColumns.includes('TipoDocumento')) row[t('contractors.colIdType', 'Tipo de Documento')] = c.documentType?.code || '';
        if (selectedColumns.includes('NumeroDocumento')) row[t('contractors.colId', 'Número de Documento')] = c.documentNumber || '';
        if (selectedColumns.includes('Email')) row[t('party.email', 'Email')] = c.email || '';
        if (selectedColumns.includes('Telefono')) row[t('party.phone', 'Teléfono')] = c.phone || '';
        if (selectedColumns.includes('Address')) {
          const addr = c.addresses?.find(a => a.kind === 'FISCAL') || c.addresses?.[0];
          row[t('import.colAddress', 'Dirección')] = addr ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') : '';
        }
        if (selectedColumns.includes('Estado')) row[t('docTypes.colStatus', 'Estado')] = c.isComplete ? t('contractors.statusComplete', 'Completo') : t('contractors.statusIncomplete', 'Incompleto');
        return row;
      });

      const safeClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = new Date().toISOString().split('T')[0];
      const baseFileName = `${safeClientName}_${dateStr}_${statusFilter.toLowerCase()}`;

      if (format === 'EXCEL') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Contratistas');
        XLSX.writeFile(wb, `${baseFileName}.xlsx`);
      } else if (format === 'PDF') {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text(clientName, pageWidth / 2, 22, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        const filterText = statusFilter === 'ALL' ? t('contractors.filterAll', 'Todos los estados') : (statusFilter === 'COMPLETE' ? t('contractors.filterComplete', 'Completos') : t('contractors.filterIncomplete', 'Incompletos'));
        doc.text(`${t('export.title', 'Exportar Contratistas')} (${filterText})`, pageWidth / 2, 30, { align: 'center' });
        
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          const body = data.map(row => headers.map(h => row[h]));
          
          autoTable(doc, {
            startY: 38,
            head: [headers],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: branding.sidebarColor },
            styles: { fontSize: 9, cellPadding: 4 },
          });
        } else {
          doc.text(t('clients.detail.noContractors', 'No hay datos'), pageWidth / 2, 45, { align: 'center' });
        }
        
        doc.save(`${baseFileName}.pdf`);
      }
    } catch (err) {
      setError(getApiErrorMessage(t, err));
    } finally {
      setBulkDissociating(false);
    }
  }

  return (
    <section className="card">
      <header className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>
          {t('clients.detail.contractors')} ({contractors.length})
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn success small" onClick={() => setCreatingParty(true)}>
            <span className="side-icon" aria-hidden="true" style={{ marginRight: '0.5rem' }}><Plus size={16} /></span>
            {t('clients.detail.newContractor', 'Nuevo contratista')}
          </button>
          <Link to={`/clients/${clientId}/contractors/import`} className="btn secondary small">
            <span className="side-icon" aria-hidden="true" style={{ marginRight: '0.5rem' }}><Upload size={16} /></span>
            {t('clients.detail.importContractors', 'Carga Masiva')}
          </Link>
        </div>
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
            {selectedContractors.size > 0 && (
              <button
                type="button"
                className="btn danger ghost"
                onClick={handleBulkDissociateClick}
                disabled={bulkDissociating}
                style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}
              >
                <Trash2 size={16} />
                {t('clients.detail.dissociateSelected', { count: selectedContractors.size, defaultValue: `Quitar seleccionados (${selectedContractors.size})` })}
              </button>
            )}
            <button type="button" className="btn ghost" onClick={() => setShowExportModal(true)} title={t('export.title', 'Exportar')} style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
              <Download size={16} />
              {t('common.export', 'Exportar')}
            </button>
          </div>
          <div className="table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={input => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                      aria-label="Seleccionar todos"
                    />
                  </th>
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
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedContractors.has(contractor.id)}
                        onChange={() => toggleOne(contractor.id)}
                        aria-label="Seleccionar contratista"
                      />
                    </td>
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
                      <MaskedDocument partyId={contractor.id} initialMasked={contractor.documentNumber} fallback="" />
                    </td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn small icon-only"
                          onClick={() => setEditingParty(contractor)}
                          data-tooltip={t('common.edit')}
                          aria-label={t('common.edit')}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn small danger-outline icon-only"
                          onClick={() => setContractorToDissociate(contractor)}
                          data-tooltip={t('clients.detail.dissociate')}
                          aria-label={t('clients.detail.dissociate')}
                        >
                          <UserX size={16} />
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

      {creatingParty && (
        <div className="drawer-overlay" role="dialog" aria-modal="true" onClick={() => setCreatingParty(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <PartyForm
              documentTypes={docTypes}
              saving={saving}
              formError={formError}
              submitLabel={t('party.createContractor')}
              title={t('clients.detail.creatingContractor', 'Crear y asociar contratista')}
              onSubmit={handleCreateContractor}
              onCancel={() => setCreatingParty(false)}
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
      {showExportModal && (
        <ExportModal 
          title={t('export.title', 'Exportar Contratistas')}
          initialColumns={[
            { key: 'Nombre', label: t('contractors.colName', 'Nombre'), selected: true },
            { key: 'Tipo', label: t('contractors.colKind', 'Tipo'), selected: true },
            { key: 'TipoDocumento', label: t('contractors.colIdType', 'Tipo de Documento'), selected: true },
            { key: 'NumeroDocumento', label: t('contractors.colId', 'Número de Documento'), selected: true },
            { key: 'Email', label: t('party.email', 'Email'), selected: true },
            { key: 'Telefono', label: t('party.phone', 'Teléfono'), selected: true },
            { key: 'Address', label: t('import.colAddress', 'Dirección'), selected: true },
            { key: 'Estado', label: t('docTypes.colStatus', 'Estado'), selected: true },
          ]}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportConfirm}
          isExporting={bulkDissociating}
        />
      )}
      {showBulkDissociateConfirm && (
        <div className="overlay" role="alertdialog" aria-modal="true" aria-label={t('clients.detail.confirmBulkDissociateTitle', 'Quitar contratistas')}>
          <div className="card" style={{ maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0 }}>
              {t('clients.detail.confirmBulkDissociateTitle', 'Quitar contratistas')}
            </h2>
            <p className="muted" style={{ marginBottom: '1.5rem' }}>
              {t('clients.detail.confirmBulkDissociate', { count: selectedContractors.size, defaultValue: `¿Estás seguro de quitar ${selectedContractors.size} contratistas seleccionados?` })}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" onClick={() => setShowBulkDissociateConfirm(false)} disabled={bulkDissociating}>
                {t('common.cancel', 'Cancelar')}
              </button>
              <button type="button" className="btn danger" onClick={executeBulkDissociate} disabled={bulkDissociating}>
                {t('clients.detail.dissociateSelected', { count: selectedContractors.size, defaultValue: `Quitar seleccionados (${selectedContractors.size})` })}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
