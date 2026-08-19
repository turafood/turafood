# TuraFood AI — Documento de traspaso

**Estado al 19 de agosto de 2026.** Escrito para que quien retome este
proyecto —en Antigravity, en otro editor o dentro de seis meses— pueda
entender qué hay, por qué está así, y dónde están las trampas.

No es un README. Es lo que yo hubiera querido leer antes de empezar.

---

## 0. Lo primero que tienes que saber

### Corre estos SQL antes de tocar nada

Hay tres migraciones escritas y **sin aplicar**. Están juntas en
`turafood-supabase/supabase/PEGAR-AHORA.sql`. Se pegan en
Supabase → SQL Editor → New query → Run. Es seguro correrlo dos veces.

| | Qué arregla | Si no lo corres |
|---|---|---|
| `20260818000012` | Verificación sin papeles | El primer paso de verificación no guarda (falla con 42703) |
| `20260818000014` | **El repartidor no acumula entregas** | Su pantalla de Ganancias muestra siempre el mismo número. **Es plata.** |
| `20260818000013` | Métricas de producto | El popup de métricas muestra un error |

### Rota estas credenciales

Durante la sesión se pegaron en el chat un **token de MailerLite** y las
**credenciales de Twilio** (Account SID, Auth Token y una API Key SK…).
No quedaron guardadas en ningún archivo del repositorio, pero **quedaron
en el historial de la conversación**. Rótalas.

### Nunca metas la `service_role` key en el frontend

Solo las Edge Functions la usan. Si aparece en un `NEXT_PUBLIC_*` o en
una imagen de Docker, cualquiera puede leer y escribir toda la base
saltándose RLS.

---

## 1. Qué es esto

TuraFood AI es una plataforma de domicilios para **Buenaventura,
Colombia**. Tres aplicaciones sobre una sola base de datos Supabase.

| Dominio | Carpeta | Quién entra |
|---|---|---|
| `turafood.com` | `turafood-cliente` | Cliente final |
| `app.turafood.com` | `turafood-app` | Negocio **y** repartidor |
| `dash.turafood.com` | `turafood-admin` | Equipo TuraFood |

Negocio y repartidor comparten dominio a propósito: `src/proxy.js` lee
`profiles.role` y manda a cada quien a su entorno.

### El modelo de negocio, en una frase

**TuraFood no cobra comisión por pedido y no procesa la plata de las
ventas.** El cliente le paga directo al negocio. La empresa se financia
con planes de crecimiento opcionales.

Esto no es un detalle: **es la estructura**, y explica media docena de
decisiones técnicas. Si alguien decide cobrar comisión más adelante, hay
que revisar `place_order`, la pantalla de "Cómo te pagan", el checkout y
los siete documentos.

---

## 2. Tamaño y forma

```
turafood-cliente    59 archivos    13.141 líneas    21 pantallas
turafood-app        92 archivos    24.717 líneas    37 pantallas
turafood-admin      23 archivos     5.147 líneas    13 pantallas
                   ───────────    ─────────────    ────────────
                   174 archivos    43.005 líneas    71 pantallas
```

Base de datos: **40 tablas, 33 migraciones, 2 Edge Functions.**

Stack: Next.js 16.3.1 (App Router, Turbopack), React 19.2.8, Supabase
(PostgreSQL + PostGIS + Auth + Storage + Realtime + Edge Functions).

---

## 3. Las siete trampas de este proyecto

Esto es lo más valioso del documento. Cada una me costó encontrarla y
todas van a volver a aparecer.

### 3.1 El patrón que apareció TRES veces: SECURITY DEFINER contra un guard

**Síntoma:** una función de la base actualiza algo, devuelve éxito, y el
dato no cambió.

**Causa:** sobre varias tablas hay triggers `guard_*` que revierten
columnas sensibles para todo el que no sea admin. Una función
`SECURITY DEFINER` corre con los permisos del dueño, **pero `auth.uid()`
adentro sigue siendo quien llamó**. Así que `is_admin()` da falso y el
guard le deshace el UPDATE a la propia función del sistema.

Apareció en:

| Dónde | Qué se rompía |
|---|---|
| `place_order` | **Todos los pedidos quedaban en $0** |
| `guardar_onboarding` | Licorerías y droguerías pagaban 10% en vez de 15% |
| `complete_delivery` | El repartidor no acumulaba entregas ni ganancias |

**La solución, siempre la misma:** una marca de transacción que el guard
deja pasar.

```sql
-- En el guard
IF COALESCE(current_setting('turafood.sella_montos', true), '') = 'on' THEN
    RETURN NEW;
END IF;

-- En la función que sí tiene derecho
PERFORM set_config('turafood.sella_montos', 'on', true);
UPDATE ...;
PERFORM set_config('turafood.sella_montos', 'off', true);
```

Es seguro porque `set_config` no se expone por PostgREST: nadie la puede
prender desde el navegador.

Las tres marcas que existen hoy:
`turafood.sella_montos`, `turafood.sella_negocio`, `turafood.sella_repartidor`.

> **Si escribes una función nueva que toque una columna protegida, vas a
> caer en esto.** Búscala antes: `grep -n "guard_" migrations/*.sql`.

### 3.2 `current_user` no sirve dentro de SECURITY DEFINER

Mi primer intento de arreglar el bug de los $0 usaba `current_user` para
detectar al dueño. **Siempre devuelve el dueño de la función**, así que
habría desactivado el guard para todo el mundo. Usa `auth.role()` para el
service role y las marcas de transacción para lo demás.

### 3.3 Las vistas NO heredan RLS

Una vista normal en Postgres corre con los permisos de **quien la creó**.
Creé `negocios_recien_llegados` y sin darme cuenta cualquier negocio
habría leído las respuestas de todos los demás.

```sql
CREATE OR REPLACE VIEW public.lo_que_sea
WITH (security_invoker = true)   -- ESTO
AS SELECT ...;
```

### 3.4 Recursión infinita en RLS (42P17)

Si una política llama a una función que consulta una tabla que a su vez
tiene políticas, se cicla. Toda función llamada desde una política tiene
que llevar:

```sql
SECURITY DEFINER
SET search_path = public
SET row_security = off     -- ESTO es lo que corta el ciclo
```

Ya pasó dos veces. Los helpers arreglados están en
`20260818000000_fix_recursion_rls.sql` y `...0001_fix_recursion_offers.sql`.

### 3.5 Índices con expresiones tienen que ser IMMUTABLE (también 42P17)

```sql
-- MAL: depende de la zona horaria de la sesión
CREATE UNIQUE INDEX ... ON tabla (col, (created_at::date));

-- BIEN: zona fija, y además es lo correcto para el negocio
CREATE UNIQUE INDEX ... ON tabla (col, ((created_at AT TIME ZONE 'America/Bogota')::date));
```

### 3.6 Una animación CSS le gana a un estilo en línea

La tarjeta del recorrido guiado se centraba con
`transform: translate(-50%,-50%)`, pero la clase `.anim-pop` termina en
`transform: none` con `fill-mode: both`. Al acabar la animación **le
borraba el centrado** y la tarjeta quedaba con media cara fuera de
pantalla.

Regla: **nunca animes y posiciones con la misma propiedad.** Si necesitas
centrar algo animado, calcula el `top`/`left` con números.

Relacionado: `fill-mode: both` con `opacity: 0` inicial deja el contenido
invisible para siempre si el navegador no estaba pintando (pestaña en
segundo plano). Ya pasó con `.route-fade`.

### 3.7 Zustand `persist` rompe la hidratación

El carrito se rehidrataba desde `localStorage` **antes** del primer
render, así que el servidor pintaba el carrito vacío y el cliente lleno.
React descartaba todo el HTML y repintaba la página entera en el celular.

Solución: `skipHydration: true` en el store y un componente que llama
`persist.rehydrate()` dentro de un `useEffect`.

**El mismo patrón aplica a cualquier `useState(() => localStorage...)`.**

---

## 4. Cómo está armada la base de datos

### Las reglas viven en el servidor, no en la pantalla

Es el principio que más veces se aplicó. Un checkout que esconde botones
es una sugerencia; un trigger que rechaza el pedido es una regla.

Ejemplos:

- **Medios de pago.** El negocio elige cuáles acepta. El trigger
  `guard_payment_method` rechaza un pedido con un medio no habilitado,
  aunque alguien arme la llamada a mano.
- **Los precios.** `place_order` relee el precio de cada producto de la
  base. Lo que mande el navegador no se usa nunca.
- **La comisión.** Sale del `vertical`, que sale del `nicho`. El
  navegador no la puede tocar.
- **Las métricas.** `metricas_producto` comprueba que quien pregunta sea
  el dueño del producto o un admin.

### Funciones clave

| Función | Qué hace | Ojo con |
|---|---|---|
| `place_order` | Crea el pedido y calcula todos los montos | Tiene cupones y descuentos. **No la reescribas entera** — copiarla es la mejor forma de perder algo. Usa triggers. |
| `guardar_onboarding` | Guarda las respuestas y ajusta vertical + comisión | Solo mueve la comisión si aún tiene el valor por defecto |
| `accept_order` / `courier_advance_order` / `complete_delivery` | El ciclo de la entrega | `complete_delivery` pide un código = últimos 4 dígitos del número de pedido |
| `sembrar_pedidos_demo` | Comandas de ejemplo al entrar | No hace nada si el negocio no tiene menú |
| `metricas_producto` | Los números del popup | Comprueba el dueño |
| `anotar_evento_producto` | Registra vista/carrito/checkout/compra | Anónima, sin user_id ni IP |

### Vistas

- `negocios_recien_llegados` — feed para el super admin
- `repartidores_recien_llegados` — lo mismo para repartidores

Ambas con `security_invoker = true`.

---

## 5. Lo que está construido

### Cliente (`turafood.com`)

- **Compra completa sin cuenta.** Sesión anónima de Supabase. Probado de
  punta a punta contra producción: dirección → pedido → seguimiento.
- Catálogo, producto, carrito, checkout, seguimiento, chat, reseñas.
- **Medios de pago según el negocio.** Solo ve los que ese negocio acepta.
- **Número de Nequi/Daviplata a la vista** antes de confirmar.
- **Comanda por WhatsApp**: mensaje del cliente al negocio, con cierre
  distinto según cómo va a pagar.
- Registro de eventos de producto (vista, carrito, checkout, compra).

### Negocio + repartidor (`app.turafood.com`)

**Entrada sin fricción**
- Dos botones: "Tengo un negocio" / "Quiero repartir".
- **Onboarding de 6 preguntas** (4 para repartidor) + paso de tema.
  Ninguna pide datos personales. Todo se contesta de un toque.
- **Animación de preparación** adaptada al nicho (pizzería ve el horno,
  droguería ve otra cosa).
- Menú de ejemplo y comandas de prueba sembradas automáticamente.

**Panel del negocio** — 5 grupos de menú, agrupados por lo que la persona
*hace*, no por organigrama:

```
DÍA A DÍA    Resumen · Pedidos en vivo · Menú y productos
MI NEGOCIO   Cómo te pagan · Horarios · Promociones · Reseñas · Sucursales
LA PLATA     Historial · Reportes · Liquidaciones
CRECER       Growth Partner · Business Suite · Redes AI · Google Ads AI
(sin título) Verificación · Soporte · Equipo y ajustes
```

- **Cómo te pagan**: 4 bloques (Efectivo · Transferencia · WhatsApp ·
  Tarjeta). Nequi y Daviplata van juntos porque para el dueño es una
  sola decisión.
- **Métricas por producto**: embudo vista → carrito → checkout → compra,
  con un consejo concreto.
- **Verificación por videollamada** (Cal embebido, `turafood/reunion`).
  Sin papeles. Con contador de 24 horas.
- **Growth Partner**: 3 planes con conmutador mensual/anual.

**Panel del repartidor** — 4 pestañas. Ciclo completo probado: ve
pedidos, toma, recoge, entrega con código.

### Consola (`dash.turafood.com`)

10 secciones, todas con datos reales. Incluye "Acaban de entrar" con las
respuestas del onboarding y una prioridad calculada.

### Temas

Tres: **claro (por defecto)**, oscuro y **puerto** (bandera de
Buenaventura, verde y amarillo). El botón los cicla.

El tema se aplica en un script del `<head>`, **antes del primer pixel**.
Aplicarlo en un `useEffect` era lo que causaba que las secciones se
vieran mezcladas.

El negro mate sale de un token (`--ink`, `--ink2`, `--onInk`) usado en 19
archivos. Antes cada uno tenía su propio negro escrito a mano; por eso
dos bloques oscuros contiguos no casaban.

---

## 6. Precios

Viven en `turafood-app/src/app/negocio/crecimiento/planes.js`. **Todos
los derivados se calculan** — cambiar un precio ahí recalcula el por-mes,
el ahorro y el porcentaje solos.

| Plan | Mensual | Anual | Equivale a | Ahorro |
|---|---|---|---|---|
| Starter | Gratis | Gratis | — | — |
| Tura Food | $89.000 | $489.000 | $40.750/mes | 54% |
| **Tura Growth** | **$289.000** | **$890.000** | **$74.167/mes** | **74%** |

Coinciden exacto con turafood.com. **Si cambias uno, regenera también los
documentos** (`node documentos/02-membresias.js`).

El argumento de venta es que 12 meses de Growth mes a mes son
**$3.468.000** contra **$890.000** del año: **$2.578.000 de diferencia**.
Por eso la comparativa lo muestra en pesos y no como "−74%".

---

## 7. Los documentos

En `/documentos`. Se generan con `node`:

```bash
cd documentos
npm install docx      # solo la primera vez
node 01-plan-de-negocio.js
node 02-membresias.js
node 03-manuales.js
node 06-legales.js
```

| Archivo | Para qué |
|---|---|
| 01 Plan de Negocio | Que alguien de afuera entienda en 20 minutos |
| 02 Membresías y cobro | Los 3 planes y cómo paga cada actor |
| 03 Manual del Negocio | Cómo opera un restaurante |
| 04 Manual del Repartidor | Cómo trabaja y cuánto gana |
| 05 Guía del Cliente | Cómo pedir sin cuenta |
| 06 Términos y Condiciones | Pie del sitio |
| 07 Política de Privacidad | Pie del sitio |

> **Los legales son borrador.** Tocan la Ley 1581 de 2012 (habeas data) y
> la Ley 1480 de 2011 (Estatuto del Consumidor). Necesitan abogado
> colombiano antes de publicarse. Llevan el aviso adentro.

El estilo compartido está en `documentos/estilo.js`.

---

## 8. Accesos y despliegue

### Cuentas de prueba

Todas con contraseña **`TuraFood2026!`**:

```
admin@turafood.com        → dash.turafood.com
negocio@turafood.com      → app.turafood.com (panel de negocio)
repartidor@turafood.com   → app.turafood.com (panel de repartidor)
cliente@turafood.com      → turafood.com
```

Se crean con `turafood-supabase/supabase/seed-usuarios-prueba.sql`.
**Bórralas antes de abrir al público.**

### Supabase

Proyecto: `btaddjjzpvyqltkchqki`

Las variables van en `.env.local` de cada app y en **Build Arguments** de
EasyPanel — las `NEXT_PUBLIC_*` se hornean en tiempo de *build*, no de
ejecución. Si las pones solo como env de runtime, quedan vacías.

### Edge Functions

```bash
supabase functions deploy epayco-webhook  --project-ref btaddjjzpvyqltkchqki
supabase functions deploy mailerlite-sync --project-ref btaddjjzpvyqltkchqki
```

Secretos que necesitan: `EPAYCO_P_CUST_ID_CLIENTE`, `EPAYCO_P_KEY`,
`MAILERLITE_TOKEN`, `SYNC_SECRET`.

**`epayco-webhook` va con `verify_jwt = false`** (ya está en
`config.toml`). ePayco llama desde sus servidores y no puede mandar un
JWT: con la verificación encendida responde 401 y **ningún pago se
confirma jamás**. No queda abierta — valida la firma SHA-256.

URL de confirmación para el panel de ePayco:
`https://btaddjjzpvyqltkchqki.supabase.co/functions/v1/epayco-webhook`

### EasyPanel

Tres servicios, uno por app, cada uno con su Dockerfile. Un `git push`
**no despliega solo** a menos que hayas conectado el webhook de GitHub.
Para saberlo: EasyPanel → la app → Source (ahí está la URL del webhook)
y luego GitHub → Settings → Webhooks.

---

## 9. Qué falta

### Bloqueante

1. **Correr `PEGAR-AHORA.sql`** (las 3 migraciones).
2. **Rotar MailerLite y Twilio.**
3. **Desplegar las 2 Edge Functions** y cargar sus 4 secretos.
4. **Registrar la URL de confirmación en ePayco.**
5. **Conectar el link de pago de ePayco** a los botones de Growth
   Partner — hoy no llevan a ningún lado. Es un cambio de una línea en
   `planes.js` (agregar `url` a cada plan) y otra en `page.js`.

### Antes de abrir al público

- Correr `limpiar-datos-de-prueba.sql`. Al 19/08/2026 había **13
  negocios en total, de los cuales ~6 son de prueba** ("Mi negocio",
  "Prueba comisión", "Licores la 15"…) y tapan los reales en la consola.
  El script solo borra cuentas anónimas (`auth.users.is_anonymous`), que
  es una marca que pone GoTrue y no se puede falsificar desde el
  navegador — así que no puede llevarse por delante un negocio real ni
  las 4 cuentas de prueba con contraseña.
- Borrar las 4 cuentas de prueba.
- Decidir el correo de confirmación (el remitente por defecto de Supabase
  está limitado por tasa).
- Activar Facebook como proveedor de login.
- Configurar el Messaging Service de Twilio para el SMS.
- **Pasar los legales por un abogado.**

### Mejoras que valen la pena

- Ejecutar el corte de liquidación desde el admin (el botón está, la
  lógica no).
- Exportar CSV de finanzas.
- Notificaciones push.
- El mapa real de zonas (los datos están en `delivery_zones`).
- Seguimiento del repartidor en vivo en el mapa del cliente.
- Asignación automática de repartidor por cercanía.

---

## 10. Lo que NO está verificado

Para que nadie asuma de más:

- **Un cobro real con ePayco.** Se verificó que el webhook valida firma y
  que ya no rechaza por JWT, pero no se hizo una transacción real.
- **El envío de SMS.** Twilio no está configurado.
- **MailerLite.** La función no está desplegada.
- **Carga con volumen.** La base tiene ~10 pedidos, no 10.000.
- **El embed de Cal en producción.** Se verificó el componente y el
  respaldo por WhatsApp, pero no una reserva real de punta a punta.

---

## 11. Cómo trabajar en esto

### Antes de dar algo por bueno, pruébalo contra la base

Los bugs más caros de esta sesión —los pedidos en $0, la comisión mal
asignada, el repartidor sin historial— **no se ven leyendo el código**.
Los tres aparecieron haciendo un pedido real y mirando el resultado.

Patrón útil: token con `curl`, llamar el RPC, leer la fila con el token
de admin.

```bash
URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2- | tr -d '\r')
KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2- | tr -d '\r')
T=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"email":"negocio@turafood.com","password":"TuraFood2026!"}' \
  | grep -oP '(?<="access_token":")[^"]*')
```

**Trampa de mis propias pruebas:** un negocio ve *todos* los negocios
activos (navega el catálogo), así que `business_profiles?limit=1` con su
token **no devuelve el suyo**. Saca su id del JWT (`sub`), no de una
consulta. Me costó una investigación entera creer que había un bug donde
no lo había.

### Los estilos en línea le ganan a las media queries

Todo lo responsive tiene que vivir en `globals.css`. Si pones
`{ width: 320 }` en un `style={}`, ninguna media query lo va a cambiar.
Las clases que ya existen: `.arranque-hoja`, `.metricas-hoja`,
`.planes-grid`, `.cabecera-escena`, `.rider-side`.

### Cuidado con los emojis

Los pinta el sistema operativo. En un Android viejo —el teléfono de medio
Buenaventura— varios salen como un cuadrito ▯. Por eso el onboarding usa
SVG propio y la comanda de WhatsApp usa solo emojis de Unicode 6.0 (2010),
verificados uno por uno.

### Los mensajes de error son parte del producto

Nueve pantallas del admin hacían `if (!datos) return <Skeleton/>` **antes**
de pintar el aviso de error. Una carga fallida se veía como un esqueleto
eterno, sin una sola pista. Si escribes un componente que carga datos,
pon el error antes del esqueleto.

### El idioma

Todo en español de Colombia, y en el del puerto — no en el de una
consultora. "Que me encuentren" antes que "visibilidad". "La plata"
antes que "los ingresos". Los comentarios del código también.

---

## 12. Mapa de archivos

```
turafood-cliente/src/
  lib/data.js               todas las consultas del cliente
  lib/sesion.js             sesión anónima (asegurarSesion)
  lib/comandaWhatsapp.js    el mensaje al negocio
  lib/eventos.js            registro de métricas
  services/payment/         ePayco y tipos de pago
  store/useCartStore.js     carrito (ojo: skipHydration)

turafood-app/src/
  lib/negocio.js            consultas del negocio
  lib/repartidor.js         consultas del repartidor
  lib/sesion.js             probarComo() — el alta sin registro
  lib/arranque.js           guarda el onboarding
  lib/prefs.js              temas e idioma
  app/components/
    Arranque.js             el wizard de 6 preguntas
    preguntasArranque.js    las preguntas (aquí se editan)
    IconoArranque.js        los iconos SVG del wizard
    PreparandoPanel.js      la animación de la olla
    Recorrido.js            el tour guiado
    ArteRecorrido.js        las ilustraciones del tour
    CabeceraSeccion.js      las franjas de arriba
    EscenaSeccion.js        las escenas con gente
    Videollamada.js         el embed de reservas
    Compromiso24h.js        el contador
    IconosPago.js           las marcas de pago
    LocalMini.js            la fachada del negocio
  app/negocio/
    BizShell.js             menú y armazón
    crecimiento/planes.js   LOS PRECIOS
    crecimiento/Comparativa.js
    catalogo/MetricasProducto.js
  app/repartidor/RiderShell.js

turafood-admin/src/lib/admin.js

turafood-supabase/supabase/
  migrations/               33 archivos, en orden
  functions/                epayco-webhook, mailerlite-sync
  PEGAR-AHORA.sql           ← lo que falta correr
  limpiar-datos-de-prueba.sql
  seed-usuarios-prueba.sql

documentos/                 los 7 .docx y sus generadores
AUDITORIA.md                auditoría del MVP
TRASPASO.md                 este archivo
```

---

## 13. Decisiones que parecen raras y no lo son

Para que nadie las "arregle" sin saber:

**El cliente entra sin cuenta y se le crea una sesión anónima.**
No es un atajo: es lo que permite que RLS funcione igual para todos.
Desde la base, un invitado es un usuario como cualquiera.

**Las comandas de ejemplo son pedidos reales.**
Con `is_demo = true`. Se aceptan y se mueven con los mismos botones,
porque son los mismos pedidos. Un tablero con datos falsos que no se
pueden tocar no enseña nada.

**El wizard se puede saltar siempre.**
Quien no quiera contestar entra igual. Solo pierde que le armemos el
panel a su medida.

**El paso del tema va de último.**
Es lo único que no configura nada del negocio, así que quien salte antes
no se pierde nada importante.

**En móvil, la tarjeta del plan anual va primera.**
Casi nadie llega al final de una página de precios en el celular.

**El amarillo del tema puerto no se usa para texto ni botones.**
Sobre blanco no llega ni a 2:1 de contraste. Va en acentos y fondos.

**Los documentos son opcionales, para negocio y repartidor.**
Exigir RUT, cámara de comercio o SOAT dejaba por fuera a media ciudad —
incluido quien reparte en bicicleta, que no tiene ninguno de los tres.
La verificación real es la videollamada.

**Las métricas empiezan en cero y la pantalla lo dice.**
No existía registro de vistas ni abandonos. Se podía inventar los
números; no se hizo. Un dueño que ve "142 lo miraron y no compraron" le
baja el precio o le cambia la foto — tomar esa decisión con un dato falso
es peor que no tenerlo.

---

## 14. Contacto y datos fijos

```
WhatsApp del equipo      +57 313 759 4713
Reserva de videollamada  turafood/reunion
Supabase                 btaddjjzpvyqltkchqki
GitHub                   github.com/turafood/turafood
Tarifa de servicio       $1.900 por pedido
Domicilio por defecto    $3.900
Tope sin verificar       20 pedidos/día
```

---

*Escrito el 19 de agosto de 2026. Si algo de acá ya no coincide con el
código, créele al código y actualiza este archivo.*
