
/* ============================== WORLD 1-3 · WHERE IS IT? · as peças da cidade ==============================
   A CAIXA DE NEON (alvo 'box': voa até o lugar que a frase disser e vira chão ali), a GÁRGULA, o TREM do monotrilho,
   o MAPA DA CIDADE, letreiros e enfeites, os prédios com janelas e profundidade (o terreno da cidade), a chuva e os
   raios, a chegada (CityIntro), o desafio do mapa (CityMap, no painel do Baú) e a BÚSSOLA DAS PALAVRAS
   (o acréscimo ao Coração; CompassScene, na pegada God of War: a chuva para no ar, o raio, a agulha). */

const City = {
  rainT: 0, freeze: false, flash: 0, bolt: null, nextBolt: 5, metGargoyle: false, metMap: false, drops: [], roofs: null,
  reset() { this.freeze = false; this.flash = 0; this.bolt = null; this.metGargoyle = false; this.metMap = false; this.roofs = null; },
  // entrando na cidade: a chegada (1ª visita) com a tabela das preposições; depois só a Echo apontando a caixa
  enter(viaTransition) {
    this.reset();
    if (Game.noIntro) return;
    if (!Save.data.met.city) setTimeout(() => { if (Game.state === 'play' && World.level.id === '1-3' && !Game.scene()) CityIntro.start(); }, viaTransition ? 0 : 50);
    else Game.later(1.2, () => Echo.talk(ECHO.lines.city));
  },

  /* ---------- a CAIXA: cada lugar (spot) é uma posição com nome; ela voa de um para o outro ---------- */
  initBox(t) { t.c = 0; t.r = 0; t.anchor = 'left'; t.cur = { w: 0, h: 0 }; t.fly = null; t.ping = 0; this.land(t, t.state, true); },
  rectOf(t, k) { const s = t.spots[k]; return { x: s.c * TS, y: (s.r - t.h + 1) * TS, w: t.w * TS, h: t.h * TS }; },
  // pousou: vira chão (se não está atrás de nada) e empurra quem estiver no lugar para cima
  land(t, k, instant) {
    const s = t.spots[k]; t.state = k; t.c = s.c; t.r = s.r; t.fly = null;
    if (!s.back) World.applyRune(t, { w: t.w, h: t.h }, instant);
    if (instant) return;
    const rc = this.rectOf(t, k);
    SFX.boxLand(); Game.shake(s.back ? 1 : 3);
    FX.burst(rc.x + rc.w / 2, rc.y + rc.h, 26, 'c', 220, { life: 0.7, g: 0 });
    if (s.say && Game.echoBorn) Game.later(0.3, () => Echo.talk([s.say]));
  },
  // a frase mandou a caixa para outro lugar: ela sai do chão (o lugar antigo fica vazio) e voa em arco
  moveBox(id, k) {
    const t = World.targets[id]; if (!t || t.kind !== 'box' || !t.spots[k]) return false;
    if (t.state === k) { t.shake = 0.9; SFX.thud(); return false; }
    const from = t.fly ? this.flyPos(t) : this.rectOf(t, t.state);
    if (t.cur.w) World.applyRune(t, { w: 0, h: 0 }, true);
    const to = this.rectOf(t, k), d = Math.hypot(to.x - from.x, to.y - from.y);
    t.fly = { x0: from.x, y0: from.y, x1: to.x, y1: to.y, k: 0, dur: 0.55 + d / 1100, arc: 50 + Math.min(160, d * 0.25), to: k };
    t.state = k; t.glow = 1; t.ping = 0; SFX.boxFly();
    return true;
  },
  flyPos(t) {
    const f = t.fly, e = f.k < 0.5 ? 2 * f.k * f.k : 1 - Math.pow(-2 * f.k + 2, 2) / 2;
    return { x: lerp(f.x0, f.x1, e), y: lerp(f.y0, f.y1, e) - Math.sin(f.k * Math.PI) * f.arc, w: t.w * TS, h: t.h * TS };
  },
  updateBox(t, dt) {
    if (!t.fly) return;
    t.fly.k = Math.min(1, t.fly.k + dt / t.fly.dur);
    if (Math.random() < 0.6) { const p = this.flyPos(t); FX.add(p.x + Math.random() * p.w, p.y + p.h, { vy: 20, vx: (Math.random() - 0.5) * 30, life: 0.5, size: 1.4, c: 'c', g: 0 }); }
    if (t.fly.k >= 1) this.land(t, t.fly.to);
  },
  // o pulso da Echo acha a caixa escondida (atrás de algo): o contorno aparece e ela diz onde está
  ping() {
    let said = false;
    for (const id in World.targets) {
      const t = World.targets[id]; if (t.kind !== 'box' || t.fly) continue;
      const s = t.spots[t.state]; if (!s.back) continue;
      const rc = this.rectOf(t, t.state), dx = clamp(Echo.x, rc.x, rc.x + rc.w) - Echo.x, dy = clamp(Echo.y, rc.y, rc.y + rc.h) - Echo.y;
      if (Math.hypot(dx, dy) > EchoPulse.R) continue;
      t.ping = 3.5; Hints.mark('boxping');
      if (s.find && !t.found && !said) { t.found = true; said = true; Echo.talk([s.find]); }
    }
    return said;
  },
  // o cubo de neon, com a face de cima e a do lado (o passo a mais rumo ao 3D)
  drawCube(ctx, x, y, w, h, time, o = {}) {
    const d = 9, p = 0.5 + 0.5 * Math.sin(time * 2.4 + x * 0.01);
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    R.draw(R.glow('c', 48), x + w / 2, y + h / 2, 1.6, 0.25 + 0.15 * p + (o.glow || 0) * 0.5, true);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w, y); ctx.closePath();
    ctx.fillStyle = 'rgba(34,211,238,0.16)'; ctx.fill(); ctx.strokeStyle = ca(0.7); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w + d, y + h - d); ctx.lineTo(x + w, y + h); ctx.closePath();
    ctx.fillStyle = 'rgba(6,30,38,0.92)'; ctx.fill(); ctx.strokeStyle = ca(0.45); ctx.stroke();
    rrect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 4); ctx.fillStyle = 'rgba(8,16,20,0.96)'; ctx.fill(); ctx.fillStyle = ca(0.06 + 0.05 * p + (o.glow || 0) * 0.2); ctx.fill();
    ctx.strokeStyle = 'rgba(165,243,252,0.95)'; ctx.lineWidth = 1.4; ctx.stroke();
    rrect(ctx, x + 6, y + 6, w - 12, h - 12, 3); ctx.strokeStyle = ca(0.3); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + w - 6, y + h - 6); ctx.moveTo(x + w - 6, y + 6); ctx.lineTo(x + 6, y + h - 6); ctx.strokeStyle = ca(0.12); ctx.stroke();
    R.draw(R.text('BOX', '900 13px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,1)', 7), x + w / 2, y + h / 2 + 1, 1, 0.85 + 0.15 * p);
    ctx.restore();
  },
  // antes do terreno: as caixas escondidas atrás de algo (o prédio e os letreiros as cobrem) e o trilho do trem
  drawBack(ctx, camX, camY, time) {
    for (const e of Ents.list) if (e.type === 'train') Ents.types.train.drawRail(ctx, e, camX, camY);
    for (const id in World.targets) {
      const t = World.targets[id]; if (t.kind !== 'box' || t.fly || !t.spots[t.state].back) continue;
      const rc = this.rectOf(t, t.state); this.drawCube(ctx, rc.x - camX, rc.y - camY, rc.w, rc.h, time, { alpha: 0.8 });
    }
  },
  // depois dos letreiros: as caixas à vista, a que está voando e o contorno da escondida que o pulso achou
  drawFront(ctx, camX, camY, time) {
    for (const id in World.targets) {
      const t = World.targets[id]; if (t.kind !== 'box') continue;
      const back = !t.fly && t.spots[t.state].back, rc = t.fly ? this.flyPos(t) : this.rectOf(t, t.state);
      const sx = t.shake > 0 ? Math.sin(time * 60) * 2.5 * t.shake : 0, x = rc.x - camX + sx, y = rc.y - camY;
      if (x > CFG.VIEW_W + 60 || x + rc.w < -60 || y > CFG.VIEW_H + 60 || y + rc.h < -60) continue;
      if (!back) this.drawCube(ctx, x, y, rc.w, rc.h, time, { glow: t.glow });
      else if (t.ping > 0) {
        const a = Math.min(1, t.ping) * (0.6 + 0.4 * Math.sin(time * 9));
        ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -time * 14;
        rrect(ctx, x + 2, y + 2, rc.w - 4, rc.h - 4, 5); ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
        R.draw(R.text('BOX', '900 12px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,1)', 6), x + rc.w / 2, y + rc.h / 2, 1, a);
      }
      if (t.shake > 0) R.draw(R.text('?', '900 18px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,1)', 6), x + rc.w / 2, y - 18, 1, t.shake);
    }
  },

  /* ---------- o terreno da cidade: prédios com janelas, telhado com face de cima e lateral (profundidade) ---------- */
  hash(c, r) { let h = (c * 374761393 + r * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; },
  drawSolid(x, c, r, x0, y0) {
    const W = World, S = (cc, rr) => { const t = W.type(cc, rr); return t === T.SOLID || t === T.FAKE; };
    const up = r > 0 && S(c, r - 1), lf = S(c - 1, r), rt = S(c + 1, r);
    let d = 0; while (d < 40 && S(c, r - d - 1)) d++;   // quantos blocos de prédio há acima (0 = telhado)
    const b = Math.floor(c / 7), tone = 6 + Math.floor(this.hash(b, 3) * 4);
    x.fillStyle = `rgb(${tone - 1},${tone},${tone + 5})`; x.fillRect(x0 - (lf ? 0.5 : 0), y0 - (up ? 0.5 : 0), TS + (lf ? 0.5 : 0) + (rt ? 0.5 : 0), TS + 1);
    if (!up) {
      // face de cima do telhado (vista um pouco de cima) e a laje com a borda ciano
      x.beginPath(); x.moveTo(x0 - (lf ? 1 : 0), y0); x.lineTo(x0 + 5 - (lf ? 1 : 0), y0 - 5); x.lineTo(x0 + TS + 5 + (rt ? 1 : 0), y0 - 5); x.lineTo(x0 + TS + (rt ? 1 : 0), y0); x.closePath();
      x.fillStyle = 'rgba(34,211,238,0.10)'; x.fill();
      x.beginPath(); x.moveTo(x0 + 5 - (lf ? 1 : 0), y0 - 4.5); x.lineTo(x0 + TS + 5 + (rt ? 1 : 0), y0 - 4.5); x.strokeStyle = ca(0.22); x.lineWidth = 1; x.stroke();
      const g = x.createLinearGradient(0, y0, 0, y0 + 14); g.addColorStop(0, ca(0.16)); g.addColorStop(1, ca(0));
      x.fillStyle = g; x.fillRect(x0, y0, TS, 14);
      x.beginPath(); x.moveTo(x0 - (lf ? 1 : 0), y0 + 0.5); x.lineTo(x0 + TS + (rt ? 1 : 0), y0 + 0.5); x.strokeStyle = ca(0.62); x.stroke();
      x.beginPath(); x.moveTo(x0, y0 + 7.5); x.lineTo(x0 + TS, y0 + 7.5); x.strokeStyle = wa(0.06); x.stroke();
    } else if (d >= 1) {
      // janelas: a maioria escura (vidro com reflexo), algumas acesas em ciano, raras em magenta
      const h = this.hash(c, r), wx = x0 + 9, wy = y0 + 7;
      if (h < 0.17) {
        const gg = x.createLinearGradient(0, wy, 0, wy + 18); gg.addColorStop(0, 'rgba(122,216,255,0.42)'); gg.addColorStop(1, 'rgba(34,211,238,0.14)');
        x.fillStyle = gg; x.fillRect(wx, wy, 14, 18);
      } else if (h < 0.2) { x.fillStyle = 'rgba(232,121,249,0.32)'; x.fillRect(wx, wy, 14, 18); }
      else { x.fillStyle = 'rgba(20,28,36,0.9)'; x.fillRect(wx, wy, 14, 18); x.beginPath(); x.moveTo(wx + 2, wy + 15); x.lineTo(wx + 11, wy + 3); x.strokeStyle = wa(0.05); x.stroke(); }
      x.strokeStyle = wa(0.07); x.lineWidth = 1; x.strokeRect(wx + 0.5, wy + 0.5, 13, 17);
    }
    // a lateral do prédio (do lado direito, em perspectiva) e a borda esquerda
    if (!rt) {
      x.beginPath(); x.moveTo(x0 + TS, y0 + (up ? 0 : 0)); x.lineTo(x0 + TS + 5, y0 - (up ? 0 : 5)); x.lineTo(x0 + TS + 5, y0 + TS - 5); x.lineTo(x0 + TS, y0 + TS); x.closePath();
      x.fillStyle = 'rgba(14,20,26,0.95)'; x.fill(); x.strokeStyle = ca(0.08); x.stroke();
    }
    if (!lf) { x.beginPath(); x.moveTo(x0 + 0.5, y0); x.lineTo(x0 + 0.5, y0 + TS); x.strokeStyle = wa(0.09); x.stroke(); }
    // emendas entre prédios vizinhos (a cada 7 colunas um prédio novo, com cornija)
    if (lf && c % 7 === 0 && d >= 1) { x.beginPath(); x.moveTo(x0 + 0.5, y0); x.lineTo(x0 + 0.5, y0 + TS); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.stroke(); }
    if (d === 1) { x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(x0, y0, TS, 3); }
  },

  /* ---------- chuva, raios e respingos nos telhados ---------- */
  tick(dt) {
    if (!this.drops.length) { const rnd = mulberry32(5); for (let i = 0; i < 170; i++) this.drops.push({ x: rnd() * 1100, y: rnd() * 640, l: 8 + rnd() * 16, v: 560 + rnd() * 420, z: rnd() }); }
    if (!this.roofs) { this.roofs = []; for (let c = 0; c < World.w; c++) { let r = 0; while (r < World.h && World.type(c, r) !== T.SOLID) r++; this.roofs.push(r < World.h ? r : -1); } }
    if (this.freeze) return;
    this.rainT += dt;
    this.flash = Math.max(0, this.flash - dt * 2.2);
    if (this.bolt) { this.bolt.t -= dt; if (this.bolt.t <= 0) this.bolt = null; }
    this.nextBolt -= dt;
    if (this.nextBolt <= 0 && Game.state === 'play') { this.nextBolt = 7 + Math.random() * 9; this.strike(); }
    if (Game.state === 'play') for (let i = 0; i < 2; i++) {
      const c = Math.floor((Cam.x + Math.random() * CFG.VIEW_W) / TS), r = this.roofs[c];
      if (r > 0) FX.add(c * TS + Math.random() * TS, r * TS, { vy: -50 - Math.random() * 50, vx: (Math.random() - 0.5) * 50, life: 0.22, size: 0.9, c: 'c', g: 700 });
    }
  },
  // um raio no céu: clarão, o desenho do raio e o trovão logo depois
  strike(x) {
    const rnd = Math.random, bx = x != null ? x : 120 + rnd() * 720, pts = [[bx, -10]];
    let px = bx; for (let y = 30; y < 300; y += 26 + rnd() * 22) { px += (rnd() - 0.5) * 60; pts.push([px, y]); }
    this.bolt = { pts, t: 0.35 }; this.flash = 1;
    setTimeout(() => { if (Game.where === 'level' && World.level.bg === 'city') SFX.thunder(0.6 + Math.random() * 0.4); }, 250 + Math.random() * 700);
  },
  drawRain(ctx, camX, camY, layer) {
    const front = layer === 'front', T0 = this.rainT;
    ctx.save(); ctx.lineWidth = front ? 1.2 : 0.8; ctx.beginPath();
    for (const d of this.drops) {
      if (front !== d.z >= 0.7) continue;
      const par = 0.15 + d.z * 0.7;
      const x = ((d.x - camX * par - T0 * d.v * 0.22) % 1100 + 1100) % 1100 - 70, y = ((d.y + T0 * d.v - camY * par) % 640 + 640) % 640 - 50;
      const l = this.freeze ? 3 : d.l * (front ? 1.4 : 1);
      ctx.moveTo(x, y); ctx.lineTo(x - l * 0.22, y + l);
    }
    ctx.strokeStyle = front ? 'rgba(165,243,252,0.16)' : 'rgba(122,216,255,0.13)'; ctx.stroke(); ctx.restore();
  },
  drawBolt(ctx) {
    if (!this.bolt) return;
    const a = clamp(this.bolt.t / 0.35, 0, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath();
    this.bolt.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = `rgba(165,243,252,${(0.5 * a).toFixed(3)})`; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${(0.95 * a).toFixed(3)})`; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  },

  /* ---------- letreiros, outdoor, etiquetas e enfeites dos telhados ---------- */
  neonText(ctx, text, x, y, size, col, glow, a = 1) { R.draw(R.text(text, `800 ${size}px Orbitron, Inter, sans-serif`, col, glow, Math.round(size * 0.7)), x, y, 1, a); },
  flick(e) { const t = e.t + e.c * 1.7; return (t % 7.3 < 0.12 || (t % 11.1 > 5 && t % 11.1 < 5.08)) ? 0.35 : 1; },
  tag(ctx, text, x, y) {
    const s = R.text(text, '700 9px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,0.9)', 5);
    capsulePath(ctx, x, y, s.w - 8, 16); ctx.fillStyle = 'rgba(2,6,8,0.82)'; ctx.fill(); ctx.strokeStyle = ca(0.65); ctx.lineWidth = 1; ctx.stroke();
    R.draw(s, x, y + 0.5);
  },
  drawDecor(ctx, e, x, y) {
    const o = e.opts, k = o.kind, t = e.t, w = (o.w || 1) * TS, h = (o.h || 1) * TS;
    if (k === 'sign') {
      // a placa (o topo dela é a plataforma onde se anda); pernas até o telhado ou braços até o muro
      ctx.strokeStyle = wa(0.22); ctx.lineWidth = 2; ctx.beginPath();
      if (o.legs) for (const lx of [x + 10, x + w - 10]) { ctx.moveTo(lx, y + h); ctx.lineTo(lx, o.legs * TS - (e.y - y)); }
      if (o.bracket) for (const ly of [y + 8, y + h - 8]) { ctx.moveTo(x + w, ly); ctx.lineTo(o.bracket * TS - (e.x - x), ly - 6); }
      ctx.stroke();
      rrect(ctx, x + 1, y + 2, w - 2, h - 3, 5); ctx.fillStyle = 'rgba(4,6,9,0.97)'; ctx.fill(); ctx.strokeStyle = ca(0.45); ctx.lineWidth = 1; ctx.stroke();
      const f = this.flick(e);
      R.draw(R.glow('c', 48), x + w / 2, y + h / 2, w / 70, 0.28 * f, true);
      this.neonText(ctx, o.text, x + w / 2, y + h / 2 + 2, o.w >= 5 ? 22 : 17, '#ffffff', 'rgba(34,211,238,1)', f);
      if (o.tag) this.tag(ctx, o.tag, x + 26, y - 14);
    } else if (k === 'billboard') {
      // o outdoor gigante: moldura de ferro, refletores embaixo, letreiro principal e a rua de baixo
      rrect(ctx, x - 4, y - 4, w + 8, h + 8, 6); ctx.fillStyle = 'rgba(3,5,7,0.98)'; ctx.fill(); ctx.strokeStyle = wa(0.2); ctx.lineWidth = 1.5; ctx.stroke();
      rrect(ctx, x + 8, y + 8, w - 16, h - 16, 6); ctx.fillStyle = 'rgba(6,14,18,0.98)'; ctx.fill(); ctx.strokeStyle = ca(0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); for (let i = 1; i < 6; i++) { ctx.moveTo(x + 8, y + 8 + i * (h - 16) / 6); ctx.lineTo(x + w - 8, y + 8 + i * (h - 16) / 6); } ctx.strokeStyle = ca(0.04); ctx.stroke();
      const f = this.flick(e), p = 0.5 + 0.5 * Math.sin(t * 1.7);
      R.draw(R.glow('c', 64), x + w / 2, y + h * 0.42, w / 80, 0.3 * f, true);
      this.neonText(ctx, o.text, x + w / 2, y + h * 0.4, 30, '#ffffff', 'rgba(34,211,238,1)', f);
      this.neonText(ctx, o.sub, x + w / 2, y + h * 0.62, 12, '#f0abfc', 'rgba(217,70,239,0.9)', 0.6 + 0.4 * p);
      // uma caixinha de neon desenhada no anúncio (a pista: a caixa mora por aqui)
      ctx.save(); ctx.globalAlpha = 0.55 + 0.25 * p; this.drawCube(ctx, x + w / 2 - 14, y + h * 0.74, 28, 22, t); ctx.restore();
      for (const lx of [x + w * 0.2, x + w * 0.8]) {
        ctx.beginPath(); ctx.moveTo(lx - 6, y + h + 6); ctx.lineTo(lx + 6, y + h + 6); ctx.lineTo(lx, y + h - 2); ctx.closePath(); ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = ca(0.5); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x + 20, y - 4); ctx.lineTo(x + 30, y - 22); ctx.lineTo(x + w - 30, y - 22); ctx.lineTo(x + w - 20, y - 4); ctx.strokeStyle = wa(0.12); ctx.stroke();
      if (o.tag) this.tag(ctx, o.tag, x + 30, y + 22);
    } else if (k === 'tag') this.tag(ctx, o.text, x + w / 2, y + 16);
    else if (k === 'neon') {
      if (o.post) { ctx.beginPath(); ctx.moveTo(x + w / 2, y + 28); ctx.lineTo(x + w / 2, o.post * TS - (e.y - y)); ctx.strokeStyle = wa(0.18); ctx.lineWidth = 2; ctx.stroke(); }
      const f = this.flick(e);
      rrect(ctx, x + 2, y + 4, w - 4, 24, 6); ctx.fillStyle = 'rgba(4,6,9,0.9)'; ctx.fill(); ctx.strokeStyle = ca(0.35 * f); ctx.lineWidth = 1; ctx.stroke();
      const mag = o.text.length % 3 === 0;
      R.draw(R.glow(mag ? 'm' : 'c', 32), x + w / 2, y + 16, w / 60, 0.25 * f, true);
      this.neonText(ctx, o.text, x + w / 2, y + 17, 12, '#ffffff', mag ? 'rgba(217,70,239,1)' : 'rgba(34,211,238,1)', f);
    } else if (k === 'vneon') {
      const f = this.flick(e), n = o.text.length;
      rrect(ctx, x + 6, y, 22, n * 20 + 10, 6); ctx.fillStyle = 'rgba(4,6,9,0.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(217,70,239,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      R.draw(R.glow('m', 32), x + 17, y + n * 10 + 5, 0.9, 0.22 * f, true);
      for (let i = 0; i < n; i++) this.neonText(ctx, o.text[i], x + 17, y + 15 + i * 20, 13, '#ffffff', 'rgba(217,70,239,1)', f);
    } else if (k === 'tank') {
      const by = y + TS;
      ctx.strokeStyle = wa(0.16); ctx.lineWidth = 1.5; ctx.beginPath(); for (const lx of [x + 6, x + 26]) { ctx.moveTo(lx, by); ctx.lineTo(lx, by - 22); } ctx.stroke();
      rrect(ctx, x + 1, by - 52, 30, 32, [10, 10, 3, 3]); ctx.fillStyle = 'rgba(7,9,12,0.96)'; ctx.fill(); ctx.strokeStyle = wa(0.2); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 1, by - 36); ctx.lineTo(x + 31, by - 36); ctx.strokeStyle = ca(0.2); ctx.stroke();
    } else if (k === 'antenna') {
      const by = y + TS;
      ctx.beginPath(); ctx.moveTo(x + 16, by); ctx.lineTo(x + 16, by - 70); ctx.moveTo(x + 6, by - 50); ctx.lineTo(x + 26, by - 50); ctx.moveTo(x + 9, by - 62); ctx.lineTo(x + 23, by - 62);
      ctx.strokeStyle = wa(0.2); ctx.lineWidth = 1.2; ctx.stroke();
      const on = Math.sin(t * 3 + e.c) > 0.6 ? 1 : 0.2;
      R.draw(R.glow('m', 14), x + 16, by - 72, 0.8, 0.7 * on, true);
    } else if (k === 'vent') {
      const by = y + TS;
      rrect(ctx, x + 2, by - 22, 28, 22, 3); ctx.fillStyle = 'rgba(8,10,13,0.96)'; ctx.fill(); ctx.strokeStyle = wa(0.18); ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.translate(x + 16, by - 11); ctx.rotate(t * 5); ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7); } ctx.strokeStyle = ca(0.35); ctx.stroke(); ctx.restore();
    }
  },
  // o altar da cidade: um terminal de neon com a caixa girando na tela
  drawAltar(ctx, x, y, t) {
    const cx = x + 16, p = 0.5 + 0.5 * Math.sin(t * 2);
    R.draw(R.glow('c', 40), cx, y - 10, 1, 0.35 + 0.15 * p, true);
    rrect(ctx, x + 11, y + 4, 10, 28, [2, 2, 0, 0]); ctx.fillStyle = 'rgba(10,15,18,0.95)'; ctx.fill(); ctx.strokeStyle = wa(0.16); ctx.lineWidth = 1; ctx.stroke();
    rrect(ctx, x + 3, y + 26, 26, 6, 3); ctx.fillStyle = 'rgba(10,15,18,0.98)'; ctx.fill(); ctx.strokeStyle = ca(0.45); ctx.stroke();
    rrect(ctx, x - 6, y - 30, 44, 34, 6); ctx.fillStyle = 'rgba(4,8,11,0.96)'; ctx.fill(); ctx.strokeStyle = ca(0.75); ctx.stroke();
    // a caixinha girando (onde ela está?)
    ctx.save(); ctx.translate(cx, y - 13); const a = t * 1.3, s = 8;
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [(u * Math.cos(a) - v * Math.sin(a)) * s, (u * Math.sin(a) + v * Math.cos(a)) * s * 0.55]);
    ctx.beginPath(); pts.forEach(([u, v], i) => i ? ctx.lineTo(u, v - 4) : ctx.moveTo(u, v - 4)); ctx.closePath();
    pts.forEach(([u, v]) => { ctx.moveTo(u, v - 4); ctx.lineTo(u, v + 6); });
    ctx.moveTo(pts[0][0], pts[0][1] + 6); pts.forEach(([u, v]) => ctx.lineTo(u, v + 6)); ctx.lineTo(pts[0][0], pts[0][1] + 6);
    ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    R.draw(R.text('?', '900 10px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 5), x + 31, y - 24, 1, 0.6 + 0.4 * p);
  },
  // o mapa da cidade no telhado da praça: o desenho do desafio, em ponto pequeno
  drawMapBoard(ctx, e, x, y) {
    const t = e.t, w = e.w, h = e.h, p = 0.5 + 0.5 * Math.sin(t * 2), near = Math.abs(P.cx - (e.x + w / 2)) < 5 * TS, bh = 72;
    ctx.strokeStyle = wa(0.2); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 22, y + h); ctx.lineTo(x + 22, y + bh); ctx.moveTo(x + w - 22, y + h); ctx.lineTo(x + w - 22, y + bh); ctx.stroke();
    R.draw(R.glow('c', 64), x + w / 2, y + 36, 2.2, 0.22 + 0.1 * p, true);
    rrect(ctx, x, y, w, bh, 8); ctx.fillStyle = 'rgba(3,6,9,0.97)'; ctx.fill(); ctx.strokeStyle = ca(0.7); ctx.lineWidth = 1.2; ctx.stroke();
    const gx = x + w / 2 - 54, gy = y + 62;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(x + w - 10, gy);
    ctx.rect(gx + 4, gy - 14, 22, 14);                                         // a estação
    ctx.moveTo(gx + 48, gy); ctx.lineTo(gx + 48, gy - 36); ctx.lineTo(gx + 54, gy - 42); ctx.lineTo(gx + 60, gy - 36); ctx.lineTo(gx + 60, gy);   // a torre
    ctx.moveTo(gx + 76, gy - 22); ctx.lineTo(gx + 104, gy - 22); ctx.moveTo(gx + 76, gy - 22); ctx.quadraticCurveTo(gx + 90, gy - 6, gx + 104, gy - 22);   // a ponte
    ctx.rect(gx + 84, gy - 10, 12, 10);                                        // o palácio
    ctx.strokeStyle = ca(0.6); ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(gx + 38, gy); ctx.lineTo(gx + 38, gy - 28); ctx.lineTo(gx + 54, gy - 50); ctx.lineTo(gx + 70, gy - 28); ctx.lineTo(gx + 70, gy); ctx.strokeStyle = ca(0.22); ctx.stroke(); ctx.restore();
    R.draw(R.glow('m', 12), gx + 54, gy - 46, 0.7, 0.8, true);
    R.draw(R.text('CITY MAP', '800 9px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,0.9)', 5), x + w / 2, y + 10, 1, 0.9);
    if (near && Game.state === 'play' && Save.data.heart.compass > 0) R.draw(R.text('COMPASS ' + Save.data.heart.compass + ' / ' + CITY.compass.length, '600 10px Orbitron, Inter, sans-serif', '#f0abfc', 'rgba(217,70,239,0.8)', 6), x + w / 2, y - 12, 1, 0.7 + 0.3 * p);
  },

  /* ---------- a BÚSSOLA DAS PALAVRAS: a seta em volta do Nexy (vale em todas as fases) ---------- */
  compassTarget() {
    const lv = Save.data.heart.compass | 0; if (lv <= 0) return null;
    const cand = [];
    for (const e of Ents.list) if (e.type === 'letter' && !e.dead && !Game.letters[e.index]) cand.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, k: 'letter' });
    if (lv >= 2) {
      for (const b of World.blocks.values()) if (b.kind === 'invisible' && b.state === 'hidden') cand.push({ x: b.c * TS + TS / 2, y: b.r * TS + TS / 2, k: 'secret' });
      for (const v of World.veils) if (!v.found) cand.push({ x: v.x + v.w / 2, y: v.y + v.h / 2, k: 'secret' });
    }
    if (lv >= 4) {
      const ex = Save.data.exits[World.level.id] || {};
      for (const e of Ents.list) if (e.type === 'goal' && e.exit === 'secret' && !ex.secret) cand.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, k: 'exit' });
    }
    let best = null, bd = 1e9;
    for (const c of cand) { const d = Math.hypot(c.x - P.cx, c.y - P.cy); if (d < bd) { bd = d; best = c; } }
    if (best) best.d = bd;
    return best;
  },
  drawCompass(ctx, camX, camY) {
    if (!(Save.data.heart.compass > 0) || Game.state !== 'play' || Game.scene() || P.dead) return;
    const tg = this.compassTarget(); if (!tg || tg.d < 2.5 * TS) return;
    const a = Math.atan2(tg.y - P.cy, tg.x - P.cx), cx = P.cx - camX, cy = P.cy - camY, R0 = 40, p = 0.6 + 0.4 * Math.sin(Game.time * 4);
    const ax = cx + Math.cos(a) * R0, ay = cy + Math.sin(a) * R0;
    R.draw(R.glow('m', 16), ax, ay, 0.9, 0.45 * p, true);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.globalAlpha = 0.6 + 0.4 * p;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -5.5); ctx.lineTo(-1.5, 0); ctx.lineTo(-4, 5.5); ctx.closePath();
    ctx.fillStyle = tg.k === 'letter' ? '#f0abfc' : tg.k === 'exit' ? '#ffffff' : '#a5f3fc'; ctx.fill();
    ctx.restore();
    if (Save.data.heart.compass >= 3) R.draw(R.text(String(Math.round(tg.d / TS)), '700 9px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 5), cx + Math.cos(a) * (R0 + 15), cy + Math.sin(a) * (R0 + 15), 1, 0.85);
  },
  // a agulha no Coração (mapa, Grimório, cenas)
  drawNeedle(ctx, x, y, s, ang, alpha = 1) {
    if (alpha <= 0 || s <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(ang);
    R.draw(R.glow('m', 24), 10 * s, 0, s * 0.7, 0.6, true);
    ctx.beginPath(); ctx.moveTo(24 * s, 0); ctx.lineTo(0, -3.2 * s); ctx.lineTo(-13 * s, 0); ctx.lineTo(0, 3.2 * s); ctx.closePath();
    const g = ctx.createLinearGradient(-13 * s, 0, 24 * s, 0); g.addColorStop(0, 'rgba(34,211,238,0.9)'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#f0abfc');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 2.2 * s, 0, Math.PI * 2); ctx.fillStyle = '#0a0508'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  },
};

/* ---------- GÁRGULA: de pedra quando você olha para ela; de costas, ela voa atrás de você ----------
   Parada (pedra) não machuca e é chão por cima (degrau no ar). Voando, encostar machuca; pisão comum a deixa de pedra
   por 2 s (e o Nexy quica alto); pisão com giro, casco, tiro duplo da Echo ou o Nexy gigante a quebram. */
Ents.reg('gargoyle', {
  layer: 'enemy',
  init(e) { e.w = 28; e.h = 26; e.enemy = true; e.kind = 'enemy'; e.state = 'stone'; e.creature = 'GARGOYLE'; e.plat = true; e.dx = 0; e.dy = 0; e.wakeT = 0; e.stunT = 0; e.dir = -1; e.res = {}; },
  // o Nexy está olhando para ela? (de frente, ou com ela bem em cima)
  watched(e) { const gx = e.x + e.w / 2; return P.facing > 0 ? gx >= P.cx - 16 : gx <= P.cx + 16; },
  toStone(e) {
    if (e.state === 'fly' || e.state === 'home') { SFX.stone(); FX.burst(e.x + e.w / 2, e.y + e.h / 2, 10, 'c', 120, { life: 0.4, g: 0 }); }
    e.state = 'stone'; e.plat = true;
  },
  stun(e) {
    e.stunT = 2; this.toStone(e); SFX.clang(); Game.registerCreature('GARGOYLE');
    FX.burst(e.x + e.w / 2, e.y + 4, 14, 'c', 180, { life: 0.45 });
  },
  update(e, dt) {
    if (e.state === 'dying') return Enemy.dyingUpdate(e, dt);
    if (e.hx == null) { e.hx = e.x; e.hy = e.y; }
    const ox = e.x, oy = e.y, gx = e.x + e.w / 2, gy = e.y + e.h / 2;
    if (e.stunT > 0) e.stunT -= dt;
    const near = Math.abs(P.cx - gx) < 8 * TS && Math.abs(P.cy - gy) < 10 * TS, away = Math.hypot(e.hx - e.x, e.hy - e.y), leash = away > 14 * TS;
    if (!City.metGargoyle && near && Game.echoBorn) { City.metGargoyle = true; Echo.talk(ECHO.lines.gargoyle); }
    if (P.dead || P.riding === e || e.stunT > 0 || this.watched(e)) { e.wakeT = 0; this.toStone(e); }
    else {
      e.wakeT += dt;
      if (e.wakeT < 0.35 && e.state !== 'fly' && e.state !== 'home') {
        // um instante de pedra tremendo antes de voar (e ainda é chão): dá tempo de se virar
        if (near && e.state === 'stone') { e.state = 'wake'; SFX.wake(); }
      } else if (!near || leash) {
        // longe do Nexy (ou longe demais de casa): volta voando devagar para o poleiro
        if (away < 2) { e.x = e.hx; e.y = e.hy; this.toStone(e); }
        else { e.state = 'home'; e.plat = false; const k = Math.min(1, 60 * dt / away); e.x += (e.hx - e.x) * k; e.y += (e.hy - e.y) * k; e.dir = sign(e.hx - e.x) || e.dir; }
      } else {
        // primeiro desce (ou sobe) até a altura da cabeça do Nexy, depois vem reto na direção dele
        if (e.state !== 'fly') { e.state = 'fly'; e.plat = false; }
        const dx = P.cx - gx, dy = P.y + 6 - gy;
        const vy = clamp(dy * 2.2, -95, 95), vx = Math.abs(dy) < 40 ? clamp(dx * 1.6, -48, 48) : clamp(dx * 0.4, -14, 14);
        e.x += vx * dt; e.y += vy * dt; e.dir = sign(dx) || e.dir;
      }
    }
    e.dx = e.x - ox; e.dy = e.y - oy;
  },
  draw(ctx, e, x, y) {
    const w = e.w, h = e.h, cx = x + w / 2, t = e.t, fly = e.state === 'fly' || e.state === 'home', wake = e.state === 'wake', f = e.dir || -1;
    Enemy.rim(cx, y + h * 0.5, w + 6, fly ? 1 : 0.55);
    ctx.save();
    if (e.state === 'dying') { ctx.translate(cx, y + h / 2); ctx.rotate(e.spinA); ctx.translate(-cx, -y - h / 2); }
    if (wake) ctx.translate(Math.sin(t * 70) * 1.4, 0);
    const flap = fly ? Math.sin(t * 16) : 0, body = fly ? '#0b0d11' : '#15181d', edge = wa(fly ? 0.34 : 0.22);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (fly) {
        const wx = cx + s * 6, wy = y + 9;
        ctx.moveTo(wx, wy); ctx.lineTo(wx + s * 16, wy - 10 - flap * 7); ctx.lineTo(wx + s * 22, wy - 2 - flap * 4); ctx.lineTo(wx + s * 17, wy + 2);
        ctx.lineTo(wx + s * 19, wy + 8 - flap * 2); ctx.lineTo(wx + s * 11, wy + 6); ctx.lineTo(wx + s * 4, wy + 10); ctx.closePath();
      } else { ctx.moveTo(cx + s * 4, y + 6); ctx.lineTo(cx + s * 14, y + 1); ctx.lineTo(cx + s * 14, y + h - 5); ctx.lineTo(cx + s * 6, y + h - 1); ctx.closePath(); }
      ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke();
    }
    // corpo agachado, cabeça com chifres, garras
    ctx.beginPath(); ctx.moveTo(cx - 8, y + h); ctx.lineTo(cx - 10, y + 13); ctx.quadraticCurveTo(cx, y + 6, cx + 10, y + 13); ctx.lineTo(cx + 8, y + h); ctx.closePath();
    ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = edge; ctx.stroke();
    const hx = cx + f * 2;
    ctx.beginPath(); ctx.moveTo(hx - 5, y + 4); ctx.lineTo(hx - 7, y - 3); ctx.lineTo(hx - 2, y + 2); ctx.moveTo(hx + 5, y + 4); ctx.lineTo(hx + 7, y - 3); ctx.lineTo(hx + 2, y + 2); ctx.strokeStyle = edge; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, y + 8, 6, 0, Math.PI * 2); ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = edge; ctx.stroke();
    ctx.beginPath(); for (const s of [-1, 1]) { ctx.moveTo(cx + s * 7, y + h); ctx.lineTo(cx + s * 9, y + h - 4); } ctx.strokeStyle = wa(0.25); ctx.stroke();
    // olhos: apagados na pedra, acesos voando
    const eye = fly ? 1 : wake ? 0.5 + 0.5 * Math.sin(t * 30) : 0.12;
    R.draw(R.glow('c', 10), hx + f * 2, y + 8, 0.7, eye * 0.9, true);
    ctx.fillStyle = `rgba(240,250,255,${(0.25 + 0.75 * eye).toFixed(3)})`; ctx.fillRect(hx + f * 2 - 3, y + 7, 2, 1.6); ctx.fillRect(hx + f * 2 + 1, y + 7, 2, 1.6);
    if (!fly) { ctx.beginPath(); ctx.moveTo(cx - 4, y + 15); ctx.lineTo(cx - 1, y + 19); ctx.lineTo(cx - 3, y + 23); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke(); }
    ctx.restore();
  },
});

/* ---------- O TREM DO MONOTRILHO: plataforma que vai e volta entre a estação e a praça ----------
   A posição vem do relógio da simulação (como os tubos do órgão): espera, arranca devagar, freia devagar. */
Ents.reg('train', {
  layer: 'back',
  init(e) {
    const o = e.opts; e.w = (o.width || 6) * TS; e.h = 14; e.plat = true; e.dx = 0; e.dy = 0; e.light = 150;
    e.x0 = e.c * TS; e.x1 = (o.to != null ? o.to : e.c + 10) * TS; e.y = e.r * TS; e.v = o.speed || 120; e.wait = o.wait || 1.6;
    e.T = (e.x1 - e.x0) / e.v; e.period = 2 * (e.T + e.wait); this.place(e); e.px = e.x; e.py = e.y;
  },
  place(e) {
    const u = ((Game.simTime % e.period) + e.period) % e.period, W = e.wait, Tt = e.T;
    const k = u < W ? 0 : u < W + Tt ? (u - W) / Tt : u < 2 * W + Tt ? 1 : 1 - (u - 2 * W - Tt) / Tt;
    e.k = k; e.moving = k > 0 && k < 1; e.x = lerp(e.x0, e.x1, k * k * (3 - 2 * k));   // arranca e freia devagar
  },
  update(e) {
    const ox = e.x, was = e.moving; this.place(e); e.dx = e.x - ox; e.dy = 0;
    if (e.moving && !was && Math.abs(P.cx - (e.x + e.w / 2)) < 16 * TS) SFX.horn();
    if (P.riding === e) Hints.mark('train');
  },
  // o trilho e os pilares (desenhados antes do terreno: o trem passa por cima)
  drawRail(ctx, e, camX, camY) {
    const x0 = e.x0 - camX, x1 = e.x1 + e.w - camX, y = e.y + 30 - camY, bot = World.pxH - camY;
    if (x1 < -40 || x0 > CFG.VIEW_W + 40) return;
    for (const px of [x0 + 20, (x0 + x1) / 2, x1 - 20]) { rrect(ctx, px - 7, y + 6, 14, bot - y, 2); ctx.fillStyle = 'rgba(6,8,11,0.96)'; ctx.fill(); ctx.strokeStyle = wa(0.1); ctx.lineWidth = 1; ctx.stroke(); }
    rrect(ctx, x0, y, x1 - x0, 9, 3); ctx.fillStyle = 'rgba(8,11,14,0.98)'; ctx.fill(); ctx.strokeStyle = ca(0.35); ctx.stroke();
    ctx.beginPath(); for (let xx = x0 + 16; xx < x1; xx += 32) { ctx.moveTo(xx, y + 2); ctx.lineTo(xx, y + 7); } ctx.strokeStyle = ca(0.12); ctx.stroke();
  },
  draw(ctx, e, x, y) {
    const w = e.w, t = e.t, dir = e.k < 0.5 ? 1 : -1, H = 28;
    R.draw(R.glow('c', 64), x + w / 2, y + H / 2, w / 80, 0.25, true);
    // os faróis (na frente do lado para onde vai)
    if (e.moving) {
      const fx = dir > 0 ? x + w : x, g = ctx.createLinearGradient(fx, 0, fx + dir * 140, 0);
      g.addColorStop(0, 'rgba(240,250,255,0.22)'); g.addColorStop(1, 'rgba(240,250,255,0)');
      ctx.beginPath(); ctx.moveTo(fx, y + 10); ctx.lineTo(fx + dir * 140, y - 6); ctx.lineTo(fx + dir * 140, y + 34); ctx.lineTo(fx, y + 20); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    }
    rrect(ctx, x, y, w, H, [6, 6, 12, 12]); ctx.fillStyle = 'rgba(7,10,13,0.98)'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y + 0.5); ctx.lineTo(x + w - 6, y + 0.5); ctx.strokeStyle = ca(0.9); ctx.stroke();   // o teto, onde se anda
    for (let i = 0; i < 7; i++) {
      const wx = x + 14 + i * (w - 28) / 7, on = 0.6 + 0.4 * Math.sin(t * 2 + i);
      rrect(ctx, wx, y + 7, (w - 28) / 7 - 6, 9, 3); ctx.fillStyle = `rgba(122,216,255,${(0.28 * on).toFixed(3)})`; ctx.fill(); ctx.strokeStyle = ca(0.4); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x + 8, y + 21); ctx.lineTo(x + w - 8, y + 21); ctx.strokeStyle = 'rgba(217,70,239,0.75)'; ctx.lineWidth = 1.4; ctx.stroke();
    for (const s of [x + 4, x + w - 4]) R.draw(R.glow('w', 10), s, y + 14, 0.8, 0.8, true);
    for (const bx of [x + 30, x + w - 30]) { rrect(ctx, bx - 14, y + H, 28, 6, 2); ctx.fillStyle = '#0a0f12'; ctx.fill(); ctx.strokeStyle = wa(0.2); ctx.stroke(); }
    R.draw(R.text('LINE 1 · CITY', '700 8px Orbitron, Inter, sans-serif', wa(0.8), ca(0.8), 4), x + w / 2, y + H - 2, 1, 0.8);
  },
});

/* ---------- o MAPA DA CIDADE (a porta do desafio) e os enfeites ---------- */
Ents.reg('citymap', {
  layer: 'back',
  init(e) {
    e.w = 5 * TS; e.h = 5 * TS; e.x = e.c * TS + TS / 2 - e.w / 2; e.y = (e.r + 1) * TS - e.h; e.light = 160;
    const def = World.level.doors[e.opts.door];
    World.doors[e.opts.door] = { id: e.opts.door, def, kind: 'citymap', x: e.c * TS, y: e.r * TS, w: 32, h: 32, open: false, opening: 0, errors: 0, read: false, hint: false, morph: 0, mirror: 0, chimes: [], ent: e };
  },
  update(e) { if (!City.metMap && Game.echoBorn && Math.abs(P.cx - (e.x + e.w / 2)) < 7 * TS) { City.metMap = true; Echo.talk(ECHO.lines.map); } },
  draw(ctx, e, x, y) { City.drawMapBoard(ctx, e, x, y); },
});
Ents.reg('decor', {
  layer: 'back',
  init(e) { const o = e.opts; e.x = e.c * TS; e.y = e.r * TS; e.w = (o.w || 1) * TS; e.h = (o.h || 1) * TS; if (o.legs) e.h = (o.legs - e.r) * TS; if (o.post) e.h = (o.post - e.r) * TS; },
  draw(ctx, e, x, y) { City.drawDecor(ctx, e, x, y); },
});

/* ---------- a chegada na cidade (1ª visita): o narrador e a tabela das preposições com a caixa ---------- */
const CityIntro = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 0, i: -1, pt: 0, text: null, textT: 0, voiceDone: true, tableK: 0, hi: -1,
  start() {
    Object.assign(this, { active: true, t: 0, i: -1, pt: 0, text: null, textT: 0, voiceDone: true, tableK: 0, letter: 0, zoom: 1, sat: 0, phase: 'lines', hi: -1 });
    Game.state = 'cinematic'; Game.clearInput(); P.vx = 0;
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.6 }); SFX.riser(1.2); City.strike(480);
    this.next();
  },
  say(line, who = 'story') {
    this.text = line; this.textT = 0; this.voiceDone = false; this.pt = 0;
    if (!Voice.say(line.en, who, { cut: true, onEnd: () => { this.voiceDone = true; } })) this.voiceDone = true;
  },
  next() {
    this.i++;
    if (this.i < CITY.intro.length) this.say(CITY.intro[this.i]);
    else if (this.phase === 'lines') { this.phase = 'table'; this.say(CITY.tableLine); SFX.letter(); }
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
    if (this.phase === 'table') {
      this.tableK = Math.min(1, this.tableK + dt * 1.6);
      const n = Math.floor((this.pt - 0.4) / 0.75); if (n !== this.hi && n >= 0 && n < 4) { this.hi = n; SFX.select(); }
    }
    if (this.phase === 'lines' && this.ready(this.i === 0 ? 2.6 : 3)) this.next();
    else if (this.phase === 'table' && this.ready(5, 12)) this.next();
  },
  end() {
    if (!this.active) return;
    this.active = false; this.letter = 0;
    Save.data.met.city = true; Save.write();
    Music.normal();
    if (Game.state === 'cinematic') Game.state = 'play';
    Game.clearInput();
    Game.later(0.6, () => Echo.talk(ECHO.lines.city));
  },
  drawWorld() { },
  // um desenho por preposição: a caixa EM CIMA, EMBAIXO, DENTRO e ATRÁS de uma placa, de um buraco, de um muro
  icon(ctx, kind, x, y, k) {
    const bw = 30, bh = 24;
    ctx.save(); ctx.globalAlpha *= k; ctx.strokeStyle = wa(0.55); ctx.lineWidth = 1.4;
    if (kind === 'on' || kind === 'under') {
      ctx.beginPath(); ctx.moveTo(x - 44, y); ctx.lineTo(x + 44, y); ctx.moveTo(x - 36, y); ctx.lineTo(x - 36, y + 46); ctx.moveTo(x + 36, y); ctx.lineTo(x + 36, y + 46); ctx.stroke();
      City.drawCube(ctx, x - bw / 2, kind === 'on' ? y - bh - 1 : y + 46 - bh, bw, bh, Game.time);
    } else if (kind === 'in') {
      ctx.beginPath(); ctx.moveTo(x - 46, y + 8); ctx.lineTo(x - 22, y + 8); ctx.lineTo(x - 22, y + 46); ctx.lineTo(x + 22, y + 46); ctx.lineTo(x + 22, y + 8); ctx.lineTo(x + 46, y + 8); ctx.stroke();
      City.drawCube(ctx, x - bw / 2, y + 46 - bh, bw, bh, Game.time);
    } else {
      // atrás do muro: só a beirada da caixa aparece (o resto, só o pulso da Echo vê)
      ctx.save(); ctx.globalAlpha *= 0.6; City.drawCube(ctx, x - 8, y + 10, bw, bh, Game.time); ctx.restore();
      rrect(ctx, x - 30, y - 6, 44, 52, 3); ctx.fillStyle = 'rgba(8,10,13,0.99)'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); for (let yy = y + 6; yy < y + 46; yy += 12) { ctx.moveTo(x - 30, yy); ctx.lineTo(x + 14, yy); } ctx.strokeStyle = wa(0.12); ctx.stroke();
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
      const k = this.tableK, x0 = W / 2 - 340, y0 = 168;
      ctx.save(); ctx.globalAlpha = k;
      rrect(ctx, x0, y0, 680, 240, 16); ctx.fillStyle = 'rgba(2,2,2,0.93)'; ctx.fill(); ctx.strokeStyle = ca(0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      CITY.table.forEach((row, i) => {
        const cx = x0 + 85 + i * 170, on = i === this.hi, kk = clamp(k * 3 - i * 0.4, 0, 1);
        if (on) R.draw(R.glow('m', 64), cx, y0 + 110, 1.6, 0.25 * kk, true);
        this.icon(ctx, row.icon, cx, y0 + 70, kk);
        R.draw(R.text(row.w, '800 20px Orbitron, Inter, sans-serif', '#ffffff', on ? 'rgba(217,70,239,1)' : 'rgba(217,70,239,0.6)', on ? 12 : 6), cx, y0 + 168, on ? 1.1 : 1, kk);
        R.draw(R.text(row.pt, '400 12px Inter, sans-serif', wa(0.7), null, 0), cx, y0 + 196, 1, kk);
      });
    }
    R.draw(R.text(Input.padSeen ? 'A · NEXT' : 'ENTER · NEXT  ·  ESC · SKIP', '500 9px Orbitron, Inter, sans-serif', wa(0.45), null, 0), W - 90, H - bar - 14);
  },
};

/* ---------- O MAPA DA CIDADE: ler (karaokê do narrador), a bússola nasce, e a escalada acima do A1 ----------
   Usa o painel do Baú. Cada acerto da escalada sobe a bússola um nível (fica salvo); errar encerra, o poder fica. */
const CityMap = {
  d: null, st: null, showPt: false, timers: [], busy: false,
  open(d) {
    this.d = d; Game.state = 'citymap'; P.vx *= 0.3; this.busy = false; Hints.mark('citymap');
    if (!d.ui) d.ui = { step: Save.data.heart.compass > 0 ? 'online' : 'intro', rung: 0, fell: false };
    this.st = d.ui; if (this.st.step === 'climb' || this.st.step === 'done') this.st.step = 'online';
    this.showPt = !!Save.data.assist.subtitles;
    $('ckind').textContent = 'CITY MAP'; $('chest').classList.add('on', 'citymap'); $('chest').classList.remove('dim');
    $('ckeys').textContent = '← → CHOOSE · ENTER OK · H TRANSLATION · ESC CLOSE';
    Music.set({ perc: 0, organ: 0.3, bass: 0.5 });
    this.render();
  },
  close() {
    this.stop(); Voice.stop();
    $('chest').classList.remove('on', 'citymap'); $('ckind').textContent = 'MEMORY CHEST';
    if (Game.state === 'citymap') { Game.state = 'play'; Music.normal(); }
    Game.clearInput();
    // a bússola acabou de nascer: a cena (uma vez só)
    if (Save.data.heart.compass > 0 && !Save.data.met.compass) CompassScene.start(this.d);
  },
  stop() { for (const k of this.timers) clearTimeout(k); this.timers = []; },
  later(ms, fn) { this.timers.push(setTimeout(fn, ms)); },
  key(e) {
    const c = e.code;
    if (c === 'Escape') { if (!this.busy) this.close(); return; }
    if (c === 'KeyH') { this.showPt = !this.showPt; SFX.ui(); document.querySelectorAll('#chest [data-pt]').forEach(el => { el.textContent = this.showPt ? el.dataset.pt : ''; }); return; }
    UI.menuKey(e);
  },
  pt(text) { return `<div class="c-pt" data-pt="${text.replace(/"/g, '&quot;')}">${this.showPt ? text : ''}</div>`; },
  btn(label, act, cls = '') { return `<button class="btn ${cls}" data-a="${act}">${label}</button>`; },
  // o desenho do mapa (de lado): estação · torre (catedral atrás, Nexy em cima) · ponte (palácio embaixo)
  svg(hi) {
    const on = k => k === hi ? ' on' : '';
    return `<svg class="cmap" viewBox="0 0 560 210"><line x1="10" y1="180" x2="550" y2="180" class="cm-g"/>
      <g class="cm-x${on('cathedral')}" data-k="cathedral"><path class="cm-back" d="M200 180 V96 L230 70 V44 L240 22 L250 44 V70 L280 52 L310 70 V44 L320 22 L330 44 V70 L360 96 V180 Z"/><circle cx="280" cy="98" r="12" class="cm-back"/></g>
      <g class="cm-x${on('station')}" data-k="station"><path d="M30 180 V124 H140 V180 Z M24 124 L85 104 L146 124"/><rect x="46" y="140" width="22" height="16" rx="3"/><rect x="100" y="140" width="22" height="16" rx="3"/></g>
      <g class="cm-x${on('tower')}" data-k="tower"><path d="M256 180 V62 H304 V180 Z M252 62 V48 H262 V56 H274 V48 H286 V56 H298 V48 H308 V62"/><rect x="270" y="80" width="20" height="26" rx="10"/></g>
      <g class="cm-x cm-nexy${on('nexy')}" data-k="nexy"><path d="M273 42 V30 Q280 24 287 30 V42 Z M274 14 L276 4 L279 10 M286 14 L284 4 L281 10"/><circle cx="280" cy="16" r="7"/></g>
      <g class="cm-x${on('bridge')}" data-k="bridge"><path d="M390 112 H540 M390 120 H540 M396 120 V180 M534 120 V180 M396 132 Q465 96 534 132"/></g>
      <g class="cm-x${on('palace')}" data-k="palace"><path d="M436 180 V150 H494 V180 Z M430 150 L465 132 L500 150"/><rect x="458" y="160" width="14" height="20" rx="7"/></g>
      <text x="85" y="200">STATION</text><text x="280" y="200">TOWER</text><text x="465" y="200">BRIDGE</text><text x="465" y="128" class="cm-s">PALACE</text><text x="172" y="112" class="cm-s">CATHEDRAL</text><text x="312" y="22" class="cm-s">NEXY</text></svg>`;
  },
  tiers() { const lv = Save.data.heart.compass; return `<div class="c-row">${CITY.compass.map((c, i) => `<div class="e-tier${i < lv ? ' on' : ''}"><i></i><span class="n">${c.name}</span><span class="d">${c.info}</span></div>`).join('')}</div>`; },
  go(step, extra = {}) { Object.assign(this.st, { step }, extra); this.render(); },
  render() {
    const st = this.st, body = $('cbody'), M = CITY.map, lv = Save.data.heart.compass;
    this.stop();
    $('csteps').innerHTML = ['intro', 'learn', 'climb'].map((s, i, a) => { const cur = { online: 'climb', done: 'climb' }[st.step] || st.step, ci = a.indexOf(cur); return `<i class="${i < ci ? 'done' : i === ci ? 'on' : ''}"></i>`; }).join('');
    $('cpower').innerHTML = lv > 0 ? [1, 2, 3, 4].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('') : '';
    $('cpower').style.display = $('cpower').innerHTML ? 'flex' : 'none';
    let h = '';
    if (st.step === 'intro') {
      h = `<div class="c-title">CITY MAP</div><div class="c-sub">${M.intro.en}</div>${this.pt(M.intro.pt)}${this.svg(null)}
        <div class="c-actions">${this.btn('READ IT →', 'learn', 'primary')}</div>`;
    } else if (st.step === 'learn') {
      h = `<div class="c-title">READ THE MAP</div>${this.svg(null)}
        <div class="cm-lines">${M.lines.map((l, i) => `<button class="btn cm-line" data-a="line" data-i="${i}">${l.en.replace(/\b(on|under|behind|between)\b/i, '<b>$1</b>')}${l.fresh ? ' <b class="e-new">NEW</b>' : ''}</button>`).join('')}</div>
        ${this.pt(M.lines.map(l => l.pt).join(' · '))}
        <div class="c-actions">${this.btn('▶ LISTEN', 'hear', 'small')}${this.btn('THE COMPASS →', 'online', 'primary')}</div>`;
    } else if (st.step === 'online') {
      h = `<div class="c-title chal">${CITY.compass[Math.max(0, lv - 1)].name}</div><div class="c-sub">The Heart has a compass now. Climb higher: harder questions about the map, above A1. Every right answer makes the compass stronger. One try each. A wrong answer ends the climb, but you keep your compass.</div>
        ${this.pt('O Coração ganhou uma bússola. Suba mais: perguntas mais difíceis sobre o mapa, acima do A1. Cada acerto deixa a bússola mais forte. Uma tentativa por pergunta; errar encerra a escalada, mas a bússola fica.')}
        ${this.tiers()}
        <div class="c-actions">${lv < CITY.compass.length ? this.btn('CLIMB ↑', 'climb', 'primary') : ''}${this.btn('← READ AGAIN', 'learn', 'small')}${this.btn('CLOSE', 'close', lv >= CITY.compass.length ? 'primary' : '')}</div>`;
    } else if (st.step === 'climb') {
      const r = M.climb[st.rung];
      h = `<div class="c-sub">STEP ${st.rung + 1} / ${M.climb.length} · LEVEL ${r.level} · ${CITY.compass[Math.max(0, lv - 1)].name}</div>${this.svg(null).replace('class="cmap"', 'class="cmap small"')}
        <div class="c-q">${r.q}</div>
        <div class="c-opts tight">${r.options.map((o, i) => `<button class="btn copt" data-a="rung" data-i="${i}">${o}</button>`).join('')}</div><div class="c-ev" id="cev"></div><div class="c-actions" id="cnext"></div>`;
    } else if (st.step === 'done') {
      const C = CITY.compass[lv - 1];
      h = `<div class="c-title chal">${C.name}</div><div class="c-sub">${C.pt}. ${C.info}</div>${this.pt('A seta magenta em volta do Nexy aponta o que falta encontrar, em todas as fases.')}
        ${this.tiers()}
        <div class="c-actions">${lv < CITY.compass.length ? this.btn('CLIMB AGAIN ↑', 'climb') : ''}${this.btn('CLOSE', 'close', 'primary')}</div>`;
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.a, b)));
    if (st.step === 'learn') this.read();
    if (st.step === 'intro') Voice.say(M.intro.en, 'story', { cut: true });
    this.later(30, () => { const f = body.querySelector('.btn.primary') || body.querySelector('.copt') || body.querySelector('.btn'); if (f) f.focus({ preventScroll: true }); });
  },
  // a leitura: cada frase acende a parte do mapa enquanto o narrador lê (som, texto e imagem juntos)
  light(k) { document.querySelectorAll('#chest .cmap .cm-x').forEach(g => g.classList.toggle('on', g.dataset.k === k)); },
  read() {
    if (!Game.wordsSeen.has('BETWEEN')) { Game.wordsSeen.add('BETWEEN'); Game.learnedOrder.push('BETWEEN'); }
    Game.grimoireWord('BETWEEN', 'CITY MAP');
    const rows = [...document.querySelectorAll('#chest .cm-line')];
    CITY.map.lines.forEach((l, i) => this.later(300 + i * 2600, () => { rows.forEach((el, j) => el.classList.toggle('say', j === i)); this.light(l.k); Voice.say(l.en, 'story', { cut: true }); }));
    this.later(300 + CITY.map.lines.length * 2600, () => { rows.forEach(el => el.classList.remove('say')); this.light(null); });
  },
  act(a, el) {
    if (this.busy) return;
    const st = this.st;
    if (a === 'learn') { SFX.ui(); return this.go('learn'); }
    if (a === 'hear') { this.stop(); return this.read(); }
    if (a === 'line') { const l = CITY.map.lines[+el.dataset.i]; this.stop(); Voice.say(l.en, 'story', { cut: true }); this.light(l.k); document.querySelectorAll('#chest .cm-line').forEach(x => x.classList.toggle('say', x === el)); return; }
    if (a === 'online') return this.online();
    if (a === 'climb') { SFX.ui(); return this.go('climb', { rung: 0, fell: false }); }
    if (a === 'rung') return this.answer(+el.dataset.i, el);
    if (a === 'up') { SFX.ui(); return st.rung < CITY.map.climb.length - 1 && !st.fell && Save.data.heart.compass < CITY.compass.length ? this.go('climb', { rung: st.rung + 1 }) : this.go('done'); }
    if (a === 'close') { SFX.ui(); return this.close(); }
  },
  online() {
    const first = !(Save.data.heart.compass > 0);
    Save.data.heart.compass = Math.max(1, Save.data.heart.compass | 0); Save.write();
    if (first) { SFX.powerup(); Game.shake(3); }
    this.go('online');
  },
  answer(i, el) {
    const st = this.st, r = CITY.map.climb[st.rung], opts = [...document.querySelectorAll('#chest .copt')];
    if (opts.some(b => b.disabled)) return;
    opts.forEach(b => { b.disabled = true; });
    const right = i === r.answer, S = Save.data.heart;
    opts[r.answer].classList.add('right'); this.light(r.k);
    if (right) {
      S.compass = Math.min(CITY.compass.length, (S.compass | 0) + 1); Save.write(); SFX.powerup();
      const C = CITY.compass[S.compass - 1];
      $('cev').innerHTML = `<b>${C.name}</b> · ${C.info}<br><span style="color:var(--txt-3)">${r.tip}</span>`;
    } else {
      el.classList.add('wrong'); SFX.wrong(); st.fell = true;
      $('cev').innerHTML = `The climb ends here. The Heart keeps <b>${CITY.compass[Math.max(0, S.compass - 1)].name}</b>.<br><span style="color:var(--txt-3)">${r.tip}</span>`;
    }
    this.later(450, () => Voice.say(r.options[r.answer], 'echo', { cut: true }));
    const last = st.rung >= CITY.map.climb.length - 1 || S.compass >= CITY.compass.length;
    $('cnext').innerHTML = this.btn(right && !last ? 'NEXT STEP ↑' : 'FINISH →', 'up', 'primary');
    $('cnext').querySelector('button').addEventListener('click', () => this.act('up'));
    this.later(30, () => { const b = $('cnext') && $('cnext').querySelector('button'); if (b) b.focus({ preventScroll: true }); });
  },
};

/* ---------- a BÚSSOLA nasce: a chuva para no ar, o raio cai no mapa, o Coração ganha a agulha ---------- */
const CompassScene = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 0, flash: 0, ev: {}, needle: 0, k: 0,
  start(d) {
    Object.assign(this, { active: true, t: 0, zoom: 1, sat: 0, letter: 0, flash: 0, ev: {}, needle: 0, spin: 14, k: 0, text: null, textT: 0, voiceDone: true, d, ent: d && d.ent });
    Save.data.met.compass = true; Save.write();
    Game.state = 'cinematic'; Game.clearInput(); P.vx = 0; P.vy = 0; City.freeze = true;
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.4 }); Music.setDrone(true); SFX.warDrum();
  },
  once(k, fn) { if (!this.ev[k]) { this.ev[k] = true; fn(); } },
  say(line, who = 'story') {
    this.text = line; this.textT = 0; this.voiceDone = false;
    if (!Voice.say(line.en, who, { onEnd: () => { this.voiceDone = true; } })) this.voiceDone = true;
  },
  key(e) {
    if (e.code === 'Escape') return this.end();
    if (['Enter', 'NumpadEnter', 'Space', 'KeyZ'].includes(e.code) && this.t > 1) { Voice.stop(); this.voiceDone = true; if (this.t > 4) this.end(); else this.t = 4; }
  },
  tap() { this.key({ code: 'Enter' }); },
  update(dt) {
    if (!this.active) return;
    this.t += dt; this.textT += dt; const t = this.t;
    this.letter = Math.min(1, t * 2);
    this.zoom = 1 + 0.22 * Math.min(1, t / 0.8) * (t < 3 ? 1 : Math.max(0, 1 - (t - 3) / 0.8));
    this.sat = t < 1 ? Math.min(0.7, t) : Math.max(0, 0.7 - (t - 1) * 0.3);
    if (t > 0.45) this.once('drum2', () => SFX.warDrum());
    // o raio cai no mapa: clarão, tremor, cacos de luz
    if (t > 0.8) this.once('bolt', () => {
      SFX.thunder(1); SFX.crush(); Game.shake(9); this.flash = 0.8;
      const e = this.ent; if (e) { FX.burst(e.x + e.w / 2, e.y + 20, 40, 'c', 380, { life: 1, g: 300 }); FX.burst(e.x + e.w / 2, e.y + 20, 24, 'm', 260, { life: 0.9, g: 200 }); }
    });
    // o Coração sobe e a agulha gira até apontar para a frente (o forte, a próxima parada)
    if (t > 1.3) { this.k = Math.min(1, this.k + dt * 1.4); this.once('heart', () => { SFX.heartbeat(); SFX.shimmer(); this.say(CITY.scene[0]); }); }
    this.spin = Math.max(0, this.spin - dt * (t > 2.4 ? 7 : 0));
    this.needle += this.spin * dt;
    if (t > 2.4 && this.spin <= 0) this.needle = lerp(this.needle, Math.round(this.needle / (Math.PI * 2)) * Math.PI * 2, 1 - Math.exp(-dt * 6));
    if (t > 4.2) this.once('line2', () => { if (this.voiceDone) { this.say(CITY.scene[1]); SFX.oneUp(); } else this.ev.line2 = false; });
    if (t > 9 && this.voiceDone || t > 14) this.end();
    this.flash = Math.max(0, this.flash - dt * 1.6);
    FX.update(dt);
  },
  end() {
    if (!this.active) return;
    this.active = false; this.letter = 0; this.zoom = 1; this.sat = 0; City.freeze = false;
    Music.setDrone(false); Music.normal();
    if (Game.state === 'cinematic') Game.state = 'play';
    Game.clearInput();
    Echo.talk(ECHO.lines.compass);
  },
  drawWorld(ctx, camX, camY) {
    if (!this.ev.bolt || this.t > 1.5 || !this.ent) return;
    const e = this.ent, x = e.x + e.w / 2 - camX, y = e.y - camY, a = clamp(1 - (this.t - 0.8) / 0.7, 0, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.moveTo(x + 40, -20);
    let px = x + 40; for (let yy = 20; yy < y; yy += 34) { px += (Math.sin(yy * 7.1) * 0.5) * 50; ctx.lineTo(px, yy); } ctx.lineTo(x, y);
    ctx.strokeStyle = `rgba(165,243,252,${(0.6 * a).toFixed(3)})`; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  },
  drawScreen(ctx) {
    if (!this.active) return;
    const W = CFG.VIEW_W, H = CFG.VIEW_H, bar = 62 * this.letter, k = this.k, t = this.t;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    if (k > 0) {
      const cx = W / 2, cy = 228, tier = Math.max(0, Save.data.heart.best);
      ctx.fillStyle = `rgba(0,0,0,${(0.45 * k).toFixed(3)})`; ctx.fillRect(0, bar, W, H - 2 * bar);
      // a rosa dos ventos atrás do Coração
      ctx.save(); ctx.globalAlpha = k * 0.7; ctx.translate(cx, cy);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r1 = i % 4 ? 70 : 96; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 52, Math.sin(a) * 52); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.strokeStyle = i % 4 ? ca(0.3) : 'rgba(240,171,252,0.7)'; ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.strokeStyle = ca(0.4); ctx.stroke();
      ctx.restore();
      drawHeart(ctx, cx, cy, 2.4 * k, tier, t, k);
      City.drawNeedle(ctx, cx, cy, 2.4 * k, this.needle, k);
      if (t > 2.6) {
        const kk = clamp((t - 2.6) * 1.5, 0, 1), C = CITY.compass[Math.max(0, Save.data.heart.compass - 1)];
        R.draw(R.text(C.name, '900 24px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 14), cx, 352, 1, kk);
        R.draw(R.text(C.pt + ' · ' + C.info, '400 13px Inter, sans-serif', wa(0.75), null, 0), cx, 382, 1, kk);
      }
    }
    if (this.text) {
      const kt = Math.min(1, this.textT * 3);
      R.draw(R.text(this.text.en, '700 20px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 12), W / 2, H - bar - 52, 1, kt);
      if (this.text.pt) R.draw(R.text(this.text.pt, '400 13px Inter, sans-serif', wa(0.78), null, 0), W / 2, H - bar - 26, 1, kt);
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(240,250,255,${this.flash.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  },
};

/* ---------- o fundo da cidade: céu de tempestade, prédios góticos e cyberpunk, letreiros, a rua lá embaixo ---------- */
BG.makeCityFar = function () {
  const W = 1920, H = 760, s = R.make(W, H), x = s.x, rnd = mulberry32(41);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#030409'); g.addColorStop(0.6, '#070a12'); g.addColorStop(1, '#0a0e16');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // nuvens pesadas
  for (let i = 0; i < 26; i++) { const cx = rnd() * W, cy = 40 + rnd() * 180, r = 60 + rnd() * 120; const cg = x.createRadialGradient(cx, cy, 0, cx, cy, r); cg.addColorStop(0, 'rgba(34,211,238,0.035)'); cg.addColorStop(1, 'rgba(34,211,238,0)'); x.fillStyle = cg; x.fillRect(cx - r, cy - r, r * 2, r * 2); }
  // a lua atrás das nuvens
  x.beginPath(); x.arc(1460, 120, 34, 0, Math.PI * 2); x.fillStyle = 'rgba(230,245,255,0.5)'; x.fill();
  x.beginPath(); x.arc(1472, 112, 32, 0, Math.PI * 2); x.fillStyle = '#05070c'; x.fill();
  // prédios distantes: torres góticas (pináculos e vitrais) e blocos cyberpunk (antenas e janelinhas acesas)
  let px = 0;
  while (px < W) {
    const w = 40 + rnd() * 110, h = 180 + rnd() * 330, top = H - h;
    if (rnd() < 0.35) this.tower(x, px, top, w, H, mulberry32(Math.floor(px * 7)));
    else {
      x.fillStyle = '#06080d'; x.fillRect(px, top, w, h); x.strokeStyle = cb(0.07); x.lineWidth = 1; x.strokeRect(px + 0.5, top + 0.5, w - 1, h);
      for (let yy = top + 10; yy < H - 20; yy += 12) for (let xx = px + 6; xx < px + w - 6; xx += 9) if (rnd() < 0.12) { x.fillStyle = rnd() < 0.15 ? 'rgba(232,121,249,0.35)' : 'rgba(122,216,255,0.3)'; x.fillRect(xx, yy, 3, 4); }
      if (rnd() < 0.6) { x.beginPath(); x.moveTo(px + w / 2, top); x.lineTo(px + w / 2, top - 30 - rnd() * 40); x.strokeStyle = cb(0.15); x.stroke(); }
    }
    px += w + rnd() * 18;
  }
  // a grande catedral no meio da cidade, com um anel de neon
  const cx = 900, top = 250;
  x.beginPath(); x.moveTo(cx - 150, H); x.lineTo(cx - 150, top + 120); x.lineTo(cx - 60, top + 40); x.lineTo(cx, top - 90); x.lineTo(cx + 60, top + 40); x.lineTo(cx + 150, top + 120); x.lineTo(cx + 150, H); x.closePath();
  x.fillStyle = '#05070b'; x.fill(); x.strokeStyle = cb(0.1); x.stroke();
  this.rose(x, cx, top + 110, 40, 0.14);
  x.beginPath(); x.ellipse(cx, top - 20, 70, 14, 0, 0, Math.PI * 2); x.strokeStyle = 'rgba(217,70,239,0.25)'; x.lineWidth = 2; x.stroke();
  const hz = x.createLinearGradient(0, H - 220, 0, H); hz.addColorStop(0, 'rgba(7,10,18,0)'); hz.addColorStop(1, 'rgba(34,211,238,0.10)');
  x.fillStyle = hz; x.fillRect(0, H - 220, W, 220);
  return s;
};
BG.makeCityNear = function () {
  const W = 1536, H = 900, s = R.make(W, H), x = s.x, rnd = mulberry32(57);
  let px = -20;
  while (px < W) {
    const w = 90 + rnd() * 140, top = 220 + rnd() * 300;
    x.fillStyle = 'rgba(4,5,8,0.94)'; x.fillRect(px, top, w, H - top); x.strokeStyle = cb(0.1); x.lineWidth = 1; x.strokeRect(px + 0.5, top + 0.5, w - 1, H - top);
    for (let yy = top + 16; yy < H - 30; yy += 26) for (let xx = px + 10; xx < px + w - 14; xx += 18) if (rnd() < 0.1) { x.fillStyle = rnd() < 0.2 ? 'rgba(232,121,249,0.22)' : 'rgba(122,216,255,0.18)'; x.fillRect(xx, yy, 7, 10); }
    // letreiro vertical de neon (algumas fachadas)
    if (rnd() < 0.5) {
      const words = ['HOTEL', 'BAR', 'OPEN', 'NEO', '24H', 'CAFE'], wd = words[Math.floor(rnd() * words.length)], sx = px + w - 26, sy = top + 30, mag = rnd() < 0.4;
      rrect(x, sx, sy, 18, wd.length * 16 + 8, 5); x.fillStyle = 'rgba(4,6,9,0.95)'; x.fill(); x.strokeStyle = mag ? 'rgba(217,70,239,0.35)' : cb(0.3); x.stroke();
      x.font = '700 11px Orbitron, Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = mag ? 'rgba(240,171,252,0.6)' : 'rgba(165,243,252,0.55)';
      for (let i = 0; i < wd.length; i++) x.fillText(wd[i], sx + 9, sy + 12 + i * 16);
    }
    // caixa-d'água e antena
    if (rnd() < 0.4) { rrect(x, px + 20, top - 34, 30, 26, [8, 8, 2, 2]); x.fillStyle = 'rgba(4,5,8,0.95)'; x.fill(); x.strokeStyle = cb(0.12); x.stroke(); x.beginPath(); x.moveTo(px + 25, top - 8); x.lineTo(px + 25, top); x.moveTo(px + 45, top - 8); x.lineTo(px + 45, top); x.stroke(); }
    px += w + 8 + rnd() * 30;
  }
  // fios entre os prédios
  x.beginPath(); for (let i = 0; i < 8; i++) { const a = rnd() * W, b = a + 200 + rnd() * 300, y0 = 260 + rnd() * 200; x.moveTo(a, y0); x.quadraticCurveTo((a + b) / 2, y0 + 50, b, y0 + rnd() * 30); } x.strokeStyle = cb(0.08); x.stroke();
  return s;
};
BG.drawCity = function (ctx, camX, camY, time) {
  if (!this.cityFar) { this.cityFar = this.makeCityFar(); this.cityNear = this.makeCityNear(); }
  const fW = 1920, fx = -((camX * 0.12) % fW), fy = -60 - camY * 0.12;
  ctx.drawImage(this.cityFar.c, fx, fy, fW, 760); ctx.drawImage(this.cityFar.c, fx + fW, fy, fW, 760);
  // o raio: o céu inteiro clareia por um instante
  if (City.flash > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, 0, CFG.VIEW_H); g.addColorStop(0, `rgba(165,243,252,${(0.22 * City.flash).toFixed(3)})`); g.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H); ctx.restore();
  }
  City.drawBolt(ctx);
  const nW = 1536, nx = -((camX * 0.36) % nW), ny = 40 - camY * 0.34;
  ctx.drawImage(this.cityNear.c, nx, ny, nW, 900); ctx.drawImage(this.cityNear.c, nx + nW, ny, nW, 900);
  City.drawRain(ctx, camX, camY, 'back');
  // a rua lá embaixo: o brilho dos carros e das lojas subindo pela névoa
  const sy = World.pxH - camY - 140, g2 = ctx.createLinearGradient(0, sy, 0, sy + 200);
  g2.addColorStop(0, 'rgba(34,211,238,0)'); g2.addColorStop(1, 'rgba(34,211,238,0.12)');
  ctx.fillStyle = g2; ctx.fillRect(0, sy, CFG.VIEW_W, 200);
};
