import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserTable } from './UserTable';
import type { User } from '../types/user';

const users: User[] = [
  {
    id: 1,
    email: 'admin@clients.com',
    name: 'Admin Clients',
    role: 'ADMIN',
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    email: 'emple@clients.com',
    name: 'Emple Clients',
    role: 'EMPLEADO',
    deletedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('UserTable', () => {
  it('muestra estado de carga accesible', () => {
    render(
      <UserTable users={[]} loading onEdit={vi.fn()} onDelete={vi.fn()} onRestore={vi.fn()} />,
    );
    expect(screen.getByLabelText(/cargando usuarios/i)).toBeInTheDocument();
  });

  it('muestra empty state cuando no hay usuarios', () => {
    render(
      <UserTable users={[]} loading={false} onEdit={vi.fn()} onDelete={vi.fn()} onRestore={vi.fn()} />,
    );
    expect(screen.getByText(/sin usuarios todavía/i)).toBeInTheDocument();
  });

  it('lista usuarios con roles y acciones según estado', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onRestore = vi.fn();
    const user = userEvent.setup();

    render(
      <UserTable users={users} loading={false} onEdit={onEdit} onDelete={onDelete} onRestore={onRestore} />,
    );

    expect(screen.getByText('Admin Clients')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Editar Admin Clients'));
    expect(onEdit).toHaveBeenCalledWith(users[0]);

    await user.click(screen.getByLabelText('Eliminar Admin Clients'));
    expect(onDelete).toHaveBeenCalledWith(users[0]);

    await user.click(screen.getByLabelText('Restaurar Emple Clients'));
    expect(onRestore).toHaveBeenCalledWith(users[1]);
  });
});
