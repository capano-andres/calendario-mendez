-- =====================================================================
-- 05 · Avisos por email
--   * Al crear, modificar o cancelar una reunión se llama a la función
--     "notificar-reunion".
--   * Cada hora se llama a "recordatorios-24h".
-- ANTES DE EJECUTAR reemplazar en este archivo (Ctrl+H):
--   TU-PROYECTO        -> el "Reference ID" de tu proyecto
--                         (Project Settings > General)
--   TU-SECRETO-LARGO   -> el mismo valor que cargaste como secreto
--                         SECRETO_FUNCIONES (ver README)
-- =====================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.notificar_cambio_reunion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ignora cambios que no les interesan a los departamentos (por ejemplo, marcar el recordatorio como enviado).
  if tg_op = 'UPDATE'
     and (new.sala_id, new.cliente, new.asunto, new.inicio, new.fin)
         is not distinct from (old.sala_id, old.cliente, old.asunto, old.inicio, old.fin) then
    return new;
  end if;

  perform net.http_post(
    url := 'https://TU-PROYECTO.supabase.co/functions/v1/notificar-reunion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer TU-SECRETO-LARGO'
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'record', case when tg_op <> 'DELETE' then to_jsonb(new) end,
      'old_record', case when tg_op <> 'INSERT' then to_jsonb(old) end
    )
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists reuniones_notificar on public.reuniones;
create trigger reuniones_notificar
  after insert or update or delete on public.reuniones
  for each row execute function public.notificar_cambio_reunion();

-- Recordatorios: cada hora a los 5 minutos (8:05, 9:05, ...).
select cron.unschedule('recordatorios-24h')
where exists (select 1 from cron.job where jobname = 'recordatorios-24h');

select cron.schedule(
  'recordatorios-24h',
  '5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://TU-PROYECTO.supabase.co/functions/v1/recordatorios-24h',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer TU-SECRETO-LARGO'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
