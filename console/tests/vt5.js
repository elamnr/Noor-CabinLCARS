const { chromium } = require('playwright'); const fs=require('fs');
const f=(p)=>'data:font/woff2;base64,'+fs.readFileSync(p).toString('base64');
const FONTS=`@font-face{font-family:'Antonio';src:url(${f('node_modules/@fontsource-variable/antonio/files/antonio-latin-wght-normal.woff2')}) format('woff2');font-weight:100 700}
@font-face{font-family:'Saira';src:url(${f('node_modules/@fontsource-variable/saira/files/saira-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}`;
(async()=>{const b=await chromium.launch();const errs=[];
for (const [f,pg,tag] of [['entry-console.html','MAIN','entry'],['bedroom-console.html','COMMANDS','bed']]) {
const p=await b.newPage({viewport:{width:1280,height:744}});p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.goto('file://'+process.cwd()+'/dist/'+f);await p.addStyleTag({content:FONTS});await p.waitForTimeout(700);
await p.evaluate((n)=>[...document.querySelectorAll('.nav')].find(e=>e.textContent.endsWith(n)).click(),pg);await p.waitForTimeout(300);
await p.screenshot({path:`o-vs-${tag}.png`});
await p.evaluate(()=>[...document.querySelectorAll('.vs-btn')].find(e=>e.textContent.includes('FULL'))?.click());await p.waitForTimeout(400);
console.log(tag, await p.evaluate(()=>{const s=document.querySelector('.veh-ov .veh-stage');return s?[s.style.transform, s.getBoundingClientRect().width|0]:'no overlay'}));
await p.screenshot({path:`o-vs-${tag}-ov.png`});
await p.evaluate(()=>document.querySelector('.vtab-x').click());await p.waitForTimeout(200);
console.log('closed', await p.evaluate(()=>!document.querySelector('.veh-ov')));
await p.close();}
console.log(errs.join('\n')||'no errors');await b.close();})();
