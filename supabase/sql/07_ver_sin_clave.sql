-- =====================================================================
-- 07 · Permite VER el calendario sin clave ("Ver calendario" entra directo).
-- Agendar, editar y cancelar sigue requiriendo la clave para agendar.
-- Ejecutar en Supabase > SQL Editor. Se puede repetir sin problema.
-- =====================================================================

drop policy if exists "ver salas sin clave" on public.salas;
create policy "ver salas sin clave" on public.salas
  for select to anon using (true);

drop policy if exists "ver feriados sin clave" on public.feriados;
create policy "ver feriados sin clave" on public.feriados
  for select to anon using (true);

drop policy if exists "ver reuniones sin clave" on public.reuniones;
create policy "ver reuniones sin clave" on public.reuniones
  for select to anon using (true);

-- ---------------------------------------------------------------------
-- PARA VOLVER A PEDIR CLAVE: ejecutar solo estas tres líneas (sin los --)
-- y cargar en Vercel la variable VITE_VER_SIN_CLAVE=false.
-- drop policy if exists "ver salas sin clave" on public.salas;
-- drop policy if exists "ver feriados sin clave" on public.feriados;
-- drop policy if exists "ver reuniones sin clave" on public.reuniones;
-- ---------------------------------------------------------------------
