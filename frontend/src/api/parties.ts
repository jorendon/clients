import { apiClient } from './client';

export async function fetchUnmaskedDocumentNumber(partyId: number): Promise<{ documentNumber: string }> {
  const { data } = await apiClient.get<{ documentNumber: string }>(`/parties/${partyId}/document-number`);
  return data;
}
