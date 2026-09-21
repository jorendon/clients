import { useTranslation } from 'react-i18next';

export interface StagingColumn<Row> {
  key: keyof Row;
  label: string;
  kind?: 'text' | 'select' | 'multiselect';
  options?: { value: string; label: string }[];
  width?: string;
}

interface ImportStagingTableProps<Row extends { key: number }> {
  rows: Row[];
  filtered: Row[];
  columns: StagingColumn<Row>[];
  search: string;
  searchPlaceholder: string;
  getRowLabel: (row: Row) => string;
  onSearch: (value: string) => void;
  onChange: (key: number, field: keyof Row, value: string) => void;
  onDelete: (key: number) => void;
}

export function ImportStagingTable<Row extends { key: number }>({
  rows,
  filtered,
  columns,
  search,
  searchPlaceholder,
  getRowLabel,
  onSearch,
  onChange,
  onDelete,
}: ImportStagingTableProps<Row>) {
  const { t } = useTranslation();

  return (
    <>
      <section className="toolbar card">
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label={searchPlaceholder}
        />
        <span className="muted">
          {filtered.length} / {rows.length}
        </span>
      </section>

      <div className="card table-wrap staging-wrap">
        <table className="table staging">
          <thead>
            <tr>
              <th>#</th>
              {columns.map((col) => (
                <th key={String(col.key)} style={col.width ? { minWidth: col.width } : undefined}>
                  {col.label}
                </th>
              ))}
              <th className="actions-col">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={row.key} className={!getRowLabel(row).trim() ? 'row-error' : undefined}>
                <td className="muted">{index + 1}</td>
                {columns.map((col) => (
                  <td key={String(col.key)}>
                    {col.kind === 'multiselect' && col.options ? (
                      <span className="multi-check">
                        {col.options.map((opt) => {
                          const current = String(row[col.key] ?? '')
                            .split(',')
                            .map((v) => v.trim())
                            .filter(Boolean);
                          const checked = current.includes(opt.value);
                          return (
                            <label key={opt.value} className="check inline">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...current, opt.value]
                                    : current.filter((v) => v !== opt.value);
                                  onChange(row.key, col.key, next.join(', '));
                                }}
                                aria-label={`${col.label}: ${opt.label}`}
                              />
                              {opt.label}
                            </label>
                          );
                        })}
                      </span>
                    ) : col.kind === 'select' && col.options ? (
                      <select
                        value={String(row[col.key] ?? '')}
                        onChange={(e) => onChange(row.key, col.key, e.target.value)}
                        aria-label={col.label}
                      >
                        <option value="">—</option>
                        {col.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={String(row[col.key] ?? '')}
                        onChange={(e) => onChange(row.key, col.key, e.target.value)}
                        aria-label={col.label}
                      />
                    )}
                  </td>
                ))}
                <td className="actions">
                  <button
                    type="button"
                    className="btn small danger-outline"
                    onClick={() => onDelete(row.key)}
                    aria-label={`${t('common.delete')} ${index + 1}`}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
