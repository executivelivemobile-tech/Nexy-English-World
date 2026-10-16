
/* ============================== O VISUAL DO NEXY: um boneco articulado que evolui ==============================
   O Nexy é desenhado em código sobre um esqueleto (quadril, tronco, pescoço, cabeça, braços, pernas e cauda),
   fiel à arte de referência do dono (armadura roxa estilo robô, elmo de gato, asas de fênix). Cada estágio põe camadas por cima do mesmo esqueleto: rascunho de neon → tinta → equipamento →
   núcleo → elmo → fênix (a forma final, a da arte de referência). A caixa de colisão nunca muda: orelhas, cauda
   e asas são só desenho, então a física e as fases continuam iguais.
   Para não pesar, cada quadro de animação é desenhado uma única vez, com o brilho de neon embutido, numa tela
   guardada em memória (NexyLook.sprite); o jogo só carimba a imagem pronta, como os sprites dos jogos antigos.
   Este arquivo não depende do resto do jogo: a folha de evolução (tools/look_sheet.js) usa o mesmo código. */
const NEXY_STAGES = [
  { id: 'sketch', name: 'SKETCH', pt: 'Rascunho', from: '1-1', note: 'Linhas de neon ainda se desenhando, sem armadura: o capuz com orelhas de gato, a cauda de cabo e o lugar do futuro núcleo.' },
  { id: 'ink', name: 'INK', pt: 'Tinta', from: '1-2', note: 'As linhas viram corpo: traje roxo com circuitos em V que acendem.' },
  { id: 'gear', name: 'GEAR', pt: 'Equipamento', from: '1-3', note: 'Botas grandes de metal com joelheira e gema, manoplas com penas e garras.' },
  { id: 'core', name: 'CORE', pt: 'Núcleo', from: 'FORTRESS', note: 'Peitoral com o núcleo triangular, ombreiras de penas, cinto de placas e a cauda segmentada.' },
  { id: 'helm', name: 'HELM', pt: 'Elmo', from: 'CASTLE', note: 'Elmo de metal com orelhas de gato, aba em V, fone, gema na testa e a lâmina de luz nas costas.' },
  { id: 'phoenix', name: 'PHOENIX', pt: 'Fênix', from: 'FINAL', note: 'Asas de fênix, a chama na cauda e o núcleo em brasa: a forma final.' },
];

const NexyLook = {
  stage: 0, cache: new Map(), cacheMax: 260,
  // no jogo: o estágio sobe com as fases concluídas (cleared = Save.data.cleared). Cada estágio aparece na fase seguinte.
  stageFor(cleared = {}) { return cleared.castle ? 5 : cleared.fortress ? 4 : cleared['1-3'] ? 3 : cleared['1-2'] ? 2 : cleared['1-1'] ? 1 : 0; },
  C: {
    mag: '#d946ef', magHi: '#f0abfc', magMid: '#e879f9', cy: '#22d3ee', cyHi: '#a5f3fc',
    neon: '#ff3fd8', neonHi: '#ffb8f2', plum: '#24133a', plumDk: '#160b26', edge: '#e63bd2',   // o neon e o traje roxo da arte de referência
    ink: '#07060b', ink2: '#110c17', ink3: '#1b1324', white: '#ffffff',
    fire: ['#d946ef', '#ff4fa3', '#ff7a45', '#ffb347', '#fff1c4'],   // só na forma final (o fogo da fênix)
  },

  /* ---------- esqueleto: a pose vira posições das juntas (pés na origem, de frente para a direita) ----------
     pose: { t, phase (ciclo da passada), speed (0 parado, 1 andando, 1.6 correndo), air (0 chão, -1 subindo, 1 caindo),
             crouch, arm ('idle' | 'hold' | 'kick' | 'reach' | 'slash'), boil (0..2, o tremido do rascunho) } */
  rig(p) {
    const mv = Math.min(1, p.speed || 0), run = Math.min(1, Math.max(0, ((p.speed || 0) - 1) / 0.6)), gr = !p.air;
    const br = Math.sin(p.t * 2.4) * (1 - mv) * (gr ? 1 : 0);        // respiração parado
    const bob = gr ? -Math.abs(Math.cos(p.phase)) * (0.8 + run * 0.9) * mv : 0;
    const cr = p.crouch ? 1 : 0;
    const lean = gr ? mv * 1.1 + run * 2.4 : (p.air < 0 ? 1.4 : 0.3);
    const hip = { x: 0, y: -18.6 + bob + cr * 7.2 };
    const chest = { x: lean - cr * 0.6, y: -30.4 + bob + cr * 9.6 + br * 0.35 };
    const neck = { x: chest.x * 1.1 + 0.5, y: chest.y - 2.4 };
    const head = { x: chest.x * 1.15 + 1.2, y: neck.y - 6.8 + br * 0.2 };
    const legs = [0, 1].map(i => {
      const u = p.phase + (i ? Math.PI : 0);
      let f;
      if (cr) f = { x: i ? -4.2 : 4.6, y: 0 };
      else if (!gr) f = p.air < 0 ? { x: i ? -3.2 : 5, y: i ? -2.5 : -7 } : { x: i ? -3 : 3.4, y: i ? -0.5 : -2.6 };
      else if (mv < 0.05) f = { x: i ? -2.3 : 2.7, y: 0 };
      else { const st = 3.6 + run * 3.6; f = { x: Math.sin(u) * st, y: -Math.max(0, Math.cos(u)) * (2 + run * 2.8) }; }
      const knee = this.ik(hip, f, 9.8, 9.2, 1);
      const foot = this.reach(knee, f, 9.2);
      const tilt = gr ? (mv > 0.05 ? -Math.max(0, Math.cos(u)) * 0.35 * mv : 0) : (p.air < 0 ? -0.4 : 0.25);
      return { knee, foot, tilt };
    });
    const sh = [{ x: chest.x + 0.6, y: chest.y + 1.3 }, { x: chest.x - 1.4, y: chest.y + 1 }];
    const arms = [0, 1].map(i => {
      const s0 = sh[i], u = p.phase + (i ? 0 : Math.PI);
      let h;
      if (p.arm === 'hold' || p.arm === 'kick') h = { x: s0.x + (i ? 8.6 : 10.2), y: s0.y + (i ? 4.6 : 3.2) };
      else if (p.arm === 'reach' && !i) h = { x: s0.x + 12.4, y: s0.y - 0.6 };
      else if (p.arm === 'slash' && !i) h = { x: s0.x + 9.6, y: s0.y - 5.5 };
      else if (cr) h = { x: s0.x + (i ? 3.5 : 5.5), y: s0.y + 7.4 };
      else if (!gr) h = p.air < 0 ? (i ? { x: s0.x - 6, y: s0.y + 7 } : { x: s0.x + 6.4, y: s0.y - 5.5 }) : (i ? { x: s0.x - 5.5, y: s0.y + 3 } : { x: s0.x + 6.8, y: s0.y + 1.5 });
      else if (mv < 0.05) h = { x: s0.x + (i ? -1 : 1.6), y: s0.y + 12.4 + br * 0.4 };
      else { const sw = Math.sin(u) * (4 + run * 4.8); h = { x: s0.x + sw + run * 1.5, y: s0.y + 12.2 - run * 3.2 - Math.abs(sw) * 0.25 }; }
      const elbow = this.ik(s0, h, 7, 6.6, -1);
      return { sh: s0, elbow, hand: this.reach(elbow, h, 6.6) };
    });
    // cauda: sai das costas para trás e enrola para cima; balança com o tempo e se estica correndo
    const tail = [{ x: hip.x - 4.1, y: hip.y + 0.6 }];
    let a = Math.PI - 1.05 + run * 0.55 + (gr ? 0 : -0.3 * p.air);
    const curl = 0.25 - run * 0.1;
    for (let j = 1; j <= 9; j++) {
      a += curl + Math.sin(p.t * 2.6 - j * 0.6) * 0.07 * (0.6 + mv);
      const q = tail[j - 1]; tail.push({ x: q.x + Math.cos(a) * 2.2, y: q.y + Math.sin(a) * 2.2 });
    }
    const ear = Math.max(0, Math.sin(p.t * 1.3) - 0.92) * 9;   // uma tremidinha de orelha de vez em quando
    return { hip, chest, neck, head, legs, arms, tail, ear, mv, run, gr, cr, br };
  },
  // dois ossos (coxa e canela, braço e antebraço): onde fica o joelho/cotovelo
  ik(a, b, l1, l2, dir) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(0.01, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.02));
    const ang = Math.atan2(dy, dx), c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const off = Math.acos(Math.max(-1, Math.min(1, c))) * dir;
    return { x: a.x + Math.cos(ang - off) * l1, y: a.y + Math.sin(ang - off) * l1 };
  },
  reach(from, to, len) { const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1; return { x: from.x + dx / d * len, y: from.y + dy / d * len }; },

  /* ---------- traço ---------- */
  // pseudoaleatório com semente (o tremido do rascunho muda 3 vezes por segundo, como um desenho animado à mão)
  seed(n) { this.s = (n * 9301 + 49297) % 233280 || 1; },
  rnd() { this.s = (this.s * 9301 + 49297) % 233280; return this.s / 233280 - 0.5; },
  j(pt, amt) { return amt ? { x: pt.x + this.rnd() * amt, y: pt.y + this.rnd() * amt } : pt; },
  // curva suave fechada ou aberta passando pelos pontos (Catmull-Rom)
  smooth(ctx, pts, closed) {
    const n = pts.length; if (n < 2) return;
    const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
    }
    if (closed) ctx.closePath();
  },
  poly(ctx, pts) { ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); },
  // membro afinando: contorno de a até b com larguras w0 → w1 (pontas arredondadas)
  limbPts(a, b, w0, w1) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, ux = dx / d, uy = dy / d;
    return [
      { x: a.x + nx * w0 / 2, y: a.y + ny * w0 / 2 }, { x: b.x + nx * w1 / 2, y: b.y + ny * w1 / 2 },
      { x: b.x + ux * w1 * 0.45, y: b.y + uy * w1 * 0.45 },
      { x: b.x - nx * w1 / 2, y: b.y - ny * w1 / 2 }, { x: a.x - nx * w0 / 2, y: a.y - ny * w0 / 2 },
      { x: a.x - ux * w0 * 0.45, y: a.y - uy * w0 * 0.45 },
    ];
  },
  // preenche e contorna; no rascunho, o contorno sai duas vezes, levemente desalinhado (traço de lápis de neon)
  shape(ctx, st, build, o = {}) {
    const sk = st.sketch, fill = o.fill === undefined ? st.fill : o.fill, line = o.line || st.line, lw = (o.lw || 1) * st.lw;
    if (fill) { const b = ctx.shadowBlur; ctx.shadowBlur = 0; this.seed(st.boilSeed + (o.k || 0)); ctx.beginPath(); build(0); ctx.fillStyle = fill; ctx.fill(); ctx.shadowBlur = b; }
    if (line === 'none') return;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    this.seed(st.boilSeed + (o.k || 0)); ctx.beginPath(); build(sk ? 0.55 : 0); ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.globalAlpha *= o.alpha || 1; ctx.stroke();
    if (sk) { this.seed(st.boilSeed + 77 + (o.k || 0)); ctx.beginPath(); build(0.9); ctx.globalAlpha *= 0.4; ctx.lineWidth = lw * 0.7; ctx.stroke(); ctx.globalAlpha /= 0.4; }
    ctx.globalAlpha /= o.alpha || 1;
  },
  glowDot(ctx, x, y, r, color, a = 1) {
    ctx.save(); ctx.shadowBlur = 0;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', a)); g.addColorStop(1, color.replace('A', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  /* ---------- o desenho, camada por camada (fiel à arte de referência: armadura roxa estilo robô, elmo de gato,
     núcleo no peito, ombreiras de penas, manoplas com garras, botas grandes, cauda de placas, asas de fênix) ---------- */
  paint(ctx, p, stage, k = 1) {
    const C = this.C, R0 = this.rig(p), S = stage, small = k < 3;   // small = no tamanho do jogo (na folha ele aparece grande)
    this.gk = k * 0.5;   // brilho: unidades do jogo → pixels da tela
    const st = {
      sketch: S === 0, boilSeed: 1 + (p.boil || 0) * 131,
      fill: S === 0 ? 'rgba(12,6,20,0.45)' : C.plum, line: S === 0 ? 'rgba(244,190,255,0.95)' : small ? C.neon : C.edge, lw: S === 0 ? 1.05 : small ? 1.05 : 0.72,
    };
    const far = { line: S === 0 ? 'rgba(232,121,249,0.55)' : 'rgba(190,40,170,0.6)', fill: S === 0 ? 'rgba(12,6,20,0.5)' : C.plumDk, far: true };
    ctx.save();
    // o contorno brilha pouco (o metal tem que aparecer); o rascunho, feito só de luz, brilha mais
    ctx.shadowColor = S === 0 ? 'rgba(232,121,249,0.6)' : 'rgba(255,63,216,0.7)';
    ctx.shadowBlur = (S === 0 ? 1.3 : small ? 1.1 : 0.55) * k;   // pequeno, o contorno precisa de mais luz para se ler no escuro
    if (S === 0) this.guides(ctx, R0, p);
    if (S >= 5) this.wings(ctx, R0, p, 1, k);
    this.tail(ctx, R0, p, st, S, k);
    this.arm(ctx, R0, R0.arms[1], st, S, far, p);
    this.leg(ctx, R0, R0.legs[1], st, S, far, 1);
    this.torso(ctx, R0, st, S, p);
    this.leg(ctx, R0, R0.legs[0], st, S, null, 0);
    if (S >= 5) this.wings(ctx, R0, p, 0, k);
    this.headDraw(ctx, R0, p, st, S, k);
    this.arm(ctx, R0, R0.arms[0], st, S, null, p);
    if (p.arm === 'slash' && S >= 4) this.blade(ctx, R0, p, k);
    ctx.restore();
  },
  // linhas de construção do desenhista (só no rascunho): círculo da cabeça, eixo do corpo, juntas
  guides(ctx, R0, p) {
    ctx.save(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(34,211,238,0.32)'; ctx.lineWidth = 0.45; ctx.setLineDash([1.2, 1.6]);
    ctx.beginPath(); ctx.arc(R0.head.x, R0.head.y, 9.4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(R0.head.x, R0.head.y + 9.4); ctx.lineTo(R0.chest.x, R0.chest.y); ctx.lineTo(R0.hip.x, R0.hip.y); ctx.stroke();
    ctx.setLineDash([]);
    for (const q of [R0.hip, R0.legs[0].knee, R0.arms[0].sh, R0.arms[0].elbow]) { ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-9, 0.4); ctx.lineTo(9, 0.4); ctx.stroke();
    ctx.restore();
  },
  /* ---------- materiais ---------- */
  // metal roxo da armadura: luz de cima e da frente, sombra embaixo (o volume da arte de referência)
  metal(ctx, a, b, far) {
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    if (far) { g.addColorStop(0, '#5f4385'); g.addColorStop(0.5, '#2b1942'); g.addColorStop(1, '#120a1f'); }
    else { g.addColorStop(0, '#c2a6ea'); g.addColorStop(0.2, '#7a53a6'); g.addColorStop(0.58, '#382257'); g.addColorStop(1, '#170c28'); }
    return g;
  },
  // o reflexo do metal: um traço claro na borda de cima de cada peça
  shine(ctx, pts, a = 0.8, w = 0.5) {
    ctx.save(); ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(240,226,255,${a})`; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); ctx.restore();
  },
  // linha de neon (os circuitos que correm pela armadura)
  neon(ctx, pts, color, w = 0.6, blur = 2.5) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur * this.gk; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); ctx.restore();
  },
  // gema (joelho, testa, fone): rosa-choque; na forma final, brasa
  gem(ctx, x, y, r, S, shape = 'round') {
    const fire = S >= 5;
    this.glowDot(ctx, x, y, r * 3, fire ? 'rgba(255,120,60,A)' : 'rgba(255,60,200,A)', 0.5);
    ctx.save(); ctx.shadowColor = fire ? 'rgba(255,120,60,1)' : 'rgba(255,60,200,1)'; ctx.shadowBlur = 3 * this.gk;
    ctx.beginPath();
    if (shape === 'diamond') { ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.3); ctx.lineTo(x - r, y); ctx.closePath(); }
    else ctx.arc(x, y, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, fire ? '#ffc46b' : '#ff9ff0'); g.addColorStop(1, fire ? '#ff4a2a' : '#e0189f');
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
  },
  // pena de metal/fogo: lâmina curva de a até a ponta (ombreiras, manoplas)
  feather(ctx, a, tip, wd, S, far) {
    const dx = tip.x - a.x, dy = tip.y - a.y, nx = -dy, ny = dx, m = { x: a.x + dx * 0.5 + nx * 0.12, y: a.y + dy * 0.5 + ny * 0.12 }, d = Math.hypot(dx, dy) || 1;
    ctx.beginPath(); ctx.moveTo(a.x + nx / d * wd * 0.5, a.y + ny / d * wd * 0.5);
    ctx.quadraticCurveTo(m.x + nx / d * wd, m.y + ny / d * wd, tip.x, tip.y);
    ctx.quadraticCurveTo(m.x - nx / d * wd * 0.3, m.y - ny / d * wd * 0.3, a.x - nx / d * wd * 0.5, a.y - ny / d * wd * 0.5); ctx.closePath();
    const g = ctx.createLinearGradient(a.x, a.y, tip.x, tip.y);
    if (S >= 5) { g.addColorStop(0, '#c026d3'); g.addColorStop(0.5, '#ff4fa3'); g.addColorStop(1, '#ffb347'); }
    else { g.addColorStop(0, far ? '#5b1f70' : '#8e1fab'); g.addColorStop(1, far ? '#a33fbf' : '#f05ad8'); }
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = far ? 'rgba(240,171,252,0.4)' : 'rgba(255,214,250,0.85)'; ctx.lineWidth = 0.4; ctx.stroke();
  },

  /* ---------- as peças ---------- */
  // cauda: cabo fino no começo; placas de metal com juntas acesas a partir do núcleo; chama na ponta na forma final
  tail(ctx, R0, p, st, S, k) {
    const C = this.C, T = R0.tail, n = T.length, plated = S >= 3;
    const w = i => (plated ? 3.4 : 1.9) * (1 - i / n * 0.5);
    const side = s => T.map((q, i) => { const a = T[Math.min(n - 1, i + 1)], b = T[Math.max(0, i - 1)], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1; return { x: q.x - dy / d * w(i) / 2 * s, y: q.y + dx / d * w(i) / 2 * s }; });
    const A = side(1), B = side(-1);
    if (plated) {
      // uma placa por gomo, cada uma com o próprio brilho (cauda segmentada da referência)
      for (let i = 0; i < n - 1; i++) {
        const q = [A[i], A[i + 1], B[i + 1], B[i]];
        this.shape(ctx, st, () => this.poly(ctx, q), { k: 20 + i, fill: this.metal(ctx, A[i], B[i + 1]), line: C.neon, lw: 0.6 });
        this.shine(ctx, [A[i], A[i + 1]], 0.55, 0.35);
      }
      ctx.save(); ctx.shadowColor = 'rgba(255,63,216,1)'; ctx.shadowBlur = 2 * this.gk; ctx.strokeStyle = C.neonHi; ctx.lineWidth = 0.45;
      for (let i = 1; i < n - 1; i++) { ctx.beginPath(); ctx.moveTo(A[i].x, A[i].y); ctx.lineTo(B[i].x, B[i].y); ctx.stroke(); }
      ctx.restore();
    } else {
      const Br = B.slice().reverse();
      this.shape(ctx, st, a => { this.smooth(ctx, A.map(q => this.j(q, a)), false); for (const q of Br) ctx.lineTo(q.x, q.y); ctx.closePath(); }, { k: 20, fill: S === 0 ? 'rgba(12,6,20,0.45)' : C.plumDk });
      if (S >= 1) { ctx.save(); ctx.shadowColor = 'rgba(34,211,238,0.8)'; ctx.strokeStyle = 'rgba(34,211,238,0.75)'; ctx.lineWidth = 0.5; ctx.beginPath(); this.smooth(ctx, T.slice(1, n - 1), false); ctx.stroke(); ctx.restore(); }
    }
    const tip = T[n - 1], pre = T[n - 2], ang = Math.atan2(tip.y - pre.y, tip.x - pre.x);
    if (S >= 5) this.flame(ctx, tip.x, tip.y, ang, 12 + Math.sin(p.t * 9) * 1.2, p, k);
    else {   // a faísca da ponta (vira chama na forma final)
      ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(ang);
      ctx.shadowColor = 'rgba(255,63,216,0.9)'; ctx.shadowBlur = 2.5 * this.gk;
      ctx.beginPath(); ctx.moveTo(3.6, 0); ctx.lineTo(0, 1.7); ctx.lineTo(-1.6, 0); ctx.lineTo(0, -1.7); ctx.closePath();
      ctx.fillStyle = S === 0 ? 'rgba(255,63,216,0.35)' : '#ff6fe0'; ctx.fill(); ctx.strokeStyle = C.neonHi; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();
    }
  },
  // perna: traje no começo; bota grande blindada (estilo robô) com joelheira e gema a partir do equipamento
  leg(ctx, R0, L, st, S, far, k) {
    const C = this.C, hip = { x: R0.hip.x + (k ? -1.4 : 1), y: R0.hip.y }, o = far || {}, f = L.foot;
    const ux = f.x - L.knee.x, uy = f.y - L.knee.y, d = Math.hypot(ux, uy) || 1, u = { x: ux / d, y: uy / d };
    this.shape(ctx, st, a => this.smooth(ctx, this.limbPts(hip, L.knee, 5, 4.2).map(q => this.j(q, a)), true), { k: 30 + k, line: o.line, fill: o.fill });
    const c = Math.cos(L.tilt), s = Math.sin(L.tilt), P = (x, y) => ({ x: f.x + x * c - y * s, y: f.y + x * s + y * c });
    if (S < 2) {
      this.shape(ctx, st, a => this.smooth(ctx, this.limbPts(L.knee, f, 4.2, 3.4).map(q => this.j(q, a)), true), { k: 32 + k, line: o.line, fill: o.fill });
      const shoe = [P(-2.6, -2.8), P(1.6, -3), P(5.2, -1.1), P(5.2, 0.4), P(-2.8, 0.4)];
      this.shape(ctx, st, a => this.smooth(ctx, shoe.map(q => this.j(q, a)), true), { k: 34 + k, line: o.line, fill: o.fill });
      if (S >= 1) this.neon(ctx, [{ x: hip.x + 1.6, y: hip.y + 1 }, { x: L.knee.x + 1.6, y: L.knee.y }, { x: L.knee.x + u.x * 7 + 1.2, y: L.knee.y + u.y * 7 }], far ? 'rgba(255,63,216,0.35)' : 'rgba(255,63,216,0.75)', 0.5);
      return;
    }
    // canela larga até o joelho e um bico de bota grande (a silhueta "robô" da referência)
    const top = { x: L.knee.x + u.x * 1.4, y: L.knee.y + u.y * 1.4 }, low = { x: f.x - u.x * 2.6, y: f.y - u.y * 2.6 };
    const sh = this.limbPts(top, low, 6.6, 7.8), quad = [sh[0], sh[1], sh[3], sh[4]];
    this.shape(ctx, st, () => this.poly(ctx, quad), { k: 36 + k, line: o.line || C.neon, fill: this.metal(ctx, { x: top.x + 4, y: top.y - 2 }, { x: low.x - 4, y: low.y + 2 }, !!far) });
    const toe = [P(-4, -4.8), P(1.8, -5.2), P(6.6, -2.8), P(7.8, -0.5), P(7.2, 0.5), P(-4.1, 0.5)];
    this.shape(ctx, st, () => this.smooth(ctx, toe, true), { k: 38 + k, line: o.line || C.neon, fill: this.metal(ctx, P(2, -5.6), P(0, 0.6), !!far) });
    if (!far) {
      this.shine(ctx, [P(1.6, -4.6), P(5.8, -2.6)], 0.8);
      this.shine(ctx, [{ x: (sh[3].x * 0.8 + sh[0].x * 0.2), y: (sh[3].y * 0.8 + sh[0].y * 0.2) }, { x: (sh[1].x * 0.2 + sh[3].x * 0.8) + u.x * 0, y: (sh[1].y * 0.2 + sh[3].y * 0.8) }], 0.55, 0.4);
      // circuito neon descendo pela canela e a sola acesa
      const mid0 = { x: (quad[0].x + quad[3].x) / 2, y: (quad[0].y + quad[3].y) / 2 }, mid1 = { x: (quad[1].x + quad[2].x) / 2, y: (quad[1].y + quad[2].y) / 2 };
      this.neon(ctx, [{ x: mid0.x + 1.2, y: mid0.y + 1 }, { x: mid1.x + 1.6, y: mid1.y - 0.6 }, P(4.8, -1.4)], C.neon, 0.55);
      this.neon(ctx, [P(-3.8, 0.3), P(7, 0.3)], 'rgba(255,63,216,0.9)', 0.6);
    }
    // joelheira redonda com a gema
    const kx = L.knee.x + u.x * 0.4, ky = L.knee.y + u.y * 0.4;
    this.shape(ctx, st, () => { ctx.ellipse(kx + 0.4, ky, 3.4, 3, 0, 0, Math.PI * 2); }, { k: 39 + k, line: o.line || C.neon, fill: this.metal(ctx, { x: kx + 2, y: ky - 3 }, { x: kx - 2, y: ky + 3 }, !!far) });
    if (!far) this.gem(ctx, kx + 0.6, ky, 1.15, S);
  },
  // tronco: traje com circuitos em V; peitoral blindado com o núcleo triangular a partir do núcleo
  torso(ctx, R0, st, S, p) {
    const C = this.C, { hip, chest, neck } = R0;
    const pts = [
      { x: neck.x - 2.4, y: neck.y + 0.4 }, { x: chest.x - 5.4, y: chest.y + 1.2 }, { x: chest.x - 4.4, y: chest.y + 6.4 }, { x: hip.x - 3.4, y: hip.y - 3.4 }, { x: hip.x - 4.8, y: hip.y + 2 },
      { x: hip.x + 4.6, y: hip.y + 2 }, { x: hip.x + 3.4, y: hip.y - 3.2 }, { x: chest.x + 4.6, y: chest.y + 6.4 }, { x: chest.x + 5.6, y: chest.y + 1.6 }, { x: neck.x + 2.2, y: neck.y + 0.6 },
    ];
    this.shape(ctx, st, a => this.smooth(ctx, pts.map(q => this.j(q, a)), true), { k: 40 });
    const cx = chest.x + 0.6;
    if (S === 0) {   // rascunho: o lugar do futuro núcleo, tracejado
      ctx.save(); ctx.shadowBlur = 0; ctx.setLineDash([0.8, 0.9]); ctx.strokeStyle = 'rgba(34,211,238,0.7)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - 2.4, chest.y + 3); ctx.lineTo(cx + 2.4, chest.y + 3); ctx.lineTo(cx, chest.y + 6.6); ctx.closePath(); ctx.stroke(); ctx.restore();
    } else if (S < 3) {   // traje: circuitos em V como os da armadura final
      this.neon(ctx, [{ x: chest.x - 4.6, y: chest.y + 1.8 }, { x: cx, y: chest.y + 7.4 }, { x: chest.x + 5, y: chest.y + 2.2 }], 'rgba(255,63,216,0.85)', 0.6);
      this.neon(ctx, [{ x: cx, y: chest.y + 7.4 }, { x: hip.x + 0.4, y: hip.y - 1.2 }], 'rgba(255,63,216,0.6)', 0.5);
      ctx.save(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(34,211,238,0.8)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - 1.8, chest.y + 3.2); ctx.lineTo(cx + 1.8, chest.y + 3.2); ctx.lineTo(cx, chest.y + 5.8); ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    // cinto: linha; com a armadura, uma placa com a gema no meio
    if (S >= 3) {
      const belt = [{ x: hip.x - 4.8, y: hip.y - 1.8 }, { x: hip.x + 4.8, y: hip.y - 1.6 }, { x: hip.x + 4.4, y: hip.y + 1.4 }, { x: hip.x + 0.6, y: hip.y + 3.4 }, { x: hip.x - 4.4, y: hip.y + 1.4 }];
      this.shape(ctx, st, () => this.poly(ctx, belt), { k: 41, fill: this.metal(ctx, belt[0], belt[3]), lw: 0.8 });
      this.shine(ctx, [belt[0], belt[1]], 0.6, 0.4);
      this.gem(ctx, hip.x + 0.4, hip.y + 0.4, 0.9, S, 'diamond');
    } else this.neon(ctx, [{ x: hip.x - 4.4, y: hip.y - 0.6 }, { x: hip.x + 4.2, y: hip.y - 0.4 }], S === 0 ? 'rgba(232,121,249,0.5)' : C.neonHi, 0.7);
    if (S >= 3) {
      // peitoral: placa larga em V com o núcleo triangular (como na referência)
      const plate = [{ x: chest.x - 6, y: chest.y + 0.2 }, { x: chest.x - 1.4, y: chest.y - 1.4 }, { x: chest.x + 3.4, y: chest.y - 1.2 }, { x: chest.x + 6.4, y: chest.y + 0.8 },
        { x: chest.x + 5.8, y: chest.y + 6.6 }, { x: cx, y: chest.y + 11 }, { x: chest.x - 4.8, y: chest.y + 7 }];
      this.shape(ctx, st, () => this.poly(ctx, plate), { k: 42, fill: this.metal(ctx, { x: chest.x + 2, y: chest.y - 2 }, { x: chest.x - 2, y: chest.y + 11 }), lw: 0.9 });
      this.shine(ctx, [plate[1], plate[2], plate[3]], 0.85, 0.55);
      this.neon(ctx, [{ x: chest.x - 4.8, y: chest.y + 1.8 }, { x: cx, y: chest.y + 8.6 }, { x: chest.x + 5.4, y: chest.y + 2.2 }], C.neon, 0.6);
      this.neon(ctx, [{ x: chest.x - 3, y: chest.y + 0.6 }, { x: cx - 1, y: chest.y + 3 }], 'rgba(255,170,240,0.8)', 0.4, 1);
      // abdômen em placas
      ctx.save(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(200,170,240,0.5)'; ctx.lineWidth = 0.45;
      for (const dy of [12.2, 14.4]) { ctx.beginPath(); ctx.moveTo(chest.x - 2.4, chest.y + dy); ctx.lineTo(chest.x + 3.6, chest.y + dy + 0.2); ctx.stroke(); }
      ctx.restore();
      // o núcleo: triângulo aceso apontando para baixo (rosa-choque; brasa na forma final)
      const gy = chest.y + 3.6, pulse = 0.75 + 0.25 * Math.sin(p.t * 4), fire = S >= 5;
      this.glowDot(ctx, cx, gy + 1, 7, fire ? 'rgba(255,110,60,A)' : 'rgba(255,60,190,A)', 0.55 * pulse);
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx - 2.9, gy - 0.8); ctx.lineTo(cx + 2.9, gy - 0.8); ctx.lineTo(cx, gy + 3.4); ctx.closePath();
      const g = ctx.createLinearGradient(cx, gy - 0.8, cx, gy + 3.4); g.addColorStop(0, '#fff'); g.addColorStop(0.35, fire ? '#ffb347' : '#ff9ff0'); g.addColorStop(1, fire ? '#ff3d2a' : '#e0189f');
      ctx.fillStyle = g; ctx.shadowColor = fire ? 'rgba(255,90,40,1)' : 'rgba(255,40,170,1)'; ctx.shadowBlur = 5 * this.gk; ctx.fill(); ctx.restore();
    }
  },
  // braço: traje; manopla grossa com penas e garras a partir do equipamento; ombreira de penas a partir do núcleo
  arm(ctx, R0, A, st, S, far, p) {
    const C = this.C, o = far || {}, i = far ? 1 : 0;
    if (S >= 3 && far) this.pauldron(ctx, A.sh, st, S, true);
    this.shape(ctx, st, a => this.smooth(ctx, this.limbPts(A.sh, A.elbow, 3.8, 3.2).map(q => this.j(q, a)), true), { k: 50 + i, line: o.line, fill: o.fill });
    const h = A.hand, dx = h.x - A.elbow.x, dy = h.y - A.elbow.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    if (S < 2) {
      this.shape(ctx, st, a => this.smooth(ctx, this.limbPts(A.elbow, h, 3.2, 2.8).map(q => this.j(q, a)), true), { k: 52 + i, line: o.line, fill: o.fill });
      this.shape(ctx, st, a => { const q = this.j(h, a); ctx.arc(q.x + ux * 0.6, q.y + uy * 0.6, 1.8, 0, Math.PI * 2); }, { k: 56 + i, line: o.line, fill: o.fill });
      if (S >= 1 && !far) this.neon(ctx, [{ x: A.elbow.x + ux, y: A.elbow.y + uy }, { x: h.x - ux * 1.2, y: h.y - uy * 1.2 }], 'rgba(34,211,238,0.75)', 0.45);
    } else {
      // manopla: antebraço grosso de metal, punho aceso, penas de metal e garras (a mão da referência)
      const g0 = { x: A.elbow.x + ux * 0.2, y: A.elbow.y + uy * 0.2 }, g = this.limbPts(g0, h, 5, 6.4);
      for (let j = 0; j < 3; j++) {   // penas do antebraço, apontando para o cotovelo (atrás da manopla)
        const t = 0.35 + j * 0.22, b = { x: g0.x + dx * t + nx * 2.4, y: g0.y + dy * t + ny * 2.4 };
        this.feather(ctx, b, { x: b.x - ux * 4.6 + nx * 2.6, y: b.y - uy * 4.6 + ny * 2.6 }, 1.8, S, far);
      }
      this.shape(ctx, st, () => this.poly(ctx, [g[0], g[1], g[3], g[4]]), { k: 54 + i, fill: this.metal(ctx, { x: g0.x + nx * 3, y: g0.y + ny * 3 }, { x: h.x - nx * 3, y: h.y - ny * 3 }, far), line: o.line || C.neon });
      if (!far) { this.shine(ctx, [g[0], { x: (g[0].x + g[1].x) / 2, y: (g[0].y + g[1].y) / 2 }], 0.7, 0.45); this.neon(ctx, [g[1], g[3]], C.neonHi, 0.7); }
      // a mão com quatro garras longas e curvas
      ctx.save(); ctx.shadowColor = 'rgba(255,63,216,1)'; ctx.shadowBlur = 2.5 * this.gk;
      ctx.beginPath(); ctx.arc(h.x + ux * 1.2, h.y + uy * 1.2, 2.2, 0, Math.PI * 2); ctx.fillStyle = far ? '#1b0f2b' : '#2a1840'; ctx.fill(); ctx.strokeStyle = o.line || C.neon; ctx.lineWidth = 0.6; ctx.stroke();
      for (let c = -1.5; c <= 1.5; c += 1) {
        const bx = h.x + ux * 2.4 + nx * c * 1.1, by = h.y + uy * 2.4 + ny * c * 1.1, ex = bx + ux * 3.6 + nx * (c * 0.4 - 1.2), ey = by + uy * 3.6 + ny * (c * 0.4 - 1.2);
        ctx.beginPath(); ctx.moveTo(bx + nx * 0.5, by + ny * 0.5); ctx.quadraticCurveTo(bx + ux * 2.6 + nx * 0.4, by + uy * 2.6 + ny * 0.4, ex, ey); ctx.lineTo(bx - nx * 0.5, by - ny * 0.5); ctx.closePath();
        ctx.fillStyle = far ? '#3a2456' : '#5b3a80'; ctx.fill(); ctx.strokeStyle = far ? 'rgba(255,120,230,0.5)' : (S >= 5 ? '#ffb347' : C.neonHi); ctx.lineWidth = 0.4; ctx.stroke();
      }
      ctx.restore();
    }
    if (S >= 3 && !far) this.pauldron(ctx, A.sh, st, S, false);
  },
  // ombreira redonda com penas (anuncia as asas da forma final)
  pauldron(ctx, s0, st, S, far) {
    const C = this.C;
    ctx.save(); ctx.shadowColor = 'rgba(255,63,216,0.9)'; ctx.shadowBlur = 3 * this.gk;
    [[-7.4, -8.6, 2.4], [-9.6, -5.4, 2.2], [-9.8, -2, 1.9]].forEach(([fx, fy, w]) => this.feather(ctx, { x: s0.x - 0.8, y: s0.y - 1.4 }, { x: s0.x + fx, y: s0.y + fy }, w, S, far));
    ctx.restore();
    this.shape(ctx, st, () => { ctx.ellipse(s0.x + 0.4, s0.y - 0.4, 4.6, 3.8, -0.25, 0, Math.PI * 2); }, { k: 58 + (far ? 1 : 0), line: far ? 'rgba(217,70,239,0.55)' : C.neon, fill: this.metal(ctx, { x: s0.x + 2, y: s0.y - 4 }, { x: s0.x - 2, y: s0.y + 3.6 }, far) });
    if (!far) { this.shine(ctx, [{ x: s0.x - 2.4, y: s0.y - 3 }, { x: s0.x + 2.6, y: s0.y - 3.6 }], 0.85, 0.5); this.neon(ctx, [{ x: s0.x - 3.2, y: s0.y + 0.6 }, { x: s0.x + 4, y: s0.y - 0.6 }], C.neon, 0.5); }
  },
  headDraw(ctx, R0, p, st, S, k) {
    const C = this.C, h = R0.head, helm = S >= 4, ear = R0.ear, P = (x, y) => ({ x: h.x + x, y: h.y + y });
    // orelhas de gato: no capuz são de pano; no elmo, de metal altas e pontudas (como na referência)
    const earPts = (dx, tip, lean) => helm
      ? [P(-5.8 + dx, -5.6), P(-4.8 + dx - lean, -18.2 - tip), P(0.6 + dx, -8.6)]
      : [P(-5.2 + dx, -4.4), P(-4.4 + dx - lean, -13.8 - tip), P(-0.4 + dx, -7)];
    const farEar = earPts(-2.4, -0.6, 1.4 + ear * 0.2), nearEar = earPts(0.4, 0, 0.5 + ear * 0.3);
    const earShape = (pts, o) => this.shape(ctx, st, a => helm ? this.poly(ctx, pts.map(q => this.j(q, a)))
      : this.smooth(ctx, [pts[0], { x: (pts[0].x + pts[1].x) / 2 - 0.7, y: (pts[0].y + pts[1].y) / 2 }, pts[1], { x: (pts[1].x + pts[2].x) / 2 + 0.5, y: (pts[1].y + pts[2].y) / 2 }, pts[2]].map(q => this.j(q, a)), true), o);
    const earInner = (pts, a) => {   // o interior da orelha: rosa aceso
      const e0 = pts[0], e1 = pts[1], e2 = pts[2], m0 = { x: e0.x + (e2.x - e0.x) * 0.25, y: e0.y + (e2.y - e0.y) * 0.25 - 0.4 }, m2 = { x: e0.x + (e2.x - e0.x) * 0.75, y: e0.y + (e2.y - e0.y) * 0.75 - 0.4 };
      ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.moveTo(m0.x, m0.y); ctx.lineTo(e1.x + 0.5, e1.y + (helm ? 3.4 : 2.6)); ctx.lineTo(m2.x, m2.y); ctx.closePath();
      const g = ctx.createLinearGradient(e1.x, e1.y, m0.x, m0.y); g.addColorStop(0, '#ff9ff0'); g.addColorStop(1, '#a01d9e');
      ctx.fillStyle = helm ? g : 'rgba(240,120,230,0.35)'; ctx.shadowColor = 'rgba(255,63,216,1)'; ctx.shadowBlur = 1.5 * this.gk; ctx.fill(); ctx.restore();
    };
    earShape(farEar, { k: 60, line: 'rgba(217,70,239,0.55)', fill: helm ? this.metal(ctx, farEar[1], farEar[0], true) : (S === 0 ? 'rgba(12,6,20,0.45)' : C.plumDk) });
    if (helm) earInner(farEar, 0.6);
    // o rosto de perfil: um menino decidido (no elmo, só o queixo e a boca aparecem)
    const face = [P(1.4, -6.6), P(4.8, -4.9), P(5.8, -2.6), P(6.1, -1), P(7.3, 0.7), P(6.2, 1.5), P(6.5, 2.4), P(6, 3), P(6.2, 3.6), P(5.5, 5), P(3.6, 6.4), P(0.6, 6.1), P(-1.6, 2.6), P(-1.6, -3.4)];
    this.shape(ctx, st, a => this.smooth(ctx, face.map(q => this.j(q, a)), true), { k: 61, fill: S === 0 ? 'rgba(24,12,30,0.5)' : '#1d1028', lw: 0.85 });
    if (!helm) {
      const hood = [P(4.7, -6.1), P(1, -8.5), P(-4.6, -7.1), P(-7.7, -2), P(-7.5, 3.4), P(-4.8, 7.5), P(-1.2, 8.7), P(1.7, 7.7), P(0.7, 5.2), P(0.1, 1), P(1.1, -3.6)];
      this.shape(ctx, st, a => this.smooth(ctx, hood.map(q => this.j(q, a)), true), { k: 62, fill: S === 0 ? undefined : C.plum });
      if (S >= 1) this.neon(ctx, [P(4.2, -6.2), P(0.6, -8), P(-4.4, -6.6), P(-7, -2)], 'rgba(255,63,216,0.8)', 0.5);
      const bang = [P(0.8, -5.4), P(6.6, -2.7), P(4.3, -3.5), P(5, -1.6), P(2.9, -3), P(2.4, -1.3), P(0.9, -2.8)];
      this.shape(ctx, st, a => this.poly(ctx, bang.map(q => this.j(q, a))), { k: 64, fill: S === 0 ? 'rgba(217,70,239,0.22)' : '#3a1d52', lw: 0.75 });
    } else {
      // elmo: cúpula de metal, aba em V sobre os olhos, protetor da bochecha, fone redondo e a gema da testa
      const dome = [P(6.4, -3.6), P(4.6, -7.6), P(-0.4, -9.6), P(-6, -7.6), P(-8.4, -1.6), P(-7.8, 4.4), P(-4.6, 8.2), P(-0.6, 8.2), P(0.4, 4), P(1.6, -0.4)];
      this.shape(ctx, st, () => this.smooth(ctx, dome, true), { k: 62, fill: this.metal(ctx, P(3, -9.6), P(-5, 8)) });
      this.shine(ctx, [P(-5.4, -6), P(-1.4, -8.6), P(3.4, -7.6)], 0.9, 0.55);
      this.neon(ctx, [P(-7.4, 0), P(-4.6, 6.4)], C.neon, 0.5);
      const visor = [P(-0.6, -4.8), P(4.4, -5.2), P(7.6, -3.4), P(7.4, -1.6), P(4.6, -2), P(2.2, -0.2), P(0.2, -1.4)];
      this.shape(ctx, st, () => this.poly(ctx, visor), { k: 63, fill: '#120a1c', line: C.neon, lw: 0.75 });
      const cheek = [P(1.2, 1.6), P(4.6, 2.4), P(4.2, 6), P(1.6, 7.6), P(-0.6, 6.6)];
      this.shape(ctx, st, () => this.poly(ctx, cheek), { k: 64, fill: this.metal(ctx, P(4, 1.6), P(0, 7.6)), lw: 0.7 });
      // fone: disco de metal com aro neon e centro aceso
      this.shape(ctx, st, () => { ctx.arc(h.x - 4.2, h.y + 1, 2.3, 0, Math.PI * 2); }, { k: 65, fill: this.metal(ctx, P(-2.6, -1.4), P(-5.8, 3.4)), lw: 0.7 });
      this.gem(ctx, h.x - 4.2, h.y + 1, 0.8, S);
      this.gem(ctx, h.x + 3, h.y - 6.6, 1.25, S, 'diamond');
    }
    // o olho: oval de luz magenta com brilho branco (no elmo, uma fenda acesa debaixo da aba)
    const ex = h.x + 4.1, ey = h.y + (helm ? -0.9 : 0.2), sq = R0.run * 0.5 + (p.arm === 'slash' ? 0.5 : 0) + (helm ? 0.45 : 0);
    this.glowDot(ctx, ex, ey, 4.5, 'rgba(255,120,250,A)', S === 0 ? 0.3 : 0.55);
    ctx.save(); ctx.shadowColor = 'rgba(255,171,252,1)'; ctx.shadowBlur = 2.2 * this.gk;
    ctx.beginPath(); ctx.ellipse(ex, ey + sq * 0.3, 1.1, Math.max(0.45, 1.5 - sq * 0.55), 0.15, 0, Math.PI * 2);
    ctx.fillStyle = S === 0 ? 'rgba(240,171,252,0.85)' : '#ffc6f6'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 0.35, ey - 0.3, 0.4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    if (!helm) { ctx.shadowBlur = 0; ctx.strokeStyle = S === 0 ? 'rgba(232,121,249,0.8)' : '#fff'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(ex - 1.3, ey - 1.1 + sq * 0.3); ctx.lineTo(ex + 1.6, ey - 1.9 + sq * 0.4); ctx.stroke(); }
    ctx.restore();
    earShape(nearEar, { k: 66, fill: helm ? this.metal(ctx, nearEar[1], nearEar[0]) : undefined, line: helm ? C.neon : undefined });
    earInner(nearEar, 1);
    if (helm) this.shine(ctx, [nearEar[0], nearEar[1]], 0.7, 0.4);
    if (S >= 4) {   // o cabo da lâmina de luz nas costas
      const c0 = R0.chest;
      ctx.save(); ctx.translate(c0.x - 4.8, c0.y + 3.6); ctx.rotate(-0.9);
      ctx.fillStyle = this.metal(ctx, { x: -1, y: -7 }, { x: 1, y: 2 }); ctx.strokeStyle = C.neon; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.rect(-1.1, -7.4, 2.2, 9.4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff9ff0'; ctx.fillRect(-1.1, -8, 2.2, 1); ctx.restore();
    }
  },
  // asas de fênix: penas longas que sobem e voltam como chamas (magenta → rosa → laranja → amarelo nas pontas)
  wings(ctx, R0, p, which, k) {
    const C = this.C, c0 = R0.chest, base = { x: c0.x - 3.8 + (which ? -1.6 : 0), y: c0.y + 0.8 + (which ? -0.6 : 0) };
    const spread = p.air ? (p.air < 0 ? 1.15 : 1.05) : 0.95 + R0.run * 0.1;
    ctx.save(); ctx.globalAlpha *= which ? 0.55 : 1; ctx.shadowColor = 'rgba(255,90,170,0.8)'; ctx.shadowBlur = 3 * this.gk;
    const grad = (a, t) => { const g = ctx.createLinearGradient(a.x, a.y, t.x, t.y); g.addColorStop(0, C.fire[0]); g.addColorStop(0.4, C.fire[1]); g.addColorStop(0.7, C.fire[2]); g.addColorStop(0.9, C.fire[3]); g.addColorStop(1, C.fire[4]); return g; };
    // penas compridas: saem das costas, varrem para trás e as pontas sobem (chama ao vento)
    const n = 10, a0 = -2.3 - (which ? 0.08 : 0);
    for (let i = n - 1; i >= 0; i--) {
      const u = i / (n - 1), ang = a0 - u * 1.1 * spread + Math.sin(p.t * 3 + i * 0.7) * 0.04;
      const len = (26 + Math.sin(u * Math.PI * 0.8) * 22) * (which ? 0.85 : 1), wd = 2 + Math.sin(u * Math.PI) * 2.6;
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, curl = 0.2 + u * 0.3;
      // curva em S: a pena desce um pouco ao sair das costas e sobe na ponta, como chama ao vento
      const c1 = { x: base.x + dx * len * 0.35 - nx * len * 0.1, y: base.y + dy * len * 0.35 - ny * len * 0.1 };
      const c2 = { x: base.x + dx * len * 0.72 + nx * len * curl * 0.5, y: base.y + dy * len * 0.72 + ny * len * curl * 0.5 };
      const tip = { x: base.x + dx * len + nx * len * curl, y: base.y + dy * len + ny * len * curl };
      ctx.beginPath(); ctx.moveTo(base.x + nx * 1.2, base.y + ny * 1.2);
      ctx.bezierCurveTo(c1.x + nx * wd, c1.y + ny * wd, c2.x + nx * wd * 0.9, c2.y + ny * wd * 0.9, tip.x, tip.y);
      ctx.bezierCurveTo(c2.x - nx * wd * 0.5, c2.y - ny * wd * 0.5, c1.x - nx * wd * 0.6, c1.y - ny * wd * 0.6, base.x - nx * 1.2, base.y - ny * 1.2);
      ctx.fillStyle = grad(base, tip); ctx.fill(); ctx.strokeStyle = 'rgba(255,225,240,0.45)'; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, tip.x, tip.y); ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
    }
    // penas curtas magenta junto às costas (a "gola" da asa)
    for (let i = 0; i < 6; i++) {
      const ang = a0 - 0.05 - i * 0.2 * spread, len = 9 + i * 0.9, t = { x: base.x + Math.cos(ang) * len, y: base.y + Math.sin(ang) * len - 1 };
      this.feather(ctx, base, t, 2.6, 4, false);
    }
    // brasas que se soltam das pontas
    this.seed(Math.floor(p.t * 8) + which * 50);
    for (let i = 0; i < 9; i++) {
      const u = (this.rnd() + 0.5), ang = a0 - u * 1.1 * spread, len = 36 + this.rnd() * 16 + ((p.t * 8) % 1) * 6;
      const x = base.x + Math.cos(ang) * len, y = base.y + Math.sin(ang) * len - 6 - ((p.t * 8) % 1) * 4;
      ctx.fillStyle = i % 2 ? C.fire[3] : C.fire[1]; ctx.fillRect(x, y, 0.9, 0.9);
    }
    ctx.restore();
  },
  // chama: três línguas de fogo (ponta da cauda da fênix)
  flame(ctx, x, y, ang, len, p, k) {
    const C = this.C;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang - 0.5); ctx.shadowColor = 'rgba(255,140,60,1)'; ctx.shadowBlur = 7 * this.gk;
    [[1, 0, 1.2], [0.8, -2, 0.8], [0.75, 2, 0.85], [0.55, -3.4, 0.6]].forEach(([s, off, w], i) => {
      const L = len * s, wob = Math.sin(p.t * 11 + i * 2) * 1;
      ctx.beginPath(); ctx.moveTo(0, -1.8 * w); ctx.quadraticCurveTo(L * 0.5, off - 3 * w + wob, L, off + wob - L * 0.18); ctx.quadraticCurveTo(L * 0.45, off + 2.6 * w + wob, 0, 1.8 * w); ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, C.fire[1]); g.addColorStop(0.45, C.fire[2]); g.addColorStop(0.8, C.fire[3]); g.addColorStop(1, C.fire[4]);
      ctx.fillStyle = g; ctx.globalAlpha = i ? 0.8 : 1; ctx.fill();
    });
    ctx.restore();
  },
  // a lâmina de luz (golpe): chama violeta-magenta saindo da mão
  blade(ctx, R0, p, k) {
    const A = R0.arms[0], h = A.hand, ang = -0.5;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang); ctx.shadowColor = 'rgba(217,70,239,1)'; ctx.shadowBlur = 8 * this.gk;
    ctx.fillStyle = '#382257'; ctx.fillRect(-1.6, -1.2, 4.4, 2.4);
    const L = 26;
    ctx.beginPath(); ctx.moveTo(2.6, -1.4);
    for (let i = 1; i <= 6; i++) ctx.lineTo(2.6 + L * i / 6, -1.4 - Math.sin(i * 1.7 + p.t * 14) * 1.3 - i * 0.18);
    ctx.lineTo(2.6 + L + 3, 0);
    for (let i = 6; i >= 1; i--) ctx.lineTo(2.6 + L * i / 6, 1.6 + Math.sin(i * 2.3 + p.t * 13) * 1.1);
    ctx.closePath();
    const g = ctx.createLinearGradient(2.6, 0, L, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, '#f0abfc'); g.addColorStop(0.7, '#c56bff'); g.addColorStop(1, 'rgba(168,85,247,0.6)');
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  },

  /* ---------- quadros guardados (o jogo só carimba) ---------- */
  // a pose contínua vira um quadro: 12 por passada, 8 de respiração, 3 de tremido do rascunho
  frame(p) {
    const q = Object.assign({}, p);
    const TAU = Math.PI * 2;
    if (q.air) { q.speed = Math.min(1.6, q.speed || 0); q.phase = 0; q.air = q.air < 0 ? -1 : 1; q.t = Math.floor(q.t * 10) / 10; }
    else if ((q.speed || 0) < 0.05) { q.speed = 0; q.phase = 0; q.t = Math.floor((q.t % (TAU / 2.4)) / (TAU / 2.4) * 8) / 8 * (TAU / 2.4); }
    else { q.phase = Math.floor(((q.phase % TAU) + TAU) % TAU / TAU * 12) / 12 * TAU; q.speed = q.speed > 1.3 ? 1.6 : 1; q.t = Math.floor(q.t * 8) / 8; }
    q.boil = Math.floor(p.t * 3) % 3;
    return q;
  },
  // tela pronta para a pose (k = pixels por unidade do jogo: escala da tela × tamanho do Nexy)
  W: 112, H: 104, OX: 62, OY: 84,
  sprite(p, stage, k) {
    const q = this.frame(p);
    const key = [stage, q.speed, q.phase.toFixed(2), q.air, q.crouch ? 1 : 0, q.arm || 'idle', q.t.toFixed(2), stage === 0 ? q.boil : 0, k.toFixed(2)].join('|');
    let c = this.cache.get(key);
    if (c) return c;
    if (this.cache.size > this.cacheMax) this.cache.clear();
    c = document.createElement('canvas'); c.width = Math.ceil(this.W * k); c.height = Math.ceil(this.H * k);
    const x = c.getContext('2d'); x.setTransform(k, 0, 0, k, this.OX * k, this.OY * k);
    this.paint(x, q, stage, k);
    this.cache.set(key, c);
    return c;
  },
  // carimba o Nexy com os pés em (0,0) do contexto atual (já transladado e espelhado por quem chama)
  draw(ctx, p, stage, k) {
    const c = this.sprite(p, stage, k);
    ctx.drawImage(c, -this.OX, -this.OY, this.W, this.H);
  },
};
