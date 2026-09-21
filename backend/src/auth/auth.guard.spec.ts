import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { AuthGuard } from './auth.guard.js';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwt: { verifyAsync: ReturnType<typeof vi.fn> };
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  function context(headers: Record<string, string> = {}) {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    } as never;
  }

  beforeEach(() => {
    jwt = { verifyAsync: vi.fn() };
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
    guard = new AuthGuard(jwt as unknown as JwtService, reflector as unknown as Reflector);
  });

  it('deja pasar rutas públicas sin token', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rechaza sin header Authorization', async () => {
    await expect(guard.canActivate(context())).rejects.toThrow(UnauthorizedException);
  });

  it('acepta Bearer válido y adjunta el usuario', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 1, email: 'a@b.com', role: Role.EMPLEADO });
    const ctx = context({ authorization: 'Bearer abc' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('abc');
  });

  it('rechaza token inválido', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('bad'));
    await expect(guard.canActivate(context({ authorization: 'Bearer malo' }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza rol insuficiente', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 1, email: 'a@b.com', role: Role.EMPLEADO });
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // isPublic
      .mockReturnValueOnce([Role.ADMIN]); // roles
    await expect(guard.canActivate(context({ authorization: 'Bearer abc' }))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
