# CLAUDE.md · Nexy English World (contexto para continuar sem reler tudo)

Leia isto antes de mexer. O README é para pessoas; este arquivo é o mapa de trabalho.

## 1. O projeto e o dono

- Jogo de plataforma 2D (Super Mario World na jogabilidade + ar gótico de Castlevania, neon-noir) que ensina inglês a
  brasileiros, começando no A1. Um único `index.html` gerado a partir de `src/` (`node build.js`).
- O dono escreve em português, de forma rápida e informal; responda em PT-BR, direto, sem jargão. Ele aprova fase por
  fase. **Fase aprovada não muda de comportamento** sem pedido (1-1 aprovada = commit `3702f14`; os testes a travam).
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
- Voz: `Voice.score` prefere vozes Natural/Neural/Online e do Google; as robóticas do Windows (Zira, David) ficam por
  último. O Echo fala com tom quase natural (pitch 1.05); o dono achou feio o tom esticado de antes. O jogador troca a
  voz em ASSIST → ECHO'S VOICE (salvo em `Save.data.voiceURI`).
- O **Echo** (orbe que segue o Nexy) é o companheiro: fala as palavras, se apresenta na 1ª partida
  (`ECHO.lines.intro`), avisa no escuro e é a luz da cripta. O dono não sabia o que era: sempre apresente as coisas.

## 3. Arquitetura (`src/`, na ordem do build)

| Arquivo | O que tem |
| --- | --- |
| `00_head.html` | CSS/HTML: HUD, HUD do mapa (`#maphud`), painel das portas, baú (`#chest`), telas, toque |
| `10_data.js` | legenda global, `CFG` (física), `LOOK` (brilho), `WORDS`, `CREATURES`, `ECHO`, `MASTER_WORDS`, `PHRASES_PT`, `LEVELS['1-1']`, `WORLDS` (mapa), `HEART`, `Save`, `Flags`, utilitários |
| `12_level_1-2.js` | `LEVELS['1-2']`: legenda extra, blocos, entidades, zonas, alvos (runas), portas/altares/sinos/baú (com a história) |
| `20_audio.js` | `SFX`, `Music` (variantes `world1`/`map`/`nave`, zonas muffle/boost), `Voice.say(text, who, {onBoundary,onEnd})`, `Listen` |
| `30_input_render.js` | `Input` (teclado, toque, **gamepad** em `pollPad`), `R` (escala, sprites, glow, texto) |
| `40_world.js` | `World` (tiles, blocos, runas `setTarget`, zonas, veils, colisão `move`), `BG` (cidade e nave), `Dark`, `FX` |
| `50_entities.js` | `Ents`, `Spawns`, `Enemy`, crawler, casco, orb, letter, capsule, crystal, lantern, checkpoint, goal, pedestal |
| `55_entities2.js` | chandelier, pipe, flyer, thief, giant, bell + `Bells`, life, moon, bigbell, echoride, `drawAltar` |
| `60_player.js` | `P` (plataformas móveis `riding`, forma de Rastejante), `Echo` (fala/balão, luz, alvo YOU), `Cam`, `Doors` |
| `70_game.js` | `Sentence`, `Panel`, `UI`, `Game` (estados, `later()` no tempo da simulação, laço, render com zoom da cena) |
| `72_chest.js` | Baú da Memória (`Chest`), ícones, `HEART_LOOK`, `drawHeart`, cena épica (`Cine`) |
| `75_worldmap.js` | `Transition` (íris/fechadura + cartão "Nexy × vidas"), `WorldMap` (andar, revelar caminhos, toque) |
| `99_boot.js` | `window.NEXY` (API de teste) e `Game.boot()` |

- Estados do `Game.state`: `title`, `map`, `play`, `panel`, `chest`, `cinematic`, `pause`, `grimoire`, `assist`,
  `clearing`, `clear`, `gameover`, `leaving`. `Game.where`: `map` | `level`.
- Fluxo: título → `toMap()` → `WorldMap.tryEnter` → `Transition` → `enterLevel(id, true)` → `finish(exit)` →
  `showClear` → `continueToMap()`.
- Mapas ASCII em `src/levels/*.map` (o build troca `/*MAP:id*/`). A 1-2 é gerada por `tools/gen_map_1-2.py`
  (edite o gerador e rode `python3 tools/gen_map_1-2.py src/levels/1-2.map`).

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
- Checkpoints: c140, c212 (entrada da cripta), c246. Lua (3UP) atrás da parede falsa c248. Vidas: ponte de Alados (3x),
  bloco c143, sinos de primeira, Lua, sacada do campanário, e as do Coração.
- Barra de palavras = 10 nesta fase (`barMax`). YES de reserva só se não tiver um (`ifMissing`).

## 6. Testes (`node tests/run.js [filtro]`, Playwright, ~3 min)

- `tests/harness.js`: `openGame(browser, {level})` entra direto na fase e troca `Game.frame` (o laço em tempo real
  para): `H.step()` roda a simulação; **`Cine` e `Transition` não andam sozinhos** nos testes (dirija `Cine.update`).
- Lições: **teste caminhos com pulos de verdade, não com teletransporte** (a runa alta demais passou num teste que
  teletransportava); cuidado ao teleportar para colunas de buraco (morre e volta ao início); `tryHop` muda
  `Game.simTime` (lustres e tubos dependem dele); `H.noEnemies()` preserva entidades `persist` (gigantes).
- Toda mudança: `node build.js` e a suíte inteira verde antes do push.

## 7. Próximos passos e ideias anotadas

- Esperando aprovação da 1-2 (com o baú). Depois: 1-3, Palácio do To Be (saída secreta da 1-1), Casa "PUSH OR PULL?"
  (saída secreta da 1-2), forte e castelo do Mundo 1.
- Cada fase nova: algo inédito + acréscimo ao Coração + desafio crescente acima do A1 + caminho alternativo + um passo
  a mais no visual rumo à cidade Castlevania cyberpunk.
- Controle de verdade (gamepad) ainda não testado com aparelho físico.
