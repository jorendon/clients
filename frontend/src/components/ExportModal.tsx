import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileSpreadsheet, FileText } from 'lucide-react';

export type ExportFormat = 'EXCEL' | 'PDF';

export interface ColumnOption {
  key: string;
  label: string;
  selected: boolean;
}

interface ExportModalProps {
  title: string;
  initialColumns: ColumnOption[];
  onClose: () => void;
  onExport: (format: ExportFormat, selectedColumns: string[]) => void;
  isExporting: boolean;
}

export function ExportModal({ title, initialColumns, onClose, onExport, isExporting }: ExportModalProps) {
  const { t } = useTranslation();
  
  const [columns, setColumns] = useState<ColumnOption[]>(initialColumns);

  const handleToggleColumn = (key: string) => {
    setColumns(prev => prev.map(c => c.key === key ? { ...c, selected: !c.selected } : c));
  };

  const handleExport = (format: ExportFormat) => {
    const selectedKeys = columns.filter(c => c.selected).map(c => c.key);
    if (selectedKeys.length === 0) return;
    onExport(format, selectedKeys);
  };

  const allSelected = columns.every(c => c.selected);
  const handleToggleAll = () => {
    const newState = !allSelected;
    setColumns(prev => prev.map(c => ({ ...c, selected: newState })));
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button type="button" className="btn icon-only ghost" onClick={onClose} aria-label={t('common.close')} style={{ padding: '0.2rem' }}>
            <X size={20} />
          </button>
        </header>
        
        <div>
          <p className="muted" style={{ marginBottom: '1.5rem' }}>
            {t('export.subtitle', 'Selecciona las columnas que deseas incluir en el reporte generado.')}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <label className="check" style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
              <input 
                type="checkbox" 
                checked={allSelected} 
                onChange={handleToggleAll} 
              />
              {t('export.selectAll', 'Seleccionar todo')}
            </label>
            {columns.map(col => (
              <label key={col.key} className="check" style={{ fontSize: '0.95rem' }}>
                <input 
                  type="checkbox" 
                  checked={col.selected} 
                  onChange={() => handleToggleColumn(col.key)} 
                />
                {col.label}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn ghost" 
              onClick={() => handleExport('EXCEL')}
              disabled={isExporting || columns.every(c => !c.selected)}
              style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <FileSpreadsheet size={18} color="#107C41" />
              {t('export.excel', 'Exportar a Excel')}
            </button>
            <button 
              type="button" 
              className="btn primary" 
              onClick={() => handleExport('PDF')}
              disabled={isExporting || columns.every(c => !c.selected)}
              style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <FileText size={18} />
              {t('export.pdf', 'Descargar PDF')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
