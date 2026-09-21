import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DocumentTypesService } from './document-types.service.js';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto.js';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('document-types')
export class DocumentTypesController {
  constructor(private readonly documentTypesService: DocumentTypesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateDocumentTypeDto) {
    return this.documentTypesService.create(dto);
  }

  /** Lectura abierta a todos los roles (se usa en los dropdowns del formulario de Party). */
  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.documentTypesService.findAll(includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentTypesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDocumentTypeDto) {
    return this.documentTypesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.documentTypesService.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.documentTypesService.restore(id);
  }
}
