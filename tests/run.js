#!/usr/bin/env node
// Testes de regressão: a fase 1-1 (aprovada), a 1-2, o TO BE PALACE e o mapa. Rode com: node tests/run.js  [filtro opcional pelo nome]
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
  await page.evaluate(() => { NEXY.Game.noIntro = true; NEXY.Game.enterLevel('1-1'); NEXY.Game.echoBorn = true; Echo.hidden = false; }); await page.waitForTimeout(100);
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

/* ---------------- 1-1: a chegada e o nascimento do Echo ---------------- */
test('1-1: o Nexy chega sozinho; o HELLO! na porta 1 faz nascer o Echo, e só depois a porta abre', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    out.start = { born: G.echoBorn, hidden: Echo.hidden, pulse: EchoPulse.fire() };
    H.noEnemies(); NEXY.give('HELLO'); H.tp(38, 19, 999); H.step(3);
    G.openPanel(P.interact); Panel.place(G.bar.indexOf('HELLO')); Panel.confirm(); await H.wait(1800);
    out.scene = { birth: Birth.active, state: G.state, door: W.doors.door1.opening };
    let n = 0; while (Birth.active && n++ < 900) Birth.update(1 / 60);
    H.step(120);
    out.after = { born: G.echoBorn, hidden: Echo.hidden, open: W.doors.door1.open, state: G.state, tut: EchoPulse.tutorial, met: NEXY.Save.data.met.echo, secs: +(n / 60).toFixed(1) };
    // morrer depois do nascimento não some com o Echo
    G.respawn(); out.respawn = !Echo.hidden;
    return out;
  });
  expect(!r.start.born && r.start.hidden && !r.start.pulse, `começa sem o Echo (${JSON.stringify(r.start)})`);
  expect(r.scene.birth && r.scene.state === 'cinematic' && !r.scene.door, `a cena começa e a porta espera (${JSON.stringify(r.scene)})`);
  expect(r.after.born && !r.after.hidden && r.after.open && r.after.state === 'play' && r.after.tut && r.after.met, `nasce, a porta abre e o pulso é ensinado (${JSON.stringify(r.after)})`);
  expect(r.respawn, 'o Echo continua depois de morrer');
}, { echo: false });

test('1-1: o pulso do Echo revela o bloco invisível, a parede falsa e a palavra dentro do "?"', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies(); H.tp(45, 19, 999); H.step(60);
    const b = W.blockAt(45, 16), lives = G.lives;
    out.hiddenBefore = b.state === 'hidden' && !(b.ping > 0);
    H.press('ping'); H.step(1); out.ping = b.ping > 0; out.cool = !EchoPulse.fire();
    H.set(['jump']); H.press('jump'); H.step(25); H.set([]); H.step(80);
    const life = NEXY.Ents.list.find(e => e.type === 'life'); if (life) { P.x = life.x; P.y = life.y + life.h - P.h; P.vx = 0; H.step(3); }
    out.life = G.lives - lives; out.secret = G.secrets.has('echo-secret');
    // a parede falsa (sala do 2º L) e a palavra dentro de um "?"
    H.tp(169, 19, 999); H.step(90); H.press('ping'); H.step(1); out.veil = W.veils.some(v => v.ping > 0);
    H.tp(112, 19, 999); H.step(90); H.press('ping'); H.step(1); out.peek = W.blockAt(111, 16).peek > 0;
    return out;
  });
  expect(r.hiddenBefore && r.ping && r.cool, `o pulso marca o bloco invisível (${JSON.stringify(r)})`);
  expect(r.life === 1 && r.secret, `o bloco tem uma vida e conta como segredo (${JSON.stringify(r)})`);
  expect(r.veil && r.peek, `revela a parede falsa e deixa ouvir a palavra do "?" (${JSON.stringify(r)})`);
});

test('1-1: a chegada no feixe de luz termina com o Nexy no chão e no controle', async ({ browser }) => {
  const { ctx, page, errors } = await openGame(browser, { realtime: true });
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  await page.evaluate(() => { NEXY.Save.data.met.prologue = true; NEXY.Game.enterLevel('1-1'); });   // já viu o prólogo: só a chegada
  await page.waitForTimeout(200);
  const mid = await page.evaluate(() => ({ arrival: Arrival.active, state: NEXY.Game.state }));
  await page.waitForTimeout(3500);
  const end = await page.evaluate(() => ({ arrival: Arrival.active, state: NEXY.Game.state, ground: NEXY.P.onGround, hidden: Echo.hidden }));
  await ctx.close();
  expect(!errors.length, errors.join('; '));
  expect(mid.arrival && mid.state === 'cinematic', `a chegada começa (${JSON.stringify(mid)})`);
  expect(!end.arrival && end.state === 'play' && end.ground && end.hidden, `termina no chão, ainda sem o Echo (${JSON.stringify(end)})`);
}, { ownPages: true });

test('1-1 prólogo: letras viram chão; IT IS BIG faz o Rastejante crescer; BIG o deixa maior, SMALL o encolhe e ele foge', async ({ page }) => {
  const r = await page.evaluate(() => {
    const G = NEXY.Game, P = NEXY.P, out = {};
    NEXY.Save.data.met.prologue = false; Voice.enabled = false;
    const foot = P.y + P.h, c0 = Math.floor(P.cx / 32);
    Prologue.start();
    const run = (until, max = 1800) => { let n = 0; while (!until() && n++ < max) Prologue.update(1 / 60); return n < max; };
    out.dark = Prologue.rev(c0) === 0 && G.state === 'cinematic';
    out.toChoice = run(() => Prologue.phase === 'choice');
    out.floor = Prologue.rev(c0) === 1 && Prologue.rev(c0 + 12) === 1 && Prologue.letters.every(l => l.landed >= 0);
    out.landed = Math.round(P.y + P.h) === Math.round(foot);
    out.big = +Prologue.crawler.s.toFixed(1);
    Prologue.key({ code: 'ArrowLeft' }); Prologue.key({ code: 'Enter' });
    out.slotBig = Prologue.slot; run(() => false, 60); out.bigger = +Prologue.crawler.s.toFixed(1);
    out.back = run(() => Prologue.phase === 'choice');
    Prologue.tap(560, 460);   // toque no SMALL
    out.slotSmall = Prologue.slot;
    run(() => Prologue.crawler.gone, 600); out.small = Prologue.crawler.gone;
    out.rule = Prologue.text && Prologue.text.pt;
    out.end = run(() => !Prologue.active);
    out.after = { state: G.state, met: NEXY.Save.data.met.prologue, word: NEXY.Ents.list.some(e => e.type === 'floorword') };
    return out;
  });
  expect(r.dark && r.toChoice, `começa no escuro e chega à escolha (${JSON.stringify(r)})`);
  expect(r.floor && r.landed, `as letras acendem o chão e o Nexy pousa nele (${JSON.stringify(r)})`);
  expect(r.big >= 3 && r.slotBig === 'BIG' && r.bigger > r.big && r.back, `IT IS BIG: gigante; BIG de novo: ainda maior e volta à escolha (${r.big} → ${r.bigger})`);
  expect(r.slotSmall === 'SMALL' && r.small && /pequeno/.test(r.rule || ''), `SMALL: encolhe, foge e a regra aparece (${r.rule})`);
  expect(r.end && r.after.state === 'play' && r.after.met && r.after.word, `termina no controle, lembra que já viu e deixa HELLO no chão (${JSON.stringify(r.after)})`);
}, { echo: false });

test('1-1 prólogo: só na primeira partida; Esc pula tudo e entrega o controle', async ({ browser }) => {
  const { ctx, page, errors } = await openGame(browser, { realtime: true });
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  await page.evaluate(() => { NEXY.Save.data.met.prologue = false; NEXY.Game.enterLevel('1-1'); });
  await page.waitForTimeout(400);
  const first = await page.evaluate(() => ({ pro: Prologue.active, arr: Arrival.active }));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const skipped = await page.evaluate(() => ({ pro: Prologue.active, state: NEXY.Game.state, ground: Math.abs(NEXY.P.y + NEXY.P.h - Prologue.foot) < 1, met: NEXY.Save.data.met.prologue }));
  await page.evaluate(() => NEXY.Game.enterLevel('1-1')); await page.waitForTimeout(400);
  const again = await page.evaluate(() => ({ pro: Prologue.active, arr: Arrival.active }));
  await ctx.close();
  expect(!errors.length, errors.join('; '));
  expect(first.pro && !first.arr, `primeira vez: o prólogo (${JSON.stringify(first)})`);
  expect(!skipped.pro && skipped.state === 'play' && skipped.ground && skipped.met, `Esc: no chão e no controle (${JSON.stringify(skipped)})`);
  expect(!again.pro && again.arr, `depois: só a chegada (${JSON.stringify(again)})`);
}, { ownPages: true });

test('lembranças da lei: placa na escada-fantasma (1-1) e no primeiro altar (1-2) somem quando a lei é usada', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const G = NEXY.Game, P = NEXY.P, out = {};
    out.h11 = (NEXY.World.level.hints || []).some(h => h.until === 'ghost');
    H.noEnemies(); NEXY.give('AM'); H.step(5);
    H.tp(65, 15, 999); H.set([]); H.step(30);   // em cima do degrau AM
    out.ghostDone = !!Hints.done.ghost;
    G.loadLevel('1-2'); G.echoBorn = true; Echo.hidden = false;
    out.h12 = (NEXY.World.level.hints || []).some(h => h.until === 'altar1');
    NEXY.give('IT', 'BIG'); H.tp(21, 29, 999); H.set([]); H.step(5);
    G.openPanel(P.interact); Panel.place(G.bar.indexOf('IT')); Panel.place(G.bar.indexOf('BIG')); Panel.confirm(); await H.wait(1800); H.step(10);
    out.altarDone = !!Hints.done.altar1;
    return out;
  });
  expect(r.h11 && r.ghostDone, `1-1: placa WORDS ARE THE FLOOR some ao pisar no degrau (${JSON.stringify(r)})`);
  expect(r.h12 && r.altarDone, `1-2: placa WHAT YOU SAY IS TRUE some com IT IS BIG (${JSON.stringify(r)})`);
});

test('1-1 segredo: o trem de Rastejantes empurra sem machucar; quando o mural acende, o pisão triplo (pulos de verdade) bate no tijolo lá no alto e cai o WARP CARD; o duplo não alcança', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, E = NEXY.Ents, out = {};
    G.timers = []; Echo.line = null; Echo.lines = [];
    const b = W.blockAt(28, 3); out.hidden = b && b.kind === 'glitch' && b.state === 'hidden';
    H.wakeSpawns(); H.tp(19, 19, 0); H.step(10); out.cars = Conga.cars().length;
    // encostar no trem só empurra
    const c0 = Conga.cars()[0]; P.invuln = 0; P.x = c0.x - P.w - 1; P.y = 20 * 32 - P.h; P.px = P.x; P.py = P.y; P.vx = 120; H.set(['right']); H.step(6); H.set([]);
    out.push = !P.dead && P.invuln <= 0 && P.x + P.w <= c0.x + 1; H.tp(19, 19, 999); H.step(5);
    // pisões seguidos segurando o pulo: o de trás, o do meio, o da frente; depois para o tijolo
    const run = (order) => {
      let n = 0; while (Conga.state(G.simTime).on && n++ < 2000) H.step(1);
      n = 0; while (!Conga.state(G.simTime).on && n++ < 2000) H.step(1);
      let stomps = 0, minHead2 = 1e9; H.set(['jump']); H.press('jump');
      for (let f = 0; f < 600; f++) {
        const tgt = Conga.cars().find(c => c.opts.i === order[stomps]), keys = ['jump'];
        const tx = stomps < order.length && tgt ? tgt.x + tgt.w / 2 : 28 * 32 + 16, dx = tx - P.cx;
        if (dx > 5) keys.push('right'); else if (dx < -5) keys.push('left');
        H.set(keys); H.step(1); if (stomps === 2) minHead2 = Math.min(minHead2, P.y);
        if (P.combo > stomps) stomps = P.combo;
        if (Glitch.active || (P.onGround && f > 10)) break;
      }
      H.set([]); return { stomps, glitch: Glitch.active, minHead2: Math.round(minHead2) };
    };
    out.three = run([2, 1, 0]);
    // no 2º quique a cabeça não chega no tijolo (fundo dele em y = 128); só o 3º
    out.twoMiss = out.three.minHead2 > 4 * 32 + 20;
    out.glitch = out.three.glitch && G.state === 'cinematic';
    let n = 0; while (Glitch.active && n++ < 300) Glitch.update(1 / 60);
    out.used = b.state === 'used' && G.secrets.has('glitch') && G.state === 'play';
    H.set([]); for (let i = 0; i < 240 && !G.card; i++) H.step(1);
    out.card = G.card && !E.list.some(e => e.type === 'card'); out.line = Echo.line && Echo.line.en;
    return out;
  });
  expect(r.hidden && r.cars === 3 && r.push, `o trem: 3 Rastejantes que só empurram (${JSON.stringify(r)})`);
  expect(r.twoMiss, `o 2º quique não alcança o tijolo (${JSON.stringify(r.three)})`);
  expect(r.three.stomps === 3 && r.glitch && r.used, `o pisão triplo bate no tijolo e a tela "dá erro" (${JSON.stringify(r)})`);
  expect(r.card && r.line === 'What is it?', `o cartão cai e o Nexy pega (${JSON.stringify(r)})`);
});

test('1-1 cartão dourado: terminar com pontuação máxima (sem precisar do segredo do cartão) dá o GOLD CARD; daí em diante a 1-1 começa com o cartão', async ({ page }) => {
  const r = await page.evaluate(() => {
    const G = NEXY.Game, W = NEXY.World, S = NEXY.Save.data, out = {};
    S.goldCard = false;
    const fill = () => { const T = W.totals; T.wordList.forEach(w => G.wordsSeen.add(w)); G.letters = G.letters.map(() => true); T.creatureList.forEach(c => G.creatures.add(c));
      let k = 0; while (G.secrets.size < T.secrets - 1) G.secrets.add('s' + k++); };
    fill(); G.wordsSeen.delete('HELLO'); out.notYet = G.perfectRun();
    fill(); out.perfect = G.perfectRun();
    G.finish('normal', 0); out.gold = S.goldCard && G.goldNew;
    G.loadLevel('1-1'); out.card = G.card;
    S.goldCard = false; G.loadLevel('1-1'); out.noCard = !G.card;
    return out;
  });
  expect(!r.notYet && r.perfect, `pontuação máxima = tudo menos o cartão (${JSON.stringify(r)})`);
  expect(r.gold && r.card && r.noCard, `o cartão dourado fica salvo e a fase começa com ele (${JSON.stringify(r)})`);
});

test('1-1 TO BE ENGINE: sem cartão não liga; as 7 ligações (errar não zera: a errada volta no fim); escalada dá o tiro; teletransporte com vidas cheias', async ({ page }) => {
  const s1 = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game; H.noEnemies(); NEXY.Save.data.shot.best = -1; EchoShot.reset();
    NEXY.give('IS', 'ARE', 'IS', 'KEY'); H.tp(136, 19, 999); H.step(5);
    const d = P.interact; G.openPanel(d); H.step(2);
    const out = { kind: d && d.kind, noCard: G.state === 'play', line: Echo.line && Echo.line.en };
    G.card = true; G.openPanel(P.interact); out.open = G.state === 'engine' && $('chest').classList.contains('on');
    Engine.act('wire');
    return out;
  });
  const plug = right => page.evaluate(right => { const r = ENGINE.table[Engine.st.order[Engine.st.streak]]; const v = right ? r.v : ['AM', 'IS', 'ARE'].find(x => x !== r.v); Engine.plug(v, document.querySelector(`#chest [data-v="${v}"]`)); }, right);
  await plug(true); await page.waitForTimeout(800); await plug(true); await page.waitForTimeout(800);
  const before = await page.evaluate(() => Engine.st.streak);
  await plug(false); await page.waitForTimeout(2300);
  const after = await page.evaluate(() => ({ streak: Engine.st.streak, wired: Engine.d.wired, step: Engine.st.step }));
  for (let i = 0; i < 7 && !(await page.evaluate(() => Engine.st.step === 'online')); i++) { await plug(true); await page.waitForTimeout(800); }
  const online = await page.evaluate(() => ({ step: Engine.st.step, online: Engine.d.online, best: NEXY.Save.data.shot.best }));
  await page.evaluate(() => { Engine.act('climb'); const r = ENGINE.climb[0]; Engine.answer(r.answer, document.querySelectorAll('#chest .copt')[r.answer]); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { Engine.act('up'); const r = ENGINE.climb[1], w = (r.answer + 1) % 3; Engine.answer(w, document.querySelectorAll('#chest .copt')[w]); });
  await page.waitForTimeout(200);
  const done = await page.evaluate(() => { Engine.act('up'); return { step: Engine.st.step, tier: Engine.st.tier, best: NEXY.Save.data.shot.best }; });
  const warp = await page.evaluate(() => {
    const G = NEXY.Game, P = NEXY.P; G.lives = 2;
    Engine.act('warp'); const a = Warp.active, fuel = G.bar.join(' ');
    let n = 0; while (Warp.active && n++ < 400) Warp.update(1 / 60);
    H.step(30);
    return { a, fuel, col: Math.floor(P.cx / 32), lives: G.lives, state: G.state, cp: G.checkpoint && Math.floor(G.checkpoint.x / 32), charges: EchoShot.charges };
  });
  expect(s1.kind === 'engine' && s1.noCard && s1.line === 'What is it?', `sem cartão: não abre e a Echo comenta (${JSON.stringify(s1)})`);
  expect(s1.open, 'com cartão: abre a tela da máquina');
  expect(before === 2 && after.streak === 2 && after.wired === 2 && after.step === 'wire', `uma errada não zera (a errada volta no fim) (${before} → ${JSON.stringify(after)})`);
  expect(online.step === 'online' && online.online && online.best === 0, `as 7 ligadas: ligada e o tiro básico salvo (${JSON.stringify(online)})`);
  expect(done.step === 'done' && done.tier === 1 && done.best === 1, `escalada: 1 acerto e 1 erro = nível 1 (${JSON.stringify(done)})`);
  expect(warp.a && warp.fuel === 'KEY' && warp.col === 181 && warp.lives === 5 && warp.state === 'play' && warp.cp === 181 && warp.charges === 5,
    `teletransporte: IS/ARE viram combustível, praça final, vidas cheias, checkpoint e cargas (${JSON.stringify(warp)})`);
});

test('tiro da Echo: o 1º paralisa (não machuca e vira plataforma), o 2º quebra; recarrega; F, toque e voz (STOP!)', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, E = NEXY.Ents, out = {};
    out.locked = !EchoShot.fire();
    NEXY.Save.data.shot.best = 0; EchoShot.reset(); out.charges0 = EchoShot.charges;
    H.noEnemies();
    // um Rastejante de verdade, na frente do Nexy
    const cr = E.spawn('crawler', { x: 30 * 32, y: 19 * 32 + 8, opts: {} }); cr.dir = 0; H.step(10);
    H.tp(25, 19, 0); P.facing = 1; Echo.reset(); H.step(30);
    out.fired = EchoShot.fire(); for (let i = 0; i < 40; i++) { H.step(1); if (cr.frozen > 0) break; }
    out.frozen = cr.frozen > 0 && cr.plat;
    // encostar no paralisado não machuca
    const lives = G.lives; P.x = cr.x - 4; P.y = cr.y + cr.h - P.h; P.invuln = 0; H.step(5); out.safe = !P.dead && G.lives === lives;
    // pousar em cima: plataforma
    P.x = cr.x + 2; P.y = cr.y - P.h - 30; P.vy = 0; H.step(40); out.stand = P.onGround && Math.abs(P.y + P.h - cr.y) < 1.5;
    // 2º tiro quebra
    H.tp(25, 19, 0); P.facing = 1; Echo.reset(); H.step(30); EchoShot.fire(); for (let i = 0; i < 40; i++) { H.step(1); if (cr.state === 'dying' || cr.dead) break; }
    out.broke = cr.state === 'dying' || cr.dead; out.charges1 = EchoShot.charges;
    // recarga com o tempo
    H.step(Math.round(SHOT[0].every * 60) + 5); out.recharge = EchoShot.charges;
    // F no teclado, botão SHOT no toque
    const c0 = EchoShot.charges; G.onKey({ code: 'KeyF', preventDefault() { } }); out.keyF = EchoShot.charges === c0 - 1;
    const c1 = EchoShot.charges; Input.edge('shot'); H.step(1); out.touch = EchoShot.charges === c1 - 1;
    // voz: segurar V e dizer STOP! (reconhecimento simulado)
    NEXY.Save.data.assist.voice = true; Listen.SR = function () { }; const ls = Listen.start;
    Listen.start = (onResult, onDone) => { onResult(['stop']); onDone(true); return true; };
    EchoShot.refill(); const c2 = EchoShot.charges; G.onKey({ code: 'KeyV', preventDefault() { } }); out.voice = EchoShot.charges === c2 - 1;
    Listen.start = (onResult, onDone) => { onResult(['hello']); onDone(true); return true; };
    G.onKey({ code: 'KeyV', preventDefault() { } }); out.voiceOther = EchoShot.charges === c2 - 1;
    Listen.start = ls;
    return out;
  });
  expect(r.locked, 'sem o poder, F não faz nada');
  expect(r.charges0 === 3 && r.fired && r.frozen, `1º tiro paralisa (${JSON.stringify(r)})`);
  expect(r.safe && r.stand, `paralisado: não machuca e dá para pisar em cima (${JSON.stringify(r)})`);
  expect(r.broke && r.charges1 === 1 && r.recharge === 2, `2º tiro quebra; recarrega com o tempo (${JSON.stringify(r)})`);
  expect(r.keyF && r.touch && r.voice && r.voiceOther, `F, toque e STOP! atiram; outra palavra não (${JSON.stringify(r)})`);
});

/* ================================ FASE 1-2 · WHO ARE YOU? ================================ */
const L12 = { level: '1-2' };
// funções de apoio dentro da página: bater em bloco, usar porta/altar, tentar pulos em vários tempos
const HELP12 = () => {
  const P = NEXY.P, G = NEXY.Game;
  window.H12 = {
    hit(c, r) { H.tp(c, r, 999); H.set([]); H.step(5); H.set(['jump']); H.press('jump'); H.step(25); H.set([]); H.step(50); },
    async panel(c, r, words) { H.tp(c, r, 999); H.set([]); H.step(5); G.openPanel(P.interact); for (const w of words) Panel.place(G.bar.indexOf(w)); Panel.confirm(); await H.wait(1800); H.step(60); },
    // place() posiciona; o jogador anda (vx) e pula; conta em quantos tempos t0 o pulo dá certo
    tryHop(t0s, place, keys, success, opts = {}) {
      const ok = [];
      for (const t0 of t0s) {
        G.simTime = t0; P.dead = false; P.invuln = 999; place(); H.set([]); H.step(1);
        if (opts.until) { let n = 0; while (!opts.until() && n++ < 300) H.step(1); }
        P.vx = !keys.length ? 0 : (keys.includes('left') ? -1 : 1) * (keys.includes('run') ? 230 : 140);
        H.set(keys.concat(['jump'])); H.press('jump');
        for (let i = 0; i < 160; i++) { H.step(1); if (i > 4 && success()) { ok.push(t0); break; } if (P.dead || (i > 10 && P.onGround)) break; }
      }
      return ok.length;
    },
    range(a, b, s) { const r = []; for (let t = a; t < b - 1e-9; t += s) r.push(+t.toFixed(3)); return r; },
    on(e) { return () => { Ents.types[e.type].place(e); P.x = e.x + e.w / 2 - P.w / 2; P.y = e.y - P.h; P.vy = 0; P.vx = 0; P.px = P.x; P.py = P.y; H.step(1); }; },
    edge(c, r, dir, edgeX) { return () => { NEXY.teleport(c, r); H.set([dir]); for (let i = 0; i < 120; i++) { H.step(1); if (dir === 'left' ? P.x < edgeX - 12 : P.x + P.w > edgeX + 12) break; } }; },
  };
};

test('1-2: carrega com WORLD, 2 saídas, 17 palavras (4 do baú) e barra de 10', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(() => ({ T: NEXY.World.totals, max: NEXY.Game.barMax(), lvl: NEXY.World.level.id, word: NEXY.World.level.masterWord, music: Music.variant }));
  expect(r.lvl === '1-2' && r.word === 'WORLD', 'fase e palavra-mestra');
  expect(r.T.letters === 5 && r.T.exits === 2 && r.T.words === 17 && r.T.secrets === 3, `totais ${JSON.stringify(r.T)}`);
  expect(r.T.creatureList.sort().join() === 'CRAWLER,FLYER,SHELL,THIEF', `criaturas ${r.T.creatureList}`);
  expect(r.max === 10, 'barra de 10 palavras');
  expect(r.music === 'nave', 'música da nave');
}, L12);

test('1-2 altar 1: IT IS BIG ergue a runa; do chão se sobe nela e dela na sacada da letra W', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies();
    const ledge = () => P.onGround && Math.round(P.y + P.h) === 768;
    // corre e pula em vários pontos; quando pousa (no chão ou na runa pequena), pula de novo na hora
    const attempts = () => {
      let n = 0;
      for (let thr = 17 * 32; thr < 26 * 32; thr += 6) for (const again of [false, true]) {
        H.tp(14, 29, 999); H.set(['right', 'run']); P.vx = 230; let jumped = 0, best = 0;
        for (let i = 0; i < 160; i++) {
          if (jumped === 0 && P.x + P.w >= thr) { H.set(['right', 'run', 'jump']); H.press('jump'); jumped = 1; }
          else if (jumped === 1 && again && P.onGround && i > 0) { H.press('jump'); jumped = 2; }
          H.step(1); if (ledge()) { best = 1; break; }
        }
        n += best;
      }
      return n;
    };
    out.before = attempts();
    H12.hit(13, 29); H12.hit(18, 29);
    await H12.panel(21, 29, ['IT', 'BIG']); H.step(60);
    out.rune = JSON.stringify(W.targets.rune1.cur);
    // caminho de verdade, sem teletransporte: do altar pula na runa, da runa pula na sacada e pega o W
    H.tp(21, 29, 999); H.set([]); H.step(5);
    H.set(['right']); for (let i = 0; i < 60; i++) { H.step(1); if (P.x + P.w >= 24 * 32 - 6) break; }
    H.set(['right', 'jump']); H.press('jump'); for (let i = 0; i < 60; i++) { H.step(1); if (i > 5 && P.onGround) break; }
    out.onRune = Math.round(P.y + P.h);
    H.set(['right']); for (let i = 0; i < 40; i++) { H.step(1); if (P.x + P.w >= 26 * 32 - 2) break; }
    H.set(['right', 'jump']); H.press('jump'); for (let i = 0; i < 60; i++) { H.step(1); if (i > 5 && P.onGround) break; }
    out.onLedge = Math.round(P.y + P.h);
    H.set(['right']); H.step(40); H.set([]);
    out.W = G.letters[0]; out.kept = G.bar.join();
    return out;
  });
  expect(r.before === 0, `sem a runa a sacada foi alcançada ${r.before} vezes`);
  expect(r.rune === '{"w":2,"h":3}', `runa ${r.rune}`);
  expect(r.onRune === 864 && r.onLedge === 768 && r.W, `do chão para a runa (${r.onRune}) e para a sacada (${r.onLedge}), letra W ${r.W}`);
  expect(r.kept.split(',').sort().join() === 'BIG,IT', `o altar não gasta as palavras (${r.kept})`);
}, L12);

test('1-2 caminhos de verdade: lustre do sino FINE, Alado da letra O e poço de saída da cripta', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, E = NEXY.Ents, out = {};
    H.noEnemies();
    const ch = E.list.find(e => e.type === 'chandelier' && e.c === 161);
    // do degrau para o lustre; do lustre, o sino FINE
    out.stepToChand = H12.tryHop(H12.range(0, 3.2, 0.05), H12.edge(156, 26, 'right', 158 * 32), ['right'], () => P.riding === ch);
    let fine = 0;
    for (const t0 of H12.range(0, 3.2, 0.1)) {
      W.doors.gate.chimes = []; W.doors.gate.busy = false; G.timers = [];
      G.simTime = t0; H12.on(ch)(); H.set([]);
      for (let i = 0; i < 200; i++) {
        const bx = 164 * 32 + 16;
        if (P.riding === ch) { H.set([P.cx < bx - 6 ? 'right' : P.cx > bx + 6 ? 'left' : 'x']); if (Math.abs(P.cx - bx) < 20) { H.set(['jump']); H.press('jump'); } }
        H.step(1); if (W.doors.gate.chimes.includes('FINE')) { fine++; break; } if (P.onGround && !P.riding) break;
      }
    }
    out.fine = fine;
    // letra O: do lustre 3, pisão no Alado de patrulha (sem teletransporte para cima dele)
    H.wakeSpawns(); const c3 = E.list.find(e => e.type === 'chandelier' && e.c === 94);
    let gotO = false;
    for (let tries = 0; tries < 12 && !gotO; tries++) {
      G.simTime = tries * 0.3; H12.on(c3)(); H.step(2);
      const u = E.list.find(e => e.type === 'flyer' && e.opts.path === 'h' && !e.dead) || E.list.find(e => e.type === 'flyer' && e.opts.path === 'h');
      if (!u || u.type !== 'flyer') { H.wakeSpawns(); H.step(5); continue; }
      for (let i = 0; i < 300 && !gotO; i++) {
        const ux = u.x + 13, keys = [];
        if (P.riding === c3 && Math.abs(ux - P.cx) < 40 && u.y > P.y - 140) { keys.push('jump'); H.press('jump'); }
        if (!P.onGround) { keys.push('jump'); if (u.type === 'flyer') keys.push(ux > P.cx + 4 ? 'right' : ux < P.cx - 4 ? 'left' : 'x'); else keys.push(97.5 * 32 > P.cx ? 'right' : 'left'); }
        H.set(keys); H.step(1); if (G.letters[1]) gotO = true; if (P.dead || P.y > 1100) break;
        if (P.onGround && !P.riding && i > 20) break;
      }
      if (P.dead) { P.dead = false; P.invuln = 999; }
      H.noEnemies(); H.wakeSpawns();
    }
    out.O = gotO;
    // caminho alternativo (sem abrir o baú): chão → plataforma do poço → quique no Alado → passagem baixa → câmara da luz
    H.noEnemies();
    out.alt1 = H12.tryHop([0], () => NEXY.teleport(233, 35), [], () => P.onGround && Math.round(P.y + P.h) === 33 * 32);
    const crawl = () => P.onGround && Math.round(P.y + P.h) === 27 * 32 && P.x > 235.5 * 32;
    out.altNoFlyer = H12.tryHop([0], () => NEXY.teleport(233, 32), ['right'], crawl);
    H.wakeSpawns(); NEXY.teleport(233, 32); H.step(10);
    const fl = E.list.find(e => e.type === 'flyer' && Math.abs(e.x - 235 * 32) < 40);
    let up = false;
    if (fl) {
      P.vx = 0; H.set([]); H.step(2);
      for (let i = 0; i < 260 && !up; i++) {
        const keys = ['jump'];
        if (P.combo === 0) { const fx = fl.x + 13; if (P.onGround && Math.abs(P.cx - fx) < 70 && fl.y > P.y - 60) H.press('jump'); if (!P.onGround) keys.push(P.cx < fx - 3 ? 'right' : P.cx > fx + 3 ? 'left' : 'x'); }
        else keys.push('right');
        H.set(keys); H.step(1); if (crawl()) up = true; if (P.dead) break;
      }
    }
    out.altFlyer = up;
    H.set(['right']); H.step(90); H.set([]); out.altChamber = P.x > 240 * 32;
    return out;
  });
  expect(r.stepToChand >= 6, `degrau → lustre: ${r.stepToChand}`);
  expect(r.fine >= 10, `do lustre se toca o FINE: ${r.fine}/32`);
  expect(r.O, 'do lustre se pisa no Alado e se pega a letra O');
  expect(r.alt1 === 1 && r.altNoFlyer === 0 && r.altFlyer && r.altChamber, `caminho alternativo da cripta: ${JSON.stringify(r)}`);
}, L12);

// a cena é dirigida passo a passo: Cine.update no tempo da tela e Game.step quando o jogo está em 'play' (investida)
const CHEST12 = () => {
  window.C12 = {
    open() { const P = NEXY.P, G = NEXY.Game; H.noEnemies(); NEXY.World.setTarget('rune2', 'small'); H.step(40); H.tp(234, 35, 999); H.step(5); G.openPanel(P.interact); return G.state; },
    async through(climb, finalWord = 'STRONG') {
      const G = NEXY.Game, S = Chest.S, st = Chest.st, click = (sel) => { const b = document.querySelector('#chest ' + sel); if (b) b.click(); return !!b; };
      click('[data-a="next"]');                                           // palavras → leitura
      for (let i = 0; i < S.pages.length; i++) click('[data-a="next"]');   // leitura → perguntas
      for (const q of S.questions) { click(`[data-a="opt"][data-i="${(q.answer + 1) % q.options.length}"]`); click(`[data-a="opt"][data-i="${q.answer}"]`); await H.wait(1300); }
      if (climb == null) click('[data-a="skipclimb"]');
      else {
        click('[data-a="climb"]'); click('[data-a="next"]');
        S.climb.rungs.forEach((r, i) => { if (st.step !== 'climb') return; click(`[data-a="rung"][data-i="${i < climb ? r.answer : (r.answer + 1) % r.options.length}"]`); click('#cnext [data-a="up"]'); });
      }
      click(`[data-a="say"][data-w="${finalWord}"]`); await H.wait(1700);
      return { step: st.step, tier: st.tier, cine: Cine.active, state: G.state };
    },
    run(maxSec = 20) {
      const G = NEXY.Game; let n = 0, broke = -1;
      while (Cine.active && n < maxSec * 60) { Cine.update(1 / 60); if (G.state === 'play') G.step(1 / 60); n++; if (broke < 0 && Cine.impactT >= 0) broke = +(Cine.impactT).toFixed(2); }
      return { secs: +(n / 60).toFixed(1), broke };
    },
  };
};

test('1-2 Baú da Memória: palavras, leitura, perguntas, escalada até a Coroa e a cena quebra o muro', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(CHEST12);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    const lives = G.lives; out.open = C12.open();
    out.words = ['DARK', 'LIGHT', 'AFRAID', 'STRONG'].every(w => G.wordsSeen.has(w) && NEXY.Save.data.grimoire.words[w]);
    out.through = await C12.through(4);
    out.run = C12.run();
    out.after = { scale: P.scale, aura: P.aura, lives: G.lives - lives, orbs: G.orbs, wall: W.type(238, 33) === 0 && W.type(239, 35) === 0, x: Math.round(P.x / 32), state: G.state, hud: !Cine.active };
    out.heart = NEXY.Save.data.heart.by['1-2'];
    // reabrir: só a história, para reler
    H.tp(234, 35, 999); H.step(5); G.openPanel(P.interact); out.review = Chest.st.step === 'read' && Chest.st.review; Chest.close();
    return out;
  });
  expect(r.open === 'chest' && r.words, `abre o baú e ensina as 4 palavras (${JSON.stringify(r)})`);
  expect(r.through.tier === 4 && r.through.cine, `escalada completa: Coroa das Palavras (${JSON.stringify(r.through)})`);
  expect(r.run.broke > 0 && r.run.broke < 10.4, `o Nexy gigante quebra o muro na investida (${JSON.stringify(r.run)})`);
  expect(r.after.wall && r.after.scale === 1 && r.after.state === 'play' && r.after.x > 239, `depois da cena: muro aberto, tamanho normal, na câmara (${JSON.stringify(r.after)})`);
  expect(r.after.aura && r.after.lives === 2 && r.after.orbs >= 30 && r.heart === 4, `recompensas do nível 4 (${JSON.stringify(r.after)})`);
  expect(r.review, 'reabrir o baú mostra a história de novo');
}, L12);

test('1-2 Baú da Memória: errar na escalada encerra e guarda o poder; sem escalada o muro também quebra; pular a cena', async ({ browser }) => {
  const out = {};
  for (const [name, climb] of [['fall', 1], ['none', null], ['skip', 0]]) {
    const { ctx, page, errors } = await openGame(browser, L12);
    await page.evaluate(HELP12); await page.evaluate(CHEST12);
    out[name] = await page.evaluate(async ([name, climb]) => {
      const P = NEXY.P, G = NEXY.Game, W = NEXY.World, lives = G.lives;
      C12.open(); const th = await C12.through(climb);
      if (name === 'skip') { for (let i = 0; i < 100; i++) Cine.update(1 / 60); Cine.key({ code: 'Enter' }); } else C12.run();
      return { tier: th.tier, scale: P.scale, aura: P.aura, lives: G.lives - lives, wall: W.type(238, 33) === 0, x: Math.round(P.x / 32), cine: Cine.active };
    }, [name, climb]);
    if (errors.length) out[name].errors = errors;
    await ctx.close();
  }
  expect(out.fall.tier === 1 && out.fall.aura && out.fall.lives === 0 && out.fall.wall, `caiu no degrau 2: Coração Magenta, só o escudo (${JSON.stringify(out.fall)})`);
  expect(out.none.tier === 0 && !out.none.aura && out.none.wall && out.none.scale === 1, `sem escalada: Coração Ciano, o muro quebra (${JSON.stringify(out.none)})`);
  expect(out.skip.wall && !out.skip.cine && out.skip.scale === 1 && out.skip.x > 239, `pular a cena dá o mesmo resultado (${JSON.stringify(out.skip)})`);
  for (const k in out) expect(!out[k].errors, `${k}: ${out[k].errors}`);
}, { ownPages: true });

test('1-2 portas 1 e 2: NEXY abre, YOU mostra o reflexo, YES vira Rastejante, NO I AM NOT abre', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies(); NEXY.give('NEXY', 'YOU');
    await H12.panel(60, 29, ['YOU']); out.mirror = W.doors.door1.mirror > 0 && !W.doors.door1.opening;
    H.step(120); await H12.panel(60, 29, ['NEXY']); H.step(90); out.d1 = W.doors.door1.open; out.bar1 = G.bar.join();
    NEXY.give('YES', 'NO', 'NOT');
    await H12.panel(134, 29, ['YES', 'NOT']); out.form = !!P.form;
    H.set(['jump']); H.press('jump'); H.step(10); out.noJump = Math.round(P.y + P.h) === 960; H.set([]);
    H.step(260); out.back = !P.form && !P.crouch;
    await H12.panel(134, 29, ['NO', 'NOT']); H.step(90); out.d2 = W.doors.door2.open; out.bar2 = G.bar.join();
    return out;
  });
  expect(r.mirror, 'I AM YOU: reflexo na porta, sem abrir');
  expect(r.d1 && r.bar1 === 'YOU', `porta 1 abre e gasta NEXY (${r.bar1})`);
  expect(r.form && r.noJump && r.back, `YES, I AM...: Rastejante por alguns segundos (${JSON.stringify(r)})`);
  expect(r.d2 && r.bar2 === 'YOU,YES', `porta 2 abre com NO, I AM NOT (${r.bar2})`);
}, L12);

test('1-2 lustres: o abismo se atravessa de lustre em lustre', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(() => {
    const P = NEXY.P, E = NEXY.Ents;
    H.noEnemies();
    const ch = E.list.filter(e => e.type === 'chandelier' && e.c < 110).sort((a, b) => a.c - b.c);
    const T = H12.range(0, 3.6, 0.05), on = e => () => P.riding === e;
    const pillar = (minX) => () => P.onGround && !P.riding && Math.round(P.y + P.h) === 864 && P.x > minX;
    return {
      floorToC1: H12.tryHop(T, () => NEXY.teleport(72, 29), ['right'], on(ch[0])),
      C1toC2: H12.tryHop(T, () => { H12.on(ch[0])(); P.x += 20; }, ['right'], on(ch[1])),
      C2toP1: H12.tryHop(T, () => { H12.on(ch[1])(); P.x += 20; }, ['right'], pillar(87 * 32)),
      P1toC3: H12.tryHop(T, () => NEXY.teleport(89, 26), ['right'], on(ch[2])),
      C3toC4: H12.tryHop(T, () => { H12.on(ch[2])(); P.x += 20; }, ['right'], on(ch[3])),
      C4toP2: H12.tryHop(T, () => { H12.on(ch[3])(); P.x += 20; }, ['right'], pillar(100 * 32)),
      P2toFloor: H12.tryHop([0], () => NEXY.teleport(105, 26), ['right', 'run'], () => P.onGround && P.x > 111 * 32),
    };
  });
  for (const k in r) expect(r[k] >= (k === 'P2toFloor' ? 1 : 6), `${k}: só ${r[k]} tempos de 0,05 s dão certo`);
}, L12);

test('1-2 lustres: checkpoint no pilar 1; cair no abismo depois dele volta para o pilar', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, E = NEXY.Ents, out = {};
    H.noEnemies();
    const cp = E.list.find(e => e.type === 'checkpoint' && e.c === 88);
    out.exists = !!cp && cp.r === 26;
    // chega no pilar pulando do 2º lustre, de verdade
    const ch = E.list.filter(e => e.type === 'chandelier' && e.c < 110).sort((a, b) => a.c - b.c);
    const pillar = () => P.onGround && !P.riding && Math.round(P.y + P.h) === 864 && P.x > 87 * 32;
    out.active0 = !!cp && cp.active;
    for (const t0 of H12.range(0, 3.6, 0.05)) if (H12.tryHop([t0], () => { H12.on(ch[1])(); P.x += 20; }, ['right'], pillar)) break;
    H.set([]); H.step(5);
    out.onPillar = pillar(); out.active = !!cp && cp.active;
    out.cp = G.checkpoint && [Math.floor(G.checkpoint.x / 32), Math.round(G.checkpoint.y)];
    // cai no abismo entre os lustres
    const lives = G.lives; P.invuln = 0; H.tp(95, 30, 0); H.set([]); H.step(240);
    out.death = [lives - G.lives, Math.floor((P.x + P.w / 2) / 32), Math.round(P.y + P.h)];
    return out;
  });
  expect(r.exists && !r.active0, 'checkpoint em c88, em cima do pilar 1, apagado no começo');
  expect(r.onPillar && r.active, `pular no pilar ativa o checkpoint (no pilar ${r.onPillar}, ativo ${r.active})`);
  expect(r.cp && r.cp[0] === 88 && r.cp[1] === 864, `checkpoint guardado no pilar: ${r.cp}`);
  expect(r.death[0] === 1 && r.death[1] === 88 && r.death[2] === 864, `morte no abismo volta ao pilar: ${r.death}`);
}, L12);

test('plataformas compridas aparecem inteiras, mesmo passando de um bloco de 16 colunas para o outro', async ({ page }) => {
  const r = await page.evaluate(() => {
    const W = NEXY.World, G = NEXY.Game, out = {};
    for (const id of ['1-1', '1-2']) {
      G.loadLevel(id);
      const missing = [];
      for (let r = 0; r < W.h; r++) for (let c = 0; c < W.w; c++) {
        if (W.type(c, r) !== 2) continue;   // T.PLATFORM
        const ci = Math.floor(c / W.CHUNK), s = W.chunk(ci), k = s.c.width / (W.CHUNK * 32);
        const px = Math.floor((c * 32 - ci * W.CHUNK * 32 + 16) * k), py = Math.floor((r * 32 + 7) * k);
        if (s.c.getContext('2d').getImageData(px, py, 1, 1).data[3] < 200) missing.push(c + ',' + r);
      }
      out[id] = missing;
    }
    return out;
  });
  expect(!r['1-1'].length && !r['1-2'].length, `plataforma invisível em: 1-1 ${r['1-1'].join(' ')} · 1-2 ${r['1-2'].slice(0, 12).join(' ')}`);
});

test('1-2 ponte de Alados: 3 pisões seguidos levam à vida escondida, 2 não bastam', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, E = NEXY.Ents;
    const run = (n) => {
      H.wakeSpawns(); H.tp(104, 26, 999); H.set([]); H.step(10);
      const fl = E.list.filter(e => e.type === 'flyer' && e.x > 106 * 32 && e.x < 113 * 32).sort((a, b) => a.x - b.x);
      const lives = G.lives; let target = 0, minFeet = 9999;
      P.x = fl[0].x; P.y = fl[0].y - P.h - 30; P.vy = 100; P.vx = 0;
      for (let i = 0; i < 400; i++) {
        while (target < n && fl[target].type !== 'flyer') target++;
        const keys = ['jump'];
        if (target < n) { const tx = fl[target].x + fl[target].w / 2; if (P.cx < tx - 4) keys.push('right'); else if (P.cx > tx + 4) keys.push('left'); }
        else if (P.cx < 110.5 * 32) keys.push('right');
        H.set(keys); H.step(1); minFeet = Math.min(minFeet, P.y + P.h);
        if (P.onGround && i > 10) break;
      }
      return { combo: P.combo, minFeet: Math.round(minFeet), life: G.lives - lives, n: fl.length };
    };
    return { three: run(3), two: run(2) };
  });
  expect(r.three.n === 3, 'três Alados na ponte');
  expect(r.three.life === 1 && r.three.minFeet < 416, `3x: alcança a sacada (y=416) e pega a vida ${JSON.stringify(r.three)}`);
  expect(r.two.minFeet > 416, `2x não alcança (${r.two.minFeet})`);
}, L12);

test('1-2 sinos: ordem errada zera; I AM FINE de primeira abre o portão e dá vida', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(() => {
    const P = NEXY.P, W = NEXY.World, E = NEXY.Ents, out = {};
    H.noEnemies();
    const bell = c => E.list.find(e => e.type === 'bell' && e.c === c);
    const ring = c => { const b = bell(c); P.x = b.x + 4; P.y = b.y + 4; P.vy = 0; H.step(2); P.x = b.x - 90; P.y = 30 * 32 - P.h; H.step(2); };
    // sino AM: do chão não toca; do degrau, sim
    let fromFloor = 0;
    for (const c of [154, 155, 158]) for (const run of [[], ['run']]) fromFloor += H12.tryHop([0], () => NEXY.teleport(c, 29), [c < 156 ? 'right' : 'left', ...run], () => W.doors.gate.chimes.includes('AM'));
    const clean = () => { const d = W.doors.gate; d.chimes = []; d.solved = null; d.busy = false; d.errors = 0; NEXY.Game.timers = []; };
    out.fromFloor = fromFloor; clean();
    out.fromStep = H12.tryHop([0], () => NEXY.teleport(156, 26), ['right'], () => W.doors.gate.chimes.includes('AM'));
    clean();
    H.tp(146, 29, 999);
    ring(148); ring(148); out.double = W.doors.gate.chimes.join();
    ring(152); ring(164); H.step(60); out.wrong = W.doors.gate.chimes.join(); H.step(120); out.reset = W.doors.gate.chimes.length; out.err = W.doors.gate.errors;
    W.doors.gate.errors = 0; const lives = NEXY.Game.lives;
    ring(148); ring(156); ring(164); H.step(160);
    const life = E.list.find(e => e.type === 'life' && e.x > 160 * 32 && e.x < 170 * 32);
    out.open = W.doors.gate.opening > 0;
    if (life) { for (let i = 0; i < 200 && life.fall; i++) H.step(1); P.vx = 0; P.x = life.x; P.y = life.y + life.h - P.h; H.step(3); }
    out.life = NEXY.Game.lives - lives;
    return out;
  });
  expect(r.fromFloor === 0 && r.fromStep === 1, `sino AM: do chão ${r.fromFloor}, do degrau ${r.fromStep}`);
  expect(r.double === 'I', `o mesmo sino duas vezes não conta (${r.double})`);
  expect(r.wrong === 'I,ARE,FINE' && r.reset === 0 && r.err === 1, `ordem errada zera (${JSON.stringify(r)})`);
  expect(r.open && r.life === 1, `de primeira: abre e cai uma vida (${JSON.stringify(r)})`);
}, L12);

test('1-2 tubos do órgão levam ao SMALL; Alados levam às letras O e L', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, E = NEXY.Ents, out = {};
    H.noEnemies();
    const pipes = E.list.filter(e => e.type === 'pipe').sort((a, b) => a.c - b.c);
    const T = H12.range(0, 2.4, 0.05);
    out.floorToPipe = H12.tryHop(T, () => NEXY.teleport(183, 29), ['right'], () => P.riding === pipes[0]);
    out.pipeToPipe = H12.tryHop(T, H12.on(pipes[0]), ['right'], () => P.riding === pipes[1]);
    out.pipeToFloor = H12.tryHop(T, H12.on(pipes[1]), ['right'], () => P.onGround && !P.riding && P.x > 193 * 32);
    // SMALL: só do alto do tubo 2
    let small = false;
    for (const t0 of [0, 0.6, 1.2, 1.8]) {
      G.simTime = t0; H.noEnemies(); H12.on(pipes[1])(); H.set([]);
      for (let i = 0; i < 200; i++) { if (P.riding === pipes[1] && pipes[1].k > 0.97) { H.set(['jump']); H.press('jump'); } H.step(1); if (W.blockAt(189, 20).state !== 'ready') break; }
      if (W.blockAt(189, 20).state !== 'ready') { small = true; break; }
    }
    out.small = small; H.set([]); H.step(60); out.bar = G.bar.join();
    // letras: pisão segurando o pulo nos Alados
    const stompFlyer = (find, idx) => {
      H.wakeSpawns(); H.tp(find.c, find.r, 999); P.y -= 200; H.step(3);
      const f = E.list.find(e => e.type === 'flyer' && Math.abs(e.x + 13 - (find.fc * 32 + 16)) < find.tol);
      if (!f) return 'sem alado';
      P.x = f.x + 2; P.y = f.y - P.h - 20; P.vy = 100; P.vx = 0; H.set(['jump']);
      for (let i = 0; i < 100; i++) { H.step(1); if (G.letters[idx]) break; }
      H.set([]); return G.letters[idx];
    };
    out.O = stompFlyer({ c: 97, r: 26, fc: 96, tol: 120 }, 1);
    out.L = stompFlyer({ c: 194, r: 29, fc: 191, tol: 40 }, 3);
    return out;
  });
  expect(r.floorToPipe >= 6 && r.pipeToPipe >= 6 && r.pipeToFloor >= 6, `tubos: ${JSON.stringify(r)}`);
  expect(r.small && r.bar === 'SMALL', `SMALL do alto do tubo (${r.bar})`);
  expect(r.O === true && r.L === true, `letras O e L (${r.O}, ${r.L})`);
}, L12);

test('1-2 ladrão: rouba a última palavra, o pisão devolve e, se ele fugir, a palavra volta ao bloco', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, E = NEXY.Ents, out = {};
    H.noEnemies(); H12.hit(175, 29); H12.hit(178, 29); H12.hit(196, 29); out.bar = G.bar.join();
    const enter = () => { H.wakeSpawns(); H.tp(194, 29, 999); H.set(['right']); let th; for (let i = 0; i < 300; i++) { H.step(1); th = E.list.find(e => e.type === 'thief' && !e.dead); if (th && th.word) break; } H.set([]); return th; };
    let th = enter(); if (!th) return out; out.stole = th && th.word; out.after = G.bar.join(); out.hurt = P.invuln < 900 ? 'hurt' : 'ok';
    // pisão
    P.x = th.x; P.y = th.y - P.h - 40; P.vy = 200; P.vx = 0; H.set(['jump']);
    for (let i = 0; i < 40; i++) { H.step(1); if (th.state === 'flat') break; } H.set([]);
    for (let i = 0; i < 120; i++) H.step(1);
    out.back = G.bar.join(); out.flat = th.state === 'flat' || th.dead;
    // na segunda vez, ele foge até o buraco: a palavra volta ao bloco
    th = enter(); out.again = !!th;
    if (th) { out.stole2 = th.word; H.tp(181, 29, 999); for (let i = 0; i < 400 && !th.dead; i++) H.step(1); out.escaped = th.escaped; out.block = H.block(196, 26); }
    return out;
  });
  expect(r.bar === 'THEY,ARE,WE', `palavras ${r.bar}`);
  expect(r.stole === 'WE' && r.after === 'THEY,ARE' && r.hurt === 'ok', `roubou a última, sem machucar (${JSON.stringify(r)})`);
  expect(r.flat && r.back === 'THEY,ARE,WE', `pisão devolve (${r.back})`);
  expect(r.again === false || (r.stole2 && r.escaped && r.block === 'ready'), `fuga devolve ao bloco (${JSON.stringify(r)})`);
}, L12);

test('1-2 cripta: gigantes fecham o túnel; THEY ARE SMALL e IT IS SMALL abrem; IT ARE SMALL só confunde; R e a Lua', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, E = NEXY.Ents, out = {};
    H.noEnemies();
    out.dark = W.zoneAt(220 * 32, 34 * 32) && W.zoneAt(220 * 32, 34 * 32).dark > 0;
    H.tp(216, 35, 999); H.set(['right']); H.step(90); H.set([]); out.blocked = Math.round(P.x / 32);
    // letra R: do chão não alcança
    let reach = 0; for (const c of [218, 225]) reach += H12.tryHop([0], () => NEXY.teleport(c, 35), [c < 221 ? 'right' : 'left'], () => G.letters[2]);
    out.reachR = reach;
    NEXY.give('IT', 'IS', 'THEY', 'ARE', 'SMALL', 'BIG');
    const conf = []; const oc = W.confuse.bind(W); W.confuse = id => { conf.push(id); oc(id); };
    await H12.panel(215, 35, ['IT', 'ARE', 'SMALL']); out.confused = conf.join() === 'rune2' && W.targets.rune2.state === 'big';
    await H12.panel(215, 35, ['THEY', 'ARE', 'SMALL']); H.step(60);
    const cr = E.list.filter(e => e.wasGiant && e.type === 'crawler'); out.crawlers = cr.length;
    // quique num Rastejante (ex-gigante) debaixo do nicho: letra R
    const c0 = cr[0]; c0.x = 221 * 32 + 3; c0.dir = 0; P.x = c0.x; P.y = c0.y - P.h - 40; P.vy = 200; P.vx = 0; H.set(['jump']);
    for (let i = 0; i < 90; i++) { H.step(1); if (G.letters[2]) break; } H.set([]); out.R = G.letters[2];
    await H12.panel(215, 35, ['IT', 'IS', 'SMALL']); H.step(60); out.stone = W.targets.rune2.state;
    H.tp(226, 35, 999); P.dead = false; H.set(['right']); H.step(45); H.set(['right', 'jump']); H.press('jump'); H.step(100); H.set([]); out.passed = Math.round(P.x / 32);
    const lives = G.lives; H.tp(241, 35, 999); H.set(['right']); H.step(150); H.set([]);
    out.moon = G.lives - lives; out.secret = G.secrets.size;
    return out;
  });
  expect(r.dark, 'a cripta é escura');
  expect(r.blocked <= 218, `os gigantes fecham o túnel (parou na coluna ${r.blocked})`);
  expect(r.reachR === 0, 'a letra R não se alcança do chão');
  expect(r.confused, 'IT ARE SMALL: a pedra treme e nada muda');
  expect(r.crawlers === 3 && r.R, `THEY ARE SMALL: 3 Rastejantes; quique dá a letra R (${JSON.stringify(r)})`);
  expect(r.stone === 'small' && r.passed >= 234, `IT IS SMALL: a pedra encolhe e o túnel abre (${r.passed})`);
  expect(r.moon === 3 && r.secret >= 1, `parede falsa e a Lua com 3 vidas (${r.moon})`);
}, L12);

test('1-2 cripta: frase certa que não abre o caminho faz a Echo apontar o que bloqueia (sem parecer travado)', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(async () => {
    const out = [];
    H.noEnemies();
    NEXY.give('IT', 'IS', 'THEY', 'ARE', 'SMALL', 'BIG', 'YOU', 'WE');
    const say = async words => { Echo.line = null; Echo.lines = []; await H12.panel(215, 35, words); H.step(40); out.push(Echo.line ? Echo.line.en : '-'); };
    await say(['YOU', 'ARE', 'BIG']);      // os gigantes ainda fecham: só o problema
    await say(['WE', 'ARE', 'SMALL']);     // de novo: já com a frase
    await say(['THEY', 'ARE', 'SMALL']);   // gigantes resolvidos: agora aponta a pedra
    H.step(120);
    await say(['YOU', 'ARE', 'BIG']);      // a pedra de novo: já com a frase
    await say(['IT', 'IS', 'SMALL']);      // caminho aberto: sem dica
    H.step(120);
    await say(['YOU', 'ARE', 'BIG']);      // continua aberto: sem dica
    return { out, state: NEXY.Game.state };
  });
  expect(r.out.join(' | ') === 'They are big. | Make them small! | It is big. | Make it small! | - | -', `dicas: ${r.out.join(' | ')}`);
  expect(r.state === 'play', 'o jogo segue normal');
}, L12);

test('1-2 cripta: IT IS SMALL primeiro não tira os gigantes; a Echo avisa, e também quando o Nexy empurra os gigantes', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, out = {};
    H.noEnemies();
    NEXY.give('IT', 'IS', 'THEY', 'ARE', 'SMALL', 'BIG', 'YOU', 'WE');
    Echo.line = null; Echo.lines = [];
    await H12.panel(215, 35, ['IT', 'IS', 'SMALL']); H.step(40);   // o que o dono fez: a pedra encolhe, os gigantes ficam
    out.afterStone = Echo.line && Echo.line.en;
    Echo.line = null; Echo.lines = []; H.step(400);                  // passa o intervalo da dica
    H.tp(216, 35, 999); H.set(['right']); H.step(90); H.set([]);   // empurra os gigantes
    out.blocked = Math.round(P.x / 32); out.bump = Echo.line && Echo.line.en;
    return out;
  });
  expect(r.afterStone === 'They are big.', `depois de IT IS SMALL a Echo aponta os gigantes (${r.afterStone})`);
  expect(r.blocked <= 218 && r.bump === 'Make them small!', `empurrando os gigantes, a dica com a frase (${r.bump})`);
}, L12);

test('1-2 cripta sem o SMALL (e sem THEY/IS): o poço de palavras depois do altar dá o que falta, e a Echo aponta para ele', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(async () => {
    const G = NEXY.Game, W = NEXY.World, out = { got: [] };
    H.noEnemies();
    G.bar.length = 0; NEXY.give('IT', 'BIG', 'YOU', 'YES', 'ARE', 'WE');   // como chegou o jogador que travou: sem THEY, SMALL e IS
    Echo.line = null; Echo.lines = [];
    await H12.panel(215, 35, ['YOU', 'ARE', 'BIG']); H.step(40); out.n1 = Echo.line && Echo.line.en;
    Echo.line = null; Echo.lines = [];
    await H12.panel(215, 35, ['YOU', 'ARE', 'BIG']); H.step(40); out.n2 = Echo.line && Echo.line.en;
    for (let k = 0; k < 5; k++) { const before = G.bar.slice(); H12.hit(217, 35); out.got.push(G.bar.filter(w => !before.includes(w)).join() || '-'); }
    await H12.panel(215, 35, ['THEY', 'ARE', 'SMALL']); H.step(60);
    await H12.panel(215, 35, ['IT', 'IS', 'SMALL']); H.step(90);
    out.giants = NEXY.Ents.list.filter(e => e.type === 'giant' && !e.dead).length; out.stone = W.targets.rune2.state;
    return out;
  });
  expect(r.n1 === 'They are big.' && r.n2 === 'Something is here!', `a Echo: problema, depois o poço (${r.n1} / ${r.n2})`);
  expect(r.got.join(' ') === 'THEY SMALL IS - -', `cada batida dá a que falta (${r.got.join(' ')})`);
  expect(r.giants === 0 && r.stone === 'small', `com as palavras do poço os gigantes e a pedra encolhem (${r.giants}, ${r.stone})`);
}, L12);

test('1-2 campanário: tubos, sacada, lustre e telhado; atalho-fantasma com IS e ARE', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(() => {
    const P = NEXY.P, W = NEXY.World, E = NEXY.Ents;
    H.noEnemies();
    const pipes = E.list.filter(e => e.type === 'pipe' && e.c > 250).sort((a, b) => a.c - b.c);
    const ch = E.list.find(e => e.type === 'chandelier' && e.c === 263);
    const T = H12.range(0, 2.4, 0.05), feet = (y, x0, x1) => () => P.onGround && Math.round(P.y + P.h) === y && P.cx > x0 && P.cx < x1;
    const out = {
      floorToPipe1: H12.tryHop(T, () => NEXY.teleport(250, 29), ['right'], () => P.riding === pipes[0]),
      pipe1to2: H12.tryHop(T, H12.on(pipes[0]), ['right'], () => P.riding === pipes[1]),
      pipe2to3: H12.tryHop(T, H12.on(pipes[1]), ['right'], () => P.riding === pipes[2]),
      pipe3toLedge: H12.tryHop([0, 0.6, 1.2], H12.on(pipes[2]), ['right'], feet(672, 262.5 * 32, 271 * 32), { until: () => pipes[2].k > 0.9 && P.riding === pipes[2] }),
      ledgeTo18: H12.tryHop([0], H12.edge(266, 20, 'left', 263 * 32), ['left'], feet(576, 258.5 * 32, 262.5 * 32)),
      p18to15: H12.tryHop([0], H12.edge(260, 17, 'left', 259 * 32), ['left'], feet(480, 254 * 32, 257 * 32)),
      p15toChand: H12.tryHop(H12.range(0, 3.8, 0.05), H12.edge(255, 14, 'right', 257 * 32), ['right'], () => P.riding === ch),
      chandToRoof: H12.tryHop(H12.range(0, 3.8, 0.1), () => { H12.on(ch)(); H.set(['right']); for (let i = 0; i < 60; i++) { H.step(1); if (P.x + P.w > ch.x + ch.w - 4) break; } }, ['right'], () => P.onGround && Math.round(P.y + P.h) <= 384 && !P.riding),
      roofFrom15: H12.tryHop([0], H12.edge(255, 14, 'right', 257 * 32), ['right', 'run'], () => P.onGround && Math.round(P.y + P.h) === 288),
    };
    // atalho-fantasma: sacada → IS → ARE → plataforma alta (pula o lustre)
    out.ghostOff = H12.tryHop([0], H12.edge(268, 20, 'right', 271 * 32), ['right'], feet(576, 272 * 32, 275 * 32));
    NEXY.give('IS', 'ARE'); H.step(3);
    out.ghost = W.blockAt(273, 18).solid && W.blockAt(271, 15).solid;
    out.ledgeToIS = H12.tryHop([0], H12.edge(268, 20, 'right', 271 * 32), ['right'], feet(576, 272 * 32, 275 * 32));
    out.IStoARE = H12.tryHop([0], H12.edge(273, 17, 'left', 273 * 32), ['left'], feet(480, 270 * 32, 273 * 32));
    out.AREto12 = H12.tryHop([0], () => NEXY.teleport(271, 14), [], feet(384, 269 * 32, 274 * 32));
    return out;
  });
  for (const k of ['floorToPipe1', 'pipe1to2', 'pipe2to3', 'p15toChand']) expect(r[k] >= 6, `${k}: ${r[k]}`);
  for (const k of ['pipe3toLedge', 'ledgeTo18', 'p18to15', 'chandToRoof', 'ledgeToIS', 'IStoARE', 'AREto12']) expect(r[k] >= 1, `${k}: ${r[k]}`);
  expect(r.roofFrom15 === 0, 'sem o lustre não se chega ao telhado');
  expect(r.ghostOff === 0 && r.ghost, 'o atalho só existe com IS e ARE na barra');
}, L12);

test('1-2 altar 3: IT IS BIG faz a ponte do fim normal; YOU ARE BIG leva ao fim secreto', async ({ browser }) => {
  const out = {};
  for (const which of ['normal', 'secret', 'none']) {
    const { ctx, page, errors } = await openGame(browser, L12);
    out[which] = await page.evaluate(async (which) => {
      const P = NEXY.P, G = NEXY.Game, W = NEXY.World, E = NEXY.Ents, o = {};
      H.noEnemies(); NEXY.give('IT', 'IS', 'YOU', 'ARE', 'BIG');
      H.tp(254, 8, 999); H.step(5);
      if (which !== 'none') { G.openPanel(P.interact); for (const w of which === 'normal' ? ['IT', 'IS'] : ['YOU', 'ARE']) Panel.place(G.bar.indexOf(w)); Panel.confirm(); await H.wait(1800); H.step(80); }
      if (which === 'secret') {
        const ride = E.list.find(e => e.type === 'echoride'); o.hidden = NEXY.Game && Echo.hidden;
        H.set(['right']); for (let i = 0; i < 120; i++) { H.step(1); if (P.cx > ride.x + 20) break; }
        P.vx = 0; H.set(['jump']); H.press('jump'); for (let i = 0; i < 60; i++) { H.step(1); if (P.riding === ride) break; }
        H.set([]); o.boarded = P.riding === ride;
        for (let i = 0; i < 900; i++) { H.step(1); if (ride.state === 'arrived') break; }
        H.set(['right']);
      } else { H.tp(278, 8, 999); H.set(['right', 'run']); H.step(10); H.set(['right', 'run', 'jump']); H.press('jump'); H.step(20); H.set(['right', 'run']); }
      for (let i = 0; i < 400; i++) { H.step(1); if (G.state !== 'play') break; }
      H.step(200);
      o.exit = G.exit; o.state = G.state;
      return o;
    }, which);
    expect(!errors.length, errors.join('; '));
    await ctx.close();
  }
  expect(out.normal.exit === 'normal' && out.normal.state === 'clear', `normal: ${JSON.stringify(out.normal)}`);
  expect(out.secret.hidden && out.secret.boarded && out.secret.exit === 'secret', `secreto: ${JSON.stringify(out.secret)}`);
  expect(!out.none.exit, 'sem ponte nem Echo não se chega a nenhum fim');
}, { ownPages: true });

test('1-2 palavras: as 13 cabem na barra e as necessárias chegam ao último altar', async ({ page }) => {
  await page.evaluate(HELP12);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, max = [];
    H.noEnemies();
    const hit = (c, r) => { H12.hit(c, r); max.push(G.bar.length); };
    hit(13, 29); hit(18, 29); await H12.panel(21, 29, ['IT', 'BIG']);
    hit(45, 29); hit(49, 29); await H12.panel(60, 29, ['NEXY']);
    hit(116, 29); hit(120, 29); hit(124, 29); await H12.panel(134, 29, ['NO', 'NOT']);
    hit(175, 29); hit(178, 29); hit(181, 29); G.collectWord('SMALL', { x: P.x, y: P.y }); hit(196, 29);
    await H12.panel(215, 35, ['THEY', 'ARE', 'SMALL']); await H12.panel(215, 35, ['IT', 'IS', 'SMALL']);
    hit(242, 32); await H12.panel(246, 29, ['YES']); hit(255, 14);
    return { bar: G.bar.join(), seen: G.wordsSeen.size, max: Math.max(...max), door3: W.doors.door3.opening > 0 };
  });
  expect(r.seen === 13, `viu ${r.seen} de 13 palavras (${r.bar})`);
  expect(r.max <= 10 && r.door3, `barra ${r.max}/10, porta 3 aberta`);
  for (const w of ['IT', 'IS', 'YOU', 'ARE', 'BIG']) expect(r.bar.split(',').includes(w), `${w} chega ao último altar (${r.bar})`);
}, L12);

test('mapa: sair da 1-1 abre o caminho da 1-2, e a íris leva para dentro da fase', async ({ browser }) => {
  const { ctx, page, errors } = await openGame(browser, { realtime: true });
  await page.evaluate(() => { NEXY.Save.data.exits = { '1-1': { normal: true } }; NEXY.Save.data.map = { at: '1-1', revealed: {} }; });
  await page.keyboard.press('Enter'); await page.waitForTimeout(2200);
  const revealed = await page.evaluate(() => !!NEXY.Save.data.map.revealed['1-1>1-2']);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(150); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(1600);
  const at = await page.evaluate(() => WorldMap.at);
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  const mid = await page.evaluate(() => ({ active: Transition.active, where: NEXY.Game.where }));
  await page.waitForTimeout(2200);
  const end = await page.evaluate(() => ({ where: NEXY.Game.where, state: NEXY.Game.state, lvl: NEXY.World.level.id, active: Transition.active }));
  await ctx.close();
  expect(!errors.length, errors.join('; '));
  expect(revealed, 'o caminho 1-1 → 1-2 se revela');
  expect(at === '1-2', `andou até a 1-2 (${at})`);
  expect(mid.active && mid.where === 'map', 'a íris fecha sobre o mapa');
  expect(end.where === 'level' && end.lvl === '1-2' && end.state === 'play' && !end.active, `dentro da 1-2 (${JSON.stringify(end)})`);
}, { ownPages: true });

/* ================================ TO BE PALACE (a saída secreta da 1-1) ================================ */
const LP = { level: 'palace' };
// Alado em várias fases do voo: acorda os spawns, espera n quadros e pula segurando (quique alto)
const HELPP = () => {
  const P = NEXY.P, G = NEXY.Game;
  G.timers = []; NEXY.Save.data.met.echo = true; Echo.line = null; Echo.lines = [];   // sem a apresentação da Echo no meio das dicas
  window.HP = {
    attempt(c, r, keys, success, waits, frames = 220) {
      let ok = 0;
      for (const n of waits) {
        H.wakeSpawns(); P.dead = false; P.pitDeath = false; G.state = 'play'; NEXY.teleport(c, r); P.invuln = 999; H.set([]); H.step(n);
        P.vx = keys.length ? (keys.includes('left') ? -1 : 1) * (keys.includes('run') ? 230 : 140) : 0;
        H.set(keys.concat(['jump'])); H.press('jump');
        for (let i = 0; i < frames; i++) { H.step(1); if (success()) { ok++; break; } if (P.dead) break; }
        H.set([]);
      }
      return ok;
    },
    waits() { const w = []; for (let n = 10; n < 130; n += 6) w.push(n); return w; },
    top(rr, c0, c1) { return () => P.onGround && Math.round(P.y + P.h) === rr * 32 && P.x + P.w / 2 >= c0 * 32 && P.x + P.w / 2 <= (c1 + 1) * 32; },
  };
};

test('palácio: carrega com TOBE, 7 palavras, 4 letras, 1 saída, cavaleiro e Alado, música e fundo próprios', async ({ page }) => {
  const r = await page.evaluate(() => ({ T: NEXY.World.totals, word: NEXY.World.level.masterWord, music: Music.variant, bg: NEXY.World.level.bg,
    doors: Object.keys(NEXY.World.doors).sort().join(), bar: NEXY.Game.barMax(), node: WorldMap.playable('palace') }));
  expect(r.word === 'TOBE' && r.T.letters === 4 && r.T.exits === 1, `palavra-mestra e totais ${JSON.stringify(r.T)}`);
  expect(r.T.words === 7 && r.T.wordList.sort().join() === 'AM,ARE,BIG,BRIDGE,IS,WAS,WERE', `palavras ${r.T.wordList}`);
  expect(r.T.creatureList.sort().join() === 'FLYER,KNIGHT', `criaturas ${r.T.creatureList}`);
  expect(r.music === 'palace' && r.bg === 'palace', 'música e fundo do palácio');
  expect(r.doors === 'altar1,altar2,clock1,clock2,clock3,switch', `altares, relógios e interruptor (${r.doors})`);
  expect(r.node, 'o nó do palácio no mapa agora é jogável');
}, LP);

test('mapa: a saída secreta da 1-1 abre o palácio; na 1ª visita a lembrança ensina WAS/WERE (Esc pula) e não volta mais', async ({ browser }) => {
  const { ctx, page, errors } = await openGame(browser, { realtime: true });
  await page.evaluate(() => { NEXY.Save.data.exits = { '1-1': { normal: true, secret: true } }; NEXY.Save.data.cleared = { '1-1': true }; NEXY.Save.data.map = { at: '1-1', revealed: {} }; });
  await page.keyboard.press('Enter');
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(150); if (await page.evaluate(() => !!NEXY.Save.data.map.revealed['1-1>palace'] && !WorldMap.reveal.length)) break; }
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(150); await page.keyboard.up('ArrowDown'); await page.waitForTimeout(1600);
  const at = await page.evaluate(() => WorldMap.at);
  await page.keyboard.press('Enter'); await page.waitForTimeout(2800);
  const inside = await page.evaluate(() => ({ lvl: NEXY.World.level.id, intro: PalaceIntro.active, state: NEXY.Game.state, music: Music.variant }));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ intro: PalaceIntro.active, state: NEXY.Game.state, met: !!NEXY.Save.data.met.palace }));
  await page.evaluate(() => NEXY.Game.enterLevel('palace', true)); await page.waitForTimeout(400);
  const again = await page.evaluate(() => PalaceIntro.active);
  await ctx.close();
  expect(!errors.length, errors.join('; '));
  expect(at === 'palace', `andou até o palácio (${at})`);
  expect(inside.lvl === 'palace' && inside.intro && inside.state === 'cinematic' && inside.music === 'palace', `dentro, com a lembrança (${JSON.stringify(inside)})`);
  expect(!after.intro && after.state === 'play' && after.met, `Esc pula e entrega o controle (${JSON.stringify(after)})`);
  expect(!again, 'na 2ª visita não repete');
}, { ownPages: true });

test('palácio: o pulso da Echo vê a ponte que existia; IT IS A BRIDGE só confunde (com dica); IT WAS A BRIDGE refaz a ponte e ela se atravessa andando', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELPP);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies();
    H12.hit(11, 19); H12.hit(17, 19); out.bar = G.bar.join();
    H.tp(27, 19, 999); Echo.reset(); H.step(20); Echo.line = null; Echo.lines = []; EchoPulse.cool = 0;
    EchoPulse.fire(); H.step(2);
    out.ping = W.targets.bridge1.ping > 0; out.echo = Echo.line && Echo.line.en; out.hint = !!Hints.done.pastping;
    NEXY.give('IS'); H.step(200);
    Echo.line = null; Echo.lines = []; await H12.panel(25, 19, ['IS', 'BRIDGE']); H.step(40);
    out.tip = Echo.line && Echo.line.en; out.stillGone = W.targets.bridge1.cur.w === 0;
    await H12.panel(25, 19, ['WAS', 'BRIDGE']); H.step(120);
    out.bridge = W.targets.bridge1.cur.w; out.solid = [29, 33, 38].every(c => W.type(c, 20) === 7);
    H.tp(27, 19, 999); H.set(['right']); H.step(240); H.set([]); H.step(5);
    out.across = P.onGround && !P.dead && P.x > 39 * 32;
    return out;
  });
  expect(r.bar === 'WAS,BRIDGE', `palavras dos blocos (${r.bar})`);
  expect(r.ping && r.echo === 'It was a bridge!' && r.hint, `o pulso mostra o passado (${JSON.stringify(r)})`);
  expect(r.tip === 'Not today. Yesterday!' && r.stillGone, `IS só confunde, com dica (${r.tip})`);
  expect(r.bridge === 10 && r.solid && r.across, `a ponte volta inteira e se atravessa (${JSON.stringify(r)})`);
}, LP);

test('palácio: THEY WERE BIG ergue as estátuas em escada (THEY WAS e THEY ARE só confundem, com dica); sem vão para ficar preso; do chão ao topo da parede com pulos de verdade', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELPP);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, W = NEXY.World, out = {};
    H.noEnemies(); NEXY.give('WAS', 'WERE', 'ARE', 'BIG');
    const say = async words => { Echo.line = null; Echo.lines = []; await H12.panel(64, 19, words); H.step(40); return Echo.line ? Echo.line.en : '-'; };
    out.tips = [await say(['WAS', 'BIG']), await say(['ARE', 'BIG'])];
    out.small = ['knight1', 'knight2', 'knight3'].every(id => W.targets[id].state === 'small');
    // o Alado ao lado da parede existe enquanto as estátuas são pequenas
    H.wakeSpawns(); H.tp(70, 19, 999); H.step(30); out.flyerBefore = NEXY.Ents.list.some(e => e.type === 'flyer' && !e.dead && e.x > 74 * 32);
    // o Nexy parado num dos vãos entre as estátuas pequenas: quando elas crescem, ele vai junto para cima
    H.tp(73, 19, 999); H.step(2);
    Sentence.apply(W.doors.altar2, W.level.doors.altar2.accept[0], ['WERE', 'BIG']); H.step(240);
    out.lifted = !P.dead && P.onGround && Math.round(P.y + P.h) <= 15 * 32;
    out.h = ['knight1', 'knight2', 'knight3'].map(id => W.targets[id].cur.h).join();
    out.noGap = [70, 71, 72, 73, 74, 75].every(c => W.type(c, 19) === 7);
    out.flyerAfter = NEXY.Ents.list.some(e => e.type === 'flyer' && !e.dead && e.x > 74 * 32);
    out.hops = [
      H12.tryHop([0], () => NEXY.teleport(68, 19), ['right'], HP.top(17, 70, 71)),
      H12.tryHop([0], () => NEXY.teleport(70, 16), ['right'], HP.top(15, 72, 73)),
      H12.tryHop([0], () => NEXY.teleport(72, 14), ['right'], HP.top(13, 74, 75)),
      H12.tryHop([0], () => NEXY.teleport(74, 12), ['right'], HP.top(11, 76, 77)),
    ].join();
    return out;
  });
  expect(r.tips.join(' | ') === 'They? Not was! | Not today. Yesterday!', `dicas (${r.tips.join(' | ')})`);
  expect(r.small, 'as estátuas continuam pequenas');
  expect(r.h === '3,5,7', `estátuas do tamanho de antes (${r.h})`);
  expect(r.noGap && r.lifted, `crescidas, as estátuas não deixam vão de 1 bloco (o dono ficou preso num deles); quem estava no vão sobe junto (${r.lifted})`);
  expect(r.flyerBefore && !r.flyerAfter, `o Alado da parede some quando a estátua ocupa o lugar dele (${r.flyerBefore}/${r.flyerAfter})`);
  expect(r.hops === '1,1,1,1', `escada de estátuas até a parede (${r.hops})`);
}, LP);

test('palácio: torre do relógio — WAS (ontem), IS (hoje), WERE (ontem) fazem degraus e ponte; subida com pulos de verdade até o salão do interruptor', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELPP);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies(); NEXY.give('WAS', 'WERE', 'ARE');
    const say = async (c, r, words) => { Echo.line = null; Echo.lines = []; await H12.panel(c, r, words); H.step(40); return Echo.line ? Echo.line.en : '-'; };
    out.tip1 = await say(81, 19, ['ARE']);
    await say(81, 19, ['WAS']); H.step(60); out.step1 = W.targets.step1.cur.w;
    out.hop1 = H12.tryHop([0], () => NEXY.teleport(82, 19), ['right'], HP.top(17, 84, 86));
    out.hop2 = H12.tryHop([0], () => NEXY.teleport(85, 16), ['right'], HP.top(14, 87, 93));
    H12.hit(92, 13); out.is = G.bar.includes('IS');
    out.tip2 = await say(91, 13, ['WAS']);
    await say(91, 13, ['IS']); H.step(60); out.step2 = W.targets.step2.cur.w;
    out.hop3 = H12.tryHop([0], () => NEXY.teleport(88, 13), ['left'], HP.top(11, 84, 86));
    out.hop4 = H12.tryHop([0], () => NEXY.teleport(85, 10), ['left'], HP.top(8, 78, 83));
    out.tip3 = await say(80, 7, ['WAS']);
    await say(80, 7, ['WERE']); H.step(120); out.bridge = W.targets.bridge2.cur.w;
    NEXY.teleport(81, 7); H.set(['right']); let top = false;
    for (let i = 0; i < 600; i++) { H.step(1); if (Math.round(P.y + P.h) === 8 * 32 && P.x > 104 * 32) top = true; if (top && P.onGround && P.x > 106 * 32) break; }
    H.set([]); H.step(20);
    out.walk = top && P.onGround && Math.round(P.y + P.h) === 640 && P.x > 106 * 32;
    return out;
  });
  expect(r.tip1 === 'Nexy is he!' && r.tip2 === 'Not yesterday. Today!' && r.tip3 === 'They? Not was!', `dicas (${r.tip1} | ${r.tip2} | ${r.tip3})`);
  expect(r.step1 === 3 && r.step2 === 3 && r.bridge === 15, `degraus e ponte (${JSON.stringify(r)})`);
  expect(r.is, 'o IS sai do bloco em cima da sacada');
  expect([r.hop1, r.hop2, r.hop3, r.hop4].join() === '1,1,1,1', `subida (${[r.hop1, r.hop2, r.hop3, r.hop4]})`);
  expect(r.walk, 'pela ponte e pelo topo da parede até o salão do interruptor');
}, LP);

test('palácio: outro caminho em cada desafio — Alados no abismo, na parede e no portão; tubo-pistão e Alado na torre', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELPP);
  const r = await page.evaluate(() => {
    const P = NEXY.P, W = HP.waits(), out = {};
    out.pit = HP.attempt(28, 19, ['right'], () => P.onGround && P.x > 39 * 32 && Math.round(P.y + P.h) === 640, W);
    out.wall = HP.attempt(73, 19, ['right'], () => P.onGround && P.x > 76 * 32, W);
    out.gate = HP.attempt(130, 19, ['right'], () => P.onGround && P.x > 137 * 32, W);
    const pipe = NEXY.Ents.list.find(e => e.type === 'pipe'), T = H12.range(0, 3, 0.1);
    out.floorToPipe = H12.tryHop(T, () => NEXY.teleport(92, 19), ['right'], () => P.riding === pipe);
    out.pipeToL3 = H12.tryHop(T, H12.on(pipe), ['right'], () => P.onGround && Math.round(P.y + P.h) === 12 * 32 && P.x > 96 * 32);
    out.L3toExit = HP.attempt(99, 11, ['right'], () => P.onGround && Math.round(P.y + P.h) === 8 * 32 && P.x > 98 * 32, W);
    return out;
  });
  for (const k in r) expect(r[k] > 0, `caminho ${k} (${JSON.stringify(r)})`);
}, LP);

test('palácio: cavaleiro — pisão comum só faz o elmo tinir (o Nexy quica), com giro a armadura se desfaz; de lado machuca', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, out = {};
    H.noEnemies(); H.tp(50, 19);
    const drop = (k, spin) => { P.x = k.x + 2; P.y = k.y - P.h - 30; P.px = P.x; P.py = P.y; P.vx = 0; P.vy = 150; P.onGround = false; P.spinning = spin; P.invuln = 0; H.set([]); };
    const k = NEXY.Ents.spawn('knight', { x: 52 * 32, y: 20 * 32 - 40, opts: {} }); H.step(3);
    drop(k, false); for (let i = 0; i < 40 && !(k.stagger > 0); i++) H.step(1);
    out.clang = k.stagger > 0 && !k.dead && k.state === 'walk' && P.vy < 0 && !P.dead; out.grimoire = !!NEXY.Save.data.grimoire.creatures.KNIGHT;
    H.step(90);
    drop(k, true); for (let i = 0; i < 40 && k.state !== 'dying'; i++) H.step(1);
    out.spin = k.state === 'dying';
    const k2 = NEXY.Ents.spawn('knight', { x: 56 * 32, y: 20 * 32 - 40, opts: {} }); H.step(3);
    P.dead = false; P.invuln = 0; P.aura = true; P.spinning = false; NEXY.teleport(54, 19); H.set(['right']);
    for (let i = 0; i < 120 && P.aura; i++) H.step(1);
    H.set([]); out.side = !P.aura;
    return out;
  });
  expect(r.clang && r.grimoire, `pisão comum só tine e o Nexy quica (${JSON.stringify(r)})`);
  expect(r.spin, 'com giro a armadura se desfaz');
  expect(r.side, 'encostar de lado machuca');
}, LP);

test('palácio: INTERRUPTOR DO SER — I WAS / I AM; frase trocada só confunde; a cena salva palaces.toBe e o anel, abre o portão; a 1-1 fica com os degraus-fantasma sólidos', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELPP);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies();
    // chegou sem as palavras (caminhos alternativos): o poço antes do interruptor dá WAS e AM
    H12.hit(127, 19); H12.hit(127, 19); out.well = G.bar.join(); NEXY.give('IS');
    Echo.line = null; Echo.lines = []; await H12.panel(131, 19, ['AM', 'WAS']); H.step(40);
    out.tip = Echo.line && Echo.line.en; out.closed = W.targets.gate.state === 'big' && !NEXY.Flags.get('palaces.toBe');
    G.openPanel(P.interact); Panel.place(G.bar.indexOf('WAS')); Panel.place(G.bar.indexOf('AM')); Panel.confirm(); await H.wait(1800);
    out.scene = PalaceSwitch.active && G.state === 'cinematic';
    while (PalaceSwitch.active && PalaceSwitch.t < 1.2) PalaceSwitch.update(1 / 60);
    const saved = JSON.parse(localStorage.getItem(NEXY.Save.KEY));
    out.saved = saved.flags.palaces.toBe === true && saved.heart.ring === true && NEXY.Flags.get('palaces.toBe');
    let n = 0; while (PalaceSwitch.active && n++ < 2400) PalaceSwitch.update(1 / 60);
    out.ended = !PalaceSwitch.active && G.state === 'play';
    H.step(200); out.gate = W.targets.gate.cur.h;
    H.set(['right']); for (let i = 0; i < 500 && G.state === 'play'; i++) H.step(1); H.set([]);
    out.finish = G.state === 'clearing' && NEXY.Save.data.exits.palace && NEXY.Save.data.exits.palace.normal;
    G.toMap(); out.hud = $('mhHeart').style.boxShadow.replace(/\s/g, '').includes('122,216,255');
    G.enterLevel('1-1'); H.noEnemies(); G.bar = [];
    out.ghosts = [[65, 17], [67, 14], [69, 11]].every(([c, r]) => W.blockAt(c, r).solid);
    return out;
  });
  expect(r.well === 'WAS,AM', `o poço de palavras dá o que falta (${r.well})`);
  expect(r.tip === 'Yesterday is the past!' && r.closed, `trocar as palavras só confunde, com dica (${r.tip})`);
  expect(r.scene, 'a cena começa');
  expect(r.saved, 'o palácio aceso e o anel ficam salvos já no impacto');
  expect(r.ended && r.gate === 0, `a cena termina e o portão afunda (${JSON.stringify(r)})`);
  expect(r.finish, 'a saída do palácio termina a fase');
  expect(r.hud, 'o anel aparece no Coração do mapa');
  expect(r.ghosts, 'na 1-1 os degraus-fantasma ficam sólidos sem as palavras');
}, LP);

const L13 = { level: '1-3' };
// 1-3: gárgulas (atrair de costas, olhar para ela parar no ar), altares da caixa e pulos de verdade
const HELP13 = () => {
  const P = NEXY.P, G = NEXY.Game;
  G.timers = []; NEXY.Save.data.met.echo = true; Echo.line = null; Echo.lines = [];
  window.H13 = {
    garg(c) { return NEXY.Ents.list.filter(e => e.type === 'gargoyle' && !e.dead).sort((a, b) => Math.abs(a.x - c * 32) - Math.abs(b.x - c * 32))[0]; },
    // acorda os spawns perto de (c, r) e devolve a gárgula da coluna gc
    spawn(c, r, gc) { H.wakeSpawns(); P.dead = false; P.pitDeath = false; G.state = 'play'; G.hitstopN = 0; NEXY.teleport(c, r); P.invuln = 999; H.set([]); H.step(3); return H13.garg(gc); },
    // atrai a gárgula: de costas até ela chegar na altura da cabeça e perto; então olha para ela (ela vira pedra ali)
    lure(e, maxD = 34) {
      H.set([]);
      for (let i = 0; i < 1200; i++) {
        P.facing = e.x + e.w / 2 > P.cx ? -1 : 1; H.step(1);
        if (e.state === 'fly' && Math.abs(e.x + e.w / 2 - P.cx) < maxD && Math.abs(e.y + e.h / 2 - (P.y + 6)) < 12) break;
      }
      P.facing = e.x + e.w / 2 > P.cx ? 1 : -1; H.step(2);
      return e.state;
    },
    // pulo com a seta segurada só depois de 'delay' quadros (para cair em cima de algo bem perto)
    hop(dir, delay, success, frames = 160) {
      H.set(['jump']); H.press('jump');
      for (let i = 0; i < frames; i++) { if (i === delay) H.set(['jump', dir]); H.step(1); if (i > 4 && success()) { H.set([]); P.vx = 0; return true; } if (P.dead || (i > 10 && P.onGround)) break; }
      H.set([]); H.step(2); return false;
    },
    stand(rr, c0, c1) { return () => P.onGround && Math.round(P.y + P.h) === rr * 32 && P.x + P.w / 2 >= c0 * 32 && P.x + P.w / 2 <= (c1 + 1) * 32; },
    onIt(e) { return () => P.onGround && P.riding === e && Math.abs(P.cx - (e.x + e.w / 2)) < 12; },
    async say(c, r, words) { Echo.line = null; Echo.lines = []; await H12.panel(c, r, words); H.step(40); return Echo.line ? Echo.line.en : '-'; },
    // anda segurando a seta; parou numa parede ou chegou na beirada: pula (segurando o pulo um tempo), como o jogador
    walk(dir, frames, stop, run) {
      let jt = 0; const d = dir === 'right' ? 1 : -1;
      for (let i = 0; i < frames; i++) {
        const keys = [dir].concat(run ? ['run'] : []), fx = d > 0 ? P.x + P.w + 2 : P.x - 2;
        const edge = P.onGround && !NEXY.World.isFloor(Math.floor(fx / 32), Math.floor((P.y + P.h + 2) / 32));
        if (jt > 0) { keys.push('jump'); jt--; } else if (P.onGround && ((Math.abs(P.vx) < 5 && i > 3) || edge)) { H.press('jump'); keys.push('jump'); jt = 22; }
        H.set(keys); H.step(1); if (P.dead || (stop && stop())) break;
      }
      H.set([]);
    },
    // espera um portão de laser acabar de apagar
    off(g) { let prev = g.on; for (let i = 0; i < 400; i++) { H.step(1); if (prev && !g.on) return true; prev = g.on; } return false; },
  };
};

test('1-3: carrega com CITY, 14 palavras, 4 letras, 1 saída, 3 segredos, 4 criaturas (drone e Sentinela), barra de 12, música e fundo da cidade', async ({ page }) => {
  const r = await page.evaluate(() => ({ T: NEXY.World.totals, word: NEXY.World.level.masterWord, music: Music.variant, bg: NEXY.World.level.bg,
    doors: Object.keys(NEXY.World.doors).sort().join(), bar: NEXY.Game.barMax(), node: WorldMap.playable('1-3'), w: NEXY.World.w,
    boxes: ['box1', 'box2', 'box3', 'box4', 'box5'].map(id => NEXY.World.targets[id].state).join(), gate: NEXY.World.targets.bossgate.state }));
  expect(r.word === 'CITY' && r.T.letters === 4 && r.T.exits === 1 && r.T.secrets === 3 && r.w === 400, `palavra-mestra e totais ${JSON.stringify(r.T)}`);
  expect(r.T.wordList.sort().join() === 'BEHIND,BETWEEN,CORE,HOLE,IN,IN FRONT OF,LASER,NEXT TO,ON,SHIELD,SIGN,UNDER,WALL,WINGS', `palavras ${r.T.wordList}`);
  expect(r.T.creatureList.sort().join() === 'CRAWLER,DRONE,GARGOYLE,SENTINEL', `criaturas ${r.T.creatureList}`);
  expect(r.music === 'city' && r.bg === 'city' && r.bar === 12, 'música, fundo e barra');
  expect(r.doors === 'altar1,altar2,altar3,altar3b,altar4,altar5,citymap,core', `altares, mapa e terminal (${r.doors})`);
  expect(r.boxes === 'on,behind,on-wall,on,on-wall' && r.gate === 'big', `caixas no começo e o portão do fim fechado (${r.boxes}/${r.gate})`);
  expect(r.node, 'o nó da 1-3 no mapa agora é jogável');
}, L13);

test('mapa: sair da 1-2 abre a 1-3; na 1ª visita a chegada ensina ON/UNDER/IN/BEHIND (Esc pula) e não volta mais', async ({ browser }) => {
  const { ctx, page, errors } = await openGame(browser, { realtime: true });
  await page.evaluate(() => { NEXY.Save.data.exits = { '1-1': { normal: true }, '1-2': { normal: true } }; NEXY.Save.data.cleared = { '1-1': true, '1-2': true }; NEXY.Save.data.map = { at: '1-2', revealed: { '1-1>1-2': true } }; });
  await page.keyboard.press('Enter');
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(150); if (await page.evaluate(() => !!NEXY.Save.data.map.revealed['1-2>1-3'] && !WorldMap.reveal.length)) break; }
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(150); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(1800);
  const at = await page.evaluate(() => WorldMap.at);
  await page.keyboard.press('Enter'); await page.waitForTimeout(2800);
  const inside = await page.evaluate(() => ({ lvl: NEXY.World.level.id, intro: CityIntro.active, state: NEXY.Game.state, music: Music.variant }));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ intro: CityIntro.active, state: NEXY.Game.state, met: !!NEXY.Save.data.met.city }));
  await page.evaluate(() => NEXY.Game.enterLevel('1-3', true)); await page.waitForTimeout(400);
  const again = await page.evaluate(() => CityIntro.active);
  await ctx.close();
  expect(!errors.length, errors.join('; '));
  expect(at === '1-3', `andou até a 1-3 (${at})`);
  expect(inside.lvl === '1-3' && inside.intro && inside.state === 'cinematic' && inside.music === 'city', `dentro, com a chegada (${JSON.stringify(inside)})`);
  expect(!after.intro && after.state === 'play' && after.met, `Esc pula e entrega o controle (${JSON.stringify(after)})`);
  expect(!again, 'na 2ª visita não repete');
}, { ownPages: true });

test('1-3 letreiro: sem a caixa não se sobe; IT IS IN THE SIGN só confunde (com dica); IT IS UNDER THE SIGN põe a caixa embaixo e dela se sobe na placa e no prédio alto', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies();
    H12.hit(4, 19); H12.hit(7, 19); out.bar = G.bar.join();
    // sem a caixa: nem correndo se alcança a placa (5 linhas acima do telhado)
    out.noBox = H12.tryHop([0], () => NEXY.teleport(15, 19), ['right', 'run'], H13.stand(15, 18, 23)) + H12.tryHop([0], () => NEXY.teleport(19, 19), [], H13.stand(15, 18, 23));
    NEXY.give('IN');
    out.tip = await H13.say(13, 19, ['IN']); out.still = W.targets.box1.state;
    await H13.say(13, 19, ['UNDER']); H.step(90);
    out.box = W.targets.box1.state; out.solid = [20, 21].every(c => W.type(c, 18) === 7 && W.type(c, 19) === 7) && W.type(20, 13) !== 7;
    out.hops = [
      H12.tryHop([0], () => NEXY.teleport(18, 19), ['right'], H13.stand(18, 20, 21)),
      H12.tryHop([0], () => NEXY.teleport(20, 17), [], H13.stand(15, 18, 23)),
      H12.tryHop([0], () => NEXY.teleport(22, 14), ['right'], H13.stand(12, 25, 44)),
    ].join();
    return out;
  });
  expect(r.bar === 'ON,UNDER', `palavras dos blocos (${r.bar})`);
  expect(r.noBox === 0, 'sem a caixa não dá para subir');
  expect(r.tip === 'In the sign? It is too thin!' && r.still === 'on', `IN só confunde, com dica (${r.tip})`);
  expect(r.box === 'under' && r.solid, `a caixa voa para baixo da placa e vira chão (${r.box})`);
  expect(r.hops === '1,1,1', `telhado → caixa → placa → prédio alto (${r.hops})`);
}, L13);

test('1-3 outdoor: o pulso acha a caixa atrás da placa; ON THE HOLE só confunde; UNDER THE HOLE ela cai (a Echo avisa); IN THE HOLE tapa o buraco e o corredor se atravessa andando', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies();
    H12.hit(46, 19); H12.hit(52, 19); out.bar = G.bar.join();
    // sem a caixa, o buraco do corredor (3 colunas) não se pula, nem correndo
    NEXY.teleport(58, 19); H.set(['right', 'run']); for (let i = 0; i < 60; i++) { H.step(1); if (P.x > 64 * 32 - 30) { H.press('jump'); H.set(['right', 'run', 'jump']); } }
    H.set([]); H.step(60); out.noBox = !P.dead && P.x > 68 * 32 && Math.round(P.y + P.h) === 640; P.dead = false;
    H.tp(58, 19, 999); Echo.reset(); H.step(20); Echo.line = null; Echo.lines = []; EchoPulse.cool = 0;
    EchoPulse.fire(); H.step(2);
    out.ping = W.targets.box2.ping > 0; out.echo = Echo.line && Echo.line.en; out.hint = !!Hints.done.boxping;
    NEXY.give('ON', 'UNDER');
    out.tip = await H13.say(49, 19, ['ON']);
    await H13.say(49, 19, ['UNDER']); H.step(60); out.fell = W.targets.box2.state; out.fellLine = Echo.line && Echo.line.en;
    out.stillHole = W.type(65, 20) === 0;
    await H13.say(49, 19, ['IN']); H.step(90);
    out.box = W.targets.box2.state; out.filled = [65, 66, 67].every(c => W.type(c, 20) === 7 && W.type(c, 21) === 7);
    H.tp(58, 19, 999); H.set(['right']); H.step(200); H.set([]); H.step(5);
    out.across = P.onGround && !P.dead && P.x > 70 * 32 && Math.round(P.y + P.h) === 640;
    return out;
  });
  expect(r.bar === 'IN,BEHIND', `palavras dos blocos (${r.bar})`);
  expect(!r.noBox, 'sem a caixa o buraco do corredor não se atravessa');
  expect(r.ping && r.echo === 'It is behind the sign!' && r.hint, `o pulso acha a caixa (${JSON.stringify(r)})`);
  expect(r.tip === 'On the hole? It falls in!', `ON só confunde (${r.tip})`);
  expect(r.fell === 'under' && r.fellLine === 'Oh no! It fell down.' && r.stillHole, `UNDER: a caixa cai e o buraco fica aberto (${JSON.stringify(r)})`);
  expect(r.box === 'in' && r.filled && r.across, `IN tapa o buraco e se atravessa (${JSON.stringify(r)})`);
}, L13);

test('1-3 café: THE BOX IS IN THE HOLE vira chão no meio do buraco; do parapeito, UNDER THE SIGN leva a caixa; subida até o muro; frases sem sentido têm dica', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = {};
    H.noEnemies();
    H12.hit(86, 17); H12.hit(89, 17); H12.hit(92, 17); out.bar = G.bar.join();
    NEXY.give('ON', 'UNDER', 'IN', 'BEHIND');
    out.tips = [await H13.say(102, 17, ['IN', 'WALL']), await H13.say(102, 17, ['ON', 'HOLE']), await H13.say(102, 17, ['IN', 'SIGN'])].join(' | ');
    // nem correndo se pula o buraco de 8 colunas
    out.noBox = H12.tryHop([0], () => NEXY.teleport(101, 17), ['right', 'run'], H13.stand(18, 113, 115));
    await H13.say(102, 17, ['IN', 'HOLE']); H.step(90);
    out.inHole = W.targets.box3.state === 'in-hole' && [107, 108, 109].every(c => W.type(c, 18) === 7);
    out.cross = [
      H12.tryHop([0], () => NEXY.teleport(104, 17), ['right'], H13.stand(18, 107, 109)),
      H12.tryHop([0], () => NEXY.teleport(109, 17), ['right'], H13.stand(18, 113, 116)),
    ].join();
    // sem a caixa embaixo da placa, do parapeito não se alcança a placa
    out.noSign = H12.tryHop([0], () => NEXY.teleport(115, 17), [], H13.stand(13, 114, 116));
    await H13.say(113, 17, ['UNDER', 'SIGN']); H.step(120);
    out.under = W.targets.box3.state === 'under-sign' && W.type(114, 16) === 7 && W.type(108, 18) === 0;
    out.climb = [
      H12.tryHop([0], () => NEXY.teleport(113, 17), ['right'], H13.stand(16, 114, 116)),
      H12.tryHop([0], () => NEXY.teleport(115, 15), [], H13.stand(13, 114, 116)),
      H12.tryHop([0], () => NEXY.teleport(115, 12), ['right'], H13.stand(10, 117, 134)),
    ].join();
    return out;
  });
  expect(r.bar === 'WALL,SIGN,HOLE', `palavras dos blocos (${r.bar})`);
  expect(r.tips === 'A wall has no inside! | On the hole? It falls in! | In the sign? It is too thin!', `dicas (${r.tips})`);
  expect(r.noBox === 0 && r.noSign === 0, `sem a caixa não dá (${r.noBox}/${r.noSign})`);
  expect(r.inHole && r.cross === '1,1', `a caixa no buraco vira chão e se atravessa (${r.cross})`);
  expect(r.under && r.climb === '1,1,1', `UNDER THE SIGN e a subida até o muro (${JSON.stringify(r)})`);
}, L13);

test('1-3 gárgula: olhando para ela é pedra (chão, não machuca); de costas ela acorda, desce e vem; voando machuca; pisão a deixa de pedra e o Nexy quica; com giro quebra', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, out = {};
    let e = H13.spawn(20, 19, 27);
    P.facing = 1; H.step(60); out.stone = e.state === 'stone' && e.plat && Math.abs(e.y - e.hy) < 1;
    P.facing = -1; H.step(12); out.wake = e.state; H.step(60); out.fly = e.state === 'fly' && e.y > e.hy + 20;
    // voando, encostar machuca
    P.invuln = 0; P.aura = false; for (let i = 0; i < 900 && !P.dead; i++) { P.facing = -1; H.step(1); }
    out.hurt = P.dead;
    // pisão: ela voando logo abaixo (atrás do Nexy, que olha para o outro lado); vira pedra por 2 s e ele quica alto
    const under = spin => {
      const g = H13.spawn(20, 19, 27); NEXY.teleport(20, 11); P.facing = 1; P.vy = 0; P.spinning = spin;
      g.x = P.cx - 33; g.y = P.y + P.h + 30; g.state = 'fly'; g.plat = false; g.wakeT = 1; g.hx = g.x; g.hy = g.y;
      H.set(['jump']); let bounced = false;
      for (let i = 0; i < 90; i++) { H.step(1); if (g.state === 'dying' || g.stunT > 0) { bounced = P.vy < -300; break; } }
      H.set([]); return { g, bounced };
    };
    let s1 = under(false); out.stomp = s1.bounced && s1.g.state === 'stone' && s1.g.stunT > 1.5;
    s1 = under(true); out.spin = s1.g.state === 'dying' || s1.g.dead;
    return out;
  });
  expect(r.stone, 'olhando para ela: pedra parada no poleiro, e é chão');
  expect(r.wake === 'wake' && r.fly, `de costas: acorda e desce voando (${r.wake}/${r.fly})`);
  expect(r.hurt, 'voando, ela machuca');
  expect(r.stomp, 'pisão: vira pedra por 2 s e o Nexy quica alto');
  expect(r.spin, 'com giro ela quebra');
}, L13);

test('1-3 outro caminho em cada desafio: gárgula parada no ar vira degrau (letreiro, escada de incêndio, parapeito do café); pulo correndo na gárgula do buraco', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(() => {
    const P = NEXY.P, out = {};
    // atrai a gárgula, olha para ela (pedra no ar), sobe nela e segue com pulos de verdade (vários tempos de pulo)
    const route = (c, r, gc, steps) => {
      for (const d of [8, 4, 12, 0, 16, 20]) {
        const e = H13.spawn(c, r, gc); if (!e) return 'sem gárgula';
        if (H13.lure(e) !== 'stone') continue;
        if (!H13.hop(e.x + e.w / 2 > P.cx ? 'right' : 'left', d, H13.onIt(e))) continue;
        let all = true;
        for (const [keys, success, place] of steps) { P.facing = 1; if (!H12.tryHop([0], place || (() => {}), keys, success)) { all = false; break; } }
        if (all) return 'ok';
      }
      return 'falhou';
    };
    // andar até a ponta (da placa) antes do pulo seguinte, como o jogador faz
    const edge = c => () => { H.set(['right']); for (let i = 0; i < 90 && P.x + P.w < (c + 1) * 32 - 3; i++) H.step(1); H.set([]); };
    out.sign = route(20, 19, 27, [[[], H13.stand(15, 18, 23)], [['right'], H13.stand(12, 25, 44), edge(23)]]);
    out.billboard = route(56, 13, 62, [[['right'], H13.stand(9, 60, 72)]]);
    out.cafe = route(114, 17, 112, [[['right'], H13.stand(13, 114, 116)], [['right'], H13.stand(10, 117, 134), edge(116)]]);
    // a gárgula do buraco: de frente para ela (pedra), um pulo correndo cai em cima; dela, o parapeito
    const e = H13.spawn(101, 17, 108); P.facing = 1;
    out.pit = H12.tryHop([0], () => { NEXY.teleport(100, 17); P.facing = 1; H.set(['right', 'run']); for (let i = 0; i < 40 && P.x + P.w < 105 * 32 - 24; i++) H.step(1); }, ['right', 'run'], () => P.onGround && P.riding === e);
    out.pit2 = out.pit ? H12.tryHop([0], () => {}, ['right'], H13.stand(18, 113, 116)) : 0;
    return out;
  });
  expect(r.sign === 'ok', `letreiro pela gárgula (${r.sign})`);
  expect(r.billboard === 'ok', `outdoor pela escada de incêndio e a gárgula (${r.billboard})`);
  expect(r.cafe === 'ok', `parapeito do café pela gárgula (${r.cafe})`);
  expect(r.pit && r.pit2, `buraco pela gárgula de pedra (${r.pit}/${r.pit2})`);
}, L13);

test('1-3 letras e segredos: C do alto da placa, I em cima do outdoor, T da gárgula do buraco, Y de cima do trem; vida e cristal escondidos', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, out = {};
    const got = i => () => G.letters[i];
    H.noEnemies();
    out.C = H12.tryHop([0], () => NEXY.teleport(21, 14), [], got(0));
    out.I = H12.tryHop([0], () => NEXY.teleport(70, 8), [], got(1));
    const e = H13.spawn(101, 17, 108); P.facing = 1;
    out.T = H12.tryHop([0], () => { P.x = e.x + e.w / 2 - P.w / 2; P.y = e.y - P.h; P.px = P.x; P.py = P.y; P.vx = 0; P.vy = 0; P.facing = 1; H.step(1); }, [], got(2));
    H.noEnemies();
    const tr = NEXY.Ents.list.find(x => x.type === 'train');
    out.Y = H12.tryHop(H12.range(0, tr.period, 0.25), () => { Ents.types.train.place(tr); P.x = 154 * 32 + 16 - P.w / 2; P.y = tr.y - P.h; P.px = P.x; P.py = P.y; P.vx = 0; P.vy = 0; H.step(1); },
      [], () => G.letters[3]);
    H12.hit(35, 11); H12.hit(207, 15);
    out.secrets = [...G.secrets].sort().join();
    return out;
  });
  expect(r.C && r.I && r.T && r.Y, `as 4 letras (${JSON.stringify(r)})`);
  expect(r.secrets === 'city-crystal,city-life', `segredos (${r.secrets})`);
}, L13);

test('1-3 trem: espera na estação, leva o Nexy até a praça (sem cair) e buzina ao sair', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, out = {};
    H.noEnemies();
    const tr = NEXY.Ents.list.find(e => e.type === 'train');
    G.simTime = 0.2; H.tp(139, 15, 999); H.step(1); out.atStation = Math.round(tr.x) === 141 * 32;
    H.set(['right']); for (let i = 0; i < 60 && P.riding !== tr; i++) H.step(1); H.set([]);
    out.board = P.riding === tr; out.hint = !!Hints.done.train;
    for (let i = 0; i < 900 && tr.k < 1; i++) H.step(1);
    out.arrived = !P.dead && P.riding === tr && Math.round(tr.x) === 157 * 32;
    H.set(['right']); H.step(120); H.set([]); H.step(5);
    out.plaza = P.onGround && !P.dead && P.x > 163 * 32 && Math.round(P.y + P.h) === 512;
    return out;
  });
  expect(r.atStation && r.board && r.hint, `embarca na estação (${JSON.stringify(r)})`);
  expect(r.arrived && r.plaza, `chega na praça (${JSON.stringify(r)})`);
}, L13);

test('1-3 mapa da cidade: leitura (BETWEEN), a bússola nasce; escalada sobe a bússola, errar encerra e guarda; a cena; a seta aponta a letra que falta e, no nível 2, o segredo', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, S = NEXY.Save.data, out = {};
    H.noEnemies(); S.heart.compass = 0; S.met.compass = false;
    H.tp(200, 15, 999); H.step(5); out.near = P.interact && P.interact.kind;
    G.openPanel(P.interact); out.state = G.state;
    const click = sel => { const b = document.querySelector('#chest ' + sel); if (b) b.click(); return !!b; };
    click('[data-a="learn"]'); await H.wait(50);
    out.svg = !!document.querySelector('#chest .cmap .cm-x[data-k="tower"]');
    out.between = G.wordsSeen.has('BETWEEN') && !!S.grimoire.words.BETWEEN;
    click('[data-a="online"]'); await H.wait(50); out.c1 = S.heart.compass;
    click('[data-a="climb"]'); await H.wait(50);
    click('.copt[data-i="0"]'); await H.wait(50); out.c2 = S.heart.compass;
    click('[data-a="up"]'); await H.wait(50);
    click('.copt[data-i="0"]'); await H.wait(50); out.c3 = S.heart.compass; out.ev = document.getElementById('cev').textContent;
    click('[data-a="up"]'); await H.wait(50); out.done = !!document.querySelector('#chest [data-a="close"]');
    click('[data-a="close"]'); await H.wait(50);
    out.scene = CompassScene.active && G.state === 'cinematic' && City.freeze;
    for (let i = 0; i < 60 * 16 && CompassScene.active; i++) CompassScene.update(1 / 60);
    out.after = !CompassScene.active && G.state === 'play' && !City.freeze && S.met.compass;
    // a seta: aponta a letra que falta mais perto; no nível 2, também o bloco invisível
    H.tp(204, 15, 999); H.step(2);
    S.heart.compass = 1; const t1 = City.compassTarget(); out.t1 = t1 && t1.k;
    S.heart.compass = 2; const t2 = City.compassTarget(); out.t2 = t2 && t2.k;
    return out;
  });
  expect(r.near === 'citymap' && r.state === 'citymap', `↑ abre o mapa (${r.near}/${r.state})`);
  expect(r.svg && r.between, 'o desenho do mapa e a palavra nova BETWEEN no Grimório');
  expect(r.c1 === 1 && r.c2 === 2 && r.c3 === 2, `bússola: leitura 1, acerto 2, erro guarda 2 (${r.c1}/${r.c2}/${r.c3})`);
  expect(/climb ends/.test(r.ev) && r.done, `errar encerra a escalada (${r.ev})`);
  expect(r.scene && r.after, `a cena da bússola (chuva parada) e o fim (${r.scene}/${r.after})`);
  expect(r.t1 === 'letter' && r.t2 === 'secret', `a seta (${r.t1}/${r.t2})`);
}, L13);

/* ---------------- 1-3, a segunda metade: poderes, lasers, drones, o abismo e o Sentinela ---------------- */
test('1-3 poderes: o LASER sai do bloco e vem até o Nexy; F atira, segurar carrega o tiro forte; machucado perde o poder e não a vida; o bloco volta a encher; sem laser, F é o tiro da Echo', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, S = NEXY.Save.data, out = {};
    H.noEnemies(); S.met.laser = false;
    H12.hit(169, 15); out.block = H.block(169, 12); H.step(90); UI.frame();
    out.got = P.power; out.hud = document.getElementById('powername').textContent;
    out.word = !!S.grimoire.words.LASER && G.wordsSeen.has('LASER') && S.met.laser;
    H.step(60 * 6); out.refill = H.block(169, 12);
    // o tiro comum derruba o Rastejante
    H.tp(176, 15, 999); const cr = NEXY.Ents.spawn('crawler', { x: 181 * 32, y: 15 * 32 + 8, opts: {} });
    P.facing = 1; G.onKey({ code: 'KeyF' }); out.bolt = Power.bolts.length === 1; H.step(40); out.crawler = cr.state;
    // segurar carrega; soltar dispara o tiro forte
    H.set(['shoot']); H.step(50); out.charged = Power.charged; H.set([]); H.step(1); out.big = Power.bolts.some(b => b.big);
    // machucado: perde o poder, não a vida
    H.step(30); P.invuln = 0; P.hurt(); out.hurt = [P.power, P.dead, P.invuln > 0].join();
    // sem o laser, F é o tiro da Echo (quando ela tem o tiro)
    S.shot.best = 0; EchoShot.refill(); const n0 = EchoShot.bolts.length; G.onKey({ code: 'KeyF' }); out.echo = EchoShot.bolts.length === n0 + 1; S.shot.best = -1;
    return out;
  });
  expect(r.block === 'used' && r.got === 'laser' && r.hud === 'LASER' && r.word, `o LASER vem até o Nexy, no HUD e no Grimório (${JSON.stringify(r)})`);
  expect(r.refill === 'ready', `o bloco volta a encher (${r.refill})`);
  expect(r.bolt && r.crawler === 'dying', `F atira e o Rastejante cai (${r.crawler})`);
  expect(r.charged && r.big, 'segurar carrega e soltar dispara o tiro forte');
  expect(r.hurt === ',false,true', `o golpe leva o poder, não a vida (${r.hurt})`);
  expect(r.echo, 'sem o laser, F continua sendo o tiro da Echo');
}, L13);

test('1-3 beco dos lasers: o feixe fecha o corredor (pega até pulando); UNDER THE LASER só confunde (com dica); IN FRONT OF THE LASER: a caixa leva o tiro e o corredor se atravessa andando', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, W = NEXY.World, out = {};
    H.noEnemies();
    const bm = NEXY.Ents.list.find(e => e.type === 'beam' && e.dir === 'left');
    // pulando embaixo da marquise o feixe pega em todo quadro
    H.tp(232, 15, 999); H.step(3); let always = true; H.set(['jump']); H.press('jump');
    for (let i = 0; i < 40; i++) { H.step(1); if (!overlap(Ents.types.beam.rect(bm), P)) always = false; } H.set([]); out.always = always;
    H.tp(230, 15, 0); P.invuln = 0; H.step(5); out.hurt = P.dead || P.invuln > 0;
    NEXY.give('IN FRONT OF', 'LASER', 'UNDER');
    out.tip = await H13.say(222, 15, ['UNDER', 'LASER']);
    await H12.panel(222, 15, ['IN FRONT OF', 'LASER']); H.step(120);
    out.box = W.targets.box4.state; out.off = !Ents.types.beam.rect(bm);
    H.tp(224, 15, 0); P.invuln = 0; H13.walk('right', 600, () => P.x > 244 * 32);
    out.crossed = !P.dead && P.invuln <= 0 && P.x > 244 * 32;
    return out;
  });
  expect(r.always && r.hurt, `o feixe pega pulando e machuca (${JSON.stringify(r)})`);
  expect(/floor/.test(r.tip), `UNDER THE LASER: a Echo explica (${r.tip})`);
  expect(r.box === 'front' && r.off && r.crossed, `a caixa na frente do laser e o corredor atravessado andando (${JSON.stringify(r)})`);
}, L13);

test('1-3 beco, outro caminho: de cima do poste o feixe não pega e o LASER quebra o emissor; depois o corredor fica livre', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(() => {
    const P = NEXY.P, out = {};
    H.noEnemies(); H.tp(225, 15, 0); Power.give('laser'); P.invuln = 0; P.x = 226 * 32 - P.w - 1; P.px = P.x; H.step(2);
    H13.hop('right', 10, () => P.onGround && Math.round(P.y + P.h) === 480); H.set([]); H.step(10);
    out.onPost = P.onGround && Math.round(P.y + P.h) === 480 && P.invuln <= 0;
    const bm = NEXY.Ents.list.find(e => e.type === 'beam' && e.dir === 'left');
    P.facing = 1; for (let i = 0; i < 900 && !bm.broken; i++) { if (i % 12 === 0) Power.press(); H.step(1); }
    out.broken = !!bm.broken && !Ents.types.beam.rect(bm); out.safe = P.invuln <= 0 && P.power === 'laser';
    H13.walk('right', 600, () => P.x > 244 * 32);
    out.crossed = !P.dead && P.invuln <= 0 && P.x > 244 * 32;
    return out;
  });
  expect(r.onPost && r.broken && r.safe, `do poste, sem se machucar, o emissor quebra (${JSON.stringify(r)})`);
  expect(r.crossed, 'o corredor fica livre');
}, L13);

test('1-3 portões de laser: ligam e desligam (pisca antes); esperando, passa sem se machucar; a STAR escondida (segredo) deixa passar direto', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, out = {};
    H.noEnemies(); H.tp(248, 15, 0);
    const gs = NEXY.Ents.list.filter(e => e.type === 'beam' && e.dir === 'down').sort((a, b) => a.x - b.x);
    let warned = false; for (let i = 0; i < 400; i++) { H.step(1); if (gs[0].warn) warned = true; if (warned && gs[0].on) break; } out.warn = warned;
    H13.off(gs[0]); H13.walk('right', 120, () => P.x > 252 * 32 + 6); H13.walk('right', 120, () => P.x + P.w > 256 * 32 + 20);
    H13.off(gs[1]); H13.walk('right', 120, () => P.x > 258 * 32 + 6);
    out.wait = !P.dead && P.invuln <= 0 && P.x > 258 * 32 && !!Hints.done.gates;
    // a estrela: bloco invisível (segredo) antes dos portões
    H12.hit(248, 15); H.step(90); out.star = P.starT > 0 && G.secrets.has('city-star');
    H.tp(249, 15, 0); P.starT = 9; P.invuln = 0; let hit = false; H.set(['right']);
    for (let i = 0; i < 200 && P.x < 259 * 32; i++) { H.step(1); if (gs.some(g => Ents.types.beam.rect(g) && overlap(Ents.types.beam.rect(g), P))) hit = true; }
    H.set([]); out.through = hit && !P.dead && P.invuln <= 0;
    return out;
  });
  expect(r.warn, 'o portão pisca antes de ligar');
  expect(r.wait, `esperando o portão apagar, passa sem dano (${JSON.stringify(r)})`);
  expect(r.star && r.through, `a STAR escondida: atravessa o laser ligado sem dano (${JSON.stringify(r)})`);
}, L13);

test('1-3 drone: mira (linha) e atira; o tiro machuca (leva o poder); pisão derruba; o LASER derruba; entra no Grimório', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, out = {};
    H.wakeSpawns(); H.tp(177, 15, 0); P.power = 'laser'; P.invuln = 0;
    const d = () => NEXY.Ents.list.find(e => e.type === 'drone' && !e.dead && Math.abs(e.x - 180 * 32) < 6 * 32);
    let aimed = false, fired = false;
    for (let i = 0; i < 400 && P.power; i++) { H.set([]); H.step(1); const e = d(); if (e && e.state === 'aim') aimed = true; if (EnemyFire.list.length) fired = true; }
    out.aimed = aimed; out.fired = fired; out.cost = P.power === null && !P.dead;
    // pisão
    const e = d(); P.invuln = 999; P.x = e.x + e.w / 2 - P.w / 2; P.y = e.y - P.h - 16; P.px = P.x; P.py = P.y; P.vy = 300; P.vx = 0;
    for (let i = 0; i < 20 && e.state !== 'dying'; i++) H.step(1); out.stomp = e.state;
    // o laser (um drone na altura do tiro)
    H.tp(186, 15, 999); Power.give('laser'); P.facing = 1;
    const e2 = NEXY.Ents.spawn('drone', { x: P.cx + 150, y: P.y + 10, opts: {} }); H.step(1); Power.press(); H.step(30); out.laser = e2.state;
    out.grim = G.creatures.has('DRONE');
    return out;
  });
  expect(r.aimed && r.fired && r.cost, `mira, atira e o tiro leva o poder (${JSON.stringify(r)})`);
  expect(r.stomp === 'dying' && r.laser === 'dying' && r.grim, `pisão e laser derrubam; Grimório (${JSON.stringify(r)})`);
}, L13);

test('1-3 abismo: sem caixa nem asas não se passa; NEXT TO dá dica; BETWEEN THE SIGN AND THE WALL põe a caixa no meio e se passa andando; outro caminho: WINGS + ventilador; planando se chega na sacada solta da antena', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, W = NEXY.World, out = {};
    H.noEnemies();
    const top = () => P.onGround && !P.dead && Math.round(P.y + P.h) === 352;
    // pulo correndo da beirada: cai
    H.tp(278, 15, 0); P.invuln = 0; H.set(['right', 'run']); for (let i = 0; i < 200 && !P.dead && P.x < 284 * 32 + 8; i++) H.step(1);
    H.set(['right', 'run', 'jump']); H.press('jump'); for (let i = 0; i < 200 && !P.dead; i++) H.step(1); H.set([]); out.noWay = P.dead;
    NEXY.give('BETWEEN', 'SIGN', 'WALL', 'NEXT TO');
    out.tipNext = await H13.say(278, 15, ['NEXT TO', 'SIGN', 'WALL']);
    out.tipTwo = await H13.say(278, 15, ['BETWEEN', 'SIGN', 'NEXT TO']);
    await H12.panel(278, 15, ['BETWEEN', 'WALL', 'SIGN']); H.step(120); out.box = W.targets.box5.state;
    H.tp(283, 15, 0); P.invuln = 0; H13.walk('right', 400, top); out.between = top();
    // outro caminho: asas + ventilador (a caixa de volta no muro)
    W.targets.box5.state = 'between'; City.moveBox('box5', 'on-wall'); H.step(120);
    H.tp(283, 15, 999); Power.give('wings'); H13.walk('right', 20, () => P.x > 284 * 32 - 4); H.set([]); H.step(30);
    H.set(['jump']); H.press('jump'); let minY = 1e9; for (let i = 0; i < 160; i++) { H.step(1); minY = Math.min(minY, P.y); }
    out.lift = minY < 6 * 32;
    H.set(['jump', 'right']); for (let i = 0; i < 400 && !P.onGround && !P.dead; i++) H.step(1); H.set([]); out.vent = top() && !!Hints.done.vent;
    // sem asas o vento não levanta
    H.tp(284, 15, 999); P.power = null; H.set(['jump']); H.press('jump'); let min2 = 1e9; for (let i = 0; i < 80; i++) { H.step(1); min2 = Math.min(min2, P.y); } H.set([]); out.noLift = min2 > 10 * 32;
    // a antena: do alto (sacada L2), planando até a sacada solta (L6)
    const ledge = () => P.onGround && Math.round(P.y + P.h) === 192 && P.x > 316 * 32;
    H.tp(301, 1, 999); Power.give('wings'); H.set(['right', 'jump']); H.press('jump'); for (let i = 0; i < 600 && !P.onGround || i < 5; i++) H.step(1); H.set([]); out.glide = ledge();
    H.tp(301, 1, 999); P.power = null; H.set(['right', 'run']); H.step(6); H.set(['right', 'run', 'jump']); H.press('jump'); for (let i = 0; i < 300 && (!P.onGround || i < 5); i++) H.step(1); H.set([]); out.noGlide = !ledge();
    return out;
  });
  expect(r.noWay, 'sem caixa nem asas, o pulo correndo cai no abismo');
  expect(/one thing/.test(r.tipNext) && /sign and the wall/.test(r.tipTwo), `as dicas (${r.tipNext} / ${r.tipTwo})`);
  expect(r.box === 'between' && r.between, `a caixa entre a placa e o muro: passa andando (${JSON.stringify(r)})`);
  expect(r.lift && r.vent && r.noLift, `asas + ventilador levam ao prédio da antena; sem asas o vento não levanta (${JSON.stringify(r)})`);
  expect(r.glide && r.noGlide, `a sacada solta: planando sim, pulando não (${JSON.stringify(r)})`);
}, L13);

test('1-3 Sentinela: acorda quando o Nexy entra; o terminal só aceita o lugar desta rodada (erro com dica); UNDER, BEHIND, NEXT TO abrem o núcleo; a cena da queda; o portão afunda e a saída fecha a fase', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(async () => {
    const P = NEXY.P, G = NEXY.Game, W = NEXY.World, out = { log: [] };
    H.noEnemies(); NEXY.give('UNDER', 'BEHIND', 'NEXT TO');
    const S = NEXY.Ents.list.find(e => e.type === 'sentinel');
    H.tp(334, 15, 999); H.step(30); out.sleep = S.state;
    H.tp(341, 15, 999); for (let i = 0; i < 200 && S.state !== 'fight'; i++) H.step(1); out.awake = S.state === 'fight' && G.creatures.has('SENTINEL') && G.wordsSeen.has('SHIELD');
    // o Nexy atira do lado do núcleo (do lado direito quando ele está NEXT TO)
    const shoot = () => { Power.give('laser'); for (let i = 0; i < 60 * 8; i++) { const c = Sentinel.corePos(S), right = S.core.x > 40; if (Sentinel.exposed(S) && i % 3 === 0) { P.x = (right ? c.x + 128 : c.x - 160) - P.w / 2; P.y = 16 * 32 - P.h; P.vx = 0; P.vy = 0; P.facing = right ? -1 : 1; P.px = P.x; P.py = P.y; } if (i % 10 === 0) Power.press(); H.step(1); P.invuln = 999; if (SentinelScene.active || S.state === 'rise') return true; } return false; };
    for (let round = 0; round < 3; round++) {
      const where = Sentinel.where(S), wrong = where === 'UNDER' ? 'BEHIND' : 'UNDER';
      const tip = await H13.say(335, 15, [wrong]); const st = S.state;
      await H12.panel(335, 15, [where]); out.log.push(`${where}: erro ${wrong}→${st}/${tip}; certo→${S.state}`);
      out.log.push('rodada ' + round + ' ' + shoot());
      for (let i = 0; i < 120 && S.state === 'rise'; i++) H.step(1);
    }
    out.scene = SentinelScene.active && G.state === 'cinematic';
    for (let i = 0; i < 60 * 16 && SentinelScene.active; i++) SentinelScene.update(1 / 60);
    out.after = !SentinelScene.active && G.state === 'play' && S.state === 'dead' && NEXY.Save.data.met.sentinel;
    H.step(120); out.gate = W.targets.bossgate.state === 'small' && !W.targets.bossgate.cur.h;
    H.tp(368, 15, 0); H.set(['right']); for (let i = 0; i < 900 && G.state === 'play'; i++) H.step(1); H.set([]);
    out.finish = G.state === 'clearing' && G.exit === 'normal';
    return out;
  });
  expect(r.sleep === 'sleep' && r.awake, `dorme até o Nexy entrar; acorda e entra no Grimório (${JSON.stringify(r)})`);
  expect(r.log.filter(l => /certo→open/.test(l) && /erro \w+( TO)?→fight\/Look again!/.test(l)).length === 3, `cada rodada: erro com dica, certo abre (${r.log.join(' | ')})`);
  expect(r.log.filter(l => /rodada \d true/.test(l)).length === 3, `3 rodadas vencidas (${r.log.join(' | ')})`);
  expect(r.scene && r.after && r.gate && r.finish, `a cena, o portão e a saída (${JSON.stringify(r)})`);
}, L13);

test('1-3 Sentinela sem inglês: ele superaquece e abre sozinho; a rodada fica guardada se o Nexy morrer; dá para vencer só atirando', async ({ page }) => {
  await page.evaluate(HELP12); await page.evaluate(HELP13);
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, out = {};
    H.noEnemies();
    const S = NEXY.Ents.list.find(e => e.type === 'sentinel');
    H.tp(341, 15, 999); for (let i = 0; i < 200 && S.state !== 'fight'; i++) H.step(1);
    const shoot = (frames, until) => { Power.give('laser'); for (let i = 0; i < frames; i++) { const c = Sentinel.corePos(S), right = S.core.x > 40; if (Sentinel.exposed(S) && i % 3 === 0) { P.x = (right ? c.x + 128 : c.x - 160) - P.w / 2; P.y = 16 * 32 - P.h; P.vx = 0; P.vy = 0; P.facing = right ? -1 : 1; P.px = P.x; P.py = P.y; } if (i % 10 === 0) Power.press(); H.step(1); P.invuln = 999; if (until()) return true; } return false; };
    const t0 = G.simTime; let heated = false;
    shoot(60 * 60, () => { if (S.state === 'heat') heated = true; return S.round >= 1; });
    out.heated = heated; out.round1 = S.round === 1;
    // morreu: o Sentinela volta a dormir, mas a rodada fica
    Power.respawn(); out.kept = S.state === 'sleep' && S.round === 1;
    H.tp(341, 15, 999); for (let i = 0; i < 200 && S.state !== 'fight'; i++) H.step(1);
    out.won = shoot(60 * 150, () => SentinelScene.active); out.time = Math.round(G.simTime - t0);
    return out;
  });
  expect(r.heated && r.round1, `superaquece e abre; dá para tirar a vida só atirando (${JSON.stringify(r)})`);
  expect(r.kept, 'morrer não apaga a rodada');
  expect(r.won, `vence sem o terminal (${r.time} s)`);
}, L13);

test('visual novo do Nexy: rascunho na 1ª partida, evolui com as fases (aviso no mapa uma vez), CLASSIC NEXY volta ao antigo; a física não muda', async ({ page }) => {
  const r = await page.evaluate(() => {
    const P = NEXY.P, G = NEXY.Game, S = NEXY.Save.data, out = {};
    H.noEnemies(); H.tp(20, 19);
    // desenha o Nexy num quadro limpo e conta os pixels acesos em volta dele
    const lit = () => { G.render(1); const c = document.getElementById('game'), k = c.width / 960, x = c.getContext('2d');
      const d = x.getImageData(Math.round((P.x - NEXY.Cam.x - 30) * k), Math.round((P.y - NEXY.Cam.y - 20) * k), Math.round(80 * k), Math.round(70 * k)).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 2] > 300) n++; return n; };
    let calls = 0; const draw = NexyLook.draw; NexyLook.draw = function (...a) { calls++; return draw.apply(this, a); };
    out.stage0 = NexyLook.stage; out.lit0 = lit(); out.calls = calls;
    S.assist.classic = true; calls = 0; out.litClassic = lit(); out.callsClassic = calls; S.assist.classic = false;
    S.cleared = { '1-1': true, '1-2': true }; S.met.look = 0; G.toMap(); out.stageMap = NexyLook.stage; out.met = S.met.look;
    G.toMap(); out.metAgain = S.met.look;
    G.enterLevel('palace'); out.stagePalace = NexyLook.stage;
    // pulo igual ao de antes (só desenho mudou)
    H.noEnemies(); H.tp(4, 19); H.set([]); H.step(5); const y0 = P.y + P.h; let min = y0; H.set(['jump']); H.press('jump');
    for (let i = 0; i < 80; i++) { H.step(1); min = Math.min(min, P.y + P.h); } H.set([]);
    out.jump = Math.round(y0 - min);
    NexyLook.draw = draw;
    return out;
  });
  expect(r.stage0 === 0 && r.calls > 0 && r.lit0 > 40, `rascunho de neon na 1ª partida (${JSON.stringify(r)})`);
  expect(r.callsClassic === 0 && r.litClassic > 40, 'CLASSIC NEXY desenha o antigo');
  expect(r.stageMap === 2 && r.met === 2 && r.metAgain === 2 && r.stagePalace === 2, `evolui com as fases concluídas (${JSON.stringify(r)})`);
  expect(Math.abs(r.jump - 123) <= 6, `o pulo continua o mesmo (${r.jump})`);
});

/* ---------------- vozes gravadas (ElevenLabs) ---------------- */
test('vozes: todas as falas gravadas tocam; a porta repete palavra por palavra; a voz do aparelho fica de reserva', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const ks = Object.keys(VoiceClips.pack.clips);
    const bufs = await Promise.all(ks.map(k => VoiceClips.load(k)));
    const bad = ks.filter((k, i) => !bufs[i] || bufs[i].duration < 0.15 || bufs[i].duration > 12);
    const keys = p => p && p.map(x => x.k);
    const page1 = VoiceClips.pack.clips['story:nexy is small the city is dark nobody says hello'];
    Voice.say('Hello! I am Echo. I am your friend.', 'echo');
    await new Promise(res => setTimeout(res, 300));
    const playing = VoiceClips.sources.length > 0 && Voice.speaking;
    Voice.stop();
    return {
      n: ks.length, bad, studio: Voice.studio, label: Voice.label(Voice.current()), playing, stopped: !Voice.speaking && !VoiceClips.sources.length,
      exact: keys(VoiceClips.plan('door', 'It is a key.')),
      words: keys(VoiceClips.plan('door', 'Nexy is friend.')),
      cross: keys(VoiceClips.plan('story', 'New path!')),
      none: VoiceClips.plan('echo', 'This sentence was never recorded.'),
      kara: page1 && page1[1].length,
    };
  });
  expect(r.n >= 213 && !r.bad.length, `${r.n} falas, com problema: ${r.bad.join(', ')}`);
  expect(r.studio && /Lulu/.test(r.label), `a voz padrão é a gravada (${r.label})`);
  expect(r.playing && r.stopped, 'Voice.say toca a gravação e Voice.stop para');
  expect(r.exact && r.exact.join() === 'door:it is a key', `frase gravada inteira (${r.exact})`);
  expect(r.words && r.words.join() === 'door:nexy,door:is,door:friend', `frase nova: palavra por palavra (${r.words})`);
  expect(r.cross && r.cross.join() === 'echo:new path', `sem a fala nessa voz, usa outra gravada (${r.cross})`);
  expect(r.none === null, 'sem gravação nenhuma: voz do aparelho');
  expect(r.kara === 10, `karaokê: uma marca por palavra na leitura do Baú (${r.kara})`);
});

test('vozes: uma de cada vez; a seguinte espera a anterior terminar; um botão do jogador corta e esvazia a fila', async ({ page }) => {
  const r = await page.evaluate(async () => {
    Voice.stop();
    const ev = [], at = () => performance.now();
    Voice.say('Big or small?', 'door', { onStart: () => ev.push(['door+', at()]), onEnd: () => ev.push(['door-', at()]) });
    Voice.say('It is dark.', 'echo', { onStart: () => ev.push(['echo+', at()]), onEnd: () => ev.push(['echo-', at()]) });
    Voice.say('It is dark.', 'echo');   // a mesma fala de novo: não repete
    const queued = Voice.queue.length, first = Voice.cur;
    for (let i = 0; i < 60 && !ev.some(e => e[0] === 'echo-'); i++) await new Promise(res => setTimeout(res, 100));
    const t = k => (ev.find(e => e[0] === k) || [])[1];
    const order = ev.map(e => e[0]).join(' ');
    // corte: o jogador apertou um botão
    Voice.say('Hello', 'story'); Voice.say('Is', 'echo'); Voice.say('Are', 'echo');
    const before = Voice.queue.length;
    Voice.say('Small.', 'echo', { cut: true });
    const after = { q: Voice.queue.length, cur: Voice.cur };
    Voice.stop();
    return { queued, first, order, gap: t('echo+') - t('door-'), before, after };
  });
  expect(r.queued === 1 && r.first === 'door:big or small?', `a Echo esperou na fila (${JSON.stringify(r)})`);
  expect(r.order === 'door+ door- echo+ echo-' && r.gap >= 0, `a porta terminou antes da Echo começar (${r.order}, ${r.gap} ms)`);
  expect(r.before === 2 && r.after.q === 0 && r.after.cur === 'echo:small.', `o corte toca na hora (${JSON.stringify(r.after)})`);
});

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
      if (!t.opts.ownPages) ({ ctx, page, errors } = await openGame(browser, { level: t.opts.level, echo: t.opts.echo !== false }));
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
