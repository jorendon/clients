import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HelpCircle, Upload } from 'lucide-react';
import { checkContractorDuplicates, importClientContractors, type ImportReport, type DuplicateResult } from '../api/import';
import { ImportStagingTable, type StagingColumn } from '../components/ImportStagingTable';
import { ImportHelpModal } from '../components/ImportHelpModal';
import { getApiErrorMessage, translateBackendMessage } from '../utils/apiErrors';
import { fetchDocumentTypes } from '../api/documentTypes';
import type { DocumentType } from '../types/party';
import {
  hasRequiredColumn,
  mapContractorRows,
  parseUploadFile,
  validateUploadFile,
  type StagedContractorRow,
} from '../utils/csvImport';

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
          <strong>{report.associated}</strong> {t('import.statAssociated')}
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
      <div style={{ marginTop: '1.5rem' }}>
        <Link to={`/contractors`} className="btn primary">
          {t('import.goToContractors', 'Ir a contratistas de este cliente')}
        </Link>
      </div>
    </div>
  );
}

export function ClientContractorsImportPage({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StagedContractorRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'full' | 'names'>('full');
  
  const [duplicateConflicts, setDuplicateConflicts] = useState<DuplicateResult[] | null>(null);

  useEffect(() => {
    fetchDocumentTypes().then(setDocTypes).catch(console.error);
  }, []);

  const columns: StagingColumn<StagedContractorRow>[] = useMemo(
    () => [
      { key: 'name', label: t('contractors.colName'), width: '220px' },
      {
        key: 'kind',
        label: t('contractors.colKind'),
        kind: 'select',
        options: [
          { value: 'PERSON', label: t('clients.kindPerson') },
          { value: 'COMPANY', label: t('clients.kindCompany') },
        ],
      },
      { key: 'address', label: t('import.colAddress'), width: '260px' },
      {
        key: 'documentTypeId',
        label: t('party.documentType'),
        kind: 'select',
        options: docTypes.map((dt) => ({ value: String(dt.id), label: dt.name })),
        width: '180px',
      },
      { key: 'id', label: t('party.contactDocNumber') },
      { key: 'email', label: t('party.email') },
      { key: 'phone', label: t('party.phone') },
    ],
    [t, docTypes],
  );

  const activeColumns = useMemo(() => {
    let cols = columns;
    if (uploadType === 'names') {
      cols = columns.filter(c => c.key === 'name');
    }
    
    if (duplicateConflicts && duplicateConflicts.length > 0) {
      cols = [
        ...cols,
        {
          key: 'mergeId',
          label: t('import.colAction', 'Acción'),
          kind: 'dynamic-select',
          width: '260px',
          getOptions: (row) => {
            const conflict = duplicateConflicts.find(c => c.name === row.name);
            if (!conflict) return [{ value: 'new', label: t('import.actionNew', 'Crear como nuevo (Incompleto)') }];
            
            return [
              { value: 'new', label: t('import.actionNew', 'Crear como nuevo (Incompleto)') },
              ...conflict.matches.map(m => ({
                value: String(m.id),
                label: `${t('import.actionLink', 'Vincular con:')} ${m.fullName} ${m.documentNumber ? `(${m.documentNumber})` : ''}`
              }))
            ];
          }
        } as StagingColumn<StagedContractorRow>
      ];
    }
    return cols;
  }, [columns, uploadType, duplicateConflicts, t]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.id.toLowerCase().includes(term) ||
        row.address.toLowerCase().includes(term),
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
      if (!hasRequiredColumn(parsed, 'contractor')) {
        throw new Error('missing-column');
      }
      const mapped = mapContractorRows(parsed);

      const normalizedDocTypes = docTypes.map(dt => ({
        id: String(dt.id),
        matchers: [
          dt.code.toLowerCase().replace(/[^a-z0-9]/g, ''),
          dt.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        ]
      }));

      const withDocTypes = mapped.map(row => {
        if (!row.idType) return row;
        const search = row.idType.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = normalizedDocTypes.find(dt => dt.matchers.includes(search));
        return match ? { ...row, documentTypeId: match.id } : row;
      });

      // Remove duplicate rows in the parsed file
      const seen = new Set<string>();
      const deduplicated = withDocTypes.filter(row => {
        const uniqueKey = (row.id ? row.id.toLowerCase() : row.name.toLowerCase()).trim();
        if (seen.has(uniqueKey)) return false;
        seen.add(uniqueKey);
        return true;
      });

      let finalRows = deduplicated;

      if (uploadType === 'names') {
        const names = deduplicated.map((r) => r.name);
        try {
          const results = await checkContractorDuplicates(clientId, names);
          const withMatches = results.filter((r) => r.matches.length > 0);
          setDuplicateConflicts(withMatches);
          
          finalRows = deduplicated.map(r => {
            const hasConflict = withMatches.some(m => m.name === r.name);
            return hasConflict ? { ...r, mergeId: 'new' as any } : r;
          });
        } catch (err) {
          console.error('Error checking duplicates', err);
        }
      } else {
        setDuplicateConflicts(null);
      }

      setRows(finalRows);
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
      setDuplicateConflicts(null);
    }
  }

  function handleChange(key: number, field: keyof StagedContractorRow, value: string) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function handleBulkChange(keys: number[], field: keyof StagedContractorRow, value: string) {
    const next = rows.map((r) => {
      if (keys.includes(r.key)) {
        return { ...r, [field]: value };
      }
      return r;
    });
    setRows(next);
  }

  function handleBulkDelete(keys: number[]) {
    const next = rows.filter((r) => !keys.includes(r.key));
    setRows(next);
  }

  async function handleProcess() {
    setProcessing(true);
    setProcessError(null);
    try {
      const finalRows = rows.map(r => {
        if ((r.mergeId as any) === 'new' || !r.mergeId) {
          const { mergeId, ...rest } = r;
          return rest;
        }
        return { ...r, mergeId: Number(r.mergeId) };
      });
      await executeImport(finalRows as StagedContractorRow[]);
    } catch (error) {
      setProcessError(getApiErrorMessage(t, error));
      setProcessing(false);
    }
  }

  async function executeImport(finalRows: StagedContractorRow[]) {
    setReport(await importClientContractors(clientId, finalRows));
    setProcessing(false);
  }

  return (
    <div className="page">
      <Link to="/contractors" className="back-link">
        {t('import.backToContractors', '← Volver a contratistas')}
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('import.eyebrowContractors')}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1>{t('import.titleContractors')}</h1>
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
        <div className="field-group" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="uploadType" 
              value="full" 
              checked={uploadType === 'full'} 
              onChange={() => setUploadType('full')} 
            />
            {t('import.uploadTypeFull', 'Carga Completa')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="uploadType" 
              value="names" 
              checked={uploadType === 'names'} 
              onChange={() => setUploadType('names')} 
            />
            {t('import.uploadTypeNames', 'Solo Nombres')}
          </label>
        </div>

        <label className="field">
          <span>{t('import.fileLabel')}</span>
          <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} />
          <small className="muted">{t('import.expectedContractors')}</small>
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
            columns={activeColumns}
            search={search}
            searchPlaceholder={t('import.searchPlaceholder')}
            getRowLabel={(row) => row.name}
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
              className="btn"
              disabled={processing || rows.length === 0}
              onClick={handleProcess}
              style={{
                backgroundColor: 'var(--ok)',
                color: 'white',
                borderColor: 'var(--ok)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Upload size={18} />
              {processing ? t('common.saving') : t('import.process', { count: rows.length })}
            </button>
          </div>
        </>
      )}

      {report && <ImportReportView report={report} />}

      <ImportHelpModal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        mode={uploadType === 'names' ? 'contractor-names' : 'contractor'} 
      />
    </div>
  );
}
