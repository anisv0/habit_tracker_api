import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ConteoPorDia = Record<string, number>;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  private clave(fecha: Date) {
    return fecha.toISOString().slice(0, 10);
  }

  private mejorRacha(fechas: string[]) {
    const ordenadas = [...fechas].sort();

    let mejor = 0;
    let actual = 0;
    let anterior: Date | null = null;

    for (const texto of ordenadas) {
      const dia = new Date(`${texto}T00:00:00.000Z`);

      if (anterior === null) {
        actual = 1;
      } else {
        const diferencia = (dia.getTime() - anterior.getTime()) / 86400000;
        actual = diferencia === 1 ? actual + 1 : 1;
      }

      if (actual > mejor) {
        mejor = actual;
      }

      anterior = dia;
    }

    return mejor;
  }

  private porcentaje(cumplidos: number, habitos: number, dias: number) {
    const posibles = habitos * dias;
    return posibles === 0 ? 0 : Math.round((cumplidos / posibles) * 100);
  }

  private serie(porDia: ConteoPorDia, hoy: Date, dias: number) {
    const resultado: { date: string; completed: number }[] = [];

    for (let i = dias - 1; i >= 0; i--) {
      const dia = new Date(hoy);
      dia.setUTCDate(dia.getUTCDate() - i);

      const fecha = this.clave(dia);
      resultado.push({ date: fecha, completed: porDia[fecha] ?? 0 });
    }

    return resultado;
  }

  async resumen(userId: string) {
    const habits = await this.prisma.habit.findMany({
      where: { userId, active: true },
      select: { id: true },
    });

    const habitIds = habits.map((habit) => habit.id);

    const hoy = new Date(`${this.clave(new Date())}T00:00:00.000Z`);
    const desde = new Date(hoy);
    desde.setUTCDate(desde.getUTCDate() - 364);

    const records = habitIds.length
      ? await this.prisma.habitRecord.findMany({
          where: { habitId: { in: habitIds }, date: { gte: desde } },
          select: { date: true },
        })
      : [];

    const porDia: ConteoPorDia = {};

    for (const registro of records) {
      const fecha = this.clave(registro.date);
      porDia[fecha] = (porDia[fecha] ?? 0) + 1;
    }

    const total = habitIds.length;
    const completadosHoy = porDia[this.clave(hoy)] ?? 0;

    const ultimos7 = this.serie(porDia, hoy, 7);
    const ultimos30 = this.serie(porDia, hoy, 30);

    let cumplidosSemana = 0;

    for (const dia of ultimos7) {
      cumplidosSemana += dia.completed;
    }

    let racha = 0;
    const cursor = new Date(hoy);

    if (porDia[this.clave(cursor)] === undefined) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    while (porDia[this.clave(cursor)] !== undefined) {
      racha++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    const anio = hoy.getUTCFullYear();
    const mes = hoy.getUTCMonth();

    const inicioMes = new Date(Date.UTC(anio, mes, 1));
    const inicioMesAnterior = new Date(Date.UTC(anio, mes - 1, 1));
    const diasMesAnterior = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const diasTranscurridos = hoy.getUTCDate();

    const fechasConMarcas = Object.keys(porDia);

    let cumplidosMes = 0;
    let cumplidosMesAnterior = 0;

    for (const fecha of fechasConMarcas) {
      const dia = new Date(`${fecha}T00:00:00.000Z`);

      if (dia >= inicioMes) {
        cumplidosMes += porDia[fecha];
      } else if (dia >= inicioMesAnterior) {
        cumplidosMesAnterior += porDia[fecha];
      }
    }

    return {
      totalHabits: total,
      completedToday: completadosHoy,
      pendingToday: Math.max(total - completadosHoy, 0),
      percentToday: total === 0 ? 0 : Math.round((completadosHoy / total) * 100),
      currentStreak: racha,
      bestStreak: this.mejorRacha(fechasConMarcas),
      percentWeek: this.porcentaje(cumplidosSemana, total, 7),
      percentMonth: this.porcentaje(cumplidosMes, total, diasTranscurridos),
      percentPrevMonth: this.porcentaje(
        cumplidosMesAnterior,
        total,
        diasMesAnterior,
      ),
      last7Days: ultimos7,
      last30Days: ultimos30,
    };
  }
}
