// Abre la app en Chromium headless, la recorre y guarda capturas: node docs/capturas.mjs
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = 'file://' + resolve(import.meta.dirname, '../sistema-experto/index.html');
const out = resolve(import.meta.dirname, 'capturas');
const chrome = spawn('chromium', ['--headless=new', '--remote-debugging-port=9333', '--window-size=1366,900', '--hide-scrollbars', '--force-color-profile=srgb', '--blink-settings=preferredColorScheme=1', 'about:blank'], { stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) {
  await wait(250);
  try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find(t => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(JSON.stringify(m.params.args));
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) errors.push(r.result.exceptionDetails.exception?.description); return r.result.result?.value; };
const shot = async (name, full = true) => {
  await wait(700);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
  writeFileSync(resolve(out, name + '.png'), Buffer.from(r.result.data, 'base64'));
};
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: app }); await wait(1500);
await js("localStorage.clear()");
await shot('01-cuestionario', false);
await js("document.querySelector('#btnSample').click(); document.querySelector('#form').requestSubmit();");
await shot('02-diagnostico', false);
await js("document.querySelector('[data-tab=arbol]').click()"); await shot('03-arbol', false);
await js("document.querySelector('[data-tab=busqueda]').click()"); await shot('04-busqueda', false);
await js("document.querySelector('[data-tab=cupos]').click(); document.querySelector('#btnFlow').click()"); await shot('05-cupos', false);
await js("document.querySelector('[data-tab=aprendizaje]').click(); document.querySelector('#btnSim').click(); document.querySelector('#btnLearn').click()"); await shot('06-aprendizaje', false);
await js("document.querySelector('[data-tab=conocimiento]').click()"); await shot('07-conocimiento', false);
console.log('recomendación:', await js("document.querySelector('.hero h2')?.textContent"));
console.log('errores:', errors.length ? errors : 'ninguno');
ws.close(); chrome.kill();
