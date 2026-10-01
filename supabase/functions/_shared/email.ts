// Código compartido por las funciones de email (se ejecuta en Supabase Edge Functions, Deno).
import { createClient } from 'npm:@supabase/supabase-js@2';

const ZONA = 'America/Argentina/Buenos_Aires';

export interface ReunionFila {
  id: string;
  sala_id: string;
  cliente: string;
  asunto: string;
  notas: string;
  inicio: string;
  fin: string;
}

/** Solo la base de datos (que conoce el secreto) puede llamar a estas funciones. */
export function autorizado(req: Request): boolean {
  const secreto = Deno.env.get('SECRETO_FUNCIONES');
  return Boolean(secreto) && req.headers.get('Authorization') === `Bearer ${secreto}`;
}

export function clienteAdmin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

const fmtFecha = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const fmtHora = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function textoFecha(iso: string): string {
  const t = fmtFecha.format(new Date(iso));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function textoHorario(inicio: string, fin: string): string {
  return `${fmtHora.format(new Date(inicio))} a ${fmtHora.format(new Date(fin))} (aprox.)`;
}

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function plantilla(opciones: {
  titulo: string;
  intro: string;
  color: string;
  filas: [string, string][];
}): string {
  const appUrl = Deno.env.get('APP_URL');
  const filas = opciones.filas
    .filter(([, valor]) => valor)
    .map(
      ([etiqueta, valor]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap">${escapar(
          etiqueta,
        )}</td><td style="padding:6px 0;color:#0f172a;white-space:pre-wrap">${escapar(valor)}</td></tr>`,
    )
    .join('');
  const boton = appUrl
    ? `<p style="margin:24px 0 0"><a href="${escapar(appUrl)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;display:inline-block">Ver calendario</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border-radius:12px;border-top:6px solid ${opciones.color};padding:24px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a">${escapar(opciones.titulo)}</h1>
      <p style="margin:0 0 16px;color:#334155">${escapar(opciones.intro)}</p>
      <table style="border-collapse:collapse;font-size:15px">${filas}</table>
      ${boton}
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px">Aviso automático del Calendario de Reuniones.</p>
  </div></body></html>`;
}

/** Emails de todos los departamentos, separados por coma en el secreto EMAIL_AVISOS. */
export function destinatarios(): string[] {
  return (Deno.env.get('EMAIL_AVISOS') ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

/** Envía un email con Resend. Lanza un error si falla. */
export async function enviarEmail(para: string[], asunto: string, html: string): Promise<void> {
  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_REMITENTE') ?? 'Calendario <onboarding@resend.dev>',
      to: para,
      subject: asunto,
      html,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`Resend respondió ${respuesta.status}: ${await respuesta.text()}`);
  }
}
