// Avisa a todos los departamentos cuando se agenda, modifica o cancela una reunión.
// La llama el trigger "reuniones_notificar" de la base de datos (ver supabase/sql/05_emails.sql).
// Los destinatarios son siempre los del secreto EMAIL_AVISOS.
import {
  autorizado,
  clienteAdmin,
  destinatarios,
  enviarEmail,
  plantilla,
  textoFecha,
  textoHorario,
  type ReunionFila,
} from '../_shared/email.ts';

interface Cambio {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: ReunionFila | null;
  old_record: ReunionFila | null;
}

const TITULOS = {
  INSERT: 'Nueva reunión agendada',
  UPDATE: 'Reunión modificada',
  DELETE: 'Reunión cancelada',
} as const;

const INTROS = {
  INSERT: 'Se agendó una nueva reunión.',
  UPDATE: 'Cambió una reunión. Estos son los datos actualizados.',
  DELETE: 'Se canceló una reunión.',
} as const;

Deno.serve(async (req) => {
  if (!autorizado(req)) return new Response('No autorizado', { status: 401 });

  const { type, record, old_record } = (await req.json()) as Cambio;
  const r = type === 'DELETE' ? old_record : record;
  const para = destinatarios();
  // Sin destinatarios, o si la reunión ya terminó (por ejemplo, al borrar historial), no se avisa.
  if (!r || para.length === 0 || new Date(r.fin) <= new Date()) return Response.json({ enviados: 0 });
  const anterior = type === 'UPDATE' ? old_record : null;

  const db = clienteAdmin();
  const idsSala = [...new Set([r.sala_id, anterior?.sala_id ?? r.sala_id])];
  const { data: salas, error } = await db.from('salas').select('id, nombre').in('id', idsSala);
  if (error) {
    console.error(error);
    return new Response('Error leyendo salas', { status: 500 });
  }
  const nombreSala = (id: string) => salas?.find((s) => s.id === id)?.nombre ?? '';

  const filas: [string, string][] = [
    ['Cliente', r.cliente],
    ['Fecha', textoFecha(r.inicio)],
    ['Horario', textoHorario(r.inicio, r.fin)],
    ['Sala', nombreSala(r.sala_id)],
    ['Asunto', r.asunto],
    ['Notas', type === 'DELETE' ? '' : r.notas],
  ];
  if (anterior && (anterior.inicio !== r.inicio || anterior.fin !== r.fin || anterior.sala_id !== r.sala_id)) {
    filas.push([
      'Antes',
      `${textoFecha(anterior.inicio)}, ${textoHorario(anterior.inicio, anterior.fin)}, ${nombreSala(anterior.sala_id)}`,
    ]);
  }

  try {
    await enviarEmail(
      para,
      `${TITULOS[type]}: ${r.cliente} · ${textoFecha(r.inicio)}`,
      plantilla({
        titulo: TITULOS[type],
        intro: INTROS[type],
        color: type === 'DELETE' ? '#dc2626' : '#1d4ed8',
        filas,
      }),
    );
  } catch (e) {
    console.error(e);
    return Response.json({ enviados: 0, error: String(e) }, { status: 502 });
  }
  return Response.json({ enviados: 1 });
});
