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

## Blocos-fantasma (semente do Palácio do To Be)

Os blocos `M`, `I` e `R` (AM, IS, ARE) ficam intangíveis enquanto a flag `palaces.toBe` for falsa.
Para testá-los sólidos, abra o jogo com `#tobe` no fim do endereço (ou `?toBe=1`), ou rode no console
`NEXY.setFlag('palaces.toBe', true)` (passe `true` como terceiro argumento para salvar no progresso).
