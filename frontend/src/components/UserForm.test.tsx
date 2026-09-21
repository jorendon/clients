import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserForm } from './UserForm';

describe('UserForm', () => {
  it('valida email, nombre y password antes de enviar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <UserForm saving={false} formError={null} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(await screen.findByText(/email válido/i)).toBeInTheDocument();
    expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía datos válidos', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <UserForm saving={false} formError={null} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText(/ana torres/i), 'Ana Torres');
    await user.type(screen.getByPlaceholderText('ana@clients.com'), 'ana@clients.com');
    await user.type(screen.getByPlaceholderText('••••••'), 'secreto123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'ana@clients.com',
      name: 'Ana Torres',
      password: 'secreto123',
      role: 'EMPLEADO',
    });
  });
});
