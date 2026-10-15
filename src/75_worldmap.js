
/* ============================== TRANSIÇÕES (íris neon e fechadura) ==============================
   Fecha um círculo (ou uma fechadura, na saída secreta) sobre um ponto, mostra o cartão da fase no
   escuro, troca a cena e abre de novo sobre o novo ponto. Enquanto roda, o jogo não anda. */
const Transition = {
  active: false, phase: '', t: 0, shape: 'circle', x: 480, y: 270, card: null, mid: null, openAt: null,
  DUR: { close: 0.6, hold: 0.9, open: 0.6 },
  start(o) {
    Object.assign(this, { active: true, phase: 'close', t: 0, shape: o.shape || 'circle', x: o.x, y: o.y, card: o.card || null, mid: o.mid, openAt: o.openAt || null });
    if (!o.card) this.DUR.hold = 0.25; else this.DUR.hold = 1.1;
    SFX.iris(true);
  },
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.phase === 'close' && this.t >= this.DUR.close) {
      this.phase = 'hold'; this.t = 0;
      if (this.mid) this.mid();
      const p = this.openAt ? this.openAt() : { x: 480, y: 270 };
      this.x = p.x; this.y = p.y;
    } else if (this.phase === 'hold' && this.t >= this.DUR.hold) { this.phase = 'open'; this.t = 0; this.shape = 'circle'; SFX.iris(false); Game.clearInput(); }
    else if (this.phase === 'open' && this.t >= this.DUR.open) { this.active = false; this.phase = ''; }
  },
  radius() {
    const R = 1150;
    if (this.phase === 'close') { const k = Math.min(1, this.t / this.DUR.close); return R * Math.pow(1 - k, 2.4); }
    if (this.phase === 'hold') return 0;
    const k = Math.min(1, this.t / this.DUR.open); return R * Math.pow(k, 2.2);
  },
  path(ctx, x, y, r) {
    if (this.shape === 'keyhole') {
      const s = r / 60;
      ctx.moveTo(x + 34 * s, y - 20 * s); ctx.arc(x, y - 20 * s, 34 * s, 0, Math.PI * 2);
      ctx.moveTo(x - 16 * s, y + 4 * s); ctx.lineTo(x - 30 * s, y + 70 * s); ctx.lineTo(x + 30 * s, y + 70 * s); ctx.lineTo(x + 16 * s, y + 4 * s); ctx.closePath();
    } else { ctx.moveTo(x + r, y); ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2); }
  },
  draw(ctx, time) {
    if (!this.active) return;
    const r = this.radius();
    ctx.save();
    ctx.beginPath(); ctx.rect(-10, -10, 980, 560); this.path(ctx, this.x, this.y, r);
    ctx.fillStyle = '#000'; ctx.fill('evenodd');
    if (r > 2) {
      ctx.beginPath(); this.path(ctx, this.x, this.y, r);
      ctx.strokeStyle = 'rgba(217,70,239,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); this.path(ctx, this.x, this.y, r + 7);
      ctx.strokeStyle = 'rgba(34,211,238,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
    if (this.phase === 'hold' && this.card) {
      const k = Math.min(1, this.t / 0.25), c = this.card;
      R.draw(R.text(c.label, '900 34px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 14), 480, 220, 0.9 + 0.1 * k, k);
      R.draw(R.text(c.name, '500 15px Orbitron, Inter, sans-serif', '#22d3ee', 'rgba(0,217,249,0.7)', 10), 480, 268, 1, k);
      if (c.word) {
        const n = c.word.length, gap = 30, x0 = 480 - (n - 1) * gap / 2;
        for (let i = 0; i < n; i++) {
          const on = c.found && c.found[i], x = x0 + i * gap, y = 318;
          if (on) R.draw(R.glow('m', 18), x, y, 1, 0.8 * k, true);
          R.draw(R.text(on ? c.word[i] : '_', '700 16px Orbitron, Inter, sans-serif', on ? '#ffffff' : 'rgba(255,255,255,0.35)', on ? 'rgba(217,70,239,1)' : null, on ? 6 : 0), x, y, 1, k);
        }
      }
      // como o "MARIO × 5" do Mario World
      if (c.lives != null) {
        R.draw(R.glow('m', 16), 452, 372, 1, 0.8 * k, true);
        ctx.save(); ctx.globalAlpha = k; ctx.translate(452, 380); ctx.scale(0.5, 0.5);
        const of = P.facing, og = P.onGround, ow = P.walkPhase; P.facing = 1; P.onGround = true; P.walkPhase = 0.6; P.drawBody(ctx, time); P.facing = of; P.onGround = og; P.walkPhase = ow;
        ctx.restore();
        R.draw(R.text('×  ' + c.lives, '700 14px JetBrains Mono, monospace', '#ffffff', null, 0), 492, 368, 1, k);
      }
    }
  },
};

/* ============================== MAPA-MÚNDI (como no Mario World) ==============================
   O Nexy anda pelos caminhos abertos entre as fases. Enter / pulo entra na fase.
   Caminhos novos se desenham ponto a ponto na primeira vez que aparecem. */
const WorldMap = {
  world: 1, at: '1-1', walk: null, route: [], reveal: [], revealT: 0, x: 0, y: 0, facing: 1, phase: 0, echo: { x: 0, y: 0 }, hop: 0,
  get W() { return WORLDS[this.world]; },
  node(id) { return this.W.nodes.find(n => n.id === id); },
  key2(e) { return e.a + '>' + e.b; },
  unlocked(e) { const x = Save.data.exits[e.unlock[0]]; return !!(x && x[e.unlock[1]]); },
  visible(e) { return this.unlocked(e) && Save.data.map.revealed[this.key2(e)]; },
  edgePts(e, fromId) { const a = this.node(e.a), b = this.node(e.b); const pts = [[a.x, a.y], ...e.pts, [b.x, b.y]]; return fromId === e.a ? pts : pts.slice().reverse(); },
  init() { this.at = (Save.data.map && Save.data.map.at) || '1-1'; if (!this.node(this.at)) this.at = '1-1'; const n = this.node(this.at); this.x = n.x; this.y = n.y; this.echo = { x: n.x - 20, y: n.y - 30 }; },
  enter() {
    this.init(); this.walk = null; this.route = []; this.hop = 0;
    this.reveal = this.W.edges.filter(e => this.unlocked(e) && !Save.data.map.revealed[this.key2(e)]);
    this.revealT = 0;
    $('maphud').classList.add('on'); this.refreshHud();
  },
  leave() { $('maphud').classList.remove('on'); },
  playable(id) { return !!LEVELS[id]; },
  reachable(id) { return id === '1-1' || this.W.edges.some(e => this.visible(e) && (e.a === id || e.b === id)); },
  update(dt) {
    this.phase += dt;
    if (this.hop > 0) this.hop = Math.max(0, this.hop - dt * 3);
    const ex = this.echo; ex.x = lerp(ex.x, this.x - this.facing * 22, 1 - Math.exp(-dt * 5)); ex.y = lerp(ex.y, this.y - 34 + Math.sin(this.phase * 2.2) * 4, 1 - Math.exp(-dt * 5));
    if (Transition.active) { Input.queue.length = 0; return; }
    if (this.reveal.length) {
      this.revealT += dt;
      if (this.revealT > 1.6) { const e = this.reveal.shift(); Save.data.map.revealed[this.key2(e)] = true; Save.write(); this.revealT = 0; SFX.checkpoint(); this.refreshHud(); }
      Input.queue.length = 0; return;
    }
    if (this.walk) {
      const w = this.walk; let d = 190 * dt;
      while (d > 0 && w.i < w.pts.length - 1) {
        const [x1, y1] = w.pts[w.i + 1], dx = x1 - this.x, dy = y1 - this.y, len = Math.hypot(dx, dy);
        if (len <= d) { this.x = x1; this.y = y1; w.i++; d -= len; } else { this.x += dx / len * d; this.y += dy / len * d; d = 0; }
        if (Math.abs(dx) > 1) this.facing = sign(dx);
      }
      if (w.i >= w.pts.length - 1) {
        this.at = w.to; this.walk = null; Save.data.map.at = this.at; Save.write(); SFX.ui();
        if (this.route.length) this.walkEdge(this.route.shift()); else this.refreshHud();
      }
      Input.queue.length = 0; return;
    }
    const want = Input.get('left') ? [-1, 0] : Input.get('right') ? [1, 0] : Input.get('up') ? [0, -1] : Input.get('down') ? [0, 1] : null;
    for (const k of Input.queue) if (k === 'jump' || k === 'spin') this.tryEnter();
    Input.queue.length = 0;
    if (want) this.tryWalk(want);
  },
  tryWalk([wx, wy]) {
    let best = null, bd = 0.45;
    for (const e of this.W.edges) {
      if (!this.visible(e) || (e.a !== this.at && e.b !== this.at)) continue;
      const pts = this.edgePts(e, this.at), dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1], len = Math.hypot(dx, dy) || 1;
      const dot = (dx * wx + dy * wy) / len;
      if (dot > bd) { bd = dot; best = { pts, to: e.a === this.at ? e.b : e.a, i: 0 }; }
    }
    if (best) { this.walk = best; this.refreshHud(true); }
  },
  walkEdge(to) {
    const e = this.W.edges.find(e => this.visible(e) && ((e.a === this.at && e.b === to) || (e.b === this.at && e.a === to)));
    if (!e) { this.route = []; this.refreshHud(); return; }
    this.walk = { pts: this.edgePts(e, this.at), to, i: 0 }; this.refreshHud(true);
  },
  // caminho mais curto pelos caminhos abertos (toque/clique numa fase)
  routeTo(id) {
    const prev = { [this.at]: null }, q = [this.at];
    while (q.length) {
      const n = q.shift(); if (n === id) break;
      for (const e of this.W.edges) {
        if (!this.visible(e)) continue;
        const o = e.a === n ? e.b : e.b === n ? e.a : null;
        if (o && !(o in prev)) { prev[o] = n; q.push(o); }
      }
    }
    if (!(id in prev)) return null;
    const path = []; for (let n = id; n !== this.at; n = prev[n]) path.unshift(n);
    return path;
  },
  tap(x, y) {
    if (this.walk || this.reveal.length || Transition.active) return;
    let best = null, bd = 34;
    for (const n of this.W.nodes) { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; } }
    if (!best) return;
    if (best.id === this.at) return this.tryEnter();
    const path = this.routeTo(best.id);
    if (!path || !path.length) { SFX.thud(); return; }
    this.route = path; this.walkEdge(this.route.shift());
  },
  key(code) {
    if (code === 'Enter' || code === 'NumpadEnter') this.tryEnter();
  },
  tryEnter() {
    if (this.walk || this.reveal.length || Transition.active) return;
    const id = this.at;
    if (!this.playable(id)) { SFX.thud(); UI.msg('COMING SOON'); return; }
    const L = LEVELS[id], found = (Save.data.letters[id] || []);
    this.hop = 1; SFX.jump();
    Transition.start({
      x: this.x, y: this.y - 18, shape: 'circle',
      card: { label: 'WORLD ' + id, name: L.name, word: L.masterWord, found, lives: Game.lives },
      mid: () => { this.leave(); Game.enterLevel(id, true); },
      openAt: () => ({ x: P.cx - Cam.x, y: P.cy - Cam.y }),
    });
  },
  refreshHud(moving) {
    const S = Save.data, n = this.node(this.at), id = this.at;
    $('mhWorld').textContent = 'WORLD ' + this.world + ' · ' + this.W.name;
    $('mhLives').textContent = '×' + Game.lives; $('mhOrbs').textContent = String(Game.orbs).padStart(3, '0');
    const bf = Object.values(S.bestFluency); $('mhFlu').textContent = (bf.length ? Math.round(bf.reduce((a, b) => a + b, 0) / bf.length) : 0) + '%';
    $('mhNode').textContent = moving ? '' : (n.label.startsWith('1-') ? 'WORLD ' + n.label + ' · ' : '') + n.name;
    const L = LEVELS[id], box = $('mhLetters'); box.innerHTML = '';
    if (L && !moving) {
      const f = S.letters[id] || [];
      L.masterWord.split('').forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch; if (f[i]) s.className = 'on'; box.appendChild(s); });
    }
    const ex = S.exits[id] || {};
    $('mhExits').innerHTML = L && !moving ? `<i class="${ex.normal ? 'on' : ''}"></i><i class="key ${ex.secret ? 'on' : ''}"></i>` : '';
    $('mhBest').textContent = L && !moving && S.bestFluency[id] ? 'BEST ' + S.bestFluency[id] + '%' : '';
    $('mhPrompt').textContent = moving ? '' : L ? 'ENTER · JUMP ▸ PLAY' : 'COMING SOON';
    $('mhBot').classList.toggle('moving', !!moving);
  },

  /* ---------- desenho ---------- */
  stars: null,
  ensureStars() {
    if (this.stars) return;
    const rnd = mulberry32(5); this.stars = [];
    for (let i = 0; i < 140; i++) this.stars.push({ x: rnd() * 960, y: 56 + rnd() * 484, s: 0.4 + rnd() * 1.1, p: rnd() * 6 });
  },
  // "HELLO WORLD" em estrelas: cada letra acende quando a letra rara correspondente foi achada;
  // letras vizinhas acesas se ligam por uma linha, como numa constelação
  constellation(ctx, t) {
    const words = [['1-1', 'HELLO'], ['1-2', 'WORLD']], letterW = 32, gap = 26, cy = 96;
    const total = 10 * letterW + gap, x0 = 590 - total / 2 + letterW / 2, pts = [];
    let i = 0;
    for (const [id, w] of words) {
      const found = Save.data.letters[id] || [];
      for (let k = 0; k < w.length; k++, i++) pts.push({ x: x0 + i * letterW + (i >= 5 ? gap : 0), y: cy + Math.sin(i * 1.7) * 7, ch: w[k], on: !!found[k], word: id });
    }
    for (let j = 0; j < pts.length - 1; j++) {
      const a = pts[j], b = pts[j + 1]; if (a.word !== b.word) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = a.on && b.on ? 'rgba(232,121,249,0.55)' : 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
    }
    pts.forEach((p, j) => {
      if (p.on) R.draw(R.glow('m', 22), p.x, p.y, 1, 0.55 + 0.15 * Math.sin(t * 2 + j), true);
      R.draw(R.text(p.ch, '900 18px Orbitron, Inter, sans-serif', p.on ? '#ffffff' : 'rgba(255,255,255,0.14)', p.on ? 'rgba(217,70,239,1)' : null, p.on ? 8 : 0), p.x, p.y);
    });
  },
  land() {
    return R.sprite('worldmap1', 960, 540, (x) => {
      // massa de terra (vidro escuro) com borda ciano
      x.beginPath();
      x.moveTo(40, 430); x.bezierCurveTo(60, 300, 180, 250, 300, 245); x.bezierCurveTo(380, 150, 520, 120, 640, 160);
      x.bezierCurveTo(760, 90, 920, 90, 930, 190); x.bezierCurveTo(950, 300, 860, 360, 760, 380);
      x.bezierCurveTo(640, 470, 470, 410, 380, 470); x.bezierCurveTo(300, 520, 120, 520, 40, 430); x.closePath();
      x.fillStyle = '#0a0f12'; x.fill();
      x.save(); x.shadowColor = 'rgba(34,211,238,0.55)'; x.shadowBlur = 14 * R.k; x.strokeStyle = 'rgba(34,211,238,0.5)'; x.lineWidth = 1.2; x.stroke(); x.restore();
      // grade fina
      x.save(); x.clip(); x.strokeStyle = 'rgba(34,211,238,0.05)'; x.lineWidth = 1;
      for (let gx = 0; gx < 960; gx += 32) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, 540); x.stroke(); }
      for (let gy = 0; gy < 540; gy += 32) { x.beginPath(); x.moveTo(0, gy); x.lineTo(960, gy); x.stroke(); }
      // rio de luz
      x.beginPath(); x.moveTo(300, 520); x.bezierCurveTo(330, 420, 420, 380, 460, 260); x.bezierCurveTo(490, 180, 600, 160, 640, 60);
      x.strokeStyle = 'rgba(34,211,238,0.10)'; x.lineWidth = 16; x.stroke(); x.strokeStyle = 'rgba(34,211,238,0.22)'; x.lineWidth = 2; x.stroke();
      // a cidade gótica vista do alto: telhados, pináculos e janelas acesas (longe dos nós e caminhos)
      const rnd = mulberry32(42), W = this.W, near = (px, py) => W.nodes.some(n => Math.hypot(n.x - px, n.y - py) < 46) ||
        W.edges.some(e => this.edgePts(e, e.a).some(([qx, qy]) => Math.hypot(qx - px, qy - py) < 26));
      for (let k = 0; k < 170; k++) {
        const px = 60 + rnd() * 870, py = 120 + rnd() * 400; if (near(px, py)) continue;
        const w = 8 + rnd() * 14, h = 6 + rnd() * 10, kind = rnd();
        x.save(); x.translate(px, py);
        if (kind < 0.55) { rrect(x, -w / 2, -h / 2, w, h, 1.5); x.fillStyle = 'rgba(5,7,9,0.9)'; x.fill(); x.strokeStyle = 'rgba(34,211,238,0.12)'; x.lineWidth = 0.8; x.stroke(); x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.strokeStyle = 'rgba(34,211,238,0.06)'; x.stroke(); }
        else if (kind < 0.8) { x.beginPath(); x.moveTo(-w * 0.3, h * 0.4); x.lineTo(0, -h); x.lineTo(w * 0.3, h * 0.4); x.closePath(); x.fillStyle = 'rgba(5,7,9,0.9)'; x.fill(); x.strokeStyle = 'rgba(34,211,238,0.16)'; x.lineWidth = 0.8; x.stroke(); }
        else { x.beginPath(); x.arc(0, 0, w * 0.28, 0, Math.PI * 2); x.fillStyle = 'rgba(5,7,9,0.9)'; x.fill(); x.strokeStyle = 'rgba(34,211,238,0.14)'; x.lineWidth = 0.8; x.stroke(); }
        if (rnd() < 0.35) { x.fillStyle = 'rgba(122,216,255,' + (0.35 + rnd() * 0.4).toFixed(2) + ')'; x.fillRect(-0.8, -0.8, 1.6, 1.6); }
        x.restore();
      }
      x.restore();
    });
  },
  icon(ctx, kind, x, y, on) {
    ctx.save(); ctx.translate(x, y - 13); ctx.scale(1.45, 1.45);
    if (on) R.draw(R.glow('c', 30), x, y - 30, 1, 0.22, true);
    ctx.strokeStyle = on ? 'rgba(34,211,238,0.8)' : 'rgba(255,255,255,0.14)'; ctx.fillStyle = 'rgba(10,15,18,0.95)'; ctx.lineWidth = 0.8;
    const tower = (tx, w, h) => { ctx.beginPath(); ctx.moveTo(tx - w / 2, 0); ctx.lineTo(tx - w / 2, -h); ctx.lineTo(tx, -h - w * 0.9); ctx.lineTo(tx + w / 2, -h); ctx.lineTo(tx + w / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    if (kind === 'gate') { tower(-12, 10, 16); tower(12, 10, 16); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(0, -18, 7, 0); ctx.stroke(); }
    else if (kind === 'nave') { tower(0, 22, 18); tower(-15, 8, 10); tower(15, 8, 10); ctx.beginPath(); ctx.arc(0, -12, 4, 0, Math.PI * 2); ctx.stroke(); }
    else if (kind === 'palace') { ctx.beginPath(); ctx.rect(-14, -14, 28, 14); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-17, -14); ctx.lineTo(0, -26); ctx.lineTo(17, -14); ctx.stroke(); }
    else if (kind === 'ghost') { ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-13, -16); ctx.lineTo(-2, -26); ctx.lineTo(14, -18); ctx.lineTo(13, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.rect(-4, -12, 6, 7); ctx.stroke(); }
    else if (kind === 'tower') tower(0, 12, 28);
    else if (kind === 'fortress') { ctx.beginPath(); ctx.rect(-16, -16, 32, 16); ctx.fill(); ctx.stroke(); for (let i = -16; i < 16; i += 8) { ctx.beginPath(); ctx.rect(i, -21, 5, 5); ctx.stroke(); } }
    else if (kind === 'castle') { tower(-14, 10, 22); tower(14, 10, 22); tower(0, 14, 32); }
    ctx.restore();
  },
  render(ctx, t) {
    this.ensureStars();
    for (const s of this.stars) R.draw(R.glow('w', 3), s.x, s.y, s.s, 0.35 + 0.3 * Math.sin(t * 1.5 + s.p), true);
    // lua crescente
    R.draw(R.glow('w', 60), 92, 118, 1, 0.35, true);
    ctx.save(); ctx.beginPath(); ctx.arc(92, 118, 20, 0, Math.PI * 2); ctx.arc(101, 112, 18, 0, Math.PI * 2, true); ctx.fillStyle = 'rgba(240,250,255,0.92)'; ctx.fill('evenodd'); ctx.restore();
    this.constellation(ctx, t);
    R.draw(this.land(), 480, 270);
    const W = this.W;
    // caminhos: abertos (pontos ciano), revelando (pontos surgindo), fechados (nada)
    for (const e of W.edges) {
      const revealing = this.reveal[0] === e, vis = this.visible(e);
      if (!vis && !revealing) continue;
      const pts = this.edgePts(e, e.a); let total = 0; const seg = [];
      for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); total += l; }
      const upto = revealing ? total * Math.min(1, this.revealT / 1.4) : total, step = 14;
      const secret = e.unlock[1] === 'secret';
      for (let d = 0; d <= upto; d += step) {
        let rem = d, i = 0; while (i < seg.length - 1 && rem > seg[i]) { rem -= seg[i]; i++; }
        const k = seg[i] ? rem / seg[i] : 0, px = lerp(pts[i][0], pts[i + 1][0], k), py = lerp(pts[i][1], pts[i + 1][1], k);
        const fresh = revealing && d > upto - 40;
        R.draw(R.glow(secret ? 'm' : 'c', 8), px, py, fresh ? 1.6 : 1, fresh ? 1 : 0.7, true);
        ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      }
    }
    // nós
    for (const n of W.nodes) {
      const reach = this.reachable(n.id), play = this.playable(n.id), cleared = !!Save.data.cleared[n.id], ex = Save.data.exits[n.id] || {};
      if (!reach && !W.edges.some(e => (e.a === n.id || e.b === n.id) && this.reveal[0] === e)) { this.icon(ctx, n.icon, n.x, n.y, false); ctx.beginPath(); ctx.arc(n.x, n.y, 7, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.stroke(); continue; }
      this.icon(ctx, n.icon, n.x, n.y, true);
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + n.x);
      if (play && !cleared) R.draw(R.glow('c', 30), n.x, n.y, 1, 0.35 + 0.35 * pulse, true);
      capsulePath(ctx, n.x, n.y, 30, 18); ctx.fillStyle = 'rgba(10,15,18,0.95)'; ctx.fill();
      ctx.strokeStyle = cleared ? '#d946ef' : play ? 'rgba(34,211,238,0.85)' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.4; ctx.stroke();
      if (cleared) R.draw(R.glow('m', 22), n.x, n.y, 1, 0.45, true);
      R.draw(R.text(n.label, '700 9px Orbitron, Inter, sans-serif', play ? '#ffffff' : 'rgba(255,255,255,0.5)', null, 0), n.x, n.y + 0.5);
      if (ex.secret) { ctx.beginPath(); ctx.arc(n.x + 17, n.y - 9, 4, 0, Math.PI * 2); ctx.fillStyle = '#e879f9'; ctx.fill(); }
      if (!play) R.draw(R.text('SOON', '600 7px Orbitron, Inter, sans-serif', 'rgba(255,255,255,0.4)', null, 0), n.x, n.y + 17);
    }
    // Nexy e o Echo
    const bob = this.walk ? Math.abs(Math.sin(this.phase * 12)) * 2 : 0, hop = Math.sin(this.hop * Math.PI) * 14;
    R.draw(R.glow('m', 24), this.x, this.y - 14 - hop, 0.9, 0.5, true);
    ctx.save(); ctx.translate(this.x, this.y - 2 - bob - hop); ctx.scale(0.62 * this.facing, 0.62);
    const of = P.facing, og = P.onGround, ow = P.walkPhase; P.facing = 1; P.onGround = !this.hop; P.walkPhase = this.walk ? this.phase * 9 : 0.6;
    P.drawBody(ctx, t); P.facing = of; P.onGround = og; P.walkPhase = ow;
    ctx.restore();
    const e = this.echo;
    R.draw(R.glow('m', 16), e.x, e.y, 0.8, 0.7, true);
    ctx.beginPath(); ctx.arc(e.x, e.y, 4.5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(e.x, e.y, 1.8, 0, Math.PI * 2); ctx.fillStyle = '#e879f9'; ctx.fill();
  },
};
