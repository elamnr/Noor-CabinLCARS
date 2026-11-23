const { chromium } = require('playwright'); const fs=require('fs');
const f=(p)=>'data:font/woff2;base64,'+fs.readFileSync(p).toString('base64');
const FONTS=`@font-face{font-family:'Antonio';src:url(${f('node_modules/@fontsource-variable/antonio/files/antonio-latin-wght-normal.woff2')}) format('woff2');font-weight:100 700}
@font-face{font-family:'Saira';src:url(${f('node_modules/@fontsource-variable/saira/files/saira-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}`;
(async()=>{const b=await chromium.launch();const errs=[];
for (const km of ['', 'calendar', 'camera', 'visitor']) {
const p=await b.newPage({viewport:{width:1920,height:1024}});p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.goto('file://'+process.cwd()+'/dist/kitchen-console.html'+(km&&km!=='visitor'?'?kmode='+km:''));await p.addStyleTag({content:FONTS});await p.waitForTimeout(900);
if (km==='visitor') { await p.evaluate(()=>document.querySelector('.nav-sim').click()); await p.waitForTimeout(300); }
console.log(km||'std', JSON.stringify(await p.evaluate(()=>{const m=document.querySelector('.main');return [m.scrollHeight,m.clientHeight, document.querySelector('.hd-code').textContent]})));
await p.screenshot({path:`o-k-${km||'std'}.png`});await p.close();}
console.log(errs.join('\n')||'no errors');await b.close();})();
