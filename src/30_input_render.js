
/* ============================== ENTRADA (teclado + toque + controle) ============================== */
const Input = {
  held: { left: false, right: false, down: false, up: false, run: false, jump: false, spin: false, shoot: false },
  touchHeld: {}, padHeld: {},
  pressedAt: { jump: -1, spin: -1 },
  relAt: { left: -1e9, right: -1e9 }, dashDir: null,   // soltou a seta e apertou de novo logo em seguida: corre até soltar
  queue: [],           // eventos de tecla de borda para a lógica (pressionadas desde o último passo)
  KEYMAP: {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down',
    ArrowUp: 'up', KeyW: 'up', ShiftLeft: 'run', ShiftRight: 'run', KeyZ: 'jump', Space: 'jump', KeyX: 'spin', KeyF: 'shoot',
  },
  init() {
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) { if (Game.onKeyRepeat) Game.onKeyRepeat(e); return; }
      const k = this.KEYMAP[e.code];
      if (k) { if (!this.held[k]) this.edge(k); this.held[k] = true; }
      Game.onKey(e);
    });
    window.addEventListener('keyup', e => {
      const k = this.KEYMAP[e.code];
      if (k) { this.held[k] = false; this.release(k); }
    });
    window.addEventListener('blur', () => { for (const k in this.held) this.held[k] = false; this.dashDir = null; });
    window.addEventListener('gamepadconnected', () => { $('padline').classList.add('on'); if (Game.state !== 'title') UI.msg('GAMEPAD CONNECTED'); });
    window.addEventListener('gamepaddisconnected', () => { this.padHeld = {}; this.pad.prev = {}; });
    this.initTouch();
  },
  edge(k) {
    if (k === 'jump' || k === 'spin') this.pressedAt[k] = Game.simTime;
    // 1º toque (pode segurar) anda; soltou e apertou de novo em até DOUBLE_TAP_MS: corre enquanto segurar
    if ((k === 'left' || k === 'right') && performance.now() - this.relAt[k] < CFG.DOUBLE_TAP_MS) {
      this.dashDir = k; this.relAt[k] = -1e9; if (Game.onDash) Game.onDash();
    }
    this.queue.push(k);
  },
  release(k) {
    if ((k !== 'left' && k !== 'right') || this.get(k)) return;
    this.relAt[k] = performance.now();
    if (k === this.dashDir) this.dashDir = null;
  },
  dashing() { return !!this.dashDir && this.get(this.dashDir); },
  get(k) { return this.held[k] || !!this.touchHeld[k] || !!this.padHeld[k]; },

  /* ---------- controle (Gamepad API, mapeamento padrão Xbox / PlayStation) ----------
     Jogando: direcional ou alavanca esquerda movem · A/✕ pula · B/○ giro · X/□, Y/△, LB, RB, LT, RT correm e carregam
     START pausa · SELECT/BACK solta o item. Nos menus e no painel das portas: A confirma, B volta,
     X apaga a última palavra, Y pede dica, direcional navega (com repetição ao segurar). */
  pad: { prev: {}, rep: { k: null, t: 0 } },
  pollPad() {
    let list = null;
    try { list = navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { list = null; }
    let gp = null;
    if (list) for (const p of list) if (p && p.connected && p.buttons && p.buttons.length) { gp = p; break; }
    const prev = this.pad.prev;
    if (!gp) { if (Object.keys(prev).length) { for (const k of ['left', 'right']) if (this.padHeld[k]) { this.padHeld[k] = false; this.release(k); } this.padHeld = {}; this.pad.prev = {}; } return; }
    const b = i => { const x = gp.buttons[i]; return !!x && (x.pressed || x.value > 0.5); };
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const now = {
      left: b(14) || ax < -0.45, right: b(15) || ax > 0.45, up: b(12) || ay < -0.6, down: b(13) || ay > 0.6,
      jump: b(0), spin: b(1), x: b(2), y: b(3), sh: b(5) || b(6) || b(7), lb: b(4), start: b(9), select: b(8),
    };
    const pressed = k => now[k] && !prev[k];
    const ui = !['play', 'map'].includes(Game.state);
    const key = code => Game.onKey({ code, repeat: false, preventDefault() { } });
    // teclas do jogo (seguradas)
    // com o tiro da Echo (ou o LASER), Y atira e, segurado, carrega o laser (sem eles, Y corre como X)
    const shotOn = typeof EchoShot !== 'undefined' && (EchoShot.tier() >= 0 || P.power === 'laser');
    const game = { left: now.left, right: now.right, up: now.up, down: now.down, jump: now.jump, spin: now.spin, run: now.x || (now.y && !shotOn) || now.sh, shoot: now.y && shotOn };
    for (const k in game) {
      if (game[k] && !this.padHeld[k]) { this.padHeld[k] = true; if (!this.held[k] && !this.touchHeld[k]) this.edge(k); }
      else if (!game[k] && this.padHeld[k]) { this.padHeld[k] = false; this.release(k); }
    }
    // botões de sistema
    if (pressed('start')) key(Game.state === 'title' ? 'Enter' : 'Escape');
    if (pressed('select') && Game.state === 'play') key('KeyQ');
    if (pressed('lb') && Game.state === 'play') key('KeyC');
    if (pressed('y') && Game.state === 'play' && shotOn) key('KeyF');
    this.padSeen = true;
    if (ui) {
      if (pressed('jump')) key('Enter');
      if (pressed('spin')) key('Escape');
      if (pressed('x')) key('Backspace');
      if (pressed('y')) key('KeyH');
      // direcional nos menus, com repetição ao segurar
      const dirs = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }, r = this.pad.rep, t = performance.now();
      let held = null;
      for (const d in dirs) if (now[d]) held = d;
      if (held && held !== r.k) { r.k = held; r.t = t + 380; key(dirs[held]); }
      else if (held && t >= r.t) { r.t = t + 140; key(dirs[held]); }
      else if (!held) r.k = null;
    } else this.pad.rep.k = null;
    this.pad.prev = now;
  },
  initTouch() {
    const root = $('touch'), pad = $('dpad');
    const active = new Map(); // pointerId → tecla do botão, ou { pad: [teclas] } para o direcional
    const refresh = () => {
      const now = {};
      for (const v of active.values()) { if (v && v.pad) for (const k of v.pad) now[k] = true; else if (v) now[v] = true; }
      const before = this.touchHeld;
      for (const k of ['left', 'right', 'down', 'up', 'run', 'jump', 'spin', 'ping', 'shot']) {
        if (now[k] && !before[k]) this.edge(k);
      }
      this.touchHeld = now;
      for (const k of ['left', 'right']) if (before[k] && !now[k]) this.release(k);
      root.querySelectorAll('.tb').forEach(b => b.classList.toggle('on', !!now[b.dataset.k]));
      pad.querySelectorAll('.arm').forEach(b => b.classList.toggle('on', !!now[b.dataset.arm]));
    };
    const keyAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest && el.closest('.tb'); return b ? b.dataset.k : null; };
    // o direcional: o ângulo do dedo a partir do centro (o dedo pode sair do disco: vale a direção). Os lados ganham uma
    // fatia maior (60°) para quem só quer andar não agachar nem olhar para cima sem querer; as diagonais ficam com 35°.
    const padKeys = (x, y) => {
      const r = pad.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.11) return [];
      const a = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;
      return a < 30 || a >= 330 ? ['right'] : a < 65 ? ['up', 'right'] : a < 115 ? ['up'] : a < 150 ? ['up', 'left']
        : a < 210 ? ['left'] : a < 245 ? ['down', 'left'] : a < 295 ? ['down'] : ['down', 'right'];
    };
    const same = (a, b) => a.length === b.length && a.every(k => b.includes(k));
    const onDown = e => {
      document.body.classList.add('touch');
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.closest && el.closest('#dpad')) { e.preventDefault(); active.set(e.pointerId, { pad: padKeys(e.clientX, e.clientY) }); refresh(); return; }
      const k = keyAt(e.clientX, e.clientY);
      if (!k) return;
      e.preventDefault(); active.set(e.pointerId, k); refresh();
    };
    const onMove = e => {
      if (!active.has(e.pointerId)) return;
      e.preventDefault();
      const v = active.get(e.pointerId);
      if (v && v.pad) { const ks = padKeys(e.clientX, e.clientY); if (!same(ks, v.pad)) { v.pad = ks; refresh(); } return; }
      const k = keyAt(e.clientX, e.clientY);
      // permite deslizar de um botão para outro sem levantar o dedo
      if (k !== v) { active.set(e.pointerId, k); refresh(); }
    };
    const onUp = e => { if (active.has(e.pointerId)) { active.delete(e.pointerId); refresh(); } };
    root.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    window.addEventListener('touchstart', () => document.body.classList.add('touch'), { passive: true });
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  },
};

/* ============================== RENDER: escala, cache de sprites e brilhos ==============================
   Os brilhos são pré-renderizados em canvases auxiliares (sem shadowBlur por quadro). */
const R = {
  cv: null, ctx: null, k: 1, cache: new Map(), fontsReady: false,
  init() {
    this.cv = $('game'); this.ctx = this.cv.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    this.resize();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.fontsReady = true; this.flush(); });
    if (document.fonts && document.fonts.load) {
      Promise.all(['700 16px Orbitron', '900 16px Orbitron', '500 12px Orbitron', '400 12px Inter'].map(f => document.fonts.load(f).catch(() => null)))
        .then(() => this.flush());
    }
  },
  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.min(vw / CFG.VIEW_W, vh / CFG.VIEW_H);
    const st = $('stage');
    st.style.transform = `translate(${Math.round((vw - CFG.VIEW_W * s) / 2)}px, ${Math.round((vh - CFG.VIEW_H * s) / 2)}px) scale(${s})`;
    const k = clamp(s * (window.devicePixelRatio || 1), 0.5, 2);
    if (Math.abs(k - this.k) > 0.01 || this.cv.width !== Math.round(CFG.VIEW_W * k)) {
      this.k = k; this.cv.width = Math.round(CFG.VIEW_W * k); this.cv.height = Math.round(CFG.VIEW_H * k); this.flush();
    }
  },
  flush() { this.cache.clear(); if (typeof World !== 'undefined' && World.chunks) World.chunks.clear(); if (typeof BG !== 'undefined') BG.built = false; },
  // canvas auxiliar em coordenadas lógicas (já escalado por k)
  make(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * this.k)); c.height = Math.max(1, Math.ceil(h * this.k));
    const x = c.getContext('2d'); x.setTransform(this.k, 0, 0, this.k, 0, 0);
    return { c, x, w, h };
  },
  sprite(key, w, h, draw) {
    let s = this.cache.get(key);
    if (!s) { s = this.make(w, h); draw(s.x, w, h); this.cache.set(key, s); }
    return s;
  },
  // desenha um sprite centrado em (x,y) com escala e alpha
  draw(s, x, y, scale = 1, alpha = 1, add = false) {
    const c = this.ctx; if (alpha <= 0) return;
    const pa = c.globalAlpha, pc = c.globalCompositeOperation;
    c.globalAlpha = pa * alpha; if (add) c.globalCompositeOperation = 'lighter';
    c.drawImage(s.c, x - s.w * scale / 2, y - s.h * scale / 2, s.w * scale, s.h * scale);
    c.globalAlpha = pa; c.globalCompositeOperation = pc;
  },
  // brilho radial colorido: 'c' ciano, 'm' magenta, 'w' branco, 't' triplo
  glow(kind, r = 32) {
    return this.sprite('glow:' + kind + r, r * 2, r * 2, (x, w) => {
      const g = x.createRadialGradient(r, r, 0, r, r, r);
      if (kind === 'c') { g.addColorStop(0, 'rgba(34,211,238,0.55)'); g.addColorStop(0.35, 'rgba(6,182,212,0.22)'); g.addColorStop(1, 'rgba(6,182,212,0)'); }
      else if (kind === 'm') { g.addColorStop(0, 'rgba(232,121,249,0.6)'); g.addColorStop(0.35, 'rgba(217,70,239,0.25)'); g.addColorStop(1, 'rgba(217,70,239,0)'); }
      else if (kind === 'w') { g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.3, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
      else { // triplo: branco → ciano → magenta
        g.addColorStop(0, 'rgba(255,255,255,0.42)'); g.addColorStop(0.22, 'rgba(255,255,255,0.18)');
        g.addColorStop(0.45, 'rgba(34,211,238,0.24)'); g.addColorStop(0.72, 'rgba(217,70,239,0.16)'); g.addColorStop(1, 'rgba(217,70,239,0)');
      }
      x.fillStyle = g; x.fillRect(0, 0, w, w);
    });
  },
  // texto com glow pré-renderizado
  text(str, font, color, glowColor, blur = 10, key) {
    const k2 = key || ('txt:' + str + font + color + glowColor + blur);
    let s = this.cache.get(k2);
    if (s) return s;
    const m = this.make(1, 1).x; m.font = font;
    const w = Math.ceil(m.measureText(str).width) + blur * 4 + 8, h = Math.ceil(parseInt(font.match(/(\d+)px/)[1], 10) * 1.5) + blur * 4;
    s = this.make(w, h);
    const x = s.x; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (glowColor) { x.shadowColor = glowColor; x.shadowBlur = blur * this.k; x.fillStyle = color; x.fillText(str, w / 2, h / 2); x.shadowBlur = blur * 0.4 * this.k; }
    x.fillStyle = color; x.fillText(str, w / 2, h / 2);
    this.cache.set(k2, s);
    return s;
  },
};

// Primitivas vetoriais
function capsulePath(ctx, cx, cy, w, h) {
  const r = Math.min(h, w) / 2;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 + r, cy - h / 2); ctx.lineTo(cx + w / 2 - r, cy - h / 2);
  ctx.arc(cx + w / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(cx - w / 2 + r, cy + h / 2);
  ctx.arc(cx - w / 2 + r, cy, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
}
function rrect(ctx, x, y, w, h, r) {
  const rr = typeof r === 'number' ? [r, r, r, r] : r; // tl tr br bl
  ctx.beginPath();
  ctx.moveTo(x + rr[0], y); ctx.lineTo(x + w - rr[1], y); if (rr[1]) ctx.arcTo(x + w, y, x + w, y + rr[1], rr[1]); else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - rr[2]); if (rr[2]) ctx.arcTo(x + w, y + h, x + w - rr[2], y + h, rr[2]); else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + rr[3], y + h); if (rr[3]) ctx.arcTo(x, y + h, x, y + h - rr[3], rr[3]); else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + rr[0]); if (rr[0]) ctx.arcTo(x, y, x + rr[0], y, rr[0]); else ctx.lineTo(x, y);
  ctx.closePath();
}
// arco ogival (gótico) com base em (x,y+h), largura w, altura total h
function ogivePath(ctx, x, y, w, h) {
  const r = w * 0.9, sh = h - w * 0.75;
  ctx.beginPath();
  ctx.moveTo(x, y + h); ctx.lineTo(x, y + h - sh);
  ctx.quadraticCurveTo(x, y + w * 0.12, x + w / 2, y);
  ctx.quadraticCurveTo(x + w, y + w * 0.12, x + w, y + h - sh);
  ctx.lineTo(x + w, y + h); ctx.closePath();
  return r;
}

// Sprite de cápsula de palavra (a mesma forma do HUD). A forma indica a classe gramatical, nunca a cor.
function wordCapsuleSprite(word) {
  const key = 'capS:' + word, hit = R.cache.get(key);
  if (hit) return hit;
  const info = WORDS[word] || { cls: 'noun' };
  const m = R.make(1, 1).x; m.font = '700 12px Orbitron, Inter, sans-serif';
  const tw = m.measureText(word).width + word.length * 1.6;
  const extraL = info.cls === 'verb' || info.cls === 'noun' || info.cls === 'adjective' ? 0 : 8;
  const cw = Math.ceil(tw + 26 + extraL), ch = 24, pad = 22, trail = info.cls === 'verb' ? 16 : 0;
  const s = R.make(cw + pad * 2 + trail, ch + pad * 2);
  const x = s.x, cx = pad + cw / 2, cy = pad + ch / 2;
  // glow magenta
  x.save(); x.shadowColor = 'rgba(217,70,239,0.9)'; x.shadowBlur = 14 * R.k;
  capsulePath(x, cx, cy, cw, ch); x.strokeStyle = '#d946ef'; x.lineWidth = 1.5; x.stroke(); x.restore();
  capsulePath(x, cx, cy, cw, ch);
  if (info.cls !== 'adjective') {
    const g = x.createLinearGradient(0, cy - ch / 2, 0, cy + ch / 2);
    g.addColorStop(0, 'rgba(217,70,239,0.42)'); g.addColorStop(1, 'rgba(217,70,239,0.14)');
    x.fillStyle = '#0a0508'; x.fill(); x.fillStyle = g; x.fill();
  } else { x.fillStyle = 'rgba(5,5,5,0.25)'; x.fill(); }
  x.strokeStyle = '#d946ef'; x.lineWidth = 1.2; x.stroke();
  // rastro do verbo
  if (trail) {
    const gx = x.createLinearGradient(cx + cw / 2, 0, cx + cw / 2 + trail, 0);
    gx.addColorStop(0, '#d946ef'); gx.addColorStop(1, 'rgba(217,70,239,0)');
    x.fillStyle = gx; rrect(x, cx + cw / 2 + 1, cy - 2, trail, 2.4, 1.2); x.fill();
    rrect(x, cx + cw / 2 + 1, cy + 3, trail * 0.6, 1.8, 0.9); x.fill();
  }
  // ponto das outras classes
  if (extraL) { x.save(); x.shadowColor = '#e879f9'; x.shadowBlur = 6 * R.k; x.fillStyle = '#fff'; x.beginPath(); x.arc(cx - cw / 2 + 9, cy, 2.2, 0, Math.PI * 2); x.fill(); x.restore(); }
  x.font = '700 12px Orbitron, Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  try { x.letterSpacing = '1.6px'; } catch (e) { /* navegadores antigos */ }
  x.fillText(word, cx + extraL / 2 + 0.8, cy + 0.5);
  s.cw = cw; s.ch = ch; s.ox = trail / 2;
  R.cache.set(key, s);
  return s;
}
