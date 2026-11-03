// Genera la presentación de apoyo (PDF 16:9) y las figuras PNG que usa el documento Word.
// node docs/presentacion.mjs   (requiere chromium y pdftoppm)
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  EQUIPO, DOCS, SE, pct, name, ruleText, tree, chain, hs, rank, trav, avgExpanded, RUNS,
  students, flow, sim, pathIds, curveSVG, SVG_CSS,
} from './datos.mjs';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FIG = resolve(DOCS, 'figuras');
const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono&display=swap');";
const chromium = args => execFileSync('chromium', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=4000', ...args], { stdio: 'ignore' });

// ---------------------------------------------------------------- figuras para Word
function figure(file, svg, w, h) {
  const html = resolve(FIG, file + '.html');
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${FONTS}${SVG_CSS} html,body{margin:0;background:#fff} svg{display:block;width:${w}px;height:${h}px}</style>${svg}`);
  chromium(['--force-device-scale-factor=2', `--window-size=${w},${h}`, `--screenshot=${resolve(FIG, file + '.png')}`, 'file://' + html]);
  rmSync(html);
}
mkdirSync(FIG, { recursive: true });
figure('arbol', SE.treeSVG(SE.DECISION_TREE), 1336, 548);
figure('arbol-camino', SE.treeSVG(SE.DECISION_TREE, pathIds), 1336, 548);
figure('curva', curveSVG(sim.curve), 520, 200);

// ---------------------------------------------------------------- diapositivas
const integrantesRows = EQUIPO.integrantes.map(p => `<tr><td>${esc(p.nombre)}</td><td>${esc(p.carrera)}</td><td>${esc(p.matricula)}</td></tr>`).join('');
const slide = (body, cls = '') => `<div class="slide ${cls}">${body}<span class="foot">Sistema Experto de Orientación Vocacional · PIA</span></div>`;
const treeSvg = SE.treeSVG(SE.DECISION_TREE, pathIds);

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Presentación PIA</title><style>
${FONTS}${SVG_CSS}
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin:0; color:var(--ink); font-family:'IBM Plex Sans',system-ui,sans-serif; }
h1,h2 { font-family:'Fraunces',Georgia,serif; line-height:1.15; }
.kicker { font:600 13px 'IBM Plex Sans'; letter-spacing:.14em; text-transform:uppercase; color:var(--hot); }
table { border-collapse:collapse; width:100%; } th, td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); }
@page { size: 1280px 720px; margin: 0; }
.slide { width: 1280px; height: 720px; padding: 64px 80px; position: relative; overflow: hidden; break-after: page; background: var(--surface); display: flex; flex-direction: column; }
.slide h1 { font-size: 64px; margin: 0; letter-spacing: -.02em; }
.slide h2 { font-size: 44px; margin: 6px 0 24px; letter-spacing: -.01em; }
.slide p, .slide li { font-size: 24px; line-height: 1.45; }
.slide ul { margin: 0; padding-left: 28px; } .slide li { margin-bottom: 10px; }
.foot { position: absolute; bottom: 24px; left: 80px; font-size: 14px; color: var(--muted); }
.dark { background: var(--accent); color: #fff; } .dark .kicker { color: var(--hot-soft); } .dark .foot { color: #bfe0da; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
.big { font: 700 96px 'Fraunces'; color: var(--accent); line-height: 1; } .big small { font: 500 22px 'IBM Plex Sans'; color: var(--muted); display: block; }
.box { background: var(--paper); border-left: 6px solid var(--accent); padding: 16px 22px; font-size: 22px; border-radius: 4px; }
.box.hot { border-color: var(--hot); background: var(--hot-soft); }
.shot { width: 100%; border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 16px 40px -20px rgba(0,0,0,.35); }
.arch { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.arch div { border: 2px solid var(--accent); border-radius: 12px; padding: 16px; font-size: 19px; } .arch b { display: block; font: 700 22px 'Fraunces'; color: var(--accent); margin-bottom: 4px; }
.team td, .team th { font-size: 20px; color: #fff; border-color: rgba(255,255,255,.25); } .team th { color: #bfe0da; font-size: 14px; letter-spacing: .08em; }
code { font-family: 'IBM Plex Mono', monospace; font-size: .92em; background: var(--paper); padding: 1px 6px; border-radius: 4px; }
</style></head><body>
${slide(`<span class="kicker">PIA · ${esc(EQUIPO.materia)} · Equipo ${esc(EQUIPO.equipo)}</span>
  <h1 style="margin-top:20px">Sistema Experto de<br>Orientación Vocacional</h1>
  <p style="opacity:.85">Árbol de decisión · Reglas · Búsqueda exhaustiva y heurística · Flujo máximo · Aprendizaje</p>
  <table class="team" style="margin-top:auto;margin-bottom:30px"><thead><tr><th>INTEGRANTE</th><th>CARRERA</th><th>MATRÍCULA</th></tr></thead><tbody>${integrantesRows}</tbody></table>`, 'dark')}
${slide(`<span class="kicker">01 · Problema</span><h2>Elegir carrera sin orientación</h2>
  <div class="cols"><ul><li>Muchos alumnos eligen por presión social o información vaga.</li><li>Resultado: cambios de carrera y deserción en primeros semestres.</li><li>Pocos orientadores para muchos alumnos.</li></ul>
  <div class="box"><b>Decisión a apoyar:</b><br>dado el perfil de intereses de un alumno, ¿qué carrera es la más compatible, por qué, y cuáles son las alternativas?</div></div>`)}
${slide(`<span class="kicker">02 · Arquitectura</span><h2>Componentes del sistema experto</h2>
  <div class="arch"><div><b>Interfaz</b>Cuestionario Likert de 16 preguntas, 7 módulos.</div><div><b>Base de conocimiento</b>8 dimensiones, 16 carreras, árbol y 17 reglas.</div><div><b>Motor de inferencia</b>Recorrido del árbol + encadenamiento hacia adelante.</div>
  <div><b>Explicación</b>Muestra el camino y la regla disparada.</div><div><b>Búsqueda</b>DFS, BFS y A*; ranking con Merge Sort.</div><div><b>Aprendizaje</b>LVQ ajusta prototipos; flujo máximo asigna cupos.</div></div>
  <p style="margin-top:24px">JavaScript puro · corre en el navegador sin instalación · lógica separada de la interfaz.</p>`)}
${slide(`<span class="kicker">03 · Base de conocimiento</span><h2>Del cuestionario al perfil</h2>
  <div class="cols"><div><p>16 preguntas (1 a 5), 2 por dimensión. Cada dimensión: <code>(respuesta − 1) / 4</code> promediado → valor entre 0 y 1.</p>
  <p>${SE.DIMS.map(d => `<code>${d.id}</code>`).join(' ')}</p><p>Cada carrera tiene un <b>prototipo</b>: afinidad esperada en las 8 dimensiones, definida por el experto.</p></div>
  <img class="shot" src="capturas/01-cuestionario.png"></div>`)}
${slide(`<span class="kicker">04 · Árbol de decisión</span><h2 style="margin-bottom:8px">16 preguntas internas · 17 conclusiones</h2>${treeSvg}
  <p style="font-size:20px;margin-top:6px">Izquierda = Sí, derecha = No. Resaltado: camino del perfil de ejemplo → <b>${name(tree.career)}</b>. La hoja “¿?” activa la búsqueda heurística.</p>`)}
${slide(`<span class="kicker">05 · Reglas e inferencia</span><h2>Cada camino es una regla</h2>
  <div class="box" style="font-family:'IBM Plex Mono';font-size:22px">${esc(ruleText(chain.fired))}</div>
  <ul style="margin-top:24px"><li><b>Hechos:</b> el perfil del alumno en la memoria de trabajo.</li><li><b>Encadenamiento hacia adelante:</b> se evalúan las reglas y se dispara la que cumple todas sus premisas (${chain.trace.length} evaluadas en el ejemplo).</li><li><b>Explicación:</b> se muestra cada condición con el valor del alumno.</li></ul>`)}
${slide(`<span class="kicker">06 · Búsqueda</span><h2>Exhaustiva vs heurística</h2>
  <div class="cols"><div><p>Espacio: Raíz → 5 áreas → 10 subáreas → 16 carreras (32 nodos). Meta: menor distancia euclidiana al perfil.</p>
  <ul><li><b>DFS</b> (pila) y <b>BFS</b> (cola): visitan los 32 nodos.</li><li><b>A*</b>: expande el nodo con menor <code>f = g + h</code>.</li></ul></div>
  <div><div class="big">32<small>nodos DFS / BFS</small></div><div class="big" style="margin-top:20px;color:var(--hot)">${avgExpanded.toFixed(1)}<small>nodos promedio con A* (${RUNS} perfiles) · mismo resultado</small></div></div></div>`)}
${slide(`<span class="kicker">07 · Heurística</span><h2>¿Por qué A* no se equivoca?</h2>
  <div class="cols"><div><p><code>h(n)</code> = distancia del perfil a la <b>caja envolvente</b> del subárbol: mínimo y máximo de cada dimensión entre sus carreras.</p>
  <div class="box hot">Toda carrera del subárbol está dentro de la caja ⇒ h(n) nunca sobreestima ⇒ heurística <b>admisible</b> ⇒ A* encuentra el óptimo.</div></div>
  <img class="shot" src="capturas/04-busqueda.png"></div>`)}
${slide(`<span class="kicker">08 · Recorridos y ordenamiento</span><h2>Recorrer y ordenar</h2>
  <div class="cols"><div><p><b>Recorridos del árbol</b></p><ul style="font-size:20px"><li>Preorden: extraer reglas</li><li>Inorden: posición horizontal al dibujar</li><li>Postorden y por niveles</li></ul>
  <p style="font-family:'IBM Plex Mono';font-size:16px">${trav.pre.slice(0, 14).join(' ')} …</p></div>
  <div><p><b>Merge Sort</b> — divide y vencerás, <code>O(n log n)</code>, estable.</p><p>Ordena las 16 carreras por compatibilidad: ${rank.comparisons} comparaciones.</p>
  <ol style="font-size:20px">${rank.list.slice(0, 3).map(r => `<li>${name(r.code)} · ${pct(r.compat)}</li>`).join('')}</ol></div></div>`)}
${slide(`<span class="kicker">09 · Teorema de flujo</span><h2>Asignación de cupos</h2>
  <div class="cols"><div><p>fuente → alumno (1) → carrera compatible (1) → sumidero (cupos)</p><p><b>Edmonds-Karp:</b> caminos aumentantes por BFS en la red residual.</p>
  <div class="box">Flujo máximo = corte mínimo<br><b>${flow.total} = ${flow.cutCapacity}</b> alumnos ubicados de ${students.length}</div></div>
  <img class="shot" src="capturas/05-cupos.png"></div>`)}
${slide(`<span class="kicker">10 · Aprendizaje</span><h2>El sistema mejora con experiencia</h2>
  <div class="cols"><div><p><b>LVQ:</b> el prototipo correcto se acerca al alumno, el equivocado se aleja.</p><p><code>w ← w ± α (x − w)</code></p>
  <p>Simulación: ${sim.samples} egresados con perfiles distintos al conocimiento inicial.</p><div class="big">${pct(sim.curve[0])} → ${pct(sim.curve.at(-1))}<small>exactitud en ${sim.curve.length - 1} épocas</small></div></div>
  <div>${curveSVG(sim.curve)}</div></div>`)}
${slide(`<span class="kicker">11 · Demostración</span><h2>Resultado para el perfil de ejemplo</h2><img class="shot" src="capturas/02-diagnostico.png" style="max-height:500px;width:auto;align-self:flex-start">`)}
${slide(`<span class="kicker">12 · Conclusiones</span><h2>Lo que aprendimos</h2>
  <ul><li>Un árbol de decisión hace explicable el criterio del experto.</li><li>La búsqueda exhaustiva garantiza el óptimo; una heurística admisible lo conserva visitando ~${pct(avgExpanded / 32)} de los nodos.</li>
  <li>Flujo máximo extiende la decisión a grupos con recursos limitados.</li><li>El aprendizaje corrige el conocimiento inicial con datos.</li></ul>
  <p style="margin-top:auto;margin-bottom:30px;font:700 40px 'Fraunces';color:var(--accent)">¿Preguntas?</p>`)}
</body></html>`;

const htmlPath = resolve(DOCS, 'presentacion.html');
const pdfPath = resolve(DOCS, 'Presentacion_PIA.pdf');
writeFileSync(htmlPath, html);
chromium(['--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, 'file://' + htmlPath]);

// Cada diapositiva como PNG para insertarla en el Anexo C del documento Word.
rmSync(resolve(FIG, 'diapositivas'), { recursive: true, force: true });
mkdirSync(resolve(FIG, 'diapositivas'));
execFileSync('pdftoppm', ['-png', '-r', '110', pdfPath, resolve(FIG, 'diapositivas', 'd')]);
console.log('Listo: docs/Presentacion_PIA.pdf y figuras en docs/figuras/');
