import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto.js';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto.js';

@Injectable()
export class DocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentTypeDto) {
    const existing = await this.prisma.documentType.findUnique({ where: { code: dto.code } });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('documentType.codeTaken');
    }
    if (existing?.deletedAt) {
      return this.prisma.documentType.update({
        where: { code: dto.code },
        data: { ...dto, deletedAt: null },
      });
    }
    return this.prisma.documentType.create({ data: dto });
  }

  findAll(includeDeleted = false) {
    return this.prisma.documentType.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const found = await this.prisma.documentType.findFirst({
      where: { id, deletedAt: null },
    });
    if (!found) throw new NotFoundException(`documentType.notFound:${id}`);
    return found;
  }

  async update(id: number, dto: UpdateDocumentTypeDto) {
    await this.findOne(id);
    if (dto.code) {
      const taken = await this.prisma.documentType.findFirst({
        where: { code: dto.code, NOT: { id }, deletedAt: null },
      });
      if (taken) throw new ConflictException('documentType.codeTaken');
    }
    return this.prisma.documentType.update({
      where: { id },
      data: dto as Prisma.DocumentTypeUpdateInput,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.documentType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number) {
    const found = await this.prisma.documentType.findUnique({ where: { id } });
    if (!found) throw new NotFoundException(`documentType.notFound:${id}`);
    return this.prisma.documentType.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
