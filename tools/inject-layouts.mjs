// Puts tools/layouts.json into index.html as the LAYOUTS constant. Run after dxf-to-layouts.mjs, then bump sw.js VERSION.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const L = fs.readFileSync(path.join(here, 'layouts.json'), 'utf8');
const file = path.join(here, '..', 'index.html');
let t = fs.readFileSync(file, 'utf8');
const a = t.indexOf('const LAYOUTS='), b = t.indexOf('</script>', a);
if (a < 0 || b < 0) throw new Error('LAYOUTS constant not found in index.html');
t = t.slice(0, a) + 'const LAYOUTS=' + L + ';' + t.slice(b);
fs.writeFileSync(file, t);
console.log('injected ' + (L.length / 1024).toFixed(0) + ' KB, ' + Object.keys(JSON.parse(L)).length + ' layouts');
