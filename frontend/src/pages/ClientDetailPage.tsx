import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchClientDetail } from '../api/clients';
import { fetchDocumentTypes } from '../api/documentTypes';
import { ClientContractorsSection } from '../components/ClientContractorsSection';
import type { ClientDetail, DocumentType } from '../types/party';
import { getClientTypes } from '../types/party';
import { getApiErrorMessage } from '../utils/apiErrors';

export function formatAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const line1 = parts.street ?? '';
  const cityState = [parts.city, parts.state].filter(Boolean).join(', ');
  const line2 = [cityState, parts.zip].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(' — ');
}

export function ClientDetailPage({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'contacts';

  function handleTabChange(tab: string) {
    setSearchParams({ tab });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [detail, types] = await Promise.all([
          fetchClientDetail(clientId),
          fetchDocumentTypes(),
        ]);
        if (!cancelled) {
          setClient(detail);
          setDocTypes(types);
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(t, err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (loading) {
    return (
      <div className="page">
        <div className="card" role="status" aria-label={t('clients.title')}>
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="page">
        <div className="card empty">
          <p className="empty-title">{error ?? t('clients.loadErrorTitle')}</p>
          <Link to="/clients" className="btn primary">
            {t('clients.detail.back')}
          </Link>
        </div>
      </div>
    );
  }

  const fiscal = client.addresses?.find((a) => a.kind === 'FISCAL');

  return (
    <div className="page">
      <Link to="/clients" className="back-link">
        ← {t('clients.detail.back')}
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('clients.eyebrow')}</p>
          <h1>{client.fullName}</h1>
          <p className="muted">
            {client.kind === 'COMPANY' ? t('clients.kindCompany') : t('clients.kindPerson')}
            {(() => {
              const types = getClientTypes(client);
              if (types.length === 0) return ` · ${t('common.notAssigned')}`;
              return ` · ${types
                .map((type) =>
                  type === 'ACCOUNTING' ? t('clients.typeAccounting') : t('clients.typePayroll'),
                )
                .join(', ')}`;
            })()}
            {client.documentType?.code ? ` · ${client.documentType.code}` : ''}
            {client.documentNumber ? ` ${client.documentNumber}` : ''}
          </p>
        </div>
        <Link to={`/clients/${clientId}/contractors/import`} className="btn">
          {t('import.bulkContractors')}
        </Link>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => handleTabChange('contacts')}
        >
          {t('clients.detail.contacts')}
        </button>
        <button
          className={`tab ${activeTab === 'addresses' ? 'active' : ''}`}
          onClick={() => handleTabChange('addresses')}
        >
          {t('clients.detail.addresses')}
        </button>
        <button
          className={`tab ${activeTab === 'contractors' ? 'active' : ''}`}
          onClick={() => handleTabChange('contractors')}
        >
          {t('clients.detail.contractors')}
        </button>
      </div>

      {activeTab === 'contacts' && (
        <section className="card">
          <h2>{t('clients.detail.contacts')}</h2>
          {!client.contacts?.length ? (
            <p className="muted">{t('clients.detail.noContacts')}</p>
          ) : (
            <ul className="list">
              {client.contacts.map((c) => (
                <li key={c.id}>
                  <strong>
                    {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '—'}
                  </strong>
                  {c.isPrimary && <span className="badge ok">{t('clients.detail.primary')}</span>}
                  <br />
                  <span className="muted">
                    {[c.email, c.phone].filter(Boolean).join(' · ')}
                    {c.documentNumber
                      ? ` · ${(c.documentType?.code ?? docTypes.find((d) => d.id === c.documentTypeId)?.code ?? '')} ${c.documentNumber}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'addresses' && (
        <section className="card">
          <h2>{t('clients.detail.addresses')}</h2>
          {!client.addresses?.length ? (
            <p className="muted">{t('clients.detail.noAddresses')}</p>
          ) : (
            <ul className="list">
              {client.addresses.map((a) => (
                <li key={a.id}>
                  <span className="badge">
                    {a.kind === 'FISCAL'
                      ? t('clients.detail.fiscal')
                      : a.kind === 'MAILING'
                        ? t('clients.detail.mailing')
                        : t('clients.detail.other')}
                  </span>{' '}
                  {a.kind === 'MAILING' && a.sameAsFiscal && fiscal
                    ? `${formatAddress(fiscal)} (${t('clients.detail.sameAsFiscal')})`
                    : formatAddress(a)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'contractors' && (
        <ClientContractorsSection clientId={clientId} />
      )}
    </div>
  );
}
