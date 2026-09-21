import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  associateContractor,
  dissociateContractor,
  fetchClientContractors,
} from '../api/clients';
import { fetchContractors } from '../api/contractors';
import type { Party, PartyContractor } from '../types/party';
import { getApiErrorMessage } from '../utils/apiErrors';
import { useSortableTable } from '../hooks/useSortableTable';
import { PartyDetailModal } from './PartyDetailModal';

export function ClientContractorsSection({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  const [contractors, setContractors] = useState<PartyContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Party[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [viewingParty, setViewingParty] = useState<PartyContractor | null>(null);

  const { items: sortedContractors, requestSort, getSortIndicator } = useSortableTable(
    contractors.filter(c => localSearch ? (c.fullName.toLowerCase().includes(localSearch.toLowerCase()) || (c.documentNumber && c.documentNumber.includes(localSearch))) : true),
    { key: 'fullName', direction: 'asc' }
  );

  async function load() {
    setLoading(true);
    try {
      setContractors(await fetchClientContractors(clientId));
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

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await fetchContractors({ search: term });
        setResults(found.filter((p) => p.id !== clientId));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, clientId]);

  async function handleAssociate(contractorId: number) {
    setError(null);
    try {
      const updated = await associateContractor(clientId, contractorId);
      setContractors(updated);
      setSearch('');
      setResults([]);
    } catch (err) {
      setError(getApiErrorMessage(t, err));
    }
  }

  async function handleDissociate(contractorId: number) {
    setError(null);
    try {
      setContractors(await dissociateContractor(clientId, contractorId));
    } catch (err) {
      setError(getApiErrorMessage(t, err));
    }
  }

  const associatedIds = new Set(contractors.map((c) => c.id));

  return (
    <section className="card">
      <h2>
        {t('clients.detail.contractors')} ({contractors.length})
      </h2>

      <div className="field">
        <input
          type="search"
          placeholder={t('clients.detail.associatePlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('clients.detail.associate')}
        />
        <small className="muted">{t('clients.detail.associateHint')}</small>
      </div>

      {searching && <p className="muted">{t('table.loading')}</p>}
      {results.length > 0 && (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <ul className="list picker">
            {results.map((party) => (
              <li key={party.id}>
                <span>
                  <strong>{party.fullName}</strong>
                  <br />
                  <span className="muted">
                    {party.kind === 'COMPANY' ? t('clients.kindCompany') : t('clients.kindPerson')}
                    {party.documentNumber ? ` · ${party.documentNumber}` : ''}
                    {party.isClient ? ` · ${t('contractors.isClientBadge')}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn small primary"
                  disabled={associatedIds.has(party.id)}
                  onClick={() => handleAssociate(party.id)}
                >
                  {t('clients.detail.associate')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          <div className="field" style={{ marginBottom: '1rem', marginTop: '2rem' }}>
            <input
              type="search"
              placeholder={t('clients.searchPlaceholder')}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              aria-label={t('clients.searchLabel')}
            />
          </div>
          <div className="table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('fullName')}>
                    {t('contractors.colName')}{getSortIndicator('fullName')}
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('kind')}>
                    {t('contractors.colKind')}{getSortIndicator('kind')}
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('documentNumber')}>
                    {t('contractors.colId')}{getSortIndicator('documentNumber')}
                  </th>
                  <th className="actions-col">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedContractors.map((contractor) => (
                  <tr key={contractor.id} onClick={() => setViewingParty(contractor)} style={{ cursor: 'pointer' }}>
                    <td className="strong">
                      {contractor.fullName}{' '}
                      {contractor.isClient && (
                        <span className="badge admin">{t('contractors.isClientBadge')}</span>
                      )}
                    </td>
                    <td className="muted">
                      {contractor.kind === 'COMPANY' ? t('clients.kindCompany') : t('clients.kindPerson')}
                    </td>
                    <td className="muted mono">
                      {contractor.documentNumber ?? ''}
                    </td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/contractors`} state={{ edit: contractor.id }} className="btn small icon-only ghost" title={t('common.edit')}>
                        <Pencil size={16} />
                      </Link>
                      <button
                        type="button"
                        className="btn small danger-outline"
                        onClick={() => handleDissociate(contractor.id)}
                      >
                        {t('clients.detail.dissociate')}
                      </button>
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
    </section>
  );
}
