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
  GLIDE_FALL: 60,   // com as WINGS, segurando o pulo, a queda fica lenta (px/s)
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
   cls: noun | verb | adjective | pronoun | article | interjection | adverb | preposition
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
  // aprendidas no Baú da Memória (1-2), lendo a história da Nexy
  DARK:   { cls: 'adjective', pt: 'escuro', say: 'dark', lore: 'A cidade era assim quando a Nexy chegou. Ainda é, para quem não tem palavras.' },
  LIGHT:  { cls: 'noun', pt: 'luz', say: 'light', lore: 'Cada palavra aprendida acende uma. Junte muitas e a noite vira dia.' },
  AFRAID: { cls: 'adjective', pt: 'com medo', say: 'afraid', lore: 'Dizer que está com medo também é coragem. A Nexy disse, e depois deixou de estar.' },
  STRONG: { cls: 'adjective', pt: 'forte', say: 'strong', lore: 'Não é o tamanho. É tudo o que você já aprendeu, de pé dentro de você.' },
  // aprendidas na TO BE ENGINE (o segredo da 1-1): HE é a Nexy, SHE é a Echo
  HE:     { cls: 'pronoun', pt: 'ele (a voz antiga das portas)', say: 'he', lore: 'Para um homem ou um menino, sem dizer o nome. A voz antiga que fala nas portas é HE. HE pede IS.' },
  SHE:    { cls: 'pronoun', pt: 'ela (a Nexy, a Echo)', say: 'she', lore: 'A Nexy e a Echo, quando alguém fala delas sem dizer o nome. SHE pede IS, como HE e IT.' },
  CARD:   { cls: 'noun', pt: 'cartão', say: 'card', lore: 'Caiu de dentro de uma parede que parecia defeito. Liga a máquina do TO BE.' },
  // TO BE PALACE: o passado do verbo TO BE
  WAS:       { cls: 'verb', pt: 'era / estava (passado de AM e IS)', say: 'was', lore: 'O IS de ontem. Diga o que algo ERA e o palácio lembra.' },
  WERE:      { cls: 'verb', pt: 'eram / estavam (passado de ARE)', say: 'were', lore: 'O ARE de ontem: para YOU, WE e THEY. Os cavaleiros respondem a ela.' },
  BRIDGE:    { cls: 'noun', pt: 'ponte', say: 'bridge', lore: 'Caiu há muito tempo. Basta alguém lembrar que ela existia.' },
  YESTERDAY: { cls: 'adverb', pt: 'ontem', say: 'yesterday', lore: 'Quando ela aparece, o verbo volta no tempo: IS vira WAS, ARE vira WERE.' },
  TODAY:     { cls: 'adverb', pt: 'hoje', say: 'today', lore: 'Agora. O verbo fica no presente: AM, IS, ARE.' },
  // 1-3 · WHERE IS IT? (as preposições de lugar: a caixa vai para onde você disser)
  BOX:     { cls: 'noun', pt: 'caixa', say: 'box', lore: 'Uma caixa de neon que obedece a quem sabe dizer onde ela está.' },
  ON:      { cls: 'preposition', pt: 'em cima de', say: 'on', lore: 'A caixa ON THE SIGN está apoiada em cima da placa.' },
  UNDER:   { cls: 'preposition', pt: 'embaixo de', say: 'under', lore: 'O contrário de ON. Embaixo da placa sobra lugar para um degrau.' },
  IN:      { cls: 'preposition', pt: 'dentro de', say: 'in', lore: 'Dentro. Uma caixa IN THE HOLE tapa o buraco e vira chão.' },
  BEHIND:  { cls: 'preposition', pt: 'atrás de', say: 'behind', lore: 'O que está atrás some da vista. Só o pulso da Echo enxerga.' },
  WALL:    { cls: 'noun', pt: 'muro / parede', say: 'wall', lore: 'Alto demais para pular. Mas uma parede tem um ON e um BEHIND.' },
  SIGN:    { cls: 'noun', pt: 'placa / letreiro', say: 'sign', lore: 'A cidade fala com placas de neon. Algumas aguentam o seu peso.' },
  HOLE:    { cls: 'noun', pt: 'buraco', say: 'hole', lore: 'Lá embaixo fica a rua. Um buraco só deixa de ser perigo quando algo fica IN THE HOLE.' },
  BETWEEN: { cls: 'preposition', pt: 'entre', say: 'between', lore: 'No meio de duas coisas. No mapa da cidade, a torre fica entre a estação e a ponte.' },
  'IN FRONT OF': { cls: 'preposition', pt: 'na frente de', say: 'in front of', lore: 'Entre você e a coisa. A caixa IN FRONT OF THE LASER leva o tiro no seu lugar.' },
  'NEXT TO': { cls: 'preposition', pt: 'ao lado de', say: 'next to', lore: 'Bem do lado, encostado em UMA coisa. Entre DUAS coisas já é BETWEEN.' },
  LASER:   { cls: 'noun', pt: 'laser', say: 'laser', lore: 'Luz que corta. Na mão da Nexy é arma; no beco, é uma parede que queima.' },
  WINGS:   { cls: 'noun', pt: 'asas', say: 'wings', lore: 'Sozinhas não sobem: para isso existe o vento. Mas, com elas, ninguém cai depressa.' },
  STAR:    { cls: 'noun', pt: 'estrela', say: 'star', lore: 'Escondida no beco dos lasers. Por alguns segundos, nada te machuca.' },
  SHIELD:  { cls: 'noun', pt: 'escudo', say: 'shield', lore: 'O Sentinela esconde o núcleo perto do escudo: embaixo, atrás ou do lado.' },
  CORE:    { cls: 'noun', pt: 'núcleo', say: 'core', lore: 'O coração da máquina. Diga onde ele está, e a Echo o encontra.' },
  // O FORTE · CAN YOU? (CAN e CAN'T: o que pode e o que não pode; COULD, o CAN de ontem)
  CAN:     { cls: 'verb', pt: 'pode / consegue', say: 'can', lore: 'Não muda com a pessoa: I can, she can, they can. No forte, quem diz CAN muda a lei.' },
  "CAN'T": { cls: 'verb', pt: 'não pode / não consegue', say: "can't", lore: 'O CAN do avesso (CAN NOT). As pedras do forte adoram essa palavra.' },
  JUMP:    { cls: 'verb', pt: 'pular', say: 'jump', lore: 'A primeira coisa que a lei do forte tirou da Nexy. A primeira que ela pegou de volta.' },
  FALL:    { cls: 'verb', pt: 'cair', say: 'fall', lore: 'As pedras do salão caem no ritmo dos tambores, até alguém dizer que elas não podem.' },
  MOVE:    { cls: 'verb', pt: 'mexer / mover', say: 'move', lore: 'Um chão parado vira ponte quando PODE se mexer.' },
  STONES:  { cls: 'noun', pt: 'pedras', say: 'stones', lore: 'São muitas: THE STONES. Mas o CAN não muda: THE STONES CAN, THE STONE CAN.' },
  FLOOR:   { cls: 'noun', pt: 'chão', say: 'floor', lore: 'Um pedaço de chão esperando licença para atravessar o poço.' },
  EYES:    { cls: 'noun', pt: 'olhos', say: 'eyes', lore: 'Os olhos de ferro da galeria. São muitos: THEY.' },
  SEE:     { cls: 'verb', pt: 'ver / enxergar', say: 'see', lore: 'Quem não PODE ver não acha ninguém, nem com o facho aceso.' },
  IRON:    { cls: 'noun', pt: 'ferro', say: 'iron', lore: 'O forte inteiro é feito dele. Derretido, ele sobe pela torre.' },
  RISE:    { cls: 'verb', pt: 'subir', say: 'rise', lore: 'O ferro derretido sobe. A não ser que a lei diga que ele não pode.' },
  WARDEN:  { cls: 'noun', pt: 'guardião', say: 'warden', lore: 'Quem escreve as leis do forte. Escreve uma nova a cada rodada.' },
  FLY:     { cls: 'verb', pt: 'voar', say: 'fly', lore: 'O Guardião voa porque a tábua diz que ele pode.' },
  NOBODY:  { cls: 'pronoun', pt: 'ninguém', say: 'nobody', lore: 'A lei mais escura do Guardião: ninguém pode ver.' },
  COULD:   { cls: 'verb', pt: 'podia / conseguia (passado de CAN)', say: 'could', lore: 'O CAN de ontem. Ontem o Guardião podia voar; hoje, não pode.' },
  FIRE:    { cls: 'noun', pt: 'fogo', say: 'fire', lore: 'Bolas de fogo que quicam pelo chão. Os morcegos têm medo delas.' },
  HAMMER:  { cls: 'noun', pt: 'martelo', say: 'hammer', lore: 'Golpe de perto. Quebra o ferro rachado e derruba quem estiver na frente.' },
  CLOCK:   { cls: 'noun', pt: 'relógio', say: 'clock', lore: 'Para o tempo por alguns segundos: tudo fica parado, menos a Nexy.' },
};
const CREATURES = {
  CRAWLER: { pt: 'rastejante', say: 'Crawler', lore: 'Rasteja porque nunca aprendeu a falar.' },
  SHELL:   { pt: 'casco', say: 'Shell', lore: 'Uma casa de vidro escuro. Vazia, ela vira arma.' },
  FLYER:   { pt: 'alado', say: 'Flyer', lore: 'Um Rastejante que um dia ouviu a palavra UP. Sem as asas, volta a rastejar.' },
  THIEF:   { pt: 'ladrão de palavras', say: 'Word thief', lore: 'Não sabe falar, então rouba. Sempre a última palavra que você aprendeu.' },
  KNIGHT:  { pt: 'cavaleiro', say: 'Knight', lore: 'Era um guarda do palácio. Hoje é só armadura que ainda anda: pisão comum só faz o elmo tinir; com giro, ela se desfaz.' },
  GARGOYLE: { pt: 'gárgula', say: 'Gargoyle', lore: 'Vira pedra quando você olha para ela. De costas, ela voa atrás de você. Parada no ar, serve de degrau; com giro, ela se quebra.' },
  DRONE:    { pt: 'drone', say: 'Drone', lore: 'O olho voador dos telhados. Antes de atirar, ele mira (uma linha fina): saia da frente. Pisão ou laser derrubam; o tiro da Echo o deixa parado no ar.' },
  SENTINEL: { pt: 'sentinela', say: 'Sentinel', lore: 'O guarda da cidade. Esconde o núcleo perto do escudo e muda de lugar a cada rodada: quem diz onde ele está abre o escudo.' },
  BAT:      { pt: 'morcego', say: 'Bat', lore: 'Dorme de cabeça para baixo no teto. Quando a Nexy passa embaixo, mergulha em onda. Pisão, fogo ou martelo derrubam.' },
  EYE:      { pt: 'olho de ferro', say: 'Iron eye', lore: 'Vigia a galeria com um facho de luz. Se te vê, os guardas te põem para fora da sala. O facho não atravessa os pilares.' },
  WARDEN:   { pt: 'guardião de ferro', say: 'Iron Warden', lore: 'Escreve as leis do forte numa tábua de ferro. Reescreva a lei e ele cai; ou jogue nele as bolas de ferro que ele mesmo solta.' },
};
// O ECHO, o companheiro da Nexy: se apresenta na primeira partida e fala nas horas certas (frases A1 com legenda)
const ECHO = {
  pt: 'eco · a sua companheira', say: 'Echo',
  lore: 'Nasceu da primeira palavra que a Nexy ouviu. Fala as palavras em inglês com você, ilumina o escuro e, quando você diz YOU ARE BIG, cresce para te carregar.',
  lines: {
    intro: [{ en: 'Hello! I am Echo.', pt: 'Olá! Eu sou a Echo.' }, { en: 'I am your friend.', pt: 'Sou sua amiga. Eu falo as palavras em inglês para você.' }],
    dark: [{ en: 'It is dark.', pt: 'Está escuro.' }, { en: 'I am your light.', pt: 'Eu sou a sua luz. Fique perto de mim.' }],
    birth: [{ en: 'Hello! I am Echo.', pt: 'Olá! Eu sou a Echo. Nasci do seu primeiro HELLO.' }, { en: 'I am your friend.', pt: 'Sou sua amiga. Eu falo as palavras em inglês para você.' },
      { en: 'Listen! Press C.', pt: 'Aperte C (LB no controle): eu encontro coisas escondidas.' }],
    found: [{ en: 'Something is here!', pt: 'Tem alguma coisa escondida aqui!' }],
    teaser: [{ en: 'Look! The cathedral.', pt: 'Olha! A catedral.' }, { en: 'What is inside?', pt: 'O que será que tem lá dentro?' }],
    // o segredo da 1-1: a máquina, o cartão, o teletransporte e o poder novo
    machine: [{ en: 'What is it?', pt: 'O que é isso?' }, { en: 'It is a machine. It needs a card.', pt: 'É uma máquina. Precisa de um cartão… mas onde ele está?' }],
    card: [{ en: 'What is it?', pt: 'O que é isso? Caiu de dentro da parede!' }, { en: 'It is a card!', pt: 'É um cartão! Ele deve ligar alguma máquina.' }],
    warp: [{ en: 'We are here!', pt: 'Chegamos! Vidas cheias. O pedestal está logo ali.' }],
    shot: [{ en: 'I am strong now!', pt: 'Ganhei um poder: aperte F (Y no controle) e eu atiro luz.' }, { en: 'Stop, crawler!', pt: 'O 1º tiro paralisa o Rastejante: dá para pisar nele. O 2º quebra.' }],
    shotVoice: [{ en: 'Say stop!', pt: 'No VOICE MODE: segure V e diga STOP! que eu atiro.' }],
    goldCard: [{ en: 'A gold card! It is yours now.', pt: 'Um cartão dourado! Agora ele é seu: na 1-1 você já começa com ele, e a TO BE ENGINE liga sempre.' }],
    // TO BE PALACE
    past: [{ en: 'I can see the past!', pt: 'Aqui eu enxergo o passado: aperte C (LB no controle) e eu mostro o que existia.' }],
    knight: [{ en: 'It is a knight!', pt: 'Um cavaleiro! Pisão comum só bate no elmo; pule girando (X) para quebrar a armadura.' }],
    gate: [{ en: 'The gate is open!', pt: 'O portão abriu. A saída do palácio está logo ali.' }],
    // 1-3 · WHERE IS IT?
    city: [{ en: 'Look! A box.', pt: 'Olha! Uma caixa em cima do letreiro. Diga onde ela fica, e ela vai para lá.' }],
    gargoyle: [{ en: 'It is a gargoyle!', pt: 'Uma gárgula! Olhando para ela, ela vira pedra (e dá para subir nela). De costas, ela voa atrás de você.' }],
    map: [{ en: 'Look! A map of the city.', pt: 'Olha! Um mapa da cidade. Aperte ↑ para ler: ele dá um poder novo ao Coração.' }],
    compass: [{ en: 'Now we know where it is!', pt: 'Agora a gente sabe onde as coisas estão: a seta da bússola aponta para o que falta.' }],
    // 1-3 · a segunda metade: poderes, lasers, drones e o Sentinela
    laser: [{ en: 'It is a laser!', pt: 'Um LASER no seu braço! Aperte F (Y no controle) para atirar; segure ↑ para mirar para cima ou na diagonal. Segure o F e solte: tiro carregado.' }],
    wings: [{ en: 'Wings! Hold jump.', pt: 'Asas! No ar, segure o pulo para planar. Em cima de um ventilador, o vento te levanta.' }],
    star: [{ en: 'A star! Run!', pt: 'Uma estrela! Por alguns segundos nada te machuca, e quem você tocar explode.' }],
    drone: [{ en: 'A drone! Look out!', pt: 'Um drone! Quando aparecer a linha fina, ele vai atirar: saia da frente. Pisão ou laser derrubam.' }],
    beam: [{ en: 'The laser is on!', pt: 'O feixe fecha o corredor. Leia o altar: onde a caixa precisa ficar? (Ou destrua o emissor com tiros.)' }],
    gates: [{ en: 'Wait... now go!', pt: 'Esses lasers ligam e desligam. Espere apagar e passe.' }],
    sentinel: [{ en: 'It is the Sentinel!', pt: 'O Sentinela! O núcleo dele fica perto do escudo.' }, { en: 'Where is the core?', pt: 'Diga no terminal onde o núcleo está, e eu abro o escudo.' }],
    coreOpen: [{ en: 'The core is open! Shoot!', pt: 'O núcleo está aberto! Atire nele (ou pule em cima do Sentinela).' }],
    coreMove: [{ en: 'Where is the core now?', pt: 'O núcleo mudou de lugar. Olhe bem e responda no terminal.' }],
    overheat: [{ en: 'It is hot! Now!', pt: 'Ele esquentou demais: o núcleo abriu por um instante. Atire!' }],
    victory: [{ en: 'We did it!', pt: 'Conseguimos! O Sentinela caiu e o portão abriu.' }],
    // O FORTE · CAN YOU?
    fort: [{ en: 'Read the stones!', pt: 'Leia as pedras: elas dizem o que pode e o que não pode. Aperte ↑ perto de uma para mudar a lei.' }],
    lawSame: [{ en: 'The stone says that already!', pt: 'A pedra já diz isso. Para mudar a lei, diga o contrário.' }],
    noJump: [{ en: 'The stone says you can not jump.', pt: 'A pedra diz que você NÃO PODE pular. É verdade? Aperte ↑ na pedra e mude a lei.' }],
    law: [{ en: 'The law is new!', pt: 'A lei mudou! O forte obedece.' }],
    stones: [{ en: 'Look out! The stones can fall.', pt: 'Cuidado! Essas pedras caem no ritmo. Passe quando elas sobem, ou mude a lei.' }],
    eyes: [{ en: 'The eyes can see us!', pt: 'Os olhos de ferro vigiam a galeria. Se o facho te pegar, a gente volta para o começo. O facho não passa pelos pilares.' }],
    seen: [{ en: 'They can see us! Back!', pt: 'Eles nos viram! De volta ao começo da galeria.' }],
    iron: [{ en: 'The iron can rise! Up, up!', pt: 'O ferro derretido está subindo! Suba!' }],
    bat: [{ en: 'A bat! Look out!', pt: 'Um morcego! Ele mergulha em onda. Pisão, fogo ou martelo derrubam.' }],
    fire: [{ en: 'Fire! Press F.', pt: 'FOGO! Aperte F (Y no controle): as bolas de fogo quicam pelo chão.' }],
    hammer: [{ en: 'A hammer! Press F.', pt: 'Um MARTELO! Aperte F (Y no controle) para golpear de perto. Ele quebra o ferro rachado.' }],
    clock: [{ en: 'A clock! Stop the time!', pt: 'Um RELÓGIO! Aperte F (Y no controle): o tempo para por alguns segundos.' }],
    warden: [{ en: 'It is the Iron Warden!', pt: 'O Guardião de Ferro! Ele escreve as leis na tábua.' }, { en: 'Change the law!', pt: 'Reescreva a lei na tábua. Ou pegue as bolas de ferro (segure CORRER) e jogue nele (↑ e solte).' }],
    wardenLaw: [{ en: 'A new law! Read the tablet.', pt: 'Lei nova! Leia a tábua e reescreva.' }],
    wardenDown: [{ en: 'It fell! Now!', pt: 'Ele caiu! Agora: pisão, fogo, martelo!' }],
    wardenDark: [{ en: 'I can not see! The tablet!', pt: 'Está tudo escuro! A minha luz ainda alcança a tábua: leia a lei.' }],
    seal: [{ en: 'Jump, and jump again!', pt: 'O SELO DA LEI: no ar, aperte o pulo de novo. Pulo duplo, do Forte em diante.' }],
    fortWin: [{ en: 'You can! We can!', pt: 'Você pode! Nós podemos! A porta do forte abriu.' }],
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
// O SEGREDO DA 1-1 (76_secret.js): um tijolo invisível lá no alto, no começo da fase, que só o 3º quique seguido alcança
// (o pisão triplo nos três Rastejantes, no instante em que ficam em sequência); a tela "trava" (falso erro) e cai o WARP CARD.
// Terminar a 1-1 com pontuação máxima dá o CARTÃO DOURADO: daí em diante a 1-1 já começa com o cartão. Com ele, a TO BE ENGINE do corredor 2
// liga: tabela completa do verbo TO BE, as 7 ligações (a errada volta no fim) e a escalada acima do A1. O teletransporte leva à praça final com as vidas
// cheias, e a escalada decide a força do TIRO DA ECHO (fica salvo e vale nas outras fases).
const ENGINE = {
  intro: { en: 'The verb to be. All of it.', pt: 'A máquina funciona com o verbo TO BE. Inteiro.' },
  table: [
    { p: 'I', v: 'AM', pt: 'eu sou / estou', icon: 'i' },
    { p: 'YOU', v: 'ARE', pt: 'você é / está', icon: 'you' },
    { p: 'HE', v: 'IS', pt: 'ele é / está · a voz antiga (o narrador das portas)', icon: 'he', fresh: true },
    { p: 'SHE', v: 'IS', pt: 'ela é / está · a Nexy (e a Echo)', icon: 'she', fresh: true },
    { p: 'IT', v: 'IS', pt: 'é / está · as coisas: a chave, a porta', icon: 'it' },
    { p: 'WE', v: 'ARE', pt: 'nós somos / estamos · a Nexy e a Echo', icon: 'we' },
    { p: 'THEY', v: 'ARE', pt: 'eles são / estão · os Rastejantes', icon: 'they' },
  ],
  // escalada: uma tentativa por degrau; cada acerto deixa o tiro da Echo mais forte (SHOT[nível])
  climb: [
    { level: 'A2', q: 'Nexy and Echo ___ friends.', options: ['is', 'are', 'am'], answer: 1, say: 'Nexy and Echo are friends.', tip: 'Dois nomes juntos (Nexy and Echo) valem THEY: ARE.' },
    { level: 'A2', q: '___ the crawlers big?', options: ['Is', 'Am', 'Are'], answer: 2, say: 'Are the crawlers big?', tip: 'Na pergunta o verbo vem primeiro: THEY ARE vira ARE THEY?' },
    { level: 'A2+', q: 'The door ___ not open.', options: ['is', 'are', 'am'], answer: 0, say: 'The door is not open.', tip: 'A porta é IT: IS. O NOT vem depois do verbo.' },
    { level: 'B1', q: '___ not afraid. I am Nexy.', options: ["I'm", "I's", "I're"], answer: 0, say: "I'm not afraid. I am Nexy.", tip: "I AM encurta para I'M (YOU ARE: YOU'RE, HE IS: HE'S)." },
  ],
};
// O TO BE PALACE (14_level_palace.js, 78_palace.js): a lembrança do palácio na primeira visita e o INTERRUPTOR DO SER.
// Quem fala é o narrador; a tabela é o pré-ensino das palavras-chave (som + texto + imagem) antes do primeiro altar.
const PALACE = {
  intro: [
    { en: 'Yesterday, this palace was full of light.', pt: 'Ontem, este palácio era cheio de luz.' },
    { en: 'Today, it is dark.', pt: 'Hoje, ele está escuro.' },
    { en: 'Say what was here, and it comes back.', pt: 'Diga o que existia aqui, e isso volta.' },
  ],
  tableLine: { en: 'Today is. Yesterday was.', pt: 'Hoje: AM, IS, ARE. Ontem: WAS e WERE.' },
  table: [
    { now: 'I AM', past: 'I WAS' },
    { now: 'HE · SHE · IT IS', past: 'HE · SHE · IT WAS' },
    { now: 'YOU · WE · THEY ARE', past: 'YOU · WE · THEY WERE' },
  ],
  switch: [
    { en: 'The verb to be is awake!', pt: 'O verbo TO BE acordou! O palácio inteiro voltou a brilhar.' },
    { en: 'The ghost steps are the floor now.', pt: 'Os degraus-fantasma (AM, IS, ARE) agora são chão para sempre, mesmo sem as palavras na barra.' },
  ],
  ring: { name: 'TO BE RING', pt: 'Anel do TO BE', reward: 'Os degraus-fantasma ficam sólidos para sempre. O Coração ganha um anel.' },
  cheer: { en: 'We were small. Now we are strong!', pt: 'Nós éramos pequenas. Agora somos fortes!' },
};
// WORLD 1-3 · WHERE IS IT? (16_level_1-3.js, 80_city.js): a chegada na cidade (narrador + a tabela das preposições),
// o MAPA DA CIDADE (leitura com karaokê + escalada acima do A1) e a BÚSSOLA DAS PALAVRAS (o acréscimo ao Coração).
const CITY = {
  intro: [
    { en: 'This is the city of words.', pt: 'Esta é a cidade das palavras.' },
    { en: 'Where is the box? Say it, and it goes there.', pt: 'Onde está a caixa? Diga onde ela fica, e ela vai para lá.' },
  ],
  tableLine: { en: 'On. Under. In. Behind.', pt: 'ON = em cima · UNDER = embaixo · IN = dentro · BEHIND = atrás' },
  table: [
    { w: 'ON', pt: 'em cima de', icon: 'on' }, { w: 'UNDER', pt: 'embaixo de', icon: 'under' },
    { w: 'IN', pt: 'dentro de', icon: 'in' }, { w: 'BEHIND', pt: 'atrás de', icon: 'behind' },
  ],
  // o mapa (visto de lado): a estação, a torre (a catedral atrás dela, a Nexy em cima) e a ponte (o palácio embaixo)
  map: {
    intro: { en: 'Read the map of the city.', pt: 'Leia o mapa da cidade. Cada frase acende uma parte do desenho.' },
    lines: [
      { en: 'Nexy is on the tower.', pt: 'A Nexy está em cima da torre.', k: 'nexy' },
      { en: 'The palace is under the bridge.', pt: 'O palácio fica embaixo da ponte.', k: 'palace' },
      { en: 'The cathedral is behind the tower.', pt: 'A catedral fica atrás da torre.', k: 'cathedral' },
      { en: 'The tower is between the station and the bridge.', pt: 'A torre fica ENTRE a estação e a ponte. BETWEEN = entre.', k: 'tower', fresh: 'BETWEEN' },
    ],
    // escalada: uma tentativa por degrau; cada acerto sobe a bússola um nível
    climb: [
      { level: 'A2', q: 'What is between the station and the bridge?', options: ['The tower.', 'The palace.', 'The train.'], answer: 0, k: 'tower',
        tip: 'BETWEEN = entre. No meio da estação e da ponte está a torre.' },
      { level: 'A2+', q: 'Where is the palace?', options: ['It is on the bridge.', 'It is under the bridge.', 'It is behind the bridge.'], answer: 1, k: 'palace',
        tip: 'O palácio está embaixo da ponte: UNDER. (ON seria em cima.)' },
      { level: 'B1', q: 'The cathedral is behind the tower. Which one is closer to you?', options: ['The cathedral.', 'The tower.', 'The station.'], answer: 1, k: 'cathedral',
        tip: 'BEHIND = atrás: o que está atrás fica mais longe. A torre está na frente, mais perto de você (closer).' },
    ],
  },
  compass: [
    { name: 'COMPASS OF WORDS', pt: 'Bússola das Palavras', info: 'A seta em volta da Nexy aponta a letra mais perto que ainda falta.' },
    { name: 'SECRET SENSE', pt: 'Faro de Segredos', info: '+ aponta também os segredos escondidos (blocos invisíveis e paredes falsas).' },
    { name: 'DISTANCE', pt: 'Distância', info: '+ mostra quantos passos (blocos) faltam.' },
    { name: 'KEYHOLE', pt: 'Fechadura', info: '+ aponta também a saída secreta da fase.' },
  ],
  scene: [
    { en: 'Where is it?', pt: 'Onde está?' },
    { en: 'The heart knows.', pt: 'O Coração sabe. Ele ganhou uma bússola.' },
  ],
};
// os poderes que saem dos blocos (1-3): o nome em inglês aparece e a Echo diz a palavra. Machucou, perdeu (a estrela não protege
// para sempre). LASER e WINGS ocupam o mesmo lugar (um troca o outro); a STAR vale por alguns segundos.
const POWERS = {
  laser: { word: 'LASER', pt: 'Laser', say: 'Laser!', info: 'F (Y no controle, SHOT no toque) atira. Segure ↑ para mirar para cima (↑ + lado = diagonal; no ar, ↓ mira para baixo). Segure e solte: o tiro carregado atravessa e vale por 3.' },
  wings: { word: 'WINGS', pt: 'Asas', say: 'Wings!', info: 'No ar, segure o pulo para planar. Em cima de um ventilador, o vento te levanta.' },
  star:  { word: 'STAR', pt: 'Estrela', say: 'Star!', info: 'Por 9 segundos nada te machuca, nem os lasers; quem você tocar explode.', time: 9 },
  // O FORTE: mais três (cada um com o seu jeito de usar o F)
  fire:   { word: 'FIRE', pt: 'Fogo', say: 'Fire!', info: 'F (Y no controle, SHOT no toque) solta bolas de fogo que quicam pelo chão. Até 2 de cada vez.' },
  hammer: { word: 'HAMMER', pt: 'Martelo', say: 'Hammer!', info: 'F (Y, SHOT) golpeia de perto: derruba quem estiver na frente e quebra o ferro rachado.' },
  clock:  { word: 'CLOCK', pt: 'Relógio', say: 'Clock!', info: 'F (Y, SHOT) para o tempo por 5 segundos: pedras, olhos, ferro e inimigos ficam parados. Depois ele se gasta.', time: 5 },
};
/* ============================== O FORTE DE FERRO · CAN YOU? ==============================
   A chegada (1ª visita) ensina CAN antes da primeira pedra. O GUARDIÃO escreve uma lei por rodada na tábua (rounds):
   reescrever a lei o derruba por stun s; sem inglês, as bolas de ferro que ele solta (seguradas e jogadas) tiram 2.
   Depois, o SELO DA LEI no Coração (seal): leitura + escalada A2 → B1 (COULD); o nível do selo é a força do pulo duplo. */
const FORT = {
  intro: [
    { en: 'This is the Iron Fort.', pt: 'Este é o Forte de Ferro, em cima da cidade.' },
    { en: 'Here, the stones make the laws.', pt: 'Aqui, as pedras fazem as leis: o que PODE e o que NÃO PODE acontecer.' },
  ],
  tableLine: { en: 'I can. You can. She can. They can.', pt: 'CAN = pode / consegue. Ele não muda com a pessoa (nada de AM, IS, ARE).' },
  table: [{ w: 'I CAN', pt: 'eu posso' }, { w: 'YOU CAN', pt: 'você pode' }, { w: 'SHE CAN', pt: 'ela pode' }, { w: 'THEY CAN', pt: 'eles podem' }],
  neg: { en: "Can't. Can not.", pt: "CAN'T = CAN NOT = não pode. Diga o contrário da pedra, e a lei muda." },
  warden: {
    hp: 8, stun: 6, ballEvery: 2.4,
    rounds: [
      { law: 'fly', text: 'THE WARDEN CAN FLY.', done: "THE WARDEN CAN'T FLY.", mold: ['THE', 'WARDEN', '_', 'FLY', '.'], answer: "CAN'T",
        tips: { CAN: { en: 'It can fly. Make it fall!', pt: "Ele JÁ PODE voar. Diga que ele NÃO PODE: CAN'T." }, '*': { en: "Can, or can't?", pt: "A lacuna é PODE ou NÃO PODE: CAN ou CAN'T." } } },
      { law: 'jump', text: "YOU CAN'T JUMP.", done: 'I CAN JUMP.', mold: ['I', '_', 'JUMP', '.'], answer: 'CAN',
        tips: { "CAN'T": { en: "Can't? Then the Warden wins!", pt: "CAN'T = não pode. A tábua já diz isso. Diga que você PODE." }, '*': { en: "Can, or can't?", pt: "A lacuna é PODE ou NÃO PODE: CAN ou CAN'T." } } },
      { law: 'see', text: 'NOBODY CAN SEE.', done: 'WE CAN SEE.', mold: ['_', 'CAN', 'SEE', '.'], answer: 'WE',
        tips: { I: { en: 'Me too! You and me: we!', pt: 'A Echo também está no escuro. Você E a Echo = WE.' }, YOU: { en: 'Me? And you! We!', pt: 'Eu e você, juntas: WE.' },
          THEY: { en: 'Not they. You and me!', pt: 'THEY são os outros. Você e a Echo = WE.' }, '*': { en: 'Who can see? You and me!', pt: 'Quem pode ver? Você e a Echo, juntas: WE.' } } },
    ],
    scene: [{ en: 'The law is broken.', pt: 'A lei se quebrou.' }, { en: 'You can.', pt: 'Você pode. O Coração ganhou o SELO DA LEI.' }],
  },
  seal: {
    intro: { en: 'Read the new laws.', pt: 'Leia as leis novas. Depois, suba: cada acerto deixa o selo mais forte.' },
    lines: [
      { en: 'Nexy can jump.', pt: 'A Nexy pode pular.' },
      { en: "The Warden can't fly.", pt: 'O Guardião não pode voar.' },
      { en: 'Can you see? Yes, I can.', pt: 'Você consegue ver? Sim, consigo. (resposta curta: YES, I CAN)' },
      { en: 'Yesterday, the Warden could fly.', pt: 'Ontem, o Guardião PODIA voar. COULD = o CAN de ontem.', fresh: 'COULD' },
    ],
    climb: [
      { level: 'A2', q: 'The Warden has no wings now. It ___ fly.', options: ["can't", 'can', 'is'], answer: 0, tip: "Sem asas, ele NÃO PODE voar: CAN'T." },
      { level: 'A2+', q: 'Can Nexy jump?', options: ['Yes, she can.', 'Yes, she is.', 'Yes, she cans.'], answer: 0, tip: 'Resposta curta com CAN: YES, SHE CAN. O CAN nunca ganha -S.' },
      { level: 'B1', q: "Yesterday the eyes ___ see. Today they can't.", options: ['could', 'can', 'were'], answer: 0, tip: 'YESTERDAY = ontem: o CAN de ontem é COULD.' },
    ],
    tiers: [
      { name: 'IRON SEAL', pt: 'Selo de Ferro', info: 'Pulo duplo: no ar, aperte o pulo de novo (do Forte em diante).', k: 0.6 },
      { name: 'STEEL SEAL', pt: 'Selo de Aço', info: '+ o segundo pulo fica mais alto.', k: 0.72 },
      { name: 'SILVER SEAL', pt: 'Selo de Prata', info: '+ mais alto ainda.', k: 0.84 },
      { name: 'CROWN SEAL', pt: 'Selo da Coroa', info: '+ o segundo pulo é quase um pulo inteiro.', k: 0.95 },
    ],
  },
};
// o SENTINELA (o chefe da 1-3): a cada rodada o núcleo fica num lugar diferente perto do escudo.
// Quem diz no terminal onde ele está (IT IS UNDER THE SHIELD) abre o escudo por 'open' s; sem inglês, ele esquenta
// a cada 'heat.every' s de luta e fica aberto 'heat.open' s (outro caminho, mais difícil).
const SENTINEL = {
  rounds: [{ where: 'UNDER' }, { where: 'BEHIND' }, { where: 'NEXT TO' }],
  hp: 8, open: 6, heat: { every: 10, warn: 1.2, open: 2.6 },
  // o porquê da Echo quando a resposta é outra (sem dar a frase pronta)
  tips: {
    UNDER: { en: 'Look again!', pt: 'UNDER = embaixo. O núcleo está embaixo do escudo? Olhe de novo.' },
    BEHIND: { en: 'Look again!', pt: 'BEHIND = atrás. O núcleo está escondido atrás do escudo? Aperte C e olhe de novo.' },
    'NEXT TO': { en: 'Look again!', pt: 'NEXT TO = ao lado. O núcleo está do lado do escudo? Olhe de novo.' },
    ON: { en: 'Look again!', pt: 'ON = em cima. O núcleo nunca fica em cima do escudo. Olhe onde ele está.' },
    IN: { en: 'Look again!', pt: 'IN = dentro. O escudo é uma placa: não tem dentro. Olhe onde o núcleo está.' },
    'IN FRONT OF': { en: 'Look again!', pt: 'IN FRONT OF = na frente. Na frente do escudo não tem nada. Olhe onde o núcleo está.' },
    BETWEEN: { en: 'Look again!', pt: 'BETWEEN pede duas coisas. Aqui só tem o escudo: embaixo, atrás ou do lado?' },
  },
  scene: [{ en: 'The Sentinel is down.', pt: 'O Sentinela caiu.' }, { en: 'Where is the core? It is gone!', pt: 'Onde está o núcleo? Sumiu!' }],
};
// o tiro da Echo, nível por nível (o 1º tiro paralisa, o 2º quebra; recarrega com o tempo e nos checkpoints)
const SHOT = [
  { name: 'STUN SHOT', pt: 'Tiro Paralisante', max: 3, every: 8, stun: 4, info: '3 tiros. O 1º paralisa o Rastejante (dá para pisar nele); o 2º quebra.' },
  { name: 'STUN SHOT II', pt: 'Tiro Paralisante II', max: 5, every: 7, stun: 4.5, info: '+2 tiros.' },
  { name: 'LONG STUN', pt: 'Paralisia Longa', max: 5, every: 6, stun: 7, info: 'A paralisia dura mais: dá tempo de subir neles.' },
  { name: 'PIERCING LIGHT', pt: 'Luz que Atravessa', max: 6, every: 5, stun: 7, pierce: true, info: 'O tiro atravessa e pega vários de uma vez.' },
  { name: 'HUNTER LIGHT', pt: 'Luz Caçadora', max: 8, every: 4, stun: 7, pierce: true, homing: true, info: 'O tiro persegue o Rastejante mais perto.' },
];
const MASTER_WORDS = {
  HELLO: { pt: 'olá', say: 'Hello', lore: 'Cinco letras espalhadas pelo escuro. Juntas, são a primeira coisa que o mundo responde.' },
  WORLD: { pt: 'mundo', say: 'World', lore: 'Depois do olá, o mundo inteiro. A catedral guardava cada letra num lugar mais alto.' },
  TOBE:  { pt: 'ser / estar (to be)', say: 'To be', lore: 'Quatro letras, um verbo inteiro: AM, IS, ARE, WAS, WERE. O palácio dele acendeu quando você disse quem era e quem é.' },
  CITY:  { pt: 'cidade', say: 'City', lore: 'Quatro letras espalhadas pelos telhados, na chuva. Quem sabe dizer onde as coisas estão encontra todas.' },
  IRON:  { pt: 'ferro', say: 'Iron', lore: 'Quatro letras no forte: no pilar da ponte velha, sobre o poço, atrás do ferro rachado e na torre que o ferro derretido sobe.' },
};
const PHRASES_PT = {
  'HELLO!': 'Olá!', 'HOW ARE YOU?': 'Como você está?', 'WHAT IS THIS?': 'O que é isso?',
  'ARE YOU BIG OR SMALL?': 'Você é grande ou pequena?',
  'WHO ARE YOU?': 'Quem é você?', 'WHAT IS BIG?': 'O que é grande?', 'ARE YOU A CRAWLER?': 'Você é um rastejante?',
  'BIG OR SMALL?': 'Grande ou pequeno?', 'IS IT A DOOR?': 'Isso é uma porta?', 'WHO IS BIG?': 'Quem é grande?',
  'WHAT WAS HERE?': 'O que existia aqui?', 'WERE THEY BIG OR SMALL?': 'Eles eram grandes ou pequenos?',
  'HOW WAS NEXY YESTERDAY?': 'Como a Nexy estava ontem?', 'HOW IS NEXY TODAY?': 'Como a Nexy está hoje?',
  'HOW WERE THEY YESTERDAY?': 'Como eles eram ontem?', 'WHO WERE YOU? WHO ARE YOU?': 'Quem você era? Quem você é?',
  'WHERE IS THE BOX?': 'Onde está a caixa?', 'WHERE IS IT?': 'Onde está?', 'WHERE IS THE CORE?': 'Onde está o núcleo?',
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
      'j': { block: 'glitch', content: { card: true }, secret: 'glitch' },          // o "bug" de propósito: invisível, lá no alto; só o 3º quique seguido (o trem) alcança
    },
    // Placas de dica: aparecem quando a Nexy chega perto e somem depois que a ação foi feita (until).
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
      // os TRÊS RASTEJANTES (o segredo do cartão): no chão, antes da porta 1, cada um andando do seu jeito. Não mordem, só
      // empurram; o pisão vale. Por um instante eles ficam em sequência (o grafite do fundo brilha de leve) e o pisão triplo leva lá no alto
      '4': { entity: 'conga', i: 0, respawn: 'summon' }, '5': { entity: 'conga', i: 1, respawn: 'summon' }, '6': { entity: 'conga', i: 2, respawn: 'summon' },
      '7': { entity: 'mural' },
      'V': { entity: 'pedestal', door: 'pedestal' },
      'T': { entity: 'engine', door: 'engine' },
    },
    // o teletransporte da TO BE ENGINE deixa a Nexy aqui: a praça final, antes do AM, do BIG e do pedestal
    warp: { c: 181, r: 19 },
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
      engine: { kind: 'engine', title: 'TO BE ENGINE', inscription: 'TO BE OR NOT TO BE?' },
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
      { id: '1-3', label: '1-3', name: 'WHERE IS IT?', x: 560, y: 340, icon: 'tower' },
      { id: 'ghost', label: 'PUSH?', name: 'PUSH OR PULL?', x: 470, y: 180, icon: 'ghost' },
      { id: 'fortress', label: 'FORT', name: 'CAN YOU?', x: 700, y: 250, icon: 'fortress' },
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

/* ============================== O CORAÇÃO DAS PALAVRAS (a ferramenta da Nexy) ==============================
   Nasce na 1-2 (Baú da Memória). Cada degrau vencido na escalada de perguntas acima do A1 sobe o Coração de nível:
   ele muda de cor e o poder cresce. O melhor nível fica salvo e aparece no mapa. Cada fase nova deve acrescentar
   algo a ele (um poder, um detalhe visual), sempre com desafio crescente. Cores dentro da paleta neon-noir. */
const HEART = [
  { name: 'CYAN HEART', pt: 'Coração Ciano', reward: 'A Nexy fica gigante e quebra o muro.' },
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
  sandbox: false,   // partida do modo teste: não grava nada (TestMode.begin/end)
  defaults() {
    return {
      grimoire: { words: {}, creatures: {}, master: {} },
      exits: {}, bestFluency: {}, letters: {}, cleared: {}, heart: { best: -1, by: {}, ring: false, compass: 0, seal: 0 }, met: {}, shot: { best: -1 }, goldCard: false,
      map: { at: '1-1', revealed: {} },
      flags: { palaces: { toBe: false } },
      assist: { slow: false, safeFall: false, freeHints: false, subtitles: false, voice: false, classic: false },
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
          if (s.heart) { d.heart.best = s.heart.best != null ? s.heart.best : -1; Object.assign(d.heart.by, s.heart.by); d.heart.ring = !!s.heart.ring; d.heart.compass = s.heart.compass | 0; d.heart.seal = s.heart.seal | 0; }
          if (s.shot && s.shot.best != null) d.shot.best = s.shot.best;
          d.goldCard = !!s.goldCard;
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
  write() { if (this.sandbox) return; try { window.localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ignora */ } },
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
// rótulo da fase: 'WORLD 1-2'; fases com nome (o palácio) ficam só com o número do mundo
const levelTag = L => L.tag || 'WORLD ' + (/^\d/.test(L.id) ? L.id : L.world);
