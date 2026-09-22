import Papa from 'papaparse';
import { read, utils } from 'xlsx';

/** Normaliza encabezados: minúsculas, sin acentos ni símbolos. */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export interface StagedContractorRow {
  key: number;
  name: string;
  kind: string;
  /** Dirección completa en un solo campo ("CALLE, CIUDAD, ST ZIP") */
  address: string;
  idType: string;
  documentTypeId: string;
  id: string;
  email: string;
  phone: string;
  mergeId?: number;
}

export interface StagedClientRow {
  key: number;
  kind: string;
  fullName: string;
  clientType: string;
  registryNumber: string;
  documentType: string;
  documentTypeId: string;
  documentNumber: string;
  email: string;
  phone: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  /** Dirección fiscal completa en un solo campo */
  address: string;
  /** Dirección de correo completa en un solo campo (o "SI" en mailingSameAsFiscal) */
  mailingAddress: string;
  mailingSameAsFiscal: string;
}

/** Variantes de encabezado aceptadas por campo (es/en + typos comunes). */
const CONTRACTOR_COLUMNS: Record<string, string[]> = {
  name: ['name', 'nombre', 'razonsocial', 'fullname', 'contractor', 'contratista'],
  kind: ['kind', 'tipo', 'type'],
  idType: ['idtype', 'id_type', 'tipoid', 'tipodeidentificacion', 'documenttype', 'tipodedocumento'],
  id: ['id', 'identificacion', 'document', 'documento', 'documentnumber', 'numeroid', 'federalid'],
  email: ['email', 'correo', 'mail'],
  phone: ['phone', 'telefono', 'tel', 'phonenumber'],
};

/** Encabezados que aportan a la dirección única, en orden de aparición. */
const ADDRESS_COLUMNS = [
  'street', 'address', 'adress', 'direccion', 'calle',
  'citystzip', 'citystatezip', 'ciudadestadozip', 'location',
  'city', 'ciudad', 'state', 'estado', 'st', 'zip', 'zipcode', 'codigopostal',
];

const CLIENT_COLUMNS: Record<string, string[]> = {
  kind: ['kind', 'tipo', 'type'],
  fullName: ['fullname', 'name', 'nombre', 'razonsocial', 'client', 'cliente'],
  clientType: ['clienttype', 'tipocliente', 'tipodecliente'],
  registryNumber: ['registrynumber', 'documentnumber', 'numerodocumento', 'documento'],
  documentType: ['documenttype', 'tipodedocumento', 'tipoid', 'idtype'],
  documentNumber: ['documentnumber', 'identificacion', 'id', 'numeroid', 'taxid', 'feiein', 'ssn'],
  email: ['email', 'correo', 'mail'],
  phone: ['phone', 'telefono', 'tel'],
  contactFirstName: ['contactfirstname', 'firstname', 'nombrecontacto', 'contacto'],
  contactLastName: ['contactlastname', 'lastname', 'apellidocontacto', 'apellido'],
  contactEmail: ['contactemail', 'emailcontacto', 'correocontacto'],
  contactPhone: ['contactphone', 'telefonocontacto', 'phonecontact'],
  mailingSameAsFiscal: ['mailingsameasfiscal', 'mailingsame', 'mismaquefiscal'],
};

/** Encabezados de dirección de correo (se combinan en un solo campo). */
const MAILING_COLUMNS = [
  'mailingstreet', 'mailingaddress', 'callecorreo', 'direccioncorreo',
  'mailingcity', 'ciudadcorreo', 'mailingstate', 'estadocorreo',
  'mailingzip', 'zipcorreo', 'codigopostalcorreo',
];

function buildIndex(headers: string[], columns: Record<string, string[]>): Map<string, number> {
  const normalized = headers.map(normalizeHeader);
  const index = new Map<string, number>();
  for (const [field, variants] of Object.entries(columns)) {
    for (const variant of variants) {
      const position = normalized.indexOf(variant);
      if (position !== -1 && !index.has(field)) index.set(field, position);
    }
  }
  return index;
}

function blankRow<T extends object>(fields: string[], key: number): T {
  return Object.fromEntries([['key', key], ...fields.map((f) => [f, ''])]) as T;
}

export interface ParsedCsv {
  headers: string[];
  records: string[][];
}

/** Lee un CSV (detecta delimitador y comillas). */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = toParsedCsv(results.data.map((row) => row.map((cell) => String(cell ?? ''))));
        if (!parsed) reject(new Error('empty'));
        else resolve(parsed);
      },
      error: () => reject(new Error('parse')),
    });
  });
}

function toParsedCsv(rows: string[][]): ParsedCsv | null {
  const nonEmpty = rows.filter((row) => row.some((cell) => cell.trim() !== ''));
  if (nonEmpty.length === 0) return null;
  const width = Math.max(...nonEmpty.map((row) => row.length));
  const padded = nonEmpty.map((row) => [...row, ...Array(width - row.length).fill('')]);
  return { headers: padded[0], records: padded.slice(1) };
}

/** Lee un Excel .xls/.xlsx (primera hoja) al mismo formato que el CSV. */
export async function parseExcelFile(file: File): Promise<ParsedCsv> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array', dense: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('empty');
  const rows = utils.sheet_to_json<string[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
  });
  const parsed = toParsedCsv(rows.map((row) => row.map((cell) => String(cell ?? ''))));
  if (!parsed) throw new Error('empty');
  return parsed;
}

const EXCEL_EXTENSIONS = ['.xls', '.xlsx'];
const CSV_EXTENSIONS = ['.csv'];
const ALLOWED_EXTENSIONS = [...CSV_EXTENSIONS, ...EXCEL_EXTENSIONS];

/** Máximo 10 MB por archivo de carga. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function getFileExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot === -1 ? '' : lower.slice(dot);
}

export type UploadFileError = 'import.invalidFormat' | 'import.fileTooLarge' | null;

/**
 * Valida el formato del archivo antes de leerlo:
 * extensión .csv/.xls/.xlsx y tamaño máximo.
 * Devuelve la clave de error i18n o null si es válido.
 */
export function validateUploadFile(file: File): UploadFileError {
  if (!ALLOWED_EXTENSIONS.includes(getFileExtension(file.name))) {
    return 'import.invalidFormat';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'import.fileTooLarge';
  }
  return null;
}

/**
 * Verifica que el archivo traiga la columna mínima requerida
 * (nombre para contratistas y clientes).
 */
export function hasRequiredColumn(parsed: ParsedCsv, mode: 'contractor' | 'client'): boolean {
  const columns = mode === 'contractor' ? CONTRACTOR_COLUMNS : CLIENT_COLUMNS;
  const index = buildIndex(parsed.headers, columns);
  return index.has(mode === 'contractor' ? 'name' : 'fullName');
}

/** Lee CSV o Excel según la extensión y devuelve encabezados + filas. */
export function parseUploadFile(file: File): Promise<ParsedCsv> {
  return isExcelFile(file.name) ? parseExcelFile(file) : parseCsvFile(file);
}

/** Junta los valores de columnas de dirección en un solo campo, en orden. */
function combineAddress(
  normalizedHeaders: string[],
  record: string[],
  variants: string[],
  usedPositions: Set<number>,
): string {
  const parts: string[] = [];
  normalizedHeaders.forEach((header, position) => {
    if (variants.includes(header)) {
      const value = String(record[position] ?? '').trim();
      if (value && !parts.includes(value)) parts.push(value);
    }
  });
  // Fallback: columna sin encabezado reconocido con pinta de "CIUDAD, ST ZIP"
  normalizedHeaders.forEach((_, position) => {
    if (usedPositions.has(position)) return;
    const value = String(record[position] ?? '').trim();
    if (value && /,\s*[A-Za-z]{2}\s+\d{5}/.test(value) && !parts.includes(value)) {
      parts.push(value);
    }
  });
  return parts.join(', ');
}

export function mapContractorRows(parsed: ParsedCsv): StagedContractorRow[] {
  const index = buildIndex(parsed.headers, CONTRACTOR_COLUMNS);
  const normalizedHeaders = parsed.headers.map(normalizeHeader);
  const usedPositions = new Set(index.values());
  const fields = Object.keys(CONTRACTOR_COLUMNS);
  return parsed.records.map((record, i) => {
    const row = blankRow<StagedContractorRow>([...fields, 'address'], i);
    const cells = row as unknown as Record<string, string>;
    for (const field of fields) {
      const position = index.get(field);
      if (position !== undefined) {
        cells[field] = String(record[position] ?? '').trim();
      }
    }
    cells.address = combineAddress(normalizedHeaders, record, ADDRESS_COLUMNS, usedPositions);
    return row;
  });
}

export function mapClientRows(parsed: ParsedCsv): StagedClientRow[] {
  const index = buildIndex(parsed.headers, CLIENT_COLUMNS);
  const normalizedHeaders = parsed.headers.map(normalizeHeader);
  const usedPositions = new Set(index.values());
  const fields = Object.keys(CLIENT_COLUMNS);
  return parsed.records.map((record, i) => {
    const row = blankRow<StagedClientRow>([...fields, 'address', 'mailingAddress'], i);
    const cells = row as unknown as Record<string, string>;
    for (const field of fields) {
      const position = index.get(field);
      if (position !== undefined) {
        cells[field] = String(record[position] ?? '').trim();
      }
    }
    cells.address = combineAddress(normalizedHeaders, record, ADDRESS_COLUMNS, usedPositions);
    cells.mailingAddress = combineAddress(normalizedHeaders, record, MAILING_COLUMNS, usedPositions);
    return row;
  });
}

/** Convierte "" en undefined para no enviar ruido al backend. */
export function compact<T extends object>(row: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== '' && value !== undefined),
  ) as Partial<T>;
}
