import type { Party, PartyInput, PartyKind } from '../types/party';
import { apiClient } from './client';

export async function fetchContractors(options?: {
  search?: string;
  kind?: PartyKind;
  contractorsOnly?: boolean;
}): Promise<Party[]> {
  const { data } = await apiClient.get<Party[]>('/contractors', {
    params: {
      ...(options?.search ? { search: options.search } : {}),
      ...(options?.kind ? { kind: options.kind } : {}),
      ...(options?.contractorsOnly ? { contractorsOnly: 'true' } : {}),
    },
  });
  return data;
}

export async function fetchContractor(id: number): Promise<Party> {
  const { data } = await apiClient.get<Party>(`/contractors/${id}`);
  return data;
}

export async function createContractor(input: PartyInput): Promise<Party> {
  const { data } = await apiClient.post<Party>('/contractors', input);
  return data;
}

export async function updateContractor(id: number, input: Partial<PartyInput>): Promise<Party> {
  const { data } = await apiClient.patch<Party>(`/contractors/${id}`, input);
  return data;
}

export async function deleteContractor(id: number): Promise<Party> {
  const { data } = await apiClient.delete<Party>(`/contractors/${id}`);
  return data;
}

export async function restoreContractor(id: number): Promise<Party> {
  const { data } = await apiClient.post<Party>(`/contractors/${id}/restore`);
  return data;
}

export async function searchContractorByDocument(document: string): Promise<Party | null> {
  const { data } = await apiClient.get<Party | null>('/contractors/search/by-document', {
    params: { document },
  });
  return data;
}
