import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useCatalogos } from '../lib/datos';
import { formatoFechaLarga, hoy } from '../lib/fechas';
import { supabase } from '../lib/supabase';
import { traducirError } from '../lib/validaciones';

const claseCampo =
  'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200';

export default function Admin() {
  const { listaFeriados, recargar } = useCatalogos();
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [nuevoFeriado, setNuevoFeriado] = useState({ fecha: '', descripcion: '' });
  const anioActual = Number(hoy().slice(0, 4));
  const [anio, setAnio] = useState(anioActual);

  function mensaje(texto: string, error?: boolean) {
    setAviso({ texto, error });
    void recargar();
  }

  async function agregarFeriado(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from('feriados')
      .insert({ fecha: nuevoFeriado.fecha, descripcion: nuevoFeriado.descripcion.trim() });
    if (!error) setNuevoFeriado({ fecha: '', descripcion: '' });
    mensaje(error ? traducirError(error) : 'Feriado agregado.', !!error);
  }

  async function borrarFeriado(fecha: string) {
    const { error } = await supabase.from('feriados').delete().eq('fecha', fecha);
    mensaje(error ? traducirError(error) : 'Feriado borrado.', !!error);
  }

  const anios = Array.from(
    new Set([anioActual, anioActual + 1, ...listaFeriados.map((f) => Number(f.fecha.slice(0, 4)))]),
  ).sort();
  const feriadosDelAnio = listaFeriados.filter((f) => f.fecha.startsWith(String(anio)));

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10">
      <header className="flex items-center gap-3 py-4">
        <Link to="/" className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
          ‹ Volver al calendario
        </Link>
        <h1 className="text-lg font-semibold">Administrar</h1>
      </header>

      {aviso && (
        <p
          className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${aviso.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}
        >
          {aviso.texto}
        </p>
      )}

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-1 flex items-center gap-3">
          <h2 className="text-base font-semibold">Feriados</h2>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          >
            {anios.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Esos días quedan bloqueados para reuniones. Verifica la lista con el calendario oficial en argentina.gob.ar y
          agrega los días no laborables que la oficina respete.
        </p>
        <ul className="mb-3 divide-y divide-slate-100">
          {feriadosDelAnio.length === 0 && (
            <li className="py-2 text-sm text-slate-500">No hay feriados cargados para {anio}.</li>
          )}
          {feriadosDelAnio.map((f) => (
            <li key={f.fecha} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-56 shrink-0 text-slate-600 max-sm:w-auto">{formatoFechaLarga(f.fecha)}</span>
              <span className="min-w-0 flex-1 truncate">{f.descripcion}</span>
              <button onClick={() => borrarFeriado(f.fecha)} className="rounded-md px-2 py-1 text-red-700 hover:bg-red-50">
                Borrar
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={agregarFeriado} className="grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[auto_1fr_auto]">
          <input
            type="date"
            required
            className={claseCampo}
            value={nuevoFeriado.fecha}
            onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, fecha: e.target.value })}
          />
          <input
            required
            placeholder="Descripción"
            className={claseCampo}
            value={nuevoFeriado.descripcion}
            onChange={(e) => setNuevoFeriado({ ...nuevoFeriado, descripcion: e.target.value })}
          />
          <button className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800">
            Agregar
          </button>
        </form>
      </section>
    </div>
  );
}
