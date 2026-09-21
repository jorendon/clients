import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { BrandingProvider } from '../branding/BrandingContext';
import { LoginPage } from './LoginPage';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

describe('LoginPage branding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function renderLogin() {
    return render(
      <MemoryRouter>
        <BrandingProvider>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </BrandingProvider>
      </MemoryRouter>,
    );
  }

  it('muestra OC cuando no hay logo configurado', () => {
    renderLogin();
    expect(screen.getByText('OC')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('muestra el logo configurado en grande', () => {
    localStorage.setItem(
      'clients-branding',
      JSON.stringify({ companyName: 'Mi Empresa', logoUrl: 'https://x.test/logo.png' }),
    );
    renderLogin();
    const img = screen.getByRole('img', { name: /mi empresa logo/i });
    expect(img).toHaveAttribute('src', 'https://x.test/logo.png');
    expect(screen.queryByText('OC')).not.toBeInTheDocument();
  });

  it('vuelve a OC si el logo no carga', async () => {
    localStorage.setItem('clients-branding', JSON.stringify({ logoUrl: 'https://x.test/roto.png' }));
    renderLogin();
    const img = screen.getByRole('img');
    // Simula fallo de carga
    img.dispatchEvent(new Event('error'));
    expect(await screen.findByText('OC')).toBeInTheDocument();
  });
});
