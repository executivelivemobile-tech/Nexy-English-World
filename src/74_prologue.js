
/* ============================== 1-1 · A LEI DAS PALAVRAS (o prólogo da primeira partida) ==============================
   Antes de a Nexy pisar no mundo, as três leis são mostradas, não explicadas:
   1. palavras são magia: o feixe e a voz antiga no escuro;
   2. palavras viram chão: as letras de HELLO caem e acendem o chão onde ela pousa;
   3. o que você diz vira verdade: IT IS BIG faz um Rastejante pequenino virar gigante, e ele fecha o caminho.
      Vez do jogador: IT IS ___ com BIG e SMALL. BIG o deixa ainda maior (sem castigo: o mundo só obedece);
      SMALL o encolhe e ele foge. A regra em português só aparece depois que o jogador a usou.
   Esc pula tudo; Enter (A no controle, toque na tela) avança. Nas outras partidas fica só a chegada curta (Arrival). */
const Prologue = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 1, flash: 0, phase: null, pt: 0,
  start() {
    Object.assign(this, {
      active: true, t: 0, pt: 0, phase: 'magic', zoom: 1, sat: 0, letter: 0.6, flash: 0, text: null, textT: 0,
      voiceDone: true, hits: [], letters: [], rings: [], crawler: null, slot: null, sel: 0, tries: 0, landT: -1, ev: {}, lawK: 0,
    });
    this.foot = P.y + P.h; this.footX = P.cx; this.hoverY = this.foot - P.h - 84;
    P.y = Cam.y - 160; P.py = P.y; P.vx = 0; P.vy = 0; P.invuln = 99; P.facing = 1;
    Game.state = 'cinematic'; Game.clearInput(); SFX.riser(1.4);
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.45 }); Music.setDrone(true);
    // as cinco letras de HELLO, uma por coluna; a Nexy pousa no meio delas (no primeiro L)
    const c0 = Math.floor(this.footX / TS) - 2;
    'HELLO'.split('').forEach((ch, i) => this.letters.push({ ch, c: c0 + i, y: Cam.y - 40 - i * 26, vy: 0, at: 0.35 + i * 0.24, landed: -1 }));
    this.say(PROLOGUE.magic, 'story');
  },
  // fala e legenda juntas; a fase seguinte espera a voz terminar (sem voz: só o tempo mínimo)
  say(line, who) {
    this.text = line; this.textT = 0; this.voiceDone = false;
    const ok = Voice.say(line.en, who, { cut: true, onEnd: () => { this.voiceDone = true; } });
    if (!ok) this.voiceDone = true;
  },
  go(phase) { this.phase = phase; this.pt = 0; this.ev = {}; },
  once(k, fn) { if (!this.ev[k]) { this.ev[k] = true; fn(); } },
  ready(min, max = min + 5) { return this.pt >= min && (this.voiceDone || this.pt >= max); },
  // quanto do chão já acendeu nesta coluna (a onda sai de cada letra que caiu)
  rev(c) {
    if (this.revealAll) return 1;
    let k = 0;
    for (const h of this.hits) k = Math.max(k, Math.min(1, Math.max(0, (this.t - h.t) * 14 - Math.abs(c - h.c))));
    return k;
  },

  key(e) {
    const c = e.code;
    if (c === 'Escape') return this.skip();
    if (this.phase === 'choice') {
      if (c === 'ArrowLeft' || c === 'KeyA') { this.sel = 0; SFX.select(); }
      else if (c === 'ArrowRight' || c === 'KeyD') { this.sel = 1; SFX.select(); }
      else if (['Enter', 'NumpadEnter', 'Space', 'KeyZ'].includes(c)) this.choose(this.sel ? 'SMALL' : 'BIG');
      return;
    }
    if (['Enter', 'NumpadEnter', 'Space', 'KeyZ'].includes(c) && this.t > 0.6) this.hurry();
  },
  // toque na tela (coordenadas do jogo, 960×540)
  tap(x, y) {
    if (this.phase === 'choice') {
      const b = this.buttons(); for (let i = 0; i < 2; i++) if (Math.abs(x - b[i].x) < b[i].w / 2 + 6 && Math.abs(y - b[i].y) < 30) { this.sel = i; this.choose(i ? 'SMALL' : 'BIG'); return; }
      return;
    }
    if (this.t > 0.6) this.hurry();
  },
  // Enter fora da escolha: corta a fala e adianta a cena até o próximo momento que importa
  hurry() {
    Voice.stop(); this.voiceDone = true;
    if (this.phase === 'law') return this.end();
    this.pt = Math.max(this.pt, this.phase === 'floor' ? 2.4 : this.phase === 'truth' ? 2.2 : 2.6);
  },
  buttons() { return [{ x: 400, y: 460, w: 132, word: 'BIG' }, { x: 560, y: 460, w: 132, word: 'SMALL' }]; },
  choose(word) {
    if (this.phase !== 'choice') return;
    const cr = this.crawler; this.slot = word; SFX.place();
    Voice.say(word === 'BIG' ? 'It is big.' : 'It is small.', 'door', { cut: true });
    if (word === 'BIG') {
      this.tries++; this.go('bigger'); cr.goal = Math.min(5.4, cr.s + 1.1);
      this.text = { en: 'It is big.', pt: PROLOGUE.bigger.pt }; this.textT = 0; this.voiceDone = true;
    } else { this.go('small'); cr.goal = 0.42; }
  },

  update(dt) {
    if (!this.active) return;
    this.t += dt; this.pt += dt; this.textT += dt;
    const ph = this.phase, cr = this.crawler;
    // a Nexy desce devagar no feixe até as letras virarem chão; depois pousa
    if (this.landT < 0) {
      P.py = P.y;
      if (this.dropping) { P.vy = Math.min(900, P.vy + 2600 * dt); P.y = Math.min(this.foot - P.h, P.y + P.vy * dt); if (P.y >= this.foot - P.h) this.land(); }
      else P.y += (this.hoverY - P.y) * (1 - Math.exp(-dt * 1.6));
      if (Math.random() < 0.7) FX.add(P.cx + (Math.random() - 0.5) * 20, P.y + P.h, { vy: -40, vx: (Math.random() - 0.5) * 30, life: 0.5, size: 1.3, c: 'm', g: 0 });
    } else if (P.squash) P.squash = approach(P.squash, 0, dt * 2.2);
    // as letras caem uma a uma e acendem o chão
    if (ph !== 'magic' || this.revealAll) for (const l of this.letters) {
      if (l.landed >= 0 || this.pt < l.at && ph === 'floor') continue;
      l.vy += 2600 * dt; l.y += l.vy * dt;
      if (l.y >= this.foot) {
        l.y = this.foot; l.landed = this.t; this.hits.push({ c: l.c, t: this.t });
        SFX.letter(); Game.shake(1.6); FX.burst(l.c * TS + TS / 2, this.foot, 16, 'm', 200, { life: 0.6, g: 300 });
      }
    }
    if (ph === 'magic' && this.ready(2.6)) { this.go('floor'); this.say(PROLOGUE.floor, 'story'); }
    else if (ph === 'floor') {
      if (!this.dropping && this.letters.every(l => l.landed >= 0) && this.t - this.letters[4].landed > 0.35) { this.dropping = true; P.vy = 120; }
      if (this.landT >= 0 && this.ready(2.6)) {
        this.go('truth'); this.say(PROLOGUE.truth, 'story');
        this.crawler = { x: Cam.x + CFG.VIEW_W + 40, y: this.foot, s: 0.62, goal: 0.62, dir: -1, run: 0, gone: false };
      }
    } else if (ph === 'truth') {
      const tx = this.footX + 6.6 * TS;
      cr.x = Math.max(tx, cr.x - 230 * dt);
      if (cr.x <= tx && this.ready(2.2)) { this.go('big'); this.slot = 'BIG'; }
    } else if (ph === 'big') {
      this.once('say', () => { this.voiceDone = false; if (!Voice.say('It is big.', 'door', { cut: true, onEnd: () => { this.voiceDone = true; } })) this.voiceDone = true; });
      if (this.pt > 0.75) this.once('grow', () => { cr.goal = 3.2; SFX.grow(); SFX.warDrum(); Game.shake(7); this.flash = 0.35; this.rings.push({ x: cr.x, y: cr.y, r: 8, life: 1 }); });
      if (this.ready(2.6, 5)) { this.go('choice'); this.slot = null; this.say(PROLOGUE.turn, 'story'); }
    } else if (ph === 'bigger') {
      if (this.pt > 0.2) this.once('grow', () => { SFX.grow(); Game.shake(6 + this.tries); this.flash = 0.25; });
      if (this.pt > 2.8) { this.go('choice'); this.slot = null; this.text = PROLOGUE.turn; this.textT = 1; }
    } else if (ph === 'small') {
      if (this.pt > 0.25) this.once('shrink', () => { SFX.shrink(); FX.burst(cr.x, cr.y - 30, 30, 'c', 220, { life: 0.7, g: 0 }); });
      if (this.pt > 1.1) this.once('flee', () => { SFX.pop(); cr.dir = 1; cr.run = 1; });
      if (this.pt > 1.6) this.once('rule', () => { SFX.right(); this.say(PROLOGUE.rule, 'story'); });
      if (this.pt > 1.6 && this.ready(5.2, 9)) this.go('law');
    } else if (ph === 'law') {
      this.lawK = Math.min(1, this.lawK + dt * 1.6);
      if (this.pt > 3.6) this.end();
    }
    if (cr) {
      cr.s += (cr.goal - cr.s) * (1 - Math.exp(-dt * 7));
      if (cr.run) { cr.x += 360 * dt; if (cr.x > Cam.x + CFG.VIEW_W + 120) { cr.gone = true; } }
    }
    for (const r of this.rings) { r.r += dt * 420; r.life -= dt * 1.5; }
    this.rings = this.rings.filter(r => r.life > 0);
    this.flash = Math.max(0, this.flash - dt * 2);
    P.px = P.x; FX.update(dt);
  },
  land() {
    this.landT = this.t; P.y = this.foot - P.h; P.vy = 0; P.squash = 0.35;
    Game.shake(5); SFX.warDrum(); this.flash = 0.3;
    this.rings.push({ x: P.cx, y: this.foot, r: 6, life: 1 });
    FX.burst(P.cx, this.foot, 30, 'm', 260, { life: 0.8, g: 300 }); FX.burst(P.cx, this.foot, 20, 'c', 200, { life: 0.7, g: 300 });
  },
  skip() {
    Voice.stop();
    this.revealAll = true;
    for (const l of this.letters) if (l.landed < 0) { l.y = this.foot; l.landed = this.t; }
    this.end();
  },
  end() {
    if (!this.active) return;
    this.active = false; this.letter = 0; this.zoom = 1; this.revealAll = true;
    P.y = this.foot - P.h; P.py = P.y; P.vy = 0; P.invuln = 0; P.squash = 0;
    Save.data.met.prologue = true; Save.write();
    // as letras ficam gravadas no chão: o primeiro chão do jogo é uma palavra
    Ents.spawn('floorword', { letters: this.letters.map(l => ({ ch: l.ch, c: l.c })), y: this.foot });
    Music.setDrone(false); Music.normal();
    if (Game.state === 'cinematic') Game.state = 'play';
    Game.clearInput();
  },

  /* ---------- desenho ---------- */
  drawWorld(ctx, camX, camY, time) {
    // o chão ainda não existe: as pedras ficam no escuro até a onda de luz das letras passar
    const c0 = Math.max(0, Math.floor(camX / TS) - 1), c1 = Math.min(World.w - 1, c0 + 32), r0 = Math.max(0, Math.floor(camY / TS)), r1 = Math.min(World.h - 1, r0 + 18);
    for (let c = c0; c <= c1; c++) {
      const k = this.rev(c); if (k >= 1) continue;
      for (let r = r0; r <= r1; r++) {
        if (World.type(c, r) !== T.SOLID) continue;
        ctx.fillStyle = `rgba(3,3,7,${(1 - k).toFixed(3)})`; ctx.fillRect(c * TS - camX - 0.5, r * TS - camY - 0.5, TS + 1, TS + 1);
        if (k > 0 && World.type(c, r - 1) !== T.SOLID) {   // a crista da onda acende o topo das pedras
          ctx.fillStyle = `rgba(122,216,255,${(0.9 * Math.sin(k * Math.PI)).toFixed(3)})`; ctx.fillRect(c * TS - camX, r * TS - camY, TS, 2);
        }
      }
    }
    // o feixe
    if (this.landT < 0 || this.t - this.landT < 0.5) {
      const x = P.cx - camX, k = this.landT < 0 ? 1 : 1 - (this.t - this.landT) / 0.5;
      const g = ctx.createLinearGradient(x - 28, 0, x + 28, 0);
      g.addColorStop(0, 'rgba(217,70,239,0)'); g.addColorStop(0.5, `rgba(240,171,252,${0.35 * k})`); g.addColorStop(1, 'rgba(217,70,239,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 28, 0, 56, this.foot - camY);
    }
    // as letras: caindo, depois gravadas no chão
    for (const l of this.letters) {
      if (l.y < camY - 40) continue;
      const x = l.c * TS + TS / 2 - camX, landed = l.landed >= 0, a = landed ? Math.max(0.45, 1 - (this.t - l.landed) * 0.6) : 1;
      const y = landed ? this.foot + 15 - camY : l.y - camY - 14;
      R.draw(R.glow('m', 30), x, y, landed ? 0.9 : 1.2, 0.55 * a, true);
      R.draw(R.text(l.ch, '900 20px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 10), x, y, 1, a);
    }
    for (const r of this.rings) { ctx.save(); ctx.translate(r.x - camX, r.y - camY); ctx.scale(1, 0.3); ctx.beginPath(); ctx.arc(0, 0, r.r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(232,121,249,${r.life})`; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }
    // o Rastejante (o mesmo desenho do jogo, em outra escala) e a frase que o mundo obedece
    const cr = this.crawler;
    if (cr && !cr.gone) {
      const x = cr.x - camX, y = cr.y - camY, s = cr.s;
      if (s > 1.2) R.draw(R.glow('c', 64), x, y - 12 * s, s * 0.7, 0.35, true);
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      Ents.types.crawler.draw(ctx, { w: 26, h: 24, t: this.t, dir: cr.run ? 1 : -1, state: 'walk', asleep: false }, -13, -24);
      ctx.restore();
      if (['big', 'choice', 'bigger', 'small'].includes(this.phase) && !cr.run) this.drawSentence(ctx, x, Math.min(y - 24 * s - 40, 200));
    }
  },
  // IT IS [___] . sobre o Rastejante: a lacuna espera a palavra do jogador
  drawSentence(ctx, x, y) {
    const B = 8, inner = t => t.w - B * 4 - 8, font = '700 17px Orbitron, Inter, sans-serif', glow = 'rgba(0,217,249,0.8)';
    const head = R.text('IT IS', font, '#22d3ee', glow, B), dot = R.text('.', font, '#22d3ee', glow, B);
    const w = this.slot ? R.text(this.slot, '800 15px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', B) : null;
    const hw = inner(head), sw = w ? inner(w) + 28 : 76, dw = inner(dot), gap = 12;
    let px = x - (hw + gap + sw + 4 + dw) / 2;
    R.draw(head, px + hw / 2, y); px += hw + gap;
    capsulePath(ctx, px + sw / 2, y, sw, 28);
    if (w) { ctx.fillStyle = 'rgba(217,70,239,0.25)'; ctx.fill(); ctx.strokeStyle = '#e879f9'; ctx.lineWidth = 1.2; ctx.stroke(); R.draw(w, px + sw / 2, y + 0.5); }
    else { ctx.save(); ctx.setLineDash([4, 4]); ctx.lineDashOffset = -this.t * 12; ctx.strokeStyle = 'rgba(232,121,249,0.85)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore(); }
    R.draw(dot, px + sw + 4 + dw / 2, y);
  },
  drawScreen(ctx) {
    if (!this.active) return;
    const bar = 62 * this.letter, W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    // a fala do narrador (inglês grande; português pequeno embaixo)
    if (this.text && this.phase !== 'law') {
      const k = Math.min(1, this.textT * 3);
      R.draw(R.text(this.text.en, '700 22px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 12), W / 2, 78, 1, k);
      if (this.text.pt) R.draw(R.text(this.text.pt, '400 14px Inter, sans-serif', wa(0.78), null, 0), W / 2, 106, 1, k);
    }
    // a escolha: duas palavras grandes (teclado, controle ou toque)
    if (this.phase === 'choice') {
      const b = this.buttons();
      b.forEach((o, i) => {
        const on = this.sel === i, p = 0.5 + 0.5 * Math.sin(this.t * 4);
        if (on) R.draw(R.glow('m', 64), o.x, o.y, 1.2, 0.35 + 0.15 * p, true);
        capsulePath(ctx, o.x, o.y, o.w, 46); ctx.fillStyle = on ? 'rgba(217,70,239,0.28)' : 'rgba(2,2,2,0.82)'; ctx.fill();
        ctx.strokeStyle = on ? '#f0abfc' : 'rgba(217,70,239,0.55)'; ctx.lineWidth = on ? 2 : 1.2; ctx.stroke();
        R.draw(R.text(o.word, '800 18px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 8), o.x, o.y + 1);
      });
      R.draw(R.text(Input.padSeen ? '◀ ▶ CHOOSE · A SAY IT' : '← → CHOOSE · ENTER SAY IT · OR TAP A WORD', '600 10px Orbitron, Inter, sans-serif', wa(0.55), null, 0), W / 2, 496);
    }
    // a lei inteira, no fim
    if (this.phase === 'law') {
      const k = this.lawK;
      ctx.fillStyle = `rgba(0,0,0,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
      R.draw(R.text('THE LAW OF WORDS', '900 26px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 16), W / 2, 170, 1, k);
      PROLOGUE.law.forEach((l, i) => {
        const kk = Math.min(1, Math.max(0, k * 3 - i * 0.6));
        R.draw(R.text(l.en, '700 18px Orbitron, Inter, sans-serif', '#22d3ee', 'rgba(0,217,249,0.8)', 10), W / 2, 238 + i * 58, 1, kk);
        R.draw(R.text(l.pt, '400 13px Inter, sans-serif', wa(0.7), null, 0), W / 2, 262 + i * 58, 1, kk);
      });
    }
    R.draw(R.text('ESC · SKIP', '500 9px Orbitron, Inter, sans-serif', wa(0.4), null, 0), W - 60, H - bar - 14);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, W, H); }
  },
};

/* ---------- as letras de HELLO gravadas no primeiro chão (ficam depois do prólogo) ---------- */
Ents.reg('floorword', {
  layer: 'back',
  init(e) { e.w = e.letters.length * TS; e.h = TS; e.x = e.letters[0].c * TS; e.y = e.y || 0; },
  draw(ctx, e, x, y) {
    const p = 0.5 + 0.5 * Math.sin(e.t * 1.6);
    e.letters.forEach((l, i) => R.draw(R.text(l.ch, '900 20px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 10), x + i * TS + TS / 2, y + 15, 1, 0.3 + 0.12 * p));
  },
});
