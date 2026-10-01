import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { guardarReunion } from '../lib/acciones';
import { useCatalogos, useReuniones } from '../lib/datos';
import {
  aInstante,
  diasHabilesDeSemana,
  esFinDeSemana,
  formatoFechaCorta,
  formatoFechaLarga,
  hoy,
  moverDiaHabil,
  proximoDiaHabil,
  sumarDias,
} from '../lib/fechas';
import type { Reunion } from '../lib/tipos';
import FormReunion, { type ModoFormulario } from '../reuniones/FormReunion';
import GrillaHoraria, { type Columna } from './GrillaHoraria';

type Vista = 'dia' | 'semana';

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento local: no pasa nada */
  }
}

export default function Calendario() {
  const { esEditora, salir } = useAuth();
  const catalogos = useCatalogos();
  const { salas, feriados } = catalogos;

  const [vista, setVista] = useState<Vista>(() => (leer('vista') === 'semana' ? 'semana' : 'dia'));
  const [fecha, setFecha] = useState(() => proximoDiaHabil(hoy()));
  const [salaSemana, setSalaSemana] = useState<string>(() => leer('salaSemana') ?? 'todas');
  const [salaMovil, setSalaMovil] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<ModoFormulario | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);

  useEffect(() => guardar('vista', vista), [vista]);
  useEffect(() => guardar('salaSemana', salaSemana), [salaSemana]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.error ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const diasSemana = diasHabilesDeSemana(fecha);
  const [desde, hasta] = useMemo(() => {
    const primero = vista === 'dia' ? fecha : diasSemana[0];
    const dias = vista === 'dia' ? 1 : 5;
    return [aInstante(primero, 0), aInstante(sumarDias(primero, dias), 0)];
  }, [vista, fecha]);
  const { reuniones, setReuniones, recargar } = useReuniones(desde, hasta);

  const fechaHoy = hoy();
  const salaFiltro = salaSemana !== 'todas' && salas.some((s) => s.id === salaSemana) ? salaSemana : null;

  function bloqueoDe(f: string): string | undefined {
    const feriado = feriados.get(f);
    if (feriado) return `Feriado: ${feriado}`;
    if (esFinDeSemana(f)) return 'Fin de semana';
    return undefined;
  }

  const columnas: Columna[] =
    vista === 'dia'
      ? salas.map((s) => ({
          clave: s.id,
          titulo: s.nombre,
          fecha,
          salaId: s.id,
          color: s.color,
          bloqueo: bloqueoDe(fecha),
          esHoy: fecha === fechaHoy,
        }))
      : diasSemana.map((f) => ({
          clave: f,
          titulo: formatoFechaCorta(f),
          subtitulo: f === fechaHoy ? 'Hoy' : undefined,
          fecha: f,
          salaId: salaFiltro,
          bloqueo: bloqueoDe(f),
          esHoy: f === fechaHoy,
          resaltar: f === fechaHoy,
        }));

  const columnaMovil = vista === 'dia' ? (salaMovil ?? salas[0]?.id) : fecha;

  function navegar(sentido: 1 | -1) {
    setFecha((f) => (vista === 'dia' ? moverDiaHabil(f, sentido) : sumarDias(lunesDe(f), sentido * 7)));
  }
  const lunesDe = (f: string) => diasHabilesDeSemana(f)[0];

  async function mover(r: Reunion, nuevaFecha: string, salaId: string, inicioMin: number, duracionMin: number) {
    const datos = {
      sala_id: salaId,
      cliente: r.cliente,
      asunto: r.asunto,
      notas: r.notas,
      fecha: nuevaFecha,
      inicioMin,
      duracionMin,
    };
    // Mostramos el cambio enseguida y lo deshacemos si la base lo rechaza.
    const nuevoInicio = aInstante(nuevaFecha, inicioMin).toISOString();
    const nuevoFin = aInstante(nuevaFecha, inicioMin + duracionMin).toISOString();
    setReuniones((lista) =>
      lista.map((x) => (x.id === r.id ? { ...x, sala_id: salaId, inicio: nuevoInicio, fin: nuevoFin } : x)),
    );
    const error = await guardarReunion(datos, r.id, feriados, salas);
    if (error) {
      setAviso({ texto: error, error: true });
      void recargar();
    } else {
      setAviso({ texto: 'Reunión movida.' });
    }
  }

  const tituloFecha =
    vista === 'dia'
      ? formatoFechaLarga(fecha)
      : `${formatoFechaCorta(diasSemana[0])} – ${formatoFechaCorta(diasSemana[4])} ${diasSemana[4].slice(0, 4)}`;


  return (
    <div className="mx-auto max-w-7xl px-4 pb-10">
      {/* Barra superior */}
      <header className="flex flex-wrap items-center gap-3 py-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <h1 className="text-lg font-semibold leading-tight">Calendario de Reuniones</h1>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              esEditora ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {esEditora ? 'Secretaria' : 'Solo lectura'}
          </span>
          {esEditora && (
            <Link to="/admin" className="rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-200">
              Administrar
            </Link>
          )}
          <button onClick={salir} className="rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-200">
            Salir
          </button>
        </div>
      </header>

      {catalogos.error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar los datos: {catalogos.error}
        </p>
      )}

      {/* Navegación */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFecha(proximoDiaHabil(hoy()))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Hoy
          </button>
          <button onClick={() => navegar(-1)} aria-label="Anterior" className="rounded-lg px-2.5 py-1.5 text-lg leading-none hover:bg-slate-200">
            ‹
          </button>
          <button onClick={() => navegar(1)} aria-label="Siguiente" className="rounded-lg px-2.5 py-1.5 text-lg leading-none hover:bg-slate-200">
            ›
          </button>
        </div>
        <label className="relative">
          <span className="cursor-pointer text-base font-semibold sm:text-lg">{tituloFecha}</span>
          <input
            type="date"
            aria-label="Ir a fecha"
            value={fecha}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {vista === 'semana' && (
            <select
              value={salaFiltro ?? 'todas'}
              onChange={(e) => setSalaSemana(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
              aria-label="Sala"
            >
              <option value="todas">Todas las salas</option>
              {salas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          )}
          <div className="grid grid-cols-2 rounded-lg bg-slate-200 p-0.5 text-sm">
            {(
              [
                ['dia', 'Día'],
                ['semana', 'Semana'],
              ] as const
            ).map(([v, t]) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-md px-3 py-1 font-medium ${vista === v ? 'bg-white shadow' : 'text-slate-600'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {esEditora && (
            <button
              onClick={() =>
                setFormulario({
                  tipo: 'nueva',
                  fecha,
                  salaId: vista === 'semana' ? (salaFiltro ?? '') : (columnaMovil ?? ''),
                  inicioMin: 9 * 60,
                })
              }
              className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              + Nueva reunión
            </button>
          )}
        </div>
      </div>

      {/* Pestañas para celular */}
      <div className="mb-2 flex gap-1 overflow-x-auto md:hidden">
        {vista === 'dia'
          ? salas.map((s) => (
              <button
                key={s.id}
                onClick={() => setSalaMovil(s.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
                  columnaMovil === s.id ? 'bg-blue-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                }`}
              >
                {s.nombre}
              </button>
            ))
          : diasSemana.map((f) => (
              <button
                key={f}
                onClick={() => setFecha(f)}
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
                  fecha === f ? 'bg-blue-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                }`}
              >
                {formatoFechaCorta(f)}
              </button>
            ))}
      </div>

      {catalogos.cargando ? (
        <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">Cargando…</div>
      ) : (
        <GrillaHoraria
          columnas={columnas}
          reuniones={reuniones}
          salas={salas}
          esEditora={esEditora}
          columnaMovil={columnaMovil}
          onNuevo={(f, salaId, inicioMin) => setFormulario({ tipo: 'nueva', fecha: f, salaId, inicioMin })}
          onAbrir={(r) => setFormulario({ tipo: 'existente', reunion: r })}
          onMover={mover}
        />
      )}

      {/* Ayuda */}
      <div className="mt-3 text-right text-xs text-slate-500">
        <span>
          {esEditora
            ? 'Clic en un horario libre para agendar. Arrastra un bloque para moverlo o su borde inferior para cambiar la duración.'
            : 'Horarios aproximados. Clic en una reunión para ver el detalle.'}
        </span>
      </div>

      {formulario && (
        <FormReunion
          key={formulario.tipo === 'existente' ? formulario.reunion.id : `${formulario.fecha}-${formulario.inicioMin}`}
          modo={formulario}
          salas={salas}
          feriados={feriados}
          esEditora={esEditora}
          onCerrar={() => setFormulario(null)}
          onListo={(texto, fechaGuardada) => {
            setFormulario(null);
            setAviso({ texto });
            if (fechaGuardada) setFecha(fechaGuardada);
            void recargar();
          }}
        />
      )}

      {aviso && (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 z-50 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            aviso.error ? 'bg-red-600' : 'bg-slate-800'
          }`}
        >
          {aviso.texto}
        </div>
      )}
    </div>
  );
}
