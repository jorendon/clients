import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PartiesService } from './parties.service.js';

@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Get(':id/document-number')
  getUnmaskedDocumentNumber(@Param('id', ParseIntPipe) id: number) {
    return this.partiesService.getUnmaskedDocumentNumber(id);
  }
}
