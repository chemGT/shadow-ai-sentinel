/**
 * Test de fumée du build Firefox dans un VRAI Firefox, piloté en WebDriver BiDi (ni geckodriver
 * ni Playwright : Playwright ne sait pas charger une extension dans Firefox).
 *
 * Couvre ce que l'e2e Chromium ne peut pas voir : installation du paquet, pages d'options et
 * popup, diagnostic (dont les permissions d'hôte), garde d'envoi sur les fixtures des 8 sites,
 * caviardage, et pièces jointes texte / PDF / DOCX / XLSX / PPTX (compartiments Xray).
 *
 * Usage :
 *   npm run build:firefox
 *   FIREFOX_BIN=/chemin/vers/firefox npm run test:e2e:firefox            # teste dist-firefox/
 *   FIREFOX_BIN=… node e2e/firefox-smoke.mjs release/…-firefox-unsigned.xpi
 *
 * Prérequis : Firefox >= 140 (commande BiDi `webExtension.install`), Node >= 22.18 (import
 * direct de `fixtures.ts`). Les fixtures sont servies par interception réseau BiDi : aucune
 * requête ne sort. Code de sortie : 0 = tout passe, 1 = au moins un échec, 3 = Firefox injoignable.
 *
 * Limite connue : le collage d'un fichier n'est pas testable ici — Firefox retire les fichiers
 * d'un `ClipboardEvent` construit par script (la sonde l'affiche). Les entrées `change` et
 * `drop`, qui partagent la même garde, sont testées.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = process.cwd();
const firefoxBin = process.env.FIREFOX_BIN ?? 'firefox';
const addonPath = resolve(process.argv[2] ?? 'dist-firefox');
const { SITE_FIXTURES } = await import(pathToFileURL(join(repo, 'e2e', 'fixtures.ts')).href);

const GECKO_ID = 'shadow-ai-sentinel@pilot.sentinel';
const expectedVersion = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).version;
const UUID = '0f0e0d0c-0b0a-4908-8706-050403020100';
const PORT = 9333;
const SECRET = 'sk-ant-api03-' + 'e2eFixture0123456789abcdEFGH';
const IBAN = 'FR76 3000 6000 0112 3456 7890 189';
const CLEAN = 'bonjour, peux-tu résumer ce paragraphe ?';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- profil
const profile = mkdtempSync(join(tmpdir(), 'ff-profile-'));
writeFileSync(
  join(profile, 'user.js'),
  [
    `user_pref("extensions.webextensions.uuids", ${JSON.stringify(JSON.stringify({ [GECKO_ID]: UUID }))});`,
    'user_pref("browser.shell.checkDefaultBrowser", false);',
    'user_pref("app.update.enabled", false);',
    'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
    'user_pref("network.captive-portal-service.enabled", false);',
    'user_pref("browser.aboutwelcome.enabled", false);',
    'user_pref("network.proxy.type", 0);',
    'user_pref("intl.accept_languages", "fr-FR, fr");',
  ].join('\n'),
);

const ff = spawn(firefoxBin, ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', String(PORT)], {
  env: { ...process.env, MOZ_HEADLESS: '1', MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let ffLog = '';
ff.stderr.on('data', (d) => (ffLog += d));
ff.stdout.on('data', (d) => (ffLog += d));
const kill = () => {
  try {
    ff.kill('SIGKILL');
  } catch {}
};
process.on('exit', kill);

for (let i = 0; i < 100 && !ffLog.includes('WebDriver BiDi listening'); i += 1) await sleep(200);
if (!ffLog.includes('WebDriver BiDi listening')) {
  console.log('Firefox n’a pas ouvert BiDi :\n' + ffLog.slice(-2000));
  process.exit(3);
}

// --- client BiDi
const ws = new WebSocket(`ws://127.0.0.1:${PORT}/session`);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = () => rej(new Error('connexion BiDi impossible'));
});
let nextId = 1;
const pending = new Map();
const consoleLines = [];
const fixtureByHost = new Map(SITE_FIXTURES.map((f) => [f.host, f]));

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id !== undefined && pending.has(msg.id)) {
    const { resolve, reject, method } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.type === 'error') reject(new Error(`${method}: ${msg.error} ${msg.message}`));
    else resolve(msg.result);
    return;
  }
  if (msg.method === 'log.entryAdded') {
    consoleLines.push(`${msg.params.level}: ${msg.params.text}`);
  }
  if (msg.method === 'network.beforeRequestSent' && msg.params.isBlocked) {
    const url = new URL(msg.params.request.url);
    const host = url.hostname.replace(/^www\./, '');
    const fixture = fixtureByHost.get(host);
    const isDoc = url.pathname === '/';
    void send('network.provideResponse', {
      request: msg.params.request.request,
      statusCode: fixture && isDoc ? 200 : 404,
      reasonPhrase: fixture && isDoc ? 'OK' : 'Not Found',
      headers: [{ name: 'content-type', value: { type: 'string', value: 'text/html; charset=utf-8' } }],
      body: { type: 'string', value: fixture && isDoc ? fixture.html : '' },
    }).catch((e) => console.log('provideResponse', e.message));
  }
};

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(context, expression) {
  const r = await send('script.evaluate', {
    expression,
    target: { context },
    awaitPromise: true,
    resultOwnership: 'none',
    serializationOptions: { maxObjectDepth: 4 },
  });
  if (r.type === 'exception') throw new Error('page: ' + r.exceptionDetails.text);
  return unwrap(r.result);
}
function unwrap(v) {
  if (v === undefined) return undefined;
  switch (v.type) {
    case 'undefined':
      return undefined;
    case 'null':
      return null;
    case 'array':
      return (v.value ?? []).map(unwrap);
    case 'object':
      return Object.fromEntries((v.value ?? []).map(([k, val]) => [typeof k === 'string' ? k : unwrap(k), unwrap(val)]));
    default:
      return v.value;
  }
}
async function waitFor(context, expression, timeout = 6000) {
  const end = Date.now() + timeout;
  for (;;) {
    try {
      if (await evaluate(context, expression)) return true;
    } catch {}
    if (Date.now() > end) return false;
    await sleep(150);
  }
}

// --- résultats
const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

try {
  const session = await send('session.new', { capabilities: {} });
  console.log(`Firefox ${session.capabilities.browserVersion} (${session.capabilities.platformName})`);
  await send('session.subscribe', { events: ['network.beforeRequestSent', 'log.entryAdded'] });

  // 1. installation de l'artefact
  const isDir = statSync(addonPath).isDirectory();
  const install = await send('webExtension.install', {
    extensionData: isDir ? { type: 'path', path: addonPath } : { type: 'archivePath', path: addonPath },
  });
  record('installation du paquet', install.extension === GECKO_ID, `id=${install.extension}`);

  await send('network.addIntercept', {
    phases: ['beforeRequestSent'],
    urlPatterns: [...fixtureByHost.keys()].flatMap((hostname) => [
      { type: 'pattern', protocol: 'https', hostname },
      { type: 'pattern', protocol: 'https', hostname: `www.${hostname}` },
    ]),
  });

  const tree = await send('browsingContext.getTree', {});
  let ctx = tree.contexts[0].context;
  const base = `moz-extension://${UUID}`;

  // BiDi refuse de naviguer vers moz-extension:// depuis un contexte de contenu : on ouvre les
  // pages de l'extension dans un nouvel onglet depuis le contexte chrome (accès système).
  const chromeTree = await send('browsingContext.getTree', { 'moz:scope': 'chrome' });
  const chromeCtx = chromeTree.contexts[0].context;
  const openExtensionPage = async (path) => {
    const before = new Set((await send('browsingContext.getTree', {})).contexts.map((c) => c.context));
    await send('script.evaluate', {
      expression: `(() => { const tab = gBrowser.addTab(${JSON.stringify(base + path)}, { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() }); gBrowser.selectedTab = tab; return true; })()`,
      target: { context: chromeCtx },
      awaitPromise: false,
    });
    for (let i = 0; i < 50; i += 1) {
      const now = (await send('browsingContext.getTree', {})).contexts;
      const fresh = now.find((c) => !before.has(c.context));
      if (fresh && fresh.url.startsWith('moz-extension://')) return fresh.context;
      await sleep(200);
    }
    throw new Error('page d’extension non ouverte : ' + path);
  };

  // 2. page d'options : se charge, API extension disponible, diagnostic
  const optCtx = await openExtensionPage('/src/extension/options/index.html');
  ctx = optCtx;
  const optionsLoaded = await waitFor(ctx, `document.querySelectorAll('#diagList li').length > 0`, 10000);
  record('page d’options chargée, diagnostic exécuté', optionsLoaded);
  const manifest = await evaluate(ctx, `(() => { const m = browser.runtime.getManifest(); return { version: m.version, run_at: m.content_scripts[0].run_at, bg: Object.keys(m.background) }; })()`);
  record('manifeste embarqué', manifest.version === expectedVersion && manifest.run_at === 'document_start', JSON.stringify(manifest));

  const diag = await evaluate(ctx, `[...document.querySelectorAll('#diagList li')].map((li) => ({ id: li.dataset.check, status: li.className, text: li.innerText.replace(/\\s+/g, ' ').slice(0, 220) }))`);
  for (const d of diag) record(`diagnostic · ${d.id}`, d.status === 'ok', d.status === 'ok' ? '' : d.text);
  const rulesRows = await evaluate(ctx, `document.querySelectorAll('#rulesTableBody tr').length`);
  record('table des règles rendue (7 lignes)', rulesRows === 7, `lignes=${rulesRows}`);

  // acquitte la notice de premier lancement (sinon elle recouvre les composers)
  await evaluate(ctx, `browser.storage.local.set({ sentinel_notice_ack_at: new Date().toISOString() })`);

  // 3. popup
  ctx = await openExtensionPage('/src/extension/popup/index.html');
  const popupOk = await waitFor(ctx, `document.getElementById('statusText')?.textContent.length > 0 && document.getElementById('blockedCount')?.textContent !== ''`);
  record('popup chargée (statut + compteurs)', popupOk);

  // 4. les 8 sites (retour dans un onglet de contenu neuf, sélectionné)
  ctx = (await send('browsingContext.create', { type: 'tab' })).context;
  await send('browsingContext.activate', { context: ctx });
  const setText = (f, text) =>
    evaluate(ctx, `(() => { const el = document.querySelector(${JSON.stringify(f.inputSelector)}); if (!el) throw new Error('composer introuvable'); ${f.inputKind === 'textarea' ? 'el.value' : 'el.innerText'} = ${JSON.stringify(text)}; el.focus(); return true; })()`);
  const modalShown = () =>
    waitFor(ctx, `(document.getElementById('shadow-ai-sentinel-ui-host')?.shadowRoot?.querySelector('[data-sentinel-mount]')?.childElementCount ?? 0) > 0`, 5000);
  const pressEnter = () =>
    send('input.performActions', {
      context: ctx,
      actions: [{ type: 'key', id: 'kbd', actions: [{ type: 'keyDown', value: '' }, { type: 'keyUp', value: '' }] }],
    });
  const goto = async (host) => {
    consoleLines.length = 0;
    await send('browsingContext.navigate', { context: ctx, url: `https://${host}/`, wait: 'complete' });
    // Le content script est prêt quand la garde est attachée : on attend son log, sinon 2 s.
    const end = Date.now() + 4000;
    while (Date.now() < end && !consoleLines.some((l) => l.includes('Adaptateur'))) await sleep(100);
    await sleep(300);
  };

  for (const f of SITE_FIXTURES) {
    await goto(f.host);
    await setText(f, SECRET);
    await pressEnter();
    const m1 = await modalShown();
    const enterReached = await evaluate(ctx, `window.__enterReached`);
    record(`${f.label} · clé API bloquée sur Entrée`, m1 && enterReached === 0, `modale=${m1} enterReached=${enterReached}`);

    await goto(f.host);
    await setText(f, SECRET);
    await evaluate(ctx, `document.querySelector(${JSON.stringify(f.sendSelector)}).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))`);
    const m2 = await modalShown();
    const sent = await evaluate(ctx, `window.__sent`);
    record(`${f.label} · clé API bloquée sur clic`, m2 && sent === 0, `modale=${m2} sent=${sent}`);

    await goto(f.host);
    await setText(f, CLEAN);
    await evaluate(ctx, `document.querySelector(${JSON.stringify(f.sendSelector)}).click()`);
    const sentClean = await evaluate(ctx, `window.__sent`);
    record(`${f.label} · texte anodin envoyé`, sentClean === 1, `sent=${sentClean}`);
  }

  // 5. caviardage
  const f0 = SITE_FIXTURES[0];
  await goto(f0.host);
  await setText(f0, `mon IBAN ${IBAN} merci`);
  await pressEnter();
  const redacted = await waitFor(ctx, `document.querySelector(${JSON.stringify(f0.inputSelector)}).innerText.includes('[REDACTED_IBAN]')`, 4000);
  const composerAfter = await evaluate(ctx, `document.querySelector(${JSON.stringify(f0.inputSelector)}).innerText`);
  record('IBAN caviardé dans le composer', redacted && !composerAfter.includes('3000 6000'), JSON.stringify(composerAfter.trim()));

  // 6. collage : Firefox retire les fichiers d'un ClipboardEvent construit par script.
  const probe = await evaluate(ctx, `(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'a.txt', { type: 'text/plain' }));
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    return { dtFiles: dt.files.length, eventFiles: ev.clipboardData ? ev.clipboardData.files.length : -1, same: ev.clipboardData === dt };
  })()`);
  console.log(`SKIP  fichier collé : non testable (ClipboardEvent synthétique, fichiers transmis = ${probe.eventFiles})`);

  // 6c. même garde, autres entrées : input fichier (change) et glisser-déposer (drop)
  const KEY_FILE = `new File(['aws_access_key_id = ' + 'AKIA' + 'IOSFODNN7EXAMPLE'], 'creds.txt', { type: 'text/plain' })`;
  const viaInput = (fileExpr, waitMs) => `(() => {
    let reached = 0;
    const input = document.querySelector('input[type=file]');
    input.addEventListener('change', () => { reached += 1; });
    const dt = new DataTransfer();
    dt.items.add(${fileExpr});
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    return new Promise((r) => setTimeout(() => r({ reached, remaining: input.files.length }), ${waitMs}));
  })()`;

  await goto(f0.host);
  const change = await evaluate(ctx, viaInput(KEY_FILE, 1200));
  const m4 = await modalShown();
  record('fichier choisi (input) avec clé : bloqué, non transmis au site', change.reached === 0 && change.remaining === 0 && m4, JSON.stringify(change) + ` modale=${m4}`);

  await goto(f0.host);
  const benign = await evaluate(ctx, viaInput(`new File(['notes de réunion, rien de sensible'], 'notes.txt', { type: 'text/plain' })`, 1200));
  record('fichier choisi (input) sain : transmis au site', benign.reached === 1 && benign.remaining === 1, JSON.stringify(benign));

  await goto(f0.host);
  const drop = await evaluate(ctx, `(() => {
    let reached = 0;
    document.body.addEventListener('drop', () => { reached += 1; });
    const dt = new DataTransfer();
    dt.items.add(${KEY_FILE});
    const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
    return { reached, prevented: ev.defaultPrevented, eventFiles: ev.dataTransfer ? ev.dataTransfer.files.length : -1 };
  })()`);
  const m5 = await modalShown();
  record('fichier déposé (drop) avec clé : annulé et bloqué', drop.prevented === true && drop.reached === 0 && m5, JSON.stringify(drop) + ` modale=${m5}`);

  // 6d. PDF et XLSX contenant un secret (pdf.js + worker et lecteur OOXML chargés depuis l'extension)
  for (const [name, type] of [
    ['pdf-sensitive.pdf', 'application/pdf'],
    ['xlsx-sensitive.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['docx-sensitive.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['pptx-sensitive.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ]) {
    const b64 = readFileSync(join(repo, 'test', 'fixtures', name)).toString('base64');
    await goto(f0.host);
    const r = await evaluate(ctx, viaInput(`new File([Uint8Array.from(atob(${JSON.stringify(b64)}), (c) => c.charCodeAt(0))], ${JSON.stringify(name)}, { type: ${JSON.stringify(type)} })`, 5000));
    const m = await modalShown();
    record(`${name} : extrait et bloqué`, r.reached === 0 && r.remaining === 0 && m, JSON.stringify(r) + ` modale=${m}`);
  }

  await goto(f0.host);
  const pdfBenign = readFileSync(join(repo, 'test', 'fixtures', 'pdf-benign.pdf')).toString('base64');
  const okPdf = await evaluate(ctx, viaInput(`new File([Uint8Array.from(atob(${JSON.stringify(pdfBenign)}), (c) => c.charCodeAt(0))], 'ok.pdf', { type: 'application/pdf' })`, 5000));
  record('pdf-benign.pdf : analysé puis transmis au site', okPdf.reached === 1 && okPdf.remaining === 1, JSON.stringify(okPdf));

  // 7. erreurs console de l'extension
  const errors = consoleLines.filter((l) => l.startsWith('error') && l.includes('Sentinel'));
  record('aucune erreur console de l’extension', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (error) {
  record('exécution du test', false, error.message);
  console.log(ffLog.slice(-1500));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications passées`);
ws.close();
kill();
process.exit(failed.length === 0 ? 0 : 1);
