/* ============================== 1-3 · A SEGUNDA METADE: PODERES, LASERS, DRONES E O SENTINELA ==============================
   Os PODERES saem dos blocos (POWERS em 10_data.js): LASER (o braço da Nexy atira; segurar e soltar = tiro carregado),
   WINGS (segurar o pulo no ar plana; em cima do ventilador o vento levanta) e STAR (alguns segundos sem dano).
   Machucou com um poder: perde o poder (como no Mario). F / Y / SHOT atira com o LASER; sem ele, é o tiro da Echo.
   Criaturas novas: o DRONE (mira com uma linha fina e atira) e o SENTINELA (o chefe: diga no terminal onde o núcleo está).
   Peças novas: o emissor de laser (o feixe fecha o corredor; a caixa NA FRENTE bloqueia; tiros quebram o emissor), os
   portões que ligam e desligam e o ventilador. Os tiros dos inimigos são ciano (o sistema); os da Nexy, magenta. */
const CHARGE_T = 0.75;   // segurar o tiro por este tempo carrega o laser
const Power = {
  bolts: [], cool: 0, hold: 0, charged: false, shotT: 0,
  reset() { this.bolts = []; this.cool = 0; this.hold = 0; this.charged = false; this.shotT = 0; EnemyFire.list = []; },
  respawn() { this.reset(); if (Sentinel.ent) Sentinel.sleep(Sentinel.ent); },
  give(kind, e) {
    const D = POWERS[kind]; if (!D) return;
    if (kind === 'star') { P.starT = D.time; SFX.star(); }
    else if (P.power === kind) Game.addOrbs(3);
    else { P.power = kind; SFX.powerup(); }
    UI.msg(D.word, 1400); Voice.say(D.say, 'echo');
    FX.burst(P.cx, P.cy, 40, 'm', 280, { life: 0.8, g: 0 });
    // o nome do poder em inglês entra no Grimório (som + texto + imagem)
    if (!Game.wordsSeen.has(D.word)) { Game.wordsSeen.add(D.word); Game.learnedOrder.push(D.word); }
    Game.grimoireWord(D.word, null); Hints.mark(kind);
    const met = Save.data.met;
    if (!met[kind]) { met[kind] = true; Save.write(); if (Game.echoBorn) Game.later(0.9, () => Echo.talk(ECHO.lines[kind])); }
  },
  // machucou com um poder: ele se desfaz e a Nexy fica piscando (a estrela protege enquanto dura)
  lose() {
    const k = P.power; P.power = null; this.hold = 0; this.charged = false;
    SFX.damage(); Game.shake(4); FX.burst(P.cx, P.cy, 30, 'm', 240, { life: 0.7, g: 200 });
    UI.msg('NO ' + POWERS[k].word, 1200);
  },
  // o bloco do poder volta a encher (se o poder antigo ainda está flutuando ali, espera)
  refill(b, sec) {
    Game.later(sec, () => {
      if (Ents.list.some(e => e.type === 'powerup' && !e.dead && e.blk === b)) return this.refill(b, 2);
      b.state = 'ready'; b.bump = 0.6; FX.burst(b.c * TS + TS / 2, b.r * TS + TS / 2, 12, 'm', 120, { life: 0.5, g: 0 });
    });
  },
  /* ---------- o tiro: F / Y / SHOT ---------- */
  press() { return P.power === 'laser' ? this.shoot(false) : EchoShot.fire(); },
  holding() { return Input.get('shoot') || !!Input.touchHeld.shot; },
  ready() { return Game.state === 'play' && !P.dead && P.power === 'laser' && !P.held; },
  shoot(big) {
    if (!this.ready()) return false;
    if (!big && (this.cool > 0 || this.bolts.filter(b => !b.big).length >= 3)) return false;
    const dir = P.facing, x = P.cx + dir * 16, y = P.y + P.h * (P.crouch ? 0.5 : 0.42);
    this.bolts.push({ x, y, vx: dir * (big ? 760 : 720), life: big ? 0.95 : 0.8, big, dmg: big ? 3 : 1, hit: new Set(), trail: [] });
    this.cool = 0.16; this.shotT = 0.12;
    if (big) { SFX.blast(); Game.shake(2); } else SFX.laser();
    FX.burst(x, y, big ? 18 : 6, 'm', big ? 260 : 140, { life: 0.25, g: 0 });
    return true;
  },
  // o que para um tiro: pedra, a caixa de neon, blocos sólidos, portas fechadas
  wall(c, r) {
    const tt = World.type(c, r);
    return World.solidStatic(c, r) || tt === T.RUNE || tt === T.CRACKED || (tt === T.BLOCK && World.blockSolid(World.blockAt(c, r))) || (tt === T.DOOR && World.solidFor(c, r, {}, 'x', 0));
  },
  update(dt) {
    if (P.starT > 0) {
      P.starT -= dt;
      if (Math.random() < 0.6) FX.add(P.x + Math.random() * P.w, P.y + Math.random() * P.h, { vx: (Math.random() - 0.5) * 60, vy: -40, life: 0.5, size: 1.6, c: Math.random() < 0.5 ? 'm' : 'c', g: 0 });
      if (P.starT <= 0) { P.starT = 0; SFX.shrink(); }
    }
    if (this.cool > 0) this.cool -= dt;
    if (this.shotT > 0) this.shotT -= dt;
    // segurando o tiro com o LASER: carrega; soltou carregado, sai o tiro forte
    if (P.power === 'laser' && this.holding() && Game.state === 'play' && !P.dead) {
      this.hold += dt;
      if (this.hold > 0.25 && Math.random() < 0.5) { const a = Math.random() * Math.PI * 2; FX.add(P.cx + P.facing * 16 + Math.cos(a) * 22, P.y + P.h * 0.42 + Math.sin(a) * 22, { vx: -Math.cos(a) * 90, vy: -Math.sin(a) * 90, life: 0.25, size: 1.3, c: 'm', g: 0, drag: 0 }); }
      if (this.hold >= CHARGE_T && !this.charged) { this.charged = true; SFX.charged(); }
    } else {
      if (this.charged && P.power === 'laser') this.shoot(true);
      this.hold = 0; this.charged = false;
    }
    for (const b of this.bolts) {
      b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > (b.big ? 6 : 4)) b.trail.shift();
      b.x += b.vx * dt; b.life -= dt;
      if (this.wall(Math.floor(b.x / TS), Math.floor(b.y / TS))) { b.life = 0; SFX.thud(); FX.burst(b.x, b.y, b.big ? 16 : 8, 'm', 140, { life: 0.3, g: 0 }); continue; }
      const box = b.big ? { x: b.x - 12, y: b.y - 12, w: 24, h: 24 } : { x: b.x - 8, y: b.y - 4, w: 16, h: 8 };
      // o tiro carregado apaga os tiros inimigos no caminho
      if (b.big) for (const f of EnemyFire.list) if (f.life > 0 && overlap(box, { x: f.x - 4, y: f.y - 4, w: 8, h: 8 })) { f.life = 0; FX.burst(f.x, f.y, 6, 'c', 120, { life: 0.3, g: 0 }); }
      for (const e of Ents.list) {
        if (e.dead || b.life <= 0) continue;
        // alvos especiais (o emissor de laser, o Sentinela): eles mesmos decidem se o tiro bateu
        if (e.shootable) { if (overlap(box, e) && Ents.types[e.type].shot(e, b.dmg, b)) b.life = 0; continue; }
        if (!e.enemy || b.hit.has(e) || e.state === 'dying' || e.state === 'flat' || e.state === 'held' || !overlap(box, e)) continue;
        b.hit.add(e); this.hitEnemy(e, b);
        if (!b.big || e.type === 'giant') b.life = 0;
      }
    }
    this.bolts = this.bolts.filter(b => b.life > 0);
    EnemyFire.update(dt);
  },
  hitEnemy(e, b) {
    const dir = sign(b.vx) || 1, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (e.type === 'giant') { SFX.thud(); e.shake = 0.3; FX.burst(cx, cy, 8, 'c', 120, { life: 0.3 }); return; }
    // gárgula de pedra e cavaleiro: o tiro comum só tine; o carregado quebra
    if (!b.big && e.type === 'gargoyle') { if (e.state === 'fly' || e.state === 'home') Ents.types.gargoyle.stun(e); else { SFX.clang(); FX.burst(cx, cy, 8, 'c', 120, { life: 0.3, g: 0 }); } return; }
    if (!b.big && e.type === 'knight') { Ents.types.knight.clang(e); return; }
    e.frozen = 0; e.plat = false;
    Enemy.kill(e, 'pop', dir); SFX.crush();
    Ents.spawn('orb', { x: cx, y: cy, vx: dir * 60, vy: -260, homing: true, delay: 0.25 });
  },
  /* ---------- desenho ---------- */
  // atrás da Nexy: as asas (abertas planando)
  drawBack(ctx, camX, camY, a) {
    if (P.dead || P.power !== 'wings') return;
    const x = lerp(P.px, P.x, a) + P.w / 2 - camX, y = lerp(P.py, P.y, a) + 15 - camY;
    // planando: abertas para os dois lados; em repouso: dobradas para trás, nas costas
    const glide = !P.onGround && P.vy >= 0 && Input.get('jump'), k = glide ? 1 : 0.7;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(x - P.facing * (glide ? 3 : 5), y + (glide ? 0 : (s + 1) * 1.5));
      if (glide) { ctx.scale(s, 1); ctx.rotate(-0.5 + Math.sin(Game.time * 9) * 0.05); }
      else { ctx.scale(-P.facing * 0.75, 0.75); ctx.rotate(0.45 + (s + 1) * 0.18 + Math.sin(Game.time * 3) * 0.04); }
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(14, -12, 30 * (0.6 + 0.4 * k), -8); ctx.lineTo(22 * (0.6 + 0.4 * k), -2); ctx.lineTo(26 * (0.6 + 0.4 * k), 4); ctx.lineTo(14, 4); ctx.lineTo(16, 10); ctx.quadraticCurveTo(6, 8, 0, 4); ctx.closePath();
      ctx.fillStyle = 'rgba(217,70,239,0.16)'; ctx.fill(); ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(24 * (0.6 + 0.4 * k), -6); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    if (glide) R.draw(R.glow('m', 32), x, y + 2, 1.1, 0.35, true);
  },
  // na frente: o canhão do braço (e a carga), o brilho da estrela
  drawFront(ctx, camX, camY, a) {
    if (P.dead) return;
    const px = lerp(P.px, P.x, a) - camX, py = lerp(P.py, P.y, a) - camY, t = Game.time;
    if (P.starT > 0) {
      const blink = P.starT < 2 && Math.floor(P.starT * 8) % 2;
      if (!blink) { R.draw(R.glow('t', 64), px + P.w / 2, py + P.h / 2, 1.2 + 0.1 * Math.sin(t * 20), 0.9, true); R.draw(R.glow(Math.floor(t * 10) % 2 ? 'm' : 'c', 48), px + P.w / 2, py + P.h / 2, 1.3, 0.5, true); }
    }
    if (P.power !== 'laser') return;
    const dir = P.facing, hx = px + P.w / 2 + dir * (11 + (this.shotT > 0 ? -2 : 0)), hy = py + P.h * (P.crouch ? 0.5 : 0.42);
    ctx.save(); ctx.translate(hx, hy); ctx.scale(dir, 1);
    rrect(ctx, -5, -4, 14, 8, 3); ctx.fillStyle = '#0b0610'; ctx.fill(); ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(-1, 4); ctx.strokeStyle = 'rgba(217,70,239,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    const k = Math.min(1, this.hold / CHARGE_T), tip = hx + dir * 10;
    R.draw(R.glow('m', 16), tip, hy, 0.6 + k * 1.2 + (this.shotT > 0 ? 0.8 : 0), 0.6 + 0.4 * k, true);
    if (this.charged) { R.draw(R.glow(Math.floor(t * 16) % 2 ? 'w' : 'm', 24), tip, hy, 1.2, 0.8, true); ctx.beginPath(); ctx.arc(tip, hy, 9 + Math.sin(t * 30) * 1.5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(240,171,252,0.9)'; ctx.lineWidth = 1.2; ctx.stroke(); }
  },
  drawBolts(ctx, camX, camY) {
    for (const b of this.bolts) {
      const x = b.x - camX, y = b.y - camY;
      b.trail.forEach((q, i) => R.draw(R.glow('m', b.big ? 20 : 10), q.x - camX, q.y - camY, 0.5 + i * 0.12, 0.1 + i * 0.07, true));
      if (b.big) {
        R.draw(R.glow('m', 32), x, y, 1.2, 0.9, true); R.draw(R.glow('w', 16), x, y, 1, 0.9, true);
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        R.draw(R.glow('m', 16), x, y, 1, 0.8, true);
        capsulePath(ctx, x - sign(b.vx) * 4, y, 18, 5); ctx.fillStyle = '#fff'; ctx.fill();
      }
    }
    EnemyFire.draw(ctx, camX, camY);
  },
  // o ícone do poder (bloco, Grimório, HUD)
  drawIcon(ctx, kind, x, y, t, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    R.draw(R.glow('m', 32), 0, 0, 1, 0.55 + 0.2 * Math.sin(t * 4), true);
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(12,4,16,0.95)'; ctx.fill(); ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind === 'laser') { rrect(ctx, -7, -3, 9, 6, 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(8, 0); ctx.moveTo(5, -4); ctx.lineTo(8, -6); ctx.moveTo(5, 4); ctx.lineTo(8, 6); ctx.stroke(); }
    else if (kind === 'wings') { for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(d * 5, -7, d * 9, -4); ctx.lineTo(d * 6, 0); ctx.lineTo(d * 8, 3); ctx.quadraticCurveTo(d * 3, 5, 0, 2); ctx.stroke(); } }
    else { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.6 : 8; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    ctx.restore();
  },
};

/* ---------- os tiros dos inimigos (drones e o Sentinela): ciano, param na pedra e na caixa ---------- */
const EnemyFire = {
  list: [],
  add(x, y, vx, vy) { this.list.push({ x, y, vx, vy, life: 3.2, trail: [] }); },
  update(dt) {
    for (const b of this.list) {
      if (b.life <= 0) continue;
      b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 5) b.trail.shift();
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (Power.wall(Math.floor(b.x / TS), Math.floor(b.y / TS))) { b.life = 0; FX.burst(b.x, b.y, 6, 'c', 110, { life: 0.3, g: 0 }); continue; }
      if (!P.dead && overlap({ x: b.x - 4, y: b.y - 4, w: 8, h: 8 }, P)) { b.life = 0; FX.burst(b.x, b.y, 10, 'c', 160, { life: 0.35, g: 0 }); P.hurt(); }
    }
    this.list = this.list.filter(b => b.life > 0);
  },
  draw(ctx, camX, camY) {
    for (const b of this.list) {
      const x = b.x - camX, y = b.y - camY, a = Math.atan2(b.vy, b.vx);
      b.trail.forEach((q, i) => R.draw(R.glow('c', 10), q.x - camX, q.y - camY, 0.5 + i * 0.1, 0.12 + i * 0.07, true));
      R.draw(R.glow('c', 18), x, y, 1, 0.9, true);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); capsulePath(ctx, 0, 0, 14, 5); ctx.fillStyle = '#e0fbff'; ctx.fill(); ctx.restore();
    }
  },
};

/* ---------- o poder saindo do bloco: sobe, mostra o nome um instante e vem até a Nexy (se ela estiver perto) ---------- */
Ents.reg('powerup', {
  layer: 'mid',
  init(e) { e.w = 26; e.h = 26; e.x -= e.w / 2; e.y -= e.h / 2; e.y0 = e.y; e.k = 0; },
  update(e, dt) {
    if (e.k < 1) { e.k = Math.min(1, e.k + dt / 0.45); e.y = lerp(e.y0, e.baseY - e.h / 2, e.k); return; }
    const dx = P.cx - (e.x + e.w / 2), dy = P.cy - (e.y + e.h / 2), d = Math.hypot(dx, dy);
    if (e.t > 0.9 && !P.dead && d < 6 * TS) { const v = Math.min(d, 300 * dt); e.x += dx / (d || 1) * v; e.y += dy / (d || 1) * v; }
    else if (e.t <= 0.9) e.y = e.baseY - e.h / 2 + Math.sin(e.t * 3) * 3;
    if (overlap(e, P.box())) { e.dead = true; Power.give(e.kind, e); }
  },
  draw(ctx, e, x, y) {
    Power.drawIcon(ctx, e.kind, x + e.w / 2, y + e.h / 2, e.t, 1.05);
    R.draw(R.text(POWERS[e.kind].word, '800 10px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.95)', 6), x + e.w / 2, y + e.h + 9, 1, 0.9);
  },
});

/* ---------- DRONE: patrulha em volta de casa; perto da Nexy mira (linha fina) e atira ---------- */
Ents.reg('drone', {
  layer: 'enemy',
  init(e) { e.w = 30; e.h = 20; e.enemy = true; e.kind = 'enemy'; e.state = 'patrol'; e.creature = 'DRONE'; e.aimT = 0; e.cool = 1.2 + Math.random(); e.dir = -1; e.pt = Math.random() * 6; e.dx = 0; e.dy = 0; e.res = {}; },
  update(e, dt) {
    if (e.state === 'dying') return Enemy.dyingUpdate(e, dt);
    if (e.hx == null) { e.hx = e.x; e.hy = e.y; }
    const ox = e.x, oy = e.y, gx = e.x + e.w / 2, gy = e.y + e.h / 2, dx = P.cx - gx, dy = P.cy - gy;
    const near = !P.dead && Math.abs(dx) < 9 * TS && Math.abs(dy) < 7 * TS;
    if (near && !City2.metDrone && Game.echoBorn && !Save.data.met.drone) { City2.metDrone = true; Save.data.met.drone = true; Save.write(); Echo.talk(ECHO.lines.drone); }
    e.dir = sign(dx) || e.dir;   // o olho segue a Nexy
    if (e.state === 'aim') {
      e.aimT -= dt;
      if (e.aimT > 0.22) { e.tx = P.cx; e.ty = P.cy; }   // a mira trava um instante antes do tiro: dá para desviar
      if (e.aimT <= 0) {
        const a = Math.atan2(e.ty - gy, e.tx - gx);
        EnemyFire.add(gx + Math.cos(a) * 14, gy + Math.sin(a) * 14, Math.cos(a) * 250, Math.sin(a) * 250); SFX.enemyShot();
        e.state = 'patrol'; e.cool = 2.5; e.flash = 0.15;
      }
    } else {
      // patrulha: um oito deitado em volta de casa
      e.pt += dt; e.x = e.hx + Math.sin(e.pt * 0.8) * 2.2 * TS; e.y = e.hy + Math.sin(e.pt * 1.6) * 10;
      if (near && P.starT <= 0) { e.cool -= dt; if (e.cool <= 0) { e.state = 'aim'; e.aimT = 0.7; e.tx = P.cx; e.ty = P.cy; SFX.aim(); } }
    }
    if (e.flash > 0) e.flash -= dt;
    e.dx = e.x - ox; e.dy = e.y - oy;
  },
  draw(ctx, e, x, y) {
    const cx = x + e.w / 2, cy = y + e.h / 2, t = e.t;
    if (e.state === 'aim') {
      // a linha da mira: fica mais forte até o tiro
      const k = clamp(1 - e.aimT / 0.7, 0, 1), camX = e.x - x, camY = e.y - y;
      ctx.save(); ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 40; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(e.tx - camX, e.ty - camY);
      ctx.strokeStyle = `rgba(34,211,238,${(0.2 + 0.6 * k).toFixed(3)})`; ctx.lineWidth = 1 + k; ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(e.tx - camX, e.ty - camY, 10 - 5 * k, 0, Math.PI * 2); ctx.strokeStyle = `rgba(165,243,252,${(0.3 + 0.6 * k).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
    }
    Enemy.rim(cx, cy, e.w);
    ctx.save();
    if (e.state === 'dying') { ctx.translate(cx, cy); ctx.rotate(e.spinA); ctx.translate(-cx, -cy); }
    // hélices e braços
    ctx.strokeStyle = wa(0.22); ctx.lineWidth = 1.2; ctx.beginPath();
    for (const s of [-1, 1]) { ctx.moveTo(cx + s * 8, cy - 3); ctx.lineTo(cx + s * 15, cy - 8); const r = 7 * Math.abs(Math.sin(t * 40 + s)); ctx.moveTo(cx + s * 15 - r, cy - 9); ctx.lineTo(cx + s * 15 + r, cy - 9); }
    ctx.stroke();
    // o corpo: uma lente escura com a íris ciano olhando para a Nexy
    ctx.beginPath(); ctx.ellipse(cx, cy, 12, 9, 0, 0, Math.PI * 2); ctx.fillStyle = '#05080b'; ctx.fill(); ctx.strokeStyle = wa(0.32); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 6, cy + 9); ctx.lineTo(cx - 3, cy + 13); ctx.lineTo(cx + 3, cy + 13); ctx.lineTo(cx + 6, cy + 9); ctx.strokeStyle = wa(0.18); ctx.stroke();
    const ix = cx + e.dir * 4, hot = e.state === 'aim' || e.flash > 0;
    R.draw(R.glow('c', 16), ix, cy, hot ? 1.2 : 0.8, hot ? 0.95 : 0.6, true);
    ctx.beginPath(); ctx.arc(ix, cy, hot ? 3.6 : 2.8, 0, Math.PI * 2); ctx.fillStyle = hot ? '#ffffff' : '#22d3ee'; ctx.fill();
    ctx.restore();
  },
});

/* ---------- o EMISSOR DE LASER: o feixe vai até a primeira coisa sólida (a caixa na frente bloqueia) ----------
   dir 'left' = deitado no chão, atirando para a esquerda na altura da Nexy (tem vida: tiros quebram);
   dir 'down' = pendurado, atirando para baixo; on/off/phase = liga e desliga (pisca um instante antes de ligar). */
Ents.reg('beam', {
  layer: 'mid',
  init(e) {
    const o = e.opts; e.dir = o.dir; e.hp = o.hp || 0; e.shootable = true; e.on = true; e.warn = false; e.end = 0; e.hitT = 0;
    if (e.dir === 'left') { e.w = TS; e.h = 2 * TS; e.x = e.c * TS; e.y = (e.r - 1) * TS; e.plat = true; e.body = true; e.dx = 0; e.dy = 0; }
    else { e.w = TS; e.h = TS; e.x = e.c * TS; e.y = e.r * TS; }
  },
  // o retângulo do feixe (ou null, desligado)
  rect(e) {
    if (e.broken || !e.on) return null;
    if (e.dir === 'left') { const y = e.y + e.h - 22; return e.end < e.x ? { x: e.end, y: y - 5, w: e.x - e.end, h: 10 } : null; }
    const y0 = e.y + TS - 4; return e.end > y0 ? { x: e.x + TS / 2 - 5, y: y0, w: 10, h: e.end - y0 } : null;
  },
  update(e, dt) {
    if (e.hitT > 0) e.hitT -= dt;
    if (e.broken) return;
    const o = e.opts, was = e.on;
    if (o.on) { const per = o.on + o.off, k = ((Game.simTime / per + (o.phase || 0)) % 1) * per; e.on = k < o.on; e.warn = !e.on && k > per - 0.45; }
    if (e.on && !was && Math.abs(e.x - P.cx) < 14 * TS) SFX.beamOn();
    // até onde o feixe vai
    if (e.dir === 'left') { const r = Math.floor((e.y + e.h - 22) / TS); let c = e.c - 1; while (c > e.c - 24 && !Power.wall(c, r)) c--; e.end = (c + 1) * TS; }
    else { let r = e.r + 1; while (r < World.h && !Power.wall(e.c, r)) r++; e.end = r * TS; }
    const R0 = this.rect(e);
    if (R0 && !P.dead && overlap(R0, P)) P.hurt();
    if (R0 && Math.random() < 0.5) {   // faíscas onde o feixe bate
      const sx = e.dir === 'left' ? R0.x : R0.x + 5, sy = e.dir === 'left' ? R0.y + 5 : R0.y + R0.h;
      FX.add(sx, sy, { vx: (e.dir === 'left' ? 1 : (Math.random() - 0.5)) * (60 + Math.random() * 90), vy: -60 - Math.random() * 90, life: 0.35, size: 1.3, c: 'c', g: 500 });
    }
    // a Echo explica (uma vez por partida): o feixe do beco e os portões
    const near = Math.abs(e.x - P.cx) < 9 * TS;
    if (near && Game.echoBorn && !Echo.line) {
      if (e.dir === 'left' && !City2.metBeam) { City2.metBeam = true; Echo.talk(ECHO.lines.beam); }
      else if (o.on && !City2.metGates) { City2.metGates = true; Echo.talk(ECHO.lines.gates); }
    }
    if (o.on && P.cx > e.x + 2 * TS && Math.abs(P.cx - e.x) < 6 * TS) Hints.mark('gates');
  },
  // tiro no emissor: o deitado tem vida e quebra; o pendurado só solta faíscas
  shot(e, dmg, b) {
    if (e.broken) return false;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    e.hitT = 0.12; FX.burst(b.x, b.y, 8, 'c', 140, { life: 0.3, g: 200 });
    if (!e.hp) { SFX.clang(); return true; }
    e.hp -= dmg; SFX.thud();
    if (e.hp <= 0) {
      e.broken = true; e.plat = false; e.body = false; e.on = false; Hints.mark('altar4');
      SFX.crush(); SFX.glass(); Game.shake(5); FX.burst(cx, cy, 44, 'c', 320, { life: 0.9, g: 500 });
      for (let i = 0; i < 3; i++) Ents.spawn('orb', { x: cx, y: cy, vx: (i - 1) * 90, vy: -300, homing: true, delay: 0.25 + i * 0.05 });
    }
    return true;
  },
  draw(ctx, e, x, y) {
    const t = e.t, camX = e.x - x, camY = e.y - y, R0 = this.rect(e), flick = 0.85 + 0.15 * Math.sin(t * 50);
    // o feixe
    if (R0) {
      const bx = R0.x - camX, by = R0.y - camY;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (e.dir === 'left') {
        const yy = by + 5;
        ctx.beginPath(); ctx.moveTo(bx, yy); ctx.lineTo(bx + R0.w, yy);
        ctx.strokeStyle = `rgba(34,211,238,${(0.22 * flick).toFixed(3)})`; ctx.lineWidth = 14; ctx.stroke();
        ctx.strokeStyle = `rgba(34,211,238,${(0.7 * flick).toFixed(3)})`; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = 'rgba(240,253,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
        R.draw(R.glow('c', 24), bx, yy, 1, 0.8, true);
      } else {
        const xx = bx + 5;
        ctx.beginPath(); ctx.moveTo(xx, by); ctx.lineTo(xx, by + R0.h);
        ctx.strokeStyle = `rgba(34,211,238,${(0.22 * flick).toFixed(3)})`; ctx.lineWidth = 14; ctx.stroke();
        ctx.strokeStyle = `rgba(34,211,238,${(0.7 * flick).toFixed(3)})`; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = 'rgba(240,253,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
        R.draw(R.glow('c', 24), xx, by + R0.h, 1, 0.8, true);
      }
      ctx.restore();
    } else if (e.warn && !e.broken && Math.floor(t * 20) % 2) {
      const xx = x + TS / 2; ctx.save(); ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(xx, y + TS); ctx.lineTo(xx, e.end - camY);
      ctx.strokeStyle = ca(0.45); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    // o emissor
    const sx = e.hitT > 0 ? Math.sin(t * 90) * 1.5 : 0;
    if (e.dir === 'left') {
      if (e.broken) {   // sobrou a carcaça
        ctx.beginPath(); ctx.moveTo(x + 2, y + e.h); ctx.lineTo(x + 6, y + e.h - 20); ctx.lineTo(x + 14, y + e.h - 14); ctx.lineTo(x + 22, y + e.h - 26); ctx.lineTo(x + 30, y + e.h); ctx.closePath();
        ctx.fillStyle = '#05070a'; ctx.fill(); ctx.strokeStyle = wa(0.15); ctx.lineWidth = 1; ctx.stroke(); return;
      }
      rrect(ctx, x + 3 + sx, y + 4, e.w - 6, e.h - 4, [6, 6, 2, 2]); ctx.fillStyle = '#05080b'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.lineWidth = 1; ctx.stroke();
      rrect(ctx, x + 7 + sx, y + 12, e.w - 14, 14, 3); ctx.strokeStyle = ca(0.35); ctx.stroke();
      // a vida que sobra (barrinhas)
      const n = e.opts.hp || 1; for (let i = 0; i < n; i++) { ctx.fillStyle = i < e.hp ? ca(0.75) : 'rgba(34,211,238,0.12)'; ctx.fillRect(x + 9 + sx + (i % 5) * 3, y + 15 + Math.floor(i / 5) * 4, 2, 2.5); }
      const ly = y + e.h - 22; R.draw(R.glow('c', 20), x + 2, ly, 1, 0.9, true);
      ctx.beginPath(); ctx.arc(x + 4 + sx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = '#e0fbff'; ctx.fill();
      if (e.opts.tag) City.tag(ctx, e.opts.tag, x + e.w / 2, y + e.h + 16);   // embaixo (em cima fica a caixa)
    } else {
      rrect(ctx, x + 6, y + 4, e.w - 12, e.h - 8, 4); ctx.fillStyle = '#05080b'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + TS / 2, y + 4); ctx.lineTo(x + TS / 2, y - 8); ctx.strokeStyle = wa(0.2); ctx.stroke();
      const lit = e.on ? 0.95 : e.warn ? 0.6 : 0.25;
      R.draw(R.glow('c', 16), x + TS / 2, y + e.h - 4, 1, lit, true);
      ctx.beginPath(); ctx.arc(x + TS / 2, y + e.h - 6, 3, 0, Math.PI * 2); ctx.fillStyle = e.on ? '#e0fbff' : ca(0.5); ctx.fill();
    }
  },
});

/* ---------- o VENTILADOR: com as WINGS e o pulo seguro, o vento levanta a Nexy (outro caminho do abismo) ---------- */
Ents.reg('vent', {
  layer: 'back',
  init(e) { e.w = TS; e.h = 10; e.x = e.c * TS; e.y = (e.r + 1) * TS - 10; e.top = (e.opts.top || 3) * TS; },
  col(e) { return { x: e.x - TS / 2, y: e.top, w: e.w + TS, h: e.y + 10 - e.top }; },
  update(e, dt) {
    const col = this.col(e);
    if (!P.dead && overlap(col, P)) {
      if (P.power === 'wings' && !P.onGround && Input.get('jump')) {
        if (P.vy > -300) P.vy = Math.max(-300, P.vy - 3600 * dt);
        if (!Input.get('left') && !Input.get('right')) P.vx = approach(P.vx, 0, 700 * dt);   // sem seta, o vento segura no meio
        Hints.mark('vent');
      }
    }
    if (Math.random() < 0.55) FX.add(col.x + 6 + Math.random() * (col.w - 12), e.y, { vy: -240 - Math.random() * 140, vx: 0, life: 1.3, size: 1.1, c: 'c', g: 0, drag: 0 });
  },
  draw(ctx, e, x, y) {
    const t = e.t, camY = e.y - y, top = e.top - camY;
    // a coluna de vento (bem fraca: só se vê o ar tremendo)
    const g = ctx.createLinearGradient(0, y, 0, top); g.addColorStop(0, 'rgba(34,211,238,0.12)'); g.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = g; ctx.fillRect(x - TS / 2 + 4, top, e.w + TS - 8, y - top);
    ctx.save(); ctx.beginPath();
    for (let i = 0; i < 3; i++) { const xx = x - 8 + i * 24, ph = (t * 2.4 + i * 0.7) % 1; ctx.moveTo(xx, y - ph * (y - top)); ctx.lineTo(xx + 4, y - ph * (y - top) - 26); }
    ctx.strokeStyle = ca(0.18); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    // a grade do ventilador
    rrect(ctx, x - 6, y, e.w + 12, 10, 3); ctx.fillStyle = '#06090c'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(x - 2 + i * 9, y + 2); ctx.lineTo(x + 2 + i * 9, y + 8); } ctx.strokeStyle = ca(0.45 + 0.2 * Math.sin(t * 12)); ctx.stroke();
  },
});

/* ============================== O SENTINELA (o chefe da 1-3) ==============================
   Paira sobre a arena e atira rajadas mirando a Nexy (e solta drones). O núcleo fica perto do ESCUDO, num lugar diferente
   a cada rodada (SENTINEL.rounds: embaixo, atrás, do lado). No terminal: IT IS UNDER THE SHIELD → a luz da Echo acha o
   núcleo, o Sentinela cai atordoado e fica aberto SENTINEL.open s. Sem inglês: a cada SENTINEL.heat.every s de luta ele
   esquenta e fica aberto um instante (mais difícil). SENTINEL.hp por rodada: tiro 1, carregado 3, pisão 2.
   A rodada fica guardada se a Nexy morrer. Depois da 3ª: a cena (SentinelScene) e o portão do fim afunda. */
const CORE_AT = { UNDER: { x: 0, y: 64 }, BEHIND: { x: 0, y: 8 }, 'NEXT TO': { x: 82, y: 8 } };
const Sentinel = {
  ent: null,
  where(e) { return SENTINEL.rounds[Math.min(e.round, SENTINEL.rounds.length - 1)].where; },
  exposed(e) { return e.state === 'open' || e.state === 'heat'; },
  low(e) { return e.state === 'open' || e.state === 'heat'; },
  // o terminal: só o lugar desta rodada vale; os outros viram "olhe de novo" com o porquê
  live(def) {
    const all = def.all || (def.all = { accept: def.accept, enact: def.enact });
    const e = this.ent, cur = e && e.state !== 'dead' && e.state !== 'dying' ? this.where(e) : null;
    if (!cur) { def.accept = all.accept; def.enact = all.enact; return; }
    def.accept = all.accept.filter(a => a.words[0] === cur);
    def.enact = all.accept.filter(a => a.words[0] !== cur).map(a => ({ words: a.words, result: { type: 'confused', target: 'sentinel', tip: SENTINEL.tips[a.words[0]] } })).concat(all.enact);
  },
  // a frase certa: a luz da Echo vai até o núcleo e o escudo se abre
  answer(where) {
    const e = this.ent; if (!e || e.state === 'dead' || e.state === 'dying' || this.where(e) !== where) return;
    if (e.state === 'sleep' || e.state === 'wake') this.wake(e, true);
    e.ray = 0.8; this.open(e, SENTINEL.open, 'open');
    SFX.zap(); SFX.glass(); SFX.impact(); Game.shake(6); Hints.mark('core');
    if (Game.echoBorn) Game.later(0.4, () => Echo.talk(ECHO.lines.coreOpen));
  },
  open(e, sec, st) { e.state = st; e.stateT = sec; e.cage = 0; },
  wake(e, quiet) {
    e.state = 'fight'; e.fireT = 2.4; e.heat = 0; e.droneT = 8; Game.registerCreature('SENTINEL');
    for (const w of ['SHIELD', 'CORE']) { if (!Game.wordsSeen.has(w)) { Game.wordsSeen.add(w); Game.learnedOrder.push(w); } Game.grimoireWord(w, null); }
    if (!quiet) { SFX.rumble(1.4); SFX.warDrum(); Game.shake(5); }
  },
  sleep(e) { if (e.state === 'dead' || e.state === 'dying') return; e.state = 'sleep'; e.stateT = 0; e.cage = 1; e.burst = 0; e.woke = false; },
  damage(e, n) {
    if (e.iT > 0 || !this.exposed(e)) return false;
    e.hp -= n; e.iT = 0.3; e.hitT = 0.18; SFX.bossHit(); Game.hitstop(2); Game.shake(2);
    const c = this.corePos(e); FX.burst(c.x, c.y, 16 + n * 6, 'm', 220, { life: 0.5, g: 0 });
    if (e.hp <= 0) this.roundOver(e);
    return true;
  },
  roundOver(e) {
    e.hp = 0;
    if (e.round >= SENTINEL.rounds.length - 1) return SentinelScene.start(e);
    // o núcleo foge para outro lugar; o Sentinela sobe e luta mais rápido
    e.from = { x: e.core.x, y: e.core.y }; e.round++; e.hp = SENTINEL.hp; e.moveK = 0;
    e.state = 'rise'; e.stateT = 1.1; e.cage = 1; e.heat = 0;
    SFX.crush(); SFX.riser(1); Game.shake(6); FX.burst(e.cx, e.cy, 40, 'c', 300, { life: 0.8, g: 300 });
    if (Game.echoBorn) Game.later(1.2, () => Echo.talk(ECHO.lines.coreMove));
  },
  corePos(e) { return { x: e.cx + e.core.x, y: e.cy + e.core.y }; },
  // o terminal: uma tela com o escudo e o núcleo (onde está ele agora?)
  drawTerminal(ctx, x, y, t) {
    const cx = x + 16, p = 0.5 + 0.5 * Math.sin(t * 2), e = this.ent;
    R.draw(R.glow('c', 40), cx, y - 14, 1.1, 0.35 + 0.15 * p, true);
    rrect(ctx, x + 9, y - 2, 14, 34, [2, 2, 0, 0]); ctx.fillStyle = 'rgba(10,15,18,0.96)'; ctx.fill(); ctx.strokeStyle = wa(0.18); ctx.lineWidth = 1; ctx.stroke();
    rrect(ctx, x + 1, y + 26, 30, 6, 3); ctx.fillStyle = 'rgba(10,15,18,0.98)'; ctx.fill(); ctx.strokeStyle = ca(0.45); ctx.stroke();
    rrect(ctx, x - 10, y - 40, 52, 40, 6); ctx.fillStyle = 'rgba(4,8,11,0.97)'; ctx.fill(); ctx.strokeStyle = ca(0.75); ctx.stroke();
    // o escudo (hexágono) e o núcleo no lugar desta rodada
    const sx = cx - 4, sy = y - 21, wh = e ? this.where(e) : 'UNDER', o = CORE_AT[wh], k = 0.18;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(sx + Math.cos(a) * 8, sy + Math.sin(a) * 8); } ctx.closePath();
    ctx.fillStyle = 'rgba(34,211,238,0.2)'; ctx.fill(); ctx.strokeStyle = ca(0.8); ctx.stroke();
    if (e && e.state !== 'dead') { ctx.beginPath(); ctx.arc(sx + o.x * k, sy + o.y * k - (wh === 'UNDER' ? -2 : 0), 2.8, 0, Math.PI * 2); ctx.fillStyle = wh === 'BEHIND' ? 'rgba(255,255,255,0.45)' : '#ffffff'; ctx.fill(); }
    R.draw(R.text('?', '900 11px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,1)', 5), cx + 15, y - 30, 1, 0.6 + 0.4 * p);
  },
};
Ents.reg('sentinel', {
  layer: 'enemy',
  init(e) {
    e.hx = e.c * TS + TS / 2; e.hy = e.r * TS + 18; e.cx = e.hx; e.cy = e.hy;
    e.persist = true; e.shootable = true; e.state = 'sleep'; e.round = 0; e.hp = SENTINEL.hp; e.heat = 0; e.stateT = 0;
    e.fireT = 2.4; e.burst = 0; e.burstT = 0; e.droneT = 8; e.hitT = 0; e.iT = 0; e.cage = 1; e.ray = 0; e.mx = 0; e.from = null; e.moveK = 1;
    e.core = Object.assign({}, CORE_AT.UNDER); e.dx = 0; e.dy = 0;
    Sentinel.ent = e; this.box(e);
  },
  // a caixa que contém o casco e o núcleo (para os tiros acharem)
  box(e) { const bot = Math.max(38, e.core.y + 22); e.w = 130 + Math.max(0, e.core.x) * 2; e.h = 38 + bot; e.x = e.cx - e.w / 2; e.y = e.cy - 38; },
  update(e, dt) {
    if (e.state === 'dead') return;
    if (e.state === 'dying') { e.cx += Math.sin(e.t * 70) * 0.6; this.box(e); return; }
    const S = Sentinel, ox = e.cx, oy = e.cy;
    if (e.hitT > 0) e.hitT -= dt; if (e.iT > 0) e.iT -= dt; if (e.ray > 0) e.ray -= dt;
    // o núcleo voando até o lugar da rodada nova
    const goal = CORE_AT[S.where(e)];
    if (e.moveK < 1 && e.from) { e.moveK = Math.min(1, e.moveK + dt / 0.9); const k = e.moveK * e.moveK * (3 - 2 * e.moveK); e.core.x = lerp(e.from.x, goal.x, k); e.core.y = lerp(e.from.y, goal.y, k) - Math.sin(e.moveK * Math.PI) * 30; }
    else { e.core.x = goal.x; e.core.y = goal.y; }
    // para onde ele vai: alto pairando, ou baixo (aberto) com o núcleo na altura do tiro da Nexy
    let tx = e.hx, ty = e.hy + Math.sin(e.t * 1.3) * 10;
    if (e.state === 'sleep') {
      ty = e.hy + Math.sin(e.t * 0.8) * 6;
      if (!P.dead && P.cx > (e.c - 15) * TS) { e.state = 'wake'; e.stateT = 1.6; SFX.rumble(1.6); SFX.warDrum(); Game.shake(4); }
    } else if (e.state === 'wake') {
      e.stateT -= dt; ty = e.hy - 10;
      if (e.stateT <= 0) { S.wake(e, true); if (Game.echoBorn && !e.met) { e.met = true; Echo.talk(ECHO.lines.sentinel); } }
    } else if (e.state === 'fight') {
      e.mx += dt * (0.45 + e.round * 0.12); tx = e.hx + Math.sin(e.mx) * 9 * TS;
      // rajada: 3 tiros mirando a Nexy (5 em leque na última rodada)
      e.fireT -= dt;
      if (e.fireT <= 0 && !P.dead) { e.burst = e.round >= 2 ? 5 : 3; e.burstT = 0; e.fireT = [2.4, 2, 1.6][e.round]; }
      if (e.burst > 0) {
        e.burstT -= dt;
        if (e.burstT <= 0) {
          const c = S.corePos(e), mx = e.cx, my = e.cy + 30, a0 = Math.atan2(P.cy - my, P.cx - mx), n = e.round >= 2 ? 5 : 3, i = n - e.burst;
          const a = a0 + (e.round >= 2 ? (i - 2) * 0.12 : 0);
          EnemyFire.add(mx + Math.cos(a) * 20, my + Math.sin(a) * 20, Math.cos(a) * (240 + e.round * 25), Math.sin(a) * (240 + e.round * 25)); SFX.enemyShot();
          e.burst--; e.burstT = 0.16; e.flash = 0.1; void c;
        }
      }
      // drones de ajuda (a partir da 2ª rodada)
      if (e.round >= 1) { e.droneT -= dt; if (e.droneT <= 0) { e.droneT = 9; if (Ents.list.filter(d => d.type === 'drone' && d.summoned && !d.dead).length < e.round) { Ents.spawn('drone', { x: e.cx - 15, y: e.cy + 26, summoned: true, opts: {} }); SFX.summon(); } } }
      // sem inglês: depois de um tempo lutando, ele esquenta e se abre um instante
      e.heat += dt;
      if (e.heat >= SENTINEL.heat.every) { e.state = 'warn'; e.stateT = SENTINEL.heat.warn; e.heat = 0; SFX.wake(); }
    } else if (e.state === 'warn') {
      e.stateT -= dt; tx = e.cx; ty = e.cy;
      if (Math.random() < 0.7) FX.add(e.cx + (Math.random() - 0.5) * 100, e.cy - 30, { vy: -80, vx: (Math.random() - 0.5) * 40, life: 0.8, size: 1.8, c: 'c', g: -40 });
      if (e.stateT <= 0) { S.open(e, SENTINEL.heat.open, 'heat'); SFX.crush(); if (Game.echoBorn && !e.metHeat) { e.metHeat = true; Echo.talk(ECHO.lines.overheat); } }
    } else if (e.state === 'open' || e.state === 'heat') {
      e.stateT -= dt; tx = clamp(e.cx, e.hx - 9 * TS, e.hx + 9 * TS); ty = 16 * TS - 30 - e.core.y;
      if (Math.random() < 0.4) FX.add(e.cx + (Math.random() - 0.5) * 110, e.cy + (Math.random() - 0.5) * 50, { vy: -60, vx: (Math.random() - 0.5) * 80, life: 0.5, size: 1.4, c: e.state === 'heat' ? 'c' : 'm', g: 200 });
      if (e.stateT <= 0) { e.state = 'rise'; e.stateT = 0.9; e.cage = 1; }
    } else if (e.state === 'rise') {
      e.stateT -= dt; tx = e.cx;
      if (e.stateT <= 0) { e.state = 'fight'; e.fireT = 1.2; }
    }
    const k = 1 - Math.exp(-dt * (Sentinel.low(e) ? 6 : 2.6));
    e.cx = lerp(e.cx, tx, k); e.cy = lerp(e.cy, ty, k);
    e.dx = e.cx - ox; e.dy = e.cy - oy; this.box(e);
    // baixo e aberto: dá para pisar no casco (o pisão vale 2); dos lados, ele empurra
    if (Sentinel.low(e) && !P.dead) {
      const hull = { x: e.cx - 58, y: e.cy - 34, w: 116, h: 64 };
      if (overlap(P, hull)) {
        if (P.vy > 0 && P.py + P.h <= hull.y + 14) { P.y = hull.y - P.h; P.combo++; P.bounce(false); SFX.stomp(P.combo); Sentinel.damage(e, 2); }
        else { const left = P.cx < e.cx; P.x = left ? hull.x - P.w : hull.x + hull.w; P.vx = left ? -160 : 160; }
      }
    }
  },
  // os tiros: no núcleo aberto tira vida; no casco, no escudo e na grade do núcleo só soltam faíscas
  shot(e, dmg, b) {
    if (e.state === 'dead' || e.state === 'dying') return false;
    const c = Sentinel.corePos(e);
    if (Math.hypot(b.x - c.x, b.y - c.y) < 20) {
      if (!Sentinel.damage(e, dmg)) { SFX.clang(); FX.burst(b.x, b.y, 8, 'c', 140, { life: 0.3, g: 0 }); }
      return true;
    }
    // aberto, o casco deixa o tiro passar até o núcleo (atrás do escudo ele fica no meio do casco)
    if (!Sentinel.exposed(e) && Math.abs(b.x - e.cx) < 60 && Math.abs(b.y - e.cy) < 36) { SFX.thud(); FX.burst(b.x, b.y, 6, 'c', 120, { life: 0.25, g: 0 }); return true; }
    return false;
  },
  draw(ctx, e, x, y) {
    if (e.state === 'dead') return;
    const t = e.t, camX = e.x - x, camY = e.y - y, cx = e.cx - camX + (e.hitT > 0 ? Math.sin(t * 90) * 2 : 0), cy = e.cy - camY;
    const hot = e.state === 'warn' || e.state === 'heat', open = Sentinel.exposed(e), stun = e.state === 'open';
    const tilt = Sentinel.low(e) ? Math.sin(t * 3) * 0.05 : Math.sin(t * 1.3) * 0.03;
    const c = { x: cx + e.core.x, y: cy + e.core.y };
    // a luz da Echo achando o núcleo (a frase certa)
    if (e.ray > 0) {
      const ex = Echo.x - camX, ey = Echo.y - camY, a = Math.min(1, e.ray / 0.4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(c.x, c.y);
      ctx.strokeStyle = `rgba(217,70,239,${(0.5 * a).toFixed(3)})`; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
    R.draw(R.glow('c', 64), cx, cy, 2.2, (hot ? 0.55 : 0.28) + 0.1 * Math.sin(t * 3), true);
    const drawCore = () => {
      const behind = Sentinel.where(e) === 'BEHIND' && !open && e.moveK >= 1;
      const pulse = 0.5 + 0.5 * Math.sin(t * (open ? 10 : 4));
      ctx.save(); if (behind) ctx.globalAlpha = 0.5;
      if (e.core.y > 40) { ctx.beginPath(); ctx.moveTo(cx - 10, cy + 24); ctx.lineTo(c.x - 4, c.y - 14); ctx.moveTo(cx + 10, cy + 24); ctx.lineTo(c.x + 4, c.y - 14); ctx.strokeStyle = wa(0.25); ctx.lineWidth = 1.2; ctx.stroke(); }
      if (e.core.x > 40) { ctx.beginPath(); ctx.moveTo(cx + 40, cy + 4); ctx.lineTo(c.x - 16, c.y); ctx.strokeStyle = wa(0.25); ctx.lineWidth = 2; ctx.stroke(); }
      R.draw(R.glow(open ? 'm' : 'c', 32), c.x, c.y, 1.1 + pulse * 0.3, 0.8, true);
      ctx.beginPath(); ctx.arc(c.x, c.y, 11, 0, Math.PI * 2); ctx.fillStyle = e.iT > 0 ? '#ffffff' : open ? '#fbe8ff' : '#d8fbff'; ctx.fill();
      ctx.beginPath(); ctx.arc(c.x, c.y, 5 + pulse * 2, 0, Math.PI * 2); ctx.fillStyle = open ? 'rgba(217,70,239,0.85)' : 'rgba(34,211,238,0.85)'; ctx.fill();
      // a grade que protege o núcleo (some quando ele abre)
      if (!open) { ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI + t * 0.6; ctx.moveTo(c.x + Math.cos(a) * 15, c.y + Math.sin(a) * 15); ctx.lineTo(c.x - Math.cos(a) * 15, c.y - Math.sin(a) * 15); } ctx.strokeStyle = wa(0.5); ctx.lineWidth = 1.4; ctx.stroke(); ctx.beginPath(); ctx.arc(c.x, c.y, 15, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(c.x, c.y, 20 + pulse * 3, 0, Math.PI * 2); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(240,171,252,0.85)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
      City.tag(ctx, 'CORE', c.x, c.y + (e.core.y > 40 ? 30 : -28));
    };
    // atrás do escudo: o núcleo é desenhado antes (fica por trás)
    if (Sentinel.where(e) === 'BEHIND' && e.moveK >= 1) drawCore();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    // as lâminas (asas de catedral)
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(Math.sin(t * 2 + s) * 0.06 + (stun ? 0.25 : 0));
      ctx.beginPath(); ctx.moveTo(44, -16); ctx.lineTo(96, -34); ctx.lineTo(84, -18); ctx.lineTo(104, -12); ctx.lineTo(80, -2); ctx.lineTo(92, 8); ctx.lineTo(50, 10); ctx.closePath();
      ctx.fillStyle = '#04070a'; ctx.fill(); ctx.strokeStyle = hot ? 'rgba(240,253,255,0.8)' : ca(0.5); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(52, -10); ctx.lineTo(90, -24); ctx.strokeStyle = ca(0.2); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    // o casco: um arco gótico invertido com torres
    ctx.beginPath(); ctx.moveTo(-58, -14); ctx.lineTo(-46, -30); ctx.lineTo(-30, -24); ctx.lineTo(-22, -40); ctx.lineTo(-12, -26); ctx.lineTo(0, -46); ctx.lineTo(12, -26); ctx.lineTo(22, -40); ctx.lineTo(30, -24); ctx.lineTo(46, -30); ctx.lineTo(58, -14);
    ctx.quadraticCurveTo(52, 22, 0, 34); ctx.quadraticCurveTo(-52, 22, -58, -14); ctx.closePath();
    ctx.fillStyle = '#05080c'; ctx.fill(); ctx.strokeStyle = hot ? 'rgba(240,253,255,0.9)' : wa(0.32); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-44, -10); ctx.quadraticCurveTo(0, 6, 44, -10); ctx.strokeStyle = ca(0.18); ctx.lineWidth = 1; ctx.stroke();
    // o olho no alto do casco (segue a Nexy; fechado dormindo)
    const look = clamp((P.cx - e.cx) / 300, -1, 1) * 8, lid = e.state === 'sleep' ? 1.2 : stun ? 1.5 : 4.5;
    ctx.beginPath(); ctx.ellipse(0, -18, 16, lid, 0, 0, Math.PI * 2); ctx.fillStyle = '#0a1418'; ctx.fill(); ctx.strokeStyle = ca(0.7); ctx.lineWidth = 1; ctx.stroke();
    R.draw(R.glow('c', 16), look, -18, 1, e.state === 'sleep' ? 0.3 : 0.95, true);
    ctx.beginPath(); ctx.arc(look, -18, Math.min(3.2, lid), 0, Math.PI * 2); ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#a5f3fc'; ctx.fill();
    ctx.restore();
    // o ESCUDO: placa hexagonal ciano na frente do casco (sobe quando o núcleo abre)
    const lift = open ? -26 : 0, sx = cx, sy = cy + 8 + lift;
    ctx.save(); ctx.globalAlpha = open ? 0.45 : 1;
    R.draw(R.glow('c', 40), sx, sy, 1.1, 0.35, true);
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(sx + Math.cos(a) * 30, sy + Math.sin(a) * 30); } ctx.closePath();
    ctx.fillStyle = 'rgba(34,211,238,0.16)'; ctx.fill(); ctx.strokeStyle = ca(0.85); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(sx + i * 10, sy - 22); ctx.lineTo(sx + i * 10, sy + 22); } ctx.strokeStyle = ca(0.12); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    City.tag(ctx, 'SHIELD', sx - 48, sy - 34);
    if (!(Sentinel.where(e) === 'BEHIND' && e.moveK >= 1)) drawCore();
    // a vida da rodada e as rodadas (pontinhos)
    if (e.state !== 'sleep') {
      const w = 90, bx = cx - w / 2, by = cy - 64;
      rrect(ctx, bx, by, w, 5, 2.5); ctx.fillStyle = 'rgba(4,8,11,0.9)'; ctx.fill(); ctx.strokeStyle = ca(0.4); ctx.lineWidth = 1; ctx.stroke();
      rrect(ctx, bx + 1, by + 1, (w - 2) * Math.max(0, e.hp) / SENTINEL.hp, 3, 1.5); ctx.fillStyle = open ? '#f0abfc' : ca(0.8); ctx.fill();
      for (let i = 0; i < SENTINEL.rounds.length; i++) { ctx.beginPath(); ctx.arc(cx - 12 + i * 12, by - 7, 2.6, 0, Math.PI * 2); ctx.fillStyle = i < e.round ? 'rgba(240,171,252,0.9)' : ca(0.35); ctx.fill(); }
    }
  },
});

/* ---------- a cena da queda do Sentinela (na pegada God of War): tudo para, rachaduras de luz, tambores, explosão ---------- */
const SentinelScene = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 0, flash: 0, ev: {},
  start(e) {
    Object.assign(this, { active: true, t: 0, zoom: 1, sat: 0, letter: 0, flash: 0, ev: {}, e, text: null, textT: 0, voiceDone: true, title: 0, cracks: [] });
    e.state = 'dying'; e.cage = 0; EnemyFire.list = []; Power.bolts = [];
    for (const d of Ents.list) if (d.type === 'drone' && !d.dead && d.summoned) Enemy.kill(d, 'pop', 1);
    const c = Sentinel.corePos(e);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + Math.random() * 0.4, pts = [{ x: 0, y: 0 }]; let px = 0, py = 0; for (let j = 0; j < 5; j++) { px += Math.cos(a + (Math.random() - 0.5) * 0.9) * 16; py += Math.sin(a + (Math.random() - 0.5) * 0.9) * 12; pts.push({ x: px, y: py }); } this.cracks.push(pts); }
    this.c0 = { x: c.x - e.cx, y: c.y - e.cy };
    Game.state = 'cinematic'; Game.clearInput(); P.vx = 0;
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.4 }); Music.setDrone(true);
    SFX.impact(); Game.shake(8);
  },
  once(k, fn) { if (!this.ev[k]) { this.ev[k] = true; fn(); } },
  say(line, who = 'story') {
    this.text = line; this.textT = 0; this.voiceDone = false;
    if (!Voice.say(line.en, who, { onEnd: () => { this.voiceDone = true; } })) this.voiceDone = true;
  },
  key(e) {
    if (e.code === 'Escape') return this.end();
    if (['Enter', 'NumpadEnter', 'Space', 'KeyZ'].includes(e.code) && this.t > 1) { Voice.stop(); this.voiceDone = true; if (this.t > 4.5) this.end(); else { this.t = Math.max(this.t, 2.8); } }
  },
  tap() { this.key({ code: 'Enter' }); },
  update(dt) {
    if (!this.active) return;
    this.t += dt; this.textT += dt; const t = this.t, e = this.e;
    this.letter = Math.min(1, t * 2);
    this.zoom = 1 + 0.18 * Math.min(1, t / 0.6) * (t < 4 ? 1 : Math.max(0, 1 - (t - 4) / 0.8));
    this.sat = t < 2.8 ? Math.min(0.85, t * 1.5) : Math.max(0, 0.85 - (t - 2.8) * 0.5);
    // os tambores de guerra enquanto a luz racha o casco
    for (const [k, at] of [['d1', 0.35], ['d2', 1], ['d3', 1.6]]) if (t > at) this.once(k, () => { SFX.warDrum(); Game.shake(3); });
    if (t > 1.3) this.once('beat', () => SFX.heartbeat());
    if (t > 1.8) this.once('rise', () => SFX.riser(1));
    // a explosão
    if (t > 2.8) this.once('boom', () => {
      SFX.impact(); SFX.shatter(); SFX.crush(); Game.shake(14); this.flash = 1;
      const c = Sentinel.corePos(e); FX.burst(c.x, c.y, 90, 'c', 520, { life: 1.4, g: 300 }); FX.burst(c.x, c.y, 50, 'm', 420, { life: 1.2, g: 200 });
      FX.burst(e.cx, e.cy, 40, 'c', 300, { life: 1.6, g: 600 });
      for (let i = 0; i < 8; i++) Ents.spawn('orb', { x: c.x, y: c.y, vx: (i - 3.5) * 70, vy: -360, homing: true, delay: 0.6 + i * 0.05 });
      e.state = 'dead'; Save.data.met.sentinel = true; Save.write();
    });
    if (t > 3.3) { this.title = Math.min(1, this.title + dt * 2); this.once('line1', () => this.say(SENTINEL.scene[0])); }
    if (t > 5) this.once('line2', () => { if (this.voiceDone) this.say(SENTINEL.scene[1]); else this.ev.line2 = false; });
    if (t > 8.5 && this.voiceDone || t > 14) this.end();
    this.flash = Math.max(0, this.flash - dt * 1.4);
    FX.update(dt);
  },
  end() {
    if (!this.active) return;
    const e = this.e;
    if (e.state !== 'dead') { e.state = 'dead'; Save.data.met.sentinel = true; Save.write(); }
    this.active = false; this.letter = 0; this.zoom = 1; this.sat = 0;
    Music.setDrone(false); Music.normal();
    if (Game.state === 'cinematic') Game.state = 'play';
    Game.clearInput();
    World.setTarget('bossgate', 'small'); SFX.doorOpen(); Game.shake(3);
    if (Game.echoBorn) Game.later(0.6, () => Echo.talk(ECHO.lines.victory));
  },
  drawWorld(ctx, camX, camY) {
    const e = this.e; if (!e || e.state === 'dead') return;
    const t = this.t, k = clamp(t / 2.6, 0, 1), cx = e.cx + this.c0.x - camX, cy = e.cy + this.c0.y - camY;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const pts of this.cracks) {
      const n = Math.max(1, Math.floor(k * (pts.length - 1)) + 1);
      ctx.beginPath(); ctx.moveTo(cx, cy); for (let i = 1; i < n; i++) ctx.lineTo(cx + pts[i].x * (1 + k), cy + pts[i].y * (1 + k));
      ctx.strokeStyle = `rgba(165,243,252,${(0.5 + 0.4 * k).toFixed(3)})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    R.draw(R.glow('w', 48), cx, cy, 1 + k * 2.5, 0.4 + 0.5 * k, true);
    R.draw(R.glow('m', 64), cx, cy, 1 + k * 2, 0.3 + 0.4 * k, true);
    ctx.restore();
  },
  drawScreen(ctx) {
    if (!this.active) return;
    const W = CFG.VIEW_W, H = CFG.VIEW_H, bar = 62 * this.letter;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    if (this.title > 0) {
      R.draw(R.text('SENTINEL DOWN', '900 34px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 16), W / 2, 150, 1 + (1 - this.title) * 0.4, this.title);
      R.draw(R.text('O SENTINELA CAIU', '600 12px Orbitron, Inter, sans-serif', wa(0.7), null, 0), W / 2, 184, 1, this.title);
    }
    if (this.text) {
      const kt = Math.min(1, this.textT * 3);
      R.draw(R.text(this.text.en, '700 20px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 12), W / 2, H - bar - 52, 1, kt);
      if (this.text.pt) R.draw(R.text(this.text.pt, '400 13px Inter, sans-serif', wa(0.78), null, 0), W / 2, H - bar - 26, 1, kt);
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(240,250,255,${this.flash.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  },
};

/* ---------- o que é da fase (avisos da Echo uma vez por partida) e o portão do fim ---------- */
const City2 = {
  metDrone: false, metBeam: false, metGates: false,
  reset() { this.metDrone = false; this.metBeam = false; this.metGates = false; Sentinel.ent = null; SentinelScene.active = false; Power.reset(); },
  // o portão do fim: grade de ferro com faixas de luz (afunda quando o Sentinela cai)
  drawShutter(ctx, t, x, y, w, h, time) {
    const p = 0.5 + 0.5 * Math.sin(time * 2);
    R.draw(R.glow('c', 48), x + w / 2, y + h / 2, Math.max(1, h / 70), 0.2 + 0.1 * p + t.glow * 0.5, true);
    rrect(ctx, x + 1, y + 1, w - 2, h - 2, 4); ctx.fillStyle = 'rgba(5,8,11,0.97)'; ctx.fill(); ctx.strokeStyle = ca(0.6 + t.glow * 0.3); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); for (let yy = y + 10; yy < y + h - 4; yy += 12) { ctx.moveTo(x + 5, yy); ctx.lineTo(x + w - 5, yy); } ctx.strokeStyle = wa(0.1); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 6); ctx.lineTo(x + w / 2, y + h - 6); ctx.strokeStyle = ca(0.3 + 0.2 * p); ctx.stroke();
    // o olho do Sentinela gravado no portão (aberto só quando ele cair)
    if (h > 40) { ctx.beginPath(); ctx.ellipse(x + w / 2, y + 30, 10, 4, 0, 0, Math.PI * 2); ctx.strokeStyle = ca(0.7); ctx.stroke(); ctx.beginPath(); ctx.arc(x + w / 2, y + 30, 2.4, 0, Math.PI * 2); ctx.fillStyle = '#a5f3fc'; ctx.fill(); }
  },
};
