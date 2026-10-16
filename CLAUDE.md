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

## 2. Visão e regras de design (decididas por ele; valem para as próximas fases)

- **Cada fase traz algo novo** (mecânica, criatura, item, cena). Nada de repetir fórmula; vocabulário novo sempre
  dentro da história do Nexy.
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
- **Vozes gravadas (ElevenLabs)**: 326 falas em `src/voice/` (MP3 + `manifest.json`), embutidas pelo build.
  Elenco: **Echo = Lulu** (feminina e sensual, escolhida pelo dono), **narrador do Baú = Elder Rowan** (a voz antiga
  das portas, pedida pelo dono no lugar do Lawrence; `[warmly]`, 1,08×), **portas e altares = Elder Rowan** (`[slowly]`,
  acelerada 1,15× no corte). Não imitar vozes de pessoas reais (ele citou Morgan Freeman: só a referência de idoso e grave). A Echo agora é **ela** nos textos em português ("a Echo", "sua amiga").
  Falas sem gravação: a porta repete palavra por palavra; senão outra voz gravada; senão a voz do aparelho
  (`Voice.score` prefere Natural/Neural/Google). ASSIST → ECHO'S VOICE alterna "Lulu · studio" e as vozes do aparelho.
  Como gerar falas novas: `tools/voice/README.md`.
- O **Echo** (orbe que segue o Nexy) é o companheiro: fala as palavras, se apresenta na 1ª partida
  (`ECHO.lines.intro`), avisa no escuro e é a luz da cripta. O dono não sabia o que era: sempre apresente as coisas.

## 3. Arquitetura (`src/`, na ordem do build)

| Arquivo | O que tem |
| --- | --- |
| `00_head.html` | CSS/HTML: HUD, HUD do mapa (`#maphud`), painel das portas, baú (`#chest`), telas, toque |
| `10_data.js` | legenda global, `CFG` (física), `LOOK` (brilho), `WORDS`, `CREATURES`, `ECHO`, `MASTER_WORDS`, `PHRASES_PT`, `LEVELS['1-1']`, `WORLDS` (mapa), `HEART`, `Save`, `Flags`, utilitários |
| `12_level_1-2.js` | `LEVELS['1-2']`: legenda extra, blocos, entidades, zonas, alvos (runas), portas/altares/sinos/baú (com a história) |
| `14_level_palace.js` | `LEVELS.palace` (TO BE PALACE): legenda, alvos do passado (`look`: memory/knight/gate, `ghost`, `past`), altares, relógios, interruptor |
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
| `62_nexy_look.js` | `NexyLook` (o visual do Nexy: esqueleto `rig`, camadas por estágio `paint`, quadros em cache `sprite`, `stageFor(cleared)`), `NEXY_STAGES`. Também usado por `tools/look_sheet.js` (não pode depender do jogo) |
| `75_worldmap.js` | `Transition` (íris/fechadura + cartão "Nexy × vidas"), `WorldMap` (andar, revelar caminhos, toque) |
| `78_palace.js` | TO BE PALACE: entidades `knight` e `beswitch`, `Palace` (pulso vê o passado `ping`, `drawGhost`/`drawTarget`/`statue`/`drawClock`, chão-espelho `drawMirror`, `drawRing`), `PalaceIntro` (lembrança + tabela, `Save.data.met.palace`), `PalaceSwitch` (cena do interruptor), `BG.drawPalace` |
| `99_boot.js` | `window.NEXY` (API de teste) e `Game.boot()` |

- Cenas: `Game.scene()` devolve a cena ativa (`Cine`, `Birth`, `Prologue`, `Glitch`, `Warp`, `PalaceSwitch`, `PalaceIntro`, `Arrival`); todas têm `zoom`, `sat`, `letter`,
  `timeScale`, `update`, `key`, `drawWorld`, `drawScreen`. `Game.echoBorn` = o Echo já existe nesta partida (na 1-1
  começa falso; a porta com `birth: 'echo'` dispara `Birth`).
- Estados do `Game.state`: `title`, `map`, `play`, `panel`, `chest`, `cinematic`, `pause`, `grimoire`, `assist`,
  `clearing`, `clear`, `gameover`, `leaving`. `Game.where`: `map` | `level`.
- Fluxo: título → `toMap()` → `WorldMap.tryEnter` → `Transition` → `enterLevel(id, true)` → `finish(exit)` →
  `showClear` → `continueToMap()`.
- Mapas ASCII em `src/levels/*.map` (o build troca `/*MAP:id*/`). A 1-2 é gerada por `tools/gen_map_1-2.py`
  (edite o gerador e rode `python3 tools/gen_map_1-2.py src/levels/1-2.map`); o palácio por `tools/gen_map_palace.py`.
- Frases: `accept` → `Sentence.apply` (tipos `open`, `transform`, `exit`, `target`, `targets` (vários, um de cada vez),
  `echo`, `we`, `beswitch`); `enact` → `Sentence.enact` (`morph`, `mirror`, `crawler`, `confused` com alvo único ou
  lista); qualquer `enact` pode ter `tip: {en, pt}` = a Echo explica o erro 0,5 s depois (sem dar a frase pronta).
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
- Altar 2 tem `nudge`: depois de qualquer frase certa (até IT IS SMALL, que não tira os gigantes) e quando o Nexy
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
- Erros têm `tip` da Echo ("Not today. Yesterday!", "They? Not was!", "Nexy is he!", "Yesterday is the past!").
- 1ª visita: `PalaceIntro` (ontem cheio de luz, hoje escuro, tabela TODAY/YESTERDAY; Esc pula). Depois a Echo lembra
  do pulso (`ECHO.lines.past`). Cavaleiro: pisão comum só tine (`clang`, quica), giro/casco/tiro duplo quebram.
- Visual novo: chão-espelho (`level.mirror`), fundo do palácio com relógio gigante (ponteiros para trás até o
  interruptor), música `palace` (Ré menor, 84 BPM, tique-taque).

## 6. Testes (`node tests/run.js [filtro]`, Playwright, ~3 min)

- `tests/harness.js`: `openGame(browser, {level, echo})` entra direto na fase (sem a chegada: `Game.noIntro`) e troca
  `Game.frame` (o laço em tempo real para): `H.step()` roda a simulação; **as cenas não andam sozinhas** nos testes
  (dirija `Cine.update`/`Birth.update`). `echo: true` (padrão) já começa com o Echo nascido.
- Lições: **nada de vão de 1 bloco entre paredes mais altas que o pulo (≈ 4 tiles)**: vira beco sem saída;
  **teste caminhos com pulos de verdade, não com teletransporte** (a runa alta demais passou num teste que
  teletransportava); cuidado ao teleportar para colunas de buraco (morre e volta ao início); `tryHop` muda
  `Game.simTime` (lustres e tubos dependem dele); `H.noEnemies()` preserva entidades `persist` (gigantes).
- Palácio: `HELPP` (em `tests/run.js`) limpa a apresentação da Echo e tem `HP.attempt` (Alados em várias fases do voo).
- Toda mudança: `node build.js` e a suíte inteira verde antes do push.

## 7. Próximos passos e ideias anotadas

- **Vozes do ElevenLabs: feito.** Conector ElevenLabs na conta do dono (plano Creator, ~226 mil créditos; o
  fluxo `COwNUEJ4BcLtDt0Uju1O` guarda todas as gerações). A conta gratuita que conectou sozinha antes (de outra pessoa)
  foi bloqueada pela ElevenLabs e não deve ser usada. Fala nova no jogo = rodar `tools/voice/` (lines → chunks --only-missing → gerar e
  transcrever cada bloco pelo conector → split → build). Gastou ~13 mil créditos até agora (326 falas + testes de voz).
  Frases longas de molde grande (o interruptor) só gravam as regras escritas; o resto a porta repete palavra por palavra.
  Testes de vozes que o dono ouviu: Sloane, Saira, Zoey, Rosie, **Lulu (escolhida)**, Viktoria, Serafina, Briony.

- **Prólogo A Lei das Palavras** (pedido do dono: ensinar logo no início, sem chamar ninguém de burro): mostra, não
  explica; a regra em PT só aparece depois que o jogador usou SMALL. `PROLOGUE` em `10_data.js`. Lembranças: placa na
  escada-fantasma (1-1, `until: 'ghost'`), placa no altar 1 (1-2, `until: 'altar1'`; `Sentence.apply` marca o id da porta).
- **Visual novo do Nexy: no jogo** (o dono pediu as mudanças depois de ver a folha
  https://claude.ai/artifact/9GzkEvZ2PrXqBoJZHtc7qR). `P.drawBody` → `P.drawLook` (pose a partir de vx/vy/walkPhase/
  crouch/held/kickT; `P.poseSpeed` força a pose no mapa e no cartão). Estágio = `NexyLook.stageFor(Save.data.cleared)`
  (rascunho → tinta depois da 1-1 → equipamento depois da 1-2 → núcleo depois da 1-3 → elmo depois do forte → fênix
  depois do castelo), atualizado em `loadLevel` e `toMap` (aviso NEXY EVOLVED uma vez por estágio, `Save.data.met.look`).
  ASSIST → CLASSIC NEXY (`Save.data.assist.classic`) volta ao antigo. Só desenho: colisão e física iguais.
- **Segredo da 1-1** (pedido do dono, "como no Donkey Kong"; só ele e quem ele contar devem saber, por isso o README
  não explica): tijolo `j` (kind `glitch`) INVISÍVEL em c103 L12, colado na torre da porta 2, acima do checkpoint c104.
  Só casco subindo bate (`solidFor`; a cabeça passa reto; o pulso só faz piscar). Casco-guarda J (c107) → segurar
  corrida, encostar na torre, ↑ e soltar → `Glitch` (falso erro TO BE NOT FOUND) → WARP CARD (`Game.card`, por partida).
  TO BE ENGINE `T` em c136 (corredor 2): sem cartão a Echo diz "It is a machine. It needs a card."; com cartão:
  tabela (HE = Nexy, SHE = Echo, palavras novas), 7 ligações certas SEGUIDAS (errar embaralha e recomeça), escalada de
  4 frases (A2 → B1) que sobe o nível do tiro. Teletransporte (`Warp`): IS/ARE da barra viram combustível, praça
  final c181 (`LEVELS['1-1'].warp`), vidas = max(vidas, 5), checkpoint ali. Conta 1 segredo a mais na Fluência da 1-1.
- **Tiro da Echo** (`EchoShot`, `SHOT` em `10_data.js`, `Save.data.shot.best`; -1 = não tem): F / Y no controle
  (Y deixa de correr quando o tiro existe) / botão SHOT no toque; mira automática no inimigo mais perto à frente.
  1º tiro paralisa (`e.frozen`: parado, não machuca, vira plataforma `plat`), 2º quebra (+2 orbes); gigantes imunes.
  Cargas por nível, recarga com o tempo, checkpoint e renascer. VOICE MODE: V sem porta perto = escuta (tempo a 30%)
  e STOP/FREEZE/FIRE/SHOOT atira.
- **Tutoriais atualizados** (pedido do dono): tela inicial (C pulso, F tiro, V voz), linha do controle, Grimório com a
  aba **POWERS** (pulso, tiro, voz, Coração, Anel do TO BE, cartão; fechados até conquistar), texto do VOICE MODE.
- Esperando aprovação da 1-2 (com o baú) e do TO BE PALACE. Depois: 1-3, Casa "PUSH OR PULL?" (saída secreta da 1-2),
  forte e castelo do Mundo 1.
- Cada fase nova: algo inédito + acréscimo ao Coração + desafio crescente acima do A1 + caminho alternativo + um passo
  a mais no visual rumo à cidade Castlevania cyberpunk.
- Controle de verdade (gamepad) ainda não testado com aparelho físico.
