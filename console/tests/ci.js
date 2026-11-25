// CI gate for auto-deploy. Exits non-zero on any failure so the workflow stops before deploying.
// Checks: every standalone room/page renders with no page errors; kitchen renders in every mode;
// the Lovelace card bundle mounts for every room without errors.
const { chromium } = require('playwright');
const fs = require('fs');

const ROOMS = [
  ['bedroom-console.html', ['MAIN', 'MEDIA', 'ILLUMINATION', 'ENVIRON', 'COMMANDS', 'SECURITY']],
  ['office-console.html', ['MAIN', 'MEDIA', 'ILLUMINATION', 'ENVIRON', 'COMMANDS', 'SCHEDULE', 'SECURITY', 'VEHICLES']],
  ['entry-console.html', ['MAIN', 'ILLUMINATION', 'WEATHER', 'CLIMATE', 'COMMANDS', 'SECURITY']],
  ['house-console.html', ['MAIN', 'MEDIA', 'ILLUMINATION', 'CLIMATE', 'SYSTEMS', 'SECURITY', 'VEHICLES']],
];
const fails = [];
const fail = (m) => { fails.push(m); console.log('FAIL', m); };

(async () => {
  const b = await chromium.launch();
  const block = (p) => p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());

  for (const [file, pages] of ROOMS) {
    const p = await b.newPage({ viewport: { width: 1280, height: 744 } });
    p.on('pageerror', (e) => fail(`${file}: ${e.message}`));
    await block(p);
    await p.goto('file://' + process.cwd() + '/dist/' + file);
    await p.waitForTimeout(800);
    for (const n of pages) {
      const found = await p.evaluate((n) => {
        const el = [...document.querySelectorAll('.nav')].find((e) => e.textContent.endsWith(n));
        if (el) el.click();
        return !!el;
      }, n);
      if (!found) { fail(`${file}: nav ${n} missing`); continue; }
      await p.waitForTimeout(250);
      const kids = await p.evaluate(() => document.querySelector('.main')?.childElementCount || 0);
      if (!kids) fail(`${file} ${n}: empty main`);
      else console.log('ok', file.split('-')[0], n);
    }
    await p.close();
  }

  for (const km of ['', 'calendar', 'camera']) {
    const p = await b.newPage({ viewport: { width: 1920, height: 1024 } });
    p.on('pageerror', (e) => fail(`kitchen ${km || 'std'}: ${e.message}`));
    await block(p);
    await p.goto('file://' + process.cwd() + '/dist/kitchen-console.html' + (km ? '?kmode=' + km : ''));
    await p.waitForTimeout(900);
    const kids = await p.evaluate(() => document.querySelector('.main')?.childElementCount || 0);
    if (!kids) fail(`kitchen ${km || 'std'}: empty main`);
    else console.log('ok kitchen', km || 'std');
    await p.close();
  }

  {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on('pageerror', (e) => fail(`status: ${e.message}`));
    await block(p);
    await p.goto('file://' + process.cwd() + '/dist/status-console.html');
    await p.waitForTimeout(900);
    const n = await p.evaluate(() => document.querySelectorAll('.s-tile, .tm').length);
    if (!n) fail('status: no tiles or meters rendered');
    else console.log('ok status', n, 'tiles+meters');
    await p.close();
  }

  const bundle = fs.readFileSync('dist/cabin-lcars.js', 'utf8');
  for (const room of ['status', 'mobile', 'bedroom', 'office', 'entry', 'house', 'kitchen']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    p.on('pageerror', (e) => fail(`card ${room}: ${e.message}`));
    await block(p);
    await p.setContent('<html><body><div id="m"></div></body></html>');
    await p.addScriptTag({ content: bundle });
    const ok = await p.evaluate(async (room) => {
      const el = document.createElement('cabin-lcars');
      el.setConfig({ room });
      el.hass = { states: {}, connected: true, config: { version: '2026.10.0' }, devices: {},
        callService: async () => null, callApi: async () => null,
        connection: { sendMessagePromise: async () => null, subscribeMessage: async () => () => {} } };
      document.getElementById('m').appendChild(el);
      await new Promise((r) => setTimeout(r, 600));
      const root = el.shadowRoot || el;
      return { kids: root.querySelectorAll('*').length, fault: /UNKNOWN ROOM/.test(root.textContent || '') };
    }, room);
    if (!ok.kids) fail(`card ${room}: rendered nothing`);
    else if (ok.fault) fail(`card ${room}: rendered a fault screen`);
    else console.log('ok card', room);
    await p.close();
  }

  await b.close();
  if (fails.length) { console.log(`\n${fails.length} failure(s)`); process.exit(1); }
  console.log('\nall checks passed');
})().catch((e) => { console.error(e); process.exit(1); });
