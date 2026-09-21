import { describe, expect, it } from 'vitest';
import { utils, write } from 'xlsx';
import {
  compact,
  hasRequiredColumn,
  mapClientRows,
  mapContractorRows,
  normalizeHeader,
  parseUploadFile,
  validateUploadFile,
} from './csvImport';

const COBICA_CSV = {
  headers: ['Name', 'Adress', '', 'IdType', 'Id'],
  records: [
    ['5 STAR CLEANING LLC', '3341 WOODBRIAR LANE', 'TALLAHASSEE, FL 32303', 'Federal ID:', '87-2773613'],
    ['ADDY ACURERO', '13447 GORGONA ISLE DR', 'WINDERMERE, FL 34786', 'Federal ID:', '203-87-7732'],
  ],
};

describe('csvImport', () => {
  it('normaliza encabezados con typos y acentos', () => {
    expect(normalizeHeader('Adress')).toBe('adress');
    expect(normalizeHeader('Dirección')).toBe('direccion');
  });

  it('mapea el CSV real de W9s a filas de contratista con dirección única', () => {
    const rows = mapContractorRows(COBICA_CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: '5 STAR CLEANING LLC',
      address: '3341 WOODBRIAR LANE, TALLAHASSEE, FL 32303',
      idType: 'Federal ID:',
      id: '87-2773613',
    });
    expect(rows[1]).toMatchObject({
      name: 'ADDY ACURERO',
      address: '13447 GORGONA ISLE DR, WINDERMERE, FL 34786',
      id: '203-87-7732',
    });
  });

  it('combina columnas separadas de dirección en un solo campo', () => {
    const rows = mapContractorRows({
      headers: ['nombre', 'calle', 'ciudad', 'estado', 'zip', 'identificacion'],
      records: [['X', 'Calle 1', 'Miami', 'FL', '33172', '12-3456789']],
    });
    expect(rows[0]).toMatchObject({ name: 'X', address: 'Calle 1, Miami, FL, 33172', id: '12-3456789' });
  });

  it('mapea filas de cliente', () => {
    const rows = mapClientRows({
      headers: ['Nombre', 'TipoCliente', 'FEI_EIN', 'Email', 'Calle', 'Ciudad'],
      records: [['COBICA', 'Contabilidad', '82-4839524', 'a@b.com', 'Calle 1', 'Clermont']],
    });
    expect(rows[0]).toMatchObject({
      fullName: 'COBICA',
      clientType: 'Contabilidad',
      documentNumber: '82-4839524',
      address: 'Calle 1, Clermont',
    });
  });

  it('compact quita vacíos', () => {
    expect(compact({ a: 'x', b: '', c: undefined })).toEqual({ a: 'x' });
  });

  it('validateUploadFile acepta csv/xls/xlsx y rechaza otros', () => {
    const ok = (name: string, size = 100) => new File([new Uint8Array(size)], name);
    expect(validateUploadFile(ok('w9s.csv'))).toBeNull();
    expect(validateUploadFile(ok('W9S.XLSX'))).toBeNull();
    expect(validateUploadFile(ok('w9s.xls'))).toBeNull();
    expect(validateUploadFile(ok('w9s.pdf'))).toBe('import.invalidFormat');
    expect(validateUploadFile(ok('w9s'))).toBe('import.invalidFormat');
    expect(validateUploadFile(ok('w9s.csv', 11 * 1024 * 1024))).toBe('import.fileTooLarge');
  });

  it('hasRequiredColumn exige columna de nombre', () => {
    expect(hasRequiredColumn(COBICA_CSV, 'contractor')).toBe(true);
    expect(hasRequiredColumn({ headers: ['Address', 'Id'], records: [] }, 'contractor')).toBe(false);
    expect(hasRequiredColumn({ headers: ['Nombre'], records: [] }, 'client')).toBe(true);
  });

  it('parseUploadFile lee xlsx con el formato del Excel de W9s', async () => {
    const workbook = utils.book_new();
    utils.book_append_sheet(
      workbook,
      utils.aoa_to_sheet([
        ['Name', 'Adress', '', 'IdType', 'Id'],
        ['5 STAR CLEANING LLC', '3341 WOODBRIAR LANE', 'TALLAHASSEE, FL 32303', 'Federal ID:', '87-2773613'],
      ]),
      'W9s',
    );
    const bytes = write(workbook, { type: 'array', bookType: 'xlsx' });
    const file = new File([bytes], 'w9s.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const parsed = await parseUploadFile(file);
    const rows = mapContractorRows(parsed);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: '5 STAR CLEANING LLC',
      address: '3341 WOODBRIAR LANE, TALLAHASSEE, FL 32303',
      id: '87-2773613',
    });
  });
});
