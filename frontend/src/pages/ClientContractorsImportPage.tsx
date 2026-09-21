import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { importClientContractors, type ImportReport } from '../api/import';
import { ImportStagingTable, type StagingColumn } from '../components/ImportStagingTable';
import { getApiErrorMessage, translateBackendMessage } from '../utils/apiErrors';
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
      { key: 'idType', label: t('contractors.colIdType') },
      { key: 'id', label: t('party.contactDocNumber') },
      { key: 'email', label: t('party.email') },
      { key: 'phone', label: t('party.phone') },
    ],
    [t],
  );

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
      if (mapped.length === 0) throw new Error('empty');
      setRows(mapped);
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

  function handleChange(key: number, field: keyof StagedContractorRow, value: string) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  async function handleProcess() {
    setProcessing(true);
    setProcessError(null);
    try {
      setReport(await importClientContractors(clientId, rows));
    } catch (error) {
      setProcessError(getApiErrorMessage(t, error));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="page">
      <Link to={`/clients/${clientId}`} className="back-link">
        ← {t('clients.detail.back')}
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('import.eyebrowContractors')}</p>
          <h1>{t('import.titleContractors')}</h1>
          <p className="muted">{t('import.subtitle')}</p>
        </div>
      </header>

      <section className="card form">
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
            columns={columns}
            search={search}
            searchPlaceholder={t('import.searchPlaceholder')}
            getRowLabel={(row) => row.name}
            onSearch={setSearch}
            onChange={handleChange}
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
    </div>
  );
}
