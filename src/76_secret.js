
/* ============================== 1-1 · O SEGREDO (pedido do dono, "como no Donkey Kong") ==============================
   1. TRÊS RASTEJANTES logo no começo (c20-30, antes da porta 1), cada um andando do seu jeito (nada de trem amarrado:
      o dono achou a dica aparente demais). Eles não mordem, só empurram (o iniciante não morre ali). A cada 19 s eles
      caem no mesmo passo e, por um instante, indo para a direita, ficam em sequência certinha (o grafite apagado do MURAL no fundo brilha de leve).
      Pisão no último da fila, no do meio e no da frente, segurando o pulo: o 3º quique (≈ 16 blocos) bate a cabeça
      num tijolo INVISÍVEL lá no alto (c28, linha 3). O 2º quique não chega. Pedido do dono: antes o tijolo ficava na
      torre da porta 2 e só um casco jogado para cima alcançava; ele achou impossível e quis algo que exige atenção.
   2. O tijolo trava, a tela "dá pau" (falso erro: TO BE NOT FOUND) e o mundo reinicia: cai o WARP CARD.
      Quem termina a 1-1 com pontuação máxima ganha o CARTÃO DOURADO: daí em diante a 1-1 já começa com o cartão.
   3. A TO BE ENGINE, no fim do corredor 2, todo mundo vê e ninguém liga sem o cartão. Com ele: a tabela inteira do TO BE
      (HE = a Nexy, SHE = a Echo), as 7 ligações (errar não zera: a errada volta no fim da fila) e a escalada acima do A1.
   4. Ligada, ela teletransporta a Nexy para a praça final com as vidas cheias, e a Echo ganha o TIRO (fica salvo).
   O caminho normal continua inteiro: o segredo é um atalho e um poder, nunca a única saída. */

/* ---------- o falso travamento ---------- */
const Glitch = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 1, b: null, shell: null, ev: {},
  start(b, shell) {
    Object.assign(this, { active: true, t: 0, b, shell, ev: {} });
    Game.state = 'cinematic'; Game.clearInput(); Voice.stop();
    if (shell) { shell.state = 'shell'; shell.vx = 0; shell.vy = 0; shell.y = (b.r + 1) * TS - 6; shell.x = b.c * TS + TS / 2 - shell.w / 2; shell.px = shell.x; shell.py = shell.y; }
    SFX.glitch();
  },
  once(k, fn) { if (!this.ev[k]) { this.ev[k] = true; fn(); } },
  key() { },
  update(dt) {
    this.t += dt; const t = this.t, sh = this.shell;
    if (sh && t < 0.5) { sh.x = this.b.c * TS + TS / 2 - sh.w / 2 + (Math.random() - 0.5) * 7; sh.px = sh.x; }   // preso no tijolo, tremendo
    if (t > 0.45) this.once('crash', () => { SFX.glitch(); Music.set({ bass: 0, organ: 0, perc: 0, pad: 0 }); });
    if (t > 1.5) this.once('reboot', () => SFX.powerup());
    if (t > 1.95) this.end();
  },
  end() {
    if (!this.active) return;
    this.active = false; const b = this.b;
    b.state = 'used'; b.bump = 1; Game.foundSecret('glitch');
    Ents.spawn('card', { x: b.c * TS + TS / 2, y: (b.r + 1) * TS + 2 });
    if (this.shell) { this.shell.vy = 60; this.shell.immune = 0.3; }
    Music.normal(); if (Game.state === 'cinematic') Game.state = 'play'; Game.clearInput();
  },
  drawWorld() { },
  drawScreen(ctx) {
    if (!this.active) return;
    const t = this.t, W = CFG.VIEW_W, H = CFG.VIEW_H;
    if (t < 0.45) {   // primeiros sinais: riscos e um tremor de cor
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? 'rgba(34,211,238,0.18)' : 'rgba(217,70,239,0.2)'; ctx.fillRect(0, Math.random() * H, W, 1 + Math.random() * 3); }
      return;
    }
    if (t < 1.5) {
      // a tela "trava": fatias deslocadas da própria imagem, faixas de cor e a caixa de erro
      const cv = R.cv;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 10; i++) {
        const y = Math.floor(Math.random() * cv.height), h = Math.floor(4 + Math.random() * cv.height * 0.06), dx = Math.floor((Math.random() - 0.5) * 70 * R.k);
        ctx.drawImage(cv, 0, y, cv.width, h, dx, y, cv.width, h);
      }
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? 'rgba(34,211,238,0.12)' : 'rgba(217,70,239,0.14)'; ctx.fillRect(0, Math.random() * H, W, 6 + Math.random() * 30); }
      ctx.restore();
      const bx = W / 2 - 210, by = H / 2 - 70;
      ctx.fillStyle = 'rgba(2,3,6,0.92)'; ctx.fillRect(bx, by, 420, 140);
      ctx.strokeStyle = 'rgba(34,211,238,0.85)'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, 419, 139);
      const lines = ['FATAL ERROR 0x2B', 'TO BE NOT FOUND', 'world.exe stopped speaking', '> REBOOTING WORLD' + (Math.floor(t * 4) % 2 ? '_' : '')];
      lines.forEach((l, i) => R.draw(R.text(l, (i === 0 ? '700 16px' : '500 13px') + ' "JetBrains Mono", monospace', i < 2 ? '#22d3ee' : wa(0.75), i === 0 ? 'rgba(0,217,249,0.8)' : null, i === 0 ? 6 : 0), W / 2, by + 30 + i * 28));
      return;
    }
    // reinício: uma linha de luz varre a tela de cima para baixo
    const k = (t - 1.5) / 0.45, y = k * H;
    ctx.fillStyle = `rgba(0,0,0,${0.6 * (1 - k)})`; ctx.fillRect(0, y, W, H - y);
    ctx.fillStyle = 'rgba(240,171,252,0.9)'; ctx.fillRect(0, y, W, 2);
    R.draw(R.glow('m', 64), W / 2, y, 8, 0.4, true);
  },
};

/* ---------- o WARP CARD (cai do tijolo, quica e brilha) ---------- */
Ents.reg('card', {
  init(e) { e.w = 22; e.h = 15; e.x -= e.w / 2; e.vy = -240; e.res = {}; e.onGround = false; e.kind = 'item'; },
  update(e, dt) {
    if (!e.onGround) {
      e.vy = Math.min(e.vy + 1400 * dt, 600);
      e.res = World.move(e, 0, e.vy * dt);
      if (e.res.floor) { e.onGround = true; e.vy = 0; SFX.bump(); }
    }
    if (overlap(e, P.box())) { e.dead = true; Engine.getCard(e); }
  },
  draw(ctx, e, x, y) {
    const bob = e.onGround ? Math.sin(e.t * 3) * 2 - 3 : 0, cx = x + e.w / 2, cy = y + e.h / 2 + bob;
    R.draw(R.glow('m', 40), cx, cy, 1, 0.55 + 0.2 * Math.sin(e.t * 5), true);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(e.t * 2) * 0.12);
    rrect(ctx, -11, -7.5, 22, 15, 3); ctx.fillStyle = '#12091a'; ctx.fill(); ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#22d3ee'; ctx.fillRect(-11, -3.5, 22, 2.5);
    rrect(ctx, -7, 0, 6, 4.5, 1); ctx.fillStyle = '#e879f9'; ctx.fill();
    ctx.restore();
  },
});

/* ---------- a TO BE ENGINE: dois pilares, um arco com 7 soquetes e o círculo do teletransporte ---------- */
Ents.reg('engine', {
  layer: 'back',
  init(e) {
    e.w = 3 * TS; e.h = 4 * TS; e.x = e.c * TS + TS / 2 - e.w / 2; e.y = (e.r + 1) * TS - e.h; e.on = 0; e.deny = 0; e.onPad = false;
    const def = World.level.doors[e.opts.door];
    World.doors[e.opts.door] = { id: e.opts.door, def, kind: 'engine', x: e.x + e.w / 2 - 20, y: (e.r + 1) * TS - 40, w: 40, h: 40,
      open: false, opening: 0, errors: 0, read: false, hint: false, morph: 0, mirror: 0, chimes: [], ent: e, online: false, wired: 0 };
  },
  update(e, dt) {
    const d = World.doors[e.opts.door];
    e.on = approach(e.on, d.online ? 1 : 0, dt * 1.5); if (e.deny > 0) e.deny -= dt;
    // ligada: entrar no círculo teletransporta (só ao entrar: quem fechou o painel em cima dele não é levado sem querer)
    const on = Game.state === 'play' && !P.dead && P.onGround && Math.abs(P.cx - (e.x + e.w / 2)) < 14 && Math.abs(P.y + P.h - (e.y + e.h)) < 2;
    if (d.online && on && !e.onPad) Warp.start(d);
    e.onPad = on;
  },
  draw(ctx, e, x, y) {
    const t = e.t, d = World.doors[e.opts.door], on = e.on, cx = x + e.w / 2, base = y + e.h, near = Math.abs(P.cx - (e.x + e.w / 2)) < TS * 5;
    // o círculo no chão
    R.draw(R.glow(on > 0.5 ? 'm' : 'c', 64), cx, base - 6, 1.4, 0.18 + 0.4 * on, true);
    ctx.save(); ctx.translate(cx, base - 3); ctx.scale(1, 0.24);
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(0, 0, 36 - i * 12, 0, Math.PI * 2); ctx.strokeStyle = on > 0.5 ? `rgba(240,171,252,${0.9 - i * 0.3})` : ca(0.5 - i * 0.15); ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.restore();
    // ligada: anéis subindo e o feixe
    if (on > 0.05) {
      const g = ctx.createLinearGradient(cx - 30, 0, cx + 30, 0);
      g.addColorStop(0, 'rgba(217,70,239,0)'); g.addColorStop(0.5, `rgba(240,171,252,${0.22 * on})`); g.addColorStop(1, 'rgba(217,70,239,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 30, y + 8, 60, e.h - 10);
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.7 + i / 3) % 1), ry = base - 4 - k * (e.h - 16);
        ctx.save(); ctx.translate(cx, ry); ctx.scale(1, 0.24); ctx.beginPath(); ctx.arc(0, 0, 30 - k * 10, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(232,121,249,${(1 - k) * on})`; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
    }
    // os pilares e o arco
    for (const s of [-1, 1]) {
      const px = cx + s * 40;
      ctx.beginPath(); ctx.moveTo(px - 6, base); ctx.lineTo(px - 6, y + 34); ctx.lineTo(px, y + 22); ctx.lineTo(px + 6, y + 34); ctx.lineTo(px + 6, base); ctx.closePath();
      ctx.fillStyle = 'rgba(10,15,18,0.96)'; ctx.fill(); ctx.strokeStyle = ca(0.55); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, y + 40); ctx.lineTo(px, base - 8); ctx.strokeStyle = on > 0.5 ? 'rgba(232,121,249,0.6)' : ca(0.18); ctx.stroke();
    }
    ogivePath(ctx, cx - 40, y + 6, 80, 60); ctx.strokeStyle = ca(0.4); ctx.lineWidth = 1.2; ctx.stroke();
    // os 7 soquetes do TO BE (acendem a cada ligação certa; todos acesos = ligada)
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.08 + i * 0.14), sx = cx + Math.cos(a) * 34, sy = y + 46 + Math.sin(a) * 30, lit = d.online || i < d.wired;
      if (lit) R.draw(R.glow('m', 14), sx, sy, 1, 0.8, true);
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fillStyle = lit ? '#f0abfc' : '#0a0f12'; ctx.fill(); ctx.strokeStyle = lit ? '#fff' : ca(0.45); ctx.stroke();
    }
    // o console com a fenda do cartão (no pilar da esquerda)
    const kx = cx - 40, ky = y + e.h - 46, hasCard = Game.card && !d.online;
    rrect(ctx, kx - 11, ky, 22, 26, 4); ctx.fillStyle = 'rgba(10,15,18,0.98)'; ctx.fill(); ctx.strokeStyle = e.deny > 0 ? 'rgba(240,171,252,0.95)' : ca(0.6); ctx.stroke();
    ctx.fillStyle = hasCard ? `rgba(240,171,252,${0.6 + 0.4 * Math.sin(t * 6)})` : d.online ? '#e879f9' : ca(0.35); ctx.fillRect(kx - 7, ky + 7, 14, 2.5);
    // a inscrição e o estado
    R.draw(R.text(d.def.inscription, '700 13px Orbitron, Inter, sans-serif', '#22d3ee', 'rgba(0,217,249,0.7)', 8), cx, y - 26, 1, 0.9);
    if (near && Game.state === 'play') {
      const msg = d.online ? 'ONLINE · STEP IN' : Game.card ? 'CARD READY · ↑' : 'INSERT CARD';
      const blink = d.online || Game.card ? 1 : (Math.floor(t * 2) % 2 ? 1 : 0.35);
      R.draw(R.text(msg, '600 10px Orbitron, Inter, sans-serif', d.online || Game.card ? '#f0abfc' : wa(0.7), 'rgba(217,70,239,0.8)', 6), cx, y - 8, 1, blink);
    }
  },
});

/* ---------- a tela da máquina (usa o mesmo painel do Baú da Memória) ---------- */
const PRONOUN_ICONS = {
  i: '<svg viewBox="-32 -32 64 64"><g stroke="#d946ef" stroke-width="2" fill="#050505"><rect x="-8" y="-4" width="16" height="22" rx="8"/><circle cy="-13" r="8"/></g><path d="M10 6 L3 2" stroke="#22d3ee" stroke-width="2.2" stroke-linecap="round"/><circle cx="2" cy="1.5" r="2" fill="#22d3ee"/></svg>',
  you: '<svg viewBox="-32 -32 64 64"><circle r="22" fill="none" stroke="#22d3ee" stroke-opacity=".35" stroke-dasharray="3 4"/><path d="M-16 6 L6 6 L6 -2 L14 -2" fill="none" stroke="#d946ef" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 -7 L18 -2 L10 3" fill="none" stroke="#f0abfc" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  he: '<svg viewBox="-32 -32 64 64"><path d="M-12 20 L-8 -4 Q0 -24 8 -4 L12 20 Z" fill="#050505" stroke="#22d3ee" stroke-width="2" stroke-linejoin="round"/><path d="M-4 -6 Q0 4 4 -6" fill="none" stroke="#a5f3fc" stroke-width="1.6"/><path d="M16 -14 V22" stroke="#22d3ee" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="-16" r="3" fill="#a5f3fc"/></svg>',
  she: '<svg viewBox="-32 -32 64 64"><g stroke="#d946ef" stroke-width="2" fill="#050505"><rect x="-12" y="-2" width="16" height="22" rx="8"/><circle cx="-4" cy="-11" r="8"/></g><path d="M-11 -16 L-10 -24 L-6 -18 M3 -16 L2 -24 L-2 -18" fill="none" stroke="#f0abfc" stroke-width="1.6" stroke-linejoin="round"/><circle cx="15" cy="-14" r="6" fill="#050505" stroke="#f0abfc" stroke-width="1.4"/><circle cx="15" cy="-14" r="2.4" fill="#e879f9"/></svg>',
  it: '<svg viewBox="-32 -32 64 64"><g stroke="#22d3ee" stroke-width="3" fill="none" stroke-linecap="round"><circle cx="-9" r="8"/><path d="M-1 0 H20 M14 0 V7 M19 0 V9"/></g></svg>',
  we: '<svg viewBox="-32 -32 64 64"><g stroke="#d946ef" stroke-width="2" fill="#050505"><rect x="-14" y="-2" width="14" height="20" rx="7"/><circle cx="-7" cy="-10" r="7"/></g><circle cx="13" cy="-6" r="8" fill="#050505" stroke="#f0abfc" stroke-width="1.6"/><circle cx="13" cy="-6" r="3.2" fill="#e879f9"/></svg>',
  they: '<svg viewBox="-32 -32 64 64"><g fill="#050505" stroke="#22d3ee" stroke-opacity=".75" stroke-width="1.6">' +
    [-17, 0, 17].map(dx => `<path d="M${dx - 8} 12 L${dx - 9} 4 L${dx - 5} -3 L${dx} -6 L${dx + 5} -3 L${dx + 9} 4 L${dx + 8} 12 Z"/>`).join('') + '</g>' +
    [-17, 0, 17].map(dx => `<circle cx="${dx}" cy="4" r="1.8" fill="#22d3ee"/>`).join('') + '</svg>',
};
const NAME_OF = { i: 'me', you: 'you, the player', he: 'the old voice', she: 'Nexy, Echo', it: 'the key, the door', we: 'Nexy + Echo', they: 'the crawlers' };

const Engine = {
  d: null, st: null, showPt: false, timers: [], busy: false,
  // pegar o cartão
  getCard(e) {
    Game.card = true; SFX.powerup(); SFX.letter(); UI.msg('WARP CARD', 2200);
    FX.burst(e.x + e.w / 2, e.y + e.h / 2, 30, 'm', 240, { life: 0.8, g: 0 });
    Game.grimoireWord('CARD', 'SECRET');
    if (Game.echoBorn) Echo.talk(ECHO.lines.card);
  },
  // ↑ na máquina
  use(d) {
    if (d.online) return Warp.start(d);
    if (!Game.card) {
      SFX.thud(); d.ent.deny = 0.6; UI.msg('INSERT CARD', 1600);
      if (!d.metMachine && Game.echoBorn) { d.metMachine = true; Echo.talk(ECHO.lines.machine); }
      return;
    }
    this.open(d);
  },
  open(d) {
    this.d = d; Game.state = 'engine'; P.vx *= 0.3; this.busy = false;
    if (!d.ui) d.ui = { step: 'intro', streak: 0, order: this.shuffle(), tier: 0, rung: 0, fell: false };
    this.st = d.ui;
    this.showPt = !!Save.data.assist.subtitles;
    $('ckind').textContent = 'TO BE ENGINE'; $('chest').classList.add('on'); $('chest').classList.remove('dim');
    $('ckeys').textContent = '← → CHOOSE · ENTER OK · H TRANSLATION · ESC CLOSE';
    Music.set({ perc: 0, organ: 0.3, bass: 0.5 });
    this.render();
  },
  close() {
    this.stop(); Voice.stop();
    $('chest').classList.remove('on'); $('ckind').textContent = 'MEMORY CHEST';
    if (Game.state === 'engine') { Game.state = 'play'; Music.normal(); }
    Game.clearInput();
  },
  stop() { for (const k of this.timers) clearTimeout(k); this.timers = []; },
  later(ms, fn) { this.timers.push(setTimeout(fn, ms)); },
  shuffle() { const a = ENGINE.table.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  key(e) {
    const c = e.code;
    if (c === 'Escape') { if (!this.busy) this.close(); return; }
    if (c === 'KeyH') { this.showPt = !this.showPt; SFX.ui(); document.querySelectorAll('#chest [data-pt]').forEach(el => { el.textContent = this.showPt ? el.dataset.pt : ''; }); return; }
    UI.menuKey(e);
  },
  pt(text) { return `<div class="c-pt" data-pt="${text.replace(/"/g, '&quot;')}">${this.showPt ? text : ''}</div>`; },
  btn(label, act, cls = '') { return `<button class="btn ${cls}" data-a="${act}">${label}</button>`; },
  sockets() { const n = this.st.step === 'wire' ? this.st.streak : (['online', 'climb', 'done'].includes(this.st.step) ? 7 : 0); return `<div class="e-sockets">${ENGINE.table.map((r, i) => `<i class="${i < n ? 'on' : ''}">${r.p}</i>`).join('')}</div>`; },
  sayRow(r) { return (r.p === 'I' ? 'I' : r.p.charAt(0) + r.p.slice(1).toLowerCase()) + ' ' + r.v.toLowerCase() + '.'; },
  go(step, extra = {}) { Object.assign(this.st, { step }, extra); this.render(); },
  render() {
    const st = this.st, body = $('cbody');
    this.stop();
    $('csteps').innerHTML = ['intro', 'learn', 'wire', 'climb'].map((s, i, a) => { const cur = { online: 'climb', done: 'climb' }[st.step] || st.step, ci = a.indexOf(cur); return `<i class="${i < ci ? 'done' : i === ci ? 'on' : ''}"></i>`; }).join('');
    $('cpower').innerHTML = ['online', 'climb', 'done'].includes(st.step) ? [1, 2, 3, 4].map(i => `<i class="${i <= st.tier ? 'on' : ''}"></i>`).join('') : '';
    $('cpower').style.display = $('cpower').innerHTML ? 'flex' : 'none';
    let h = '';
    if (st.step === 'intro') {
      h = `<div class="c-title">TO BE ENGINE</div><div class="c-sub">Card accepted. The engine runs on the verb TO BE. All of it.</div>${this.pt('Cartão aceito. A máquina funciona com o verbo TO BE inteiro: cada pronome com o seu verbo.')}
        ${this.sockets()}
        <div class="c-actions">${this.btn('LEARN THE TABLE →', 'learn', 'primary')}${this.btn('I KNOW IT · WIRE IT →', 'wire')}</div>`;
    } else if (st.step === 'learn') {
      h = `<div class="c-title">THE VERB TO BE</div><div class="c-sub">Listen and look. <b class="e-new">HE</b> and <b class="e-new">SHE</b> are new.</div>${this.pt('Ouça e veja. HE (ele) é a voz antiga que fala nas portas; SHE (ela) é a Nexy, e a Echo também. HE, SHE e IT pedem IS.')}
        <div class="e-table">${ENGINE.table.map((r, i) => `<button class="btn e-row" data-a="row" data-i="${i}">${PRONOUN_ICONS[r.icon]}<span class="e-p">${r.p}</span><span class="e-v">${r.v}</span><span class="e-n">${NAME_OF[r.icon]}${r.fresh ? ' · <b class="e-new">NEW</b>' : ''}</span></button>`).join('')}</div>
        <div class="c-actions">${this.btn('▶ LISTEN', 'hear', 'small')}${this.btn('WIRE IT →', 'wire', 'primary')}</div>`;
    } else if (st.step === 'wire') {
      const r = ENGINE.table[st.order[st.streak]];
      h = `<div class="c-title">WIRE THE ENGINE</div><div class="c-sub">Wire all 7. A wrong wire only sparks: that one comes back later.</div>${this.pt('Ligue as 7. Errou? Só solta faísca: aquela ligação volta no fim para você tentar de novo.')}
        ${this.sockets()}
        <div class="e-card">${PRONOUN_ICONS[r.icon]}<span class="e-p">${r.p}</span><span class="e-slot" id="eslot"></span><span class="e-n">${NAME_OF[r.icon]}</span></div>
        <div class="c-row">${['AM', 'IS', 'ARE'].map(v => `<button class="btn copt e-plug" data-a="plug" data-v="${v}">${v}</button>`).join('')}</div>
        <div class="c-ev" id="cev">${st.msg || ''}</div>
        <div class="c-actions">${this.btn('← TABLE', 'learn', 'small')}</div>`;
      st.msg = '';
    } else if (st.step === 'online') {
      h = `<div class="c-title chal">ENGINE ONLINE</div><div class="c-sub">The Echo has a new power: <b style="color:#f0abfc">${SHOT[0].name}</b>. Climb higher: harder sentences, above A1. Every right answer makes the shot stronger. One try each. A wrong answer ends the climb, but you keep your power.</div>
        ${this.pt('A Echo ganhou um poder: o tiro paralisante. Suba mais: frases mais difíceis, acima do A1. Cada acerto deixa o tiro mais forte. Uma tentativa por frase; errar encerra a escalada, mas o poder fica.')}
        <div class="c-row">${SHOT.map((s, i) => `<div class="e-tier${i <= st.tier ? ' on' : ''}"><i></i><span class="n">${s.name}</span><span class="d">${s.info}</span></div>`).join('')}</div>
        <div class="c-actions">${this.btn('CLIMB ↑', 'climb', 'primary')}${this.btn('TELEPORT →', 'warp')}</div>`;
    } else if (st.step === 'climb') {
      const r = ENGINE.climb[st.rung];
      h = `<div class="c-sub">STEP ${st.rung + 1} / ${ENGINE.climb.length} · LEVEL ${r.level} · ${SHOT[st.tier].name}</div>
        <div class="c-q">${r.q}</div>
        <div class="c-opts">${r.options.map((o, i) => `<button class="btn copt" data-a="rung" data-i="${i}">${o}</button>`).join('')}</div><div class="c-ev" id="cev"></div><div class="c-actions" id="cnext"></div>`;
    } else if (st.step === 'done') {
      const S = SHOT[st.tier], voice = Save.data.assist.voice && Listen.available();
      h = `<div class="c-title chal">ECHO SHOT · ${S.name}</div><div class="c-sub">${S.info}</div>${this.pt(S.pt + '. O 1º tiro paralisa o Rastejante (dá para pisar nele); o 2º quebra.')}
        <div class="e-keys"><span><b>F</b> SHOOT</span><span><b>Y</b> GAMEPAD</span><span><b>SHOT</b> TOUCH</span>${voice ? '<span><b>V</b> HOLD · SAY "STOP!"</span>' : ''}</div>
        <div class="c-actions">${this.btn('TELEPORT →', 'warp', 'primary')}</div>`;
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.a, b)));
    if (st.step === 'learn') this.playTable();
    if (st.step === 'intro') Voice.say(ENGINE.intro.en, 'story', { cut: true });
    this.later(30, () => { const f = body.querySelector('.btn.primary') || body.querySelector('.copt') || body.querySelector('.btn'); if (f) f.focus({ preventScroll: true }); });
  },
  // a tabela: cada linha acende enquanto o narrador diz ("He is.") — som, texto e imagem juntos
  playTable() {
    for (const w of ['HE', 'SHE']) { if (!Game.wordsSeen.has(w)) { Game.wordsSeen.add(w); Game.learnedOrder.push(w); } Game.grimoireWord(w, 'TO BE ENGINE'); }
    const rows = [...document.querySelectorAll('#chest .e-row')];
    ENGINE.table.forEach((r, i) => this.later(300 + i * 1250, () => { rows.forEach((el, j) => el.classList.toggle('say', j === i)); Voice.say(this.sayRow(r), 'story', { cut: true }); }));
    this.later(300 + ENGINE.table.length * 1250, () => rows.forEach(el => el.classList.remove('say')));
  },
  act(a, el) {
    if (this.busy) return;
    const st = this.st;
    if (a === 'learn') { SFX.ui(); return this.go('learn'); }
    if (a === 'wire') { SFX.ui(); return this.go('wire', { streak: 0, order: this.shuffle() }); }
    if (a === 'hear') { this.stop(); return this.playTable(); }
    if (a === 'row') { const r = ENGINE.table[+el.dataset.i]; Voice.say(this.sayRow(r), 'story', { cut: true }); document.querySelectorAll('#chest .e-row').forEach(x => x.classList.toggle('say', x === el)); return; }
    if (a === 'plug') return this.plug(el.dataset.v, el);
    if (a === 'climb') { SFX.ui(); return this.go('climb', { rung: 0 }); }
    if (a === 'rung') return this.answer(+el.dataset.i, el);
    if (a === 'up') { SFX.ui(); return st.rung < ENGINE.climb.length - 1 && !st.fell ? this.go('climb', { rung: st.rung + 1 }) : this.go('done'); }
    if (a === 'warp') { const d = this.d; this.close(); return Warp.start(d); }
  },
  // uma ligação: certa acende o soquete; errada mostra a certa e a máquina recomeça (embaralhada)
  plug(v, el) {
    const st = this.st, r = ENGINE.table[st.order[st.streak]], d = this.d;
    $('eslot').textContent = v;
    if (v === r.v) {
      el.classList.add('right'); SFX.letter(); Voice.say(this.sayRow(r), 'story', { cut: true });
      st.streak++; d.wired = st.streak; this.busy = true;
      this.later(650, () => { this.busy = false; if (st.streak >= 7) this.online(); else this.render(); });
    } else {
      el.classList.add('wrong'); SFX.wrong(); this.busy = true;
      $('cev').innerHTML = `<b>${r.p} ${r.v}</b> · ${this.sayRow(r)}${this.showPt ? '<br><span style="color:var(--txt-3)">' + r.pt + '</span>' : ''}`;
      this.later(500, () => Voice.say(this.sayRow(r), 'story', { cut: true }));
      // errar não zera: a ligação errada vai para o fim da fila (volta depois, já com a resposta ouvida)
      this.later(2000, () => { this.busy = false; st.order.push(st.order.splice(st.streak, 1)[0]); st.msg = 'Try again later.'; this.render(); });
    }
  },
  online() {
    const st = this.st, d = this.d;
    d.online = true; d.wired = 7; SFX.powerup(); Game.shake(3);
    Save.data.shot.best = Math.max(Save.data.shot.best, 0); Save.write(); EchoShot.refill();
    this.go('online');
  },
  // escalada: uma tentativa por degrau
  answer(i, el) {
    const st = this.st, r = ENGINE.climb[st.rung], opts = [...document.querySelectorAll('#chest .copt')];
    if (opts.some(b => b.disabled)) return;
    opts.forEach(b => { b.disabled = true; });
    const right = i === r.answer;
    opts[r.answer].classList.add('right');
    if (right) {
      st.tier = Math.min(SHOT.length - 1, st.tier + 1); SFX.powerup();
      Save.data.shot.best = Math.max(Save.data.shot.best, st.tier); Save.write(); EchoShot.refill();
      $('cev').innerHTML = `<b>${SHOT[st.tier].name}</b> · ${SHOT[st.tier].info}<br><span style="color:var(--txt-3)">${r.tip}</span>`;
    } else {
      el.classList.add('wrong'); SFX.wrong(); st.fell = true;
      $('cev').innerHTML = `The climb ends here. The Echo keeps <b>${SHOT[st.tier].name}</b>.<br><span style="color:var(--txt-3)">${r.tip}</span>`;
    }
    this.later(450, () => Voice.say(r.say, 'story', { cut: true }));
    const last = st.rung >= ENGINE.climb.length - 1;
    $('cnext').innerHTML = this.btn(right && !last ? 'NEXT STEP ↑' : 'FINISH →', 'up', 'primary');
    $('cnext').querySelector('button').addEventListener('click', () => this.act('up'));
    this.later(30, () => { const b = $('cnext') && $('cnext').querySelector('button'); if (b) b.focus({ preventScroll: true }); });
  },
};

/* ---------- o teletransporte (pegada God of War: silêncio, tambores, o TO BE girando, o clarão) ---------- */
const Warp = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 1, flash: 0, ev: {},
  start(d) {
    if (this.active || !World.level.warp) return;
    const e = d.ent;
    Object.assign(this, { active: true, t: 0, d, zoom: 1, sat: 0, letter: 0, flash: 0, rings: [], ev: {}, moved: false,
      words: ENGINE.table.map((r, i) => ({ s: r.p + ' ' + r.v, a: i / 7 * Math.PI * 2 })) });
    this.pad = { x: e.x + e.w / 2, y: e.y + e.h };
    P.dropHeld(); Game.state = 'cinematic'; Game.clearInput(); Voice.stop();
    P.vx = 0; P.vy = 0; P.invuln = 99; P.x = this.pad.x - P.w / 2; P.y = this.pad.y - P.h; P.px = P.x; P.py = P.y; P.facing = 1;
    // o motor bebe os IS e ARE da barra (é o combustível dele); assim sobra lugar para AM, BIG e SMALL na praça
    const fuel = Game.bar.filter(w => w === 'IS' || w === 'ARE');
    if (fuel.length) { Game.consumeWords(fuel); UI.msg('FUEL · ' + fuel.join(' · '), 2200); }
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.4 }); Music.setDrone(true); SFX.riser(1.8);
  },
  once(k, fn) { if (!this.ev[k]) { this.ev[k] = true; fn(); } },
  key(e) { if (['Enter', 'NumpadEnter', 'Escape', 'Space', 'KeyZ'].includes(e.code) && this.t > 0.5) { if (!this.moved) { this.t = 1.9; this.update(0); } this.end(); } },
  update(dt) {
    this.t += dt; const t = this.t, ease = (a, b, k) => a + (b - a) * (1 - Math.exp(-dt * k));
    if (!this.moved) {
      this.zoom = ease(this.zoom, 1.35, 1.6); this.sat = ease(this.sat, 0.55, 2); this.letter = ease(this.letter, 1, 3);
      [0.5, 1.0, 1.5].forEach((at, i) => { if (t > at) this.once('drum' + i, () => { SFX.warDrum(); Game.shake(3 + i * 2); this.rings.push({ x: this.pad.x, y: this.pad.y, r: 8, life: 1 }); }); });
      for (const w of this.words) w.a += dt * (1.2 + t * 2.4);
      if (Math.random() < 0.9) FX.add(this.pad.x + (Math.random() - 0.5) * 60, this.pad.y - 4, { vy: -120 - Math.random() * 140, vx: 0, life: 0.9, size: 1.5, c: Math.random() < 0.5 ? 'm' : 'c', g: 0 });
    }
    if (t >= 1.9 && !this.moved) this.jump();
    if (this.moved) { this.zoom = ease(this.zoom, 1, 4); this.sat = ease(this.sat, 0, 4); this.letter = ease(this.letter, 0, 4); }
    if (t > 3) this.end();
    for (const r of this.rings) { r.r += dt * 380; r.life -= dt * 1.3; }
    this.rings = this.rings.filter(r => r.life > 0);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    P.px = P.x; P.py = P.y; FX.update(dt);
  },
  // o clarão: a Nexy reaparece na praça final, com as vidas cheias
  jump() {
    this.moved = true; this.flash = 1;
    const w = World.level.warp, fx = w.c * TS + TS / 2, fy = (w.r + 1) * TS;
    P.x = fx - P.w / 2; P.y = fy - P.h; P.px = P.x; P.py = P.y;
    Game.lives = Math.max(Game.lives, CFG.START_LIVES); Game.checkpoint = { x: fx, y: fy };
    Spawns.reset(); Cam.snap(); Echo.reset(); Echo.hidden = !Game.echoBorn; EchoShot.refill();
    this.pad = { x: fx, y: fy }; this.rings.push({ x: fx, y: fy, r: 6, life: 1 });
    SFX.warDrum(); SFX.oneUp(); Game.shake(6); UI.msg('LIVES ×' + Game.lives, 2400);
    FX.burst(fx, fy, 40, 'm', 280, { life: 0.9, g: 300 }); FX.burst(fx, fy, 24, 'c', 220, { life: 0.8, g: 300 });
  },
  end() {
    if (!this.active) return;
    this.active = false; this.zoom = 1; this.sat = 0; this.letter = 0;
    if (Game.state === 'cinematic') Game.state = 'play';
    P.invuln = 0.5; Music.setDrone(false); Music.normal(); Game.clearInput();
    const voice = Save.data.assist.voice && Listen.available();
    if (Game.echoBorn) Game.later(0.3, () => Echo.talk(ECHO.lines.warp.concat(EchoShot.tier() >= 0 && !EchoShot.used ? ECHO.lines.shot.concat(voice ? ECHO.lines.shotVoice : []) : [])));
    if (EchoShot.tier() >= 0 && !EchoShot.used) EchoShot.tutorial = true;
  },
  drawWorld(ctx, camX, camY) {
    const px = this.pad.x - camX, py = this.pad.y - camY;
    if (!this.moved || this.t < 2.4) {
      const k = this.moved ? 1 - (this.t - 1.9) / 0.5 : Math.min(1, this.t / 0.8);
      const g = ctx.createLinearGradient(px - 30, 0, px + 30, 0);
      g.addColorStop(0, 'rgba(217,70,239,0)'); g.addColorStop(0.5, `rgba(240,171,252,${0.4 * k})`); g.addColorStop(1, 'rgba(217,70,239,0)');
      ctx.fillStyle = g; ctx.fillRect(px - 30, 0, 60, py);
    }
    for (const r of this.rings) { ctx.save(); ctx.translate(r.x - camX, r.y - camY); ctx.scale(1, 0.3); ctx.beginPath(); ctx.arc(0, 0, r.r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(232,121,249,${r.life})`; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }
    if (!this.moved) {
      // o verbo TO BE inteiro girando em volta da Nexy, cada vez mais perto
      const rad = Math.max(18, 90 - this.t * 38);
      for (const w of this.words) {
        const x = P.cx - camX + Math.cos(w.a) * rad, y = P.cy - camY + Math.sin(w.a) * rad * 0.45;
        R.draw(R.text(w.s, '700 10px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 6), x, y, 1, 0.85);
      }
    }
  },
  drawScreen(ctx) {
    if (!this.active) return;
    const bar = 62 * this.letter;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CFG.VIEW_W, bar); ctx.fillRect(0, CFG.VIEW_H - bar, CFG.VIEW_W, bar);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash)})`; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H); }
  },
};

/* ---------- os TRÊS RASTEJANTES e o MURAL (o caminho até o cartão) ----------
   Cada um anda do seu jeito (velocidade própria, para, fareja, vira, cruza com os outros). Só num trecho de cada ciclo
   (F0..F1) eles caem no mesmo passo, um atrás do outro com 'gap' de distância; indo para a direita, por ~1,75 s ficam em
   sequência e o pisão triplo alcança o tijolo. Nada liga um ao outro: quem não presta atenção não vê.
   A posição vem do relógio da simulação (como o trem da 1-3): o mesmo momento sempre se repete. */
const Conga = {
  xa: 20 * TS, xb: 30 * TS - 26, v: 40, gap: 112,
  C: 19, F0: 4, F1: 9.5,
  // fora da fila: [tempo desde F1, x]; começa onde a fila larga cada um e termina onde ela os pega (com o mesmo sentido)
  free: [
    [[0, 848], [4, 720], [5, 720], [9, 920], [9.7, 920], [12.7, 760], [13.5, 800]],
    [[0, 908], [0.65, 934], [2, 934], [6, 760], [6.8, 760], [9, 850], [12.8, 650], [13.5, 688]],
    [[0, 796], [2.5, 896], [3.5, 896], [6.5, 770], [8, 770], [9.5, 840], [10, 840], [13.5, 704]],
  ],
  tri(t) {
    const L = this.xb - this.xa, per = 2 * L / this.v, d = (((t % per) + per) % per) * this.v;
    return d < L ? { x: this.xa + d, dir: 1 } : { x: this.xa + 2 * L - d, dir: -1 };
  },
  phase(t) { return ((t % this.C) + this.C) % this.C; },
  // i = 0 é a frente; na fila os outros seguem o mesmo caminho, atrasados. stop = parado (fareja)
  pos(i, t) {
    const f = this.phase(t);
    if (f >= this.F0 && f <= this.F1) return this.tri(f - i * this.gap / this.v);
    const u = (f - this.F1 + this.C) % this.C, k = this.free[i];
    for (let j = 1; j < k.length; j++) {
      if (u > k[j][0] && j < k.length - 1) continue;
      const [t0, x0] = k[j - 1], [t1, x1] = k[j], q = clamp((u - t0) / (t1 - t0), 0, 1);
      if (x1 !== x0) return { x: x0 + (x1 - x0) * q, dir: sign(x1 - x0) };
      // parado: olha para onde vinha andando e, na metade, vira para onde vai
      const prev = j > 1 ? sign(x0 - k[j - 2][1]) : 1, next = j < k.length - 1 ? sign(k[j + 1][1] - x1) : prev;
      return { x: x0, dir: q < 0.5 ? prev : next, stop: true };
    }
  },
  cars() { return Ents.list.filter(e => e.type === 'conga' && !e.dead && e.state === 'walk').sort((a, b) => a.opts.i - b.opts.i); },
  // em sequência: os três vivos, na fila, indo para a direita, a frente já adiante (k = 0..1 quanto do instante já passou)
  state(t) {
    const f = this.phase(t), all = this.cars().length === 3, need = this.xa + 2 * this.gap;
    if (f < this.F0 || f > this.F1) return { all, on: false, k: 0 };
    const p = this.tri(f);
    return { all, on: all && p.dir > 0 && p.x >= need, k: clamp((p.x - need) / (this.xb - need), 0, 1) };
  },
};
Ents.reg('conga', {
  layer: 'enemy',
  init(e) { e.w = 26; e.h = 24; e.enemy = true; e.kind = 'enemy'; e.state = 'walk'; e.creature = 'CRAWLER'; e.dir = 1; e.res = {}; e.dx = 0; e.dy = 0; e.bumpT = 0; this.place(e); },
  place(e) { const p = Conga.pos(e.opts.i, Game.simTime); e.x = p.x; e.dir = p.dir; e.stop = !!p.stop; },
  update(e, dt) {
    if (e.state !== 'walk') return Ents.types.crawler.update(e, dt);   // amassado ou caindo: igual a um Rastejante
    if (e.bumpT > 0) e.bumpT -= dt;
    const ox = e.x; this.place(e); e.dx = e.x - ox;
  },
  // um Rastejante comum (parado, as pernas não mexem)
  draw(ctx, e, x, y) { Ents.types.crawler.draw(ctx, e.stop && e.state === 'walk' ? Object.assign({}, e, { asleep: true }) : e, x, y); },
});
// o mural no fundo: um grafite velho e apagado (três Rastejantes, riscos 1, 2 e 3 subindo e um quadradinho lá no alto).
// Quase invisível; quando os três estão em sequência, a tinta brilha de leve, sem letreiro. Só desenho.
Ents.reg('mural', {
  layer: 'back',
  init(e) { e.x = e.c * TS; e.y = e.r * TS; e.w = 11 * TS; e.h = 6 * TS; e.glow = 0; },
  update(e, dt) { e.lit = Conga.state(Game.simTime).on; e.glow = approach(e.glow, e.lit ? 1 : 0, dt * 1.5); },
  draw(ctx, e, x, y) {
    const g = e.glow, w = e.w, h = e.h;
    ctx.save(); ctx.globalAlpha = 0.1 + 0.18 * g;
    // tinta escorrida na parede (sem moldura)
    const gy = y + h - 26, xs = [x + 136, x + 216, x + 296], bx = x + 28 * TS + TS / 2 - e.x, by = y + 3 * TS + 8 - e.y;
    ctx.strokeStyle = ca(0.8); ctx.lineWidth = 1.2;
    for (const [i, cx] of xs.entries()) {
      ctx.beginPath(); ctx.moveTo(cx - 11, gy + 7); ctx.lineTo(cx - 12, gy - 1); ctx.lineTo(cx - 6, gy - 7); ctx.lineTo(cx, gy - 10); ctx.lineTo(cx + 6, gy - 7); ctx.lineTo(cx + 12, gy - 1); ctx.lineTo(cx + 11, gy + 7); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 4 + i * 3, gy + 7); ctx.lineTo(cx - 4 + i * 3, gy + 13 + i * 4); ctx.stroke();   // a tinta que escorreu
      // os riscos: 1, 2, 3, cada um mais alto
      for (let k = 0; k <= i; k++) { const ty = gy - 22 - i * 16, tx = cx - i * 3 + k * 6; ctx.beginPath(); ctx.moveTo(tx, ty - 5); ctx.lineTo(tx, ty + 5); ctx.stroke(); }
    }
    // o quadradinho torto lá em cima, onde fica o tijolo de verdade
    ctx.strokeStyle = 'rgba(240,171,252,0.9)'; ctx.strokeRect(bx - 5, by + 2, 10, 10);
    ctx.restore();
    if (g > 0.05) R.draw(R.glow('c', 64), x + w / 2, y + h - 30, w / 120, 0.1 * g, true);
  },
});

/* ============================== O TIRO DA ECHO ==============================
   F (Y no controle, SHOT no toque): a Echo atira luz para onde a Nexy olha. O 1º tiro PARALISA (o inimigo vira cristal,
   não machuca e vira plataforma por alguns segundos); o 2º QUEBRA (e solta orbes). Gigantes não sentem nada.
   Cargas por nível (SHOT), recarga com o tempo e nos checkpoints. VOICE MODE: segure V e diga STOP! (o tempo fica lento
   enquanto a Echo escuta). */
const EchoShot = {
  charges: 0, t: 0, bolts: [], listening: false, listenT: 0, tutorial: false, used: false, emptyT: 0,
  tier() { return Save.data && Save.data.shot ? Save.data.shot.best : -1; },
  conf() { return SHOT[clamp(this.tier(), 0, SHOT.length - 1)]; },
  reset() { this.bolts = []; this.t = 0; this.listening = false; this.tutorial = false; this.charges = this.tier() >= 0 ? this.conf().max : 0; },
  refill() { if (this.tier() >= 0) { this.charges = this.conf().max; this.t = 0; } },
  ready() { return this.tier() >= 0 && Game.echoBorn && !Echo.hidden && Game.state === 'play' && !P.dead; },
  fire() {
    if (!this.ready()) return false;
    if (this.charges <= 0) { SFX.thud(); this.emptyT = 0.6; return false; }
    this.charges--; this.used = true; this.tutorial = false;
    // mira: o inimigo mais perto à frente (a Echo flutua acima da cabeça e os Rastejantes são baixinhos);
    // sem alvo, segue reto na altura do peito da Nexy
    const dir = P.facing, sx = Echo.x, sy = Echo.y;
    let tx = sx + dir * 8 * TS, ty = P.y + P.h * 0.55, bd = 9 * TS;
    for (const e of Ents.enemies()) {
      const ex = e.x + e.w / 2, ey = e.y + e.h / 2, dx = (ex - P.cx) * dir;
      if (dx < -6 || dx > 9 * TS || Math.abs(ey - P.cy) > 3 * TS || e.state === 'held') continue;
      const d = Math.hypot(dx, ey - P.cy); if (d < bd) { bd = d; tx = ex; ty = ey; }
    }
    const a = Math.atan2(ty - sy, tx - sx);
    this.bolts.push({ x: sx, y: sy, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 1.1, hit: new Set(), trail: [] });
    SFX.zap(); Echo.pulse = 1; FX.burst(Echo.x, Echo.y, 10, 'm', 160, { life: 0.3, g: 0 });
    return true;
  },
  // comando de voz: STOP! (ou FREEZE, FIRE, SHOOT)
  listen() {
    if (this.tier() < 0 || !Save.data.assist.voice || !Listen.available() || Listen.active || Game.state !== 'play') return false;
    this.listening = true; this.listenT = 0; UI.msg('SAY · STOP!', 1800); SFX.select();
    const ok = Listen.start(alts => {
      const heard = alts.join(' ').toLowerCase();
      if (/\b(stop|freeze|fire|shoot)\b/.test(heard)) { if (this.fire()) UI.msg('STOP!', 900); }
      else UI.msg('HEARD · "' + (alts[0] || '').toUpperCase() + '"', 1600);
    }, () => { this.listening = false; });
    if (!ok) { this.listening = false; UI.msg('MICROPHONE UNAVAILABLE'); }
    return ok;
  },
  update(dt) {
    if (this.tier() < 0) return;
    const C = this.conf();
    if (this.charges < C.max) { this.t += dt; if (this.t >= C.every) { this.t = 0; this.charges++; } } else this.t = 0;
    if (this.emptyT > 0) this.emptyT -= dt;
    for (const b of this.bolts) {
      if (C.homing) {   // a luz caçadora procura o inimigo mais perto à frente
        let best = null, bd = 7 * TS;
        for (const e of Ents.enemies()) { if (e.frozen > 0 && b.hit.has(e)) continue; const dx = (e.x + e.w / 2 - b.x) * sign(b.vx), d = Math.hypot(dx, e.y + e.h / 2 - b.y); if (dx > 0 && d < bd) { bd = d; best = e; } }
        if (best) b.vy = approach(b.vy, clamp((best.y + best.h / 2 - b.y) * 5, -520, 520), 2200 * dt);
      }
      b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 7) b.trail.shift();
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      const c = Math.floor(b.x / TS), r = Math.floor(b.y / TS), tt = World.type(c, r);
      if (World.solidStatic(c, r) || tt === T.RUNE || (tt === T.BLOCK && World.blockSolid(World.blockAt(c, r))) || (tt === T.DOOR && World.solidFor(c, r, {}, 'x', 0))) {
        b.life = 0; SFX.thud(); FX.burst(b.x, b.y, 8, 'm', 120, { life: 0.3, g: 0 }); continue;
      }
      const box = { x: b.x - 6, y: b.y - 6, w: 12, h: 12 };
      for (const e of Ents.list) {
        if (e.shootable && !e.dead && !b.hit.has(e) && overlap(box, e)) { if (Ents.types[e.type].shot(e, 1, b)) { b.hit.add(e); b.life = 0; break; } continue; }
        if (!e.enemy || e.dead || e.state === 'dying' || e.state === 'flat' || e.state === 'held' || b.hit.has(e) || !overlap(box, e)) continue;
        b.hit.add(e); this.hit(e, b);
        if (!C.pierce || e.type === 'giant') { b.life = 0; break; }
      }
    }
    this.bolts = this.bolts.filter(b => b.life > 0);
  },
  hit(e, b) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (e.type === 'giant') { SFX.thud(); e.shake = 0.3; FX.burst(cx, cy, 8, 'c', 120, { life: 0.3 }); return; }
    if (e.frozen > 0) {   // 2º tiro: o cristal quebra
      e.frozen = 0; e.plat = false; Enemy.kill(e, 'pop', sign(b.vx) || 1); SFX.glass();
      FX.burst(cx, cy, 26, 'm', 260, { life: 0.8, g: 400 });
      for (let i = 0; i < 2; i++) Ents.spawn('orb', { x: cx, y: cy, vx: (i - 0.5) * 140, vy: -260, homing: true, delay: 0.25 + i * 0.05 });
      return;
    }
    // 1º tiro: paralisa (cristal magenta; não machuca e dá para pisar em cima)
    e.frozen = this.conf().stun; e.plat = true; e.dx = 0; e.dy = 0; e.vx = 0;
    SFX.freeze(); FX.burst(cx, cy, 18, 'c', 180, { life: 0.5, g: 0 });
    Game.registerCreature(e.creature || CREATURE_OF[e.type]);
  },
  // o cristal em volta do inimigo paralisado (pisca no último segundo)
  drawFrozen(ctx, e, x, y) {
    if (e.frozen < 1 && Math.floor(e.frozen * 10) % 2) return;
    const cx = x + e.w / 2, cy = y + e.h / 2, w = e.w / 2 + 5, h = e.h / 2 + 5;
    R.draw(R.glow('m', 40), cx, cy, Math.max(w, h) / 30, 0.45, true);
    ctx.beginPath(); ctx.moveTo(cx, cy - h - 4); ctx.lineTo(cx + w, cy - h * 0.4); ctx.lineTo(cx + w, cy + h * 0.6); ctx.lineTo(cx, cy + h + 2); ctx.lineTo(cx - w, cy + h * 0.6); ctx.lineTo(cx - w, cy - h * 0.4); ctx.closePath();
    ctx.fillStyle = 'rgba(217,70,239,0.22)'; ctx.fill(); ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w * 0.5, cy - h * 0.2); ctx.lineTo(cx - w * 0.1, cy - h * 0.7); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
  },
  draw(ctx, camX, camY) {
    for (const b of this.bolts) {
      b.trail.forEach((q, i) => R.draw(R.glow('m', 10), q.x - camX, q.y - camY, 0.5 + i * 0.1, 0.12 + i * 0.06, true));
      R.draw(R.glow('m', 24), b.x - camX, b.y - camY, 1, 0.9, true);
      ctx.beginPath(); ctx.arc(b.x - camX, b.y - camY, 3.2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    }
    // as cargas: pontinhos girando em volta da Echo
    if (this.tier() < 0 || Echo.hidden || !Game.echoBorn) return;
    const n = this.charges, max = this.conf().max, t = Game.time;
    for (let i = 0; i < max; i++) {
      const a = t * 1.8 + i / max * Math.PI * 2, x = Echo.x - camX + Math.cos(a) * 13, y = Echo.y - camY + Math.sin(a) * 5;
      ctx.beginPath(); ctx.arc(x, y, i < n ? 1.7 : 1, 0, Math.PI * 2); ctx.fillStyle = i < n ? '#f0abfc' : (this.emptyT > 0 ? 'rgba(240,171,252,0.8)' : 'rgba(240,171,252,0.25)'); ctx.fill();
    }
    if (this.tutorial && Game.state === 'play') {
      const s = R.text(Input.padSeen ? 'Y · SHOT' : 'F · SHOT', '700 10px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 6);
      const x = Echo.x - camX, y = Echo.y - camY - 22 - Math.abs(Math.sin(t * 3)) * 4;
      capsulePath(ctx, x, y, s.w - 12, 20); ctx.fillStyle = 'rgba(2,2,2,0.75)'; ctx.fill(); ctx.strokeStyle = 'rgba(217,70,239,0.8)'; ctx.lineWidth = 1; ctx.stroke();
      R.draw(s, x, y + 0.5);
    }
  },
};
