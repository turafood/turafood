import RiderShell from './RiderShell';

/**
 * En celular esto no hace nada: el armazón ya es la columna.
 *
 * En escritorio `rider-root` lo vuelve una fila, para que la barra
 * lateral y el contenido queden lado a lado. Es solo el contenedor;
 * quién se ve y cuándo lo decide globals.css.
 */
export default function RepartidorLayout({ children }) {
  return (
    <div className="rider-root">
      <RiderShell>{children}</RiderShell>
    </div>
  );
}
