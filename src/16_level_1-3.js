
/* ============================== FASE 1-3 · WHERE IS IT? (os telhados da cidade na chuva) ==============================
   A cidade cyberpunk gótica vista de cima: prédios, letreiros de neon, um outdoor gigante, a estação do monotrilho.
   Palavra-mestra: CITY. Mecânica nova: a CAIXA DE NEON vai para onde você disser. WHERE IS THE BOX? →
   IT IS UNDER THE SIGN. A preposição (ON, UNDER, IN, BEHIND) escolhe o lugar e o substantivo (WALL, SIGN, HOLE)
   escolhe a coisa; a caixa voa até lá e vira degrau, tampa de buraco ou some atrás de algo.
   Criatura nova: a GÁRGULA (de pedra quando você olha para ela; de costas, ela voa atrás de você).
   No fim, o MAPA DA CIDADE (ler e responder acima do A1) dá ao Coração a BÚSSOLA DAS PALAVRAS.

   ───────────── LEGENDA DESTA FASE (além da legenda global) ─────────────
     c i t y   letras C I T Y              ! @ % &   altares (WHERE IS THE BOX?)      q  gárgula (GARGOYLE)
     T         o trem do monotrilho        Q         o mapa da cidade                 v w  bloco invisível (vida, cristal)
     blocos: 1 ON · 2 UNDER · 3 IN · 4 BEHIND · 5 WALL · 6 SIGN · 7 HOLE
   As caixas (box1-3) ficam em targets: cada lugar (spot) é coluna da esquerda e linha de baixo; back = atrás de algo
   (não é chão, só aparece com o pulso da Echo); say = o que a Echo comenta quando a caixa chega; find = o que ela diz
   ao achar a caixa escondida com o pulso. Letreiros, etiquetas (SIGN, WALL, HOLE) e enfeites ficam em decor. */
// os dois altares da seção C são o mesmo: duas lacunas (ONDE + O QUÊ); as frases sem sentido têm o porquê da Echo
const BOX3_DOOR = {
  kind: 'pedestal', look: 'city', title: 'THE CAFE ROOF', inscription: 'WHERE IS THE BOX?', mold: ['THE', 'BOX', 'IS', '_', 'THE', '_', '.'], consume: false, reusable: true,
  accept: [
    { words: ['IN', 'HOLE'], result: { type: 'box', target: 'box3', spot: 'in-hole' } },
    { words: ['UNDER', 'SIGN'], result: { type: 'box', target: 'box3', spot: 'under-sign' } },
    { words: ['ON', 'SIGN'], result: { type: 'box', target: 'box3', spot: 'on-sign' } },
    { words: ['BEHIND', 'SIGN'], result: { type: 'box', target: 'box3', spot: 'behind-sign' } },
    { words: ['ON', 'WALL'], result: { type: 'box', target: 'box3', spot: 'on-wall' } },
    { words: ['BEHIND', 'WALL'], result: { type: 'box', target: 'box3', spot: 'behind-wall' } },
    { words: ['UNDER', 'HOLE'], result: { type: 'box', target: 'box3', spot: 'under-hole' } },
  ],
  enact: [
    { words: ['IN', 'WALL'], result: { type: 'confused', target: 'box3', tip: { en: 'A wall has no inside!', pt: 'Uma parede não tem "dentro". Tente ON (em cima) ou BEHIND (atrás).' } } },
    { words: ['UNDER', 'WALL'], result: { type: 'confused', target: 'box3', tip: { en: 'Under the wall? No space!', pt: 'Embaixo da parede não cabe nada. Tente ON ou BEHIND.' } } },
    { words: ['IN', 'SIGN'], result: { type: 'confused', target: 'box3', tip: { en: 'In the sign? It is too thin!', pt: 'A placa é fina demais para ter algo DENTRO. ON = em cima, UNDER = embaixo, BEHIND = atrás.' } } },
    { words: ['ON', 'HOLE'], result: { type: 'confused', target: 'box3', tip: { en: 'On the hole? It falls in!', pt: 'Em cima de um buraco a caixa cai. Para tapar o buraco, ela fica DENTRO dele: IN.' } } },
    { words: ['BEHIND', 'HOLE'], result: { type: 'confused', target: 'box3', tip: { en: 'A hole has no behind!', pt: 'Buraco não tem "atrás". Tente IN (dentro) ou UNDER (embaixo).' } } },
  ],
};
LEVELS['1-3'] = {
  id: '1-3', world: 1, name: 'WHERE IS IT?', masterWord: 'CITY', music: 'city', bg: 'city', barMax: 10,
  // 200 colunas × 26 linhas. Os telhados ficam em alturas diferentes; cair entre os prédios é morte.
  map: [
/*MAP:1-3*/
  ],
  extraWords: ['BETWEEN'],   // aprendida no mapa da cidade
  blocks: {
    '1': { block: 'question', content: { word: 'ON' } },
    '2': { block: 'question', content: { word: 'UNDER' } },
    '3': { block: 'question', content: { word: 'IN' } },
    '4': { block: 'question', content: { word: 'BEHIND' } },
    '5': { block: 'question', content: { word: 'WALL' } },
    '6': { block: 'question', content: { word: 'SIGN' } },
    '7': { block: 'question', content: { word: 'HOLE' } },
    'v': { block: 'invisible', content: { life: 1 }, secret: 'city-life' },
    'w': { block: 'invisible', content: { crystal: true }, secret: 'city-crystal' },
  },
  entities: {
    'c': { entity: 'letter', index: 0 }, 'i': { entity: 'letter', index: 1 }, 't': { entity: 'letter', index: 2 }, 'y': { entity: 'letter', index: 3 },
    '!': { entity: 'pedestal', door: 'altar1', look: 'city' },
    '@': { entity: 'pedestal', door: 'altar2', look: 'city' },
    '%': { entity: 'pedestal', door: 'altar3', look: 'city' },
    '&': { entity: 'pedestal', door: 'altar3b', look: 'city' },
    'q': { entity: 'gargoyle', respawn: 'summon' },
    'T': { entity: 'train', width: 6, to: 157, speed: 120, wait: 1.6 },
    'Q': { entity: 'citymap', door: 'citymap' },
  },
  hints: [
    { c: 9, r: 12, en: 'SAY IT · THE BOX GOES THERE', pt: 'diga onde a caixa fica, e ela vai para lá', until: 'altar1' },
    { c: 54, r: 11, en: 'C · WHERE IS THE BOX?', pt: 'a caixa sumiu: perto do outdoor, aperte C e a Echo procura', until: 'boxping' },
    { c: 96, r: 11, en: 'WHERE? + WHAT?', pt: 'agora são duas lacunas: ONDE (on, under, in, behind) e O QUÊ (wall, sign, hole)', until: 'altar3' },
    { c: 138, r: 9, en: 'WAIT FOR THE TRAIN', pt: 'espere o trem chegar e suba nele', until: 'train' },
    { c: 172, r: 7, en: '↑ READ THE MAP', pt: 'leia o mapa da cidade: ele dá um poder novo ao Coração', until: 'citymap' },
  ],
  // as caixas de neon (a do letreiro 2×2; a do outdoor e a do café têm 3 de largura). spot: { c (coluna da esquerda), r (linha de baixo), back (atrás de algo), say, find }
  targets: {
    box1: { kind: 'box', w: 2, h: 2, state: 'on', spots: {
      on: { c: 18, r: 14 },
      under: { c: 20, r: 19 },
      behind: { c: 20, r: 16, back: true, say: { en: 'Now it is behind the sign.', pt: 'Agora a caixa está ATRÁS da placa: escondida, e não dá para subir nela.' } },
    } },
    box2: { kind: 'box', w: 3, h: 2, state: 'behind', spots: {
      behind: { c: 61, r: 15, back: true, find: { en: 'It is behind the sign!', pt: 'Achei! A caixa está ATRÁS da placa (do outdoor).' } },
      in: { c: 65, r: 21 },
      under: { c: 65, r: 25, back: true, say: { en: 'Oh no! It fell down.', pt: 'Ih! A caixa caiu lá embaixo (UNDER THE HOLE). O buraco continua aberto: ela precisa ficar DENTRO dele (IN).' } },
    } },
    box3: { kind: 'box', w: 3, h: 2, state: 'on-wall', spots: {
      'on-wall': { c: 118, r: 9 },
      'behind-wall': { c: 118, r: 15, back: true, say: { en: 'Now it is behind the wall.', pt: 'Agora a caixa está ATRÁS do muro: escondida.' } },
      'in-hole': { c: 107, r: 19 },
      'under-hole': { c: 107, r: 25, back: true, say: { en: 'Oh no! It fell down.', pt: 'Ih! A caixa caiu lá embaixo (UNDER THE HOLE). Para virar chão, ela fica DENTRO do buraco (IN).' } },
      'on-sign': { c: 114, r: 12 },
      'under-sign': { c: 114, r: 17 },
      'behind-sign': { c: 114, r: 14, back: true, say: { en: 'Now it is behind the sign.', pt: 'Agora a caixa está ATRÁS da placa: escondida, e não dá para subir nela.' } },
    } },
  },
  doors: {
    altar1: {
      kind: 'pedestal', look: 'city', title: 'THE HOTEL SIGN', inscription: 'WHERE IS THE BOX?', mold: ['IT', 'IS', '_', 'THE', 'SIGN', '.'], consume: false, reusable: true,
      accept: [
        { words: ['UNDER'], result: { type: 'box', target: 'box1', spot: 'under' } },
        { words: ['ON'], result: { type: 'box', target: 'box1', spot: 'on' } },
        { words: ['BEHIND'], result: { type: 'box', target: 'box1', spot: 'behind' } },
      ],
      enact: [
        { words: ['IN'], result: { type: 'confused', target: 'box1', tip: { en: 'In the sign? It is too thin!', pt: 'A placa é fina demais para ter algo DENTRO. ON = em cima, UNDER = embaixo, BEHIND = atrás.' } } },
      ],
    },
    altar2: {
      kind: 'pedestal', look: 'city', title: 'THE BILLBOARD', inscription: 'WHERE IS THE BOX?', mold: ['THE', 'BOX', 'IS', '_', 'THE', 'HOLE', '.'], consume: false, reusable: true,
      accept: [
        { words: ['IN'], result: { type: 'box', target: 'box2', spot: 'in' } },
        { words: ['UNDER'], result: { type: 'box', target: 'box2', spot: 'under' } },
      ],
      enact: [
        { words: ['ON'], result: { type: 'confused', target: 'box2', tip: { en: 'On the hole? It falls in!', pt: 'Em cima de um buraco a caixa cai. Para tapar o buraco, ela fica DENTRO dele: IN.' } } },
        { words: ['BEHIND'], result: { type: 'confused', target: 'box2', tip: { en: 'A hole has no behind!', pt: 'Buraco não tem "atrás". Tente IN (dentro) ou UNDER (embaixo).' } } },
      ],
    },
    altar3: BOX3_DOOR,
    // o mesmo altar do outro lado do buraco (sem repetir a inscrição em cima do muro)
    altar3b: Object.assign({}, BOX3_DOOR, { quiet: true }),
    citymap: { kind: 'citymap', title: 'CITY MAP', inscription: 'WHERE IS IT?' },
  },
  // letreiros, outdoor, etiquetas das palavras (imagem + texto) e enfeites dos telhados. Só desenho: não colidem.
  decor: [
    { kind: 'sign', c: 18, r: 15, w: 6, h: 2, text: 'HOTEL', tag: 'SIGN', legs: 20 },
    { kind: 'billboard', c: 60, r: 9, w: 13, h: 9, text: 'WHERE IS IT?', sub: 'THE CITY OF WORDS', tag: 'SIGN' },
    { kind: 'tag', c: 65, r: 20, w: 3, text: 'HOLE' },
    { kind: 'tag', c: 105, r: 19, w: 8, text: 'HOLE' },
    { kind: 'sign', c: 114, r: 13, w: 3, h: 2, text: 'CAFE', tag: 'SIGN', bracket: 117 },
    { kind: 'tag', c: 118, r: 13, w: 2, text: 'WALL', on: 'wall' },
    { kind: 'vneon', c: 25, r: 13, text: 'ROOMS' },
    { kind: 'neon', c: 5, r: 22, w: 4, text: 'OPEN' },
    { kind: 'neon', c: 46, r: 22, w: 3, text: 'BAR' },
    { kind: 'neon', c: 88, r: 21, w: 4, text: 'SHOP' },
    { kind: 'neon', c: 135, r: 11, w: 6, text: 'STATION', post: 16 },
    { kind: 'vneon', c: 163, r: 18, text: 'CAFE' },
    { kind: 'neon', c: 192, r: 12, w: 4, text: 'EXIT', post: 16 },
    { kind: 'tank', c: 40, r: 11 }, { kind: 'antenna', c: 10, r: 19 }, { kind: 'vent', c: 33, r: 11 },
    { kind: 'antenna', c: 128, r: 9 }, { kind: 'tank', c: 132, r: 9 }, { kind: 'vent', c: 92, r: 17 },
    { kind: 'vent', c: 176, r: 15 }, { kind: 'antenna', c: 189, r: 15 }, { kind: 'tank', c: 79, r: 19, back: true },
  ],
};
