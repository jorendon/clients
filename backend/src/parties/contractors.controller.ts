import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { PartyKind } from '@prisma/client';
import { CreatePartyDto } from './dto/create-party.dto.js';
import { UpdatePartyDto } from './dto/update-party.dto.js';
import { PartiesService } from './parties.service.js';

@Controller('contractors')
export class ContractorsController {
  constructor(private readonly partiesService: PartiesService) {}

  @Post()
  create(@Body() dto: CreatePartyDto) {
    return this.partiesService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('kind') kind?: PartyKind,
    @Query('contractorsOnly') contractorsOnly?: string,
  ) {
    return this.partiesService.findContractors(search, kind, contractorsOnly === 'true');
  }

  @Get('search/by-document')
  searchByDocument(@Query('document') document: string) {
    return this.partiesService.searchByDocument(document ?? '');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partiesService.findParty(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePartyDto) {
    return this.partiesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.partiesService.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.partiesService.restore(id);
  }
}
