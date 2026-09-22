import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ImportHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'client' | 'contractor' | 'contractor-names';
}

export function ImportHelpModal({ isOpen, onClose, mode }: ImportHelpModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const downloadTemplate = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = "";

    if (mode === 'client') {
      csvContent += "Name,Type,ClientType,DocumentType,DocumentNumber,Email,Phone,ContactFirstName,ContactLastName,ContactEmail,ContactPhone,Address\n";
      csvContent += "Acme Corp,COMPANY,ACCOUNTING,FEI/EIN,123456789,acme@example.com,555-0100,John,Doe,john@example.com,555-0101,123 Main St Miami FL 33101\n";
      filename = "clients_template.csv";
    } else if (mode === 'contractor-names') {
      csvContent += "Name\n";
      csvContent += "Jane Smith\n";
      csvContent += "Acme Corp\n";
      filename = "contractors_names_template.csv";
    } else {
      csvContent += "Name,Type,DocumentType,DocumentNumber,Email,Phone,Address\n";
      csvContent += "Jane Smith,PERSON,SSN,987654321,jane@example.com,555-0200,456 Oak St Orlando FL 32801\n";
      filename = "contractors_template.csv";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <dialog 
      ref={dialogRef} 
      className="import-help-modal" 
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      <div className="modal-content">
        <header className="modal-header">
          <h2>{t('import.helpTitle')}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label={t('import.close')}>
            <X size={20} />
          </button>
        </header>
        
        <div className="modal-body">
          {mode !== 'contractor-names' && (
            <p>
              {t('import.helpDesc')}
              <br /><br />
              <strong>{t('import.idTypeNoteTitle', 'Nota sobre Tipo de Identificación (ID Type):')}</strong> {t('import.idTypeNoteDesc', 'Debes colocar el código o nombre exacto configurado en el sistema (ej. FEI_EIN, FEI/EIN, SSN, ITIN).')}
            </p>
          )}
          
          {mode === 'client' ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name / Nombre</th>
                    <th>Type / Tipo</th>
                    <th>ClientType</th>
                    <th>Email / Correo</th>
                    <th>Phone / Teléfono</th>
                    <th>Address / Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Acme Corp</td>
                    <td>COMPANY</td>
                    <td>ACCOUNTING</td>
                    <td>acme@example.com</td>
                    <td>555-0100</td>
                    <td>123 Main St Miami FL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : mode === 'contractor-names' ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name / Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Jane Smith</td>
                  </tr>
                  <tr>
                    <td>Acme Corp</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name / Nombre</th>
                    <th>Type / Tipo</th>
                    <th>IdType / Tipo ID</th>
                    <th>Id / Identificación</th>
                    <th>Email</th>
                    <th>Address / Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Jane Smith</td>
                    <td>PERSON</td>
                    <td>SSN</td>
                    <td>987-65-4321</td>
                    <td>jane@example.com</td>
                    <td>456 Oak St</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn secondary" onClick={downloadTemplate}>
              <Download size={16} style={{ marginRight: '0.5rem' }} />
              {t('import.downloadTemplate')}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
