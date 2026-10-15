#!/usr/bin/env node
// Testes de regressão da fase 1-1 (aprovada). Rode com: node tests/run.js  [filtro opcional pelo nome]
// Cada teste abre uma página nova, então um não contamina o outro.
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const { chromium, openGame } = require('./harness');

const tests = [];
const test = (name, fn, opts = {}) => tests.push({ name, fn, opts });
function expect(cond, msg) { if (!cond) throw new Error(msg); }
const near = (v, target, tol) => Math.abs(v - target) <= tol;

/* ---------------- física ---------------- */
test('pulo: alturas e alcance dentro dos limites', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, W = NEXY.World;
    H.noEnemies();
    for (let r = 0; r < 20; r++) for (let c = 0; c < 40; c++) W.tiles[r * W.w + c] = 0; // área plana e limpa
    function jump(keys, vx0, key = 'jump', hold = true) {
      H.tp(3, 19); P.x = 96; P.vx = vx0; P.facing = 1; H.set(keys); H.step(1);
      const y0 = P.y + P.h, x0 = P.x; H.set(hold ? keys.concat([key]) : keys); H.press(key);
      let min = y0, i = 0; H.step(1);
      while (!P.onGround && i < 300) { H.step(1); i++; min = Math.min(min, P.y + P.h); if (i === 2 && !hold) H.set(keys); }
      return { h: y0 - min, dist: P.x - x0 };
    }
    return { stand: jump([], 0), walk: jump(['right'], 140), run: jump(['right', 'run'], 230), spin: jump([], 0, 'spin'), tap: jump([], 0, 'jump', false) };
  });
  expect(near(r.stand.h, 123, 6), `pulo parado ${r.stand.h} (≈4 tiles)`);
  expect(near(r.run.h, 154, 8), `pulo correndo ${r.run.h} (≈5 tiles)`);
  expect(r.run.dist >= 180, `alcance correndo ${r.run.dist}`);
  expect(r.walk.dist >= 105 && r.walk.dist <= 125, `alcance andando ${r.walk.dist}`);
  expect(r.spin.h < r.stand.h, 'pulo giratório mais baixo');
  expect(r.tap.h < 70, 'soltar cedo corta a subida');
});

test('vãos obrigatórios passam dentro dos limites', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P;
    const trial = (startC, keys, jumpAtX, goalX) => {
      H.noEnemies(); H.tp(startC, 19, 999); P.vx = keys.includes('run') ? 230 : 140; H.set(keys);
      let jumped = false;
      for (let i = 0; i < 240; i++) {
        if (!jumped && P.x + P.w >= jumpAtX) { H.set(keys.concat(['jump'])); H.press('jump'); jumped = true; }
        H.step(1);
        if (P.dead || P.y > 700) return 'FELL';
        if (P.cx > goalX && P.onGround) return 'OK';
      }
      return 'TIMEOUT';
    };
    return {
      pit32: trial(28, ['right'], 31 * 32 + 30, 34.5 * 32), pit48: trial(45, ['right'], 47 * 32 + 30, 51.5 * 32),
      pit54: trial(52, ['right'], 53 * 32 + 30, 57.5 * 32), pit90: trial(89, ['right'], 89 * 32 + 30, 93.5 * 32),
      pit154: trial(151, ['right', 'run'], 153 * 32 + 30, 158.5 * 32), pit165: trial(161, ['right', 'run'], 164 * 32 + 30, 169.5 * 32),
    };
  });
  for (const k in r) expect(r[k] === 'OK', `${k}: ${r[k]}`);
});

test('FINE: pulos comuns não alcançam, quique no Rastejante alcança', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, W = NEXY.World, E = NEXY.Ents;
    let hits = 0, tries = 0;
    for (const startC of [93, 95, 96, 97, 99, 100, 88, 86]) for (const dir of [1, -1]) for (const keys of [['run'], []]) for (let d = 0; d < 21; d += 4) {
      H.noEnemies(); W.blockAt(96, 11).state = 'ready';
      H.tp(startC, startC === 100 ? 19 : startC < 89 ? 16 : 18, 999);
      P.facing = dir; P.vx = dir * (keys.length ? 230 : 140);
      const hk = keys.concat([dir > 0 ? 'right' : 'left']);
      H.set(hk); H.step(d % 7); H.set(hk.concat(['jump'])); H.press('jump');
      for (let i = 0; i < 90; i++) { H.step(1); if (i > 3 && P.onGround) break; }
      tries++; if (W.blockAt(96, 11).state !== 'ready') hits++;
    }
    W.blockAt(96, 11).state = 'ready'; H.wakeSpawns(); H.tp(92, 19, 999); H.set([]); H.step(5);
    const g = E.list.find(e => e.enemy && e.opts && e.opts.patrol && e.x > 90 * 32);
    g.x = 96 * 32 + 3; g.dir = 1; P.x = g.x + 2; P.y = g.y - 120; P.vy = 200; P.vx = 0; H.set(['jump']);
    for (let i = 0; i < 120; i++) H.step(1);
    H.step(60);
    return { hits, tries, bounced: W.blockAt(96, 11).state, bar: NEXY.Game.bar.slice() };
  });
  expect(r.hits === 0, `pulos comuns acertaram o FINE ${r.hits}/${r.tries} vezes`);
  expect(r.bounced === 'used' && r.bar.includes('FINE'), 'quique no Rastejante pega o FINE');
});

test('quique alto: segurar, apertar antes ou logo depois dão a mesma altura', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, out = {};
    function trial(mode) {
      H.noEnemies(); H.tp(20, 19, 999); H.set([]); H.step(3);
      const cr = Ents.spawn('crawler', { x: 24 * 32, y: 616, opts: {} }); cr.dir = 0;
      P.x = cr.x + 2; P.y = cr.y - P.h - 60; P.vy = 250; P.vx = 0; P.onGround = false; P.jumpedSinceGround = true;
      H.set(mode === 'held' ? ['jump'] : []);
      let st = -1, land = -1, min = 9999, pressed = false;
      for (let f = 0; f < 160; f++) {
        if (mode === 'early' && st < 0 && !pressed && P.y + P.h > cr.y - 14) { H.press('jump'); H.set(['jump']); pressed = true; }
        if (mode === 'early' && pressed && st < 0 && f % 2 === 0) H.set([]);
        H.step(1);
        if (st < 0 && cr.state === 'flat') st = f;
        if (st >= 0 && land < 0 && P.onGround) land = f;
        if (st >= 0) min = Math.min(min, P.y + P.h);
        if (mode === 'late' && st >= 0 && f === st + 6) { H.press('jump'); H.set(['jump']); }
        if (mode === 'late' && st >= 0 && f === st + 8) H.set([]);
        if (mode === 'ground' && land >= 0 && f === land + 1) { H.press('jump'); H.set(['jump']); }
        if (mode === 'ground' && land >= 0 && f === land + 3) H.set([]);
        if (st >= 0 && f > st + 10 && P.onGround && (mode !== 'ground' || f > land + 5)) break;
      }
      return 640 - min;
    }
    for (const m of ['held', 'none', 'early', 'late', 'ground']) out[m] = Math.round(trial(m));
    return out;
  });
  expect(near(r.held, 231, 8), `segurando: ${r.held}`);
  expect(near(r.early, r.held, 3) && near(r.late, r.held, 3), `antes/depois: ${r.early}/${r.late} vs ${r.held}`);
  expect(r.none < 70, `sem apertar: ${r.none}`);
  expect(r.ground < 150, `apertar só depois de pisar no chão não dá quique alto: ${r.ground}`);
});

test('combo: cada pisão seguido sobe mais, mostra "Nx" e não fala', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, said = []; Voice.say = t => said.push(t);
    H.noEnemies(); H.tp(20, 19, 999); H.set(['jump']); H.step(3);
    P.y = 400; P.vy = 100; P.onGround = false; P.jumpedSinceGround = true;
    const heights = [], texts = [];
    for (let k = 0; k < 3; k++) {
      const cr = Ents.spawn('crawler', { x: P.x - 2, y: 616, opts: {} }); cr.dir = 0; cr.x = P.x - 2;
      for (let i = 0; i < 200; i++) { H.step(1); if (cr.state === 'flat') break; }
      texts.push(...NEXY.Ents.list.filter(e => e.type === 'combotext').map(e => e.n));
      let top = 9999; for (let i = 0; i < 300; i++) { H.step(1); top = Math.min(top, P.y + P.h); if (P.vy > 0 && P.y + P.h > 560) break; }
      heights.push(Math.round(640 - top));
    }
    return { heights, texts: [...new Set(texts)], said };
  });
  expect(near(r.heights[0], 231, 10) && near(r.heights[1], 421, 14) && near(r.heights[2], 526, 16), `alturas ${r.heights}`);
  expect(r.texts.includes(1) && r.texts.includes(2) && r.texts.includes(3), `textos ${r.texts}`);
  expect(!r.said.some(t => /one|two|three|extra/i.test(t)), `combo falado: ${r.said}`);
});

/* ---------------- palavras, portas e pedestal ---------------- */
test('portas 1, 2 e 3: certo abre, errado não, encenação da chave', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies(); H.tp(18, 19, 999); H.set([]); H.step(5); H.set(['jump']); H.press('jump'); H.step(40); H.set([]); H.step(40);
    out.hello = G.bar.includes('HELLO');
    H.tp(38, 19, 999); H.step(3); H.press('up'); H.step(1); out.panel = G.state;
    Panel.place(G.bar.indexOf('HELLO')); Panel.confirm(); await H.wait(1800); H.step(90); out.d1 = W.doors.door1.open;
    NEXY.give('IS', 'AM', 'FINE'); H.tp(100, 19, 999); H.step(3); G.openPanel(P.interact);
    Panel.place(G.bar.indexOf('IS')); Panel.place(G.bar.indexOf('FINE')); Panel.confirm(); await H.wait(1300);
    out.d2wrong = !W.doors.door2.open && W.doors.door2.errors === 1;
    Panel.place(G.bar.indexOf('AM')); Panel.place(G.bar.indexOf('FINE')); Panel.confirm(); await H.wait(1800); H.step(90);
    out.d2 = W.doors.door2.open && !G.bar.includes('AM') && !G.bar.includes('FINE');
    NEXY.give('KEY', 'DOOR', 'IS'); H.tp(148, 19, 999); H.step(3); G.openPanel(P.interact);
    Panel.place(G.bar.indexOf('IS')); Panel.place(G.bar.indexOf('DOOR')); Panel.confirm(); await H.wait(1300);
    out.morph = W.doors.door3.morph > 0 && G.state === 'play';
    G.openPanel(P.interact); Panel.place(G.bar.indexOf('IS')); Panel.place(G.bar.indexOf('KEY')); Panel.confirm(); await H.wait(1800); H.step(90);
    out.d3 = W.doors.door3.open;
    return out;
  });
  for (const k of ['hello', 'd1', 'd2wrong', 'd2', 'morph', 'd3']) expect(r[k], `${k} falhou`);
  expect(r.panel === 'panel', '↑ perto da porta abre o painel');
});

test('chave: carapaça chutada ativa o bloco KEY e a cápsula sobe acima da parede', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, E = NEXY.Ents;
    H.wakeSpawns(); H.tp(105, 19, 999); H.set([]); H.step(5);
    const ca = E.list.find(e => e.type === 'casco');
    P.x = ca.x; P.y = ca.y - 80; P.vy = 100; for (let i = 0; i < 60; i++) { H.step(1); if (ca.state !== 'walk') break; }
    const shell = ca.state;
    H.step(30); P.x = ca.x - 30; P.y = ca.y + ca.h - P.h; P.vx = 0; H.set(['right']);
    for (let i = 0; i < 40; i++) { H.step(1); if (ca.state === 'slide') break; }
    H.set([]); for (let i = 0; i < 200; i++) { H.step(1); if (H.block(125, 19) !== 'ready') break; }
    H.step(40);
    const kc = E.list.find(e => e.type === 'capsule' && e.word === 'KEY');
    return { shell, key: H.block(125, 19), capsuleY: kc ? kc.y + 12 : null };
  });
  expect(r.shell === 'shell', 'pisão vira carapaça');
  expect(r.key === 'used', 'bloco KEY ativado');
  expect(r.capsuleY !== null && r.capsuleY < 544, `cápsula acima da parede (y=${r.capsuleY})`);
});

test('pedestal: I AM BIG leva ao fim normal, I AM SMALL ao fim secreto', async ({ browser }) => {
  const out = {};
  for (const which of ['BIG', 'SMALL']) {
    const { ctx, page, errors } = await openGame(browser);
    out[which] = await page.evaluate(async (which) => {
      const P = NEXY.P, G = NEXY.Game;
      NEXY.give('IS', 'ARE', 'DOOR', 'AM', 'BIG', 'SMALL'); H.tp(186, 19, 0); H.set([]); H.step(5);
      G.openPanel(P.interact); Panel.place(G.bar.indexOf('AM')); Panel.place(G.bar.indexOf(which)); Panel.confirm();
      await H.wait(1800); H.step(40);
      const scale = P.scale, kept = G.bar.includes(which);
      if (which === 'BIG') { H.set(['right', 'run']); H.step(10); H.set(['right', 'run', 'jump']); H.press('jump'); H.step(30); H.set(['right', 'run']); }
      else H.set(['right']);
      for (let i = 0; i < 400; i++) { H.step(1); if (G.state !== 'play') break; }
      H.step(200);
      return { scale, kept, exit: G.exit, state: G.state };
    }, which);
    expect(!errors.length, errors.join('; '));
    await ctx.close();
  }
  expect(out.BIG.scale === 2 && out.BIG.exit === 'normal' && out.BIG.state === 'clear', `BIG: ${JSON.stringify(out.BIG)}`);
  expect(out.SMALL.scale === 0.5 && out.SMALL.exit === 'secret', `SMALL: ${JSON.stringify(out.SMALL)}`);
  expect(out.BIG.kept && out.SMALL.kept, 'o pedestal não consome as palavras');
}, { ownPages: true });

test('escada-fantasma segue a barra; #tobe deixa tudo sólido', async ({ browser }) => {
  const { ctx, page } = await openGame(browser);
  const r = await page.evaluate(async () => {
    const W = NEXY.World, G = NEXY.Game, P = NEXY.P;
    const solid = () => [[65, 17], [67, 14], [69, 11]].map(([c, r]) => W.blockAt(c, r).solid);
    const hit = (c, r) => { H.tp(c, r, 999); H.set([]); H.step(5); H.set(['jump']); H.press('jump'); H.step(25); H.set([]); H.step(50); };
    H.noEnemies(); const out = { start: solid() };
    hit(58, 19); hit(61, 19); hit(55, 16); out.all = solid();
    const hop = (fromC, toC) => { H.set([]); H.step(10); P.x = fromC * 32 + 5; P.vx = 0; H.step(2); H.set(['right', 'jump']); H.press('jump');
      for (let i = 0; i < 70; i++) { H.step(1); if (P.cx > toC * 32 + 8) H.set(['jump']); if (i > 5 && P.onGround) break; } H.set([]); H.step(5); return Math.round(P.y + P.h); };
    H.tp(64, 19, 999); out.climb = [hop(64, 65), hop(65, 67), hop(67, 69), hop(69, 71)];
    NEXY.give('FINE'); H.tp(100, 19, 999); H.step(3); G.openPanel(P.interact);
    Panel.place(G.bar.indexOf('AM')); Panel.place(G.bar.indexOf('FINE')); Panel.confirm(); await H.wait(1800); H.step(10);
    out.afterDoor = solid();
    return out;
  });
  await ctx.close();
  const t = await openGame(browser, { hash: '#tobe' });
  const tobe = await t.page.evaluate(() => [[65, 17], [67, 14], [69, 11]].map(([c, r]) => NEXY.World.blockAt(c, r).solid));
  await t.ctx.close();
  expect(r.start.every(s => !s), 'começa vazia');
  expect(r.all.every(Boolean), 'com AM, IS e ARE na barra fica sólida');
  expect(r.climb.join() === '544,448,352,256', `subida ${r.climb}`);
  expect(r.afterDoor.join() === 'false,true,true', `AM gasto na porta esvazia só o degrau AM: ${r.afterDoor}`);
  expect(tobe.every(Boolean), '#tobe deixa todos sólidos');
}, { ownPages: true });

test('combo 2x com os Rastejantes da escada alcança a plataforma alta', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, E = NEXY.Ents;
    H.wakeSpawns(); H.tp(60, 19, 999); H.set([]); H.step(5);
    const [a, b] = E.list.filter(e => e.type === 'crawler' && e.opts && e.opts.patrol && e.x < 80 * 32).sort((p, q) => p.x - q.x);
    a.x = 70 * 32; b.x = 72 * 32; a.dir = b.dir = 0;
    P.x = a.x; P.y = a.y - P.h - 40; P.vy = 200; P.vx = 0; H.set(['jump']);
    for (let i = 0; i < 300; i++) {
      if (a.state === 'flat' && b.state === 'walk') H.set(['jump', P.cx < b.x + 13 ? 'right' : 'left']);
      if (b.state === 'flat') H.set(['jump', P.cx < 72.5 * 32 ? 'right' : 'left']);
      H.step(1);
      if (b.state === 'flat' && P.onGround) return Math.round(P.y + P.h);
    }
    return null;
  });
  expect(r === 256, `pousou em y=${r} (plataforma alta = 256)`);
});

/* ---------------- itens, segredos e vida ---------------- */
test('cristal, reserva, vidro, parede falsa, letra no vidro e morte', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, E = NEXY.Ents, out = {};
    H.noEnemies();
    const grab = () => { const c = E.list.find(e => e.type === 'crystal'); if (c) { P.x = c.x; P.y = c.y; H.step(3); } };
    H.tp(81, 19, 999); H.set(['jump']); H.press('jump'); H.step(25); H.set([]); H.step(60); grab(); out.aura = P.aura;
    H.tp(133, 19, 999); H.set(['jump']); H.press('jump'); H.step(25); H.set([]); H.step(50); grab(); out.reserve = G.reserve;
    P.invuln = 0; P.hurt(); const drop = E.list.find(e => e.type === 'reserve'); out.dropped = !!drop && !P.aura;
    if (drop) for (let i = 0; i < 600; i++) { H.step(1); if (drop.dead) break; }
    out.caught = P.aura;
    H.tp(75, 18, 999); H.set([]); H.step(5); H.set(['spin']); H.press('spin'); H.step(60); H.set([]); H.step(20); out.glass = H.block(75, 19);
    H.tp(169, 19, 999); H.set(['right']); H.step(60); H.set([]); out.fake = W.veils[0].found;
    H.wakeSpawns(); H.tp(108, 19, 999); H.set([]); H.step(5);
    const ca = E.list.find(e => e.type === 'casco'); Ents.types.casco.toShell(ca); H.step(20);
    P.x = ca.x - 26; P.y = ca.y + ca.h - P.h; P.facing = 1; H.set(['run', 'right']);
    for (let i = 0; i < 30; i++) { H.step(1); if (ca.state === 'held') break; }
    NEXY.teleport(138, 19); H.set(['run']); H.step(10); P.facing = 1; P.x = 139 * 32 + 16 - P.w / 2 - 14; H.step(2);
    H.set(['up']); H.step(1); for (let i = 0; i < 60; i++) { H.step(1); if (H.block(139, 14) === 'broken') break; }
    H.set([]); H.step(60); const lt = E.list.find(e => e.type === 'letter' && e.index === 3); if (lt) { P.x = lt.x; P.y = lt.y; H.step(3); }
    out.letterL2 = G.letters[3];
    G.checkpoint = { x: 104 * 32 + 16, y: 640 }; const lives = G.lives;
    H.tp(155, 15, 0); P.aura = false; H.set([]); H.step(200);
    out.death = [lives - G.lives, Math.round(P.x / 32)];
    return out;
  });
  expect(r.aura, 'cristal dá aura');
  expect(r.reserve === 'crystal', 'segundo cristal vai para a reserva');
  expect(r.dropped && r.caught, 'perder a aura solta a reserva e dá para pegar');
  expect(r.glass === 'broken', 'pulo giratório quebra vidro');
  expect(r.fake, 'parede falsa é atravessável e conta como segredo');
  expect(r.letterL2, 'carapaça jogada para cima libera o 2º L');
  expect(r.death[0] === 1 && r.death[1] === 104, `morte no buraco: ${r.death}`);
});

test('correr: segurar anda, soltar e apertar de novo logo em seguida corre', async ({ browser }) => {
  const { ctx, page } = await openGame(browser, { realtime: true });
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const setup = () => page.evaluate(() => { NEXY.Ents.list = NEXY.Ents.list.filter(e => !e.enemy); NEXY.World.spawns.forEach(s => { s.state = 'consumed'; }); NEXY.teleport(3, 19); NEXY.P.vx = 0; });
  const vmax = async ms => { let m = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { m = Math.max(m, await page.evaluate(() => Math.abs(NEXY.P.vx))); await page.waitForTimeout(40); } return Math.round(m); };
  await setup(); await page.keyboard.down('ArrowRight'); const walk = await vmax(800);
  await page.keyboard.up('ArrowRight'); await page.waitForTimeout(120); await page.keyboard.down('ArrowRight'); const run = await vmax(800);
  await page.keyboard.up('ArrowRight'); await page.waitForTimeout(500);
  await setup(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.down('ArrowRight'); const slow = await vmax(700);
  await page.keyboard.up('ArrowRight');
  await ctx.close();
  expect(walk === 140 && run === 230 && slow === 140, `andar ${walk}, correr ${run}, toques lentos ${slow}`);
}, { ownPages: true });

test('index.html está em dia com src/', async () => {
  execFileSync(process.execPath, [path.join(__dirname, '..', 'build.js'), '--check'], { stdio: 'pipe' });
}, { ownPages: true });

/* ---------------- execução ---------------- */
(async () => {
  const filter = process.argv[2];
  const browser = await chromium.launch();
  let fail = 0;
  for (const t of tests) {
    if (filter && !t.name.includes(filter)) continue;
    const t0 = Date.now();
    let page, ctx, errors = [];
    try {
      if (!t.opts.ownPages) ({ ctx, page, errors } = await openGame(browser));
      await t.fn({ page, browser });
      if (errors.length) throw new Error('erros na página: ' + errors.join('; '));
      console.log(`  ✓ ${t.name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    } catch (e) {
      fail++; console.log(`  ✗ ${t.name}\n      ${e.message}`);
    } finally { if (ctx) await ctx.close(); }
  }
  await browser.close();
  console.log(fail ? `\n${fail} teste(s) falharam.` : '\nTodos os testes passaram.');
  process.exit(fail ? 1 : 0);
})();
