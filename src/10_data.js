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
};
const CREATURES = {
  CRAWLER: { pt: 'rastejante', say: 'Crawler', lore: 'Rasteja porque nunca aprendeu a falar.' },
  SHELL:   { pt: 'casco', say: 'Shell', lore: 'Uma casa de vidro escuro. Vazia, ela vira arma.' },
};
const MASTER_WORDS = {
  HELLO: { pt: 'olá', lore: 'Cinco letras espalhadas pelo escuro. Juntas, são a primeira coisa que o mundo responde.' },
};
const PHRASES_PT = {
  'HELLO!': 'Olá!', 'HOW ARE YOU?': 'Como você está?', 'WHAT IS THIS?': 'O que é isso?',
  'ARE YOU BIG OR SMALL?': 'Você é grande ou pequeno?',
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
    },
    // Entidades com parâmetros extras por caractere (sobrepõem a legenda global).
    entities: {
      'J': { entity: 'casco', respawn: 'offscreen', zone: [103, 124] },
      'V': { entity: 'pedestal', door: 'pedestal' },
    },
    // Portas: a frase-molde usa '_' para as lacunas. accept = frases certas (cada uma com seu resultado).
    // enact = frases "erradas" que a porta encena. Resultados: open | transform(scale) | exit(id) | morph(icon).
    doors: {
      door1: {
        char: '1', inscription: 'HELLO!', mold: ['_', '!'],
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
    // Mini-mapa do Mundo 1 (nós futuros aparecem apagados).
    worldMap: {
      nodes: [
        { id: '1-1', label: '1-1', x: 50, y: 46 }, { id: '1-2', label: '1-2', x: 160, y: 46 }, { id: '1-3', label: '1-3', x: 270, y: 46 },
        { id: 'palace', label: 'TO BE PALACE', x: 160, y: 80, w: 112 }, { id: 'fortress', label: 'FORTRESS', x: 390, y: 46, w: 92 },
        { id: 'castle', label: 'CASTLE', x: 505, y: 46, w: 80 },
      ],
      paths: [
        { from: '1-1', to: '1-2', exit: 'normal' }, { from: '1-1', to: 'palace', exit: 'secret' },
        { from: '1-2', to: '1-3' }, { from: '1-3', to: 'fortress' }, { from: 'fortress', to: 'castle' },
      ],
    },
  },
};

/* ============================== SAVE / FLAGS ==============================
   Tudo dentro de try/catch: sem localStorage o jogo funciona normalmente. */
const Save = {
  KEY: 'nexy-english-world.v1',
  data: null,
  defaults() {
    return {
      grimoire: { words: {}, creatures: {}, master: {} },
      exits: {}, bestFluency: {},
      flags: { palaces: { toBe: false } },
      assist: { slow: false, safeFall: false, freeHints: false, subtitles: false, voice: false },
      muted: false,
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
          if (s.flags && s.flags.palaces) Object.assign(d.flags.palaces, s.flags.palaces);
          Object.assign(d.assist, s.assist);
          d.muted = !!s.muted;
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
