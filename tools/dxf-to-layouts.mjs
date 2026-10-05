// Turn the DXF baseline unit plans into PAD layouts (rectangular plans only).
// Output: layouts.json  { "A1-1_1": { n, W, D, d:{walls,doors,wins,furn,floors,rooms,marks,bumps}, nodes } }
import fs from 'node:fs';
import path from 'node:path';
import { parseDxf } from './dxf.mjs';

// usage: node tools/dxf-to-layouts.mjs <folder of DXF files> [plan id prefix]   (writes tools/layouts.json, then run: node tools/inject-layouts.mjs)
const DIR = process.argv[2];
const ONLY = process.argv[3] || '';
if (!DIR) { console.error('Give the folder that holds the DXF files.'); process.exit(1); }
const f2 = v => Math.round(v * 1000) / 1000;
const r05 = v => Math.round(v * 20) / 20;

function paperFlags(file) {
  const raw = fs.readFileSync(file, 'latin1').split(/\r?\n/);
  const pairs = []; for (let i = 0; i + 1 < raw.length; i += 2) pairs.push([parseInt(raw[i].trim(), 10), raw[i + 1].trim()]);
  let sec = null, idx = -1; const paper = [];
  for (let i = 0; i < pairs.length; i++) {
    const [c, v] = pairs[i];
    if (c === 0 && v === 'SECTION') { sec = pairs[i + 1][1]; i++; continue; }
    if (c === 0 && v === 'ENDSEC') { sec = null; continue; }
    if (sec === 'ENTITIES') { if (c === 0) { idx++; paper[idx] = false; } else if (c === 67 && v === '1') paper[idx] = true; }
  }
  return paper;
}

function clusters(W) {
  const n = W.length, parent = [...Array(n).keys()], find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const bb = W.map(e => [Math.min(e.x1, e.x2), Math.min(e.y1, e.y2), Math.max(e.x1, e.x2), Math.max(e.y1, e.y2)]);
  const cell = 2500, grid = new Map();
  bb.forEach((b, i) => { for (let gx = Math.floor((b[0] - cell) / cell); gx <= Math.floor((b[2] + cell) / cell); gx++) for (let gy = Math.floor((b[1] - cell) / cell); gy <= Math.floor((b[3] + cell) / cell); gy++) { const k = gx + ',' + gy; (grid.get(k) || grid.set(k, []).get(k)).push(i); } });
  grid.forEach(list => { for (let a = 0; a < list.length; a++) for (let b2 = a + 1; b2 < list.length; b2++) { const A = bb[list[a]], B = bb[list[b2]]; if (A[0] - 1200 < B[2] && B[0] - 1200 < A[2] && A[1] - 1200 < B[3] && B[1] - 1200 < A[3]) parent[find(list[a])] = find(list[b2]); } });
  const groups = new Map(); W.forEach((e, i) => { const r = find(i); (groups.get(r) || groups.set(r, []).get(r)).push(e); });
  return [...groups.values()].filter(g => g.length > 25).map(g => {
    const xs = g.flatMap(e => [e.x1, e.x2]), ys = g.flatMap(e => [e.y1, e.y2]);
    return { lines: g, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
  }).sort((a, b) => a.box[0] - b.box[0] || a.box[1] - b.box[1]);
}

const insM = (e, b, m) => {
  const a = e.rot * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
  const cm = { a: cs * e.sx, b: sn * e.sx, c: -sn * e.sy, d: cs * e.sy, e: e.x - (cs * e.sx * b.x - sn * e.sy * b.y), f: e.y - (sn * e.sx * b.x + cs * e.sy * b.y) };
  return { a: m.a * cm.a + m.c * cm.b, b: m.b * cm.a + m.d * cm.b, c: m.a * cm.c + m.c * cm.d, d: m.b * cm.c + m.d * cm.d, e: m.a * cm.e + m.c * cm.f + m.e, f: m.b * cm.e + m.d * cm.f + m.f };
};
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const ap = (m, x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
/* every point of an entity (arc extremes included), in the given matrix */
function pointsOf(ent, blocks, m, out, layerSel) {
  const add = (x, y) => out.push(ap(m, x, y));
  if (ent.type === 'LINE') { if (!layerSel || layerSel(ent)) { add(ent.x1, ent.y1); add(ent.x2, ent.y2); } }
  else if (ent.type === 'LWPOLYLINE') { if (!layerSel || layerSel(ent)) ent.pts.forEach(p => add(p[0], p[1])); }
  else if (ent.type === 'CIRCLE') { if (!layerSel || layerSel(ent)) { add(ent.cx - ent.r, ent.cy); add(ent.cx + ent.r, ent.cy); add(ent.cx, ent.cy - ent.r); add(ent.cx, ent.cy + ent.r); } }
  else if (ent.type === 'ARC') { if (!layerSel || layerSel(ent)) { const s = ent.a1 * Math.PI / 180; let e = ent.a2 * Math.PI / 180; if (e < s) e += 2 * Math.PI; for (const t of [s, e]) add(ent.cx + ent.r * Math.cos(t), ent.cy + ent.r * Math.sin(t)); for (let q = 0; q < 4; q++) { const t = q * Math.PI / 2; let tt = t; while (tt < s) tt += 2 * Math.PI; if (tt <= e) add(ent.cx + ent.r * Math.cos(t), ent.cy + ent.r * Math.sin(t)); } } }
  else if (ent.type === 'INSERT') { const b = blocks[ent.name]; if (b) b.ents.forEach(c => pointsOf(c, blocks, insM(ent, b, m), out, layerSel)); }
}
const bboxOf = pts => pts.length ? [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))] : null;

const NAMEMAP = { BEDROOM: 'Bedroom', DEN: 'Den', 'WALK-IN': 'Closet', CLOSET: 'Closet', 'W/C': 'Bath', KITCHEN: 'Kitchen', HALL: 'Hall', LAUNDRY: 'Laundry', LIVING: 'Living', HVAC: 'Mech', DINING: 'Dining', ENTRY: 'Entry', PANTRY: 'Closet', STORAGE: 'Closet' };

function convert(id, cl, ents, blocks, nBeds) {
  const box = cl.box, pad = 800;
  const inBox = (x, y) => x >= box[0] - pad && x <= box[2] + pad && y >= box[1] - pad && y <= box[3] + pad;
  const notes = [];
  // axis-aligned wall lines only
  let ax = 0, tot = 0;
  const segs = [];
  cl.lines.forEach(e => { const L = Math.hypot(e.x2 - e.x1, e.y2 - e.y1); tot += L; if (Math.abs(e.x2 - e.x1) < 2 || Math.abs(e.y2 - e.y1) < 2) { ax += L; segs.push([e.x1, e.y1, e.x2, e.y2]); } });
  if (ax / tot < 0.9) return { skip: `angled walls (${Math.round(ax / tot * 100)}% axis-aligned)` };
  // corridor side from the entry door, measured against the sheet box
  const entry = ents.find(e => e.type === 'INSERT' && /Suite Entry/.test(e.name) && inBox(e.x, e.y));
  if (!entry) return { skip: 'no suite entry door' };
  const dist0 = { L: entry.x - box[0], R: box[2] - entry.x, B: entry.y - box[1], T: box[3] - entry.y };
  const side = Object.keys(dist0).sort((a, b) => dist0[a] - dist0[b])[0];
  if (dist0[side] > 900) return { skip: 'entry door is not on an outer wall' };
  // the side (party) walls run front to back: the long lines parallel to the depth axis
  const depthX = side === 'L' || side === 'R';
  const par = segs.filter(s => depthX ? Math.abs(s[1] - s[3]) < 2 : Math.abs(s[0] - s[2]) < 2);
  const lenOf = s => Math.abs(s[2] - s[0]) + Math.abs(s[3] - s[1]);
  const Lmax = Math.max(...par.map(lenOf));
  const sidew = par.filter(s => lenOf(s) >= 0.55 * Lmax);
  if (sidew.length < 2) return { skip: 'no side walls found' };
  // front and corridor ends: the outermost coordinate that at least two long side-wall lines agree on (a balcony outline sticks out alone)
  const starts = sidew.map(s => depthX ? Math.min(s[0], s[2]) : Math.min(s[1], s[3])), ends = sidew.map(s => depthX ? Math.max(s[0], s[2]) : Math.max(s[1], s[3]));
  const vote = (arr, asc) => { const c = arr.slice().sort((p, q) => asc ? p - q : q - p); for (const v of c) if (arr.filter(x => Math.abs(x - v) < 120).length >= 2) return v; return c[0]; };
  const d0 = vote(starts, true), d1 = vote(ends, false);
  const acr = sidew.map(s => depthX ? s[1] : s[0]);
  const a0 = Math.min(...acr), a1 = Math.max(...acr);
  let ex0, ex1, ey0, ey1;
  if (depthX) { ex0 = d0; ex1 = d1; ey0 = a0; ey1 = a1; } else { ey0 = d0; ey1 = d1; ex0 = a0; ex1 = a1; }
  // world (mm, y up) -> PAD (m, y down, corridor at the bottom)
  const T = side === 'R' ? (x, y) => [(y - ey0) / 1000, (x - ex0) / 1000]
    : side === 'L' ? (x, y) => [(y - ey0) / 1000, (ex1 - x) / 1000]
    : side === 'T' ? (x, y) => [(x - ex0) / 1000, (y - ey0) / 1000]
    : (x, y) => [(x - ex0) / 1000, (ey1 - y) / 1000];
  const horiz = side === 'T' || side === 'B';
  if ((horiz ? ex1 - ex0 : ey1 - ey0) < 3000 || (horiz ? ey1 - ey0 : ex1 - ex0) < 4000) return { skip: 'L-shaped or irregular outline' };
  const W = f2(horiz ? (ex1 - ex0) / 1000 : (ey1 - ey0) / 1000), D = f2(horiz ? (ey1 - ey0) / 1000 : (ex1 - ex0) / 1000);
  const Tp = (x, y) => T(x, y);
  // direction vectors (linear part only)
  const Tv = (dx, dy) => { const o = T(0, 0), q = T(dx, dy); return [q[0] - o[0], q[1] - o[1]]; };

  // ---- walls: pair up the two face lines of each wall
  const H = [], V = [];
  segs.forEach(s => {
    const p = Tp(s[0], s[1]), q = Tp(s[2], s[3]);
    if (Math.abs(p[1] - q[1]) < 0.003) { if (Math.abs(p[0] - q[0]) >= 0.15) H.push({ c: p[1], a: Math.min(p[0], q[0]), b: Math.max(p[0], q[0]) }); }
    else if (Math.abs(p[0] - q[0]) < 0.003) { if (Math.abs(p[1] - q[1]) >= 0.15) V.push({ c: p[0], a: Math.min(p[1], q[1]), b: Math.max(p[1], q[1]) }); }
  });
  const rects = [];
  const pairUp = (L, hor) => {
    L.sort((x, y) => x.c - y.c);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const g = L[j].c - L[i].c; if (g > 0.35) break; if (g < 0.04) continue;
      const a = Math.max(L[i].a, L[j].a), b = Math.min(L[i].b, L[j].b); if (b - a < 0.05) continue;
      rects.push(hor ? { x: a, y: L[i].c, w: b - a, h: g } : { x: L[i].c, y: a, w: g, h: b - a });
    }
  };
  pairUp(H, true); pairUp(V, false);
  // clip to the interior; the outer walls are rebuilt to PAD's standard thicknesses
  const IX0 = 0.1, IX1 = W - 0.1, IY0 = 0.3, IY1 = D - 0.2;
  let walls = [];
  rects.forEach(r => {
    const x0 = Math.max(IX0, r.x), y0 = Math.max(IY0, r.y), x1 = Math.min(IX1, r.x + r.w), y1 = Math.min(IY1, r.y + r.h);
    if (x1 - x0 < 0.06 || y1 - y0 < 0.06) return;
    if (Math.min(x1 - x0, y1 - y0) > 0.4) return;
    walls.push({ x: f2(x0), y: f2(y0), w: f2(x1 - x0), h: f2(y1 - y0) });
  });
  // drop exact duplicates and rects swallowed by a bigger one
  walls = walls.filter((a, i) => !walls.some((b, j) => j !== i && b.x <= a.x + 0.01 && b.y <= a.y + 0.01 && b.x + b.w >= a.x + a.w - 0.01 && b.y + b.h >= a.y + a.h - 0.01 && (b.w * b.h > a.w * a.h + 1e-6 || (b.w * b.h === a.w * a.h && j < i))));

  // ---- doors (swing arc: centre = hinge)
  const doors = [];
  ents.filter(e => e.type === 'INSERT' && inBox(e.x, e.y) && /Suite Entry|Unit - Single/.test(e.name)).forEach(e => {
    const b = blocks[e.name]; if (!b) return;
    const arc = b.ents.find(c => c.type === 'ARC' && c.layer === 'A-DETL-GENF'); if (!arc) return;
    const m = insM(e, b, I);
    const frame = []; b.ents.forEach(c => { if (c.layer === 'A-DOOR-FRAM') pointsOf(c, blocks, I, frame); });
    const fb = bboxOf(frame), half = fb ? (fb[2] - fb[0]) / 2 : arc.r / 2 + 40;
    const lc = [arc.cx, arc.cy], r = arc.r;
    const s0 = arc.a1 * Math.PI / 180, s1 = arc.a2 * Math.PI / 180;
    const ends = [[lc[0] + r * Math.cos(s0), lc[1] + r * Math.sin(s0)], [lc[0] + r * Math.cos(s1), lc[1] + r * Math.sin(s1)]];
    // closed leaf runs along local x; open leaf is the end that is far from the door axis (|y| large)
    const op = ends.sort((p, q) => Math.abs(q[1]) - Math.abs(p[1]))[0];
    const openLocal = [0, Math.sign(op[1] - lc[1]) || 1], closedLocal = [-Math.sign(lc[0]) || 1, 0];
    const hw = ap(m, lc[0], lc[1]), ctr = ap(m, 0, 0);
    const lin = (v) => { const o = ap(m, 0, 0), q = ap(m, v[0], v[1]); return [q[0] - o[0], q[1] - o[1]]; };
    const cvec = Tv(...lin(closedLocal)), ovec = Tv(...lin(openLocal));
    const sn = v => Math.abs(v[0]) > Math.abs(v[1]) ? [Math.sign(v[0]), 0] : [0, Math.sign(v[1])];
    const cv = sn(cvec), ov = sn(ovec), hp = Tp(hw[0], hw[1]), cp = Tp(ctr[0], ctr[1]);
    doors.push({ entry: /Suite Entry/.test(e.name), hx: hp[0], hy: hp[1], cx: cv[0], cy: cv[1], ox: ov[0], oy: ov[1], w: f2(r / 1000), ctr: cp });
  });
  if (!doors.some(d => d.entry)) return { skip: 'entry door has no swing arc' };

  // ---- outer walls to PAD standards: front 0.3 (windows cut later), corridor 0.2 (entry door cut), sides 0.1
  const gapsOf = list => list.sort((p, q) => p[0] - q[0]);
  const cutGaps = (a, b, gaps) => { const g = gaps.filter(x => x[1] > a && x[0] < b).sort((p, q) => p[0] - q[0]); const out = []; let cur = a; g.forEach(([x0, x1]) => { if (x0 > cur + 0.01) out.push([cur, Math.min(x0, b)]); cur = Math.max(cur, x1); }); if (b > cur + 0.01) out.push([cur, b]); return out; };

  // ---- windows from the glazing on the front (window) wall
  const wins = [];
  const gl = [];
  ents.forEach(e => { if (!inBox(e.x ?? e.x1 ?? 0, e.y ?? e.y1 ?? 0)) return; const sel = c => c.layer === 'A-GLAZ'; if (e.layer === 'A-GLAZ' || e.type === 'INSERT') { const pts = []; pointsOf(e, blocks, I, pts, sel); if (pts.length) gl.push(pts.map(p => Tp(p[0], p[1]))); } });
  const front = gl.map(pts => bboxOf(pts)).filter(b => b && b[1] < 0.5 && b[3] > -0.3 && b[3] - b[1] < 0.6 && b[2] - b[0] > 0.3);
  front.forEach(b => wins.push([Math.max(0.2, b[0]), Math.min(W - 0.2, b[2])]));
  // merge touching windows
  wins.sort((p, q) => p[0] - q[0]); const mw = [];
  wins.forEach(w => { const l = mw[mw.length - 1]; if (l && w[0] <= l[1] + 0.12) l[1] = Math.max(l[1], w[1]); else mw.push(w.slice()); });
  let winList = mw.filter(w => w[1] - w[0] >= 0.5).map(w => ({ x1: f2(w[0]), x2: f2(w[1]) }));
  const winFromGlazing = winList.length > 0;

  // ---- balcony: wall lines outside the front wall
  const bumps = [];
  const out = segs.map(s => [Tp(s[0], s[1]), Tp(s[2], s[3])]).filter(([p, q]) => p[1] < -0.2 && q[1] < -0.2);
  if (out.length > 2) {
    const xs = out.flatMap(([p, q]) => [p[0], q[0]]), ys = out.flatMap(([p, q]) => [p[1], q[1]]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by = -Math.min(...ys);
    if (bx1 - bx0 >= 1.2 && by >= 0.8 && by <= 3) bumps.push({ id: 1, kind: 'balcony', x: f2(Math.max(0.3, Math.min(W - 0.3 - Math.min(4, bx1 - bx0), bx0))), w: f2(Math.max(1.8, Math.min(4, bx1 - bx0))), d: f2(Math.max(1.2, Math.min(2.2, by))) });
  }

  // outer walls
  const front0 = cutGaps(0, W, winList.map(w => [w.x1, w.x2]));
  const outer = [];
  outer.push({ x: 0, y: 0, w: W, h: 0.3 });   // windows are cut in once the rooms are known
  outer.push({ x: 0, y: 0, w: 0.1, h: D }, { x: f2(W - 0.1), y: 0, w: 0.1, h: D });
  const entryD = doors.find(d => d.entry);
  const er = [Math.min(entryD.hx, entryD.hx + entryD.cx * entryD.w), Math.max(entryD.hx, entryD.hx + entryD.cx * entryD.w)];
  cutGaps(0, W, [er]).forEach(([a, b]) => outer.push({ x: f2(a), y: f2(D - 0.2), w: f2(b - a), h: 0.2 }));
  entryD.hy = f2(D - 0.2); entryD.oy = -1; entryD.ox = 0; entryD.cy = 0; if (!entryD.cx) entryD.cx = 1;

  // interior doors: hinge on the swing-side face of the wall they sit in, door gap cut in the wall
  doors.filter(d => !d.entry).forEach(d => {
    const hor = d.cx !== 0;
    const near = walls.filter(w => (hor ? (w.w > w.h && d.ctr[1] >= w.y - 0.06 && d.ctr[1] <= w.y + w.h + 0.06 && d.ctr[0] >= w.x - 0.9 && d.ctr[0] <= w.x + w.w + 0.9) : (w.h > w.w && d.ctr[0] >= w.x - 0.06 && d.ctr[0] <= w.x + w.w + 0.06 && d.ctr[1] >= w.y - 0.9 && d.ctr[1] <= w.y + w.h + 0.9)));
    const wall = near.sort((p, q) => (hor ? Math.abs(p.y + p.h / 2 - d.ctr[1]) - Math.abs(q.y + q.h / 2 - d.ctr[1]) : Math.abs(p.x + p.w / 2 - d.ctr[0]) - Math.abs(q.x + q.w / 2 - d.ctr[0])))[0];
    if (wall) { if (hor) d.hy = f2(d.oy > 0 ? wall.y + wall.h : wall.y); else d.hx = f2(d.ox > 0 ? wall.x + wall.w : wall.x); }
    else notes.push('a door sits in no wall at ' + d.ctr.map(v => v.toFixed(2)));
  });
  // cut / seal the wall runs around each door so the wall ends exactly at the door
  const sealWalls = () => {
    doors.forEach(d => {
      const hor = d.cx !== 0, rng = hor ? [Math.min(d.hx, d.hx + d.cx * d.w), Math.max(d.hx, d.hx + d.cx * d.w)] : [Math.min(d.hy, d.hy + d.cy * d.w), Math.max(d.hy, d.hy + d.cy * d.w)];
      const pos = hor ? d.hy : d.hx;
      const list = d.entry ? outer : walls;
      const next = [];
      list.forEach(w => {
        const wh = w.w > w.h, onLine = hor ? (wh && pos >= w.y - 0.04 && pos <= w.y + w.h + 0.04) : (!wh && pos >= w.x - 0.04 && pos <= w.x + w.w + 0.04);
        if (!onLine) { next.push(w); return; }
        const a = hor ? w.x : w.y, b = a + (hor ? w.w : w.h);
        if (b <= rng[0] - 0.2 || a >= rng[1] + 0.2) { next.push(w); return; }
        // pieces outside the door range; pieces that end within 0.2 of the range are pulled to its edge
        if (a < rng[0] - 0.005) { const e = Math.min(b, rng[0]); next.push(hor ? { x: w.x, y: w.y, w: f2(e - a), h: w.h } : { x: w.x, y: w.y, w: w.w, h: f2(e - a) }); }
        if (b > rng[1] + 0.005) { const s0 = Math.max(a, rng[1]); next.push(hor ? { x: f2(s0), y: w.y, w: f2(b - s0), h: w.h } : { x: w.x, y: f2(s0), w: w.w, h: f2(b - s0) }); }
      });
      list.length = 0; next.forEach(n => list.push(n));
    });
  };
  sealWalls();
  const allWalls = [...outer, ...walls];

  // ---- furniture
  const furn = [];
  const wallRects = allWalls.map(w => [w.x, w.y, w.x + w.w, w.y + w.h]);
  // distance from a PAD point to the nearest wall in direction (dx,dy)
  const ray = (x, y, dx, dy) => { let best = 9; wallRects.forEach(r => { if (dx !== 0) { if (y < r[1] || y > r[3]) return; const t = dx > 0 ? r[0] - x : x - r[2]; if (t >= -0.05 && t < best) best = Math.max(0, t); } else { if (x < r[0] || x > r[2]) return; const t = dy > 0 ? r[1] - y : y - r[3]; if (t >= -0.05 && t < best) best = Math.max(0, t); } }); return best; };
  const rotFromBack = (bx, by) => ((Math.round(Math.atan2(bx, -by) * 180 / Math.PI / 90) * 90) % 360 + 360) % 360;
  const items = ents.filter(e => e.type === 'INSERT' && inBox(e.x, e.y));
  const have = (re) => items.filter(e => re.test(e.name));
  const place = (e, k, opts = {}) => {
    const b = blocks[e.name]; if (!b) return;
    const m = insM(e, b, I), lp = []; b.ents.forEach(c => pointsOf(c, blocks, I, lp));
    const lb = bboxOf(lp); if (!lb) return;
    const lw = (lb[2] - lb[0]) / 1000, ld = (lb[3] - lb[1]) / 1000, lcx = (lb[0] + lb[2]) / 2, lcy = (lb[1] + lb[3]) / 2;
    const c = ap(m, lcx, lcy), cp = Tp(c[0], c[1]);
    const lin = v => { const o = ap(m, 0, 0), q = ap(m, v[0], v[1]); return Tv(q[0] - o[0], q[1] - o[1]); };
    const xa = lin([1, 0]), ya = lin([0, 1]);
    const snap = v => Math.abs(v[0]) > Math.abs(v[1]) ? [Math.sign(v[0]), 0] : [0, Math.sign(v[1])];
    const X = snap(xa), Y = snap(ya);
    let w = opts.w || lw, d = opts.d || ld;
    if (opts.world) {   // fixtures that sit on a run: take the box in PAD axes
      const pp = []; b.ents.forEach(cc => pointsOf(cc, blocks, m, pp)); const pb = bboxOf(pp.map(p => Tp(p[0], p[1])));
      const pw = pb[2] - pb[0], ph = pb[3] - pb[1];
      return { cx: (pb[0] + pb[2]) / 2, cy: (pb[1] + pb[3]) / 2, pw, ph };
    }
    // back = along local -y; choose between the two ends by the nearer wall
    const half = d / 2;
    const dn = ray(cp[0], cp[1], -Y[0], -Y[1]) - half, dp = ray(cp[0], cp[1], Y[0], Y[1]) - half;
    let back = [-Y[0], -Y[1]];
    if (opts.back === 'near') { if (dp < dn - 0.05) back = [Y[0], Y[1]]; else if (dn <= dp + 0.05) back = [-Y[0], -Y[1]]; }
    // local x must land on the axis perpendicular to back: rot from back; if the item is mirrored, local x flips (symmetric glyphs)
    const rot = rotFromBack(back[0], back[1]);
    const swapped = ((rot % 180) === 90) !== (Math.abs(X[0]) === 1 && false);
    return { x: f2(cp[0]), y: f2(cp[1]), rot, w: f2(w), d: f2(d) };
  };
  const pushItem = (k, o, extra = {}) => { if (o) furn.push(Object.assign({ k, x: o.x, y: o.y, rot: o.rot }, o.w !== undefined ? { w: o.w, d: o.d } : {}, extra)); };
  const rectItem = (e, k, minDim) => { const o = place(e, k, { world: true }); if (!o) return; let w = o.pw, d = o.ph, rot = 0; if (d > w && (k === 'van' || k === 'shower')) { [w, d] = [d, w]; rot = 90; } if (k === 'counter' || k === 'closet' || k === 'shelf') { if (d > w) { [w, d] = [d, w]; rot = 90; } } furn.push({ k, x: f2(o.cx), y: f2(o.cy), rot, w: f2(w), d: f2(d) }); };
  const R = {
    bed: /Bed - Queen|Murphy_Bed/, sofa: /Couch/, arm: /Lounge Chair/, ns: /Table - Side/, ctable: /Table - Coffee/, tv: /Table - TV/, desk: /Table - Desk/, ltable: /Table - (Dining|8 SEATER)/, bench: /entry bench/,
    counter: /Kitchen - Countertop/, pantry: /Kitchen - Pantry/, sink: /Kitchen Sink/, cook: /Oven|Range/, fridge: /Fridge/, wd: /Washer Dryer/, wc: /Toilet/, shower: /Shower Base/, van: /Vanity/, closet: /Closet Shelf - (Closet Shelf With Rod|WIC|Built-in closet)/, shelf: /Closet Shelf - Built-in shelf/, bdesk: /Built-in desk/
  };
  have(R.bed).forEach(e => { const o = place(e, 'bed', { back: 'near' }); if (o) pushItem('bed', o); });
  have(R.sofa).forEach(e => { const o = place(e, 'sofa', { back: 'near' }); if (o) pushItem('sofa', o); });
  have(R.arm).forEach(e => { const o = place(e, 'arm', {}); if (o) pushItem('arm', { x: o.x, y: o.y, rot: o.rot }); });
  have(R.ns).forEach(e => { const o = place(e, 'ns', {}); if (o) pushItem('ns', { x: o.x, y: o.y, rot: 0 }); });
  have(R.ctable).forEach(e => rectItem(e, 'ctable'));
  have(R.tv).forEach(e => { const o = place(e, 'tv', { back: 'near' }); if (o) pushItem('tv', o); });
  have(R.desk).forEach(e => { const o = place(e, 'desk', { back: 'near' }); if (o) pushItem('desk', o); });
  have(R.ltable).forEach(e => { const o = place(e, 'ltable', {}); if (o) { const seats = /8 SEATER/.test(e.name) ? 4 : 3; const long = Math.max(o.w, o.d), sh = Math.min(o.w, o.d); const rot = 0; furn.push({ k: 'ltable', x: o.x, y: o.y, rot: o.w >= o.d ? 0 : 90, w: f2(long), d: f2(sh), c: seats }); } });
  have(R.bench).forEach(e => rectItem(e, 'dresser'));
  have(R.counter).forEach(e => rectItem(e, 'counter'));
  have(R.pantry).forEach(e => rectItem(e, 'shelf'));
  have(R.closet).forEach(e => rectItem(e, 'closet'));
  have(R.shelf).forEach(e => rectItem(e, 'shelf'));
  have(R.bdesk).forEach(e => rectItem(e, 'desk'));
  have(R.van).forEach(e => rectItem(e, 'van'));
  have(R.shower).forEach(e => rectItem(e, 'shower'));
  have(R.sink).forEach(e => { const o = place(e, 'sink', { back: 'near' }); if (o) pushItem('sink', { x: o.x, y: o.y, rot: o.rot }); });
  have(R.cook).forEach(e => { if (/Range Hood/.test(e.name)) return; const o = place(e, 'cook', { back: 'near' }); if (o) pushItem('cook', { x: o.x, y: o.y, rot: o.rot }); });
  have(R.fridge).forEach(e => { const o = place(e, 'fridge', { back: 'near' }); if (o) pushItem('fridge', { x: o.x, y: o.y, rot: o.rot }); });
  have(R.wd).forEach(e => { const o = place(e, 'wd', {}); if (o) pushItem('wd', { x: o.x, y: o.y, rot: 0 }); });
  have(R.wc).forEach(e => { const o = place(e, 'wc', { back: 'near' }); if (o) pushItem('wc', { x: o.x, y: o.y, rot: o.rot }); });
  // keep only what is inside the unit
  const inside = furn.filter(p => p.x > 0.1 && p.x < W - 0.1 && p.y > 0.2 && p.y < D - 0.1);

  // ---- rooms from the labels
  const texts = ents.filter(e => e.layer === 'A-AREA-IDEN' && e.type === 'MTEXT' && inBox(e.x, e.y)).map(t => ({ p: Tp(t.x, t.y), text: t.text.replace(/\\P/g, ' ').trim() }));
  const areas = texts.filter(t => /^\d+\s*SF$/.test(t.text)), names = texts.filter(t => !/^\d+\s*SF$/.test(t.text) && NAMEMAP[t.text.toUpperCase()]);
  const labels = names.map(nm => { const a = areas.slice().sort((p, q) => Math.hypot(p.p[0] - nm.p[0], p.p[1] - nm.p[1]) - Math.hypot(q.p[0] - nm.p[0], q.p[1] - nm.p[1]))[0]; const ok = a && Math.hypot(a.p[0] - nm.p[0], a.p[1] - nm.p[1]) < 0.8; return { n: NAMEMAP[nm.text.toUpperCase()], p: nm.p, a: ok ? parseInt(a.text) * 0.092903 : null }; });
  // flood fill: each cell goes to the nearest label by walking distance, through wall gaps only
  const cs = 0.1, nx = Math.ceil(W / cs), ny = Math.ceil(D / cs), blk = new Uint8Array(nx * ny), own = new Int16Array(nx * ny).fill(-1);
  wallRects.forEach(r => { for (let i = Math.floor(r[0] / cs); i <= Math.floor((r[2] - 1e-6) / cs); i++) for (let j = Math.floor(r[1] / cs); j <= Math.floor((r[3] - 1e-6) / cs); j++) if (i >= 0 && j >= 0 && i < nx && j < ny) blk[j * nx + i] = 1; });
  // furniture does not block rooms; doors are open
  const q = [];
  labels.forEach((L, li) => { let i = Math.floor(L.p[0] / cs), j = Math.floor(L.p[1] / cs); i = Math.max(0, Math.min(nx - 1, i)); j = Math.max(0, Math.min(ny - 1, j)); for (let rad = 0; rad < 6 && blk[j * nx + i]; rad++) { for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nx && jj < ny && !blk[jj * nx + ii]) { i = ii; j = jj; break; } } } if (!blk[j * nx + i]) { own[j * nx + i] = li; q.push([i, j]); } });
  for (let h = 0; h < q.length; h++) { const [i, j] = q[h], li = own[j * nx + i]; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny || blk[jj * nx + ii] || own[jj * nx + ii] >= 0) continue; own[jj * nx + ii] = li; q.push([ii, jj]); } }
  const rooms = labels.map((L, li) => {
    const cells = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (own[j * nx + i] === li) cells.push([i, j]);
    if (!cells.length) return null;
    const xs = cells.map(c => c[0]).sort((a, b) => a - b), ys = cells.map(c => c[1]).sort((a, b) => a - b), lo = Math.floor(cells.length * 0.02), hi = Math.ceil(cells.length * 0.98) - 1;
    const x0 = xs[lo] * cs, x1 = (xs[hi] + 1) * cs, y0 = ys[lo] * cs, y1 = (ys[hi] + 1) * cs;
    const area = L.a || cells.length * cs * cs;
    return { n: L.n, x: f2(x0), y: f2(y0), w: f2(x1 - x0), h: f2(y1 - y0), lx: f2(L.p[0]), ly: f2(L.p[1]), a: f2(area) };
  }).filter(Boolean);
  // bedrooms: the biggest is the primary when there are two or more
  const beds = rooms.filter(r => r.n === 'Bedroom').sort((a, b) => b.a - a.a);
  if (nBeds >= 2 && beds.length >= 2) beds[0].n = 'Primary Bedroom';

  // ---- windows: the glazing in the DXF, else one window for each habitable room on the front wall
  if (!winFromGlazing) { rooms.filter(r => /^(Primary Bedroom|Bedroom|Living|Den|Kitchen|Dining)$/.test(r.n) && r.y < 0.5).forEach(r => { const L = Math.min(2.4, r.w - 0.8); if (L < 0.9) return; const c = r.x + r.w / 2; winList.push({ x1: f2(c - L / 2), x2: f2(c + L / 2) }); }); notes.push('windows placed by rule (none drawn in the DXF)'); }
  winList.sort((p, q) => p.x1 - q.x1);
  const finalOuter = [...outer.filter(w => !(w.y === 0 && w.h === 0.3)), ...cutGaps(0, W, winList.map(w => [w.x1, w.x2])).map(([a, b]) => ({ x: f2(a), y: 0, w: f2(b - a), h: 0.3 }))];

  // ---- floors
  const floors = [{ x: 0.1, y: 0.3, w: f2(W - 0.2), h: f2(D - 0.5), t: 'base' }];
  rooms.forEach(r => { if (r.n === 'Closet' || r.n === 'Mech') return; floors.push({ x: r.x, y: r.y, w: r.w, h: r.h, t: /^(Bath|Laundry|Hall)$/.test(r.n) ? 'tile' : 'wood' }); });

  // ---- nodes for occupants
  const room = n => rooms.find(r => r.n === n);
  const nodes = {}, c0 = r => ({ x: f2(r.lx), y: f2(r.ly) });
  nodes.entry = { x: f2(er[0] + (er[1] - er[0]) / 2), y: f2(D - 0.9), spot: false };
  const K = room('Kitchen'), Lv = room('Living') || room('Den'), Bd = rooms.find(r => /Bedroom/.test(r.n));
  if (K) nodes.kit = Object.assign(c0(K), { spot: true });
  if (Lv) { nodes.mid = Object.assign(c0(Lv), { spot: true }); nodes.sofa = Object.assign(c0(Lv), { spot: true }); }
  if (Bd) nodes.bsp = Object.assign(c0(Bd), { spot: true });
  nodes.win = { x: f2(W / 2), y: 1.1, spot: true };
  const sofa = inside.find(p => p.k === 'sofa'); if (sofa) nodes.sofa = { x: sofa.x, y: f2(sofa.y + (sofa.rot === 270 || sofa.rot === 90 ? 0 : 0.6)), spot: true };
  const edges = Object.keys(nodes).filter(k => k !== 'entry').map(k => ['entry', k]);

  return { n: nBeds, W, D, side, notes, d: { walls: [...finalOuter, ...walls], doors: doors.map(d => ({ hx: f2(d.hx), hy: f2(d.hy), cx: d.cx, cy: d.cy, ox: d.ox, oy: d.oy, w: d.w })), wins: winList, furn: inside, floors, rooms, marks: [], bumps }, nodes, edges };
}

const out = {}, report = [];
for (const file of fs.readdirSync(DIR).filter(x => /\.dxf$/i.test(x)).sort()) {
  const full = path.join(DIR, file), { entities, blocks } = parseDxf(full), paper = paperFlags(full);
  const ents = entities.filter((e, i) => !paper[i]);
  const Wl = ents.filter(e => e.layer === 'A-WALL' && e.type === 'LINE');
  if (!Wl.length) { report.push(`${file}: title sheet only`); continue; }
  const nBeds = +(file.match(/^A(\d)/) || [0, 1])[1];
  clusters(Wl).forEach((cl, ci) => {
    const id = file.replace(/\.dxf$/i, '') + '_' + (ci + 1);
    if (ONLY && !id.startsWith(ONLY)) return;
    const res = convert(id, cl, ents, blocks, nBeds);
    if (res.skip) { report.push(`${id}: skipped, ${res.skip}`); return; }
    out[id] = res; report.push(`${id}: ${res.W} x ${res.D} m, ${res.d.walls.length} walls, ${res.d.doors.length} doors, ${res.d.furn.length} items, ${res.d.rooms.length} rooms, ${res.d.wins.length} windows${res.d.bumps.length ? ', balcony' : ''}${res.notes.length ? ' [' + res.notes.join('; ') + ']' : ''}`);
  });
}
fs.writeFileSync(new URL('./layouts.json', import.meta.url), JSON.stringify(out, (k, v) => typeof v === 'number' ? Math.round(v * 100) / 100 : v));
console.log(report.join('\n'));
