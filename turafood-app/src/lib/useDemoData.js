/**
 * HOOK DE DEMOSTRACIÓN (SEED)
 * 
 * Este hook provee datos simulados (mock data) extremadamente visuales
 * para llenar las secciones vacías (Reportes, Liquidaciones, Historial, etc.)
 * y permitir que la app se vea siempre "viva" y con métricas espectaculares.
 * 
 * Uso:
 * const demo = useDemoData();
 * console.log(demo.reportes.ventasMensuales);
 */

import { useState, useEffect } from 'react';

export function useDemoData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Simulamos un retraso de red para que parezca real
    const timer = setTimeout(() => {
      setData({
        reportes: {
          ingresosMensuales: 12450000,
          crecimiento: '+15.4%',
          pedidosTotales: 342,
          ticketPromedio: 36400,
          graficaVentas: [
            { dia: 'Lun', ventas: 1200000 },
            { dia: 'Mar', ventas: 950000 },
            { dia: 'Mie', ventas: 1400000 },
            { dia: 'Jue', ventas: 1800000 },
            { dia: 'Vie', ventas: 2500000 },
            { dia: 'Sab', ventas: 3100000 },
            { dia: 'Dom', ventas: 2800000 },
          ],
          platosEstrella: [
            { nombre: 'Hamburguesa Doble Carne', cantidad: 84, ingresos: 2100000 },
            { nombre: 'Perro Caliente Especial', cantidad: 65, ingresos: 975000 },
            { nombre: 'Salchipapa Sencilla', cantidad: 120, ingresos: 1440000 },
          ]
        },
        liquidaciones: {
          saldoDisponible: 850000,
          proximoPago: '2026-08-25',
          historial: [
            { id: 'LQ-001', fecha: '2026-08-18', monto: 1200000, estado: 'pagado' },
            { id: 'LQ-002', fecha: '2026-08-11', monto: 950000, estado: 'pagado' },
            { id: 'LQ-003', fecha: '2026-08-04', monto: 1100000, estado: 'pagado' },
          ]
        },
        resenas: {
          promedio: 4.8,
          total: 124,
          destacadas: [
            { cliente: 'Carlos M.', calificacion: 5, comentario: 'Excelente servicio y la comida llegó caliente. Muy recomendado.', fecha: 'Hace 2 horas' },
            { cliente: 'Ana Gómez', calificacion: 5, comentario: 'Las mejores hamburguesas de la zona, sin duda.', fecha: 'Ayer' },
            { cliente: 'Luis F.', calificacion: 4, comentario: 'Muy rico todo, aunque el pedido se demoró 5 minutos más de lo esperado.', fecha: 'Hace 3 días' }
          ]
        },
        crecimiento: {
          visitasPerfil: 1205,
          conversionRate: '28.5%',
          nuevosClientes: 45,
          clientesRecurrentes: 79
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return {
    cargando: !data,
    datos: data || {}
  };
}
