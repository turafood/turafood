# Análisis del Proyecto TuraFood (Handover para Claude)

## 1. Resumen Técnico (Tech Stack)
- **Framework:** Next.js 16.3.1 (App Router)
- **Estado Global:** Zustand (estado persistido en `localStorage` para el carrito)
- **Backend/Auth/BD:** Supabase (`@supabase/ssr` y `@supabase/supabase-js`)
- **Estilos:** Vanilla CSS (altamente basado en estilos *inline* y `globals.css` con variables CSS).
- **Fuentes e Íconos:** Bricolage Grotesque, Plus Jakarta Sans, Google Material Symbols Rounded.
- **Pasarela de Pago:** ePayco Checkout integration script.

## 2. Lo que ya está construido (Funcionalidades Actuales)

- **Estructura y Layout (`/layout.js`, `DeviceContainer.js`, `BottomNav.js`):**
  - Layout general simulando una experiencia de App móvil nativa (Progressive Web App look) para escritorio y móvil.
- **Página de Inicio (`/home/page.js`):**
  - Buscador local (filtra en tiempo real los resultados cargados).
  - Listado de categorías ("verticales" como Restaurantes, Mercado, etc.).
  - Integración de lectura desde Supabase para la tabla `business_profiles` (con fallback a data mockeada).
- **Página de Restaurante (`/store/[id]/page.js`):**
  - Carga la información del negocio y su menú (`menu_items`).
  - Muestra un resumen flotante del carrito.
- **Modal de Personalización (`ProductModal.js`):**
  - Componente avanzado que permite elegir el tamaño y acompañamientos de un plato.
  - Calcula dinámicamente el precio total del producto según extras y actualiza el carrito.
- **Carrito de Compras (`/cart/page.js` y `useCartStore.js`):**
  - Implementado con Zustand. Restringe a los usuarios a comprar **de un solo restaurante a la vez**.
  - Permite modificar cantidades, limpiar el carrito, ver subtotales, e incorpora una sección de *Cross-selling* (Comprado frecuentemente).
- **Checkout (`/checkout/page.js`):**
  - Toggle de entrega (Domicilio o Recoger).
  - Opciones de propina y aplicación de cupones mockeados en la UI.
  - **Lógica de pago lista:** Valida si hay usuario autenticado. Crea un registro en la tabla `orders` en estado `PENDING` y levanta el popup modal de **ePayco** pasando el order_id como metadata para confirmación asíncrona.
- **Perfil y Cuenta (`/account/page.js`):**
  - Hace fetch a la tabla `profiles` vinculada al usuario de Supabase Auth.
  - Botón de cierre de sesión funcional y placeholders de navegación para Direcciones e Historial de Pedidos.

## 3. Lo que falta por implementar o mejorar (Tareas Pendientes)

1. **Base de Datos y RLS (Row Level Security):**
   - Asegurarse de que el esquema en Supabase esté totalmente creado con sus tablas: `profiles`, `business_profiles`, `menu_items`, `orders`.
   - Definir las políticas RLS para lectura pública de restaurantes y menús, y lectura/escritura privada de perfiles y órdenes.
2. **Supabase Edge Functions / Webhooks:**
   - Desarrollar la Edge Function (`/functions/v1/epayco-webhook`) para que Supabase reciba la confirmación exitosa de ePayco y cambie el status de la orden de `PENDING` a `PAID` o `FAILED`.
3. **Flujos Incompletos y Datos Hardcodeados:**
   - **Direcciones y Tarifas:** El costo de envío ($3.900) y la dirección ("Cra 3 # 4-45, Centro") están estáticos. Falta el CRUD completo de direcciones de usuario (`/account/addresses`) y cálculo dinámico por distancia u obispos geográficos.
   - **Búsqueda Global:** El buscador principal filtra sobre un array ya descargado, debería consultar la base de datos si el inventario crece.
   - **Mis Pedidos:** Faltan por terminar las vistas de historial y tracking (`/account/orders`, `/tracking`).
4. **Refactor de Estilos:**
   - Mucho uso intensivo de `style={{...}}`. Sería más escalable llevar estos componentes visuales a CSS Modules o implementar las clases utilitarias de Tailwind si Claude va a seguir agregando vistas complejas.
5. **Autenticación Completa (`/auth`):**
   - El código verifica `supabase.auth.getUser()`, pero hay que verificar/afinar la UI de login/registro para asegurar que se crean las entradas correctamente en la tabla `profiles` tras registrarse.
6. **Manejo de Assets e Imágenes:**
   - Las imágenes están apuntando a la carpeta `/public/images/`. Para un caso real, la creación de restaurantes desde un panel admin debería subir las imágenes a un bucket de *Supabase Storage* y usar URLs públicas.
7. **Página de IA (`/ai`):**
   - Existe el botón de "Tura IA" ✨, pero no se visualizó su funcionamiento completo o integración con un LLM en la exploración de archivos principales.
