/* ============================== MODO TESTE (para o dono aprovar as fases) ==============================
   Escondido: na tela inicial ou na pausa, aperte T (no celular: pausa e 5 toques em PAUSE); ou abra o arquivo com
   #teste no endereço. Pula direto para qualquer fase e trecho, com ajudas opcionais (vidas, as palavras da fase, um
   poder, o cartão, sem dano) e a lista do que testar em cada fase (as marcas ficam só neste aparelho).
   Não mistura com o jogo de verdade: a partida de teste não grava nada (Save.sandbox) e, ao voltar ao mapa, o
   progresso, as vidas e as orbes voltam a ser os de antes do teste. */
const TestMode = {
  from: null, lvl: '1-1', god: false, run: false, before: null, taps: 0, tapT: 0,
  opts: { lives: true, words: false, power: null, card: false, god: false },
  // para onde pular: [rótulo, coluna, linha] (cada ponto tem chão embaixo)
  LEVELS: [
    { id: '1-1', name: '1-1 · HELLO WORLD', spots: [['Início (prólogo)', 3, 19], ['Trem de Rastejantes · o cartão', 19, 19], ['Depois da porta 1', 44, 19], ['Porta 2 · checkpoint', 104, 19], ['TO BE ENGINE', 134, 19], ['Praça final', 181, 19]],
      checks: ['Prólogo: as letras de HELLO caem; IT IS BIG / SMALL no Rastejante', 'Trem de Rastejantes: o mural acende (NOW!) e o pisão triplo dá o cartão',
        'Portas: HELLO! · I AM FINE · IT IS A KEY', 'TO BE ENGINE com o cartão: as 7 ligações, a escalada e o teletransporte', 'Saída normal e a saída secreta (palácio)'] },
    { id: '1-2', name: '1-2 · WHO ARE YOU?', spots: [['Início', 3, 29], ['Lustres', 88, 26], ['Coro dos sinos', 140, 29], ['Cripta', 212, 35], ['Baú da Memória', 229, 35], ['Depois do muro', 246, 29], ['Campanário', 270, 29]],
      checks: ['Porta 1: WHO ARE YOU? → NEXY; porta 2: NO, NOT', 'Sinos: HOW ARE YOU? (de primeira dá vida)', 'Altar 2: THEY ARE SMALL tira os gigantes; o poço dá as palavras',
        'Baú da Memória: leitura, perguntas com SHE, escalada e a cena do muro', 'Outro caminho do muro (poço + Alado)', 'Altar 3: IT (ponte) e YOU (Echo · saída secreta)'] },
    { id: 'palace', name: 'TO BE PALACE', spots: [['Salão dos Espelhos', 3, 19], ['Galeria dos cavaleiros', 41, 19], ['Torre do Relógio', 79, 19], ['Salão do Interruptor', 108, 19]],
      checks: ['Lembrança na 1ª visita; o pulso (C) mostra o passado', 'IT WAS A BRIDGE · THEY WERE BIG (estátuas em escada)', 'Relógios: WAS / IS / WERE e a dica "Nexy is she!"',
        'Interruptor: YESTERDAY I WAS SMALL · TODAY I AM STRONG e o anel', 'Outros caminhos: Alados em cada desafio'] },
    { id: '1-3', name: '1-3 · WHERE IS IT?', spots: [['Letreiro do HOTEL', 2, 19], ['Prédio alto', 30, 11], ['Outdoor', 76, 19], ['Café (2 lacunas)', 100, 17], ['Estação do trem', 137, 15], ['Mercado neon · LASER', 165, 15],
      ['Mapa da cidade', 198, 15], ['Beco dos lasers', 221, 15], ['Portões de laser', 246, 15], ['Abismo · WINGS', 276, 15], ['Antena', 296, 10], ['Arena do Sentinela', 333, 15]],
      checks: ['Caixa: UNDER THE SIGN · IN THE HOLE · o café com 2 lacunas', 'Gárgula: de costas ela voa; olhando vira pedra (degrau)', 'Trem até o mercado; LASER (tiro e carga); mapa da cidade e bússola',
        'Beco: IN FRONT OF THE LASER; ou do poste quebrar o emissor', 'Portões de laser, STAR escondida e drones', 'Abismo: BETWEEN THE SIGN AND THE WALL; ou WINGS + ventilador; sacada planando',
        'Sentinela: UNDER / BEHIND / NEXT TO; e vencer sem o terminal'] },
  ],
  KEY: 'nexy-english-world.test',
  load() { try { return JSON.parse(window.localStorage.getItem(this.KEY)) || {}; } catch (e) { return {}; } },
  saveChecks(c) { try { window.localStorage.setItem(this.KEY, JSON.stringify(c)); } catch (e) { /* sem armazenamento */ } },
  init() {
    const el = document.createElement('div'); el.id = 'testmode'; el.className = 'overlay'; $('stage').appendChild(el);
    el.addEventListener('click', ev => this.click(ev));
    const b = document.createElement('div'); b.id = 'testbadge'; b.textContent = 'MODO TESTE · NÃO SALVA'; $('stage').appendChild(b);
    // 5 toques em PAUSE abrem o modo (na tela inicial o toque já começa o jogo; lá é a tecla T)
    const t = document.querySelector('#pause .h-title'); if (t) t.addEventListener('pointerdown', () => this.tap());
    if (/teste/i.test(window.location.hash)) setTimeout(() => { if (Game.state === 'title') this.show(); }, 300);
  },
  tap() {
    const now = performance.now(); if (now - this.tapT > 2500) this.taps = 0;
    this.tapT = now; if (++this.taps >= 5) { this.taps = 0; this.show(); }
  },
  show() {
    if (Game.state === 'test') return;
    this.from = Game.state;
    if (this.from === 'title') $('title').classList.remove('on');
    UI.hideAll(); Game.state = 'test';
    if (Game.where === 'level' && World.level && this.LEVELS.some(L => L.id === World.level.id)) this.lvl = World.level.id;
    this.render(); $('testmode').classList.add('on'); SFX.select();
  },
  close() {
    $('testmode').classList.remove('on');
    if (this.from === 'title') { Game.state = 'title'; $('title').classList.add('on'); }
    else if (this.from === 'pause') { Game.state = 'pause'; UI.show('pause'); }
    else Game.resume();
  },
  key(e) { if (e.code === 'Escape' || e.code === 'KeyT') this.close(); },
  render() {
    const L = this.LEVELS.find(x => x.id === this.lvl), checks = this.load(), o = this.opts, inLevel = Game.where === 'level' && this.from === 'pause';
    const tog = (k, v, label) => `<button class="btn small tm-tog${(v === undefined ? o[k] : o[k] === v) ? ' on' : ''}" data-tog="${k}" data-v="${v === undefined ? '' : v}">${label}</button>`;
    $('testmode').innerHTML = `<div class="tm-head"><div class="h-title">MODO TESTE</div>
        <div class="tm-sub">Escolha a fase e o trecho: você cai direto lá. Marque o que já testou (fica salvo neste aparelho).</div></div>
      <div class="tm-tabs">${this.LEVELS.map(x => `<button class="btn small${x.id === this.lvl ? ' cur' : ''}" data-lvl="${x.id}">${x.name}</button>`).join('')}</div>
      <div class="tm-body">
        <div class="tm-col"><div class="tm-lbl">IR PARA</div><div class="tm-grid">${L.spots.map((s, i) => `<button class="tm-spot" data-spot="${i}">${s[0]}</button>`).join('')}</div></div>
        <div class="tm-col"><div class="tm-lbl">O QUE TESTAR</div>${L.checks.map((c, i) => `<label class="tm-check"><input type="checkbox" data-check="${L.id}:${i}"${checks[L.id + ':' + i] ? ' checked' : ''}><span>${c}</span></label>`).join('')}</div>
      </div>
      <div class="tm-tools"><span class="tm-lbl">AJUDAS</span>${tog('lives', undefined, '99 VIDAS')}${tog('words', undefined, 'PALAVRAS DA FASE')}${tog('god', undefined, 'SEM DANO')}${tog('card', undefined, 'CARTÃO')}${tog('power', 'laser', 'LASER')}${tog('power', 'wings', 'WINGS')}</div>
      <div class="tm-foot">${inLevel ? '<button class="btn small primary" data-act="here">CONTINUAR AQUI</button>' : ''}<button class="btn small" data-act="close">FECHAR</button></div>`;
  },
  click(ev) {
    const b = ev.target.closest('button, input'); if (!b) return;
    const d = b.dataset;
    if (d.check) { const c = this.load(); c[d.check] = b.checked; this.saveChecks(c); return; }
    if (d.lvl) { this.lvl = d.lvl; SFX.select(); return this.render(); }
    if (d.tog) { const k = d.tog; if (k === 'power') this.opts.power = this.opts.power === d.v ? null : d.v; else this.opts[k] = !this.opts[k]; SFX.select(); return this.render(); }
    if (d.spot != null) { const s = this.LEVELS.find(x => x.id === this.lvl).spots[+d.spot]; return this.go(this.lvl, s[1], s[2], s[0]); }
    if (d.act === 'here') { $('testmode').classList.remove('on'); Game.state = 'play'; this.begin(); this.apply(); Game.resume(); return; }
    if (d.act === 'close') return this.close();
  },
  // pula: entra na fase sem as cenas de chegada, põe a Nexy no ponto e faz dele o checkpoint
  go(id, c, r, label) {
    if (!AudioSys.ctx) { AudioSys.init(); Voice.enabled = true; VoiceClips.warm(); }
    $('testmode').classList.remove('on'); $('title').classList.remove('on');
    if (this.run) Save.load(); this.begin();   // cada pulo parte do progresso de verdade
    Game.noIntro = true; Game.enterLevel(id); Game.noIntro = false;
    if (id === '1-1' && c > 41) { Game.echoBorn = true; Echo.hidden = false; }   // depois da porta 1 a Echo já nasceu
    NEXY.teleport(c, r); Echo.reset(); Echo.hidden = !Game.echoBorn;
    Game.checkpoint = { x: c * TS + TS / 2, y: (r + 1) * TS };
    this.apply(); UI.msg('TESTE · ' + label, 2000);
  },
  // a partida passa a ser de teste: nada é gravado até voltar ao mapa
  begin() {
    if (!this.run) this.before = { lives: Game.lives, orbs: Game.orbs };
    this.run = true; Save.sandbox = true; $('testbadge').classList.add('on');
  },
  // fim da partida de teste (Game.toMap): volta o progresso real; só as preferências (ASSIST, som, voz) ficam
  end() {
    if (!this.run) return;
    const d = Save.data, keep = { assist: Object.assign({}, d.assist), muted: d.muted, voiceURI: d.voiceURI };
    Save.sandbox = false; Save.load(); Object.assign(Save.data.assist, keep.assist); Save.data.muted = keep.muted; Save.data.voiceURI = keep.voiceURI; Save.write();
    Game.lives = this.before.lives; Game.orbs = this.before.orbs;
    this.run = false; this.god = false; $('testbadge').classList.remove('on');
  },
  apply() {
    const o = this.opts; this.god = o.god;
    if (o.lives) Game.lives = Math.max(Game.lives, 99);
    if (o.card) Game.card = true;
    if (o.power) P.power = o.power;
    if (o.words) { const ws = World.totals.wordList.filter(w => WORDS[w] && !Game.bar.includes(w)); NEXY.give(...ws); }
  },
};
