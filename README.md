# Nexy English World · World 1 "Hello World"

Plataforma 2D neon-noir para ensinar inglês (nível A1) a brasileiros. Tudo está em um único arquivo:
`index.html` (HTML, CSS e JavaScript puro, sem imagens nem áudios externos). Abra o arquivo no navegador.

## Versões

| Fase | Status | Commit |
| --- | --- | --- |
| 1-1 · Hello World | aprovada | `3702f14` |
| 1-2 · Who are you? | aguardando aprovação | branch `claude/jolly-faraday-8mbshk` |

## Como o jogo flui

Tela inicial → **mapa do Mundo 1** → fase → tela de fim → volta ao mapa. Como no Super Mario World:

- No mapa, o Nexy anda pelos caminhos abertos (setas, alavanca do controle ou toque numa fase) e entra com Enter ou pulo.
- Cada saída abre um caminho novo, que se desenha ponto a ponto. A saída normal da 1-1 abre a 1-2; a secreta abre o
  Palácio do To Be. A normal da 1-2 abre a 1-3; a secreta abre a Casa dos Falsos Amigos "PUSH OR PULL?".
- No céu do mapa, as letras de **HELLO** (1-1) e **WORLD** (1-2) acendem como uma constelação conforme são achadas.
- Vidas e orbes atravessam as fases. Letras, saídas e a melhor Fluência ficam salvas por fase.
- Transições: ao entrar numa fase, uma íris neon fecha sobre o Nexy e mostra o cartão da fase (nome, letras já
  achadas e "Nexy × vidas"). Ao sair pela saída secreta, a íris fecha numa **fechadura**. No fim de jogo, o Nexy volta
  ao mapa com as vidas recarregadas.

## Controles

| Teclado | Controle (gamepad) | Ação |
| --- | --- | --- |
| ← → ou A D | direcional / alavanca | mover (no mapa: andar) |
| seta, solta e aperta de novo logo em seguida (segurando) | | correr até soltar a seta |
| ↓ ou S | ↓ | agachar |
| Shift (segurar) | X, Y, LB, RB, LT, RT | correr e carregar a carapaça |
| Z ou Espaço | A / ✕ | pular (segure para ir mais alto); no mapa, entrar na fase |
| X | B / ○ | pulo giratório |
| ↑ ou W | ↑ | abrir porta / falar no pedestal ou altar |
| Q | SELECT / BACK | soltar o item da reserva |
| H | Y (no painel) | dica (tradução da inscrição) |
| V | | falar a frase (só com VOICE MODE ligado) |
| M | | som liga/desliga |
| Esc ou P | START | pausa |

No painel das portas, com o controle: A coloca/confirma, B volta, X apaga a última palavra, Y pede dica e o
direcional escolhe a palavra. Nos menus, o direcional navega (segurar repete).

No celular aparecem botões de toque (◀ ▼ ▶, RUN, JUMP, SPIN e OPEN perto das portas). O toque duplo em ◀ ou ▶ também
faz correr. No mapa, basta tocar numa fase para o Nexy andar até ela; tocar na fase onde ele está entra nela.

## Fase 1-2 · WHO ARE YOU? (a Nave dos Ecos)

O Nexy entra na catedral: nave, cripta e campanário, terminando no telhado, com o céu e a cidade da 1-1 lá embaixo.
Palavra-mestra: **WORLD**. Na 1-2 a barra de palavras cresce para **10** espaços.

**A mecânica nova: o pronome decide quem a frase atinge.**

| Frase | O que acontece |
| --- | --- |
| IT IS BIG / SMALL | a pedra com a runa IT cresce ou encolhe |
| THEY ARE SMALL / BIG | os três Rastejantes gigantes encolhem (e viram Rastejantes comuns) ou crescem de novo |
| YOU ARE BIG / SMALL | o Echo cresce (no telhado, vira uma plataforma que leva o Nexy) ou encolhe |
| WE ARE BIG | o Nexy e o Echo juntos |
| IT ARE SMALL, THEY IS… | concordância errada: o alvo treme, confuso, e nada acontece |

**As cinco seções**

1. **Portal da Nave.** Altar "WHAT IS BIG?": IT IS BIG ergue a runa até a sacada da letra W. Primeiro Alado.
   Porta "WHO ARE YOU?" → I AM **NEXY** (I AM YOU faz o reflexo do Nexy acenar no vidro).
2. **Os Lustres.** Abismo atravessado de lustre em lustre (eles balançam em fases opostas). Ponte de três Alados:
   quem emenda 3 pisões sobe até uma vida escondida. Porta "ARE YOU A CRAWLER?" → NO, I AM NOT
   (com YES, a porta acredita e o Nexy vira Rastejante por alguns segundos).
3. **O Coro dos Sinos.** Portão "HOW ARE YOU?": toque os sinos na ordem I → AM → FINE (o AM só do degrau; o FINE só
   de cima do lustre). Ordem errada: o eco repete a frase e os sinos zeram. De primeira: uma vida cai do grande sino.
   Tubos do órgão sobem e descem na batida da música (do alto do tubo 2 sai o SMALL). Corredor do **Ladrão de
   Palavras**: ele leva a última palavra da barra; um pisão devolve; se ele fugir, a palavra volta para o bloco.
4. **A Cripta.** Escura e de teto baixo; o Echo é a luz ("It is dark. I am your light."). Altar "BIG OR SMALL?" com os
   dois alvos: os gigantes (THEY) e a pedra (IT). No fim, o **Baú da Memória** e o **Muro do Silêncio** (veja abaixo).
   Atrás do muro, a câmara da luz; uma parede falsa debaixo da torre esconde a **Lua** (3 vidas).
5. **O Campanário.** Subida vertical: tubos, sacada com vida, plataformas, lustre e o telhado. Atalho-fantasma
   (IS e ARE na barra viram degraus). Porta "IS IT A DOOR?" → YES, IT IS. No telhado, o altar "WHO IS BIG?":
   **IT IS BIG** faz a ponte para o fim normal; **YOU ARE BIG** faz o Echo levar o Nexy pelo céu até o fim secreto.

Vidas: ponte de Alados (3x), bloco logo depois da porta 2, sinos de primeira, Lua (3), meio do campanário e as que o
Coração dá.

### O Baú da Memória e o Coração das Palavras

Uma leitura curta sobre a jornada do Nexy ("Nexy is small. The city is dark…"), em 5 passos pensados com a ciência do
aprendizado:

1. **4 palavras novas** antes de ler (DARK, LIGHT, AFRAID, STRONG), com desenho, voz e tradução.
2. **Leitura** em 3 páginas, com a voz lendo e cada palavra acendendo (karaokê); clique numa palavra para ouvi-la;
   H mostra a tradução.
3. **3 perguntas** (primeiro a ideia geral, depois o detalhe). Errar mostra a frase do texto que tem a resposta; tenta
   de novo, sem punição.
4. **A Escalada** (opcional, acima do A1): 4 degraus de dificuldade crescente (A2 → B1+: passado, comparação,
   "because", inferência), uma tentativa cada. Cada acerto sobe o **Coração das Palavras** de nível e muda a cor dele:
   ciano (quebra o muro) → magenta (+ escudo) → incandescente (+ vida) → prisma (+ 30 orbes) → **Coroa das Palavras**
   (+ vida). Errar encerra a escalada, mas o poder conquistado fica. O melhor nível é salvo e aparece no mapa.
5. **"I AM STRONG."**: o aluno monta (ou fala) a frase em 1ª pessoa. Escolher AFRAID apaga a luz e o Echo pergunta
   "Are you?".

Então vem a cena (na pegada God of War): silêncio, faixas de cinema, as palavras que o aluno aprendeu giram em volta do
Nexy e entram nele, três tambores de guerra e ele cresce, o grito de batalha ("I AM STRONGER THAN YESTERDAY!" no nível
máximo), a investida em câmera lenta, o impacto congelado, o Muro do Silêncio explode e a luz entra. Enter pula a cena.

**Quem não consegue** passar pelo baú tem outro caminho: um poço escuro antes do muro, subindo com um quique num
Alado, e uma passagem baixa por cima do muro.

## O Echo

O orbe que segue o Nexy é o **Echo**, o companheiro. Na primeira partida ele se apresenta ("Hello! I am Echo. I am
your friend.", com legenda), fala as palavras em inglês, ilumina o escuro e é o alvo de YOU na 1-2. Tem ficha no
Grimório (aba CREATURES).

A voz é a do próprio aparelho. O jogo escolhe sozinho a mais natural (as "Natural" do Edge/Windows 11 e as do Google
no Chrome soam bem; as antigas do Windows, como Zira e David, são robóticas). Para trocar: pausa → ASSIST →
**ECHO'S VOICE**; cada toque passa para a próxima voz e o Echo se apresenta com ela. A escolha fica salva.

Trilha: a mesma progressão da 1-1, a 100 BPM, com o órgão "respondendo" à melodia, coro e sino; abafada na cripta e
em crescendo no campanário.

## Estrutura do projeto

O jogo que vai para o jogador é só o `index.html`, autocontido. Ele é **gerado** a partir de `src/`:

| Arquivo | O que tem |
| --- | --- |
| `src/00_head.html` | HTML, CSS, HUD, HUD do mapa, painel das portas e telas |
| `src/10_data.js` | legenda do mapa, `CFG` (física), `LOOK` (brilho), palavras, fase 1-1, mapa do mundo (`WORLDS`), save e flags |
| `src/12_level_1-2.js` | dados da fase 1-2 (legenda extra, blocos, alvos, portas, altares, sinos) |
| `src/20_audio.js` | efeitos sintetizados, música em camadas com variações por fase, voz e reconhecimento de fala |
| `src/30_input_render.js` | teclado, toque, controle (gamepad), escala da tela e cache dos brilhos |
| `src/40_world.js` | tiles, blocos, runas, colisão, zonas, fundos em parallax (cidade e nave), escuridão e partículas |
| `src/50_entities.js` | inimigos, itens, portais e pedestal |
| `src/55_entities2.js` | peças da 1-2: lustres, tubos, Alado, Ladrão, gigantes, sinos, vidas, Lua, Echo gigante, altar |
| `src/60_player.js` | jogador (plataformas móveis, forma de Rastejante), Echo, câmera e desenho das portas |
| `src/70_game.js` | frases, painel, interface e laço principal |
| `src/72_chest.js` | Baú da Memória (leitura, perguntas, escalada) e a cena do Coração |
| `src/75_worldmap.js` | transições (íris e fechadura) e o mapa-múndi |
| `src/99_boot.js` | API de teste no console (`NEXY`) e partida |
| `src/levels/1-1.map` | mapa ASCII da 1-1 (23 linhas × 208 colunas) |
| `src/levels/1-2.map` | mapa ASCII da 1-2 (40 linhas × 312 colunas) |
| `build.js` | junta tudo em `index.html` |
| `tools/gen_map_1-2.py` | gerador do mapa da 1-2 (edite e rode para regenerar `src/levels/1-2.map`) |
| `CLAUDE.md` | contexto de trabalho (decisões, arquitetura, regras) para continuar o projeto |
| `tests/` | testes de regressão da 1-1, da 1-2 e do mapa (Playwright + Chromium) |

```
node build.js          # gera index.html a partir de src/
node build.js --check  # confere se index.html está em dia com src/
npm test               # confere o build e roda os testes (precisa de: npm i && npx playwright install chromium)
```

Edite sempre em `src/` e rode `node build.js`. Mudanças feitas direto no `index.html` são apagadas no próximo build.

Para testar uma fase direto, sem passar pelo mapa: no console do navegador, `NEXY.Game.enterLevel('1-2')`.

## Como editar as fases

- **Mapa:** `src/levels/<fase>.map`, um caractere por tile de 32 px. A legenda global está comentada no início de
  `src/10_data.js` (`#` pedra, `=` plataforma, `?` bloco, `C` Rastejante, `K` Casco etc.); a legenda extra da 1-2 está
  no início de `src/12_level_1-2.js`.
- **Conteúdo dos blocos:** `LEVELS[id].blocks` liga cada letra minúscula do mapa a um bloco e ao que ele libera
  (`{ word: 'KEY', rise: 3.7 }`, `{ crystal: true }`, `{ orbs: 3 }`, `{ letter: 3 }`, `{ life: 1 }`;
  `ifMissing: true` só dá a palavra se o jogador ainda não a tem).
- **Portas, pedestais e altares:** `LEVELS[id].doors`. Cada um tem `inscription`, `mold` (com `_` para as lacunas),
  `accept` (frases certas e seus resultados: `open`, `transform`, `exit`, `target`, `echo`, `we`) e `enact` (frases
  "erradas" que a porta encena: `morph`, `mirror`, `crawler`, `confused`; `*` vale qualquer palavra).
- **Alvos das frases (1-2):** `LEVELS['1-2'].targets`. Runas: coluna/linha de base, de onde crescem (`anchor`) e os
  tamanhos `small`/`big` em tiles. O passeio do Echo gigante fica em `doors.altar3.ride` (onde espera e o caminho).
- **Sinos:** caracteres `5`–`8` em `LEVELS['1-2'].entities` (palavra e portão); o portão é a porta `gate`
  (`kind: 'bells'`), com `reward` = de onde cai a vida de quem acerta de primeira.
- **Mapa do mundo:** `WORLDS` em `src/10_data.js`: nós (posição e ícone), caminhos (`unlock: [fase, saída]` e pontos
  da curva) e o mapa pequeno da tela de fim. Uma fase sem dados em `LEVELS` aparece como "SOON".
- **Palavras:** `WORDS` guarda classe gramatical, tradução e a linha de lore do Grimório.

## Blocos-fantasma: a palavra que você carrega vira chão

Os blocos tracejados `M`, `I` e `R` (AM, IS, ARE) só ficam sólidos enquanto a palavra deles estiver na
sua barra. Pegou AM, o degrau AM acende; usou AM numa porta, ele volta a ser fantasma. Na seção 2 da 1-1 as três
palavras estão antes da escada (ARE fica no bloco acima da segunda plataforma flutuante), então dá para
subir até os orbes e a lanterna lá no alto antes de gastar o AM na porta "HOW ARE YOU?". Na 1-2, IS e ARE formam um
atalho no campanário.

A flag `palaces.toBe` continua existindo para o futuro Palácio do To Be: com ela verdadeira, todos os
blocos-fantasma ficam sólidos, mesmo sem as palavras. Para testar, abra o jogo com `#tobe` no fim do
endereço (ou `?toBe=1`), ou rode no console `NEXY.setFlag('palaces.toBe', true)`.

## Combo de pisões

Cada pisão seguido, sem tocar o chão, deixa o quique mais alto (`CFG.COMBO_BOUNCE = [1, 1.38, 1.55]`):
segurando o pulo, o 1º pisão sobe cerca de 7 tiles, o 2º cerca de 13 e o 3º cerca de 16. Na tela aparece
"1x", "2x"… luminoso no ponto do pisão, e o jogador brilha mais forte enquanto o combo durar. O combo
não é falado em voz alta: o retorno é só visual e sonoro (a partir do 8º pisão, cada um dá uma vida extra).

## Brilho

O brilho de contornos, bordas e da luz de recorte fica num único ajuste no topo do script:
`const LOOK = { bright: 2, bg: 1.6, rim: 1.15 }`. Valores maiores clareiam as silhuetas; `bg` vale só para o fundo.

## Depois do jogo completo: versão para Android (Google Play)

O jogo já nasce pensando no celular: controles de toque, toque no mapa, tela que se ajusta à largura, nada de
arquivos externos além das fontes e tudo salvo no aparelho. Quando todos os mundos estiverem prontos, o caminho
previsto é empacotar o mesmo `index.html` num app (Capacitor ou uma Trusted Web Activity), embutir as fontes,
trocar a voz e o microfone pelos recursos nativos do Android e publicar na Google Play.
