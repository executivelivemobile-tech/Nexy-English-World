# Gera src/levels/fortress.map (O FORTE DE FERRO · CAN YOU?).
# Uso: python3 tools/gen_map_fort.py src/levels/fortress.map
# Legenda desta fase em src/18_level_fort.js. O chão principal (A, B, C) fica na linha 28; as muralhas (E, F) na 13.
# Mecânica: as PEDRAS DA LEI. Cada pedra manda num trecho (zona) e a frase muda a lei: YOU CAN'T JUMP → I CAN JUMP.
# Sempre há outro caminho, mais difícil: o esgoto (A), o ritmo dos esmagadores (B), as plataformas que caem (B),
# as sombras dos pilares (C), subir mais rápido que o ferro (D) e as bolas de ferro do Guardião (E).
import sys
W, H = 330, 36
m = [['.' for _ in range(W)] for _ in range(H)]
def put(x, y, c):
    assert m[y][x] == '.', f'overlap at {x},{y}: {m[y][x]} -> {c}'
    m[y][x] = c
def fill(x1, x2, y1, y2, c):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            m[y][x] = c
def orbs(y, xs):
    for x in xs: put(x, y, 'o')

# ---------------- A · O PORTÃO E A PRIMEIRA LEI (0-49): YOU CAN'T JUMP → I CAN JUMP ----------------
fill(0, 49, 28, 35, '#')
fill(15, 44, 29, 33, '.')                 # o esgoto, embaixo da ponte (outro caminho: andar, sem pular)
fill(27, 28, 29, 30, '#')                 # o pilar da ponte velha (o esgoto passa por baixo dele)
fill(16, 17, 28, 28, '.')                 # o ralo: a grade aberta que desce para o esgoto
fill(18, 19, 26, 27, '#')                 # o degrau de 2 blocos (sem pulo, não se sobe)
fill(24, 26, 28, 28, '.'); fill(29, 31, 28, 28, '.')   # o fosso: dois vãos de 3 (quem cai vai para o esgoto, sem morrer)
fill(42, 43, 28, 28, '.'); fill(42, 43, 31, 33, '#')   # a saída do esgoto (fora da lei: aqui se pula de novo)
put(2, 27, 'P')
put(7, 24, 'a')                           # CAN (antes da lei: ainda dá para pular)
put(13, 27, '!')                          # PEDRA 1: YOU CAN'T JUMP.
put(20, 29, 'U'); put(36, 29, 'U')        # esmagadores do esgoto (passe quando sobem)
put(27, 23, '1')                          # letra I (do pilar)
put(36, 24, 'x')                          # FIRE
put(39, 27, 'F')
fill(46, 49, 6, 21, '#')                  # a fachada do forte (a porta: linhas 22-27)
orbs(26, [8, 9]); orbs(25, [25, 30]); orbs(32, [23, 24, 25, 31, 32])

# ---------------- B · O SALÃO DOS ESMAGADORES (50-122): THE STONES CAN'T FALL · THE FLOOR CAN MOVE ----------------
fill(44, 122, 28, 35, '#'); fill(42, 43, 28, 28, '.')
fill(50, 122, 0, 15, '#')                 # o teto do salão (as pedras pendem dele)
put(52, 24, 'b')                          # CAN'T
put(55, 27, '@')                          # PEDRA 2: THE STONES CAN FALL.
put(58, 24, 'c')                          # STONES
for i, x in enumerate([62, 68, 74, 80, 86, 92]): put(x, 16, 'u')   # os esmagadores (2 de largura, descem até o chão)
put(65, 24, 'z')                          # CLOCK (para o tempo: as pedras param no ar)
put(96, 24, 'd')                          # FLOOR
put(99, 27, '%')                          # PEDRA 2B: THE FLOOR CAN'T MOVE.
fill(101, 113, 28, 35, '.')               # o poço (13 colunas): o chão de pedra atravessa quando PODE se mexer
put(101, 28, 'p')                         # o chão que se mexe (3 de largura, parado na borda)
put(105, 25, 't'); put(109, 25, 't')      # outro caminho: plataformas (2 de largura) que caem logo depois do pisão
put(108, 21, '2')                         # letra R (no salto entre as plataformas)
put(117, 27, 'F')
orbs(26, [64, 70, 76, 82, 88]); orbs(23, [104, 108, 112])

# ---------------- C · A GALERIA DOS OLHOS (123-185): CAN THE EYES SEE YOU? → NO, THEY CAN'T. ----------------
fill(123, 185, 28, 35, '#')
fill(123, 185, 0, 9, '#')                 # o teto alto da galeria (vitrais nas paredes)
put(125, 24, 'e')                         # NO
put(127, 27, '&')                         # PEDRA 3 (uma pergunta)
put(130, 24, 'h'); put(133, 24, 'k')      # THEY, YES
put(136, 24, 'y')                         # HAMMER
for x in [140, 149, 158, 167, 176]: fill(x, x + 1, 25, 27, '#')   # pilares (3 de altura): a sombra deles esconde a Nexy
put(146, 11, 'Q'); put(163, 11, 'Q'); put(180, 11, 'Q')           # os OLHOS DE FERRO (o facho varre o chão)
fill(149, 152, 22, 22, '#'); fill(148, 148, 20, 21, '#'); fill(149, 152, 19, 19, '#')   # o nicho escondido
fill(152, 152, 20, 21, 'X')               # parede rachada: só o MARTELO quebra
fill(153, 157, 22, 22, '=')               # a sacada (do pilar c158 se sobe)
put(150, 21, '3'); put(149, 21, 'l')      # letra O e uma vida, no nicho
put(172, 10, 'B')                         # morcego
orbs(23, [144, 145, 162, 171, 172]); orbs(21, [154, 155, 156])
fill(186, 186, 3, 21, '#')                # a parede da torre (a porta: linhas 22-27)

# ---------------- D · A TORRE DO FERRO (186-219): o ferro derretido sobe. THE IRON CAN'T RISE. ----------------
fill(186, 219, 0, 2, '#')                 # o teto da torre
fill(187, 218, 34, 35, '#')               # o fundo do caldeirão
fill(186, 190, 28, 35, '#')               # a entrada (a borda onde se espera)
fill(219, 219, 3, 9, '#'); fill(219, 219, 13, 35, '#')   # a parede direita (a saída: linhas 10-12)
put(188, 24, 'z'); put(189, 24, 'j')      # CLOCK e IRON
put(188, 27, 'F')
put(191, 33, 'D')                         # o FERRO DERRETIDO (sobe quando a Nexy entra)
fill(192, 195, 25, 25, '='); fill(198, 201, 22, 22, '='); fill(193, 196, 19, 19, '=')
put(194, 18, '$')                         # PEDRA 4: THE IRON CAN RISE. (no meio da subida)
fill(198, 201, 16, 16, '=')
put(199, 12, '4')                         # letra N (pulo de cima da plataforma)
fill(203, 218, 13, 13, '#')               # a borda de cima: a saída para as muralhas
put(210, 8, 'B')
orbs(21, [194, 195]); orbs(12, [205, 206])

# ---------------- E · AS MURALHAS E O GUARDIÃO (219-299) ----------------
fill(219, 329, 13, 35, '#')
put(222, 12, 'F')
put(228, 9, 'x')                          # FIRE (volta a encher)
put(232, 7, 'B'); put(242, 6, 'B')
put(236, 9, 's')                          # STAR escondida (o pulso mostra)
orbs(10, [230, 231, 238, 239, 240])
put(247, 12, 'F')
put(251, 12, 'K')                         # a TÁBUA DA LEI do Guardião (a lei muda a cada rodada)
put(255, 9, 'm')                          # poço de palavras (CAN, CAN'T, WE que faltarem)
fill(262, 265, 10, 10, '='); fill(286, 289, 10, 10, '=')
put(276, 6, 'V')                          # o GUARDIÃO DE FERRO
# o portão da torre de menagem (alvo keepgate, c297-298 L7-12) afunda quando o Guardião cai

# ---------------- F · A SAÍDA (299-329) ----------------
orbs(10, [304, 305, 306, 311, 312, 313])
put(321, 12, 'N')

rows = [''.join(r) for r in m]
out = sys.argv[1] if len(sys.argv) > 1 else 'src/levels/fortress.map'
with open(out, 'w') as f: f.write('\n'.join(rows) + '\n')
print(f'{out}: {W}x{H}')
