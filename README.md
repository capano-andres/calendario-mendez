# Calendario de Reuniones

App web para agendar reuniones con clientes en las salas de la oficina: **Sala Principal**, **Sala 2**, **Sala 3** y **Oficina de Claudio**. Funciona de lunes a viernes, de 8:00 a 18:00, en hora de Argentina.

- Todo el equipo entra con una **clave compartida** y ve el calendario.
- Solo la **secretaria**, con su propia clave, puede agendar, mover, editar o cancelar reuniones.
- La base de datos impide superponer reuniones en la misma sala, agendar fuera de horario o en feriados.
- Cada sala tiene su color, y las reuniones se ven con el color de su sala.
- **Opcional, se activa más adelante:** todos los departamentos pueden recibir un email al agendar, modificar o cancelar una reunión, y un recordatorio 24 horas antes.
- Los cambios aparecen en vivo en todas las pantallas, sin recargar.

Se publica gratis con **Supabase** (base de datos y claves) y **Vercel** (la página web). Los emails, si se activan, usan además **Resend**.

---

## Paso 1 · Crear la base de datos en Supabase

1. Crea una cuenta en <https://supabase.com> y un proyecto nuevo. Elige la región **South America (São Paulo)** y guarda la contraseña de la base de datos.
2. Abre **SQL Editor** y ejecuta, en este orden, el contenido de cada archivo de la carpeta `supabase/sql/`. Pega todo el archivo y presiona **Run**.
   1. `01_esquema.sql`
   2. `02_seguridad.sql`
   3. `03_datos_iniciales.sql`
3. **Importante, bloquea los registros públicos.** Ve a **Authentication → Sign In / Providers** y desactiva **Allow new users to sign up**. Así nadie puede crearse una cuenta por su cuenta.
4. Crea las dos cuentas de acceso en **Authentication → Users → Add user → Create new user**. Marca **Auto Confirm User** en ambas.

   | Email | Contraseña |
   |---|---|
   | `lectura@example.com` | la clave que compartirás con todo el equipo |
   | `secretaria@example.com` | la clave privada de la secretaria |

   Son direcciones ficticias que solo sirven de usuario interno. Nadie las escribe: en la pantalla de ingreso solo se elige "Ver calendario" o "Agendar reuniones" y se pone la clave.
5. En el **SQL Editor**, ejecuta `04_roles_usuarios.sql`. Al final debe mostrar las dos cuentas, una con rol `editor` y otra con rol `lector`.

## Paso 2 · Probar la app en tu computadora

1. En Supabase, abre **Project Settings → API** y copia la **Project URL** y la clave **anon public**.
2. En la carpeta del proyecto, copia `.env.example` como `.env` y pega esos dos valores.
3. Abre una terminal en la carpeta y ejecuta:

   ```
   npm install
   npm run dev
   ```

4. Abre <http://localhost:5173> y entra como secretaria.

## Paso 3 · Activar los emails (opcional, se puede hacer después)

La app funciona completa sin este paso. Si lo salteas, no se envía ningún email y puedes ir directo al paso 4.

### 3.1 Cuenta en Resend

1. Crea una cuenta en <https://resend.com>. El plan gratis permite 3.000 emails por mes.
2. **Verifica el dominio de la empresa** en **Domains**. Resend te da unos registros DNS para cargar donde tengas el dominio. Sin dominio verificado, Resend solo entrega emails a la dirección con la que creaste la cuenta, así que los departamentos no recibirían nada.
3. En **API Keys** crea una clave y cópiala.

### 3.2 Publicar las funciones de email

Inventa un secreto largo, por ejemplo 40 letras y números al azar. Lo usarás dos veces. Después ejecuta en la terminal, desde la carpeta del proyecto:

```
npx supabase login
npx supabase link --project-ref TU-PROYECTO
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxx
npx supabase secrets set EMAIL_REMITENTE="Calendario <calendario@tuempresa.com>"
npx supabase secrets set SECRETO_FUNCIONES=TU-SECRETO-LARGO
npx supabase secrets set EMAIL_AVISOS="contable@tuempresa.com,legal@tuempresa.com"
npx supabase secrets set APP_URL=https://tu-calendario.vercel.app
npx supabase functions deploy notificar-reunion --no-verify-jwt
npx supabase functions deploy recordatorios-24h --no-verify-jwt
```

- `TU-PROYECTO` es el **Reference ID** que aparece en **Project Settings → General**.
- El remitente debe usar el dominio verificado en Resend.
- `EMAIL_AVISOS` es la lista fija de emails de los departamentos, separados por coma. Todos los avisos van a esa lista.
- `APP_URL` es la dirección de la app. Puedes cargarla después del paso 4 y repetir solo ese comando.

### 3.3 Conectar la base de datos con las funciones

1. Abre `supabase/sql/05_emails.sql` y reemplaza `TU-PROYECTO` y `TU-SECRETO-LARGO` con tus valores. Aparecen dos veces cada uno.
2. Ejecútalo en el **SQL Editor**.

Desde ese momento, cada alta, cambio o cancelación avisa a todos los departamentos. Además, cada hora a los 5 minutos se revisan las reuniones de las próximas 24 horas y se manda el recordatorio. Si una reunión se agenda con menos de 24 horas de anticipación, solo llega el aviso de alta.

**Sin dominio propio:** la alternativa es enviar desde una cuenta de Gmail con una "contraseña de aplicación". Requiere cambiar la función `enviarEmail` de `supabase/functions/_shared/email.ts` para usar SMTP por el puerto 465, porque Supabase bloquea el 587. No viene implementado.

## Paso 4 · Publicar en Vercel

1. Crea una cuenta en <https://vercel.com>.
2. En la terminal, desde la carpeta del proyecto, ejecuta:

   ```
   npx vercel
   ```

   Acepta las opciones por defecto. Vercel detecta que es un proyecto Vite.
3. En el panel de Vercel, abre el proyecto y ve a **Settings → Environment Variables**. Carga las mismas variables de tu `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_EMAIL_LECTURA` y `VITE_EMAIL_SECRETARIA`.
4. Publica la versión final con:

   ```
   npx vercel --prod
   ```

5. Comparte la dirección `https://….vercel.app` con el equipo, junto con la clave compartida.

---

## Uso diario

- **Agendar:** clic en un horario libre de la sala. Se abre el formulario con la sala y la hora ya cargadas. También está el botón **+ Nueva reunión**.
- **Mover:** arrastra el bloque a otra hora o a otra sala. Para cambiar la duración, arrastra su borde inferior. Los horarios van de a 15 minutos.
- **Editar o cancelar:** clic en el bloque.
- **Vista semanal:** muestra lunes a viernes. Se puede filtrar por sala o ver todas, cada una en su carril.
- **En el celular:** las salas, o los días en la vista semanal, aparecen como pestañas.
- **Administrar** (solo secretaria): feriados. Vienen cargados los nacionales de 2026 y 2027. Conviene revisarlos con el calendario oficial en <https://www.argentina.gob.ar/interior/feriados> y agregar los días no laborables que respete la oficina.

## Ver sin clave

Por ahora, "Ver calendario" entra directo, sin clave, en modo solo lectura. Requiere haber ejecutado `supabase/sql/07_ver_sin_clave.sql` en el SQL Editor. Agendar sigue pidiendo su clave.

Para volver a pedir clave para ver:

1. Ejecuta las tres líneas comentadas al final de `07_ver_sin_clave.sql`, sin los `--`.
2. En Vercel, agrega la variable `VITE_VER_SIN_CLAVE` con el valor `false` y vuelve a publicar.

## Cambiar una clave

Supabase no permite editar una contraseña desde el panel sin enviar un email. Como las cuentas son ficticias, lo más simple es:

1. Borrar el usuario en **Authentication → Users**.
2. Crearlo de nuevo con la clave nueva, marcando **Auto Confirm User**.
3. Ejecutar otra vez `04_roles_usuarios.sql`.

## Para desarrolladores

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local |
| `npm test` | Pruebas de fechas y validaciones |
| `npm run build` | Compilación de producción |

- **Frontend:** React, TypeScript, Vite y Tailwind, en `src/`. La grilla del calendario está en `src/calendario/GrillaHoraria.tsx`.
- **Reglas:** se validan en el navegador y otra vez en la base de datos, con un trigger y una restricción de exclusión.
- **Permisos:** las políticas de seguridad de la base de datos usan el rol que guarda `app_metadata.rol` en la sesión de cada cuenta.
- **Funciones de email:** están en `supabase/functions/` y se ejecutan en Deno.
- **Orden de las salas:** se cambia con la columna `orden` de la tabla `salas`.
