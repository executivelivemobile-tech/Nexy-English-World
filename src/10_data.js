<script>
'use strict';
/* =====================================================================================
   NEXY ENGLISH WORLD — WORLD 1-1 · HELLO WORLD
   Um único arquivo: HTML + CSS + JavaScript puro. Tudo desenhado em vetor, todo som sintetizado.

   ───────────── LEGENDA DO MAPA ASCII (LEVELS['1-1'].map) ─────────────
   Cada caractere = 1 tile de 32 px. Linha 0 = topo. O chão padrão fica na linha 20.

   TERRENO
     .   ar (vazio)
     #   pedra sólida (chão, paredes, torres das portas)
     =   plataforma-cápsula flutuante (atravessável por baixo, sólida por cima)
     W   parede falsa (parece pedra, mas é atravessável; esconde uma sala — conta como segredo)
     X   vidro rachado (só o jogador GIGANTE quebra)

   BLOCOS GENÉRICOS
     ?   bloco "?" com 1 orbe
     G   bloco de vidro vazio
     g   bloco de vidro com 3 orbes dentro
     M   bloco-fantasma AM   ┐ só ficam sólidos (vidro) enquanto o jogador carrega a palavra na barra;
     I   bloco-fantasma IS   │ se a palavra for usada numa porta, o degrau volta a ser fantasma.
     R   bloco-fantasma ARE  ┘ A flag palaces.toBe (Palácio do To Be) solidifica todos de uma vez.

   BLOCOS COM CONTEÚDO DA FASE (editáveis em LEVELS['1-1'].blocks)
     h a i f k r d b   bloco "?" com palavra (HELLO, AM, IS, FINE, KEY, ARE, DOOR, BIG)
     c   bloco "?" com cristal
     u   bloco invisível com cristal       (segredo)
     s   bloco invisível com SMALL          (segredo)
     l   bloco de vidro com a 2ª letra L

   PORTAS (preencha o retângulo inteiro com o mesmo dígito; dados em LEVELS['1-1'].doors)
     1 2 3   portas 1, 2 e 3
     V       pedestal da voz (1 tile; dados em doors.pedestal)

   ENTIDADES
     P   início do jogador          F   checkpoint
     o   orbe                       *   lanterna gótica
     H E L O   letras raras (H, E, 1º L, O; o 2º L está no bloco 'l')
     C   Rastejante (CRAWLER)       A   Rastejante de emboscada (acorda a 7 tiles do jogador)
     Y   Rastejante-guarda (patrulha sem cair das beiradas e renasce se morrer). Pisões seguidos = combo:
         cada pisão sem tocar o chão aumenta o quique (CFG.COMBO_BOUNCE) e mostra "1x", "2x"…
     K   Casco (SHELL)              J   Casco-guarda (renasce no início do corredor se a carapaça se perder)
     N   fim normal (portal)        Z   fim secreto (portal com fechadura)
   ===================================================================================== */

/* ============================== CONFIG ============================== */
const CFG = {
  TILE: 32, VIEW_W: 960, VIEW_H: 540, STEP: 1 / 60,
  // movimento horizontal (px/s e px/s²)
  // DOUBLE_TAP_MS: soltou a seta e apertou de novo dentro desse prazo (segurando) = correr até soltar
  DOUBLE_TAP_MS: 280,
  WALK: 140, RUN: 230, ACC: 640, RUN_ACC: 480, FRICTION: 560, SKID: 1400, AIR_CONTROL: 0.7, CROUCH_FRICTION: 380, OVERSPEED_DECEL: 300,
  // pulo: v0 = JUMP_V + JUMP_RUN_BONUS * (|vx| / RUN). Parado ≈ 4 tiles, correndo ≈ 5 tiles.
  JUMP_V: 620, JUMP_RUN_BONUS: 73, SPIN_FACTOR: 0.9,
  G_UP: 1500, G_CUT: 3600, G_DOWN: 2400, MAX_FALL: 700,
  COYOTE: 0.10, BUFFER: 0.12,
  // pisão (quique). Com o pulo segurado o quique é um pulo completo (e um pouco mais).
  BOUNCE: 380, BOUNCE_HELD: 800, SPIN_BOUNCE: 330, SPIN_BOUNCE_HELD: 560, HITSTOP_FRAMES: 3,
  // facilidade do quique alto: apertar o pulo pouco antes (EARLY) ou logo depois (LATE, ainda no ar) do pisão vale como segurar
  BOUNCE_EARLY: 0.15, BOUNCE_LATE: 0.3,
  // combo: cada pisão seguido (sem tocar o chão) aumenta a força do quique. Índice = 1º, 2º, 3º+ pisão.
  COMBO_BOUNCE: [1, 1.38, 1.55],
  PLAYER_W: 22, PLAYER_H: 46, CROUCH_H: 34, INVULN: 1.5,
  SHELL_SPEED: 400, SHELL_THROW_UP: 850, SHELL_GRAVITY: 2000,
  CRAWLER_SPEED: 50, CASCO_SPEED: 45, ENEMY_GRAVITY: 2000,
  MAGNET: 64, WORD_BAR_MAX: 8, START_LIVES: 5, HINT_COST: 10,
  ORBS_PER_LIFE: 100,
};

/* ============================== BRILHO DAS SILHUETAS ==============================
   Um único ajuste para o jogo todo. 1 = contornos originais (mais escuro). Ele multiplica
   contornos, bordas e a luz de recorte atrás de jogador e inimigos, sem clarear o preto das
   massas: o neon-noir continua, só que tudo fica mais legível. bg vale só para o fundo. */
const LOOK = { bright: 2, bg: 1.6, rim: 1.15 };
const lineA = (rgb, a, k) => `rgba(${rgb},${Math.min(1, a * k).toFixed(3)})`;
const wa = a => lineA('255,255,255', a, LOOK.bright);   // branco translúcido (vidro)
const ca = a => lineA('34,211,238', a, LOOK.bright);    // ciano do sistema
const cb = a => lineA('34,211,238', a, LOOK.bg);        // ciano das camadas do fundo

/* ============================== WORD BANK ==============================
   cls: noun | verb | adjective | pronoun | article | interjection
   Forma da cápsula: noun = cheia · verb = cheia com rastro · adjective = só contorno · outras = cheia com ponto */
const WORDS = {
  HELLO: { cls: 'interjection', pt: 'olá', say: 'Hello', lore: 'A primeira palavra abre a primeira porta. Todas as outras vieram depois.' },
  I:     { cls: 'pronoun', pt: 'eu', say: 'I', lore: 'Antes de qualquer frase, alguém precisa dizer que existe.' },
  AM:    { cls: 'verb', pt: 'sou / estou', say: 'am', lore: 'A ponte estreita entre quem você é e o que você sente.' },
  IS:    { cls: 'verb', pt: 'é / está', say: 'is', lore: 'Diz o que as coisas são, mesmo quando elas preferem se esconder.' },
  ARE:   { cls: 'verb', pt: 'são / estão (e é / está com "you")', say: 'are', lore: 'Fala com você e com todos ao mesmo tempo. Ninguém escapa dela.' },
  FINE:  { cls: 'adjective', pt: 'bem', say: 'fine', lore: 'Dita mil vezes por quem não estava bem. Aqui, por uma vez, ela é verdade.' },
  IT:    { cls: 'pronoun', pt: 'isso / ele / ela (para coisas)', say: 'it', lore: 'Para as coisas sem nome. O castelo está cheio delas.' },
  A:     { cls: 'article', pt: 'um / uma', say: 'a', lore: 'A menor palavra do grimório. Nunca anda sozinha.' },
  KEY:   { cls: 'noun', pt: 'chave', say: 'key', lore: 'O que estava fechado agora te obedece.' },
  DOOR:  { cls: 'noun', pt: 'porta', say: 'door', lore: 'Nem toda porta quer ser aberta. Algumas só querem ser nomeadas.' },
  BIG:   { cls: 'adjective', pt: 'grande', say: 'big', lore: 'Diga em voz alta e o mundo terá de abrir espaço para você.' },
  SMALL: { cls: 'adjective', pt: 'pequeno', say: 'small', lore: 'Os caminhos mais secretos são feitos para quem cabe neles.' },
  // 1-2 · WHO ARE YOU?
  NEXY:   { cls: 'noun', pt: 'Nexy (o seu nome)', say: 'Nexy', lore: 'Um nome é a primeira resposta. As portas só abrem para quem sabe o próprio.' },
  YOU:    { cls: 'pronoun', pt: 'você', say: 'you', lore: 'Aponta para quem está na sua frente. Às vezes é a Echo; às vezes é o seu reflexo.' },
  THEY:   { cls: 'pronoun', pt: 'eles / elas', say: 'they', lore: 'Quando são muitos, ninguém é IT. São THEY, e pedem ARE.' },
  WE:     { cls: 'pronoun', pt: 'nós', say: 'we', lore: 'Você e a Echo. Ninguém atravessa a catedral sozinho.' },
  YES:    { cls: 'interjection', pt: 'sim', say: 'yes', lore: 'Cuidado com o sim: a porta acredita em tudo o que você diz.' },
  NO:     { cls: 'interjection', pt: 'não', say: 'no', lore: 'A resposta mais curta. Quase sempre precisa de um NOT logo depois.' },
  NOT:    { cls: 'adverb', pt: 'não (depois do verbo)', say: 'not', lore: 'Vem depois do AM, do IS e do ARE, e vira a frase do avesso.' },
  FRIEND: { cls: 'noun', pt: 'amigo / amiga', say: 'friend', lore: 'Escondida no alto do campanário. Quem a encontra nunca mais sobe sozinho.' },
  // aprendidas no Baú da Memória (1-2), lendo a história do Nexy
  DARK:   { cls: 'adjective', pt: 'escuro', say: 'dark', lore: 'A cidade era assim quando o Nexy chegou. Ainda é, para quem não tem palavras.' },
  LIGHT:  { cls: 'noun', pt: 'luz', say: 'light', lore: 'Cada palavra aprendida acende uma. Junte muitas e a noite vira dia.' },
  AFRAID: { cls: 'adjective', pt: 'com medo', say: 'afraid', lore: 'Dizer que está com medo também é coragem. O Nexy disse, e depois deixou de estar.' },
  STRONG: { cls: 'adjective', pt: 'forte', say: 'strong', lore: 'Não é o tamanho. É tudo o que você já aprendeu, de pé dentro de você.' },
};
const CREATURES = {
  CRAWLER: { pt: 'rastejante', say: 'Crawler', lore: 'Rasteja porque nunca aprendeu a falar.' },
  SHELL:   { pt: 'casco', say: 'Shell', lore: 'Uma casa de vidro escuro. Vazia, ela vira arma.' },
  FLYER:   { pt: 'alado', say: 'Flyer', lore: 'Um Rastejante que um dia ouviu a palavra UP. Sem as asas, volta a rastejar.' },
  THIEF:   { pt: 'ladrão de palavras', say: 'Word thief', lore: 'Não sabe falar, então rouba. Sempre a última palavra que você aprendeu.' },
};
// O ECHO, o companheiro do Nexy: se apresenta na primeira partida e fala nas horas certas (frases A1 com legenda)
const ECHO = {
  pt: 'eco · a sua companheira', say: 'Echo',
  lore: 'Nasceu da primeira palavra que o Nexy ouviu. Fala as palavras em inglês com você, ilumina o escuro e, quando você diz YOU ARE BIG, cresce para te carregar.',
  lines: {
    intro: [{ en: 'Hello! I am Echo.', pt: 'Olá! Eu sou a Echo.' }, { en: 'I am your friend.', pt: 'Sou sua amiga. Eu falo as palavras em inglês para você.' }],
    dark: [{ en: 'It is dark.', pt: 'Está escuro.' }, { en: 'I am your light.', pt: 'Eu sou a sua luz. Fique perto de mim.' }],
    birth: [{ en: 'Hello! I am Echo.', pt: 'Olá! Eu sou a Echo. Nasci do seu primeiro HELLO.' }, { en: 'I am your friend.', pt: 'Sou sua amiga. Eu falo as palavras em inglês para você.' },
      { en: 'Listen! Press C.', pt: 'Aperte C (LB no controle): eu encontro coisas escondidas.' }],
    found: [{ en: 'Something is here!', pt: 'Tem alguma coisa escondida aqui!' }],
    teaser: [{ en: 'Look! The cathedral.', pt: 'Olha! A catedral.' }, { en: 'What is inside?', pt: 'O que será que tem lá dentro?' }],
  },
};
// A LEI DAS PALAVRAS: o prólogo da primeira partida (73_echo.js → Prologue). Quem fala é o narrador (a voz antiga);
// as frases que o mundo obedece saem na voz das portas. A regra só ganha nome DEPOIS que o jogador a usou.
const PROLOGUE = {
  magic: { en: 'In this world, words are magic.', pt: 'Neste mundo, palavras são magia.' },
  floor: { en: 'Words are the floor.', pt: 'Palavras viram chão.' },
  truth: { en: 'What you say is true.', pt: 'O que você diz vira verdade.' },
  turn: { en: 'Your turn.', pt: 'Sua vez: ele está no seu caminho. Escolha a palavra.' },
  bigger: { en: 'It is big.', pt: 'Você disse BIG, e ele ficou ainda maior. O mundo acredita no que você diz.' },
  rule: { en: 'Say it, and it is true.', pt: 'Quer que algo fique pequeno? Diga que ele É pequeno.' },
  law: [
    { en: 'WORDS ARE MAGIC', pt: 'palavras são magia' },
    { en: 'WORDS ARE THE FLOOR', pt: 'palavras viram chão' },
    { en: 'WHAT YOU SAY IS TRUE', pt: 'o que você diz vira verdade' },
  ],
};
const MASTER_WORDS = {
  HELLO: { pt: 'olá', say: 'Hello', lore: 'Cinco letras espalhadas pelo escuro. Juntas, são a primeira coisa que o mundo responde.' },
  WORLD: { pt: 'mundo', say: 'World', lore: 'Depois do olá, o mundo inteiro. A catedral guardava cada letra num lugar mais alto.' },
};
const PHRASES_PT = {
  'HELLO!': 'Olá!', 'HOW ARE YOU?': 'Como você está?', 'WHAT IS THIS?': 'O que é isso?',
  'ARE YOU BIG OR SMALL?': 'Você é grande ou pequeno?',
  'WHO ARE YOU?': 'Quem é você?', 'WHAT IS BIG?': 'O que é grande?', 'ARE YOU A CRAWLER?': 'Você é um rastejante?',
  'BIG OR SMALL?': 'Grande ou pequeno?', 'IS IT A DOOR?': 'Isso é uma porta?', 'WHO IS BIG?': 'Quem é grande?',
};

/* ============================== LEGENDA GLOBAL ============================== */
const LEGEND = {
  '.': null,
  '#': { tile: 'solid' },
  '=': { tile: 'platform' },
  'W': { tile: 'fake' },
  'X': { tile: 'cracked' },
  '?': { block: 'question', content: { orbs: 1 } },
  'G': { block: 'glass', content: null },
  'g': { block: 'glass', content: { orbs: 3 } },
  'M': { block: 'ghost', word: 'AM', flag: 'palaces.toBe' },
  'I': { block: 'ghost', word: 'IS', flag: 'palaces.toBe' },
  'R': { block: 'ghost', word: 'ARE', flag: 'palaces.toBe' },
  'o': { entity: 'orb' },
  '*': { entity: 'lantern' },
  'C': { entity: 'crawler' },
  'A': { entity: 'crawler', wake: 7 },
  'Y': { entity: 'crawler', patrol: true, respawn: 'summon' },
  'K': { entity: 'casco' },
  'J': { entity: 'casco', respawn: 'offscreen' },
  'H': { entity: 'letter', index: 0 },
  'E': { entity: 'letter', index: 1 },
  'L': { entity: 'letter', index: 2 },
  'O': { entity: 'letter', index: 4 },
  'P': { entity: 'start' },
  'F': { entity: 'checkpoint' },
  'N': { entity: 'goal', exit: 'normal' },
  'Z': { entity: 'goal', exit: 'secret' },
};

/* ============================== FASES ============================== */
const LEVELS = {
  '1-1': {
    id: '1-1', world: 1, name: 'HELLO WORLD', masterWord: 'HELLO',
    // O mapa: 208 colunas × 23 linhas. Edite à vontade seguindo a legenda acima.
    map: [
/*MAP:1-1*/
    ],
    // Conteúdo dos blocos desta fase (caractere do mapa → bloco e conteúdo).
    // content: { word } | { crystal: true } | { orbs: n } | { letter: índice 0-4 }. rise = quantos tiles a cápsula sobe ao sair.
    blocks: {
      'h': { block: 'question', content: { word: 'HELLO' } },
      'a': { block: 'question', content: { word: 'AM' } },
      'i': { block: 'question', content: { word: 'IS' } },
      'f': { block: 'question', content: { word: 'FINE' } },
      'k': { block: 'question', content: { word: 'KEY', rise: 3.7 } },
      'r': { block: 'question', content: { word: 'ARE' } },
      'd': { block: 'question', content: { word: 'DOOR' } },
      'b': { block: 'question', content: { word: 'BIG' } },
      'c': { block: 'question', content: { crystal: true } },
      'u': { block: 'invisible', content: { crystal: true }, secret: 'invisible-crystal' },
      's': { block: 'invisible', content: { word: 'SMALL' }, secret: 'invisible-small' },
      'l': { block: 'glass', content: { letter: 3 } },
      'v': { block: 'invisible', content: { life: 1 }, secret: 'echo-secret' },   // o 1º segredo que o pulso do Echo revela
    },
    // Placas de dica: aparecem quando o Nexy chega perto e somem depois que a ação foi feita (until).
    hints: [
      { c: 7, r: 17, en: '← → MOVE · Z JUMP', pt: 'ande com as setas e pule com Z', until: 'jump' },
      { c: 16, r: 14, en: 'HIT THE ? FROM BELOW', pt: 'bata no bloco ? por baixo: ele solta uma palavra', until: 'word' },
      { c: 32, r: 15, en: '↑ OPEN · MAKE THE SENTENCE', pt: 'aperte ↑ na porta e monte a frase com as palavras', until: 'door1' },
      // a lei do prólogo de volta, na hora em que ela vale: as palavras da barra viram degraus
      { c: 62, r: 14, en: 'WORDS ARE THE FLOOR', pt: 'com AM, IS e ARE na barra, os degraus-fantasma viram chão', until: 'ghost' },
    ],
    // Entidades com parâmetros extras por caractere (sobrepõem a legenda global).
    entities: {
      'J': { entity: 'casco', respawn: 'offscreen', zone: [103, 124] },
      'V': { entity: 'pedestal', door: 'pedestal' },
    },
    // Portas: a frase-molde usa '_' para as lacunas. accept = frases certas (cada uma com seu resultado).
    // enact = frases "erradas" que a porta encena. Resultados: open | transform(scale) | exit(id) | morph(icon).
    doors: {
      // a primeira palavra: ao dizer HELLO!, ela ecoa e nasce o Echo (a primeira ferramenta). Depois a porta abre.
      door1: {
        char: '1', inscription: 'HELLO!', mold: ['_', '!'], birth: 'echo',
        accept: [{ words: ['HELLO'], result: { type: 'open' } }],
      },
      door2: {
        char: '2', inscription: 'HOW ARE YOU?', mold: ['I', '_', '_', '.'],
        accept: [{ words: ['AM', 'FINE'], result: { type: 'open' } }],
      },
      door3: {
        char: '3', inscription: 'WHAT IS THIS?', mold: ['IT', '_', 'A', '_', '.'], icon: 'key',
        accept: [{ words: ['IS', 'KEY'], result: { type: 'open' } }],
        enact: [{ words: ['IS', 'DOOR'], result: { type: 'morph', to: 'door', duration: 1 } }],
      },
      pedestal: {
        kind: 'pedestal', inscription: 'ARE YOU BIG OR SMALL?', mold: ['I', '_', '_', '.'], consume: false, reusable: true,
        accept: [
          { words: ['AM', 'BIG'], result: { type: 'transform', scale: 2 } },
          { words: ['AM', 'SMALL'], result: { type: 'transform', scale: 0.5 } },
        ],
      },
    },
  },
};

/* ============================== MUNDOS (mapa-múndi) ==============================
   Nós em coordenadas de tela (960×540). Cada caminho abre com uma saída (exit) da fase de origem.
   level = fase jogável; fases sem dados em LEVELS aparecem como "SOON". 'mini' é o mapa pequeno da tela de fim. */
const WORLDS = {
  1: {
    name: 'HELLO WORLD',
    nodes: [
      { id: '1-1', label: '1-1', name: 'HELLO WORLD', x: 150, y: 370, icon: 'gate' },
      { id: '1-2', label: '1-2', name: 'WHO ARE YOU?', x: 360, y: 300, icon: 'nave' },
      { id: 'palace', label: 'TO BE', name: 'TO BE PALACE', x: 250, y: 455, icon: 'palace' },
      { id: '1-3', label: '1-3', name: '???', x: 560, y: 340, icon: 'tower' },
      { id: 'ghost', label: 'PUSH?', name: 'PUSH OR PULL?', x: 470, y: 180, icon: 'ghost' },
      { id: 'fortress', label: 'FORT', name: 'FORTRESS', x: 700, y: 250, icon: 'fortress' },
      { id: 'castle', label: 'CASTLE', name: 'THE CASTLE', x: 840, y: 150, icon: 'castle' },
    ],
    // pts = pontos intermediários do caminho (curvas); unlock = [fase, saída]
    edges: [
      { a: '1-1', b: '1-2', unlock: ['1-1', 'normal'], pts: [[230, 360], [290, 320]] },
      { a: '1-1', b: 'palace', unlock: ['1-1', 'secret'], pts: [[180, 430]] },
      { a: '1-2', b: '1-3', unlock: ['1-2', 'normal'], pts: [[450, 300], [500, 340]] },
      { a: '1-2', b: 'ghost', unlock: ['1-2', 'secret'], pts: [[390, 220], [430, 190]] },
      { a: '1-3', b: 'fortress', unlock: ['1-3', 'normal'], pts: [[630, 310]] },
      { a: 'fortress', b: 'castle', unlock: ['fortress', 'normal'], pts: [[780, 220]] },
    ],
    mini: {
      nodes: [
        { id: '1-1', label: '1-1', x: 50, y: 46 }, { id: '1-2', label: '1-2', x: 160, y: 46 }, { id: '1-3', label: '1-3', x: 270, y: 46 },
        { id: 'palace', label: 'TO BE PALACE', x: 160, y: 80, w: 112 }, { id: 'ghost', label: 'PUSH OR PULL?', x: 286, y: 80, w: 112 },
        { id: 'fortress', label: 'FORTRESS', x: 390, y: 46, w: 92 }, { id: 'castle', label: 'CASTLE', x: 505, y: 46, w: 80 },
      ],
      paths: [
        { from: '1-1', to: '1-2', exit: 'normal' }, { from: '1-1', to: 'palace', exit: 'secret' },
        { from: '1-2', to: '1-3', exit: 'normal' }, { from: '1-2', to: 'ghost', exit: 'secret' },
        { from: '1-3', to: 'fortress', exit: 'normal' }, { from: 'fortress', to: 'castle', exit: 'normal' },
      ],
    },
  },
};

/* ============================== O CORAÇÃO DAS PALAVRAS (a ferramenta do Nexy) ==============================
   Nasce na 1-2 (Baú da Memória). Cada degrau vencido na escalada de perguntas acima do A1 sobe o Coração de nível:
   ele muda de cor e o poder cresce. O melhor nível fica salvo e aparece no mapa. Cada fase nova deve acrescentar
   algo a ele (um poder, um detalhe visual), sempre com desafio crescente. Cores dentro da paleta neon-noir. */
const HEART = [
  { name: 'CYAN HEART', pt: 'Coração Ciano', reward: 'O Nexy fica gigante e quebra o muro.' },
  { name: 'MAGENTA HEART', pt: 'Coração Magenta', reward: '+ escudo de cristal depois de voltar ao tamanho normal.' },
  { name: 'WHITE HEART', pt: 'Coração Incandescente', reward: '+ 1 vida.' },
  { name: 'PRISM HEART', pt: 'Coração Prisma', reward: '+ 30 orbes.' },
  { name: 'CROWN OF WORDS', pt: 'Coroa das Palavras', reward: '+ mais 1 vida. Poder máximo.' },
];

/* ============================== SAVE / FLAGS ==============================
   Tudo dentro de try/catch: sem localStorage o jogo funciona normalmente. */
const Save = {
  KEY: 'nexy-english-world.v1',
  data: null,
  defaults() {
    return {
      grimoire: { words: {}, creatures: {}, master: {} },
      exits: {}, bestFluency: {}, letters: {}, cleared: {}, heart: { best: -1, by: {} }, met: {},
      map: { at: '1-1', revealed: {} },
      flags: { palaces: { toBe: false } },
      assist: { slow: false, safeFall: false, freeHints: false, subtitles: false, voice: false },
      muted: false, voiceURI: null,
    };
  },
  load() {
    const d = this.defaults();
    try {
      const raw = window.localStorage.getItem(this.KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && typeof s === 'object') {
          Object.assign(d.grimoire.words, s.grimoire && s.grimoire.words);
          Object.assign(d.grimoire.creatures, s.grimoire && s.grimoire.creatures);
          Object.assign(d.grimoire.master, s.grimoire && s.grimoire.master);
          Object.assign(d.exits, s.exits); Object.assign(d.bestFluency, s.bestFluency);
          Object.assign(d.letters, s.letters); Object.assign(d.cleared, s.cleared);
          Object.assign(d.met, s.met);
          if (s.heart) { d.heart.best = s.heart.best != null ? s.heart.best : -1; Object.assign(d.heart.by, s.heart.by); }
          if (s.map) { if (s.map.at) d.map.at = s.map.at; Object.assign(d.map.revealed, s.map.revealed); }
          // saves da versão só com a 1-1: quem já saiu da 1-1 já tem os caminhos abertos
          for (const id in d.exits) if (d.exits[id].normal || d.exits[id].secret) d.cleared[id] = true;
          if (s.flags && s.flags.palaces) Object.assign(d.flags.palaces, s.flags.palaces);
          Object.assign(d.assist, s.assist);
          d.muted = !!s.muted; d.voiceURI = s.voiceURI || null;
        }
      }
    } catch (e) { /* sem armazenamento: segue com os padrões */ }
    this.data = d;
    return d;
  },
  write() { try { window.localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ignora */ } },
};

// Flags globais de progresso. Para testar: ?toBe=1 na URL, #tobe no endereço, ou NEXY.setFlag('palaces.toBe', true) no console.
const Flags = {
  overrides: {},
  get(path) {
    if (path in this.overrides) return this.overrides[path];
    let o = Save.data.flags;
    for (const k of path.split('.')) { if (o == null) return false; o = o[k]; }
    return !!o;
  },
  set(path, value, persist) {
    if (!persist) { this.overrides[path] = !!value; return; }
    const keys = path.split('.'); let o = Save.data.flags;
    for (let i = 0; i < keys.length - 1; i++) { o[keys[i]] = o[keys[i]] || {}; o = o[keys[i]]; }
    o[keys[keys.length - 1]] = !!value; delete this.overrides[path]; Save.write();
  },
  readURL() {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('toBe') === '1' || (q.get('flags') || '').split(',').includes('palaces.toBe')) this.overrides['palaces.toBe'] = true;
      if (/(^|[#,])tobe($|,)/i.test(window.location.hash)) this.overrides['palaces.toBe'] = true;
    } catch (e) { /* ignora */ }
  },
};

/* ============================== UTIL ============================== */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, target, step) => v < target ? Math.min(v + step, target) : Math.max(v - step, target);
const sign = v => v > 0 ? 1 : v < 0 ? -1 : 0;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const fmtTime = s => { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const normalizeSentence = s => String(s).toLowerCase()
  .replace(/\bi'm\b/g, 'i am').replace(/\bit's\b/g, 'it is').replace(/\bwhat's\b/g, 'what is')
  .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
const $ = id => document.getElementById(id);
