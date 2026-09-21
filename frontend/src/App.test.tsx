import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './auth/AuthContext';
import { BrandingProvider } from './branding/BrandingContext';
import { Shell } from './App';

vi.mock('./api/client', () => ({
  apiClient: {
    get: vi.fn().mockRejectedValue(new Error('offline')),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

describe('Sidebar plegable', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function layout(): HTMLElement {
    const el = document.querySelector('.layout');
    if (!el || !(el instanceof HTMLElement)) throw new Error('sin layout');
    return el;
  }

  function renderShell() {
    return render(
      <MemoryRouter initialEntries={['/clients']}>
        <BrandingProvider>
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </BrandingProvider>
      </MemoryRouter>,
    );
  }

  it('alterna entre expandido y riel al pulsar el botón', async () => {
    const user = userEvent.setup();
    renderShell();

    // Expandido: el botón ofrece recoger
    expect(layout().classList.contains('rail')).toBe(false);
    await user.click(screen.getByRole('button', { name: /recoger menú/i }));
    expect(layout().classList.contains('rail')).toBe(true);
    expect(localStorage.getItem('oc-sidebar')).toBe('collapsed');

    // Recogido: el botón ofrece ampliar
    await user.click(screen.getByRole('button', { name: /ampliar menú/i }));
    expect(layout().classList.contains('rail')).toBe(false);
    expect(localStorage.getItem('oc-sidebar')).toBe('expanded');
  });

  it('bloquea el flyout al recoger hasta sacar el mouse', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: /recoger menú/i }));
    expect(layout().classList.contains('rail')).toBe(true);
    expect(layout().classList.contains('no-flyout')).toBe(true);

    fireEvent.mouseLeave(screen.getByRole('complementary'));
    expect(layout().classList.contains('rail')).toBe(true);
    expect(layout().classList.contains('no-flyout')).toBe(false);
  });

  it('recuerda el estado recogido', () => {
    localStorage.setItem('oc-sidebar', 'collapsed');
    renderShell();
    expect(layout().classList.contains('rail')).toBe(true);
  });
});
