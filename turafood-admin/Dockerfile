# ============================================================
# TURAFOOD — dash.turafood.com (consola de administración)
#
# Build en tres etapas para que la imagen final sea pequeña:
# solo lleva el servidor standalone y los archivos públicos,
# no el código fuente ni las dependencias de desarrollo.
#
# EasyPanel: tipo "Dockerfile", ruta de build /turafood-admin
# ============================================================

FROM node:22-alpine AS deps
WORKDIR /app
# libc6-compat lo necesita sharp (optimización de imágenes) en Alpine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci


FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Las variables NEXT_PUBLIC_ se incrustan en el bundle durante el build,
# así que tienen que estar presentes AQUÍ, no solo en tiempo de
# ejecución. En EasyPanel se pasan como build args.
#
# Solo la anon key. La service_role NUNCA entra a una imagen de
# frontend: quien tenga la imagen tendría acceso total a la base.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios: si alguien logra ejecutar código en el
# contenedor, no lo hace como root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
