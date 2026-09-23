import { useEffect, useState } from 'react';
import { useActiveClient } from '../context/ActiveClientContext';
import { useTranslation } from 'react-i18next';
import { fetchClientDetail, updateClient } from '../api/clients';
import { fetchDocumentTypes } from '../api/documentTypes';
import type { Party, DocumentType, PartyInput } from '../types/party';
import { PartyForm } from '../components/PartyForm';
import { getApiErrorMessage } from '../utils/apiErrors';
import { MaskedDocument } from '../components/MaskedDocument';

export function ClientSettingsPage() {
  const { activeClientId } = useActiveClient();
  const { t } = useTranslation();
  
  const [client, setClient] = useState<Party | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!activeClientId) return;
      setLoading(true);
      setError(null);
      try {
        const [detail, types] = await Promise.all([
          fetchClientDetail(activeClientId),
          fetchDocumentTypes(),
        ]);
        setClient(detail);
        setDocTypes(types);
      } catch (err) {
        setError(getApiErrorMessage(t, err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeClientId, t]);

  async function handleSubmit(input: PartyInput) {
    if (!activeClientId) return;
    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateClient(activeClientId, input);
      setClient(updated);
      setShowForm(false);
    } catch (err) {
      setFormError(getApiErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  }

  if (!activeClientId) {
    return (
      <div className="page">
        <div className="card empty" style={{ marginTop: '2rem' }}>
          <p className="empty-title">{t('clients.selectClientToViewSettings', 'Seleccione un cliente')}</p>
          <p className="muted">{t('clients.selectClientSettingsHint', 'Por favor, seleccione un cliente en el menú superior para ver su configuración.')}</p>
        </div>
      </div>
    );
  }

  if (loading || !client) {
    return (
      <div className="page">
        <div className="card" role="status">
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card empty">
          <p className="empty-title">{t('common.error')}</p>
          <p className="muted">{error}</p>
        </div>
      </div>
    );
  }

  const primaryEmail = client.email;
  const primaryPhone = client.phone;
  const primaryAddress = client.addresses?.find(a => a.kind === 'FISCAL') || client.addresses?.[0];

  return (
    <div className="page client-settings-page">
      <div className="settings-container">
        
        <header className="settings-header">
          <div className="settings-icon-placeholder">
            {client.fullName.substring(0, 2).toUpperCase()}
          </div>
          <h1>{t('clients.settingsTitle', 'Configuración de Empresa')}</h1>
        </header>

        <section className="settings-section card">
          <div className="settings-section-header">
            <h2>{t('clients.settingsCompanyInfo', 'Company info')}</h2>
            <p className="muted">{t('clients.settingsCompanyInfoDesc', 'This info may be connected to the Business Network or used for billing purposes.')}</p>
          </div>
          <div className="settings-list">
            <div className="settings-row">
              <div className="settings-label">{t('clients.settingsName', 'Name')}</div>
              <div className="settings-value">{client.fullName}</div>
              <button type="button" className="btn link small" onClick={() => setShowForm(true)}>{t('common.edit', 'Edit')}</button>
            </div>
            <div className="settings-row">
              <div className="settings-label">{t('clients.settingsAddress', 'Address')}</div>
              <div className="settings-value">
                {primaryAddress ? (
                  <>
                    {primaryAddress.street}
                    <br />
                    {primaryAddress.city}, {primaryAddress.state} {primaryAddress.zip}
                  </>
                ) : (
                  <span className="muted">{t('clients.settingsNoneListed', 'None listed')}</span>
                )}
              </div>
              <button type="button" className="btn link small" onClick={() => setShowForm(true)}>{t('common.edit', 'Edit')}</button>
            </div>
            <div className="settings-row">
              <div className="settings-label">{t('clients.settingsEmail', 'Email')}</div>
              <div className="settings-value">
                {primaryEmail || <span className="muted">{t('clients.settingsNoneListed', 'None listed')}</span>}
              </div>
              <button type="button" className="btn link small" onClick={() => setShowForm(true)}>{t('common.edit', 'Edit')}</button>
            </div>
            <div className="settings-row">
              <div className="settings-label">{t('clients.settingsPhone', 'Phone')}</div>
              <div className="settings-value">
                {primaryPhone || <span className="muted">{t('clients.settingsNoneListed', 'None listed')}</span>}
              </div>
              <button type="button" className="btn link small" onClick={() => setShowForm(true)}>{t('common.edit', 'Edit')}</button>
            </div>
          </div>
        </section>

        <section className="settings-section card">
          <div className="settings-section-header">
            <h2>{t('clients.settingsLegalInfo', 'Legal info')}</h2>
            <p className="muted">{t('clients.settingsLegalInfoDesc', 'This is the info your business uses for tax purposes.')}</p>
          </div>
          <div className="settings-list">
            <div className="settings-row">
              <div className="settings-label">{t('clients.settingsLegalName', 'Legal business name')}</div>
              <div className="settings-value">{client.fullName}</div>
              <button type="button" className="btn link small" onClick={() => setShowForm(true)}>{t('common.edit', 'Edit')}</button>
            </div>
            <div className="settings-row">
              <div className="settings-label">{client.documentType ? client.documentType.code : 'EIN / SSN'}</div>
              <div className="settings-value">
                {client.documentNumber ? (
                  <MaskedDocument partyId={client.id} initialMasked={client.documentNumber} fallback="" />
                ) : (
                  <span className="muted">{t('clients.settingsNoneListed', 'None listed')}</span>
                )}
              </div>
              <button type="button" className="btn link small" onClick={() => setShowForm(true)}>{t('common.edit', 'Edit')}</button>
            </div>
            <div className="settings-row">
              <div className="settings-label">{t('clients.settingsBusinessType', 'Business type')}</div>
              <div className="settings-value">
                {client.kind === 'COMPANY' ? t('clients.kindCompany', 'Company') : t('clients.kindPerson', 'Person')}
              </div>
              <button type="button" className="btn link small" onClick={() => setShowForm(true)}>{t('common.edit', 'Edit')}</button>
            </div>
          </div>
        </section>

      </div>

      {showForm && (
        <div className="overlay" role="dialog" aria-modal="true">
          <PartyForm
            clientMode
            initialParty={client}
            documentTypes={docTypes}
            saving={saving}
            formError={formError}
            title={t('party.editClientTitle')}
            submitLabel={t('party.saveClient')}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  );
}
