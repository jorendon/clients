import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: Record<string, ReturnType<typeof vi.fn>> };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };

  const stored = {
    id: 1,
    email: 'jonathan.rendon@gmail.com',
    name: 'Jonathan Rendon',
    password: bcrypt.hashSync('secret123', 4),
    role: Role.ADMIN,
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = { user: { findFirst: vi.fn() } };
    jwt = { signAsync: vi.fn().mockResolvedValue('token-jwt') };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('login válido devuelve token y usuario sin password', async () => {
    prisma.user.findFirst.mockResolvedValue(stored);
    const result = await service.login({ email: stored.email, password: 'secret123' });
    expect(result.accessToken).toBe('token-jwt');
    expect(result.user).toEqual({ id: 1, email: stored.email, name: 'Jonathan Rendon', role: Role.ADMIN });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 1, email: stored.email, role: Role.ADMIN });
  });

  it('rechaza email inexistente', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.login({ email: 'no@x.com', password: 'secret123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza password incorrecto', async () => {
    prisma.user.findFirst.mockResolvedValue(stored);
    await expect(service.login({ email: stored.email, password: 'otra' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza usuario con baja lógica', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.login({ email: stored.email, password: 'secret123' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: stored.email, deletedAt: null },
    });
  });
});
