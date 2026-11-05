// Builds a single self-contained HTML body for publishing as a claude.ai page:
// CSS, app JS and both AudioWorklets inlined (no separate files, no service worker).
//   node scripts/build-artifact.mjs [outFile]
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'dist-artifact/muse-rig.html';
execSync('npx vite build --mode artifact --outDir dist-artifact --emptyOutDir', { stdio: 'inherit' });
const dir = 'dist-artifact/assets';
const files = readdirSync(dir);
const read = (pre) => readFileSync(join(dir, files.find((f) => f.startsWith(pre))), 'utf8');
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');
const css = read('index-').replace(/<\/style/gi, '<\\/style');
const appJs = files.filter((f) => f.startsWith('index-') && f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
const worklets = { guitar: read('guitar-processor-'), recorder: read('recorder-processor-') };
const css2 = readFileSync(join(dir, files.find((f) => f.endsWith('.css'))), 'utf8');
const html = `<title>MUSE RIG Pocket Guitar</title>
<meta name="theme-color" content="#080B12">
<style>${css2}</style>
<div id="root"></div>
<script>window.__MUSE_WORKLETS__ = ${safe(JSON.stringify(worklets))};</script>
<script type="module">${safe(appJs)}</script>
`;
void css;
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
