# Nexy English World · World 1 "Hello World"

Plataforma 2D neon-noir para ensinar inglês (nível A1) a brasileiros. Tudo está em um único arquivo:
`index.html` (HTML, CSS e JavaScript puro, sem imagens nem áudios externos). Abra o arquivo no navegador.

## Versões

| Fase | Status | Commit |
| --- | --- | --- |
| 1-1 · Hello World | aprovada em `3702f14`; nova abertura com o nascimento da Echo aguardando aprovação | branch |
| 1-2 · Who are you? | aguardando aprovação | branch `claude/jolly-faraday-8mbshk` |
| TO BE PALACE (saída secreta da 1-1) | aguardando aprovação | branch `claude/jolly-faraday-8mbshk` |
| 1-3 · Where is it? | aguardando aprovação | branch `claude/jolly-faraday-8mbshk` |

## Como o jogo flui

Tela inicial → **mapa do Mundo 1** → fase → tela de fim → volta ao mapa. Como no Super Mario World:

- No mapa, o Nexy anda pelos caminhos abertos (setas, alavanca do controle ou toque numa fase) e entra com Enter ou pulo.
- Cada saída abre um caminho novo, que se desenha ponto a ponto. A saída normal da 1-1 abre a 1-2; a secreta abre o
  Palácio do To Be. A normal da 1-2 abre a 1-3; a secreta abre a Casa dos Falsos Amigos "PUSH OR PULL?".
- No céu do mapa, as letras de **HELLO** (1-1) e **WORLD** (1-2) acendem como uma constelação conforme são achadas.
  As outras fases têm a sua palavra-mestra (palácio: **TOBE**; 1-3: **CITY**), que aparece no cartão e no fim da fase.
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
| ↑ ou W | ↑ | abrir porta / falar no pedestal ou altar / ler o mapa da cidade |
| Q | SELECT / BACK | soltar o item da reserva |
| H | Y (no painel) | dica (tradução da inscrição) |
| C | LB | pulso da Echo (revela o escondido; no palácio, o passado; na cidade, a caixa escondida) |
| F | Y (depois de ganhar o tiro; antes disso Y corre) | tiro da Echo: o 1º paralisa, o 2º quebra |
| V | | falar a frase na porta (VOICE MODE ligado); longe das portas, com o tiro: segure V e diga STOP! |
| M | | som liga/desliga |
| Esc ou P | START | pausa |

Tudo o que o Nexy e a Echo já sabem fazer fica no **Grimório → aba POWERS** (pulso, tiro, voz, Coração, Anel do TO
BE, Bússola das Palavras, cartão), com o botão e o que cada poder faz. O que ainda não foi conquistado aparece fechado.

No painel das portas, com o controle: A coloca/confirma, B volta, X apaga a última palavra, Y pede dica e o
direcional escolhe a palavra. Nos menus, o direcional navega (segurar repete).

No celular aparecem botões de toque (◀ ▼ ▶, RUN, JUMP, SPIN, OPEN perto das portas, ECHO depois que a Echo nasce e
SHOT depois que o tiro é conquistado). O toque duplo em ◀ ou ▶ também
faz correr. No mapa, basta tocar numa fase para o Nexy andar até ela; tocar na fase onde ele está entra nela.

## Fase 1-2 · WHO ARE YOU? (a Nave dos Ecos)

O Nexy entra na catedral: nave, cripta e campanário, terminando no telhado, com o céu e a cidade da 1-1 lá embaixo.
Palavra-mestra: **WORLD**. Na 1-2 a barra de palavras cresce para **10** espaços.

**A mecânica nova: o pronome decide quem a frase atinge.**

| Frase | O que acontece |
| --- | --- |
| IT IS BIG / SMALL | a pedra com a runa IT cresce ou encolhe |
| THEY ARE SMALL / BIG | os três Rastejantes gigantes encolhem (e viram Rastejantes comuns) ou crescem de novo |
| YOU ARE BIG / SMALL | a Echo cresce (no telhado, vira uma plataforma que leva o Nexy) ou encolhe |
| WE ARE BIG | o Nexy e a Echo juntos |
| IT ARE SMALL, THEY IS… | concordância errada: o alvo treme, confuso, e nada acontece |

**As cinco seções**

1. **Portal da Nave.** Altar "WHAT IS BIG?": IT IS BIG ergue a runa até a sacada da letra W. Primeiro Alado.
   Porta "WHO ARE YOU?" → I AM **NEXY** (I AM YOU faz o reflexo do Nexy acenar no vidro).
2. **Os Lustres.** Abismo atravessado de lustre em lustre (eles balançam em fases opostas), com checkpoint no primeiro pilar.
   Ponte de três Alados: quem emenda 3 pisões sobe até uma vida escondida. Porta "ARE YOU A CRAWLER?" → NO, I AM NOT
   (com YES, a porta acredita e o Nexy vira Rastejante por alguns segundos).
3. **O Coro dos Sinos.** Portão "HOW ARE YOU?": toque os sinos na ordem I → AM → FINE (o AM só do degrau; o FINE só
   de cima do lustre). Ordem errada: o eco repete a frase e os sinos zeram. De primeira: uma vida cai do grande sino.
   Tubos do órgão sobem e descem na batida da música (do alto do tubo 2 sai o SMALL). Corredor do **Ladrão de
   Palavras**: ele leva a última palavra da barra; um pisão devolve; se ele fugir, a palavra volta para o bloco.
4. **A Cripta.** Escura e de teto baixo; a Echo é a luz ("It is dark. I am your light."). Altar "BIG OR SMALL?" com os
   dois alvos: os gigantes (THEY) e a pedra (IT): **THEY ARE SMALL** e **IT IS SMALL** abrem o túnel. Logo depois do
   altar, um bloco "?" é o **poço de palavras**: cada batida dá a próxima palavra que falta (THEY, ARE, SMALL, IT, IS),
   para ninguém ficar preso sem o SMALL dos tubos do órgão. Uma frase certa que não abre nada (YOU ARE BIG...) faz a Echo
   dizer o que ainda bloqueia. No fim, o **Baú da Memória** e o **Muro do Silêncio** (veja abaixo).
   Atrás do muro, a câmara da luz; uma parede falsa debaixo da torre esconde a **Lua** (3 vidas).
5. **O Campanário.** Subida vertical: tubos, sacada com vida, plataformas, lustre e o telhado. Atalho-fantasma
   (IS e ARE na barra viram degraus). Porta "IS IT A DOOR?" → YES, IT IS. No telhado, o altar "WHO IS BIG?":
   **IT IS BIG** faz a ponte para o fim normal; **YOU ARE BIG** faz a Echo levar o Nexy pelo céu até o fim secreto.

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
5. **"I AM STRONG."**: o aluno monta (ou fala) a frase em 1ª pessoa. Escolher AFRAID apaga a luz e a Echo pergunta
   "Are you?".

Então vem a cena (na pegada God of War): silêncio, faixas de cinema, as palavras que o aluno aprendeu giram em volta do
Nexy e entram nele, três tambores de guerra e ele cresce, o grito de batalha ("I AM STRONGER THAN YESTERDAY!" no nível
máximo), a investida em câmera lenta, o impacto congelado, o Muro do Silêncio explode e a luz entra. Enter pula a cena.

**Quem não consegue** passar pelo baú tem outro caminho: um poço escuro antes do muro, subindo com um quique num
Alado, e uma passagem baixa por cima do muro.

## A Lei das Palavras: o prólogo (só na primeira partida)

Antes de pisar no mundo, o jogo mostra as três leis em vez de explicá-las. No escuro, a voz antiga diz "In this world,
words are magic." As letras de **HELLO** caem e acendem o chão onde o Nexy pousa ("Words are the floor."). Um
Rastejante pequenino aparece; no ar surge **IT IS BIG.** e ele vira um gigante no caminho ("What you say is true.").
Então é a vez do jogador: **IT IS ___.** com BIG e SMALL. BIG o deixa ainda maior (sem castigo: o mundo só obedece);
SMALL o encolhe e ele foge. Só depois disso a regra ganha nome: "Quer que algo fique pequeno? Diga que ele É pequeno."
No fim, o quadro THE LAW OF WORDS. Esc pula, Enter avança, e HELLO fica gravado no primeiro chão. A lei volta mais
tarde, na hora em que vale: placa WORDS ARE THE FLOOR na escada-fantasma da 1-1, WHAT YOU SAY IS TRUE no primeiro
altar da 1-2, e as dicas da Echo na cripta lembram o começo.

## Um segredo na 1-1 e o tiro da Echo

Existe uma máquina estranha no corredor depois da porta 2: a **TO BE ENGINE** ("TO BE OR NOT TO BE?"). Sem cartão, ela
não liga. Onde está o cartão é segredo (dica: nem tudo o que parece defeito é defeito). Com ele, a máquina ensina o
verbo TO BE inteiro (I AM, YOU ARE, **HE** IS = o Nexy, **SHE** IS = a Echo, IT IS, WE ARE, THEY ARE), pede as 7
ligações certas seguidas e oferece uma escalada de frases acima do A1. Ligada, ela leva o Nexy ao fim da fase com
as vidas cheias e dá à Echo um poder que fica salvo:

- **Tiro da Echo** (F · Y no controle · SHOT no toque): o 1º tiro **paralisa** o inimigo (vira cristal, não machuca e
  dá para pisar em cima), o 2º **quebra**. Cada degrau da escalada deixa o tiro mais forte (mais cargas, paralisia
  mais longa, luz que atravessa, luz que persegue). Com o VOICE MODE: segure **V**, o tempo desacelera, e diga
  **"STOP!"**.

## O visual do Nexy evolui

O Nexy é um boneco articulado desenhado em código (capuz de gato, cachecol, cauda de cabo). Ele começa como um
**rascunho de neon** na primeira partida e ganha camadas a cada fase concluída, até a forma final com asas de fênix:

| Estágio | Aparece | O que muda |
| --- | --- | --- |
| SKETCH · Rascunho | 1-1 | linhas de neon ainda se desenhando, sem armadura |
| INK · Tinta | depois da 1-1 | traje escuro com circuitos que acendem |
| GEAR · Equipamento | depois da 1-2 | manoplas com garras de luz e botas blindadas |
| CORE · Núcleo | depois da 1-3 | peitoral com o núcleo, ombreiras de penas, cauda de placas |
| HELM · Elmo | depois do forte | elmo com orelhas de gato, gema, fones e a lâmina de luz |
| PHOENIX · Fênix | depois do castelo | asas de penas de fogo e a chama na cauda |

Ao voltar ao mapa com um estágio novo aparece **NEXY EVOLVED**. É só desenho: a caixa de colisão e a física são as
mesmas. O estágio atual fica no Grimório (aba POWERS); para jogar com o Nexy antigo: pausa → ASSIST → **CLASSIC NEXY**.
Folha com os 6 estágios animados: `tools/look_sheet.js`.

## TO BE PALACE (a saída secreta da 1-1)

O palácio do verbo TO BE. Ontem ele era cheio de luz; hoje está escuro. **A mecânica nova é o passado**: dizer o que
EXISTIA (WAS, WERE) traz de volta o que existia. Na primeira visita, uma lembrança mostra o palácio aceso ("Yesterday,
this palace was full of light.") e ensina a tabela antes do primeiro desafio (TODAY: I AM · IT IS · THEY ARE →
YESTERDAY: I WAS · IT WAS · THEY WERE). O chão do salão é um espelho: o Nexy e a Echo aparecem refletidos.

| Lugar | Frase | O que acontece | Outro caminho (sem o inglês) |
| --- | --- | --- | --- |
| Salão dos Espelhos | WHAT WAS HERE? → **IT WAS A BRIDGE.** | a ponte de luz volta sobre o abismo | quicar em dois Alados |
| Galeria dos Cavaleiros | WERE THEY BIG OR SMALL? → **THEY WERE BIG.** | as estátuas voltam ao tamanho de antes, em escada até o alto da parede | quique alto num Alado ao lado da parede |
| Torre do Relógio | HOW WAS NEXY YESTERDAY? (**WAS**) · HOW IS NEXY TODAY? (**IS**) · HOW WERE THEY YESTERDAY? (**WERE**) | degraus e uma ponte de luz até o topo da torre | tubo-pistão do relógio, sacada e um Alado |
| Interruptor do Ser | WHO WERE YOU? WHO ARE YOU? → **YESTERDAY, I WAS SMALL. TODAY, I AM STRONG.** | a cena do interruptor; o portão afunda | dois Alados, um quique seguido do outro, por cima do portão |

- **O pulso da Echo vê o passado** (C): perto da ponte que caiu ele mostra o contorno do que existia e a Echo diz
  "It was a bridge!". As estátuas deixam a sombra do tamanho antigo na parede.
- **Erro com retorno, sem castigo**: frase errada só faz o alvo tremer, e a Echo aponta o porquê sem dar a frase
  pronta ("Not today. Yesterday!", "They? Not was!", "Nexy is he!").
- **Cavaleiro (KNIGHT)**, criatura nova: pisão comum só faz o elmo tinir (o Nexy quica e ele cambaleia); com giro a
  armadura se desfaz. O tiro da Echo também funciona nele.
- **O INTERRUPTOR DO SER**: a frase final é em 1ª pessoa, passado e presente juntos. A cena tem pausa pesada, dois
  tambores, a alavanca descendo com impacto congelado, uma onda de luz e as cinco formas do verbo (AM, IS, ARE, WAS,
  WERE). Os **degraus-fantasma da 1-1 viram chão para sempre** e o Coração das Palavras ganha o **ANEL DO TO BE**
  (aparece no Coração do mapa e no Grimório).
- Palavras novas: WAS, WERE, BRIDGE, YESTERDAY, TODAY. Letras da palavra-mestra: **T O B E**. Trilha própria em Ré
  menor, a 84 BPM, com o tique-taque do relógio; no fundo, um relógio enorme cujos ponteiros andam para trás (até o
  palácio acordar).

## Fase 1-3 · WHERE IS IT? (os telhados da cidade na chuva)

A primeira vez que o Nexy sai das igrejas: a **cidade Castlevania cyberpunk** vista de cima, na chuva, com raios,
letreiros de neon, prédios com janelas acesas (agora com **profundidade**: o telhado tem face de cima e o prédio tem
lateral), um outdoor gigante e um monotrilho. Cair entre os prédios é morte. Palavra-mestra: **C I T Y**.

**A mecânica nova é a CAIXA DE NEON**: os altares perguntam WHERE IS THE BOX? e a caixa **vai para onde você disser**.
A preposição escolhe o lugar e o substantivo escolhe a coisa; a caixa voa em arco até lá e vira degrau, tampa de buraco
ou some atrás de algo. Na primeira visita, o narrador apresenta a cidade e a tabela ON · UNDER · IN · BEHIND com
desenhos da caixa em cima, embaixo, dentro e atrás. As coisas da cidade têm etiqueta com o nome (SIGN, WALL, HOLE).

| Lugar | Frase | O que acontece | Outro caminho (sem o inglês) |
| --- | --- | --- | --- |
| Letreiro do HOTEL | IT IS ___ THE SIGN. → **UNDER** | a caixa desce para baixo da placa: dela se sobe na placa e no prédio alto | atrair a gárgula e olhar para ela: parada no ar, ela vira degrau |
| Outdoor | a caixa sumiu: o pulso da Echo acha (**It is behind the sign!**); THE BOX IS ___ THE HOLE. → **IN** | a caixa tapa o buraco do corredor | escada de incêndio + a gárgula do outdoor |
| Café | duas lacunas: THE BOX IS ___ THE ___. → **IN THE HOLE**, depois **UNDER THE SIGN** (no outro altar) | a caixa vira chão no meio do buraco; depois sobe para baixo do letreiro do café | pulo correndo na gárgula de pedra sobre o buraco; a gárgula do muro |
| Estação | — | o **trem** do monotrilho leva o Nexy até a praça | — |
| Praça | o **MAPA DA CIDADE** (↑ READ) | leitura, a Bússola nasce, escalada acima do A1 | é opcional |

- **Erro com retorno, sem castigo**: frase sem sentido faz a caixa tremer e a Echo diz o porquê ("In the sign? It is
  too thin!", "A wall has no inside!", "On the hole? It falls in!"). Frase certa mas inútil também ensina: UNDER THE
  HOLE e a caixa cai na rua ("Oh no! It fell down.").
- **Gárgula (GARGOYLE)**, criatura nova: de pedra quando você olha para ela (não machuca e é chão); de costas, ela
  treme, acorda e voa atrás de você. Pisão comum a deixa de pedra por 2 s e o Nexy quica alto; com giro ela quebra.
- **O mapa da cidade**: uma cidade desenhada de lado (estação, torre com a catedral atrás e o Nexy em cima, ponte com o
  palácio embaixo). O narrador lê quatro frases e cada uma acende a parte do desenho (BETWEEN é palavra nova). Ler já
  dá a **BÚSSOLA DAS PALAVRAS**; a escalada (A2 → B1, uma tentativa por pergunta) deixa a bússola mais forte. Errar
  encerra a escalada, mas a bússola fica; dá para tentar de novo.
- **A Bússola das Palavras** (o acréscimo da 1-3 ao Coração): uma seta magenta em volta do Nexy aponta o que falta,
  em **todas as fases**. Nível 1: a letra mais perto. 2: também os segredos (blocos invisíveis, paredes falsas). 3: a
  distância em blocos. 4: também a saída secreta. O Coração ganha uma agulha (no mapa, no Grimório e nas cenas).
- **A cena da bússola** (na pegada God of War): a chuva para no ar, dois tambores, um raio cai no mapa, o Coração sobe
  e a agulha gira até apontar para a frente.
- Palavras novas: BOX, ON, UNDER, IN, BEHIND, WALL, SIGN, HOLE e BETWEEN. Trilha em Mi menor, 108 BPM, synthwave por
  cima do órgão, com o chiado da chuva e trovões.

## A Echo: a primeira ferramenta (nasce na 1-1)

A 1-1 começa com o Nexy **sozinho**, descendo do céu num feixe de luz. Placas de dica aparecem nos lugares certos
(em inglês, com português) e somem quando você já fez a ação. Ao dizer a primeira palavra, **HELLO!** na porta 1, ela
ecoa pela catedral ("hello… hello… hello"), as ondas voltam, as letras H-E-L-L-O giram e se juntam numa luz: nasce a
**Echo** ("ECHO · YOUR FIRST TOOL · YOUR FRIEND"). Ela dá uma volta em oito, se apresenta ("Hello! I am Echo. I am
your friend.") e só então a porta abre. Nas próximas vezes a cena é mais rápida, e Enter pula.

**O pulso da Echo** (tecla **C**, **LB** no controle, botão **ECHO** no celular) é um sonar: revela por alguns segundos
os blocos invisíveis e as paredes falsas por perto, e deixa ouvir a palavra que está dentro dos blocos "?". Logo depois
da porta 1 há um bloco invisível com uma vida para treinar; o mesmo pulso encontra os segredos que já existiam (o
cristal escondido, o SMALL da saída secreta e a parede falsa). Blocos já usados ficam com borda e marca de vazio, e o
Echo os ilumina quando passa perto. No fim da 1-1 a Echo olha a catedral: "Look! The cathedral. What is inside?".

A Echo também fala as palavras em inglês, ilumina o escuro e é o alvo de YOU na 1-2. Tem ficha no Grimório (aba
CREATURES).

As vozes são gravadas em estúdio (ElevenLabs): **a Echo** fala com a voz da Lulu, aveludada; o **narrador** (Baú da
Memória, prólogo, palácio) e as **portas e altares** falam com a Elder Rowan, grave e antiga, com o eco da catedral.
São 401 falas (palavras, frases das portas, a história do Baú, as perguntas, o prólogo, o palácio e a cidade). Se você montar numa porta uma frase que não foi
gravada, a porta repete palavra por palavra. Para usar a voz do aparelho no lugar: pausa → ASSIST → **ECHO'S VOICE**
(cada toque passa para a próxima voz; a escolha fica salva). Como gravar falas novas: `tools/voice/README.md`.

Trilha: a mesma progressão da 1-1, a 100 BPM, com o órgão "respondendo" à melodia, coro e sino; abafada na cripta e
em crescendo no campanário.

## Estrutura do projeto

O jogo que vai para o jogador é só o `index.html`, autocontido. Ele é **gerado** a partir de `src/`:

| Arquivo | O que tem |
| --- | --- |
| `src/00_head.html` | HTML, CSS, HUD, HUD do mapa, painel das portas e telas |
| `src/10_data.js` | legenda do mapa, `CFG` (física), `LOOK` (brilho), palavras, fase 1-1, mapa do mundo (`WORLDS`), save e flags |
| `src/12_level_1-2.js` | dados da fase 1-2 (legenda extra, blocos, alvos, portas, altares, sinos) |
| `src/14_level_palace.js` | dados do TO BE PALACE (legenda, alvos do passado, altares, relógios, interruptor) |
| `src/16_level_1-3.js` | dados da 1-3 (legenda, as caixas e os lugares delas, altares, letreiros e etiquetas) |
| `src/20_audio.js` | efeitos sintetizados, música em camadas com variações por fase, vozes gravadas (com a do aparelho de reserva) e reconhecimento de fala |
| `src/30_input_render.js` | teclado, toque, controle (gamepad), escala da tela e cache dos brilhos |
| `src/40_world.js` | tiles, blocos, runas, colisão, zonas, fundos em parallax (cidade e nave), escuridão e partículas |
| `src/50_entities.js` | inimigos, itens, portais e pedestal |
| `src/55_entities2.js` | peças da 1-2: lustres, tubos, Alado, Ladrão, gigantes, sinos, vidas, Lua, Echo gigante, altar |
| `src/60_player.js` | jogador (plataformas móveis, forma de Rastejante), Echo, câmera e desenho das portas |
| `src/70_game.js` | frases, painel, interface e laço principal |
| `src/72_chest.js` | Baú da Memória (leitura, perguntas, escalada) e a cena do Coração |
| `src/73_echo.js` | 1-1: a chegada, o nascimento da Echo, o pulso da Echo e as placas de dica |
| `src/74_prologue.js` | 1-1: A Lei das Palavras (o prólogo da primeira partida) |
| `src/76_secret.js` | 1-1: o segredo, a TO BE ENGINE, o teletransporte e o tiro da Echo |
| `src/78_palace.js` | TO BE PALACE: cavaleiro, interruptor, desenho dos alvos do passado, chão-espelho, fundo e as duas cenas |
| `src/80_city.js` | 1-3: a caixa de neon, gárgula, trem, mapa da cidade, prédios, chuva e raios, a chegada, o desafio do mapa e a Bússola |
| `src/62_nexy_look.js` | o visual do Nexy em 6 estágios (boneco articulado, quadros guardados em memória; folha: `tools/look_sheet.js`) |
| `src/75_worldmap.js` | transições (íris e fechadura) e o mapa-múndi |
| `src/99_boot.js` | API de teste no console (`NEXY`) e partida |
| `src/levels/1-1.map` | mapa ASCII da 1-1 (23 linhas × 208 colunas) |
| `src/levels/1-2.map` | mapa ASCII da 1-2 (40 linhas × 312 colunas) |
| `src/levels/palace.map` | mapa ASCII do palácio (23 linhas × 150 colunas), gerado por `tools/gen_map_palace.py` |
| `src/levels/1-3.map` | mapa ASCII da 1-3 (26 linhas × 200 colunas), gerado por `tools/gen_map_1-3.py` |
| `build.js` | junta tudo em `index.html` |
| `tools/gen_map_1-2.py` | gerador do mapa da 1-2 (edite e rode para regenerar `src/levels/1-2.map`) |
| `src/voice/` | as falas gravadas (MP3) e o `manifest.json`; o build embute tudo no `index.html` |
| `tools/voice/` | lista as falas do jogo, agrupa para a ElevenLabs e corta o áudio em uma fala por arquivo |
| `CLAUDE.md` | contexto de trabalho (decisões, arquitetura, regras) para continuar o projeto |
| `tests/` | testes de regressão da 1-1, da 1-2, do palácio, da 1-3 e do mapa (Playwright + Chromium) |

```
node build.js          # gera index.html a partir de src/
node build.js --check  # confere se index.html está em dia com src/
npm test               # confere o build e roda os testes (precisa de: npm i && npx playwright install chromium)
```

Edite sempre em `src/` e rode `node build.js`. Mudanças feitas direto no `index.html` são apagadas no próximo build.

Para testar uma fase direto, sem passar pelo mapa: no console do navegador, `NEXY.Game.enterLevel('1-2')` (ou
`'palace'`, `'1-3'`).

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
  tamanhos `small`/`big` em tiles. O passeio da Echo gigante fica em `doors.altar3.ride` (onde espera e o caminho).
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

A flag `palaces.toBe` é ligada no TO BE PALACE (o Interruptor do Ser) e fica salva: com ela verdadeira, todos os
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
