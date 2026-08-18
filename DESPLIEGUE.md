# Despliegue de TuraFood

Tres aplicaciones y una base. Cada aplicación es una imagen Docker
independiente y se despliega desde este mismo repositorio cambiando la
**ruta de build**.

| Dominio | Carpeta | Quién entra |
|---|---|---|
| `turafood.com` | `turafood-cliente` | Cliente final |
| `app.turafood.com` | `turafood-app` | Negocio **y** repartidor |
| `dash.turafood.com` | `turafood-admin` | Equipo TuraFood |

La base (PostgreSQL, Auth, Storage, Edge Functions) vive en Supabase y
se gestiona desde `turafood-supabase`.

---

## 1. Base de datos

El CLI de Supabase busca `supabase/config.toml` en la carpeta actual y
hacia arriba. Desde la raíz del repositorio no lo encuentra, así que
**siempre hay que entrar a `turafood-supabase` primero**:

```bash
cd turafood-supabase && supabase db push
```

El proyecto ya está enlazado. Si alguna vez pide el enlace:

```bash
cd turafood-supabase && supabase link --project-ref btaddjjzpvyqltkchqki
```

### Secrets del proyecto

Estos NO van al repositorio ni a ninguna imagen. Se ponen una sola vez:

```bash
cd turafood-supabase && supabase secrets set MAILERLITE_TOKEN=tu_token_nuevo SYNC_SECRET=una_clave_larga_inventada
```

Los de ePayco ya deberían estar puestos:
`EPAYCO_P_CUST_ID_CLIENTE`, `EPAYCO_P_KEY`.

### Edge Functions

```bash
cd turafood-supabase && supabase functions deploy mailerlite-sync
```

```bash
cd turafood-supabase && supabase functions deploy epayco-webhook
```

`mailerlite-sync` no se ejecuta sola: hay que llamarla cada pocos
minutos. Desde el panel de Supabase, en **Database → Cron Jobs**:

```sql
select cron.schedule(
  'mailerlite-sync',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://btaddjjzpvyqltkchqki.supabase.co/functions/v1/mailerlite-sync',
    headers := '{"x-sync-secret":"la_misma_clave_de_SYNC_SECRET"}'::jsonb
  );
  $$
);
```

### Crear el primer administrador

`dash.turafood.com` no tiene registro a propósito. La cuenta se crea
desde el panel de Supabase (Authentication → Add user) y después se le
pone el rol a mano:

```sql
update public.profiles set role = 'admin' where email = 'tu@turafood.co';
```

---

## 2. Aplicaciones en EasyPanel

Para cada una: **App nueva → Source: GitHub → Build: Dockerfile**.

| Aplicación | Ruta de build | Dominio |
|---|---|---|
| `turafood-cliente` | `/turafood-cliente` | `turafood.com` |
| `turafood-app` | `/turafood-app` | `app.turafood.com` |
| `turafood-admin` | `/turafood-admin` | `dash.turafood.com` |

Puerto: **3000** en las tres.

### Variables de build

Las variables `NEXT_PUBLIC_*` se incrustan en el paquete de JavaScript
**durante el build**, no al arrancar. En EasyPanel van en **Build
Arguments**, no solo en Environment. Si se ponen únicamente como
variables de entorno, la aplicación arranca pero no ve la base.

Las tres necesitan:

```
NEXT_PUBLIC_SUPABASE_URL=https://btaddjjzpvyqltkchqki.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
```

`turafood-cliente` y `turafood-app` además:

```
NEXT_PUBLIC_EPAYCO_KEY=…
NEXT_PUBLIC_EPAYCO_TEST=false
NEXT_PUBLIC_BASE_URL=https://…
```

**La `service_role` key no entra a ninguna imagen de frontend.** Quien
tenga la imagen tendría acceso total a la base sin pasar por RLS. Solo
la usan las Edge Functions, que la reciben del entorno de Supabase.

### Redirecciones de Auth

En Supabase → Authentication → URL Configuration:

```
https://turafood.com/**
https://app.turafood.com/**
https://dash.turafood.com/**
```

Y activar los proveedores **Google** y **Facebook**: son la puerta
principal de `app.turafood.com`. El correo y la contraseña siguen
existiendo como enlace secundario, así que nadie queda encerrado si un
proveedor falla, pero el registro de negocios nuevos pasa por ahí.

`dash.turafood.com` no usa proveedores: solo correo y contraseña, y la
cuenta se crea a mano.

---

## 3. Correr en local

Cada aplicación en su puerto para poder tenerlas las tres abiertas:

```bash
cd turafood-cliente && npm run dev -- -p 3000
```

```bash
cd turafood-app && npm run dev -- -p 3100
```

```bash
cd turafood-admin && npm run dev -- -p 3200
```

Sin `.env.local` las tres arrancan igual y muestran los datos de la
maqueta. Es a propósito: se puede revisar cualquier pantalla sin tener
que sembrar la base primero.

### Ojo con las sesiones en local

Las cookies **no distinguen puertos**. `localhost:3000`, `localhost:3100`
y `localhost:3200` son el mismo host para el navegador, así que entrar
en una app deja sesión iniciada en las tres. Si entras como cliente y
después abres la consola, el proxy te va a mandar a `/sin-acceso` — y
tiene razón: esa sesión no es de administrador.

No es un error y en producción no pasa, porque son tres subdominios
distintos. Para probar las tres a la vez en local, abre cada una en una
ventana de incógnito aparte, o en navegadores distintos.

Para cambiar de rol en la misma ventana basta con cerrar sesión y
volver a entrar con el correo que toca.

---

## 4. Orden recomendado la primera vez

1. `supabase db push` desde `turafood-supabase`
2. Poner los secrets y desplegar las dos Edge Functions
3. Programar el cron de `mailerlite-sync`
4. Activar Google y Facebook en Auth, con las URLs de redirección
5. Desplegar las tres aplicaciones en EasyPanel
6. Crear el usuario administrador y ponerle `role = 'admin'`
7. Entrar a `dash.turafood.com` y aprobar el primer negocio

Para probar antes de tener negocios reales, en vez del paso 6 corre
`supabase/seed-usuarios-prueba.sql` y `supabase/seed-catalogos.sql`:
dejan una cuenta por cada lado y los menús de los negocios de
demostración. Bórralos antes de abrirle la plataforma a nadie.
