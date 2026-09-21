import type { ClientDetail, ClientType, Party, PartyContractor, PartyInput } from '../types/party';
import { apiClient } from './client';

export async function fetchClients(search = '', typeFilter: 'ALL' | ClientType = 'ALL'): Promise<Party[]> {
  const { data } = await apiClient.get<Party[]>('/clients', {
    params: {
      ...(search ? { search } : {}),
      ...(typeFilter === 'ALL' ? {} : { type: typeFilter }),
    },
  });
  return data;
}

export async function fetchClientDetail(id: number): Promise<ClientDetail> {
  const { data } = await apiClient.get<ClientDetail>(`/clients/${id}`);
  return data;
}

export async function createClient(input: PartyInput): Promise<Party> {
  const { data } = await apiClient.post<Party>('/clients', input);
  return data;
}

export async function updateClient(id: number, input: Partial<PartyInput>): Promise<Party> {
  const { data } = await apiClient.patch<Party>(`/clients/${id}`, input);
  return data;
}

/** Quita la marca de cliente (la entidad se conserva). */
export async function unmarkClient(id: number): Promise<Party> {
  const { data } = await apiClient.delete<Party>(`/clients/${id}`);
  return data;
}

export async function remarkClient(id: number): Promise<ClientDetail> {
  const { data } = await apiClient.post<ClientDetail>(`/clients/${id}/restore`);
  return data;
}

export async function fetchClientContractors(clientId: number): Promise<PartyContractor[]> {
  const { data } = await apiClient.get<PartyContractor[]>(`/clients/${clientId}/contractors`);
  return data;
}

export async function associateContractor(clientId: number, contractorId: number): Promise<PartyContractor[]> {
  const { data } = await apiClient.post<PartyContractor[]>(`/clients/${clientId}/contractors`, {
    contractorId,
  });
  return data;
}

export async function dissociateContractor(clientId: number, contractorId: number): Promise<PartyContractor[]> {
  const { data } = await apiClient.delete<PartyContractor[]>(
    `/clients/${clientId}/contractors/${contractorId}`,
  );
  return data;
}
