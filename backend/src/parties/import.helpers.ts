import { AddressKind, ClientType, PartyKind } from '@prisma/client';

export interface ImportContractorRow {
  name?: string;
  kind?: string;
  /** Dirección completa en un solo campo ("CALLE, CIUDAD, ST ZIP") */
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  /** Columna combinada "CIUDAD, ST ZIP" como la del Excel de Clients */
  cityStateZip?: string;
  idType?: string;
  id?: string;
  email?: string;
  phone?: string;
  mergeId?: number;
}

export interface ImportClientRow {
  kind?: string;
  fullName?: string;
  clientType?: string;
  registryNumber?: string;
  documentType?: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** Dirección fiscal completa en un solo campo */
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  /** Dirección de correo completa en un solo campo */
  mailingAddress?: string;
  mailingSameAsFiscal?: string;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportReport {
  total: number;
  created: number;
  associated: number;
  markedClient: number;
  existing: number;
  duplicatesInFile: number;
  errors: ImportRowError[];
}

export const MAX_IMPORT_ROWS = 5000;

/** Normaliza encabezados: minúsculas, sin acentos ni símbolos ( countless variants ). */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const KIND_MAP: Record<string, PartyKind> = {
  person: PartyKind.PERSON,
  persona: PartyKind.PERSON,
  natural: PartyKind.PERSON,
  individual: PartyKind.PERSON,
  company: PartyKind.COMPANY,
  empresa: PartyKind.COMPANY,
  compania: PartyKind.COMPANY,
  business: PartyKind.COMPANY,
};

export function parsePartyKind(raw?: string): PartyKind | undefined {
  if (!raw?.trim()) return undefined;
  return KIND_MAP[normalizeHeader(raw)];
}

const CLIENT_TYPE_MAP: Record<string, ClientType> = {
  accounting: ClientType.ACCOUNTING,
  contabilidad: ClientType.ACCOUNTING,
  payroll: ClientType.PAYROLL,
  nomina: ClientType.PAYROLL,
};

export function parseClientType(raw?: string): ClientType | undefined {
  const list = parseClientTypes(raw);
  return list[0];
}

/** Acepta varios separados por coma, slash, punto y coma o pipe. */
export function parseClientTypes(raw?: string): ClientType[] {
  if (!raw?.trim()) return [];
  const found: ClientType[] = [];
  for (const part of raw.split(/[,;/|]/)) {
    const key = normalizeHeader(part);
    if (!key) continue;
    const mapped = CLIENT_TYPE_MAP[key];
    if (!mapped) return [];
    if (!found.includes(mapped)) found.push(mapped);
  }
  return found;
}

/** "Federal ID:" → FEI_EIN, "SSN" → SSN, etc. */
export function resolveDocTypeCode(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const key = normalizeHeader(raw);
  if (/(federal|fei|ein|employer)/.test(key)) return 'FEI_EIN';
  if (/ssn|social/.test(key)) return 'SSN';
  if (/itin/.test(key)) return 'ITIN';
  if (/passport|pasaporte/.test(key)) return 'PASSPORT';
  if (/driver|licencia|licence|dl$/.test(key)) return 'DRIVER_LICENSE';
  if (/docnumber|documentnumber|registro|registry/.test(key)) return 'DOC_NUMBER';
  return undefined;
}

const COMPANY_SUFFIX = /\b(LLC|INC|CORP|CORPORATION|CO|LTD|PLLC|PA|LLP|LP|GROUP|SERVICES|ENTERPRISES?)\b\.?/i;

/** LLC/Inc/Corp/... → COMPANY, resto → PERSON (editable en la tabla previa). */
export function detectKindFromName(name: string): PartyKind {
  return COMPANY_SUFFIX.test(name) ? PartyKind.COMPANY : PartyKind.PERSON;
}

/** "3341 WOODBRIAR LANE, TALLAHASSEE, FL 32303" → calle + ciudad/estado/zip. */
export function parseFullAddress(raw?: string): { street?: string; city?: string; state?: string; zip?: string } {
  if (!raw?.trim()) return {};
  const text = raw.trim().replace(/\s+/g, ' ');
  const full = text.match(/^(.*),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (full) {
    return {
      street: full[1].trim() || undefined,
      city: full[2].trim(),
      state: full[3].toUpperCase(),
      zip: full[4],
    };
  }
  const noStreet = text.match(/^([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (noStreet) {
    return { city: noStreet[1].trim(), state: noStreet[2].toUpperCase(), zip: noStreet[3] };
  }
  return { street: text };
}

export function parseBooleanish(raw?: string): boolean {
  if (!raw) return false;
  return ['1', 'true', 'yes', 'si', 'sí', 'y', 'x'].includes(raw.trim().toLowerCase());
}

export function emptyReport(total: number): ImportReport {
  return { total, created: 0, associated: 0, markedClient: 0, existing: 0, duplicatesInFile: 0, errors: [] };
}

export function addressKindOrFiscal(raw?: string): AddressKind {
  const key = (raw ?? '').trim().toLowerCase();
  if (key.startsWith('mail') || key.startsWith('correo')) return AddressKind.MAILING;
  if (key.startsWith('other') || key.startsWith('otra')) return AddressKind.OTHER;
  return AddressKind.FISCAL;
}
