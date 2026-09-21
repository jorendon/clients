export type Role = 'ADMIN' | 'EMPLEADO';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: Role;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
}
