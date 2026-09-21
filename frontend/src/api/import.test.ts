import { describe, expect, it, vi } from 'vitest';
import { importClientContractors, importClients } from './import';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: { post: vi.fn() },
}));

const mocked = apiClient as unknown as { post: ReturnType<typeof vi.fn> };

describe('import api', () => {
  it('importClients envía filas sin la clave interna', async () => {
    mocked.post.mockResolvedValue({ data: { total: 1 } });
    await importClients([
      { key: 0, fullName: 'COBICA', kind: '', clientType: '', registryNumber: '' } as never,
    ]);
    expect(mocked.post).toHaveBeenCalledWith('/clients/import', {
      rows: [{ fullName: 'COBICA' }],
    });
  });

  it('importClientContractors usa la ruta del cliente', async () => {
    mocked.post.mockResolvedValue({ data: { total: 1 } });
    await importClientContractors(1, [{ key: 0, name: 'X' }] as never);
    expect(mocked.post).toHaveBeenCalledWith('/clients/1/contractors/import', {
      rows: [{ name: 'X' }],
    });
  });
});
