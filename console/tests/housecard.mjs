import fs from 'fs'; import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1280,height:856}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)/, r=>r.abort());
await p.setContent(`<html><body style="margin:0"><div style="height:56px"></div><div id="m"></div></body></html>`);
await p.addScriptTag({ content: fs.readFileSync('dist/bridgeline-bedroom-console.js','utf8') });
await p.evaluate(() => {
  const st=(state,attributes={})=>({state,attributes,last_changed:'2026-10-30T03:00:00Z',last_updated:'2026-10-30T03:00:00Z'});
  const states = { 'light.vr_room': st('on',{brightness:5,color_mode:'color_temp',color_temp_kelvin:2000}), 'cover.blind_vr_room_left': st('open',{current_position:100}), 'cover.blind_vr_room_right': st('open',{current_position:100}), 'cover.vr_room_large_blind': st('unavailable'), 'weather.forecast_retrohouse': st('sunny',{temperature:50,humidity:60}), 'input_boolean.polycaltoggle': st('off'), 'light.main_floor_lights': st('on',{brightness:4,supported_color_modes:['color_temp','xy']}), 'automation.goodbye': st('on',{current:0}), 'binary_sensor.all_doors': st('off'), 'calendar.elam_personal': st('off',{friendly_name:'Elam personal'}), 'calendar.elam_noor_916': st('off',{friendly_name:'Elam noor - 916'}) };
  window.calls=[];
  const el = document.createElement('bridgeline-console'); el.setConfig({room:'house'});
  const now=Date.now();
  el.hass = { states, connected:true, config:{version:'2026.10.3'}, connection:{ sendMessagePromise: async (m)=>{ window.calls.push(m); if (m.return_response) return {response:{[m.target.entity_id]:{forecast:[{datetime:new Date().toISOString(),condition:'sunny',temperature:60,templow:40,precipitation_probability:5}]}}}; } },
    callApi: async (method, path)=>{ window.calls.push({api:path.split('?')[0]}); return [{summary:'Test event', start:{dateTime:new Date(now+3600e3).toISOString()}, end:{dateTime:new Date(now+7200e3).toISOString()}}]; } };
  document.getElementById('m').appendChild(el); window.el=el;
});
await p.waitForTimeout(600);
const root = p.locator('bridgeline-console');
console.log('title', await root.locator('.hd-t').textContent(), 'agenda:', await root.locator('.blk-label').first().textContent());
await root.locator('.nav', {hasText:'SYSTEMS'}).click();
await root.locator('.blk', {hasText:'CALENDAR'}).click();
await p.waitForTimeout(300);
console.log(JSON.stringify(await p.evaluate(()=>window.calls)));
console.log(errs.join('\n')||'no errors'); await b.close();
