// Minimal DXF reader: returns entities (with layer, type, geometry), blocks and header values.
import fs from 'node:fs';
export function parseDxf(file) {
  const raw = fs.readFileSync(file, 'latin1').split(/\r?\n/);
  const pairs = [];
  for (let i = 0; i + 1 < raw.length; i += 2) pairs.push([parseInt(raw[i].trim(), 10), raw[i + 1].trim()]);
  const sections = {};
  let cur = null, sec = null;
  for (let i = 0; i < pairs.length; i++) {
    const [c, v] = pairs[i];
    if (c === 0 && v === 'SECTION') { sec = pairs[i + 1][1]; sections[sec] = []; i++; continue; }
    if (c === 0 && v === 'ENDSEC') { sec = null; continue; }
    if (sec) sections[sec].push([c, v]);
  }
  // group into records starting at code 0
  const records = s => { const out = []; let r = null; for (const [c, v] of s) { if (c === 0) { r = { type: v, d: [] }; out.push(r); } else if (r) r.d.push([c, v]); } return out; };
  const get = (r, code, all = false) => { const m = r.d.filter(x => x[0] === code).map(x => x[1]); return all ? m : m[0]; };
  const num = (r, code, def = 0) => { const v = get(r, code); return v === undefined ? def : parseFloat(v); };
  const ent = r => {
    const o = { type: r.type, layer: get(r, 8) || '0' };
    if (r.type === 'LINE') Object.assign(o, { x1: num(r, 10), y1: num(r, 20), x2: num(r, 11), y2: num(r, 21) });
    else if (r.type === 'LWPOLYLINE') {
      const xs = get(r, 10, true).map(Number), ys = get(r, 20, true).map(Number);
      o.pts = xs.map((x, i) => [x, ys[i]]); o.closed = (parseInt(get(r, 70) || '0', 10) & 1) === 1;
      o.bulge = get(r, 42, true).map(Number);
    } else if (r.type === 'CIRCLE') Object.assign(o, { cx: num(r, 10), cy: num(r, 20), r: num(r, 40) });
    else if (r.type === 'ARC') Object.assign(o, { cx: num(r, 10), cy: num(r, 20), r: num(r, 40), a1: num(r, 50), a2: num(r, 51) });
    else if (r.type === 'INSERT') Object.assign(o, { name: get(r, 2), x: num(r, 10), y: num(r, 20), sx: num(r, 41, 1), sy: num(r, 42, 1), rot: num(r, 50) });
    else if (r.type === 'TEXT' || r.type === 'MTEXT') Object.assign(o, { x: num(r, 10), y: num(r, 20), h: num(r, 40), text: (get(r, 1) || '') + (get(r, 3, true) || []).join(''), rot: num(r, 50) });
    else if (r.type === 'SOLID' || r.type === 'HATCH') o.hatch = get(r, 2);
    else if (r.type === 'DIMENSION') Object.assign(o, { x: num(r, 10), y: num(r, 20), text: get(r, 1) });
    return o;
  };
  const entities = records(sections.ENTITIES || []).map(ent);
  // blocks
  const blocks = {};
  const brs = records(sections.BLOCKS || []);
  let b = null;
  for (const r of brs) { if (r.type === 'BLOCK') { b = { name: get(r, 2), x: num(r, 10), y: num(r, 20), ents: [] }; blocks[b.name] = b; } else if (r.type === 'ENDBLK') b = null; else if (b) b.ents.push(ent(r)); }
  const header = {}; // header section: pairs after code 9
  let hk = null;
  for (const [c, v] of sections.HEADER || []) { if (c === 9) { hk = v; header[hk] = []; } else if (hk) header[hk].push(v); }
  return { entities, blocks, header };
}
export function bbox(ents, blocks) {
  let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
  const add = (x, y) => { if (isFinite(x) && isFinite(y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } };
  for (const e of ents) {
    if (e.type === 'LINE') { add(e.x1, e.y1); add(e.x2, e.y2); }
    else if (e.type === 'LWPOLYLINE') e.pts.forEach(p => add(p[0], p[1]));
    else if (e.type === 'CIRCLE' || e.type === 'ARC') { add(e.cx - e.r, e.cy - e.r); add(e.cx + e.r, e.cy + e.r); }
    else if (e.type === 'INSERT') add(e.x, e.y);
  }
  return [x0, y0, x1, y1];
}
