import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  private clave(fecha: Date) {
    return fecha.toISOString().slice(0, 10);
  }

  async resumen(userId: string) {
    const habits = await this.prisma.habit.findMany({
      where: { userId, active: true },
      select: { id: true },
    });

    const habitIds = habits.map((h) => h.id);

    const hoy = new Date(`${this.clave(new Date())}T00:00:00.000Z`);
    const desde = new Date(hoy);
    desde.setUTCDate(desde.getUTCDate() - 29);

    const records = habitIds.length
      ? await this.prisma.habitRecord.findMany({
          where: { habitId: { in: habitIds }, date: { gte: desde } },
          select: { date: true },
        })
      : [];

    const porDia = new Map<string, number>();
    for (const r of records) {
      const k = this.clave(r.date);
      porDia.set(k, (porDia.get(k) ?? 0) + 1);
    }

    const total = habitIds.length;
    const completadosHoy = porDia.get(this.clave(hoy)) ?? 0;

    const ultimos7: { date: string; completed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setUTCDate(d.getUTCDate() - i);
      const k = this.clave(d);
      ultimos7.push({ date: k, completed: porDia.get(k) ?? 0 });
    }

    let racha = 0;
    const cursor = new Date(hoy);
    if (!porDia.has(this.clave(cursor))) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    while (porDia.has(this.clave(cursor))) {
      racha++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return {
      totalHabits: total,
      completedToday: completadosHoy,
      pendingToday: Math.max(total - completadosHoy, 0),
      percentToday: total === 0 ? 0 : Math.round((completadosHoy / total) * 100),
      currentStreak: racha,
      last7Days: ultimos7,
    };
  }
}
