import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

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
}
