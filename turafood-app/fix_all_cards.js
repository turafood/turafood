const fs = require('fs');
const files = [
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/horarios/page.js',
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/promociones/page.js',
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/sucursales/page.js',
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/resenas/page.js',
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/catalogo/page.js',
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/historial/page.js',
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/equipo/page.js',
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/pagos/page.js',
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/liquidaciones/page.js',
  'c:/Users/sophi/Downloads/Turafood/turafood-app/src/app/negocio/reportes/page.js'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Very safe specific replacements for the card styles
    content = content.replace(/background: 'rgba\\(18,\\s*18,\\s*18,\\s*0\\.65\\)'/g, "background: 'var(--surface)'");
    content = content.replace(/background: 'rgba\\(18,18,18,0\\.65\\)'/g, "background: 'var(--surface)'");
    content = content.replace(/background: 'rgba\\(24,\\s*24,\\s*24,\\s*0\\.7\\)'/g, "background: 'var(--surface)'");
    content = content.replace(/background: 'rgba\\(24,24,24,0\\.7\\)'/g, "background: 'var(--surface)'");
    
    // Remove blur on cards
    content = content.replace(/backdropFilter: 'blur\\(30px\\)', WebkitBackdropFilter: 'blur\\(30px\\)',\\s*/g, '');
    content = content.replace(/backdropFilter: 'blur\\(20px\\)', WebkitBackdropFilter: 'blur\\(20px\\)',\\s*/g, '');
    
    // Safely replace card colors, avoiding replacing #fff globally if possible
    content = content.replace(/border: '1px solid rgba\\(255,255,255,0\\.06\\)'/g, "border: '1px solid var(--border)'");
    content = content.replace(/border: '1px solid rgba\\(255,255,255,0\\.08\\)'/g, "border: '1px solid var(--border)'");
    content = content.replace(/boxShadow: '0 20px 50px rgba\\(0,0,0,0\\.3\\), inset 0 1px 0 rgba\\(255,255,255,0\\.05\\)'/g, "boxShadow: 'var(--shadow)'");
    content = content.replace(/boxShadow: '0 8px 24px rgba\\(0,0,0,0\\.3\\)'/g, "boxShadow: 'var(--shadow)'");

    // Common text colors
    content = content.replace(/color: 'rgba\\(255,255,255,0\\.5\\)'/g, "color: 'var(--muted)'");
    content = content.replace(/color: 'rgba\\(255,255,255,0\\.6\\)'/g, "color: 'var(--muted)'");
    content = content.replace(/color: '#fff'/g, "color: 'var(--text)'");

    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
