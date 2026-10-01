import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { cancelarReunion, guardarReunion } from '../lib/acciones';
import {
  DURACIONES,
  DURACION_POR_DEFECTO,
  HORA_CIERRE,
  duracionEntre,
  fechaDe,
  formatoDuracion,
  formatoFechaLarga,
  formatoHora,
  horariosDeInicio,
  minutosDe,
} from '../lib/fechas';
import type { DatosReunion, Reunion, Sala } from '../lib/tipos';

export type ModoFormulario =
  | { tipo: 'nueva'; fecha: string; salaId: string; inicioMin: number }
  | { tipo: 'existente'; reunion: Reunion };

interface Props {
  modo: ModoFormulario;
  salas: Sala[];
  feriados: Map<string, string>;
  esEditora: boolean;
  onCerrar: () => void;
  /** fecha: día en que quedó la reunión, para mostrarlo en el calendario. */
  onListo: (mensaje: string, fecha?: string) => void;
}

function datosIniciales(modo: ModoFormulario, salas: Sala[]): DatosReunion {
  if (modo.tipo === 'existente') {
    const r = modo.reunion;
    return {
      sala_id: r.sala_id,
      cliente: r.cliente,
      asunto: r.asunto,
      notas: r.notas,
      fecha: fechaDe(r.inicio),
      inicioMin: minutosDe(r.inicio),
      duracionMin: duracionEntre(r.inicio, r.fin),
    };
  }
  return {
    sala_id: modo.salaId || salas[0]?.id || '',
    cliente: '',
    asunto: '',
    notas: '',
    fecha: modo.fecha,
    inicioMin: modo.inicioMin,
    duracionMin: Math.min(DURACION_POR_DEFECTO, HORA_CIERRE - modo.inicioMin),
  };
}

const claseCampo =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200';

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{etiqueta}</span>
      {children}
    </label>
  );
}

export default function FormReunion({
  modo,
  salas,
  feriados,
  esEditora,
  onCerrar,
  onListo,
}: Props) {
  const [datos, setDatos] = useState<DatosReunion>(() => datosIniciales(modo, salas));
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const id = modo.tipo === 'existente' ? modo.reunion.id : undefined;

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  const cambiar = <K extends keyof DatosReunion>(campo: K, valor: DatosReunion[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setError(null);
  };

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const err = await guardarReunion(datos, id, feriados, salas);
    setOcupado(false);
    if (err) setError(err);
    else onListo(id ? 'Reunión actualizada.' : 'Reunión agendada.', datos.fecha);
  }

  async function cancelar() {
    if (!id || !confirm(`¿Cancelar la reunión con ${datos.cliente}?`)) return;
    setOcupado(true);
    const err = await cancelarReunion(id);
    setOcupado(false);
    if (err) setError(err);
    else onListo('Reunión cancelada.');
  }

  const sala = salas.find((s) => s.id === datos.sala_id);
  const duraciones = DURACIONES.includes(datos.duracionMin)
    ? DURACIONES
    : [...DURACIONES, datos.duracionMin].sort((a, b) => a - b);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold">
            {!esEditora ? 'Detalle de la reunión' : id ? 'Editar reunión' : 'Nueva reunión'}
          </h2>
          <button onClick={onCerrar} className="rounded-md px-2 text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Cerrar">
            ×
          </button>
        </div>

        {!esEditora ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 py-4 text-sm">
            <dt className="text-slate-500">Cliente</dt>
            <dd className="font-semibold">{datos.cliente}</dd>
            <dt className="text-slate-500">Fecha</dt>
            <dd>{formatoFechaLarga(datos.fecha)}</dd>
            <dt className="text-slate-500">Horario</dt>
            <dd>
              {formatoHora(datos.inicioMin)} a {formatoHora(datos.inicioMin + datos.duracionMin)} (aprox.)
            </dd>
            <dt className="text-slate-500">Sala</dt>
            <dd>{sala?.nombre}</dd>
            {datos.asunto && (
              <>
                <dt className="text-slate-500">Asunto</dt>
                <dd>{datos.asunto}</dd>
              </>
            )}
            {datos.notas && (
              <>
                <dt className="text-slate-500">Notas</dt>
                <dd className="whitespace-pre-wrap">{datos.notas}</dd>
              </>
            )}
          </dl>
        ) : (
          <form onSubmit={guardar} className="space-y-3 px-5 py-4">
            <Campo etiqueta="Cliente *">
              <input
                className={claseCampo}
                value={datos.cliente}
                onChange={(e) => cambiar('cliente', e.target.value)}
                autoFocus={!id}
                required
                maxLength={120}
              />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Fecha">
                <input
                  type="date"
                  className={claseCampo}
                  value={datos.fecha}
                  onChange={(e) => cambiar('fecha', e.target.value)}
                  required
                />
              </Campo>
              <Campo etiqueta="Sala">
                <select className={claseCampo} value={datos.sala_id} onChange={(e) => cambiar('sala_id', e.target.value)}>
                  {salas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Hora de inicio">
                <select
                  className={claseCampo}
                  value={datos.inicioMin}
                  onChange={(e) => cambiar('inicioMin', Number(e.target.value))}
                >
                  {horariosDeInicio().map((m) => (
                    <option key={m} value={m}>
                      {formatoHora(m)}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Duración estimada">
                <select
                  className={claseCampo}
                  value={datos.duracionMin}
                  onChange={(e) => cambiar('duracionMin', Number(e.target.value))}
                >
                  {duraciones.map((m) => (
                    <option key={m} value={m}>
                      {formatoDuracion(m)}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <p className="text-xs text-slate-500">
              Termina aproximadamente a las {formatoHora(datos.inicioMin + datos.duracionMin)}.
            </p>

            <Campo etiqueta="Asunto">
              <input
                className={claseCampo}
                value={datos.asunto}
                onChange={(e) => cambiar('asunto', e.target.value)}
                maxLength={200}
              />
            </Campo>
            <Campo etiqueta="Notas">
              <textarea
                className={`${claseCampo} min-h-20`}
                value={datos.notas}
                onChange={(e) => cambiar('notas', e.target.value)}
                maxLength={2000}
              />
            </Campo>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {id && (
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={ocupado}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Cancelar reunión
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={onCerrar} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={ocupado}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {ocupado ? 'Guardando…' : id ? 'Guardar cambios' : 'Agendar'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
