// Draws a PAD export (pad-unit-plan JSON) as an SVG so it can be checked by eye: node tools/preview-export.mjs in.json out.svg
import fs from 'node:fs';
const [, , inp, out] = process.argv;
const J = JSON.parse(fs.readFileSync(inp, 'utf8')), S = 80, M = 40;
const X = x => M + x * S, Y = y => M + (y + 2.2) * S, pts = L => L.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ');
const col = ['#cfe3f5', '#f5d9cf', '#d9f0d2', '#f3ecc2', '#e3d2f0', '#d2eef0', '#f0d2e3', '#e0e0e0', '#c9e7d0', '#f0e0c2'];
let s = '';
J.rooms.forEach((r, i) => { const holes = (r.holes || []).map(h => 'M' + pts(h).replace(/ /g, 'L') + 'Z').join(''); s += '<path fill-rule="evenodd" fill="' + col[i % col.length] + '" stroke="#778" stroke-width=".6" d="M' + pts(r.polygon).replace(/ /g, 'L') + 'Z' + holes + '"/>'; });
J.floors.forEach(f => { s += '<polygon points="' + pts(f.polygon) + '" fill="none" stroke="#c9a" stroke-dasharray="3 3"/>'; });
J.balconies.forEach(b => { s += '<polygon points="' + pts(b.polygon) + '" fill="#cfe" fill-opacity=".5" stroke="#3a7" stroke-dasharray="4 3"/>'; });
J.walls.forEach(w => w.segments.forEach(g => { s += '<polygon points="' + pts(g.polygon) + '" fill="' + ({ exterior: '#223', demising: '#556', partition: '#889', guard: '#6a6' }[w.kind] || '#999') + '" stroke="#000" stroke-width=".3"/>'; }));
J.windows.forEach(w => { s += '<line x1="' + X(w.from[0]) + '" y1="' + Y(w.from[1]) + '" x2="' + X(w.to[0]) + '" y2="' + Y(w.to[1]) + '" stroke="#39f" stroke-width="5"/>'; });
J.doors.forEach(d => { const a = d.swing.arc; s += '<path d="M' + X(a.from[0]) + ',' + Y(a.from[1]) + ' A' + a.radius * S + ',' + a.radius * S + ' 0 0 ' + (a.clockwiseOnPage ? 1 : 0) + ' ' + X(a.to[0]) + ',' + Y(a.to[1]) + '" fill="none" stroke="#c33" stroke-width="1"/><line x1="' + X(a.centre[0]) + '" y1="' + Y(a.centre[1]) + '" x2="' + X(a.to[0]) + '" y2="' + Y(a.to[1]) + '" stroke="#c33"/><text x="' + X(d.centre[0]) + '" y="' + Y(d.centre[1]) + '" font-size="9" fill="#c33">' + d.id + (d.wallId ? '' : '?') + '</text>'; });
J.furniture.forEach(f => { s += '<g transform="translate(' + X(f.centre[0]) + ' ' + Y(f.centre[1]) + ') rotate(' + f.rotationDeg + ')"><rect x="' + -f.width * S / 2 + '" y="' + -f.depth * S / 2 + '" width="' + f.width * S + '" height="' + f.depth * S + '" fill="#fff" fill-opacity=".6" stroke="#06c" stroke-width=".8"/></g><text x="' + X(f.centre[0]) + '" y="' + Y(f.centre[1]) + '" font-size="7" text-anchor="middle" fill="#06c">' + f.id.slice(-3) + '</text>'; });
J.rooms.forEach(r => { s += '<text x="' + X(r.labelPoint[0]) + '" y="' + Y(r.labelPoint[1]) + '" font-size="10" text-anchor="middle" font-weight="700">' + r.tag + '</text><text x="' + X(r.labelPoint[0]) + '" y="' + (Y(r.labelPoint[1]) + 11) + '" font-size="9" text-anchor="middle">' + r.areaSF + ' SF</text>'; });
const W = J.footprint ? J.plan.footprint.width : 8, H = J.plan.footprint.depth;
fs.writeFileSync(out, '<svg xmlns="http://www.w3.org/2000/svg" width="' + (M * 2 + (W + 0.5) * S) + '" height="' + (M * 2 + (H + 3) * S) + '" style="background:#fff">' + s + '</svg>');
