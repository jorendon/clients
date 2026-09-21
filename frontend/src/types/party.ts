export type PartyKind = 'PERSON' | 'COMPANY';
export type ClientType = 'ACCOUNTING' | 'PAYROLL';
export type AddressKind = 'FISCAL' | 'MAILING' | 'OTHER';

export interface DocumentType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartyContact {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  documentTypeId: number | null;
  documentNumber: string | null;
  isPrimary: boolean;
  documentType?: DocumentType | null;
}

export interface PartyAddress {
  id: number;
  kind: AddressKind;
  label: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  sameAsFiscal: boolean;
}

export interface Party {
  id: number;
  kind: PartyKind;
  fullName: string;
  isClient: boolean;
  clientTypes: { clientType: ClientType }[];
  registryNumber: string | null;
  documentTypeId: number | null;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documentType?: DocumentType | null;
  contacts?: PartyContact[];
  addresses?: PartyAddress[];
  _count?: { clientLinks?: number; contractorLinks?: number };
}

export interface PartyContractor extends Party {
  assignedAt: string;
}

export interface ClientDetail extends Party {
  clientLinks: { contractor: Party; assignedAt: string }[];
}

export interface PartyContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  documentTypeId?: number;
  documentNumber?: string;
  isPrimary?: boolean;
}

export interface PartyAddressInput {
  kind?: AddressKind;
  label?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  sameAsFiscal?: boolean;
}

export interface PartyInput {
  kind: PartyKind;
  fullName: string;
  isClient?: boolean;
  clientTypes?: ClientType[];
  registryNumber?: string;
  documentTypeId?: number;
  documentNumber?: string;
  email?: string;
  phone?: string;
  contacts?: PartyContactInput[];
  addresses?: PartyAddressInput[];
}

export interface DocumentTypeInput {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export function getClientTypes(party: Pick<Party, 'clientTypes'>): ClientType[] {
  return party.clientTypes?.map((t) => t.clientType) ?? [];
}

/** Poner en true cuando se ofrezca payroll. Oculta la opción en la UI. */
export const ENABLE_PAYROLL = false;

export const VISIBLE_CLIENT_TYPES: ClientType[] = ENABLE_PAYROLL
  ? ['ACCOUNTING', 'PAYROLL']
  : ['ACCOUNTING'];
