import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('user.emailTaken');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Si existía pero estaba eliminado lógicamente, lo reactivamos
    if (existing?.deletedAt) {
      return this.prisma.user.update({
        where: { email: createUserDto.email },
        data: {
          name: createUserDto.name,
          password: hashedPassword,
          role: createUserDto.role ?? Role.EMPLEADO,
          deletedAt: null,
        },
        select: userSelect,
      });
    }

    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
        role: createUserDto.role ?? Role.EMPLEADO,
      },
      select: userSelect,
    });
  }

  findAll(includeDeleted = false): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    });
  }

  async findOne(id: number): Promise<SafeUser> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: userSelect,
    });
    if (!user) throw new NotFoundException(`user.notFound:${id}`);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    await this.findOne(id);

    if (updateUserDto.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: { email: updateUserDto.email, NOT: { id }, deletedAt: null },
      });
      if (emailTaken) throw new ConflictException('user.emailInUse');
    }

    const data: Prisma.UserUpdateInput = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  /** Eliminación lógica: marca deletedAt en lugar de borrar */
  async remove(id: number): Promise<SafeUser> {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: userSelect,
    });
  }

  /** Restaurar un usuario eliminado lógicamente */
  async restore(id: number): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException(`user.notFound:${id}`);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
      select: userSelect,
    });
  }
}
