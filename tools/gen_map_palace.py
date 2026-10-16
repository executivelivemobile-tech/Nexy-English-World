# Gera src/levels/palace.map (TO BE PALACE · a saída secreta da 1-1). Uso: python3 tools/gen_map_palace.py src/levels/palace.map
# Legenda desta fase em src/14_level_palace.js. Chão na linha 20, teto nas linhas 0-1.
import sys
W, H = 150, 23
m = [['.' for _ in range(W)] for _ in range(H)]
def put(x, y, c):
    assert m[y][x] == '.', f'overlap at {x},{y}: {m[y][x]} -> {c}'
    m[y][x] = c
def fill(x1, x2, y1, y2, c):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            m[y][x] = c
def row_orbs(y, xs):
    for x in xs: put(x, y, 'o')

fill(0, W - 1, 20, 22, '#')        # chão
fill(0, W - 1, 0, 1, '#')          # teto do palácio

# ---------------- A · O SALÃO DOS ESPELHOS (0-43): IT WAS A BRIDGE ----------------
put(3, 19, 'P')
for x, y in [(6, 17), (7, 16), (8, 15), (9, 15)]: put(x, y, 'o')
put(10, 16, '?'); put(11, 16, '1'); put(12, 16, '?')         # WAS
put(14, 12, '*')
put(17, 16, '7')                                             # BRIDGE
row_orbs(18, [20, 21, 22])
put(25, 19, '!')                                             # altar da memória: WHAT WAS HERE?
fill(29, 38, 20, 22, '.')                                    # o abismo (a ponte que existia: alvo bridge1)
for x in (31, 35): put(x, 17, 'V')                           # outra saída: dois Alados por cima do abismo (quique, quique)
put(33, 10, 't')                                             # letra T (só quicando nos Alados)
row_orbs(14, [36, 37])
put(40, 13, '*')
put(41, 19, 'F')

# ---------------- B · A GALERIA DOS CAVALEIROS (44-77): THEY WERE BIG ----------------
put(46, 16, '2'); put(47, 16, '?'); put(50, 16, '4'); put(53, 16, '6')   # WERE, ARE, BIG
put(48, 12, '*')
put(57, 19, 'k'); put(62, 19, 'k')                           # cavaleiros (patrulha 55-64)
put(60, 11, 'O')                                             # letra O (quique no elmo do cavaleiro)
row_orbs(15, [56, 58])
put(64, 19, '@')                                             # altar da galeria: WERE THEY BIG OR SMALL?
# as estátuas (alvos knight1-3) ficam em c67, c70 e c73; a parede alta logo depois
fill(76, 77, 11, 19, '#')
put(75, 16, 'U')                                             # outra saída: Alado entre a última estátua e a parede
put(72, 8, '*')

# ---------------- C · A TORRE DO RELÓGIO (78-105): WAS · IS · WERE ----------------
put(79, 19, 'F')
put(81, 19, '%')                                             # relógio 1: HOW WAS NEXY YESTERDAY? (degrau step1 c84-86 L17)
put(89, 16, 'm')                                             # poço de palavras: WAS, IS, WERE, ARE
fill(87, 93, 14, 14, '=')                                    # sacada 1 (encostada no degrau 1)
put(92, 10, '3')                                             # IS
put(91, 13, '&')                                             # relógio 2: HOW IS NEXY TODAY? (degrau step2 c84-86 L11)
fill(78, 83, 8, 8, '=')                                      # sacada 2 (encostada no degrau 2)
put(80, 7, '$')                                              # relógio 3: HOW WERE THEY YESTERDAY? (ponte bridge2 c84-98 L8)
fill(99, 103, 8, 8, '=')                                     # saída da torre
fill(104, 105, 8, 19, '#')                                   # parede da torre (o topo dela leva ao salão)
put(101, 5, 'b')                                             # letra B
row_orbs(6, [86, 88, 90, 92, 94, 96])
# outra saída: tubo-pistão do relógio → sacada 3 → Alado → saída
put(94, 19, '|')
fill(97, 100, 12, 12, '=')
put(102, 10, 'V')
put(97, 4, '*')

# ---------------- D · O SALÃO DO INTERRUPTOR (106-149): I WAS · I AM ----------------
put(108, 19, 'F')
put(111, 16, '5'); put(112, 16, '?'); put(113, 16, 'l')      # AM, orbe, vida
put(110, 12, '*')
put(117, 19, 'k'); put(124, 19, 'k')                         # cavaleiros (patrulha 114-128)
put(121, 11, 'e')                                            # letra E
row_orbs(15, [119, 120, 122, 123])
put(131, 19, '^')                                            # o INTERRUPTOR DO SER (BE SWITCH)
# o portão (alvo gate) fica em c135-136, linhas 8-19; outra saída: dois Alados para quicar por cima
put(133, 16, 'U'); put(134, 11, 'V')
put(140, 13, '*')
row_orbs(17, [139, 140, 141])
put(144, 19, 'N')
put(147, 12, '*')

rows = [''.join(r) for r in m]
out = sys.argv[1] if len(sys.argv) > 1 else 'src/levels/palace.map'
with open(out, 'w') as f: f.write('\n'.join(rows) + '\n')
print(f'{out}: {W}x{H}')
