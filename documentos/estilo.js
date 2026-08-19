/**
 * ESTILO COMPARTIDO DE LOS DOCUMENTOS DE TURAFOOD
 *
 * Todos los documentos salen de acá para que se vean de la misma
 * mano: mismo tamaño de página, misma tipografía, mismos colores de
 * la marca, mismas tablas.
 *
 * Carta y no A4: es el tamaño que se imprime en Colombia. `docx`
 * usa A4 por defecto, así que hay que decirlo explícitamente en DXA
 * (1440 = una pulgada).
 */

const {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, BorderStyle, LevelFormat, convertInchesToTwip,
} = require('docx');

/** Los colores de la marca, sin el # porque docx los quiere pelados */
const C = {
  naranja: 'FF441F',
  naranjaOsc: 'E2360F',
  tinta: '22201D',
  texto: '2B2724',
  suave: '6E665D',
  linea: 'E4DFD8',
  fondoSuave: 'FBF8F5',
  verde: '0B7A48',
  verdeSuave: 'E6F6EE',
};

const PAGINA = {
  size: { width: 12240, height: 15840 },        // Carta
  margin: {
    top: convertInchesToTwip(0.9),
    bottom: convertInchesToTwip(0.9),
    left: convertInchesToTwip(0.85),
    right: convertInchesToTwip(0.85),
  },
};

/** El ancho útil, para que las tablas no se salgan del margen */
const ANCHO = 12240 - convertInchesToTwip(1.7);

/* ------------------------------------------------------------ */

const titulo = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 140 },
  children: [new TextRun({ text: t, bold: true, size: 34, color: C.tinta, font: 'Calibri' })],
});

const subtitulo = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 110 },
  children: [new TextRun({ text: t, bold: true, size: 26, color: C.naranjaOsc, font: 'Calibri' })],
});

const sub3 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 80 },
  children: [new TextRun({ text: t, bold: true, size: 23, color: C.texto, font: 'Calibri' })],
});

const p = (t, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, line: 300 },
  alignment: opts.centro ? AlignmentType.CENTER : AlignmentType.LEFT,
  children: [new TextRun({
    text: t,
    size: opts.size ?? 21,
    color: opts.color ?? C.texto,
    italics: opts.cursiva,
    bold: opts.negrita,
    font: 'Calibri',
  })],
});

/** Párrafo con partes en negrita: recibe [['normal',0],['negrita',1]] */
const pMixto = (partes, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, line: 300 },
  children: partes.map(([t, b]) => new TextRun({
    text: t, bold: Boolean(b), size: 21, color: C.texto, font: 'Calibri',
  })),
});

const vineta = (t) => new Paragraph({
  numbering: { reference: 'lista-tura', level: 0 },
  spacing: { after: 70, line: 290 },
  children: [new TextRun({ text: t, size: 21, color: C.texto, font: 'Calibri' })],
});

/** La franja de portada */
const portada = (kicker, tit, bajada) => [
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({
      text: kicker, bold: true, size: 18, color: C.naranja,
      characterSpacing: 60, font: 'Calibri',
    })],
  }),
  new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: tit, bold: true, size: 52, color: C.tinta, font: 'Calibri' })],
  }),
  new Paragraph({
    spacing: { after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.naranja, space: 6 } },
    children: [new TextRun({ text: '', size: 2 })],
  }),
  p(bajada, { size: 23, color: C.suave, after: 300 }),
];

/** Una línea fina, para separar sin meter una tabla */
const regla = () => new Paragraph({
  spacing: { before: 140, after: 140 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.linea, space: 4 } },
  children: [new TextRun({ text: '', size: 2 })],
});

/**
 * Tabla con anchos en DXA arriba y abajo — si solo se ponen en uno de
 * los dos, Google Docs la rompe. Los anchos de columna tienen que
 * sumar el ancho de la tabla.
 */
const tabla = (cabeceras, filas, pesos) => {
  const total = pesos.reduce((a, b) => a + b, 0);
  const anchos = pesos.map((w) => Math.round((w / total) * ANCHO));

  const celda = (texto, i, esCabecera, resaltar) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    shading: esCabecera
      ? { type: ShadingType.CLEAR, fill: C.tinta, color: 'auto' }
      : resaltar
        ? { type: ShadingType.CLEAR, fill: C.verdeSuave, color: 'auto' }
        : { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' },
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [new Paragraph({
      spacing: { after: 0, line: 280 },
      children: [new TextRun({
        text: String(texto ?? ''),
        bold: esCabecera,
        size: esCabecera ? 19 : 20,
        color: esCabecera ? 'FFFFFF' : C.texto,
        font: 'Calibri',
      })],
    })],
  });

  return new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: anchos,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 2, color: C.linea },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: C.linea },
      left:   { style: BorderStyle.SINGLE, size: 2, color: C.linea },
      right:  { style: BorderStyle.SINGLE, size: 2, color: C.linea },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: C.linea },
      insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: C.linea },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: cabeceras.map((h, i) => celda(h, i, true)),
      }),
      ...filas.map((f) => new TableRow({
        children: f.map((c, i) => celda(
          typeof c === 'object' ? c.t : c, i, false,
          typeof c === 'object' ? c.resaltar : false,
        )),
      })),
    ],
  });
};

/** Recuadro para una idea que tiene que resaltar */
const destacado = (titulo, texto) => new Table({
  width: { size: ANCHO, type: WidthType.DXA },
  columnWidths: [ANCHO],
  borders: {
    top:    { style: BorderStyle.SINGLE, size: 2, color: C.naranja },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: C.naranja },
    left:   { style: BorderStyle.SINGLE, size: 18, color: C.naranja },
    right:  { style: BorderStyle.SINGLE, size: 2, color: C.naranja },
    insideHorizontal: { style: BorderStyle.NONE },
    insideVertical:   { style: BorderStyle.NONE },
  },
  rows: [new TableRow({
    children: [new TableCell({
      width: { size: ANCHO, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: C.fondoSuave, color: 'auto' },
      margins: { top: 140, bottom: 140, left: 180, right: 160 },
      children: [
        new Paragraph({
          spacing: { after: 70 },
          children: [new TextRun({ text: titulo, bold: true, size: 21, color: C.naranjaOsc, font: 'Calibri' })],
        }),
        new Paragraph({
          spacing: { after: 0, line: 300 },
          children: [new TextRun({ text: texto, size: 20, color: C.texto, font: 'Calibri' })],
        }),
      ],
    })],
  })],
});

/** La numeración de las viñetas. Va en la config del documento. */
const NUMERACION = {
  config: [{
    reference: 'lista-tura',
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: '•',
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: { indent: { left: 400, hanging: 220 } },
        run: { color: C.naranja },
      },
    }],
  }],
};

const PIE = (nombre) => ({
  default: new (require('docx').Footer)({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: `TuraFood AI · ${nombre} · Buenaventura, Colombia · turafood.com`,
        size: 16, color: C.suave, font: 'Calibri',
      })],
    })],
  }),
});

module.exports = {
  C, PAGINA, ANCHO, NUMERACION, PIE,
  titulo, subtitulo, sub3, p, pMixto, vineta, portada, regla, tabla, destacado,
};
