import fs from 'fs';
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');

const f=(p)=>'data:font/woff2;base64,'+fs.readFileSync(p).toString('base64');
const FONTS=`@font-face{font-family:'Antonio';src:url(${f('node_modules/@fontsource-variable/antonio/files/antonio-latin-wght-normal.woff2')}) format('woff2');font-weight:100 700}
@font-face{font-family:'Saira';src:url(${f('node_modules/@fontsource-variable/saira/files/saira-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}`;
const seedSrc = fs.readFileSync('src/sim.js','utf8');
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1280,height:856}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>console.log('console',m.text()));
await p.route(/fonts\.(googleapis|gstatic)/, r=>r.abort());
await p.setContent(`<html><head><style>${FONTS} body{margin:0;background:#111} .hdr{height:56px;background:#333}</style></head><body><div class="hdr"></div><div id="m"></div></body></html>`);
await p.addScriptTag({ content: fs.readFileSync('dist/cabin-lcars.js','utf8') });
await p.evaluate(() => {
  const states = {
    'light.master_bed': { entity_id:'light.master_bed', state:'on', attributes:{friendly_name:'Primary Bed',brightness:173,color_mode:'color_temp',color_temp_kelvin:4000,min_color_temp_kelvin:2000,max_color_temp_kelvin:6535,rgb_color:[255,206,166],entity_id:['light.bookshelf','light.nightstand']}, last_changed:'2026-10-30T03:00:00Z', last_updated:'2026-10-30T03:00:00Z'},
    'light.bookshelf': { entity_id:'light.bookshelf', state:'on', attributes:{friendly_name:'Bookshelf',brightness:119}, last_changed:'2026-10-30T03:00:00Z'},
    'media_player.bedroom': { entity_id:'media_player.bedroom', state:'playing', attributes:{friendly_name:'Bedroom TV',media_title:'Masterminds',supported_features:450487}, last_changed:'2026-10-30T03:00:00Z'},
    'input_button.goodnight_ha': { state:'2026-10-29T04:43:12+00:00', attributes:{}, last_changed:'2026-10-29T04:43:12+00:00'},
    'climate.retro_house_upstairs': { state:'fan_only', attributes:{hvac_modes:['off','fan_only','cool','heat','heat_cool'],current_temperature:70,current_humidity:48,fan_modes:['low','med','high','auto'],fan_mode:'high',preset_modes:['home','sleep'],preset_mode:'home',hvac_action:'fan'}, last_changed:'2026-10-30T03:00:00Z'},
    'binary_sensor.retro_front_door_visitor': { state:'off', attributes:{}, last_changed:'2026-10-30T03:00:00Z'},
  };
  window.calls=[];
  const el = document.createElement('cabin-lcars');
  el.setConfig(window.__cfg || {});
  const hass = { states, connected:true, config:{version:'2026.10.3'}, connection:{ sendMessagePromise: async (m)=>{ window.calls.push(m); return null; } } };
  el.hass = hass;
  document.getElementById('m').appendChild(el);
  window.el = el; window.hass=hass;
});
await p.addStyleTag({content:FONTS});
await p.waitForTimeout(800);
// click ALL LIGHTS
await p.locator('cabin-lcars').locator('text=ALL LIGHTS').click();
await p.locator('cabin-lcars').locator('.nav', {hasText:'ENVIRON'}).click(); await p.locator('cabin-lcars').locator('text=COOL').click(); console.log('main scroll', await p.evaluate(()=>{const m=document.querySelector('cabin-lcars').shadowRoot.querySelector('.main');return [m.scrollHeight,m.clientHeight]}));
// state change: lights off
await p.evaluate(() => { const s={...window.hass.states}; s['light.master_bed']={...s['light.master_bed'], state:'off', attributes:{...s['light.master_bed'].attributes, brightness:null}}; s['binary_sensor.retro_front_door_visitor']={state:'on',attributes:{},last_changed:new Date().toISOString()}; window.el.hass={...window.hass, states:s}; });
await p.waitForTimeout(400);
await p.screenshot({path:'card.png'});
console.log(JSON.stringify(await p.evaluate(()=>window.calls)));
console.log(errs.join('\n')||'no errors');
await b.close();
