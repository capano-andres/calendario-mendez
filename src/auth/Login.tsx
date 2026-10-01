import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { Rol } from '../lib/tipos';
import { useAuth } from './AuthContext';

export default function Login() {
  const { session, ingresar } = useAuth();
  const [tipo, setTipo] = useState<Rol>('lector');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(await ingresar(tipo, clave));
    setEnviando(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
      >
        <img src="/favicon.svg" alt="" className="mx-auto mb-3 h-12 w-12" />
        <h1 className="text-center text-xl font-semibold">Calendario de Reuniones</h1>
        <p className="mb-5 text-center text-sm text-slate-500">Reserva de salas</p>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {(
            [
              ['lector', 'Ver calendario'],
              ['editor', 'Agendar reuniones'],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              onClick={() => {
                setTipo(valor);
                setError(null);
              }}
              className={`rounded-md py-2 font-medium transition ${
                tipo === valor ? 'bg-white text-blue-800 shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="clave">
          {tipo === 'editor' ? 'Clave para agendar' : 'Clave de acceso'}
        </label>
        <input
          id="clave"
          type="password"
          autoFocus
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
        />
        {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-blue-700 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
