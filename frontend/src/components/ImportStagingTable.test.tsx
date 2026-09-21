import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportStagingTable, type StagingColumn } from './ImportStagingTable';

interface Row {
  key: number;
  name: string;
  id: string;
}

const columns: StagingColumn<Row>[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'id', label: 'ID' },
];

const rows: Row[] = [
  { key: 0, name: '5 STAR CLEANING LLC', id: '87-2773613' },
  { key: 1, name: 'ADDY ACURERO', id: '203-87-7732' },
];

describe('ImportStagingTable', () => {
  it('filtra por buscador y edita celdas', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ImportStagingTable
        rows={rows}
        filtered={rows}
        columns={columns}
        search=""
        searchPlaceholder="Buscar en la tabla previa…"
        getRowLabel={(row) => row.name}
        onSearch={vi.fn()}
        onChange={onChange}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('5 STAR CLEANING LLC')).toBeInTheDocument();

    const input = screen.getAllByLabelText('Nombre')[0];
    await user.clear(input);
    await user.type(input, 'STAR');
    expect(onChange).toHaveBeenCalledWith(0, 'name', expect.any(String));

    rerender(
      <ImportStagingTable
        rows={rows}
        filtered={[rows[1]]}
        columns={columns}
        search="addy"
        searchPlaceholder="Buscar en la tabla previa…"
        getRowLabel={(row) => row.name}
        onSearch={vi.fn()}
        onChange={onChange}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByDisplayValue('5 STAR CLEANING LLC')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('ADDY ACURERO')).toBeInTheDocument();
  });

  it('marca filas sin nombre como error', () => {
    const { container } = render(
      <ImportStagingTable
        rows={[{ key: 0, name: '', id: '' }]}
        filtered={[{ key: 0, name: '', id: '' }]}
        columns={columns}
        search=""
        searchPlaceholder="Buscar"
        getRowLabel={(row) => row.name}
        onSearch={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(container.querySelector('tr.row-error')).not.toBeNull();
  });
});
