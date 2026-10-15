
/* ============================== ENTIDADES (módulos independentes) ============================== */
const Ents = {
  list: [], types: {},
  reg(name, def) { this.types[name] = def; },
  spawn(name, props = {}) {
    const def = this.types[name];
    const e = Object.assign({ type: name, x: 0, y: 0, w: 16, h: 16, vx: 0, vy: 0, t: 0, dead: false, layer: def.layer || 'mid' }, props);
    if (def.init) def.init(e);
    e.px = e.x; e.py = e.y;
    this.list.push(e);
    return e;
  },
  clear() { this.list = []; },
  save() { for (const e of this.list) { e.px = e.x; e.py = e.y; } },
  update(dt) {
    for (const e of this.list) if (!e.dead) { e.t += dt; const d = this.types[e.type]; if (d.update) d.update(e, dt); }
    this.interactions();
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].dead) { const e = this.list[i]; this.list.splice(i, 1); if (e.spawn) Spawns.onGone(e); }
  },
  draw(ctx, camX, camY, a, layer) {
    for (const e of this.list) {
      if (e.layer !== layer || e.dead && !e.keepDraw) continue;
      const x = lerp(e.px, e.x, a) - camX, y = lerp(e.py, e.y, a) - camY;
      if (x > 1040 || x + e.w < -80 || y > 640 || y < -200 && e.type !== 'reserve') continue;
      const hidden = World.veilAlphaAt(e.x + e.w / 2, e.y + e.h / 2);
      if (hidden >= 1) continue;
      if (hidden > 0) { ctx.save(); ctx.globalAlpha = 1 - hidden; }
      this.types[e.type].draw(ctx, e, x, y);
      if (hidden > 0) ctx.restore();
    }
  },
  enemies() { return this.list.filter(e => e.enemy && !e.dead && e.state !== 'dying' && e.state !== 'flat'); },
  // conchas em movimento e carregadas destroem inimigos
  interactions() {
    const en = this.enemies();
    for (const s of en) {
      if (s.type !== 'casco' || (s.state !== 'slide' && s.state !== 'held')) continue;
      for (const o of en) {
        if (o === s || o.state === 'dying' || o.state === 'flat' || s.state === 'dying' || !overlap(s, o)) continue;
        if (o.state === 'held') continue;
        Enemy.kill(o, 'pop', sign(s.vx) || P.facing);
        if (s.state === 'held' || o.state === 'slide') { P.dropHeld(); Enemy.kill(s, 'pop', -P.facing); }
      }
      for (const l of this.list) if (l.type === 'lantern' && !l.dead && overlap(s, l)) Ents.types.lantern.smash(l);
    }
  },
  bumpFrom(c, r) {
    const box = { x: c * TS, y: r * TS - 6, w: TS, h: 8 };
    for (const e of this.enemies()) if (overlap(e, box)) { Enemy.kill(e, 'pop', sign(e.x + e.w / 2 - (c * TS + 16)) || 1); }
    for (const e of this.list) if ((e.type === 'orb') && !e.dead && !e.homing && overlap(e, box)) Game.addOrbs(1, e), e.dead = true;
  },
};

/* ---------- Spawns de inimigos (reativação, renascimento, despawn) ---------- */
const Spawns = {
  update(dt) {
    const L = Cam.x, Rr = Cam.x + CFG.VIEW_W;
    for (const s of World.spawns) {
      const sx = s.c * TS + TS / 2, vis = sx > L - 40 && sx < Rr + 40;
      if (s.state === 'waiting') { if (vis && !s.wasVis) this.make(s); }
      else if (s.state === 'summon') {
        s.timer -= dt;
        if (s.timer <= 0 && Math.abs(P.cx - sx) > TS * 3) { this.make(s); SFX.summon(); FX.burst(sx, (s.r + 1) * TS - 12, 20, 'c', 120, { g: -50, life: 0.8 }); }
      } else if (s.state === 'hidden') { if (!vis) this.make(s); }
      else if (s.state === 'alive' && s.ent && s.opts.zone && s.ent.state !== 'held') {
        const e = s.ent, z = s.opts.zone, cx = e.x + e.w / 2;
        if (cx < z[0] * TS || cx > (z[1] + 1) * TS || e.y > World.pxH) { e.spawn = null; s.ent = null; s.state = 'hidden'; }
      }
      s.wasVis = vis;
    }
    // despawn de inimigos muito longe da câmera
    for (const e of Ents.list) {
      if (!e.enemy || e.dead || e.state === 'held') continue;
      const cx = e.x + e.w / 2;
      if (cx < L - 640 || cx > Rr + 640) { e.dead = true; e.despawned = true; }
      if (e.y > World.pxH + 64) { e.dead = true; e.fell = true; }
    }
  },
  make(s) {
    const o = s.opts, e = Ents.spawn(s.type, { x: s.c * TS + TS / 2, y: (s.r + 1) * TS, opts: o, spawn: s });
    e.x -= e.w / 2; e.y -= e.h; e.px = e.x; e.py = e.y;
    if (o.zone) e.dir = 1;
    s.ent = e; s.state = 'alive';
  },
  onGone(e) {
    const s = e.spawn; if (!s || s.ent !== e) return;
    s.ent = null;
    if (e.despawned) { s.state = 'waiting'; s.wasVis = true; return; }
    const pol = s.opts.respawn;
    if (pol === 'summon') { s.state = 'summon'; s.timer = 2.4; }
    else if (pol === 'offscreen') s.state = 'hidden';
    else s.state = 'consumed';
  },
  reset() {
    Ents.list = Ents.list.filter(e => !e.enemy);
    for (const s of World.spawns) { s.state = 'waiting'; s.ent = null; s.wasVis = false; s.timer = 0; }
  },
};

/* ---------- Comportamento comum de inimigos ---------- */
const Enemy = {
  walk(e, dt, speed, turnAtEdges) {
    if (e.onGround && turnAtEdges) {
      const ax = e.dir > 0 ? e.x + e.w + 2 : e.x - 2, c = Math.floor(ax / TS), r = Math.floor((e.y + e.h + 2) / TS);
      if (!World.isFloor(c, r)) e.dir = -e.dir;
    }
    const z = e.opts && e.opts.zone;
    if (z) { if (e.x < z[0] * TS && e.dir < 0) e.dir = 1; if (e.x + e.w > (z[1] + 1) * TS && e.dir > 0) e.dir = -1; }
    e.vx = e.dir * speed;
    this.physics(e, dt);
    if (e.res.wall) e.dir = -e.res.wall;
  },
  physics(e, dt, grav = CFG.ENEMY_GRAVITY) {
    e.vy = Math.min(e.vy + grav * dt, CFG.MAX_FALL);
    e.res = World.move(e, e.vx * dt, e.vy * dt);
    if (e.res.floor) { e.vy = 0; e.onGround = true; } else e.onGround = false;
    if (e.res.ceil && e.vy < 0) e.vy = 0;
  },
  kill(e, how, dir = 1) {
    if (e.state === 'dying' || e.state === 'flat') return;
    if (e.state === 'held') P.dropHeld(true);
    Game.registerCreature(e.type === 'crawler' ? 'CRAWLER' : 'SHELL');
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (how === 'flat') {
      e.state = 'flat'; e.flatT = 0.45; e.y += e.h - 8; e.h = 8; e.vx = 0;
    } else {
      e.state = 'dying'; e.vy = -420; e.vx = dir * 120; e.spinA = 0; SFX.pop();
      FX.burst(cx, cy, 16, 'c', 200, { life: 0.6 });
    }
    e.killed = true;
  },
  dyingUpdate(e, dt) {
    e.vy += 1800 * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.spinA = (e.spinA || 0) + dt * 10;
    if (e.y > Cam.y + CFG.VIEW_H + 80) e.dead = true;
  },
  // luz de recorte: halo ciano atrás da silhueta escura, para o inimigo saltar do fundo
  rim(cx, cy, size, a = 1) { R.draw(R.glow('c', 32), cx, cy, size / 22, 0.3 * LOOK.rim * a, true); },
  core(ctx, x, y, s, a) {
    R.draw(R.glow('c', 14), x, y, s, 0.8 * a, true);
    ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(x, y - 3.6 * s); ctx.lineTo(x + 2.6 * s, y); ctx.lineTo(x, y + 3.6 * s); ctx.lineTo(x - 2.6 * s, y); ctx.closePath();
    ctx.fillStyle = '#22d3ee'; ctx.fill(); ctx.restore();
  },
};

/* ---------- RASTEJANTE (CRAWLER) ---------- */
Ents.reg('crawler', {
  layer: 'enemy',
  init(e) { e.w = 26; e.h = 24; e.dir = -1; e.enemy = true; e.kind = 'enemy'; e.state = 'walk'; e.asleep = !!(e.opts && e.opts.wake); e.onGround = false; e.res = {}; },
  update(e, dt) {
    if (e.state === 'flat') { e.flatT -= dt; if (e.flatT <= 0) { e.dead = true; FX.burst(e.x + e.w / 2, e.y + 2, 14, 'c', 140, { g: -60, life: 0.7 }); } return; }
    if (e.state === 'dying') return Enemy.dyingUpdate(e, dt);
    if (e.asleep) {
      Enemy.physics(e, dt);
      if (Math.abs(P.cx - (e.x + e.w / 2)) < e.opts.wake * TS) e.asleep = false;
      return;
    }
    Enemy.walk(e, dt, CFG.CRAWLER_SPEED, !!(e.opts && e.opts.patrol));
  },
  draw(ctx, e, x, y) {
    const w = e.w, t = e.t;
    if (e.state === 'flat') {
      ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + 3, y + 1); ctx.lineTo(x + w - 3, y + 1); ctx.lineTo(x + w, y + 8); ctx.closePath();
      ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.lineWidth = 1; ctx.stroke();
      Enemy.core(ctx, x + w / 2, y + 4, 0.7, e.flatT / 0.45);
      return;
    }
    Enemy.rim(x + w / 2, y + e.h * 0.55, w);
    ctx.save();
    if (e.state === 'dying') { ctx.translate(x + w / 2, y + e.h / 2); ctx.rotate(e.spinA); ctx.translate(-x - w / 2, -y - e.h / 2); }
    const h = e.h, step = e.asleep ? 0 : Math.sin(t * 14) * 2;
    // pernas angulares
    ctx.strokeStyle = wa(0.2); ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(x + 6, y + h - 6); ctx.lineTo(x + 3 + step, y + h); ctx.moveTo(x + w / 2, y + h - 5); ctx.lineTo(x + w / 2 - step, y + h);
    ctx.moveTo(x + w - 6, y + h - 6); ctx.lineTo(x + w - 3 + step, y + h); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 2, y + h - 4); ctx.lineTo(x, y + h * 0.55); ctx.lineTo(x + 6, y + h * 0.2); ctx.lineTo(x + w * 0.5, y + 1);
    ctx.lineTo(x + w - 6, y + h * 0.2); ctx.lineTo(x + w, y + h * 0.55); ctx.lineTo(x + w - 2, y + h - 4); ctx.closePath();
    ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y + h * 0.55); ctx.lineTo(x + w * 0.5, y + h * 0.36); ctx.lineTo(x + w - 6, y + h * 0.55);
    ctx.strokeStyle = wa(0.07); ctx.stroke();
    const p = 0.7 + 0.3 * Math.sin(t * 5);
    Enemy.core(ctx, x + w / 2 + e.dir * 3, y + h * 0.56, 1, p);
    ctx.restore();
  },
});

/* ---------- CASCO (SHELL) ---------- */
Ents.reg('casco', {
  layer: 'enemy',
  init(e) { e.w = 26; e.h = 34; e.dir = -1; e.enemy = true; e.kind = 'shell'; e.state = 'walk'; e.onGround = false; e.res = {}; e.immune = 0; },
  toShell(e) { if (e.state === 'walk') { e.y += e.h - 22; e.h = 22; } e.state = 'shell'; e.vx = 0; },
  update(e, dt) {
    if (e.state === 'dying') return Enemy.dyingUpdate(e, dt);
    if (e.immune > 0) e.immune -= dt;
    if (e.state === 'held') return;
    if (e.state === 'walk') { Enemy.walk(e, dt, CFG.CASCO_SPEED, true); return; }
    if (e.state === 'shell') {
      e.vx = approach(e.vx, 0, (e.onGround ? 1400 : 200) * dt);
      const goingUp = e.vy < 0;
      Enemy.physics(e, dt, CFG.SHELL_GRAVITY);
      if (goingUp && e.res.ceil) {
        let best = null, bd = 1e9;
        for (const [c, r] of e.res.ceilTiles) { const d = Math.abs(c * TS + 16 - (e.x + e.w / 2)); if (d < bd) { bd = d; best = [c, r]; } }
        if (best) World.hitFromBelow(best[0], best[1], 'shell');
        e.vy = 80;
      }
      if (e.res.wall) e.vx = 0;
      return;
    }
    if (e.state === 'slide') {
      e.vx = e.dir * CFG.SHELL_SPEED;
      Enemy.physics(e, dt, CFG.SHELL_GRAVITY);
      if (e.res.wall) {
        for (const [c, r] of e.res.wallTiles) World.hitFromSide(c, r);
        e.dir = -e.res.wall; SFX.thud(); Game.shake(1.5);
        FX.burst(e.res.wall > 0 ? e.x + e.w : e.x, e.y + e.h / 2, 6, 'c', 120, { life: 0.3 });
      }
    }
  },
  kick(e, dir) { e.state = 'slide'; e.dir = dir; e.vx = dir * CFG.SHELL_SPEED; e.immune = 0.22; SFX.kick(); FX.burst(e.x + e.w / 2, e.y + e.h / 2, 8, 'm', 140, { life: 0.3 }); },
  draw(ctx, e, x, y) {
    const w = e.w, t = e.t;
    Enemy.rim(x + w / 2, y + e.h * 0.5, w + 4, e.state === 'shell' ? 0.7 : 1);
    ctx.save();
    if (e.state === 'dying') { ctx.translate(x + w / 2, y + e.h / 2); ctx.rotate(e.spinA); ctx.translate(-x - w / 2, -y - e.h / 2); }
    if (e.state === 'walk') {
      const h = e.h, f = e.dir, step = Math.sin(t * 10) * 2.5;
      ctx.strokeStyle = wa(0.2); ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(x + 8, y + h - 7); ctx.lineTo(x + 6 + step, y + h); ctx.moveTo(x + w - 8, y + h - 7); ctx.lineTo(x + w - 6 - step, y + h); ctx.stroke();
      // cabeça angular
      const hx = f > 0 ? x + w - 3 : x + 3;
      ctx.beginPath(); ctx.moveTo(hx, y + 8); ctx.lineTo(hx + f * 7, y + 12); ctx.lineTo(hx + f * 5, y + 20); ctx.lineTo(hx - f * 2, y + 18); ctx.closePath();
      ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = ca(0.85); ctx.fillRect(hx + f * 3 - 1, y + 12, 2, 2);
      this.shellShape(ctx, x, y + 6, w, 22, t, 1);
    } else {
      this.shellShape(ctx, x, y, w, e.h, t, e.state === 'slide' ? 1 : 0.45, e.state === 'slide');
    }
    ctx.restore();
  },
  shellShape(ctx, x, y, w, h, t, glow, spinning) {
    ctx.beginPath();
    ctx.moveTo(x + 1, y + h - 3); ctx.lineTo(x, y + h * 0.5); ctx.lineTo(x + w * 0.22, y + 2); ctx.lineTo(x + w * 0.78, y + 2); ctx.lineTo(x + w, y + h * 0.5); ctx.lineTo(x + w - 1, y + h - 3); ctx.closePath();
    ctx.fillStyle = '#0a0508'; ctx.fill();
    ctx.fillStyle = wa(0.03); ctx.fill();
    ctx.strokeStyle = wa(0.3); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 3, y + h - 3); ctx.lineTo(x + w - 3, y + h - 3); ctx.strokeStyle = wa(0.1); ctx.stroke();
    if (spinning) {
      const ph = (t * 18) % 1;
      ctx.beginPath(); ctx.moveTo(x + w * ph, y + 3); ctx.lineTo(x + w * ph - 4, y + h - 3); ctx.strokeStyle = wa(0.25); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + 4); ctx.lineTo(x + w * 0.5, y + h * 0.42); ctx.lineTo(x + w * 0.7, y + 4); ctx.strokeStyle = wa(0.08); ctx.stroke();
    }
    Enemy.core(ctx, x + w / 2, y + h * 0.56, 0.9, glow * (0.7 + 0.3 * Math.sin(t * 5)));
  },
});

/* ---------- ORBE ---------- */
function orbSprite(big) {
  const r = big ? 13 : 8;
  return R.sprite('orb' + r, 64, 64, x => {
    const c = 32;
    const g = x.createRadialGradient(c, c, 0, c, c, 30);
    g.addColorStop(0, 'rgba(232,121,249,0.55)'); g.addColorStop(0.35, 'rgba(217,70,239,0.22)'); g.addColorStop(1, 'rgba(217,70,239,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const h = x.createRadialGradient(c - r * 0.25, c - r * 0.25, 0, c, c, r);
    h.addColorStop(0, '#f0abfc'); h.addColorStop(0.45, '#e879f9'); h.addColorStop(1, '#d946ef');
    x.beginPath(); x.arc(c, c, r, 0, Math.PI * 2); x.fillStyle = h; x.fill();
    x.beginPath(); x.arc(c, c, r, 0, Math.PI * 2); x.strokeStyle = wa(0.35); x.lineWidth = 1; x.stroke();
    x.beginPath(); x.arc(c - r * 0.35, c - r * 0.35, r * 0.22, 0, Math.PI * 2); x.fillStyle = wa(0.7); x.fill();
  });
}
Ents.reg('orb', {
  init(e) {
    e.w = 18; e.h = 18;
    if (e.c != null) { e.x = e.c * TS + 7; e.y = e.r * TS + 7; }
    e.delay = e.delay || 0; e.bob = Math.random() * 6;
  },
  update(e, dt) {
    if (e.homing) {
      if (e.t < e.delay) { e.vy += 900 * dt; e.x += e.vx * dt; e.y += e.vy * dt; return; }
      const dx = P.cx - (e.x + 9), dy = P.cy - (e.y + 9), d = Math.hypot(dx, dy) || 1, sp = Math.min(1200, 260 + (e.t - e.delay) * 1600);
      e.x += dx / d * sp * dt; e.y += dy / d * sp * dt;
      if (d < 16) { e.dead = true; Game.addOrbs(1, e); }
      return;
    }
    if (overlap(e, P.box())) { e.dead = true; Game.addOrbs(1, e); }
  },
  draw(ctx, e, x, y) {
    const cx = x + 9, cy = y + 9 + (e.homing ? 0 : Math.sin(e.t * 3 + e.bob) * 1.5);
    R.draw(orbSprite(false), cx, cy, 1, 1, true);
    ctx.beginPath(); const a = e.t * 1.6 + e.bob;
    ctx.arc(cx, cy, 4.6, a, a + Math.PI * 1.2); ctx.strokeStyle = wa(0.7); ctx.lineWidth = 1; ctx.stroke();
  },
});

/* ---------- LETRA RARA (H E L L O) ---------- */
Ents.reg('letter', {
  init(e) {
    e.w = 28; e.h = 28;
    if (e.c != null) { e.x = e.c * TS + 2; e.y = e.r * TS + 2; } else { e.x -= 14; e.y -= 14; }
    e.ch = World.level.masterWord[e.index];
  },
  update(e, dt) {
    if (Game.letters[e.index]) { e.dead = true; return; }
    if (e.magnet) {
      const dx = P.cx - (e.x + 14), dy = P.cy - (e.y + 14), d = Math.hypot(dx, dy) || 1;
      if (d < TS * 3) { const sp = 120 + (TS * 3 - d) * 6; e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; }
    }
    if (overlap(e, P.box())) { e.dead = true; Game.collectLetter(e.index, e); }
  },
  draw(ctx, e, x, y) {
    const cx = x + 14, cy = y + 14 + Math.sin(e.t * 2.4) * 2;
    R.draw(orbSprite(true), cx, cy, 1.15, 1, true);
    ctx.beginPath(); const a = e.t * 1.2;
    ctx.arc(cx, cy, 16, a, a + Math.PI * 0.8); ctx.strokeStyle = 'rgba(240,171,252,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 16, a + Math.PI, a + Math.PI * 1.8); ctx.stroke();
    R.draw(R.text(e.ch, '900 15px Orbitron, Inter, sans-serif', '#ffffff', wa(0.8), 4), cx, cy + 0.5);
  },
});

/* ---------- CÁPSULA DE PALAVRA ---------- */
Ents.reg('capsule', {
  init(e) { e.w = 30; e.h = 24; e.x -= 15; e.y -= 12; e.startY = e.y; e.vx = 0; e.vy = 0; e.homeT = 0; },
  update(e, dt) {
    const tx = e.x + 15, ty = e.y + 12;
    const dx = P.cx - tx, dy = P.cy - ty, d = Math.hypot(dx, dy) || 1;
    const full = Game.bar.length >= CFG.WORD_BAR_MAX;
    const emerging = e.t < 0.32;
    if (emerging) e.y = lerp(e.startY, e.baseY - 12, 1 - Math.pow(1 - e.t / 0.32, 3));
    if (!full && !P.dead && ((e.homing && e.t > 0.16) || (!emerging && d < CFG.MAGNET) || e.homeT > 0)) {
      e.homeT += dt;
      const sp = Math.min(1000, 180 + e.homeT * 1700);
      e.x += dx / d * sp * dt; e.y += dy / d * sp * dt;
      if (d < 20) { e.dead = true; Game.collectWord(e.word, e); }
    } else if (!emerging) {
      if (e.homeT > 0) { e.baseY = e.y + 12; e.homeT = 0; }
      e.y = lerp(e.y, e.baseY - 12 + Math.sin(e.t * 2.2) * 3, 1 - Math.exp(-dt * 6));
    }
  },
  draw(ctx, e, x, y) {
    const s = wordCapsuleSprite(e.word), cx = x + 15 + s.ox, cy = y + 12;
    const a = e.t < 0.1 ? e.t / 0.1 : 1;
    R.draw(R.glow('m', 40), cx - s.ox, cy, 1.2, 0.35 + 0.1 * Math.sin(e.t * 4), true);
    R.draw(s, cx, cy, 1, a);
  },
});

/* ---------- CRISTAL (power-up) ---------- */
function drawCrystal(ctx, cx, cy, t, scale = 1) {
  R.draw(R.glow('t', 40), cx, cy, scale * 1.1, 0.95, true);
  const sx = Math.cos(t * 2.4), w = 10 * scale, hT = 13 * scale, hB = 15 * scale;
  ctx.save(); ctx.translate(cx, cy);
  const pts = [[0, -hT], [w * sx, -2 * scale], [0, hB], [-w * sx, -2 * scale]];
  ctx.beginPath(); ctx.moveTo(0, -hT); ctx.lineTo(w, -2 * scale); ctx.lineTo(0, hB); ctx.lineTo(-w, -2 * scale); ctx.closePath();
  const g = ctx.createLinearGradient(-w, -hT, w, hB); g.addColorStop(0, '#7ad8ff'); g.addColorStop(0.5, '#22d3ee'); g.addColorStop(1, '#06b6d4');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = wa(0.7); ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w, -2 * scale); ctx.lineTo(w, -2 * scale); ctx.moveTo(pts[1][0], pts[1][1]); ctx.lineTo(0, -hT); ctx.lineTo(pts[3][0], pts[3][1]);
  ctx.moveTo(pts[1][0], pts[1][1]); ctx.lineTo(0, hB); ctx.lineTo(pts[3][0], pts[3][1]);
  ctx.strokeStyle = wa(0.45); ctx.stroke();
  ctx.restore();
}
Ents.reg('crystal', {
  init(e) { e.w = 22; e.h = 28; e.x -= 11; e.y -= 14; e.startY = e.y; },
  update(e, dt) {
    if (e.emerge && e.t < 0.55) e.y = lerp(e.startY, e.baseY - 14, e.t / 0.55);
    else e.y = e.baseY - 14 + Math.sin(e.t * 2.5) * 3;
    if (e.t > 0.3 && overlap(e, P.box())) { e.dead = true; Game.collectCrystal(); }
  },
  draw(ctx, e, x, y) { drawCrystal(ctx, x + 11, y + 14, e.t); },
});
// item da reserva caindo devagar do topo da tela
Ents.reg('reserve', {
  layer: 'front',
  init(e) { e.w = 22; e.h = 28; },
  update(e, dt) {
    e.y += 72 * dt; e.x += Math.sin(e.t * 3) * 30 * dt;
    if (overlap(e, P.box())) { e.dead = true; Game.collectCrystal(); }
    if (e.y > Cam.y + CFG.VIEW_H + 20) e.dead = true;
  },
  draw(ctx, e, x, y) { drawCrystal(ctx, x + 11, y + 14, e.t); },
});

/* ---------- TEXTO DO COMBO ("1x", "2x", ...) ---------- */
Ents.reg('combotext', {
  layer: 'front',
  init(e) { e.w = 1; e.h = 1; e.x0 = e.x; e.y0 = e.y; },
  update(e) { e.y = e.y0 - 54 * (1 - Math.pow(1 - Math.min(1, e.t / 0.9), 2)); if (e.t > 1.1) e.dead = true; },
  draw(ctx, e, x, y) {
    const n = Math.min(e.n, 9), size = 18 + Math.min(n, 5) * 4;
    const pop = e.t < 0.14 ? 1.7 - (e.t / 0.14) * 0.7 : 1, a = e.t > 0.7 ? Math.max(0, 1 - (e.t - 0.7) / 0.4) : 1;
    R.draw(R.glow('m', 40), x, y, 0.8 + n * 0.25, a * Math.min(1, 0.35 + n * 0.15), true);
    R.draw(R.text(e.n + 'x', '900 ' + size + 'px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 6 + n * 2), x, y, pop, a);
  },
});

/* ---------- LANTERNA GÓTICA ---------- */
Ents.reg('lantern', {
  layer: 'back',
  init(e) {
    e.w = 18; e.h = 26; e.x = e.c * TS + 7; e.y = e.r * TS + 3;
    let len = 0, rr = e.r - 1;
    while (rr >= 0 && len < 4 && !World.isFloor(e.c, rr)) { len++; rr--; }
    e.chain = len >= 4 ? 64 : len * TS + 3; e.fade = len >= 4;
    e.ph = Math.random() * 6;
  },
  update(e, dt) {
    if (!P.onGround && !P.dead && overlap(e, P.box())) this.smash(e);
  },
  smash(e) {
    if (e.dead) return;
    e.dead = true; SFX.lantern(); Game.shake(1.5);
    FX.burst(e.x + 9, e.y + 14, 22, 'c', 200, { life: 0.8 });
    for (let i = 0; i < 3; i++) Ents.spawn('orb', { x: e.x + 2, y: e.y + 6, vx: (i - 1) * 110, vy: -240, homing: true, delay: 0.25 + i * 0.05 });
  },
  draw(ctx, e, x, y) {
    const sw = Math.sin(e.t * 1.6 + e.ph) * 1.5, cx = x + 9 + sw;
    // corrente
    const g = ctx.createLinearGradient(0, y - e.chain, 0, y);
    g.addColorStop(0, e.fade ? wa(0) : wa(0.18)); g.addColorStop(1, wa(0.2));
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 9, y - e.chain); ctx.lineTo(cx, y + 2); ctx.stroke();
    const fl = 0.55 + 0.25 * Math.sin(e.t * 7 + e.ph) * Math.sin(e.t * 3.1);
    R.draw(R.glow('c', 30), cx, y + 15, 1, fl * 0.6, true);
    // telhado pontudo
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 8, y + 7); ctx.lineTo(cx - 8, y + 7); ctx.closePath();
    ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = wa(0.15); ctx.stroke();
    // corpo hexagonal de vidro
    ctx.beginPath(); ctx.moveTo(cx - 6, y + 8); ctx.lineTo(cx + 6, y + 8); ctx.lineTo(cx + 8, y + 14); ctx.lineTo(cx + 6, y + 21); ctx.lineTo(cx - 6, y + 21); ctx.lineTo(cx - 8, y + 14); ctx.closePath();
    ctx.fillStyle = 'rgba(10,15,18,0.75)'; ctx.fill(); ctx.fillStyle = `rgba(34,211,238,${0.12 + fl * 0.18})`; ctx.fill();
    ctx.strokeStyle = ca(0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + 9); ctx.lineTo(cx, y + 20); ctx.strokeStyle = wa(0.1); ctx.stroke();
    R.draw(R.glow('w', 4), cx, y + 14.5, 1, 0.6 + fl * 0.3, true);
    ctx.beginPath(); ctx.moveTo(cx - 3, y + 22); ctx.lineTo(cx, y + 26); ctx.lineTo(cx + 3, y + 22); ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = wa(0.12); ctx.stroke();
  },
});

/* ---------- CHECKPOINT (arco de neon) ---------- */
Ents.reg('checkpoint', {
  layer: 'back',
  init(e) { e.w = 30; e.h = 70; e.x = e.c * TS + 1; e.y = (e.r + 1) * TS - e.h; e.active = false; },
  update(e) {
    if (!e.active && overlap(e, P.box())) {
      e.active = true; Game.setCheckpoint(e); SFX.checkpoint();
      FX.burst(e.x + 15, e.y + 20, 30, 'm', 220, { life: 0.9, g: 100 });
    }
  },
  draw(ctx, e, x, y) {
    const on = e.active;
    if (on) R.draw(R.glow('m', 50), x + 15, y + 28, 1.2, 0.5 + 0.15 * Math.sin(e.t * 3), true);
    ogivePath(ctx, x, y, 30, e.h);
    ctx.strokeStyle = on ? '#e879f9' : ca(0.3); ctx.lineWidth = on ? 1.6 : 1; ctx.stroke();
    ogivePath(ctx, x + 5, y + 8, 20, e.h - 8);
    ctx.strokeStyle = on ? 'rgba(240,171,252,0.4)' : ca(0.12); ctx.lineWidth = 1; ctx.stroke();
    if (!on) { ctx.beginPath(); ctx.arc(x + 15, y + 20, 3, 0, Math.PI * 2); ctx.strokeStyle = ca(0.3); ctx.stroke(); }
  },
});

/* ---------- PORTAL DE FIM (normal e secreto) ---------- */
Ents.reg('goal', {
  layer: 'back',
  init(e) {
    const base = (e.r + 1) * TS;
    let n = 0; while (n < 6 && !World.isFloor(e.c, e.r - n) && !World.isFloor(e.c + 3, e.r - n)) n++;
    e.top = base - n * TS + (e.opts.exit === 'secret' ? 28 : 6); e.base = base; e.lx = e.c * TS + 4; e.rx = (e.c + 3) * TS + 28;
    e.x = e.lx; e.y = e.top; e.w = e.rx - e.lx; e.h = base - e.top; e.exit = e.opts.exit; e.done = false; e.tapeGone = 0;
  },
  tapeY(e) { return e.top + 14 + (e.base - e.top - 30) * (0.5 + 0.5 * Math.sin(e.t * 1.7)); },
  update(e) {
    if (e.done || Game.state !== 'play' || P.dead) return;
    const b = P.box();
    if (b.x + b.w > e.lx + 12 && b.x < e.rx - 12 && b.y < e.base && b.y + b.h > e.top) {
      e.done = true;
      const ty = this.tapeY(e);
      let bonus = 0;
      if (b.y < ty + 4 && b.y + b.h > ty - 4) {
        const lvl = clamp(1 - (ty - e.top) / (e.base - e.top), 0, 1);
        bonus = Math.round(5 + lvl * 45); e.tapeGone = 1; e.tapeAt = ty;
        SFX.tape(lvl); FX.burst(P.cx, ty, 40, 'm', 300, { life: 1, g: 200 });
      }
      Game.finish(e.exit, bonus);
    }
  },
  draw(ctx, e, x, y) {
    const lx = 0, rx = e.w, top = 0, base = e.h;
    ctx.save(); ctx.translate(x, y);
    for (const px of [lx, rx - 10]) {
      rrect(ctx, px, top, 10, base - top, 5);
      ctx.fillStyle = 'rgba(10,15,18,0.85)'; ctx.fill(); ctx.strokeStyle = ca(0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(px + 5, top - 5, 4, 0, Math.PI * 2); ctx.strokeStyle = ca(0.6); ctx.stroke();
      R.draw(R.glow('c', 20), px + 5, top - 5, 1, 0.5, true);
    }
    if (e.exit === 'secret') {
      const kx = e.w / 2, ky = top - 10;
      R.draw(R.glow('m', 40), kx, ky, 1, 0.8, true);
      ctx.beginPath(); ctx.arc(kx, ky, 13, 0, Math.PI * 2); ctx.strokeStyle = '#e879f9'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(kx, ky - 3, 4, 0, Math.PI * 2); ctx.moveTo(kx - 2, ky); ctx.lineTo(kx - 4, ky + 8); ctx.lineTo(kx + 4, ky + 8); ctx.lineTo(kx + 2, ky);
      ctx.fillStyle = '#f0abfc'; ctx.fill();
    }
    if (!e.tapeGone) {
      const ty = this.tapeY(e) - e.y;
      R.draw(R.glow('m', 30), e.w / 2, ty, 1, 0.4, true);
      capsulePath(ctx, e.w / 2, ty, e.w - 18, 6);
      const g = ctx.createLinearGradient(0, 0, e.w, 0); g.addColorStop(0, '#d946ef'); g.addColorStop(0.5, '#f0abfc'); g.addColorStop(1, '#d946ef');
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.restore();
  },
});

/* ---------- PEDESTAL DA VOZ ---------- */
Ents.reg('pedestal', {
  layer: 'back',
  init(e) {
    e.w = 32; e.h = 32; e.x = e.c * TS; e.y = e.r * TS;
    const def = World.level.doors[e.opts.door];
    World.doors[e.opts.door] = { id: e.opts.door, def, kind: 'pedestal', x: e.x, y: e.y, w: 32, h: 32, open: false, opening: 0, errors: 0, read: false, hint: false, morph: 0, ent: e };
  },
  draw(ctx, e, x, y) {
    const t = e.t;
    R.draw(R.glow('c', 40), x + 16, y - 8, 1, 0.4 + 0.15 * Math.sin(t * 2), true);
    rrect(ctx, x + 6, y + 6, 20, 26, [4, 4, 0, 0]); ctx.fillStyle = 'rgba(10,15,18,0.9)'; ctx.fill(); ctx.strokeStyle = wa(0.14); ctx.lineWidth = 1; ctx.stroke();
    rrect(ctx, x + 1, y + 2, 30, 6, 3); ctx.fillStyle = 'rgba(10,15,18,0.95)'; ctx.fill(); ctx.strokeStyle = ca(0.55); ctx.stroke();
    ctx.save(); ctx.translate(x + 16, y - 10);
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 4.5, 0, 0, Math.PI * 2); ctx.strokeStyle = ca(0.55); ctx.stroke();
    const a = t * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 14, Math.sin(a) * 4.5, 1.6, 0, Math.PI * 2); ctx.fillStyle = '#7ad8ff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(5, -2); ctx.lineTo(0, 5); ctx.lineTo(-5, -2); ctx.closePath(); ctx.strokeStyle = ca(0.7); ctx.stroke();
    ctx.restore();
  },
});
