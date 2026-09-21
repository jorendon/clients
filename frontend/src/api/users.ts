import type { CreateUserInput, UpdateUserInput, User } from '../types/user';
import { apiClient } from './client';

export async function fetchUsers(includeDeleted = false): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/users', {
    params: includeDeleted ? { includeDeleted: 'true' } : undefined,
  });
  return data;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await apiClient.post<User>('/users', input);
  return data;
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${id}`, input);
  return data;
}

export async function deleteUser(id: number): Promise<User> {
  const { data } = await apiClient.delete<User>(`/users/${id}`);
  return data;
}

export async function restoreUser(id: number): Promise<User> {
  const { data } = await apiClient.post<User>(`/users/${id}/restore`);
  return data;
}
