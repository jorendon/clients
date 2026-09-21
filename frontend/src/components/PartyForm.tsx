import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  AddressKind,
  ClientType,
  DocumentType,
  Party,
  PartyAddressInput,
  PartyContactInput,
  PartyInput,
  PartyKind,
} from '../types/party';
import { getClientTypes, VISIBLE_CLIENT_TYPES } from '../types/party';

interface PartyFormProps {
  /** Si es true, fuerza isClient y muestra el tipo de cliente */
  clientMode?: boolean;
  initialParty?: Party | null;
  documentTypes: DocumentType[];
  saving: boolean;
  formError: string | null;
  submitLabel: string;
  title: string;
  onSubmit: (input: PartyInput) => void;
  onCancel: () => void;
}

const EMPTY_CONTACT: PartyContactInput = {};
const EMPTY_ADDRESS: PartyAddressInput = { kind: 'FISCAL' };

export function PartyForm({
  clientMode,
  initialParty,
  documentTypes,
  saving,
  formError,
  submitLabel,
  title,
  onSubmit,
  onCancel,
}: PartyFormProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<PartyKind>(initialParty?.kind ?? 'COMPANY');
  const [fullName, setFullName] = useState(initialParty?.fullName ?? '');
  const [isClient, setIsClient] = useState(initialParty?.isClient ?? false);
  const [clientTypes, setClientTypes] = useState<ClientType[]>(
    initialParty ? getClientTypes(initialParty) : [],
  );
  const [registryNumber, setRegistryNumber] = useState(initialParty?.registryNumber ?? '');
  const [documentTypeId, setDocumentTypeId] = useState<string>(
    initialParty?.documentTypeId != null ? String(initialParty.documentTypeId) : '',
  );
  const [documentNumber, setDocumentNumber] = useState(initialParty?.documentNumber ?? '');
  const [email, setEmail] = useState(initialParty?.email ?? '');
  const [phone, setPhone] = useState(initialParty?.phone ?? '');
  const [contacts, setContacts] = useState<PartyContactInput[]>(
    initialParty?.contacts?.map((c) => ({
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      documentTypeId: c.documentTypeId ?? undefined,
      documentNumber: c.documentNumber ?? '',
      isPrimary: c.isPrimary,
    })) ?? [],
  );
  const [addresses, setAddresses] = useState<PartyAddressInput[]>(
    initialParty?.addresses?.map((a) => ({
      kind: a.kind,
      label: a.label ?? '',
      street: a.street ?? '',
      city: a.city ?? '',
      state: a.state ?? '',
      zip: a.zip ?? '',
      sameAsFiscal: a.sameAsFiscal,
    })) ?? [],
  );
  const [nameError, setNameError] = useState<string | null>(null);

  function updateContact(index: number, patch: Partial<PartyContactInput>) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function updateAddress(index: number, patch: Partial<PartyAddressInput>) {
    setAddresses((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function cleanContact(c: PartyContactInput): PartyContactInput | null {
    const cleaned: PartyContactInput = {
      ...(c.firstName?.trim() ? { firstName: c.firstName.trim() } : {}),
      ...(c.lastName?.trim() ? { lastName: c.lastName.trim() } : {}),
      ...(c.email?.trim() ? { email: c.email.trim() } : {}),
      ...(c.phone?.trim() ? { phone: c.phone.trim() } : {}),
      ...(c.documentTypeId ? { documentTypeId: c.documentTypeId } : {}),
      ...(c.documentNumber?.trim() ? { documentNumber: c.documentNumber.trim() } : {}),
      ...(c.isPrimary ? { isPrimary: true } : {}),
    };
    return Object.keys(cleaned).length === 0 ? null : cleaned;
  }

  function cleanAddress(a: PartyAddressInput): PartyAddressInput | null {
    const cleaned: PartyAddressInput = {
      kind: a.kind ?? 'FISCAL',
      ...(a.label?.trim() ? { label: a.label.trim() } : {}),
      ...(a.street?.trim() ? { street: a.street.trim() } : {}),
      ...(a.city?.trim() ? { city: a.city.trim() } : {}),
      ...(a.state?.trim() ? { state: a.state.trim().toUpperCase() } : {}),
      ...(a.zip?.trim() ? { zip: a.zip.trim() } : {}),
      ...(a.sameAsFiscal ? { sameAsFiscal: true } : {}),
    };
    const hasData = cleaned.label || cleaned.street || cleaned.city || cleaned.state || cleaned.zip || cleaned.sameAsFiscal;
    return hasData ? cleaned : null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) {
      setNameError(t('party.errors.name'));
      return;
    }
    setNameError(null);
    const input: PartyInput = {
      kind,
      fullName: fullName.trim(),
      ...(clientMode || isClient ? { isClient: true } : { isClient: false }),
      ...((clientMode || isClient) && clientTypes.length
        ? { clientTypes }
        : {}),
      ...(registryNumber.trim() ? { registryNumber: registryNumber.trim() } : {}),
      ...(documentTypeId ? { documentTypeId: Number(documentTypeId) } : {}),
      ...(documentNumber.trim() ? { documentNumber: documentNumber.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    };
    const cleanedContacts = contacts
      .map(cleanContact)
      .filter((c): c is PartyContactInput => c !== null);
    if (contacts.length > 0 || (initialParty?.contacts?.length ?? 0) > 0) {
      input.contacts = cleanedContacts;
    }
    const cleanedAddresses = addresses
      .map(cleanAddress)
      .filter((a): a is PartyAddressInput => a !== null);
    if (addresses.length > 0 || (initialParty?.addresses?.length ?? 0) > 0) {
      input.addresses = cleanedAddresses;
    }
    onSubmit(input);
  }

  return (
    <form className="card form wide" onSubmit={handleSubmit} noValidate>
      <h2>{title}</h2>

      <fieldset>
        <legend>{t('party.sectionData')}</legend>
        <div className="segmented" role="radiogroup" aria-label={t('party.kind')}>
          {(['PERSON', 'COMPANY'] as PartyKind[]).map((option) => (
            <button
              key={option}
              type="button"
              className={`segment${kind === option ? ' active' : ''}`}
              aria-pressed={kind === option}
              onClick={() => setKind(option)}
            >
              {option === 'PERSON' ? t('party.kindPerson') : t('party.kindCompany')}
            </button>
          ))}
        </div>

        <label className="field">
          <span>{t('party.fullName')}</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={Boolean(nameError)}
            autoFocus
          />
          {nameError && <small className="error">{nameError}</small>}
        </label>

        {!clientMode && (
          <label className="check">
            <input
              type="checkbox"
              checked={isClient}
              onChange={(e) => setIsClient(e.target.checked)}
            />
            <span>
              <strong>{t('party.isClient')}</strong>
              <br />
              <small className="muted">{t('party.isClientHint')}</small>
            </span>
          </label>
        )}

        {(clientMode || isClient) && (
          <div className="grid2">
            <fieldset className="check-group">
              <legend>{t('party.clientType')}</legend>
              {VISIBLE_CLIENT_TYPES.map((option) => (
                <label key={option} className="check">
                  <input
                    type="checkbox"
                    checked={clientTypes.includes(option)}
                    onChange={(e) =>
                      setClientTypes((prev) =>
                        e.target.checked ? [...prev, option] : prev.filter((v) => v !== option),
                      )
                    }
                  />
                  {option === 'ACCOUNTING'
                    ? t('party.clientTypeAccounting')
                    : t('party.clientTypePayroll')}
                </label>
              ))}
            </fieldset>
            <label className="field">
              <span>{t('party.registryNumber')}</span>
              <input
                type="text"
                placeholder="P18000025045"
                value={registryNumber}
                onChange={(e) => setRegistryNumber(e.target.value)}
              />
            </label>
          </div>
        )}

        <div className="grid2">
          <label className="field">
            <span>{t('party.documentType')}</span>
            <select
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(e.target.value)}
            >
              <option value="">{t('party.documentTypeNone')}</option>
              {documentTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.code} — {dt.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('party.documentNumber')}</span>
            <input
              type="text"
              placeholder="82-4839524"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </label>
        </div>

        <div className="grid2">
          <label className="field">
            <span>{t('party.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('party.phone')}</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('party.sectionContacts')}</legend>
        {contacts.map((contact, index) => (
          <div key={index} className="nested">
            <div className="grid2">
              <label className="field">
                <span>{t('party.contactFirstName')}</span>
                <input
                  type="text"
                  value={contact.firstName ?? ''}
                  onChange={(e) => updateContact(index, { firstName: e.target.value })}
                />
              </label>
              <label className="field">
                <span>{t('party.contactLastName')}</span>
                <input
                  type="text"
                  value={contact.lastName ?? ''}
                  onChange={(e) => updateContact(index, { lastName: e.target.value })}
                />
              </label>
            </div>
            <div className="grid2">
              <label className="field">
                <span>{t('party.contactEmail')}</span>
                <input
                  type="email"
                  value={contact.email ?? ''}
                  onChange={(e) => updateContact(index, { email: e.target.value })}
                />
              </label>
              <label className="field">
                <span>{t('party.contactPhone')}</span>
                <input
                  type="tel"
                  value={contact.phone ?? ''}
                  onChange={(e) => updateContact(index, { phone: e.target.value })}
                />
              </label>
            </div>
            <div className="grid2">
              <label className="field">
                <span>{t('party.contactDocType')}</span>
                <select
                  value={contact.documentTypeId ?? ''}
                  onChange={(e) =>
                    updateContact(index, {
                      documentTypeId: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">{t('party.documentTypeNone')}</option>
                  {documentTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('party.contactDocNumber')}</span>
                <input
                  type="text"
                  value={contact.documentNumber ?? ''}
                  onChange={(e) => updateContact(index, { documentNumber: e.target.value })}
                />
              </label>
            </div>
            <div className="nested-actions">
              <label className="check">
                <input
                  type="checkbox"
                  checked={contact.isPrimary ?? false}
                  onChange={(e) => updateContact(index, { isPrimary: e.target.checked })}
                />
                {t('party.contactPrimary')}
              </label>
              <button
                type="button"
                className="btn small danger-outline"
                onClick={() => setContacts((prev) => prev.filter((_, i) => i !== index))}
              >
                {t('party.contactRemove')}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn small"
          onClick={() => setContacts((prev) => [...prev, { ...EMPTY_CONTACT }])}
        >
          {t('party.addContact')}
        </button>
      </fieldset>

      <fieldset>
        <legend>{t('party.sectionAddresses')}</legend>
        {addresses.map((address, index) => (
          <div key={index} className="nested">
            <div className="grid2">
              <label className="field">
                <span>{t('party.addressKind')}</span>
                <select
                  value={address.kind ?? 'FISCAL'}
                  onChange={(e) => updateAddress(index, { kind: e.target.value as AddressKind })}
                >
                  <option value="FISCAL">{t('party.addressFiscal')}</option>
                  <option value="MAILING">{t('party.addressMailing')}</option>
                  <option value="OTHER">{t('party.addressOther')}</option>
                </select>
              </label>
              <label className="field">
                <span>{t('party.addressLabel')}</span>
                <input
                  type="text"
                  value={address.label ?? ''}
                  onChange={(e) => updateAddress(index, { label: e.target.value })}
                />
              </label>
            </div>
            {address.kind === 'MAILING' && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={address.sameAsFiscal ?? false}
                  onChange={(e) => updateAddress(index, { sameAsFiscal: e.target.checked })}
                />
                {t('party.addressSameAsFiscal')}
              </label>
            )}
            {!(address.kind === 'MAILING' && address.sameAsFiscal) && (
              <>
                <label className="field">
                  <span>{t('party.addressStreet')}</span>
                  <input
                    type="text"
                    value={address.street ?? ''}
                    onChange={(e) => updateAddress(index, { street: e.target.value })}
                  />
                </label>
                <div className="grid3">
                  <label className="field">
                    <span>{t('party.addressCity')}</span>
                    <input
                      type="text"
                      value={address.city ?? ''}
                      onChange={(e) => updateAddress(index, { city: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>{t('party.addressState')}</span>
                    <input
                      type="text"
                      value={address.state ?? ''}
                      onChange={(e) => updateAddress(index, { state: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>{t('party.addressZip')}</span>
                    <input
                      type="text"
                      value={address.zip ?? ''}
                      onChange={(e) => updateAddress(index, { zip: e.target.value })}
                    />
                  </label>
                </div>
              </>
            )}
            <div className="nested-actions">
              <span />
              <button
                type="button"
                className="btn small danger-outline"
                onClick={() => setAddresses((prev) => prev.filter((_, i) => i !== index))}
              >
                {t('party.addressRemove')}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn small"
          onClick={() => setAddresses((prev) => [...prev, { ...EMPTY_ADDRESS }])}
        >
          {t('party.addAddress')}
        </button>
      </fieldset>

      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? t('common.saving') : submitLabel}
        </button>
      </div>
    </form>
  );
}
