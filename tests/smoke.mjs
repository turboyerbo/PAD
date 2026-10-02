// Smoke test for PAD. Serves the folder, opens the app at desktop and phone size,
// builds units through the real dialog, and checks for script errors and for
// occupants standing inside walls or furniture. Run: node tests/smoke.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8137;
const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
// "fulldemo" switches on accounts, sharing and chat, which are hidden until the shared service (Supabase) is connected.
const URL = `http://localhost:${PORT}/?debug&fulldemo`;
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
  await g.close();

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
      if (u.n === 1 && ![6, 6.5, 7].some(w => Math.abs(w - u.plan.W) < 0.01)) out.push(`${tag}: 1-bed width ${u.plan.W} is not 6, 6.5 or 7`);
      if (u.plan.W < 2) out.push(`${tag}: wall under 2 m`);
      if (T.wcClear(u.plan) < 0.457 - 0.001) out.push(`${tag}: toilet ${T.wcClear(u.plan).toFixed(3)} m from a side wall`);
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
  if (!(await m.isVisible('#pager .pg'))) errs.push('phone pager did not render');
  await m.click('#mNext');
  await m.waitForTimeout(400);
  const count = await m.textContent('#mCount');
  if (!/^2 \//.test(count.trim())) errs.push('phone next arrow did not advance: ' + count);
} finally {
  await browser.close();
  srv.kill();
}

if (errs.length) { console.error('Smoke test failed:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('Smoke test passed.');
