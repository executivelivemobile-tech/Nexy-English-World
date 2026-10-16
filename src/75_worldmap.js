
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
        const of = P.facing, og = P.onGround, ow = P.walkPhase; P.facing = 1; P.onGround = true; P.walkPhase = 0.6; P.poseSpeed = 0; P.drawBody(ctx, time); P.facing = of; P.onGround = og; P.walkPhase = ow; P.poseSpeed = null;
        ctx.restore();
        R.draw(R.text('×  ' + c.lives, '700 14px JetBrains Mono, monospace', '#ffffff', null, 0), 492, 368, 1, k);
      }
    }
  },
};

/* ============================== MAPA-MÚNDI (como no Mario World) ==============================
   A Nexy anda pelos caminhos abertos entre as fases. Enter / pulo entra na fase.
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
      card: { label: levelTag(L), name: L.name, word: L.masterWord, found, lives: Game.lives },
      mid: () => { this.leave(); Game.enterLevel(id, true); },
      openAt: () => ({ x: P.cx - Cam.x, y: P.cy - Cam.y }),
    });
  },
  refreshHud(moving) {
    const S = Save.data, n = this.node(this.at), id = this.at;
    $('mhWorld').textContent = 'WORLD ' + this.world + ' · ' + this.W.name;
    $('mhLives').textContent = '×' + Game.lives; $('mhOrbs').textContent = String(Game.orbs).padStart(3, '0');
    const hb = S.heart && S.heart.best != null ? S.heart.best : -1, ring = !!(S.heart && S.heart.ring), cp = (S.heart && S.heart.compass) | 0;
    $('mhHeartBox').style.display = hb >= 0 || ring || cp ? '' : 'none';
    $('mhHeart').style.background = hb >= 0 ? HEART_LOOK[hb].css : 'transparent';
    // o Anel do TO BE (TO BE PALACE): um aro ciano em volta do Coração
    $('mhHeart').style.boxShadow = (ring ? '0 0 0 2px rgba(122,216,255,.85), ' : '') + '0 0 10px rgba(217,70,239,.6)';
    $('mhHeartBox').title = [hb >= 0 ? HEART[hb].name : '', ring ? PALACE.ring.name : '', cp ? CITY.compass[cp - 1].name : ''].filter(Boolean).join(' + ');
    // a Bússola (1-3): uma agulha atravessando o Coração
    $('mhNeedle').style.display = cp ? '' : 'none';
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

  /* ---------- desenho ----------
     Uma ilha flutuante no céu da noite (com espessura: o penhasco embaixo), bairros com cara própria (catedrais,
     palácio, a cidade neon, os rochedos do castelo), um rio de luz que corre e cai em cascata pelo penhasco,
     estradas com uma faísca que passa, pontes, marcos grandes em cada fase, névoa sobre o que ainda não foi
     descoberto, nuvens, estrela cadente e raios atrás do castelo. Só desenho: posições e caminhos são os de WORLDS. */
  stars: null, art: null,
  // a forma da ilha (a mesma de sempre) e o rio, em coordenadas da tela (960 × 540)
  islandPath(x) {
    x.beginPath();
    x.moveTo(40, 430); x.bezierCurveTo(60, 300, 180, 250, 300, 245); x.bezierCurveTo(380, 150, 520, 120, 640, 160);
    x.bezierCurveTo(760, 90, 920, 90, 930, 190); x.bezierCurveTo(950, 300, 860, 360, 760, 380);
    x.bezierCurveTo(640, 470, 470, 410, 380, 470); x.bezierCurveTo(300, 520, 120, 520, 40, 430); x.closePath();
  },
  bez(p0, p1, p2, p3, n, out) {
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  },
  // pontos de apoio calculados uma vez: o rio, onde ele cai do penhasco, as pontes, as luzes que piscam
  prep() {
    if (this.art) return this.art;
    const tc = document.createElement('canvas').getContext('2d'), isl = new Path2D();
    isl.moveTo(40, 430); isl.bezierCurveTo(60, 300, 180, 250, 300, 245); isl.bezierCurveTo(380, 150, 520, 120, 640, 160);
    isl.bezierCurveTo(760, 90, 920, 90, 930, 190); isl.bezierCurveTo(950, 300, 860, 360, 760, 380);
    isl.bezierCurveTo(640, 470, 470, 410, 380, 470); isl.bezierCurveTo(300, 520, 120, 520, 40, 430); isl.closePath();
    const inside = (px, py) => tc.isPointInPath(isl, px, py);
    const river = this.bez([300, 520], [330, 420], [420, 380], [460, 260], 60, []);
    this.bez([460, 260], [490, 180], [600, 160], [640, 60], 60, river);
    const riverIn = river.filter(([px, py]) => inside(px, py));
    // a cascata: onde o rio sai pela borda da frente (embaixo)
    let fall = null; for (let i = 1; i < river.length; i++) if (!inside(...river[i - 1]) && inside(...river[i])) { fall = river[i]; break; }
    // os caminhos amostrados a cada 8 px (para as casinhas não nascerem em cima deles) e as pontes sobre o rio
    const W = this.W, paths = [], bridges = [];
    for (const e of W.edges) {
      const pts = this.edgePts(e, e.a), smp = [];
      for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 8); for (let k = 0; k <= n; k++) smp.push([lerp(ax, bx, k / n), lerp(ay, by, k / n)]); }
      paths.push(...smp);
      for (let i = 1; i < smp.length; i++) {
        const [px, py] = smp[i];
        if (riverIn.some(([rx, ry]) => Math.hypot(rx - px, ry - py) < 7)) { bridges.push({ e, x: px, y: py, a: Math.atan2(py - smp[i - 1][1], px - smp[i - 1][0]) }); break; }
      }
    }
    this.art = { inside, isl, river, riverIn, fall, paths, bridges, lights: [] };
    return this.art;
  },
  // o bairro de cada ponto: o estilo das casinhas vem da fase mais perto
  district(px, py) {
    let best = null, bd = 1e9;
    for (const n of this.W.nodes) { const d = Math.hypot(n.x - px, n.y - py); if (d < bd) { bd = d; best = n; } }
    return best ? best.icon : 'gate';
  },
  ensureStars() {
    if (this.stars) return;
    const rnd = mulberry32(5); this.stars = [];
    for (let i = 0; i < 160; i++) this.stars.push({ x: rnd() * 960, y: 56 + rnd() * 484, s: 0.4 + rnd() * 1.1, p: rnd() * 6 });
    this.clouds = []; for (let i = 0; i < 9; i++) this.clouds.push({ x: rnd() * 1200, y: 150 + rnd() * 380, w: 120 + rnd() * 220, h: 10 + rnd() * 16, v: 4 + rnd() * 8, front: i < 3 });
  },
  // palavras-mestras em estrelas: cada letra acende quando foi achada; letras vizinhas acesas se ligam (constelação)
  constellation(ctx, t, words, cx, cy, lw, size, gap = 26) {
    const n = words.reduce((a, w) => a + w[1].length, 0), total = n * lw + gap * (words.length - 1), x0 = cx - total / 2 + lw / 2, pts = [];
    let i = 0, wi = 0;
    for (const [id, w] of words) {
      const found = Save.data.letters[id] || [];
      for (let k = 0; k < w.length; k++, i++) pts.push({ x: x0 + i * lw + wi * gap, y: cy + Math.sin((i + cx) * 1.7) * size * 0.4, ch: w[k], on: !!found[k], word: id });
      wi++;
    }
    for (let j = 0; j < pts.length - 1; j++) {
      const a = pts[j], b = pts[j + 1]; if (a.word !== b.word) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = a.on && b.on ? 'rgba(232,121,249,0.55)' : 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
    }
    pts.forEach((p, j) => {
      if (p.on) R.draw(R.glow('m', 22), p.x, p.y, size / 18, 0.55 + 0.15 * Math.sin(t * 2 + j), true);
      R.draw(R.text(p.ch, `900 ${size}px Orbitron, Inter, sans-serif`, p.on ? '#ffffff' : 'rgba(255,255,255,0.14)', p.on ? 'rgba(217,70,239,1)' : null, p.on ? 8 : 0), p.x, p.y);
    });
  },
  // a ilha (fica guardada numa imagem: só é desenhada uma vez)
  land() {
    const A = this.prep();
    return R.sprite('worldmap2', 960, 540, (x) => {
      const rnd = mulberry32(42), D = 38; A.lights.length = 0;
      // o brilho atrás da ilha (ela flutua no céu)
      const hg = x.createRadialGradient(500, 320, 60, 500, 320, 520); hg.addColorStop(0, 'rgba(34,211,238,0.07)'); hg.addColorStop(1, 'rgba(34,211,238,0)');
      x.fillStyle = hg; x.fillRect(0, 0, 960, 540);
      // o penhasco: a ilha copiada para baixo, com camadas de pedra e pontas penduradas
      x.save(); x.translate(0, D); this.islandPath(x); x.restore();
      const cg = x.createLinearGradient(0, 120, 0, 540); cg.addColorStop(0, '#05070a'); cg.addColorStop(1, '#020304');
      x.fillStyle = cg; x.fill();
      x.save(); x.clip();
      for (let k = 0; k < 140; k++) {
        const px = 40 + rnd() * 900, py = 100 + rnd() * 430, l = 6 + rnd() * 22;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 3, py + l); x.strokeStyle = `rgba(34,211,238,${(0.03 + rnd() * 0.05).toFixed(3)})`; x.lineWidth = 1; x.stroke();
      }
      x.restore();
      // pontas de pedra penduradas embaixo do penhasco (só onde a borda é a de baixo)
      for (let k = 0; k < 46; k++) {
        const px = 60 + rnd() * 870; let by = 0;
        for (let py = 540; py > 60; py -= 2) if (A.inside(px, py - D)) { by = py; break; }
        if (!by || by > 530) continue;
        const w = 6 + rnd() * 14, h = 8 + rnd() * 34;
        x.beginPath(); x.moveTo(px - w / 2, by - 2); x.lineTo(px + (rnd() - 0.5) * 4, by + h); x.lineTo(px + w / 2, by - 2); x.closePath();
        x.fillStyle = '#030406'; x.fill(); x.strokeStyle = 'rgba(34,211,238,0.07)'; x.stroke();
      }
      // a superfície: vidro escuro, borda com luz de recorte e um chanfro claro por dentro
      this.islandPath(x);
      const sg = x.createLinearGradient(0, 90, 0, 520); sg.addColorStop(0, '#0c1216'); sg.addColorStop(1, '#080c0f');
      x.fillStyle = sg; x.fill();
      x.save(); x.clip();
      x.lineWidth = 14; x.strokeStyle = 'rgba(34,211,238,0.05)'; this.islandPath(x); x.stroke();
      // os bairros: um brilho suave em volta de cada fase
      for (const n of this.W.nodes) { const g = x.createRadialGradient(n.x, n.y, 0, n.x, n.y, 120); g.addColorStop(0, 'rgba(34,211,238,0.06)'); g.addColorStop(1, 'rgba(34,211,238,0)'); x.fillStyle = g; x.fillRect(n.x - 120, n.y - 120, 240, 240); }
      // grade fina
      x.strokeStyle = 'rgba(34,211,238,0.03)'; x.lineWidth = 1;
      for (let gx = 0; gx < 960; gx += 32) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, 540); x.stroke(); }
      for (let gy = 0; gy < 540; gy += 32) { x.beginPath(); x.moveTo(0, gy); x.lineTo(960, gy); x.stroke(); }
      // o rio: margem escura e o leito de luz (a correnteza é desenhada por cima, ao vivo)
      x.beginPath(); A.river.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py));
      x.lineCap = 'round'; x.strokeStyle = 'rgba(2,8,12,0.9)'; x.lineWidth = 22; x.stroke();
      x.strokeStyle = 'rgba(34,211,238,0.12)'; x.lineWidth = 14; x.stroke();
      x.strokeStyle = 'rgba(122,216,255,0.28)'; x.lineWidth = 2; x.stroke();
      // a montanha do castelo (o castelo fica no pico)
      const peak = [[728, 292], [748, 258], [764, 264], [784, 222], [800, 230], [818, 186], [830, 192], [842, 148], [856, 170], [868, 162], [884, 198], [898, 192], [914, 230], [934, 272]];
      x.beginPath(); peak.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath();
      const mg = x.createLinearGradient(0, 160, 0, 290); mg.addColorStop(0, '#0b1014'); mg.addColorStop(1, '#05080a');
      x.fillStyle = mg; x.fill(); x.strokeStyle = 'rgba(34,211,238,0.22)'; x.lineWidth = 1; x.stroke();
      // a luz da lua batendo nas faces da esquerda dos picos
      x.beginPath(); for (let i = 1; i < peak.length - 1; i++) if (peak[i][1] < peak[i - 1][1]) { x.moveTo(peak[i - 1][0], peak[i - 1][1]); x.lineTo(peak[i][0], peak[i][1]); } x.strokeStyle = 'rgba(165,243,252,0.35)'; x.lineWidth = 1.2; x.stroke();
      x.beginPath(); for (let k = 0; k < 22; k++) { const px = 760 + rnd() * 150, py = 200 + rnd() * 80; x.moveTo(px, py); x.lineTo(px + 6 + rnd() * 10, py + 8 + rnd() * 14); } x.strokeStyle = 'rgba(34,211,238,0.07)'; x.lineWidth = 1; x.stroke();
      // as casinhas (2,5D: frente, telhado e lateral), cada bairro com o seu estilo, longe das fases, das estradas e do rio
      const near = (px, py) => this.W.nodes.some(n => Math.hypot(n.x - px, n.y - py) < 52) || A.paths.some(([qx, qy]) => Math.hypot(qx - px, qy - py) < 16) ||
        A.riverIn.some(([qx, qy]) => Math.hypot(qx - px, qy - py) < 16) || (px > 724 && py > 160 && py < 292 && px < 936);
      const list = [];
      for (let k = 0; k < 520 && list.length < 230; k++) {
        const px = 50 + rnd() * 880, py = 100 + rnd() * 420;
        if (!A.inside(px, py) || !A.inside(px - 12, py + 10) || !A.inside(px + 12, py + 10) || !A.inside(px, py - 30) || near(px, py)) continue;
        list.push({ px, py, k: this.district(px, py), r: rnd(), r2: rnd(), r3: rnd() });
      }
      list.sort((a, b) => a.py - b.py);
      const lit = (lx, ly, mag) => { x.fillStyle = mag ? 'rgba(240,171,252,0.85)' : 'rgba(165,243,252,0.85)'; x.fillRect(lx - 0.8, ly - 0.8, 1.6, 1.6); A.lights.push({ x: lx, y: ly, p: rnd() * 6, m: mag }); };
      for (const b of list) {
        const { px, py } = b, d = 3;
        const box = (w, h) => {
          x.beginPath(); x.moveTo(px - w / 2, py - h); x.lineTo(px - w / 2 + d, py - h - d); x.lineTo(px + w / 2 + d, py - h - d); x.lineTo(px + w / 2, py - h); x.closePath();
          x.fillStyle = 'rgba(34,211,238,0.10)'; x.fill();
          x.beginPath(); x.moveTo(px + w / 2, py - h); x.lineTo(px + w / 2 + d, py - h - d); x.lineTo(px + w / 2 + d, py - d); x.lineTo(px + w / 2, py); x.closePath();
          x.fillStyle = '#040608'; x.fill();
          x.fillStyle = '#080b0e'; x.fillRect(px - w / 2, py - h, w, h); x.strokeStyle = 'rgba(34,211,238,0.16)'; x.lineWidth = 0.7; x.strokeRect(px - w / 2 + 0.35, py - h + 0.35, w - 0.7, h - 0.7);
        };
        if (b.k === 'tower') {
          // a cidade neon: prédios altos, janelas em grade
          const w = 6 + b.r * 6, h = 12 + b.r2 * 22; box(w, h);
          for (let yy = py - h + 3; yy < py - 2; yy += 4) for (let xx = px - w / 2 + 2; xx < px + w / 2 - 1; xx += 3) if (rnd() < 0.3) lit(xx, yy, rnd() < 0.12);
          if (b.r3 < 0.3) { x.beginPath(); x.moveTo(px, py - h - d); x.lineTo(px, py - h - d - 7); x.strokeStyle = 'rgba(34,211,238,0.3)'; x.stroke(); }
        } else if (b.k === 'palace') {
          // cúpulas e colunas
          const w = 9 + b.r * 7, h = 6 + b.r2 * 5; box(w, h);
          x.beginPath(); x.arc(px + 1, py - h - 1, w * 0.32, Math.PI, 0); x.fillStyle = '#080b0e'; x.fill(); x.strokeStyle = 'rgba(34,211,238,0.22)'; x.stroke();
          if (b.r3 < 0.5) lit(px, py - h / 2, false);
        } else if (b.k === 'fortress' || b.k === 'castle') {
          // terra de rochedos e árvores secas, perto do castelo
          if (b.r < 0.6) { const w = 8 + b.r2 * 12, h = 5 + b.r3 * 9; x.beginPath(); x.moveTo(px - w / 2, py); x.lineTo(px - w * 0.2, py - h); x.lineTo(px + w * 0.1, py - h * 0.7); x.lineTo(px + w / 2, py); x.closePath(); x.fillStyle = '#06080a'; x.fill(); x.strokeStyle = 'rgba(34,211,238,0.12)'; x.lineWidth = 0.7; x.stroke(); }
          else { x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - 11); x.moveTo(px, py - 6); x.lineTo(px - 4, py - 10); x.moveTo(px, py - 8); x.lineTo(px + 4, py - 13); x.strokeStyle = 'rgba(34,211,238,0.2)'; x.lineWidth = 0.8; x.stroke(); }
        } else {
          // o bairro gótico: casas de telhado pontudo e torrezinhas
          const w = 7 + b.r * 7, h = 5 + b.r2 * 6; box(w, h);
          x.beginPath(); x.moveTo(px - w / 2 - 1, py - h); x.lineTo(px + d * 0.5, py - h - 4 - w * 0.5 - (b.r3 < 0.25 ? 8 : 0)); x.lineTo(px + w / 2 + 1, py - h); x.closePath();
          x.fillStyle = '#070a0d'; x.fill(); x.strokeStyle = 'rgba(34,211,238,0.2)'; x.lineWidth = 0.7; x.stroke();
          if (b.r3 > 0.55) lit(px, py - h / 2, b.r3 > 0.95);
        }
      }
      x.restore();
      // a borda de cima com luz de recorte
      this.islandPath(x); x.save(); x.shadowColor = 'rgba(34,211,238,0.6)'; x.shadowBlur = 14 * R.k; x.strokeStyle = 'rgba(34,211,238,0.55)'; x.lineWidth = 1.2; x.stroke(); x.restore();
    });
  },
  // os marcos de cada fase, grandes e com janelas acesas (on = já dá para ir; lit = brilho total)
  landmark(ctx, kind, x, y, on, t) {
    const stroke = on ? 'rgba(34,211,238,0.85)' : 'rgba(255,255,255,0.12)', fill = on ? '#070b0e' : '#05070a';
    const win = (wx, wy, w, h, mag) => { if (!on) return; R.draw(R.glow(mag ? 'm' : 'c', 10), wx, wy, Math.max(w, h) / 10, 0.7, true); ctx.fillStyle = mag ? '#f0abfc' : '#a5f3fc'; ctx.fillRect(wx - w / 2, wy - h / 2, w, h); };
    const spire = (sx, w, h, top = 0.9) => { ctx.beginPath(); ctx.moveTo(sx - w / 2, 0); ctx.lineTo(sx - w / 2, -h); ctx.lineTo(sx, -h - w * top); ctx.lineTo(sx + w / 2, -h); ctx.lineTo(sx + w / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1;
    if (on) R.draw(R.glow('c', 48), 0, -26, 1.1, 0.16, true);
    if (kind === 'gate') {
      spire(-17, 13, 30); spire(17, 13, 30);
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-11, -18); ctx.quadraticCurveTo(0, -34, 11, -18); ctx.lineTo(11, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      win(0, -9, 6, 12, false); win(-17, -22, 3, 6, false); win(17, -22, 3, 6, false);
    } else if (kind === 'nave') {
      spire(-20, 9, 22); spire(20, 9, 22);
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-16, -26); ctx.lineTo(0, -46); ctx.lineTo(16, -26); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      spire(0, 7, 46, 2.4);
      if (on) { R.draw(R.glow('c', 24), 0, -24, 0.9, 0.6, true); }
      ctx.beginPath(); ctx.arc(0, -24, 6, 0, Math.PI * 2); ctx.fillStyle = on ? 'rgba(122,216,255,0.75)' : fill; ctx.fill(); ctx.stroke();
      win(-9, -10, 3, 7, false); win(9, -10, 3, 7, false);
    } else if (kind === 'palace') {
      ctx.beginPath(); ctx.rect(-22, -18, 44, 18); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-26, -18); ctx.lineTo(0, -36); ctx.lineTo(26, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); for (let i = -16; i <= 16; i += 8) { ctx.moveTo(i, -2); ctx.lineTo(i, -16); } ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -25, 5, 0, Math.PI * 2); ctx.fillStyle = on ? 'rgba(10,15,18,1)' : fill; ctx.fill(); ctx.stroke();
      if (on) { const a = -t * 0.8; ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(Math.sin(a) * 4, -25 - Math.cos(a) * 4); ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
      if (Save.data.flags.palaces && Save.data.flags.palaces.toBe) R.draw(R.glow('m', 40), 0, -14, 1, 0.35, true);
    } else if (kind === 'tower') {
      // a cidade neon: três prédios, letreiro e antena piscando
      const bld = (bx, w, h) => { ctx.beginPath(); ctx.rect(bx - w / 2, -h, w, h); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bx - w / 2, -h); ctx.lineTo(bx - w / 2 + 4, -h - 4); ctx.lineTo(bx + w / 2 + 4, -h - 4); ctx.lineTo(bx + w / 2, -h); ctx.stroke(); };
      bld(-14, 12, 30); bld(13, 12, 24); bld(0, 14, 50);
      if (on) {
        for (const [bx, w, h] of [[-14, 12, 30], [13, 12, 24], [0, 14, 50]]) for (let yy = -h + 5; yy < -3; yy += 6) for (let xx = bx - w / 2 + 3; xx < bx + w / 2 - 2; xx += 4) if ((xx * 7 + yy * 13) % 5 < 2) { ctx.fillStyle = (xx + yy) % 7 === 0 ? '#f0abfc' : 'rgba(165,243,252,0.85)'; ctx.fillRect(xx, yy, 2, 2); }
        const blink = Math.sin(t * 4) > 0.3 ? 1 : 0.2; R.draw(R.glow('m', 14), 0, -62, 0.8, blink, true);
        rrect(ctx, -20, -40, 13, 7, 2); ctx.fillStyle = 'rgba(4,6,9,0.95)'; ctx.fill(); ctx.strokeStyle = 'rgba(217,70,239,0.8)'; ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(0, -62); ctx.strokeStyle = stroke; ctx.stroke();
    } else if (kind === 'ghost') {
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-17, -20); ctx.lineTo(-4, -34); ctx.lineTo(6, -28); ctx.lineTo(15, -36); ctx.lineTo(18, -18); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      win(-5, -16, 4, 6, true); win(7, -20, 4, 5, false);
      if (on) { const gy = -44 + Math.sin(t * 2) * 3; R.draw(R.glow('w', 14), 10, gy, 0.7, 0.35, true); }
    } else if (kind === 'fortress') {
      ctx.beginPath(); ctx.rect(-24, -16, 48, 16); ctx.fill(); ctx.stroke();
      spire(-22, 10, 28, 0.6); spire(22, 10, 28, 0.6);
      ctx.beginPath(); for (let i = -16; i < 16; i += 8) ctx.rect(i, -21, 5, 5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-6, -8); ctx.quadraticCurveTo(0, -14, 6, -8); ctx.lineTo(6, 0); ctx.stroke();
      win(-22, -18, 3, 5, false); win(22, -18, 3, 5, false);
    } else if (kind === 'castle') {
      spire(-24, 10, 34); spire(24, 10, 34); spire(-11, 11, 46); spire(11, 11, 46); spire(0, 14, 62, 1.3);
      ctx.beginPath(); ctx.rect(-28, -18, 56, 18); ctx.fill(); ctx.stroke();
      win(0, -40, 4, 9, true); win(-11, -30, 3, 6, false); win(11, -30, 3, 6, false); win(0, -9, 7, 12, false);
    }
    ctx.restore();
  },
  // o palco de cada fase: um disco com espessura onde fica o rótulo
  pad(ctx, x, y, col, pulse) {
    ctx.beginPath(); ctx.ellipse(x, y + 7, 25, 8, 0, 0, Math.PI * 2); ctx.fillStyle = '#030406'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + 3, 25, 8, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(10,15,18,0.98)'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5 + 0.5 * pulse; ctx.stroke(); ctx.globalAlpha = 1;
  },
  // névoa sobre o que ainda não foi descoberto
  fog(ctx, x, y, t) {
    for (let i = 0; i < 5; i++) {
      const fx = x + Math.sin(t * 0.25 + i * 1.7) * 14 + (i - 2) * 14, fy = y - 24 + Math.cos(t * 0.2 + i) * 6 + (i % 2) * 10, r = 26 + (i % 3) * 8;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r); g.addColorStop(0, 'rgba(70,92,108,0.42)'); g.addColorStop(0.6, 'rgba(40,58,70,0.25)'); g.addColorStop(1, 'rgba(30,44,54,0)');
      ctx.fillStyle = g; ctx.fillRect(fx - r, fy - r, r * 2, r * 2);
    }
    R.draw(R.text('?', '900 14px Orbitron, Inter, sans-serif', 'rgba(255,255,255,0.35)', null, 0), x, y - 30);
  },
  cloud(ctx, c, t, a) {
    const x = ((c.x + t * c.v) % 1300) - 170;
    const g = ctx.createRadialGradient(x, c.y, 0, x, c.y, c.w / 2); g.addColorStop(0, `rgba(122,216,255,${a})`); g.addColorStop(1, 'rgba(122,216,255,0)');
    ctx.save(); ctx.translate(x, c.y); ctx.scale(1, c.h / (c.w / 2)); ctx.translate(-x, -c.y); ctx.fillStyle = g; ctx.fillRect(x - c.w / 2, c.y - c.w / 2, c.w, c.w); ctx.restore();
  },
  render(ctx, t) {
    this.ensureStars(); const A = this.prep(), W = this.W, S = Save.data;
    // céu: estrelas, estrela cadente, lua e as nuvens de trás
    for (const s of this.stars) R.draw(R.glow('w', 3), s.x, s.y, s.s, 0.35 + 0.3 * Math.sin(t * 1.5 + s.p), true);
    const sp = t % 11;
    if (sp < 0.9) { const k = sp / 0.9, sx = 180 + k * 420, sy = 70 + k * 90; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 46, sy - 10); ctx.strokeStyle = `rgba(240,250,255,${(0.7 * (1 - k)).toFixed(3)})`; ctx.lineWidth = 1.2; ctx.stroke(); R.draw(R.glow('w', 8), sx, sy, 1, 1 - k, true); }
    R.draw(R.glow('w', 60), 92, 118, 1, 0.35, true);
    ctx.save(); ctx.beginPath(); ctx.arc(92, 118, 20, 0, Math.PI * 2); ctx.arc(101, 112, 18, 0, Math.PI * 2, true); ctx.fillStyle = 'rgba(240,250,255,0.92)'; ctx.fill('evenodd'); ctx.restore();
    this.constellation(ctx, t, [['1-1', 'HELLO'], ['1-2', 'WORLD']], 590, 96, 32, 18);
    if (this.reachable('palace')) this.constellation(ctx, t, [['palace', 'TOBE']], 210, 196, 22, 13);
    if (this.reachable('1-3')) this.constellation(ctx, t, [['1-3', 'CITY']], 840, 452, 22, 13);
    for (const c of this.clouds) if (!c.front) this.cloud(ctx, c, t, 0.03);
    // raios atrás do castelo, de tempos em tempos
    const lp = t % 9, cn = this.node('castle');
    if (cn && lp < 0.3) {
      const a = 1 - lp / 0.3; R.draw(R.glow('c', 64), cn.x, cn.y - 60, 3, 0.4 * a, true);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); let bx = cn.x + 30; ctx.moveTo(bx, 56);
      for (let yy = 70; yy < cn.y - 40; yy += 16) { bx += Math.sin(yy * 3.1 + Math.floor(t / 9)) * 12; ctx.lineTo(bx, yy); }
      ctx.strokeStyle = `rgba(200,245,255,${(0.9 * a).toFixed(3)})`; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
    }
    // a ilha
    R.draw(this.land(), 480, 270);
    // o rio corre (pontos de luz descendo) e cai em cascata pelo penhasco
    ctx.save(); ctx.clip(A.isl);
    for (let i = 0; i < 26; i++) {
      const k = ((i / 26) + t * 0.025) % 1, p = A.river[Math.floor((1 - k) * (A.river.length - 1))];
      R.draw(R.glow('c', 6), p[0] + Math.sin(i * 7 + t) * 2, p[1], 1, 0.7, true);
    }
    ctx.restore();
    if (A.fall) {
      const [fx, fy] = A.fall;
      const g = ctx.createLinearGradient(0, fy, 0, fy + 70); g.addColorStop(0, 'rgba(122,216,255,0.35)'); g.addColorStop(1, 'rgba(122,216,255,0)');
      ctx.fillStyle = g; ctx.fillRect(fx - 7, fy - 2, 14, 72);
      for (let i = 0; i < 6; i++) { const yy = fy + ((t * 60 + i * 12) % 70); ctx.fillStyle = `rgba(240,250,255,${(0.5 * (1 - (yy - fy) / 70)).toFixed(3)})`; ctx.fillRect(fx - 5 + (i % 3) * 4, yy, 1.4, 6); }
      R.draw(R.glow('c', 24), fx, fy + 66, 1.4, 0.3, true);
    }
    // um trem de luz atravessando o bairro da cidade (quando a 1-3 já dá para ir)
    if (this.reachable('1-3')) {
      const k = (t * 0.08) % 1, tx = lerp(596, 716, k), ty = lerp(396, 360, k);
      ctx.beginPath(); ctx.moveTo(596, 399); ctx.lineTo(716, 363); ctx.strokeStyle = 'rgba(34,211,238,0.2)'; ctx.lineWidth = 1; ctx.stroke();
      for (let i = 0; i < 3; i++) { R.draw(R.glow('c', 8), tx - i * 7, ty + i * 2.1, 0.8, 0.8, true); ctx.fillStyle = '#a5f3fc'; ctx.fillRect(tx - i * 7 - 2, ty + i * 2.1 - 1.5, 4, 2.5); }
    }
    // janelas que piscam
    for (const l of A.lights) { const s = Math.sin(t * 1.3 + l.p * 3); if (s > 0.92) R.draw(R.glow(l.m ? 'm' : 'c', 8), l.x, l.y, 0.8, (s - 0.92) * 10, true); }
    // estradas: leito escuro, pontos de luz, uma faísca que passa; pontes sobre o rio
    for (const e of W.edges) {
      const revealing = this.reveal[0] === e, vis = this.visible(e);
      if (!vis && !revealing) continue;
      const pts = this.edgePts(e, e.a); let total = 0; const seg = [];
      for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); total += l; }
      const upto = revealing ? total * Math.min(1, this.revealT / 1.4) : total, step = 14, secret = e.unlock[1] === 'secret';
      const at = d => { let rem = d, i = 0; while (i < seg.length - 1 && rem > seg[i]) { rem -= seg[i]; i++; } const k = seg[i] ? rem / seg[i] : 0; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; };
      if (vis) {
        ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = secret ? 'rgba(217,70,239,0.12)' : 'rgba(34,211,238,0.12)'; ctx.lineWidth = 9; ctx.stroke();
        ctx.strokeStyle = 'rgba(4,6,8,0.95)'; ctx.lineWidth = 6; ctx.stroke();
        for (const b of A.bridges) if (b.e === e) {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
          rrect(ctx, -11, -6, 22, 12, 3); ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = 'rgba(34,211,238,0.6)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-11, -3.5); ctx.lineTo(11, -3.5); ctx.moveTo(-11, 3.5); ctx.lineTo(11, 3.5); ctx.strokeStyle = 'rgba(34,211,238,0.25)'; ctx.stroke(); ctx.restore();
        }
      }
      for (let d = 0; d <= upto; d += step) {
        const [px, py] = at(d), fresh = revealing && d > upto - 40;
        R.draw(R.glow(secret ? 'm' : 'c', 8), px, py, fresh ? 1.6 : 1, fresh ? 1 : 0.7, true);
        ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      }
      if (vis) { const [px, py] = at((t * 70 + total * 0.37 * (e.a.length + e.b.length)) % total); R.draw(R.glow(secret ? 'm' : 'c', 16), px, py, 1, 0.9, true); }
    }
    // as fases: marco grande, palco, rótulo; névoa sobre as que ainda não foram descobertas (de cima para baixo)
    for (const n of W.nodes.slice().sort((a, b) => a.y - b.y)) {
      const revealing = W.edges.some(e => (e.a === n.id || e.b === n.id) && this.reveal[0] === e);
      const reach = this.reachable(n.id) || revealing, play = this.playable(n.id), cleared = !!S.cleared[n.id], ex = S.exits[n.id] || {};
      this.landmark(ctx, n.icon, n.x, n.y - 8, reach, t);
      if (!reach) { this.fog(ctx, n.x, n.y, t); continue; }
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + n.x);
      if (play && !cleared) R.draw(R.glow('c', 30), n.x, n.y + 4, 1.1, 0.3 + 0.3 * pulse, true);
      if (cleared) R.draw(R.glow('m', 30), n.x, n.y + 4, 1.1, 0.4, true);
      this.pad(ctx, n.x, n.y, cleared ? '#e879f9' : play ? 'rgba(34,211,238,0.95)' : 'rgba(255,255,255,0.3)', play && !cleared ? pulse : 1);
      const lw = Math.max(30, n.label.length * 7 + 10);
      capsulePath(ctx, n.x, n.y, lw, 18); ctx.fillStyle = 'rgba(10,15,18,0.95)'; ctx.fill();
      ctx.strokeStyle = cleared ? '#d946ef' : play ? 'rgba(34,211,238,0.85)' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.4; ctx.stroke();
      R.draw(R.text(n.label, '700 9px Orbitron, Inter, sans-serif', play ? '#ffffff' : 'rgba(255,255,255,0.5)', null, 0), n.x, n.y + 0.5);
      if (ex.secret) { R.draw(R.glow('m', 10), n.x + lw / 2 + 2, n.y - 9, 0.8, 0.8, true); ctx.beginPath(); ctx.arc(n.x + lw / 2 + 2, n.y - 9, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#e879f9'; ctx.fill(); }
      if (!play) R.draw(R.text('SOON', '600 7px Orbitron, Inter, sans-serif', 'rgba(255,255,255,0.4)', null, 0), n.x, n.y + 19);
    }
    // nuvens da frente passando pela borda da ilha
    for (const c of this.clouds) if (c.front) this.cloud(ctx, c, t, 0.07);
    // Nexy e a Echo
    const bob = this.walk ? Math.abs(Math.sin(this.phase * 12)) * 2 : 0, hop = Math.sin(this.hop * Math.PI) * 14;
    R.draw(R.glow('m', 24), this.x, this.y - 14 - hop, 0.9, 0.5, true);
    ctx.save(); ctx.translate(this.x, this.y - 2 - bob - hop); ctx.scale(0.62 * this.facing, 0.62);
    const of = P.facing, og = P.onGround, ow = P.walkPhase; P.facing = 1; P.onGround = !this.hop; P.walkPhase = this.walk ? this.phase * 9 : 0.6; P.poseSpeed = this.walk ? 1 : 0;
    P.drawBody(ctx, t); P.facing = of; P.onGround = og; P.walkPhase = ow; P.poseSpeed = null;
    ctx.restore();
    const e = this.echo;
    R.draw(R.glow('m', 16), e.x, e.y, 0.8, 0.7, true);
    ctx.beginPath(); ctx.arc(e.x, e.y, 4.5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(e.x, e.y, 1.8, 0, Math.PI * 2); ctx.fillStyle = '#e879f9'; ctx.fill();
  },
};
