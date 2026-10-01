import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Admin from './admin/Admin';
import { ProveedorAuth, useAuth } from './auth/AuthContext';
import Login from './auth/Login';
import Calendario from './calendario/Calendario';
import { supabaseConfigurado } from './lib/supabase';

function Protegida({ children, soloEditora }: { children: ReactNode; soloEditora?: boolean }) {
  const { session, esEditora, cargando } = useAuth();
  if (cargando) return <div className="p-10 text-center text-slate-500">Cargando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (soloEditora && !esEditora) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function FaltaConfiguracion() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-2 text-xl font-semibold">Falta configurar Supabase</h1>
      <p className="text-slate-600">
        Crea un archivo <code>.env</code> a partir de <code>.env.example</code> con la URL y la clave pública de tu
        proyecto Supabase, y vuelve a iniciar la app. En Vercel, cárgalas como variables de entorno. Los pasos están en
        el README.
      </p>
    </div>
  );
}

export default function App() {
  if (!supabaseConfigurado) return <FaltaConfiguracion />;
  return (
    <ProveedorAuth>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Protegida>
                <Calendario />
              </Protegida>
            }
          />
          <Route
            path="/admin"
            element={
              <Protegida soloEditora>
                <Admin />
              </Protegida>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProveedorAuth>
  );
}
