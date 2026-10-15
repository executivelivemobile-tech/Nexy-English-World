
/* ============================== ENTIDADES DA 1-2 · A NAVE DOS ECOS ==============================
   Plataformas móveis (lustres, tubos do órgão, Echo gigante), Alado, Ladrão de Palavras, Rastejantes
   gigantes, sinos, vida (1UP), Lua (3UP), altares e o grande sino.
   Plataforma móvel = entidade com plat: true (sólida só por cima). x/y/w é a superfície; dx/dy = quanto andou
   neste passo (o jogador montado vai junto). body: true = o corpo abaixo da superfície empurra para os lados. */

/* ---------- LUSTRE: plataforma em pêndulo ----------
   O caractere marca onde fica a superfície no ponto mais baixo do balanço (o topo daquela linha).
   opts: len (tiles de corrente), amp (radianos), period (s), phase (0–1), width (tiles) */
Ents.reg('chandelier', {
  layer: 'back',
  init(e) {
    const o = e.opts;
    e.w = (o.width || 3) * TS; e.h = 12; e.plat = true; e.dx = 0; e.dy = 0;
    e.L = (o.len || 8) * TS; e.ax = e.c * TS + TS / 2; e.ay = e.r * TS - e.L;
    e.amp = o.amp != null ? o.amp : 0.4; e.period = o.period || 3.6; e.phase = o.phase || 0; e.light = 110;
    this.place(e); e.px = e.x; e.py = e.y;
  },
  place(e) {
    const th = e.amp * Math.sin((Game.simTime / e.period + e.phase) * Math.PI * 2);
    e.x = e.ax + Math.sin(th) * e.L - e.w / 2; e.y = e.ay + Math.cos(th) * e.L;
  },
  update(e) { const ox = e.x, oy = e.y; this.place(e); e.dx = e.x - ox; e.dy = e.y - oy; },
  draw(ctx, e, x, y, camX, camY) {
    const cx = x + e.w / 2, ax = e.ax - camX, ay = e.ay - camY, t = Game.time;
    // corrente até o ponto de apoio (e além, sumindo na abóbada)
    const g = ctx.createLinearGradient(0, ay - 160, 0, y);
    g.addColorStop(0, wa(0)); g.addColorStop(0.35, wa(0.16)); g.addColorStop(1, wa(0.24));
    ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax + (ax - cx) * 0.5, ay - 160); ctx.lineTo(ax, ay); ctx.lineTo(cx, y - 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y - 26); ctx.lineTo(x + 6, y); ctx.moveTo(cx, y - 26); ctx.lineTo(x + e.w - 6, y); ctx.strokeStyle = wa(0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(ax, ay, 3, 0, Math.PI * 2); ctx.strokeStyle = ca(0.4); ctx.stroke();
    // aro com velas
    R.draw(R.glow('c', 48), cx, y + 16, e.w / 70, 0.42, true);
    ctx.beginPath(); ctx.ellipse(cx, y + 20, e.w * 0.36, 6, 0, 0, Math.PI * 2); ctx.strokeStyle = ca(0.35); ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + t * 0.6, fx = cx + Math.cos(a) * e.w * 0.36, fy = y + 20 + Math.sin(a) * 6;
      const fl = 0.6 + 0.3 * Math.sin(t * 9 + i * 2.1);
      R.draw(R.glow('c', 8), fx, fy - 5, 1, fl, true);
      ctx.fillStyle = '#0a0f12'; ctx.fillRect(fx - 1.5, fy - 3, 3, 6);
    }
    // a barra onde se pisa
    capsulePath(ctx, cx, y + 5, e.w, 10); ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = wa(0.22); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y + 0.5); ctx.lineTo(x + e.w - 6, y + 0.5); ctx.strokeStyle = ca(0.85); ctx.stroke();
  },
});

/* ---------- TUBO DO ÓRGÃO: sobe e desce no compasso da música ----------
   O caractere marca o topo do tubo no ponto mais baixo. opts: rise (tiles), beats (período em batidas), phase (0–1), width */
Ents.reg('pipe', {
  layer: 'back',
  init(e) {
    const o = e.opts;
    e.w = (o.width || 2) * TS; e.h = 12; e.plat = true; e.body = true; e.dx = 0; e.dy = 0;
    e.x = e.c * TS; e.low = e.r * TS; e.rise = (o.rise || 4) * TS; e.beats = o.beats || 4; e.phase = o.phase || 0; e.k = 0;
    // o corpo vai até a primeira pedra abaixo do tubo (ou até o fundo da fase)
    let rb = e.r + 1; while (rb < World.h && World.type(e.c, rb) !== T.SOLID) rb++; e.bot = rb * TS;
    this.place(e); e.px = e.x; e.py = e.y;
  },
  place(e) {
    const v = Music.VARIANTS[World.level.music] || Music.VARIANTS.world1, b = Game.simTime * v.bpm / 60;
    e.k = 0.5 - 0.5 * Math.cos((b / e.beats + e.phase) * Math.PI * 2);
    e.y = e.low - e.rise * e.k;
  },
  update(e) { const oy = e.y; this.place(e); e.dx = 0; e.dy = e.y - oy; },
  draw(ctx, e, x, y, camX, camY) {
    const bot = Math.min(e.bot - camY, CFG.VIEW_H + 20), w = e.w, beat = e.k > 0.92 ? (e.k - 0.92) / 0.08 : 0;
    // corpo
    rrect(ctx, x + 5, y + 6, w - 10, bot - y - 6, [0, 0, 0, 0]);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#07090b'); g.addColorStop(0.45, '#0e1418'); g.addColorStop(1, '#050608');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = wa(0.12); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.38, y + 10); ctx.lineTo(x + w * 0.38, bot); ctx.strokeStyle = ca(0.18); ctx.stroke();
    // boca do tubo
    ctx.beginPath(); ctx.moveTo(x + 9, y + 34); ctx.lineTo(x + w / 2, y + 46); ctx.lineTo(x + w - 9, y + 34); ctx.strokeStyle = ca(0.35 + beat * 0.5); ctx.stroke();
    // borda de cima: acende na batida
    R.draw(R.glow('c', 32), x + w / 2, y + 4, w / 50, 0.3 + 0.6 * beat + 0.2 * e.k, true);
    rrect(ctx, x + 1, y, w - 2, 9, 4); ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = ca(0.7 + 0.3 * beat); ctx.stroke();
  },
});

/* ---------- ALADO (FLYER): Rastejante com asas ----------
   opts.path: 'v' (sobe e desce no lugar) ou 'h' (vai e volta). amp em tiles, period em s, phase 0–1.
   Pisão sem giro arranca as asas: ele cai e vira Rastejante comum. */
Ents.reg('flyer', {
  layer: 'enemy',
  init(e) { e.w = 26; e.h = 24; e.dir = -1; e.enemy = true; e.kind = 'enemy'; e.state = 'fly'; e.res = {}; e.onGround = false; e.creature = 'FLYER'; },
  update(e, dt) {
    if (e.state === 'dying') return Enemy.dyingUpdate(e, dt);
    const o = e.opts || {};
    if (e.x0 == null) { e.x0 = e.x; e.y0 = e.y; e.ph = (o.phase || 0) * Math.PI * 2; }
    const w = Math.PI * 2 / (o.period || 2.4), k = Math.sin(e.t * w + e.ph);
    if (o.path === 'h') {
      e.x = e.x0 + k * (o.amp != null ? o.amp : 3) * TS; e.y = e.y0 + Math.sin(e.t * w * 2) * 5;
      e.dir = Math.cos(e.t * w + e.ph) >= 0 ? 1 : -1;
    } else { e.y = e.y0 + k * (o.amp != null ? o.amp : 1) * TS; e.dir = P.cx < e.x + e.w / 2 ? -1 : 1; }
  },
  clip(e) {
    Game.registerCreature('FLYER');
    const cx = e.x + e.w / 2;
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) FX.add(cx + s * 10, e.y + 6, { vx: s * (40 + i * 25), vy: -60 - i * 20, life: 0.8, size: 1.4, c: 'c', g: 300 });
    e.type = 'crawler'; e.creature = null; e.state = 'walk'; e.vx = 0; e.vy = 60; e.dir = P.facing; e.asleep = false; e.res = {}; e.onGround = false;
    e.opts = { respawn: (e.opts || {}).respawn };
  },
  draw(ctx, e, x, y) {
    if (e.state === 'dying') { Ents.types.crawler.draw(ctx, e, x, y); return; }
    const w = e.w, flap = Math.sin(e.t * 18);
    Enemy.rim(x + w / 2, y + e.h * 0.5, w + 8);
    // asas angulares
    for (const s of [-1, 1]) {
      const bx = x + w / 2 + s * 6, by = y + 6;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + s * 18, by - 8 - flap * 8); ctx.lineTo(bx + s * 14, by + 2 - flap * 3); ctx.lineTo(bx + s * 22, by + 4 - flap * 5); ctx.lineTo(bx + s * 4, by + 8); ctx.closePath();
      ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = wa(0.32); ctx.lineWidth = 1; ctx.stroke();
    }
    Ents.types.crawler.draw(ctx, Object.assign({}, e, { asleep: true }), x, y);
  },
});

/* ---------- LADRÃO DE PALAVRAS (THIEF) ----------
   Rouba a ÚLTIMA palavra da barra e foge para o buraco (opts.hole = coluna). Um pisão devolve a palavra.
   Se ele escapar, a palavra volta para o bloco de onde saiu (você nunca perde vocabulário). */
Ents.reg('thief', {
  layer: 'enemy',
  init(e) { e.w = 24; e.h = 30; e.dir = -1; e.enemy = true; e.kind = 'enemy'; e.state = 'idle'; e.res = {}; e.onGround = false; e.word = null; e.creature = 'THIEF'; e.hopT = 0; },
  update(e, dt) {
    if (e.state === 'flat') { e.flatT -= dt; if (e.flatT <= 0) { e.dead = true; FX.burst(e.x + e.w / 2, e.y + 2, 14, 'c', 140, { g: -60, life: 0.7 }); } return; }
    if (e.state === 'dying') return Enemy.dyingUpdate(e, dt);
    const o = e.opts || {}, hole = (o.hole != null ? o.hole : e.c) * TS + TS / 2, cx = e.x + e.w / 2;
    if (e.home == null) e.home = { x: cx, y: e.y };
    if (e.state === 'idle') {
      e.vx = approach(e.vx, 0, 600 * dt); Enemy.physics(e, dt);
      if (!P.dead && Game.bar.length && Math.abs(P.cx - cx) < 5 * TS && Math.abs(P.cy - (e.y + e.h / 2)) < 3 * TS) e.state = 'charge';
    } else if (e.state === 'charge') {
      e.dir = P.cx < cx ? -1 : 1; e.vx = e.dir * 125; Enemy.physics(e, dt);
      if (P.dead || !Game.bar.length || Math.abs(P.cx - cx) > 9 * TS) e.state = 'idle';
    } else if (e.state === 'flee') {
      e.dir = hole > cx ? 1 : -1; e.vx = e.dir * 150;
      e.hopT -= dt; if (e.onGround && e.hopT <= 0) { e.vy = -340; e.hopT = 0.55; }
      Enemy.physics(e, dt);
      const nx = e.x + e.w / 2;
      if (e.dir > 0 ? nx >= hole - 4 : nx <= hole + 4) { e.state = 'dive'; e.diveT = 0; e.vx = 0; e.vy = 0; SFX.summon(); }
    } else if (e.state === 'dive') {
      e.diveT += dt;
      if (e.diveT > 0.5) {
        e.dead = true; e.escaped = true;
        if (e.word) Game.returnWord(e.word, e.src, e.home);
        e.word = null;
      }
    }
  },
  steal(e) {
    const w = Game.bar.pop(); if (!w) return;
    e.word = w; e.src = Game.wordSrc[w]; e.state = 'flee'; e.hopT = 0.15;
    UI.renderBar(); SFX.steal(); Game.shake(1.5); UI.msg('WORD THIEF · ' + w);
    FX.burst(P.cx, P.cy - 10, 14, 'm', 180, { life: 0.5, g: 0 });
  },
  onKill(e) {
    e.noRespawn = true;   // pisado, não volta mais; se escapar, volta para casa
    if (!e.word) return;
    Ents.spawn('capsule', { word: e.word, x: e.x + e.w / 2, y: e.y - 4, baseY: e.y - 30, homing: true, src: e.src });
    SFX.wordAppear(); UI.msg('WORD BACK · ' + e.word); e.word = null;
  },
  draw(ctx, e, x, y) {
    const w = e.w, h = e.h, t = e.t;
    if (e.state === 'flat') { Ents.types.crawler.draw(ctx, Object.assign({}, e, { h: 8 }), x, y); return; }
    const sink = e.state === 'dive' ? Math.min(1, e.diveT / 0.5) : 0;
    ctx.save();
    if (sink) { ctx.beginPath(); ctx.rect(x - 20, y - 60, w + 40, h + 60); ctx.clip(); ctx.translate(0, sink * (h + 4)); }
    if (e.state === 'dying') { ctx.translate(x + w / 2, y + h / 2); ctx.rotate(e.spinA); ctx.translate(-x - w / 2, -y - h / 2); }
    Enemy.rim(x + w / 2, y + h * 0.55, w + 4);
    const step = e.onGround && Math.abs(e.vx) > 1 ? Math.sin(t * 20) * 2.5 : 0;
    ctx.strokeStyle = wa(0.22); ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(x + 7, y + h - 6); ctx.lineTo(x + 5 + step, y + h); ctx.moveTo(x + w - 7, y + h - 6); ctx.lineTo(x + w - 5 - step, y + h); ctx.stroke();
    // capuz pontudo
    const f = e.dir;
    ctx.beginPath(); ctx.moveTo(x + 2, y + h - 4); ctx.lineTo(x + 3, y + h * 0.4); ctx.lineTo(x + w / 2 - f * 6, y - 2); ctx.lineTo(x + w - 3, y + h * 0.4); ctx.lineTo(x + w - 2, y + h - 4); ctx.closePath();
    ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = wa(0.32); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 5, y + h * 0.42); ctx.lineTo(x + w - 5, y + h * 0.42); ctx.strokeStyle = wa(0.1); ctx.stroke();
    // olhos
    ctx.fillStyle = ca(0.95); ctx.fillRect(x + w / 2 + f * 2 - 4, y + h * 0.5, 3, 2); ctx.fillRect(x + w / 2 + f * 2 + 2, y + h * 0.5, 3, 2);
    ctx.restore();
    // a palavra roubada balança sobre a cabeça
    if (e.word) {
      const s = wordCapsuleSprite(e.word);
      R.draw(R.glow('m', 30), x + w / 2, y - 18, 1, 0.5, true);
      R.draw(s, x + w / 2 + s.ox, y - 18 + Math.sin(t * 10) * 2, 0.8, 1 - sink);
    }
  },
});

/* ---------- RASTEJANTES GIGANTES (alvo de THEY) ----------
   Dormem e fecham o túnel. Não dá para pisar nem passar. "THEY ARE SMALL" encolhe todos: viram Rastejantes comuns.
   O caractere marca o tile da esquerda (o gigante ocupa 2 tiles de largura). */
Ents.reg('giant', {
  layer: 'enemy',
  W: 60, H: 88,
  init(e) {
    e.w = this.W; e.h = this.H; e.x = e.c * TS + TS - e.w / 2; e.y = (e.r + 1) * TS - e.h;
    e.enemy = true; e.persist = true; e.kind = 'giant'; e.state = 'sleep'; e.k = 1; e.shake = 0; e.creature = 'CRAWLER'; e.res = {}; e.dir = -1;
  },
  update(e, dt) {
    if (e.shake > 0) e.shake = Math.max(0, e.shake - dt);
    if (e.state === 'shrink') {
      e.k = Math.max(0, e.k - dt / 0.6);
      if (e.k <= 0) this.toCrawler(e);
    } else if (e.state === 'grow') { e.k = Math.min(1, e.k + dt / 0.6); if (e.k >= 1) e.state = 'sleep'; }
  },
  toCrawler(e) {
    const cx = e.x + e.w / 2, bot = e.y + e.h;
    Object.assign(e, { type: 'crawler', w: 26, h: 24, state: 'walk', persist: false, wasGiant: true, asleep: false, opts: {}, creature: null, res: {}, onGround: false, vx: 0, vy: 0 });
    e.x = cx - 13; e.y = bot - 24; e.dir = P.cx < cx ? -1 : 1;
    FX.burst(cx, bot - 12, 18, 'c', 160, { life: 0.6, g: 0 });
  },
  // THEY ARE SMALL / THEY ARE BIG
  setAll(act) {
    let n = 0;
    if (act === 'small') for (const e of Ents.list) if (e.type === 'giant' && !e.dead && e.state === 'sleep') { e.state = 'shrink'; n++; }
    if (act === 'big') for (const e of Ents.list) {
      if (e.type !== 'crawler' || !e.wasGiant || e.dead || e.state !== 'walk') continue;
      const cx = e.x + e.w / 2, bot = e.y + e.h, nx = cx - this.W / 2, ny = bot - this.H;
      if (!World.fits(nx, ny, this.W, this.H, e)) continue;
      Object.assign(e, { type: 'giant', w: this.W, h: this.H, x: nx, y: ny, state: 'grow', k: 0, persist: true, creature: 'CRAWLER', vx: 0 });
      n++;
    }
    if (n) (act === 'small' ? SFX.shrink : SFX.grow)(); else { for (const e of Ents.list) if (e.type === 'giant') e.shake = 1; SFX.thud(); }
    return n > 0;
  },
  draw(ctx, e, x, y) {
    const sc = e.state === 'sleep' ? 1 : lerp(26 / this.W, 1, e.k), w = e.w * sc, h = e.h * sc, t = e.t;
    const sx = e.shake > 0 ? Math.sin(t * 70) * 3 * e.shake : 0;
    const bx = x + e.w / 2 - w / 2 + sx, by = y + e.h - h;
    Enemy.rim(bx + w / 2, by + h * 0.55, w * 1.1);
    ctx.save(); ctx.translate(bx, by); ctx.scale(w / 26, h / 24);
    const lw = 26 / w;
    ctx.beginPath();
    ctx.moveTo(2, 20); ctx.lineTo(0, 13.2); ctx.lineTo(6, 4.8); ctx.lineTo(13, 1); ctx.lineTo(20, 4.8); ctx.lineTo(26, 13.2); ctx.lineTo(24, 20); ctx.closePath();
    ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = wa(0.32); ctx.lineWidth = lw * 1.2; ctx.stroke();
    ctx.strokeStyle = wa(0.2); ctx.beginPath(); ctx.moveTo(5, 19); ctx.lineTo(3, 24); ctx.moveTo(13, 19); ctx.lineTo(13, 24); ctx.moveTo(21, 19); ctx.lineTo(23, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 13); ctx.lineTo(13, 8.6); ctx.lineTo(20, 13); ctx.strokeStyle = wa(0.08); ctx.stroke();
    // olhos fechados
    ctx.beginPath(); ctx.moveTo(9, 13.5); ctx.lineTo(12, 14.2); ctx.moveTo(14, 14.2); ctx.lineTo(17, 13.5); ctx.strokeStyle = ca(0.7); ctx.lineWidth = lw * 1.4; ctx.stroke();
    ctx.restore();
    if (e.state === 'sleep') {
      const z = (t * 0.6 + e.c * 0.37) % 1;
      R.draw(R.text('z', '700 ' + (10 + z * 8 | 0) + 'px Orbitron, Inter, sans-serif', wa(0.7), ca(0.8), 4), bx + w * 0.8 + z * 10, by - 4 - z * 22, 1, 1 - z);
    }
    if (e.shake > 0) R.draw(R.text('?', '900 18px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,1)', 6), bx + w / 2, by - 14, 1, e.shake);
  },
});

/* ---------- SINOS e o PORTÃO DOS SINOS ----------
   Cada sino tem uma palavra (opts.word) e pertence a um portão (opts.gate). Encostar no sino toca a palavra;
   a sequência vai preenchendo o molde do portão. Frase certa abre; errada: o eco repete a frase e os sinos zeram. */
Ents.reg('bell', {
  layer: 'back',
  init(e) { e.w = 30; e.h = 34; e.x = e.c * TS + 1; e.y = e.r * TS; e.swing = 0; e.touch = false; e.ring = 0; e.light = 70; e.ph = e.c * 0.7; },
  update(e, dt) {
    e.swing *= Math.exp(-dt * 1.4); e.ring = Math.max(0, e.ring - dt * 0.8);
    const d = World.doors[e.opts.gate], on = !P.dead && overlap(e, P.box());
    // o mesmo sino duas vezes seguidas não conta (evita "I AM AM" por acidente)
    if (on && !e.touch && d && !d.open && !d.busy && d.chimes[d.chimes.length - 1] !== e.opts.word) {
      e.swing = (P.vx >= 0 ? 1 : -1) * 0.5; e.ring = 1;
      SFX.bell(e.opts.tone || 0); Voice.say(WORDS[e.opts.word] ? WORDS[e.opts.word].say : e.opts.word, 'echo');
      FX.burst(e.x + 15, e.y + 26, 14, 'c', 160, { life: 0.6, g: 0 });
      Bells.add(d, e.opts.word);
    }
    e.touch = on;
  },
  draw(ctx, e, x, y) {
    const t = e.t, a = e.swing * Math.sin(t * 7) + Math.sin(t * 1.3 + e.ph) * 0.03, cx = x + 15;
    const g = ctx.createLinearGradient(0, y - 120, 0, y);
    g.addColorStop(0, wa(0)); g.addColorStop(1, wa(0.22));
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, y - 120); ctx.lineTo(cx, y + 2); ctx.stroke();
    if (e.ring > 0) R.draw(R.glow('c', 50), cx, y + 20, 1 + e.ring * 0.6, e.ring * 0.8, true);
    R.draw(R.glow('c', 30), cx, y + 22, 1, 0.25, true);
    ctx.save(); ctx.translate(cx, y + 2); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-7, 4, -8, 14); ctx.quadraticCurveTo(-10, 24, -15, 28); ctx.lineTo(15, 28); ctx.quadraticCurveTo(10, 24, 8, 14); ctx.quadraticCurveTo(7, 4, 5, 0); ctx.closePath();
    ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = ca(0.6 + e.ring * 0.4); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 30, 3, 0, Math.PI * 2); ctx.fillStyle = ca(0.8); ctx.fill();
    ctx.restore();
    R.draw(R.text(e.opts.word, '700 10px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,0.9)', 5), cx, y + 46, 1, 0.85 + 0.15 * e.ring);
  },
});
const Bells = {
  add(d, word) {
    const n = d.def.mold.filter(tk => tk === '_').length;
    d.chimes.push(word); d.solved = d.chimes.concat(new Array(n - d.chimes.length).fill(null));
    if (d.chimes.length < n) return;
    d.busy = true;
    const words = d.chimes.slice(), j = Sentence.judge(d.def, words);
    Game.later(0.6, () => {
      Voice.say(Sentence.speakable(Sentence.fill(d.def, words)), 'door');
      if (j.kind === 'accept') {
        SFX.right(); d.opening = 0.001; SFX.doorOpen(); Game.shake(3);
        for (const w of words) Game.grimoireWord(w, d.def.inscription);
        // acertou de primeira: uma vida cai do grande sino
        if (d.errors === 0 && d.def.reward) { const [c, r] = d.def.reward; Game.later(0.9, () => { Ents.spawn('life', { x: c * TS + TS / 2, y: r * TS + TS / 2, fall: true }); UI.msg('FIRST TRY!'); }); }
        d.busy = false;
      } else {
        SFX.wrong(); d.errors++; Game.shake(2);
        Game.later(1.4, () => { d.chimes = []; d.solved = null; d.busy = false; });
      }
    });
  },
};

/* ---------- VIDA (1UP) e LUA (3UP) ---------- */
function lifeSprite() {
  return R.sprite('life', 64, 64, x => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(240,171,252,0.7)'); g.addColorStop(0.4, 'rgba(217,70,239,0.25)'); g.addColorStop(1, 'rgba(217,70,239,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.beginPath(); x.arc(32, 32, 13, 0, Math.PI * 2); x.fillStyle = '#0a0508'; x.fill(); x.strokeStyle = '#e879f9'; x.lineWidth = 1.6; x.stroke();
    x.beginPath(); x.arc(32, 32, 9, 0, Math.PI * 2); x.strokeStyle = 'rgba(240,171,252,0.4)'; x.lineWidth = 1; x.stroke();
  });
}
Ents.reg('life', {
  init(e) {
    e.w = 26; e.h = 26; e.light = 90;
    if (e.c != null) { e.x = e.c * TS + 3; e.y = e.r * TS + 3; } else { e.x -= 13; e.y -= 13; }
    e.startY = e.y;
  },
  update(e, dt) {
    if (e.emerge && e.t < 0.5) e.y = lerp(e.startY, e.baseY - 13, 1 - Math.pow(1 - e.t / 0.5, 2));
    else if (e.fall) {
      e.vy = Math.min(e.vy + 900 * dt, 320);
      const r = World.move(e, 0, e.vy * dt);
      if (r.floor) { e.fall = false; e.vy = 0; e.baseY = e.y + 13 - 10; SFX.thud(); }
      if (e.y > World.pxH) e.dead = true;
    } else { if (e.baseY == null) e.baseY = e.y + 13; e.y = e.baseY - 13 + Math.sin(e.t * 2.4) * 3; }
    if (e.t > 0.3 && overlap(e, P.box())) { e.dead = true; Game.addLife(1, e); }
  },
  draw(ctx, e, x, y) {
    const cx = x + 13, cy = y + 13;
    R.draw(lifeSprite(), cx, cy, 1 + 0.06 * Math.sin(e.t * 5), 1, true);
    R.draw(R.text('1UP', '900 8px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 4), cx, cy + 0.5);
  },
});
Ents.reg('moon', {
  init(e) { e.w = 30; e.h = 30; e.x = e.c * TS + 1; e.y = e.r * TS + 1; e.light = 140; },
  update(e) { if (overlap(e, P.box())) { e.dead = true; Game.addLife(3, e); SFX.moon(); } },
  draw(ctx, e, x, y) {
    const cx = x + 15, cy = y + 15 + Math.sin(e.t * 1.8) * 3;
    R.draw(R.glow('t', 64), cx, cy, 1, 0.9, true);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.arc(cx + 7, cy - 4, 11, 0, Math.PI * 2, true); ctx.fillStyle = '#f5faff'; ctx.fill('evenodd'); ctx.restore();
    R.draw(R.text('3UP', '900 8px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 4), cx, cy + 24, 1, 0.8);
  },
});

/* ---------- GRANDE SINO (decoração) ---------- */
Ents.reg('bigbell', {
  layer: 'back',
  init(e) { e.w = 96; e.h = 90; e.x = e.c * TS + TS / 2 - 48; e.y = e.r * TS; },
  draw(ctx, e, x, y) {
    const a = Math.sin(e.t * 0.9) * 0.04, cx = x + 48;
    ctx.strokeStyle = wa(0.18); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx, y - 200); ctx.lineTo(cx, y); ctx.stroke();
    R.draw(R.glow('c', 64), cx, y + 54, 1.3, 0.3, true);
    ctx.save(); ctx.translate(cx, y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-20, 10, -24, 40); ctx.quadraticCurveTo(-28, 70, -46, 82); ctx.lineTo(46, 82); ctx.quadraticCurveTo(28, 70, 24, 40); ctx.quadraticCurveTo(20, 10, 14, 0); ctx.closePath();
    ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = ca(0.55); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-36, 70); ctx.lineTo(36, 70); ctx.moveTo(-26, 30); ctx.lineTo(26, 30); ctx.strokeStyle = ca(0.18); ctx.stroke();
    ctx.restore();
  },
});

/* ---------- ECHO GIGANTE: "YOU ARE BIG" vira uma plataforma que leva o Nexy ----------
   ride.board = onde ele espera (tile), ride.path = pontos do caminho (tiles; r = linha da superfície). */
Ents.reg('echoride', {
  layer: 'mid',
  init(e) { e.w = 96; e.h = 14; e.plat = true; e.dx = 0; e.dy = 0; e.state = 'grow'; e.k = 0; e.i = 0; e.waitT = 0; e.rideT = 0; e.offT = 0; e.light = 220; },
  update(e, dt) {
    const ox = e.x, oy = e.y;
    if (e.state === 'grow') { e.k = Math.min(1, e.k + dt / 0.6); if (e.k >= 1) e.state = 'wait'; }
    else if (e.state === 'wait') {
      e.waitT += dt;
      if (P.riding === e) { e.rideT += dt; if (e.rideT > 0.35) { e.state = 'go'; SFX.powerup(); } } else e.rideT = 0;
      if (e.waitT > 14) e.state = 'shrink';
    } else if (e.state === 'go') {
      const [c, r] = e.path[e.i], tx = c * TS + TS / 2 - e.w / 2, ty = r * TS;
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), sp = 150 * dt;
      if (d <= sp) { e.x = tx; e.y = ty; e.i++; if (e.i >= e.path.length) e.state = 'arrived'; }
      else { e.x += dx / d * sp; e.y += dy / d * sp; }
      if (Math.random() < 0.6) FX.add(e.x + Math.random() * e.w, e.y + 18, { vx: -dx / (d || 1) * 60, vy: 20, life: 0.6, size: 1.4, c: 'm', g: 0 });
    } else if (e.state === 'arrived') {
      if (P.riding !== e) { e.offT += dt; if (e.offT > 0.8) e.state = 'shrink'; } else e.offT = 0;
    } else if (e.state === 'shrink') {
      e.k = Math.max(0, e.k - dt / 0.5);
      if (e.k <= 0) { e.dead = true; Echo.hidden = false; Echo.x = e.x + e.w / 2; Echo.y = e.y; Echo.px = Echo.x; Echo.py = Echo.y; }
    }
    e.dx = e.x - ox; e.dy = e.y - oy;
  },
  draw(ctx, e, x, y) {
    const k = e.k, cx = x + e.w / 2, t = e.t, r = 10 + 30 * k;
    R.draw(R.glow('m', 64), cx, y + 14, 0.6 + 1.1 * k, 0.75, true);
    ctx.beginPath(); ctx.arc(cx, y + 6 + r * 0.55, r, Math.PI * 1.05, Math.PI * 1.95, true); ctx.closePath();
    const g = ctx.createRadialGradient(cx - r * 0.3, y + 4, 0, cx, y + 10, r * 1.2);
    g.addColorStop(0, wa(0.25)); g.addColorStop(1, wa(0.03));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = wa(0.35); ctx.lineWidth = 1; ctx.stroke();
    if (k > 0.5) { capsulePath(ctx, cx, y + 3, e.w * k, 7); ctx.fillStyle = 'rgba(217,70,239,0.28)'; ctx.fill(); ctx.strokeStyle = '#e879f9'; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(cx, y + 14 + r * 0.2, 4 + 5 * k + Math.sin(t * 6) * 0.8, 0, Math.PI * 2); ctx.fillStyle = '#e879f9'; ctx.fill();
  },
});

/* ---------- ALTAR DAS RUNAS (o pedestal com alvo) ---------- */
function drawAltar(ctx, x, y, t) {
  R.draw(R.glow('c', 44), x + 16, y - 6, 1.1, 0.4 + 0.15 * Math.sin(t * 2), true);
  ctx.beginPath(); ctx.moveTo(x - 2, y + 32); ctx.lineTo(x + 4, y + 10); ctx.lineTo(x + 28, y + 10); ctx.lineTo(x + 34, y + 32); ctx.closePath();
  ctx.fillStyle = 'rgba(10,15,18,0.95)'; ctx.fill(); ctx.strokeStyle = wa(0.16); ctx.lineWidth = 1; ctx.stroke();
  rrect(ctx, x - 4, y + 4, 40, 7, 3); ctx.fillStyle = 'rgba(10,15,18,0.98)'; ctx.fill(); ctx.strokeStyle = ca(0.6); ctx.stroke();
  // três runas orbitando: I · IT · THEY (quem a frase atinge)
  ['I', 'IT', 'THEY'].forEach((g, i) => {
    const a = t * 0.9 + i * Math.PI * 2 / 3, rx = x + 16 + Math.cos(a) * 20, ry = y - 14 + Math.sin(a) * 6;
    R.draw(R.text(g, '700 8px Orbitron, Inter, sans-serif', wa(0.85), ca(0.9), 4), rx, ry, 1, 0.55 + 0.45 * (Math.sin(a) * 0.5 + 0.5));
  });
}
