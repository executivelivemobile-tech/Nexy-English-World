#!/usr/bin/env node
/* Lista TODAS as falas do jogo, por quem fala, a partir dos dados de src/ (sem abrir o navegador).
 *   node tools/voice/lines.js            → escreve tools/voice/lines.json e mostra o resumo
 * Cada fala: { who, text, prompt }. `text` é o que o jogo passa para Voice.say (a chave de busca do áudio);
 * `prompt` é o que vai para a ElevenLabs (às vezes com uma etiqueta de entrega, como [warmly]).
 * Quem fala: echo (a companheira), story (o narrador do Baú) e door (portas, altares e o grito da cena épica).
 * Ao criar fala nova no jogo, rode de novo e gere só as que faltam (tools/voice/README.md). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');

// mesma normalização do jogo (VoiceClips.key em 20_audio.js)
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim();

function loadData() {
  const src = ['src/10_data.js', 'src/12_level_1-2.js', 'src/14_level_palace.js']
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
    .replace(/<\/?script>/g, '').replace(/\/\*MAP:[^*]*\*\//g, '""');
  const store = {};
  const ctx = { document: { getElementById: () => null }, localStorage: { getItem: () => null, setItem() {} }, window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.__ = { WORDS, CREATURES, ECHO, MASTER_WORDS, LEVELS, PROLOGUE, ENGINE, PALACE };', ctx);
  return ctx.__;
}

function build() {
  const { WORDS, CREATURES, ECHO, MASTER_WORDS, LEVELS, PROLOGUE, ENGINE, PALACE } = loadData();
  const out = [], seen = new Set();
  const add = (who, text, prompt) => {
    if (!text || !/[A-Za-z]/.test(text)) return;
    const k = who + ':' + norm(text);
    if (seen.has(k)) return;
    seen.add(k); out.push({ who, text: String(text), prompt: prompt || String(text) });
  };
  // Sentence.speakable / speakInscription / fill (iguais aos de 70_game.js)
  const speakable = tokens => {
    let o = '';
    tokens.forEach((t, i) => {
      if (/^[.,!?]$/.test(t)) { o += t; return; }
      let w = WORDS[t] ? WORDS[t].say : t.toLowerCase();
      if (t === 'I') w = 'I';
      if (i === 0) w = w.charAt(0).toUpperCase() + w.slice(1);
      o += (o ? ' ' : '') + w;
    });
    return o;
  };
  const inscription = s => { const l = s.toLowerCase().replace(/\bi\b/g, 'I'); return l.charAt(0).toUpperCase() + l.slice(1); };
  const fill = (mold, words) => { let i = 0; return mold.map(t => t === '_' ? (words[i++] || '___') : t); };
  const word = w => (WORDS[w] ? WORDS[w].say : w);
  // uma palavra sozinha vira frase curta para a voz não engolir ("big." em vez de "big")
  const alone = s => s.replace(/[.!?]*$/, '') + '.';

  /* ---------------- ECHO: a companheira ---------------- */
  for (const k in ECHO.lines) for (const l of ECHO.lines[k]) add('echo', l.en);
  add('echo', 'Hello! I am Echo. I am your friend.');     // ASSIST → voz do Echo
  add('echo', 'Hello', '[softly] Hello...');                // os ecos do nascimento
  add('echo', ECHO.say, alone(ECHO.say));
  for (const k in WORDS) add('echo', WORDS[k].say, alone(WORDS[k].say));
  for (const k in CREATURES) add('echo', CREATURES[k].say, alone(CREATURES[k].say));
  for (const k in MASTER_WORDS) {
    add('echo', MASTER_WORDS[k].say, alone(MASTER_WORDS[k].say));
    add('echo', MASTER_WORDS[k].say + '!', '[excited] ' + MASTER_WORDS[k].say + '!');
    for (const ch of k) add('echo', ch, ch + '.');        // as letras soltas (H, E, L, O...)
  }
  add('echo', 'New path!', '[excited] New path!');
  add('echo', 'Now you. Say it.', '[warmly] Now you. Say it.');
  add('echo', 'Are you?', '[curious] Are you?');

  /* ---------------- prólogo: A Lei das Palavras (o narrador; IT IS BIG/SMALL saem na voz das portas) ---------------- */
  for (const k of ['magic', 'floor', 'truth', 'turn', 'rule']) add('story', PROLOGUE[k].en);

  /* ---------------- o segredo da 1-1: a TO BE ENGINE (o narrador lê a tabela e as frases da escalada) ---------------- */
  add('story', ENGINE.intro.en);
  for (const r of ENGINE.table) add('story', (r.p === 'I' ? 'I' : r.p.charAt(0) + r.p.slice(1).toLowerCase()) + ' ' + r.v.toLowerCase() + '.');
  for (const r of ENGINE.climb) add('story', r.say);

  /* ---------------- TO BE PALACE: a lembrança, a tabela e a cena do interruptor (narrador); a Echo comemora ---------------- */
  for (const l of PALACE.intro) add('story', l.en);
  add('story', PALACE.tableLine.en);
  for (const l of PALACE.switch) add('story', l.en);
  add('echo', PALACE.cheer.en, '[excited] ' + PALACE.cheer.en);
  // Grimório → PODERES: o botão de ouvir
  for (const p of ['Echo pulse', 'Echo shot', 'Voice mode', 'Heart of words', 'To be ring', 'Warp card']) add('echo', p, alone(p));

  /* ---------------- portas, altares, baú ---------------- */
  for (const id in LEVELS) {
    const L = LEVELS[id];
    for (const did in (L.doors || {})) {
      const def = L.doors[did];
      if (def.inscription) add('door', inscription(def.inscription));
      if (def.story) {
        const S = def.story;
        // narrador: leitura, perguntas, as provas no texto, as palavras novas
        for (const p of S.pages) add('story', p.en);
        if (S.climb) { add('story', S.climb.page.en); for (const r of S.climb.rungs) { add('story', r.q); for (const o of r.options) add('echo', o); } }
        for (const q of S.questions) { add('story', q.q); add('story', q.ev[1]); for (const o of q.options) add('echo', o); }
        for (const w of S.words) add('story', w.w, alone(word(w.w)));
        // clicar numa palavra do texto: o Echo diz a palavra
        const texts = S.pages.map(p => p.en).concat(S.climb ? [S.climb.page.en] : []);
        for (const t of texts) for (const tok of t.split(' ')) { const w = tok.replace(/[^A-Za-z']/g, ''); if (w) add('echo', w, alone(w)); }
        if (S.final) for (const w of S.final.options) add('echo', 'I am ' + word(w) + '.');
        // o grito da cena épica cresce com o poder
        for (const c of S.cries || []) add('door', c, '[shouting] ' + inscription(c).replace(/\bi\b/g, 'I'));
        continue;
      }
      if (def.nudge) for (const n of def.nudge) for (const l of n.lines) add('echo', l.en);   // dicas da Echo no altar
      if (def.nudgeMissing) add('echo', def.nudgeMissing.en);
      for (const r of def.enact || []) if (r.result.tip) add('echo', r.result.tip.en);   // retorno da Echo no erro (palácio)
      if (!def.mold) continue;
      // as frases que o jogador monta: as certas, as encenações e os erros de concordância mais prováveis
      const slots = def.mold.filter(t => t === '_').length;
      const cand = Array.from({ length: slots }, () => new Set());
      const rules = (def.accept || []).concat(def.enact || []);
      for (const r of rules) r.words.forEach((w, i) => { if (w !== '*') cand[i].add(w); });
      // erros de concordância (e de tempo, nas fases com WAS/WERE) mais prováveis
      const verbs = ['AM', 'IS', 'ARE'], past = ['AM', 'IS', 'ARE', 'WAS', 'WERE'];
      cand.forEach(s => { const all = [...s]; if (all.some(w => w === 'WAS' || w === 'WERE')) past.forEach(v => s.add(v)); else if (all.some(w => verbs.includes(w))) verbs.forEach(v => s.add(v)); });
      // posições só com '*' (YES, *): as palavras que as regras certas usam ali
      cand.forEach((s, i) => { if (!s.size) for (const r of def.accept || []) if (r.words[i]) s.add(r.words[i]); });
      const combos = cand.reduce((acc, s) => acc.flatMap(a => [...s].map(w => a.concat(w))), [[]]);
      // frases longas (o interruptor do palácio, 2 frases numa só): só as regras escritas; o resto a porta repete palavra por palavra
      if (combos.length <= 60 && def.mold.length <= 6) for (const c of combos) add('door', speakable(fill(def.mold, c)));
      else for (const r of def.enact || []) if (!r.words.includes('*')) add('door', speakable(fill(def.mold, r.words)));
      for (const r of rules) if (r.say) add('door', r.say);
      for (const a of def.accept || []) add('door', speakable(fill(def.mold, a.words)));
      // palavras soltas da porta (para frases que não estão na lista: a porta repete palavra por palavra)
      for (const t of def.mold) if (t !== '_' && /[A-Z]/.test(t)) add('door', word(t), alone(word(t)));
    }
    // o que a Echo diz ao ver o passado com o pulso (palácio)
    for (const tid in L.targets || {}) if (L.targets[tid].past) add('echo', L.targets[tid].past.en);
    // narrador antes do Echo nascer (1-1): as palavras coletadas
    for (const w of Object.keys(WORDS)) add('story', WORDS[w].say, alone(WORDS[w].say));
  }
  // portas: todas as palavras soltas
  for (const k in WORDS) add('door', WORDS[k].say, alone(WORDS[k].say));
  return out;
}

if (require.main === module) {
  const lines = build();
  fs.writeFileSync(path.join(__dirname, 'lines.json'), JSON.stringify(lines, null, 1) + '\n');
  const by = {};
  for (const l of lines) { by[l.who] = by[l.who] || { n: 0, chars: 0 }; by[l.who].n++; by[l.who].chars += l.prompt.length; }
  console.log('falas:', lines.length, by);
}
module.exports = { build, norm };
