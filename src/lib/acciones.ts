import { supabase } from './supabase';
import type { DatosReunion, Reunion, Sala } from './tipos';
import { intervaloDe, mensajeChoque, traducirError, validarHorario } from './validaciones';

/**
 * Valida y guarda una reunión (nueva si no hay id). Devuelve un mensaje de error o null si salió bien.
 * La base de datos vuelve a validar todo, así que esto es para dar mensajes claros antes de guardar.
 */
export async function guardarReunion(
  datos: DatosReunion,
  id: string | undefined,
  feriados: Map<string, string>,
  salas: Sala[],
): Promise<string | null> {
  if (!datos.cliente.trim()) return 'Escribe el nombre del cliente.';
  if (!datos.sala_id) return 'Elige la sala.';

  const errorHorario = validarHorario(datos, feriados);
  if (errorHorario) return errorHorario;

  const { inicio, fin } = intervaloDe(datos);

  let consulta = supabase
    .from('reuniones')
    .select('id, sala_id, cliente, asunto, notas, inicio, fin')
    .eq('sala_id', datos.sala_id)
    .lt('inicio', fin.toISOString())
    .gt('fin', inicio.toISOString())
    .limit(1);
  if (id) consulta = consulta.neq('id', id);
  const { data: choques } = await consulta;
  const choque = (choques as Reunion[] | null)?.[0];
  if (choque) {
    const sala = salas.find((s) => s.id === choque.sala_id);
    return mensajeChoque(choque, sala?.nombre ?? 'La sala');
  }

  const fila = {
    sala_id: datos.sala_id,
    cliente: datos.cliente.trim(),
    asunto: datos.asunto.trim(),
    notas: datos.notas.trim(),
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
  };

  const { error } = id
    ? await supabase.from('reuniones').update(fila).eq('id', id)
    : await supabase.from('reuniones').insert(fila);
  return error ? traducirError(error) : null;
}

export async function cancelarReunion(id: string): Promise<string | null> {
  const { error } = await supabase.from('reuniones').delete().eq('id', id);
  return error ? traducirError(error) : null;
}
