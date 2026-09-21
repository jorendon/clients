import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddressKind, ClientType, PartyKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizeDocumentNumber, PartiesService } from './parties.service.js';

describe('normalizeDocumentNumber', () => {
  it.each([
    ['82-4839524', '824839524'],
    ['203-87-7732', '203877732'],
    [' 87-2773613 ', '872773613'],
    ['', undefined],
    [undefined, undefined],
  ])('"%s" → "%s"', (input, expected) => {
    expect(normalizeDocumentNumber(input)).toBe(expected);
  });
});

describe('PartiesService', () => {
  let service: PartiesService;
  let party: Record<string, ReturnType<typeof vi.fn>>;
  let partyContact: Record<string, ReturnType<typeof vi.fn>>;
  let partyAddress: Record<string, ReturnType<typeof vi.fn>>;
  let clientContractor: Record<string, ReturnType<typeof vi.fn>>;
  let documentType: Record<string, ReturnType<typeof vi.fn>>;
  let tx: Record<string, ReturnType<typeof vi.fn>>;

  const cobica = {
    id: 1,
    kind: PartyKind.COMPANY,
    fullName: 'COBICA INTERNATIONAL CORP',
    isClient: true,
    clientTypes: [{ partyId: 1, clientType: ClientType.ACCOUNTING }],
    documentNumber: '82-4839524',
    deletedAt: null,
  };

  beforeEach(async () => {
    party = { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() };
    partyContact = { createMany: vi.fn(), deleteMany: vi.fn() };
    partyAddress = { createMany: vi.fn(), deleteMany: vi.fn() };
    clientContractor = { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() };
    documentType = { findMany: vi.fn().mockResolvedValue([{ id: 2, code: 'FEI_EIN' }]) };
    tx = {
      party: { update: vi.fn() },
      partyContact: { deleteMany: vi.fn(), createMany: vi.fn() },
      partyAddress: { deleteMany: vi.fn(), createMany: vi.fn() },
      partyClientType: { deleteMany: vi.fn(), createMany: vi.fn() },
    };
    const prisma = {
      party,
      partyContact,
      partyAddress,
      clientContractor,
      documentType,
      $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartiesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<PartiesService>(PartiesService);
  });

  it('create: crea entidad con anidados', async () => {
    party.findUnique.mockResolvedValue(null);
    party.create.mockResolvedValue(cobica);
    party.findFirst.mockResolvedValue(cobica);
    const result = await service.create({
      kind: PartyKind.COMPANY,
      fullName: 'COBICA INTERNATIONAL CORP',
      isClient: true,
      contacts: [{ firstName: 'Jose Alejandro', lastName: 'Avendano' }],
      addresses: [{ kind: AddressKind.FISCAL, street: '10901 ISLAND GROVE RD' }],
    });
    expect(result.fullName).toContain('COBICA');
    expect(partyContact.createMany).toHaveBeenCalledOnce();
    expect(partyAddress.createMany).toHaveBeenCalledOnce();
  });

  it('create: exige fiscal si hay direcciones no fiscales', async () => {
    await expect(
      service.create({
        kind: PartyKind.PERSON,
        fullName: 'X',
        addresses: [{ kind: AddressKind.MAILING, street: 'A' }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(party.create).not.toHaveBeenCalled();
  });

  it('create: conflicto si la identificación existe', async () => {
    party.findUnique.mockResolvedValue(cobica);
    await expect(
      service.create({ kind: PartyKind.COMPANY, fullName: 'Otra', documentNumber: '82-4839524' }),
    ).rejects.toThrow(ConflictException);
  });

  it('findClientDetail: 404 si no es cliente', async () => {
    party.findFirst.mockResolvedValue(null);
    await expect(service.findClientDetail(99)).rejects.toThrow(NotFoundException);
  });

  it('associateContractor: impide auto-asociación', async () => {
    party.findFirst.mockResolvedValue(cobica);
    await expect(service.associateContractor(1, { contractorId: 1 })).rejects.toThrow(
      BadRequestException,
    );
    expect(clientContractor.upsert).not.toHaveBeenCalled();
  });

  it('associateContractor: asocia (idempotente vía upsert)', async () => {
    const contractor = { id: 2, fullName: '5 STAR CLEANING LLC', deletedAt: null };
    party.findFirst
      .mockResolvedValueOnce(cobica)
      .mockResolvedValueOnce(contractor)
      .mockResolvedValueOnce(cobica);
    clientContractor.upsert.mockResolvedValue({});
    clientContractor.findMany.mockResolvedValue([]);
    await service.associateContractor(1, { contractorId: 2 });
    expect(clientContractor.upsert).toHaveBeenCalledWith({
      where: { clientId_contractorId: { clientId: 1, contractorId: 2 } },
      create: { clientId: 1, contractorId: 2 },
      update: {},
    });
  });

  it('associateContractor: 404 si la contratista no existe', async () => {
    party.findFirst.mockResolvedValueOnce(cobica).mockResolvedValueOnce(null);
    await expect(service.associateContractor(1, { contractorId: 99 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('unmarkClient: quita la marca de cliente', async () => {
    party.findFirst.mockResolvedValueOnce(cobica).mockResolvedValueOnce({ ...cobica, isClient: false });
    party.update.mockResolvedValue({});
    const result = await service.unmarkClient(1);
    expect(party.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isClient: false },
    });
    expect(result.isClient).toBe(false);
  });

  it('searchByDocument: normaliza antes de buscar', async () => {
    party.findFirst.mockResolvedValue(cobica);
    await service.searchByDocument('82-4839524');
    expect(party.findFirst).toHaveBeenCalledWith({
      where: { normalizedDocument: '824839524', deletedAt: null },
      include: expect.anything(),
    });
  });

  it('importClientContractors: crea y asocia filas nuevas', async () => {
    const created = { id: 2, fullName: '5 STAR CLEANING LLC', deletedAt: null };
    party.findUnique.mockResolvedValue(null); // create: no existe
    party.findFirst
      .mockResolvedValueOnce(cobica) // findClientDetail (inicio)
      .mockResolvedValueOnce(null) // no existe por documento
      .mockResolvedValueOnce(created) // create: findParty
      .mockResolvedValueOnce(cobica) // associate: findClientDetail
      .mockResolvedValueOnce(created) // associate: contractor lookup
      .mockResolvedValueOnce(cobica); // listContractors: findClientDetail
    party.create.mockResolvedValue({ id: 2 });
    clientContractor.upsert.mockResolvedValue({});
    clientContractor.findMany.mockResolvedValue([]);

    const report = await service.importClientContractors(1, [
      {
        name: '5 STAR CLEANING LLC',
        street: '3341 WOODBRIAR LANE',
        cityStateZip: 'TALLAHASSEE, FL 32303',
        idType: 'Federal ID:',
        id: '87-2773613',
      },
    ]);

    expect(report.total).toBe(1);
    expect(report.created).toBe(1);
    expect(report.errors).toEqual([]);
    expect(party.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fullName: '5 STAR CLEANING LLC',
        documentNumber: '87-2773613',
        normalizedDocument: '872773613',
      }),
    });
  });

  it('importClientContractors: asocia sin duplicar si ya existe (otro cliente)', async () => {
    const existing = { id: 5, fullName: 'MASSEY SERVICES INC', deletedAt: null };
    party.findFirst
      .mockResolvedValueOnce(cobica) // findClientDetail
      .mockResolvedValueOnce(existing) // existe por documento
      .mockResolvedValueOnce(cobica) // associate: findClientDetail
      .mockResolvedValueOnce(existing) // associate: contractor
      .mockResolvedValueOnce(cobica) // associate: findClientDetail (list)
      .mockResolvedValueOnce(cobica); // listContractors
    clientContractor.upsert.mockResolvedValue({});
    clientContractor.findMany.mockResolvedValue([]);

    const report = await service.importClientContractors(1, [
      { name: 'MASSEY SERVICES INC', id: '59-2557150' },
    ]);

    expect(report.associated).toBe(1);
    expect(report.created).toBe(0);
    expect(party.create).not.toHaveBeenCalled();
  });

  it('importClientContractors: reporta fila sin nombre y duplicados del archivo', async () => {
    party.findUnique.mockResolvedValue(null);
    party.findFirst
      .mockResolvedValueOnce(cobica) // findClientDetail (inicio)
      .mockResolvedValueOnce(null) // lookup fila 2: no existe
      .mockResolvedValue({ id: 9, fullName: 'A1 SEPTIC', deletedAt: null }); // resto
    party.create.mockResolvedValue({ id: 9 });
    clientContractor.upsert.mockResolvedValue({});
    clientContractor.findMany.mockResolvedValue([]);

    const report = await service.importClientContractors(1, [
      { name: '' },
      { name: 'A1 SEPTIC', id: '59-3608950' },
      { name: 'A1 SEPTIC DUPLICADO', id: '59-3608950' },
    ]);

    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toEqual({ row: 1, message: 'import.missingName' });
    expect(report.duplicatesInFile).toBe(1);
    expect(report.created).toBe(1);
  });

  it('importClients: marca como cliente si la entidad ya existía', async () => {
    const existing = { id: 7, fullName: 'EMPRESA X', isClient: false, deletedAt: null, clientTypes: [] };
    documentType.findMany.mockResolvedValue([]);
    party.findUnique.mockResolvedValue(existing); // create: existe activo → conflicto
    party.findFirst
      .mockResolvedValueOnce(existing) // import: re-lookup tras conflicto
      .mockResolvedValueOnce(existing) // update: findParty
      .mockResolvedValueOnce(null) // update: taken lookup (NOT id lo excluye)
      .mockResolvedValue(existing); // update: findParty final

    const report = await service.importClients([
      { fullName: 'EMPRESA X', documentNumber: '12-3456789' },
    ]);

    expect(report.markedClient).toBe(1);
    expect(report.created).toBe(0);
    expect(report.errors).toEqual([]);
  });

  it('importClients: cuenta ya-existentes sin error al recargar', async () => {
    const existingClient = { id: 7, fullName: 'EMPRESA X', isClient: true, deletedAt: null };
    documentType.findMany.mockResolvedValue([]);
    party.findUnique.mockResolvedValue(existingClient);
    party.findFirst.mockResolvedValue(existingClient);

    const report = await service.importClients([
      { fullName: 'EMPRESA X', documentNumber: '12-3456789' },
    ]);

    expect(report.existing).toBe(1);
    expect(report.errors).toEqual([]);
  });
});
