// Vista previa local de la landing (servidor estático sencillo). El despliegue real es el Worker (wrangler deploy).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

createServer(async (req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.join(raiz, ruta);
  if (!archivo.startsWith(raiz)) { res.writeHead(403).end(); return; }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': tipos[path.extname(archivo)] ?? 'application/octet-stream' }).end(datos);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('No encontrado');
  }
}).listen(8790, () => console.log('Landing en http://localhost:8790'));
