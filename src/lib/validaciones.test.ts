import { describe, expect, it } from 'vitest';
import { aInstante } from './fechas';
import type { Reunion } from './tipos';
import { buscarChoque, mensajeChoque, traducirError, validarHorario } from './validaciones';

const feriados = new Map([['2026-10-12', 'Día del Respeto a la Diversidad Cultural']]);
const lunes = '2026-10-05';

describe('validarHorario', () => {
  it('acepta un horario hábil', () => {
    expect(validarHorario({ fecha: lunes, inicioMin: 600, duracionMin: 60 }, feriados)).toBeNull();
    expect(validarHorario({ fecha: lunes, inicioMin: 480, duracionMin: 600 }, feriados)).toBeNull();
    expect(validarHorario({ fecha: lunes, inicioMin: 17 * 60, duracionMin: 60 }, feriados)).toBeNull();
  });

  it('rechaza fines de semana', () => {
    expect(validarHorario({ fecha: '2026-10-03', inicioMin: 600, duracionMin: 60 }, feriados)).toMatch(
      /fines de semana/,
    );
  });

  it('rechaza feriados', () => {
    expect(validarHorario({ fecha: '2026-10-12', inicioMin: 600, duracionMin: 60 }, feriados)).toMatch(
      /feriado/,
    );
  });

  it('rechaza antes de las 8 y después de las 18', () => {
    expect(validarHorario({ fecha: lunes, inicioMin: 450, duracionMin: 60 }, feriados)).toMatch(/8:00/);
    expect(validarHorario({ fecha: lunes, inicioMin: 17 * 60 + 30, duracionMin: 60 }, feriados)).toMatch(
      /18:30/,
    );
  });

  it('exige pasos de 15 minutos', () => {
    expect(validarHorario({ fecha: lunes, inicioMin: 605, duracionMin: 60 }, feriados)).toMatch(/15 minutos/);
  });
});

describe('buscarChoque', () => {
  const existente: Reunion = {
    id: 'a',
    sala_id: 'sala2',
    cliente: 'ACME',
    asunto: '',
    notas: '',
    inicio: aInstante(lunes, 600).toISOString(), // 10:00
    fin: aInstante(lunes, 660).toISOString(), // 11:00
  };

  it('detecta superposición en la misma sala', () => {
    const r = buscarChoque('sala2', aInstante(lunes, 630), aInstante(lunes, 690), [existente]);
    expect(r?.id).toBe('a');
    expect(mensajeChoque(r!, 'Sala 2')).toBe('Sala 2 está ocupada de 10:00 a 11:00 por la reunión con ACME.');
  });

  it('permite otra sala en el mismo horario', () => {
    expect(buscarChoque('sala3', aInstante(lunes, 630), aInstante(lunes, 690), [existente])).toBeNull();
  });

  it('permite reuniones pegadas (una termina cuando empieza la otra)', () => {
    expect(buscarChoque('sala2', aInstante(lunes, 660), aInstante(lunes, 720), [existente])).toBeNull();
    expect(buscarChoque('sala2', aInstante(lunes, 540), aInstante(lunes, 600), [existente])).toBeNull();
  });

  it('ignora la propia reunión al editarla', () => {
    expect(buscarChoque('sala2', aInstante(lunes, 615), aInstante(lunes, 675), [existente], 'a')).toBeNull();
  });
});

describe('traducirError', () => {
  it('traduce errores conocidos', () => {
    expect(traducirError({ code: '23P01' })).toMatch(/ocupada/);
    expect(traducirError({ code: '42501' })).toMatch(/secretaria/);
    expect(traducirError({ code: 'P0001', message: 'Ese día es feriado.' })).toBe('Ese día es feriado.');
  });
});
