import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

const profileSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException('auth.invalidCredentials');
    const matches = await bcrypt.compare(password, user.password);
    if (!matches) throw new UnauthorizedException('auth.invalidCredentials');
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken, user };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: profileSelect,
    });
    if (!user) throw new NotFoundException('user.notFound');
    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('user.notFound');

    if (dto.email && dto.email !== user.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId }, deletedAt: null },
      });
      if (emailTaken) throw new ConflictException('user.emailInUse');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: profileSelect,
    });

    return updated;
  }
}

