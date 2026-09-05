import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existente = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existente) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hash },
    });

    return this.construirRespuesta(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Correo o contrasena incorrectos');
    }

    const coincide = await bcrypt.compare(dto.password, user.password);

    if (!coincide) {
      throw new UnauthorizedException('Correo o contrasena incorrectos');
    }

    return this.construirRespuesta(user);
  }

  async perfil(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException();
    }

    return { id: user.id, name: user.name, email: user.email };
  }

  private construirRespuesta(user: {
    id: string;
    name: string;
    email: string;
  }) {
    return {
      user: { id: user.id, name: user.name, email: user.email },
      access_token: this.jwt.sign({ sub: user.id, email: user.email }),
    };
  }
}
