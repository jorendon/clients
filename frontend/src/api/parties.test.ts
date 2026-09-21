import { describe, expect, it, vi } from 'vitest';
import { associateContractor, createClient, dissociateContractor, fetchClientDetail, fetchClients } from './clients';
import { fetchContractors, searchContractorByDocument } from './contractors';
import { createDocumentType, fetchDocumentTypes } from './documentTypes';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mocked = apiClient as unknown as Record<'get' | 'post' | 'patch' | 'delete', ReturnType<typeof vi.fn>>;

describe('clients api', () => {
  it('fetchClients arma query params', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await fetchClients('cobica');
    expect(mocked.get).toHaveBeenCalledWith('/clients', { params: { search: 'cobica' } });
    await fetchClients('', 'PAYROLL');
    expect(mocked.get).toHaveBeenCalledWith('/clients', { params: { type: 'PAYROLL' } });
  });

  it('createClient y detail usan las rutas correctas', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1 } });
    await createClient({ kind: 'COMPANY', fullName: 'COBICA', isClient: true });
    expect(mocked.post).toHaveBeenCalledWith('/clients', { kind: 'COMPANY', fullName: 'COBICA', isClient: true });

    mocked.get.mockResolvedValue({ data: { id: 1 } });
    await fetchClientDetail(1);
    expect(mocked.get).toHaveBeenCalledWith('/clients/1');
  });

  it('associate/dissociate usan la ruta pivote', async () => {
    mocked.post.mockResolvedValue({ data: [] });
    await associateContractor(1, 2);
    expect(mocked.post).toHaveBeenCalledWith('/clients/1/contractors', { contractorId: 2 });

    mocked.delete.mockResolvedValue({ data: [] });
    await dissociateContractor(1, 2);
    expect(mocked.delete).toHaveBeenCalledWith('/clients/1/contractors/2');
  });
});

describe('contractors api', () => {
  it('fetchContractors arma filtros', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await fetchContractors({ search: 'star', kind: 'COMPANY', contractorsOnly: true });
    expect(mocked.get).toHaveBeenCalledWith('/contractors', {
      params: { search: 'star', kind: 'COMPANY', contractorsOnly: 'true' },
    });
  });

  it('searchContractorByDocument usa el endpoint de matching', async () => {
    mocked.get.mockResolvedValue({ data: null });
    await searchContractorByDocument('87-2773613');
    expect(mocked.get).toHaveBeenCalledWith('/contractors/search/by-document', {
      params: { document: '87-2773613' },
    });
  });
});

describe('documentTypes api', () => {
  it('CRUD usa las rutas correctas', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await fetchDocumentTypes(true);
    expect(mocked.get).toHaveBeenCalledWith('/document-types', { params: { includeDeleted: 'true' } });

    mocked.post.mockResolvedValue({ data: { id: 1 } });
    await createDocumentType({ code: 'SSN', name: 'SSN' });
    expect(mocked.post).toHaveBeenCalledWith('/document-types', { code: 'SSN', name: 'SSN' });
  });
});
