// Pruebas del motor: node sistema-experto/test.js
const assert = require('node:assert/strict');
const SE = require('./engine.js');

// 1. El árbol de decisión clasifica cada prototipo como su propia carrera.
for (const code of SE.CAREER_CODES) {
  assert.equal(SE.classify(SE.DEFAULT_PROTOS[code]).career, code, 'árbol falla con ' + code);
}

// 2. Reglas extraídas = hojas del árbol; el encadenamiento hacia adelante coincide con el árbol.
assert.equal(SE.RULES.length, 17);
const rnd = SE.rng(1);
for (let i = 0; i < 500; i++) {
  const v = SE.DIMS.map(() => rnd());
  assert.equal(SE.forwardChain(v).fired.then, SE.classify(v).career);
}

// 3. Perfil desde respuestas Likert y validación de entrada.
assert.deepEqual(SE.profileFromAnswers(new Array(16).fill(5)), new Array(8).fill(1));
assert.throws(() => SE.profileFromAnswers([1, 2]));
assert.throws(() => SE.profileFromAnswers(new Array(16).fill(6)));

// 4. A* (heurística) encuentra el mismo óptimo que DFS/BFS (exhaustivas) visitando menos nodos.
let savedTotal = 0;
for (let i = 0; i < 500; i++) {
  const v = SE.DIMS.map(() => rnd());
  const ex = SE.dfs(v);
  const bf = SE.bfs(v);
  const hs = SE.astar(v, 3);
  const rank = SE.ranking(v).list;
  assert.equal(ex.visited, 32);
  assert.equal(bf.best.code, ex.best.code);
  assert.deepEqual(hs.top.map(t => t.code), rank.slice(0, 3).map(r => r.code));
  savedTotal += ex.visited - hs.expanded;
}
assert.ok(savedTotal > 0);

// 5. Merge Sort ordena correctamente.
const nums = Array.from({ length: 50 }, () => Math.floor(rnd() * 100));
assert.deepEqual(SE.mergeSort(nums, (a, b) => a - b).sorted, nums.slice().sort((a, b) => a - b));

// 6. Recorridos: 33 nodos y raíz en la posición correcta.
const t = SE.traversals();
assert.equal(t.pre.length, 33);
assert.equal(t.pre[0], 'A');
assert.equal(t.post[32], 'A');
assert.equal(t.level[0], 'A');

// 7. Teorema de flujo máximo / corte mínimo.
const students = SE.sampleStudents(12);
const seats = Object.fromEntries(SE.CAREER_CODES.map(c => [c, 1]));
const res = SE.assignSeats(students, seats, 0.8);
assert.equal(res.total, res.cutCapacity);
assert.equal(res.assignments.filter(a => a.code).length, res.total);
for (const c of SE.CAREER_CODES) assert.ok(res.filled[c] <= seats[c]);
const g = SE.maxFlow(4, [{ from: 0, to: 1, cap: 3 }, { from: 0, to: 2, cap: 2 }, { from: 1, to: 2, cap: 1 }, { from: 1, to: 3, cap: 2 }, { from: 2, to: 3, cap: 3 }], 0, 3);
assert.equal(g.total, 5);
assert.equal(g.cutCapacity, 5);

// 8. Aprendizaje LVQ: inmutable y mejora la exactitud.
const before = SE.DEFAULT_PROTOS.ISC.slice();
const next = SE.lvqUpdate(SE.DEFAULT_PROTOS, new Array(8).fill(0.5), 'ISC', 'IME', 0.5);
assert.deepEqual(SE.DEFAULT_PROTOS.ISC, before);
assert.notDeepEqual(next.IME, SE.DEFAULT_PROTOS.IME);
const sim = SE.simulateLearning(SE.DEFAULT_PROTOS);
assert.ok(sim.curve.at(-1) > sim.curve[0], 'LVQ no mejoró: ' + sim.curve.join(', '));

console.log('OK — todas las pruebas pasaron');
console.log('A* ahorró en promedio', (savedTotal / 500).toFixed(1), 'de 32 nodos');
console.log('Flujo de ejemplo:', res.total, 'alumnos asignados; corte mínimo', res.cutCapacity);
console.log('Curva LVQ:', sim.curve.map(a => (a * 100).toFixed(0) + '%').join(' → '));
