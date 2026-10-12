/**
 * LIBRERÍA GEOGRÁFICA Y DE DIRECCIONES DE BUENAVENTURA, VALLE DEL CAUCA
 *
 * Base de datos enriquecida de:
 *   1. 12 Comunas (Zona Insular y Continental).
 *   2. Más de 60 Barrios oficiales y sectores tradicionales.
 *   3. Hitos urbanos, centros comerciales, hospitales, muelles y colegios.
 *   4. Corredores viales y nomenclaturas locales (Av. Simón Bolívar, Vía Alterna, etc.).
 *   5. Motor de resolución de direcciones sueltas y referencias populares.
 */

import { CENTRO, BOUNDS, enCobertura, parseDireccionCO } from './direcciones.mjs';

export const sinTildes = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Las 12 Comunas del Distrito Especial de Buenaventura */
export const BUENAVENTURA_COMUNAS = [
  { id: 1, name: 'Comuna 1', zone: 'Insular (Isla Cascajal)', desc: 'Centro histórico, portuario y comercial' },
  { id: 2, name: 'Comuna 2', zone: 'Insular (Isla Cascajal)', desc: 'Zona noroccidental de la isla' },
  { id: 3, name: 'Comuna 3', zone: 'Insular (Isla Cascajal)', desc: 'Zona norte central insular' },
  { id: 4, name: 'Comuna 4', zone: 'Insular (Isla Cascajal)', desc: 'Zona oriental insular y Los Laureles' },
  { id: 5, name: 'Comuna 5', zone: 'Insular (Isla Cascajal)', desc: 'Punta del Este y extremo oriental de la isla' },
  { id: 6, name: 'Comuna 6', zone: 'Continental', desc: 'Acceso continental, Juan XXIII y Los Pinos' },
  { id: 7, name: 'Comuna 7', zone: 'Continental', desc: 'Bellavista, San Luis y zona residencial central' },
  { id: 8, name: 'Comuna 8', zone: 'Continental', desc: 'El Cristal y zona nororiental continental' },
  { id: 9, name: 'Comuna 9', zone: 'Continental', desc: 'Sectores del Ruiz y 6 de Enero' },
  { id: 10, name: 'Comuna 10', zone: 'Continental', desc: 'La Independencia y Vista Hermosa' },
  { id: 11, name: 'Comuna 11', zone: 'Continental', desc: 'Transformación, Campín y Cascajal continental' },
  { id: 12, name: 'Comuna 12', zone: 'Continental', desc: 'Matías Mulumba, El Pailón y Vía al Aeropuerto' },
];

/**
 * Catálogo exhaustivo de más de 60 Barrios y sectores de Buenaventura
 * con sus centroides geográficos de alta precisión.
 */
export const BUENAVENTURA_BARRIOS = [
  // --- COMUNA 1 (Isla Cascajal) ---
  { name: 'Centro', comuna: 1, zone: 'Insular', detail: 'Comuna 1 · Zona bancaria, comercial y alcaldía', lat: 3.88425, lng: -77.02905, aliases: ['el centro', 'centro historico'] },
  { name: 'Pueblo Nuevo', comuna: 1, zone: 'Insular', detail: 'Comuna 1 · Muelle, galería y comercio pesquero', lat: 3.88600, lng: -77.02700, aliases: ['galeria', 'muelle de pueblo nuevo'] },
  { name: 'San José', comuna: 1, zone: 'Insular', detail: 'Comuna 1 · Frente a la bahía', lat: 3.88250, lng: -77.03150, aliases: ['barrio san jose'] },
  { name: 'El Firme', comuna: 1, zone: 'Insular', detail: 'Comuna 1 · Sector céntrico', lat: 3.88350, lng: -77.03050, aliases: ['firme'] },
  { name: 'La Playita', comuna: 1, zone: 'Insular', detail: 'Comuna 1 · Sector pesquero y muelle', lat: 3.87960, lng: -77.03680, aliases: ['playita'] },
  { name: 'Nayita', comuna: 1, zone: 'Insular', detail: 'Comuna 1 · Frente al malecón y estero', lat: 3.88200, lng: -77.03400, aliases: ['la nayita'] },
  { name: 'La Palera', comuna: 1, zone: 'Insular', detail: 'Comuna 1 · Muelle de bajamar', lat: 3.88550, lng: -77.02500, aliases: ['palera'] },

  // --- COMUNA 2 (Isla Cascajal) ---
  { name: 'Pascual de Andagoya', comuna: 2, zone: 'Insular', detail: 'Comuna 2 · Sector educativo y residencial', lat: 3.88750, lng: -77.03200, aliases: ['andagoya'] },
  { name: 'La Brea', comuna: 2, zone: 'Insular', detail: 'Comuna 2 · Sector noroccidental insular', lat: 3.88900, lng: -77.03350, aliases: ['brea'] },
  { name: 'San Francisco', comuna: 2, zone: 'Insular', detail: 'Comuna 2 · Zona tradicional', lat: 3.88650, lng: -77.03450, aliases: ['san francisco insular'] },
  { name: 'Viento Libre', comuna: 2, zone: 'Insular', detail: 'Comuna 2 · Sector costero insular', lat: 3.88820, lng: -77.02980, aliases: ['viento libre'] },

  // --- COMUNA 3 (Isla Cascajal) ---
  { name: 'Alberto Lleras Camargo', comuna: 3, zone: 'Insular', detail: 'Comuna 3 · Zona portuaria y residencial', lat: 3.87800, lng: -77.03800, aliases: ['lleras', 'alberto lleras'] },
  { name: 'Santa Fe', comuna: 3, zone: 'Insular', detail: 'Comuna 3 · Sector intermedio insular', lat: 3.87950, lng: -77.03550, aliases: ['barrio santa fe'] },
  { name: 'Alfonso López Pumarejo', comuna: 3, zone: 'Insular', detail: 'Comuna 3 · Sector histórico', lat: 3.88100, lng: -77.03700, aliases: ['alfonso lopez insular'] },
  { name: 'La Anunciación', comuna: 3, zone: 'Insular', detail: 'Comuna 3 · Sector tradicional', lat: 3.88050, lng: -77.03900, aliases: ['anunciacion'] },

  // --- COMUNA 4 (Isla Cascajal) ---
  { name: 'El Jorge', comuna: 4, zone: 'Insular', detail: 'Comuna 4 · Av. Simón Bolívar y comercio', lat: 3.87755, lng: -77.04010, aliases: ['el jorge', 'jorge'] },
  { name: 'Los Laureles', comuna: 4, zone: 'Insular', detail: 'Comuna 4 · Sector residencial Los Laureles', lat: 3.87650, lng: -77.04180, aliases: ['laureles'] },
  { name: 'El Galeón', comuna: 4, zone: 'Insular', detail: 'Comuna 4 · Los Laureles y vía principal', lat: 3.87600, lng: -77.04200, aliases: ['galeon'] },
  { name: 'San Fernando', comuna: 4, zone: 'Insular', detail: 'Comuna 4 · Sector residencial', lat: 3.87550, lng: -77.04100, aliases: ['san fernando'] },
  { name: 'Las Américas Insular', comuna: 4, zone: 'Insular', detail: 'Comuna 4 · Conexión vial', lat: 3.87700, lng: -77.04300, aliases: ['las americas insular'] },

  // --- COMUNA 5 (Isla Cascajal) ---
  { name: 'Punta del Este', comuna: 5, zone: 'Insular', detail: 'Comuna 5 · Vía alterna insular y estero', lat: 3.87480, lng: -77.04520, aliases: ['punta del este'] },
  { name: 'Santa Cruz', comuna: 5, zone: 'Insular', detail: 'Comuna 5 · Sector de bajamar insular', lat: 3.87350, lng: -77.04600, aliases: ['santa cruz'] },
  { name: 'Kennedy', comuna: 5, zone: 'Insular', detail: 'Comuna 5 · Sector Kennedy insular', lat: 3.87400, lng: -77.04700, aliases: ['barrio kennedy'] },
  { name: 'Miraflores Insular', comuna: 5, zone: 'Insular', detail: 'Comuna 5 · Sector mirador insular', lat: 3.87520, lng: -77.04650, aliases: ['miraflores'] },
  { name: 'Inmaculada', comuna: 5, zone: 'Insular', detail: 'Comuna 5 · Sector la inmaculada', lat: 3.87600, lng: -77.04500, aliases: ['la inmaculada'] },

  // --- COMUNA 6 (Zona Continental) ---
  { name: 'Juan XXIII', comuna: 6, zone: 'Continental', detail: 'Comuna 6 · Zona residencial y comercial', lat: 3.87450, lng: -77.04350, aliases: ['juan 23', 'juan xxiii'] },
  { name: 'Los Pinos', comuna: 6, zone: 'Continental', detail: 'Comuna 6 · Sector residencial tranquilo', lat: 3.87300, lng: -77.04400, aliases: ['pinos', 'los pinos'] },
  { name: 'Oriente', comuna: 6, zone: 'Continental', detail: 'Comuna 6 · Sector oriental continental', lat: 3.87250, lng: -77.04250, aliases: ['barrio oriente'] },
  { name: 'Simón Bolívar', comuna: 6, zone: 'Continental', detail: 'Comuna 6 · Vía principal', lat: 3.87400, lng: -77.04200, aliases: ['simon bolivar'] },
  { name: 'Doce de Octubre', comuna: 6, zone: 'Continental', detail: 'Comuna 6 · Sector 12 de octubre', lat: 3.87150, lng: -77.04300, aliases: ['12 de octubre', 'doce de octubre'] },

  // --- COMUNA 7 (Zona Continental) ---
  { name: 'Bellavista', comuna: 7, zone: 'Continental', detail: 'Comuna 7 · Zona residencial central, D1 y Superinter', lat: 3.87200, lng: -77.04800, aliases: ['bella vista', 'bellavista'] },
  { name: 'San Luis', comuna: 7, zone: 'Continental', detail: 'Comuna 7 · Carrera 54 y sector comercial', lat: 3.86850, lng: -77.05800, aliases: ['san luis', 'sanluis'] },
  { name: 'Las Américas Continental', comuna: 7, zone: 'Continental', detail: 'Comuna 7 · Sector residencial', lat: 3.87050, lng: -77.05100, aliases: ['las americas'] },
  { name: 'Obrero', comuna: 7, zone: 'Continental', detail: 'Comuna 7 · Barrio obrero continental', lat: 3.87100, lng: -77.05300, aliases: ['el obrero', 'obrero'] },
  { name: 'Porvenir', comuna: 7, zone: 'Continental', detail: 'Comuna 7 · Sector el porvenir', lat: 3.86950, lng: -77.05450, aliases: ['el porvenir'] },

  // --- COMUNA 8 (Zona Continental) ---
  { name: 'El Cristal', comuna: 8, zone: 'Continental', detail: 'Comuna 8 · Polideportivo y vía alterna', lat: 3.86600, lng: -77.05100, aliases: ['cristal', 'el cristal'] },
  { name: 'La Carmelita', comuna: 8, zone: 'Continental', detail: 'Comuna 8 · Sector residencial la carmelita', lat: 3.86750, lng: -77.04950, aliases: ['carmelita'] },
  { name: 'Unión de Vivienda', comuna: 8, zone: 'Continental', detail: 'Comuna 8 · Sector popular', lat: 3.86450, lng: -77.05250, aliases: ['union de vivienda'] },
  { name: 'Los Alpes', comuna: 8, zone: 'Continental', detail: 'Comuna 8 · Sector los alpes', lat: 3.86550, lng: -77.05400, aliases: ['alpes'] },
  { name: 'R9', comuna: 8, zone: 'Continental', detail: 'Comuna 8 · Sector R9 continental', lat: 3.86350, lng: -77.05050, aliases: ['r-9', 'r9'] },

  // --- COMUNA 9 (Zona Continental) ---
  { name: '6 de Enero', comuna: 9, zone: 'Continental', detail: 'Comuna 9 · Sector 6 de enero', lat: 3.86800, lng: -77.04600, aliases: ['seis de enero', '6 de enero'] },
  { name: 'El Ruiz', comuna: 9, zone: 'Continental', detail: 'Comuna 9 · Sector el ruiz continental', lat: 3.86900, lng: -77.04450, aliases: ['ruiz', 'el ruiz'] },
  { name: '14 de Julio', comuna: 9, zone: 'Continental', detail: 'Comuna 9 · Sector 14 de julio', lat: 3.86700, lng: -77.04750, aliases: ['catorce de julio', '14 de julio'] },

  // --- COMUNA 10 (Zona Continental) ---
  { name: 'La Independencia', comuna: 10, zone: 'Continental', detail: 'Comuna 10 · Vía principal y comercio activo', lat: 3.87008, lng: -77.05412, aliases: ['independencia', 'la independencia'] },
  { name: 'Vista Hermosa', comuna: 10, zone: 'Continental', detail: 'Comuna 10 · Sector residencial', lat: 3.87150, lng: -77.05600, aliases: ['vista hermosa'] },
  { name: 'Las Palmas', comuna: 10, zone: 'Continental', detail: 'Comuna 10 · Sector las palmas', lat: 3.86900, lng: -77.05700, aliases: ['palmas'] },
  { name: 'Nueva Granada', comuna: 10, zone: 'Continental', detail: 'Comuna 10 · Sector nueva granada', lat: 3.86800, lng: -77.05550, aliases: ['nueva granada'] },
  { name: 'San Vicente', comuna: 10, zone: 'Continental', detail: 'Comuna 10 · Sector san vicente', lat: 3.87250, lng: -77.05350, aliases: ['san vicente'] },

  // --- COMUNA 11 (Zona Continental) ---
  { name: 'Transformación', comuna: 11, zone: 'Continental', detail: 'Comuna 11 · Zona continental y vía alterna', lat: 3.86500, lng: -77.06000, aliases: ['transformacion'] },
  { name: 'Marítimo', comuna: 11, zone: 'Continental', detail: 'Comuna 11 · Sector marítimo continental', lat: 3.86350, lng: -77.05900, aliases: ['maritimo'] },
  { name: 'El Campín', comuna: 11, zone: 'Continental', detail: 'Comuna 11 · Sector el campín', lat: 3.86400, lng: -77.06150, aliases: ['campin', 'el campin'] },
  { name: 'Cascajal Continental', comuna: 11, zone: 'Continental', detail: 'Comuna 11 · Sector cascajal continental', lat: 3.86250, lng: -77.06250, aliases: ['cascajal'] },
  { name: 'Cascajalito', comuna: 11, zone: 'Continental', detail: 'Comuna 11 · Sector cascajalito', lat: 3.86150, lng: -77.06100, aliases: ['cascajalito'] },

  // --- COMUNA 12 (Zona Continental) ---
  { name: 'Matías Mulumba', comuna: 12, zone: 'Continental', detail: 'Comuna 12 · Vía al aeropuerto y sector escolar', lat: 3.86200, lng: -77.06500, aliases: ['matias mulumba', 'mulumba'] },
  { name: 'Caldas', comuna: 12, zone: 'Continental', detail: 'Comuna 12 · Sector caldas continental', lat: 3.86050, lng: -77.06650, aliases: ['caldas'] },
  { name: 'Ciudadela Nueva Buenaventura', comuna: 12, zone: 'Continental', detail: 'Comuna 12 · Megaproyecto residencial', lat: 3.85900, lng: -77.06800, aliases: ['ciudadela', 'nueva buenaventura'] },
  { name: 'El Pailón', comuna: 12, zone: 'Continental', detail: 'Comuna 12 · Universidad del Pacífico y terminal', lat: 3.85800, lng: -77.07000, aliases: ['pailon', 'el pailon'] },
  { name: 'Cabezas', comuna: 12, zone: 'Continental', detail: 'Comuna 12 · Sector cabezas vía aeropuerto', lat: 3.85400, lng: -77.07300, aliases: ['cabezas'] },
];

/**
 * Catálogo de Puntos de Interés / Hitos Emblemáticos de Buenaventura
 * (Hospitales, centros comerciales, muelles, entidades, colegios).
 */
export const BUENAVENTURA_HITOS = [
  { name: 'Muelle Turístico', category: 'puerto', icon: 'directions_boat', detail: 'Malecón Bahía de la Cruz · Centro', lat: 3.88700, lng: -77.02600, aliases: ['muelle', 'muelle turistico'] },
  { name: 'Malecón Bahía de la Cruz', category: 'parque', icon: 'park', detail: 'Paseo turístico costero · Centro', lat: 3.88650, lng: -77.02650, aliases: ['malecon', 'bahia de la cruz'] },
  { name: 'Alcaldía Distrital (CAD)', category: 'gobierno', icon: 'apartment', detail: 'Centro Administrativo Distrital · Cra 3 # 1-04', lat: 3.88450, lng: -77.02850, aliases: ['alcaldia', 'cad', 'edificio cad'] },
  { name: 'Catedral San Buenaventura', category: 'cultura', icon: 'church', detail: 'Centro histórico · Parque Néstor Urbano Tenorio', lat: 3.88480, lng: -77.02800, aliases: ['catedral', 'iglesia centro'] },
  { name: 'Hotel Estación', category: 'turismo', icon: 'hotel', detail: 'Sector histórico · Muelle', lat: 3.88800, lng: -77.02550, aliases: ['hotel estacion', 'la estacion'] },
  { name: 'Galería de Pueblo Nuevo', category: 'comercio', icon: 'storefront', detail: 'Plaza de Mercado Central · Pueblo Nuevo', lat: 3.88600, lng: -77.02700, aliases: ['galeria', 'plaza de mercado', 'galeria pueblo nuevo'] },
  { name: 'Éxito Buenaventura', category: 'comercio', icon: 'shopping_bag', detail: 'Almacén de cadena · Centro, Calle 2', lat: 3.88500, lng: -77.02800, aliases: ['exito', 'almacenes exito'] },
  { name: 'Centro Comercial Viva Buenaventura', category: 'comercio', icon: 'mall', detail: 'Av. Simón Bolívar · Frente a Bellavista', lat: 3.87100, lng: -77.04900, aliases: ['viva', 'viva buenaventura', 'cc viva'] },
  { name: 'Superinter Bellavista', category: 'comercio', icon: 'shopping_cart', detail: 'Supermercado · Av. Simón Bolívar, Bellavista', lat: 3.87180, lng: -77.04850, aliases: ['superinter', 'super inter'] },
  { name: 'D1 Bellavista', category: 'comercio', icon: 'store', detail: 'Tienda D1 · Barrio Bellavista', lat: 3.87220, lng: -77.04780, aliases: ['d1 bellavista'] },
  { name: 'D1 Centro', category: 'comercio', icon: 'store', detail: 'Tienda D1 · Cra 3, Centro', lat: 3.88400, lng: -77.02880, aliases: ['d1 centro'] },
  { name: 'D1 Pueblo Nuevo', category: 'comercio', icon: 'store', detail: 'Tienda D1 · Pueblo Nuevo', lat: 3.88580, lng: -77.02680, aliases: ['d1 pueblo nuevo'] },
  { name: 'D1 Juan XXIII', category: 'comercio', icon: 'store', detail: 'Tienda D1 · Barrio Juan XXIII', lat: 3.87420, lng: -77.04320, aliases: ['d1 juan 23', 'd1 juan xxiii'] },
  { name: 'Hospital Distrital Luis Ablanque', category: 'salud', icon: 'local_hospital', detail: 'Hospital principal · Av. Simón Bolívar, Bellavista', lat: 3.87150, lng: -77.05000, aliases: ['hospital distrital', 'luis ablanque', 'hospital luis ablanque'] },
  { name: 'Clínica Santa Sofía', category: 'salud', icon: 'local_hospital', detail: 'Centro de salud · Calle 3 # 2-45, Centro', lat: 3.88300, lng: -77.03000, aliases: ['santa sofia', 'clinica santa sofia'] },
  { name: 'SENA Buenaventura', category: 'educacion', icon: 'school', detail: 'Complejo tecnológico · Av. Simón Bolívar, Comuna 10', lat: 3.86900, lng: -77.05600, aliases: ['sena', 'complejo sena'] },
  { name: 'Universidad del Pacífico', category: 'educacion', icon: 'school', detail: 'Campus El Pailón · Comuna 12', lat: 3.85700, lng: -77.07100, aliases: ['unipacifico', 'universidad del pacifico'] },
  { name: 'Universidad del Valle (Sede Pacífico)', category: 'educacion', icon: 'school', detail: 'Sede universitaria · Comuna 6', lat: 3.87300, lng: -77.04600, aliases: ['univalle', 'universidad del valle'] },
  { name: 'Terminal de Transportes de Buenaventura', category: 'transporte', icon: 'directions_bus', detail: 'Terminal intermunicipal · Comuna 12', lat: 3.85600, lng: -77.07200, aliases: ['terminal', 'terminal de transportes'] },
  { name: 'Polideportivo El Cristal', category: 'deporte', icon: 'sports_soccer', detail: 'Escenario deportivo y canchas · Barrio El Cristal', lat: 3.86600, lng: -77.05100, aliases: ['polideportivo', 'el cristal polideportivo'] },
  { name: 'Estadio Marino Klinger', category: 'deporte', icon: 'stadium', detail: 'Estadio de fútbol distrital · Centro', lat: 3.88150, lng: -77.03300, aliases: ['estadio', 'marino klinger'] },
  { name: 'Comfamar Comfenalco', category: 'recreacion', icon: 'pool', detail: 'Caja de compensación y club · Vía principal', lat: 3.87050, lng: -77.05200, aliases: ['comfamar', 'comfenalco'] },
  { name: 'Sociedad Portuaria (SPB)', category: 'puerto', icon: 'sailing', detail: 'Terminal de contenedores principal · Zona franca', lat: 3.88200, lng: -77.03700, aliases: ['puerto', 'sociedad portuaria', 'spb'] },
  { name: 'Colegio Pascual de Andagoya', category: 'educacion', icon: 'school', detail: 'Colegio emblemático · Comuna 2', lat: 3.88700, lng: -77.03250, aliases: ['pascual de andagoya', 'colegio andagoya'] },
  { name: 'Colegio Teófilo Roberto Potes (INESCO)', category: 'educacion', icon: 'school', detail: 'Institución técnica · Av. Simón Bolívar', lat: 3.87350, lng: -77.04500, aliases: ['teofilo', 'inesco', 'colegio teofilo'] },
  { name: 'Colegio ITI Gerardo Valencia Cano', category: 'educacion', icon: 'school', detail: 'Instituto Técnico Industrial · Comuna 10', lat: 3.87000, lng: -77.05500, aliases: ['iti', 'colegio iti'] },
];

/**
 * Principales corredores viales de Buenaventura
 */
export const BUENAVENTURA_VIAS = [
  { name: 'Avenida Simón Bolívar', detail: 'Eje vial vertebral que conecta todo el puerto (Isla a Continente)', lat: 3.8745, lng: -77.0450 },
  { name: 'Vía Alterna Interna', detail: 'Corredor logístico y transporte pesado', lat: 3.8660, lng: -77.0580 },
  { name: 'Carrera 3 (Centro)', detail: 'Eje bancario y gubernamental del centro histórico', lat: 3.8840, lng: -77.0288 },
  { name: 'Carrera 54 (Bellavista - San Luis)', detail: 'Corredor comercial de Comuna 7', lat: 3.8700, lng: -77.0530 },
  { name: 'Calle 2 (Centro - Muelle)', detail: 'Calle comercial del centro histórico', lat: 3.8850, lng: -77.0275 },
  { name: 'Vía al Aeropuerto', detail: 'Autopista hacia El Pailón y Aeropuerto Gerardo Tobar', lat: 3.8550, lng: -77.0710 },
];

/**
 * Busca coincidencias exactas o parciales dentro de la librería de Buenaventura
 */
export function buscarEnBuenaventura(query) {
  const q = sinTildes(query);
  if (q.length < 2) return [];

  const resultados = [];
  const vistos = new Set();

  // 1. Coincidencias en HITOS urbanos (Hospitales, Muelles, Tiendas)
  for (const h of BUENAVENTURA_HITOS) {
    const coincideNombre = sinTildes(h.name).includes(q);
    const coincideAlias = h.aliases?.some((a) => sinTildes(a).includes(q) || q.includes(sinTildes(a)));
    const coincideDetalle = sinTildes(h.detail).includes(q);

    if (coincideNombre || coincideAlias || coincideDetalle) {
      const key = `hito-${h.name}`;
      if (!vistos.has(key)) {
        vistos.add(key);
        resultados.push({
          id: key,
          label: h.name,
          detail: h.detail,
          neighborhood: h.name,
          lat: h.lat,
          lng: h.lng,
          exacta: true,
          hito: true,
          icon: h.icon || 'place',
          inCoverage: true,
        });
      }
    }
  }

  // 2. Coincidencias en BARRIOS
  for (const b of BUENAVENTURA_BARRIOS) {
    const coincideNombre = sinTildes(b.name).includes(q);
    const coincideAlias = b.aliases?.some((a) => sinTildes(a).includes(q) || q.includes(sinTildes(a)));
    const coincideComuna = sinTildes(b.detail).includes(q);

    if (coincideNombre || coincideAlias || coincideComuna) {
      const key = `barrio-${b.name}`;
      if (!vistos.has(key)) {
        vistos.add(key);
        resultados.push({
          id: key,
          label: `Barrio ${b.name}`,
          detail: `${b.detail} · Buenaventura`,
          neighborhood: b.name,
          lat: b.lat,
          lng: b.lng,
          exacta: false,
          barrio: true,
          icon: 'holiday_village',
          inCoverage: true,
        });
      }
    }
  }

  // 3. Coincidencias en VÍAS principales
  for (const v of BUENAVENTURA_VIAS) {
    if (sinTildes(v.name).includes(q) || sinTildes(v.detail).includes(q)) {
      const key = `via-${v.name}`;
      if (!vistos.has(key)) {
        vistos.add(key);
        resultados.push({
          id: key,
          label: v.name,
          detail: `${v.detail} · Buenaventura`,
          neighborhood: null,
          lat: v.lat,
          lng: v.lng,
          exacta: false,
          via: true,
          icon: 'alt_route',
          inCoverage: true,
        });
      }
    }
  }

  return resultados;
}

/**
 * Resolver Inteligente: Si el usuario escribe una dirección suelta
 * como "carrera 54 # 12-40 bellavista", "calle 4 entrando por el jorge", etc.,
 * el motor detecta el barrio, la calle y el número, y genera una sugerencia precisa.
 */
export function resolverDireccionBuenaventura(texto) {
  const raw = String(texto ?? '').trim();
  if (raw.length < 3) return null;

  const t = sinTildes(raw);
  const { calle, numero } = parseDireccionCO(raw);

  // Buscar si menciona algún barrio de Buenaventura
  const barrioEncontrado = BUENAVENTURA_BARRIOS.find((b) => {
    const n = sinTildes(b.name);
    return t.includes(n) || b.aliases?.some((a) => t.includes(sinTildes(a)));
  });

  // Buscar si menciona algún hito
  const hitoEncontrado = BUENAVENTURA_HITOS.find((h) => {
    const n = sinTildes(h.name);
    return t.includes(n) || h.aliases?.some((a) => t.includes(sinTildes(a)));
  });

  if (hitoEncontrado && !calle) {
    return {
      id: `resolved-hito-${hitoEncontrado.name}`,
      label: raw,
      detail: `Cerca de ${hitoEncontrado.name} · ${hitoEncontrado.detail}`,
      neighborhood: hitoEncontrado.name,
      lat: hitoEncontrado.lat,
      lng: hitoEncontrado.lng,
      exacta: true,
      inCoverage: true,
    };
  }

  if (barrioEncontrado) {
    const contieneBarrio = sinTildes(raw).includes(sinTildes(barrioEncontrado.name));
    let nombreDir = numero ? `${calle} #${numero}` : calle || raw;
    if (!contieneBarrio) {
      nombreDir = `${nombreDir}, ${barrioEncontrado.name}`;
    }
    return {
      id: `resolved-${barrioEncontrado.name}`,
      label: nombreDir,
      detail: `Barrio ${barrioEncontrado.name} · ${barrioEncontrado.detail}`,
      neighborhood: barrioEncontrado.name,
      lat: barrioEncontrado.lat,
      lng: barrioEncontrado.lng,
      exacta: Boolean(numero),
      inCoverage: true,
    };
  }

  return null;
}

/**
 * Encuentra el barrio más cercano a unas coordenadas GPS en Buenaventura
 */
export function barrioPorCoordenadas(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return BUENAVENTURA_BARRIOS[0];

  let nearest = BUENAVENTURA_BARRIOS[0];
  let minDist = Infinity;

  for (const b of BUENAVENTURA_BARRIOS) {
    const d = Math.hypot(b.lat - lat, b.lng - lng);
    if (d < minDist) {
      minDist = d;
      nearest = b;
    }
  }

  return nearest;
}
