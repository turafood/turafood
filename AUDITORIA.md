# TuraFood — Auditoría del MVP

**19 de agosto de 2026** · Verificado contra la base de producción
(`btaddjjzpvyqltkchqki`), no leyendo código.

---

## Resumen en una línea

**El MVP está listo para testear.** Los tres dominios funcionan, la plata
cuadra al peso y los tres roles se ven el mismo pedido. Quedan cuatro
cosas de infraestructura que no son código.

---

## Lo que existe

| | Pantallas | Archivos | Líneas |
|---|---|---|---|
| `turafood.com` — cliente | 21 | 57 | 12.712 |
| `app.turafood.com` — negocio + repartidor | 35 | 76 | 20.647 |
| `dash.turafood.com` — consola | 13 | 23 | 4.958 |
| **Total** | **69** | **156** | **38.317** |

Base de datos: 40 tablas, 19 funciones RPC, 24 migraciones, 2 Edge Functions.

---

## Verificado funcionando

### El ciclo completo de un pedido

Se hizo de verdad, con los cuatro roles, de punta a punta:

1. Cliente **sin cuenta** guarda dirección y pide a domicilio
2. Negocio lo ve en su tablero, lo acepta y lo pasa a *listo*
3. Repartidor lo toma, lo recoge y lo entrega con código
4. Admin ve cada cambio de estado en vivo

### La plata cuadra al peso

Pedido TS-4826, comprobado columna por columna:

```
subtotal            $48.900
+ domicilio         $ 3.900
+ servicio          $ 1.900
= total             $54.700   ✓

negocio recibe      $40.098
+ comisión (18%)    $ 8.802
= subtotal          $48.900   ✓

repartidor          $ 3.900   (domicilio + propina)
plataforma          $10.702   (comisión + servicio)
```

### Comprar sin registrarse

Funciona de principio a fin. No queda un solo muro de "inicia sesión"
en el camino de compra.

### Las tres consolas

Las 10 secciones del admin cargan con datos reales. Las 21 pantallas del
cliente y las 35 de la app renderizan. Las rutas protegidas redirigen a
`/entrar` como deben.

---

## Lo que se arregló en esta auditoría

### 🔴 El repartidor entregaba gratis

`courier_earnings` no se escribía en ningún lado — se declaraba con
`DEFAULT 0` y solo se leía. Entregaba, se le sumaba 0 al historial, y no
tenía qué retirar. El domicilio que paga el cliente no llegaba a nadie.

### 🔴 Cada uno podía firmarse su propio cheque

Cuatro columnas de plata quedaron fuera del guard. **Comprobado
explotándolas**, no deduciéndolo:

| Columna | Quién la escribía | Puso |
|---|---|---|
| `courier_earnings` | el repartidor | 999.999 |
| `restaurant_amount` | el negocio | 777.777 |
| `commission_percentage` | el negocio | 777.777 |
| `payment_processing_cost` | el negocio | 777.777 |

Las cuatro pasaron. Con `request_payout` de por medio, eso es retirar
plata que nunca se ganó. Los cuatro ataques se repitieron después del
arreglo: los cuatro rebotan.

### 🔴 ePayco nunca habría confirmado un pago

El webhook exigía JWT. ePayco llama desde sus servidores y no puede
mandar uno, así que respondía 401 a cada confirmación. Ahora
`verify_jwt = false`; la firma SHA-256 sigue siendo la llave.

### 🟠 El tablero de comandas salía vacío

`sembrar_pedidos_demo()` no mandaba `order_items.subtotal`, que es NOT
NULL. Un negocio **con** menú reventaba y no recibía ni una comanda; uno
**sin** menú recibía cuatro vacías en $0. Sobrevivió porque los `catch {}`
de la entrada eran mudos.

### 🟠 Dos pantallas del admin en blanco

`courier_profiles` tiene dos llaves foráneas a `profiles`, y PostgREST no
sabía cuál usar. Como las consultas van en `Promise.all`, esa sola falla
dejaba la pantalla entera sin datos.

Peor que el bug: **las nueve pantallas de la consola escondían sus
errores.** Hacían `if (!datos) return <Skeleton/>` antes de pintar el
aviso, así que una carga fallida se veía como un esqueleto eterno.

### 🟡 La app cliente repintaba la página entera

El carrito se rehidrataba desde el navegador antes del primer render, y
React descartaba todo el HTML del servidor. Además la raíz redirigía con
JavaScript, y ocho pantallas salían a la red solo para preguntar "¿quién
soy?".

---

## Lo que falta

### Bloqueante (4 cosas, ninguna es código)

| | Qué | Dónde |
|---|---|---|
| 1 | Desplegar `mailerlite-sync` (hoy da 404) | `supabase functions deploy` |
| 2 | Redesplegar `epayco-webhook` con la config nueva | `supabase functions deploy` |
| 3 | Cargar los 4 secretos de las Edge Functions | Supabase → Secrets |
| 4 | Registrar la URL de confirmación en ePayco | panel de ePayco |

**Rotar MailerLite y Twilio** — siguen expuestos desde que se pegaron en
el chat. No es opcional.

### Antes de abrir al público

- Correr `limpiar-datos-de-prueba.sql`: hay **11 negocios de prueba**
  contra 6 reales, y tapan lo de verdad en la consola
- Borrar las 4 cuentas de prueba
- Definir el correo de confirmación (hoy usa el remitente de Supabase,
  que está limitado por tasa)
- Activar Facebook como proveedor
- Configurar el Messaging Service de Twilio para SMS

### Decisión pendiente

El reparto del domicilio. Hoy: **todo el domicilio + toda la propina son
del repartidor**. Se dedujo de que `platform_revenue` ya excluía ambos a
propósito. Está en una sola línea marcada dentro de
`20260818000006_pago_repartidor.sql`.

---

## Lo que se podría construir

Nada de esto bloquea el MVP.

**Cerca de estar listo**
- Ejecutar el corte de liquidación desde el admin (hoy el botón está,
  la lógica no)
- Exportar CSV de finanzas
- Notificaciones push
- El mapa real de zonas (los datos están en `delivery_zones`, falta
  dibujarlo)

**Siguiente vuelta**
- Programar pedidos para más tarde
- Seguimiento del repartidor en vivo en el mapa del cliente
- Chat cliente ↔ repartidor con notificación
- Reportes con comparación contra el mes anterior
- Multi-sucursal de verdad

**Cuando haya volumen**
- Asignación automática de repartidor por cercanía
- Precios dinámicos por demanda
- Panel de métricas para el negocio con recomendaciones de la IA

---

## Lo que NO se pudo verificar

Para ser honestos sobre los límites de esta auditoría:

- **El cobro real con ePayco.** Se verificó que el webhook valida firma y
  que ya no rechaza por JWT, pero no se hizo una transacción real
- **El envío de SMS.** Twilio no está configurado
- **MailerLite.** La función no está desplegada
- **Carga con muchos usuarios.** La base tiene 10 pedidos, no 10.000

---

*Auditoría hecha ejecutando pedidos, entregas y ataques reales contra la
base de producción. Los bugs de plata no se encuentran leyendo código.*
