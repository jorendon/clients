import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientType } from '@prisma/client';
import { AssociateContractorDto } from './dto/associate-contractor.dto.js';
import { CreatePartyDto } from './dto/create-party.dto.js';
import { ImportClientsDto, ImportContractorsDto } from './dto/import-rows.dto.js';
import { UpdatePartyDto } from './dto/update-party.dto.js';
import { PartiesService } from './parties.service.js';

@Controller('clients')
export class ClientsController {
  constructor(private readonly partiesService: PartiesService) {}

  @Post()
  create(@Body() dto: CreatePartyDto) {
    return this.partiesService.create({ ...dto, isClient: true });
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('type') type?: ClientType,
  ) {
    return this.partiesService.findClients(search, includeDeleted === 'true', type);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  importClients(@Body() dto: ImportClientsDto) {
    return this.partiesService.importClients(dto.rows ?? []);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partiesService.findClientDetail(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePartyDto) {
    return this.partiesService.update(id, dto);
  }

  /** Quita la marca de cliente (la entidad se conserva como contratista). */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.partiesService.unmarkClient(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.partiesService.remarkClient(id);
  }

  @Get(':id/contractors')
  listContractors(@Param('id', ParseIntPipe) id: number) {
    return this.partiesService.listContractors(id);
  }

  @Post(':id/contractors')
  @HttpCode(HttpStatus.OK)
  associateContractor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssociateContractorDto,
  ) {
    return this.partiesService.associateContractor(id, dto);
  }

  @Post(':id/contractors/import')
  @HttpCode(HttpStatus.OK)
  importContractors(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ImportContractorsDto,
  ) {
    return this.partiesService.importClientContractors(id, dto.rows ?? []);
  }

  @Post(':id/contractors/check-duplicates')
  @HttpCode(HttpStatus.OK)
  checkContractorDuplicates(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { names: string[] },
  ) {
    return this.partiesService.checkDuplicates(dto.names);
  }

  @Delete(':id/contractors/:contractorId')
  @HttpCode(HttpStatus.OK)
  dissociateContractor(
    @Param('id', ParseIntPipe) id: number,
    @Param('contractorId', ParseIntPipe) contractorId: number,
  ) {
    return this.partiesService.dissociateContractor(id, contractorId);
  }
}
