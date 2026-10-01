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
