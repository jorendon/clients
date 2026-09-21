import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: { post: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
}));

const mocked = apiClient as unknown as { post: ReturnType<typeof vi.fn> };

function Probe() {
  const { user, login, logout, isAdmin } = useAuth();
  return (
    <div>
      <span>{user ? user.email : 'anon'}</span>
      <span>{isAdmin ? 'admin' : 'no-admin'}</span>
      <button type="button" onClick={() => void login('a@b.com', 'x')}>
        in
      </button>
      <button type="button" onClick={logout}>
        out
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inicia anónimo y guarda sesión al hacer login', async () => {
    const user = userEvent.setup();
    mocked.post.mockResolvedValue({
      data: { accessToken: 'tok', user: { id: 1, email: 'a@b.com', name: 'A', role: 'ADMIN' } },
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('anon')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'in' }));
    expect(await screen.findByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(localStorage.getItem('w9-token')).toBe('tok');

    await user.click(screen.getByRole('button', { name: 'out' }));
    expect(await screen.findByText('anon')).toBeInTheDocument();
    expect(localStorage.getItem('w9-token')).toBeNull();
  });
});
