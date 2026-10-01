import { describe, expect, it } from 'vitest';
import {
  aInstante,
  diasHabilesDeSemana,
  duracionEntre,
  fechaDe,
  formatoDuracion,
  formatoHora,
  hoy,
  horariosDeInicio,
  minutosDe,
  moverDiaHabil,
  proximoDiaHabil,
} from './fechas';

describe('fechas', () => {
  it('convierte hora de Argentina a UTC (UTC-3)', () => {
    expect(aInstante('2026-10-05', 10 * 60).toISOString()).toBe('2026-10-05T13:00:00.000Z');
  });

  it('obtiene fecha y minutos en hora de Argentina', () => {
    const iso = '2026-10-06T01:30:00Z'; // 22:30 del 5 de octubre en Argentina
    expect(fechaDe(iso)).toBe('2026-10-05');
    expect(minutosDe(iso)).toBe(22 * 60 + 30);
  });

  it('hoy usa la zona de Argentina', () => {
    expect(hoy(new Date('2026-10-06T02:00:00Z'))).toBe('2026-10-05');
  });

  it('salta fines de semana', () => {
    expect(proximoDiaHabil('2026-10-03')).toBe('2026-10-05'); // sábado -> lunes
    expect(proximoDiaHabil('2026-10-04')).toBe('2026-10-05'); // domingo -> lunes
    expect(moverDiaHabil('2026-10-02', 1)).toBe('2026-10-05'); // viernes -> lunes
    expect(moverDiaHabil('2026-10-05', -1)).toBe('2026-10-02'); // lunes -> viernes
  });

  it('lista lunes a viernes de la semana', () => {
    expect(diasHabilesDeSemana('2026-10-07')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
    ]);
    expect(diasHabilesDeSemana('2026-10-11')[0]).toBe('2026-10-05'); // domingo
  });

  it('formatea horas y duraciones', () => {
    expect(formatoHora(8 * 60 + 5)).toBe('8:05');
    expect(formatoDuracion(30)).toBe('30 min');
    expect(formatoDuracion(60)).toBe('1 hora');
    expect(formatoDuracion(90)).toBe('1 h 30 min');
    expect(duracionEntre('2026-10-05T13:00:00Z', '2026-10-05T14:30:00Z')).toBe(90);
  });

  it('ofrece inicios de 8:00 a 17:45 cada 15 min', () => {
    const h = horariosDeInicio();
    expect(h[0]).toBe(480);
    expect(h[h.length - 1]).toBe(17 * 60 + 45);
    expect(h).toHaveLength(40);
  });
});
