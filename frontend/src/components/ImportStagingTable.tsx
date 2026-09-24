import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

export interface StagingColumn<Row> {
  key: keyof Row;
  label: string;
  kind?: 'text' | 'select' | 'multiselect' | 'dynamic-select';
  options?: { value: string; label: string }[];
  getOptions?: (row: Row) => { value: string; label: string }[];
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
  onBulkChange?: (keys: number[], field: keyof Row, value: string) => void;
  onBulkDelete?: (keys: number[]) => void;
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
  onBulkChange,
  onBulkDelete,
}: ImportStagingTableProps<Row>) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkField, setBulkField] = useState<keyof Row | ''>('');
  const [bulkValue, setBulkValue] = useState('');

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && selected.size < filtered.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.key)));
    }
  }

  function toggleRow(key: number) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }

  function handleBulkApply() {
    if (!bulkField || selected.size === 0 || !onBulkChange) return;
    onBulkChange(Array.from(selected), bulkField as keyof Row, bulkValue);
    setBulkField('');
    setBulkValue('');
    setSelected(new Set());
  }

  function handleBulkDeleteClick() {
    if (selected.size === 0 || !onBulkDelete) return;
    onBulkDelete(Array.from(selected));
    setSelected(new Set());
  }

  const selectedCol = columns.find((c) => c.key === bulkField);

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

      {selected.size > 0 && onBulkChange && (
        <section className="toolbar card" style={{ background: '#E3FCEF', borderColor: '#006644' }}>
          <strong style={{ color: '#006644' }}>{selected.size} seleccionados</strong>
          <select
            value={String(bulkField)}
            onChange={(e) => {
              setBulkField(e.target.value as keyof Row);
              setBulkValue('');
            }}
          >
            <option value="">— Elegir campo a editar —</option>
            {columns.map((col) => (
              <option key={String(col.key)} value={String(col.key)}>
                {col.label}
              </option>
            ))}
          </select>

          {selectedCol && (
            <>
              {selectedCol.kind === 'select' || selectedCol.kind === 'multiselect' ? (
                <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
                  <option value="">— Elegir valor —</option>
                  {selectedCol.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nuevo valor..."
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                />
              )}
              <button
                type="button"
                className="btn primary"
                onClick={handleBulkApply}
                disabled={!bulkValue && selectedCol.kind === 'select'}
              >
                Aplicar
              </button>
            </>
          )}

          {onBulkDelete && (
            <button
              type="button"
              className="btn danger-outline"
              onClick={handleBulkDeleteClick}
              style={{ marginLeft: 'auto' }}
            >
              Borrar seleccionadas
            </button>
          )}
        </section>
      )}

      <div className="card table-wrap staging-wrap">
        <table className="table staging">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </th>
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
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(row.key)}
                    onChange={() => toggleRow(row.key)}
                    aria-label={`Seleccionar fila ${index + 1}`}
                  />
                </td>
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
                    ) : (col.kind === 'select' && col.options) || (col.kind === 'dynamic-select' && col.getOptions) ? (
                      <select
                         style={{ width: '100%', minWidth: '120px' }}
                        value={String(row[col.key] ?? '')}
                        onChange={(e) => onChange(row.key, col.key, e.target.value)}
                        aria-label={col.label}
                      >
                        <option value="">—</option>
                        {(col.kind === 'dynamic-select' ? col.getOptions!(row) : col.options!).map((opt) => (
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
                    className="btn small danger-outline icon-only"
                    onClick={() => onDelete(row.key)}
                    title={t('common.delete')}
                    aria-label={`${t('common.delete')} ${index + 1}`}
                  >
                    <Trash2 size={16} />
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
