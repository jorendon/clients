import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientsController } from './clients.controller.js';
import { ContractorsController } from './contractors.controller.js';
import { PartiesService } from './parties.service.js';

function mockService() {
  return {
    create: vi.fn(),
    findClients: vi.fn(),
    findContractors: vi.fn(),
    findParty: vi.fn(),
    searchByDocument: vi.fn(),
    findClientDetail: vi.fn(),
    update: vi.fn(),
    unmarkClient: vi.fn(),
    remarkClient: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
    listContractors: vi.fn(),
    associateContractor: vi.fn(),
    dissociateContractor: vi.fn(),
    importClients: vi.fn(),
    importClientContractors: vi.fn(),
  };
}

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    service = mockService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [{ provide: PartiesService, useValue: service }],
    }).compile();
    controller = module.get<ClientsController>(ClientsController);
  });

  it('fuerza isClient=true al crear y delega el resto', async () => {
    await controller.create({ kind: 'COMPANY', fullName: 'COBICA' } as never);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ isClient: true, fullName: 'COBICA' }),
    );
    await controller.findAll('cob', 'true');
    expect(service.findClients).toHaveBeenCalledWith('cob', true, undefined);
    await controller.associateContractor(1, { contractorId: 2 });
    expect(service.associateContractor).toHaveBeenCalledWith(1, { contractorId: 2 });
    await controller.remove(1);
    expect(service.unmarkClient).toHaveBeenCalledWith(1);
    await controller.importClients({ rows: [] });
    expect(service.importClients).toHaveBeenCalledWith([]);
    await controller.importContractors(1, { rows: [] });
    expect(service.importClientContractors).toHaveBeenCalledWith(1, []);
  });
});

describe('ContractorsController', () => {
  let controller: ContractorsController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    service = mockService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractorsController],
      providers: [{ provide: PartiesService, useValue: service }],
    }).compile();
    controller = module.get<ContractorsController>(ContractorsController);
  });

  it('delega CRUD y búsqueda por documento', async () => {
    await controller.findAll('star', 'COMPANY' as never, 'true');
    expect(service.findContractors).toHaveBeenCalledWith('star', 'COMPANY', true);
    await controller.searchByDocument('87-2773613');
    expect(service.searchByDocument).toHaveBeenCalledWith('87-2773613');
    await controller.remove(2);
    expect(service.remove).toHaveBeenCalledWith(2);
  });
});
