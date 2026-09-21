import type { DocumentType, DocumentTypeInput } from '../types/party';
import { apiClient } from './client';

export async function fetchDocumentTypes(includeDeleted = false): Promise<DocumentType[]> {
  const { data } = await apiClient.get<DocumentType[]>('/document-types', {
    params: includeDeleted ? { includeDeleted: 'true' } : undefined,
  });
  return data;
}

export async function createDocumentType(input: DocumentTypeInput): Promise<DocumentType> {
  const { data } = await apiClient.post<DocumentType>('/document-types', input);
  return data;
}

export async function updateDocumentType(id: number, input: Partial<DocumentTypeInput>): Promise<DocumentType> {
  const { data } = await apiClient.patch<DocumentType>(`/document-types/${id}`, input);
  return data;
}

export async function deleteDocumentType(id: number): Promise<DocumentType> {
  const { data } = await apiClient.delete<DocumentType>(`/document-types/${id}`);
  return data;
}

export async function restoreDocumentType(id: number): Promise<DocumentType> {
  const { data } = await apiClient.post<DocumentType>(`/document-types/${id}/restore`);
  return data;
}
