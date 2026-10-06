// Smoke test for PAD. Serves the folder, opens the app at desktop and phone size,
// builds units through the real dialog, and checks for script errors and for
// occupants standing inside walls or furniture. Run: node tests/smoke.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8137;
const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
// "fulldemo" switches on accounts, sharing and chat, which are hidden until the shared service (Supabase) is connected.
// "manualedit" keeps the old drawing tools; units are normally changed only through the prompt box (tested below with a mocked assistant).
const URL = `http://localhost:${PORT}/?debug&fulldemo&manualedit`;
const errs = [];
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

try {
  // Without the shared service: no sign-in, sharing or chat, just a way in and a building saved in this browser
  const g = await browser.newPage({ viewport: { width: 1500, height: 860 } });
  g.on('pageerror', e => errs.push('guest script error: ' + e.message));
  await g.goto(`http://localhost:${PORT}/?debug`);
  await g.waitForSelector('#lStart', { state: 'visible', timeout: 5000 }).catch(() => errs.push('landing page has no Start designing button'));
  for (const sel of ['#lGoogle', '#lForm', '#lTabs']) if (await g.isVisible(sel)) errs.push(`${sel} should be hidden without the shared service`);
  await g.click('#lStart');
  await g.waitForSelector('#proj', { state: 'visible', timeout: 5000 }).catch(() => errs.push('Start designing did not reach the building list'));
  if (await g.isVisible('#pOut')) errs.push('sign out should be hidden without the shared service');
  await g.fill('#pName', 'Guest Building'); await g.click('#pNew');
  await g.waitForSelector('body.view-app', { timeout: 5000 }).catch(() => errs.push('guest could not create a building'));
  for (const sel of ['#hShare', '#hChat']) if (await g.isVisible(sel)) errs.push(`${sel} should be hidden without the shared service`);
  await g.click('#quickOpts [data-n="1"]'); await g.waitForTimeout(300);
  await g.reload();
  await g.waitForSelector('#proj', { state: 'visible', timeout: 5000 }).catch(() => errs.push('guest reload did not return to the building list'));
  if (!/Guest Building/.test((await g.textContent('#pList')) || '')) errs.push('guest building was not kept');
  // Home is one click away from the building list and from a building, and the landing page then offers a way back in
  // Keyplan: both rows of units either side of a 1.6 m corridor, and the efficiency taken from it
  await g.click('.pitem'); await g.waitForSelector('body.view-app', { timeout: 5000 });
  await g.click('#add'); await g.click('#browseLay'); await g.waitForSelector('#lay:not([hidden])'); await g.click('.lcard'); await g.waitForTimeout(300);
  if (await g.isVisible('#keyplan')) errs.push('the keyplan should be closed until it is opened from the navbar');
  await g.click('#hKeyplan');
  if (!(await g.isVisible('#keyplan'))) errs.push('the Keyplan button in the navbar did not open the keyplan');
  const kp = await g.evaluate(() => { const T = window.__pad, n = T.units().length, rows = document.querySelectorAll('#kpSvg .kp-u').length, mir = document.querySelectorAll('#kpSvg .kp-m').length; return { n, rows, mir, txt: document.getElementById('kpStats').textContent, eff: parseFloat(document.getElementById('kpStats').textContent) }; });
  if (!kp.n || kp.rows !== kp.n || kp.mir !== kp.n) errs.push('the keyplan should draw each unit and its mirror: ' + JSON.stringify(kp));
  if (!(kp.eff > 70 && kp.eff < 95)) errs.push('keyplan efficiency looks wrong: ' + kp.txt);
  await g.click('#kpEdit'); await g.fill('#kpLen', '40'); await g.press('#kpLen', 'Enter');
  if (!/of 40 m/.test(await g.textContent('#kpPct'))) errs.push('setting the building length did not change the keyplan');
  await g.click('#kpMin');
  if (await g.isVisible('#keyplan')) errs.push('the keyplan close button did not close it');
  for (const id of ['hHomeBtn', 'hBuildings', 'grp', 'undo', 'reset', 'zout', 'zin', 'hKeyplan']) if (!(await g.locator('#' + id + ' svg.ic').count())) errs.push('navbar button without an icon: ' + id);
  await g.click('#hBuildings'); await g.waitForSelector('#proj', { state: 'visible', timeout: 3000 });
  await g.click('#pHomeBtn');
  if (!(await g.isVisible('#land')) || !(await g.isVisible('#lContinue')) || (await g.isVisible('#lStart'))) errs.push('Home from the building list did not show the landing page with Go to my buildings');
  await g.click('#lContinue'); await g.waitForSelector('#proj', { state: 'visible', timeout: 3000 }).catch(() => errs.push('Go to my buildings did not return to the list'));
  await g.click('.pitem'); await g.waitForSelector('body.view-app', { timeout: 5000 });
  await g.click('#hHomeBtn');
  if (!(await g.isVisible('#lContinue'))) errs.push('Home from a building did not show the landing page');
  await g.close();

  // Prompt editing: the assistant is mocked, so this checks the page side only (apply, check, undo, confirm as an iteration)
  const aiOpen = async (ready) => {
    const page = await browser.newPage({ viewport: { width: 1500, height: 860 }, reducedMotion: 'reduce' });   // sheets close at once, so a test never meets one that is still sliding away
    page.on('pageerror', e => errs.push('prompt page script error: ' + e.message));
    page.hits = 0;
    await page.route('**/api/revise', async route => {
      const req = route.request();
      if (req.method() === 'GET') return route.fulfill({ json: { ready } });
      page.hits++;
      const plan = req.postDataJSON().plan, dr = plan.doors.find(x => !x.entry);
      if (plan.items) errs.push('the plan sent to the assistant should not list furniture');
      if (typeof req.postDataJSON().amount !== 'number') errs.push('the change amount was not sent to the assistant');
      return route.fulfill({ json: { say: 'Flipped a door.', ops: [{ op: 'flip_door', id: dr.id }, { op: 'remove_wall', wall: 'w99' }] } });
    });
    await page.goto(`http://localhost:${PORT}/?debug`);
    await page.click('#lStart'); await page.fill('#pName', 'Prompt Building'); await page.click('#pNew');
    await page.waitForSelector('body.view-app', { timeout: 5000 });
    await page.click('#quickOpts [data-n="1"]'); await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('#strip .unit .hit').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    return page;
  };
  const off = await aiOpen(false);
  if (await off.isVisible('#iCustBox')) errs.push('Describe a change should be hidden until the assistant is set up');
  await off.close();
  const ai = await aiOpen(true);
  if (!(await ai.isVisible('#iCustBox'))) errs.push('Describe a change should show once the assistant is set up');
  else {
    await ai.click('#iCust');
    await ai.waitForSelector('#aiText', { timeout: 3000 }).catch(() => errs.push('prompt box did not open'));
    if (await ai.locator('[data-act="add"], #edSvg [data-x]').count()) errs.push('drawing tools should not show in prompt mode');
    const n0 = await ai.evaluate(() => JSON.stringify(window.__pad.edState().P.doors));
    await ai.fill('#aiText', 'Add a plant and turn something');
    await ai.click('#aiGo');
    await ai.waitForSelector('.aip .eclist li', { timeout: 5000 }).catch(() => errs.push('prompt result did not list changes'));
    const r = await ai.evaluate(() => { const E = window.__pad.edState(); return { n: JSON.stringify(E.P.doors), used: E.used, dirty: E.dirty, text: document.getElementById('edSide').textContent, furn: document.querySelectorAll('#edSvg [class^="m-"]').length }; });
    if (r.n === n0 || r.used !== 1 || !r.dirty) errs.push('prompt steps were not applied as one change: ' + JSON.stringify({ used: r.used }));
    if (r.furn) errs.push('tracing should show no furniture, it shows ' + r.furn + ' pieces');
    if (!/not found/.test(r.text)) errs.push('a step that could not be done was not reported');
    await ai.click('#edUndo');
    if ((await ai.evaluate(() => JSON.stringify(window.__pad.edState().P.doors))) !== n0) errs.push('Undo did not take back the prompt');
    await ai.fill('#aiText', 'Add a plant again'); await ai.click('#aiGo');
    await ai.waitForFunction(() => window.__pad.edState().used === 1 && !window.__pad.edState().busy, null, { timeout: 5000 }).catch(() => errs.push('second prompt did not finish'));
    await ai.click('#edDone');
    if (!/Add a plant again/.test(await ai.inputValue('#ecNote'))) errs.push('the confirm note should start with the request');
    await ai.click('#ecOk'); await ai.waitForTimeout(300);
    const it = await ai.evaluate(() => { const u = window.__pad.units()[0]; return { n: u.iters && u.iters.length, cur: u.cur, note: u.iters && u.iters[1] && u.iters[1].note }; });
    if (it.n !== 2 || it.cur !== 2 || !/plant/.test(it.note || '')) errs.push('a confirmed prompt did not save as a new iteration: ' + JSON.stringify(it));
    // Save the same kind of sheet as a new unit instead: the original stays as it was
    const n1 = await ai.evaluate(() => window.__pad.units().length);
    await ai.evaluate(() => { if (document.getElementById('info').hidden) document.querySelector('#strip .unit .hit').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await ai.evaluate(() => document.getElementById('iCust').click()); await ai.fill('#aiText', 'Another plant'); await ai.click('#aiGo');
    await ai.waitForFunction(() => window.__pad.edState().used === 1 && !window.__pad.edState().busy, null, { timeout: 5000 }).catch(() => errs.push('third prompt did not finish'));
    await ai.click('#edDone'); await ai.click('#ecNew'); await ai.waitForTimeout(300);
    const nv = await ai.evaluate(() => { const L = window.__pad.units(); return { n: L.length, first: L[0].iters.length, last: L[L.length - 1].iters && L[L.length - 1].iters.length, custom: !!L[L.length - 1].custom }; });
    if (nv.n !== n1 + 1 || nv.first !== 2 || nv.last !== 1 || !nv.custom) errs.push('Save as new unit did not add a variation beside the original: ' + JSON.stringify(nv));
    // Room editing: drag a room onto another, the rooms reflow, a typed size is kept, undo puts it all back, and confirming keeps the new size
    await ai.evaluate(() => window.__pad.openEditor(window.__pad.units()[0]));
    await ai.waitForSelector('#rmGo, .rmcard, #edSide .note', { timeout: 3000 }).catch(() => {});
    await ai.waitForTimeout(900);
    // a point inside the named room that is not inside one of its small rooms
    const at = name => ai.evaluate(name => { const E = window.__pad.edState(), rm = window.__pad.rm.rmEnsure(); const o = Object.values(rm.rooms).find(x => x.n === name && !x.minor); if (!o) return null; const r = rm.cur[o.k], svg = document.getElementById('edSvg').getBoundingClientRect(), mins = Object.values(rm.rooms).filter(m => m.minor).map(m => (rm.minorCur && rm.minorCur[m.k]) || m.r0);
      let best = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], bd = -1; for (let x = r[0] + 0.2; x < r[2] - 0.2; x += 0.2) for (let y = r[1] + 0.2; y < r[3] - 0.2; y += 0.2) { const d = Math.min(1e9, ...mins.map(m => Math.max(m[0] - x, 0, x - m[2], m[1] - y, 0, y - m[3]) + (x >= m[0] && x <= m[2] && y >= m[1] && y <= m[3] ? -9 : 0))); if (d > bd) { bd = d; best = [x, y]; } }
      return [svg.left + E.x0 + best[0] * E.Sc, svg.top + E.y0 + best[1] * E.Sc]; }, name);
    const a = await at('Bedroom'), b2 = await at('Kitchen');
    if (!a || !b2) errs.push('room editing: the unit has no bedroom or kitchen to drag');
    else {
      const before = await ai.evaluate(() => { const E = window.__pad.edState(); return { W: E.P.W, D: E.P.D, r: E.P.rooms.map(q => q.n + q.x.toFixed(1) + q.y.toFixed(1)).join() }; });
      await ai.mouse.move(a[0], a[1]); await ai.mouse.down(); await ai.mouse.move((a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2, { steps: 5 }); await ai.mouse.move(b2[0], b2[1], { steps: 5 });
      if (!(await ai.locator('#rmOv .rmghost').count())) errs.push('dragging a room should show the room being moved');
      await ai.mouse.up(); await ai.waitForTimeout(300);
      const after = await ai.evaluate(() => { const E = window.__pad.edState(); return { used: E.used, log: E.log.length, W: E.P.W, D: E.P.D, r: E.P.rooms.map(q => q.n + q.x.toFixed(1) + q.y.toFixed(1)).join(), doors: E.P.doors.length, entry: E.P.doors.some(d => d.hy > E.P.D - 0.3), bad: E.P.rooms.some(q => q.red && !q.red.length) }; });
      if (after.used !== 1 || after.log !== 1 || after.r === before.r) errs.push('dragging a room did not reflow the unit as one change: ' + JSON.stringify({ before: before.r, after: after.r, used: after.used }));
      const noDoor = await ai.evaluate(() => window.__pad.edState().P.rooms.filter(q => (q.red || []).some(m => /has no door/.test(m))).map(q => q.n));
      if (!after.entry || after.doors < 2 || noDoor.length) errs.push('after a room move the unit lost doors or left rooms with no way in: ' + JSON.stringify({ doors: after.doors, noDoor }));
      // typed size: a bigger bedroom, kept as asked
      let tn = 'Den';   // a room with no small room drawn over it, so the click selects it
      for (const nm of ['Den', 'Living', 'Kitchen', 'Bedroom']) { const c = await at(nm); if (!c) continue; await ai.mouse.click(c[0], c[1]); await ai.waitForTimeout(150); if (await ai.locator('#rmA').count()) { tn = nm; break; } }
      await ai.fill('#rmA', '14'); await ai.click('#rmGo'); await ai.waitForTimeout(300);
      const den = await ai.evaluate(tn => { const E = window.__pad.edState(), q = E.P.rooms.find(x => x.n === tn); return { a: q && q.a, used: E.used, W: E.P.W, D: E.P.D }; }, tn);
      if (!den.a || Math.abs(den.a - 14) > 0.6 || den.used !== 2) errs.push('a typed room area was not kept: ' + JSON.stringify(den));
      if (den.D < after.D - 1e-6 || den.D - before.D > 1.05 || den.W - before.W > 0.45) errs.push('the footprint should change only a little: ' + JSON.stringify({ den, before }));
      await ai.click('#edUndo'); await ai.click('#edUndo'); await ai.waitForTimeout(200);
      const back = await ai.evaluate(() => { const E = window.__pad.edState(); return { used: E.used, W: E.P.W, D: E.P.D, r: E.P.rooms.map(q => q.n + q.x.toFixed(1) + q.y.toFixed(1)).join(), reds: E.P.rooms.filter(q => q.red).length }; });
      if (back.used !== 0 || back.r !== before.r || back.W !== before.W || back.D !== before.D || back.reds) errs.push('undo did not put the unit back after room edits: ' + JSON.stringify(back));
      // do it again and keep it
      await ai.mouse.move(a[0], a[1]); await ai.mouse.down(); await ai.mouse.move(b2[0], b2[1], { steps: 8 }); await ai.mouse.up(); await ai.waitForTimeout(300);
      await ai.click('#edDone'); await ai.click('#ecOk'); await ai.waitForTimeout(400);
      const kept = await ai.evaluate(() => { const u = window.__pad.units()[0]; return { W: u.plan.W, D: u.plan.D, dim: u.custom && u.custom.dim && u.custom.dim[0], people: u.people.length, nodes: Object.keys(u.plan.nodes).length }; });
      if (!kept.dim || kept.dim.W !== kept.W || kept.dim.D !== kept.D) errs.push('a saved room edit did not keep the unit size: ' + JSON.stringify(kept));
      // accepting furnishes the new layout afresh: a toilet 457 mm from the walls beside it, a bed, a sink, and nothing overlapping a wall
      const fz = await ai.evaluate(() => { const T = window.__pad, u = T.units()[0], P = u.plan, k = {}; P.furn.forEach(p => k[p.k] = (k[p.k] || 0) + 1); return { k, wc: T.wcClear(P), ov: T.edOverlaps ? T.edOverlaps(P).size : -1 }; });
      if (!fz.k.wc || !fz.k.bed || !fz.k.sink || !(fz.k.tub || fz.k.shower)) errs.push('accepting a layout should place a toilet, bed, sink and tub or shower: ' + JSON.stringify(fz.k));
      if (fz.wc < 0.456) errs.push('the new toilet is too close to a wall: ' + fz.wc);
      if (fz.ov > 0) errs.push('furnishing left ' + fz.ov + ' pieces overlapping walls or each other');
    }
    // Baseline layouts gallery
    await ai.evaluate(() => document.getElementById('iClose').click());
    await ai.evaluate(() => document.getElementById('add').click()); await ai.waitForTimeout(300); await ai.evaluate(() => document.getElementById('browseLay').click());
    const cards = await ai.locator('.lcard').count();
    if (cards !== 18) errs.push('the catalog gallery should show the 18 catalog layouts, it shows ' + cards);
    await ai.click('#layF [data-f="2"]');
    if ((await ai.locator('.lcard').count()) !== 7) errs.push('the 2 bed filter should leave the seven 2 bedroom layouts');
    await ai.click('#layF [data-f="0"]');
    await ai.click('.lcard'); await ai.waitForTimeout(300);
    const lay = await ai.evaluate(() => { const L = window.__pad.units(), u = L[L.length - 1], P = u.plan; return { n: L.length, layout: u.layout, rooms: P.rooms.length, bed: P.furn.some(p => p.k === 'bed'), W: P.W }; });
    if (lay.layout == null || lay.n !== nv.n + 1 || !lay.bed || lay.rooms < 5) errs.push('adding a baseline layout failed: ' + JSON.stringify(lay));
    // A new unit with a catalog bedroom count starts from a catalog layout; one without a catalog stays generated
    await ai.evaluate(() => document.getElementById('lay').hidden = true);
    await ai.click('#add'); await ai.click('#quickOpts [data-n="1"]'); await ai.waitForTimeout(250);
    await ai.click('#add'); await ai.click('#quickOpts [data-n="3"]'); await ai.waitForTimeout(250);
    const q2 = await ai.evaluate(() => { const L = window.__pad.units(), a = L[L.length - 2], b = L[L.length - 1]; return { a: a.n + ':' + a.layout, b: b.n + ':' + b.layout }; });
    if (/^1:null$/.test(q2.a) || !/^1:/.test(q2.a) || !/^3:null$/.test(q2.b)) errs.push('quick add should start 1 bed from the catalog and leave 3 bed generated: ' + JSON.stringify(q2));
    // printed net area carries over: the catalog layouts show 668, 678 or 670 ft2
    const net = await ai.evaluate(() => { const T = window.__pad, L = T.units(), u = L[L.length - 2]; return Math.round(T.netArea(u.plan) / 0.092903); });
    if (![668, 678, 670, 547].includes(net)) errs.push('catalog unit net area should match the printed drawing, got ' + net + ' ft2');
  }
    // Edit modes: Furniture, Drafting and Layout (AI) each offer their own tools
    await ai.evaluate(() => window.__pad.openEditor(window.__pad.units()[0]));
    await ai.waitForTimeout(700);
    const modeTxt = (await ai.locator('#edModes [data-mode]').allTextContents()).map(s => s.trim()).join('|');
    if (modeTxt !== 'Furniture|Drafting|Layout (AI)') errs.push('edit modes should be Furniture, Drafting and Layout (AI), got ' + modeTxt);
    const st = () => ai.evaluate(() => { const E = window.__pad.edState(); return { mode: E.mode, W: E.P.W, D: E.P.D, walls: E.P.walls.length, furn: document.querySelectorAll('#edSvg [class^="m-"]').length, walker: !!document.getElementById('edWk'), stuck: (E.wk ? E.wk.stuck.join() : ''), chips: [...document.querySelectorAll('#edSide .chip')].map(c => c.textContent), btns: [...document.querySelectorAll('#edSide [data-act]')].map(c => c.dataset.act) }; });
    let s = await st();
    if (s.mode !== 'layout' || !s.walker || s.furn) errs.push('Layout (AI) should start with a walking person and no furniture: ' + JSON.stringify({ m: s.mode, w: s.walker, f: s.furn }));
    await ai.click('#edModes [data-mode="furn"]'); s = await st();
    if (s.mode !== 'furn' || !s.furn || s.walker) errs.push('Furniture mode should show furniture and no walker');
    if (!s.chips.includes('Double bed') || s.chips.includes('Interior alcove') || s.chips.includes('Balcony')) errs.push('Furniture mode should offer furniture only: ' + s.chips.slice(0, 4));
    await ai.click('#edModes [data-mode="draft"]'); s = await st();
    if (s.mode !== 'draft' || s.furn) errs.push('Drafting should hide furniture');
    if (s.chips.includes('Double bed') || !s.chips.includes('Interior alcove') || !s.chips.includes('Balcony') || !s.btns.includes('fp')) errs.push('Drafting should offer walls, alcoves, bump-outs and footprint: ' + s.chips.join());
    if (!s.btns.includes('clean')) errs.push('Drafting should offer Clean up the drawing');
    await ai.evaluate(() => { const E = window.__pad.edState(); window.__pad.edSelect({ t: 'r', id: E.P.rooms.find(q => !q.bk).rid }); });
    { const t = await ai.locator('#edSide').innerText(); if (!/size text/i.test(t) || !/clear spot/i.test(t)) errs.push('clicking a room name in Drafting should offer hide size text and move to a clear spot'); }
    await ai.evaluate(() => { const E = window.__pad.edState(); window.__pad.edSelect(null); });
    const w0 = s.W, d0 = s.D, nw0 = s.walls;
    await ai.click('#edSide [data-act="fp"][data-ax="W"][data-d="0.1"]'); s = await st();
    if (Math.abs(s.W - w0 - 0.1) > 0.001) errs.push('Wider did not widen the footprint: ' + w0 + ' to ' + s.W);
    await ai.click('#edSide [data-act="fp"][data-ax="D"][data-d="0.1"]'); s = await st();
    if (Math.abs(s.D - d0 - 0.1) > 0.001) errs.push('Deeper did not deepen the footprint');
    await ai.click('#edUndo'); await ai.click('#edUndo'); s = await st();
    if (Math.abs(s.W - w0) > 0.001 || Math.abs(s.D - d0) > 0.001) errs.push('Undo did not restore the footprint');
    await ai.evaluate(() => { const b = [...document.querySelectorAll('#edSide .chip')].find(c => c.textContent === 'Interior alcove'); b.click(); }); s = await st();
    if (s.walls !== nw0 + 3) errs.push('Interior alcove should add three walls: ' + nw0 + ' to ' + s.walls);
    await ai.click('#edModes [data-mode="layout"]'); await ai.waitForTimeout(400); s = await st();
    if (s.mode !== 'layout' || !s.walker || s.furn) errs.push('back in Layout (AI) the walking person should show');
    await ai.evaluate(() => { document.getElementById('edCancel').click(); document.getElementById('edCancel').click(); }); await ai.waitForTimeout(200);
    // every catalog layout is walkable from the entry to every room, also after the footprint grows
    for (const c of JSON.parse(fs.readFileSync(path.join(root, 'tools/catalog.json'), 'utf8'))) {
      const r = await ai.evaluate(c => { const pad = window.__pad, u = pad.addUnit({ n: c.n, pri: 'balanced', seed: 1, layout: c.id }); pad.openEditor(u); const E = pad.edState(), out = { a: pad.edRoute(E.P).stuck.join() };
        document.querySelector('#edModes [data-mode="draft"]').click(); for (let i = 0; i < 4; i++) { document.querySelector('#edSide [data-act="fp"][data-ax="W"][data-d="0.1"]').click(); document.querySelector('#edSide [data-act="fp"][data-ax="D"][data-d="0.1"]').click(); }
        document.querySelector('#edModes [data-mode="layout"]').click(); out.b = pad.edRoute(E.P).stuck.join(); out.w = E.P.W - E.orig.W; E.P.walls.push({ x: 0, y: E.P.D / 2, w: E.P.W, h: 0.1 }); out.c = pad.edRoute(E.P).stuck.length; document.getElementById('edCancel').click(); document.getElementById('edCancel').click(); return out; }, c);
      if (r.a || r.b || Math.abs(r.w - 0.4) > 0.001) errs.push(c.id + ' walking check: ' + JSON.stringify(r));
      if (!r.c) errs.push(c.id + ': with a wall across the unit the walking person should find rooms it cannot reach');
    }
    // Dimensions: none are drawn until a person adds one with two clicks in Drafting, and they show on the combined layout
    await ai.waitForTimeout(900);   // let the previous sheet finish closing
    await ai.evaluate(() => { document.getElementById('iClose') && document.getElementById('iClose').click(); window.__pad.openEditor(window.__pad.units()[0]); });
    await ai.waitForTimeout(500);
    await ai.click('#edModes [data-mode="draft"]');
    await ai.click('#edSide [data-act="dimtool"]');
    const wp = await ai.evaluate(() => { const E = window.__pad.edState(), w = E.P.walls.find(q => q.w > 1.2 && q.h < 0.4 && q.y > 0.6 && q.y < E.P.D - 0.6 && !q.rail), r = document.getElementById('edSvg').getBoundingClientRect(); if (!w) return null; const px = (x, y) => [r.left + E.x0 + x * E.Sc, r.top + E.y0 + y * E.Sc]; return { a: px(w.x, w.y + w.h / 2), b: px(w.x + w.w, w.y + w.h / 2), mm: Math.round(w.w * 1000) }; });
    if (!wp) errs.push('dimensions: no wall to dimension');
    else {
      await ai.mouse.click(wp.a[0], wp.a[1]); await ai.mouse.click(wp.b[0], wp.b[1]); await ai.waitForTimeout(200);
      const dm = await ai.evaluate(() => { const E = window.__pad.edState(); return { n: (E.P.dms || []).length, used: E.used, txt: [...document.querySelectorAll('#edSvg .udt')].map(t => t.textContent) }; });
      if (dm.n !== 1 || dm.txt.length !== 1) errs.push('two clicks should add one dimension: ' + JSON.stringify(dm));
      else if (Math.abs(+dm.txt[0] - wp.mm) > 150) errs.push('the dimension reads ' + dm.txt[0] + ' but the wall is about ' + wp.mm + ' mm');
      if (dm.used !== 0) errs.push('a dimension should not use up one of the five changes');
      await ai.click('#edDone'); await ai.click('#ecOk'); await ai.waitForTimeout(400);
      const st2 = await ai.evaluate(() => ({ udt: document.querySelectorAll('#strip .udt').length, auto: document.querySelectorAll('#strip .wdt, #strip .dt, #strip .dim2, #strip .ext, #strip .ht').length }));
      if (st2.udt < 1) errs.push('an added dimension should show on the combined layout');
      if (st2.auto) errs.push('the combined layout should show no dimensions that were not added, it shows ' + st2.auto);
    }
    // Export: every catalog layout exports as JSON that matches the draft schema, with the areas PAD shows
    {
      const { validateExport } = await import('../tools/validate-export.mjs');
      let nExp = 0;
      for (const c of JSON.parse(fs.readFileSync(path.join(root, 'tools/catalog.json'), 'utf8'))) {
        const r = await ai.evaluate(c => { const pad = window.__pad, u = pad.addUnit({ n: c.n, pri: 'balanced', seed: 1, layout: c.id }); return { j: JSON.parse(JSON.stringify(pad.padExport(u))), net: pad.netArea(u.plan) }; }, c);
        const ve = validateExport(r.j);
        ve.slice(0, 3).forEach(m => errs.push(c.id + ' export: ' + m));
        if (Math.abs(r.j.plan.areas.netM2 - r.net) > 0.01) errs.push(c.id + ' exported net area ' + r.j.plan.areas.netM2 + ' differs from PAD ' + r.net);
        if (!r.j.rooms.length || !r.j.walls.length || !r.j.furniture.length || !r.j.doors.length) errs.push(c.id + ' export is missing rooms, walls, doors or furniture');
        if (new Set(r.j.furniture.map(p => p.id)).size !== r.j.furniture.length) errs.push(c.id + ' furniture ids are not unique');
        nExp++;
      }
      const nCat = JSON.parse(fs.readFileSync(path.join(root, 'tools/catalog.json'), 'utf8')).length;
      if (nExp !== nCat) errs.push('expected to export ' + nCat + ' catalog layouts, exported ' + nExp);
      if (!(await ai.locator('#iExp').count())) errs.push('the unit panel should have an Export JSON button');
    }
    // Circulation steps and the clean-up pass: a second corridor door opens a gap in the corridor wall, a hall gives space to a room, and nothing is left overlapping
    let grew = 0;
    for (const c of JSON.parse(fs.readFileSync(path.join(root, 'tools/catalog.json'), 'utf8'))) {
      const r = await ai.evaluate(c => { const pad = window.__pad, u = pad.addUnit({ n: c.n, pri: 'balanced', seed: 1, layout: c.id }); pad.openEditor(u); const E = pad.edState(), P = E.P, out = {};
        const nd = P.doors.length, a = pad.addCorridorDoor(P); out.door = a.ok; if (a.ok) { const d = P.doors[P.doors.length - 1], mx = d.hx + d.w / 2, my = d.hy + 0.05; out.blocked = P.walls.some(w => mx > w.x && mx < w.x + w.w && my > w.y && my < w.y + w.h); }
        out.grew = pad.growRoom(P, 'Bedroom', 0.3).ok || pad.growRoom(P, 'Bath', 0.3).ok;
        const rep = pad.cleanPlan(P); out.left = rep.left.join(); out.stuck = pad.edRoute(P).stuck.join();
        document.getElementById('edCancel').click(); document.getElementById('edCancel').click(); return out; }, c);
      if (r.door && r.blocked) errs.push(c.id + ': the new corridor door has a wall across it');
      if (r.left) errs.push(c.id + ' clean-up left: ' + r.left);
      if (r.stuck) errs.push(c.id + ' unreachable after the circulation steps: ' + r.stuck);
      if (r.grew) grew++;
    }
    if (grew < 6) errs.push('rooms grew into the hall or a closet on only ' + grew + ' of 12 layouts');
    // Suggest a variation: at 1% the net area stays within 1%, and the slider range is 1 to 100
    const sl = await ai.evaluate(() => { window.__pad.openEditor(window.__pad.units()[0]); const s = document.getElementById('aiAmt'); return s ? { min: s.min, max: s.max, v: s.value } : null; });
    if (!sl || sl.min !== '1' || sl.max !== '100' || sl.v !== '1') errs.push('the change slider should run 1 to 100 and start at 1: ' + JSON.stringify(sl));
    await ai.evaluate(() => { document.getElementById('edCancel').click(); document.getElementById('edCancel').click(); });
    let okv = 0, nv2 = 0;
    for (const c of JSON.parse(fs.readFileSync(path.join(root, 'tools/catalog.json'), 'utf8'))) {
      const r = await ai.evaluate(c => { const pad = window.__pad, u = pad.addUnit({ n: c.n, pri: 'balanced', seed: 1, layout: c.id }); pad.openEditor(u); const E = pad.edState(), n0 = pad.netArea(E.orig); document.getElementById('aiVar').click();
        const out = { did: E.dirty, dev: Math.abs(pad.netArea(E.P) - n0) / n0, stuck: pad.edRoute(E.P).stuck.length }; document.getElementById('edCancel').click(); document.getElementById('edCancel').click(); return out; }, c);
      nv2++; if (r.did) okv++;
      if (r.did && (r.dev > 0.0101 || r.stuck)) errs.push(c.id + ' variation at 1% broke the limits: ' + JSON.stringify(r));
    }
    if (okv < nv2 - 1) errs.push('Suggest a variation worked on only ' + okv + ' of ' + nv2 + ' layouts');
  await ai.close();

  // Accounts: the landing page comes first. These run against the demo backend (no Supabase keys in the repo).
  const signUp = async (page, email, name) => {
    await page.waitForSelector('#land', { state: 'visible', timeout: 5000 });
    await page.click('#lTabs [data-m="up"]');
    await page.fill('#lName', name); await page.fill('#lEmail', email); await page.fill('#lPass', 'password123');
    await page.click('#lGo');
    await page.waitForSelector('#proj', { state: 'visible', timeout: 5000 });
  };
  const newBuilding = async (page, name, sample = false) => {
    await page.fill('#pName', name);
    if (sample) await page.check('#pSample');
    await page.click('#pNew');
    await page.waitForSelector('body.view-app', { timeout: 5000 });
  };

  // Desktop
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 860 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('desktop script error: ' + e.message));
  await p.goto(URL);
  await p.waitForSelector('#land', { state: 'visible', timeout: 5000 }).catch(() => errs.push('landing page did not show'));
  await p.fill('#lEmail', 'nobody@example.com'); await p.fill('#lPass', 'wrongpass1'); await p.click('#lGo');
  await p.waitForSelector('#lMsg', { state: 'visible', timeout: 3000 }).catch(() => errs.push('wrong sign-in did not show an error'));
  await signUp(p, 'alex@example.com', 'Alex').catch(() => errs.push('sign up did not reach the building list'));
  await newBuilding(p, 'Smoke Test').catch(() => errs.push('could not create a building'));
  await p.waitForSelector('#s1:not([hidden])', { timeout: 5000 }).catch(() => errs.push('new building did not open the unit dialog'));
  if ((await p.evaluate(() => window.__pad.units().length)) !== 0) errs.push('a new building should start with no units');

  const add = async (n, pri, side = 'R', corner = false, other = '') => {
    if (!(await p.isVisible('#modal'))) await p.click(side === 'L' ? '#addL' : '#add');
    await p.click(`#bedOpts [data-n="${n}"]`);
    await p.click(`#priOpts [data-p="${pri}"]`);
    if (pri === 'other') { await p.fill('#otherTxt', other); await p.click('#gen'); }
    await p.click(`#segP [data-p="${side}"]`);
    if (corner) await p.check('#fCorner');
    if (await p.isDisabled('#gen3')) { errs.push(`could not generate ${n}-bed ${pri} on ${side}: ` + (await p.textContent('#sizeRes'))); await p.click('#mClose'); return; }
    await p.click('#gen3');
    await p.waitForTimeout(150);
  };
  // Quick add: one click builds a standard unit
  const before = await p.evaluate(() => window.__pad.units().length);
  await p.click('#quickOpts [data-n="2"]');
  await p.waitForTimeout(150);
  if ((await p.evaluate(() => window.__pad.units().length)) !== before + 1) errs.push('quick add did not add a unit');

  await add(2, 'balanced', 'L', true);
  await add(1, 'storage', 'R');
  await add(3, 'other', 'R', false, 'family with kids, kitchen island, home office, dog');
  await add(4, 'bath', 'R');
  await add(0, 'bedroom', 'R', true);

  const order = await p.evaluate(() => window.__pad.units().map(u => (u.corner || '') + u.n));
  if (order[0] !== 'L2' || order[order.length - 1] !== 'R0') errs.push('unexpected unit order: ' + order.join(' '));

  // Building code limits on new studios and 1-bedroom units
  const lim = await p.evaluate(() => {
    const T = window.__pad, out = [];
    for (const u of T.units()) {
      if (u.src !== 'add' || u.n > 1) continue;
      const a = u.plan.W * u.plan.D, tag = (u.corner || '') + u.n + u.pri;
      if (u.n === 0 && a < 37 - 0.01) out.push(`${tag}: studio area ${a.toFixed(1)} m2 is under 37`);
      if (u.n === 0 && T.livDin(u.plan) < 13.5 - 0.01) out.push(`${tag}: living and dining ${T.livDin(u.plan).toFixed(1)} m2 is under 13.5`);
      if (u.n === 1 && !u.layout && ![6, 6.5, 7].some(w => Math.abs(w - u.plan.W) < 0.01)) out.push(`${tag}: 1-bed width ${u.plan.W} is not 6, 6.5 or 7`);
      if (u.plan.W < 2) out.push(`${tag}: wall under 2 m`);
      if (!u.layout && T.wcClear(u.plan) < 0.457 - 0.001) out.push(`${tag}: toilet ${T.wcClear(u.plan).toFixed(3)} m from a side wall`);
      for (const f of u.plan.furn) if (f.k === 'tub' && !(Math.abs(f.w - 1.524) < 0.001 && (Math.abs(f.d - 0.762) < 0.001 || Math.abs(f.d - 0.813) < 0.001))) out.push(`${tag}: tub ${f.w} x ${f.d} is not 60x30 or 60x32 in`);
    }
    return out;
  });
  errs.push(...lim);

  // Customize: open the editor on the 4-bed, move a wall, add a toilet, save
  const edit = await p.evaluate(() => {
    const T = window.__pad, u = T.units().find(x => x.n === 4), out = {};
    const nf = u.plan.furn.length, nw = u.plan.walls.length;
    document.querySelector(`#strip .unit[data-idx="${u.idx}"] .hit`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('iCust').click();
    out.open = !document.getElementById('ed').hidden;
    const gs = T.wallGroups(T.edState().P), gi = gs.findIndex(g => !g.hor), wi = gs[gi].idxs[0];
    T.edSelect({ t: 'w', wi });
    const pos = () => T.wallGroups(T.edState().P).find(g => g.idxs[0] === wi).pos, p0 = pos();
    for (const d of ['0.05', '-0.05']) { document.querySelector(`[data-act="wnudge"][data-d="${d}"]`).click(); if (Math.abs(pos() - p0) > 0.001) break; }
    out.moved = Math.abs(pos() - p0) > 0.001;
    document.querySelector('[data-act="add"][data-g="0"][data-i="0"]').click();
    // Dead-end hall: the bubble offers a closet, which removes it
    const P = T.edState().P, de0 = T.deadEnds(P);
    out.bubbles = document.querySelectorAll('.bub').length === de0.length;
    if (de0.length) { document.querySelector('.bub [data-m="closet"]').click(); out.deadFixed = T.deadEnds(T.edState().P).length === de0.length - 1; }
    else out.deadFixed = true;
    // Doors slide along their wall (and the wall re-cuts around them)
    out.doorMoved = T.edState().P.doors.some(d => T.moveDoor(T.edState().P, d, 0.1) || T.moveDoor(T.edState().P, d, -0.1));
    out.used = T.edState().used;
    // Tracing paper: review, then confirm the sheet as a new iteration
    document.getElementById('edDone').click();
    out.review = !document.getElementById('edConfirm').hidden && document.querySelectorAll('#ecBody li').length > 0;
    document.getElementById('ecNote').value = 'smoke test';
    document.getElementById('ecOk').click();
    out.saved = !!u.custom && u.plan.furn.length >= nf + 1 && u.plan.rooms.length >= 1;
    out.iters = !!u.iters && u.iters.length === 2 && u.cur === 2 && u.iters[1].note === 'smoke test';
    out.idx = u.idx;
    return out;
  });
  if (edit.used < 3 || edit.used > 5) errs.push('change meter did not count the changes: ' + edit.used);
  if (!edit.review) errs.push('review sheet did not list the changes');
  if (!edit.iters) errs.push('confirming did not record a new iteration');

  // A sheet allows only a few changes; extra ones are refused. Discarding leaves the unit as it was.
  const bud = await p.evaluate(async () => {
    const T = window.__pad, u = T.units().find(x => x.n === 4), out = {}, nf = u.plan.furn.length;
    if (document.getElementById('info').hidden) document.querySelector(`#strip .unit[data-idx="${u.idx}"] .hit`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('iCust').click();
    for (let i = 0; i < 8; i++) document.querySelector(`[data-act="add"][data-g="${i % 4}"][data-i="0"]`).click();
    out.used = T.edState().used;
    out.msg = /used all/.test(T.edState().msg);
    out.ghost = !!document.querySelector('#edSvg .ghost');
    document.getElementById('edCancel').click(); document.getElementById('edCancel').click();
    await new Promise(r => setTimeout(r, 800));
    out.closed = document.getElementById('ed').hidden;
    out.same = u.plan.furn.length === nf;
    return out;
  });
  if (bud.used !== 5 || !bud.msg) errs.push('change budget was not enforced: ' + JSON.stringify(bud));
  if (!bud.ghost) errs.push('tracing sheet did not show the layer underneath');
  if (!bud.closed || !bud.same) errs.push('discarding did not close the sheet and keep the unit unchanged');
  // Kitchen templates: every kitchen offers at least one, applying costs one change and keeps the code checks happy
  const kit = await p.evaluate(() => {
    const T = window.__pad, out = { tried: [] }, units = T.units().filter(x => x.src === 'add' || x.src === 'base');
    for (const u of T.units()) {
      if (u.layout) continue;   // catalog layouts keep the kitchen they were drawn with
      if (document.getElementById('info').hidden) document.querySelector(`#strip .unit[data-idx="${u.idx}"] .hit`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.getElementById('iCust').click();
      const P = T.edState().P, avail = ['u', 'l', 'gal2', 'gal1'].filter(k => T.kTemplate(P, k).ok);
      if (!avail.length) { out.tried.push(`${u.idx}: none`); document.getElementById('edCancel').click(); continue; }
      const k = avail[0];
      document.querySelector(`[data-act="kitchen"][data-kind="${k}"]`).click();
      const E = T.edState(), bad = T.kitchenIssues(E.P, u).filter(x => x[0] === 'bad' || /Aisle/.test(x[1]));
      out.tried.push(`${u.idx}:${k}:used${E.used}:${bad.length}`);
      if (E.used !== 1 || bad.length) out.err = `${u.idx} ${k} used ${E.used} issues ${bad.map(x => x[1]).join('; ')}`;
      document.getElementById('edCancel').click(); document.getElementById('edCancel').click();
    }
    return out;
  });
  if (kit.err) errs.push('kitchen template problem: ' + kit.err);
  if (kit.tried.some(s => /: none/.test(s))) errs.push('a unit offered no kitchen template: ' + kit.tried.join(' '));
  await p.waitForTimeout(800);

  // Restoring the original layout from the iteration list
  const rest = await p.evaluate(() => {
    const T = window.__pad, u = T.units().find(x => x.n === 4);
    document.querySelector(`#strip .unit[data-idx="${u.idx}"] .hit`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.querySelector('[data-restore="1"]').click();
    const first = u.cur === 1 && !u.custom;
    document.querySelector('[data-restore="2"]').click();
    return first && u.cur === 2 && !!u.custom;
  });
  if (!rest) errs.push('iteration restore did not switch between layouts');

  // Balcony, bump-outs and bump-ins: add them, confirm, then take them away again and get the original walls back
  const bump = await p.evaluate(() => {
    const T = window.__pad, u = T.units().find(x => x.n === 4), out = {};
    const facade = P => JSON.stringify(P.walls.filter(w => w.w > w.h && Math.abs(w.y) < 0.01 && !w.bw).map(w => [Math.round(w.x * 1000), Math.round(w.w * 1000)]).sort((a, b) => a[0] - b[0]));
    const entryHy = P => Math.max(...P.doors.map(d => d.hy));
    const fresh = T.buildUnit(u), f0 = facade(fresh), hy0 = entryHy(fresh);
    const open = () => { if (document.getElementById('info').hidden) document.querySelector(`#strip .unit[data-idx="${u.idx}"] .hit`).dispatchEvent(new MouseEvent('click', { bubbles: true })); document.getElementById('iCust').click(); };
    const rooms = P => P.rooms.reduce((s, q) => s + q.a, 0);
    open();
    let E = T.edState(), n0 = rooms(E.P);
    const add = i => document.querySelector(`[data-act="add"][data-g="5"][data-i="${i}"]`).click();
    add(0); out.balcony = E.P.bumps.some(b => b.kind === 'balcony') && Math.abs(rooms(E.P) - n0) < 0.001;     // outdoor: no net area
    add(1); out.den = rooms(E.P) > n0 + 1.9;                                                                 // a den adds area
    add(4); out.vestibule = entryHy(E.P) < hy0 - 0.9 && E.P.bumps.some(b => b.kind === 'vestibule');          // the entry door moves back
    out.used = E.used;
    document.getElementById('edDone').click(); document.getElementById('ecOk').click();
    out.saved = u.plan.bumps.length === 3 && u.plan.walls.some(w => w.bw);
    out.gross = T.units().length > 0;
    open(); E = T.edState();
    for (const b of E.P.bumps.slice()) { T.edSelect({ t: 'b', id: b.id }); document.querySelector('[data-act="bdel"]').click(); }
    out.removed = E.P.bumps.length === 0 && facade(E.P) === f0 && Math.abs(entryHy(E.P) - hy0) < 0.001 && !E.P.walls.some(w => w.bw) && Math.abs(rooms(E.P) - n0) < 0.001;
    document.getElementById('edDone').click(); document.getElementById('ecOk').click();
    return out;
  });
  if (!bump.balcony) errs.push('balcony should add no net area');
  if (!bump.den) errs.push('den bump-out did not add floor area');
  if (!bump.vestibule) errs.push('entry vestibule did not move the entry door back');
  if (!bump.saved) errs.push('bumps were not saved with the iteration');
  if (!bump.removed) errs.push('removing the bumps did not restore the original walls, door and area');
  if (!edit.open) errs.push('customize did not open the editor');
  if (!edit.moved) errs.push('editor could not move a wall');
  if (!edit.saved) errs.push('editor did not save the edited unit');
  if (!edit.bubbles) errs.push('dead-end bubbles did not match the dead ends found');
  if (!edit.deadFixed) errs.push('Add closet did not remove the dead end');
  if (!edit.doorMoved) errs.push('editor could not slide a door');

  const col = await p.evaluate(async () => {
    const T = window.__pad; let bad = 0, n = 0;
    for (let k = 0; k < 60; k++) {
      await new Promise(r => setTimeout(r, 150));
      // People lying on a bed or sofa, or rising from one, are on the furniture on purpose.
      for (const u of T.units()) for (const q of u.people) { if (q.lie > 0.02 || q.tr) continue; n++; if (!T.isFree(u.plan, q.x, q.y)) bad++; }
    }
    return { bad, n };
  });
  if (col.bad) errs.push(`collision: ${col.bad} of ${col.n} occupant samples inside walls or furniture`);

  // Sharing and chat: invite a second person, who then sees the building and chats live
  await p.click('#hShare'); await p.fill('#shEmail', 'bob@example.com'); await p.click('#shForm button');
  await p.waitForSelector('#shMsg:not([hidden])', { timeout: 3000 }).catch(() => errs.push('invite did not confirm'));
  await p.click('#shClose');
  const q = await ctx.newPage();
  q.on('pageerror', e => errs.push('second user script error: ' + e.message));
  await q.goto(URL);
  await signUp(q, 'bob@example.com', 'Bob').catch(() => errs.push('second user could not sign up'));
  if (!/Smoke Test/.test((await q.textContent('#pList')) || '')) errs.push('invited person did not see the shared building');
  await q.click('.pitem'); await q.waitForSelector('#strip', { state: 'visible', timeout: 5000 });
  await q.click('#hChat'); await q.fill('#chText', 'Hello from Bob'); await q.click('#chSend');
  await p.waitForTimeout(400);
  if ((await p.textContent('#hCnt')) !== '1') errs.push('unread chat badge did not count the new message');
  await p.click('#hChat'); await p.waitForTimeout(200);
  if (!/Hello from Bob/.test(await p.textContent('#chMsgs'))) errs.push('chat message did not arrive for the other person');
  await p.click('#chClose');
  await q.close();

  // Sign out returns to the landing page, and the building is still listed after signing back in
  await p.reload();
  await p.waitForSelector('#proj', { state: 'visible', timeout: 5000 }).catch(() => errs.push('reload did not return to the building list'));
  await p.click('#pOut');
  await p.waitForSelector('#land', { state: 'visible', timeout: 3000 }).catch(() => errs.push('sign out did not return to the landing page'));
  await p.fill('#lEmail', 'alex@example.com'); await p.fill('#lPass', 'password123'); await p.click('#lGo');
  await p.waitForSelector('.pitem', { timeout: 5000 }).catch(() => errs.push('building missing after signing back in'));
  await p.click('.pitem');
  await p.waitForSelector('#strip', { state: 'visible', timeout: 5000 });
  await p.waitForTimeout(400);
  const after =await p.evaluate(() => window.__pad.units().map(u => (u.corner || '') + u.n));
  if (after.join() !== order.join()) errs.push('added units did not survive a reload');
  if (!(await p.evaluate(i => !!window.__pad.units().find(u => u.idx === i).custom, edit.idx))) errs.push('customized layout did not survive a reload');

  // Phone
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  m.on('pageerror', e => errs.push('phone script error: ' + e.message));
  await m.goto(URL);
  await signUp(m, 'phone@example.com', 'Phone').catch(() => errs.push('phone sign up failed'));
  await newBuilding(m, 'Phone Test', true).catch(() => errs.push('phone could not create a building'));
  await m.click('#mClose').catch(() => {});
  if (!(await m.isVisible('#strip'))) errs.push('phone building strip did not render');
  // The phone shows the building as one strip: the unit in focus is in the middle and its neighbours show at the sides
  const view = await m.evaluate(() => {
    const T = window.__pad, sc = document.getElementById('scroller'), us = T.units();
    const svgR = document.getElementById('strip').getBoundingClientRect(), s = sc.getBoundingClientRect();
    const hits = [...document.querySelectorAll('#strip .unit .hit')].map(h => h.getBoundingClientRect());
    return { visible: hits.filter(r => r.right > s.left + 20 && r.left < s.right - 20).length, units: us.length };
  });
  if (view.visible < 2) errs.push('phone should show a neighbouring unit beside the focused one');
  await m.click('#mNext');
  await m.waitForTimeout(900);
  const count = await m.textContent('#mCount');
  if (!/^2 \//.test(count.trim())) errs.push('phone next arrow did not advance: ' + count);
  // Delete a unit from its panel, then undo the delete; a deleted sample unit stays deleted after a reload
  const del = await m.evaluate(async () => {
    const T = window.__pad, n0 = T.units().length, i = +document.getElementById('mCount').textContent.split(' / ')[0] - 1, idx = T.units()[i].idx;
    document.querySelector(`#strip .unit[data-idx="${idx}"] .hit`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('iDel').click(); document.getElementById('iDel').click();
    const gone = T.units().length === n0 - 1 && !T.units().some(u => u.idx === idx);
    document.querySelector('#toast .tb').click();
    const back = T.units().length === n0 && T.units().some(u => u.idx === idx);
    document.querySelector(`#strip .unit[data-idx="${idx}"] .hit`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('iDel').click(); document.getElementById('iDel').click();
    await new Promise(r => setTimeout(r, 700));
    return { gone, back, n0, idx };
  });
  if (!del.gone) errs.push('Delete this unit did not remove the unit');
  if (!del.back) errs.push('Undo did not bring the deleted unit back');
  await m.reload();
  await m.waitForSelector('.pitem', { timeout: 5000 });
  await m.click('.pitem');
  await m.waitForSelector('body.view-app', { timeout: 5000 });
  const kept = await m.evaluate(i => window.__pad.units().length === i.n0 - 1 && !window.__pad.units().some(u => u.idx === i.idx), del);
  if (!kept) errs.push('a deleted sample unit came back after a reload');
} finally {
  await browser.close();
  srv.kill();
}

if (errs.length) { console.error('Smoke test failed:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('Smoke test passed.');
