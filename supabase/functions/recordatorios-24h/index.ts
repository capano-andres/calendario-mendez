// Envía a todos los departamentos el recordatorio de cada reunión 24 horas antes.
// La ejecuta cada hora el cron "recordatorios-24h" (ver supabase/sql/05_emails.sql).
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

interface Fila extends ReunionFila {
  salas: { nombre: string } | null;
}

Deno.serve(async (req) => {
  if (!autorizado(req)) return new Response('No autorizado', { status: 401 });

  const para = destinatarios();
  if (para.length === 0) return Response.json({ enviados: 0 });

  const db = clienteAdmin();
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

  // Reuniones que empiezan dentro de las próximas 24 h y todavía no tienen recordatorio.
  // Si una ejecución del cron falla, la siguiente las toma igual.
  const { data, error } = await db
    .from('reuniones')
    .select('*, salas(nombre)')
    .eq('recordatorio_enviado', false)
    .gt('inicio', ahora.toISOString())
    .lte('inicio', limite.toISOString())
    .order('inicio');

  if (error) {
    console.error(error);
    return new Response('Error leyendo reuniones', { status: 500 });
  }

  let enviados = 0;
  const errores: string[] = [];
  for (const r of (data ?? []) as Fila[]) {
    try {
      await enviarEmail(
        para,
        `Recordatorio: reunión con ${r.cliente} · ${textoFecha(r.inicio)}`,
        plantilla({
          titulo: 'Recordatorio de reunión',
          intro: 'Hay una reunión agendada dentro de las próximas 24 horas.',
          color: '#1d4ed8',
          filas: [
            ['Cliente', r.cliente],
            ['Fecha', textoFecha(r.inicio)],
            ['Horario', textoHorario(r.inicio, r.fin)],
            ['Sala', r.salas?.nombre ?? ''],
            ['Asunto', r.asunto],
            ['Notas', r.notas],
          ],
        }),
      );
      await db.from('reuniones').update({ recordatorio_enviado: true }).eq('id', r.id);
      enviados++;
    } catch (e) {
      console.error(e);
      errores.push(String(e));
    }
  }

  return Response.json({ enviados, errores }, { status: errores.length ? 502 : 200 });
});
