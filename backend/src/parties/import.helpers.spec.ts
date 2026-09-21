import { describe, expect, it } from 'vitest';
import { ClientType, PartyKind } from '@prisma/client';
import {
  detectKindFromName,
  normalizeHeader,
  parseBooleanish,
  parseClientType,
  parseClientTypes,
  parseFullAddress,
  parsePartyKind,
  resolveDocTypeCode,
} from './import.helpers.js';

describe('import helpers', () => {
  it('normalizeHeader ignora acentos y símbolos', () => {
    expect(normalizeHeader('Dirección')).toBe('direccion');
    expect(normalizeHeader('IdType')).toBe('idtype');
    expect(normalizeHeader(' City, ST ZIP ')).toBe('citystzip');
  });

  it('parsePartyKind acepta es/en', () => {
    expect(parsePartyKind('Persona')).toBe(PartyKind.PERSON);
    expect(parsePartyKind('COMPANY')).toBe(PartyKind.COMPANY);
    expect(parsePartyKind('empresa')).toBe(PartyKind.COMPANY);
    expect(parsePartyKind('???')).toBeUndefined();
    expect(parsePartyKind('')).toBeUndefined();
  });

  it('parseClientTypes acepta varios separados', () => {
    expect(parseClientTypes('Contabilidad, Payroll')).toEqual([
      ClientType.ACCOUNTING,
      ClientType.PAYROLL,
    ]);
    expect(parseClientTypes('PAYROLL/PAYROLL')).toEqual([ClientType.PAYROLL]);
    expect(parseClientTypes('otro')).toEqual([]);
    expect(parseClientTypes('contabilidad, otro')).toEqual([]);
  });

  it('resolveDocTypeCode mapea etiquetas del Excel', () => {
    expect(resolveDocTypeCode('Federal ID:')).toBe('FEI_EIN');
    expect(resolveDocTypeCode('SSN')).toBe('SSN');
    expect(resolveDocTypeCode('pasaporte')).toBe('PASSPORT');
    expect(resolveDocTypeCode('???')).toBeUndefined();
  });

  it('detectKindFromName por sufijo', () => {
    expect(detectKindFromName('5 STAR CLEANING LLC')).toBe(PartyKind.COMPANY);
    expect(detectKindFromName('MASSEY SERVICES INC')).toBe(PartyKind.COMPANY);
    expect(detectKindFromName('ADDY ACURERO')).toBe(PartyKind.PERSON);
  });

  it('parseFullAddress parte dirección completa y "CIUDAD, ST ZIP"', () => {
    expect(parseFullAddress('3341 WOODBRIAR LANE, TALLAHASSEE, FL 32303')).toEqual({
      street: '3341 WOODBRIAR LANE',
      city: 'TALLAHASSEE',
      state: 'FL',
      zip: '32303',
    });
    expect(parseFullAddress('TALLAHASSEE, FL 32303')).toEqual({
      city: 'TALLAHASSEE',
      state: 'FL',
      zip: '32303',
    });
    expect(parseFullAddress('Winter Garden, FL 34787')).toEqual({
      city: 'Winter Garden',
      state: 'FL',
      zip: '34787',
    });
  });

  it('parseBooleanish acepta variantes', () => {
    expect(parseBooleanish('SI')).toBe(true);
    expect(parseBooleanish('yes')).toBe(true);
    expect(parseBooleanish('')).toBe(false);
    expect(parseBooleanish('no')).toBe(false);
  });
});
