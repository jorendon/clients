import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { ROLES_KEY } from './roles.decorator.js';

export interface RequestUser {
  id: number;
  email: string;
  role: Role;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('auth.unauthorized');

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = { id: payload.sub, email: payload.email, role: payload.role } as RequestUser;
    } catch {
      throw new UnauthorizedException('auth.unauthorized');
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(request.user.role)) {
      throw new UnauthorizedException('auth.forbidden');
    }
    return true;
  }
}
