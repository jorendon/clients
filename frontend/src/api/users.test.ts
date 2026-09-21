import { describe, expect, it, vi } from 'vitest';
import { createUser, deleteUser, fetchUsers, restoreUser, updateUser } from './users';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mocked = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('users api', () => {
  it('fetchUsers pide GET /users', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await expect(fetchUsers()).resolves.toEqual([]);
    expect(mocked.get).toHaveBeenCalledWith('/users', { params: undefined });
  });

  it('fetchUsers con inactivos agrega query param', async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await fetchUsers(true);
    expect(mocked.get).toHaveBeenCalledWith('/users', {
      params: { includeDeleted: 'true' },
    });
  });

  it('createUser hace POST', async () => {
    mocked.post.mockResolvedValue({ data: { id: 1 } });
    const input = { email: 'a@w9.com', name: 'Ana', password: '123456' };
    await createUser(input);
    expect(mocked.post).toHaveBeenCalledWith('/users', input);
  });

  it('updateUser hace PATCH', async () => {
    mocked.patch.mockResolvedValue({ data: { id: 1 } });
    await updateUser(1, { name: 'Nuevo' });
    expect(mocked.patch).toHaveBeenCalledWith('/users/1', { name: 'Nuevo' });
  });

  it('deleteUser hace DELETE y restoreUser hace POST restore', async () => {
    mocked.delete.mockResolvedValue({ data: { id: 1 } });
    await deleteUser(1);
    expect(mocked.delete).toHaveBeenCalledWith('/users/1');

    mocked.post.mockResolvedValue({ data: { id: 1 } });
    await restoreUser(1);
    expect(mocked.post).toHaveBeenCalledWith('/users/1/restore');
  });
});
