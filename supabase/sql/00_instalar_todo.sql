-- =====================================================================
-- INSTALACIÓN COMPLETA: une 01, 02, 03 y 04 en un solo archivo.
-- Pegar todo en Supabase > SQL Editor > New query y presionar Run.
-- Se puede ejecutar más de una vez sin problema.
-- =====================================================================


-- =====================================================================
-- 01 · Tablas y reglas del calendario
-- Pegar completo en Supabase > SQL Editor y ejecutar (Run).
-- =====================================================================

create extension if not exists btree_gist;

create table if not exists public.salas (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden  int  not null default 0,
  color  text not null default '#64748b'
);

create table if not exists public.feriados (
  fecha       date primary key,
  descripcion text not null
);

create table if not exists public.reuniones (
  id                   uuid primary key default gen_random_uuid(),
  sala_id              uuid not null references public.salas(id) on delete restrict,
  cliente              text not null check (length(trim(cliente)) > 0),
  asunto               text not null default '',
  notas                text not null default '',
  inicio               timestamptz not null,
  fin                  timestamptz not null,
  recordatorio_enviado boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint reuniones_fin_despues_de_inicio check (fin > inicio),
  -- Nunca dos reuniones superpuestas en la misma sala.
  -- '[)' permite que una reunión empiece justo cuando termina la anterior.
  constraint reuniones_sin_superposicion
    exclude using gist (sala_id with =, tstzrange(inicio, fin, '[)') with &&)
);

create index if not exists reuniones_inicio_idx on public.reuniones (inicio);

-- Valida horario hábil en hora de Argentina: lunes a viernes, 8:00 a 18:00, sin feriados.
create or replace function public.validar_reunion()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ini_local   timestamp;
  fin_local   timestamp;
  desc_feriado text;
begin
  -- Si solo cambió el aviso enviado (u otro dato sin horario), no se revalida el horario.
  if tg_op = 'UPDATE'
     and new.inicio = old.inicio and new.fin = old.fin and new.sala_id = old.sala_id then
    if (new.cliente, new.asunto, new.notas)
       is distinct from (old.cliente, old.asunto, old.notas) then
      new.updated_at := now();
    end if;
    return new;
  end if;

  ini_local := new.inicio at time zone 'America/Argentina/Buenos_Aires';
  fin_local := new.fin    at time zone 'America/Argentina/Buenos_Aires';

  if ini_local::date <> fin_local::date then
    raise exception 'La reunión debe empezar y terminar el mismo día.';
  end if;
  if extract(isodow from ini_local) > 5 then
    raise exception 'No se pueden agendar reuniones los fines de semana.';
  end if;
  if ini_local::time < time '08:00' then
    raise exception 'Las reuniones empiezan a partir de las 8:00.';
  end if;
  if fin_local::time > time '18:00' then
    raise exception 'La reunión debe terminar a las 18:00 como máximo.';
  end if;
  if extract(minute from ini_local)::int % 15 <> 0 or extract(minute from fin_local)::int % 15 <> 0
     or extract(second from ini_local) <> 0 or extract(second from fin_local) <> 0 then
    raise exception 'Los horarios van en intervalos de 15 minutos.';
  end if;

  select descripcion into desc_feriado from public.feriados where fecha = ini_local::date;
  if found then
    raise exception 'Ese día es feriado (%).', desc_feriado;
  end if;

  -- Recordatorio de 24 h: si la reunión es dentro de menos de 24 h ya no se manda
  -- (los departamentos reciben el aviso de alta o cambio en ese momento).
  if tg_op = 'INSERT' or new.inicio <> old.inicio then
    new.recordatorio_enviado := new.inicio <= now() + interval '24 hours';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reuniones_validar on public.reuniones;
create trigger reuniones_validar
  before insert or update on public.reuniones
  for each row execute function public.validar_reunion();

-- Cambios en vivo para que todos vean el calendario actualizado sin recargar.
do $$
begin
  begin
    alter publication supabase_realtime add table public.reuniones;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.feriados;
  exception when duplicate_object then null;
  end;
end $$;


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


-- =====================================================================
-- 03 · Salas y feriados nacionales de Argentina
-- Los feriados trasladables están calculados según la Ley 27.399.
-- Verificar contra https://www.argentina.gob.ar/interior/feriados por si
-- el Gobierno los mueve por decreto. Se pueden editar desde "Administrar".
-- =====================================================================

insert into public.salas (nombre, orden, color) values
  ('Sala Principal',     1, '#1d4ed8'),
  ('Sala 2',             2, '#059669'),
  ('Sala 3',             3, '#d97706'),
  ('Oficina de Claudio', 4, '#7c3aed')
on conflict (nombre) do nothing;

insert into public.feriados (fecha, descripcion) values
  -- 2026
  ('2026-01-01', 'Año Nuevo'),
  ('2026-02-16', 'Carnaval'),
  ('2026-02-17', 'Carnaval'),
  ('2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'),
  ('2026-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'),
  ('2026-04-03', 'Viernes Santo'),
  ('2026-05-01', 'Día del Trabajador'),
  ('2026-05-25', 'Día de la Revolución de Mayo'),
  ('2026-06-15', 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes (trasladado del 17/6)'),
  ('2026-06-20', 'Paso a la Inmortalidad del Gral. Manuel Belgrano'),
  ('2026-07-09', 'Día de la Independencia'),
  ('2026-08-17', 'Paso a la Inmortalidad del Gral. José de San Martín'),
  ('2026-10-12', 'Día del Respeto a la Diversidad Cultural'),
  ('2026-11-23', 'Día de la Soberanía Nacional (trasladado del 20/11)'),
  ('2026-12-08', 'Inmaculada Concepción de María'),
  ('2026-12-25', 'Navidad'),
  -- 2027
  ('2027-01-01', 'Año Nuevo'),
  ('2027-02-08', 'Carnaval'),
  ('2027-02-09', 'Carnaval'),
  ('2027-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'),
  ('2027-03-26', 'Viernes Santo'),
  ('2027-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'),
  ('2027-05-01', 'Día del Trabajador'),
  ('2027-05-25', 'Día de la Revolución de Mayo'),
  ('2027-06-20', 'Paso a la Inmortalidad del Gral. Manuel Belgrano'),
  ('2027-06-21', 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes (trasladado del 17/6)'),
  ('2027-07-09', 'Día de la Independencia'),
  ('2027-08-16', 'Paso a la Inmortalidad del Gral. José de San Martín (trasladado del 17/8)'),
  ('2027-10-11', 'Día del Respeto a la Diversidad Cultural (trasladado del 12/10)'),
  ('2027-11-20', 'Día de la Soberanía Nacional'),
  ('2027-12-08', 'Inmaculada Concepción de María'),
  ('2027-12-25', 'Navidad')
on conflict (fecha) do nothing;


-- =====================================================================
-- 04 · Roles de las dos cuentas de acceso
-- ANTES: crear los dos usuarios en Supabase > Authentication > Users >
--        "Add user" > "Create new user", marcando "Auto Confirm User":
--          lectura@example.com     con la clave compartida para todos
--          secretaria@estudiomendezyasoc.com.ar  con la clave de la secretaria
-- Si usaste otros emails, cámbialos abajo y en las variables VITE_EMAIL_*.
-- =====================================================================

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rol": "editor"}'::jsonb
where email = 'secretaria@estudiomendezyasoc.com.ar';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rol": "lector"}'::jsonb
where email = 'lectura@example.com';

-- Comprobación: debe mostrar las dos cuentas con su rol.
select email, raw_app_meta_data ->> 'rol' as rol
from auth.users
where email in ('secretaria@estudiomendezyasoc.com.ar', 'lectura@example.com');
