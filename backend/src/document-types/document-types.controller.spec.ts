import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentTypesController } from './document-types.controller.js';
import { DocumentTypesService } from './document-types.service.js';

describe('DocumentTypesController', () => {
  let controller: DocumentTypesController;
  let service: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    service = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      restore: vi.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentTypesController],
      providers: [{ provide: DocumentTypesService, useValue: service }],
    }).compile();
    controller = module.get<DocumentTypesController>(DocumentTypesController);
  });

  it('delega CRUD en el servicio', async () => {
    const dto = { code: 'FEI_EIN', name: 'FEI/EIN' };
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalledWith(false);
    await controller.findAll('true');
    expect(service.findAll).toHaveBeenCalledWith(true);
    await controller.remove(1);
    expect(service.remove).toHaveBeenCalledWith(1);
    await controller.restore(1);
    expect(service.restore).toHaveBeenCalledWith(1);
  });
});
