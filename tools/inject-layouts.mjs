// Puts the catalog layouts into index.html as the LAYOUTS constant.
// tools/layouts.json holds every plan converted from the DXF files. tools/catalog.json says which of them are in the catalog,
// what they are called, how many bedrooms they count as, and the printed net area (ft2) from the drawing.
// Run after dxf-to-layouts.mjs (or after editing catalog.json), then bump sw.js VERSION.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const all = JSON.parse(fs.readFileSync(path.join(here, 'layouts.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(here, 'catalog.json'), 'utf8'));
const out = {};
for (const c of catalog) {
  const L = all[c.id];
  if (!L) throw new Error('catalog entry not found in layouts.json: ' + c.id);
  out[c.id] = Object.assign({ name: c.name }, L, { n: c.n }, (c.netSF || L.netSF) ? { net: Math.round((c.netSF || L.netSF) * 0.092903 * 100) / 100 } : {});
}
const L = JSON.stringify(out);
const file = path.join(here, '..', 'index.html');
let t = fs.readFileSync(file, 'utf8');
const a = t.indexOf('const LAYOUTS='), b = t.indexOf('</script>', a);
if (a < 0 || b < 0) throw new Error('LAYOUTS constant not found in index.html');
t = t.slice(0, a) + 'const LAYOUTS=' + L + ';' + t.slice(b);
fs.writeFileSync(file, t);
console.log('injected ' + (L.length / 1024).toFixed(0) + ' KB, ' + Object.keys(out).length + ' layouts');
