import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';

@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  private clave(fecha: Date) {
    return fecha.toISOString().slice(0, 10);
  }

  private restarDias(fecha: Date, dias: number) {
    const resultado = new Date(fecha);
    resultado.setUTCDate(resultado.getUTCDate() - dias);
    return resultado;
  }

  private calcularRacha(fechas: string[], hoy: Date) {
    let dia = hoy;

    if (!fechas.includes(this.clave(dia))) {
      dia = this.restarDias(dia, 1);
    }

    let racha = 0;

    while (fechas.includes(this.clave(dia))) {
      racha++;
      dia = this.restarDias(dia, 1);
    }

    return racha;
  }

  private serie(fechas: string[], hoy: Date, dias: number) {
    const resultado: boolean[] = [];

    for (let atras = dias - 1; atras >= 0; atras--) {
      resultado.push(fechas.includes(this.clave(this.restarDias(hoy, atras))));
    }

    return resultado;
  }

  private fecha(valor?: string) {
    return valor ? new Date(`${valor.slice(0, 10)}T00:00:00.000Z`) : undefined;
  }

  private async verificarNombre(userId: string, name: string, idActual?: string) {
    const existente = await this.prisma.habit.findFirst({
      where: { userId, name: { equals: name, mode: 'insensitive' } },
    });

    if (existente && existente.id !== idActual) {
      throw new ConflictException('Ya tienes un habito con ese nombre');
    }
  }

  private peso(prioridad: string) {
    if (prioridad === 'alta') return 0;
    if (prioridad === 'media') return 1;
    return 2;
  }

  async create(userId: string, createHabitDto: CreateHabitDto) {
    await this.verificarNombre(userId, createHabitDto.name);

    return this.prisma.habit.create({
      data: {
        ...createHabitDto,
        frequency: createHabitDto.frequency ?? 'diaria',
        priority: createHabitDto.priority ?? 'media',
        startDate: this.fecha(createHabitDto.startDate) ?? new Date(),
        endDate: this.fecha(createHabitDto.endDate),
        userId,
      },
    });
  }

  async findAll(userId: string) {
    const hoy = new Date(`${this.clave(new Date())}T00:00:00.000Z`);

    const habits = await this.prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        records: {
          where: { date: { gte: this.restarDias(hoy, 365) } },
          select: { date: true },
        },
      },
    });

    const resultado = habits.map(({ records, ...habit }) => {
      const fechas = records.map((registro) => this.clave(registro.date));

      return {
        ...habit,
        frequency: habit.frequency ?? 'diaria',
        priority: habit.priority ?? 'media',
        completedToday: fechas.includes(this.clave(hoy)),
        streak: this.calcularRacha(fechas, hoy),
        last7Days: this.serie(fechas, hoy, 7),
        last30Days: this.serie(fechas, hoy, 30),
      };
    });

    return resultado.sort(
      (a, b) => this.peso(a.priority) - this.peso(b.priority),
    );
  }

  async findOne(userId: string, id: string) {
    const habit = await this.prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!habit) {
      throw new NotFoundException('Habito no encontrado');
    }

    return habit;
  }

  async update(userId: string, id: string, updateHabitDto: UpdateHabitDto) {
    await this.findOne(userId, id);

    if (updateHabitDto.name) {
      await this.verificarNombre(userId, updateHabitDto.name, id);
    }

    return this.prisma.habit.update({
      where: { id },
      data: {
        ...updateHabitDto,
        startDate: this.fecha(updateHabitDto.startDate),
        endDate: this.fecha(updateHabitDto.endDate),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.habitRecord.deleteMany({ where: { habitId: id } });
    await this.prisma.habit.delete({ where: { id } });

    return { mensaje: 'Habito eliminado' };
  }
}
