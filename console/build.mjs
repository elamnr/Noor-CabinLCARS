import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const css = ['colors', 'typography', 'spacing', 'app'].map(f => readFileSync(`src/${f}.css`, 'utf8')).join('\n');
mkdirSync('dist', { recursive: true });
for (const [room, file, title] of [['bedroom', 'bedroom-console.html', 'Primary Bed Console'], ['office', 'office-console.html', 'Office Console'], ['entry', 'entry-console.html', 'Entry Console'], ['house', 'house-console.html', 'Retro House Console'], ['kitchen', 'kitchen-console.html', 'Kitchen Display'], ['status', 'status-console.html', 'Tiny Cabins Master Systems'], ['mobile', 'mobile-console.html', 'Tiny Cabins Mobile']]) {
const r = await build({ entryPoints: ['src/main.jsx'], bundle: true, minify: true, format: 'iife', write: false, jsx: 'automatic', jsxImportSource: 'preact', target: 'es2020', legalComments: 'none', loader: { '.webp': 'dataurl' }, define: { __ROOM__: JSON.stringify(room) } });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<meta name="mobile-web-app-capable" content="yes">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&family=Saira:wght@100..500&display=swap">
<style>
${css}
</style>
</head>
<body>
<div id="root"></div>
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync(`dist/${file}`, html);
console.log(file, html.length);
}
// ---- Lovelace card build ----
let ccss = css.replace(/:root\s*\{/g, ':host{').replace('html, body { margin: 0; background: var(--bl-space); min-height: 100%; }', ':host { display: block; background: var(--bl-space); }').replace(/\nbody \{/, '\n:host {');
ccss = ccss.replace('height: 100dvh; column-gap', 'height: calc(100vh - var(--header-height, 56px)); column-gap');
ccss = ccss.replace(/\[data-bl-theme="(\w+)"\]\{/g, ':host([data-bl-theme="$1"]){');
writeFileSync('src/card.css.txt', ccss);
const c = await build({ entryPoints: ['src/card.jsx'], bundle: true, minify: true, format: 'iife', write: false, jsx: 'automatic', jsxImportSource: 'preact', target: 'es2020', legalComments: 'none', loader: { '.txt': 'text', '.webp': 'dataurl' } });
const banner = '/* CabinLCARS console card - Preact + Signals. Source: elamnr/Noor-CabinLCARS. */\n';
writeFileSync('dist/cabin-lcars.js', banner + c.outputFiles[0].text);
console.log('card bytes', c.outputFiles[0].text.length);
