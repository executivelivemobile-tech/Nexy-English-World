
/* ============================== O FORTE DE FERRO · CAN YOU? (as pedras da lei, as armadilhas, os poderes novos) ==============================
   Fort guarda as LEIS da fase (LEVELS.fortress.laws): cada uma vale numa faixa de colunas (zone) e diz se algo PODE
   (can) ou NÃO PODE. A frase certa na pedra troca a lei (Sentence 'law' → Fort.law) e o mundo obedece na hora:
   jump (o pulo da Nexy fica curtinho), stones (os esmagadores), floor (o chão que atravessa o poço), eyes (os olhos de
   ferro), iron (o ferro derretido da torre). As leis ficam como você deixou, mesmo depois de morrer.
   Visual novo: pedra de castelo com tijolos, vitrais coloridos, tochas, engrenagens e um céu com aurora (mais cor:
   âmbar do fogo e violeta, além do magenta e do ciano). Poderes novos: FIRE, HAMMER e CLOCK (FortPower). */
const AMBER = a => `rgba(251,191,36,${a})`, EMBER = a => `rgba(249,115,22,${a})`, VIOLET = a => `rgba(167,139,250,${a})`;
const Fort = {
  laws: {}, freezeT: 0, flags: {},
  reset() { this.laws = {}; this.freezeT = 0; this.flags = {}; FortPower.reset(); Warden.reset(); },
  active() { return !!(World.level && World.level.bg === 'fort'); },
  setup(level) {
    this.laws = {};
    for (const id in level.laws || {}) { const L = level.laws[id]; this.laws[id] = { id, zone: L.zone, can: L.can, text: L.text, shake: 0, glow: 0, write: 0 }; }
  },
  enter(viaTransition) {
    if (Game.noIntro) return;
    if (!Save.data.met.fort) setTimeout(() => { if (Game.state === 'play' && World.level.id === 'fortress' && !Game.scene()) FortIntro.start(); }, viaTransition ? 0 : 50);
    else Game.later(1.2, () => Echo.talk(ECHO.lines.fort));
  },
  inZone(id, x) { const L = this.laws[id]; if (!L) return false; const c = x / TS; return c >= L.zone[0] && c < L.zone[1] + 1; },
  can(id) { const L = this.laws[id]; return !L || L.can; },
  frozen() { return this.freezeT > 0; },
  // o pulo: dentro da zona de YOU CAN'T JUMP (ou na rodada do Guardião que proíbe), ele fica curtinho
  jumpK() {
    if (!this.active()) return 1;
    if (this.laws.jump && !this.laws.jump.can && this.inZone('jump', P.cx)) return 0.42;
    if (Warden.noJump()) return 0.42;
    return 1;
  },
  dark() { return this.active() ? Warden.darkK() : 0; },
  doorOf(law) { for (const id in World.doors) if (World.doors[id].def.law === law) return World.doors[id]; return null; },
  // a frase certa: a pedra reescreve a lei (faíscas, o texto novo queimando) e o mundo obedece
  law(r) {
    const L = this.laws[r.law]; if (!L) return;
    const d = this.doorOf(r.law), x = d ? d.x + 16 : P.cx, y = d ? d.y - 46 : P.cy;
    if (L.can === r.can) { L.shake = 0.8; SFX.thud(); if (Game.echoBorn) Game.later(0.5, () => Echo.talk(ECHO.lines.lawSame)); return; }
    L.can = r.can; L.write = 1; L.glow = 1;
    if (d) this.learn(d.def);
    SFX.law(); Game.shake(5); Game.hitstop(4);
    FX.burst(x, y, 44, 'm', 280, { life: 0.9, g: 260 }); FX.burst(x, y, 22, 'c', 200, { life: 0.6, g: 0 });
    for (let i = 0; i < 18; i++) FX.add(x - 50 + Math.random() * 100, y + (Math.random() - 0.5) * 30, { vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 160, life: 0.7, size: 1.6, c: 'w', g: 500 });
    if (r.law === 'jump' && L.can) { P.squash = -0.4; FX.burst(P.cx, P.y + P.h, 24, 'm', 200, { life: 0.6, g: 0 }); }
    if (!this.flags.law && Game.echoBorn) { this.flags.law = true; Game.later(1.1, () => Echo.talk(ECHO.lines.law)); }
  },
  // as palavras escritas na pedra entram no que a Nexy já viu (contam na fluência) e no Grimório
  learn(def) {
    const toks = def.mold.concat(def.inscription.replace(/[.,?!]/g, ' ').split(/\s+/));
    for (const t of toks) if (WORDS[t]) { if (!Game.wordsSeen.has(t)) { Game.wordsSeen.add(t); Game.learnedOrder.push(t); } Game.grimoireWord(t, def.inscription); }
  },
  shake(id) { const L = this.laws[id]; if (L) L.shake = 1; else if (id === 'warden') Warden.shake(); SFX.thud(); },
  // morreu: o ferro volta para o fundo; as leis ficam
  respawn() { for (const e of Ents.list) if (e.type === 'molten') Ents.types.molten.calm(e); Warden.respawn(); this.freezeT = 0; },
  update(dt) {
    if (!this.active()) return;
    for (const id in this.laws) { const L = this.laws[id]; L.shake = Math.max(0, L.shake - dt * 1.4); L.glow = Math.max(0, L.glow - dt * 0.5); L.write = Math.max(0, L.write - dt * 0.7); }
    if (this.freezeT > 0) { this.freezeT -= dt; if (this.freezeT <= 0) { this.freezeT = 0; SFX.unfreeze(); } }
    // A: a primeira lei cai sobre a Nexy (o pulo fica curtinho)
    const J = this.laws.jump;
    if (J && !J.can && !this.flags.boom && this.inZone('jump', P.cx) && !P.dead) {
      this.flags.boom = true; J.glow = 1; J.shake = 0.6; SFX.impact(); SFX.warDrum(); Game.shake(6);
      if (Game.echoBorn) Game.later(0.9, () => Echo.talk(ECHO.lines.noJump));
    }
    // a Echo avisa (uma vez por partida)
    const c = P.cx / TS;
    if (Game.echoBorn && !Echo.line && !P.dead) {
      if (!this.flags.stones && c > 57 && c < 98 && this.can('stones')) { this.flags.stones = true; Echo.talk(ECHO.lines.stones); }
      else if (!this.flags.eyes && c > 129 && c < 185 && this.can('eyes')) { this.flags.eyes = true; Echo.talk(ECHO.lines.eyes); }
    }
  },
  // o facho pegou a Nexy: os guardas a põem para fora da galeria (sem perder vida)
  caught(e) {
    if (this.seenT > 0 || P.dead) return;
    this.seenT = 1; e.alarm = 1.1; SFX.siren(); Game.shake(3); UI.msg('SEEN!', 1200);
    if (Game.echoBorn && !this.flags.seen) { this.flags.seen = true; Echo.talk(ECHO.lines.seen); }
    Game.later(0.75, () => {
      this.seenT = 0; if (P.dead) return;
      FX.burst(P.cx, P.cy, 30, 'c', 240, { life: 0.6, g: 0 });
      P.x = 124 * TS + 4; P.y = 28 * TS - P.h; P.px = P.x; P.py = P.y; P.vx = 0; P.vy = 0; P.invuln = 0.8; P.dropHeld();
      Cam.snap(); SFX.iris(); FX.burst(P.cx, P.cy, 30, 'm', 220, { life: 0.6, g: 0 });
    });
  },

  /* ---------- a PEDRA DA LEI (pedestal look 'law'): a tábua de ferro mostra a lei de agora, em duas linhas ---------- */
  split(txt) { const i = txt.indexOf(' CAN'); return i > 0 ? [txt.slice(0, i), txt.slice(i + 1)] : ['', txt]; },
  drawStone(ctx, x, y, t, e) {
    const d = World.doors[e.opts.door], L = d && this.laws[d.def.law]; if (!L) return;
    const sh = L.shake > 0 ? Math.sin(t * 70) * 2.2 * L.shake : 0, cx = x + 16 + sh, can = L.can, p = 0.5 + 0.5 * Math.sin(t * 2);
    // o pedestal (ferro com rebites) e o braço que segura a tábua
    rrect(ctx, cx - 9, y + 2, 18, 30, [3, 3, 0, 0]); ctx.fillStyle = '#0d0b10'; ctx.fill(); ctx.strokeStyle = wa(0.16); ctx.lineWidth = 1; ctx.stroke();
    rrect(ctx, cx - 14, y + 26, 28, 6, 2); ctx.fillStyle = '#121016'; ctx.fill(); ctx.strokeStyle = AMBER(0.35); ctx.stroke();
    // a tábua
    const w = 136, h = 70, tx = cx - w / 2, ty = y - h - 4, q = d.def.inscription.endsWith('?');
    R.draw(R.glow(can ? 'c' : 'm', 64), cx, ty + h / 2, 1.5, 0.22 + 0.1 * p + L.glow * 0.5, true);
    R.draw(Fort.glowA(48), cx, ty + h + 4, 1.4, 0.18 + 0.08 * p, true);
    ctx.beginPath(); ctx.moveTo(tx, ty + h); ctx.lineTo(tx, ty + 10); ctx.quadraticCurveTo(tx, ty, tx + 10, ty); ctx.lineTo(cx - 14, ty); ctx.lineTo(cx, ty - 8); ctx.lineTo(cx + 14, ty); ctx.lineTo(tx + w - 10, ty); ctx.quadraticCurveTo(tx + w, ty, tx + w, ty + 10); ctx.lineTo(tx + w, ty + h); ctx.closePath();
    const g = ctx.createLinearGradient(0, ty, 0, ty + h); g.addColorStop(0, '#16121c'); g.addColorStop(1, '#0a080d');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = can ? ca(0.6) : 'rgba(240,171,252,0.85)'; ctx.lineWidth = 1.4; ctx.stroke();
    for (const [rx, ry] of [[tx + 6, ty + 8], [tx + w - 6, ty + 8], [tx + 6, ty + h - 6], [tx + w - 6, ty + h - 6]]) { ctx.beginPath(); ctx.arc(rx, ry, 1.8, 0, Math.PI * 2); ctx.fillStyle = AMBER(0.55); ctx.fill(); }
    // a lei: quem (em cima) e o que pode ou não pode (embaixo, maior); a pergunta da pedra vem antes, pequena
    const [l1, l2] = this.split(L.text[can]), wk = L.write;
    if (q) R.draw(R.text(d.def.inscription, '600 8px Orbitron, Inter, sans-serif', AMBER(0.85), null, 0), cx, ty + 10, 1, 0.9);
    R.draw(R.text(l1 || 'LAW', '700 10px Orbitron, Inter, sans-serif', wa(0.85), 'rgba(34,211,238,0.6)', 5), cx, ty + (q ? 26 : 22), 1, 1);
    R.draw(R.text(l2, '900 14px Orbitron, Inter, sans-serif', '#ffffff', can ? 'rgba(34,211,238,1)' : 'rgba(217,70,239,1)', 10), cx, ty + (q ? 48 : 46), 1 + wk * 0.25, 1);
    // reescrevendo: uma linha em brasa passa pelas letras
    if (wk > 0) {
      const sx = tx + 10 + (w - 20) * (1 - wk);
      R.draw(R.glow('w', 16), sx, ty + 46, 1.4, wk, true); R.draw(Fort.glowA(24), sx, ty + 46, 1.6, wk, true);
    }
    // o cadeado da lei: CAN'T (magenta) trava; CAN (ciano) libera
    ctx.save(); ctx.translate(cx, ty + h - 6); ctx.beginPath(); ctx.arc(0, -3, 3.2, Math.PI, 0); ctx.strokeStyle = can ? ca(0.8) : 'rgba(240,171,252,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
    rrect(ctx, -4.5, -3, 9, 6, 1.5); ctx.fillStyle = can ? ca(0.8) : 'rgba(240,171,252,0.9)'; ctx.fill(); ctx.restore();
  },

  /* ---------- a pedra do forte: tijolos de castelo, borda ciano em cima e o brilho do fogo embaixo ---------- */
  drawSolid(x, c, r, x0, y0) {
    const W = World, S = (cc, rr) => { const t = W.type(cc, rr); return t === T.SOLID || t === T.FAKE; };
    const up = r > 0 && S(c, r - 1), dn = r < W.h - 1 && S(c, r + 1), lf = S(c - 1, r), rt = S(c + 1, r), h = City.hash(c, r);
    const tone = 10 + Math.floor(City.hash(Math.floor(c / 3), Math.floor(r / 2)) * 5);
    x.fillStyle = `rgb(${tone + 3},${tone},${tone + 7})`; x.fillRect(x0 - (lf ? 0.5 : 0), y0 - (up ? 0.5 : 0), TS + (lf ? 0.5 : 0) + (rt ? 0.5 : 0), TS + (up ? 0.5 : 0) + (dn ? 0.5 : 0));
    // os tijolos: duas fileiras por bloco, juntas desencontradas
    const off = (r % 2) * 16;
    x.beginPath(); x.moveTo(x0, y0 + 16.5); x.lineTo(x0 + TS, y0 + 16.5);
    x.moveTo(x0 + off + 0.5, y0); x.lineTo(x0 + off + 0.5, y0 + 16); x.moveTo(x0 + (off + 16) % 32 + 0.5, y0 + 16); x.lineTo(x0 + (off + 16) % 32 + 0.5, y0 + 32);
    x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 1; x.stroke();
    x.beginPath(); x.moveTo(x0, y0 + 1.5); x.lineTo(x0 + TS, y0 + 1.5); x.moveTo(x0, y0 + 17.5); x.lineTo(x0 + TS, y0 + 17.5); x.strokeStyle = 'rgba(255,236,214,0.035)'; x.stroke();
    if (h < 0.06) { for (const dx of [7, 25]) { x.beginPath(); x.arc(x0 + dx, y0 + 8, 1.6, 0, Math.PI * 2); x.fillStyle = 'rgba(190,180,210,0.22)'; x.fill(); } }
    else if (h > 0.95) { x.beginPath(); x.moveTo(x0 + 6, y0 + 20); x.lineTo(x0 + 12, y0 + 25); x.lineTo(x0 + 10, y0 + 30); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.stroke(); }
    else if (h > 0.9 && up && !dn) { x.fillStyle = 'rgba(52,211,153,0.07)'; x.fillRect(x0 + 2, y0 + 22, 20, 10); }   // limo perto do chão
    if (!up) {
      const g = x.createLinearGradient(0, y0, 0, y0 + 18); g.addColorStop(0, ca(0.13)); g.addColorStop(1, ca(0));
      x.fillStyle = g; x.fillRect(x0, y0, TS, 18);
      x.beginPath(); x.moveTo(x0 - (lf ? 1 : 0), y0 + 0.5); x.lineTo(x0 + TS + (rt ? 1 : 0), y0 + 0.5); x.strokeStyle = ca(0.6); x.stroke();
      x.beginPath(); x.moveTo(x0, y0 + 4.5); x.lineTo(x0 + TS, y0 + 4.5); x.strokeStyle = AMBER(0.07); x.stroke();
    }
    if (!dn) {
      const g = x.createLinearGradient(0, y0 + TS, 0, y0 + TS - 14); g.addColorStop(0, EMBER(0.16)); g.addColorStop(1, EMBER(0));
      x.fillStyle = g; x.fillRect(x0, y0 + TS - 14, TS, 14);
      x.beginPath(); x.moveTo(x0, y0 + TS - 0.5); x.lineTo(x0 + TS, y0 + TS - 0.5); x.strokeStyle = AMBER(0.3); x.stroke();
    }
    if (!lf) { x.beginPath(); x.moveTo(x0 + 0.5, y0); x.lineTo(x0 + 0.5, y0 + TS); x.strokeStyle = wa(0.08); x.stroke(); }
    if (!rt) { x.beginPath(); x.moveTo(x0 + TS - 0.5, y0); x.lineTo(x0 + TS - 0.5, y0 + TS); x.strokeStyle = wa(0.08); x.stroke(); }
  },
  // ferro rachado (só o MARTELO quebra): placa escura com a rachadura em brasa
  drawCracked(ctx, c, r, x, y, time) {
    rrect(ctx, x + 1, y + 1, TS - 2, TS - 2, 3); ctx.fillStyle = '#121016'; ctx.fill(); ctx.strokeStyle = AMBER(0.35); ctx.lineWidth = 1; ctx.stroke();
    const p = 0.5 + 0.5 * Math.sin(time * 3 + c);
    ctx.beginPath(); ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 14, y + 13); ctx.lineTo(x + 10, y + 19); ctx.lineTo(x + 20, y + 28); ctx.moveTo(x + 14, y + 13); ctx.lineTo(x + 25, y + 9);
    ctx.strokeStyle = EMBER(0.5 + 0.4 * p); ctx.lineWidth = 1.4; ctx.stroke();
    R.draw(Fort.glowA(16), x + 14, y + 15, 1, 0.3 + 0.2 * p, true);
  },
  // brilho âmbar (fogo, tochas, ferro derretido)
  glowA(r = 32) {
    return R.sprite('glow:amber' + r, r * 2, r * 2, (x, w) => {
      const g = x.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, 'rgba(253,224,71,0.6)'); g.addColorStop(0.35, 'rgba(249,115,22,0.24)'); g.addColorStop(1, 'rgba(249,115,22,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, w);
    });
  },
  glowV(r = 32) {
    return R.sprite('glow:violet' + r, r * 2, r * 2, (x, w) => {
      const g = x.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, 'rgba(196,181,253,0.5)'); g.addColorStop(0.4, 'rgba(139,92,246,0.2)'); g.addColorStop(1, 'rgba(139,92,246,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, w);
    });
  },
  flame(ctx, x, y, s, t) {
    R.draw(this.glowA(40), x, y - 4 * s, 1.3 * s + 0.1 * Math.sin(t * 17), 0.75, true);
    for (const [k, col] of [[1, 'rgba(249,115,22,0.85)'], [0.66, 'rgba(253,186,116,0.95)'], [0.38, 'rgba(255,251,235,1)']]) {
      const fl = Math.sin(t * 13 + k * 5) * 1.6 * s, hh = (12 + Math.sin(t * 9 + k) * 2) * s * k;
      ctx.beginPath(); ctx.moveTo(x - 5 * s * k, y); ctx.quadraticCurveTo(x - 5 * s * k, y - hh * 0.6, x + fl, y - hh - 4 * s * k); ctx.quadraticCurveTo(x + 5 * s * k, y - hh * 0.6, x + 5 * s * k, y); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
    }
  },

  /* ---------- enfeites da fase (decor): só desenho ---------- */
  WIN: [['#d946ef', '#22d3ee', '#fbbf24', '#a78bfa'], ['#22d3ee', '#a78bfa', '#f472b6', '#34d399'], ['#fbbf24', '#d946ef', '#22d3ee', '#f97316'], ['#a78bfa', '#34d399', '#d946ef', '#fbbf24']],
  drawDecor(ctx, e, x, y) {
    const o = e.opts, t = e.t, k = o.kind, time = Game.time;
    if (k === 'torch') {
      ctx.beginPath(); ctx.moveTo(x + 10, y + 26); ctx.lineTo(x + 16, y + 30); ctx.lineTo(x + 22, y + 26); ctx.strokeStyle = wa(0.25); ctx.lineWidth = 1.4; ctx.stroke();
      rrect(ctx, x + 9, y + 14, 14, 12, [2, 2, 5, 5]); ctx.fillStyle = '#100d12'; ctx.fill(); ctx.strokeStyle = AMBER(0.45); ctx.lineWidth = 1; ctx.stroke();
      this.flame(ctx, x + 16, y + 15, 1, time + e.c);
      if (Math.random() < 0.12) FX.add(e.x + 16, e.y + 4, { vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 40, life: 0.9, size: 1.2, c: 'w', g: -20 });
    } else if (k === 'window') {
      const w = o.w * TS, h = o.h * TS, cols = this.WIN[o.hue % 4];
      // o facho de luz colorida descendo em diagonal até o chão
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sh = ctx.createLinearGradient(0, y, 0, y + h + 7 * TS); sh.addColorStop(0, `rgba(255,255,255,0.07)`); sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.moveTo(x + 8, y + h * 0.4); ctx.lineTo(x + w - 8, y + h * 0.4); ctx.lineTo(x + w + 3.2 * TS, y + h + 7 * TS); ctx.lineTo(x + 1.2 * TS, y + h + 7 * TS); ctx.closePath(); ctx.fillStyle = sh; ctx.fill();
      ctx.restore();
      // a janela gótica: moldura de pedra, vidros coloridos e o rendilhado
      ogivePath(ctx, x, y, w, h); ctx.fillStyle = '#07060a'; ctx.fill(); ctx.strokeStyle = wa(0.18); ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ogivePath(ctx, x + 5, y + 5, w - 10, h - 8); ctx.clip();
      const cw = (w - 10) / 4, rh = 22;
      for (let row = 0; row * rh < h; row++) for (let i = 0; i < 4; i++) {
        const col = cols[(i + row) % 4], fl = 0.42 + 0.18 * Math.sin(time * 0.8 + i + row * 1.7);
        ctx.globalAlpha = fl; ctx.fillStyle = col; ctx.fillRect(x + 5 + i * cw + 1, y + 5 + row * rh + 1, cw - 2, rh - 2);
      }
      ctx.globalAlpha = 1; ctx.restore();
      ctx.beginPath(); ctx.moveTo(x + w / 2, y + 8); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x + 5, y + h * 0.55); ctx.lineTo(x + w - 5, y + h * 0.55); ctx.strokeStyle = 'rgba(10,8,12,0.95)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.3, w * 0.2, 0, Math.PI * 2); ctx.stroke();
      R.draw(R.glow('t', 64), x + w / 2, y + h * 0.5, w / 50, 0.3, true);
    } else if (k === 'banner') {
      const h = o.h * TS, wv = o.wind ? Math.sin(time * 2.4 + e.c) * 6 : Math.sin(time * 0.8 + e.c) * 1.5;
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 36, y); ctx.strokeStyle = AMBER(0.6); ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 32, y); ctx.quadraticCurveTo(x + 34 + wv, y + h * 0.5, x + 32 + wv * 1.4, y + h); ctx.lineTo(x + 16 + wv * 1.2, y + h - 12); ctx.lineTo(x + wv * 1.4, y + h); ctx.quadraticCurveTo(x - 2 + wv, y + h * 0.5, x, y); ctx.closePath();
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(76,29,149,0.95)'); g.addColorStop(1, 'rgba(112,26,117,0.9)');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = AMBER(0.55); ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.translate(x + 16 + wv * 0.6, y + 16); ctx.font = '800 9px Orbitron, Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const word = o.rune || 'LAW';
      for (let i = 0; i < word.length; i++) { ctx.fillStyle = o.out ? 'rgba(240,171,252,0.95)' : AMBER(0.9); ctx.fillText(word[i], 0, i * 11); }
      ctx.restore();
    } else if (k === 'gear') {
      const r = (o.s || 2) * TS * 0.5, cx = x + 16, cy = y + 16, a = time * (0.4 / (o.s || 2)) * (e.c % 2 ? 1 : -1);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.beginPath(); const n = Math.round(8 + r / 8);
      for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? r : r * 0.84, aa = i / (n * 2) * Math.PI * 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
      ctx.closePath(); ctx.fillStyle = 'rgba(14,11,17,0.85)'; ctx.fill(); ctx.strokeStyle = AMBER(0.25); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.strokeStyle = wa(0.08); ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * Math.PI / 2) * r * 0.55, Math.sin(i * Math.PI / 2) * r * 0.55); ctx.stroke(); }
      ctx.restore();
      R.draw(this.glowA(16), cx, cy, 0.8, 0.5, true);
    } else if (k === 'chain') {
      const h = o.h * TS; ctx.strokeStyle = 'rgba(200,190,215,0.28)'; ctx.lineWidth = 1.4;
      const sw = Math.sin(time * 1.1 + e.c) * 3;
      for (let yy = 0; yy < h; yy += 9) { ctx.beginPath(); ctx.ellipse(x + 16 + sw * yy / h, y + yy + 4, (yy / 9) % 2 ? 1.5 : 3.5, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
    } else if (k === 'channel') {
      // o canal de ferro aceso no pé da parede (brilho que pulsa)
      const w = o.w * TS, p = 0.5 + 0.5 * Math.sin(time * 1.6);
      const g = ctx.createLinearGradient(0, y + 20, 0, y + 32); g.addColorStop(0, EMBER(0)); g.addColorStop(1, EMBER(0.22 + 0.1 * p));
      ctx.fillStyle = g; ctx.fillRect(x, y + 20, w, 12);
      ctx.beginPath(); ctx.moveTo(x, y + 31); ctx.lineTo(x + w, y + 31); ctx.strokeStyle = AMBER(0.5 + 0.3 * p); ctx.lineWidth = 1.2; ctx.stroke();
    } else if (k === 'grate') {
      ctx.save(); ctx.translate(x - 6, y + 6); ctx.rotate(-0.5);
      rrect(ctx, 0, 0, o.w * TS - 4, 5, 1); ctx.fillStyle = '#16131a'; ctx.fill(); ctx.strokeStyle = wa(0.18); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      const g = ctx.createLinearGradient(0, y, 0, y + 40); g.addColorStop(0, 'rgba(52,211,153,0)'); g.addColorStop(1, 'rgba(52,211,153,0.1)');
      ctx.fillStyle = g; ctx.fillRect(x, y, o.w * TS, 40);
    } else if (k === 'drip') {
      const ph = (time * 0.7 + e.c * 0.37) % 1;
      ctx.beginPath(); ctx.arc(x + 16, y + 2 + ph * ph * 150, 1.6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(110,231,183,0.55)'; ctx.fill();
    } else if (k === 'tag') City.tag(ctx, o.text, x + (o.w || 1) * TS / 2, y + 16);
    else if (k === 'carve') {
      const w = o.w * TS, p = 0.5 + 0.5 * Math.sin(time * 1.5);
      rrect(ctx, x + 2, y, w - 4, 46, 6); ctx.fillStyle = 'rgba(12,10,15,0.96)'; ctx.fill(); ctx.strokeStyle = AMBER(0.4); ctx.lineWidth = 1.2; ctx.stroke();
      R.draw(this.glowA(48), x + w / 2, y + 18, w / 60, 0.25 + 0.1 * p, true);
      R.draw(R.text(o.text, '900 17px Orbitron, Inter, sans-serif', '#fff7ed', 'rgba(251,191,36,0.95)', 12), x + w / 2, y + 18, 1, 1);
      if (o.sub) R.draw(R.text(o.sub, '700 8px Orbitron, Inter, sans-serif', ca(0.9), null, 0), x + w / 2, y + 37, 1, 0.9);
    } else if (k === 'portcullis') {
      // a porta do forte: o arco e a grade levantada lá no alto
      const w = o.w * TS, h = o.h * TS;
      ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + 18); ctx.quadraticCurveTo(x + w / 2, y - 22, x + w, y + 18); ctx.lineTo(x + w, y + h);
      ctx.strokeStyle = AMBER(0.45); ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(x + 3, y - 8, w - 6, 34); ctx.clip();
      ctx.beginPath(); for (let xx = x + 8; xx < x + w - 4; xx += 12) { ctx.moveTo(xx, y - 8); ctx.lineTo(xx, y + 24); ctx.lineTo(xx + 3, y + 30); } for (let yy = y; yy < y + 24; yy += 10) { ctx.moveTo(x + 4, yy); ctx.lineTo(x + w - 4, yy); }
      ctx.strokeStyle = 'rgba(205,195,220,0.45)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    } else if (k === 'crenel') {
      // ameias no fundo da muralha (atrás da Nexy)
      const w = o.w * TS;
      for (let xx = 0; xx < w; xx += 64) {
        rrect(ctx, x + xx + 4, y - 8, 28, 40, [3, 3, 0, 0]); ctx.fillStyle = 'rgba(16,13,20,0.92)'; ctx.fill(); ctx.strokeStyle = wa(0.07); ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + xx + 6, y - 7.5); ctx.lineTo(x + xx + 30, y - 7.5); ctx.strokeStyle = ca(0.3); ctx.stroke();
      }
    } else if (k === 'keep') {
      // a torre de menagem atrás do portão: telhado pontudo, janelas acesas, bandeira
      const w = o.w * TS, base = (13 - e.r) * TS;
      ctx.beginPath(); ctx.moveTo(x, y + base); ctx.lineTo(x, y + 40); ctx.lineTo(x + w / 2, y - 30); ctx.lineTo(x + w, y + 40); ctx.lineTo(x + w, y + base); ctx.closePath();
      ctx.fillStyle = 'rgba(14,11,18,0.97)'; ctx.fill(); ctx.strokeStyle = VIOLET(0.35); ctx.lineWidth = 1.2; ctx.stroke();
      for (let i = 0; i < 3; i++) { const wx = x + w * (0.25 + i * 0.25) - 5; ogivePath(ctx, wx, y + 70 + (i % 2) * 30, 10, 22); ctx.fillStyle = AMBER(0.35 + 0.15 * Math.sin(time * 2 + i)); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(x + w / 2, y - 30); ctx.lineTo(x + w / 2, y - 60); ctx.strokeStyle = wa(0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w / 2, y - 60); ctx.lineTo(x + w / 2 + 26 + Math.sin(time * 3) * 3, y - 54); ctx.lineTo(x + w / 2, y - 48); ctx.closePath(); ctx.fillStyle = 'rgba(217,70,239,0.75)'; ctx.fill();
    }
  },
  // a porta da torre de menagem (alvo keepgate): grade de ferro com pontas; afunda quando o Guardião cai
  drawPortcullis(ctx, tg, x, y, w, h, time) {
    const p = 0.5 + 0.5 * Math.sin(time * 2);
    R.draw(this.glowA(48), x + w / 2, y + h / 2, Math.max(1, h / 70), 0.15 + 0.1 * p, true);
    rrect(ctx, x, y, w, h, 2); ctx.fillStyle = 'rgba(6,5,8,0.9)'; ctx.fill();
    ctx.beginPath(); for (let xx = x + 6; xx < x + w; xx += 13) { ctx.moveTo(xx, y); ctx.lineTo(xx, y + h - 6); ctx.lineTo(xx + 3, y + h); ctx.lineTo(xx + 6, y + h - 6); } for (let yy = y + 12; yy < y + h - 8; yy += 16) { ctx.moveTo(x + 2, yy); ctx.lineTo(x + w - 2, yy); }
    ctx.strokeStyle = 'rgba(214,204,230,0.6)'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = AMBER(0.25 + tg.glow * 0.5); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  },
  // o CLOCK parado: um relógio grande e translúcido sobre a tela, a cor puxa para o violeta
  drawOverlay(ctx) {
    if (this.freezeT <= 0) return;
    const W = CFG.VIEW_W, H = CFG.VIEW_H, k = Math.min(1, this.freezeT / 0.4, (POWERS.clock.time - this.freezeT) / 0.25 + 0.2);
    ctx.save(); ctx.globalAlpha = 0.18 * k; ctx.fillStyle = '#4c1d95'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.globalAlpha = 0.22 * k;
    ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 132, Math.sin(a) * 132); ctx.lineTo(Math.cos(a) * 146, Math.sin(a) * 146); ctx.stroke(); }
    const left = this.freezeT / POWERS.clock.time;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 120, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); ctx.closePath(); ctx.fillStyle = 'rgba(196,181,253,0.35)'; ctx.fill();
    ctx.restore();
  },
};

/* ---------- a chegada no forte (1ª visita): o narrador e a tabela do CAN (não muda com a pessoa) ---------- */
const FortIntro = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 0, i: -1, pt: 0, text: null, textT: 0, voiceDone: true, tableK: 0, hi: -1,
  start() {
    Object.assign(this, { active: true, t: 0, i: -1, pt: 0, text: null, textT: 0, voiceDone: true, tableK: 0, letter: 0, zoom: 1, sat: 0, phase: 'lines', hi: -1 });
    Game.state = 'cinematic'; Game.clearInput(); P.vx = 0;
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.6 }); SFX.riser(1.2); SFX.anvil();
    this.next();
  },
  say(line, who = 'story') {
    this.text = line; this.textT = 0; this.voiceDone = false; this.pt = 0;
    if (!Voice.say(line.en, who, { cut: true, onEnd: () => { this.voiceDone = true; } })) this.voiceDone = true;
  },
  next() {
    this.i++;
    if (this.i < FORT.intro.length) this.say(FORT.intro[this.i]);
    else if (this.phase === 'lines') { this.phase = 'table'; this.say(FORT.tableLine); SFX.letter(); }
    else if (this.phase === 'table') { this.phase = 'neg'; this.say(FORT.neg, 'door'); SFX.anvil(); }
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
    if (this.phase !== 'lines') {
      this.tableK = Math.min(1, this.tableK + dt * 1.6);
      if (this.phase === 'table') { const n = Math.floor((this.pt - 0.4) / 0.7); if (n !== this.hi && n >= 0 && n < 4) { this.hi = n; SFX.select(); } }
    }
    if (this.phase === 'lines' && this.ready(this.i === 0 ? 2.4 : 3)) this.next();
    else if (this.phase === 'table' && this.ready(4.2, 10)) this.next();
    else if (this.phase === 'neg' && this.ready(3.4, 9)) this.next();
  },
  end() {
    if (!this.active) return;
    this.active = false; this.letter = 0;
    Save.data.met.fort = true; Save.write();
    Music.normal();
    if (Game.state === 'cinematic') Game.state = 'play';
    Game.clearInput();
    Game.later(0.6, () => Echo.talk(ECHO.lines.fort));
  },
  drawWorld() { },
  drawScreen(ctx) {
    if (!this.active) return;
    const W = CFG.VIEW_W, H = CFG.VIEW_H, bar = 62 * this.letter;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    if (this.text) {
      const k = Math.min(1, this.textT * 3);
      R.draw(R.text(this.text.en, '700 22px Orbitron, Inter, sans-serif', '#ffffff', this.phase === 'neg' ? 'rgba(217,70,239,0.9)' : 'rgba(251,191,36,0.9)', 12), W / 2, 96, 1, k);
      if (this.text.pt) R.draw(R.text(this.text.pt, '400 14px Inter, sans-serif', wa(0.78), null, 0), W / 2, 124, 1, k);
    }
    if (this.phase !== 'lines') {
      const k = this.tableK, x0 = W / 2 - 340, y0 = 170;
      ctx.save(); ctx.globalAlpha = k;
      rrect(ctx, x0, y0, 680, 230, 16); ctx.fillStyle = 'rgba(4,3,6,0.94)'; ctx.fill(); ctx.strokeStyle = AMBER(0.45); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      FORT.table.forEach((row, i) => {
        const cx = x0 + 85 + i * 170, on = this.phase === 'table' && i === this.hi, kk = clamp(k * 3 - i * 0.4, 0, 1);
        if (on) R.draw(Fort.glowA(64), cx, y0 + 80, 1.6, 0.35 * kk, true);
        // a Nexy pulando (o desenho da regra: todo mundo PODE)
        ctx.save(); ctx.globalAlpha = kk; const jy = on ? -Math.abs(Math.sin(this.t * 6)) * 16 : 0;
        ctx.beginPath(); ctx.arc(cx, y0 + 52 + jy, 8, 0, Math.PI * 2); ctx.moveTo(cx, y0 + 60 + jy); ctx.lineTo(cx, y0 + 82 + jy); ctx.moveTo(cx - 10, y0 + 68 + jy); ctx.lineTo(cx + 10, y0 + 68 + jy);
        ctx.moveTo(cx, y0 + 82 + jy); ctx.lineTo(cx - 7, y0 + 96 + jy); ctx.moveTo(cx, y0 + 82 + jy); ctx.lineTo(cx + 7, y0 + 96 + jy);
        ctx.strokeStyle = on ? '#f0abfc' : wa(0.5); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
        const [a, b] = row.w.split(' ');
        R.draw(R.text(a, '700 14px Orbitron, Inter, sans-serif', wa(0.85), null, 0), cx, y0 + 128, 1, kk);
        R.draw(R.text(b, '900 22px Orbitron, Inter, sans-serif', '#ffffff', on ? 'rgba(251,191,36,1)' : 'rgba(251,191,36,0.55)', on ? 14 : 6), cx, y0 + 156, on ? 1.1 : 1, kk);
        R.draw(R.text(row.pt, '400 12px Inter, sans-serif', wa(0.7), null, 0), cx, y0 + 184, 1, kk);
      });
      if (this.phase === 'neg') R.draw(R.text("CAN'T = CAN NOT", '900 18px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 12), W / 2, y0 + 212, 1, Math.min(1, this.pt * 2));
    }
    R.draw(R.text(Input.padSeen ? 'A · NEXT' : 'ENTER · NEXT  ·  ESC · SKIP', '500 9px Orbitron, Inter, sans-serif', wa(0.45), null, 0), W - 90, H - bar - 14);
  },
};

/* ============================== PEÇAS DO FORTE ============================== */
// ESMAGADOR: bloco de ferro com pontas, preso por correntes. Cai no ritmo (ciclo próprio, pausa com o CLOCK).
// Com a lei THE STONES CAN'T FALL (law), sobe e fica travado. h = altura em blocos; drop = a linha onde ele bate.
Ents.reg('crusher', {
  layer: 'mid',
  init(e) {
    const o = e.opts; e.w = 2 * TS; e.h = (o.h || 3) * TS; e.x = e.c * TS; e.y0 = e.r * TS; e.y1 = (o.drop + 1) * TS - e.h; e.y = e.y0;
    e.clock = ((e.c / 6) * (o.step || 0.2)) % 1 * (o.cycle || 2.8); e.plat = true; e.dx = 0; e.dy = 0; e.vy = 0; e.top = 0;
  },
  // a posição no ciclo: espera em cima, treme, cai rápido, fica embaixo, sobe devagar
  at(e) {
    const T0 = e.opts.cycle || 2.8, k = (e.clock % T0) / T0;
    if (k < 0.55) return { y: 0, warn: 0 };
    if (k < 0.68) return { y: 0, warn: (k - 0.55) / 0.13 };
    if (k < 0.73) { const f = (k - 0.68) / 0.05; return { y: f * f, warn: 0, fall: true }; }
    if (k < 0.86) return { y: 1, warn: 0, down: true };
    return { y: 1 - (k - 0.86) / 0.14, warn: 0 };
  },
  locked(e) { return e.opts.law && !Fort.can(e.opts.law); },
  update(e, dt) {
    const oy = e.y;
    let s;
    if (this.locked(e)) { e.y = approach(e.y, e.y0, 220 * dt); s = { y: (e.y - e.y0) / (e.y1 - e.y0), warn: 0 }; }
    else {
      if (!Fort.frozen()) e.clock += dt;
      s = this.at(e); e.y = lerp(e.y0, e.y1, s.y);
    }
    e.warn = s.warn; e.dy = e.y - oy; e.dx = 0; e.vy = e.dy / dt;
    // batendo no chão: tremor e poeira (só perto da tela)
    if (s.down && !e.hit) { e.hit = true; if (Math.abs(e.x - P.cx) < 16 * TS) { SFX.slam(); Game.shake(Math.abs(e.x - P.cx) < 6 * TS ? 3 : 1); } FX.burst(e.x + e.w / 2, e.y + e.h, 14, 'w', 160, { life: 0.5, g: 400 }); }
    if (!s.down) e.hit = false;
    // esmagou a Nexy: caindo por cima dela
    if (e.dy > 0.5 && !P.dead && P.x + P.w > e.x + 3 && P.x < e.x + e.w - 3 && P.y < e.y + e.h && P.y + P.h > e.y + e.h - 4 - e.dy) {
      P.hurt();
      if (!P.dead) { const left = P.cx < e.x + e.w / 2; P.x = left ? e.x - P.w - 1 : e.x + e.w + 1; P.vx = left ? -120 : 120; }
    }
    // dos lados ele é parede (a Nexy embaixo dele, com espaço, passa)
    else if (!P.dead && P.x + P.w > e.x + 1 && P.x < e.x + e.w - 1 && P.y < e.y + e.h - 2 && P.y + P.h > e.y + 10) {
      const left = P.cx < e.x + e.w / 2; P.x = left ? e.x - P.w : e.x + e.w; if (left ? P.vx > 0 : P.vx < 0) P.vx = 0;
    }
  },
  draw(ctx, e, x, y) {
    const t = e.t, lk = this.locked(e), sh = e.warn > 0 ? Math.sin(t * 80) * 1.6 * e.warn : 0, w = e.w, h = e.h, camY = e.y - y;
    // as correntes até o teto
    const top = e.y0 - camY - 2;
    ctx.strokeStyle = lk ? ca(0.55) : 'rgba(200,190,215,0.35)'; ctx.lineWidth = 1.4;
    for (const cx of [x + 12, x + w - 12]) for (let yy = y - 6; yy > top - 40; yy -= 9) { ctx.beginPath(); ctx.ellipse(cx + sh, yy, 2.5, 4.5, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.save(); ctx.translate(sh, 0);
    if (e.warn > 0 || e.vy > 50) R.draw(Fort.glowA(48), x + w / 2, y + h - 4, 1.4, 0.3 + 0.5 * e.warn, true);
    // o bloco de ferro com a cara de pedra (olhos que acendem antes da queda)
    rrect(ctx, x + 1, y, w - 2, h - 8, 4); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#1d1823'); g.addColorStop(1, '#0d0a10');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = lk ? ca(0.6) : wa(0.22); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y + 10); ctx.lineTo(x + w - 6, y + 10); ctx.strokeStyle = wa(0.07); ctx.lineWidth = 1; ctx.stroke();
    for (const [rx, ry] of [[x + 7, y + 6], [x + w - 7, y + 6], [x + 7, y + h - 16], [x + w - 7, y + h - 16]]) { ctx.beginPath(); ctx.arc(rx, ry, 1.6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200,190,215,0.3)'; ctx.fill(); }
    const ey = y + h * 0.42, hot = lk ? 0 : Math.max(e.warn, e.vy > 50 ? 1 : 0.25);
    for (const ex of [x + w * 0.32, x + w * 0.68]) {
      ctx.beginPath(); ctx.moveTo(ex - 7, ey - 2); ctx.lineTo(ex + 7, ey - 2); ctx.lineTo(ex + 4, ey + 4); ctx.lineTo(ex - 4, ey + 4); ctx.closePath();
      ctx.fillStyle = lk ? ca(0.35) : `rgba(251,191,36,${(0.25 + 0.75 * hot).toFixed(3)})`; ctx.fill();
      if (hot > 0.5) R.draw(Fort.glowA(16), ex, ey + 1, 0.8, hot, true);
    }
    ctx.beginPath(); ctx.moveTo(x + w * 0.3, ey + 14); ctx.lineTo(x + w * 0.7, ey + 14); ctx.strokeStyle = wa(0.15); ctx.lineWidth = 1.4; ctx.stroke();
    // as pontas embaixo
    ctx.beginPath(); for (let i = 0; i < 5; i++) { const sx = x + 4 + i * (w - 8) / 5; ctx.moveTo(sx, y + h - 8); ctx.lineTo(sx + (w - 8) / 10, y + h); ctx.lineTo(sx + (w - 8) / 5, y + h - 8); }
    ctx.fillStyle = '#2a2430'; ctx.fill(); ctx.strokeStyle = lk ? ca(0.45) : AMBER(0.4 + 0.5 * hot); ctx.lineWidth = 1; ctx.stroke();
    // travado pela lei: o cadeado ciano no meio
    if (lk) { ctx.beginPath(); ctx.arc(x + w / 2, y + h - 22, 4, Math.PI, 0); ctx.strokeStyle = ca(0.9); ctx.lineWidth = 1.4; ctx.stroke(); rrect(ctx, x + w / 2 - 5.5, y + h - 22, 11, 8, 2); ctx.fillStyle = ca(0.9); ctx.fill(); }
    ctx.restore();
  },
});

// O CHÃO QUE SE MEXE: uma laje de pedra encostada na borda do poço. Só atravessa quando a lei diz que PODE.
Ents.reg('slab', {
  layer: 'mid',
  init(e) {
    const o = e.opts; e.w = (o.w || 3) * TS; e.h = 18; e.x0 = e.c * TS; e.x1 = o.to * TS; e.x = e.x0; e.y = e.r * TS;
    e.plat = true; e.dx = 0; e.dy = 0; e.dir = 1; e.waitT = 0; e.k = 0;
  },
  update(e, dt) {
    const ox = e.x, go = Fort.can(e.opts.law) && !Fort.frozen();
    e.k = approach(e.k, Fort.can(e.opts.law) ? 1 : 0, dt * 2);
    if (go) {
      if (e.waitT > 0) e.waitT -= dt;
      else {
        e.x += e.dir * (e.opts.speed || 100) * dt;
        if (e.x >= e.x1) { e.x = e.x1; e.dir = -1; e.waitT = e.opts.wait || 0.8; }
        if (e.x <= e.x0) { e.x = e.x0; e.dir = 1; e.waitT = e.opts.wait || 0.8; }
      }
    }
    e.dx = e.x - ox; e.dy = 0;
  },
  draw(ctx, e, x, y) {
    const t = e.t, w = e.w, on = e.k;
    R.draw(R.glow('c', 48), x + w / 2, y + 22, w / 50, 0.15 + 0.35 * on, true);
    rrect(ctx, x + 1, y, w - 2, e.h, [3, 3, 8, 8]); const g = ctx.createLinearGradient(0, y, 0, y + e.h); g.addColorStop(0, '#1b1720'); g.addColorStop(1, '#0c0a0f');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = ca(0.35 + 0.4 * on); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, y + 0.5); ctx.lineTo(x + w - 4, y + 0.5); ctx.strokeStyle = ca(0.7); ctx.stroke();
    R.draw(R.text('FLOOR', '800 8px Orbitron, Inter, sans-serif', on > 0.5 ? '#e0fbff' : wa(0.4), on > 0.5 ? 'rgba(34,211,238,0.9)' : null, 5), x + w / 2, y + 10, 1, 0.9);
    // flutuando: as runas de baixo acendem
    for (let i = 0; i < 3; i++) { const ax = x + w * (0.25 + i * 0.25); R.draw(R.glow('c', 10), ax, y + e.h + 3 + Math.sin(t * 4 + i) * 1.5, 1, 0.2 + 0.6 * on, true); }
  },
});

// PLATAFORMA QUE CAI: aguenta um instante (treme) e despenca; volta depois de 3 s
Ents.reg('crumble', {
  layer: 'mid',
  init(e) { e.w = (e.opts.w || 1) * TS; e.h = 12; e.x = e.c * TS; e.y0 = e.r * TS; e.y = e.y0; e.plat = true; e.dx = 0; e.dy = 0; e.state = 'idle'; e.k = 0; e.vy = 0; },
  update(e, dt) {
    const oy = e.y;
    if (e.state === 'idle') { if (P.riding === e) { e.state = 'shake'; e.k = 0.42; SFX.stone(); } }
    else if (e.state === 'shake') { if (!Fort.frozen()) e.k -= dt; if (e.k <= 0) { e.state = 'fall'; e.vy = 0; SFX.crumble(); FX.burst(e.x + e.w / 2, e.y + 6, 10, 'w', 120, { life: 0.5, g: 500 }); } }
    else if (e.state === 'fall') { e.vy = Math.min(e.vy + 1800 * dt, 700); e.y += e.vy * dt; if (e.y > e.y0 + 12 * TS) { e.state = 'gone'; e.k = 3; e.plat = false; } }
    else if (e.state === 'gone') { e.k -= dt; if (e.k <= 0 && !(P.x + P.w > e.x && P.x < e.x + e.w && Math.abs(P.y + P.h - e.y0) < 30)) { e.state = 'idle'; e.y = e.y0; e.plat = true; FX.burst(e.x + e.w / 2, e.y + 6, 10, 'c', 100, { life: 0.4, g: 0 }); } }
    e.dy = e.y - oy; e.dx = 0;
  },
  draw(ctx, e, x, y) {
    if (e.state === 'gone') return;
    const sh = e.state === 'shake' ? Math.sin(e.t * 90) * 1.5 : 0, w = e.w;
    ctx.save(); ctx.translate(sh, 0);
    // o suporte de ferro na parede e a laje rachada
    for (const bx of [x + 8, x + w - 8]) { ctx.beginPath(); ctx.moveTo(bx, y + 12); ctx.lineTo(bx + (bx < x + w / 2 ? 6 : -6), y + 22); ctx.strokeStyle = wa(0.18); ctx.lineWidth = 1.4; ctx.stroke(); }
    rrect(ctx, x + 1, y, w - 2, 12, 3); ctx.fillStyle = '#17131b'; ctx.fill(); ctx.strokeStyle = AMBER(0.5); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < w / TS; i++) { const xx = x + i * TS; ctx.moveTo(xx + 8, y + 1); ctx.lineTo(xx + 13, y + 6); ctx.lineTo(xx + 11, y + 11); ctx.moveTo(xx + 22, y + 2); ctx.lineTo(xx + 19, y + 9); } ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, y + 0.5); ctx.lineTo(x + w - 4, y + 0.5); ctx.strokeStyle = ca(0.55); ctx.stroke();
    ctx.restore();
  },
});

// OLHO DE FERRO: na parede, varre o chão com um facho de luz dourada. Se pegar a Nexy (sem um pilar no caminho),
// os guardas a põem para fora da galeria. Com THE EYES CAN'T SEE ele fecha (grade ciano).
const EYE_W = 0.12;
Ents.reg('eye', {
  layer: 'back',
  init(e) { e.w = TS; e.h = TS; e.x = e.c * TS; e.y = e.r * TS; e.ex = e.x + 16; e.ey = e.y + 16; e.clock = e.c * 0.71; e.a = 0; e.alarm = 0; e.len = 18 * TS; e.lid = 0; },
  // até onde o raio vai (primeira pedra no caminho)
  reach(e, a) {
    const dx = Math.sin(a), dy = Math.cos(a);
    for (let d = 20; d < 24 * TS; d += 8) { const px = e.ex + dx * d, py = e.ey + dy * d; if (World.solidStatic(Math.floor(px / TS), Math.floor(py / TS))) return d; }
    return 24 * TS;
  },
  sees(e, px, py) {
    const dx = px - e.ex, dy = py - e.ey; if (dy <= 0) return false;
    const a = Math.atan2(dx, dy), d = Math.hypot(dx, dy);
    if (Math.abs(a - e.a) > EYE_W || d > e.len + 8) return false;
    for (let s = 20; s < d - 6; s += 6) { const x = e.ex + dx * s / d, y = e.ey + dy * s / d; if (World.solidStatic(Math.floor(x / TS), Math.floor(y / TS))) return false; }
    return true;
  },
  update(e, dt) {
    const open = Fort.can(e.opts.law);
    e.lid = approach(e.lid, open ? 0 : 1, dt * 2.5);
    if (e.alarm > 0) e.alarm -= dt;
    if (!open) return;
    if (!Fort.frozen()) e.clock += dt;
    e.a = Math.sin(e.clock * 0.78) * 0.62; e.len = this.reach(e, e.a);
    if (P.dead || Game.state !== 'play' || P.invuln > 0 && Fort.seenT > 0) return;
    if (Math.abs(P.cx - e.ex) > 16 * TS) return;
    if (!Fort.seenT && [P.y + 6, P.cy, P.y + P.h - 6].some(py => this.sees(e, P.cx, py))) { Game.registerCreature('EYE'); Fort.caught(e); }
  },
  draw(ctx, e, x, y) {
    const t = e.t, open = 1 - e.lid, camX = e.x - x, camY = e.y - y, cx = e.ex - camX, cy = e.ey - camY, al = e.alarm > 0;
    // o facho (dourado; magenta no alarme)
    if (open > 0.05) {
      const a = e.a, L = e.len, x1 = cx + Math.sin(a - EYE_W) * L, y1 = cy + Math.cos(a - EYE_W) * L, x2 = cx + Math.sin(a + EYE_W) * L, y2 = cy + Math.cos(a + EYE_W) * L;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(cx, cy, cx + Math.sin(a) * L, cy + Math.cos(a) * L);
      g.addColorStop(0, al ? `rgba(244,63,94,${0.42 * open})` : `rgba(253,224,71,${0.34 * open})`); g.addColorStop(1, al ? `rgba(217,70,239,${0.12 * open})` : `rgba(251,191,36,${0.08 * open})`);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      const fx = cx + Math.sin(a) * L, fy = cy + Math.cos(a) * L;
      ctx.beginPath(); ctx.ellipse(fx, fy - 2, Math.abs(x2 - x1) / 2 + 6, 6, 0, 0, Math.PI * 2); ctx.fillStyle = al ? `rgba(244,63,94,${0.35 * open})` : `rgba(253,224,71,${0.25 * open})`; ctx.fill();
      ctx.restore();
    }
    // o olho: aro de ferro, íris que segue o facho; fechado = grade ciano
    R.draw(al ? R.glow('m', 40) : Fort.glowA(40), cx, cy, 1.2, 0.3 + 0.3 * open, true);
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fillStyle = '#100d14'; ctx.fill(); ctx.strokeStyle = AMBER(0.55); ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 8; i++) { const aa = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(aa) * 15, cy + Math.sin(aa) * 15); ctx.lineTo(cx + Math.cos(aa) * 19, cy + Math.sin(aa) * 19); ctx.strokeStyle = wa(0.2); ctx.lineWidth = 2; ctx.stroke(); }
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 11, 11 * Math.max(0.08, open), 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(cx - 12, cy - 12, 24, 24);
    const ix = cx + Math.sin(e.a) * 4, iy = cy + Math.cos(e.a) * 4;
    ctx.beginPath(); ctx.arc(ix, iy, 5.5, 0, Math.PI * 2); ctx.fillStyle = al ? '#e11d48' : '#d97706'; ctx.fill();
    ctx.beginPath(); ctx.arc(ix, iy, 2.4, 0, Math.PI * 2); ctx.fillStyle = '#0b0710'; ctx.fill();
    ctx.restore();
    if (e.lid > 0.05) { ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(cx + i * 6, cy - 12); ctx.lineTo(cx + i * 6, cy + 12); } ctx.moveTo(cx - 13, cy); ctx.lineTo(cx + 13, cy); ctx.strokeStyle = ca(0.8 * e.lid); ctx.lineWidth = 1.6; ctx.stroke(); }
  },
});

// MORCEGO: pendurado no teto; quando a Nexy passa embaixo, mergulha em onda até ela e volta para casa
Ents.reg('bat', {
  layer: 'enemy',
  init(e) { e.w = 26; e.h = 18; e.enemy = true; e.kind = 'enemy'; e.state = 'hang'; e.creature = 'BAT'; e.res = {}; e.cool = 0; e.ft = 0; },
  update(e, dt) {
    if (e.state === 'dying') return Enemy.dyingUpdate(e, dt);
    if (e.hx == null) { e.hx = e.x; e.hy = e.y; }
    if (Fort.frozen()) return;
    const dx = P.cx - (e.x + e.w / 2), dy = P.cy - (e.y + e.h / 2);
    if (e.cool > 0) e.cool -= dt;
    if (e.state === 'hang') {
      e.y = e.hy + Math.sin(e.t * 2) * 1.5;
      if (!P.dead && e.cool <= 0 && Math.abs(dx) < 5 * TS && dy > 0 && dy < 12 * TS) {
        e.state = 'swoop'; e.ft = 0; e.dir = sign(dx) || 1; e.base = e.y; SFX.bat();
        if (Game.echoBorn && !Fort.flags.bat && !Save.data.met.bat) { Fort.flags.bat = true; Save.data.met.bat = true; Save.write(); Echo.talk(ECHO.lines.bat); }
      }
    } else if (e.state === 'swoop') {
      e.ft += dt;
      e.base = approach(e.base, P.cy - 10, 160 * dt);
      e.x += e.dir * 150 * dt; e.y = e.base + Math.sin(e.ft * 6) * 26;
      if (e.ft > 3.2 || Math.abs(e.x - e.hx) > 11 * TS) e.state = 'home';
    } else if (e.state === 'home') {
      const hx = e.hx - e.x, hy = e.hy - e.y, d = Math.hypot(hx, hy);
      if (d < 4) { e.x = e.hx; e.y = e.hy; e.state = 'hang'; e.cool = 1.6; }
      else { const v = Math.min(d, 170 * dt); e.x += hx / d * v; e.y += hy / d * v + Math.sin(e.t * 8) * 0.6; }
    }
  },
  draw(ctx, e, x, y) {
    const cx = x + e.w / 2, cy = y + e.h / 2, t = e.t, hang = e.state === 'hang';
    Enemy.rim(cx, cy, e.w);
    ctx.save(); ctx.translate(cx, cy);
    if (e.state === 'dying') ctx.rotate(e.spinA || 0);
    if (hang) {
      // dormindo de cabeça para baixo, enrolado nas asas
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -6); ctx.strokeStyle = wa(0.3); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 1, 6, 9, 0, 0, Math.PI * 2); ctx.fillStyle = '#0c0910'; ctx.fill(); ctx.strokeStyle = VIOLET(0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(-2, 5, 1, 0, Math.PI * 2); ctx.arc(2, 5, 1, 0, Math.PI * 2); ctx.fillStyle = AMBER(0.5); ctx.fill();
    } else {
      const f = Math.sin(t * 22) * 0.7;
      for (const s of [-1, 1]) {
        ctx.save(); ctx.scale(s, 1); ctx.rotate(f * 0.6);
        ctx.beginPath(); ctx.moveTo(3, -2); ctx.quadraticCurveTo(10, -10, 17, -5); ctx.lineTo(15, 0); ctx.lineTo(12, -1); ctx.lineTo(10, 3); ctx.lineTo(7, 1); ctx.lineTo(4, 4); ctx.closePath();
        ctx.fillStyle = '#100c15'; ctx.fill(); ctx.strokeStyle = VIOLET(0.6); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      }
      ctx.beginPath(); ctx.ellipse(0, 0, 5, 6, 0, 0, Math.PI * 2); ctx.fillStyle = '#0c0910'; ctx.fill(); ctx.strokeStyle = VIOLET(0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-3, -9); ctx.lineTo(-1, -5); ctx.moveTo(4, -4); ctx.lineTo(3, -9); ctx.lineTo(1, -5); ctx.stroke();
      R.draw(R.glow('m', 10), 0, -1, 1, 0.6, true);
      ctx.beginPath(); ctx.arc(-2, -1, 1.3, 0, Math.PI * 2); ctx.arc(2, -1, 1.3, 0, Math.PI * 2); ctx.fillStyle = '#f0abfc'; ctx.fill();
    }
    ctx.restore();
  },
});

// O FERRO DERRETIDO da torre: quando a Nexy entra, ele sobe (wait s de aviso, speed px/s) até a linha top.
// Encostou, queimou. Com THE IRON CAN'T RISE ele para e esfria (crosta escura com rachaduras acesas).
Ents.reg('molten', {
  layer: 'front',
  init(e) {
    const o = e.opts; e.x = o.c0 * TS; e.w = (o.c1 - o.c0 + 1) * TS; e.base = (e.r + 0.5) * TS; e.surf = e.base; e.y = e.surf; e.h = World.pxH - e.y;
    e.state = 'idle'; e.k = 0; e.cool = 0; e.light = 0;
  },
  calm(e) { e.state = 'idle'; e.surf = e.base; e.k = 0; },
  update(e, dt) {
    const o = e.opts, can = Fort.can(o.law);
    e.cool = approach(e.cool, can ? 0 : 1, dt * 0.8);
    if (e.state === 'idle') { if (!P.dead && P.cx > o.from * TS + 20 && P.cx < (o.c1 + 1) * TS && P.y + P.h > 20 * TS && can) { e.state = 'wait'; e.k = o.wait || 1.5; SFX.rumble(1.6); Game.shake(4); if (Game.echoBorn) Echo.talk(ECHO.lines.iron); } }
    else if (e.state === 'wait') { if (!Fort.frozen()) e.k -= dt; if (e.k <= 0) e.state = 'rise'; }
    else if (e.state === 'rise' && can && !Fort.frozen()) {
      e.surf = Math.max((o.top + 0.6) * TS, e.surf - (o.speed || 28) * dt);
      if (Math.random() < 0.08) SFX.lava();
    }
    e.y = e.surf - 10; e.h = World.pxH - e.y;
    // encostou no ferro: queimou (até com poder)
    if (!P.dead && P.cx > e.x && P.cx < e.x + e.w && P.y + P.h > e.surf + 6 && e.cool < 0.6) { FX.burst(P.cx, e.surf, 40, 'w', 300, { life: 0.8, g: 500 }); P.die(); }
    if (e.cool < 0.6 && Math.random() < 0.5) FX.add(e.x + Math.random() * e.w, e.surf - 2, { vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 90, life: 0.9, size: 1.4, c: 'w', g: -10 });
  },
  draw(ctx, e, x, y) {
    const t = e.t, w = e.w, sy = y + 10, cool = e.cool, H = CFG.VIEW_H + 40;
    // o brilho que sobe pela torre
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createLinearGradient(0, sy - 160, 0, sy); gl.addColorStop(0, EMBER(0)); gl.addColorStop(1, EMBER(0.28 * (1 - cool)));
    ctx.fillStyle = gl; ctx.fillRect(x, sy - 160, w, 160); ctx.restore();
    // a superfície ondulada
    ctx.beginPath(); ctx.moveTo(x, sy + 30);
    for (let xx = 0; xx <= w; xx += 8) ctx.lineTo(x + xx, sy + Math.sin(t * 2.6 + xx * 0.06) * 3 * (1 - cool) + Math.sin(t * 1.3 + xx * 0.13) * 2);
    ctx.lineTo(x + w, Math.max(sy + 30, H)); ctx.lineTo(x, Math.max(sy + 30, H)); ctx.closePath();
    const g = ctx.createLinearGradient(0, sy, 0, sy + 160);
    if (cool < 1) { g.addColorStop(0, `rgba(255,247,200,${1 - cool * 0.8})`); g.addColorStop(0.08, 'rgba(253,186,116,1)'); g.addColorStop(0.35, 'rgba(234,88,12,1)'); g.addColorStop(1, 'rgba(127,29,29,1)'); }
    else { g.addColorStop(0, '#2a1d1d'); g.addColorStop(1, '#100a0a'); }
    ctx.fillStyle = g; ctx.fill();
    if (cool > 0) { ctx.save(); ctx.globalAlpha = cool; ctx.fillStyle = 'rgba(20,14,14,0.92)'; ctx.fill(); ctx.restore();
      ctx.beginPath(); for (let i = 0; i < w / 40; i++) { const cx0 = x + 20 + i * 40; ctx.moveTo(cx0, sy + 4); ctx.lineTo(cx0 + 10, sy + 14); ctx.lineTo(cx0 + 4, sy + 26); } ctx.strokeStyle = EMBER(0.5 * cool); ctx.lineWidth = 1.4; ctx.stroke(); }
    // bolhas
    if (cool < 0.5) for (let i = 0; i < 6; i++) { const ph = (t * 0.6 + i * 0.37) % 1, bx = x + ((i * 97) % w); ctx.beginPath(); ctx.arc(bx, sy + 4 - ph * 6, 2 + ph * 3, Math.PI, 0); ctx.strokeStyle = `rgba(255,251,235,${(1 - ph) * 0.8})`; ctx.lineWidth = 1.2; ctx.stroke(); }
  },
});

/* ============================== OS PODERES DO FORTE: FIRE, HAMMER, CLOCK ============================== */
const FortPower = {
  balls: [], swingT: 0, swingCool: 0,
  reset() { this.balls = []; this.swingT = 0; this.swingCool = 0; },
  // FIRE: bolas de fogo que quicam pelo chão (até 2 de cada vez)
  fire() {
    if (Game.state !== 'play' || P.dead) return false;
    if (this.balls.length >= 2) return false;
    const f = P.facing; this.balls.push({ x: P.cx + f * 14, y: P.y + P.h * 0.42, vx: f * 330, vy: 140, life: 2.4, hit: new Set(), trail: [] });
    Power.shotT = 0.12; SFX.fireball(); return true;
  },
  // HAMMER: golpe de perto (derruba quem estiver na frente; quebra o ferro rachado)
  swing() {
    if (Game.state !== 'play' || P.dead || this.swingCool > 0) return false;
    this.swingT = 0.24; this.swingCool = 0.36; SFX.swing();
    const f = P.facing, box = { x: f > 0 ? P.x + P.w - 4 : P.x - 36, y: P.y + 2, w: 40, h: P.h - 2 };
    let hit = false;
    for (const e of Ents.list) {
      if (e.dead || !overlap(box, e)) continue;
      if (e.shootable) { if (Ents.types[e.type].shot(e, 3, { x: e.x + e.w / 2, y: e.y + e.h / 2, vx: f, vy: 0, big: true, hammer: true })) hit = true; continue; }
      if (!e.enemy || e.state === 'dying' || e.state === 'flat' || e.state === 'held') continue;
      hit = true;
      if (e.type === 'giant') { e.shake = 0.35; SFX.thud(); continue; }
      if (e.type === 'casco' && e.state === 'shell') { Ents.types.casco.kick(e, f); continue; }
      e.frozen = 0; e.plat = false; Enemy.kill(e, 'pop', f); SFX.crush();
      Ents.spawn('orb', { x: e.x + e.w / 2, y: e.y + e.h / 2, vx: f * 60, vy: -260, homing: true, delay: 0.25 });
    }
    // o ferro rachado na frente
    const c0 = Math.floor(box.x / TS), c1 = Math.floor((box.x + box.w - 1) / TS), r0 = Math.floor(box.y / TS), r1 = Math.floor((box.y + box.h - 1) / TS);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (World.type(c, r) === T.CRACKED) {
      World.tiles[r * World.w + c] = T.AIR; World.chunks.clear(); hit = true;
      SFX.crush(); SFX.glass(); Game.shake(4); FX.burst(c * TS + 16, r * TS + 16, 30, 'w', 280, { life: 0.8, g: 600 }); FX.burst(c * TS + 16, r * TS + 16, 16, 'm', 200, { life: 0.6, g: 300 });
    }
    if (hit) { Game.hitstop(3); Game.shake(2); }
    return true;
  },
  // CLOCK: o tempo para (pedras, olhos, ferro, plataformas e inimigos); depois o relógio se gasta
  stop() {
    if (Game.state !== 'play' || P.dead || Fort.freezeT > 0) return false;
    Fort.freezeT = POWERS.clock.time; P.power = null; SFX.clockStop(); Game.shake(2);
    for (const e of Ents.enemies()) if (e.type !== 'giant' && Math.abs(e.x - P.cx) < 20 * TS) { e.frozen = Math.max(e.frozen || 0, POWERS.clock.time); e.plat = true; e.dx = 0; e.dy = 0; e.vx = 0; }
    FX.burst(P.cx, P.cy, 50, 'c', 300, { life: 0.9, g: 0 });
    UI.msg('TIME STOP', 1400); return true;
  },
  update(dt) {
    if (this.swingT > 0) this.swingT -= dt;
    if (this.swingCool > 0) this.swingCool -= dt;
    for (const b of this.balls) {
      b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 6) b.trail.shift();
      b.vy = Math.min(b.vy + 1500 * dt, 600); b.life -= dt;
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      if (Power.wall(Math.floor(nx / TS), Math.floor(b.y / TS))) { b.life = 0; SFX.thud(); FX.burst(b.x, b.y, 10, 'w', 140, { life: 0.35, g: 200 }); continue; }
      if (b.vy > 0 && World.isFloor(Math.floor(nx / TS), Math.floor((ny + 6) / TS))) { b.vy = -330; b.y = Math.floor((ny + 6) / TS) * TS - 6; } else b.y = ny;
      b.x = nx;
      const box = { x: b.x - 8, y: b.y - 8, w: 16, h: 16 };
      for (const e of Ents.list) {
        if (e.dead || b.life <= 0) continue;
        if (e.shootable) { if (overlap(box, e) && Ents.types[e.type].shot(e, 1, Object.assign({ fire: true }, b))) b.life = 0; continue; }
        if (!e.enemy || b.hit.has(e) || e.state === 'dying' || e.state === 'flat' || e.state === 'held' || !overlap(box, e)) continue;
        b.hit.add(e); Power.hitEnemy(e, { vx: b.vx, big: false }); b.life = 0;
      }
      if (b.life <= 0) FX.burst(b.x, b.y, 12, 'w', 160, { life: 0.4, g: 200 });
    }
    this.balls = this.balls.filter(b => b.life > 0 && b.y < World.pxH);
  },
  drawFront(ctx, camX, camY, a) {
    const px = lerp(P.px, P.x, a) - camX, py = lerp(P.py, P.y, a) - camY, f = P.facing, t = Game.time;
    if (P.power === 'fire') { this.flameHand(ctx, px + P.w / 2 + f * 11, py + P.h * 0.42, t); return; }
    if (P.power === 'clock') { this.clockIcon(ctx, px + P.w / 2 - f * 14, py + 4 + Math.sin(t * 3) * 2, t, 0.8); return; }
    if (P.power !== 'hammer') return;
    // o martelo: em repouso no ombro; no golpe, um arco para a frente
    const k = this.swingT > 0 ? 1 - this.swingT / 0.24 : 0, ang = this.swingT > 0 ? -2.2 + k * 3.4 : -2.5;
    const hx = px + P.w / 2 + f * 4, hy = py + P.h * 0.45;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(f, 1); ctx.rotate(ang + Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.strokeStyle = '#c9b8a8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    rrect(ctx, -9, -36, 18, 12, 2); ctx.fillStyle = '#211b26'; ctx.fill(); ctx.strokeStyle = AMBER(0.8); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
    if (this.swingT > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(hx, hy, 34, f > 0 ? -1.4 : Math.PI + 1.4, f > 0 ? -1.4 + k * 2.6 : Math.PI + 1.4 - k * 2.6, f < 0);
      ctx.strokeStyle = `rgba(251,191,36,${(0.6 * (1 - k * 0.5)).toFixed(3)})`; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
    }
  },
  flameHand(ctx, x, y, t) { R.draw(Fort.glowA(24), x, y, 0.8, 0.7, true); Fort.flame(ctx, x, y + 4, 0.45, t); },
  clockIcon(ctx, x, y, t, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    R.draw(Fort.glowV(24), 0, 0, 1, 0.7, true);
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fillStyle = '#0d0a14'; ctx.fill(); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -5); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * 2) * 4, Math.sin(t * 2) * 4); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  },
  drawShots(ctx, camX, camY) {
    for (const b of this.balls) {
      b.trail.forEach((q, i) => R.draw(Fort.glowA(14), q.x - camX, q.y - camY, 0.4 + i * 0.12, 0.1 + i * 0.08, true));
      const x = b.x - camX, y = b.y - camY;
      R.draw(Fort.glowA(24), x, y, 1, 0.95, true);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff7ed'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 7.5, Game.time * 12, Game.time * 12 + 3.5); ctx.strokeStyle = EMBER(0.9); ctx.lineWidth = 2; ctx.stroke();
    }
  },
  // o ícone (bloco, Grimório, HUD)
  icon(ctx, kind) {
    if (kind === 'fire') { Fort.flame(ctx, 0, 6, 0.55, Game.time); return true; }
    if (kind === 'hammer') { ctx.save(); ctx.rotate(-0.6); ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -3); ctx.stroke(); rrect(ctx, -6, -8, 12, 6, 1.5); ctx.fill(); ctx.restore(); return true; }
    if (kind === 'clock') { ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -5); ctx.moveTo(0, 0); ctx.lineTo(4, 2); ctx.stroke(); return true; }
    return false;
  },
};

/* ============================== O FUNDO DO FORTE ==============================
   Céu violeta com aurora (faixas que ondulam), estrelas, a lua âmbar; lá longe as montanhas, a cidade acesa lá embaixo
   e o CASTELO no pico (a próxima fase); no meio, as torres do forte com janelas acesas e fumaça das forjas; por dentro
   (salão, galeria, torre), a parede de pedra com arcos e brasas. Brasas sobem o tempo todo. */
BG.makeFortFar = function () {
  const W = 1920, H = 700, s = R.make(W, H), x = s.x, rnd = mulberry32(31);
  // o céu já vem pintado aqui (uma camada a menos por quadro): degradê violeta, estrelas e a lua âmbar
  const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#070414'); sky.addColorStop(0.45, '#140a26'); sky.addColorStop(1, '#1d0b24');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,255,${(0.15 + rnd() * 0.45).toFixed(3)})`; const sz = 0.6 + rnd() * 1.3; x.fillRect(rnd() * W, rnd() * 420, sz, sz); }
  for (const mx of [1240]) {
    const my = 230, g = x.createRadialGradient(mx, my, 10, mx, my, 170); g.addColorStop(0, 'rgba(253,224,71,0.35)'); g.addColorStop(0.4, 'rgba(249,115,22,0.12)'); g.addColorStop(1, 'rgba(249,115,22,0)');
    x.fillStyle = g; x.fillRect(mx - 170, my - 170, 340, 340);
    x.beginPath(); x.arc(mx, my, 34, 0, Math.PI * 2); x.fillStyle = 'rgba(254,243,199,0.92)'; x.fill();
    x.beginPath(); x.arc(mx + 10, my - 6, 30, 0, Math.PI * 2); x.fillStyle = 'rgba(253,230,138,0.35)'; x.fill();
  }
  // montanhas em duas camadas
  for (const [base, amp, col, edge] of [[430, 150, '#0d0a1c', 'rgba(167,139,250,0.18)'], [520, 110, '#09070f', 'rgba(34,211,238,0.12)']]) {
    x.beginPath(); x.moveTo(0, H); let px = 0; x.lineTo(0, base);
    while (px < W) { px += 40 + rnd() * 90; x.lineTo(px, base - rnd() * amp); }
    x.lineTo(W, H); x.closePath(); x.fillStyle = col; x.fill(); x.strokeStyle = edge; x.lineWidth = 1; x.stroke();
  }
  // o castelo no pico (a próxima fase), com as janelas acesas
  const cx = 1380, top = 210;
  x.beginPath(); x.moveTo(cx - 120, 330); x.lineTo(cx + 120, 330); x.lineTo(cx + 140, 400); x.lineTo(cx - 140, 400); x.closePath(); x.fillStyle = '#0a0812'; x.fill();
  for (const [dx, w, h] of [[-90, 26, 120], [-40, 34, 170], [10, 44, 210], [70, 30, 140], [110, 20, 100]]) {
    const tx = cx + dx, ty = 330 - h;
    x.beginPath(); x.moveTo(tx, 330); x.lineTo(tx, ty); x.lineTo(tx + w / 2, ty - w * 1.1); x.lineTo(tx + w, ty); x.lineTo(tx + w, 330); x.closePath();
    x.fillStyle = '#0b0914'; x.fill(); x.strokeStyle = 'rgba(217,70,239,0.25)'; x.lineWidth = 1; x.stroke();
    for (let yy = ty + 16; yy < 320; yy += 26) if (rnd() < 0.6) { x.fillStyle = rnd() < 0.5 ? 'rgba(251,191,36,0.55)' : 'rgba(217,70,239,0.5)'; x.fillRect(tx + w / 2 - 2, yy, 4, 8); }
  }
  void top;
  // a cidade lá embaixo: milhares de luzinhas
  for (let i = 0; i < 900; i++) {
    const px = rnd() * W, py = 560 + rnd() * 140, c = rnd();
    x.fillStyle = c < 0.55 ? `rgba(122,216,255,${0.25 + rnd() * 0.4})` : c < 0.8 ? `rgba(232,121,249,${0.25 + rnd() * 0.4})` : `rgba(251,191,36,${0.3 + rnd() * 0.4})`;
    x.fillRect(px, py, 1.5 + rnd() * 1.5, 1.5);
  }
  const hz = x.createLinearGradient(0, 520, 0, H); hz.addColorStop(0, 'rgba(34,211,238,0)'); hz.addColorStop(1, 'rgba(217,70,239,0.16)');
  x.fillStyle = hz; x.fillRect(0, 520, W, H - 520);
  return s;
};
BG.makeFortMid = function () {
  const W = 1600, H = 900, s = R.make(W, H), x = s.x, rnd = mulberry32(77);
  let px = -30;
  while (px < W) {
    const w = 70 + rnd() * 90, top = 260 + rnd() * 260, round = rnd() < 0.5;
    // torre: corpo, ameias ou telhado cônico, janelas acesas (âmbar), bandeira
    x.fillStyle = '#0c0a11'; x.fillRect(px, top, w, H - top); x.strokeStyle = 'rgba(167,139,250,0.14)'; x.lineWidth = 1; x.strokeRect(px + 0.5, top + 0.5, w - 1, H - top);
    if (round) { x.beginPath(); x.moveTo(px - 8, top); x.lineTo(px + w / 2, top - w * 0.9); x.lineTo(px + w + 8, top); x.closePath(); x.fillStyle = '#0e0b14'; x.fill(); x.strokeStyle = 'rgba(217,70,239,0.25)'; x.stroke();
      x.beginPath(); x.moveTo(px + w / 2, top - w * 0.9); x.lineTo(px + w / 2, top - w * 0.9 - 30); x.stroke();
      x.beginPath(); x.moveTo(px + w / 2, top - w * 0.9 - 30); x.lineTo(px + w / 2 + 22, top - w * 0.9 - 25); x.lineTo(px + w / 2, top - w * 0.9 - 20); x.fillStyle = 'rgba(217,70,239,0.55)'; x.fill(); }
    else for (let mx = px; mx < px + w - 8; mx += 16) { x.fillStyle = '#0c0a11'; x.fillRect(mx, top - 12, 10, 12); x.strokeStyle = 'rgba(34,211,238,0.12)'; x.strokeRect(mx + 0.5, top - 11.5, 9, 11); }
    for (let yy = top + 30; yy < H - 60; yy += 44) for (let xx = px + 14; xx < px + w - 14; xx += 24) if (rnd() < 0.35) {
      ogivePath(x, xx, yy, 9, 18); x.fillStyle = rnd() < 0.7 ? `rgba(251,191,36,${0.25 + rnd() * 0.3})` : 'rgba(217,70,239,0.35)'; x.fill();
    }
    // chaminé de forja
    if (rnd() < 0.3) { x.fillStyle = '#0d0a10'; x.fillRect(px + w * 0.6, top - 70, 16, 70); x.fillStyle = 'rgba(249,115,22,0.35)'; x.fillRect(px + w * 0.6 + 2, top - 72, 12, 3); }
    px += w + 20 + rnd() * 60;
  }
  // pontes e correntes entre as torres
  x.beginPath(); for (let i = 0; i < 6; i++) { const a = rnd() * W, b = a + 160 + rnd() * 220, y0 = 360 + rnd() * 200; x.moveTo(a, y0); x.quadraticCurveTo((a + b) / 2, y0 + 40, b, y0); } x.strokeStyle = 'rgba(200,190,215,0.12)'; x.lineWidth = 1.4; x.stroke();
  return s;
};
BG.makeFortWall = function () {
  const W = 1024, H = 640, s = R.make(W, H), x = s.x, rnd = mulberry32(13);
  x.fillStyle = '#0a080d'; x.fillRect(0, 0, W, H);
  // blocos grandes de pedra
  for (let y = 0; y < H; y += 40) for (let xx = -((y / 40) % 2) * 40; xx < W; xx += 80) {
    const t = 11 + Math.floor(rnd() * 5); x.fillStyle = `rgb(${t + 2},${t},${t + 6})`; x.fillRect(xx + 1, y + 1, 78, 38);
    x.fillStyle = 'rgba(255,236,214,0.025)'; x.fillRect(xx + 1, y + 1, 78, 2);
  }
  // arcos góticos fundos, com brasas lá dentro
  for (let i = 0; i < 4; i++) {
    const ax = 60 + i * 256, aw = 130, ay = 200;
    ogivePath(x, ax, ay, aw, 440); x.fillStyle = '#050407'; x.fill(); x.strokeStyle = 'rgba(167,139,250,0.2)'; x.lineWidth = 2; x.stroke();
    const g = x.createRadialGradient(ax + aw / 2, ay + 420, 10, ax + aw / 2, ay + 420, 160); g.addColorStop(0, 'rgba(249,115,22,0.28)'); g.addColorStop(1, 'rgba(249,115,22,0)');
    x.fillStyle = g; x.fillRect(ax - 40, ay + 200, aw + 80, 260);
    // colunas entre os arcos
    x.fillStyle = '#0d0b11'; x.fillRect(ax + aw + 50, 0, 28, H); x.strokeStyle = 'rgba(251,191,36,0.1)'; x.strokeRect(ax + aw + 50.5, -1, 27, H + 2);
  }
  return s;
};
// desenha só o pedaço da imagem que aparece na tela (as camadas do fundo são bem maiores que ela)
BG.blitPart = function (ctx, s, dx, dy, dw, dh) {
  const W = CFG.VIEW_W, H = CFG.VIEW_H, x0 = Math.max(0, dx), y0 = Math.max(0, dy), x1 = Math.min(W, dx + dw), y1 = Math.min(H, dy + dh);
  if (x1 <= x0 || y1 <= y0) return;
  const kx = s.c.width / dw, ky = s.c.height / dh;
  ctx.drawImage(s.c, (x0 - dx) * kx, (y0 - dy) * ky, (x1 - x0) * kx, (y1 - y0) * ky, x0, y0, x1 - x0, y1 - y0);
};
// a aurora em meia resolução (pesa um quarto), refeita a cada 2 quadros
BG.fortAurora = function (time, camY) {
  const W = CFG.VIEW_W, A = this.aurora || (this.aurora = { s: R.make(W / 2, 160), n: 0 });
  if (A.n++ % 2) return A.s;
  const x = A.s.x; x.clearRect(0, 0, W / 2, 160); x.save(); x.scale(0.5, 0.5); x.globalCompositeOperation = 'lighter';
  for (const [i, col] of [[0, '45,212,191'], [1, '167,139,250'], [2, '217,70,239']]) {
    const base = 60 + i * 46 - camY * 0.03, ph = time * (0.25 + i * 0.07) + i * 2;
    x.beginPath();
    for (let xx = -20; xx <= W + 20; xx += 24) { const y = base + Math.sin(xx * 0.006 + ph) * 34 + Math.sin(xx * 0.017 - ph * 1.7) * 12; if (xx === -20) x.moveTo(xx, y); else x.lineTo(xx, y); }
    for (let xx = W + 20; xx >= -20; xx -= 24) { const y = base + 70 + Math.sin(xx * 0.006 + ph + 0.4) * 40 + Math.sin(xx * 0.013 + ph) * 10; x.lineTo(xx, y); }
    x.closePath();
    const g = x.createLinearGradient(0, base - 40, 0, base + 120); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.45, `rgba(${col},${0.11 + 0.04 * Math.sin(time + i)})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.fill();
  }
  x.restore();
  return A.s;
};
BG.drawFort = function (ctx, camX, camY, time) {
  if (!this.fortFar) { this.fortFar = this.makeFortFar(); this.fortMid = this.makeFortMid(); this.fortWall = this.makeFortWall(); this.fortStars = []; const rnd = mulberry32(5); for (let i = 0; i < 120; i++) this.fortStars.push({ x: rnd() * 960, y: rnd() * 360, s: 0.5 + rnd() * 1.2, p: rnd() * 6 }); }
  const W = CFG.VIEW_W, H = CFG.VIEW_H;
  // por dentro do forte (salão, galeria, torre) a parede cobre o céu: aí o céu nem é desenhado
  const cc = (camX + W / 2) / TS, kin = clamp(Math.min(cc - 44, 225 - cc) / 8, 0, 1);
  if (kin < 0.999) {
    // longe (com o céu, as estrelas e a lua já pintados): montanhas, a cidade lá embaixo e o castelo
    const fW = 1920, fx = -((camX * 0.06) % fW), fy = -120 - camY * 0.08;
    this.blitPart(ctx, this.fortFar, fx, fy, fW, 700); this.blitPart(ctx, this.fortFar, fx + fW, fy, fW, 700);
    // a aurora (três faixas que ondulam: verde-água, violeta, magenta) e algumas estrelas que piscam
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.fortAurora(time, camY).c, 0, 10, W, 320);
    for (let i = 0; i < 24; i++) { const s = this.fortStars[i], tw = Math.max(0, Math.sin(time * 1.3 + s.p)); if (tw > 0.2) { ctx.fillStyle = `rgba(255,255,255,${(0.7 * tw).toFixed(3)})`; ctx.fillRect(((s.x - camX * 0.02) % W + W) % W, s.y * 0.5 - camY * 0.02, 1.6, 1.6); } }
    ctx.restore();
    // no meio: as torres do forte
    const mW = 1600, mx2 = -((camX * 0.22) % mW), my2 = 120 - camY * 0.2;
    this.blitPart(ctx, this.fortMid, mx2, my2, mW, 900); this.blitPart(ctx, this.fortMid, mx2 + mW, my2, mW, 900);
  }
  // por baixo da terra (o esgoto): pedra escura com limo, presa ao mundo
  for (const [c0, r0, c1, r1] of World.level.caves || []) {
    const x0 = c0 * TS - camX, y0 = r0 * TS - camY, w = (c1 - c0 + 1) * TS, h = (r1 - r0 + 1) * TS;
    if (x0 > W || x0 + w < 0 || y0 > H || y0 + h < 0) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.drawImage(this.fortWall.c, x0 - ((c0 * TS) % 1024), y0 - 200, 1024, 640); ctx.drawImage(this.fortWall.c, x0 - ((c0 * TS) % 1024) + 1024, y0 - 200, 1024, 640);
    ctx.fillStyle = 'rgba(4,10,8,0.55)'; ctx.fillRect(x0, y0, w, h);
    const g = ctx.createLinearGradient(0, y0 + h - 40, 0, y0 + h); g.addColorStop(0, 'rgba(52,211,153,0)'); g.addColorStop(1, 'rgba(52,211,153,0.14)');
    ctx.fillStyle = g; ctx.fillRect(x0, y0 + h - 40, w, 40); ctx.restore();
  }
  // a parede de pedra de dentro do forte aparece aos poucos na porta
  if (kin > 0) {
    ctx.save(); ctx.globalAlpha = kin;
    const wW = 1024, wx = -((camX * 0.5) % wW), wy = -((camY * 0.5) % 640) - 40;
    for (let ox = wx; ox < W; ox += wW) for (let oy = wy; oy < H; oy += 640) this.blitPart(ctx, this.fortWall, ox, oy, wW, 640);
    ctx.restore();
  }
  // brasas subindo
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gA = Fort.glowA(6);
  for (let i = 0; i < 32; i++) {
    const sp = 18 + (i * 37) % 30, x = ((i * 211.7 - camX * 0.7 + Math.sin(time * 0.8 + i) * 20) % W + W) % W, y = ((H - ((time * sp + i * 97) % (H + 40))) - camY * 0.05 + 40);
    R.draw(gA, x, y, 0.6 + (i % 3) * 0.3, 0.35 + 0.3 * Math.sin(time * 3 + i), true);
  }
  ctx.restore();
};
