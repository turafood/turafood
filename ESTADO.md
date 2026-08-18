# TuraFood — Estado del proyecto

Última verificación contra la base real: **18 de agosto de 2026**.

Este documento dice qué está construido, qué está verificado y qué no.
La diferencia entre esas tres cosas importa: hay pantallas terminadas
que nunca se han visto con datos reales, y las señalo como tales.

---

## 1. Qué es cada cosa

Tres aplicaciones independientes contra una sola base. Cada una se
despliega desde este mismo repositorio cambiando la ruta de build.

| Dominio | Carpeta | Quién entra | Qué hace |
|---|---|---|---|
| `turafood.com` | `turafood-cliente` | Cliente final | Pide domicilios |
| `app.turafood.com` | `turafood-app` | Negocio **y** repartidor | Despacha y entrega |
| `dash.turafood.com` | `turafood-admin` | Equipo TuraFood | Aprueba y supervisa |

`app.turafood.com` atiende a dos públicos con un solo despliegue. Quién
ve qué lo decide `profiles.role`, que lee el servidor en `src/proxy.js`
antes de que la página llegue al navegador. El navegador no puede
mentir sobre su rol.

**Tamaño actual**

| | Archivos | Líneas |
|---|---|---|
| `turafood-cliente` | 55 | 12.652 |
| `turafood-app` | 70 | 19.201 |
| `turafood-admin` | 23 | 4.952 |
| Migraciones SQL | 20 | — |

---

## 2. Estado verificado contra la base

Lo siguiente está comprobado consultando la API real con la clave
pública, no leyendo código.

### Datos sembrados

| | |
|---|---|
| Negocios activos | 6 |
| Productos | 42 |
| Opciones de producto | 31 |
| Categorías | 24 |

| Negocio | Categorías | Productos |
|---|---|---|
| Asadero El Puerto | 4 | 8 |
| Burger House Bahía | 4 | 9 |
| Marisquería El Faro | 4 | 9 |
| Parrilla Punta del Este | 4 | 8 |
| Cevichería Doña Rosa | 4 | 8 |
| Picadas El Jorge | 4 | 8 |

### Tablas

Las 40 tablas responden. Ninguna devuelve error de servidor.

Las que exigen sesión responden `401`, que es lo correcto: significa
que RLS está activo y filtrando.

### Rutas

| App | Rutas | Estado |
|---|---|---|
| `turafood-cliente` | 13 | todas 200 |
| `turafood-app` | 25 | todas 200 |
| `turafood-admin` | 12 | compila y sirve |

### Scroll

Medido en el navegador, comparando el final del contenido contra el
borde superior de la barra inferior. En seis pantallas del cliente el
contenido termina **19 px por encima** de la barra. Nada queda tapado.

Las pantallas del repartidor dejan 108 px de margen inferior, contra
una barra de ~96 px.

---

## 3. Los tres fallos graves que se encontraron y se corrigieron

Estos merecen quedar escritos porque los tres compartían la misma
característica: **no fallaban visiblemente**.

### 3.1 Recursión infinita en las políticas RLS

**Síntoma:** `42P17: infinite recursion detected in policy for
relation "orders"`. Cinco tablas devolvían 500: `orders`,
`order_offers`, `order_items`, `payments`, `courier_locations`.

Con `orders` caído no funcionaba nada: ni el tablero del negocio, ni la
bolsa del repartidor, ni el historial del cliente, ni el checkout.

**Había dos ciclos, no uno.**

Primero:

```
courier_profiles → su política consulta orders
     orders      → su política llama is_active_courier()
                 → esa consulta courier_profiles otra vez
```

Segundo:

```
orders       → su política consulta order_offers
order_offers → su política consulta orders
```

`is_active_courier()` ya era `SECURITY DEFINER`, que en teoría se salta
RLS. Pero Postgres expande las políticas antes de resolver la llamada y
detecta el ciclo igual.

**La solución:** meter cada consulta cruzada dentro de una función con
`SET row_security = off` explícito. Una función es opaca para el
planificador de políticas, así que el ciclo no llega a formarse.

Se crearon cuatro:

| Función | Reemplaza a |
|---|---|
| `courier_shares_order(uuid)` | el `EXISTS` sobre `orders` en `courier_select` |
| `is_active_courier()` | se le añadió `row_security = off` |
| `has_live_offer(uuid)` | el `EXISTS` sobre `order_offers` en `orders_select` |
| `order_is_mine_as_business(uuid)` | el `EXISTS` sobre `orders` en `offers_select` |

Quién ve qué **no cambió**. Solo cambió cómo se pregunta.

**Para que no vuelva a pasar:** después del segundo ciclo construí el
grafo completo de qué política consulta qué tabla y busqué ciclos
automáticamente. Solo quedaba esa pareja. El resto de aristas apuntan a
`profiles`, que no apunta de vuelta a nadie.

### 3.2 Etiquetas de la consola desalineadas con la base

Tres mapas de `dash.turafood.com` tenían las claves **en español**, y
la base nunca produce esos valores:

| Columna | La consola esperaba | La base guarda |
|---|---|---|
| `vehicle_type` | `moto`, `bici`, `carro` | `motorcycle`, `bicycle`, `car` |
| `priority` | `alta`, `media`, `baja` | `urgent`, `high`, `normal`, `low` |
| `category` | `pedido`, `pago`, … | `orders`, `payouts`, `account`, … |

Con datos de maqueta se veía perfecto, porque la maqueta usaba las
mismas claves inventadas que la pantalla. Con datos reales **cada moto
habría salido sin etiqueta y cada ticket como "BAJA"**, sin error en
consola ni fallo visible.

Además, soporte mostraba tres estados de cinco: los tickets
`in_progress` y `resolved` no caían en ninguna pestaña. Invisibles.

Fue error de construir la consola desde los mockups en vez de desde el
esquema.

### 3.3 La transición de ruta podía dejar la pantalla invisible

`.route-fade` en la app del cliente animaba de opacidad 0 a 1 con
`animation-fill-mode: both`.

El reloj de una animación CSS **no avanza mientras el navegador no
pinta**. En una pestaña en segundo plano el elemento se queda en el
fotograma inicial: contenido cargado y completamente invisible.

Reproducido con `document.visibilityState` en `hidden`: animación en
estado `running` con `currentTime: 0`, opacidad computada 0, contenido
presente en el DOM.

Le pasaba a cualquiera que abriera un enlace de TuraFood en una pestaña
nueva de fondo.

**Ahora la animación solo mueve, no desvanece.** Lo peor que puede
pasar es que el contenido aparezca seis píxeles más abajo.

---

## 4. Lo construido, por app

### 4.1 `turafood.com` — el cliente

13 pantallas: inicio, listado por vertical, tienda, producto, carrito,
checkout, resultado de pago, seguimiento, chat, calificar, ofertas,
favoritos, cuenta, notificaciones, Tura Plus y ayuda.

**Checkout.** Es donde más carritos se caen, así que se trabajó a
fondo:

- Barra de pasos arriba: *Canasta · Confirmar · Pagar*. Tres y no
  cinco — más de tres deja de tranquilizar y empieza a dar pereza.
- **Cada cobro se explica al tocarlo.** El envío va completo para el
  repartidor. La tarifa de servicio es fija, no un porcentaje. Los
  precios los pone el negocio. La sospecha de que a uno le están
  metiendo plata de más es de lo que más hace abandonar un pedido, y
  contestarla antes de que la pregunten cuesta un renglón.
- **El botón dice qué falta** en vez de apagarse mudo. Si falta la
  dirección, dice "Falta tu dirección". Un botón muerto sin motivo es
  la peor pantalla posible: la persona toca, no pasa nada, y se va.

**La barra de canasta** pasó a verde con "Ir a comprar". El naranja
está en todos los botones de *agregar*, y esa barra no agrega nada: te
saca de la tienda para pagar. Un color distinto evita que se toque por
inercia.

**Las hojas ya no se tapan.** La barra de canasta y la barra inferior
se pisaban con el formulario de dirección, justo sobre los campos que
hay que llenar. Ahora se esconden cuando hay una hoja abierta,
detectándolo por el `role="dialog"` que todas ya tenían — así la
próxima hoja que se escriba no tiene que acordarse de avisar.

### 4.2 `app.turafood.com` — negocio y repartidor

**Panel del negocio (18 pantallas)**

| Sección | Estado |
|---|---|
| Resumen | Métricas del día |
| Pedidos en vivo | Kanban tipo comanda, cuatro columnas, Realtime |
| Historial | Tabla con **ticket completo al hacer clic** |
| Menú y productos | Multi-foto, menús de arranque por vertical |
| Promociones | Cuatro cifras arriba, incluida cuál jala más |
| Reportes | Gráficas de ritmo diario, semanal y por hora |
| Liquidaciones | Corte semanal con cuenta regresiva |
| Reseñas, horarios, sucursales, equipo, verificación, soporte | Funcionales |
| Tura Business Suite | Portada + Redes Sociales AI + Google Ads AI + Servicios |

**Reportes** responde tres preguntas que una tabla no respondía: si va
mejor que el periodo anterior (cada cifra compara contra los mismos
días previos), qué día rinde más, y a qué hora hace falta gente en
cocina. Las gráficas son SVG a mano — traer una librería de charting
para tres formas simples le costaría 90 KB a quien abre el panel con
datos del celular.

**El ticket del historial** responde la pregunta que trae a alguien a
esa pantalla: *"¿qué llevaba el #4788?"*. Panel lateral y no página
aparte porque se responde en diez segundos y después se quiere seguir
mirando la lista. Los totales se muestran **como los guardó la base**:
un pedido de hace tres meses tenía otra comisión y otra tarifa, y
recalcularlo hoy mostraría cifras que nunca existieron.

**App del repartidor (7 pantallas)**

- La oferta dura 20 segundos, con anillo de cuenta regresiva. Sin
  reloj, un pedido se queda "pensándose" mientras la comida se enfría
  en el mostrador.
- **Vencerse no cuenta como rechazo.** Bajarle la aceptación a alguien
  porque estaba entregando otro pedido sería castigarlo por trabajar.
- Entregas agrupadas por día con su total. Con dos meses de historial,
  una lista corrida obliga a sumar de a una.
- Documentos con vencimiento de SOAT y tecnomecánica: avisa 30 días
  antes. Enterarse el día que lo paran es la peor forma de enterarse.
  Un solo aviso, el más urgente — cuatro apilados se leen como ruido.

### 4.3 `dash.turafood.com` — la consola

12 pantallas: resumen, operación en vivo, aprobaciones, negocios,
repartidores, usuarios y roles, soporte, servicios, marketing, zonas y
tarifas, finanzas, acceso.

**Aprobar y rechazar pasan por funciones de la base** (`admin_*`),
nunca por un `UPDATE` desde el navegador: aprobar también tiene que
dejar quién aprobó y cuándo, y eso no se le confía al cliente.

**Rechazar sin motivo no se permite.** El motivo es lo único que le
deja al negocio corregir sin escribirle a soporte.

**El botón de ejecutar el corte de liquidaciones está apagado** a
propósito, mientras no exista la función que mueve la plata de verdad.
Un botón que parece que paga y no paga es la peor pantalla posible en
una sección de dinero.

---

## 5. Integración con MailerLite

Cuando se activa un plan, la base **solo anota** que hay que avisar. La
función `mailerlite-sync` drena esa cola aparte.

```
service_requests → 'active'
   └─ trigger → marketing_events (pendiente)
        └─ mailerlite-sync (cron cada 5 min)
             └─ MailerLite: crea el grupo si no existe, mete al contacto
```

**Por qué una cola y no una llamada directa:** si MailerLite está caído
o el token venció, la activación del plan no se cae con él. La
activación es lo que le importa al negocio; el correo puede esperar
cinco minutos.

Los grupos se resuelven **por nombre** y se crean si no existen
(`TuraFood · Ficha de Google · Activo`), así no hay que copiar
identificadores cada vez que se inventa un plan. El nombre se ve igual
en la tabla de Marketing y en MailerLite.

El token vive en los secrets de Supabase. **No está en el repositorio.**

> **Pendiente:** el token que se compartió por chat quedó expuesto.
> Hay que rotarlo en MailerLite y poner el nuevo con
> `supabase secrets set MAILERLITE_TOKEN=…`

---

## 6. Rendimiento

**Caché entre pantallas.** Cada pantalla consultaba al montar:
esqueleto, datos, pintado. Al volver atrás, lo mismo otra vez aunque
los datos fueran de hace ocho segundos. Ese parpadeo es lo que hace que
se sienta web y no aplicación.

Ahora la última respuesta de cada consulta queda en memoria: volver a
una pantalla la pinta de una y refresca detrás. Escribir algo bota lo
guardado, para que aceptar un pedido no lo deje apareciendo como
pendiente medio minuto más.

En memoria a propósito, no en `localStorage`: ahí traería datos de la
sesión anterior, y un negocio que cambió de dueño vería el catálogo del
anterior.

Cableado en 26 consultas de las tres apps.

**Esqueletos en vez de "Cargando…".** Trece pantallas mostraban un
texto centrado mientras esperaban. El salto de ese texto a una tabla
llena es justo el parpadeo que delata que es una web. Ahora sale un
esqueleto con la forma de lo que viene: la caja ya está donde va a
quedar, así que cuando llegan los datos no se mueve nada.

**Canales de Realtime.** El efecto que abre el canal es asíncrono, y
React monta, desmonta y vuelve a montar. La limpieza corría con el
`await` todavía pendiente, así que no quitaba nada; el segundo montaje
pedía un canal con el mismo nombre, Supabase devolvía el que ya estaba
suscrito, y agregarle un callback a un canal suscrito revienta. Ahora
hay bandera de cancelación y nombre único por suscripción, en las
cuatro suscripciones de las tres apps.

---

## 7. Cómo entrar

### Cuentas de correo

Contraseña de todas: `TuraFood2026!`

| App | Correo | Rol |
|---|---|---|
| `dash.turafood.com` · :3200 | `admin@turafood.com` | Super Admin |
| `app.turafood.com` · :3100 | `negocio@turafood.com` | Negocio |
| `app.turafood.com` · :3100 | `repartidor@turafood.com` | Repartidor |
| `turafood.com` · :3000 | `cliente@turafood.com` | Cliente |

Los cinco negocios de demostración también tienen cuenta:
`burger@`, `faro@`, `parrilla@`, `rosa@`, `jorge@turafood.com`.

### Acceso por celular

`supabase/seed-acceso-celular.sql` crea la cuenta **+57 302 688 6449**
con el número confirmado, su perfil y su rol.

Falta un paso que **no se puede hacer por SQL**:

```
Panel de Supabase
  → Authentication → Sign In / Providers → Phone
     · activar el proveedor
     · en "Test OTP", agregar:   +573026886449 = 123456
```

Con eso el código `123456` funciona siempre para ese número, sin mandar
ni pagar un solo SMS. Para números reales sí hacen falta las
credenciales de Twilio.

### Ojo con las sesiones en local

Las cookies **no distinguen puertos**. `localhost:3000`, `:3100` y
`:3200` son el mismo host para el navegador, así que entrar en una app
deja sesión iniciada en las tres. Si entras como cliente y luego abres
la consola, el proxy te manda a `/sin-acceso` — y tiene razón.

En producción no pasa, porque son tres subdominios distintos. Para
probar las tres a la vez en local, usa una ventana de incógnito por
cada una.

---

## 8. Lo que falta

### Antes de abrir al público

1. **Rotar el token de MailerLite** — quedó expuesto en el chat.
2. **Borrar las cuentas de prueba** — la contraseña está en claro en el
   repositorio. `seed-usuarios-prueba.sql` trae el bloque de borrado
   al final.
3. **Activar Google y Facebook** en Supabase Auth con las URLs de
   redirección de los tres dominios.
4. **Desplegar las Edge Functions** y programar el cron de
   `mailerlite-sync`.

### Construido pero no probado con datos reales

Estas pantallas están terminadas y compilan, pero nunca se han visto
con datos de la base. La recursión RLS las tuvo bloqueadas hasta hoy:

- Kanban de pedidos en vivo (negocio)
- Bolsa de pedidos y entrega en curso (repartidor)
- Operación en vivo (consola)
- Checkout completo de punta a punta
- Seguimiento del pedido (cliente)

**Es lo primero que hay que probar.** Un pedido de verdad, de punta a
punta: cliente pide → negocio acepta → repartidor toma → entrega.

### Funcionalidad incompleta, y la pantalla lo dice

- **Ejecutar el corte de liquidaciones** — botón apagado, falta la
  función que mueve la plata.
- **Comisiones por vertical y reglas de plataforma** (Zonas y tarifas)
  — los cambios se ven pero no se guardan; falta la tabla de
  configuración. La comisión real sigue siendo la de cada negocio en
  `business_profiles.commission_rate`.
- **Mapa de zonas** — dibujo aproximado; falta leer las coordenadas de
  `delivery_zones`.

### Sin empezar

- **Copy definitivo de Tura Business Suite** — la estructura está
  montada esperando el texto.
- **Conexión real de redes sociales** — la suite arma y previsualiza
  los posts, pero publicar todavía es manual. La pantalla lo dice.

---

## 9. Despliegue

Ver `DESPLIEGUE.md` para el detalle. Lo esencial:

| Aplicación | Ruta de build | Dominio |
|---|---|---|
| `turafood-cliente` | `/turafood-cliente` | `turafood.com` |
| `turafood-app` | `/turafood-app` | `app.turafood.com` |
| `turafood-admin` | `/turafood-admin` | `dash.turafood.com` |

Puerto 3000 en las tres. Tipo de build: **Dockerfile**.

**El error que más cuesta:** las variables `NEXT_PUBLIC_*` se incrustan
en el paquete de JavaScript **durante el build**, no al arrancar. En
EasyPanel van en **Build Arguments**, no solo en Environment. Si van
únicamente como variables de entorno, la aplicación arranca pero no ve
la base.

**La `service_role` key no entra a ninguna imagen de frontend.** Quien
tenga la imagen tendría acceso total a la base sin pasar por RLS. Solo
la usan las Edge Functions, que la reciben del entorno de Supabase.

---

## 10. Decisiones que conviene no deshacer sin pensarlo

**Nada del dinero se calcula en el navegador.** Totales, comisión y
neto los sella la base al crear el pedido (`place_order`). Las
pantallas solo leen y cambian estados. Si el frontend pudiera decidir
el precio, cualquiera con la consola abierta podría pedir gratis.

**Los totales de un pedido viejo se muestran como se guardaron.** Ese
pedido tenía otra comisión y otra tarifa de domicilio. Recalcularlo hoy
mostraría cifras que nunca existieron.

**Toda función que se llama desde una política RLS lleva
`row_security = off`.** Es lo que evita las recursiones de la sección
3.1. Si se agrega una política nueva que consulte otra tabla, hay que
meter esa consulta en una función así.

**Cada servicio que no está conectado lo dice en pantalla.** "Esto no
se conecta solo", "en cola" en vez de un acuse falso, "PRÓXIMAMENTE" en
los canales sin construir. Prometer de menos y cumplir es la única
forma de que un negocio confíe en la plataforma con su plata.
