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
