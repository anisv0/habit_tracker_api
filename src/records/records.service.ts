import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizarFecha(valor?: string) {
    const texto = valor ?? new Date().toISOString().slice(0, 10);
    return new Date(`${texto}T00:00:00.000Z`);
  }

  private async verificarHabito(userId: string, habitId: string) {
    const habit = await this.prisma.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!habit) {
      throw new NotFoundException('Habito no encontrado');
    }

    return habit;
  }

  async marcar(userId: string, habitId: string, dto: CreateRecordDto) {
    await this.verificarHabito(userId, habitId);

    const date = this.normalizarFecha(dto.date);

    const existente = await this.prisma.habitRecord.findFirst({
      where: { habitId, date },
    });

    if (existente) {
      throw new ConflictException('Ese habito ya esta marcado en esa fecha');
    }

    return this.prisma.habitRecord.create({ data: { habitId, date } });
  }

  async historial(userId: string, habitId: string) {
    await this.verificarHabito(userId, habitId);

    return this.prisma.habitRecord.findMany({
      where: { habitId },
      orderBy: { date: 'desc' },
    });
  }

  async desmarcar(userId: string, habitId: string, fecha: string) {
    await this.verificarHabito(userId, habitId);

    const date = this.normalizarFecha(fecha);

    const registro = await this.prisma.habitRecord.findFirst({
      where: { habitId, date },
    });

    if (!registro) {
      throw new NotFoundException('No hay registro en esa fecha');
    }

    await this.prisma.habitRecord.delete({ where: { id: registro.id } });

    return { mensaje: 'Registro eliminado' };
  }
}
