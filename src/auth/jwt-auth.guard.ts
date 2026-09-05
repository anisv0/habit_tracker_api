import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

type PeticionConUsuario = Request & {
  user?: { userId: string; email: string };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PeticionConUsuario>();
    const encabezado = request.headers.authorization;

    if (!encabezado || !encabezado.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de acceso');
    }

    const token = encabezado.substring(7);

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
      }>(token);

      request.user = { userId: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido o vencido');
    }
  }
}
