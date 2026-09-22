import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';

@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  private clave(fecha: Date) {
    return fecha.toISOString().slice(0, 10);
  }

  private calcularRacha(fechas: string[]) {
    const cursor = new Date(`${this.clave(new Date())}T00:00:00.000Z`);

    if (!fechas.includes(this.clave(cursor))) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    let racha = 0;

    while (fechas.includes(this.clave(cursor))) {
      racha++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return racha;
  }

  private serie(fechas: string[], hoy: Date, dias: number) {
    const resultado: boolean[] = [];

    for (let i = dias - 1; i >= 0; i--) {
      const dia = new Date(hoy);
      dia.setUTCDate(dia.getUTCDate() - i);
      resultado.push(fechas.includes(this.clave(dia)));
    }

    return resultado;
  }

  create(userId: string, createHabitDto: CreateHabitDto) {
    return this.prisma.habit.create({
      data: { ...createHabitDto, userId },
    });
  }

  async findAll(userId: string) {
    const desde = new Date();
    desde.setUTCDate(desde.getUTCDate() - 365);

    const habits = await this.prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        records: {
          where: { date: { gte: desde } },
          select: { date: true },
        },
      },
    });

    const hoy = new Date(`${this.clave(new Date())}T00:00:00.000Z`);

    return habits.map(({ records, ...habit }) => {
      const fechas = records.map((registro) => this.clave(registro.date));

      return {
        ...habit,
        completedToday: fechas.includes(this.clave(hoy)),
        streak: this.calcularRacha(fechas),
        last7Days: this.serie(fechas, hoy, 7),
        last30Days: this.serie(fechas, hoy, 30),
      };
    });
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

    return this.prisma.habit.update({
      where: { id },
      data: updateHabitDto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.habitRecord.deleteMany({ where: { habitId: id } });
    await this.prisma.habit.delete({ where: { id } });

    return { mensaje: 'Habito eliminado' };
  }
}
