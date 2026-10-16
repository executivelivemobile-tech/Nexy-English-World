
/* ============================== BAÚ DA MEMÓRIA (1-2) ==============================
   Uma leitura curta sobre a jornada da Nexy, em 5 passos guiados pela ciência do aprendizado:
   palavras-chave antes (imagem + som + tradução) → leitura com voz e karaokê → perguntas com prova no texto →
   ESCALADA opcional acima do A1 (dificuldade crescente; cada acerto muda a cor do Coração e dá mais poder) →
   produção em 1ª pessoa (I AM STRONG). Depois, a cena épica: a Nexy cresce e quebra o Muro do Silêncio. */

// ícones das palavras novas (SVG em linha, só ciano e magenta)
const WORD_ICONS = {
  dark: '<svg viewBox="-32 -32 64 64"><circle r="26" fill="#05060a" stroke="#22d3ee" stroke-opacity=".35"/><circle r="13" fill="#f0f9ff"/><circle cx="7" cy="-5" r="12" fill="#05060a"/>' +
    '<circle cx="-14" cy="14" r="1.2" fill="#7ad8ff"/><circle cx="15" cy="12" r="1" fill="#7ad8ff"/><circle cx="12" cy="-17" r="1" fill="#7ad8ff"/></svg>',
  light: '<svg viewBox="-32 -32 64 64"><circle r="22" fill="#22d3ee" fill-opacity=".12"/><circle r="9" fill="#22d3ee"/><circle r="4" fill="#ffffff"/>' +
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); return `<line x1="${(c * 14).toFixed(1)}" y1="${(s * 14).toFixed(1)}" x2="${(c * 25).toFixed(1)}" y2="${(s * 25).toFixed(1)}" stroke="#7ad8ff" stroke-width="2" stroke-linecap="round"/>`; }).join('') + '</svg>',
  afraid: '<svg viewBox="-32 -32 64 64"><g stroke="#d946ef" stroke-width="2" fill="#050505"><rect x="-8" y="-6" width="16" height="22" rx="8"/><circle cy="-15" r="8"/></g>' +
    '<rect x="-5" y="-17" width="7" height="3" rx="1.5" fill="#f0abfc"/><path d="M-17 -8 l-4 4 l4 4 l-4 4 M17 -8 l4 4 l-4 4 l4 4" stroke="#22d3ee" stroke-width="1.6" fill="none"/>' +
    '<path d="M10 -24 q3 5 0 7 q-3 -2 0 -7z" fill="#7ad8ff"/></svg>',
  strong: '<svg viewBox="-32 -32 64 64"><circle r="27" fill="none" stroke="#e879f9" stroke-opacity=".5" stroke-dasharray="3 4"/><g stroke="#d946ef" stroke-width="2" fill="#050505">' +
    '<rect x="-8" y="-4" width="16" height="22" rx="8"/><circle cy="-13" r="8"/><path d="M-8 2 l-10 -14 M8 2 l10 -14" stroke-linecap="round"/></g>' +
    '<rect x="-2" y="-15" width="8" height="3" rx="1.5" fill="#f0abfc"/><path d="M-22 -20 l3 -5 l3 5 M19 -20 l3 -5 l3 5" stroke="#22d3ee" stroke-width="1.6" fill="none"/></svg>',
};
// cores do Coração por nível (dentro da paleta: ciano → magenta → incandescente → prisma → coroa)
const HEART_LOOK = [
  { glow: 'c', a: '#7ad8ff', b: '#06b6d4', css: '#22d3ee' },
  { glow: 'm', a: '#f0abfc', b: '#d946ef', css: '#d946ef' },
  { glow: 'w', a: '#ffffff', b: '#f0abfc', css: '#ffffff' },
  { glow: 't', a: '#22d3ee', b: '#d946ef', css: 'linear-gradient(135deg,#22d3ee,#d946ef)', prism: true },
  { glow: 't', a: '#22d3ee', b: '#d946ef', css: 'linear-gradient(135deg,#22d3ee,#ffffff,#d946ef)', prism: true, crown: true },
];
function heartPath(ctx, s) {
  ctx.beginPath(); ctx.moveTo(0, 11 * s);
  ctx.bezierCurveTo(-15 * s, 0, -15 * s, -13 * s, -6.5 * s, -13 * s); ctx.bezierCurveTo(-2.5 * s, -13 * s, 0, -10 * s, 0, -6.5 * s);
  ctx.bezierCurveTo(0, -10 * s, 2.5 * s, -13 * s, 6.5 * s, -13 * s); ctx.bezierCurveTo(15 * s, -13 * s, 15 * s, 0, 0, 11 * s); ctx.closePath();
}
function drawHeart(ctx, x, y, s, tier, t, alpha = 1) {
  const L = HEART_LOOK[clamp(tier, 0, 4)];
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y);
  R.draw(R.glow(L.glow, 64), 0, 0, s * 0.9, 0.9, true);
  if (L.crown) for (let i = 0; i < 10; i++) {   // raios da coroa
    const a = i / 10 * Math.PI * 2 + t * 0.6;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 16 * s, Math.sin(a) * 16 * s); ctx.lineTo(Math.cos(a) * 34 * s, Math.sin(a) * 34 * s);
    ctx.strokeStyle = i % 2 ? 'rgba(34,211,238,0.5)' : 'rgba(232,121,249,0.5)'; ctx.lineWidth = 1.4; ctx.stroke();
  }
  heartPath(ctx, s);
  const k = L.prism ? (0.5 + 0.5 * Math.sin(t * 3)) : 0;
  const g = ctx.createLinearGradient(-14 * s, -13 * s, 14 * s, 11 * s);
  g.addColorStop(0, L.prism && k > 0.5 ? L.b : L.a); g.addColorStop(1, L.prism && k > 0.5 ? L.a : L.b);
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
  heartPath(ctx, s * 0.55); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
  ctx.restore();
  // o acréscimo do TO BE PALACE: o anel em volta do Coração
  if (Save.data.heart.ring && !PalaceSwitch.active) Palace.drawRing(ctx, x, y, s, t, alpha);
  // o acréscimo da cidade (1-3): a agulha da Bússola das Palavras atravessando o Coração
  if ((Save.data.heart.compass | 0) > 0 && !CompassScene.active) City.drawNeedle(ctx, x, y, s, Math.sin(t * 0.8) * 0.25, alpha);
}

/* ---------- o baú (entidade) ---------- */
Ents.reg('chest', {
  layer: 'back',
  init(e) {
    e.w = 60; e.h = 40; e.x = e.c * TS + 2; e.y = (e.r + 1) * TS - e.h; e.light = 130; e.lid = 0;
    const def = World.level.doors[e.opts.door];
    World.doors[e.opts.door] = { id: e.opts.door, def, kind: 'chest', x: e.x, y: e.y, w: e.w, h: e.h, open: false, opening: 0, errors: 0, read: false, hint: false, morph: 0, mirror: 0, chimes: [], ent: e };
  },
  update(e, dt) { const d = World.doors[e.opts.door]; e.lid = approach(e.lid, d.done || Cine.lid ? 1 : 0, dt * 1.6); },
  draw(ctx, e, x, y) {
    const t = e.t, d = World.doors[e.opts.door], p = 0.5 + 0.5 * Math.sin(t * 2.2), done = d && d.done;
    R.draw(R.glow(done ? 'c' : 'm', 64), x + 30, y + 14, 1.2, done ? 0.25 : 0.4 + 0.25 * p, true);
    // corpo
    rrect(ctx, x, y + 14, 60, 26, [3, 3, 6, 6]); ctx.fillStyle = 'rgba(10,8,14,0.96)'; ctx.fill(); ctx.strokeStyle = wa(0.28); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, y + 27); ctx.lineTo(x + 56, y + 27); ctx.strokeStyle = 'rgba(217,70,239,' + (0.35 + 0.4 * p) + ')'; ctx.stroke();
    // tampa (abre girando para trás)
    const lid = e.lid;
    ctx.save(); ctx.translate(x, y + 14); ctx.scale(1, 1 - lid * 0.85);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -6); ctx.quadraticCurveTo(30, -18, 60, -6); ctx.lineTo(60, 0); ctx.closePath();
    ctx.fillStyle = 'rgba(10,8,14,0.98)'; ctx.fill(); ctx.strokeStyle = wa(0.3); ctx.stroke();
    ctx.restore();
    if (lid > 0.05) R.draw(R.glow('w', 40), x + 30, y + 10, 1, lid * 0.6, true);
    // runa do coração
    if (!done) { ctx.save(); ctx.translate(x + 30, y + 30); heartPath(ctx, 0.45); ctx.strokeStyle = 'rgba(240,171,252,' + (0.5 + 0.5 * p) + ')'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
  },
});

/* ---------- a interface do baú ---------- */
const Chest = {
  d: null, st: null, showPt: false, kara: [], busy: false,
  get S() { return this.d.def.story; },
  open(d) {
    this.d = d;
    if (!d.chest) d.chest = { step: 'words', page: 0, qi: 0, rung: 0, tier: 0, firstTry: 0, missed: false };
    this.st = d.chest;
    if (d.done) { this.st.step = 'read'; this.st.page = 0; this.st.review = true; }
    this.showPt = !!Save.data.assist.subtitles; this.busy = false;
    $('chest').classList.add('on'); $('chest').classList.remove('dim');
    Music.set({ perc: 0, organ: 0.45, bass: 0.6 });
    this.render();
  },
  close() {
    this.stopKara(); Voice.stop();
    $('chest').classList.remove('on');
    if (Game.state === 'chest') { Game.state = 'play'; Music.normal(); }
    Game.clearInput();
  },
  key(e) {
    const c = e.code;
    if (c === 'Escape') { if (!this.busy) this.close(); return; }
    if (c === 'KeyH') { this.showPt = !this.showPt; SFX.ui(); document.querySelectorAll('#chest [data-pt]').forEach(el => { el.textContent = this.showPt ? el.dataset.pt : ''; }); return; }
    if (c === 'KeyV' && this.st.step === 'you') return this.listen();
    UI.menuKey(e);
  },
  /* ---- fala com karaokê: cada palavra acende enquanto é dita ---- */
  stopKara() { for (const k of this.kara) clearTimeout(k); this.kara = []; },
  speakSpans(text, spans) {
    this.stopKara();
    const offs = []; let pos = 0;
    for (const sp of spans) { const i = text.indexOf(sp.textContent, pos); offs.push(i); pos = i + sp.textContent.length; }
    const mark = i => spans.forEach((s, j) => s.classList.toggle('k', j === i));
    let viaBoundary = false;
    Voice.say(text, 'story', {
      cut: true,
      onBoundary: ci => { viaBoundary = true; let j = 0; while (j + 1 < offs.length && offs[j + 1] <= ci) j++; mark(j); },
      onEnd: () => mark(-1),
    });
    // sem eventos de fronteira (ou sem voz): acende no ritmo de leitura
    let at = 280;
    spans.forEach((sp, j) => { this.kara.push(setTimeout(() => { if (!viaBoundary) mark(j); }, at)); at += 210 + sp.textContent.length * 48; });
    this.kara.push(setTimeout(() => { if (!viaBoundary) mark(-1); }, at + 200));
  },
  textHTML(text, extra = []) {
    const nw = new Set(this.S.words.map(w => w.w.toLowerCase()).concat(extra));
    return text.split(' ').map(tok => { const bare = tok.toLowerCase().replace(/[^a-z]/g, ''); return `<span class="${nw.has(bare) ? 'nw' : ''}">${tok}</span>`; }).join(' ');
  },
  wireText(box) {
    box.querySelectorAll('span').forEach(sp => sp.addEventListener('click', () => { const w = sp.textContent.replace(/[^A-Za-z']/g, ''); if (w) Voice.say(w, 'echo', { cut: true }); }));
    return [...box.querySelectorAll('span')];
  },
  pt(text) { return `<div class="c-pt" data-pt="${text.replace(/"/g, '&quot;')}">${this.showPt ? text : ''}</div>`; },
  btn(label, act, cls = '') { return `<button class="btn ${cls}" data-a="${act}">${label}</button>`; },
  /* ---- passos ---- */
  steps() {
    const order = ['words', 'read', 'quiz', 'climb', 'you'], cur = { offer: 'climb', cread: 'climb', climb: 'climb' }[this.st.step] || this.st.step;
    const ci = order.indexOf(cur);
    $('csteps').innerHTML = order.map((s, i) => `<i class="${i < ci ? 'done' : i === ci ? 'on' : ''}"></i>`).join('');
    const tier = this.st.tier, L = HEART_LOOK[tier];
    $('cpower').innerHTML = [1, 2, 3, 4].map(i => `<i class="${i <= tier ? 'on' : ''}" style="${i <= tier ? 'background:' + HEART_LOOK[i].css : ''}"></i>`).join('');
    $('cpower').title = HEART[tier].name;
    $('cpower').style.display = this.st.step === 'words' || this.st.step === 'read' || this.st.step === 'quiz' ? 'none' : 'flex';
    void L;
  },
  render() {
    const st = this.st, S = this.S, body = $('cbody');
    this.stopKara(); this.steps();
    let h = '';
    if (st.step === 'words') {
      h = `<div class="c-title">4 NEW WORDS</div><div class="c-sub">Listen and look. These words are in the story.</div>${this.pt('Ouça e veja. Estas palavras estão na história.')}
        <div class="c-cards">${S.words.map((w, i) => `<button class="btn ccard" data-a="word" data-i="${i}">${WORD_ICONS[w.icon]}<span class="w">${w.w}</span><span class="p">${WORDS[w.w].pt}</span></button>`).join('')}</div>
        <div class="c-actions">${this.btn('▶ LISTEN', 'hear', 'small')}${this.btn('READ THE STORY →', 'next', 'primary')}</div>`;
    } else if (st.step === 'read') {
      const p = S.pages[st.page];
      h = `<div class="c-sub">${st.review ? 'THE STORY · ' : ''}PAGE ${st.page + 1} / ${S.pages.length}</div><div class="c-text" id="ctext">${this.textHTML(p.en)}</div>${this.pt(p.pt)}
        <div class="c-actions">${this.btn('▶ LISTEN AGAIN', 'hear', 'small')}${st.page > 0 ? this.btn('←', 'prev', 'small') : ''}${this.btn(st.page < S.pages.length - 1 ? 'NEXT →' : (st.review ? 'CLOSE' : 'QUESTIONS →'), 'next', 'primary')}</div>`;
    } else if (st.step === 'quiz') {
      const q = S.questions[st.qi];
      h = `<div class="c-sub">QUESTION ${st.qi + 1} / ${S.questions.length}</div><div class="c-q">${q.q}</div>${this.pt(q.pt)}
        <div class="c-opts">${q.options.map((o, i) => `<button class="btn copt" data-a="opt" data-i="${i}">${o}</button>`).join('')}</div><div class="c-ev" id="cev"></div>`;
    } else if (st.step === 'offer') {
      h = `<div class="c-title chal">THE CLIMB</div>
        <div class="c-sub">The chest is open. Your Heart is <b style="color:#22d3ee">CYAN</b>.<br>Climb higher: harder questions, above A1. Every right answer makes the Heart stronger and changes its color. One try each. A wrong answer ends the climb, but you keep your power.</div>
        ${this.pt('O baú abriu e seu Coração é ciano. Suba mais: perguntas mais difíceis, acima do A1. Cada acerto deixa o Coração mais forte e muda a cor dele. Uma tentativa por pergunta; errar encerra a escalada, mas o poder conquistado fica.')}
        <div class="c-row">${HEART.map((hh, i) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:120px"><i style="width:16px;height:16px;transform:rotate(45deg);background:${HEART_LOOK[i].css};box-shadow:0 0 12px rgba(217,70,239,.5)"></i><span style="font:600 9px var(--f-display);letter-spacing:.14em;color:#fff;text-align:center">${hh.name}</span><span style="font:400 10px var(--f-body);color:var(--txt-3);text-align:center">${hh.reward}</span></div>`).join('')}</div>
        <div class="c-actions">${this.btn('CLIMB ↑', 'climb', 'primary')}${this.btn('NOT NOW', 'skipclimb')}</div>`;
    } else if (st.step === 'cread') {
      const p = S.climb.page;
      h = `<div class="c-title chal">THE CLIMB · READ</div><div class="c-text small" id="ctext">${this.textHTML(p.en, ['was', 'stronger', 'than', 'because', 'yesterday', 'today'])}</div>${this.pt(p.pt)}
        <div class="c-actions">${this.btn('▶ LISTEN AGAIN', 'hear', 'small')}${this.btn('START ↑', 'next', 'primary')}</div>`;
    } else if (st.step === 'climb') {
      const r = S.climb.rungs[st.rung];
      h = `<div class="c-sub">STEP ${st.rung + 1} / ${S.climb.rungs.length} · LEVEL ${r.level} · ${HEART[st.tier].name}</div>
        <div class="c-text small" id="ctext" style="min-height:0;font-size:17px;color:var(--txt-2)">${this.textHTML(S.climb.page.en, ['was', 'stronger', 'than', 'because'])}</div>
        <div class="c-q">${r.q}</div>${this.pt(r.pt)}
        <div class="c-opts">${r.options.map((o, i) => `<button class="btn copt" data-a="rung" data-i="${i}">${o}</button>`).join('')}</div><div class="c-ev" id="cev"></div><div class="c-actions" id="cnext"></div>`;
    } else if (st.step === 'you') {
      const f = S.final;
      h = `<div class="c-title">NOW YOU</div><div class="c-sub">Say it with your Heart.</div>${this.pt('Diga com o seu Coração.')}
        <div class="c-mold" id="cmold">${f.mold.map(tk => tk === '_' ? '<div class="slot" id="cslot"></div>' : `<span class="fx">${tk}</span>`).join('')}</div>
        <div class="c-row">${f.options.map(w => `<button class="btn copt" data-a="say" data-w="${w}" style="font-family:var(--f-display);letter-spacing:.14em">${w}</button>`).join('')}</div>
        <div class="c-ev" id="cev"></div>
        <div class="c-actions">${Save.data.assist.voice && Listen.available() ? this.btn('MIC · V', 'mic', 'small') : ''}</div>`;
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.a, b)));
    const txt = $('ctext'); this.spans = txt ? this.wireText(txt) : [];
    // fala automática de cada tela
    if (st.step === 'words') this.playWords();
    else if (st.step === 'read') this.speakSpans(S.pages[st.page].en, this.spans);
    else if (st.step === 'cread') this.speakSpans(S.climb.page.en, this.spans);
    else if (st.step === 'quiz') Voice.say(S.questions[st.qi].q, 'story', { cut: true });
    else if (st.step === 'climb') Voice.say(S.climb.rungs[st.rung].q, 'story', { cut: true });
    else if (st.step === 'you') Voice.say('Now you. Say it.', 'echo', { cut: true });
    setTimeout(() => { const f = body.querySelector('.btn.primary') || body.querySelector('.copt') || body.querySelector('.btn'); if (f) f.focus({ preventScroll: true }); }, 30);
  },
  // as 4 palavras: entram no Grimório e na Fluência ao serem apresentadas
  playWords() {
    const S = this.S, cards = [...document.querySelectorAll('#chest .ccard')];
    for (const w of S.words) {
      if (!Game.wordsSeen.has(w.w)) { Game.wordsSeen.add(w.w); Game.learnedOrder.push(w.w); }
      Game.grimoireWord(w.w, null);
    }
    S.words.forEach((w, i) => this.kara.push(setTimeout(() => {
      cards.forEach((c, j) => c.classList.toggle('say', j === i)); Voice.say(w.w, 'story', { cut: true }); SFX.select();
    }, 300 + i * 1300)));
    this.kara.push(setTimeout(() => cards.forEach(c => c.classList.remove('say')), 300 + S.words.length * 1300));
  },
  go(step, extra = {}) { Object.assign(this.st, { step }, extra); this.render(); },
  act(a, el) {
    if (this.busy && a !== 'mic') return;
    const st = this.st, S = this.S;
    if (a === 'word') { const w = S.words[+el.dataset.i].w; Voice.say(w, 'story', { cut: true }); document.querySelectorAll('#chest .ccard').forEach(c => c.classList.toggle('say', c === el)); return; }
    if (a === 'hear') { if (st.step === 'words') { this.stopKara(); this.playWords(); } else if (this.spans.length) this.speakSpans(st.step === 'cread' ? S.climb.page.en : S.pages[st.page].en, this.spans); return; }
    if (a === 'prev') return this.go('read', { page: st.page - 1 });
    if (a === 'next') {
      SFX.ui();
      if (st.step === 'words') return this.go('read', { page: 0 });
      if (st.step === 'read') {
        if (st.page < S.pages.length - 1) return this.go('read', { page: st.page + 1 });
        if (st.review) return this.close();
        return this.go('quiz', { qi: 0 });
      }
      if (st.step === 'cread') return this.go('climb', { rung: 0 });
    }
    if (a === 'opt') return this.answer(+el.dataset.i, el);
    if (a === 'climb') { SFX.ui(); return this.go('cread'); }
    if (a === 'skipclimb') { SFX.ui(); return this.go('you'); }
    if (a === 'rung') return this.answerRung(+el.dataset.i, el);
    if (a === 'up') { SFX.ui(); return st.rung < S.climb.rungs.length - 1 && !st.fell ? this.go('climb', { rung: st.rung + 1 }) : this.go('you'); }
    if (a === 'say') return this.say(el.dataset.w);
    if (a === 'mic') return this.listen();
  },
  // perguntas básicas: errar mostra a frase-prova do texto; tenta de novo
  answer(i, el) {
    const st = this.st, q = this.S.questions[st.qi];
    if (el.classList.contains('wrong')) return;
    Voice.say(q.options[i], 'echo', { cut: true });
    if (i === q.answer) {
      el.classList.add('right'); SFX.letter(); this.busy = true;
      if (!st.missedQ) st.firstTry++;
      this.kara.push(setTimeout(() => { this.busy = false; st.missedQ = false; if (st.qi < this.S.questions.length - 1) this.go('quiz', { qi: st.qi + 1 }); else this.go('offer'); }, 1200));
    } else {
      el.classList.add('wrong'); el.disabled = true; SFX.remove(); st.missedQ = true;
      const [pg, sentence] = q.ev, ptLine = this.S.pages[pg].pt;
      $('cev').innerHTML = `Look at the story: <b>${sentence}</b>${this.showPt ? '<br><span style="color:var(--txt-3)">' + ptLine + '</span>' : ''}`;
      this.kara.push(setTimeout(() => Voice.say(sentence, 'story'), 700));
      const next = [...document.querySelectorAll('#chest .copt')].find(b => !b.disabled); if (next) next.focus({ preventScroll: true });
    }
  },
  // escalada: uma tentativa por degrau
  answerRung(i, el) {
    const st = this.st, r = this.S.climb.rungs[st.rung], opts = [...document.querySelectorAll('#chest .copt')];
    if (opts.some(b => b.disabled)) return;
    opts.forEach(b => { b.disabled = true; });
    Voice.say(r.options[i], 'echo', { cut: true });
    const right = i === r.answer;
    opts[r.answer].classList.add('right');
    if (right) {
      st.tier = Math.min(4, st.tier + 1); SFX.powerup(); this.steps();
      $('cev').innerHTML = `<b>${HEART[st.tier].name}</b> · ${HEART[st.tier].reward}<br><span style="color:var(--txt-3)">${r.tip}</span>`;
    } else {
      el.classList.add('wrong'); SFX.wrong(); st.fell = true;
      $('cev').innerHTML = `The climb ends here. Your Heart keeps its power: <b>${HEART[st.tier].name}</b>.<br><span style="color:var(--txt-3)">${r.tip}</span>`;
    }
    const last = st.rung >= this.S.climb.rungs.length - 1;
    $('cnext').innerHTML = this.btn(right && !last ? 'NEXT STEP ↑' : 'CONTINUE →', 'up', 'primary');
    $('cnext').querySelector('button').addEventListener('click', () => this.act('up'));
    setTimeout(() => { const b = $('cnext') && $('cnext').querySelector('button'); if (b) b.focus({ preventScroll: true }); }, 30);
  },
  // produção: I AM ___ .
  say(w) {
    const f = this.S.final, slot = $('cslot'); if (!slot) return;
    slot.innerHTML = ''; slot.appendChild(UI.capsule(w, true));
    Voice.say('I am ' + WORDS[w].say + '.', 'echo', { cut: true });
    if (w === f.answer) { SFX.right(); this.busy = true; this.kara.push(setTimeout(() => this.finish(), 1500)); return; }
    this.busy = true;
    if (w === f.afraid) {
      $('chest').classList.add('dim');
      $('cev').innerHTML = 'Are you? Read again: <b>Nexy is not afraid now.</b>';
      this.kara.push(setTimeout(() => Voice.say('Are you?', 'echo'), 900));
    } else {
      const m = $('cmold'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); SFX.wrong();
      $('cev').innerHTML = 'Look at the story: <b>Words make Nexy ___.</b>';
    }
    this.kara.push(setTimeout(() => { this.busy = false; $('chest').classList.remove('dim'); if ($('cslot')) $('cslot').innerHTML = ''; }, 2000));
  },
  listen() {
    if (!Listen.available() || !Save.data.assist.voice) return;
    $('cev').textContent = 'LISTENING…';
    Listen.start(alts => {
      const ok = alts.some(a => normalizeSentence(a).endsWith('i am strong'));
      $('cev').textContent = 'HEARD · "' + (alts[0] || '').toUpperCase() + '"';
      if (ok) this.say('STRONG'); else SFX.wrong();
    }, got => { if (!got) $('cev').textContent = 'NO VOICE HEARD · TRY AGAIN OR CHOOSE A WORD'; });
  },
  finish() {
    const d = this.d, st = this.st, id = World.level.id, H = Save.data.heart;
    d.done = true; d.tier = st.tier;
    H.by[id] = Math.max(H.by[id] != null ? H.by[id] : -1, st.tier); H.best = Math.max(H.best, st.tier); Save.write();
    for (const w of this.S.words) Game.grimoireWord(w.w, 'MEMORY CHEST');
    this.busy = false; this.stopKara();
    $('chest').classList.remove('on');
    Cine.start(d, st.tier);
  },
};

/* ============================== A CENA DO CORAÇÃO (pegada God of War) ==============================
   Silêncio pesado → o Coração sobe do baú → as palavras que ESTE jogador aprendeu giram em volta da Nexy e entram
   nele → três batidas de tambor de guerra e ela cresce → o grito de batalha → investida em câmera lenta →
   impacto congelado, o muro explode em cacos e a luz entra → a Nexy volta ao tamanho normal (a força fica dentro). */
const Cine = {
  active: false, t: 0, d: null, tier: 0, zoom: 1, letter: 0, sat: 0, flash: 0, timeScale: 1, freezeT: 0, lid: false,
  heart: null, words: [], rings: [], shards: [], dust: [], rays: 0, title: null, glow: 0, impactT: -1, ev: {}, wall: null, skipShown: false,
  reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } },
  start(d, tier) {
    const e = d.ent;
    Object.assign(this, { active: true, t: 0, d, tier, zoom: 1, letter: 0, sat: 0, flash: 0, timeScale: 1, freezeT: 0, lid: true, rings: [], shards: [], dust: [], rays: 0, title: null, glow: 0, impactT: -1, ev: {}, skipShown: false });
    const [c0, r0, c1, r1] = d.def.wall; this.wall = { c0, r0, c1, r1, x: c0 * TS, y: r0 * TS, w: (c1 - c0 + 1) * TS, h: (r1 - r0 + 1) * TS };
    this.heart = { x: e.x + e.w / 2, y: e.y + 10, s: 0.3, a: 0 };
    const learned = Game.learnedOrder.slice(-18);
    this.words = learned.map((w, i) => ({ w, i, a: i / Math.max(1, learned.length) * Math.PI * 2, r: 0, k: 0, gone: false }));
    Game.state = 'cinematic'; P.vx = 0; P.invuln = 99; Game.clearInput();
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.35 }); Music.setDrone(true);
    if (this.reduced()) { this.skip(); return; }
    SFX.rumble(1.4);
  },
  once(k, fn) { if (!this.ev[k]) { this.ev[k] = true; fn(); } },
  key(e) { if (['Enter', 'NumpadEnter', 'Escape', 'Space', 'KeyZ'].includes(e.code) && this.t > 1.2) this.skip(); },
  update(dt) {
    if (!this.active) return;
    this.t += dt; const t = this.t, P2 = { x: P.cx, y: P.cy };
    if (!this.skipShown && t > 1.2) { this.skipShown = true; $('cineskip').classList.add('on'); }
    // congelamento do impacto
    if (this.freezeT > 0) { this.freezeT -= dt; this.timeScale = 0; if (this.freezeT <= 0) this.timeScale = 0.18; }
    const ts = this.timeScale, sdt = dt * (this.impactT >= 0 ? Math.max(0.12, ts) : 1);
    const ease = (a, b, k) => a + (b - a) * (1 - Math.exp(-dt * k));
    // 1. silêncio: faixas de cinema, cor some, câmera chega perto
    if (t < 7.6) { this.letter = ease(this.letter, 1, 4); this.sat = ease(this.sat, 0.85, 3); this.zoom = ease(this.zoom, 1.45, 2.2); }
    // 2. o Coração sobe do baú
    const h = this.heart;
    if (t > 0.9 && t < 2.3) { this.once('drum1', () => { SFX.warDrum(); SFX.choir(4); Game.shake(3); }); h.x = lerp(h.x, P2.x, 1 - Math.exp(-dt * 2)); h.y = lerp(h.y, P.y - 34 * P.scale, 1 - Math.exp(-dt * 2.4)); h.s = Math.min(1.2, h.s + dt * 0.8); }
    // 3. ele se abre: as palavras aprendidas saem e giram
    if (t > 2.3) this.once('burst', () => { this.flash = 0.5; SFX.shimmer(); FX.burst(h.x, h.y, 40, 'm', 260, { life: 0.9, g: 0 }); h.gone = true; });
    for (const w of this.words) {
      if (t < 2.3 || w.gone) continue;
      const start = 2.9 + w.i * (2.0 / Math.max(1, this.words.length)), k = clamp((t - start) / 0.4, 0, 1);
      w.a += dt * (1.4 + k * 6); w.r = t < start ? Math.min(118, w.r + dt * 420) : 118 * (1 - k);
      w.k = Math.min(1, w.k + dt * 4);
      if (k >= 1) { w.gone = true; this.glow = 1; FX.burst(P2.x, P2.y, 8, 'm', 140, { life: 0.4, g: 0 }); if (!this.ev.beatT || t - this.ev.beatT > 0.14) { SFX.heartbeat(); this.ev.beatT = t; } }
    }
    this.glow = Math.max(0, this.glow - dt * 2);
    // 4. três batidas de tambor de guerra: a Nexy cresce
    [[5.0, 1.33, 5], [5.5, 1.66, 7], [6.0, 2, 10]].forEach(([at, s, sh], i) => {
      if (t > at) this.once('grow' + i, () => {
        SFX.warDrum(); if (i === 2) SFX.grow(); P.setScale(s); Game.shake(sh); this.flash = 0.25;
        this.rings.push({ x: P.cx, y: P.y + P.h, r: 10, life: 1 });
        for (let k = 0; k < 14; k++) this.dust.push({ x: P.cx + (Math.random() - 0.5) * 60, y: P.y + P.h, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 60, r: 6 + Math.random() * 10, life: 1 });
      });
    });
    // 5. o grito de batalha
    if (t > 6.6) this.once('cry', () => { this.title = { text: this.d.def.story.cries[this.tier], k: 0 }; this.flash = 0.45; Voice.say(this.title.text, 'door', { cut: true }); SFX.warDrum(); Game.shake(8); });
    if (this.title) this.title.k = Math.min(1, this.title.k + dt * 3);
    // 6. investida em câmera lenta
    if (t > 7.4 && t < 7.8) { P.squash = 0.35; }
    if (t > 7.8) this.once('charge', () => {
      this.title = null; Game.state = 'play'; Game.forceInput = { right: true, run: true }; this.timeScale = 0.55; SFX.riser(0.8);
    });
    if (t > 7.8 && this.impactT < 0) { this.zoom = ease(this.zoom, 1.15, 3); this.sat = ease(this.sat, 0.3, 3); if (t > 10.5) this.breakWall(); }
    // 7. depois do impacto
    if (this.impactT >= 0) {
      const it = t - this.impactT;
      if (this.freezeT <= 0) this.timeScale = Math.min(1, 0.18 + Math.max(0, it - 0.9) * 0.8);
      this.sat = ease(this.sat, 0, 2); this.zoom = ease(this.zoom, 1.05, 1.5); this.rays = Math.max(0, 1 - Math.max(0, it - 1.5) * 0.4);
      // passa pelo buraco andando e para logo depois do muro
      if (it > 0.3) this.once('walk', () => { Game.forceInput = { right: true }; });
      if (P.x > this.wall.x + this.wall.w + 30 || it > 2.4) this.once('stop', () => { Game.forceInput = null; Input.touchHeld = {}; P.vx *= 0.3; });
      if (it > 2.5) this.once('shrink', () => this.shrink());
      if (it > 3.6) { this.letter = ease(this.letter, 0, 4); this.zoom = ease(this.zoom, 1, 4); }
      if (it > 4.4) this.end();
    }
    // partículas da cena
    for (const r of this.rings) { r.r += sdt * 520; r.life -= sdt * 1.4; }
    this.rings = this.rings.filter(r => r.life > 0);
    for (const s of this.shards) { s.vy += 1500 * sdt; s.x += s.vx * sdt; s.y += s.vy * sdt; s.rot += s.vr * sdt; s.life -= sdt * 0.45; s.z += sdt * s.vz; }
    this.shards = this.shards.filter(s => s.life > 0);
    for (const p of this.dust) { p.x += p.vx * sdt; p.y += p.vy * sdt; p.vx *= Math.exp(-sdt * 2); p.r += sdt * 30; p.life -= sdt * 0.8; }
    this.dust = this.dust.filter(p => p.life > 0);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    // enquanto o jogo está parado, a cena anima o que precisa
    if (Game.state === 'cinematic') {
      if (P.scaleT < 1) { P.scaleT = Math.min(1, P.scaleT + dt / 0.6); P.visScale = lerp(P.scaleFrom, P.scale, P.easeBack(P.scaleT)); }
      if (P.squash) P.squash = approach(P.squash, 0, dt * 2.2);
      P.px = P.x; P.py = P.y; Echo.px = Echo.x; Echo.py = Echo.y; Echo.update(dt); FX.update(dt);
      Cam.px = Cam.x; Cam.py = Cam.y; Cam.update(dt);
      Dark.k = approach(Dark.k, 0.45, dt);
    }
  },
  // o Muro do Silêncio explode de uma vez (chamado quando a Nexy gigante encosta nele)
  onBreak(c, r) {
    const w = this.wall; if (!w || c < w.c0 || c > w.c1 || r < w.r0 || r > w.r1) return false;
    this.breakWall(); return true;
  },
  breakWall() {
    if (this.impactT >= 0) return;
    const w = this.wall;
    this.impactT = this.t; this.freezeT = 0.24; this.flash = 1; this.rays = 1;
    for (let r = w.r0; r <= w.r1; r++) for (let c = w.c0; c <= w.c1; c++) if (World.type(c, r) === T.CRACKED) World.tiles[r * World.w + c] = T.AIR;
    Game.shake(16); SFX.impact(); SFX.shatter(); Music.resolve(); Music.setDrone(false);
    for (let i = 0; i < 150; i++) {
      const near = i < 9;
      this.shards.push({
        x: w.x + Math.random() * w.w, y: w.y + Math.random() * w.h, vx: 120 + Math.random() * 620 * (Math.random() < 0.85 ? 1 : -0.4), vy: -260 - Math.random() * 520,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16, size: near ? 9 + Math.random() * 9 : 3 + Math.random() * 8, life: 1 + Math.random() * 0.6,
        z: near ? 0.3 : 0, vz: near ? 0.5 : 0, p: [[-1, -0.6], [1, -0.9], [0.3, 1]].map(([a, b]) => [a * (0.6 + Math.random() * 0.5), b * (0.6 + Math.random() * 0.5)]),
      });
    }
    for (let k = 0; k < 26; k++) this.dust.push({ x: w.x + w.w / 2, y: w.y + Math.random() * w.h, vx: (Math.random() - 0.3) * 420, vy: (Math.random() - 0.6) * 200, r: 8 + Math.random() * 16, life: 1 });
    FX.burst(w.x + w.w / 2, w.y + w.h / 2, 60, 'c', 420, { life: 1.2, g: 300 });
  },
  shrink() {
    P.setScale(1); SFX.shrink(); FX.burst(P.cx, P.cy, 40, 'm', 220, { life: 0.9, g: 0 });
    const tier = this.tier;
    if (tier >= 1 && !P.aura) { P.aura = true; SFX.powerup(); }
    if (tier >= 2) Game.addLife(1, P);
    if (tier >= 3) Game.addOrbs(30);
    if (tier >= 4) Game.addLife(1, P);
    UI.msg('+4 WORDS · DARK · LIGHT · AFRAID · STRONG', 3600);
  },
  // pular a cena: o mesmo resultado, sem a animação
  skip() {
    if (!this.active) return;
    this.breakWall(); this.shards = []; this.dust = []; this.freezeT = 0;
    const w = this.wall; P.setScale(1); P.scaleT = 1; P.visScale = 1;
    P.x = w.x + w.w + 40; P.y = (w.r1 + 1) * TS - P.h; P.px = P.x; P.py = P.y; P.vx = 0; P.vy = 0;
    this.shrinkDone = false; this.shrink(); Cam.snap(); Echo.reset();
    this.end();
  },
  end() {
    this.active = false; this.letter = 0; this.zoom = 1; this.sat = 0; this.timeScale = 1; this.title = null; this.rays = 0; this.lid = false;
    Game.forceInput = null; Input.touchHeld = {}; Game.state = 'play'; P.invuln = 1.2; Game.clearInput();
    $('cineskip').classList.remove('on'); Music.normal();
  },
  /* ---- desenho no espaço do mundo (dentro do zoom) ---- */
  drawWorld(ctx, camX, camY, time) {
    if (!this.active) return;
    const h = this.heart;
    // luz que entra pelo buraco do muro
    if (this.rays > 0 && this.wall) {
      const cx = this.wall.x + this.wall.w - camX, cy = this.wall.y + this.wall.h / 2 - camY;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i - 3) * 0.16 + Math.sin(time * 0.7 + i) * 0.03, len = 520 + i * 30;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, len);
        g.addColorStop(0, `rgba(240,250,255,${0.22 * this.rays})`); g.addColorStop(0.4, `rgba(34,211,238,${0.08 * this.rays})`); g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, len, a - 0.05, a + 0.05); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      }
      R.draw(R.glow('w', 64), cx, cy, 2.4, 0.7 * this.rays, true);
      ctx.restore();
    }
    // círculo de runas sob a Nexy
    if (this.t > 2.6 && this.impactT < 0) {
      const k = Math.min(1, (this.t - 2.6) / 1.5), x = P.cx - camX, y = P.y + P.h - camY;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.28); ctx.rotate(this.t * 0.8);
      ctx.beginPath(); ctx.arc(0, 0, 70 * k, 0, Math.PI * 2); ctx.strokeStyle = `rgba(34,211,238,${0.6 * k})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 52 * k, 0, Math.PI * 2); ctx.strokeStyle = `rgba(217,70,239,${0.5 * k})`; ctx.lineWidth = 1; ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 54 * k, Math.sin(a) * 54 * k); ctx.lineTo(Math.cos(a) * 68 * k, Math.sin(a) * 68 * k); ctx.strokeStyle = `rgba(122,216,255,${0.7 * k})`; ctx.stroke(); }
      ctx.restore();
      R.draw(R.glow('c', 64), x, y - 4, 1.4, 0.35 * k, true);
    }
    // ondas de choque
    for (const r of this.rings) {
      ctx.save(); ctx.translate(r.x - camX, r.y - camY); ctx.scale(1, 0.35);
      ctx.beginPath(); ctx.arc(0, 0, r.r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(232,121,249,${0.8 * r.life})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    // brilho da Nexy absorvendo as palavras
    if (this.glow > 0) R.draw(R.glow('m', 64), P.cx - camX, P.cy - camY, 1.2 * P.scale, this.glow * 0.8, true);
    // o Coração
    if (this.t > 0.9 && !h.gone) drawHeart(ctx, h.x - camX, h.y - camY + Math.sin(this.t * 3) * 3, h.s, this.tier, this.t);
    // as palavras orbitando
    for (const w of this.words) {
      if (w.gone || this.t < 2.3) continue;
      const x = P.cx + Math.cos(w.a) * w.r - camX, y = P.cy + Math.sin(w.a) * w.r * 0.55 - camY, s = wordCapsuleSprite(w.w);
      R.draw(s, x + s.ox, y, 0.55 + 0.25 * (w.r / 118), w.k);
    }
    // poeira e cacos de vidro
    for (const p of this.dust) { ctx.beginPath(); ctx.arc(p.x - camX, p.y - camY, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(160,190,200,${0.12 * p.life})`; ctx.fill(); }
    for (const s of this.shards) {
      const sc = s.size * (1 + Math.min(1, s.z));
      ctx.save(); ctx.translate(s.x - camX, s.y - camY); ctx.rotate(s.rot); ctx.globalAlpha = Math.min(1, s.life);
      ctx.beginPath(); ctx.moveTo(s.p[0][0] * sc, s.p[0][1] * sc); ctx.lineTo(s.p[1][0] * sc, s.p[1][1] * sc); ctx.lineTo(s.p[2][0] * sc, s.p[2][1] * sc); ctx.closePath();
      ctx.fillStyle = 'rgba(10,15,18,0.85)'; ctx.fill(); ctx.strokeStyle = s.z ? 'rgba(232,121,249,0.8)' : 'rgba(122,216,255,0.75)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
  },
  /* ---- desenho na tela (fora do zoom) ---- */
  drawScreen(ctx) {
    if (!this.active && this.letter <= 0) return;
    const bar = 62 * this.letter;
    if (bar > 0.5) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CFG.VIEW_W, bar); ctx.fillRect(0, CFG.VIEW_H - bar, CFG.VIEW_W, bar); }
    if (this.title) {
      const k = this.title.k, big = this.title.text.length > 16, sc = 1 + (1 - k) * 1.2;
      const s = R.text(this.title.text, '900 ' + (big ? 34 : 50) + 'px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 18);
      R.draw(R.glow('m', 64), 480, 120, 4, 0.5 * k, true);
      R.draw(s, 480, 120, sc, k);
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, this.flash)})`; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H); }
  },
};
