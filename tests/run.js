#!/usr/bin/env node
// Testes de regressão: a fase 1-1 (aprovada), a 1-2 e o mapa. Rode com: node tests/run.js  [filtro opcional pelo nome]
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
  await page.evaluate(() => NEXY.Game.enterLevel('1-1'));
  await page.waitForTimeout(200);
  const mid = await page.evaluate(() => ({ arrival: Arrival.active, state: NEXY.Game.state }));
  await page.waitForTimeout(3500);
  const end = await page.evaluate(() => ({ arrival: Arrival.active, state: NEXY.Game.state, ground: NEXY.P.onGround, hidden: Echo.hidden }));
  await ctx.close();
  expect(!errors.length, errors.join('; '));
  expect(mid.arrival && mid.state === 'cinematic', `a chegada começa (${JSON.stringify(mid)})`);
  expect(!end.arrival && end.state === 'play' && end.ground && end.hidden, `termina no chão, ainda sem o Echo (${JSON.stringify(end)})`);
}, { ownPages: true });

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
