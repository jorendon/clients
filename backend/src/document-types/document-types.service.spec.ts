import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentTypesService } from './document-types.service.js';

describe('DocumentTypesService', () => {
  let service: DocumentTypesService;
  let prisma: Record<string, ReturnType<typeof vi.fn>>;

  const docType = { id: 1, code: 'SSN', name: 'Social Security Number', deletedAt: null };

  beforeEach(async () => {
    prisma = { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentTypesService, { provide: PrismaService, useValue: { documentType: prisma } }],
    }).compile();
    service = module.get<DocumentTypesService>(DocumentTypesService);
  });

  it('create: crea un tipo de documento', async () => {
    prisma.findUnique.mockResolvedValue(null);
    prisma.create.mockResolvedValue(docType);
    const result = await service.create({ code: 'SSN', name: 'Social Security Number' });
    expect(result.code).toBe('SSN');
    expect(prisma.create).toHaveBeenCalledOnce();
  });

  it('create: conflicto si el código existe activo', async () => {
    prisma.findUnique.mockResolvedValue(docType);
    await expect(service.create({ code: 'SSN', name: 'Otro' })).rejects.toThrow(ConflictException);
  });

  it('create: reactiva si estaba eliminado', async () => {
    prisma.findUnique.mockResolvedValue({ ...docType, deletedAt: new Date() });
    prisma.update.mockResolvedValue({ ...docType, deletedAt: null });
    const result = await service.create({ code: 'SSN', name: 'SSN' });
    expect(result.deletedAt).toBeNull();
  });

  it('findOne: 404 si no existe', async () => {
    prisma.findFirst.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('update: conflicto si el código lo usa otro', async () => {
    prisma.findFirst.mockResolvedValueOnce(docType);
    prisma.findFirst.mockResolvedValueOnce({ ...docType, id: 2 });
    await expect(service.update(1, { code: 'SSN' })).rejects.toThrow(ConflictException);
  });

  it('remove: baja lógica', async () => {
    prisma.findFirst.mockResolvedValue(docType);
    prisma.update.mockResolvedValue({ ...docType, deletedAt: new Date() });
    await service.remove(1);
    expect(prisma.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
