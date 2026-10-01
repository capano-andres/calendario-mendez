import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as PE } from 'react';
import {
  HORA_APERTURA,
  HORA_CIERRE,
  PASO_MIN,
  duracionEntre,
  fechaDe,
  formatoHora,
  minutosDe,
} from '../lib/fechas';
import type { Reunion, Sala } from '../lib/tipos';

const ALTO_SLOT = 16; // px por cada 15 minutos
const ALTO_HORA = ALTO_SLOT * (60 / PASO_MIN);
const ALTO_TOTAL = ((HORA_CIERRE - HORA_APERTURA) / PASO_MIN) * ALTO_SLOT;

export interface Columna {
  clave: string;
  titulo: string;
  subtitulo?: string;
  fecha: string;
  /** null = muestra todas las salas, cada una en su carril */
  salaId: string | null;
  /** Si tiene texto, la columna está bloqueada (feriado, fin de semana). */
  bloqueo?: string;
  /** Muestra la línea roja de la hora actual. */
  esHoy?: boolean;
  /** Destaca el encabezado (el día de hoy en la vista semanal). */
  resaltar?: boolean;
  color?: string;
}

/** "Sala Principal" -> "Principal", "Oficina de Claudio" -> "Claudio" */
function nombreCorto(nombre: string): string {
  return nombre.replace(/^Sala\s+/i, 'S').replace(/^Oficina de\s+/i, '').replace(/^S([A-Za-zÁÉÍÓÚ])/, '$1');
}

interface Props {
  columnas: Columna[];
  reuniones: Reunion[];
  salas: Sala[];
  esEditora: boolean;
  /** En celular solo se muestra esta columna. */
  columnaMovil?: string;
  onNuevo: (fecha: string, salaId: string, inicioMin: number) => void;
  onAbrir: (r: Reunion) => void;
  onMover: (r: Reunion, fecha: string, salaId: string, inicioMin: number, duracionMin: number) => void;
}

interface Arrastre {
  reunion: Reunion;
  modo: 'mover' | 'estirar';
  x0: number;
  y0: number;
  inicio0: number;
  dur0: number;
  inicio: number;
  dur: number;
  colClave: string;
  colClave0: string;
  movido: boolean;
}

function minutoEnY(y: number): number {
  const slot = Math.floor(y / ALTO_SLOT);
  return Math.min(Math.max(HORA_APERTURA + slot * PASO_MIN, HORA_APERTURA), HORA_CIERRE - PASO_MIN);
}

function useMinutoActual(): number {
  const [ahora, setAhora] = useState(() => minutosDe(new Date()));
  useEffect(() => {
    const t = setInterval(() => setAhora(minutosDe(new Date())), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

export default function GrillaHoraria({
  columnas,
  reuniones,
  salas,
  esEditora,
  columnaMovil,
  onNuevo,
  onAbrir,
  onMover,
}: Props) {
  const refsColumnas = useRef(new Map<string, HTMLDivElement>());
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [hover, setHover] = useState<{ col: string; min: number; carril: number } | null>(null);
  // Momento en que terminó el último arrastre: evita que el clic posterior abra un formulario.
  const finArrastre = useRef(0);
  const ahora = useMinutoActual();

  // Guardamos los callbacks y columnas en refs para que los listeners de window vean lo último.
  const estado = useRef({ arrastre, columnas, onMover });
  estado.current = { arrastre, columnas, onMover };

  const activo = arrastre !== null;
  useEffect(() => {
    if (!activo) return;

    function mover(e: PointerEvent) {
      const a = estado.current.arrastre;
      if (!a) return;
      const dx = e.clientX - a.x0;
      const dy = e.clientY - a.y0;
      const delta = Math.round(dy / ALTO_SLOT) * PASO_MIN;
      const movido = a.movido || Math.abs(dx) > 4 || Math.abs(dy) > 4;
      if (a.modo === 'estirar') {
        const dur = Math.min(Math.max(a.dur0 + delta, PASO_MIN), HORA_CIERRE - a.inicio0);
        setArrastre({ ...a, dur, movido });
        return;
      }
      const inicio = Math.min(Math.max(a.inicio0 + delta, HORA_APERTURA), HORA_CIERRE - a.dur0);
      let colClave = a.colClave;
      for (const col of estado.current.columnas) {
        const el = refsColumnas.current.get(col.clave);
        if (!el || col.bloqueo) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && e.clientX >= r.left && e.clientX < r.right) colClave = col.clave;
      }
      setArrastre({ ...a, inicio, colClave, movido });
    }

    function soltar() {
      const { arrastre: a, columnas: cols, onMover: alMover } = estado.current;
      setArrastre(null);
      // Si no se movió, el clic del bloque se encarga de abrir el detalle.
      if (!a || !a.movido) return;
      finArrastre.current = Date.now();
      if (a.inicio === a.inicio0 && a.dur === a.dur0 && a.colClave === a.colClave0) return;
      const col = cols.find((c) => c.clave === a.colClave);
      if (!col) return;
      alMover(a.reunion, col.fecha, col.salaId ?? a.reunion.sala_id, a.inicio, a.dur);
    }

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [activo]);

  function iniciarArrastre(e: PE, r: Reunion, modo: Arrastre['modo'], colClave: string) {
    e.stopPropagation();
    if (!esEditora || e.button !== 0) return;
    e.preventDefault();
    const inicio = minutosDe(r.inicio);
    const dur = duracionEntre(r.inicio, r.fin);
    setHover(null);
    setArrastre({
      reunion: r,
      modo,
      x0: e.clientX,
      y0: e.clientY,
      inicio0: inicio,
      dur0: dur,
      inicio,
      dur,
      colClave,
      colClave0: colClave,
      movido: false,
    });
  }

  function posicion(col: Columna, e: PE) {
    const el = refsColumnas.current.get(col.clave)!;
    const rect = el.getBoundingClientRect();
    const min = minutoEnY(e.clientY - rect.top);
    const carril =
      col.salaId === null
        ? Math.min(Math.floor(((e.clientX - rect.left) / rect.width) * salas.length), salas.length - 1)
        : 0;
    return { min, carril };
  }

  function clicColumna(col: Columna, e: PE) {
    if (!esEditora || col.bloqueo || arrastre || Date.now() - finArrastre.current < 400) return;
    const { min, carril } = posicion(col, e);
    const salaId = col.salaId ?? salas[carril]?.id;
    if (salaId) onNuevo(col.fecha, salaId, min);
  }

  function reunionesDe(col: Columna): { r: Reunion; inicio: number; dur: number }[] {
    const lista: { r: Reunion; inicio: number; dur: number }[] = [];
    for (const r of reuniones) {
      if (arrastre?.reunion.id === r.id) continue;
      if (fechaDe(r.inicio) !== col.fecha) continue;
      if (col.salaId !== null && r.sala_id !== col.salaId) continue;
      lista.push({ r, inicio: minutosDe(r.inicio), dur: duracionEntre(r.inicio, r.fin) });
    }
    if (arrastre && arrastre.colClave === col.clave) {
      lista.push({ r: arrastre.reunion, inicio: arrastre.inicio, dur: arrastre.dur });
    }
    return lista;
  }

  const horas: number[] = [];
  for (let m = HORA_APERTURA; m < HORA_CIERRE; m += 60) horas.push(m);

  const visibilidad = (clave: string) =>
    columnaMovil && clave !== columnaMovil ? 'hidden md:flex' : 'flex';

  return (
    <div
      // pb-3: deja lugar para la etiqueta "18:00" dentro de la tarjeta.
      className="flex select-none rounded-xl bg-white pb-3 shadow-sm ring-1 ring-slate-200"
      style={{ '--alto-hora': `${ALTO_HORA}px`, '--alto-slot': `${ALTO_SLOT}px` } as CSSProperties}
    >
      {/* Columna de horas */}
      <div className="w-12 shrink-0 sm:w-14">
        <div className="h-14 border-b border-slate-200" />
        <div className="relative" style={{ height: ALTO_TOTAL }}>
          {horas.map((m) => (
            <div
              key={m}
              className="absolute right-2 -translate-y-1/2 text-xs text-slate-500"
              style={{ top: ((m - HORA_APERTURA) / PASO_MIN) * ALTO_SLOT }}
            >
              {m === HORA_APERTURA ? '' : formatoHora(m)}
            </div>
          ))}
          <div className="absolute bottom-0 right-2 translate-y-1/2 text-xs text-slate-500">18:00</div>
        </div>
      </div>

      {columnas.map((col) => {
        const items = reunionesDe(col);
        const mostrarAhora = col.esHoy && ahora >= HORA_APERTURA && ahora <= HORA_CIERRE;
        return (
          <div key={col.clave} className={`${visibilidad(col.clave)} min-w-0 flex-1 flex-col border-l border-slate-200`}>
            <div className="flex h-14 flex-col items-center justify-center border-b border-slate-200 px-1 text-center">
              <div className="flex max-w-full items-center gap-1.5">
                {col.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.color }} />}
                <span className={`truncate text-sm font-semibold ${col.resaltar ? 'text-blue-700' : ''}`}>{col.titulo}</span>
                {col.subtitulo && <span className="shrink-0 text-xs text-blue-700">· {col.subtitulo}</span>}
              </div>
              {col.salaId === null && salas.length > 1 && (
                <div className="mt-1 flex w-full">
                  {salas.map((s) => (
                    <span
                      key={s.id}
                      title={s.nombre}
                      className="min-w-0 flex-1 truncate text-[10px] font-semibold leading-tight"
                      style={{ color: s.color }}
                    >
                      {nombreCorto(s.nombre)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div
              ref={(el) => {
                if (el) refsColumnas.current.set(col.clave, el);
                else refsColumnas.current.delete(col.clave);
              }}
              className={`grilla-fondo relative ${esEditora && !col.bloqueo ? 'cursor-pointer' : ''}`}
              style={{ height: ALTO_TOTAL }}
              onClick={(e) => clicColumna(col, e as unknown as PE)}
              onPointerMove={(e) => {
                if (!esEditora || col.bloqueo || arrastre || e.pointerType !== 'mouse') return;
                // Sobre una reunión existente no se sugiere un horario nuevo.
                if (e.target !== e.currentTarget) {
                  if (hover) setHover(null);
                  return;
                }
                const p = posicion(col, e);
                if (hover?.col !== col.clave || hover.min !== p.min || hover.carril !== p.carril) {
                  setHover({ col: col.clave, ...p });
                }
              }}
              onPointerLeave={() => setHover(null)}
            >
              {col.salaId === null &&
                salas.slice(1).map((s, i) => (
                  <div
                    key={s.id}
                    className="pointer-events-none absolute inset-y-0 border-l border-dashed border-slate-200"
                    style={{ left: `${((i + 1) / salas.length) * 100}%` }}
                  />
                ))}

              {col.bloqueo && (
                <div className="absolute inset-0 z-10 flex items-start justify-center bg-slate-100/80 bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,#e2e8f0_8px,#e2e8f0_10px)] pt-6">
                  <span className="rounded-md bg-white px-2 py-1 text-center text-xs font-medium text-slate-600 shadow-sm">
                    {col.bloqueo}
                  </span>
                </div>
              )}

              {hover?.col === col.clave && (
                <div
                  className="pointer-events-none absolute rounded-md border-2 border-dashed border-blue-300 bg-blue-50/70 px-1.5 text-xs text-blue-700"
                  style={{
                    top: ((hover.min - HORA_APERTURA) / PASO_MIN) * ALTO_SLOT,
                    height: ALTO_SLOT * 2,
                    ...(col.salaId === null
                      ? { left: `${(hover.carril / salas.length) * 100}%`, width: `${100 / salas.length}%` }
                      : { left: 2, right: 2 }),
                  }}
                >
                  + {formatoHora(hover.min)}
                </div>
              )}

              {items.map(({ r, inicio, dur }) => {
                const sala = salas.find((s) => s.id === r.sala_id);
                const color = sala?.color ?? '#64748b';
                const carril = col.salaId === null ? salas.findIndex((s) => s.id === r.sala_id) : -1;
                const arrastrando = arrastre?.reunion.id === r.id;
                const alto = (dur / PASO_MIN) * ALTO_SLOT;
                return (
                  <div
                    key={r.id}
                    title={`${r.cliente}${r.asunto ? ` · ${r.asunto}` : ''}\n${formatoHora(inicio)}–${formatoHora(inicio + dur)} · ${sala?.nombre ?? ''}`}
                    onPointerDown={(e) => iniciarArrastre(e, r, 'mover', col.clave)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (Date.now() - finArrastre.current >= 400) onAbrir(r);
                    }}
                    className={`group absolute z-20 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-xs leading-tight shadow-sm ${
                      esEditora ? 'cursor-grab touch-none' : 'cursor-pointer'
                    } ${arrastrando ? 'z-30 cursor-grabbing opacity-90 shadow-lg ring-2 ring-blue-400' : 'hover:shadow-md'}`}
                    style={{
                      top: ((inicio - HORA_APERTURA) / PASO_MIN) * ALTO_SLOT + 1,
                      height: alto - 2,
                      borderColor: color,
                      background: `color-mix(in srgb, ${color} 16%, white)`,
                      ...(carril >= 0
                        ? {
                            left: `calc(${(carril / salas.length) * 100}% + 1px)`,
                            width: `calc(${100 / salas.length}% - 2px)`,
                          }
                        : { left: 3, right: 3 }),
                    }}
                  >
                    <div className="truncate font-semibold text-slate-900">{r.cliente}</div>
                    {alto >= 30 && (
                      <div className="truncate text-slate-600">
                        {formatoHora(inicio)}–{formatoHora(inicio + dur)}
                        {carril >= 0 && sala ? ` · ${sala.nombre}` : ''}
                      </div>
                    )}
                    {alto >= 46 && r.asunto && <div className="truncate text-slate-700">{r.asunto}</div>}
                    {esEditora && (
                      <div
                        onPointerDown={(e) => iniciarArrastre(e, r, 'estirar', col.clave)}
                        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
                      >
                        <div className="mx-auto mt-0.5 h-1 w-6 rounded-full bg-slate-400" />
                      </div>
                    )}
                  </div>
                );
              })}

              {mostrarAhora && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-red-500"
                  style={{ top: ((ahora - HORA_APERTURA) / PASO_MIN) * ALTO_SLOT }}
                >
                  <div className="-ml-1 -mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
