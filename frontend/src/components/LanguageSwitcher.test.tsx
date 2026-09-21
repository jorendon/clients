import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { setAppLanguage } from '../i18n';

function Probe() {
  const { t } = useTranslation();
  return <h1>{t('users.title')}</h1>;
}

describe('LanguageSwitcher', () => {
  it('muestra ES activo por defecto en tests', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cambia el idioma de la UI a inglés y de vuelta a español', async () => {
    const user = userEvent.setup();
    render(
      <>
        <LanguageSwitcher />
        <Probe />
      </>,
    );

    expect(screen.getByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'ES' }));
    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();

    // Dejar español para no afectar otros tests
    await setAppLanguage('es');
  });
});
