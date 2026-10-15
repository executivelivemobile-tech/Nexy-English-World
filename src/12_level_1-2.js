
/* ============================== FASE 1-2 · WHO ARE YOU? (A Nave dos Ecos) ==============================
   O Nexy entra na catedral: nave, cripta e campanário, terminando no telhado. Palavra-mestra: WORLD.
   Mecânica nova: o PRONOME decide quem a frase atinge (I → o Nexy, IT → a runa, THEY → o grupo, YOU → o Echo).

   ───────────── LEGENDA EXTRA DESTA FASE (além da legenda global da 1-1) ─────────────
     w O % L D   letras W O R L D            T V ^   altares (1, 2 e 3)          1 2 3   portas
     4           portão dos sinos            5 6 7 8 sinos I, ARE, AM, FINE
     Q q ( )     lustres (plataformas em pêndulo)       | ! : ; "   tubos do órgão (sobem na batida)
     B U H       Alados (ponte, patrulha, sobe-e-desce) S           Ladrão de Palavras
     &           Rastejante gigante          +  vida (1UP)     $  a Lua (3UP)     ~  grande sino
     blocos: t IT · b BIG · n NEXY · y YOU · e/h YES · k NO · j NOT · a THEY · r ARE · i IS · s SMALL
             u WE · f FRIEND (invisível) · l vida · c cristal · z cristal invisível
   As runas (pedras que crescem e encolhem) não aparecem no mapa: ficam em targets, por coluna/linha de base. */
LEVELS['1-2'] = {
  id: '1-2', world: 1, name: 'WHO ARE YOU?', masterWord: 'WORLD', music: 'nave', bg: 'nave',
  // mais vocabulário, barra maior: cabem 10 palavras
  barMax: 10, intro: 'YOUR WORD BAR GREW · 10 WORDS',
  // 312 colunas × 40 linhas. Chão da nave na linha 30; a cripta fica por baixo (linhas 32-35); o telhado na linha 9.
  map: [
/*MAP:1-2*/
  ],
  // no alto do campanário a catedral se abre para o céu (a partir desta coluna, com a câmera acima de y)
  sky: { c: 246, y: 420 },
  zones: [
    { c0: 206, c1: 247, r0: 31, r1: 39, dark: 0.92, muffle: true },   // cripta: escura e abafada
    { c0: 250, c1: 311, boost: true },                                 // campanário: percussão em crescendo
  ],
  blocks: {
    't': { block: 'question', content: { word: 'IT' } },
    'b': { block: 'question', content: { word: 'BIG' } },
    'n': { block: 'question', content: { word: 'NEXY' } },
    'y': { block: 'question', content: { word: 'YOU' } },
    'e': { block: 'question', content: { word: 'YES' } },
    'h': { block: 'question', content: { word: 'YES', ifMissing: true } },   // reserva: só se você não tiver um YES
    'k': { block: 'question', content: { word: 'NO' } },
    'j': { block: 'question', content: { word: 'NOT' } },
    'a': { block: 'question', content: { word: 'THEY' } },
    'r': { block: 'question', content: { word: 'ARE' } },
    'i': { block: 'question', content: { word: 'IS' } },
    's': { block: 'question', content: { word: 'SMALL' } },
    'u': { block: 'question', content: { word: 'WE' } },
    'f': { block: 'invisible', content: { word: 'FRIEND' }, secret: 'invisible-friend' },
    'l': { block: 'question', content: { life: 1 } },
    'c': { block: 'question', content: { crystal: true } },
    'z': { block: 'invisible', content: { crystal: true }, secret: 'invisible-crystal' },
  },
  entities: {
    'w': { entity: 'letter', index: 0 }, 'O': { entity: 'letter', index: 1 }, '%': { entity: 'letter', index: 2 },
    'L': { entity: 'letter', index: 3 }, 'D': { entity: 'letter', index: 4 },
    'T': { entity: 'pedestal', door: 'altar1', look: 'altar' },
    'V': { entity: 'pedestal', door: 'altar2', look: 'altar' },
    '^': { entity: 'pedestal', door: 'altar3', look: 'altar' },
    'Q': { entity: 'chandelier', len: 9, amp: 0.36, period: 3.6, phase: 0 },
    'q': { entity: 'chandelier', len: 9, amp: 0.36, period: 3.6, phase: 0.5 },
    '(': { entity: 'chandelier', len: 7, amp: 0.42, period: 3.2, phase: 0 },
    ')': { entity: 'chandelier', len: 8, amp: 0.4, period: 3.8, phase: 0.25 },
    '|': { entity: 'pipe', rise: 6, beats: 4, phase: 0 },
    '!': { entity: 'pipe', rise: 6, beats: 4, phase: 0.5 },
    ':': { entity: 'pipe', rise: 6, beats: 4, phase: 0 },
    ';': { entity: 'pipe', rise: 6, beats: 4, phase: 0.33 },
    '"': { entity: 'pipe', rise: 6, beats: 4, phase: 0.66 },
    'B': { entity: 'flyer', path: 'v', amp: 0.35, period: 2, respawn: 'summon' },
    'U': { entity: 'flyer', path: 'h', amp: 3, period: 3.2, respawn: 'summon' },
    'H': { entity: 'flyer', path: 'v', amp: 1.2, period: 2.4, respawn: 'summon' },
    'S': { entity: 'thief', hole: 205, respawn: 'summon' },
    '&': { entity: 'giant' },
    '5': { entity: 'bell', word: 'I', gate: 'gate', tone: 0 },
    '6': { entity: 'bell', word: 'ARE', gate: 'gate', tone: 4 },
    '7': { entity: 'bell', word: 'AM', gate: 'gate', tone: 1 },
    '8': { entity: 'bell', word: 'FINE', gate: 'gate', tone: 2 },
    '+': { entity: 'life' }, '$': { entity: 'moon' }, '~': { entity: 'bigbell' },
  },
  // alvos das frases. rune: c/r = coluna e linha de base; anchor = de onde cresce; small/big = tamanho em tiles
  targets: {
    rune1: { kind: 'rune', c: 24, r: 29, anchor: 'left', small: { w: 1, h: 1 }, big: { w: 2, h: 3 }, state: 'small' },
    rune2: { kind: 'rune', c: 231, r: 35, anchor: 'center', small: { w: 1, h: 1 }, big: { w: 3, h: 4 }, state: 'big' },
    rune3: { kind: 'rune', c: 280, r: 9, anchor: 'left', small: { w: 1, h: 1 }, big: { w: 8, h: 1 }, state: 'small' },
    giants: { kind: 'giants' },
  },
  doors: {
    door1: {
      char: '1', inscription: 'WHO ARE YOU?', mold: ['I', 'AM', '_', '.'],
      accept: [{ words: ['NEXY'], result: { type: 'open' } }],
      enact: [{ words: ['YOU'], result: { type: 'mirror' } }],
    },
    door2: {
      char: '2', inscription: 'ARE YOU A CRAWLER?', mold: ['_', ',', 'I', 'AM', '_', '.'],
      accept: [{ words: ['NO', 'NOT'], result: { type: 'open' } }],
      // a porta acredita no "sim": o Nexy vira Rastejante por alguns segundos
      enact: [{ words: ['YES', '*'], result: { type: 'crawler', duration: 3.5 }, say: 'Yes, I am a crawler!' }],
    },
    gate: {
      char: '4', kind: 'bells', inscription: 'HOW ARE YOU?', mold: ['_', '_', '_', '.'],
      accept: [{ words: ['I', 'AM', 'FINE'], result: { type: 'open' } }],
      reward: [167, 14],   // de primeira: uma vida cai do grande sino
    },
    door3: {
      char: '3', inscription: 'IS IT A DOOR?', mold: ['_', ',', 'IT', 'IS', '.'],
      accept: [{ words: ['YES'], result: { type: 'open' } }],
    },
    altar1: {
      kind: 'pedestal', title: 'ALTAR OF THE RUNES', inscription: 'WHAT IS BIG?', mold: ['_', 'IS', '_', '.'], consume: false, reusable: true,
      accept: [
        { words: ['IT', 'BIG'], result: { type: 'target', target: 'rune1', act: 'big' } },
        { words: ['IT', 'SMALL'], result: { type: 'target', target: 'rune1', act: 'small' } },
      ],
      enact: [
        { words: ['YOU', '*'], result: { type: 'confused', target: 'echo' } },
        { words: ['IT', '*'], result: { type: 'confused', target: 'rune1' } },
      ],
    },
    altar2: {
      kind: 'pedestal', title: 'ALTAR OF THE RUNES', inscription: 'BIG OR SMALL?', mold: ['_', '_', '_', '.'], consume: false, reusable: true,
      accept: [
        { words: ['THEY', 'ARE', 'SMALL'], result: { type: 'target', target: 'giants', act: 'small' } },
        { words: ['IT', 'IS', 'SMALL'], result: { type: 'target', target: 'rune2', act: 'small' } },
        { words: ['THEY', 'ARE', 'BIG'], result: { type: 'target', target: 'giants', act: 'big' } },
        { words: ['IT', 'IS', 'BIG'], result: { type: 'target', target: 'rune2', act: 'big' } },
        { words: ['YOU', 'ARE', 'BIG'], result: { type: 'echo', act: 'big' } },
        { words: ['YOU', 'ARE', 'SMALL'], result: { type: 'echo', act: 'small' } },
        { words: ['WE', 'ARE', 'BIG'], result: { type: 'we', act: 'big' } },
        { words: ['WE', 'ARE', 'SMALL'], result: { type: 'we', act: 'small' } },
      ],
      // concordância errada: o alvo treme, confuso, e nada acontece
      enact: [
        { words: ['IT', '*', '*'], result: { type: 'confused', target: 'rune2' } },
        { words: ['THEY', '*', '*'], result: { type: 'confused', target: 'giants' } },
        { words: ['YOU', '*', '*'], result: { type: 'confused', target: 'echo' } },
        { words: ['WE', '*', '*'], result: { type: 'confused', target: 'echo' } },
      ],
    },
    altar3: {
      kind: 'pedestal', title: 'ALTAR OF THE RUNES', inscription: 'WHO IS BIG?', mold: ['_', '_', 'BIG', '.'], consume: false, reusable: true,
      // YOU ARE BIG: o Echo cresce, espera ao lado do altar e leva o Nexy pelo céu até o fim secreto
      ride: { board: [257, 8], path: [[258, 3], [299, 3], [306, 7]] },
      accept: [
        { words: ['IT', 'IS'], result: { type: 'target', target: 'rune3', act: 'big' } },
        { words: ['YOU', 'ARE'], result: { type: 'echo', act: 'big' } },
        { words: ['WE', 'ARE'], result: { type: 'we', act: 'big' } },
      ],
      enact: [
        { words: ['IT', '*'], result: { type: 'confused', target: 'rune3' } },
        { words: ['YOU', '*'], result: { type: 'confused', target: 'echo' } },
        { words: ['THEY', '*'], result: { type: 'confused', target: 'echo' } },
      ],
    },
  },
};
