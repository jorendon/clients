import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;
  let service: Record<string, ReturnType<typeof vi.fn>>;

  const safeUser = {
    id: 1,
    email: 'admin@clients.com',
    name: 'Admin',
    role: Role.ADMIN,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      create: vi.fn().mockResolvedValue(safeUser),
      findAll: vi.fn().mockResolvedValue([safeUser]),
      findOne: vi.fn().mockResolvedValue(safeUser),
      update: vi.fn().mockResolvedValue(safeUser),
      remove: vi.fn().mockResolvedValue({ ...safeUser, deletedAt: new Date() }),
      restore: vi.fn().mockResolvedValue(safeUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('se crea el controlador', () => {
    expect(controller).toBeDefined();
  });

  it('POST /users delega en create', async () => {
    const dto = { email: 'admin@clients.com', name: 'Admin', password: '123456', role: Role.ADMIN };
    await expect(controller.create(dto)).resolves.toEqual(safeUser);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('GET /users lista usuarios', async () => {
    await expect(controller.findAll()).resolves.toEqual([safeUser]);
    expect(service.findAll).toHaveBeenCalledWith(false);
  });

  it('GET /users?includeDeleted=true incluye eliminados', async () => {
    await controller.findAll('true');
    expect(service.findAll).toHaveBeenCalledWith(true);
  });

  it('DELETE /users/:id hace baja lógica', async () => {
    await controller.remove(1);
    expect(service.remove).toHaveBeenCalledWith(1);
  });

  it('POST /users/:id/restore restaura', async () => {
    await controller.restore(1);
    expect(service.restore).toHaveBeenCalledWith(1);
  });
});
