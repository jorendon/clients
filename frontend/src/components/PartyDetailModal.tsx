import { useTranslation } from 'react-i18next';
import type { PartyContractor } from '../types/party';
import { formatAddress } from '../pages/ClientDetailPage';

export function PartyDetailModal({ party, onClose }: { party: PartyContractor; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="card form">
        <h2>{party.fullName}</h2>
        <div style={{ marginBottom: '1rem' }}>
          <strong>{t('contractors.colKind')}:</strong> {party.kind === 'COMPANY' ? t('clients.kindCompany') : t('clients.kindPerson')}
          {party.documentNumber && (
            <div>
              <strong>{party.documentType?.code ?? t('contractors.colIdType')}:</strong> {party.documentNumber}
            </div>
          )}
        </div>
        
        {party.addresses && party.addresses.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <strong>{t('clients.detail.addresses')}</strong>
            <ul className="list">
              {party.addresses.map((addr, i) => (
                <li key={i}>{formatAddress(addr)}</li>
              ))}
            </ul>
          </div>
        )}

        {party.contacts && party.contacts.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <strong>{t('clients.detail.contacts')}</strong>
            <ul className="list">
              {party.contacts.map((c, i) => (
                <li key={i}>
                  {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''} {c.phone ? `(${c.phone})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
