// Genera el documento del PIA en Word sobre la portada oficial del equipo (docs/portada.docx).
// node docs/documento-word.mjs   (antes: node docs/presentacion.mjs para las figuras)
// La portada conserva logos, formas y marco; solo se cambian sus textos. El contenido usa sus
// mismos estilos (Título 1/2), colores (9BBA58, 76923C, EAF0DD, C2D59B) y el marco de página.
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdtempSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  EQUIPO, DOCS, APP, SE, pct, name, ruleText, profile, tree, chain, ex, bf, hs, rank, trav,
  RUNS, avgExpanded, students, flow, sim, GUION,
} from './datos.mjs';

const C = { accent: '9BBA58', title: '76923C', fill: 'EAF0DD', line: 'C2D59B', dark: '4F6228', muted: '5F6B4C', code: 'F4F7EC' };
const TEXT_W = 8838; // ancho útil en twips (carta, márgenes de 1701)
const EMU_IN = 914400;

// ---------------------------------------------------------------- desempaquetar la portada
const work = mkdtempSync(resolve(tmpdir(), 'pia-docx-'));
execFileSync('unzip', ['-q', resolve(DOCS, 'portada.docx'), '-d', work]);
execFileSync('find', [work, '-type', 'l', '-delete']);
const docPath = resolve(work, 'word/document.xml');
const xmlDoc = readFileSync(docPath, 'utf8');

// ---------------------------------------------------------------- utilidades OOXML
const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TNR = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>';
const MONO = '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="Courier New" w:cs="Courier New"/>';

function run(text, { b, i, mono, size = 12, color = '000000' } = {}) {
  const rpr = `${mono ? MONO : TNR}${b ? '<w:b/><w:bCs/>' : ''}${i ? '<w:i/><w:iCs/>' : ''}<w:color w:val="${color}"/><w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>`;
  return `<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
}

// Texto con marcas simples: **negritas** y `código`.
function rich(text, opts = {}) {
  return String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map(part => {
    if (part.startsWith('**')) return run(part.slice(2, -2), { ...opts, b: true });
    if (part.startsWith('`')) return run(part.slice(1, -1), { ...opts, mono: true, size: (opts.size || 12) - 1, color: C.dark });
    return run(part, opts);
  }).join('');
}

const P = (text, opts = {}) =>
  `<w:p><w:pPr><w:spacing w:before="0" w:after="140" w:line="300" w:lineRule="auto"/><w:jc w:val="${opts.jc || 'both'}"/></w:pPr>${rich(text, opts)}</w:p>`;

const H1 = (text, { pageBreak = true, center = false } = {}) =>
  `<w:p><w:pPr><w:pStyle w:val="Ttulo1"/>${pageBreak ? '<w:pageBreakBefore/>' : ''}<w:spacing w:before="${pageBreak ? 0 : 360}" w:after="240"/>${center ? '<w:jc w:val="center"/>' : ''}</w:pPr>${run(text, { b: true, color: C.title, size: 15 })}</w:p>`;

const H2 = text =>
  `<w:p><w:pPr><w:pStyle w:val="Ttulo2"/><w:spacing w:before="240" w:after="120"/></w:pPr>${run(text, { b: true, color: C.title, size: 13 })}</w:p>`;

// Viñetas con la numeración de la portada (numId 15 = •).
const bullets = items => items.map(t =>
  `<w:p><w:pPr><w:pStyle w:val="Prrafodelista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="15"/></w:numPr><w:spacing w:after="60" w:line="300" w:lineRule="auto"/><w:contextualSpacing w:val="0"/><w:jc w:val="both"/></w:pPr>${rich(t)}</w:p>`).join('');

// Recuadro destacado: fondo verde claro y barra lateral verde oliva.
const box = (text, opts = {}) =>
  `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="36" w:space="8" w:color="${opts.border || C.accent}"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="${C.fill}"/><w:spacing w:before="120" w:after="200" w:line="300" w:lineRule="auto"/><w:ind w:left="200" w:right="120"/><w:jc w:val="both"/></w:pPr>${rich(text, opts)}</w:p>`;

const pageBreak = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

function table(headers, rows, widths, { size = 10, mono = [] } = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const border = `w:val="single" w:sz="8" w:space="0" w:color="${C.line}"`;
  const cell = (text, w, { header, shade, col }) => {
    const fill = header ? C.accent : shade ? C.fill : 'FFFFFF';
    const paras = String(text).split('\n').map(line =>
      `<w:p><w:pPr><w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>${rich(line, { size, b: header, color: header ? 'FFFFFF' : '000000', mono: !header && mono.includes(col) })}</w:p>`).join('');
    return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${fill}"/><w:tcMar><w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar></w:tcPr>${paras}</w:tc>`;
  };
  const tr = (cells, opts) => `<w:tr>${opts.header ? '<w:trPr><w:tblHeader/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>'}${cells.map((c, i) => cell(c, widths[i], { ...opts, col: i })).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top ${border}/><w:left ${border}/><w:bottom ${border}/><w:right ${border}/><w:insideH ${border}/><w:insideV ${border}/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>` +
    `<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
    (headers ? tr(headers, { header: true }) : '') + rows.map((r, i) => tr(r, { shade: i % 2 === 1 })).join('') +
    '</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>';
}

// Imágenes: se copian a word/media y se enlazan con relaciones nuevas.
const rels = [];
let imgId = 30000;
function image(file, widthIn, caption) {
  const buf = readFileSync(file);
  const pw = buf.readUInt32BE(16);
  const ph = buf.readUInt32BE(20);
  const id = ++imgId;
  const rid = 'rIdPia' + id;
  const media = `pia${id}.png`;
  copyFileSync(file, resolve(work, 'word/media', media));
  rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${media}"/>`);
  const cx = Math.round(widthIn * EMU_IN);
  const cy = Math.round((cx * ph) / pw);
  const drawing = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="Imagen ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${media}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln w="9525"><a:solidFill><a:srgbClr val="${C.line}"/></a:solidFill></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
  return `<w:p><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="60"/><w:jc w:val="center"/></w:pPr><w:r>${drawing}</w:r></w:p>` +
    (caption ? `<w:p><w:pPr><w:spacing w:before="0" w:after="200"/><w:jc w:val="center"/></w:pPr>${run(caption, { i: true, size: 10, color: C.muted })}</w:p>` : '');
}

function code(file) {
  const lines = readFileSync(resolve(APP, file), 'utf8').replace(/\n$/, '').split('\n');
  const head = H2(`${file} (${lines.length} líneas)`);
  const body = lines.map((l, i) =>
    `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${C.code}"/><w:spacing w:before="0" w:after="0" w:line="228" w:lineRule="auto"/></w:pPr>` +
    `${run(String(i + 1).padStart(4) + '  ', { mono: true, size: 7, color: '9AA88A' })}${run(l, { mono: true, size: 7.5 })}</w:p>`).join('');
  return head + body + '<w:p/>';
}

// ---------------------------------------------------------------- 1. portada: solo textos
const PARA_RE = /<w:p[ >][\s\S]*?<\/w:p>/g;
const bodyStart = xmlDoc.indexOf('<w:body>') + '<w:body>'.length;
const firstSect = [...xmlDoc.slice(bodyStart).matchAll(PARA_RE)].find(m => m[0].includes('<w:sectPr'));
const coverEnd = bodyStart + firstSect.index + firstSect[0].length;
const finalSect = xmlDoc.slice(xmlDoc.lastIndexOf('<w:sectPr'), xmlDoc.indexOf('</w:body>'));

// Pone `text` en el primer <w:t> del párrafo y vacía los demás (conserva dibujos y formato).
function setText(para, text) {
  let first = true;
  return para.replace(/<w:t(?: [^>]*)?>[^<]*<\/w:t>/g, () => {
    const out = `<w:t xml:space="preserve">${first ? x(text) : ''}</w:t>`;
    first = false;
    return out;
  });
}
const replaceParaContaining = (xml, needle, text) => {
  const m = [...xml.matchAll(PARA_RE)].find(p => p[0].replace(/<[^>]+>/g, '').includes(needle));
  if (!m) throw new Error('No se encontró en la portada: ' + needle);
  return xml.slice(0, m.index) + setText(m[0], text) + xml.slice(m.index + m[0].length);
};

let cover = xmlDoc.slice(bodyStart, coverEnd);
cover = replaceParaContaining(cover, 'ÉTICA, SOCIEDAD Y PROFESIÓN', EQUIPO.materia);
cover = replaceParaContaining(cover, 'PERÍODO ESCOLAR', 'PERÍODO ESCOLAR: ' + EQUIPO.periodo);
cover = replaceParaContaining(cover, 'CATEDRÁTICO', 'CATEDRÁTICO: ' + EQUIPO.catedratico);
cover = replaceParaContaining(cover, 'ACTIVIDAD FUNDAMENTAL 2', 'PRODUCTO INTEGRADOR DE APRENDIZAJE (PIA)');
cover = replaceParaContaining(cover, 'FILO RETOS', '“SISTEMA EXPERTO DE ORIENTACIÓN VOCACIONAL”');
cover = replaceParaContaining(cover, 'FECHA DE ENTREGA', 'FECHA DE ENTREGA: CIUDAD UNIVERSITARIA, SAN NICOLÁS DE LOS GARZA, NUEVO LEÓN A ' + EQUIPO.fecha);

// Tabla de integrantes: fila de encabezado + una fila por integrante (se clona la primera fila de datos).
{
  const at = cover.indexOf('MATRÍCULA');
  const t0 = cover.lastIndexOf('<w:tbl>', at);
  const t1 = cover.indexOf('</w:tbl>', at);
  const tbl = cover.slice(t0, t1);
  const rows = [...tbl.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)];
  const header = rows[0][0];
  const sample = rows[1][0];
  const fillRow = p => {
    const cells = [p.nombre, p.matricula, p.carrera];
    let k = 0;
    return sample.replace(PARA_RE, para => setText(para, cells[k++] ?? ''));
  };
  const headerNew = replaceParaContaining(header, 'INTEGRANTES', `INTEGRANTES EQUIPO ${EQUIPO.equipo}`);
  const before = tbl.slice(0, rows[0].index);
  const after = tbl.slice(rows.at(-1).index + rows.at(-1)[0].length);
  cover = cover.slice(0, t0) + before + headerNew + EQUIPO.integrantes.map(fillRow).join('') + after + cover.slice(t1);
}

// ---------------------------------------------------------------- 2. contenido
const SECTIONS = [];
const section = (title, opts) => { SECTIONS.push(title); return H1(title, opts); };

const toc = () => {
  const entries = SECTIONS.map(t =>
    `<w:p><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${TEXT_W}"/></w:tabs><w:spacing w:after="100"/></w:pPr>${run(t, { b: !/^\d+\.\d/.test(t) })}</w:p>`).join('');
  return `<w:p><w:pPr><w:pStyle w:val="Ttulo1"/><w:spacing w:before="0" w:after="360"/><w:jc w:val="center"/></w:pPr>${run('ÍNDICE', { b: true, color: C.title, size: 15 })}</w:p>` +
    `<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r></w:p>` +
    entries + '<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>' +
    box('**Nota:** al abrir el documento, Word pregunta si desea actualizar los campos; responda **Sí** para ver los números de página del índice (o clic derecho sobre el índice → Actualizar campo).', { size: 10 });
};

const testOut = execFileSync('node', [resolve(APP, 'test.js')], { encoding: 'utf8' }).trim().split('\n');
const shot = (f, cap) => image(resolve(DOCS, 'capturas', f + '.png'), 6.0, cap);
const W = (...cols) => cols.map(c => Math.round((c * TEXT_W) / cols.reduce((a, b) => a + b, 0)));
const rules = SE.RULES;
const nodes = (function list(n, acc = []) { if (!n.leaf) { acc.push(n); list(n.yes, acc); list(n.no, acc); } return acc; })(SE.DECISION_TREE);

const content = [
  section('LIGAS DE ENTREGA'),
  table(['Elemento', 'Liga / ubicación'], [
    ['Video de ejecución y explicación', EQUIPO.video],
    ['Código fuente', EQUIPO.repositorio + '\nTambién incluido completo en el Anexo A.'],
    ['Presentación de apoyo', 'Incluida en el Anexo C de este documento.'],
    ['Programa', 'Abrir `sistema-experto/index.html` en cualquier navegador (no requiere instalación).'],
  ], W(30, 70)),

  section('1. PLANTEAMIENTO DEL PROBLEMA'),
  P('Al terminar la preparatoria, muchos estudiantes eligen carrera sin una orientación adecuada: deciden por presión familiar, por la carrera de sus amigos o por percepciones vagas del campo laboral. La consecuencia es una alta tasa de cambio de carrera y de deserción en los primeros semestres, lo que representa pérdida de tiempo y dinero para el alumno y para la institución.'),
  P('Los departamentos de orientación vocacional cuentan con pocos orientadores para muchos alumnos, por lo que no siempre es posible una entrevista personalizada. Se detectó la necesidad de una herramienta que **capture el conocimiento de un orientador** y lo aplique de forma consistente, explicando sus conclusiones, para apoyar al alumno en la **toma de decisiones**.'),
  box('**Problema:** dado el perfil de intereses y habilidades de un alumno, decidir qué carrera universitaria es más compatible, justificar la decisión y ofrecer alternativas ordenadas.'),

  H2('Objetivo general'),
  P('Diseñar e implementar un sistema experto que recomiende una carrera universitaria a partir de un cuestionario, aplicando un árbol de decisión, reglas de producción y algoritmos de búsqueda exhaustiva y heurística que optimicen la toma de decisiones.'),
  H2('Objetivos específicos'),
  bullets([
    'Representar el conocimiento del experto mediante un árbol de decisión y reglas SI-ENTONCES.',
    'Implementar un motor de inferencia con encadenamiento hacia adelante y un módulo de explicación.',
    'Comparar búsquedas exhaustivas (profundidad y anchura) contra una búsqueda heurística (A*).',
    'Aplicar recorridos de árbol, un algoritmo de ordenamiento (Merge Sort) y el teorema de flujo máximo / corte mínimo.',
    'Simular el proceso de aprendizaje del sistema a partir de retroalimentación.',
  ]),

  section('2. ARQUITECTURA DEL SISTEMA EXPERTO'),
  P('El sistema se programó en JavaScript y se ejecuta en cualquier navegador web abriendo `sistema-experto/index.html`, sin instalación. La lógica está separada de la interfaz: `engine.js` contiene la base de conocimiento y todos los algoritmos; `app.js` e `index.html` forman la interfaz.'),
  table(['Componente', 'Función en el sistema'], [
    ['Interfaz de usuario', 'Cuestionario Likert de 16 preguntas y 7 módulos de consulta.'],
    ['Base de conocimiento', '8 dimensiones, 16 prototipos de carrera, árbol de decisión y 17 reglas.'],
    ['Motor de inferencia', 'Recorrido del árbol y encadenamiento hacia adelante.'],
    ['Módulo de explicación', 'Muestra el camino del árbol y la regla disparada (¿por qué?).'],
    ['Módulo de búsqueda', 'DFS, BFS y A* sobre el espacio de carreras; ranking con Merge Sort.'],
    ['Módulo de aprendizaje', 'LVQ ajusta los prototipos con retroalimentación; flujo máximo asigna cupos.'],
  ], W(30, 70)),
  H2('Flujo de una consulta'),
  bullets([
    'El alumno contesta el cuestionario.',
    'Las respuestas se convierten en un perfil de 8 valores entre 0 y 1.',
    'El motor recorre el árbol de decisión y dispara una regla.',
    'A* busca las carreras más cercanas al perfil como alternativas, o como respaldo si el árbol no es concluyente.',
    'Se muestra la recomendación con su explicación; el alumno puede dar retroalimentación y el sistema aprende.',
  ]),

  section('3. BASE DE CONOCIMIENTO'),
  H2('3.1 Hechos: perfil del alumno'),
  P('Cada una de las 16 preguntas se responde en escala de 1 (nada) a 5 (totalmente) y pertenece a una de 8 dimensiones (2 preguntas por dimensión). El valor de cada dimensión es el promedio normalizado `(respuesta − 1) / 4`, que queda entre 0 y 1.'),
  table(['Código', 'Dimensión', 'Preguntas'],
    SE.DIMS.map(d => [d.id, d.name, SE.QUESTIONS.filter(q => q.dim === d.id).map(q => q.text).join('\n')]), W(10, 25, 65), { mono: [0] }),
  H2('3.2 Prototipos de carrera'),
  P('El experto define, para cada carrera, la afinidad esperada en cada dimensión (0 a 1). Estos vectores son el conocimiento que usan la búsqueda y el aprendizaje.'),
  table(['Código', 'Carrera', ...SE.DIMS.map(d => d.id)],
    SE.CAREER_CODES.map(c => [c, name(c), ...SE.DEFAULT_PROTOS[c].map(w => w.toFixed(1))]), W(9, 35, ...SE.DIMS.map(() => 7)), { size: 9, mono: [0] }),

  section('4. ÁRBOL DE DECISIÓN'),
  P('El árbol de decisión es binario: cada nodo interno (A–P) pregunta si una dimensión del perfil alcanza un umbral; la rama izquierda es **Sí** y la derecha **No**. Las 17 hojas son las conclusiones: 16 carreras y un caso **no concluyente** (¿?), en el que el sistema recurre a la búsqueda heurística. El árbol tiene 33 nodos y profundidad máxima 5.'),
  image(resolve(DOCS, 'figuras/arbol.png'), 6.1, 'Figura 1. Árbol de decisión del sistema experto.'),
  table(['Nodo', 'Pregunta', 'Prueba'], nodes.map(n => [n.id, n.text, `${n.dim} ≥ ${n.thr}`]), W(10, 65, 25), { mono: [0, 2] }),
  H2('Ejemplo de recorrido'),
  P(`Perfil de ejemplo: ${SE.DIMS.map((d, i) => `\`${d.id}=${profile[i].toFixed(2)}\``).join(' ')}. El camino resaltado lleva a **${name(tree.career)}**:`),
  image(resolve(DOCS, 'figuras/arbol-camino.png'), 6.1, 'Figura 2. Camino recorrido con el perfil de ejemplo.'),
  table(['Nodo', 'Pregunta', 'Valor del alumno', 'Resultado'],
    tree.path.map(s => [s.node, s.text, `${s.dim} = ${s.value.toFixed(2)} ${s.yes ? '≥' : '<'} ${s.thr}`, s.yes ? 'Sí' : 'No']), W(9, 51, 26, 14), { mono: [0, 2] }),

  section('5. REGLAS Y MOTOR DE INFERENCIA'),
  P('Cada camino de la raíz a una hoja se convierte automáticamente en una regla de producción **SI** premisas **ENTONCES** conclusión. Las reglas son mutuamente excluyentes y cubren todos los perfiles posibles. La regla disparada con el perfil de ejemplo aparece resaltada.'),
  rules.map(r => {
    const fired = chain.fired && r.id === chain.fired.id;
    return `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="${fired ? 36 : 12}" w:space="6" w:color="${fired ? C.title : C.line}"/></w:pBdr>${fired ? `<w:shd w:val="clear" w:color="auto" w:fill="${C.fill}"/>` : ''}<w:spacing w:before="0" w:after="40"/><w:ind w:left="160"/></w:pPr>${run(ruleText(r), { mono: true, size: 8.5, b: fired })}</w:p>`;
  }).join(''),
  H2('Encadenamiento hacia adelante'),
  P(`La memoria de trabajo contiene los hechos (el perfil). El motor recorre la agenda de reglas, evalúa sus premisas contra los hechos y dispara la primera regla cuyas premisas se cumplen todas. Con el perfil de ejemplo se evaluaron ${chain.trace.length} reglas y se disparó **${chain.fired.id}** → **${name(chain.fired.then)}**. Las pruebas verifican que el encadenamiento y el recorrido del árbol concluyen lo mismo en 500 perfiles aleatorios.`),
  box('**Módulo de explicación:** la interfaz muestra cada pregunta del camino con el valor del alumno y el umbral, de modo que el alumno entiende **por qué** se le recomendó la carrera.'),

  section('6. ALGORITMOS DE BÚSQUEDA EXHAUSTIVA Y HEURÍSTICA'),
  P('Además del árbol de decisión, el sistema busca en el **espacio de carreras**: un árbol Raíz → 5 áreas → 10 subáreas → 16 carreras (32 nodos). El objetivo es encontrar la carrera cuyo prototipo tenga la menor distancia euclidiana al perfil del alumno: `d(x, w) = √Σ (xᵢ − wᵢ)²`. La compatibilidad se reporta como `1 − d / √8`.'),
  H2('6.1 Búsquedas exhaustivas'),
  P('**Profundidad (DFS)** usa una pila y explora cada rama hasta sus hojas antes de retroceder. **Anchura (BFS)** usa una cola y explora nivel por nivel. Ambas visitan los 32 nodos y garantizan encontrar el óptimo, pero no aprovechan información del problema.'),
  table(['Búsqueda', 'Orden de visita'], [['DFS', ex.order.join(' → ')], ['BFS', bf.order.join(' → ')]], W(15, 85), { size: 9 }),
  H2('6.2 Búsqueda heurística A*'),
  P('A* expande siempre el nodo con menor `f(n) = g(n) + h(n)`. En los nodos internos la heurística `h(n)` es la distancia del perfil a la **caja envolvente** del subárbol (el mínimo y máximo de cada dimensión entre sus carreras). En las hojas `f` es la distancia exacta.'),
  box('**Admisibilidad:** todo prototipo del subárbol está dentro de su caja, por lo que la distancia a la caja nunca supera la distancia a cualquier carrera del subárbol. Al ser una cota inferior, A* nunca descarta la carrera óptima: la primera hoja que extrae es la más cercana, la segunda es la segunda más cercana, etc.', { border: C.title }),
  table(['Algoritmo', 'Tipo', 'Nodos visitados', 'Resultado'], [
    ['Profundidad (DFS)', 'Exhaustiva', String(ex.visited), ex.best.code],
    ['Anchura (BFS)', 'Exhaustiva', String(bf.visited), bf.best.code],
    ['A* (top 3)', 'Heurística', String(hs.expanded), hs.top.map(t => t.code).join(', ')],
  ], W(30, 22, 22, 26)),
  P(`Orden de expansión de A*: ${hs.order.join(' → ')}.`),
  P(`En ${RUNS} perfiles aleatorios, A* necesitó en promedio **${avgExpanded.toFixed(1)}** nodos para encontrar la mejor carrera, contra 32 de las exhaustivas: un ahorro de **${pct(1 - avgExpanded / 32)}** con el mismo resultado. Esta es la optimización de la búsqueda de soluciones.`),

  section('7. RECORRIDOS DE ÁRBOL Y ORDENAMIENTO'),
  P('Sobre el árbol de decisión se implementan los cuatro recorridos clásicos. Se usan para listar el árbol, extraer reglas (preorden) y dibujarlo (el inorden determina la posición horizontal de cada nodo).'),
  table(['Recorrido', 'Secuencia de nodos'], [
    ['Preorden (raíz, Sí, No)', trav.pre.join(' ')], ['Inorden (Sí, raíz, No)', trav.in.join(' ')],
    ['Postorden (Sí, No, raíz)', trav.post.join(' ')], ['Por niveles', trav.level.join(' ')],
  ], W(24, 76), { size: 9, mono: [1] }),
  H2('Ordenamiento: Merge Sort'),
  P(`Para presentar todas las carreras de la más a la menos compatible se implementó **Merge Sort** (divide y vencerás): divide la lista a la mitad, ordena cada mitad recursivamente y las mezcla. Su complejidad es \`O(n log n)\` en todos los casos y es estable. Con 16 carreras se realizaron ${rank.comparisons} comparaciones.`),
  table(['#', 'Carrera', 'Distancia', 'Compatibilidad'],
    rank.list.map((r, i) => [String(i + 1), name(r.code), r.d.toFixed(3), pct(r.compat)]), W(8, 52, 20, 20)),

  section('8. TEOREMA DE FLUJO MÁXIMO Y CORTE MÍNIMO'),
  P('Una institución tiene cupos limitados por carrera. Se modela una **red de flujo**: fuente → cada alumno (capacidad 1) → cada carrera con compatibilidad ≥ umbral (capacidad 1) → sumidero (capacidad = cupos de la carrera). El **flujo máximo** es el mayor número de alumnos que pueden ubicarse en una carrera compatible sin exceder cupos.'),
  P('Se usa **Edmonds-Karp** (Ford-Fulkerson con BFS): mientras exista un camino aumentante en la red residual, se envía por él el flujo de su cuello de botella. Su complejidad es `O(V·E²)`. El **teorema de flujo máximo y corte mínimo** establece que el valor del flujo máximo es igual a la capacidad del corte mínimo; el sistema calcula ambos y los compara.'),
  table(['Flujo máximo', 'Capacidad del corte mínimo', 'Caminos aumentantes'],
    [[`${flow.total} de ${students.length} alumnos`, String(flow.cutCapacity), String(flow.augmentations)]], W(34, 33, 33)),
  table(['Alumno', 'Carrera asignada', 'Compatibilidad'],
    flow.assignments.map(a => [a.student, a.code ? name(a.code) : 'Sin cupo compatible', a.compat === null ? '—' : pct(a.compat)]), W(25, 50, 25)),
  P(`Grupo simulado de 12 alumnos, 1 cupo por carrera, compatibilidad mínima 80%. Flujo máximo = corte mínimo = ${flow.total}, como establece el teorema.`, { size: 10, color: C.muted }),

  section('9. SIMULACIÓN DEL PROCESO DE APRENDIZAJE'),
  P('El conocimiento inicial del experto puede no coincidir con los perfiles reales de quienes estudian cada carrera. Para corregirlo se usa **LVQ (Learning Vector Quantization)**: cuando un alumno indica la carrera que realmente eligió, el prototipo de esa carrera se acerca a su perfil y, si el sistema se equivocó, el prototipo predicho se aleja:'),
  box('`w_correcta ← w_correcta + α (x − w_correcta)`     `w_predicha ← w_predicha − α (x − w_predicha)`'),
  P(`La simulación genera ${sim.samples} perfiles de egresados cuyos patrones difieren del conocimiento inicial y entrena durante ${sim.curve.length - 1} épocas con tasa de aprendizaje decreciente. La exactitud sobre un conjunto de prueba independiente sube de **${pct(sim.curve[0])}** a **${pct(sim.curve.at(-1))}**:`),
  image(resolve(DOCS, 'figuras/curva.png'), 5.0, 'Figura 3. Curva de aprendizaje: exactitud por época.'),
  P('En la aplicación, el alumno también puede dar retroalimentación individual; los prototipos aprendidos se guardan en el navegador y modifican la búsqueda y el ranking en consultas posteriores.'),

  section('10. PRUEBAS Y RESULTADOS'),
  P('El archivo `test.js` verifica automáticamente el motor con `node sistema-experto/test.js`:'),
  bullets([
    'Cada prototipo es clasificado por el árbol como su propia carrera.',
    'Las reglas (encadenamiento hacia adelante) coinciden con el árbol en 500 perfiles aleatorios.',
    'A* devuelve el mismo top 3 que el ranking exhaustivo en 500 perfiles.',
    'Merge Sort ordena correctamente; flujo máximo = corte mínimo.',
    'LVQ no modifica los datos originales y mejora la exactitud.',
  ]),
  testOut.map(l => `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${C.dark}"/><w:spacing w:before="0" w:after="0"/></w:pPr>${run(l, { mono: true, size: 9, color: 'FFFFFF' })}</w:p>`).join(''),

  section('11. MANUAL DE USO'),
  P('1) Abrir `sistema-experto/index.html` en un navegador. 2) Contestar las 16 preguntas (o pulsar “Respuestas de ejemplo”) y pulsar “Evaluar perfil”. 3) Revisar cada módulo:'),
  shot('01-cuestionario', 'Figura 4. Cuestionario Likert.'),
  shot('02-diagnostico', 'Figura 5. Diagnóstico con explicación del camino y alternativas por A*.'),
  shot('03-arbol', 'Figura 6. Árbol de decisión con el camino resaltado.'),
  shot('04-busqueda', 'Figura 7. Búsquedas exhaustivas y heurística; ranking con Merge Sort.'),
  shot('05-cupos', 'Figura 8. Asignación de cupos con flujo máximo.'),
  shot('06-aprendizaje', 'Figura 9. Simulación del aprendizaje (LVQ).'),
  shot('07-conocimiento', 'Figura 10. Base de conocimiento: reglas y prototipos.'),

  section('CONCLUSIONES'),
  P('Se diseñó un sistema experto que resuelve un problema real de toma de decisiones: elegir carrera. El árbol de decisión y sus reglas capturan el criterio de un orientador de forma explicable, mientras que la búsqueda en el espacio de carreras ofrece alternativas ordenadas y un respaldo cuando las reglas no son concluyentes.'),
  P(`La comparación de algoritmos mostró que las búsquedas exhaustivas garantizan el óptimo a costa de visitar todo el espacio, y que una heurística admisible bien diseñada (A* con cajas envolventes) conserva la garantía de optimalidad visitando en promedio ${pct(avgExpanded / 32)} de los nodos. El teorema de flujo máximo permitió extender el sistema a decisiones grupales con recursos limitados, y LVQ mostró cómo el sistema puede mejorar su conocimiento con la experiencia.`),
  P('**Trabajo futuro:** validar los prototipos con datos reales de alumnos, usar flujo de costo mínimo para asignar a cada alumno su carrera más compatible y ampliar el catálogo de carreras.'),

  section('REFERENCIAS'),
  [
    'Cormen, T. H., Leiserson, C. E., Rivest, R. L. y Stein, C. (2022). Introduction to Algorithms (4.ª ed.). MIT Press.',
    'Edmonds, J. y Karp, R. M. (1972). Theoretical improvements in algorithmic efficiency for network flow problems. Journal of the ACM, 19(2), 248–264.',
    'Giarratano, J. y Riley, G. (2005). Expert Systems: Principles and Programming (4.ª ed.). Thomson.',
    'Hart, P. E., Nilsson, N. J. y Raphael, B. (1968). A formal basis for the heuristic determination of minimum cost paths. IEEE Transactions on Systems Science and Cybernetics, 4(2), 100–107.',
    'Holland, J. L. (1997). Making Vocational Choices (3.ª ed.). Psychological Assessment Resources.',
    'Kohonen, T. (2001). Self-Organizing Maps (3.ª ed.). Springer.',
    'Russell, S. y Norvig, P. (2021). Artificial Intelligence: A Modern Approach (4.ª ed.). Pearson.',
  ].map(r => `<w:p><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/><w:ind w:left="720" w:hanging="720"/></w:pPr>${run(r)}</w:p>`).join(''),

  section('ANEXO A · CÓDIGO FUENTE'),
  P(`Código creado por el equipo. Liga: ${EQUIPO.repositorio}. Para ejecutar: abrir \`sistema-experto/index.html\` en el navegador. Para las pruebas: \`node sistema-experto/test.js\`. La hoja de estilos \`styles.css\` se omite por ser solo presentación visual.`),
  code('engine.js'), code('app.js'), code('index.html'), code('test.js'),

  section('ANEXO B · GUION DEL VIDEO'),
  P('Duración sugerida: 8 minutos. Grabar la pantalla con la aplicación abierta en el navegador y la presentación a un lado. Cada integrante presenta una parte.'),
  table(['Tiempo', 'Integrante', 'En pantalla', 'Qué decir'],
    GUION.map(([t, who, screen, say]) => [t, EQUIPO.integrantes[who]?.nombre ?? 'Integrante ' + (who + 1), screen, say]), W(12, 22, 18, 48), { size: 9.5 }),

  section('ANEXO C · PRESENTACIÓN DE APOYO'),
  readdirSync(resolve(DOCS, 'figuras/diapositivas')).filter(f => f.endsWith('.png')).sort()
    .map((f, i) => image(resolve(DOCS, 'figuras/diapositivas', f), 5.6, `Diapositiva ${i + 1}`)).join(''),
].join('');

const newDoc = xmlDoc.slice(0, bodyStart) + cover + toc() + content + finalSect + '</w:body></w:document>';
writeFileSync(docPath, newDoc);

// ---------------------------------------------------------------- 3. relaciones, ajustes, empaquetado
const relsPath = resolve(work, 'word/_rels/document.xml.rels');
writeFileSync(relsPath, readFileSync(relsPath, 'utf8').replace('</Relationships>', rels.join('') + '</Relationships>'));

// Word actualiza el índice (números de página) al abrir.
const settingsPath = resolve(work, 'word/settings.xml');
const settings = readFileSync(settingsPath, 'utf8');
if (!settings.includes('<w:updateFields')) {
  const anchor = ['<w:hdrShapeDefaults', '<w:footnotePr', '<w:endnotePr', '<w:compat'].map(t => settings.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0];
  writeFileSync(settingsPath, settings.slice(0, anchor) + '<w:updateFields w:val="true"/>' + settings.slice(anchor));
}

// Título del documento en las propiedades.
const corePath = resolve(work, 'docProps/core.xml');
writeFileSync(corePath, readFileSync(corePath, 'utf8').replace(/<dc:title>[^<]*<\/dc:title>/, '<dc:title>PIA Sistema Experto de Orientación Vocacional</dc:title>'));

// Protección de ediciones manuales: se guarda la huella del último .docx generado. Si el archivo
// actual no coincide (alguien lo editó en Word) o no hay huella, NO se sobrescribe: se genera
// PIA_Sistema_Experto.generado.docx para copiar a mano lo que haga falta.
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const main = resolve(DOCS, '../PIA_Sistema_Experto.docx');
const hashFile = resolve(DOCS, '.docx-generado.sha256');
const edited = existsSync(main) && (!existsSync(hashFile) || readFileSync(hashFile, 'utf8').trim() !== sha(main));
const out = edited ? resolve(DOCS, '../PIA_Sistema_Experto.generado.docx') : main;
rmSync(out, { force: true });
execFileSync('zip', ['-X', '-q', '-r', out, '.'], { cwd: work });
rmSync(work, { recursive: true, force: true });
if (edited) {
  console.log('PIA_Sistema_Experto.docx tiene ediciones manuales: NO se sobrescribió.');
  console.log('Versión nueva en PIA_Sistema_Experto.generado.docx (copia lo que necesites, o bórrala).');
} else {
  writeFileSync(hashFile, sha(out) + '\n');
  console.log('Listo: PIA_Sistema_Experto.docx');
}
