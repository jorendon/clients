import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { importClients, type ImportReport } from '../api/import';
import { ImportStagingTable, type StagingColumn } from '../components/ImportStagingTable';
import { ImportHelpModal } from '../components/ImportHelpModal';
import { getApiErrorMessage, translateBackendMessage } from '../utils/apiErrors';
import { fetchDocumentTypes } from '../api/documentTypes';
import type { DocumentType } from '../types/party';
import { hasRequiredColumn, mapClientRows, parseUploadFile, validateUploadFile, type StagedClientRow } from '../utils/csvImport';
import { VISIBLE_CLIENT_TYPES } from '../types/party';

function ImportReportView({ report }: { report: ImportReport }) {
  const { t } = useTranslation();
  return (
    <div className="card">
      <h2>{t('import.reportTitle')}</h2>
      <ul className="stats">
        <li>
          <strong>{report.total}</strong> {t('import.statTotal')}
        </li>
        <li>
          <strong>{report.created}</strong> {t('import.statCreated')}
        </li>
        <li>
          <strong>{report.markedClient}</strong> {t('import.statMarked')}
        </li>
        <li>
          <strong>{report.existing}</strong> {t('import.statExisting')}
        </li>
        <li>
          <strong>{report.duplicatesInFile}</strong> {t('import.statDuplicates')}
        </li>
        <li>
          <strong>{report.errors.length}</strong> {t('import.statErrors')}
        </li>
      </ul>
      {report.errors.length > 0 && (
        <ul className="list">
          {report.errors.map((item, index) => (
            <li key={index}>
              <span>
                {t('import.rowLabel', { row: item.row })}: {translateBackendMessage(t, item.message)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ClientsImportPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StagedClientRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    fetchDocumentTypes().then(setDocTypes).catch(console.error);
  }, []);

  const columns: StagingColumn<StagedClientRow>[] = useMemo(
    () => [
      { key: 'fullName', label: t('clients.colName'), width: '220px' },
      {
        key: 'kind',
        label: t('clients.colKind'),
        kind: 'select',
        options: [
          { value: 'PERSON', label: t('clients.kindPerson') },
          { value: 'COMPANY', label: t('clients.kindCompany') },
        ],
      },
      {
        key: 'clientType',
        label: t('clients.colClientType'),
        kind: 'multiselect',
        width: '200px',
        options: VISIBLE_CLIENT_TYPES.map((type) => ({
          value: type,
          label:
            type === 'ACCOUNTING' ? t('clients.typeAccounting') : t('clients.typePayroll'),
        })),
      },
      {
        key: 'documentTypeId',
        label: t('party.documentType'),
        kind: 'select',
        options: docTypes.map((dt) => ({ value: String(dt.id), label: dt.name })),
        width: '180px',
      },
      { key: 'documentNumber', label: t('party.documentNumber') },
      { key: 'registryNumber', label: t('party.registryNumber') },
      { key: 'email', label: t('party.email') },
      { key: 'phone', label: t('party.phone') },
      { key: 'address', label: t('import.colAddress'), width: '260px' },
    ],
    [t, docTypes],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.fullName.toLowerCase().includes(term) ||
        row.documentNumber.toLowerCase().includes(term) ||
        row.email.toLowerCase().includes(term),
    );
  }, [rows, search]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setReport(null);
    setProcessError(null);
    const formatError = validateUploadFile(file);
    if (formatError) {
      setFileError(t(formatError));
      setRows([]);
      setFileName('');
      return;
    }
    try {
      const parsed = await parseUploadFile(file);
      if (!hasRequiredColumn(parsed, 'client')) {
        throw new Error('missing-column');
      }
      const mapped = mapClientRows(parsed);
      
      const normalizedDocTypes = docTypes.map(dt => ({
        id: String(dt.id),
        matchers: [
          dt.code.toLowerCase().replace(/[^a-z0-9]/g, ''),
          dt.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        ]
      }));

      const withDocTypes = mapped.map(row => {
        if (!row.documentType) return row;
        const search = row.documentType.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = normalizedDocTypes.find(dt => dt.matchers.includes(search));
        return match ? { ...row, documentTypeId: match.id } : row;
      });

      if (withDocTypes.length === 0) throw new Error('empty');
      setRows(withDocTypes);
      setFileName(file.name);
      setSearch('');
    } catch (error) {
      setFileError(
        error instanceof Error && error.message === 'missing-column'
          ? t('import.missingNameColumn')
          : t('import.fileError'),
      );
      setRows([]);
      setFileName('');
    }
  }

  function handleChange(key: number, field: keyof StagedClientRow, value: string) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function handleBulkChange(keys: number[], field: keyof StagedClientRow, value: string) {
    const keySet = new Set(keys);
    setRows((prev) => prev.map((row) => (keySet.has(row.key) ? { ...row, [field]: value } : row)));
  }

  function handleBulkDelete(keys: number[]) {
    setRows((prev) => prev.filter((row) => !keys.includes(row.key)));
  }

  async function handleProcess() {
    setProcessing(true);
    setProcessError(null);
    try {
      setReport(await importClients(rows));
    } catch (error) {
      setProcessError(getApiErrorMessage(t, error));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="page">
      <Link to="/clients" className="back-link">
        ← {t('clients.detail.back')}
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('import.eyebrowClients')}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1>{t('import.titleClients')}</h1>
            <button 
              type="button" 
              className="btn small ghost" 
              onClick={() => setIsHelpOpen(true)}
              aria-label={t('import.helpTitle')}
              title={t('import.helpTitle')}
              style={{ color: 'var(--brand)' }}
            >
              <HelpCircle size={20} />
            </button>
          </div>
          <p className="muted">{t('import.subtitle')}</p>
        </div>
      </header>

      <section className="card form">
        <label className="field">
          <span>{t('import.fileLabel')}</span>
          <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} />
          <small className="muted">{t('import.expectedClients')}</small>
        </label>
        {fileName && <p className="muted">{fileName} · {rows.length}</p>}
        {fileError && (
          <p className="error" role="alert">
            {fileError}
          </p>
        )}
      </section>

      {rows.length > 0 && !report && (
        <>
          <ImportStagingTable
            rows={rows}
            filtered={filtered}
            columns={columns}
            search={search}
            searchPlaceholder={t('import.searchPlaceholder')}
            getRowLabel={(row) => row.fullName}
            onSearch={setSearch}
            onChange={handleChange}
            onBulkChange={handleBulkChange}
            onBulkDelete={handleBulkDelete}
            onDelete={(key) => setRows((prev) => prev.filter((row) => row.key !== key))}
          />
          {processError && (
            <p className="error" role="alert">
              {processError}
            </p>
          )}
          <div className="form-actions sticky-bar">
            <button
              type="button"
              className="btn primary"
              disabled={processing || rows.length === 0}
              onClick={handleProcess}
            >
              {processing ? t('common.saving') : t('import.process', { count: rows.length })}
            </button>
          </div>
        </>
      )}

      {report && <ImportReportView report={report} />}

      <ImportHelpModal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        mode="client" 
      />
    </div>
  );
}
