# Gera src/levels/1-3.map (WORLD 1-3 · WHERE IS IT? · os telhados da cidade na chuva).
# Uso: python3 tools/gen_map_1-3.py src/levels/1-3.map
# Legenda desta fase em src/16_level_1-3.js. Cada prédio é pedra do telhado até o fim do mapa (a rua lá embaixo é morte).
# Os desafios de altura são sempre de 5 linhas (160 px): o pulo (123 px, correndo 154) não alcança;
# a CAIXA no lugar certo (ou uma GÁRGULA parada no ar, olhando para ela) vira o degrau que falta.
import sys
W, H = 200, 26
m = [['.' for _ in range(W)] for _ in range(H)]
def put(x, y, c):
    assert m[y][x] == '.', f'overlap at {x},{y}: {m[y][x]} -> {c}'
    m[y][x] = c
def fill(x1, x2, y1, y2, c):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            m[y][x] = c
def roof(x1, x2, r): fill(x1, x2, r, H - 1, '#')
def orbs(y, xs):
    for x in xs: put(x, y, 'o')

# ---------------- A · O LETREIRO DO HOTEL (0-44): IT IS UNDER THE SIGN ----------------
roof(0, 24, 20)
put(2, 19, 'P')
put(4, 16, '1'); put(7, 16, '2'); put(9, 16, '?')            # ON, UNDER
put(13, 19, '!')                                             # altar 1: WHERE IS THE BOX? (IT IS _ THE SIGN.)
fill(18, 23, 15, 15, '=')                                    # o letreiro HOTEL (em cima dele se anda); a caixa começa em cima
put(21, 11, 'c')                                             # letra C (do alto do letreiro)
roof(25, 44, 12)                                             # o prédio alto: 5 linhas acima do letreiro
put(27, 10, 'q')                                             # gárgula (outro caminho: parada no ar, vira degrau)
put(30, 11, 'F')
put(35, 8, 'v')                                              # vida escondida (o pulso da Echo mostra)
orbs(18, [5, 6, 10, 11]); orbs(11, [33, 34, 38, 39, 40])

# ---------------- B · O OUTDOOR E O BURACO (45-83): THE BOX IS IN THE HOLE ----------------
roof(45, 81, 20)
fill(65, 67, 20, H - 1, '.')                                 # o BURACO no chão do corredor (3 colunas: nem com pulo correndo)
fill(60, 72, 9, 17, '#')                                     # o outdoor gigante (o corredor passa embaixo, linhas 18-19)
put(46, 16, '3'); put(52, 16, '4')                           # IN, BEHIND
put(49, 19, '@')                                             # altar 2 (a caixa está escondida ATRÁS do outdoor)
fill(56, 57, 17, 17, '='); fill(56, 57, 14, 14, '=')         # escada de incêndio (outro caminho: por cima do outdoor)
put(62, 7, 'q')                                              # gárgula do outdoor
put(70, 6, 'i')                                              # letra I (em cima do outdoor)
orbs(8, [62, 63, 67, 68]); orbs(19, [74, 75])
put(76, 19, 'F')
put(79, 19, 'C')

# ---------------- C · O BURACO, O CAFÉ E O MURO (84-134): THE BOX IS _ THE _ ----------------
roof(84, 104, 18)
put(86, 14, '5'); put(89, 14, '6'); put(92, 14, '7')         # WALL, SIGN, HOLE
put(102, 17, '%')                                            # altar 3, antes do buraco
# o buraco: c105-112 (8 colunas: nem correndo se pula). A caixa DENTRO dele vira chão no meio.
put(108, 15, 'q')                                            # gárgula do buraco (de pedra, olhando para ela: dá para pular nela)
put(108, 11, 't')                                            # letra T (só de cima da gárgula)
put(112, 9, 'q')                                             # gárgula do muro
roof(113, 116, 18)                                           # o parapeito do café (4 colunas)
put(113, 17, '&')                                            # altar 3b, no parapeito
fill(114, 116, 13, 13, '=')                                  # o letreiro do CAFÉ, 5 linhas acima do parapeito
roof(117, 134, 10)                                           # o MURO: o prédio da estação
orbs(9, [123, 124, 125, 128, 129, 130]); orbs(17, [96, 97, 98])

# ---------------- D · A ESTAÇÃO E O TREM (135-162) ----------------
roof(135, 140, 16)
put(137, 15, 'F')
put(141, 16, 'T')                                            # o trem do monotrilho (a borda esquerda vai de c141 a c157)
put(148, 11, 'q')                                            # gárgula do trilho (vem atrás de quem está de costas)
put(154, 11, 'y')                                            # letra Y (pulo de cima do trem)
orbs(13, [144, 145, 150, 151, 158, 159])

# ---------------- E · A PRAÇA DO MAPA (163-199) ----------------
roof(163, 199, 16)
put(165, 15, 'F')
put(172, 15, 'Q')                                            # o MAPA DA CIDADE (o desafio que dá a BÚSSOLA)
put(180, 12, 'w')                                            # cristal escondido
put(184, 15, 'C')
orbs(13, [177, 178, 186, 187, 188])
put(195, 15, 'N')

rows = [''.join(r) for r in m]
out = sys.argv[1] if len(sys.argv) > 1 else 'src/levels/1-3.map'
with open(out, 'w') as f: f.write('\n'.join(rows) + '\n')
print(f'{out}: {W}x{H}')
