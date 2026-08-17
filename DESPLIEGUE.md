# Despliegue de TuraFood

GitHub → EasyPanel con Docker. Las claves reales las pegas tú en cada
panel; este documento solo dice **qué va dónde**.

---

## 1. Base de datos (primero que todo)

Nada funciona hasta aplicar el esquema.

```bash
supabase login
```

```bash
supabase link --project-ref btaddjjzpvyqltkchqki
```

```bash
supabase db push
```

Aplica las cuatro migraciones en orden:

| Archivo | Qué hace |
|---|---|
| `20260816000000_schema.sql` | Tablas, `place_order()`, comisiones por vertical |
| `20260816000001_rls.sql` | Políticas RLS y aprobación de negocios |
| `20260816000002_referrals.sql` | Códigos de invitación y referidos |
| `20260816000003_payouts.sql` | Comisión recurrente y retiros de afiliados |

Si prefieres sin CLI: pega cada archivo en el SQL Editor, **en ese orden**.

> No ejecutes nada de `turafood-supabase/_deprecated/`: son los SQL
> viejos que se contradecían entre sí.

Después, el webhook de pagos:

```bash
supabase secrets set EPAYCO_P_CUST_ID_CLIENTE=1571094 EPAYCO_P_KEY=<tu P_KEY>
```

```bash
supabase functions deploy epayco-webhook
```

---

## 2. Subir a GitHub

```bash
git remote set-url origin https://github.com/turafood/turafood.git
```

```bash
git add -A && git commit -m "feat: app de usuario final completa con Docker"
```

```bash
git push -u origin master
```

> El `.gitignore` ya excluye `node_modules`, `.next`, `.env*`,
> `_assets-originales/` (67 MB de imágenes sin optimizar) y la carpeta
> de mockups. El repo queda liviano.

---

## 3. Servicios en EasyPanel

Son cuatro apps independientes. Cada una es su propio servicio: mismo
repo, distinta carpeta de build.

| Servicio | Build context | Dominio sugerido |
|---|---|---|
| Cliente | `turafood-cliente` | `turafood.com` |
| Negocios | `turafood-negocio` | `negocios.turafood.com` |
| Super Admin | `turafood-admin` | `admin.turafood.com` |
| Repartidor | `turafood-repartidor` | `repartidor.turafood.com` |

En cada servicio:

- **Source**: GitHub → `turafood/turafood`, rama `master`
- **Build method**: Dockerfile
- **Build context / path**: la carpeta de la tabla
- **Dockerfile path**: `Dockerfile`
- **Puerto**: `3000`

---

## 4. Variables de entorno

### Importante: van como BUILD ARGS, no solo como env

Todo lo que empieza con `NEXT_PUBLIC_` se **incrusta en el bundle
durante el build**. Si solo las pones como variables de ejecución, la
app compila sin ellas y sale a producción usando datos de demo.

En EasyPanel hay que ponerlas en **Environment** y marcarlas también
como argumentos de build.

### Las cuatro apps

```
NEXT_PUBLIC_SUPABASE_URL=https://btaddjjzpvyqltkchqki.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu sb_publishable_...>
```

### Solo el cliente

```
NEXT_PUBLIC_EPAYCO_KEY=<PUBLIC_KEY de ePayco>
NEXT_PUBLIC_EPAYCO_TEST=false
NEXT_PUBLIC_BASE_URL=https://turafood.com
```

> `NEXT_PUBLIC_EPAYCO_TEST=false` activa cobros reales. Déjalo en `true`
> mientras pruebas.

---

## 5. Qué NO poner en las apps

**`SUPABASE_SERVICE_ROLE_KEY` (o `sb_secret_`) no va en ninguna app de
Next.** Salta todas las políticas RLS; si se filtra, cualquiera lee y
escribe la base completa. Ninguna de las cuatro la necesita.

**Las llaves privadas de ePayco tampoco.** `P_KEY` valida la firma del
pago: si está del lado del navegador, se puede falsificar una
confirmación de pago aprobado.

Regla corta: lo que lleva `NEXT_PUBLIC_` es visible en el navegador. Si
un valor no puede ser público, no lleva ese prefijo y casi seguro no va
en una app de Next.

---

## 6. Verificación después de desplegar

1. Abre el cliente: si lista tus negocios reales, conectó. Si ves
   "Asadero El Puerto" y compañía, faltan las variables y está corriendo
   con datos de demo.
2. Aprueba un negocio en el Super Admin: debe aparecer de inmediato en
   la app cliente.
3. Haz un pedido y confirma en la tabla `orders` que el `total` lo puso
   el servidor.
4. Paga con ePayco en modo prueba y verifica que `payment_status` pase
   a `paid`.

---

## 7. Notas de rendimiento

Las imágenes se optimizaron de **66,33 MB a 1,71 MB** (−97,4%). Los
originales quedaron fuera del repo, en `_assets-originales/`.

Si agregas fotos nuevas:

```bash
cd turafood-cliente && node scripts/optimize-images.mjs public/images
```

Los cuatro Dockerfile usan `output: 'standalone'`, así que la imagen
final lleva solo el servidor y los estáticos (~150 MB en vez de ~1 GB).
