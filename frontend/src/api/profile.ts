import { apiClient } from './client';

export interface ProfileData {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  password?: string;
}

export async function fetchProfile(): Promise<ProfileData> {
  const { data } = await apiClient.get<ProfileData>('/auth/profile');
  return data;
}

export async function updateProfile(input: UpdateProfileInput): Promise<ProfileData> {
  const { data } = await apiClient.patch<ProfileData>('/auth/profile', input);
  return data;
}
