# Nexy English World · World 1-1 "Hello World"

Plataforma 2D neon-noir para ensinar inglês (nível A1) a brasileiros. Tudo está em um único arquivo:
`index.html` (HTML, CSS e JavaScript puro, sem imagens nem áudios externos). Abra o arquivo no navegador.

## Controles

| Teclado | Ação |
| --- | --- |
| ← → ou A D | mover |
| ↓ ou S | agachar |
| Shift (segurar) | correr e carregar a carapaça |
| Z ou Espaço | pular (segure para ir mais alto) |
| X | pulo giratório |
| ↑ ou W | abrir porta / falar no pedestal |
| Q | soltar o item da reserva |
| H | dica (tradução da inscrição) |
| V | falar a frase (só com VOICE MODE ligado) |
| M | som liga/desliga |
| Esc ou P | pausa |

No celular aparecem botões de toque (◀ ▼ ▶, RUN, JUMP, SPIN e OPEN perto das portas).

## Como editar a fase

Tudo fica no topo do `<script>` de `index.html`:

- **Mapa:** `LEVELS['1-1'].map` é um array de strings, um caractere por tile de 32 px. A legenda está
  comentada no início do script (`#` pedra, `=` plataforma, `?` bloco, `C` Rastejante, `K` Casco etc.).
- **Conteúdo dos blocos:** `LEVELS['1-1'].blocks` liga cada letra minúscula do mapa a um bloco e ao que ele
  libera (`{ word: 'KEY', rise: 3.7 }`, `{ crystal: true }`, `{ orbs: 3 }`, `{ letter: 3 }`).
- **Portas e pedestal:** `LEVELS['1-1'].doors`. Cada porta tem `inscription`, `mold` (com `_` para as
  lacunas), `accept` (frases certas e seus resultados: `open`, `transform`, `exit`) e `enact`
  (frases "erradas" que a porta encena, como `IT IS A DOOR`).
- **Palavras:** `WORDS` guarda classe gramatical, tradução e a linha de lore do Grimório.

## Blocos-fantasma: a palavra que você carrega vira chão

Os blocos tracejados `M`, `I` e `R` (AM, IS, ARE) só ficam sólidos enquanto a palavra deles estiver na
sua barra. Pegou AM, o degrau AM acende; usou AM numa porta, ele volta a ser fantasma. Na seção 2 as três
palavras estão antes da escada (ARE fica no bloco acima da segunda plataforma flutuante), então dá para
subir até os orbes e a lanterna lá no alto antes de gastar o AM na porta "HOW ARE YOU?".

A flag `palaces.toBe` continua existindo para o futuro Palácio do To Be: com ela verdadeira, todos os
blocos-fantasma ficam sólidos, mesmo sem as palavras. Para testar, abra o jogo com `#tobe` no fim do
endereço (ou `?toBe=1`), ou rode no console `NEXY.setFlag('palaces.toBe', true)`.

## Combo de pisões

Cada pisão seguido, sem tocar o chão, deixa o quique mais alto (`CFG.COMBO_BOUNCE = [1, 1.38, 1.55]`):
segurando o pulo, o 1º pisão sobe cerca de 7 tiles, o 2º cerca de 13 e o 3º cerca de 16. Na tela aparece
"1x", "2x"… luminoso no ponto do pisão, e o jogador brilha mais forte enquanto o combo durar. Dois
Rastejantes-guarda patrulham embaixo da escada-fantasma: com um 2x dá para alcançar a plataforma alta
mesmo sem as palavras.

## Brilho

O brilho de contornos, bordas e da luz de recorte fica num único ajuste no topo do script:
`const LOOK = { bright: 2, bg: 1.6, rim: 1.15 }`. Valores maiores clareiam as silhuetas; `bg` vale só para o fundo.
