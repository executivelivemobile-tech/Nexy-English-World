
/* ============================== 1-1 · A CHEGADA E O NASCIMENTO DO ECHO ==============================
   A Nexy chega sozinha, num feixe de luz. Ao dizer a primeira palavra (HELLO! na porta 1), ela ecoa pela catedral,
   as ondas voltam, as letras H-E-L-L-O giram e se juntam numa luz: nasce o ECHO, a primeira ferramenta (e o primeiro
   amigo). Depois, o PULSO DO ECHO (tecla C, LB no controle, botão ECHO no toque) revela segredos.
   As cenas usam a mesma interface da cena do Coração (Cine): zoom, sat, letter, timeScale, drawWorld, drawScreen. */

/* ---------- a chegada: a Nexy desce do céu num feixe magenta ---------- */
const Arrival = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 1, glow: 0, flash: 0, landed: -1, foot: 0, rings: [],
  start() {
    Object.assign(this, { active: true, t: 0, zoom: 1.12, sat: 0, letter: 0.6, glow: 0, flash: 0, landed: -1, rings: [] });
    this.foot = P.y + P.h; P.y = Cam.y - 120; P.py = P.y; P.vx = 0; P.vy = 0; P.invuln = 99;
    Game.state = 'cinematic'; SFX.riser(1.2);
  },
  key() { if (this.t > 0.4) this.finish(); },
  finish() { P.y = this.foot - P.h; P.py = P.y; P.vy = 0; if (this.landed < 0) this.land(); this.end(); },
  land() {
    this.landed = this.t; this.flash = 0.35; Game.shake(5); SFX.warDrum();
    this.rings.push({ x: P.cx, y: this.foot, r: 6, life: 1 });
    FX.burst(P.cx, this.foot, 30, 'm', 260, { life: 0.8, g: 300 }); FX.burst(P.cx, this.foot, 20, 'c', 200, { life: 0.7, g: 300 });
    P.squash = 0.35;
  },
  update(dt) {
    this.t += dt;
    if (this.landed < 0) {
      P.py = P.y; P.y = Math.min(this.foot - P.h, P.y + dt * (260 + this.t * 280));
      if (Math.random() < 0.8) FX.add(P.cx + (Math.random() - 0.5) * 20, P.y + P.h, { vy: -40, vx: (Math.random() - 0.5) * 30, life: 0.5, size: 1.3, c: 'm', g: 0 });
      if (P.y + P.h >= this.foot) this.land();
    } else {
      if (P.squash) P.squash = approach(P.squash, 0, dt * 2.2);
      if (this.t - this.landed > 0.9) this.end();
    }
    for (const r of this.rings) { r.r += dt * 420; r.life -= dt * 1.6; }
    this.rings = this.rings.filter(r => r.life > 0);
    this.flash = Math.max(0, this.flash - dt * 2);
    P.px = P.x; FX.update(dt);
  },
  end() { this.active = false; this.letter = 0; this.zoom = 1; if (Game.state === 'cinematic') Game.state = 'play'; P.invuln = 0; Game.clearInput(); },
  drawWorld(ctx, camX) {
    if (this.landed < 0 || this.t - this.landed < 0.4) {   // o feixe
      const x = P.cx - camX, k = this.landed < 0 ? 1 : 1 - (this.t - this.landed) / 0.4;
      const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
      g.addColorStop(0, 'rgba(217,70,239,0)'); g.addColorStop(0.5, `rgba(240,171,252,${0.35 * k})`); g.addColorStop(1, 'rgba(217,70,239,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 26, 0, 52, this.foot - Cam.y);
    }
    for (const r of this.rings) { ctx.save(); ctx.translate(r.x - camX, r.y - Cam.y); ctx.scale(1, 0.3); ctx.beginPath(); ctx.arc(0, 0, r.r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(232,121,249,${r.life})`; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }
  },
  drawScreen(ctx) {
    if (!this.active) return;
    const bar = 62 * this.letter;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CFG.VIEW_W, bar); ctx.fillRect(0, CFG.VIEW_H - bar, CFG.VIEW_W, bar);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H); }
  },
};

/* ---------- o nascimento do Echo ---------- */
const Birth = {
  active: false, t: 0, d: null, zoom: 1, sat: 0, letter: 0, timeScale: 1, glow: 0, flash: 0, rings: [], letters: [], motes: [], ev: {}, born: -1, title: null, home: null,
  start(d) {
    Object.assign(this, { active: true, t: 0, d, zoom: 1, sat: 0, letter: 0, glow: 0, flash: 0, rings: [], letters: [], motes: [], ev: {}, born: -1, title: null });
    Game.state = 'cinematic'; P.vx = 0; P.facing = 1; P.invuln = 99; Game.clearInput();
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.4 }); Music.setDrone(true);
    const cx = d.x + d.w / 2, cy = d.y - 84;
    this.src = { x: cx, y: cy };
    'HELLO'.split('').forEach((ch, i) => this.letters.push({ ch, x: cx - 40 + i * 20, y: cy, a: i * 1.25, r: 0, k: 0 }));
    this.fast = !!Save.data.met.echo;   // nas outras vezes a cena é mais curta
  },
  once(k, fn) { if (!this.ev[k]) { this.ev[k] = true; fn(); } },
  key(e) { if (['Enter', 'NumpadEnter', 'Escape', 'Space', 'KeyZ'].includes(e.code) && this.t > 0.8) this.skip(); },
  update(dt) {
    const sp = this.fast ? 1.6 : 1; this.t += dt * sp; const t = this.t;
    const ease = (a, b, k) => a + (b - a) * (1 - Math.exp(-dt * k));
    const home = { x: P.cx - 30, y: P.y - 14 };
    this.home = home;
    if (t < 6.2) { this.letter = ease(this.letter, 1, 4); this.zoom = ease(this.zoom, 1.32, 2); this.sat = ease(this.sat, 0.55, 2); }
    // 1. a palavra ecoa: três ondas saindo da inscrição, cada vez mais fracas
    [[0.15, 0.75], [1.0, 0.45], [1.8, 0.25]].forEach(([at, vol], i) => {
      if (t > at) this.once('echo' + i, () => {
        Voice.say('Hello', 'echo', { volume: vol, rate: 0.85 - i * 0.08, pitch: 1 - i * 0.1 });
        SFX.sonar(vol); this.rings.push({ x: this.src.x, y: this.src.y, r: 10, v: 520, life: 1, c: 'c' });
      });
    });
    // 2. as letras se soltam da inscrição e começam a girar
    for (const l of this.letters) {
      if (t > 0.6) { l.k = Math.min(1, l.k + dt * 2); l.a += dt * (1.6 + Math.max(0, t - 2.4) * 2); }
      const conv = clamp((t - 2.4) / 1.2, 0, 1), cxp = lerp(this.src.x, home.x, conv), cyp = lerp(this.src.y, home.y, conv);
      const r = lerp(46, 0, conv * conv);
      l.x = cxp + Math.cos(l.a) * r; l.y = cyp + Math.sin(l.a) * r * 0.6;
    }
    // 3. as ondas voltam: partículas de luz convergem para onde o Echo vai nascer
    if (t > 2.4 && t < 3.6 && Math.random() < 0.9) for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2, d = 160 + Math.random() * 200;
      this.motes.push({ x: home.x + Math.cos(a) * d, y: home.y + Math.sin(a) * d * 0.7, life: 1 });
    }
    for (const m of this.motes) { m.x = lerp(m.x, home.x, 1 - Math.exp(-dt * 5)); m.y = lerp(m.y, home.y, 1 - Math.exp(-dt * 5)); m.life -= dt * 1.4; }
    this.motes = this.motes.filter(m => m.life > 0);
    if (t > 2.4) this.once('in', () => { SFX.choir(3); SFX.riser(1.2); });
    // 4. nascimento
    if (t > 3.6) this.once('born', () => {
      this.born = t; this.flash = 0.9; Game.shake(6); SFX.warDrum(); SFX.powerup(); SFX.letter();
      this.rings.push({ x: home.x, y: home.y, r: 6, v: 640, life: 1, c: 'm' });
      FX.burst(home.x, home.y, 50, 'm', 300, { life: 1, g: 0 }); FX.burst(home.x, home.y, 30, 'c', 240, { life: 0.9, g: 0 });
      Echo.hidden = false; Echo.x = home.x; Echo.y = home.y; Echo.px = Echo.x; Echo.py = Echo.y; Echo.birthK = 0;
      this.letters = []; Game.echoBorn = true; Save.data.met.echo = true; Save.write();
    });
    if (this.born >= 0) Echo.birthK = Math.min(1, (t - this.born) / 0.7);
    if (t > 4.0) this.once('title', () => { this.title = { k: 0 }; Music.resolve(); });
    if (this.title) this.title.k = Math.min(1, this.title.k + dt * 2.5);
    // 5. o Echo dá uma volta em oito em volta da Nexy, deixando um rastro
    if (t > 4.6 && t < 6.0) {
      const u = (t - 4.6) / 1.4 * Math.PI * 2;
      Echo.px = Echo.x; Echo.py = Echo.y;
      Echo.x = P.cx + Math.sin(u) * 70; Echo.y = P.y - 10 + Math.sin(u * 2) * 26;
      FX.add(Echo.x, Echo.y, { vx: 0, vy: 0, life: 0.5, size: 1.6, c: 'm', g: 0 });
    } else if (this.born >= 0) { Echo.px = Echo.x; Echo.py = Echo.y; Echo.x = lerp(Echo.x, home.x, 1 - Math.exp(-dt * 6)); Echo.y = lerp(Echo.y, home.y, 1 - Math.exp(-dt * 6)); }
    if (t > 6.0) { this.title = null; this.letter = ease(this.letter, 0, 5); this.zoom = ease(this.zoom, 1, 5); this.sat = ease(this.sat, 0, 5); }
    if (t > 6.6) this.end();
    for (const r of this.rings) { r.r += r.v * dt; r.life -= dt * 0.9; }
    this.rings = this.rings.filter(r => r.life > 0);
    this.flash = Math.max(0, this.flash - dt * 1.8);
    P.px = P.x; P.py = P.y; FX.update(dt);
  },
  skip() {
    if (this.born < 0) { this.t = 3.61; this.update(0); }
    Echo.birthK = 1; this.end();
  },
  end() {
    if (!this.active) return;
    this.active = false; this.letter = 0; this.zoom = 1; this.sat = 0; this.title = null;
    Echo.hidden = false; Echo.birthK = 1; Game.echoBorn = true;
    Game.state = 'play'; P.invuln = 0; Game.clearInput(); Music.setDrone(false); Music.normal();
    const d = this.d; d.opening = 0.001; SFX.doorOpen(); Game.shake(2);
    Echo.talk(ECHO.lines.birth); EchoPulse.tutorial = true;
  },
  drawWorld(ctx, camX, camY, time) {
    for (const r of this.rings) {
      ctx.beginPath(); ctx.arc(r.x - camX, r.y - camY, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = r.c === 'm' ? `rgba(232,121,249,${0.8 * r.life})` : `rgba(122,216,255,${0.6 * r.life})`; ctx.lineWidth = 2; ctx.stroke();
    }
    for (const m of this.motes) R.draw(R.glow(Math.random() < 0.5 ? 'c' : 'm', 8), m.x - camX, m.y - camY, 1, m.life, true);
    for (const l of this.letters) {
      R.draw(R.glow('m', 22), l.x - camX, l.y - camY, 1, 0.6 * l.k, true);
      R.draw(R.text(l.ch, '900 18px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 8), l.x - camX, l.y - camY, 1, Math.max(0.3, l.k));
    }
    if (this.born >= 0 && this.t - this.born < 0.8) R.draw(R.glow('t', 64), Echo.x - camX, Echo.y - camY, 2.4 * (1 - (this.t - this.born) / 0.8), 1, true);
  },
  drawScreen(ctx) {
    if (!this.active) return;
    const bar = 62 * this.letter;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CFG.VIEW_W, bar); ctx.fillRect(0, CFG.VIEW_H - bar, CFG.VIEW_W, bar);
    if (this.title) {
      const k = this.title.k;
      R.draw(R.glow('m', 64), 480, 116, 3.2, 0.45 * k, true);
      R.draw(R.text('ECHO', '900 54px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 18), 480, 112, 1 + (1 - k) * 0.6, k);
      R.draw(R.text('YOUR FIRST TOOL · YOUR FRIEND', '600 13px Orbitron, Inter, sans-serif', '#22d3ee', 'rgba(0,217,249,0.8)', 8), 480, 156, 1, k);
      R.draw(R.text('Sua primeira ferramenta. Sua amiga.', '400 12px Inter, sans-serif', wa(0.7), null, 0), 480, 178, 1, k);
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, this.flash)})`; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H); }
  },
};

/* ---------- o PULSO DO ECHO: um sonar que revela o que está escondido ---------- */
const EchoPulse = {
  cool: 0, rings: [], tutorial: false, used: false, R: 8 * TS,
  reset() { this.cool = 0; this.rings = []; this.tutorial = false; },
  fire() {
    if (!Game.echoBorn || Echo.hidden || this.cool > 0 || Game.state !== 'play') return false;
    this.cool = 1.2; this.used = true; this.tutorial = false;
    this.rings.push({ x: Echo.x, y: Echo.y, r: 6, life: 1 }, { x: Echo.x, y: Echo.y, r: -40, life: 1 });
    SFX.sonar(1); Echo.pulse = 1;
    let found = 0;
    for (const b of World.blocks.values()) {
      const bx = b.c * TS + TS / 2, by = b.r * TS + TS / 2; if (Math.hypot(bx - Echo.x, by - Echo.y) > this.R) continue;
      if (b.kind === 'invisible' && b.state === 'hidden') { b.ping = 3; found++; }
      else if (b.kind === 'question' && b.state === 'ready' && b.content && b.content.word) b.peek = 3;
      else if (b.kind === 'glitch' && b.state === 'hidden') b.flick = 0.5;   // o tijolo do bug só pisca: a Echo não o vê
    }
    for (const v of World.veils) {
      if (v.found) continue;
      const vx = clamp(Echo.x, v.x, v.x + v.w), vy = clamp(Echo.y, v.y, v.y + v.h);
      if (Math.hypot(vx - Echo.x, vy - Echo.y) <= this.R) { v.ping = 3; found++; }
    }
    // no TO BE PALACE o pulso também vê o passado: o contorno do que existia e a Echo dizendo o que era
    const past = Palace.ping(), box = City.ping();   // na cidade: a caixa escondida atrás de algo
    if (found && !past && !box) Echo.talk(ECHO.lines.found);
    return true;
  },
  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    for (const r of this.rings) { r.r += dt * 520; r.life -= dt * 1.5; }
    this.rings = this.rings.filter(r => r.life > 0 && r.r < this.R + 60);
  },
  draw(ctx, camX, camY) {
    for (const r of this.rings) {
      if (r.r <= 0) continue;
      ctx.beginPath(); ctx.arc(r.x - camX, r.y - camY, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(232,121,249,${0.7 * r.life})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(r.x - camX, r.y - camY, r.r * 0.94, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(122,216,255,${0.3 * r.life})`; ctx.lineWidth = 1; ctx.stroke();
    }
    // dica da ferramenta nova, até o primeiro uso
    if (this.tutorial && !Echo.hidden && Game.state === 'play') {
      const s = R.text(Input.padSeen ? 'LB · ECHO' : 'C · ECHO', '700 10px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 6);
      const x = Echo.x - camX, y = Echo.y - camY - 22 - Math.abs(Math.sin(Game.time * 3)) * 4;
      capsulePath(ctx, x, y, s.w - 12, 20); ctx.fillStyle = 'rgba(2,2,2,0.75)'; ctx.fill(); ctx.strokeStyle = 'rgba(217,70,239,0.8)'; ctx.lineWidth = 1; ctx.stroke();
      R.draw(s, x, y + 0.5);
    }
  },
};

/* ---------- placas de dica: aparecem quando você chega perto e somem quando a ação já foi feita ---------- */
const Hints = {
  done: {},
  reset() { this.done = {}; },
  mark(k) { this.done[k] = true; },
  draw(ctx, camX, camY, time) {
    const list = World.level.hints; if (!list) return;
    for (const h of list) {
      if (this.done[h.until]) continue;
      const x = h.c * TS + TS / 2 - camX, y = h.r * TS - camY, d = Math.abs(P.cx - (h.c * TS + TS / 2));
      const k = clamp(1 - (d - 4 * TS) / (3 * TS), 0, 1); if (k <= 0) continue;
      const en = R.text(h.en, '700 11px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,0.9)', 6), pt = R.text(h.pt, '400 11px Inter, sans-serif', wa(0.7), null, 0);
      const w = Math.max(en.w, pt.w) + 4, hh = 42, yy = y - 6 + Math.sin(time * 2 + h.c) * 2;
      ctx.save(); ctx.globalAlpha = k;
      rrect(ctx, x - w / 2, yy - hh / 2, w, hh, 10); ctx.fillStyle = 'rgba(2,2,2,0.7)'; ctx.fill(); ctx.strokeStyle = ca(0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      R.draw(en, x, yy - 8, 1, k); R.draw(pt, x, yy + 10, 1, k);
    }
  },
};
