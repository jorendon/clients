import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller.js';
import { ContractorsController } from './contractors.controller.js';
import { PartiesService } from './parties.service.js';

@Module({
  controllers: [ClientsController, ContractorsController],
  providers: [PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
