import { apiClient } from './client';
import type { StagedClientRow, StagedContractorRow } from '../utils/csvImport';

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

function toPayload<T extends object>(row: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).filter(([key, value]) => key !== 'key' && value !== '' && value != null),
  );
}

export async function importClients(rows: StagedClientRow[]): Promise<ImportReport> {
  const { data } = await apiClient.post<ImportReport>('/clients/import', {
    rows: rows.map(toPayload),
  });
  return data;
}

export async function importClientContractors(
  clientId: number,
  rows: StagedContractorRow[],
): Promise<ImportReport> {
  const { data } = await apiClient.post<ImportReport>(`/clients/${clientId}/contractors/import`, {
    rows: rows.map(toPayload),
  });
  return data;
}
