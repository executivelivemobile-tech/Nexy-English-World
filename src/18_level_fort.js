/* ============================== O FORTE DE FERRO · CAN YOU? (o forte do Mundo 1, depois da 1-3) ==============================
   Uma fortaleza de ferro e vitrais acima da cidade. Palavra-mestra: IRON. Mecânica nova: as PEDRAS DA LEI.
   Cada pedra manda num trecho (zona) e diz o que PODE e o que NÃO PODE acontecer ali: YOU CAN'T JUMP, THE STONES CAN
   FALL, THE EYES CAN SEE... A frase certa reescreve a lei e o mundo obedece na hora (o que você diz vira verdade).
   CAN não muda com a pessoa (I can, she can, they can): o primeiro verbo do jogo que não pede AM/IS/ARE.
   Desafio crescente: uma lacuna (I CAN JUMP) → duas (THE FLOOR CAN MOVE) → resposta curta com pronome (NO, THEY CAN'T)
   → no Guardião, a lei muda a cada rodada → no Coração, COULD (o CAN de ontem, B1).
   Peças novas: esmagadores, o chão que se mexe, plataformas que caem, os OLHOS DE FERRO (o facho; a sombra dos pilares
   esconde), o ferro derretido que sobe, morcegos, paredes rachadas (só o MARTELO quebra) e o GUARDIÃO DE FERRO.
   Poderes novos: FIRE (bolas de fogo que quicam), HAMMER (golpe de perto, quebra o ferro rachado), CLOCK (para o tempo).
   Ao vencer o Guardião, o Coração ganha o SELO DA LEI: o pulo duplo, do Forte em diante.

   ───────────── LEGENDA DESTA FASE (além da legenda global) ─────────────
     1 2 3 4   letras I R O N                ! @ % & $  as pedras da lei (zonas em laws)   K  a tábua do Guardião
     blocos: a CAN · b CAN'T · c STONES · d FLOOR · e NO · h THEY · k YES · j IRON
     x y z     poderes FIRE, HAMMER, CLOCK (o bloco volta a encher)   s STAR (invisível)   m poço de palavras do chefe
     u U       esmagador do salão (2×3) e do esgoto (2×2)    p  o chão que se mexe       t  plataforma que cai
     Q         olho de ferro (o facho)       B  morcego                                   D  o ferro derretido
     V         o GUARDIÃO DE FERRO           l  vida                                      X  ferro rachado (o martelo quebra)
   Cada lei: zone = colunas onde ela vale; can = o estado do começo; text = o que a pedra mostra (can true/false). */
LEVELS.fortress = {
  id: 'fortress', world: 1, tag: 'WORLD 1 · FORTRESS', name: 'CAN YOU?', masterWord: 'IRON', music: 'fort', bg: 'fort', barMax: 12, seal: true,
  // 330 colunas × 36 linhas. O chão do portão, do salão e da galeria fica na linha 28; as muralhas, na 13.
  map: [
/*MAP:fortress*/
  ],
  extraWords: ['JUMP', 'FALL', 'MOVE', 'EYES', 'SEE', 'RISE', 'WARDEN', 'FLY', 'NOBODY'],   // as que só aparecem escritas nas pedras
  blocks: {
    'a': { block: 'question', content: { word: 'CAN' } },
    'b': { block: 'question', content: { word: "CAN'T" } },
    'c': { block: 'question', content: { word: 'STONES' } },
    'd': { block: 'question', content: { word: 'FLOOR' } },
    'e': { block: 'question', content: { word: 'NO', ifMissing: true } },
    'h': { block: 'question', content: { word: 'THEY', ifMissing: true } },
    'k': { block: 'question', content: { word: 'YES', ifMissing: true } },
    'j': { block: 'question', content: { word: 'IRON' } },
    'x': { block: 'question', content: { power: 'fire', refill: 6 } },
    'y': { block: 'question', content: { power: 'hammer', refill: 6 } },
    'z': { block: 'question', content: { power: 'clock', refill: 6 } },
    's': { block: 'invisible', content: { power: 'star' }, secret: 'fort-star' },
    'm': { block: 'question', content: { reserve: ['CAN', "CAN'T", 'WE'] } },
  },
  entities: {
    '1': { entity: 'letter', index: 0 }, '2': { entity: 'letter', index: 1 }, '3': { entity: 'letter', index: 2 }, '4': { entity: 'letter', index: 3 },
    '!': { entity: 'pedestal', door: 'law1', look: 'law' },
    '@': { entity: 'pedestal', door: 'law2', look: 'law' },
    '%': { entity: 'pedestal', door: 'law2b', look: 'law' },
    '&': { entity: 'pedestal', door: 'law3', look: 'law' },
    '$': { entity: 'pedestal', door: 'law4', look: 'law' },
    'K': { entity: 'pedestal', door: 'warden', look: 'tablet' },
    'u': { entity: 'crusher', law: 'stones', h: 3, drop: 27, cycle: 2.9, step: 0.16 },
    'U': { entity: 'crusher', h: 2, drop: 33, cycle: 2.6, step: 0.5 },
    'p': { entity: 'slab', law: 'floor', w: 3, to: 111, speed: 110, wait: 0.9 },
    't': { entity: 'crumble', w: 2 },
    'Q': { entity: 'eye', law: 'eyes', fixed: true },
    'B': { entity: 'bat', respawn: 'offscreen' },
    'D': { entity: 'molten', law: 'iron', c0: 187, c1: 218, top: 14, speed: 30, wait: 1.6, from: 188 },
    'V': { entity: 'warden', boss: true },
    'l': { entity: 'life' },
  },
  laws: {
    jump: { zone: [12, 32], can: false, text: { false: "YOU CAN'T JUMP.", true: 'NEXY CAN JUMP.' } },
    stones: { zone: [50, 98], can: true, text: { true: 'THE STONES CAN FALL.', false: "THE STONES CAN'T FALL." } },
    floor: { zone: [99, 115], can: false, text: { false: "THE FLOOR CAN'T MOVE.", true: 'THE FLOOR CAN MOVE.' } },
    eyes: { zone: [123, 185], can: true, text: { true: 'THE EYES CAN SEE.', false: "THE EYES CAN'T SEE." } },
    iron: { zone: [186, 219], can: true, text: { true: 'THE IRON CAN RISE.', false: "THE IRON CAN'T RISE." } },
  },
  zones: [{ c0: 248, c1: 297, boost: true }],
  // por baixo da terra (o esgoto e os buracos que dão nele): o fundo é pedra, não céu
  caves: [[15, 28, 44, 33]],
  hints: [
    { c: 9, r: 21, en: "CAN = PODE · CAN'T = NÃO PODE", pt: 'a pedra diz o que pode e o que não pode aqui. Mude a lei com uma frase', until: 'law1' },
    { c: 21, r: 30, en: 'NO JUMP? WALK', pt: 'outro caminho: sem pulo, o esgoto passa por baixo (espere as pedras subirem)', until: 'law1' },
    { c: 56, r: 21, en: 'THE STONES', pt: 'as pedras caem no ritmo: passe quando sobem, ou mude a lei', until: 'law2' },
    { c: 97, r: 21, en: 'WHO? + CAN?', pt: 'duas lacunas: QUEM (the floor, the stones) e PODE ou NÃO PODE', until: 'law2b' },
    { c: 128, r: 20, en: '? → ANSWER', pt: 'a pedra pergunta: responda curto, como em NO, I AM NOT. Os olhos são muitos: THEY', until: 'law3' },
    { c: 137, r: 15, en: 'HIDE', pt: 'outro caminho: o facho não atravessa os pilares. Espere na sombra', until: 'law3' },
    { c: 191, r: 21, en: 'UP! UP!', pt: 'o ferro sobe: suba rápido, ou mude a lei na pedra do meio', until: 'law4' },
    { c: 250, r: 7, en: 'THE LAW CHANGES', pt: 'a cada rodada o Guardião escreve uma lei nova. Reescreva na tábua; ou jogue nele as bolas de ferro (segure CORRER, ↑ e solte)', until: 'warden' },
  ],
  targets: {
    // a porta da torre de menagem: só afunda quando o Guardião cai
    keepgate: { kind: 'rune', c: 297, r: 12, anchor: 'left', state: 'big', big: { w: 2, h: 6 }, small: { w: 0, h: 0 }, hFirst: true, look: 'portcullis' },
  },
  doors: {
    law1: {
      kind: 'pedestal', look: 'law', law: 'jump', title: 'THE FIRST LAW', inscription: "YOU CAN'T JUMP.", mold: ['I', '_', 'JUMP', '.'], consume: false, reusable: true,
      accept: [{ words: ['CAN'], result: { type: 'law', law: 'jump', can: true } }],
      enact: [{ words: ["CAN'T"], result: { type: 'stone', law: 'jump', tip: { en: "Can't? Then the stone wins!", pt: "CAN'T = não pode. A pedra já diz isso. Diga que você PODE." } } }],
    },
    law2: {
      kind: 'pedestal', look: 'law', law: 'stones', title: 'THE HALL OF STONES', inscription: 'THE STONES CAN FALL.', mold: ['THE', 'STONES', '_', 'FALL', '.'], consume: false, reusable: true,
      accept: [
        { words: ["CAN'T"], result: { type: 'law', law: 'stones', can: false } },
        { words: ['CAN'], result: { type: 'law', law: 'stones', can: true } },
      ],
      enact: [],
    },
    law2b: {
      kind: 'pedestal', look: 'law', law: 'floor', title: 'THE MOVING FLOOR', inscription: "THE FLOOR CAN'T MOVE.", mold: ['THE', '_', '_', 'MOVE', '.'], consume: false, reusable: true,
      accept: [
        { words: ['FLOOR', 'CAN'], result: { type: 'law', law: 'floor', can: true } },
        { words: ['FLOOR', "CAN'T"], result: { type: 'law', law: 'floor', can: false } },
      ],
      enact: [
        { words: ['STONES', '*'], result: { type: 'stone', law: 'floor', tip: { en: 'The stones? Look down: the floor!', pt: 'As pedras ficaram para trás. O que precisa se mexer aqui é o CHÃO: THE FLOOR.' } } },
        { words: ['*', '*'], result: { type: 'stone', law: 'floor', tip: { en: 'What must move? The floor!', pt: 'A frase fala de quem PODE se mexer: THE FLOOR CAN MOVE.' } } },
      ],
    },
    law3: {
      kind: 'pedestal', look: 'law', law: 'eyes', title: 'THE GALLERY OF EYES', inscription: 'CAN THE EYES SEE YOU?', mold: ['_', ',', '_', '_', '.'], consume: false, reusable: true,
      accept: [
        { words: ['NO', 'THEY', "CAN'T"], result: { type: 'law', law: 'eyes', can: false } },
        { words: ['YES', 'THEY', 'CAN'], result: { type: 'law', law: 'eyes', can: true } },
      ],
      enact: [
        { words: ['*', 'IT', '*'], result: { type: 'stone', law: 'eyes', tip: { en: 'The eyes are many. They!', pt: 'Os olhos são muitos: no lugar de THE EYES, use THEY (como em THEY ARE).' } } },
        { words: ['NO', 'THEY', 'CAN'], result: { type: 'stone', law: 'eyes', tip: { en: "No... they can't!", pt: "Resposta curta: NO pede CAN'T. NO, THEY CAN'T." } } },
        { words: ['YES', 'THEY', "CAN'T"], result: { type: 'stone', law: 'eyes', tip: { en: 'Yes... they can!', pt: "YES pede CAN; NO pede CAN'T. Os dois juntos não combinam." } } },
        { words: ['*', '*', '*'], result: { type: 'stone', law: 'eyes', tip: { en: 'Answer short: no, they can not.', pt: "Responda curto, como em NO, I AM NOT: YES ou NO + quem (THEY) + CAN ou CAN'T." } } },
      ],
    },
    law4: {
      kind: 'pedestal', look: 'law', law: 'iron', title: 'THE IRON TOWER', inscription: 'THE IRON CAN RISE.', mold: ['THE', 'IRON', '_', 'RISE', '.'], consume: false, reusable: true,
      accept: [
        { words: ["CAN'T"], result: { type: 'law', law: 'iron', can: false } },
        { words: ['CAN'], result: { type: 'law', law: 'iron', can: true } },
      ],
      enact: [],
    },
    // a tábua do Guardião: a cada rodada ele escreve uma lei nova (Warden.live troca o molde e as respostas na hora);
    // aqui ficam todas, para as vozes serem gravadas
    warden: {
      kind: 'pedestal', look: 'tablet', title: 'THE IRON WARDEN', inscription: 'THE WARDEN CAN FLY.', mold: ['THE', 'WARDEN', '_', 'FLY', '.'], consume: false, reusable: true,
      live: def => Warden.live(def),
      accept: [{ words: ["CAN'T"], result: { type: 'warden', round: 0 } }],
      enact: [],
    },
  },
  // a ordem dos enfeites importa: o que vem antes fica atrás
  decor: [
    // A · o portão (por fora): o letreiro gravado, as bandeiras, as tochas e o rastrilho levantado
    { kind: 'carve', c: 46, r: 8, w: 4, text: 'IRON', sub: 'CAN YOU?' },
    { kind: 'portcullis', c: 46, r: 22, w: 4, h: 6 },
    { kind: 'banner', c: 44, r: 10, h: 6, rune: 'CAN' }, { kind: 'banner', c: 51, r: 10, h: 6, rune: "CAN'T", out: true },
    { kind: 'torch', c: 11, r: 25 }, { kind: 'torch', c: 33, r: 25 }, { kind: 'torch', c: 44, r: 24 },
    { kind: 'grate', c: 16, r: 28, w: 2 }, { kind: 'grate', c: 42, r: 28, w: 2 },
    { kind: 'drip', c: 22, r: 29 }, { kind: 'drip', c: 34, r: 29 },
    // B · o salão: correntes, engrenagens, o canal de ferro aceso no pé da parede
    { kind: 'gear', c: 58, r: 19, s: 2.2 }, { kind: 'gear', c: 77, r: 20, s: 1.4 }, { kind: 'gear', c: 98, r: 18, s: 2.6 },
    { kind: 'chain', c: 66, r: 16, h: 6 }, { kind: 'chain', c: 84, r: 16, h: 4 },
    { kind: 'channel', c: 50, r: 27, w: 50 },
    { kind: 'tag', c: 62, r: 20, w: 2, text: 'STONES' },
    { kind: 'torch', c: 53, r: 21 }, { kind: 'torch', c: 118, r: 22 },
    // C · a galeria: vitrais coloridos com fachos de luz, bandeiras e as etiquetas dos olhos
    { kind: 'window', c: 132, r: 12, w: 4, h: 9, hue: 0 }, { kind: 'window', c: 143, r: 11, w: 4, h: 10, hue: 1 },
    { kind: 'window', c: 154, r: 11, w: 4, h: 7, hue: 2 }, { kind: 'window', c: 170, r: 12, w: 4, h: 9, hue: 3 },
    { kind: 'banner', c: 138, r: 10, h: 5, rune: 'SEE' }, { kind: 'banner', c: 160, r: 10, h: 5, rune: 'SEE' }, { kind: 'banner', c: 182, r: 10, h: 5, rune: 'SEE' },
    { kind: 'tag', c: 146, r: 13, w: 1, text: 'EYES' },
    { kind: 'torch', c: 124, r: 22 }, { kind: 'torch', c: 184, r: 22 },
    // D · a torre: correntes, a fornalha embaixo, a etiqueta do ferro
    { kind: 'chain', c: 197, r: 3, h: 12 }, { kind: 'chain', c: 208, r: 3, h: 7 }, { kind: 'chain', c: 215, r: 3, h: 15 },
    { kind: 'gear', c: 212, r: 26, s: 3 },
    { kind: 'tag', c: 193, r: 31, w: 3, text: 'IRON' },
    // E · as muralhas: ameias, bandeiras ao vento, a tábua e a torre de menagem
    { kind: 'crenel', c: 219, r: 12, w: 111 },
    { kind: 'banner', c: 225, r: 4, h: 6, rune: 'CAN', wind: true }, { kind: 'banner', c: 245, r: 3, h: 7, rune: 'LAW', wind: true },
    { kind: 'torch', c: 249, r: 10 }, { kind: 'torch', c: 295, r: 10 },
    { kind: 'keep', c: 296, r: 1, w: 8 },
    { kind: 'carve', c: 309, r: 8, w: 6, text: 'EXIT', sub: 'THE CASTLE →' },
  ],
};
