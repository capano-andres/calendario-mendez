-- =====================================================================
-- 06 · Quita los departamentos de las reuniones.
-- Los avisos por email, cuando se activen, van siempre a una lista fija
-- con los emails de todos los departamentos (secreto EMAIL_AVISOS).
-- Ejecutar una vez en Supabase > SQL Editor. Se puede repetir sin problema.
-- =====================================================================

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

alter table public.reuniones drop column if exists departamento_id;
drop table if exists public.departamentos;
