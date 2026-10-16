/* ============================== TO BE PALACE · as peças da fase ==============================
   Cavaleiro (KNIGHT), o INTERRUPTOR DO SER, o desenho dos alvos do passado (ponte de luz, estátuas, portão),
   o chão-espelho, o fundo do palácio, a lembrança da primeira visita (PalaceIntro) e a cena do interruptor
   (PalaceSwitch, na pegada God of War: pausa pesada, tambor, impacto congelado, onda de luz). */

/* ---------- CAVALEIRO: armadura vazia que ainda patrulha ----------
   Pisão comum só faz o elmo tinir (ele cambaleia e a Nexy quica); pisão com giro, casco, tiro duplo da Echo
   ou a Nexy gigante desmontam a armadura. Encostar de lado machuca. */
Ents.reg('knight', {
  layer: 'enemy',
  init(e) { e.w = 26; e.h = 40; e.dir = -1; e.enemy = true; e.kind = 'enemy'; e.state = 'walk'; e.res = {}; e.onGround = false; e.creature = 'KNIGHT'; e.stagger = 0; },
  update(e, dt) {
    if (e.state === 'dying') return Enemy.dyingUpdate(e, dt);
    if (e.stagger > 0) { e.stagger -= dt; e.vx = 0; Enemy.physics(e, dt); return; }
    Enemy.walk(e, dt, 42, true);
    if (!Palace.metKnight && Game.echoBorn && Math.abs(P.cx - (e.x + e.w / 2)) < 8 * TS) { Palace.metKnight = true; Echo.talk(ECHO.lines.knight); }
  },
  clang(e) {
    e.stagger = 0.9; SFX.clang(); Game.registerCreature('KNIGHT');
    FX.burst(e.x + e.w / 2, e.y + 4, 12, 'c', 180, { life: 0.4 });
  },
  draw(ctx, e, x, y) {
    const w = e.w, h = e.h, t = e.t, f = e.dir;
    Enemy.rim(x + w / 2, y + h * 0.5, w + 10);
    ctx.save();
    if (e.state === 'dying') { ctx.translate(x + w / 2, y + h / 2); ctx.rotate(e.spinA); ctx.translate(-x - w / 2, -y - h / 2); }
    if (e.stagger > 0) ctx.translate(Math.sin(t * 60) * 1.6 * Math.min(1, e.stagger), 0);
    const step = e.stagger > 0 ? 0 : Math.sin(t * 9) * 2.5, cx = x + w / 2;
    // lança atrás do corpo
    const lx = cx - f * 10;
    ctx.beginPath(); ctx.moveTo(lx, y + h); ctx.lineTo(lx, y - 8); ctx.strokeStyle = wa(0.24); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, y - 16); ctx.lineTo(lx + 3, y - 8); ctx.lineTo(lx - 3, y - 8); ctx.closePath(); ctx.fillStyle = ca(0.7); ctx.fill();
    // grevas
    ctx.beginPath(); ctx.moveTo(x + 9, y + h - 12); ctx.lineTo(x + 8 + step, y + h); ctx.moveTo(x + w - 9, y + h - 12); ctx.lineTo(x + w - 8 - step, y + h);
    ctx.strokeStyle = wa(0.3); ctx.lineWidth = 3; ctx.stroke();
    // peitoral
    ctx.beginPath(); ctx.moveTo(x + 3, y + 15); ctx.lineTo(x + w - 3, y + 15); ctx.lineTo(x + w - 6, y + h - 10); ctx.lineTo(x + 6, y + h - 10); ctx.closePath();
    ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = wa(0.32); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + 17); ctx.lineTo(cx, y + h - 12); ctx.strokeStyle = wa(0.1); ctx.stroke();
    // ombreiras
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * 10, y + 16, 5.5, 3.5, 0, Math.PI, 0); ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.stroke(); }
    // elmo com a fenda acesa e o penacho
    rrect(ctx, x + 6, y + 1, w - 12, 14, [6, 6, 2, 2]); ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = wa(0.34); ctx.stroke();
    R.draw(R.glow('c', 14), cx + f * 2, y + 8, 0.8, 0.75, true);
    ctx.beginPath(); ctx.moveTo(cx - 6 + f, y + 8); ctx.lineTo(cx + 6 + f, y + 8); ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + 1); ctx.quadraticCurveTo(cx - f * 10, y - 9, cx - f * 15, y + 4); ctx.strokeStyle = ca(0.55); ctx.lineWidth = 1.4; ctx.stroke();
    // escudo na frente
    const sx = cx + f * 9, sy = y + 18;
    ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx + 6, sy + 9); ctx.lineTo(sx, sy + 15); ctx.lineTo(sx - 6, sy + 9); ctx.closePath();
    ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = ca(0.5); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  },
});

/* ---------- O INTERRUPTOR DO SER: a alavanca que acende o palácio ---------- */
Ents.reg('beswitch', {
  layer: 'back',
  init(e) {
    e.w = 136; e.h = 64; e.x = e.c * TS + TS / 2 - e.w / 2; e.y = (e.r + 1) * TS - e.h; e.k = 0;
    const def = World.level.doors[e.opts.door];
    World.doors[e.opts.door] = { id: e.opts.door, def, kind: 'pedestal', x: e.c * TS, y: e.r * TS, w: 32, h: 32, open: false, opening: 0, errors: 0, read: false, hint: false, morph: 0, ent: e };
  },
  draw(ctx, e, x, y) {
    const t = e.t, cx = x + e.w / 2, base = y + e.h, k = e.k, lit = Flags.get('palaces.toBe') ? 1 : 0;
    R.draw(R.glow(k > 0.5 ? 'm' : 'c', 64), cx, base - 40, 1.4, 0.3 + 0.12 * Math.sin(t * 2) + k * 0.4, true);
    // degraus de pedra
    rrect(ctx, x, base - 14, e.w, 14, [4, 4, 0, 0]); ctx.fillStyle = 'rgba(10,15,18,0.96)'; ctx.fill(); ctx.strokeStyle = wa(0.18); ctx.lineWidth = 1; ctx.stroke();
    rrect(ctx, x + 30, base - 26, e.w - 60, 12, [4, 4, 0, 0]); ctx.fillStyle = 'rgba(10,15,18,0.98)'; ctx.fill(); ctx.strokeStyle = ca(0.55); ctx.stroke();
    // as cinco formas do verbo gravadas na base (acendem quando o palácio acorda)
    ['AM', 'IS', 'ARE', 'WAS', 'WERE'].forEach((wd, i) => R.draw(R.text(wd, '700 7px Orbitron, Inter, sans-serif', wa(0.85), ca(0.9), 4), x + 20 + i * 24, base - 6, 1, 0.35 + 0.65 * Math.max(lit, k)));
    // a alavanca: de pé (-55°) até deitada (+55°)
    const a = lerp(-0.95, 0.95, k), px = cx, py = base - 26, L = 46;
    ctx.save(); ctx.translate(px, py); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -L); ctx.strokeStyle = wa(0.5); ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -L); ctx.strokeStyle = 'rgba(10,15,18,1)'; ctx.lineWidth = 2; ctx.stroke();
    R.draw(R.glow(k > 0.5 ? 'm' : 'c', 24), 0, -L, 1, 0.8, true);
    ctx.beginPath(); ctx.arc(0, -L, 7, 0, Math.PI * 2); ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = k > 0.5 ? '#e879f9' : ca(0.9); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = ca(0.7); ctx.lineWidth = 1.2; ctx.stroke();
    R.draw(R.text('BE', '900 12px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 6), px, py - 66, 1, 0.6 + 0.4 * Math.sin(t * 2));
  },
});

/* ---------- a fase: pulso que vê o passado, alvos com cara própria, chão-espelho ---------- */
const Palace = {
  metKnight: false, lit: 0, buf: null,
  reset() { this.metKnight = false; this.lit = Flags.get('palaces.toBe') ? 1 : 0; },
  // entrando no palácio: a lembrança na primeira visita; depois só a Echo lembrando do pulso
  enter(viaTransition) {
    this.reset();
    if (Game.noIntro) return;
    if (!Save.data.met.palace) setTimeout(() => { if (Game.state === 'play' && World.level.id === 'palace' && !Game.scene()) PalaceIntro.start(); }, viaTransition ? 0 : 50);
    else Game.later(1.2, () => Echo.talk(ECHO.lines.past));
  },
  // pulso da Echo perto de um alvo do passado: o contorno do que existia aparece e a Echo diz o que era
  ping() {
    let said = false;
    for (const id in World.targets) {
      const t = World.targets[id];
      if (t.kind !== 'rune' || !t.look || !t.past && t.ghost !== 'ping' || t.state !== 'small') continue;
      const rc = World.runeRect(t, t.big);
      const dx = clamp(Echo.x, rc.c0 * TS, (rc.c1 + 1) * TS) - Echo.x, dy = clamp(Echo.y, rc.r0 * TS, (rc.r1 + 1) * TS) - Echo.y;
      if (Math.hypot(dx, dy) > EchoPulse.R) continue;
      t.ping = 3.5; Hints.mark('pastping');
      if (t.past && !t.pastSaid && !said) { t.pastSaid = true; said = true; Echo.talk([t.past]); }
    }
    return said;
  },
  // o contorno tracejado do tamanho que existia (sempre fraco, ou forte por alguns segundos depois do pulso)
  drawGhost(ctx, t, camX, camY, time) {
    if (!t.ghost || t.state !== 'small') return;
    const k = t.ghost === 'always' ? 0.22 + 0.08 * Math.sin(time * 2 + t.c) : 0;
    const a = Math.max(k, t.ping > 0 ? Math.min(1, t.ping) * 0.9 : 0); if (a <= 0.01) return;
    const rc = World.runeRect(t, t.big), x = rc.c0 * TS - camX, y = rc.r0 * TS - camY, w = t.big.w * TS, h = t.big.h * TS;
    if (x > CFG.VIEW_W + 40 || x + w < -40) return;
    ctx.save(); ctx.globalAlpha = a;
    if (t.look === 'knight') this.statue(ctx, x, y, w, h, time, true);
    else { rrect(ctx, x + 2, y + 2, w - 4, h - 4, 6); ctx.fillStyle = 'rgba(34,211,238,0.06)'; ctx.fill(); }
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -time * 14;
    rrect(ctx, x + 2, y + 2, w - 4, h - 4, 6); ctx.strokeStyle = '#7ad8ff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  },
  // desenho próprio de cada tipo de alvo (devolve true se desenhou)
  drawTarget(ctx, t, x, y, w, h, time) {
    const p = 0.5 + 0.5 * Math.sin(time * 2 + t.c);
    if (t.look === 'memory') {
      // pedra de luz: a lembrança que voltou a ser chão
      R.draw(R.glow('c', 48), x + w / 2, y + h / 2, Math.max(1, w / 60), 0.25 + 0.15 * p + t.glow * 0.6, true);
      rrect(ctx, x + 1, y + 1, w - 2, h - 2, 6); ctx.fillStyle = `rgba(34,211,238,${(0.12 + 0.06 * p + t.glow * 0.2).toFixed(3)})`; ctx.fill();
      ctx.strokeStyle = ca(0.65 + t.glow * 0.3); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); for (let i = 1; i < t.cur.w; i++) { ctx.moveTo(x + i * TS, y + 4); ctx.lineTo(x + i * TS, y + h - 4); } ctx.strokeStyle = ca(0.18); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 4, y + 1.5); ctx.lineTo(x + w - 4, y + 1.5); ctx.strokeStyle = 'rgba(240,250,255,0.85)'; ctx.stroke();
      return true;
    }
    if (t.look === 'knight') { this.statue(ctx, x, y, w, h, time, false, t.glow); return true; }
    if (t.look === 'gate') {
      rrect(ctx, x + 2, y, w - 4, h, [6, 6, 0, 0]); ctx.fillStyle = 'rgba(6,8,10,0.96)'; ctx.fill(); ctx.strokeStyle = ca(0.5 + t.shake * 0.4); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath();
      for (let i = 1; i < 4; i++) { ctx.moveTo(x + i * w / 4, y + 4); ctx.lineTo(x + i * w / 4, y + h); }
      for (let yy = y + 26; yy < y + h; yy += 36) { ctx.moveTo(x + 4, yy); ctx.lineTo(x + w - 4, yy); }
      ctx.strokeStyle = wa(0.16); ctx.lineWidth = 1; ctx.stroke();
      R.draw(R.glow('m', 24), x + w / 2, y + 30, 1, 0.3 + 0.2 * p, true);
      R.draw(R.text('BE', '900 13px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 6), x + w / 2, y + 30, 1, 0.7 + 0.3 * p);
      if (t.shake > 0) R.draw(R.text('?', '900 18px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,1)', 6), x + w / 2, y - 16, 1, t.shake);
      return true;
    }
    return false;
  },
  // estátua de cavaleiro do tamanho do retângulo (shadow = só a sombra, a lembrança do tamanho antigo)
  statue(ctx, x, y, w, h, time, shadow, glow = 0) {
    const cx = x + w / 2, pl = Math.min(12, h * 0.22), body = h - pl;
    if (!shadow) {
      R.draw(R.glow('c', 48), cx, y + h * 0.4, Math.max(0.7, h / 120), 0.16 + glow * 0.6, true);
      rrect(ctx, x + 1, y + h - pl, w - 2, pl, 3); ctx.fillStyle = 'rgba(10,15,18,0.98)'; ctx.fill(); ctx.strokeStyle = ca(0.5); ctx.lineWidth = 1; ctx.stroke();
    }
    const top = y + 2, hw = Math.min(w * 0.36, body * 0.22), sh = top + Math.max(6, body * 0.24);
    ctx.beginPath();
    rrect(ctx, cx - hw * 0.62, top, hw * 1.24, sh - top, [hw * 0.6, hw * 0.6, 2, 2]);
    ctx.moveTo(cx - w * 0.44, sh + 4); ctx.lineTo(cx + w * 0.44, sh + 4); ctx.lineTo(cx + w * 0.3, y + h - pl); ctx.lineTo(cx - w * 0.3, y + h - pl); ctx.closePath();
    if (shadow) { ctx.fillStyle = 'rgba(34,211,238,0.07)'; ctx.fill(); return; }
    ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.lineWidth = 1; ctx.stroke();
    // a espada de pé, segura com as duas mãos
    ctx.beginPath(); ctx.moveTo(cx, sh + 8); ctx.lineTo(cx, y + h - pl - 2); ctx.moveTo(cx - w * 0.16, sh + 12); ctx.lineTo(cx + w * 0.16, sh + 12);
    ctx.strokeStyle = ca(0.55 + glow * 0.4); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - hw * 0.4, top + (sh - top) * 0.5); ctx.lineTo(cx + hw * 0.4, top + (sh - top) * 0.5); ctx.strokeStyle = ca(0.8); ctx.lineWidth = 1.2; ctx.stroke();
  },
  // os relógios: ponteiros para trás (ontem) ou para a frente (hoje)
  drawClock(ctx, x, y, t, face) {
    const past = face === 'past', cx = x + 16, cy = y - 12;
    R.draw(R.glow(past ? 'c' : 'm', 40), cx, cy, 1, 0.35 + 0.12 * Math.sin(t * 2), true);
    rrect(ctx, x + 7, y + 6, 18, 26, [3, 3, 0, 0]); ctx.fillStyle = 'rgba(10,15,18,0.94)'; ctx.fill(); ctx.strokeStyle = wa(0.16); ctx.lineWidth = 1; ctx.stroke();
    rrect(ctx, x + 1, y + 2, 30, 6, 3); ctx.fillStyle = 'rgba(10,15,18,0.96)'; ctx.fill(); ctx.strokeStyle = ca(0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fillStyle = 'rgba(6,8,10,0.96)'; ctx.fill(); ctx.strokeStyle = past ? ca(0.8) : 'rgba(232,121,249,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10); ctx.lineTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12); }
    ctx.strokeStyle = wa(0.4); ctx.lineWidth = 1; ctx.stroke();
    const s = past ? -1 : 1, am = s * t * 0.6, ah = s * t * 0.05;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(am) * 10, cy - Math.cos(am) * 10); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ah) * 6, cy - Math.cos(ah) * 6);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.3; ctx.stroke();
    R.draw(R.text(past ? 'YESTERDAY' : 'TODAY', '700 7px Orbitron, Inter, sans-serif', wa(0.85), past ? ca(0.9) : 'rgba(217,70,239,0.9)', 4), cx, cy - 22);
  },
  /* chão-espelho: a Nexy e a Echo refletidos no piso polido (desenhados num buffer e virados de cabeça para baixo) */
  drawMirror(ctx, camX, camY, a) {
    const fr = World.h - 3, yf = fr * TS - camY;
    if (yf > CFG.VIEW_H || P.dead && P.pitDeath) return;
    const near = clamp(1 - ((fr * TS) - (P.y + P.h)) / (7 * TS), 0, 1);
    if (!this.buf) this.buf = R.make(CFG.VIEW_W, CFG.VIEW_H);
    const b = this.buf, bx = b.x;
    // o brilho do piso polido
    const c0 = Math.max(0, Math.floor(camX / TS)), c1 = Math.min(World.w - 1, c0 + 31);
    ctx.save(); ctx.beginPath();
    for (let c = c0; c <= c1; c++) if (World.type(c, fr) === T.SOLID) ctx.rect(c * TS - camX, yf, TS, 3 * TS);
    ctx.clip();
    const g = ctx.createLinearGradient(0, yf, 0, yf + 3 * TS); g.addColorStop(0, 'rgba(34,211,238,0.10)'); g.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = g; ctx.fillRect(0, yf, CFG.VIEW_W, 3 * TS);
    if (near > 0.01) {
      bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, b.c.width, b.c.height); bx.setTransform(R.k, 0, 0, R.k, 0, 0);
      const keep = R.ctx; R.ctx = bx;
      Echo.mirroring = true;
      try { P.draw(bx, camX, camY, a); Echo.draw(bx, camX, camY, a); } finally { R.ctx = keep; Echo.mirroring = false; }
      ctx.globalAlpha = 0.26 * near; ctx.translate(0, 2 * yf); ctx.scale(1, -1);
      ctx.drawImage(b.c, 0, 0, CFG.VIEW_W, CFG.VIEW_H);
    }
    ctx.restore();
  },
};

/* ---------- a lembrança da primeira visita: ontem cheio de luz, hoje escuro; a tabela do passado ---------- */
const PalaceIntro = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 0, i: -1, pt: 0, text: null, textT: 0, voiceDone: true, light: 0, tableK: 0,
  start() {
    Object.assign(this, { active: true, t: 0, i: -1, pt: 0, text: null, textT: 0, voiceDone: true, light: 0, tableK: 0, letter: 0, zoom: 1, sat: 0, phase: 'lines' });
    Game.state = 'cinematic'; Game.clearInput(); P.vx = 0;
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.6 }); Music.setDrone(true); SFX.riser(1.2);
    this.next();
  },
  say(line, who = 'story') {
    this.text = line; this.textT = 0; this.voiceDone = false; this.pt = 0;
    if (!Voice.say(line.en, who, { cut: true, onEnd: () => { this.voiceDone = true; } })) this.voiceDone = true;
  },
  next() {
    this.i++;
    if (this.i < PALACE.intro.length) this.say(PALACE.intro[this.i]);
    else if (this.phase === 'lines') { this.phase = 'table'; this.say(PALACE.tableLine); SFX.letter(); }
    else this.end();
  },
  ready(min, max = min + 6) { return this.pt >= min && (this.voiceDone || this.pt >= max); },
  key(e) {
    if (e.code === 'Escape') { Voice.stop(); return this.end(); }
    if (['Enter', 'NumpadEnter', 'Space', 'KeyZ'].includes(e.code) && this.pt > 0.5) this.tap();
  },
  tap() { if (this.pt < 0.5) return; Voice.stop(); this.voiceDone = true; this.next(); },
  update(dt) {
    if (!this.active) return;
    this.t += dt; this.pt += dt; this.textT += dt;
    this.letter = Math.min(1, this.letter + dt * 2);
    // ontem: o palácio cheio de luz; hoje: escuro de novo
    const goal = this.phase === 'lines' && this.i === 0 ? 1 : 0;
    this.light += (goal - this.light) * (1 - Math.exp(-dt * (goal ? 2.2 : 1.4)));
    this.sat = this.phase === 'lines' && this.i === 1 ? Math.min(0.6, this.sat + dt) : Math.max(0, this.sat - dt);
    if (this.phase === 'table') this.tableK = Math.min(1, this.tableK + dt * 1.6);
    if (this.phase === 'lines' && this.ready(this.i === 0 ? 3 : 2.2)) this.next();
    else if (this.phase === 'table' && this.ready(5, 12)) this.next();
  },
  end() {
    if (!this.active) return;
    this.active = false; this.letter = 0; this.light = 0; this.sat = 0;
    Save.data.met.palace = true; Save.write();
    Music.setDrone(false); Music.normal();
    if (Game.state === 'cinematic') Game.state = 'play';
    Game.clearInput();
    Game.later(0.6, () => Echo.talk(ECHO.lines.past));
  },
  drawWorld(ctx) {
    if (this.light <= 0.01) return;
    // a lembrança: luz do passado inundando o salão
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, 0, CFG.VIEW_H);
    g.addColorStop(0, `rgba(122,216,255,${(0.32 * this.light).toFixed(3)})`); g.addColorStop(1, `rgba(34,211,238,${(0.08 * this.light).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 170 + Math.sin(this.t * 0.6 + i) * 10;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 140, CFG.VIEW_H); ctx.lineTo(x + 60, CFG.VIEW_H); ctx.closePath();
      ctx.fillStyle = `rgba(240,250,255,${(0.07 * this.light).toFixed(3)})`; ctx.fill();
    }
    ctx.restore();
  },
  drawScreen(ctx) {
    if (!this.active) return;
    const W = CFG.VIEW_W, H = CFG.VIEW_H, bar = 62 * this.letter;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    if (this.text) {
      const k = Math.min(1, this.textT * 3);
      R.draw(R.text(this.text.en, '700 22px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 12), W / 2, 96, 1, k);
      if (this.text.pt) R.draw(R.text(this.text.pt, '400 14px Inter, sans-serif', wa(0.78), null, 0), W / 2, 124, 1, k);
    }
    if (this.phase === 'table') {
      const k = this.tableK, x0 = W / 2 - 250, y0 = 168;
      ctx.save(); ctx.globalAlpha = k;
      rrect(ctx, x0, y0, 500, 230, 16); ctx.fillStyle = 'rgba(2,2,2,0.82)'; ctx.fill(); ctx.strokeStyle = ca(0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W / 2, y0 + 20); ctx.lineTo(W / 2, y0 + 210); ctx.strokeStyle = wa(0.12); ctx.stroke();
      ctx.restore();
      R.draw(R.text('TODAY', '800 15px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 8), W / 2 - 125, y0 + 34, 1, k);
      R.draw(R.text('hoje · presente', '400 11px Inter, sans-serif', wa(0.6), null, 0), W / 2 - 125, y0 + 54, 1, k);
      R.draw(R.text('YESTERDAY', '800 15px Orbitron, Inter, sans-serif', '#22d3ee', 'rgba(0,217,249,0.8)', 8), W / 2 + 125, y0 + 34, 1, k);
      R.draw(R.text('ontem · passado', '400 11px Inter, sans-serif', wa(0.6), null, 0), W / 2 + 125, y0 + 54, 1, k);
      PALACE.table.forEach((row, i) => {
        const kk = clamp(k * 3 - i * 0.5, 0, 1), y = y0 + 98 + i * 44;
        R.draw(R.text(row.now, '700 14px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.8)', 6), W / 2 - 125, y, 1, kk);
        R.draw(R.text('→', '700 14px Orbitron, Inter, sans-serif', wa(0.5), null, 0), W / 2, y, 1, kk);
        R.draw(R.text(row.past, '700 14px Orbitron, Inter, sans-serif', '#22d3ee', 'rgba(0,217,249,0.8)', 6), W / 2 + 125, y, 1, kk);
      });
    }
    R.draw(R.text(Input.padSeen ? 'A · NEXT' : 'ENTER · NEXT  ·  ESC · SKIP', '500 9px Orbitron, Inter, sans-serif', wa(0.45), null, 0), W - 90, H - bar - 14);
  },
};

/* ---------- O INTERRUPTOR DO SER: a cena (pausa pesada, impacto, a onda de luz, o anel no Coração) ---------- */
const PalaceSwitch = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 0, flash: 0, wave: -1, words: 0, ringK: 0, stage: 0, ev: {},
  start(d) {
    Object.assign(this, { active: true, t: 0, zoom: 1, sat: 0, letter: 0, flash: 0, wave: -1, words: 0, ringK: 0, stage: 0, ev: {}, text: null, textT: 0, voiceDone: true, d, ent: d.ent });
    Game.state = 'cinematic'; Game.clearInput(); P.vx = 0; P.vy = 0;
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.4 }); Music.setDrone(true);
    SFX.warDrum();
  },
  once(k, fn) { if (!this.ev[k]) { this.ev[k] = true; fn(); } },
  say(line, who = 'story') {
    this.text = line; this.textT = 0; this.voiceDone = false;
    if (!Voice.say(line.en, who, { onEnd: () => { this.voiceDone = true; } })) this.voiceDone = true;
  },
  // o palácio acorda (fica salvo já no impacto: fechar o jogo no meio da cena não perde nada)
  awaken() {
    Flags.set('palaces.toBe', true, true);
    Save.data.heart.ring = true; Save.write();
    Palace.lit = 1;
  },
  key(e) {
    if (e.code === 'Escape') return this.end();
    if (['Enter', 'NumpadEnter', 'Space', 'KeyZ'].includes(e.code) && this.t > 1.2) {
      Voice.stop(); this.voiceDone = true;
      if (this.stage >= 3) return this.end();
      this.t = Math.max(this.t, [0, 2.6, 5.4, 8.2][this.stage + 1] || this.t);
    }
  },
  tap() { this.key({ code: 'Enter' }); },
  update(dt) {
    if (!this.active) return;
    this.t += dt; this.textT += dt; const t = this.t, e = this.ent;
    // 1. a pausa pesada: a câmera chega perto, a cor some, dois tambores
    this.zoom = 1 + 0.28 * Math.min(1, t / 0.8) * (t < 2.4 ? 1 : Math.max(0, 1 - (t - 2.4) / 0.8));
    this.letter = Math.min(1, t * 2);
    this.sat = t < 1 ? Math.min(0.75, t) : Math.max(0, 0.75 - (t - 1) * 0.6);
    if (t > 0.5) this.once('drum2', () => SFX.warDrum());
    // 2. o impacto: a alavanca desce, tudo congela por um instante, cacos de luz
    if (t > 0.9) {
      this.once('slam', () => {
        SFX.lever(); SFX.crush(); Game.shake(10); this.flash = 0.7; this.wave = 0; this.awaken();
        const cx = e.x + e.w / 2, cy = e.y + 20;
        FX.burst(cx, cy, 50, 'c', 420, { life: 1.1, g: 300 }); FX.burst(cx, cy, 30, 'm', 320, { life: 1, g: 200 });
      });
      e.k = Math.min(1, e.k + dt * 7);
    }
    if (this.wave >= 0) this.wave += dt * (t < 1.2 ? 120 : 900);
    // 3. a onda de luz e as cinco formas do verbo
    if (t > 2.6) {
      this.stage = Math.max(this.stage, 1);
      this.once('line1', () => this.say(PALACE.switch[0]));
      const n = Math.min(5, Math.floor((t - 2.8) / 0.32) + 1);
      if (n > this.words) { this.words = n; SFX.letter(); }
    }
    // 4. os degraus-fantasma da 1-1 viram chão
    if (t > 5.4) { this.stage = Math.max(this.stage, 2); this.once('line2', () => { if (this.voiceDone) this.say(PALACE.switch[1]); else this.ev.line2 = false; }); }
    // 5. o anel no Coração
    if (t > 8.2) {
      this.stage = Math.max(this.stage, 3); this.ringK = Math.min(1, this.ringK + dt * 1.2);
      this.once('ring', () => { SFX.oneUp(); SFX.grow(); this.flash = 0.35; });
      if (t > 13 && this.voiceDone || t > 18) this.end();
    }
    this.flash = Math.max(0, this.flash - dt * 1.6);
    FX.update(dt);
  },
  end() {
    if (!this.active) return;
    if (!this.ev.slam) { this.awaken(); this.ent.k = 1; }
    this.active = false; this.letter = 0; this.zoom = 1; this.sat = 0;
    Music.setDrone(false); Music.normal();
    if (Game.state === 'cinematic') Game.state = 'play';
    Game.clearInput();
    World.setTarget('gate', 'small'); Game.shake(4);
    Echo.talk([PALACE.cheer, ECHO.lines.gate[0]]);
  },
  drawWorld(ctx, camX, camY) {
    if (this.wave < 0) return;
    const e = this.ent, x = e.x + e.w / 2 - camX, y = e.y + 20 - camY, a = clamp(1 - this.wave / 1400, 0, 1);
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55);
    ctx.beginPath(); ctx.arc(0, 0, this.wave, 0, Math.PI * 2); ctx.strokeStyle = `rgba(232,121,249,${(0.85 * a).toFixed(3)})`; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, this.wave * 0.92, 0, Math.PI * 2); ctx.strokeStyle = `rgba(122,216,255,${(0.6 * a).toFixed(3)})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // colunas de luz saindo do interruptor
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
    g.addColorStop(0, 'rgba(217,70,239,0)'); g.addColorStop(0.5, `rgba(240,171,252,${(0.4 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(217,70,239,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 60, 0, 120, y + 30);
    ctx.restore();
  },
  drawScreen(ctx) {
    if (!this.active) return;
    const W = CFG.VIEW_W, H = CFG.VIEW_H, bar = 62 * this.letter, t = this.t;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    if (t > 1 && this.stage < 3) {
      const k = clamp((t - 1) * 1.5, 0, 1) * (this.stage >= 2 ? 0.5 : 1);
      R.draw(R.glow('m', 64), W / 2, 210, 3.2, 0.3 * k, true);
      R.draw(R.text('TO BE', '900 64px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 22), W / 2, 210, 1, k);
    }
    if (this.words > 0 && this.stage < 3) {
      const list = ['AM', 'IS', 'ARE', 'WAS', 'WERE'];
      list.forEach((wd, i) => { if (i < this.words) R.draw(R.text(wd, '800 20px Orbitron, Inter, sans-serif', i < 3 ? '#ffffff' : '#22d3ee', i < 3 ? 'rgba(217,70,239,0.9)' : 'rgba(0,217,249,0.9)', 10), W / 2 + (i - 2) * 110, 290); });
    }
    if (this.stage === 2) {
      // os três degraus-fantasma da 1-1: do tracejado ao sólido
      const k = clamp((t - 5.6) * 1.2, 0, 1);
      ['AM', 'IS', 'ARE'].forEach((wd, i) => {
        const x = W / 2 + (i - 1) * 70, y = 350;
        rrect(ctx, x - 26, y - 14, 52, 28, 6);
        if (k < 1) { ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = wa(0.6 * (1 - k)); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
        ctx.fillStyle = `rgba(34,211,238,${(0.25 * k).toFixed(3)})`; ctx.fill(); ctx.strokeStyle = ca(0.9 * k); ctx.lineWidth = 1.4; ctx.stroke();
        R.draw(R.text(wd, '700 12px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(0,217,249,0.9)', 6), x, y + 0.5);
      });
    }
    if (this.stage >= 3) {
      const k = this.ringK, cx = W / 2, cy = 236, tier = Math.max(0, Save.data.heart.best);
      ctx.fillStyle = `rgba(0,0,0,${(0.5 * k).toFixed(3)})`; ctx.fillRect(0, bar, W, H - 2 * bar);
      drawHeart(ctx, cx, cy, 2.4, tier, t, k);
      Palace.drawRing(ctx, cx, cy, 2.4 * k, t, k);
      R.draw(R.text(PALACE.ring.name, '900 24px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 14), cx, 352, 1, k);
      R.draw(R.text(PALACE.ring.pt + ' · ' + PALACE.ring.reward, '400 13px Inter, sans-serif', wa(0.75), null, 0), cx, 382, 1, k);
    }
    if (this.text) {
      const k = Math.min(1, this.textT * 3);
      R.draw(R.text(this.text.en, '700 20px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 12), W / 2, H - bar - 52, 1, k);
      if (this.text.pt) R.draw(R.text(this.text.pt, '400 13px Inter, sans-serif', wa(0.78), null, 0), W / 2, H - bar - 26, 1, k);
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  },
};

// o ANEL DO TO BE em volta do Coração (o acréscimo do palácio ao Coração das Palavras)
Palace.drawRing = function (ctx, x, y, s, t, alpha = 1) {
  if (alpha <= 0 || s <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y);
  for (const [tilt, col] of [[0.5, 'rgba(232,121,249,0.9)'], [-0.5, 'rgba(122,216,255,0.8)']]) {
    ctx.save(); ctx.rotate(tilt + t * 0.25); ctx.scale(1, 0.32);
    ctx.beginPath(); ctx.arc(0, 0, 24 * s, 0, Math.PI * 2); ctx.strokeStyle = col; ctx.lineWidth = 1.4 / 0.32 * 0.5; ctx.stroke();
    ctx.restore();
  }
  const a = t * 1.6;
  R.draw(R.glow('w', 8), Math.cos(a) * 24 * s, Math.sin(a) * 7.7 * s, s * 0.6, 0.9, true);
  ctx.restore();
};

/* ---------- o fundo do palácio: janelas altas, o relógio que anda para trás, colunas e estandartes ---------- */
BG.makePalaceFar = function () {
  const W = 1920, H = 760, s = R.make(W, H), x = s.x, bay = 320, rnd = mulberry32(31);
  x.fillStyle = '#040507'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < W / bay; i++) {
    const cx = i * bay + bay / 2;
    this.rose(x, cx, 120, 34, 0.08 + rnd() * 0.04);
    this.lancet(x, cx - 54, 190, 56, 400, 0.06 + rnd() * 0.04);
    this.lancet(x, cx + 54, 190, 56, 400, 0.06 + rnd() * 0.04);
    // a galeria de cima, com balaústres
    x.beginPath(); x.moveTo(i * bay, 640); x.lineTo((i + 1) * bay, 640); x.strokeStyle = cb(0.12); x.lineWidth = 1; x.stroke();
    x.beginPath(); for (let k = 0; k < 9; k++) { const bx = i * bay + 18 + k * 34; x.moveTo(bx, 640); x.lineTo(bx, 676); } x.strokeStyle = cb(0.06); x.stroke();
    rrect(x, i * bay - 10, 60, 20, H - 60, 3); x.fillStyle = '#06080a'; x.fill(); x.strokeStyle = cb(0.07); x.stroke();
  }
  // o grande relógio (os ponteiros andam ao vivo, para trás)
  const ccx = 1120, ccy = 310, R0 = 118;
  x.beginPath(); x.arc(ccx, ccy, R0 + 10, 0, Math.PI * 2); x.fillStyle = '#040507'; x.fill();
  x.beginPath(); x.arc(ccx, ccy, R0, 0, Math.PI * 2); x.fillStyle = 'rgba(6,9,12,0.98)'; x.fill(); x.strokeStyle = cb(0.24); x.lineWidth = 2; x.stroke();
  x.beginPath(); x.arc(ccx, ccy, R0 - 14, 0, Math.PI * 2); x.strokeStyle = cb(0.1); x.lineWidth = 1; x.stroke();
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    x.beginPath(); x.moveTo(ccx + Math.cos(a) * (R0 - 14), ccy + Math.sin(a) * (R0 - 14)); x.lineTo(ccx + Math.cos(a) * (R0 - (k % 3 ? 26 : 34)), ccy + Math.sin(a) * (R0 - (k % 3 ? 26 : 34)));
    x.strokeStyle = cb(k % 3 ? 0.14 : 0.3); x.lineWidth = k % 3 ? 1.5 : 3; x.stroke();
  }
  const g = x.createLinearGradient(0, 520, 0, H); g.addColorStop(0, 'rgba(4,5,7,0)'); g.addColorStop(1, 'rgba(4,5,7,0.9)');
  x.fillStyle = g; x.fillRect(0, 520, W, H - 520);
  return s;
};
BG.makePalaceNear = function () {
  const W = 1536, H = 900, s = R.make(W, H), x = s.x, gap = 384;
  for (let i = 0; i <= W / gap; i++) for (const off of [0, -W]) {
    const X0 = i * gap + off; if (X0 < -80) continue;
    // coluna torcida com capitel
    rrect(x, X0, 90, 40, H - 90, 4); x.fillStyle = 'rgba(4,5,7,0.95)'; x.fill(); x.strokeStyle = cb(0.15); x.lineWidth = 1; x.stroke();
    x.beginPath(); for (let yy = 110; yy < H; yy += 38) { x.moveTo(X0 + 2, yy); x.lineTo(X0 + 38, yy + 19); } x.strokeStyle = cb(0.05); x.stroke();
    rrect(x, X0 - 10, 76, 60, 16, 4); x.fillStyle = 'rgba(4,5,7,0.97)'; x.fill(); x.strokeStyle = cb(0.16); x.stroke();
    // arco que liga as colunas
    x.beginPath(); x.moveTo(X0 + 40, 84); x.quadraticCurveTo(X0 + 40, -40, X0 + gap / 2 + 20, -60); x.quadraticCurveTo(X0 + gap, -40, X0 + gap, 84); x.strokeStyle = cb(0.12); x.stroke();
    // estandarte com o emblema BE
    const bx = X0 + gap / 2 - 2;
    x.beginPath(); x.moveTo(bx, 130); x.lineTo(bx + 44, 130); x.lineTo(bx + 44, 320); x.lineTo(bx + 22, 296); x.lineTo(bx, 320); x.closePath();
    x.fillStyle = 'rgba(4,5,7,0.92)'; x.fill(); x.strokeStyle = cb(0.13); x.stroke();
    x.beginPath(); x.moveTo(bx + 22, 176); x.lineTo(bx + 36, 196); x.lineTo(bx + 22, 216); x.lineTo(bx + 8, 196); x.closePath(); x.strokeStyle = cb(0.2); x.stroke();
    x.font = '700 10px Orbitron, Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = cb(0.4); x.fillText('BE', bx + 22, 197);
  }
  return s;
};
BG.drawPalace = function (ctx, camX, camY, time) {
  if (!this.palFar) { this.palFar = this.makePalaceFar(); this.palNear = this.makePalaceNear(); }
  const fW = 1920, fx = -((camX * 0.18) % fW), fy = -24 - camY * 0.2;
  ctx.drawImage(this.palFar.c, fx, fy, fW, 760); ctx.drawImage(this.palFar.c, fx + fW, fy, fW, 760);
  // os ponteiros do grande relógio andam para trás (o palácio vive de lembranças); depois do interruptor, para a frente
  const dir = Palace.lit > 0.5 ? 1 : -1;
  for (const ox of [fx, fx + fW]) {
    const cx = ox + 1120, cy = fy + 310; if (cx < -160 || cx > CFG.VIEW_W + 160) continue;
    const am = dir * time * 0.5, ah = dir * time * 0.04;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(am) * 92, cy - Math.cos(am) * 92); ctx.strokeStyle = cb(0.32); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ah) * 60, cy - Math.cos(ah) * 60); ctx.strokeStyle = cb(0.4); ctx.lineWidth = 3.5; ctx.stroke();
    R.draw(R.glow('c', 24), cx, cy, 1, 0.3, true);
  }
  const nW = 1536, nx = -((camX * 0.45) % nW), ny = -camY * 0.4;
  ctx.drawImage(this.palNear.c, nx, ny, nW, 900); ctx.drawImage(this.palNear.c, nx + nW, ny, nW, 900);
  // o palácio aceso pelo interruptor: um véu de luz por cima de tudo
  if (Palace.lit > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, CFG.VIEW_H);
    g.addColorStop(0, `rgba(34,211,238,${(0.06 * Palace.lit).toFixed(3)})`); g.addColorStop(1, 'rgba(217,70,239,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  }
  const gs = R.glow('c', 6);
  for (const d of this.dust) {
    const x = ((d.x - camX * 0.3) % 960 + 960) % 960, y = ((d.y - time * d.v * 0.5 - camY * 0.3) % 540 + 540) % 540;
    R.draw(gs, x, y, d.s, 0.16, true);
  }
};
