// Checks a PAD unit plan export against docs/export/pad-unit-plan.schema.json (the parts of JSON Schema it uses).
// node tools/validate-export.mjs file.pad.json [more files]
import fs from 'node:fs';
const here = new URL('./pad-unit-plan.schema.json', import.meta.url);   // next to this file when shared on its own, else in the repo
const schema = JSON.parse(fs.readFileSync(fs.existsSync(here) ? here : new URL('../docs/export/pad-unit-plan.schema.json', import.meta.url), 'utf8'));
const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
const isType = (v, t) => t === 'number' ? typeof v === 'number' : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t;
function check(s, v, path, errs) {
  if (s.$ref) s = s.$ref.split('/').slice(1).reduce((o, k) => o[k], schema);
  if ('const' in s && v !== s.const) errs.push(path + ': expected ' + JSON.stringify(s.const));
  if (s.enum && !s.enum.includes(v)) errs.push(path + ': ' + JSON.stringify(v) + ' is not one of ' + s.enum.join(', '));
  if (s.type) { const ts = [].concat(s.type); if (!ts.some(t => isType(v, t))) { errs.push(path + ': expected ' + ts.join('|') + ', got ' + typeOf(v)); return; } }
  if (typeof v === 'string' && s.pattern && !new RegExp(s.pattern).test(v)) errs.push(path + ': ' + v + ' does not match ' + s.pattern);
  if (typeof v === 'number' && s.minimum !== undefined && v < s.minimum) errs.push(path + ': below ' + s.minimum);
  if (Array.isArray(v)) {
    if (s.minItems && v.length < s.minItems) errs.push(path + ': needs at least ' + s.minItems + ' items');
    if (s.maxItems && v.length > s.maxItems) errs.push(path + ': at most ' + s.maxItems + ' items');
    if (s.items) v.forEach((x, i) => check(s.items, x, path + '[' + i + ']', errs));
  } else if (v && typeof v === 'object') {
    (s.required || []).forEach(k => { if (!(k in v)) errs.push(path + ': missing ' + k); });
    Object.entries(s.properties || {}).forEach(([k, p]) => { if (k in v) check(p, v[k], path + '.' + k, errs); });
    if (s.additionalProperties && typeof s.additionalProperties === 'object') Object.entries(v).forEach(([k, x]) => { if (!(s.properties || {})[k]) check(s.additionalProperties, x, path + '.' + k, errs); });
  }
}
// checks the schema cannot say: ids unique and the references between objects resolve
function links(J, errs) {
  const ids = {}; ['rooms', 'walls', 'doors', 'windows', 'furniture', 'floors', 'balconies'].forEach(k => (J[k] || []).forEach(o => { if (ids[o.id]) errs.push('duplicate id ' + o.id); ids[o.id] = k; }));
  (J.doors || []).forEach(d => { if (d.wallId && ids[d.wallId] !== 'walls') errs.push(d.id + ': wallId ' + d.wallId + ' is not a wall'); [d.fromRoomId, d.intoRoomId].forEach(r => { if (r && ids[r] !== 'rooms') errs.push(d.id + ': room ' + r + ' is not a room'); }); });
  (J.windows || []).forEach(w => { if (w.wallId && ids[w.wallId] !== 'walls') errs.push(w.id + ': wallId ' + w.wallId + ' is not a wall'); });
  (J.furniture || []).forEach(p => { if (p.roomId && ids[p.roomId] !== 'rooms') errs.push(p.id + ': room ' + p.roomId + ' is not a room'); });
}
export function validateExport(J) { const errs = []; check(schema, J, '$', errs); links(J, errs); return errs; }
if (process.argv[1] && process.argv[1].endsWith('validate-export.mjs')) {
  let bad = 0;
  for (const f of process.argv.slice(2)) {
    const errs = validateExport(JSON.parse(fs.readFileSync(f, 'utf8')));
    console.log(f + ': ' + (errs.length ? errs.length + ' problem(s)\n  ' + errs.slice(0, 20).join('\n  ') : 'ok'));
    if (errs.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
