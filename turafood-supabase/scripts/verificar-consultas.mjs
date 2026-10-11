#!/usr/bin/env node
/**
 * TURAFOOD — ¿LAS CONSULTAS DEL CÓDIGO COINCIDEN CON LA BASE REAL?
 *
 * Extrae cada `.from('tabla').select('...')` de las tres apps y la prueba contra
 * Supabase. Una columna que no existe (o una relación mal escrita) hace que
 * PostgREST responda 400, y la app lo "esconde" cayendo a datos de respaldo: así
 * estuvo meses fallando la consulta de pedidos (`nequi_phone` no existe).
 *
 *   node turafood-supabase/scripts/verificar-consultas.mjs
 *
 * Usa una sesión anónima desechable y `limit=0` (no lee ni escribe datos).
 * Sale con código 1 si alguna consulta falla.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..', '..');
const env = readFileSync(path.join(raiz, 'turafood-app', '.env.local'), 'utf8');
const URL_ = process.env.SUPABASE_URL || env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)[1].trim();
const KEY = process.env.SUPABASE_ANON_KEY || env.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)$/m)[1].trim();

function archivos(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (['node_modules', '.next', '.open-next'].includes(e)) continue;
    const p = path.join(dir, e);
    statSync(p).isDirectory() ? archivos(p, out) : /\.(js|jsx|mjs)$/.test(e) && out.push(p);
  }
  return out;
}

// from('tabla') ... .select('texto')  — tolera saltos de línea entre ambos y comillas ' " `
const RE = /\.from\(\s*['"`](\w+)['"`]\s*\)\s*(?:\.[a-z_]+\([^)]*\)\s*)*?\.select\(\s*(['"`])([\s\S]*?)\2\s*[,)]/g;
const consultas = new Map();   // "tabla|select" -> [archivos]
for (const app of ['turafood-cliente', 'turafood-app', 'turafood-admin']) {
  for (const f of archivos(path.join(raiz, app, 'src'))) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(RE)) {
      const tabla = m[1];
      const sel = m[3].replace(/\s+/g, ' ').trim();
      if (!sel || sel.includes('${')) continue;                 // dinámicas: no se pueden probar
      const k = `${tabla}|${sel}`;
      if (!consultas.has(k)) consultas.set(k, []);
      consultas.get(k).push(path.relative(raiz, f).replace(/\\/g, '/'));
    }
  }
}

const s = await (await fetch(`${URL_}/auth/v1/signup`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: '{}' })).json();
const h = { apikey: KEY, Authorization: `Bearer ${s.access_token}` };

let malas = 0;
console.log(`\nProbando ${consultas.size} consultas distintas...\n`);
for (const [k, fuentes] of consultas) {
  const [tabla, sel] = k.split('|');
  const r = await fetch(`${URL_}/rest/v1/${tabla}?select=${encodeURIComponent(sel)}&limit=0`, { headers: h });
  if (r.status === 200 || r.status === 206) continue;
  let msg = '';
  try { msg = (await r.json()).message; } catch { /* sin cuerpo */ }
  // 401/403 = permiso (la tabla existe y las columnas no se validaron): no es un error de esquema
  if (r.status === 401 || r.status === 403) continue;
  malas++;
  console.log(`  FALLA  ${tabla}  select(${sel.length > 90 ? sel.slice(0, 90) + '…' : sel})`);
  console.log(`         HTTP ${r.status}: ${msg}`);
  console.log(`         en: ${[...new Set(fuentes)].join(', ')}\n`);
}
console.log(malas === 0 ? 'TODO BIEN: todas las consultas coinciden con la base.\n' : `HAY ${malas} CONSULTA(S) QUE NO COINCIDEN CON LA BASE.\n`);
process.exit(malas === 0 ? 0 : 1);
