/**
 * ¿Es el sitio de demostración (demo.turafood.com)?
 *
 * El mismo código de app.turafood.com se compila una segunda vez con
 * NEXT_PUBLIC_DEMO=1 y SIN credenciales de Supabase: no puede leer ni escribir
 * datos reales de nadie. Todo lo que se ve es de ejemplo y está rotulado así.
 * El panel de producción (app.turafood.com) queda solo para negocios inscritos.
 */
export const ES_DEMO = process.env.NEXT_PUBLIC_DEMO === '1';

/** "Go live": el alta real (nombre, celular y correo) vive en app.turafood.com */
export const URL_GO_LIVE = 'https://app.turafood.com/empezar';

/** Negocio ficticio con el que arranca el demo */
export const NEGOCIO_DEMO = {
  id: 'demo',
  name: 'Cevichería Demo',
  is_open: true,
  address: 'Calle 2 #5-10, Buenaventura',
  menu_listo: true,
  horarios_listos: true,
};
