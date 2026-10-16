
/* ============================== FRASES: montagem, encenação e resultados ============================== */
const Sentence = {
  // texto pronunciável ("I AM FINE." → "I am fine.")
  speakable(tokens) {
    let out = '';
    tokens.forEach((t, i) => {
      if (/^[.,!?]$/.test(t)) { out += t; return; }
      let w = WORDS[t] ? WORDS[t].say : t.toLowerCase();
      if (t === 'I') w = 'I';
      if (i === 0) w = w.charAt(0).toUpperCase() + w.slice(1);
      out += (out ? ' ' : '') + w;
    });
    return out;
  },
  speakInscription(s) { const l = s.toLowerCase().replace(/\bi\b/g, 'I'); return l.charAt(0).toUpperCase() + l.slice(1); },
  fill(def, words) { let i = 0; return def.mold.map(t => t === '_' ? (words[i++] || '___') : t); },
  normalized(def, words) { return normalizeSentence(this.fill(def, words).join(' ')); },
  // resolve uma tentativa: 'accept' | 'enact' | 'wrong'. Nas encenações, '*' vale qualquer palavra.
  match(pat, words) { return pat.length === words.length && pat.every((p, i) => p === '*' || p === words[i]); },
  judge(def, words) {
    const key = words.join(' ');
    const a = def.accept.find(x => x.words.join(' ') === key);
    if (a) return { kind: 'accept', rule: a };
    const e = (def.enact || []).find(x => this.match(x.words, words));
    if (e) return { kind: 'enact', rule: e };
    return { kind: 'wrong' };
  },
  judgeSpoken(def, alts) {
    for (const alt of alts) {
      const n = normalizeSentence(alt);
      for (const a of def.accept) if (n === this.normalized(def, a.words) || n.endsWith(this.normalized(def, a.words))) return { kind: 'accept', rule: a, heard: alt };
      for (const e of def.enact || []) if (!e.words.includes('*') && n === this.normalized(def, e.words)) return { kind: 'enact', rule: e, heard: alt };
    }
    return { kind: 'wrong', heard: alts[0] || '' };
  },
  // encenação de uma frase "errada" (ex.: IT IS A DOOR → o ícone vira porta por 1 s)
  enact(d, rule) {
    const r = rule.result;
    if (r.type === 'morph') { d.morph = r.duration || 1; SFX.summon(); FX.burst(d.x - 30, d.y + 18, 16, 'c', 120, { g: 0, life: 0.6 }); }
    else if (r.type === 'mirror') { d.mirror = 1.8; SFX.summon(); }
    else if (r.type === 'crawler') P.crawlerForm(r.duration || 3.5);
    else if (r.type === 'confused') { if (r.target === 'echo') Echo.act('confused'); else World.confuse(r.target); }
    // retorno imediato: a Echo aponta o porquê do erro (tempo verbal, concordância), sem dar a frase pronta
    if (r.tip && Game.echoBorn) Game.later(0.5, () => Echo.talk([r.tip]));
  },
  // aplica o resultado de uma frase aceita
  apply(d, rule, words) {
    const r = rule.result, def = d.def;
    d.solved = words.slice(); Hints.mark(d.id);
    if (r.type === 'open' && def.birth === 'echo' && !Game.echoBorn) { Hints.mark('door1'); Birth.start(d); }
    else if (r.type === 'open') { d.opening = 0.001; SFX.doorOpen(); Game.shake(2); if (d.id === 'door1') Hints.mark('door1'); }
    else if (r.type === 'transform') {
      if (P.setScale(r.scale)) { (r.scale > 1 ? SFX.grow : SFX.shrink)(); Game.shake(r.scale > 1 ? 5 : 2); FX.burst(P.cx, P.cy, 50, 'm', 300, { life: 1, g: 0 }); }
    } else if (r.type === 'exit') Game.finish(r.exit, 0);
    // o pronome decide o alvo: IT → a runa, THEY → o grupo, YOU → o Echo, WE → os dois
    else if (r.type === 'target') World.setTarget(r.target, r.act);
    else if (r.type === 'targets') r.targets.forEach((id, i) => Game.later(i * 0.45, () => World.setTarget(id, r.act)));   // um de cada vez
    else if (r.type === 'beswitch') PalaceSwitch.start(d);
    else if (r.type === 'box') City.moveBox(r.target, r.spot);   // a caixa de neon voa para o lugar dito (1-3)
    else if (r.type === 'core') Sentinel.answer(r.where);   // o terminal do Sentinela: a Echo acha o núcleo
    else if (r.type === 'echo') Echo.act(r.act, r.act === 'big' ? def.ride : null);
    else if (r.type === 'we') { Echo.act(r.act); if (r.act === 'big') { P.squash = -0.5; FX.burst(P.cx, P.cy, 30, 'm', 220, { life: 0.7, g: 0 }); } }
    // Grimório: palavras usadas + palavras fixas do molde
    const used = words.concat(def.mold.filter(t => WORDS[t]));
    for (const w of used) Game.grimoireWord(w, def.inscription);
    if (def.consume !== false) Game.consumeWords(words);
    // ainda falta algo para abrir o caminho? a Echo diz o quê (mesmo depois de um acerto: IT IS SMALL não tira os gigantes)
    if (def.nudge) Game.later(1.4, () => this.nudge(d));
  },
  // o alvo ainda fecha o caminho? (gigantes acordados ou runa que não encolheu)
  blocking(id) {
    const t = World.targets[id]; if (!t) return false;
    if (t.kind === 'giants') return Ents.list.some(e => e.type === 'giant' && !e.dead && e.state !== 'shrink');
    return t.state !== 'small';
  },
  // o Nexy empurrou o que bloqueia (os gigantes): a mesma dica do altar, no máximo a cada 6 s
  bumped(blocker) {
    if (Game.simTime - (this.bumpT || -99) < 6 || Echo.line) return;
    for (const id in World.doors) {
      const d = World.doors[id];
      if (d.def.nudge && d.def.nudge.some(n => n.blocks === blocker)) { this.bumpT = Game.simTime; this.nudge(d); return; }
    }
  },
  // a frase deu certo mas nada abriu: a Echo diz o que ainda bloqueia (a 2ª vez, já com a frase)
  nudge(d) {
    const n = d.def.nudge.find(x => this.blocking(x.blocks));
    if (!n || !Game.echoBorn) return;
    d.nudged = d.nudged || {};
    const i = d.nudged[n.blocks] = (d.nudged[n.blocks] || 0) + 1;
    const lacks = (n.needs || []).some(w => !Game.bar.includes(w));
    Echo.talk(lacks && i > 1 && d.def.nudgeMissing ? [d.def.nudgeMissing] : [n.lines[Math.min(i, n.lines.length) - 1]]);
  },
};

/* ============================== PAINEL DE MONTAGEM ============================== */
const Panel = {
  door: null, slots: [], sel: 0, busy: false,
  get nSlots() { return this.door.def.mold.filter(t => t === '_').length; },
  available() { const used = new Set(this.slots.filter(v => v != null)); return Game.bar.map((w, i) => i).filter(i => !used.has(i)); },
  open(d) {
    if (d.def.live) d.def.live(d.def);   // portas que mudam com o jogo (o terminal do Sentinela: a rodada atual)
    this.door = d; this.slots = new Array(this.nSlots).fill(null); this.busy = false;
    const av = this.available(); this.sel = av.length ? av[0] : -1;
    $('pkind').textContent = d.def.title || (d.kind === 'pedestal' ? 'PEDESTAL OF THE VOICE' : 'DOOR');
    $('pinsc').textContent = d.def.inscription;
    $('pheard').textContent = '';
    $('pmic').style.display = Save.data.assist.voice && Listen.available() ? '' : 'none';
    $('panel').classList.add('on');
    Music.layers(0);
    this.render();
  },
  close() {
    $('panel').classList.remove('on'); Listen.stop();
    this.door = null; Game.state = 'play'; Music.normal();
    Input.pressedAt.jump = -1; Input.pressedAt.spin = -1; Input.queue.length = 0;
    Input.dashDir = null; Input.relAt.left = Input.relAt.right = -1e9;
  },
  filled() { return this.slots.filter(v => v != null).length; },
  place(i) {
    if (this.busy || i == null || i < 0 || Game.bar[i] == null) return;
    const at = this.slots.indexOf(null); if (at < 0) return;
    if (this.slots.includes(i)) return;
    this.slots[at] = i; SFX.place(); Voice.say(WORDS[Game.bar[i]] ? WORDS[Game.bar[i]].say : Game.bar[i], 'echo');
    Music.layers(this.filled());
    const av = this.available(); this.sel = av.length ? av[0] : -1;
    this.render();
  },
  removeSlot(s) {
    if (this.busy || this.slots[s] == null) return;
    this.slots[s] = null; SFX.remove(); Music.layers(this.filled());
    const av = this.available(); if (this.sel < 0 && av.length) this.sel = av[0];
    this.render();
  },
  removeLast() { for (let s = this.slots.length - 1; s >= 0; s--) if (this.slots[s] != null) return this.removeSlot(s); },
  move(dir) {
    const av = this.available(); if (!av.length) return;
    let k = av.indexOf(this.sel); k = k < 0 ? 0 : (k + dir + av.length) % av.length; this.sel = av[k]; SFX.select(); this.render();
  },
  hint() {
    const d = this.door; if (!d) return;
    Game.buyHint(d); this.render();
  },
  confirm() {
    if (this.busy) return;
    if (this.filled() < this.nSlots) { if (this.sel >= 0) this.place(this.sel); return; }
    const words = this.slots.map(i => Game.bar[i]);
    this.resolve(Sentence.judge(this.door.def, words), words);
  },
  resolve(j, words) {
    const d = this.door, def = d.def, tokens = Sentence.fill(def, words);
    this.busy = true;
    Voice.say(j.rule && j.rule.say || Sentence.speakable(tokens), 'door');
    const mold = $('pmold');
    if (j.kind === 'accept') {
      SFX.right(); mold.classList.add('win');
      FX.burst(d.x + d.w / 2, d.y, 30, 'c', 200, { g: -80, life: 1 });
      setTimeout(() => { this.close(); Sentence.apply(d, j.rule, words); }, 1600);
    } else {
      SFX.wrong(); Music.layers(0); d.errors++;
      mold.classList.remove('shake'); void mold.offsetWidth; mold.classList.add('shake');
      setTimeout(() => {
        mold.classList.remove('shake'); this.slots = this.slots.map(() => null); this.busy = false;
        const av = this.available(); this.sel = av.length ? av[0] : -1;
        if (j.kind === 'enact') { this.close(); Sentence.enact(d, j.rule); }
        else this.render();
      }, 1100);
    }
  },
  listen() {
    if (!this.door || this.busy || !Listen.available() || !Save.data.assist.voice) return;
    $('pheard').textContent = 'LISTENING…';
    const ok = Listen.start(alts => {
      const j = Sentence.judgeSpoken(this.door.def, alts);
      $('pheard').textContent = 'HEARD · "' + (j.heard || '').toUpperCase() + '"';
      if (j.kind !== 'wrong') {
        const words = j.rule.words.slice();
        // usa as palavras da barra se estiverem lá
        const idx = []; const used = new Set();
        for (const w of words) { const i = Game.bar.findIndex((b, k) => b === w && !used.has(k)); if (i >= 0) { used.add(i); idx.push(i); } }
        this.slots = new Array(this.nSlots).fill(null); idx.forEach((v, k) => { if (k < this.slots.length) this.slots[k] = v; });
        this.renderVoiceWords = words; this.render();
        this.resolve(j, words);
      } else { SFX.wrong(); }
    }, got => { if (!got && this.door) $('pheard').textContent = 'NO VOICE HEARD · TRY AGAIN OR BUILD IT'; });
    if (!ok) $('pheard').textContent = 'MICROPHONE UNAVAILABLE';
  },
  render() {
    const d = this.door; if (!d) return;
    const def = d.def;
    $('ppt').textContent = (d.hint || Save.data.assist.subtitles) ? (PHRASES_PT[def.inscription] || '') : '';
    const mold = $('pmold'); mold.classList.remove('win'); mold.innerHTML = '';
    let si = 0;
    const voiceWords = this.renderVoiceWords; this.renderVoiceWords = null;
    const nextEmpty = this.slots.indexOf(null);
    for (const tok of def.mold) {
      if (tok === '_') {
        const s = si++, el = document.createElement('div');
        const bi = this.slots[s];
        el.className = 'slot' + (bi != null ? ' filled' : '') + (s === nextEmpty ? ' next' : '');
        const w = bi != null ? Game.bar[bi] : (voiceWords ? voiceWords[s] : null);
        if (w) el.appendChild(UI.capsule(w, true));
        el.addEventListener('click', () => this.removeSlot(s));
        mold.appendChild(el);
      } else {
        const el = document.createElement('div'); el.className = 'fx'; el.textContent = tok; mold.appendChild(el);
      }
    }
    const bar = $('pbar'); bar.innerHTML = '';
    const used = new Set(this.slots.filter(v => v != null));
    // dica: depois de 2 erros, a palavra certa da próxima lacuna brilha fraco
    let hintIdx = -1;
    const hinted = Math.min(this.nSlots, d.errors - 1);
    if (d.errors >= 2 && nextEmpty >= 0 && nextEmpty < hinted) {
      const want = def.accept[0].words[nextEmpty];
      hintIdx = Game.bar.findIndex((w, i) => w === want && !used.has(i));
    }
    if (!Game.bar.length) { const n = document.createElement('div'); n.className = 'p-none'; n.textContent = 'Nenhuma palavra ainda. Bata nos blocos para libertar palavras.'; bar.appendChild(n); }
    Game.bar.forEach((w, i) => {
      const c = UI.capsule(w, true);
      if (used.has(i)) c.classList.add('used');
      if (i === this.sel) c.classList.add('sel');
      if (i === hintIdx) c.classList.add('hint');
      c.addEventListener('click', () => { if (!used.has(i)) { this.sel = i; this.place(i); } });
      bar.appendChild(c);
    });
    const cost = Save.data.assist.freeHints || Game.orbs < CFG.HINT_COST ? 'FREE' : CFG.HINT_COST + ' ORBS';
    $('phint').textContent = d.hint ? 'HINT ✓' : 'HINT · ' + cost;
    $('phint').disabled = !!d.hint;
    $('pok').disabled = this.filled() < this.nSlots || this.busy;
  },
  key(e) {
    const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') this.move(-1);
    else if (c === 'ArrowRight' || c === 'KeyD') this.move(1);
    else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || c === 'KeyZ') { e.preventDefault(); this.confirm(); }
    else if (c === 'Backspace' || c === 'Delete') { e.preventDefault(); this.removeLast(); }
    else if (c === 'Escape' || c === 'KeyX') { if (!this.busy) this.close(); }
    else if (c === 'KeyH') this.hint();
    else if (c === 'KeyV') this.listen();
  },
};

/* ============================== INTERFACE (HUD, barra, telas) ============================== */
const UI = {
  last: {}, msgT: null,
  init() {
    $('pausebtn').addEventListener('click', () => { if (Game.state === 'play') Game.pause(); else if (Game.state === 'pause') Game.resume(); });
    $('mutebtn').addEventListener('click', () => Game.toggleMute());
    $('mhPause').addEventListener('click', () => { if (Game.state === 'map') Game.pause(); else if (Game.state === 'pause') Game.resume(); });
    $('mhMute').addEventListener('click', () => Game.toggleMute());
    // no mapa, tocar/clicar numa fase anda até ela; tocar na fase atual entra
    $('game').addEventListener('pointerdown', e => {
      if (Prologue.active) { const st = $('stage').getBoundingClientRect(), k = st.width / CFG.VIEW_W; Prologue.tap((e.clientX - st.left) / k, (e.clientY - st.top) / k); return; }
      if (PalaceIntro.active) return PalaceIntro.tap();
      if (PalaceSwitch.active) return PalaceSwitch.tap();
      if (CityIntro.active) return CityIntro.tap();
      if (CompassScene.active) return CompassScene.tap();
      if (SentinelScene.active) return SentinelScene.tap();
      if (Game.state !== 'map') return;
      const st = $('stage').getBoundingClientRect(), k = st.width / CFG.VIEW_W;
      WorldMap.tap((e.clientX - st.left) / k, (e.clientY - st.top) / k);
    });
    $('itemslot').addEventListener('click', () => { if (Game.state === 'play') Game.dropReserve(); });
    $('startbtn').addEventListener('click', () => Game.start());
    $('title').addEventListener('click', () => Game.start());
    $('pause').querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'resume') Game.resume();
      else if (a === 'restart') { this.hideAll(); Game.iris(() => Game.restartLevel()); }
      else if (a === 'map') { this.hideAll(); Game.iris(() => Game.toMap(), { to: 'map' }); }
      else if (a === 'grimoire') this.openGrimoire('words');
      else if (a === 'assist') this.openAssist();
    }));
    $('grimoire').querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => this.openGrimoire(b.dataset.tab)));
    document.querySelectorAll('[data-act="back"]').forEach(b => b.addEventListener('click', () => this.back()));
    $('tglvname').addEventListener('click', () => { Voice.nextVoice(); SFX.ui(); this.renderAssist(); });
    $('assist').querySelectorAll('.tgl[data-opt]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.opt; Save.data.assist[k] = !Save.data.assist[k]; Save.write(); SFX.ui(); this.renderAssist();
    }));
    if (!Listen.available()) $('tglvoice').style.display = 'none';
    $('cAgain').addEventListener('click', () => Game.playAgain());
    $('cMap').addEventListener('click', () => Game.continueToMap());
    $('phint').addEventListener('click', () => Panel.hint());
    $('pmic').addEventListener('click', () => Panel.listen());
    $('pok').addEventListener('click', () => Panel.confirm());
    $('pback').addEventListener('click', () => { if (!Panel.busy) Panel.close(); });
    $('mutebtn').classList.toggle('off', AudioSys.muted); $('mhMute').classList.toggle('off', AudioSys.muted);
    const bf = Object.values(Save.data.bestFluency);
    $('titlebest').textContent = bf.length ? 'WORLD FLUENCY · ' + Math.round(bf.reduce((a, b) => a + b, 0) / Math.max(bf.length, 1)) + '%' : '';
  },
  // letras da palavra-mestra da fase no HUD
  setLetters(word) {
    const box = $('letters'); box.innerHTML = '';
    for (const ch of word) { const s = document.createElement('span'); s.textContent = ch; box.appendChild(s); }
    this.last.letters = null;
  },
  capsule(word, big) {
    const el = document.createElement('div');
    el.className = 'cap ' + ((WORDS[word] && WORDS[word].cls) || 'noun') + (big ? ' big' : '');
    if (!['noun', 'verb', 'adjective'].includes((WORDS[word] || {}).cls)) el.classList.add('other');
    el.textContent = word;
    return el;
  },
  frame() {
    const g = Game, L = this.last;
    if (L.lives !== g.lives) {
      L.lives = g.lives; const el = $('lives'); el.innerHTML = '';
      for (let i = 0; i < Math.min(g.lives, 6); i++) el.appendChild(document.createElement('i'));
      if (g.lives > 6) { const b = document.createElement('b'); b.textContent = '×' + g.lives; el.appendChild(b); }
    }
    if (L.orbs !== g.orbs) { L.orbs = g.orbs; $('orbs').textContent = String(g.orbs).padStart(3, '0'); }
    const lk = g.letters.join(); if (L.letters !== lk) { L.letters = lk; $('letters').querySelectorAll('span').forEach((s, i) => s.classList.toggle('on', g.letters[i])); }
    if (L.item !== g.reserve) { L.item = g.reserve; $('itemslot').classList.toggle('full', !!g.reserve); }
    const ts = fmtTime(g.timeRun); if (L.time !== ts) { L.time = ts; $('time').textContent = ts; }
    const showOpen = g.state === 'play' && !!P.interact;
    if (L.open !== showOpen) { L.open = showOpen; $('tbopen').classList.toggle('show', showOpen); $('tbopen').textContent = P.interact && P.interact.kind === 'pedestal' ? 'SPEAK' : P.interact && P.interact.kind === 'engine' ? 'USE' : P.interact && P.interact.kind === 'citymap' ? 'READ' : 'OPEN'; }
    const hudOn = g.state !== 'title' && g.where === 'level' && (!g.scene() || g.scene() === Glitch);
    if (L.hud !== hudOn) { L.hud = hudOn; $('hud').style.opacity = hudOn ? 1 : 0; $('wordbar').style.opacity = hudOn ? 1 : 0; }
    const pingOn = g.where === 'level' && g.echoBorn && !Echo.hidden;
    if (L.ping !== pingOn) { L.ping = pingOn; $('tbping').style.display = pingOn ? '' : 'none'; }
    const shotOn = pingOn && EchoShot.tier() >= 0 || g.where === 'level' && P.power === 'laser';
    if (L.shot !== shotOn) { L.shot = shotOn; $('tbshot').style.display = shotOn ? '' : 'none'; }
    // o poder do momento (1-3): LASER, WINGS e a STAR com os segundos que faltam
    const pw = g.where === 'level' ? [P.power ? POWERS[P.power].word : '', P.starT > 0 ? 'STAR ' + Math.ceil(P.starT) : ''].filter(Boolean).join(' + ') : '';
    if (L.power !== pw) { L.power = pw; $('powerbox').style.display = pw ? '' : 'none'; $('powername').textContent = pw; }
    if (L.card !== g.card) { L.card = g.card; $('cardbox').style.display = g.card ? '' : 'none'; }
    const touch = document.body.classList.contains('touch');
    if (L.touch !== touch) { L.touch = touch; $('wordbar').classList.toggle('top', touch); }
  },
  renderBar(arriveIdx = -1, hideIdx = -1) {
    const box = $('wbslots'); box.innerHTML = '';
    Game.bar.forEach((w, i) => {
      const c = this.capsule(w, false);
      if (i === arriveIdx) c.classList.add('arrive');
      if (i === hideIdx) c.style.visibility = 'hidden';
      box.appendChild(c);
    });
    for (let i = Game.bar.length; i < Game.barMax(); i++) { const e = document.createElement('div'); e.className = 'empty'; box.appendChild(e); }
  },
  stageRect(el) {
    const st = $('stage').getBoundingClientRect(), r = el.getBoundingClientRect(), s = st.width / CFG.VIEW_W;
    return { x: (r.left - st.left) / s, y: (r.top - st.top) / s, w: r.width / s, h: r.height / s };
  },
  flyWord(word, sx, sy) {
    const idx = Game.bar.length - 1;
    this.renderBar(-1, idx);
    const target = $('wbslots').children[idx];
    const fly = this.capsule(word, false); fly.classList.add('fly');
    const st = $('stage'); st.appendChild(fly);
    const fr = this.stageRect(fly);
    fly.style.left = (sx - fr.w / 2) + 'px'; fly.style.top = (sy - fr.h / 2) + 'px';
    const tr = this.stageRect(target);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fly.style.transform = `translate(${tr.x - (sx - fr.w / 2)}px, ${tr.y - (sy - fr.h / 2)}px)`;
    }));
    setTimeout(() => { fly.remove(); this.renderBar(idx); }, 600);
  },
  msg(text, t = 1600) {
    const m = $('msg'); m.textContent = text; m.classList.add('show');
    clearTimeout(this.msgT); this.msgT = setTimeout(() => m.classList.remove('show'), t);
  },
  toast() {
    const t = $('toast'); t.querySelector('.t1').textContent = levelTag(World.level); t.querySelector('.t2').textContent = World.level.name;
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600);
  },
  hideAll() { ['pause', 'grimoire', 'assist', 'clear', 'gameover'].forEach(id => $(id).classList.remove('on')); },
  show(id) { this.hideAll(); $(id).classList.add('on'); const f = $(id).querySelector('.btn, .tgl'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30); },
  back() {
    SFX.ui();
    if (Game.state === 'grimoire' || Game.state === 'assist') { Game.state = Game.menuFrom || 'pause'; if (Game.state === 'pause') this.show('pause'); else if (Game.state === 'clear') this.show('clear'); }
  },
  openGrimoire(tab) {
    Game.menuFrom = Game.state === 'grimoire' ? Game.menuFrom : Game.state; Game.state = 'grimoire'; this.show('grimoire');
    $('grimoire').querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('cur', b.dataset.tab === tab));
    const list = $('glist'); list.innerHTML = ''; const G = Save.data.grimoire;
    const card = (name, pt, meta, lore, say, locked, master, o = {}) => {
      const c = document.createElement('div'); c.className = 'gcard' + (locked ? ' locked' : '') + (master ? ' master' : '');
      const btn = document.createElement('button'); btn.className = 'listen'; btn.setAttribute('aria-label', 'Listen');
      if (locked) btn.disabled = true; else btn.addEventListener('click', ev => { ev.stopPropagation(); Voice.say(say, 'echo', { cut: true }); });
      const w = document.createElement('div'); w.className = 'gw'; w.textContent = locked && !o.name ? '· · ·' : name;
      const p = document.createElement('span'); p.className = 'gpt'; p.textContent = locked ? '' : pt; w.appendChild(p);
      const m = document.createElement('div'); m.className = 'gmeta'; m.textContent = meta;
      const l = document.createElement('div'); l.className = 'glore'; l.textContent = locked ? (o.locked || 'Ainda não foi ouvida neste mundo.') : o.plain ? lore : '“' + lore + '”';
      c.append(btn, w, m, l); list.appendChild(c);
    };
    if (tab === 'words') {
      for (const mw in MASTER_WORDS) if (G.master[mw]) card(mw, MASTER_WORDS[mw].pt, 'MASTER WORD · ' + mw.split('').join(' '), MASTER_WORDS[mw].lore, MASTER_WORDS[mw].say, false, true);
      for (const w of Object.keys(WORDS)) {
        const e = G.words[w], info = WORDS[w];
        card(w, info.pt, e ? (e.door ? 'USED AT · ' + e.door : 'COLLECTED · ' + info.cls.toUpperCase()) : 'UNKNOWN', info.lore, info.say, !e);
      }
    } else if (tab === 'powers') {
      // PODERES: o que o Nexy e a Echo já sabem fazer (e como usar). O que ainda não foi conquistado fica fechado.
      const S = Save.data, pad = Input.padSeen, sh = S.shot.best, hb = S.heart.best, P0 = { name: true, plain: true, locked: 'Ainda não foi conquistado.' };
      const ls = NexyLook.stageFor(S.cleared), L0 = NEXY_STAGES[ls], L1 = NEXY_STAGES[ls + 1];
      card('NEXY · ' + L0.name, L0.pt, 'LOOK · STAGE ' + (ls + 1) + ' OF ' + NEXY_STAGES.length,
        L0.note + (L1 ? ' Próximo: ' + L1.pt + ' (' + L1.note.toLowerCase().replace(/\.$/, '') + '), ao concluir mais uma fase.' : ' A forma final.') + ' ASSIST › CLASSIC NEXY volta ao visual antigo.', 'Nexy', false, true, P0);
      card('ECHO PULSE', 'pulso da Echo · ' + (pad ? 'LB' : 'C') + ' (ou ECHO no toque)', 'POWER · ALWAYS WITH YOU',
        'A Echo encontra o que está escondido: blocos invisíveis, paredes falsas e a palavra dentro do bloco ?. No TO BE PALACE ela enxerga o passado: mostra o contorno do que existia. Na cidade (1-3), ela acha a caixa escondida atrás das coisas.', 'Echo pulse', false, true, P0);
      card(sh >= 0 ? SHOT[sh].name : 'ECHO SHOT', sh >= 0 ? SHOT[sh].pt + ' · ' + (pad ? 'Y' : 'F') + ' (ou SHOT no toque)' : '', sh >= 0 ? 'POWER · LEVEL ' + (sh + 1) + ' OF ' + SHOT.length : 'LOCKED · A SECRET IN WORLD 1-1',
        sh >= 0 ? 'O 1º tiro paralisa o inimigo (ele para, não machuca e vira plataforma); o 2º quebra. ' + SHOT[sh].info + ' No VOICE MODE: segure V e diga STOP!' : '', 'Echo shot', sh < 0, false, P0);
      card('VOICE MODE', 'modo de voz · V', 'POWER · ASSIST › VOICE MODE',
        'Nas portas e altares, aperte V e diga a frase inteira em voz alta: se a porta entender, ela abre. Longe das portas, com o tiro da Echo, segure V e diga STOP! (ou FREEZE, FIRE, SHOOT).', 'Voice mode', false, false, P0);
      card(hb >= 0 ? HEART[hb].name : 'HEART OF WORDS', hb >= 0 ? HEART[hb].pt : '', hb >= 0 ? 'POWER · LEVEL ' + (hb + 1) + ' OF ' + HEART.length : 'LOCKED · WORLD 1-2',
        hb >= 0 ? 'Nasce no Baú da Memória. Cada pergunta difícil que você acerta muda a cor dele e aumenta o poder: ' + HEART[hb].reward : '', 'Heart of words', hb < 0, false, P0);
      card(PALACE.ring.name, S.heart.ring ? PALACE.ring.pt : '', S.heart.ring ? 'POWER · TO BE PALACE' : 'LOCKED · A FORGOTTEN PALACE',
        S.heart.ring ? 'Você disse quem era e quem é (I WAS · I AM) e o palácio acordou. ' + PALACE.ring.reward : '', 'To be ring', !S.heart.ring, false, P0);
      // os poderes dos blocos (1-3): o nome em inglês, como pegar e como usar
      for (const k of ['laser', 'wings', 'star']) {
        const D = POWERS[k], got = !!S.met[k];
        card(D.word, got ? D.pt + (k === 'laser' ? ' · ' + (pad ? 'Y' : 'F') + ' (ou SHOT no toque)' : k === 'wings' ? ' · segure o pulo' : '') : '', got ? 'POWER · FROM A BLOCK · LOST WHEN HIT' : 'LOCKED · WORLD 1-3',
          got ? D.info : '', D.say.replace('!', ''), !got, false, P0);
      }
      const cp = S.heart.compass | 0, C = CITY.compass[Math.max(0, cp - 1)];
      card(C.name, cp ? C.pt : '', cp ? 'POWER · LEVEL ' + cp + ' OF ' + CITY.compass.length : 'LOCKED · WORLD 1-3',
        cp ? 'Nasceu no mapa da cidade. A seta magenta em volta do Nexy aponta o que falta encontrar. ' + CITY.compass.slice(0, cp).map(x => x.info).join(' ') : '', 'Compass of words', !cp, false, P0);
      const gold = S.goldCard, anyCard = gold || G.words.CARD;
      card(gold ? 'GOLD CARD' : 'WARP CARD', anyCard ? (gold ? 'cartão dourado' : 'cartão de teletransporte') : '', gold ? 'ITEM · FOREVER' : anyCard ? 'ITEM · ONE RUN' : 'LOCKED · ???',
        anyCard ? 'Liga a TO BE ENGINE: quem sabe o verbo TO BE inteiro viaja até o fim da fase com as vidas cheias. ' + (gold ? 'Dourado: ganho com a pontuação máxima na 1-1, agora a fase sempre começa com ele.' : 'Vale só na partida em que você o encontrou. Terminar a 1-1 com pontuação máxima dá o cartão dourado, que fica para sempre.') : '',
        gold ? 'Gold card' : 'Warp card', !anyCard, false, { plain: true, locked: 'Dizem que existe. Ninguém sabe onde. (Ou termine a 1-1 com pontuação máxima.)' });
    } else {
      card('ECHO', ECHO.pt, 'COMPANION · ALWAYS WITH YOU', ECHO.lore, ECHO.say, false, true);
      for (const k of Object.keys(CREATURES)) { const c = CREATURES[k]; card(k, c.pt, G.creatures[k] ? 'CREATURE · WORLD 1' : 'UNKNOWN', c.lore, c.say, !G.creatures[k]); }
    }
  },
  openAssist() { Game.menuFrom = Game.state; Game.state = 'assist'; this.show('assist'); this.renderAssist(); },
  renderAssist() {
    $('assist').querySelectorAll('.tgl[data-opt]').forEach(b => b.classList.toggle('on', !!Save.data.assist[b.dataset.opt]));
    const cs = Voice.choices(), cur = Voice.current(), i = cs.indexOf(cur);
    $('vname').textContent = cur ? Voice.label(cur) + (cs.length > 1 ? '  ·  ' + (i + 1) + ' de ' + cs.length + ', toque para trocar' : '') : 'Sem voz em inglês neste aparelho.';
  },
  menuKey(e) {
    const c = e.code;
    if (c === 'Escape' || c === 'KeyP') { if (Game.state === 'pause') Game.resume(); else this.back(); return; }
    const scr = $(Game.state === 'engine' || Game.state === 'citymap' ? 'chest' : Game.state); if (!scr) return;
    const items = [...scr.querySelectorAll('.btn, .tgl')].filter(b => b.offsetParent !== null && !b.disabled);
    if (!items.length) return;
    let i = items.indexOf(document.activeElement);
    if (c === 'ArrowDown' || c === 'ArrowRight' || c === 'KeyS' || c === 'KeyD') { i = (i + 1) % items.length; items[i].focus(); SFX.select(); }
    else if (c === 'ArrowUp' || c === 'ArrowLeft' || c === 'KeyW' || c === 'KeyA') { i = (i - 1 + items.length) % items.length; items[i].focus(); SFX.select(); }
    else if (c === 'Enter' || c === 'Space' || c === 'KeyZ') { e.preventDefault(); (i >= 0 ? items[i] : items[0]).click(); }
  },
  showClear(exit) {
    const g = Game;
    $('ctitle').textContent = exit === 'secret' ? 'SECRET EXIT' : 'STAGE CLEAR';
    $('cOrbs').textContent = g.orbsTotal; $('cTime').textContent = fmtTime(g.timeRun);
    const mw = World.level.masterWord;
    $('cLettersLbl').textContent = 'Letters ' + g.letters.filter(Boolean).length + '/' + mw.length;
    $('cLetters').innerHTML = mw.split('').map((ch, i) => `<span class="${g.letters[i] ? 'on' : ''}">${ch}</span>`).join('');
    $('cFlu').textContent = g.fluency + '%';
    const box = $('cWords'); box.innerHTML = '';
    const all = g.letters.every(Boolean);
    const chip = (w, pt, say, master) => {
      const d = document.createElement('div'); d.className = 'lw' + (master ? ' master' : '');
      const b = document.createElement('button'); b.className = 'listen'; b.setAttribute('aria-label', 'Listen ' + w); b.addEventListener('click', () => Voice.say(say, 'echo', { cut: true }));
      const a = document.createElement('span'); a.className = 'w'; a.textContent = w;
      const p = document.createElement('span'); p.className = 'p'; p.textContent = pt;
      d.append(b, a, p); box.appendChild(d);
    };
    if (g.goldNew) chip('GOLD CARD', 'cartão dourado · pontuação máxima: a 1-1 já começa com o cartão', 'Gold card', true);
    if (all) chip(mw, 'palavra-mestra · ' + MASTER_WORDS[mw].pt, MASTER_WORDS[mw].say, true);
    for (const w of g.learnedOrder) chip(w, WORDS[w].pt, WORDS[w].say, false);
    if (!g.learnedOrder.length) { const n = document.createElement('div'); n.className = 'p'; n.textContent = '—'; box.appendChild(n); }
    $('cBest').textContent = 'BEST FLUENCY · ' + (Save.data.bestFluency[World.level.id] || g.fluency) + '%  ·  FOUND ' + g.fluencyFound + ' OF ' + g.fluencyTotal;
    this.drawMinimap(exit);
    Game.state = 'clear'; this.show('clear');
    setTimeout(() => { const b = $('cMap'); if (b) b.focus({ preventScroll: true }); }, 40);
  },
  drawMinimap(exit) {
    const svg = $('minimap'), wm = WORLDS[World.level.world].mini, cur = World.level.id;
    const open = p => !!(Save.data.exits[p.from] && Save.data.exits[p.from][p.exit]);
    const node = id => wm.nodes.find(n => n.id === id);
    const lit = id => id === '1-1' || id === cur || wm.paths.some(p => p.to === id && open(p));
    let h = '<defs><linearGradient id="mmg" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#d946ef"/></linearGradient>' +
      '<filter id="mmf" filterUnits="userSpaceOnUse" x="0" y="0" width="560" height="92"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    for (const p of wm.paths) {
      const a = node(p.from), b = node(p.to), on = open(p), fresh = p.from === cur && p.exit === exit;
      const d = a.y === b.y ? `M${a.x},${a.y} L${b.x},${b.y}` : `M${a.x},${a.y} Q${a.x + 20},${b.y} ${b.x - (b.w || 44) / 2},${b.y}`;
      h += `<path d="${d}" fill="none" stroke="${on ? 'url(#mmg)' : 'rgba(255,255,255,0.12)'}" stroke-width="${on ? 2 : 1}" ${on ? 'filter="url(#mmf)"' : 'stroke-dasharray="3 4"'}>` +
        (fresh ? '<animate attributeName="stroke-dasharray" from="0 400" to="400 0" dur="1.4s" fill="freeze"/>' : '') + '</path>';
    }
    for (const n of wm.nodes) {
      const w = n.w || 44, on = lit(n.id), here = n.id === cur;
      h += `<rect x="${n.x - w / 2}" y="${n.y - 11}" width="${w}" height="22" rx="11" fill="${on ? 'rgba(10,15,18,0.95)' : 'rgba(10,15,18,0.6)'}" stroke="${here ? '#d946ef' : on ? 'rgba(34,211,238,0.8)' : 'rgba(255,255,255,0.12)'}" stroke-width="1" ${on ? 'filter="url(#mmf)"' : ''}/>` +
        `<text x="${n.x}" y="${n.y + 3.5}" text-anchor="middle" font-family="Orbitron, Inter, sans-serif" font-size="${n.w ? 8 : 10}" font-weight="700" letter-spacing="1.5" fill="${on ? '#ffffff' : 'rgba(255,255,255,0.25)'}">${n.label}</text>`;
    }
    svg.innerHTML = h;
  },
};

/* ============================== JOGO: estados, regras e laço principal ============================== */
const Game = {
  state: 'title', where: 'map', simTime: 0, time: 0, acc: 0, last: 0, hitstopN: 0, menuFrom: 'pause',
  lives: CFG.START_LIVES, orbs: 0, orbsTotal: 0, letters: [false, false, false, false, false], bar: [],
  wordsSeen: new Set(), learnedOrder: [], creatures: new Set(), secrets: new Set(), timeRun: 0,
  checkpoint: null, reserve: null, autoWalk: false, clearT: 0, exit: null, orbSfxT: 0,
  fluency: 0, fluencyFound: 0, fluencyTotal: 0, timers: [], wordSrc: {}, zone: null,

  boot() {
    Save.load(); Flags.readURL(); AudioSys.muted = Save.data.muted;
    R.init(); Input.init(); Voice.init(); UI.init();
    this.loadLevel('1-1'); // a fase fica carregada atrás do mapa até o jogador escolher outra
    WorldMap.init();
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play' && !P.dead && !this.scene()) this.pause(); });
    this.last = performance.now();
    const loop = ts => { this.frame(ts); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },
  // vidas e orbes atravessam as fases (como no Mario World); o resto é por fase
  newRun(word = 'HELLO') {
    this.orbsTotal = 0; this.letters = word.split('').map(() => false); this.bar = [];
    this.wordsSeen = new Set(); this.learnedOrder = []; this.creatures = new Set(); this.secrets = new Set(); this.timeRun = 0;
    this.checkpoint = null; this.reserve = null; this.autoWalk = false; this.exit = null;
    this.timers = []; this.wordSrc = {}; this.zone = null; Dark.k = 0; this.forceInput = null; this.metDark = false;
    if (typeof Cine !== 'undefined' && Cine.active) Cine.end();
    if (typeof Birth !== 'undefined') { Birth.active = false; Arrival.active = false; Prologue.active = false; EchoPulse.reset(); Hints.reset(); }
    if (typeof Glitch !== 'undefined') { Glitch.active = false; Warp.active = false; EchoShot.reset(); }
    if (typeof Palace !== 'undefined') { PalaceIntro.active = false; PalaceSwitch.active = false; Palace.reset(); }
    if (typeof City !== 'undefined') { CityIntro.active = false; CompassScene.active = false; City.reset(); }
    if (typeof City2 !== 'undefined') City2.reset();
    this.card = false; this.goldNew = false;
  },
  // tamanho da barra de palavras: cresce nas fases com mais vocabulário (LEVELS[id].barMax)
  barMax() { return (World.level && World.level.barMax) || CFG.WORD_BAR_MAX; },
  // cena ativa (Coração, nascimento do Echo, chegada): todas têm a mesma interface
  scene() { return Cine.active ? Cine : Birth.active ? Birth : Prologue.active ? Prologue : Glitch.active ? Glitch : Warp.active ? Warp : PalaceSwitch.active ? PalaceSwitch : PalaceIntro.active ? PalaceIntro : CompassScene.active ? CompassScene : CityIntro.active ? CityIntro : SentinelScene.active ? SentinelScene : Arrival.active ? Arrival : null; },
  // relógio da simulação (para quebra-cabeças determinísticos, como os sinos)
  later(sec, fn) { this.timers.push({ t: this.simTime + sec, fn }); },
  loadLevel(id) {
    this.newRun(LEVELS[id].masterWord); NexyLook.stage = NexyLook.stageFor(Save.data.cleared);
    World.load(LEVELS[id]); Ents.clear(); FX.list = [];
    this.card = id === '1-1' && Save.data.goldCard;   // o CARTÃO DOURADO (pontuação máxima na 1-1): já começa com ele
    for (const s of World.statics) {
      const o = { c: s.c, r: s.r, opts: s.opts };
      if (s.type === 'letter') o.index = s.opts.index;
      Ents.spawn(s.type, o);
    }
    Spawns.reset();
    P.reset(World.start.x, World.start.y); Echo.reset(); Cam.snap();
    this.echoBorn = !Object.values(LEVELS[id].doors).some(d => d.birth === 'echo'); Echo.hidden = !this.echoBorn;
    UI.setLetters(LEVELS[id].masterWord); UI.renderBar(); UI.last = {};
  },
  clearInput() { Input.pressedAt.jump = -1; Input.pressedAt.spin = -1; Input.queue.length = 0; Input.dashDir = null; },
  // tela inicial → mapa do mundo
  start() {
    if (this.state !== 'title') return;
    AudioSys.init(); Voice.enabled = true; VoiceClips.warm();
    $('title').classList.remove('on'); this.last = performance.now(); this.acc = 0; this.clearInput();
    this.toMap();
  },
  toMap() {
    UI.hideAll(); this.where = 'map'; this.state = 'map'; this.clearInput();
    // o Nexy evolui ao concluir fases: o visual novo aparece no mapa, com aviso (só uma vez por estágio)
    const st = NexyLook.stageFor(Save.data.cleared), seen = Save.data.met.look || 0; NexyLook.stage = st;
    if (st > seen) { Save.data.met.look = st; Save.write(); if (!Save.data.assist.classic) setTimeout(() => { SFX.oneUp(); UI.msg('NEXY EVOLVED · ' + NEXY_STAGES[st].name + ' · ' + NEXY_STAGES[st].pt, 3600); }, 1400); }
    Music.setVariant('map'); Music.normal(); WorldMap.enter();
  },
  // viaTransition: a íris já mostrou o cartão da fase, então não repete o letreiro
  enterLevel(id, viaTransition) {
    if (!LEVELS[id]) return false;
    UI.hideAll(); WorldMap.leave(); this.loadLevel(id); this.where = 'level'; this.state = 'play'; this.acc = 0; this.clearInput();
    Music.setVariant(LEVELS[id].music || 'world1'); Music.normal();
    if (!viaTransition) setTimeout(() => UI.toast(), 250);
    // a 1-1 começa com a chegada do Nexy num feixe de luz (sem o Echo: ele nasce do primeiro HELLO).
    // Na primeira partida, a chegada é o prólogo inteiro: A Lei das Palavras.
    if (!this.noIntro && !this.echoBorn) setTimeout(() => {
      if (this.state === 'play' && World.level.id === id && !Arrival.active && !Prologue.active) (Save.data.met.prologue ? Arrival : Prologue).start();
    }, viaTransition ? 0 : 50);
    else if (!Save.data.met.echo && this.echoBorn) { Save.data.met.echo = true; Save.write(); this.later(1.4, () => Echo.talk(ECHO.lines.intro)); }
    if (id === 'palace') Palace.enter(viaTransition);
    if (id === '1-3') City.enter(viaTransition);
    if (LEVELS[id].intro) setTimeout(() => { if (this.where === 'level' && World.level.id === id) UI.msg(LEVELS[id].intro, 3200); }, viaTransition ? 900 : 2800);
    return true;
  },
  restartLevel(fresh) { if (fresh) { this.lives = CFG.START_LIVES; this.orbs = 0; } this.enterLevel(World.level.id, true); },
  playAgain() { UI.hideAll(); this.iris(() => this.restartLevel()); },
  // fim de fase → mapa. Saída secreta fecha numa fechadura.
  continueToMap() {
    if (Transition.active) return;
    UI.hideAll(); this.state = 'leaving';
    const x = clamp(P.cx - Cam.x, 40, 920), y = clamp(P.cy - Cam.y, 40, 500);
    Transition.start({ x, y, shape: this.exit === 'secret' ? 'keyhole' : 'circle', mid: () => this.toMap(), openAt: () => ({ x: WorldMap.x, y: WorldMap.y - 18 }) });
  },
  // íris rápida sobre o jogador (reiniciar, voltar ao mapa pela pausa)
  iris(fn, o = {}) {
    if (Transition.active) return;
    this.state = 'leaving';
    const x = clamp(P.cx - Cam.x, 40, 920), y = clamp(P.cy - Cam.y, 40, 500);
    Transition.start({ x, y, mid: fn, openAt: () => o.to === 'map' ? { x: WorldMap.x, y: WorldMap.y - 18 } : { x: P.cx - Cam.x, y: P.cy - Cam.y } });
  },
  pause() {
    if (this.state !== 'play' && this.state !== 'map') return;
    this.state = 'pause'; UI.show('pause'); Music.set({ organ: 0, perc: 0 }); Voice.stop();
    $('pause').querySelectorAll('[data-act="restart"], [data-act="map"]').forEach(b => { b.style.display = this.where === 'map' ? 'none' : ''; });
    $('pause').querySelector('.h-sub').textContent = this.where === 'map' ? 'WORLD 1 · ' + WORLDS[1].name : levelTag(World.level) + ' · ' + World.level.name;
    UI.show('pause');
  },
  resume() { UI.hideAll(); this.state = this.where === 'map' ? 'map' : 'play'; this.last = performance.now(); Music.normal(); this.clearInput(); },
  onDash() {
    if (this.state !== 'play' || P.dead) return;
    SFX.dash();
    const back = Input.dashDir === 'right' ? -1 : 1;
    for (let i = 0; i < 8; i++) FX.add(P.cx + back * 6, P.y + P.h - 4 - Math.random() * 10, { vx: back * (80 + Math.random() * 120), vy: -20 - Math.random() * 40, life: 0.35, size: 1.3, c: 'm', g: 0 });
  },
  toggleMute() { AudioSys.setMuted(!AudioSys.muted); Save.data.muted = AudioSys.muted; Save.write(); $('mutebtn').classList.toggle('off', AudioSys.muted); $('mhMute').classList.toggle('off', AudioSys.muted); },

  onKey(e) {
    const c = e.code;
    if (this.state === 'title') { if (['Enter', 'Space', 'KeyZ', 'KeyX', 'NumpadEnter'].includes(c)) this.start(); return; }
    if (c === 'KeyM') return this.toggleMute();
    if (Transition.active) return;
    const sc = this.scene(); if (sc) return sc.key(e);
    switch (this.state) {
      case 'map':
        if (c === 'Escape' || c === 'KeyP') this.pause();
        else WorldMap.key(c);
        break;
      case 'play':
        if (c === 'Escape' || c === 'KeyP') this.pause();
        else if (c === 'KeyQ') this.dropReserve();
        else if (c === 'KeyC') { if (EchoPulse.fire()) Hints.mark('ping'); }
        else if (c === 'KeyH') { if (P.interact) this.buyHint(P.interact); else UI.msg('HINTS WORK NEAR DOORS'); }
        else if (c === 'KeyV' && Save.data.assist.voice && Listen.available() && P.interact) { this.openPanel(P.interact); Panel.listen(); }
        else if (c === 'KeyV') EchoShot.listen();
        else if (c === 'KeyF') Power.press();   // com o LASER, o Nexy atira; sem ele, a Echo
        break;
      case 'panel': Panel.key(e); break;
      case 'chest': Chest.key(e); break;
      case 'engine': Engine.key(e); break;
      case 'citymap': CityMap.key(e); break;
      case 'pause': case 'grimoire': case 'assist': UI.menuKey(e); break;
      case 'clear': UI.menuKey(e); break;
    }
  },

  frame(ts) {
    const dt = Math.min(0.1, Math.max(0, (ts - this.last) / 1000)); this.last = ts; this.time += dt;
    Input.pollPad();
    Transition.update(dt);
    const sc = this.scene(); if (sc) sc.update(dt);
    if (this.state === 'map') WorldMap.update(dt);
    if (this.where === 'level' && World.level.bg === 'city') City.tick(dt);   // chuva, raios e respingos (tempo real)
    // durante a íris (fechando e no escuro) a fase não anda
    const frozen = Transition.active && Transition.phase !== 'open';
    if (frozen) Input.queue.length = 0;
    if (!frozen && (this.state === 'play' || this.state === 'clearing')) {
      // segurando V para o comando de voz, o tempo fica lento enquanto a Echo escuta (no máximo 5 s)
      if (EchoShot.listening) { EchoShot.listenT += dt; if (EchoShot.listenT > 5) { Listen.stop(); EchoShot.listening = false; } }
      this.acc += dt * (Save.data.assist.slow ? 0.8 : 1) * (sc ? sc.timeScale : 1) * (EchoShot.listening ? 0.3 : 1);
      let n = 0;
      while (this.acc >= CFG.STEP && n < 8) { this.step(CFG.STEP); this.acc -= CFG.STEP; n++; }
      if (n >= 8) this.acc = 0;
    }
    this.render(clamp(this.acc / CFG.STEP, 0, 1));
    UI.frame();
  },
  step(dt) {
    this.simTime += dt;
    if (this.hitstopN > 0) { this.hitstopN--; return; }
    P.px = P.x; P.py = P.y; Ents.save(); Cam.px = Cam.x; Cam.py = Cam.y; Echo.px = Echo.x; Echo.py = Echo.y;
    // cena: o jogo controla o Nexy (investida)
    if (this.forceInput) { Input.touchHeld = Object.assign({}, this.forceInput); for (const k in Input.held) Input.held[k] = false; Input.padHeld = {}; Input.pressedAt.jump = -1; Input.pressedAt.spin = -1; Input.queue.length = 0; }
    for (const k of Input.queue) { if (k === 'up' && this.state === 'play') P.tryInteract(); if (k === 'ping' && EchoPulse.fire()) Hints.mark('ping'); if (k === 'shot') Power.press(); }
    Input.queue.length = 0;
    if (this.state !== 'play' && this.state !== 'clearing') return;
    if (P.dead) { P.update(dt); FX.update(dt); Echo.update(dt); Cam.update(dt); return; }
    if (this.autoWalk) { Input.touchHeld = { right: true }; for (const k in Input.held) Input.held[k] = false; }
    P.update(dt);
    if (this.state === 'panel') return;
    Spawns.update(dt);
    Ents.update(dt);
    // quem está em cima de uma plataforma móvel anda com ela
    if (P.riding) { const e = P.riding; if (e.dead) P.riding = null; else { World.move(P, e.dx, 0); World.move(P, 0, e.dy); } }
    World.updateBlocks(dt); EchoPulse.update(dt); EchoShot.update(dt); Power.update(dt);
    if (this.timers.length) { const due = this.timers.filter(x => x.t <= this.simTime); this.timers = this.timers.filter(x => x.t > this.simTime); for (const x of due) x.fn(); }
    // zonas: cripta escura e abafada, campanário em crescendo
    const z = World.zoneAt(P.cx, P.cy);
    if (z !== this.zone) { this.zone = z; Music.zone(z || {}); if (z && z.dark && !this.metDark) { this.metDark = true; Echo.talk(ECHO.lines.dark); } }
    Dark.k = approach(Dark.k, z && z.dark || 0, dt * 1.5);
    FX.update(dt);
    Echo.update(dt);
    Cam.update(dt);
    if (this.state === 'play') this.timeRun += dt;
    if (this.orbSfxT > 0) this.orbSfxT -= dt;
    if (this.state === 'clearing') { this.clearT += dt; if (this.clearT > 2.2) { this.autoWalk = false; Input.touchHeld = {}; UI.showClear(this.exit); } }
  },
  render(a) {
    const ctx = R.ctx; ctx.setTransform(R.k, 0, 0, R.k, 0, 0); ctx.clearRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    if (this.where === 'map' || this.state === 'title') { WorldMap.render(ctx, this.time); Transition.draw(ctx, this.time); return; }
    const camX = lerp(Cam.px, Cam.x, a) + Cam.sx, camY = lerp(Cam.py, Cam.y, a) + Cam.sy, t = this.time;
    // zoom da cena: a câmera chega perto do Nexy (um pouco abaixo do centro, ângulo heroico)
    const sc = this.scene(), zoom = sc ? sc.zoom : 1, zx = lerp(P.px, P.x, a) + P.w / 2 - camX, zy = lerp(P.py, P.y, a) + P.h * 0.75 - camY;
    const applyZoom = () => { if (zoom !== 1) { ctx.translate(zx, zy); ctx.scale(zoom, zoom); ctx.translate(-zx, -zy); } };
    ctx.save(); applyZoom();
    const city = World.level.bg === 'city';
    BG.draw(ctx, camX, camY, t);
    if (city) City.drawBack(ctx, camX, camY, t);   // caixas escondidas atrás de algo e o trilho do trem
    World.drawTerrain(ctx, camX, camY);
    if (World.level.mirror) Palace.drawMirror(ctx, camX, camY, a);
    Doors.draw(ctx, camX, camY, t);
    World.drawDynamic(ctx, camX, camY, t);
    World.drawTargets(ctx, camX, camY, t);
    Ents.draw(ctx, camX, camY, a, 'back');
    if (city) City.drawFront(ctx, camX, camY, t);
    Ents.draw(ctx, camX, camY, a, 'mid');
    Ents.draw(ctx, camX, camY, a, 'enemy');
    World.drawVeils(ctx, camX, camY);
    Power.drawBack(ctx, camX, camY, a);   // as asas (atrás do Nexy)
    P.draw(ctx, camX, camY, a);
    Power.drawFront(ctx, camX, camY, a);  // o canhão do LASER e o brilho da STAR
    Echo.draw(ctx, camX, camY, a);
    EchoShot.draw(ctx, camX, camY);
    Power.drawBolts(ctx, camX, camY);     // os tiros do Nexy e os dos inimigos
    City.drawCompass(ctx, camX, camY);   // a seta da Bússola das Palavras (todas as fases)
    FX.draw(ctx, camX, camY);
    Dark.draw(ctx, camX, camY);
    Ents.draw(ctx, camX, camY, a, 'front');
    if (city) City.drawRain(ctx, camX, camY, 'front');
    ctx.restore();
    if (sc) {
      // a cor some do mundo; o Nexy, o Echo e a cena continuam em cor por cima
      if (sc.sat > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${sc.sat.toFixed(3)})`; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H); ctx.restore(); }
      ctx.save(); applyZoom();
      if (sc.sat > 0.01) { P.draw(ctx, camX, camY, a); Echo.draw(ctx, camX, camY, a); }
      sc.drawWorld(ctx, camX, camY, t);
      ctx.restore();
    } else {
      ctx.save(); applyZoom(); Hints.draw(ctx, camX, camY, t); EchoPulse.draw(ctx, camX, camY); ctx.restore();
      Doors.drawPrompt(ctx, camX, camY);
    }
    R.draw(R.sprite('vignette', 960, 540, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    }), 480, 270);
    Cine.drawScreen(ctx); Birth.drawScreen(ctx); Arrival.drawScreen(ctx); Prologue.drawScreen(ctx); Glitch.drawScreen(ctx); Warp.drawScreen(ctx);
    PalaceIntro.drawScreen(ctx); PalaceSwitch.drawScreen(ctx); CityIntro.drawScreen(ctx); CompassScene.drawScreen(ctx); SentinelScene.drawScreen(ctx);
    Transition.draw(ctx, this.time);
  },

  /* ---------- regras ---------- */
  hitstop(n) { this.hitstopN = Math.max(this.hitstopN, n); },
  shake(a) { if (Cam.shakeT <= 0) Cam.shakeA = 0; Cam.shakeA = Math.max(Cam.shakeA, a * 2); Cam.shakeT = 0.3; },
  addOrbs(n) {
    this.orbs += n; this.orbsTotal += n;
    if (this.orbSfxT <= 0) { SFX.orb(); this.orbSfxT = 0.05; }
    while (this.orbs >= CFG.ORBS_PER_LIFE) { this.orbs -= CFG.ORBS_PER_LIFE; this.lives++; SFX.oneUp(); UI.msg('1 UP'); }
  },
  collectWord(word, e) {
    if (this.bar.length >= this.barMax()) return false;
    this.bar.push(word);
    if (e.src) this.wordSrc[word] = e.src;
    if (!this.wordsSeen.has(word)) { this.wordsSeen.add(word); this.learnedOrder.push(word); }
    this.grimoireWord(word, null);
    SFX.wordCollect(); Voice.say(WORDS[word] ? WORDS[word].say : word, this.echoBorn ? 'echo' : 'story'); Hints.mark('word');
    FX.burst(e.x + 15, e.y + 12, 16, 'm', 180, { life: 0.5, g: 0 });
    UI.flyWord(word, e.x + 15 - Cam.x, e.y + 12 - Cam.y);
    return true;
  },
  grimoireWord(word, door) {
    if (!WORDS[word]) return;
    const G = Save.data.grimoire.words, e = G[word] || (G[word] = {});
    if (door) e.door = door;
    Save.write();
  },
  consumeWords(words) {
    for (const w of words) { const i = this.bar.indexOf(w); if (i >= 0) this.bar.splice(i, 1); }
    UI.renderBar();
  },
  collectLetter(i, e) {
    if (this.letters[i]) return;
    const mw = World.level.masterWord;
    this.letters[i] = true; SFX.letter(); Voice.say(mw[i], 'echo');
    FX.burst(e.x + 14, e.y + 14, 24, 'm', 220, { life: 0.7, g: 0 });
    const sp = $('letters').children[i]; if (sp) { sp.classList.remove('pop'); void sp.offsetWidth; sp.classList.add('pop'); }
    if (this.letters.every(Boolean)) UI.msg(mw.split('').join(' · '));
  },
  addLife(n, e) {
    this.lives += n; SFX.oneUp(); UI.msg(n + ' UP');
    FX.burst(e.x + e.w / 2, e.y + e.h / 2, 20 + n * 10, 'm', 240, { life: 0.8, g: 0 });
  },
  // a palavra que o ladrão levou volta para o bloco de onde saiu (ou fica flutuando onde ele morava)
  returnWord(word, src, home) {
    const b = src && World.blockAt(src.c, src.r);
    if (b && b.kind === 'question' && Math.abs(src.c * TS - home.x) < 60 * TS) {
      b.state = 'ready'; b.bump = 1; FX.burst(src.c * TS + TS / 2, src.r * TS + TS / 2, 20, 'm', 200, { life: 0.7, g: 0 });
      UI.msg(word + ' · BACK IN ITS BLOCK', 2200);
    } else {
      Ents.spawn('capsule', { word, x: home.x, y: home.y, baseY: home.y - 8, src });
      UI.msg(word + ' · DROPPED BY THE THIEF', 2200);
    }
  },
  collectCrystal() {
    if (!P.aura) { P.aura = true; SFX.powerup(); FX.burst(P.cx, P.cy, 40, 'c', 260, { life: 0.9, g: 0 }); }
    else if (!this.reserve) { this.reserve = 'crystal'; SFX.reserve(); UI.msg('ITEM RESERVED · Q'); }
    else this.addOrbs(10);
  },
  dropReserve(auto) {
    if (!this.reserve) { if (!auto) SFX.thud(); return; }
    this.reserve = null; SFX.reserve();
    Ents.spawn('reserve', { x: P.cx - 11, y: Cam.y - 34 });
  },
  buyHint(d) {
    if (d.hint) return;
    const free = Save.data.assist.freeHints || this.orbs < CFG.HINT_COST;
    if (!free) this.orbs -= CFG.HINT_COST;
    d.hint = true; SFX.ui(); UI.msg(PHRASES_PT[d.def.inscription] || '', 2400);
  },
  // tudo encontrado nesta partida (o segredo do cartão não conta: ele é o prêmio de quem não achou)
  perfectRun() {
    const T = World.totals, glitch = [...World.blocks.values()].some(b => b.kind === 'glitch');
    const secrets = [...this.secrets].filter(s => s !== 'glitch').length;
    return T.wordList.every(w => this.wordsSeen.has(w)) && this.letters.every(Boolean) && T.creatureList.every(c => this.creatures.has(c)) && secrets >= T.secrets - (glitch ? 1 : 0);
  },
  foundSecret(id) { if (this.secrets.has(id)) return; this.secrets.add(id); UI.msg('SECRET FOUND'); },
  registerCreature(name) {
    if (this.creatures.has(name)) return false;
    this.creatures.add(name);
    const isNewEver = !Save.data.grimoire.creatures[name];
    Save.data.grimoire.creatures[name] = true; Save.write();
    if (isNewEver) UI.msg('GRIMOIRE · ' + name);
    return true;
  },
  // combo de pisões: só visual ("1x", "2x"… e o brilho) e efeitos sonoros, sem voz. A partir do 8º pisão, vida extra.
  comboReward(n) {
    if (n >= 8) { this.lives++; SFX.oneUp(); UI.msg('1 UP'); }
  },
  setCheckpoint(e) { this.checkpoint = { x: e.x + e.w / 2, y: e.y + e.h }; EchoShot.refill(); },
  openPanel(d) {
    if (!d || this.state !== 'play') return;
    if (d.kind === 'engine') { Engine.use(d); return; }
    if (d.kind === 'citymap') { CityMap.open(d); return; }
    if (d.kind === 'chest') { this.state = 'chest'; P.vx *= 0.3; Chest.open(d); return; }
    this.state = 'panel'; P.vx *= 0.3; Panel.open(d);
  },
  onDeath() { this.lives--; Music.set({ organ: 0, perc: 0, pad: 0.5 }); },
  respawn() {
    if (this.lives <= 0) {
      // como no Mario World: fim de jogo volta ao mapa com as vidas recarregadas
      this.state = 'gameover'; $('gameover').classList.add('on');
      setTimeout(() => {
        this.lives = CFG.START_LIVES; this.orbs = 0;
        Transition.start({ x: 480, y: 270, mid: () => { $('gameover').classList.remove('on'); this.toMap(); }, openAt: () => ({ x: WorldMap.x, y: WorldMap.y - 18 }) });
      }, 2600);
      return;
    }
    const cp = this.checkpoint || World.start;
    P.reset(cp.x, cp.y); Spawns.reset(); Echo.reset(); Echo.hidden = !this.echoBorn; Cam.snap(); Music.normal(); EchoShot.refill(); EchoShot.bolts = []; Power.respawn();
  },
  finish(exit, bonus) {
    if (this.state !== 'play') return;
    this.state = 'clearing'; this.clearT = 0; this.exit = exit; this.autoWalk = true;
    SFX.goal(); Music.resolve();
    if (bonus) { let k = 0; const iv = setInterval(() => { if (k++ >= bonus) return clearInterval(iv); this.addOrbs(1); }, 30); UI.msg('+' + bonus + ' ORBS'); }
    const S = Save.data, id = World.level.id, mw = World.level.masterWord, ex = S.exits[id] || (S.exits[id] = {});
    const newPath = !ex[exit];
    ex[exit] = true; S.cleared[id] = true; S.map.at = id;
    const best = S.letters[id] || (S.letters[id] = mw.split('').map(() => false));
    this.letters.forEach((v, i) => { if (v) best[i] = true; });
    const all = this.letters.every(Boolean);
    if (all) S.grimoire.master[mw] = true;
    // FLUENCY = itens encontrados ÷ total
    const T = World.totals;
    const words = T.wordList.filter(w => this.wordsSeen.has(w)).length;
    const found = words + this.letters.filter(Boolean).length + (ex.normal ? 1 : 0) + (ex.secret ? 1 : 0) + this.secrets.size + this.creatures.size;
    const total = T.words + T.letters + T.exits + T.secrets + T.creatures;
    this.fluencyFound = found; this.fluencyTotal = total; this.fluency = Math.round(found / total * 100);
    S.bestFluency[id] = Math.max(S.bestFluency[id] || 0, this.fluency);
    // pontuação máxima na 1-1 (todas as palavras, letras, criaturas e segredos; o cartão em si não precisa): o CARTÃO DOURADO
    if (id === '1-1' && !S.goldCard && this.perfectRun()) {
      S.goldCard = true; this.goldNew = true;
      setTimeout(() => { UI.msg('GOLD CARD', 2600); Voice.say(ECHO.lines.goldCard[0].en, 'echo'); }, 4600);
    }
    Save.write();
    setTimeout(() => { if (all) Voice.say(MASTER_WORDS[mw].say + '!', 'echo'); }, 2600);
    if (id === '1-1' && this.echoBorn) this.later(0.4, () => Echo.talk(ECHO.lines.teaser));
    setTimeout(() => { if (exit === 'secret' && newPath) Voice.say('New path!', 'echo'); }, all ? 3900 : 2800);
  },
};

