
/* ============================== O VISUAL DA NEXY: uma boneca articulada que evolui ==============================
   A Nexy é desenhado em código sobre um esqueleto (quadril, tronco, pescoço, cabeça, braços, pernas, cauda e
   cachecol). Cada estágio põe camadas por cima do mesmo esqueleto: rascunho de neon → tinta → equipamento →
   núcleo → elmo → fênix (a forma final, a da arte de referência). A caixa de colisão nunca muda: orelhas, cauda,
   cachecol e asas são só desenho, então a física e as fases continuam iguais.
   Para não pesar, cada quadro de animação é desenhado uma única vez, com o brilho de neon embutido, numa tela
   guardada em memória (NexyLook.sprite); o jogo só carimba a imagem pronta, como os sprites dos jogos antigos.
   Este arquivo não depende do resto do jogo: a folha de evolução (tools/look_sheet.js) usa o mesmo código. */
const NEXY_STAGES = [
  { id: 'sketch', name: 'SKETCH', pt: 'Rascunho', from: '1-1', note: 'Linhas de neon ainda se desenhando, sem armadura: o capuz de gato, o cachecol e a cauda de cabo.' },
  { id: 'ink', name: 'INK', pt: 'Tinta', from: '1-2', note: 'As linhas viram corpo: traje escuro com circuitos que acendem.' },
  { id: 'gear', name: 'GEAR', pt: 'Equipamento', from: '1-3', note: 'Manoplas com garras de luz e botas blindadas.' },
  { id: 'core', name: 'CORE', pt: 'Núcleo', from: 'FORTRESS', note: 'Peitoral com o núcleo, ombreiras de penas e a cauda de placas.' },
  { id: 'helm', name: 'HELM', pt: 'Elmo', from: 'CASTLE', note: 'Elmo com orelhas de gato, gema na testa, fones e a lâmina de luz nas costas.' },
  { id: 'phoenix', name: 'PHOENIX', pt: 'Fênix', from: 'FINAL', note: 'Asas de penas de fogo e a chama na cauda: a forma final.' },
];

const NexyLook = {
  stage: 0, cache: new Map(), cacheMax: 260,
  // no jogo: o estágio sobe com as fases concluídas (cleared = Save.data.cleared). Cada estágio aparece na fase seguinte.
  stageFor(cleared = {}) { return cleared.castle ? 5 : cleared.fortress ? 4 : cleared['1-3'] ? 3 : cleared['1-2'] ? 2 : cleared['1-1'] ? 1 : 0; },
  C: {
    mag: '#d946ef', magHi: '#f0abfc', magMid: '#e879f9', cy: '#22d3ee', cyHi: '#a5f3fc',
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
    // cachecol: duas fitas presas no pescoço, voando para trás com a velocidade
    const scarf = [0, 1].map(k => {
      const pts = [{ x: neck.x - 2.6, y: neck.y + 1.6 + k * 0.5 }];
      const fly = Math.min(1.6, mv + run * 0.8 + (gr ? 0 : 0.7));
      for (let j = 1; j <= 6; j++) {
        const q = pts[j - 1], w = Math.sin(p.t * 7 - j * 0.85 + k * 1.7) * j * 0.3 * (0.35 + fly);
        pts.push({ x: q.x - (0.9 + fly * 1.15) * (k ? 0.85 : 1), y: q.y + (1.3 - fly * 0.6) + w * 0.4 + (p.air < 0 ? 0.5 : 0) });
      }
      return pts;
    });
    const ear = Math.max(0, Math.sin(p.t * 1.3) - 0.92) * 9;   // uma tremidinha de orelha de vez em quando
    return { hip, chest, neck, head, legs, arms, tail, scarf, ear, mv, run, gr, cr, br };
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

  /* ---------- o desenho, camada por camada ---------- */
  paint(ctx, p, stage, k = 1) {
    const C = this.C, R0 = this.rig(p), S = stage;
    this.gk = k * 0.5;   // brilho: unidades do jogo → pixels da tela
    const st = {
      sketch: S === 0, boilSeed: 1 + (p.boil || 0) * 131,
      fill: S === 0 ? 'rgba(10,6,16,0.35)' : C.ink, line: S === 0 ? 'rgba(240,171,252,0.9)' : C.mag, lw: S === 0 ? 0.95 : 1.25,
    };
    const far = { line: S === 0 ? 'rgba(232,121,249,0.55)' : 'rgba(217,70,239,0.6)', fill: S === 0 ? 'rgba(10,6,16,0.45)' : C.ink2 };
    ctx.save();
    ctx.shadowColor = S === 0 ? 'rgba(232,121,249,0.55)' : 'rgba(217,70,239,0.85)';
    ctx.shadowBlur = (1.2 + S * 0.3) * k;
    if (S === 0) this.guides(ctx, R0, p);
    if (S >= 5) this.wings(ctx, R0, p, 1, k);
    if (S < 5) this.scarf(ctx, R0, p, st, S);
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
  scarf(ctx, R0, p, st, S) {
    const C = this.C;
    R0.scarf.forEach((pts, k) => {
      const w = [2.8, 2.6, 2.3, 2, 1.6, 1.1, 0.5];
      const L = pts.map((q, i) => ({ x: q.x, y: q.y - w[i] / 2 })), Rr = pts.map((q, i) => ({ x: q.x, y: q.y + w[i] / 2 })).reverse();
      const fill = S === 0 ? 'rgba(217,70,239,0.18)' : k ? '#8b1f9e' : '#c026d3';
      this.shape(ctx, st, a => { this.smooth(ctx, L.map(q => this.j(q, a)), false); for (const q of Rr) ctx.lineTo(q.x + (a ? this.rnd() * a : 0), q.y); ctx.closePath(); },
        { fill, line: k ? 'rgba(232,121,249,0.6)' : st.line, lw: 0.9, k: 10 + k });
    });
  },
  tail(ctx, R0, p, st, S, k) {
    const C = this.C, T = R0.tail, n = T.length;
    const w = i => (S >= 3 ? 2.6 : 1.9) * (1 - i / n * 0.55);
    // corpo da cauda: uma fita afinando ao longo da curva
    const side = s => T.map((q, i) => { const a = T[Math.min(n - 1, i + 1)], b = T[Math.max(0, i - 1)], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1; return { x: q.x - dy / d * w(i) / 2 * s, y: q.y + dx / d * w(i) / 2 * s }; });
    const A = side(1), B = side(-1).reverse();
    this.shape(ctx, st, a => { this.smooth(ctx, A.map(q => this.j(q, a)), false); for (const q of B) ctx.lineTo(q.x, q.y); ctx.closePath(); }, { k: 20, fill: S === 0 ? 'rgba(10,6,16,0.4)' : C.ink2 });
    if (S >= 3) {   // placas: anéis ao longo da cauda, com juntas acesas
      ctx.save(); ctx.shadowBlur = 1.5 * this.gk; ctx.strokeStyle = C.magHi; ctx.lineWidth = 0.6;
      for (let i = 1; i < n - 1; i += 1) { ctx.beginPath(); ctx.moveTo(A[i].x, A[i].y); ctx.lineTo(B[n - 1 - i].x, B[n - 1 - i].y); ctx.stroke(); }
      ctx.restore();
    } else if (S >= 1) {   // circuito ao longo do cabo
      ctx.save(); ctx.shadowColor = 'rgba(34,211,238,0.8)'; ctx.strokeStyle = 'rgba(34,211,238,0.75)'; ctx.lineWidth = 0.5; ctx.beginPath(); this.smooth(ctx, T.slice(1, n - 1), false); ctx.stroke(); ctx.restore();
    }
    const tip = T[n - 1], pre = T[n - 2], ang = Math.atan2(tip.y - pre.y, tip.x - pre.x);
    if (S >= 5) this.flame(ctx, tip.x, tip.y, ang, 7.5 + Math.sin(p.t * 9) * 0.8, p, k);
    else {   // a faísca da ponta (vira chama na forma final)
      ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(ang);
      ctx.shadowColor = 'rgba(34,211,238,0.9)'; ctx.shadowBlur = 2 * this.gk;
      ctx.beginPath(); ctx.moveTo(3.2, 0); ctx.lineTo(0, 1.5); ctx.lineTo(-1.6, 0); ctx.lineTo(0, -1.5); ctx.closePath();
      ctx.fillStyle = S === 0 ? 'rgba(34,211,238,0.35)' : C.cy; ctx.fill(); ctx.strokeStyle = C.cyHi; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();
    }
  },
  leg(ctx, R0, L, st, S, far, k) {
    const C = this.C, hip = { x: R0.hip.x + (k ? -1.2 : 0.8), y: R0.hip.y }, o = far || {};
    this.shape(ctx, st, a => this.smooth(ctx, this.limbPts(hip, L.knee, 4.4, 3.4).map(q => this.j(q, a)), true), { k: 30 + k, line: o.line, fill: o.fill });
    this.shape(ctx, st, a => this.smooth(ctx, this.limbPts(L.knee, L.foot, 3.4, 2.5).map(q => this.j(q, a)), true), { k: 32 + k, line: o.line, fill: o.fill });
    // pé: tênis no começo, bota blindada a partir do equipamento
    const f = L.foot, c = Math.cos(L.tilt), s = Math.sin(L.tilt), P = (x, y) => ({ x: f.x + x * c - y * s, y: f.y + x * s + y * c });
    const boot = S >= 2;
    const pts = boot ? [P(-2.6, -3.8), P(1.2, -3.2), P(5.4, -1.2), P(5.6, 0.4), P(-2.8, 0.4)] : [P(-2.3, -2.4), P(1.4, -2.6), P(4.6, -0.9), P(4.6, 0.3), P(-2.4, 0.3)];
    this.shape(ctx, st, a => this.smooth(ctx, pts.map(q => this.j(q, a)), true), { k: 34 + k, line: o.line, fill: boot ? C.ink3 : o.fill });
    if (boot) {
      // canela blindada (placa angular) e a junta redonda do joelho
      const sh = this.limbPts(L.knee, f, 4.4, 3.6);
      this.shape(ctx, st, a => this.poly(ctx, [sh[0], sh[1], sh[3], sh[4]].map(q => this.j(q, a))), { k: 36 + k, line: o.line || C.mag, fill: C.ink3 });
      ctx.save(); ctx.shadowColor = 'rgba(34,211,238,0.9)'; ctx.shadowBlur = 3 * this.gk;
      ctx.beginPath(); ctx.arc(L.knee.x, L.knee.y, 1.9, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); ctx.strokeStyle = far ? 'rgba(34,211,238,0.5)' : C.cy; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.beginPath(); ctx.arc(L.knee.x, L.knee.y, 0.7, 0, Math.PI * 2); ctx.fillStyle = far ? 'rgba(240,171,252,0.5)' : C.magHi; ctx.fill();
      ctx.restore();
    } else if (S >= 1) {
      ctx.save(); ctx.shadowBlur = 0; ctx.strokeStyle = far ? 'rgba(34,211,238,0.35)' : 'rgba(34,211,238,0.7)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(L.knee.x, L.knee.y); ctx.lineTo(L.knee.x + (f.x - L.knee.x) * 0.7, L.knee.y + (f.y - L.knee.y) * 0.7); ctx.stroke(); ctx.restore();
    }
  },
  torso(ctx, R0, st, S, p) {
    const C = this.C, { hip, chest, neck } = R0;
    const pts = [
      { x: neck.x - 2.5, y: neck.y + 0.6 }, { x: chest.x - 4.4, y: chest.y + 1.8 }, { x: hip.x - 4, y: hip.y - 3.6 }, { x: hip.x - 4.6, y: hip.y + 1.8 },
      { x: hip.x + 4.4, y: hip.y + 1.8 }, { x: hip.x + 3.8, y: hip.y - 3.4 }, { x: chest.x + 4.4, y: chest.y + 2.4 }, { x: neck.x + 2.1, y: neck.y + 0.8 },
    ];
    this.shape(ctx, st, a => this.smooth(ctx, pts.map(q => this.j(q, a)), true), { k: 40 });
    ctx.save(); ctx.shadowColor = 'rgba(34,211,238,0.9)'; ctx.shadowBlur = 3 * this.gk;
    if (S <= 2) {
      // capuz-moletom: zíper e o lugar do futuro núcleo (um círculo ciano)
      ctx.strokeStyle = S === 0 ? 'rgba(34,211,238,0.55)' : 'rgba(34,211,238,0.85)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(neck.x + 1.6, neck.y + 1.4); ctx.quadraticCurveTo(chest.x + 3.4, chest.y + 7, hip.x + 3.2, hip.y + 1.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(chest.x + 1.8, chest.y + 4.6, 1.5, 0, Math.PI * 2); ctx.stroke();
      if (S >= 1) {   // circuitos do traje
        ctx.strokeStyle = 'rgba(217,70,239,0.6)'; ctx.beginPath();
        ctx.moveTo(chest.x - 3.2, chest.y + 3); ctx.lineTo(chest.x - 1, chest.y + 5.2); ctx.lineTo(chest.x - 1, hip.y - 2); ctx.lineTo(hip.x + 0.6, hip.y + 0.4); ctx.stroke();
      }
    }
    // cinto
    ctx.strokeStyle = S === 0 ? 'rgba(232,121,249,0.5)' : C.magHi; ctx.lineWidth = 0.7; ctx.shadowColor = 'rgba(217,70,239,0.9)';
    ctx.beginPath(); ctx.moveTo(hip.x - 4.2, hip.y - 0.6); ctx.lineTo(hip.x + 4, hip.y - 0.4); ctx.stroke();
    ctx.restore();
    if (S >= 3) {
      // peitoral angular com o núcleo (a gema que pulsa)
      const plate = [{ x: chest.x - 3.6, y: chest.y + 0.6 }, { x: chest.x + 4.8, y: chest.y + 1.6 }, { x: chest.x + 4.6, y: chest.y + 8.2 }, { x: chest.x + 1, y: chest.y + 10.6 }, { x: chest.x - 3.2, y: chest.y + 8.4 }];
      this.shape(ctx, st, a => this.poly(ctx, plate), { k: 42, fill: C.ink3 });
      ctx.save(); ctx.strokeStyle = 'rgba(240,171,252,0.7)'; ctx.lineWidth = 0.5; ctx.beginPath();
      ctx.moveTo(chest.x - 2.4, chest.y + 3); ctx.lineTo(chest.x + 0.4, chest.y + 3.4); ctx.moveTo(chest.x - 2.2, chest.y + 7.2); ctx.lineTo(chest.x + 0.2, chest.y + 8.8); ctx.stroke(); ctx.restore();
      const gx = chest.x + 2.4, gy = chest.y + 5.2, pulse = 0.75 + 0.25 * Math.sin(p.t * 4);
      this.glowDot(ctx, gx, gy, 6, 'rgba(240,80,200,A)', 0.55 * pulse);
      ctx.save(); ctx.beginPath(); ctx.moveTo(gx, gy - 2.6); ctx.lineTo(gx + 2, gy); ctx.lineTo(gx, gy + 2.6); ctx.lineTo(gx - 2, gy); ctx.closePath();
      const g = ctx.createLinearGradient(gx, gy - 2.6, gx, gy + 2.6); g.addColorStop(0, '#fff'); g.addColorStop(0.4, C.magHi); g.addColorStop(1, '#ff3d8b');
      ctx.fillStyle = g; ctx.shadowColor = 'rgba(255,61,139,1)'; ctx.shadowBlur = 5 * this.gk; ctx.fill(); ctx.restore();
    }
  },
  arm(ctx, R0, A, st, S, far, p) {
    const C = this.C, o = far || {}, i = far ? 1 : 0;
    this.shape(ctx, st, a => this.smooth(ctx, this.limbPts(A.sh, A.elbow, 3.4, 2.7).map(q => this.j(q, a)), true), { k: 50 + i, line: o.line, fill: o.fill });
    this.shape(ctx, st, a => this.smooth(ctx, this.limbPts(A.elbow, A.hand, 2.7, 2.3).map(q => this.j(q, a)), true), { k: 52 + i, line: o.line, fill: o.fill });
    const h = A.hand, dx = h.x - A.elbow.x, dy = h.y - A.elbow.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    if (S >= 2) {
      // manopla: placa que alarga no punho + três garras de luz
      const g = this.limbPts({ x: A.elbow.x + ux * 1.2, y: A.elbow.y + uy * 1.2 }, h, 3.2, 4.6);
      this.shape(ctx, st, a => this.poly(ctx, [g[0], g[1], g[3], g[4]]), { k: 54 + i, fill: C.ink3, line: o.line || C.mag });
      ctx.save(); ctx.strokeStyle = far ? 'rgba(240,171,252,0.45)' : C.magHi; ctx.lineWidth = 0.7; ctx.shadowColor = 'rgba(217,70,239,1)'; ctx.shadowBlur = 3 * this.gk;
      for (let c = -1; c <= 1; c++) {
        const bx = h.x + ux * 1.4 - uy * c * 1.1, by = h.y + uy * 1.4 + ux * c * 1.1;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + ux * 1.8, by + uy * 1.8, bx + ux * 2.4 + uy * 0.8, by + uy * 2.4 - ux * 0.8); ctx.stroke();
      }
      ctx.strokeStyle = far ? 'rgba(34,211,238,0.45)' : C.cy; ctx.shadowColor = 'rgba(34,211,238,1)';
      ctx.beginPath(); ctx.moveTo(g[1].x, g[1].y); ctx.lineTo(g[3].x, g[3].y); ctx.stroke();
      ctx.restore();
    } else {
      this.shape(ctx, st, a => { const q = this.j(h, a); ctx.arc(q.x + ux * 0.6, q.y + uy * 0.6, 1.5, 0, Math.PI * 2); }, { k: 56 + i, line: o.line, fill: o.fill });
    }
    if (S >= 3 && !far) {
      // ombreira com três penas (anunciam as asas da forma final)
      const s0 = A.sh;
      ctx.save(); ctx.shadowColor = 'rgba(217,70,239,0.9)'; ctx.shadowBlur = 3 * this.gk;
      [[-6.6, -6.4], [-8.4, -3.6], [-8.6, -0.6]].forEach(([fx, fy], n) => {
        ctx.beginPath(); ctx.moveTo(s0.x - 0.5, s0.y - 1.4); ctx.quadraticCurveTo(s0.x + fx * 0.4 + 1.2, s0.y + fy * 0.6 - 1, s0.x + fx, s0.y + fy);
        ctx.quadraticCurveTo(s0.x + fx * 0.55, s0.y + fy * 0.3 + 1.2, s0.x - 1, s0.y + 0.6); ctx.closePath();
        ctx.fillStyle = n === 0 ? '#c026d3' : '#9d1fb5'; ctx.fill(); ctx.strokeStyle = C.magHi; ctx.lineWidth = 0.5; ctx.stroke();
      });
      ctx.beginPath(); ctx.ellipse(s0.x + 0.3, s0.y - 0.2, 3.4, 2.7, -0.3, 0, Math.PI * 2); ctx.fillStyle = C.ink3; ctx.fill(); ctx.strokeStyle = C.mag; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.restore();
    }
  },
  headDraw(ctx, R0, p, st, S, k) {
    const C = this.C, h = R0.head, helm = S >= 4, ear = R0.ear, P = (x, y) => ({ x: h.x + x, y: h.y + y });
    // orelhas de gato (do capuz e, depois, do elmo): a de trás primeiro, mais escura
    const earPts = (dx, tip, lean) => helm
      ? [P(-5 + dx, -4.6), P(-4.8 + dx - lean, -15.4 - tip), P(0.2 + dx, -7.6)]
      : [P(-5.2 + dx, -4.4), P(-4.4 + dx - lean, -13.8 - tip), P(-0.4 + dx, -7)];
    const farEar = earPts(-2.3, -0.5, 1.3 + ear * 0.2), nearEar = earPts(0.4, 0, 0.5 + ear * 0.3);
    const earShape = (pts, o) => this.shape(ctx, st, a => helm ? this.poly(ctx, pts.map(q => this.j(q, a)))
      : this.smooth(ctx, [pts[0], { x: (pts[0].x + pts[1].x) / 2 - 0.7, y: (pts[0].y + pts[1].y) / 2 }, pts[1], { x: (pts[1].x + pts[2].x) / 2 + 0.5, y: (pts[1].y + pts[2].y) / 2 }, pts[2]].map(q => this.j(q, a)), true), o);
    earShape(farEar, { k: 60, line: 'rgba(217,70,239,0.55)', fill: S === 0 ? 'rgba(10,6,16,0.4)' : C.ink2 });
    // o rosto de perfil: testa, nariz, boca e queixo (um menino, não um gato: os traços de gato são do capuz)
    const face = [P(1.4, -6.6), P(4.8, -4.9), P(5.8, -2.6), P(6.1, -1), P(7.3, 0.7), P(6.2, 1.5), P(6.5, 2.4), P(6, 3), P(6.2, 3.6), P(5.5, 5), P(3.6, 6.4), P(0.6, 6.1), P(-1.6, 2.6), P(-1.6, -3.4)];
    this.shape(ctx, st, a => this.smooth(ctx, face.map(q => this.j(q, a)), true), { k: 61, fill: S === 0 ? 'rgba(24,12,30,0.5)' : '#170f20', lw: 0.85 });
    if (!helm) {
      // capuz com orelhas: envolve a nuca e emoldura o rosto
      const hood = [P(4.7, -6.1), P(1, -8.5), P(-4.6, -7.1), P(-7.7, -2), P(-7.5, 3.4), P(-4.8, 7.5), P(-1.2, 8.7), P(1.7, 7.7), P(0.7, 5.2), P(0.1, 1), P(1.1, -3.6)];
      this.shape(ctx, st, a => this.smooth(ctx, hood.map(q => this.j(q, a)), true), { k: 62 });
      // franja espetada saindo do capuz
      const bang = [P(0.8, -5.4), P(6.6, -2.7), P(4.3, -3.5), P(5, -1.6), P(2.9, -3), P(2.4, -1.3), P(0.9, -2.8)];
      this.shape(ctx, st, a => this.poly(ctx, bang.map(q => this.j(q, a))), { k: 64, fill: S === 0 ? 'rgba(217,70,239,0.22)' : '#2b1638', lw: 0.75 });
    } else {
      // elmo: cúpula com orelhas, aba sobre os olhos, protetor do queixo, fone e a gema da testa
      const dome = [P(6.6, -3), P(5, -6.9), P(0, -8.9), P(-5.6, -6.7), P(-7.9, -1), P(-6.9, 4.6), P(-3.6, 7.9), P(-0.4, 7.7), P(0.6, 3.6), P(1.8, -0.9), P(3.9, -2.7)];
      this.shape(ctx, st, a => this.poly(ctx, dome), { k: 62, fill: '#1a1226' });
      ctx.save(); ctx.shadowBlur = 0; ctx.strokeStyle = C.magHi; ctx.lineWidth = 0.55; ctx.beginPath();
      ctx.moveTo(h.x - 6.6, h.y - 3.8); ctx.quadraticCurveTo(h.x - 1.2, h.y - 7.6, h.x + 5, h.y - 4.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(h.x - 6.2, h.y + 3.2); ctx.lineTo(h.x - 1.6, h.y + 6.2); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.shadowColor = 'rgba(34,211,238,1)'; ctx.shadowBlur = 2 * this.gk;
      ctx.beginPath(); ctx.arc(h.x - 3.2, h.y + 0.8, 2.7, 0, Math.PI * 2); ctx.fillStyle = C.ink3; ctx.fill(); ctx.strokeStyle = C.cy; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(h.x - 3.2, h.y + 0.8, 1, 0, Math.PI * 2); ctx.fillStyle = C.cyHi; ctx.fill();
      ctx.shadowColor = 'rgba(255,61,180,1)'; ctx.shadowBlur = 3 * this.gk;
      ctx.beginPath(); ctx.moveTo(h.x + 3.6, h.y - 7); ctx.lineTo(h.x + 6.4, h.y - 4.7); ctx.lineTo(h.x + 3.3, h.y - 3.9); ctx.closePath();
      ctx.fillStyle = C.magHi; ctx.fill();
      ctx.restore();
    }
    // o olho: oval de luz magenta com brilho branco (o ponto mais vivo do personagem)
    const ex = h.x + 4.1, ey = h.y + 0.2, sq = R0.run * 0.5 + (p.arm === 'slash' ? 0.5 : 0);
    this.glowDot(ctx, ex, ey, 4.5, 'rgba(240,120,250,A)', S === 0 ? 0.3 : 0.5);
    ctx.save(); ctx.shadowColor = 'rgba(240,171,252,1)'; ctx.shadowBlur = 2.2 * this.gk;
    ctx.beginPath(); ctx.ellipse(ex, ey + sq * 0.3, 1.05, 1.5 - sq * 0.45, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = S === 0 ? 'rgba(240,171,252,0.85)' : C.magHi; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 0.35, ey - 0.45, 0.42, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = S === 0 ? 'rgba(232,121,249,0.8)' : '#fff'; ctx.lineWidth = 0.55;   // a linha dos cílios: o olhar decidido
    ctx.beginPath(); ctx.moveTo(ex - 1.3, ey - 1.1 + sq * 0.3); ctx.lineTo(ex + 1.6, ey - 1.9 + sq * 0.4); ctx.stroke();
    ctx.restore();
    earShape(nearEar, { k: 66, fill: helm ? '#1a1226' : undefined });
    // interior da orelha aceso
    ctx.save(); ctx.shadowColor = 'rgba(217,70,239,1)'; ctx.shadowBlur = 1.5 * this.gk; ctx.strokeStyle = helm ? C.magHi : 'rgba(240,171,252,0.6)'; ctx.lineWidth = helm ? 0.8 : 0.55;
    const e0 = nearEar[0], e1 = nearEar[1], e2 = nearEar[2];
    ctx.beginPath(); ctx.moveTo(e0.x + (e2.x - e0.x) * 0.3, e0.y + (e2.y - e0.y) * 0.3 - 0.6); ctx.lineTo(e1.x + 0.5, e1.y + 2.6); ctx.lineTo(e0.x + (e2.x - e0.x) * 0.72, e0.y + (e2.y - e0.y) * 0.72 - 0.6); ctx.stroke();
    ctx.restore();
    if (S >= 4) {   // o cabo da lâmina de luz nas costas
      const c0 = R0.chest;
      ctx.save(); ctx.translate(c0.x - 4.4, c0.y + 3.6); ctx.rotate(-0.9);
      ctx.fillStyle = C.ink3; ctx.strokeStyle = C.mag; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.rect(-1, -7, 2, 9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.cy; ctx.fillRect(-1, -7.6, 2, 1); ctx.restore();
    }
  },
  // asas de fênix: leque de penas que vão do magenta ao fogo (abrem no pulo, batem devagar no chão)
  wings(ctx, R0, p, which, k) {
    const C = this.C, c0 = R0.chest, base = { x: c0.x - 3.2 + (which ? -1.5 : 0), y: c0.y + 1.6 + (which ? -0.5 : 0) };
    const spread = p.air ? (p.air < 0 ? 1.25 : 1.1) : 0.85 + R0.run * 0.15;
    const n = 7, a0 = -2.15 - (which ? 0.12 : 0);
    ctx.save(); ctx.globalAlpha *= which ? 0.6 : 1; ctx.shadowColor = 'rgba(255,90,160,0.9)'; ctx.shadowBlur = 6 * this.gk;
    for (let i = n - 1; i >= 0; i--) {
      const u = i / (n - 1), ang = a0 - (u - 0.35) * 1.15 * spread + Math.sin(p.t * 3.2 + i * 0.6) * 0.05;
      const len = (15 + Math.sin(u * Math.PI) * 13 + (which ? -3 : 0)) * (0.85 + spread * 0.15), wd = 2.6 + Math.sin(u * Math.PI) * 1.4;
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, bend = 0.18;
      const tip = { x: base.x + dx * len - nx * len * bend, y: base.y + dy * len - ny * len * bend };
      ctx.beginPath(); ctx.moveTo(base.x + nx * 0.8, base.y + ny * 0.8);
      ctx.quadraticCurveTo(base.x + dx * len * 0.55 + nx * wd, base.y + dy * len * 0.55 + ny * wd, tip.x, tip.y);
      ctx.quadraticCurveTo(base.x + dx * len * 0.5 - nx * wd * 0.6, base.y + dy * len * 0.5 - ny * wd * 0.6, base.x - nx * 0.8, base.y - ny * 0.8);
      const g = ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
      g.addColorStop(0, C.fire[0]); g.addColorStop(0.45, C.fire[1]); g.addColorStop(0.75, C.fire[2]); g.addColorStop(0.92, C.fire[3]); g.addColorStop(1, C.fire[4]);
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,230,240,0.55)'; ctx.lineWidth = 0.4; ctx.stroke();
      // a nervura da pena
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.quadraticCurveTo(base.x + dx * len * 0.5, base.y + dy * len * 0.5, tip.x, tip.y); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
    }
    // brasas que se soltam das pontas
    this.seed(Math.floor(p.t * 8) + which * 50);
    for (let i = 0; i < 6; i++) {
      const u = (this.rnd() + 0.5), ang = a0 - (u - 0.35) * 1.15 * spread, len = 22 + this.rnd() * 14 + ((p.t * 8) % 1) * 6;
      const x = base.x + Math.cos(ang) * len, y = base.y + Math.sin(ang) * len - ((p.t * 8) % 1) * 3;
      ctx.fillStyle = i % 2 ? C.fire[3] : C.fire[1]; ctx.fillRect(x, y, 0.9, 0.9);
    }
    ctx.restore();
  },
  // chama: três línguas de fogo (ponta da cauda da fênix)
  flame(ctx, x, y, ang, len, p, k) {
    const C = this.C;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.shadowColor = 'rgba(255,140,60,1)'; ctx.shadowBlur = 6 * this.gk;
    [[1, 0, 1], [0.75, -1.6, 0.7], [0.7, 1.6, 0.75]].forEach(([s, off, w], i) => {
      const L = len * s, wob = Math.sin(p.t * 11 + i * 2) * 0.9;
      ctx.beginPath(); ctx.moveTo(0, -1.6 * w); ctx.quadraticCurveTo(L * 0.5, off - 2.6 * w + wob, L, off + wob); ctx.quadraticCurveTo(L * 0.45, off + 2.4 * w + wob, 0, 1.6 * w); ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, C.fire[1]); g.addColorStop(0.5, C.fire[2]); g.addColorStop(1, C.fire[4]);
      ctx.fillStyle = g; ctx.globalAlpha = i ? 0.8 : 1; ctx.fill();
    });
    ctx.restore();
  },
  // a lâmina de luz (golpe): chama violeta-magenta saindo da mão
  blade(ctx, R0, p, k) {
    const A = R0.arms[0], h = A.hand, ang = -0.5;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang); ctx.shadowColor = 'rgba(217,70,239,1)'; ctx.shadowBlur = 8 * this.gk;
    ctx.fillStyle = this.C.ink3; ctx.fillRect(-1.6, -1.2, 4.4, 2.4);
    const L = 24;
    ctx.beginPath(); ctx.moveTo(2.6, -1.4);
    for (let i = 1; i <= 6; i++) ctx.lineTo(2.6 + L * i / 6, -1.4 - Math.sin(i * 1.7 + p.t * 14) * 1.2 - i * 0.15);
    ctx.lineTo(2.6 + L + 3, 0);
    for (let i = 6; i >= 1; i--) ctx.lineTo(2.6 + L * i / 6, 1.6 + Math.sin(i * 2.3 + p.t * 13) * 1);
    ctx.closePath();
    const g = ctx.createLinearGradient(2.6, 0, L, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, '#f0abfc'); g.addColorStop(1, 'rgba(168,85,247,0.6)');
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
  // tela pronta para a pose (k = pixels por unidade do jogo: escala da tela × tamanho da Nexy)
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
  // carimba a Nexy com os pés em (0,0) do contexto atual (já transladado e espelhado por quem chama)
  draw(ctx, p, stage, k) {
    const c = this.sprite(p, stage, k);
    ctx.drawImage(c, -this.OX, -this.OY, this.W, this.H);
  },
};
