/**
 * Optimiza las imágenes de public/images.
 *
 * Los originales pesan hasta 20 MB porque vienen de banco de imágenes a
 * resolución completa. En la app nunca se muestran a más de ~880px de
 * ancho (el marco es de 440px, x2 para pantallas retina), así que
 * redimensionar no pierde calidad visible y baja el peso ~99%.
 *
 * Guarda los originales en public/images/_originales/ por si acaso.
 */
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync, copyFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('Uso: node optimize-images.mjs <carpeta>');
  process.exit(1);
}

const backup = join(dir, '_originales');
if (!existsSync(backup)) mkdirSync(backup, { recursive: true });

const MAX_PHOTO = 1200;  // fotos de comida / portadas
const MAX_ICON = 512;    // iconos 3D

const mb = (n) => (n / 1048576).toFixed(2);

const files = readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f));

let before = 0;
let after = 0;
const rows = [];

for (const file of files) {
  const src = join(dir, file);
  if (statSync(src).isDirectory()) continue;

  const sizeBefore = statSync(src).size;
  before += sizeBefore;

  // Guardar original una sola vez
  const kept = join(backup, file);
  if (!existsSync(kept)) copyFileSync(src, kept);

  const isIcon = file.startsWith('ic-') || file.startsWith('flag-');
  const max = isIcon ? MAX_ICON : MAX_PHOTO;
  const ext = extname(file).toLowerCase();

  const pipeline = sharp(kept).resize({
    width: max,
    height: max,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const out = ext === '.png'
    ? await pipeline.png({ quality: 82, compressionLevel: 9, palette: true }).toBuffer()
    : await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();

  const { writeFileSync } = await import('node:fs');
  writeFileSync(src, out);

  const sizeAfter = out.length;
  after += sizeAfter;

  if (sizeBefore > sizeAfter * 1.2) {
    rows.push(`  ${basename(file).padEnd(26)} ${mb(sizeBefore).padStart(7)} MB → ${mb(sizeAfter).padStart(6)} MB`);
  }
}

console.log(rows.join('\n'));
console.log('  ' + '-'.repeat(52));
console.log(`  TOTAL${' '.repeat(21)} ${mb(before).padStart(7)} MB → ${mb(after).padStart(6)} MB`);
console.log(`  Reducción: ${(100 - (after / before) * 100).toFixed(1)}%`);
