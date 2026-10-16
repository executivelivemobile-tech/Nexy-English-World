/* ============================== TO BE PALACE (a saída secreta da 1-1) ==============================
   O palácio do verbo TO BE, que ontem era cheio de luz e hoje está escuro. Palavra-mestra: TOBE.
   Mecânica nova: o PASSADO. Dizer o que EXISTIA (WAS / WERE) traz de volta o que existia: a ponte, o tamanho dos
   cavaleiros de pedra, os degraus do relógio. A Echo enxerga o passado (pulso, C): mostra o contorno do que havia.
   No fim, o INTERRUPTOR DO SER (I WAS · I AM) acende o palácio: os blocos-fantasma AM/IS/ARE da 1-1 viram chão para
   sempre e o Coração das Palavras ganha o ANEL DO TO BE.

   ───────────── LEGENDA DESTA FASE (além da legenda global) ─────────────
     t O b e   letras T O B E               !  altar da memória (WHAT WAS HERE?)      @  altar da galeria
     % & $     relógios (ontem, hoje, ontem)  ^  o INTERRUPTOR DO SER                   k  cavaleiro (KNIGHT)
     V U       Alados (pequeno e alto)        |  tubo-pistão do relógio               m  poço de palavras
     blocos: 1 WAS · 2 WERE · 3 IS · 4 ARE · 5 AM · 6 BIG · 7 BRIDGE · l vida
   Os alvos (ponte, estátuas, degraus, portão) ficam em targets, por coluna/linha de base. */
LEVELS.palace = {
  id: 'palace', world: 1, name: 'TO BE PALACE', masterWord: 'TOBE', music: 'palace', bg: 'palace', mirror: true,
  // 150 colunas × 23 linhas. Chão na linha 20, teto nas linhas 0-1.
  map: [
/*MAP:palace*/
  ],
  blocks: {
    '1': { block: 'question', content: { word: 'WAS' } },
    '2': { block: 'question', content: { word: 'WERE' } },
    '3': { block: 'question', content: { word: 'IS' } },
    '4': { block: 'question', content: { word: 'ARE' } },
    '5': { block: 'question', content: { word: 'AM' } },
    '6': { block: 'question', content: { word: 'BIG' } },
    '7': { block: 'question', content: { word: 'BRIDGE' } },
    // poço de palavras da torre: cada batida dá a próxima palavra que falta (ninguém fica preso no relógio)
    'm': { block: 'question', content: { reserve: ['WAS', 'IS', 'WERE', 'ARE'] } },
    'l': { block: 'question', content: { life: 1 } },
  },
  entities: {
    't': { entity: 'letter', index: 0 }, 'O': { entity: 'letter', index: 1 }, 'b': { entity: 'letter', index: 2 }, 'e': { entity: 'letter', index: 3 },
    '!': { entity: 'pedestal', door: 'altar1', look: 'altar', runes: ['IT', 'WAS', 'IS'] },
    '@': { entity: 'pedestal', door: 'altar2', look: 'altar', runes: ['THEY', 'WERE', 'ARE'] },
    '%': { entity: 'pedestal', door: 'clock1', look: 'clock', face: 'past' },
    '&': { entity: 'pedestal', door: 'clock2', look: 'clock', face: 'now' },
    '$': { entity: 'pedestal', door: 'clock3', look: 'clock', face: 'past' },
    '^': { entity: 'beswitch', door: 'switch' },
    'k': { entity: 'knight', respawn: 'offscreen' },
    'V': { entity: 'flyer', path: 'v', amp: 0.35, period: 2, respawn: 'summon' },
    'U': { entity: 'flyer', path: 'v', amp: 1.2, period: 2.4, respawn: 'summon' },
    '|': { entity: 'pipe', rise: 6, beats: 4, phase: 0 },
  },
  // a mesma lei, agora no tempo: o que você diz que EXISTIA volta a existir
  hints: [
    { c: 19, r: 12, en: 'C · ECHO SEES THE PAST', pt: 'perto do abismo, aperte C: a Echo mostra o que existia ali', until: 'pastping' },
    { c: 52, r: 13, en: 'THEY WERE …', pt: 'as sombras na parede mostram como as estátuas eram', until: 'altar2' },
    { c: 79, r: 10, en: 'YESTERDAY → WAS · TODAY → IS', pt: 'ontem pede o passado; hoje, o presente', until: 'clock1' },
    { c: 118, r: 9, en: 'YESTERDAY I … · TODAY I …', pt: 'fale de você: como você era e como você é', until: 'switch' },
  ],
  // alvos. look: memory (pedra de luz que volta), knight (estátua), gate (portão). ghost: contorno do que existia
  // ('ping' = só com o pulso da Echo; 'always' = sempre, bem fraco). past = o que a Echo diz ao ver o passado.
  targets: {
    bridge1: { kind: 'rune', look: 'memory', ghost: 'ping', c: 29, r: 20, anchor: 'left', small: { w: 0, h: 0 }, big: { w: 10, h: 1 }, state: 'small',
      past: { en: 'It was a bridge!', pt: 'Aqui EXISTIA uma ponte!' } },
    knight1: { kind: 'rune', look: 'knight', ghost: 'always', c: 67, r: 19, anchor: 'left', small: { w: 1, h: 1 }, big: { w: 2, h: 3 }, state: 'small',
      past: { en: 'They were knights!', pt: 'Eram cavaleiros… e olha o tamanho das sombras!' } },
    knight2: { kind: 'rune', look: 'knight', ghost: 'always', c: 70, r: 19, anchor: 'left', small: { w: 1, h: 1 }, big: { w: 2, h: 5 }, state: 'small' },
    knight3: { kind: 'rune', look: 'knight', ghost: 'always', c: 73, r: 19, anchor: 'left', small: { w: 1, h: 1 }, big: { w: 2, h: 7 }, state: 'small' },
    step1: { kind: 'rune', look: 'memory', ghost: 'always', c: 84, r: 17, anchor: 'left', small: { w: 0, h: 0 }, big: { w: 3, h: 1 }, state: 'small' },
    step2: { kind: 'rune', look: 'memory', ghost: 'always', c: 84, r: 11, anchor: 'left', small: { w: 0, h: 0 }, big: { w: 3, h: 1 }, state: 'small' },
    bridge2: { kind: 'rune', look: 'memory', ghost: 'always', c: 84, r: 8, anchor: 'left', small: { w: 0, h: 0 }, big: { w: 15, h: 1 }, state: 'small' },
    gate: { kind: 'rune', look: 'gate', c: 135, r: 19, anchor: 'left', small: { w: 0, h: 0 }, big: { w: 2, h: 12 }, state: 'big', hFirst: true },
  },
  doors: {
    altar1: {
      kind: 'pedestal', title: 'ALTAR OF MEMORY', inscription: 'WHAT WAS HERE?', mold: ['IT', '_', 'A', '_', '.'], consume: false, reusable: true,
      accept: [{ words: ['WAS', 'BRIDGE'], result: { type: 'target', target: 'bridge1', act: 'big' } }],
      // erro com retorno: o alvo treme e a Echo aponta o porquê (sem dar a frase pronta)
      enact: [
        { words: ['IS', 'BRIDGE'], result: { type: 'confused', target: 'bridge1', tip: { en: 'Not today. Yesterday!', pt: 'Hoje não tem ponte nenhuma. Ela EXISTIA ontem: o passado de IS é WAS.' } } },
        { words: ['WERE', '*'], result: { type: 'confused', target: 'bridge1', tip: { en: 'It? Not were!', pt: 'Com IT, o passado é WAS. WERE é para YOU, WE e THEY.' } } },
        { words: ['ARE', '*'], result: { type: 'confused', target: 'bridge1', tip: { en: 'It? Not are!', pt: 'IT nunca usa ARE. Hoje IT IS; ontem IT WAS.' } } },
      ],
    },
    altar2: {
      kind: 'pedestal', title: 'GALLERY OF KNIGHTS', inscription: 'WERE THEY BIG OR SMALL?', mold: ['THEY', '_', '_', '.'], consume: false, reusable: true,
      accept: [{ words: ['WERE', 'BIG'], result: { type: 'targets', targets: ['knight1', 'knight2', 'knight3'], act: 'big' } }],
      enact: [
        { words: ['WERE', 'SMALL'], result: { type: 'confused', target: ['knight1', 'knight2', 'knight3'], tip: { en: 'Look at the shadows!', pt: 'Eles ERAM pequenos? Olhe as sombras na parede: elas guardam o tamanho de antes.' } } },
        { words: ['ARE', '*'], result: { type: 'confused', target: ['knight1', 'knight2', 'knight3'], tip: { en: 'Not today. Yesterday!', pt: 'A pergunta é no passado (WERE THEY…?): responda no passado.' } } },
        { words: ['WAS', '*'], result: { type: 'confused', target: ['knight1', 'knight2', 'knight3'], tip: { en: 'They? Not was!', pt: 'THEY pede WERE no passado, como pede ARE no presente.' } } },
        { words: ['IS', '*'], result: { type: 'confused', target: ['knight1', 'knight2', 'knight3'], tip: { en: 'They? Not is!', pt: 'THEY nunca usa IS. No passado: WERE.' } } },
      ],
    },
    // A TORRE DO RELÓGIO: ontem, hoje, ontem. O molde já traz o sujeito e o adjetivo; o aluno escolhe só o verbo
    // (tempo + concordância). As frases repetem a história do Baú da Memória da 1-2 (repetição espaçada).
    clock1: {
      kind: 'pedestal', title: 'CLOCK OF YESTERDAY', inscription: 'HOW WAS NEXY YESTERDAY?', mold: ['NEXY', '_', 'AFRAID', '.'], consume: false, reusable: true,
      accept: [{ words: ['WAS'], result: { type: 'target', target: 'step1', act: 'big' } }],
      enact: [
        { words: ['IS'], result: { type: 'confused', target: 'step1', tip: { en: 'Not today. Yesterday!', pt: 'YESTERDAY = ontem. Ontem pede o passado de IS: WAS.' } } },
        { words: ['WERE'], result: { type: 'confused', target: 'step1', tip: { en: 'Nexy? Not were!', pt: 'O Nexy é um só (HE): no passado, WAS.' } } },
        { words: ['*'], result: { type: 'confused', target: 'step1', tip: { en: 'Nexy is he!', pt: 'O Nexy é HE: hoje IS, ontem WAS.' } } },
      ],
    },
    clock2: {
      kind: 'pedestal', title: 'CLOCK OF TODAY', inscription: 'HOW IS NEXY TODAY?', mold: ['NEXY', '_', 'STRONG', '.'], consume: false, reusable: true,
      accept: [{ words: ['IS'], result: { type: 'target', target: 'step2', act: 'big' } }],
      enact: [
        { words: ['WAS'], result: { type: 'confused', target: 'step2', tip: { en: 'Not yesterday. Today!', pt: 'TODAY = hoje. Hoje pede o presente: IS.' } } },
        { words: ['*'], result: { type: 'confused', target: 'step2', tip: { en: 'Nexy is he!', pt: 'O Nexy é HE: hoje IS, ontem WAS.' } } },
      ],
    },
    clock3: {
      kind: 'pedestal', title: 'CLOCK OF YESTERDAY', inscription: 'HOW WERE THEY YESTERDAY?', mold: ['THEY', '_', 'BIG', '.'], consume: false, reusable: true,
      accept: [{ words: ['WERE'], result: { type: 'target', target: 'bridge2', act: 'big' } }],
      enact: [
        { words: ['ARE'], result: { type: 'confused', target: 'bridge2', tip: { en: 'Not today. Yesterday!', pt: 'Ontem (YESTERDAY): o passado de ARE é WERE.' } } },
        { words: ['WAS'], result: { type: 'confused', target: 'bridge2', tip: { en: 'They? Not was!', pt: 'THEY pede WERE. WAS é para I, HE, SHE e IT.' } } },
        { words: ['*'], result: { type: 'confused', target: 'bridge2', tip: { en: 'They? Not is!', pt: 'THEY: hoje ARE, ontem WERE.' } } },
      ],
    },
    // O INTERRUPTOR DO SER: produção em 1ª pessoa, passado e presente na mesma frase (A2 → B1)
    switch: {
      kind: 'pedestal', title: 'THE BE SWITCH', inscription: 'WHO WERE YOU? WHO ARE YOU?',
      mold: ['YESTERDAY', ',', 'I', '_', 'SMALL', '.', 'TODAY', ',', 'I', '_', 'STRONG', '.'], consume: false, reusable: true,
      accept: [{ words: ['WAS', 'AM'], result: { type: 'beswitch' } }],
      enact: [
        { words: ['WAS', 'WAS'], result: { type: 'confused', target: 'gate', tip: { en: 'Today is now!', pt: 'TODAY = hoje, agora: presente. Com I, o presente é AM.' } } },
        { words: ['AM', 'WAS'], result: { type: 'confused', target: 'gate', tip: { en: 'Yesterday is the past!', pt: 'Ontem vai no passado, hoje no presente. Com I: WAS e AM.' } } },
        { words: ['AM', 'AM'], result: { type: 'confused', target: 'gate', tip: { en: 'Yesterday is the past!', pt: 'Ontem vai no passado. Com I, o passado é WAS.' } } },
        { words: ['WERE', '*'], result: { type: 'confused', target: 'gate', tip: { en: 'I? Not were!', pt: 'Com I, o passado é WAS (WERE é para YOU, WE e THEY).' } } },
        { words: ['*', 'WERE'], result: { type: 'confused', target: 'gate', tip: { en: 'I? Not were!', pt: 'Com I, o passado é WAS; e o presente é AM.' } } },
        { words: ['*', '*'], result: { type: 'confused', target: 'gate', tip: { en: 'I am. I was.', pt: 'Com I: AM hoje, WAS ontem. Nunca IS nem ARE.' } } },
      ],
    },
  },
};
