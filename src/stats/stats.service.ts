import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ConteoPorDia = Record<string, number>;
type Dia = { date: string; completed: number };

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  private clave(fecha: Date) {
    return fecha.toISOString().slice(0, 10);
  }

  private restarDias(fecha: Date, dias: number) {
    const resultado = new Date(fecha);
    resultado.setUTCDate(resultado.getUTCDate() - dias);
    return resultado;
  }

  private porcentaje(cumplidos: number, habitos: number, dias: number) {
    const posibles = habitos * dias;
    return posibles === 0 ? 0 : Math.round((cumplidos / posibles) * 100);
  }

  private sumar(dias: Dia[]) {
    let total = 0;

    for (const dia of dias) {
      total += dia.completed;
    }

    return total;
  }

  private sumarEntre(porDia: ConteoPorDia, desde: Date, hasta: Date) {
    let total = 0;

    for (const fecha of Object.keys(porDia)) {
      const dia = new Date(`${fecha}T00:00:00.000Z`);

      if (dia >= desde && dia < hasta) {
        total += porDia[fecha];
      }
    }

    return total;
  }

  private serie(porDia: ConteoPorDia, hoy: Date, dias: number) {
    const resultado: Dia[] = [];

    for (let atras = dias - 1; atras >= 0; atras--) {
      const fecha = this.clave(this.restarDias(hoy, atras));
      resultado.push({ date: fecha, completed: porDia[fecha] ?? 0 });
    }

    return resultado;
  }

  private rachaActual(porDia: ConteoPorDia, hoy: Date) {
    let dia = hoy;

    if (porDia[this.clave(dia)] === undefined) {
      dia = this.restarDias(dia, 1);
    }

    let racha = 0;

    while (porDia[this.clave(dia)] !== undefined) {
      racha++;
      dia = this.restarDias(dia, 1);
    }

    return racha;
  }

  private mejorRacha(fechas: string[]) {
    let mejor = 0;
    let actual = 0;

    for (const fecha of [...fechas].sort()) {
      const dia = new Date(`${fecha}T00:00:00.000Z`);
      const ayer = this.clave(this.restarDias(dia, 1));

      actual = fechas.includes(ayer) ? actual + 1 : 1;

      if (actual > mejor) {
        mejor = actual;
      }
    }

    return mejor;
  }

  private tendencia(porDia: ConteoPorDia, hoy: Date, habitos: number) {
    const dias = this.serie(porDia, hoy, 42);
    const semanas: { week: string; percent: number }[] = [];

    for (let numero = 1; numero <= 6; numero++) {
      const desde = (numero - 1) * 7;
      const cumplidos = this.sumar(dias.slice(desde, desde + 7));

      semanas.push({
        week: `S${numero}`,
        percent: this.porcentaje(cumplidos, habitos, 7),
      });
    }

    return semanas;
  }

  async resumen(userId: string) {
    const habits = await this.prisma.habit.findMany({
      where: { userId, active: true },
      select: { id: true },
    });

    const habitIds = habits.map((habit) => habit.id);

    const hoy = new Date(`${this.clave(new Date())}T00:00:00.000Z`);

    const records = habitIds.length
      ? await this.prisma.habitRecord.findMany({
          where: {
            habitId: { in: habitIds },
            date: { gte: this.restarDias(hoy, 364) },
          },
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

    const anio = hoy.getUTCFullYear();
    const mes = hoy.getUTCMonth();

    const inicioMes = new Date(Date.UTC(anio, mes, 1));
    const inicioMesAnterior = new Date(Date.UTC(anio, mes - 1, 1));
    const inicioMesSiguiente = new Date(Date.UTC(anio, mes + 1, 1));

    const diasDelMesAnterior = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const diasTranscurridos = hoy.getUTCDate();

    const cumplidosMes = this.sumarEntre(porDia, inicioMes, inicioMesSiguiente);
    const cumplidosMesAnterior = this.sumarEntre(
      porDia,
      inicioMesAnterior,
      inicioMes,
    );

    return {
      totalHabits: total,
      completedToday: completadosHoy,
      pendingToday: Math.max(total - completadosHoy, 0),
      percentToday: this.porcentaje(completadosHoy, total, 1),
      currentStreak: this.rachaActual(porDia, hoy),
      bestStreak: this.mejorRacha(Object.keys(porDia)),
      percentWeek: this.porcentaje(this.sumar(ultimos7), total, 7),
      percentMonth: this.porcentaje(cumplidosMes, total, diasTranscurridos),
      percentPrevMonth: this.porcentaje(
        cumplidosMesAnterior,
        total,
        diasDelMesAnterior,
      ),
      last7Days: ultimos7,
      last30Days: ultimos30,
      weeklyTrend: this.tendencia(porDia, hoy, total),
    };
  }
}
