import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PartyForm } from './PartyForm';

const docTypes = [{ id: 1, code: 'FEI_EIN', name: 'FEI/EIN', description: null, isActive: true, deletedAt: null, createdAt: '', updatedAt: '' }];

describe('PartyForm', () => {
  it('exige el nombre antes de enviar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <PartyForm
        clientMode
        documentTypes={docTypes}
        saving={false}
        formError={null}
        title="Nuevo cliente"
        submitLabel="Crear cliente"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));
    expect(await screen.findByText(/nombre es requerido/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía datos con contactos y direcciones', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <PartyForm
        clientMode
        documentTypes={docTypes}
        saving={false}
        formError={null}
        title="Nuevo cliente"
        submitLabel="Crear cliente"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/nombre \/ razón social/i), 'COBICA INTERNATIONAL CORP');
    await user.click(screen.getByRole('button', { name: /agregar contacto/i }));
    const contactInputs = screen.getAllByLabelText(/nombre$/i);
    await user.type(contactInputs[contactInputs.length - 1], 'Jose Alejandro');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'COMPANY',
        fullName: 'COBICA INTERNATIONAL CORP',
        isClient: true,
        contacts: [expect.objectContaining({ firstName: 'Jose Alejandro' })],
      }),
    );
  });

  it('muestra tipo de cliente solo en modo cliente o marcado', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PartyForm
        documentTypes={docTypes}
        saving={false}
        formError={null}
        title="Nueva contratista"
        submitLabel="Crear contratista"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole('group', { name: /tipo de cliente/i })).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/marcar como cliente/i));
    expect(screen.getByRole('group', { name: /tipo de cliente/i })).toBeInTheDocument();
    rerender(
      <PartyForm
        clientMode
        documentTypes={docTypes}
        saving={false}
        formError={null}
        title="Nuevo cliente"
        submitLabel="Crear cliente"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('group', { name: /tipo de cliente/i })).toBeInTheDocument();
  });

  it('por ahora solo ofrece contabilidad (payroll oculto)', () => {
    render(
      <PartyForm
        clientMode
        documentTypes={docTypes}
        saving={false}
        formError={null}
        title="Nuevo cliente"
        submitLabel="Crear cliente"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const group = screen.getByRole('group', { name: /tipo de cliente/i });
    expect(group).toHaveTextContent(/contabilidad/i);
    expect(group).not.toHaveTextContent(/payroll/i);
  });
});
