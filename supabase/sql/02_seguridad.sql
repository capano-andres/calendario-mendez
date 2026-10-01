-- =====================================================================
-- 02 · Seguridad: todos los usuarios con sesión pueden VER,
--      solo la cuenta con rol "editor" (secretaria) puede CAMBIAR.
-- =====================================================================

create or replace function public.es_editora()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'rol') = 'editor', false)
$$;

alter table public.salas         enable row level security;
alter table public.feriados      enable row level security;
alter table public.reuniones     enable row level security;

-- Lectura para cualquier usuario con sesión iniciada.
drop policy if exists "ver salas" on public.salas;
create policy "ver salas" on public.salas
  for select to authenticated using (true);

drop policy if exists "ver feriados" on public.feriados;
create policy "ver feriados" on public.feriados
  for select to authenticated using (true);

drop policy if exists "ver reuniones" on public.reuniones;
create policy "ver reuniones" on public.reuniones
  for select to authenticated using (true);

-- Escritura solo para la secretaria.
drop policy if exists "secretaria edita feriados" on public.feriados;
create policy "secretaria edita feriados" on public.feriados
  for all to authenticated using (public.es_editora()) with check (public.es_editora());

drop policy if exists "secretaria edita reuniones" on public.reuniones;
create policy "secretaria edita reuniones" on public.reuniones
  for all to authenticated using (public.es_editora()) with check (public.es_editora());
