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
