const { chromium } = require('playwright'); const fs=require('fs');
const f=(p)=>'data:font/woff2;base64,'+fs.readFileSync(p).toString('base64');
const FONTS=`@font-face{font-family:'Antonio';src:url(${f('node_modules/@fontsource-variable/antonio/files/antonio-latin-wght-normal.woff2')}) format('woff2');font-weight:100 700}
@font-face{font-family:'Saira';src:url(${f('node_modules/@fontsource-variable/saira/files/saira-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}`;
(async()=>{const b=await chromium.launch();const errs=[];
for (const [file,w,h,tag] of [['entry-console.html',546,900,'e900'],['entry-console.html',546,780,'e780'],['house-console.html',1280,744,'house']]) {
const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.goto('file://'+process.cwd()+'/dist/'+file);await p.addStyleTag({content:FONTS});await p.waitForTimeout(800);
console.log(tag, await p.evaluate(()=>[document.documentElement.scrollHeight, innerHeight, document.documentElement.scrollWidth]));
await p.screenshot({path:`n-${tag}.png`});
}
console.log(errs.join('\n')||'no errors');await b.close();})();
