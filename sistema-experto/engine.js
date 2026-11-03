/*
 * Motor del Sistema Experto de Orientación Vocacional.
 * Lógica pura (sin DOM): se usa desde index.html, documento y pruebas en Node.
 *
 * Componentes:
 *  1. Base de conocimiento: dimensiones, preguntas, carreras (prototipos) y árbol de decisión.
 *  2. Motor de inferencia: recorrido del árbol + encadenamiento hacia adelante sobre reglas SI-ENTONCES.
 *  3. Búsquedas exhaustivas (DFS, BFS) y heurística (A* con cota inferior admisible).
 *  4. Ordenamiento (Merge Sort) del ranking de compatibilidad.
 *  5. Recorridos de árbol (preorden, inorden, postorden, por niveles).
 *  6. Flujo máximo (Edmonds-Karp) para asignar cupos; verifica teorema flujo máximo = corte mínimo.
 *  7. Aprendizaje (LVQ) que ajusta los prototipos de carrera con retroalimentación.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- 1. Base de conocimiento
  const DIMS = [
    { id: 'mat', name: 'Matemáticas y lógica' },
    { id: 'tec', name: 'Tecnología y computación' },
    { id: 'cie', name: 'Ciencias naturales y salud' },
    { id: 'soc', name: 'Servicio a personas' },
    { id: 'hum', name: 'Lectura y argumentación' },
    { id: 'art', name: 'Creatividad y arte' },
    { id: 'neg', name: 'Negocios y liderazgo' },
    { id: 'man', name: 'Trabajo práctico' },
  ];
  const DIM_INDEX = Object.fromEntries(DIMS.map((d, i) => [d.id, i]));

  const QUESTIONS = [
    { dim: 'mat', text: 'Disfruto resolver problemas de matemáticas o de lógica.' },
    { dim: 'mat', text: 'Me resulta fácil entender fórmulas, números y estadísticas.' },
    { dim: 'tec', text: 'Me interesa saber cómo funcionan las computadoras y el software.' },
    { dim: 'tec', text: 'Me gustaría programar aplicaciones, videojuegos o robots.' },
    { dim: 'cie', text: 'Me gustan la biología, la química o el estudio del cuerpo humano.' },
    { dim: 'cie', text: 'Me interesaría trabajar en un laboratorio, hospital o clínica.' },
    { dim: 'soc', text: 'Me gusta ayudar a otras personas con sus problemas.' },
    { dim: 'soc', text: 'Me siento a gusto cuidando, enseñando o escuchando a otros.' },
    { dim: 'hum', text: 'Disfruto leer, escribir y expresar mis ideas.' },
    { dim: 'hum', text: 'Me gusta debatir y defender un punto de vista con argumentos.' },
    { dim: 'art', text: 'Me gusta dibujar, diseñar o crear cosas visuales.' },
    { dim: 'art', text: 'Suelo proponer ideas creativas y originales.' },
    { dim: 'neg', text: 'Me interesa emprender, vender o administrar dinero.' },
    { dim: 'neg', text: 'Me gusta organizar equipos y tomar decisiones como líder.' },
    { dim: 'man', text: 'Prefiero actividades prácticas donde uso las manos o herramientas.' },
    { dim: 'man', text: 'Me gustaría construir, armar o reparar objetos y estructuras.' },
  ];

  // Prototipo de cada carrera: afinidad esperada (0 a 1) en cada dimensión, en el orden de DIMS.
  //                     mat  tec  cie  soc  hum  art  neg  man
  const CAREERS = {
    ISC: { name: 'Ingeniería en Sistemas Computacionales', vec: [0.8, 1.0, 0.3, 0.2, 0.2, 0.3, 0.3, 0.2] },
    IME: { name: 'Ingeniería Mecatrónica',                 vec: [0.9, 0.8, 0.5, 0.1, 0.1, 0.3, 0.2, 0.9] },
    IIN: { name: 'Ingeniería Industrial',                  vec: [0.8, 0.5, 0.3, 0.4, 0.2, 0.1, 0.7, 0.5] },
    ICV: { name: 'Ingeniería Civil',                       vec: [0.8, 0.3, 0.4, 0.2, 0.2, 0.3, 0.4, 0.9] },
    MED: { name: 'Médico Cirujano',                        vec: [0.5, 0.3, 1.0, 0.9, 0.4, 0.1, 0.2, 0.6] },
    ENF: { name: 'Enfermería',                             vec: [0.3, 0.2, 0.8, 1.0, 0.3, 0.1, 0.1, 0.7] },
    QFB: { name: 'Químico Farmacéutico Biólogo',           vec: [0.6, 0.3, 1.0, 0.3, 0.2, 0.1, 0.2, 0.5] },
    PSI: { name: 'Psicología',                             vec: [0.3, 0.2, 0.6, 1.0, 0.7, 0.3, 0.2, 0.1] },
    DER: { name: 'Derecho',                                vec: [0.2, 0.1, 0.1, 0.6, 1.0, 0.1, 0.6, 0.1] },
    EDU: { name: 'Ciencias de la Educación',               vec: [0.3, 0.3, 0.3, 0.9, 0.8, 0.5, 0.2, 0.2] },
    COM: { name: 'Ciencias de la Comunicación',            vec: [0.1, 0.6, 0.1, 0.6, 0.8, 0.7, 0.4, 0.2] },
    ADM: { name: 'Administración de Empresas',             vec: [0.5, 0.4, 0.1, 0.5, 0.4, 0.2, 1.0, 0.1] },
    CPA: { name: 'Contaduría Pública',                     vec: [0.9, 0.4, 0.1, 0.2, 0.3, 0.1, 0.8, 0.1] },
    MKT: { name: 'Mercadotecnia',                          vec: [0.4, 0.5, 0.1, 0.6, 0.5, 0.7, 0.9, 0.1] },
    ARQ: { name: 'Arquitectura',                           vec: [0.6, 0.5, 0.2, 0.3, 0.3, 0.9, 0.3, 0.8] },
    DIG: { name: 'Diseño Gráfico',                         vec: [0.2, 0.7, 0.1, 0.3, 0.4, 1.0, 0.3, 0.4] },
  };
  const CAREER_CODES = Object.keys(CAREERS);
  const DEFAULT_PROTOS = Object.fromEntries(CAREER_CODES.map(c => [c, CAREERS[c].vec.slice()]));

  // Espacio de búsqueda: árbol Raíz → Área → Subárea → Carrera.
  const leafOf = code => ({ id: code, career: code });
  const group = (id, name, children) => ({ id, name, children });
  const TAXONOMY = group('Raíz', 'Carreras', [
    group('ING', 'Ingeniería y Tecnología', [
      group('ING-1', 'Tecnología', [leafOf('ISC'), leafOf('IME')]),
      group('ING-2', 'Procesos e infraestructura', [leafOf('IIN'), leafOf('ICV')]),
    ]),
    group('SAL', 'Ciencias de la Salud', [
      group('SAL-1', 'Clínica', [leafOf('MED'), leafOf('ENF')]),
      group('SAL-2', 'Ciencia y mente', [leafOf('QFB'), leafOf('PSI')]),
    ]),
    group('SOC', 'Sociales y Humanidades', [
      group('SOC-1', 'Jurídico-social', [leafOf('DER'), leafOf('EDU')]),
      group('SOC-2', 'Medios', [leafOf('COM')]),
    ]),
    group('ECO', 'Económico-Administrativas', [
      group('ECO-1', 'Finanzas', [leafOf('CPA'), leafOf('ADM')]),
      group('ECO-2', 'Mercados', [leafOf('MKT')]),
    ]),
    group('ART', 'Arte y Diseño', [
      group('ART-1', 'Espacio', [leafOf('ARQ')]),
      group('ART-2', 'Visual', [leafOf('DIG')]),
    ]),
  ]);

  // Árbol de decisión binario elaborado con el criterio del experto (orientador vocacional).
  const ask = (id, dim, thr, text, yes, no) => ({ id, dim, thr, text, yes, no });
  const conclude = career => ({ id: 'H-' + (career || 'ND'), leaf: true, career });
  const DECISION_TREE =
    ask('A', 'cie', 0.6, '¿Afinidad alta por ciencias naturales y salud?',
      ask('B', 'soc', 0.6, '¿Afinidad alta por el servicio a personas?',
        ask('C', 'man', 0.6, '¿Prefiere el trabajo práctico?',
          ask('D', 'mat', 0.5, '¿Afinidad media o alta por matemáticas?', conclude('MED'), conclude('ENF')),
          conclude('PSI')),
        conclude('QFB')),
      ask('E', 'mat', 0.6, '¿Afinidad alta por matemáticas y lógica?',
        ask('F', 'tec', 0.6, '¿Afinidad alta por tecnología?',
          ask('G', 'man', 0.6, '¿Prefiere el trabajo práctico?', conclude('IME'), conclude('ISC')),
          ask('H', 'neg', 0.6, '¿Afinidad alta por negocios?',
            ask('I', 'man', 0.5, '¿Gusto medio o alto por lo práctico?', conclude('IIN'), conclude('CPA')),
            ask('J', 'art', 0.6, '¿Afinidad alta por creatividad y arte?', conclude('ARQ'), conclude('ICV')))),
        ask('K', 'art', 0.6, '¿Afinidad alta por creatividad y arte?',
          ask('L', 'neg', 0.6, '¿Afinidad alta por negocios?', conclude('MKT'),
            ask('M', 'hum', 0.6, '¿Afinidad alta por lectura y argumentación?', conclude('COM'), conclude('DIG'))),
          ask('N', 'neg', 0.6, '¿Afinidad alta por negocios?',
            ask('O', 'hum', 0.6, '¿Afinidad alta por lectura y argumentación?', conclude('DER'), conclude('ADM')),
            ask('P', 'soc', 0.6, '¿Afinidad alta por el servicio a personas?', conclude('EDU'), conclude(null))))));

  // ---------------------------------------------------------------- utilidades
  const clamp01 = v => Math.min(1, Math.max(0, v));

  function distance(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s);
  }

  // Compatibilidad 0..1 = 1 - (distancia / distancia máxima posible).
  const compatibility = d => 1 - d / Math.sqrt(DIMS.length);

  // Generador pseudoaleatorio con semilla (mulberry32) para simulaciones reproducibles.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- 2. Motor de inferencia
  // Respuestas Likert 1..5 → perfil de 8 dimensiones en 0..1 (promedio por dimensión).
  function profileFromAnswers(answers) {
    if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
      throw new Error('Se esperaban ' + QUESTIONS.length + ' respuestas');
    }
    const sums = DIMS.map(() => 0);
    const counts = DIMS.map(() => 0);
    answers.forEach((a, i) => {
      if (!Number.isInteger(a) || a < 1 || a > 5) throw new Error('Respuesta inválida en la pregunta ' + (i + 1));
      const d = DIM_INDEX[QUESTIONS[i].dim];
      sums[d] += (a - 1) / 4;
      counts[d]++;
    });
    return sums.map((s, d) => s / counts[d]);
  }

  // Recorre el árbol de decisión desde la raíz hasta una hoja (conclusión).
  function classify(vec, tree = DECISION_TREE) {
    const path = [];
    let node = tree;
    while (!node.leaf) {
      const value = vec[DIM_INDEX[node.dim]];
      const yes = value >= node.thr;
      path.push({ node: node.id, dim: node.dim, thr: node.thr, value, yes, text: node.text });
      node = yes ? node.yes : node.no;
    }
    return { leaf: node, career: node.career, path };
  }

  // Cada camino raíz→hoja del árbol es una regla SI <condiciones> ENTONCES <carrera>.
  function extractRules(tree = DECISION_TREE) {
    const rules = [];
    (function walk(node, conds) {
      if (node.leaf) {
        rules.push({ id: 'R' + (rules.length + 1), conds, then: node.career });
        return;
      }
      walk(node.yes, [...conds, { dim: node.dim, op: '>=', thr: node.thr }]);
      walk(node.no, [...conds, { dim: node.dim, op: '<', thr: node.thr }]);
    })(tree, []);
    return rules;
  }
  const RULES = extractRules();

  const holds = (cond, vec) => {
    const v = vec[DIM_INDEX[cond.dim]];
    return cond.op === '>=' ? v >= cond.thr : v < cond.thr;
  };

  // Encadenamiento hacia adelante: los hechos (perfil) se comparan con la agenda de reglas;
  // se dispara la primera regla cuyas premisas se cumplen todas.
  function forwardChain(vec, rules = RULES) {
    const trace = [];
    for (const rule of rules) {
      const failedAt = rule.conds.findIndex(c => !holds(c, vec));
      trace.push({ rule: rule.id, ok: failedAt === -1, failedAt });
      if (failedAt === -1) return { fired: rule, trace };
    }
    return { fired: null, trace };
  }

  // ---------------------------------------------------------------- 3. Búsquedas
  // Caja envolvente (mínimo y máximo por dimensión) de los prototipos bajo cada nodo.
  function computeBoxes(tree, protos) {
    const boxes = new Map();
    (function box(node) {
      if (node.career) {
        const v = protos[node.career];
        return { min: v.slice(), max: v.slice() };
      }
      const kids = node.children.map(box);
      const b = {
        min: DIMS.map((_, i) => Math.min(...kids.map(k => k.min[i]))),
        max: DIMS.map((_, i) => Math.max(...kids.map(k => k.max[i]))),
      };
      boxes.set(node.id, b);
      return b;
    })(tree);
    return boxes;
  }

  // Heurística admisible: distancia del perfil a la caja del subárbol. Nunca supera la
  // distancia real a cualquier carrera del subárbol, por lo que A* devuelve el óptimo.
  function lowerBound(vec, box) {
    let s = 0;
    for (let i = 0; i < vec.length; i++) {
      const gap = Math.max(0, box.min[i] - vec[i], vec[i] - box.max[i]);
      s += gap * gap;
    }
    return Math.sqrt(s);
  }

  const bestOf = results => results.reduce((a, b) => (b.d < a.d ? b : a));

  // Búsqueda exhaustiva en profundidad (pila).
  function dfs(vec, protos = DEFAULT_PROTOS, tree = TAXONOMY) {
    const order = [];
    const results = [];
    const stack = [tree];
    while (stack.length) {
      const node = stack.pop();
      order.push(node.id);
      if (node.career) results.push({ code: node.career, d: distance(vec, protos[node.career]) });
      else for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
    }
    return { order, results, best: bestOf(results), visited: order.length };
  }

  // Búsqueda exhaustiva en anchura (cola).
  function bfs(vec, protos = DEFAULT_PROTOS, tree = TAXONOMY) {
    const order = [];
    const results = [];
    const queue = [tree];
    while (queue.length) {
      const node = queue.shift();
      order.push(node.id);
      if (node.career) results.push({ code: node.career, d: distance(vec, protos[node.career]) });
      else queue.push(...node.children);
    }
    return { order, results, best: bestOf(results), visited: order.length };
  }

  // Búsqueda heurística A*: f(n) = g(n) + h(n), con g = 0 en nodos internos y h = cota inferior;
  // en una hoja f es la distancia exacta. Extrae las k carreras más cercanas en orden.
  function astar(vec, k = 3, protos = DEFAULT_PROTOS, tree = TAXONOMY) {
    const boxes = computeBoxes(tree, protos);
    const f = node => (node.career ? distance(vec, protos[node.career]) : lowerBound(vec, boxes.get(node.id)));
    const open = [{ node: tree, f: f(tree) }];
    const order = [];
    const top = [];
    let generated = 1;
    while (open.length && top.length < k) {
      // ponytail: lista ordenada en cada extracción, suficiente para 32 nodos; usar montículo si el árbol crece
      open.sort((a, b) => a.f - b.f);
      const { node, f: fn } = open.shift();
      order.push(node.id);
      if (node.career) {
        top.push({ code: node.career, d: fn });
        continue;
      }
      for (const child of node.children) open.push({ node: child, f: f(child) });
      generated += node.children.length;
    }
    return { order, top, expanded: order.length, generated };
  }

  // ---------------------------------------------------------------- 4. Ordenamiento
  function mergeSort(items, cmp) {
    let comparisons = 0;
    const sort = arr => {
      if (arr.length <= 1) return arr;
      const mid = arr.length >> 1;
      const left = sort(arr.slice(0, mid));
      const right = sort(arr.slice(mid));
      const out = [];
      let i = 0;
      let j = 0;
      while (i < left.length && j < right.length) {
        comparisons++;
        out.push(cmp(left[i], right[j]) <= 0 ? left[i++] : right[j++]);
      }
      return out.concat(left.slice(i), right.slice(j));
    };
    return { sorted: sort(items.slice()), comparisons };
  }

  // Ranking completo de carreras por compatibilidad (búsqueda exhaustiva + Merge Sort).
  function ranking(vec, protos = DEFAULT_PROTOS) {
    const { results } = dfs(vec, protos);
    const { sorted, comparisons } = mergeSort(results, (a, b) => a.d - b.d);
    return { list: sorted.map(r => ({ ...r, compat: compatibility(r.d) })), comparisons };
  }

  // ---------------------------------------------------------------- 5. Recorridos del árbol de decisión
  function traversals(tree = DECISION_TREE) {
    const pre = [];
    const ino = [];
    const post = [];
    (function walk(n) {
      pre.push(n.id);
      if (!n.leaf) walk(n.yes);
      ino.push(n.id);
      if (!n.leaf) walk(n.no);
      post.push(n.id);
    })(tree);
    const level = [];
    const queue = [tree];
    while (queue.length) {
      const n = queue.shift();
      level.push(n.id);
      if (!n.leaf) queue.push(n.yes, n.no);
    }
    return { pre, in: ino, post, level };
  }

  // ---------------------------------------------------------------- 6. Flujo máximo (Edmonds-Karp)
  function maxFlow(n, edges, s, t) {
    const cap = Array.from({ length: n }, () => new Array(n).fill(0));
    const flow = Array.from({ length: n }, () => new Array(n).fill(0));
    edges.forEach(e => { cap[e.from][e.to] += e.cap; });
    const residual = (u, v) => cap[u][v] - flow[u][v];
    let total = 0;
    let augmentations = 0;
    let prev;
    for (;;) {
      prev = new Array(n).fill(-1);
      prev[s] = s;
      const queue = [s];
      while (queue.length && prev[t] === -1) {
        const u = queue.shift();
        for (let v = 0; v < n; v++) {
          if (prev[v] === -1 && residual(u, v) > 0) { prev[v] = u; queue.push(v); }
        }
      }
      if (prev[t] === -1) break;
      let bottleneck = Infinity;
      for (let v = t; v !== s; v = prev[v]) bottleneck = Math.min(bottleneck, residual(prev[v], v));
      for (let v = t; v !== s; v = prev[v]) {
        flow[prev[v]][v] += bottleneck;
        flow[v][prev[v]] -= bottleneck;
      }
      total += bottleneck;
      augmentations++;
    }
    // Corte mínimo: aristas que salen del conjunto alcanzable desde s en la red residual final.
    const reachable = prev.map(p => p !== -1);
    const cut = edges.filter(e => reachable[e.from] && !reachable[e.to]);
    const cutCapacity = cut.reduce((acc, e) => acc + e.cap, 0);
    return { total, flow, cut, cutCapacity, augmentations };
  }

  // Red: fuente → alumno (cap 1) → carrera compatible (cap 1) → sumidero (cap = cupos).
  function assignSeats(students, seats, minCompat, protos = DEFAULT_PROTOS) {
    const S = students.length;
    const C = CAREER_CODES.length;
    const source = 0;
    const sink = S + C + 1;
    const careerNode = i => S + 1 + i;
    const edges = [];
    students.forEach((st, i) => {
      edges.push({ from: source, to: i + 1, cap: 1 });
      CAREER_CODES.forEach((code, j) => {
        if (compatibility(distance(st.vec, protos[code])) >= minCompat) edges.push({ from: i + 1, to: careerNode(j), cap: 1 });
      });
    });
    CAREER_CODES.forEach((code, j) => {
      const cupo = Math.max(0, Math.floor(seats[code] || 0));
      if (cupo > 0) edges.push({ from: careerNode(j), to: sink, cap: cupo });
    });
    const res = maxFlow(sink + 1, edges, source, sink);
    const assignments = students.map((st, i) => {
      const j = CAREER_CODES.findIndex((_, jj) => res.flow[i + 1][careerNode(jj)] > 0);
      const code = j === -1 ? null : CAREER_CODES[j];
      return { student: st.name, code, compat: code ? compatibility(distance(st.vec, protos[code])) : null };
    });
    const filled = Object.fromEntries(CAREER_CODES.map((code, j) => [code, res.flow[careerNode(j)][sink]]));
    return { total: res.total, cutCapacity: res.cutCapacity, augmentations: res.augmentations, assignments, filled, edges: edges.length };
  }

  const NAMES = ['Ana', 'Luis', 'Sofía', 'Diego', 'Valeria', 'Jorge', 'Camila', 'Andrés', 'Fernanda', 'Emilio', 'Regina', 'Iván'];

  // Grupo simulado de alumnos: perfil = prototipo de una carrera al azar + ruido.
  function sampleStudents(n = 12, seed = 2026) {
    const rnd = rng(seed);
    return Array.from({ length: n }, (_, i) => {
      const base = DEFAULT_PROTOS[CAREER_CODES[Math.floor(rnd() * CAREER_CODES.length)]];
      return { name: NAMES[i % NAMES.length] + (i >= NAMES.length ? ' ' + (i + 1) : ''), vec: base.map(w => clamp01(w + (rnd() - 0.5) * 0.3)) };
    });
  }

  // ---------------------------------------------------------------- 7. Aprendizaje (LVQ1)
  function nearest(vec, protos) {
    let best = null;
    let bestD = Infinity;
    for (const code of CAREER_CODES) {
      const d = distance(vec, protos[code]);
      if (d < bestD) { bestD = d; best = code; }
    }
    return best;
  }

  // Si acertó, el prototipo correcto se acerca al ejemplo; si falló, el correcto se acerca
  // y el predicho se aleja. Devuelve un objeto nuevo (no modifica el original).
  function lvqUpdate(protos, x, predicted, actual, alpha = 0.1) {
    const next = { ...protos };
    const move = (code, sign) => { next[code] = protos[code].map((w, i) => clamp01(w + sign * alpha * (x[i] - w))); };
    move(actual, +1);
    if (predicted && predicted !== actual) move(predicted, -1);
    return next;
  }

  // Simula la retroalimentación de egresados reales, cuyos perfiles difieren del conocimiento
  // inicial del experto, y mide la exactitud del sistema en cada época de entrenamiento.
  function simulateLearning(protos, { epochs = 12, perCareer = 8, alpha = 0.01, seed = 7, drift = 0.8 } = {}) {
    const rnd = rng(seed);
    const real = Object.fromEntries(CAREER_CODES.map(c => [c, protos[c].map(w => clamp01(w + (rnd() - 0.5) * drift))]));
    const sample = () => CAREER_CODES.flatMap(c =>
      Array.from({ length: perCareer }, () => ({ x: real[c].map(w => clamp01(w + (rnd() - 0.5) * 0.25)), y: c })));
    const train = sample();
    const test = sample();
    const accuracy = p => test.filter(s => nearest(s.x, p) === s.y).length / test.length;
    let p = protos;
    const curve = [accuracy(p)];
    for (let e = 0; e < epochs; e++) {
      const rate = alpha * (1 - e / epochs);
      for (const s of train) p = lvqUpdate(p, s.x, nearest(s.x, p), s.y, rate);
      curve.push(accuracy(p));
    }
    return { curve, protos: p, samples: train.length };
  }

  // ---------------------------------------------------------------- Dibujo del árbol (SVG)
  function treeSVG(tree = DECISION_TREE, highlight = new Set()) {
    const nodes = [];
    const links = [];
    let nextX = 0;
    let maxDepth = 0;
    (function place(n, depth) {
      maxDepth = Math.max(maxDepth, depth);
      if (n.leaf) {
        const p = { n, x: nextX++, y: depth };
        nodes.push(p);
        return p;
      }
      const a = place(n.yes, depth + 1);
      const b = place(n.no, depth + 1);
      const p = { n, x: (a.x + b.x) / 2, y: depth };
      nodes.push(p);
      links.push({ from: p, to: a, label: 'Sí' }, { from: p, to: b, label: 'No' });
      return p;
    })(tree, 0);

    const CW = 78;
    const RH = 92;
    const PAD = 44;
    const px = p => PAD + p.x * CW;
    const py = p => PAD + p.y * RH;
    const W = PAD * 2 + (nextX - 1) * CW;
    const H = PAD * 2 + maxDepth * RH;
    const on = id => highlight.has(id);
    const out = [`<svg class="dtree" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Árbol de decisión">`];
    for (const l of links) {
      const cls = on(l.from.n.id) && on(l.to.n.id) ? 'link on' : 'link';
      out.push(`<line class="${cls}" x1="${px(l.from)}" y1="${py(l.from)}" x2="${px(l.to)}" y2="${py(l.to)}"/>`);
      const mx = (px(l.from) + px(l.to)) / 2;
      const my = (py(l.from) + py(l.to)) / 2;
      out.push(`<text class="elabel" x="${mx + (l.label === 'Sí' ? -8 : 8)}" y="${my}" text-anchor="middle">${l.label}</text>`);
    }
    for (const p of nodes) {
      const x = px(p);
      const y = py(p);
      if (p.n.leaf) {
        const cls = 'leaf' + (on(p.n.id) ? ' on' : '') + (p.n.career ? '' : ' nd');
        out.push(`<g class="${cls}"><rect x="${x - 30}" y="${y - 15}" width="60" height="30" rx="15"/>` +
          `<text x="${x}" y="${y + 4}" text-anchor="middle">${p.n.career || '¿?'}</text></g>`);
      } else {
        out.push(`<g class="qnode${on(p.n.id) ? ' on' : ''}"><rect x="${x - 34}" y="${y - 22}" width="68" height="44" rx="6"/>` +
          `<text class="qid" x="${x}" y="${y - 5}" text-anchor="middle">${p.n.id}</text>` +
          `<text class="qtest" x="${x}" y="${y + 12}" text-anchor="middle">${p.n.dim} ≥ ${p.n.thr}</text></g>`);
      }
    }
    out.push('</svg>');
    return out.join('');
  }

  const SE = {
    DIMS, DIM_INDEX, QUESTIONS, CAREERS, CAREER_CODES, DEFAULT_PROTOS, TAXONOMY, DECISION_TREE, RULES,
    distance, compatibility, rng, profileFromAnswers, classify, extractRules, forwardChain,
    computeBoxes, lowerBound, dfs, bfs, astar, mergeSort, ranking, traversals,
    maxFlow, assignSeats, sampleStudents, nearest, lvqUpdate, simulateLearning, treeSVG,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SE;
  else root.SE = SE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
