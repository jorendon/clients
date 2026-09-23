import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller.js';
import { ContractorsController } from './contractors.controller.js';
import { PartiesService } from './parties.service.js';

import { PartiesController } from './parties.controller.js';

@Module({
  controllers: [ClientsController, ContractorsController, PartiesController],
  providers: [PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
