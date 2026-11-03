// Datos compartidos por el documento Word y la presentación: equipo + resultados reales del motor.
// Edita EQUIPO y vuelve a generar: node docs/presentacion.mjs && node docs/documento-word.mjs
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

export const EQUIPO = {
  materia: 'SEMINARIO DE SISTEMAS M1',
  catedratico: '[NOMBRE DEL CATEDRÁTICO]',
  equipo: '[#]',
  periodo: 'AGOSTO – DICIEMBRE 2026',
  fecha: '5 DE NOVIEMBRE DE 2026',
  integrantes: [
    { nombre: 'DE LEON RODARTE ALONSO DAVID', matricula: '2173878', carrera: 'IAS' },
    { nombre: 'DE LA CRUZ ALONSO EDWIN ALEJANDRO', matricula: '2014770', carrera: 'IAS' },
    { nombre: 'RAMOS RINCON FERNANDO YAHIR', matricula: '1995357', carrera: 'IAS' },
    { nombre: 'ROSENBAUM LOPEZ LOTHAR PAUL', matricula: '2173867', carrera: 'IAS' },
    { nombre: 'DAHIR GALLEGOS MARRUFO', matricula: '2097087', carrera: 'IAS' },
  ],
  video: '[Pegar aquí la liga del video]',
  repositorio: 'https://github.com/DataDave-Dev/pia-sistema-experto-vocacional',
};

export const DOCS = import.meta.dirname;
export const APP = resolve(DOCS, '../sistema-experto');
export const SE = createRequire(import.meta.url)(resolve(APP, 'engine.js'));

export const pct = x => (x * 100).toFixed(1) + '%';
export const name = c => (c ? SE.CAREERS[c].name : 'No concluyente → A*');
export const ruleText = r =>
  `${r.id}: SI ${r.conds.map(c => `${c.dim} ${c.op === '>=' ? '≥' : '<'} ${c.thr}`).join(' Y ')} ENTONCES ${r.then || 'NO CONCLUYENTE (usar A*)'}`;

// Mismo perfil que el botón "Respuestas de ejemplo" de la app.
export const SAMPLE = [5, 4, 5, 5, 2, 1, 3, 2, 3, 2, 4, 4, 3, 2, 2, 2];
export const profile = SE.profileFromAnswers(SAMPLE);
export const tree = SE.classify(profile);
export const chain = SE.forwardChain(profile);
export const ex = SE.dfs(profile);
export const bf = SE.bfs(profile);
export const hs = SE.astar(profile, 3);
export const rank = SE.ranking(profile);
export const trav = SE.traversals();

export const RUNS = 1000;
const rnd = SE.rng(42);
let expandedSum = 0;
for (let i = 0; i < RUNS; i++) expandedSum += SE.astar(SE.DIMS.map(() => rnd()), 1).expanded;
export const avgExpanded = expandedSum / RUNS;

export const students = SE.sampleStudents(12);
export const flow = SE.assignSeats(students, Object.fromEntries(SE.CAREER_CODES.map(c => [c, 1])), 0.8);
export const sim = SE.simulateLearning(SE.DEFAULT_PROTOS);

export const pathIds = new Set([...tree.path.map(s => s.node), tree.leaf.id]);

export function curveSVG(curve) {
  const W = 520, H = 200, P = 34;
  const x = i => P + (i * (W - 2 * P)) / (curve.length - 1);
  const y = a => H - P - a * (H - 2 * P);
  return `<svg class="curve" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}"/><line x1="${P}" y1="${P}" x2="${P}" y2="${H - P}"/>
    <text x="2" y="${y(1) + 4}">100%</text><text x="6" y="${y(0.5) + 4}">50%</text><text x="${W - P - 44}" y="${H - 10}">épocas →</text>
    <polyline points="${curve.map((a, i) => `${x(i)},${y(a)}`).join(' ')}"/>${curve.map((a, i) => `<circle cx="${x(i)}" cy="${y(a)}" r="3.5"/>`).join('')}</svg>`;
}

export const SVG_CSS = `
  /* Paleta de la portada FIME: verde oliva 9BBA58, títulos 76923C, relleno EAF0DD, bordes C2D59B. */
  :root { --ink:#1f2a12; --muted:#5f6b4c; --line:#c2d59b; --accent:#76923c; --accent-soft:#eaf0dd; --hot:#4f6228; --hot-soft:#d7e4bc; --paper:#f4f7ec; --surface:#ffffff; }
  .dtree { width:100%; height:auto; }
  .dtree .link { stroke:var(--line); stroke-width:2; } .dtree .link.on { stroke:var(--hot); stroke-width:4; }
  .dtree .elabel { font:10px 'IBM Plex Sans',sans-serif; fill:var(--muted); }
  .dtree rect { fill:#fff; stroke:var(--accent); stroke-width:1.5; }
  .dtree .qid { font:700 13px 'Fraunces',Georgia,serif; fill:var(--ink); } .dtree .qtest { font:10px 'IBM Plex Mono',monospace; fill:var(--muted); }
  .dtree .leaf rect { fill:var(--accent-soft); } .dtree .leaf text { font:600 12px 'IBM Plex Mono',monospace; fill:var(--accent); }
  .dtree .leaf.nd rect { fill:#fff; stroke-dasharray:4 3; }
  .dtree .on rect { fill:var(--hot); stroke:var(--hot); } .dtree .on text { fill:#fff; }
  .curve line { stroke:var(--line); } .curve polyline { fill:none; stroke:var(--accent); stroke-width:3; }
  .curve circle { fill:var(--accent); } .curve text { font:11px 'IBM Plex Mono',monospace; fill:var(--muted); }
`;

// Reparto del video entre los 5 integrantes (índice en EQUIPO.integrantes).
export const GUION = [
  ['0:00–1:30', 0, 'Diapositivas 1–4 · pestaña 1', 'Presentar al equipo y el problema: muchos alumnos eligen carrera sin orientación, lo que provoca cambios de carrera y deserción. Explicar los componentes del sistema experto y el cuestionario (16 preguntas, 8 dimensiones). Pulsar “Respuestas de ejemplo” y “Evaluar perfil”.'],
  ['1:30–3:00', 1, 'Pestañas 2 y 3', 'Leer la recomendación y su compatibilidad. Explicar el camino en el árbol nodo por nodo (valor del alumno contra el umbral). Mostrar el árbol con el camino resaltado y los cuatro recorridos.'],
  ['3:00–4:45', 2, 'Pestañas 7 y 4 · diapositiva 7', 'Mostrar que cada camino del árbol es una regla SI-ENTONCES y explicar el encadenamiento hacia adelante. Comparar DFS y BFS (32 nodos) contra A* con el mismo resultado; explicar la heurística admisible y el ranking con Merge Sort.'],
  ['4:45–6:15', 3, 'Pestaña 5', 'Explicar la red de flujo de cupos. Cambiar cupos o el umbral y pulsar “Asignar cupos”. Señalar que el flujo máximo es igual al corte mínimo.'],
  ['6:15–8:00', 4, 'Pestaña 6 · terminal · diapositiva 13', 'Pulsar “Simular aprendizaje” y explicar la curva. Enviar una retroalimentación y mostrar cómo cambian los prototipos. Ejecutar node sistema-experto/test.js y cerrar con las conclusiones.'],
];
