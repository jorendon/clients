import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let prismaUser: Record<string, ReturnType<typeof vi.fn>>;

  const safeUser = {
    id: 1,
    email: 'ana@clients.com',
    name: 'Ana',
    role: Role.EMPLEADO,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaUser = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: { user: prismaUser } }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('se crea el servicio', () => {
    expect(service).toBeDefined();
  });

  it('create: crea un usuario con password hasheado y rol por defecto', async () => {
    prismaUser.findUnique.mockResolvedValue(null);
    prismaUser.create.mockResolvedValue(safeUser);

    const result = await service.create({
      email: 'ana@clients.com',
      name: 'Ana',
      password: 'secreto123',
    });

    expect(result.email).toBe('ana@clients.com');
    expect(prismaUser.create).toHaveBeenCalledOnce();
    const payload = prismaUser.create.mock.calls[0][0];
    expect(payload.data.password).not.toBe('secreto123');
    expect(payload.data.role).toBe(Role.EMPLEADO);
  });

  it('create: lanza conflicto si el email ya existe activo', async () => {
    prismaUser.findUnique.mockResolvedValue(safeUser);
    await expect(
      service.create({ email: 'ana@clients.com', name: 'Ana', password: 'secreto123' }),
    ).rejects.toThrow(ConflictException);
  });

  it('create: reactiva un usuario con baja lógica', async () => {
    prismaUser.findUnique.mockResolvedValue({ ...safeUser, deletedAt: new Date() });
    prismaUser.update.mockResolvedValue({ ...safeUser, deletedAt: null });

    const result = await service.create({
      email: 'ana@clients.com',
      name: 'Ana Nueva',
      password: 'secreto123',
    });

    expect(prismaUser.update).toHaveBeenCalledOnce();
    expect(result.deletedAt).toBeNull();
  });

  it('findOne: lanza 404 si no existe o está eliminado', async () => {
    prismaUser.findFirst.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('update: lanza conflicto si el email está en uso por otro', async () => {
    prismaUser.findFirst.mockResolvedValueOnce(safeUser);
    prismaUser.findFirst.mockResolvedValueOnce({ ...safeUser, id: 2 });
    await expect(service.update(1, { email: 'otro@clients.com' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('remove: hace soft-delete (setea deletedAt)', async () => {
    prismaUser.findFirst.mockResolvedValue(safeUser);
    prismaUser.update.mockResolvedValue({ ...safeUser, deletedAt: new Date() });

    await service.remove(1);

    expect(prismaUser.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deletedAt: expect.any(Date) },
      select: expect.anything(),
    });
  });

  it('restore: limpia deletedAt', async () => {
    prismaUser.findUnique.mockResolvedValue({ ...safeUser, deletedAt: new Date() });
    prismaUser.update.mockResolvedValue({ ...safeUser, deletedAt: null });

    const result = await service.restore(1);
    expect(result.deletedAt).toBeNull();
    expect(prismaUser.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deletedAt: null },
      select: expect.anything(),
    });
  });
});
