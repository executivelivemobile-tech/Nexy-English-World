# CLAUDE.md · Nexy English World (contexto para continuar sem reler tudo)

Leia isto antes de mexer. O README é para pessoas; este arquivo é o mapa de trabalho.

## 1. O projeto e o dono

- Jogo de plataforma 2D (Super Mario World na jogabilidade + ar gótico de Castlevania, neon-noir) que ensina inglês a
  brasileiros, começando no A1. Um único `index.html` gerado a partir de `src/` (`node build.js`).
- O dono escreve em português, de forma rápida e informal; responda em PT-BR, direto, sem jargão. Ele aprova fase por
  fase. **Fase aprovada não muda de comportamento** sem pedido (1-1 aprovada = commit `3702f14`; os testes a travam).
  Ele pediu depois uma 1-1 "especial": o Echo nasce nela (abertura nova), sem mudar a física nem os quebra-cabeças.
- Branch de trabalho: `claude/jolly-faraday-8mbshk`. Commit e push sim; **PR só se ele pedir**. Mensagens de commit com
  as linhas `Co-Authored-By` e `Claude-Session` que o sistema indicar. Nunca escreva nome de modelo no repositório.
- Publicação para ele jogar: artifact `https://claude.ai/artifact/Y7vb7ZPz386U3viy46FH38`. Gere a cópia tirando o
  esqueleto (`<!DOCTYPE html>`, `<html lang="pt-BR">`, `<head>`, `<meta charset>`, a meta viewport, `</head>`,
  `<body>`, `</body>`, `</html>`) e publique no mesmo URL.
- Produção: **Vercel**, importando o repositório do GitHub (`vercel.json`: sem install, `node build.js`, serve só
  `dist/index.html`, com cabeçalhos de segurança; microfone liberado para o próprio site). A produção segue a branch
  padrão do GitHub (hoje a branch de trabalho): todo push vai para o ar. Daqui não dá para publicar direto (a rede do
  ambiente bloqueia `api.vercel.com` e não há `VERCEL_TOKEN`); quem importa e conecta é o dono.

## 2. Visão e regras de design (decididas por ele; valem para as próximas fases)

- **Cada fase traz algo novo** (mecânica, criatura, item, cena). Nada de repetir fórmula; vocabulário novo sempre
  dentro da história da Nexy.
- **Desafie acima do A1** (A2 → B1+) de forma **crescente**: quanto mais o aluno acerta, mais poderosa fica a
  ferramenta que ele ganha. O **Coração das Palavras** (`HEART` em `10_data.js`) muda de cor por nível
  (ciano → magenta → incandescente → prisma → Coroa) e é salvo (`Save.data.heart`); cada fase futura deve acrescentar
  algo a ele (um poder, um detalhe).
- **Sempre outra saída**: quem não consegue o desafio de inglês precisa de um caminho alternativo (mais difícil de
  jogar), nunca um beco sem saída.
- **Cenas épicas na pegada God of War** (pausa pesada, tambores, câmera lenta, impacto congelado, cacos, luz).
- **Evolução visual ao longo do jogo**: cada fase com mais detalhe, ângulos, profundidade/3D, rumo a uma **cidade
  Castlevania cyberpunk**. Pode sair da caixa, mas o aluno tem que aprender de verdade.
- **Ciência do aprendizado** em tudo: pré-ensinar palavras-chave, som + texto + imagem juntos, recuperação ativa
  (perguntas), repetição espaçada (palavras voltam em fases seguintes), dificuldade desejável, retorno imediato que
  aponta a prova no texto, errar sem punição no básico, produção em 1ª pessoa (personalização), tradução só sob
  pedido (tecla H).
- Paleta: preto, vidro, **só magenta (jogador/recompensa) e ciano (sistema/ambiente)**; brilhos pré-renderizados.
- Futuro: depois do jogo inteiro, app Android (Google Play). Mantenha tudo pensado para toque e offline.
- Preferências já dadas: sem voz em combos e nomes de criaturas; correr com toque duplo na seta (janela medida da
  soltura); quique alto com janela antes/depois (só no ar); blocos-fantasma dependem da barra, não do Grimório.
- **Vozes gravadas (ElevenLabs)**: 602 falas em `src/voice/` (MP3 + `manifest.json`), embutidas pelo build.
  Elenco: **Echo = Lulu** (feminina e sensual, escolhida pelo dono), **narrador do Baú = Elder Rowan** (a voz antiga
  das portas, pedida pelo dono no lugar do Lawrence; `[warmly]`, 1,08×), **portas e altares = Elder Rowan** (`[slowly]`,
  acelerada 1,15× no corte). Não imitar vozes de pessoas reais (ele citou Morgan Freeman: só a referência de idoso e grave). A Echo agora é **ela** nos textos em português ("a Echo", "sua amiga").
  Falas sem gravação: a porta repete palavra por palavra; senão outra voz gravada; senão a voz do aparelho
  (`Voice.score` prefere Natural/Neural/Google). ASSIST → ECHO'S VOICE alterna "Lulu · studio" e as vozes do aparelho.
  Como gerar falas novas: `tools/voice/README.md`.
- **A Nexy é ELA** (feminina; o dono corrigiu): em inglês SHE/HER ("Today, she is stronger", "Nexy is she!"), em
  português a/da/na Nexy, adjetivos no feminino. Na tabela do TO BE, HE = a voz antiga das portas (o narrador, voz
  masculina) e SHE = a Nexy (e a Echo).
- O **Echo** (orbe que segue a Nexy) é o companheiro: fala as palavras, se apresenta na 1ª partida
  (`ECHO.lines.intro`), avisa no escuro e é a luz da cripta. O dono não sabia o que era: sempre apresente as coisas.

## 3. Arquitetura (`src/`, na ordem do build)

| Arquivo | O que tem |
| --- | --- |
| `00_head.html` | CSS/HTML: HUD, HUD do mapa (`#maphud`), painel das portas, baú (`#chest`), telas, toque |
| `10_data.js` | legenda global, `CFG` (física), `LOOK` (brilho), `WORDS`, `CREATURES`, `ECHO`, `MASTER_WORDS`, `PHRASES_PT`, `LEVELS['1-1']`, `WORLDS` (mapa), `HEART`, `Save`, `Flags`, utilitários |
| `12_level_1-2.js` | `LEVELS['1-2']`: legenda extra, blocos, entidades, zonas, alvos (runas), portas/altares/sinos/baú (com a história) |
| `14_level_palace.js` | `LEVELS.palace` (TO BE PALACE): legenda, alvos do passado (`look`: memory/knight/gate, `ghost`, `past`), altares, relógios, interruptor |
| `18_level_fort.js` | `LEVELS.fortress` (O FORTE · CAN YOU?, `tag` 'WORLD 1 · FORTRESS', `seal: true`): legenda, `laws` (zona em colunas, `can` do começo, `text` por estado), portas `law1..law4` (`look: 'law'`, `law`), a tábua `warden` (`live` → `Warden.live`), `caves` (fundo de pedra no esgoto), `decor` do forte |
| `16_level_1-3.js` | `LEVELS['1-3']` (WHERE IS IT?): legenda, caixas (`kind: 'box'`, `spots` com nome), altares (`BOX3_DOOR` serve aos dois do café; `quiet` esconde a inscrição), `decor` (letreiros, outdoor, etiquetas SIGN/WALL/HOLE, enfeites) |
| `20_audio.js` | `SFX`, `Music` (variantes `world1`/`map`/`nave`/`palace` com `chords` e `tick` próprios, zonas muffle/boost), `VoiceClips` (vozes gravadas, `/*VOICE_PACK*/`), `Voice.say(text, who, {onBoundary,onEnd})`, `Listen` |
| `30_input_render.js` | `Input` (teclado, toque, **gamepad** em `pollPad`), `R` (escala, sprites, glow, texto) |
| `40_world.js` | `World` (tiles, blocos, runas `setTarget`, zonas, veils, colisão `move`), `BG` (cidade e nave), `Dark`, `FX` |
| `50_entities.js` | `Ents`, `Spawns`, `Enemy`, crawler, casco, orb, letter, capsule, crystal, lantern, checkpoint, goal, pedestal |
| `55_entities2.js` | chandelier, pipe, flyer, thief, giant, bell + `Bells`, life, moon, bigbell, echoride, `drawAltar` |
| `60_player.js` | `P` (plataformas móveis `riding`, forma de Rastejante), `Echo` (fala/balão, luz, alvo YOU), `Cam`, `Doors` |
| `70_game.js` | `Sentence`, `Panel`, `UI`, `Game` (estados, `later()` no tempo da simulação, laço, render com zoom da cena) |
| `72_chest.js` | Baú da Memória (`Chest`), ícones, `HEART_LOOK`, `drawHeart`, cena épica (`Cine`) |
| `73_echo.js` | `Arrival` (chegada no feixe), `Birth` (o Echo nasce do HELLO na porta 1), `EchoPulse` (sonar, C/LB/toque), `Hints` (placas) |
| `74_prologue.js` | `Prologue`: A Lei das Palavras (1ª partida; `Save.data.met.prologue`), entidade `floorword` |
| `76_secret.js` | segredo da 1-1: `Glitch` (falso erro), entidades `card` e `engine`, `Engine` (tela da TO BE ENGINE no painel do baú, estado `engine`), `Warp` (teletransporte), `EchoShot` (tiro da Echo) |
| `62_nexy_look.js` | `NexyLook` (o visual da Nexy: esqueleto `rig`, camadas por estágio `paint`, quadros em cache `sprite`, `stageFor(cleared)`), `NEXY_STAGES`. Também usado por `tools/look_sheet.js` (não pode depender do jogo) |
| `75_worldmap.js` | `Transition` (íris/fechadura + cartão "Nexy × vidas"), `WorldMap` (andar, revelar caminhos, toque; desenho: ilha flutuante `land()` guardada em imagem, `prep()` rio/pontes/cascata, `landmark()` marco de cada fase, `pad()`, `fog()` sobre o que não foi descoberto, constelações TOBE/CITY) |
| `78_palace.js` | TO BE PALACE: entidades `knight` e `beswitch`, `Palace` (pulso vê o passado `ping`, `drawGhost`/`drawTarget`/`statue`/`drawClock`, chão-espelho `drawMirror`, `drawRing`), `PalaceIntro` (lembrança + tabela, `Save.data.met.palace`), `PalaceSwitch` (cena do interruptor), `BG.drawPalace` |
| `80_city.js` | 1-3: `City` (caixa: `initBox`/`moveBox`/`land`/`flyPos`/`drawCube`, `ping` acha a caixa escondida, `drawBack` antes do terreno e `drawFront` depois dos letreiros; prédios `drawSolid`; chuva/raios `tick`/`strike`/`drawRain`; `drawDecor`, `drawAltar`, `drawMapBoard`; Bússola `compassTarget`/`drawCompass`/`drawNeedle`), entidades `gargoyle`, `train`, `citymap`, `decor`, `CityIntro` (`Save.data.met.city`), `CityMap` (painel do Baú, estado `citymap`), `CompassScene` (`Save.data.met.compass`), `BG.drawCity` |
| `82_city2.js` | 1-3, a segunda metade: `Power` (poderes `P.power` laser/wings e `P.starT`; `give`/`lose`/`refill`; tiro da Nexy `press`/`shoot`, carga segurando F (`Input.held.shoot`, `touchHeld.shot`, `padHeld.shoot`); `drawBack` asas, `drawFront` canhão/estrela, `drawBolts`), `EnemyFire` (tiros ciano dos inimigos), entidades `powerup`, `drone`, `beam` (emissor: `left` com vida e `shootable`; `down` liga/desliga), `vent`, `sentinel`; `Sentinel` (`live` troca as regras do terminal por rodada, `answer`, `damage`, `roundOver`, `drawTerminal`), `SentinelScene` (a queda), `City2` (avisos, `drawShutter` do portão) |
| `86_fort.js` | O Forte: `Fort` (leis `laws`/`can`/`inZone`/`law` (frase certa)/`shake`/`learn`, `jumpK` (YOU CAN'T JUMP = pulo 0,42), `freezeT` do CLOCK, `caught` (o olho pega: volta a c124), `drawStone`, `drawSolid` tijolos, `drawCracked`, `drawDecor`, `drawPortcullis`, `drawOverlay`, `glowA`/`glowV` âmbar e violeta), `FortIntro` (`Save.data.met.fort`), entidades `crusher` (ciclo próprio; `law` trava em cima; machuca caindo), `slab` (o chão que se mexe), `crumble` (cai 0,42 s depois de pisar), `eye` (facho, `sees` com linha de visão), `bat`, `molten` (sobe ao entrar; queima; `calm` no respawn), `FortPower` (FIRE quica, HAMMER quebra `X`, CLOCK congela inimigos com `frozen`), `BG.drawFort` (céu, aurora, lua, montanhas e castelo, torres, parede de dentro, brasas) |
| `88_fort2.js` | `Warden` (rodadas `FORT.warden.rounds`: fly/jump/see; `live`, `answer` (stun), `damage` (fora do stun só bola e fogo), `roundOver`, `ball` (cascos `iron`), ondas do martelo, `drawTablet`, `drawBall`), entidade `warden`, `WardenScene` (CAN'T → CAN), `SealPanel` (estado `seal`, painel do Baú: leitura com COULD + escalada; fechar 1ª vez abre `keepgate`), `Seal` (pulo duplo: `ok`/`jump`, força `FORT.seal.tiers[nível].k`) |
| `84_testmode.js` | `TestMode` (escondido para o dono: T na tela inicial ou na pausa, 5 toques em PAUSE, `#teste`): pula para trechos de cada fase (`LEVELS[].spots`), lista do que testar (localStorage próprio), ajudas; a partida de teste não grava (`Save.sandbox`) e `Game.toMap` chama `TestMode.end()` (volta o progresso, vidas e orbes) |
| `99_boot.js` | `window.NEXY` (API de teste) e `Game.boot()` |

- Cenas: `Game.scene()` devolve a cena ativa (`Cine`, `Birth`, `Prologue`, `Glitch`, `Warp`, `PalaceSwitch`, `PalaceIntro`, `CompassScene`, `CityIntro`, `SentinelScene`, `FortIntro`, `WardenScene`, `Arrival`); todas têm `zoom`, `sat`, `letter`,
  `timeScale`, `update`, `key`, `drawWorld`, `drawScreen`. `Game.echoBorn` = o Echo já existe nesta partida (na 1-1
  começa falso; a porta com `birth: 'echo'` dispara `Birth`).
- Estados do `Game.state`: `title`, `map`, `play`, `panel`, `chest`, `engine`, `citymap`, `cinematic`, `pause`, `grimoire`, `assist`,
  `clearing`, `clear`, `gameover`, `leaving`, `test`, `seal`. `Game.where`: `map` | `level`.
- Fluxo: título → `toMap()` → `WorldMap.tryEnter` → `Transition` → `enterLevel(id, true)` → `finish(exit)` →
  `showClear` → `continueToMap()`.
- Mapas ASCII em `src/levels/*.map` (o build troca `/*MAP:id*/`). A 1-2 é gerada por `tools/gen_map_1-2.py`
  (edite o gerador e rode `python3 tools/gen_map_1-2.py src/levels/1-2.map`); o palácio por `tools/gen_map_palace.py`.
- Frases: `accept` → `Sentence.apply` (tipos `open`, `transform`, `exit`, `target`, `targets` (vários, um de cada vez),
  `echo`, `we`, `beswitch`, `box` (`target` + `spot`: a caixa voa para o lugar dito), `core` (o terminal do Sentinela), `law` (a pedra da lei do Forte), `warden` (a tábua do Guardião)); uma porta com `live(def)` troca
  as próprias regras ao abrir o painel; `enact` → `Sentence.enact` (`morph`, `mirror`, `crawler`, `confused` com alvo único ou
  lista, `stone` (a pedra da lei treme: a lei não mudou)); qualquer `enact` pode ter `tip: {en, pt}` = a Echo explica o erro 0,5 s depois (sem dar a frase pronta).
- Runas/alvos: `hFirst` encolhe a altura primeiro (o portão afunda); `small: {w:0,h:0}` = não existe (ponte que caiu).
- `levelTag(L)`: 'WORLD 1-2' ou, para fases com nome (palácio), 'WORLD 1'.

## 4. Números que importam (física)

Tile 32 px, tela 960×540, 60 Hz fixo. Pulo parado ≈ 123 px (3,8 tiles), correndo ≈ 154 px, alcance correndo ≈ 190 px,
andando ≈ 110 px. Quique segurando ≈ 213 px; combo 2x ≈ 13 tiles, 3x ≈ 16 tiles (`CFG.COMBO_BOUNCE`). Degraus
confortáveis = 3 linhas (96 px). Gigante = 44×92 px e quebra `X` (vidro rachado).

## 5. Fase 1-2 "WHO ARE YOU?" (40 × 312, chão da nave na linha 30)

- Seções: Portal da Nave (0–63) · Lustres (64–137) · Coro dos Sinos (138–205) · Cripta (206–249) · Campanário (250–311).
- Mecânica: o pronome escolhe o alvo (IT → runa, THEY → gigantes, YOU → Echo, WE → os dois); concordância errada
  faz o alvo tremer (`enact` com `*`).
- Portas: 1 `WHO ARE YOU?`→NEXY (YOU = reflexo) · 2 `ARE YOU A CRAWLER?`→NO, NOT (YES = vira Rastejante) ·
  portão dos sinos `HOW ARE YOU?` (I→AM→FINE, de primeira dá vida) · 3 `IS IT A DOOR?`→YES.
- Altares: 1 `WHAT IS BIG?` (runa 2×3 em c24) · 2 `BIG OR SMALL?` (gigantes e pedra 3×4 em c231) ·
  3 `WHO IS BIG?` (IT = ponte 8×1 em c280 → fim normal; YOU = Echo leva ao fim secreto).
- Baú da Memória em c233 (linha 35); Muro do Silêncio `X` em c238–239 (linhas 32–35). Caminho alternativo: poço
  c233–235 (plataforma c233 L33, Alado `B` c235 L31) → passagem baixa c236–239 L25–26 → câmara da luz c240–247.
- Checkpoints: c88 (pilar 1 dos lustres, pedido do dono), c140, c212 (entrada da cripta), c246. Lua (3UP) atrás da parede falsa c248. Vidas: ponte de Alados (3x),
  bloco c143, sinos de primeira, Lua, sacada do campanário, e as do Coração.
- Barra de palavras = 10 nesta fase (`barMax`). YES de reserva só se não tiver um (`ifMissing`).
- **Poço de palavras** `m` em c217 L32 (logo depois do altar 2): cada batida dá a próxima palavra que falta de
  THEY/ARE/SMALL/IT/IS (`content.reserve`). O SMALL fica no alto dos tubos do órgão; sem o poço, quem passava direto
  ficava preso nos gigantes (aconteceu com o dono).
- Altar 2 tem `nudge`: depois de qualquer frase certa (até IT IS SMALL, que não tira os gigantes) e quando a Nexy
  empurra os gigantes (`Sentence.bumped`, a cada 6 s), a Echo diz o que ainda bloqueia (1ª vez "They are big.", depois "Make them small!", ou "Something is here!" apontando o poço se faltar palavra;
  idem para a pedra). O dono achou que tinha travado ali.

## 5b. TO BE PALACE (150 × 23, chão na linha 20, teto nas linhas 0-1; saída secreta da 1-1)

- Mecânica nova: o PASSADO (WAS/WERE) traz de volta o que existia. Palavra-mestra TOBE (letras `t O b e`).
- A Salão dos Espelhos (0-43): WAS c11 L16, BRIDGE c17 L16; altar1 `!` c25 "WHAT WAS HERE?" → IT WAS A BRIDGE →
  `bridge1` (c29-38 L20, `ghost: 'ping'`: o pulso mostra o contorno e a Echo diz "It was a bridge!"). Outro caminho:
  Alados `V` c31 e c35 (quique, quique). Letra T c33 L10. Checkpoint c41.
- B Galeria (44-77): WERE c46, ARE c50, BIG c53; cavaleiros `k` c57/c62; letra O c60 L11; altar2 `@` c64 "WERE THEY
  BIG OR SMALL?" → THEY WERE BIG → estátuas `knight1-3` (c70/72/74, alturas 3/5/7, sombras sempre visíveis) em escada
  até o topo da parede c76-77 (L11). **Encostadas umas nas outras e na parede**: antes havia vãos de 1 bloco entre elas
  e o dono ficou preso num (5 de um lado, 7 do outro). Outro caminho: Alado `u` c75 L16 (`unless: 'knight3'`: some
  quando a estátua cresce no lugar dele; `Spawns.update` trata o `unless`).
- C Torre do Relógio (78-105): relógio1 `%` c81 (WAS → `step1` c84-86 L17), sacada1 `=` c87-93 L14 (encostada no
  degrau), IS c92 L10, poço `m` c89 L16 (WAS/IS/WERE/ARE), relógio2 `&` c91 L13 (IS → `step2` c84-86 L11), sacada2
  c78-83 L8, relógio3 `$` c80 L7 (WERE → `bridge2` c84-98 L8), saída `=` c99-103 L8 e topo da parede c104-105.
  Letra B c101 L5. Outro caminho: tubo-pistão `|` c94 → sacada3 c97-100 L12 → Alado `V` c102 L10 → saída.
- D Salão do Interruptor (106-149): checkpoint c108, AM c111, vida c113, cavaleiros c117/c124, letra E c121 L11,
  poço `n` c127 L16 (WAS e AM que faltarem), INTERRUPTOR `^` c131 (YESTERDAY, I _ SMALL. TODAY, I _ STRONG. → WAS, AM) → `PalaceSwitch`: no impacto
  `Flags.set('palaces.toBe', true, true)` + `Save.data.heart.ring = true` (o acréscimo ao Coração: ANEL DO TO BE,
  `Palace.drawRing`, aparece no mapa e no Grimório); no fim o portão `gate` (c135-136 L8-19) afunda. Saída `N` c144.
  Outro caminho: Alados `U` c133 L16 + `V` c134 L11 (quique e quique por cima do portão, saindo de c130-131).
- Erros têm `tip` da Echo ("Not today. Yesterday!", "They? Not was!", "Nexy is she!", "Yesterday is the past!").
- 1ª visita: `PalaceIntro` (ontem cheio de luz, hoje escuro, tabela TODAY/YESTERDAY; Esc pula). Depois a Echo lembra
  do pulso (`ECHO.lines.past`). Cavaleiro: pisão comum só tine (`clang`, quica), giro/casco/tiro duplo quebram.
- Visual novo: chão-espelho (`level.mirror`), fundo do palácio com relógio gigante (ponteiros para trás até o
  interruptor), música `palace` (Ré menor, 84 BPM, tique-taque).

## 5c. Fase 1-3 "WHERE IS IT?" (400 × 26, telhados; a rua lá embaixo é morte)

- O dono achou a 1ª versão (200 colunas) curta e pediu mais power-ups, tiros de laser e a ideia mais desenvolvida:
  a fase dobrou (seções E-H abaixo), com poderes, drones, feixes e o primeiro chefe.

- Mecânica nova: a CAIXA DE NEON vai para onde a frase disser (`kind: 'box'`, `spots` com nome; `back` = atrás de algo,
  não é chão, só o pulso mostra; `say` = a Echo comenta ao pousar; `find` = a Echo diz ao achar com o pulso). Os
  desafios de altura são todos de 5 linhas (160 px): nem o pulo correndo (154) alcança; a caixa ou a gárgula parada no
  ar viram o degrau. Palavra-mestra CITY (`c i t y`).
- A Letreiro do HOTEL (0-44): ON c4, UNDER c7 (L16); altar1 `!` c13 "IT IS _ THE SIGN." Placa `=` c18-23 L15, caixa
  box1 2×2 começa ON (c18-19, na ponta esquerda: a gárgula vem da direita e a Nexy sobe pela outra ponta) → UNDER
  (c20-21 L18-19). Prédio alto c25-44 L12. Gárgula `q` c27 L10. Letra C c21 L11. Checkpoint c30. Vida escondida `v` c35 L8.
- B Outdoor (45-83): IN c46, BEHIND c52; altar2 `@` c49 "THE BOX IS _ THE HOLE.". Outdoor sólido c60-72 L9-17,
  corredor L18-19, BURACO c65-67 (3 colunas: com 2 dava para pular correndo com coyote). box2 3×2 começa ATRÁS do
  outdoor (c61 L14-15, `find`), IN tapa (c65-67 L20-21), UNDER cai na rua. Outro caminho: escada de incêndio `=` c56-57
  L17 e L14 + gárgula c62 L7 → topo do outdoor (letra I c70 L6). Checkpoint c76.
- C Café (84-134): WALL c86, SIGN c89, HOLE c92 (L14); altar3 `%` c102 e altar3b `&` c113 (mesmo `BOX3_DOOR`, 2
  lacunas, 7 lugares certos e 5 frases sem sentido com dica). Buraco c105-112 (8: não se pula), parapeito c113-116
  L18, placa do CAFÉ `=` c114-116 L13, MURO (prédio) c117-134 L10. box3 3×2 começa ON THE WALL; IN THE HOLE (c107-109)
  vira chão no meio; do parapeito, UNDER THE SIGN (c114-116 L16-17) → placa → muro. Gárgulas c108 L15 (sobre o
  buraco: pulo correndo nela; letra T c108 L11) e c112 L9 (atrair do parapeito).
- D Estação (135-162): estação c135-140 L16, checkpoint c137, trem `T` c141 (6 de largura, vai até c157; posição pelo
  relógio da simulação, como os tubos), letra Y c154 L11, gárgula c148 L11.
- E Mercado neon (163-212, telhado L16 até c262): checkpoint c165, bloco do LASER `8` c169 L12 (`refill: 6`), drones `d`
  c180 L11 e c193 L9, Rastejante c184, MAPA DA CIDADE `Q` c200 (porta `citymap`), cristal escondido `w` c207 L12.
- F Beco dos lasers (213-262): IN FRONT OF `9` c216, LASER `0` c219 (L12); altar4 `(` c222 "THE BOX IS _ THE _."; poste
  `#` c226 L15 (de cima dele o feixe não pega); marquise c228-236 L11-13 (corredor de 2 linhas: o feixe na L15 pega até
  pulando); EMISSOR `<` c241 L14-15 (`hp: 10`, sólido; atira para a esquerda até a primeira coisa sólida). box4 2×2
  começa ON (c240-241 L12-13, em cima do emissor); FRONT c239-240 L14-15 bloqueia o feixe; BEHIND c242. Checkpoint
  c246, STAR invisível `s` c248 L12 (`city-star`), portões `/` c251 e `u` c257 L9 (1,4 s ligado / 1,4 s desligado,
  fases opostas, piscam 0,45 s antes), drone c255 L5.
- G Abismo e antena (263-330): WINGS `~` c266 (`refill`), NEXT TO `+` c270, BETWEEN `-` c273 (`ifMissing`); altar5 `)`
  c278 "THE BOX IS _ THE _ AND THE _."; placa BAR (decor, SIGN) c281-283; ventilador `^` c284 (coluna c283.5-285.5 até
  L3: com WINGS e o pulo seguro, sobe). Abismo c285-291 (7 colunas: com 8 o pulo andando da caixa ao muro não chegava).
  Prédio da antena c292-330 L11 (5 linhas acima). box5 3×2 começa ON THE WALL (c292); BETWEEN = c287-289 L13-14 (dois
  pulos de 2 colunas, andando). Checkpoint c296, sacadas c300 L8 / c306 L5 / c300 L2, vida `l` c307 L1, sacada solta
  c317-320 L6 (só planando do alto; vida c318 L2), drones c297 L4 e c312 L7.
- H Arena (331-372) e saída: checkpoint c333, terminal `K` c335 ("WHERE IS THE CORE?" → IT IS _ THE SHIELD), poço `m`
  c342 L12 (UNDER/BEHIND/NEXT TO que faltarem), LASER `8` c345, Sentinela `S` c353 L7 (acorda com a Nexy depois de
  c338), portão `bossgate` c372-373 L9-15 (`look: 'shutter'`, afunda no fim da cena), saída `N` c392. Zona `boost`.
- Sentinela (`SENTINEL` em `10_data.js`): rodadas UNDER → BEHIND → NEXT TO (`CORE_AT`), 8 de vida por rodada (tiro 1,
  carregado 3, pisão no casco 2, i-frames 0,3 s). Resposta certa: 6 s aberto e baixo (o núcleo na altura do tiro).
  Sem inglês: a cada 10 s de luta esquenta (aviso 1,2 s) e abre 2,6 s (vencer só assim leva ~1,5 min jogando perfeito).
  Morrer: ele dorme de novo, a rodada fica. Aberto, o casco deixa o tiro passar (senão o núcleo de trás ficava imune).
- Poderes: tomar dano com poder = perde o poder (`P.hurt`), STAR ignora tudo e mata no toque (menos gigantes). Morreu ou
  trocou de fase: `P.reset` zera. O poder sai do bloco, mostra o nome 0,9 s e vem até a Nexy (o bloco fica alto demais
  para pegar parado). A Echo apresenta cada coisa uma vez (`Save.data.met.laser/wings/star/drone`, `City2.met*`).
- Gárgula: `watched` = a Nexy de frente (±16 px); de costas e perto (8 colunas, 10 linhas) ela treme 0,35 s (ainda é
  chão) e voa: primeiro até a altura da cabeça, depois reto. Longe ou a mais de 14 blocos de casa, volta ao poleiro.
  Pedra = `plat` e não machuca; pisão = pedra por 2 s + quique; giro quebra.
- Mapa da cidade (`CITY.map`): leitura com karaokê (BETWEEN no Grimório) → Bússola nível 1; escalada de 3 perguntas
  (A2, A2+, B1) sobe até 4; errar encerra e guarda; reabrir deixa tentar de novo. Ao fechar pela 1ª vez com a
  bússola: `CompassScene`. Bússola (`Save.data.heart.compass` 0-4) vale em todas as fases (`City.drawCompass`).
- Visual novo: prédios com janelas e profundidade (face de cima do telhado, lateral), chuva em duas camadas, raios com
  trovão, lua, outdoor, letreiros que piscam, monotrilho com faróis; música `city` (Mi menor, 108 BPM, chiado da chuva).

## 5d. O FORTE DE FERRO "CAN YOU?" (330 × 36; chão de A-C na linha 28, muralhas na 13; depois da 1-3)

- O dono pediu: fazer o forte, sem parecer repetitivo; fundo que muda, mais detalhes, mais power-ups, mais brilho, **mais
  cor** (daqui em diante, além de magenta e ciano: âmbar do fogo e violeta; vitrais coloridos). Palavra-mestra IRON.
- Mecânica nova: as PEDRAS DA LEI (CAN/CAN'T). Cada lei vale numa faixa de colunas (`laws[].zone`). Desafio crescente:
  1 lacuna (I CAN JUMP) → 2 (THE FLOOR CAN MOVE) → resposta curta com pronome (NO, THEY CAN'T) → lei que muda por rodada
  (Guardião) → COULD no Selo (B1). Frase que não muda nada = `stone` (a pedra treme, a Echo explica).
- A Portão (0-49): CAN `a` c7 L24 (antes da lei); pedra 1 `!` c13; zona do pulo c12-32 (pulo × 0,42 ≈ 22 px); degrau de
  2 c18-19; ralo c16-17; fosso c24-26/c29-31 (cair leva ao esgoto, não mata). Esgoto c15-44 L29-33 (esmagadores `U`
  c20 e c36, 2×2), saída por baixo c42-43 (degrau 3 de altura, fora da lei). Letra I c27 L23, FIRE `x` c36, checkpoint c39.
- B Salão (50-122): teto até L15; CAN'T `b` c52, pedra 2 `@` c55, STONES `c` c58, CLOCK `z` c65; esmagadores `u` c62,
  68, 74, 80, 86, 92 (2×3, caem até L27, ciclo 2,9 s em onda). FLOOR `d` c96, pedra 2b `%` c99. Poço c101-113 (morte);
  o chão `p` (3 de largura) vai de c101 até c111 quando a lei deixa; outro caminho: plataformas `t` (2 de largura, caem)
  c105-106 e c109-110 L25; letra R c108 L21; checkpoint c117.
- C Galeria (123-185): teto até L9; NO `e` c125, pedra 3 `&` c127 (CAN THE EYES SEE YOU?), THEY `h` c130, YES `k` c133,
  HAMMER `y` c136; pilares (3 de altura) c140/149/158/167/176; olhos `Q` c146, c163, c180 L11; nicho c149-151 L20-21
  (parede rachada `X` c152, sacada `=` c153-157 L22 que se alcança do pilar c158): letra O e vida. Morcego c172.
  Pego pelo facho: volta a c124 sem perder vida (`Fort.caught`).
- D Torre (186-219): borda c187-190 L28 (checkpoint c188, CLOCK e IRON), ferro `D` sobe 30 px/s depois de 1,6 s até L14;
  plataformas L25 c192-195, L22 c198-201, L19 c193-196 (pedra 4 `$` c194), L16 c198-201, saída L13 c203-218 → muralhas.
  Letra N c199 L12. Morreu: o ferro volta ao fundo.
- E Muralhas (219-299): checkpoints c222 e c247, FIRE c228, STAR escondida c236, morcegos; tábua `K` c251, poço `m` c255
  (CAN, CAN'T, WE), Guardião `V` c276 L6 (acorda depois de c253); porta `keepgate` c297-298 L7-12 afunda ao fechar o
  painel do Selo. Saída `N` c321. Zona `boost` na arena.
- Guardião (`FORT.warden`): 8 de vida por rodada; derrubado (stun 6 s) leva pisão 2, fogo 1, laser 1/3, martelo 3, bola
  2; fora do stun só bola (2) e fogo (1). Rodadas: fly (voa, bolas a cada 2,4 s) · jump (anda; martelo a cada 3,2 s solta
  ondas: só quem está no ar escapa; `Fort.jumpK` vale na arena) · see (escuro `Fort.dark`, mergulho a cada 3,4 s).
  Morrer: ele dorme, a rodada fica, as bolas somem.
- Selo da Lei (`Save.data.heart.seal` 0-4): pulo duplo só em fases com `seal: true` (o Forte e as próximas); a 1-3 e as
  aprovadas não mudam. Força `FORT.seal.tiers[n].k` (0,6 → 0,95 do pulo).
- Modo teste: o Forte tem trechos e lista própria em `84_testmode.js`.
- Desempenho do fundo (`BG.drawFort`): o céu, as estrelas e a lua já vêm pintados na camada longe (`makeFortFar`);
  `BG.blitPart` desenha só o pedaço visível das camadas grandes; a aurora é feita em meia resolução a cada 2 quadros;
  por dentro (salão, galeria, torre) o céu nem é desenhado. Fundo ≈ 4 ms dentro e ≈ 8 ms fora (a 1-3 ≈ 6 ms).
- Mapa: marco do Forte com telhados violeta, bandeira e janelas âmbar; constelação IRON (`MASTER_WORDS.IRON`).
- Responder na tábua antes de o Guardião acordar já o derruba (ele acorda caído).

## 6. Testes (`node tests/run.js [filtro]`, Playwright, ~3 min)

- `tests/harness.js`: `openGame(browser, {level, echo})` entra direto na fase (sem a chegada: `Game.noIntro`) e troca
  `Game.frame` (o laço em tempo real para): `H.step()` roda a simulação; **as cenas não andam sozinhas** nos testes
  (dirija `Cine.update`/`Birth.update`). `echo: true` (padrão) já começa com o Echo nascido.
- Lições: **nada de vão de 1 bloco entre paredes mais altas que o pulo (≈ 4 tiles)**: vira beco sem saída;
  **teste caminhos com pulos de verdade, não com teletransporte** (a runa alta demais passou num teste que
  teletransportava); cuidado ao teleportar para colunas de buraco (morre e volta ao início); `tryHop` muda
  `Game.simTime` (lustres e tubos dependem dele); `H.noEnemies()` preserva entidades `persist` (gigantes).
- Palácio: `HELPP` (em `tests/run.js`) limpa a apresentação da Echo e tem `HP.attempt` (Alados em várias fases do voo).
- 1-3: `HELP13` tem `spawn` (acorda a gárgula; zera `G.hitstopN`, senão os 3 quadros congelados do pisão engolem o
  spawn), `lure` (de costas até ela chegar, depois olha), `hop` (seta segurada só depois de alguns quadros) e `say`.
  Depois de usar a gárgula como degrau, ande até a ponta da placa antes do pulo seguinte, como o jogador faz.
- `City.tick` (chuva, raios) roda no tempo real (`Game.frame`); nos testes o laço é trocado, então não há raio.
- `HELP13.walk(dir, frames, stop)` anda e pula sozinho ao travar ou na beirada (como o jogador); `HELP13.off(g)` espera um
  portão de laser apagar. Para subir num degrau de 1 bloco (o poste) use `hop` (andando ele passa por cima).
  No painel, a mesma palavra não entra duas vezes (frases com SIGN SIGN não existem para o jogador).
- Toda mudança: `node build.js` e a suíte inteira verde antes do push.

## 7. Próximos passos e ideias anotadas

- **Vozes do ElevenLabs: feito** (a expansão da 1-3 gravou mais 68 falas, ~2.700 créditos). Conector ElevenLabs na conta do dono (plano Creator, ~226 mil créditos; o
  fluxo `COwNUEJ4BcLtDt0Uju1O` guarda todas as gerações). A conta gratuita que conectou sozinha antes (de outra pessoa)
  foi bloqueada pela ElevenLabs e não deve ser usada. Fala nova no jogo = rodar `tools/voice/` (lines → chunks --only-missing → gerar e
  transcrever cada bloco pelo conector → split → build). Gastou ~13 mil créditos até agora (326 falas + testes de voz).
  Frases longas de molde grande (o interruptor) só gravam as regras escritas; o resto a porta repete palavra por palavra.
  Testes de vozes que o dono ouviu: Sloane, Saira, Zoey, Rosie, **Lulu (escolhida)**, Viktoria, Serafina, Briony.

- **Prólogo A Lei das Palavras** (pedido do dono: ensinar logo no início, sem chamar ninguém de burro): mostra, não
  explica; a regra em PT só aparece depois que o jogador usou SMALL. `PROLOGUE` em `10_data.js`. Lembranças: placa na
  escada-fantasma (1-1, `until: 'ghost'`), placa no altar 1 (1-2, `until: 'altar1'`; `Sentence.apply` marca o id da porta).
- **Visual novo da Nexy: no jogo** (o dono pediu as mudanças depois de ver a folha
  https://claude.ai/artifact/9GzkEvZ2PrXqBoJZHtc7qR). `P.drawBody` → `P.drawLook` (pose a partir de vx/vy/walkPhase/
  crouch/held/kickT; `P.poseSpeed` força a pose no mapa e no cartão). Estágio = `NexyLook.stageFor(Save.data.cleared)`
  (rascunho → tinta depois da 1-1 → equipamento depois da 1-2 → núcleo depois da 1-3 → elmo depois do forte → fênix
  depois do castelo), atualizado em `loadLevel` e `toMap` (aviso NEXY EVOLVED uma vez por estágio, `Save.data.met.look`).
  ASSIST → CLASSIC NEXY (`Save.data.assist.classic`) volta ao antigo. Só desenho: colisão e física iguais.
  Uma versão **mais fiel à arte de referência** (armadura roxa de metal estilo robô, elmo de gato, núcleo, garras,
  botas grandes, asas de fênix) foi feita no commit `280a8da`; o dono pediu para **voltar ao visual anterior** (o
  rascunho que evolui, `726c683`) "até decidirmos melhor". Para retomar: `git show 280a8da:src/62_nexy_look.js`.
  O rastro da corrida é a sombra da própria Nexy. Blender: o dono seguiu o conselho de manter o desenho em código.
  **Movimento fluido** (pedido do dono): só desenho, a física não mudou. `NexyLook.rigP` mistura esqueletos (`mix`):
  chão ↔ ar (`P.liftK`, 0,09 s), subida → ápice → queda (`P.avK` pela vy), de pé ↔ agachada (`P.crouchK`, 0,08 s);
  `frame` guarda 16 quadros por passada, velocidade de 0,2 em 0,2, cachecol preso à passada (`sw`: os quadros se
  repetem), cache LRU limitado por memória (`cacheMB`). `P.squash` virou mola (`sqV`), pouso achata conforme
  a queda, virar de lado gira o desenho (`P.turnT`, `CFG.TURN_T`) e no ar o corpo inclina. `P.pose(t)` monta a pose.
  **Nada que lembre um ser diabólico** (chegou ao dono que ela parecia um diabinho): sem cauda (era fina com ponta de
  flecha), orelhas do capuz baixas e redondas (as altas e pontudas pareciam chifres), luvas com luzes redondas em vez
  de garras e menos brilho em volta do olho. Vale para qualquer desenho novo dela.
- **Segredo da 1-1** (pedido do dono, "como no Donkey Kong"; só ele e quem ele contar devem saber, por isso o README
  não explica): os **TRÊS RASTEJANTES** logo no começo (entidade `conga`, `4 5 6` em c21/24/27, no lugar do
  Rastejante solitário de c29). O dono achou a dica aparente demais e pediu que não ficassem "amarrados": agora cada um
  anda do seu jeito (`Conga.free`: velocidade própria, para e vira, cruzam-se; sem corda nem farol) e só no trecho
  `F0..F1` de cada ciclo de 19 s (`Conga.C`) entram no mesmo passo (40 px/s, 112 px de distância, `Conga.tri`); posição
  pelo relógio da simulação (`Conga.pos`). Não mordem, só empurram (`P.enemyContacts`); o pisão amassa e eles voltam
  (`summon`). Indo para a direita em sequência (`Conga.state().on`, ~1,75 s a cada 19 s) o **MURAL** do fundo (`7` em
  c19 L5: grafite apagado, três Rastejantes, riscos I/II/III e um quadradinho onde fica o tijolo; sem texto nem seta)
  brilha de leve.
  Pisão no de trás, no do meio e no da frente segurando o pulo: o 3º quique bate a cabeça no tijolo `j` (kind
  `glitch`) INVISÍVEL em **c28 L3** (o 2º quique para ~36 px abaixo) → `Glitch` (falso erro TO BE NOT FOUND) → WARP
  CARD (`Game.card`, por partida). Comece em c19 (de c18 o bloco HELLO corta o pulo). Histórico: o tijolo ficava em
  c103 L12 (só casco jogado para cima alcançava; no toque nem há ↑), o dono achou impossível e pediu algo que exigisse
  atenção. **CARTÃO DOURADO**: terminar a 1-1 com pontuação máxima (`Game.perfectRun`: todas as palavras, letras,
  criaturas e segredos menos o do cartão) grava `Save.data.goldCard`; daí em diante `loadLevel('1-1')` começa com o
  cartão (aviso na tela de fim, fala `ECHO.lines.goldCard`, Grimório GOLD CARD).
  TO BE ENGINE `T` em c136 (corredor 2): sem cartão a Echo diz "It is a machine. It needs a card."; com cartão:
  tabela (HE = a voz antiga das portas, SHE = a Nexy e a Echo, palavras novas), as 7 ligações (errar não zera mais: a errada vai para o fim da fila), escalada de
  4 frases (A2 → B1) que sobe o nível do tiro. Teletransporte (`Warp`): IS/ARE da barra viram combustível, praça
  final c181 (`LEVELS['1-1'].warp`), vidas = max(vidas, 5), checkpoint ali. Conta 1 segredo a mais na Fluência da 1-1.
- **Tiro da Echo** (`EchoShot`, `SHOT` em `10_data.js`, `Save.data.shot.best`; -1 = não tem): F / Y no controle
  (Y deixa de correr quando o tiro existe) / botão SHOT no toque; mira automática no inimigo mais perto à frente.
  1º tiro paralisa (`e.frozen`: parado, não machuca, vira plataforma `plat`), 2º quebra (+2 orbes); gigantes imunes.
  Cargas por nível, recarga com o tempo, checkpoint e renascer. VOICE MODE: V sem porta perto = escuta (tempo a 30%)
  e STOP/FREEZE/FIRE/SHOOT atira.
- **Tutoriais atualizados** (pedido do dono): tela inicial (C pulso, F tiro, V voz), linha do controle, Grimório com a
  aba **POWERS** (pulso, tiro, voz, Coração, Anel do TO BE, cartão; fechados até conquistar), texto do VOICE MODE.
- Esperando aprovação da 1-2 (com o baú), do TO BE PALACE, da 1-3 (agora com a 2ª metade: poderes, lasers (mira em 8 direções), drones e o Sentinela) e do FORTE. Depois: Casa "PUSH OR PULL?" (saída secreta da
  1-2) e o castelo do Mundo 1 (o Selo da Lei: o pulo duplo já vale lá). A agulha da Bússola aponta para a frente na cena da 1-3.
- Vozes: 602 falas gravadas (a do Forte gravou 131, ~4.700 créditos). Testes do Forte: `HELPF` em `tests/run.js`
  (`law`, `jumpH`, `crusher`, `waitUp`); nos testes, cuidado com `G.hitstopN` (o golpe congela 2-5 quadros).
- Cada fase nova: algo inédito + acréscimo ao Coração + desafio crescente acima do A1 + caminho alternativo + um passo
  a mais no visual rumo à cidade Castlevania cyberpunk.
- Controle de verdade (gamepad) ainda não testado com aparelho físico.
- **Toque (celular)**: o direcional é um disco só (`#dpad`, `Input.initTouch` → `padKeys`): 8 direções pelo ângulo do
  dedo (lados com 60°, diagonais 35°, cima/baixo 50°; o dedo pode sair do disco), então ↑ e ↑ + lado existem no toque
  (mira do LASER, casco para cima). ↑ com lado segurado no toque não abre porta (o botão OPEN continua).
- **Áudio no celular** (`AudioSys.lite`, ponteiro grosso ou UA móvel; o dono reclamou que falhava e estalava): contexto
  com `latencyHint: 'playback'`, reverb de 1,2 s (não 2,6), música com metade dos osciladores, agenda 0,4 s adiantada
  a cada 50 ms, sem `VoiceClips.warm` (decodificar as 600 falas passa de 150 MB) e no máximo 48 falas na memória
  (`VoiceClips.cap/keep`); `AudioSys.wake` retoma o áudio suspenso ao tocar ou voltar para o app.
