const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_CLIENT = 'http://localhost:3000';
const BASE_ADMIN = 'https://app.turafood.com';
const OUT_DIR = path.join(__dirname, '..', 'screenshots');

const ROUTES = [
  { name: '01-inicio', path: `${BASE_CLIENT}/` },
  { name: '02-ofertas', path: `${BASE_CLIENT}/offers` },
  { name: '03-favoritos', path: `${BASE_CLIENT}/favorites` },
  { name: '04-checkout', path: `${BASE_CLIENT}/checkout` },
  { name: '05-cuenta', path: `${BASE_CLIENT}/account` },
  { name: '06-tienda-menu', path: `${BASE_CLIENT}/store/b0000000-0000-4000-8000-000000000003` },
  { name: '07-landing-comercial', path: `${BASE_CLIENT}/landing` },
  { name: '08-app-turafood-admin', path: `${BASE_ADMIN}` },
];

async function capture() {
  const deskDir = path.join(OUT_DIR, 'desktop');
  const mobDir = path.join(OUT_DIR, 'mobile');
  fs.mkdirSync(deskDir, { recursive: true });
  fs.mkdirSync(mobDir, { recursive: true });

  console.log('Iniciando captura con Chrome en:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // 1. CAPTURA ESCRITORIO
  console.log('\n--- CAPTURANDO PANTALLAS ESCRITORIO (1280x900) ---');
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  for (const r of ROUTES) {
    try {
      console.log(`[Desktop] Navegando a ${r.name}: ${r.path}`);
      await page.goto(r.path, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise((res) => setTimeout(res, 1200));
      const outFile = path.join(deskDir, `${r.name}.png`);
      await page.screenshot({ path: outFile, fullPage: true });
      console.log(`  -> Guardado: ${outFile}`);
    } catch (err) {
      console.error(`  -> Error en ${r.name}:`, err.message);
    }
  }

  // 2. CAPTURA MÓVIL (Mobile-First 390x844 - iPhone 14 / PWA)
  console.log('\n--- CAPTURANDO PANTALLAS MÓVIL (390x844 PWA) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  for (const r of ROUTES) {
    try {
      console.log(`[Mobile] Navegando a ${r.name}: ${r.path}`);
      await page.goto(r.path, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise((res) => setTimeout(res, 1200));
      const outFile = path.join(mobDir, `${r.name}.png`);
      await page.screenshot({ path: outFile, fullPage: true });
      console.log(`  -> Guardado: ${outFile}`);
    } catch (err) {
      console.error(`  -> Error en ${r.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('\n¡Capturas completadas exitosamente en:', OUT_DIR);
}

capture().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
