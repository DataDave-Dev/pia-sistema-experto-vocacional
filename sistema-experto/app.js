/* Interfaz del sistema experto. Toda la lógica vive en engine.js (objeto global SE). */
(function () {
  'use strict';
  const $ = sel => document.querySelector(sel);
  const pct = x => (x * 100).toFixed(1) + '%';
  const fix = x => x.toFixed(2);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const careerName = code => (code ? SE.CAREERS[code].name : 'Perfil no concluyente');

  // ---------------------------------------------------------------- estado
  const STORE = 'se-vocacional-protos-v1';
  function loadProtos() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (saved && SE.CAREER_CODES.every(c => Array.isArray(saved[c]) && saved[c].length === SE.DIMS.length)) return saved;
    } catch (e) { /* almacenamiento no disponible: se usan los prototipos del experto */ }
    return SE.DEFAULT_PROTOS;
  }
  function saveProtos(p) {
    try { localStorage.setItem(STORE, JSON.stringify(p)); } catch (e) { /* sin almacenamiento: el aprendizaje dura la sesión */ }
  }
  const state = { protos: loadProtos(), profile: null, result: null };

  // ---------------------------------------------------------------- pestañas
  function showTab(id) {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === id));
  }
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---------------------------------------------------------------- 1. cuestionario
  $('#questions').innerHTML = SE.QUESTIONS.map((q, i) => `
    <li data-q="${i}">
      <span>${esc(q.text)}</span>
      <div class="likert" role="radiogroup" aria-label="Pregunta ${i + 1}">
        ${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="q${i}" value="${v}" aria-label="${v}"><span>${v}</span></label>`).join('')}
      </div>
    </li>`).join('');

  function readAnswers() {
    return SE.QUESTIONS.map((_, i) => {
      const checked = document.querySelector(`input[name="q${i}"]:checked`);
      return checked ? Number(checked.value) : null;
    });
  }

  $('#btnSample').addEventListener('click', () => {
    // Ejemplo: perfil afín a ingeniería en sistemas con algo de creatividad.
    const sample = [5, 4, 5, 5, 2, 1, 3, 2, 3, 2, 4, 4, 3, 2, 2, 2];
    sample.forEach((v, i) => { document.querySelector(`input[name="q${i}"][value="${v}"]`).checked = true; });
    $('#formError').textContent = '';
    document.querySelectorAll('.questions li').forEach(li => li.classList.remove('missing'));
  });

  $('#form').addEventListener('submit', ev => {
    ev.preventDefault();
    const answers = readAnswers();
    const missing = answers.map((a, i) => (a === null ? i : -1)).filter(i => i >= 0);
    document.querySelectorAll('.questions li').forEach(li => li.classList.toggle('missing', missing.includes(Number(li.dataset.q))));
    if (missing.length) {
      $('#formError').textContent = `Faltan ${missing.length} respuesta(s): preguntas ${missing.map(i => i + 1).join(', ')}.`;
      return;
    }
    $('#formError').textContent = '';
    evaluate(SE.profileFromAnswers(answers));
    showTab('diagnostico');
  });

  // ---------------------------------------------------------------- evaluación completa
  function evaluate(profile) {
    const p = state.protos;
    const ex = SE.dfs(profile, p);
    const bf = SE.bfs(profile, p);
    const hs = SE.astar(profile, 3, p);
    state.profile = profile;
    state.result = {
      tree: SE.classify(profile),
      chain: SE.forwardChain(profile),
      ex, bf, hs,
      rank: SE.ranking(profile, p),
    };
    document.querySelectorAll('.tabs button:disabled').forEach(b => { b.disabled = false; });
    renderDiagnosis();
    renderTree();
    renderSearch();
    renderFeedback();
    renderKnowledge();
  }

  function finalRecommendation() {
    const r = state.result;
    return r.tree.career || r.hs.top[0].code;
  }

  // ---------------------------------------------------------------- 2. diagnóstico
  function profileBars(vec) {
    return `<div class="bars">${SE.DIMS.map((d, i) => `
      <div class="bar"><span>${d.name}</span><div class="track"><div class="fill" style="width:${vec[i] * 100}%"></div></div><span class="num">${fix(vec[i])}</span></div>`).join('')}</div>`;
  }

  function pathSteps(path) {
    return `<ol class="steps">${path.map(s => `
      <li><span class="id">${s.node}</span>
        <span>${esc(s.text)}<br><span class="muted mono">${s.dim} = ${fix(s.value)} ${s.yes ? '≥' : '<'} ${s.thr}</span></span>
        <span class="tag ${s.yes ? 'yes' : 'no'}">${s.yes ? 'Sí' : 'No'}</span></li>`).join('')}</ol>`;
  }

  function renderDiagnosis() {
    const r = state.result;
    const code = finalRecommendation();
    const fired = r.chain.fired;
    const compat = SE.compatibility(SE.distance(state.profile, state.protos[code]));
    const note = r.tree.career
      ? `Conclusión del árbol de decisión, regla <b>${fired.id}</b> disparada por encadenamiento hacia adelante (${r.chain.trace.length} reglas evaluadas).`
      : `El árbol no fue concluyente (regla <b>${fired.id}</b>), así que se usa la carrera más cercana encontrada por A*.`;
    $('#diagnostico').innerHTML = `
      <div class="verdict">
        <div>
          <div class="hero">
            <span class="kicker">Recomendación principal</span>
            <h2>${esc(careerName(code))}</h2>
            <p>Compatibilidad del perfil: <b>${pct(compat)}</b></p>
            <span class="big">${code}</span>
          </div>
          <p>${note}</p>
          <h3>¿Por qué? Camino en el árbol</h3>
          ${pathSteps(r.tree.path)}
        </div>
        <div>
          <div class="card">
            <h3>Tu perfil</h3>
            ${profileBars(state.profile)}
          </div>
          <div class="card" style="margin-top:16px">
            <h3>Alternativas (búsqueda A*)</h3>
            <table><tbody>${r.hs.top.map((t, i) => `
              <tr class="${i === 0 ? 'top1' : ''}"><td>${i + 1}</td><td>${esc(careerName(t.code))}</td><td class="num">${pct(SE.compatibility(t.d))}</td></tr>`).join('')}
            </tbody></table>
          </div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- 3. árbol
  function renderTree() {
    const r = state.result;
    const on = new Set(r ? [...r.tree.path.map(s => s.node), r.tree.leaf.id] : []);
    $('#treeBox').innerHTML = SE.treeSVG(SE.DECISION_TREE, on);
    $('#pathBox').innerHTML = r
      ? `<h3>Camino recorrido → ${esc(careerName(r.tree.career))}</h3>${pathSteps(r.tree.path)}`
      : '<p class="muted">Responde el cuestionario para ver el camino resaltado.</p>';
    const t = SE.traversals();
    $('#travBox').innerHTML = [
      ['Preorden (raíz, Sí, No)', t.pre], ['Inorden (Sí, raíz, No)', t.in],
      ['Postorden (Sí, No, raíz)', t.post], ['Por niveles (anchura)', t.level],
    ].map(([name, list]) => `<div><b>${name}</b>${list.join(' → ')}</div>`).join('');
  }

  // ---------------------------------------------------------------- 4. búsqueda
  function chips(order) {
    return `<div class="chips">${order.map(id => `<span class="chip${SE.CAREERS[id] ? ' leaf' : ''}">${esc(id)}</span>`).join('')}</div>`;
  }

  function renderSearch() {
    const r = state.result;
    const card = (title, kind, res, extra) => `
      <div class="card">
        <span class="kicker">${kind}</span>
        <h3>${title}</h3>
        <div class="stat">${res.visited ?? res.expanded}<small> / 32 nodos visitados</small></div>
        <p class="muted">${extra}</p>
        ${chips(res.order)}
      </div>`;
    const saved = r.ex.visited - r.hs.expanded;
    $('#busqueda').innerHTML = `
      <div class="intro">
        <h2>Búsqueda en el espacio de carreras</h2>
        <p>Árbol de búsqueda: Raíz → 5 áreas → 10 subáreas → 16 carreras. Objetivo: la carrera con menor distancia euclidiana al perfil.
          A* usa como heurística la distancia del perfil a la caja envolvente de cada subárbol (cota inferior admisible), por lo que encuentra el mismo óptimo que las búsquedas exhaustivas.</p>
      </div>
      <div class="grid3">
        ${card('Profundidad (DFS)', 'Exhaustiva', r.ex, 'Mejor: ' + r.ex.best.code)}
        ${card('Anchura (BFS)', 'Exhaustiva', r.bf, 'Mejor: ' + r.bf.best.code)}
        ${card('A* · primero el mejor', 'Heurística', r.hs, `Top 3: ${r.hs.top.map(t => t.code).join(', ')} · ${r.hs.generated} generados`)}
      </div>
      <p><b>Optimización:</b> A* evitó visitar ${saved} nodos (${pct(saved / r.ex.visited)} menos) y obtuvo el mismo resultado.</p>
      <h3>Ranking completo · Merge Sort (${r.rank.comparisons} comparaciones)</h3>
      <div class="tablewrap"><table>
        <thead><tr><th>#</th><th>Código</th><th>Carrera</th><th>Distancia</th><th>Compatibilidad</th></tr></thead>
        <tbody>${r.rank.list.map((x, i) => `
          <tr class="${i === 0 ? 'top1' : ''}"><td>${i + 1}</td><td class="mono">${x.code}</td><td>${esc(careerName(x.code))}</td>
          <td class="num">${x.d.toFixed(3)}</td><td class="num">${pct(x.compat)}</td></tr>`).join('')}</tbody>
      </table></div>`;
  }

  // ---------------------------------------------------------------- 5. cupos
  $('#seats').innerHTML = SE.CAREER_CODES.map(c =>
    `<label title="${esc(careerName(c))}">${c}<input type="number" min="0" max="20" value="1" data-seat="${c}"></label>`).join('');
  $('#minCompat').addEventListener('input', e => { $('#minCompatOut').textContent = e.target.value + '%'; });

  $('#btnFlow').addEventListener('click', () => {
    const seats = {};
    document.querySelectorAll('[data-seat]').forEach(inp => {
      const v = Number(inp.value);
      seats[inp.dataset.seat] = Number.isFinite(v) && v >= 0 ? Math.min(20, Math.floor(v)) : 0;
      inp.value = seats[inp.dataset.seat];
    });
    const students = SE.sampleStudents(12);
    if (state.profile) students.push({ name: 'Tú', vec: state.profile });
    const minCompat = Number($('#minCompat').value) / 100;
    const res = SE.assignSeats(students, seats, minCompat, state.protos);
    const saturated = SE.CAREER_CODES.filter(c => seats[c] > 0 && res.filled[c] >= seats[c]);
    $('#flowOut').innerHTML = `
      <div class="grid3">
        <div class="card"><span class="kicker">Flujo máximo</span><div class="stat">${res.total}<small> de ${students.length} alumnos</small></div></div>
        <div class="card"><span class="kicker">Capacidad del corte mínimo</span><div class="stat">${res.cutCapacity}</div>
          <p class="muted">${res.total === res.cutCapacity ? 'Flujo máximo = corte mínimo ✓' : 'Diferencia detectada'}</p></div>
        <div class="card"><span class="kicker">Edmonds-Karp</span><div class="stat">${res.augmentations}<small> caminos aumentantes</small></div>
          <p class="muted">${res.edges} aristas en la red</p></div>
      </div>
      <h3>Asignación</h3>
      <div class="tablewrap"><table>
        <thead><tr><th>Alumno</th><th>Carrera asignada</th><th>Compatibilidad</th></tr></thead>
        <tbody>${res.assignments.map(a => `<tr${a.student === 'Tú' ? ' class="top1"' : ''}><td>${esc(a.student)}</td>
          <td>${a.code ? esc(careerName(a.code)) : '<span class="muted">Sin cupo compatible</span>'}</td>
          <td class="num">${a.compat === null ? '—' : pct(a.compat)}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="muted">Carreras saturadas (cupo lleno): ${saturated.join(', ') || 'ninguna'}.</p>`;
  });

  // ---------------------------------------------------------------- 6. aprendizaje
  function renderFeedback() {
    if (!state.result) return;
    const pred = finalRecommendation();
    $('#feedback').innerHTML = `
      <p>El sistema recomendó <b>${esc(careerName(pred))}</b>. ¿Qué carrera elegirías realmente?</p>
      <p><select id="actual">${SE.CAREER_CODES.map(c => `<option value="${c}"${c === pred ? ' selected' : ''}>${c} · ${esc(careerName(c))}</option>`).join('')}</select></p>
      <p><label>Tasa de aprendizaje α <input type="number" id="alpha" min="0.01" max="0.5" step="0.01" value="0.10"></label></p>
      <div class="actions"><button type="button" id="btnLearn" class="primary">Enviar retroalimentación</button></div>`;
    $('#btnLearn').addEventListener('click', () => {
      const actual = $('#actual').value;
      const alpha = Math.min(0.5, Math.max(0.01, Number($('#alpha').value) || 0.1));
      const before = state.protos;
      state.protos = SE.lvqUpdate(before, state.profile, pred, actual, alpha);
      saveProtos(state.protos);
      const changed = pred === actual ? [actual] : [actual, pred];
      $('#learnOut').innerHTML = `<h3>Prototipos ajustados (${pred === actual ? 'acierto: se refuerza' : 'error: se corrige'})</h3>` + protoTable(changed, before);
      evaluate(state.profile);
    });
  }

  function protoTable(codes, before) {
    return `<div class="tablewrap"><table>
      <thead><tr><th>Carrera</th>${SE.DIMS.map(d => `<th>${d.id}</th>`).join('')}</tr></thead>
      <tbody>${codes.map(c => `<tr><td class="mono">${c}</td>${state.protos[c].map((w, i) => {
        const delta = before ? w - before[c][i] : 0;
        return `<td class="num">${fix(w)}${before ? `<br><span class="muted">${delta >= 0 ? '+' : ''}${delta.toFixed(3)}</span>` : ''}</td>`;
      }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function curveSVG(curve) {
    const W = 420, H = 170, P = 30;
    const x = i => P + (i * (W - 2 * P)) / (curve.length - 1);
    const y = a => H - P - a * (H - 2 * P);
    const pts = curve.map((a, i) => `${x(i)},${y(a)}`).join(' ');
    return `<svg class="curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva de aprendizaje">
      <line class="axis" x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}"/><line class="axis" x1="${P}" y1="${P}" x2="${P}" y2="${H - P}"/>
      <text x="4" y="${y(1) + 4}">100%</text><text x="4" y="${y(0.5) + 4}">50%</text><text x="${W - P - 40}" y="${H - 8}">épocas</text>
      <polyline class="ln" points="${pts}"/>${curve.map((a, i) => `<circle cx="${x(i)}" cy="${y(a)}" r="3"/>`).join('')}</svg>`;
  }

  let lastSim = null;
  $('#btnSim').addEventListener('click', () => {
    lastSim = SE.simulateLearning(state.protos);
    const c = lastSim.curve;
    $('#simOut').innerHTML = `${curveSVG(c)}
      <p>Exactitud inicial <b>${pct(c[0])}</b> → final <b>${pct(c[c.length - 1])}</b> tras ${c.length - 1} épocas con ${lastSim.samples} ejemplos.</p>
      <div class="actions"><button type="button" id="btnAdopt" class="ghost">Adoptar prototipos aprendidos</button></div>`;
    $('#btnAdopt').addEventListener('click', () => {
      const before = state.protos;
      state.protos = lastSim.protos;
      saveProtos(state.protos);
      $('#learnOut').innerHTML = '<h3>Prototipos adoptados</h3>' + protoTable(SE.CAREER_CODES, before);
      if (state.profile) evaluate(state.profile);
      renderKnowledge();
    });
  });

  $('#btnReset').addEventListener('click', () => {
    state.protos = SE.DEFAULT_PROTOS;
    try { localStorage.removeItem(STORE); } catch (e) { /* nada que borrar */ }
    $('#learnOut').innerHTML = '<p class="muted">Prototipos restablecidos al conocimiento original del experto.</p>';
    if (state.profile) evaluate(state.profile);
    renderKnowledge();
  });

  // ---------------------------------------------------------------- 7. base de conocimiento
  function ruleText(rule) {
    const conds = rule.conds.map(c => `${c.dim} ${c.op === '>=' ? '≥' : '<'} ${c.thr}`).join(' Y ');
    return `${rule.id}: SI ${conds} ENTONCES ${rule.then || 'NO CONCLUYENTE → usar A*'}`;
  }

  function renderKnowledge() {
    const fired = state.result && state.result.chain.fired ? state.result.chain.fired.id : null;
    $('#conocimiento').innerHTML = `
      <div class="intro"><h2>Base de conocimiento</h2>
        <p>Hechos: perfil del alumno (8 dimensiones de 0 a 1). Reglas: los 17 caminos raíz-hoja del árbol de decisión.
          Motor de inferencia: encadenamiento hacia adelante.</p></div>
      <h3>Reglas SI-ENTONCES</h3>
      ${SE.RULES.map(r => `<div class="rule${r.id === fired ? ' fired' : ''}">${esc(ruleText(r))}</div>`).join('')}
      <h3>Dimensiones</h3>
      <p>${SE.DIMS.map(d => `<code>${d.id}</code> ${d.name}`).join(' · ')}</p>
      <h3>Prototipos de carrera ${state.protos === SE.DEFAULT_PROTOS ? '(conocimiento del experto)' : '(aprendidos)'}</h3>
      ${protoTable(SE.CAREER_CODES)}`;
  }

  renderTree();
  renderKnowledge();
})();
