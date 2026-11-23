const { chromium } = require('playwright'); const fs=require('fs');
const f=(p)=>'data:font/woff2;base64,'+fs.readFileSync(p).toString('base64');
const FONTS=`@font-face{font-family:'Antonio';src:url(${f('node_modules/@fontsource-variable/antonio/files/antonio-latin-wght-normal.woff2')}) format('woff2');font-weight:100 700}
@font-face{font-family:'Saira';src:url(${f('node_modules/@fontsource-variable/saira/files/saira-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}`;
(async()=>{const b=await chromium.launch();const errs=[];
for (const [file,pages] of [['bedroom-console.html',['MAIN','MEDIA','ILLUMINATION','ENVIRON','COMMANDS','SECURITY']],['office-console.html',['MAIN','MEDIA','ILLUMINATION','ENVIRON','COMMANDS','SCHEDULE','SECURITY']],['entry-console.html',['MAIN','ILLUMINATION','WEATHER','CLIMATE','COMMANDS','SECURITY']],['house-console.html',['MAIN','ILLUMINATION','CLIMATE','SYSTEMS','SECURITY','VEHICLES']]]) {
const p=await b.newPage({viewport:{width:1280,height:744}});p.on('pageerror',e=>errs.push(file+': '+e.message));
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.goto('file://'+process.cwd()+'/dist/'+file);await p.addStyleTag({content:FONTS});await p.waitForTimeout(800);
for (const n of pages) {
  await p.evaluate((n)=>[...document.querySelectorAll('.nav')].find(e=>e.textContent.endsWith(n)).click(), n);
  await p.waitForTimeout(300);
  const m=await p.evaluate(()=>{const e=document.querySelector('.main');return [e.scrollHeight,e.clientHeight]});
  console.log(file.split('-')[0],n,m.join(' '));
  await p.screenshot({path:`o-${file.split('-')[0]}-${n}.png`});
}}
console.log(errs.join('\n')||'no errors');await b.close();})();
