# Gera src/levels/1-2.map (WORLD 1-2 · WHO ARE YOU?). Uso: python3 tools/gen_map_1-2.py src/levels/1-2.map
import sys
W, H = 312, 40
m = [['.' for _ in range(W)] for _ in range(H)]
def put(x, y, c):
    assert m[y][x] in '.#', f'overlap at {x},{y}: {m[y][x]} -> {c}'
    m[y][x] = c
def fill(x1, x2, y1, y2, c):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            m[y][x] = c
def row_orbs(y, xs):
    for x in xs: put(x, y, 'o')

fill(0, W - 1, 30, 39, '#')           # chão da nave (topo na linha 30)

# ---------------- SEÇÃO 1 · PORTAL DA NAVE (0-63) ----------------
put(3, 29, 'P')
for x, y in [(6, 26), (7, 25), (8, 24), (9, 25), (10, 26)]: put(x, y, 'o')
put(9, 21, '*')
put(12, 26, '?'); put(13, 26, 't'); put(14, 26, '?')       # IT
put(18, 26, 'b')                                            # BIG
put(21, 29, 'T')                                            # altar 1: WHAT IS BIG?  (runa IT nas colunas 24-25)
fill(26, 31, 24, 24, '=')                                   # sacada alta (só com IT IS BIG)
row_orbs(23, [27, 28, 29]); put(30, 22, 'w')                # letra W
put(28, 20, '*')
put(36, 26, 'H')                                            # primeiro Alado
put(33, 24, '*')
put(40, 29, 'C')
for x in (42, 43): put(x, 28, 'o')
put(44, 26, '?'); put(45, 26, 'n'); put(49, 26, 'y'); put(50, 26, '?')   # NEXY, YOU
put(47, 23, 'o'); put(47, 22, 'o')
put(53, 26, 'c')                                            # cristal
put(55, 29, 'g'); put(57, 29, 'g')                          # obstáculos de vidro com orbes
put(59, 29, 'K')                                            # casco: chute para quebrar o vidro
put(52, 22, '*')
fill(62, 63, 0, 26, '#'); fill(62, 63, 27, 29, '1')         # porta 1: WHO ARE YOU?

# ---------------- SEÇÃO 2 · OS LUSTRES (64-137) ----------------
row_orbs(28, [65, 66, 67]); put(69, 21, '*')
fill(73, 111, 30, 39, '.')                                  # abismo
put(77, 28, 'Q'); put(84, 28, 'q')                          # lustres 1 e 2 (fases opostas)
fill(88, 89, 27, 39, '#')                                   # pilar 1
row_orbs(26, [89])
put(88, 26, 'F')                                            # checkpoint no pilar 1 (pedido do dono: no meio dos lustres)
put(94, 28, 'Q'); put(100, 28, 'q')                         # lustres 3 e 4
fill(104, 105, 27, 39, '#')                                 # pilar 2
put(96, 25, 'U')                                            # Alado de patrulha
put(97, 19, 'O')                                            # letra O (só com pisão no Alado)
row_orbs(25, [80, 81, 91, 92])
for x in (107, 109, 111): put(x, 27, 'B')                   # ponte de Alados
for x, y in [(107, 23), (109, 20), (110, 17), (110, 14)]: put(x, y, 'o')   # trilha que sugere o 3x
fill(108, 112, 13, 13, '=')                                 # vida escondida lá no alto (só com 3x)
put(111, 12, '+'); row_orbs(12, [108, 109])
put(114, 22, '*')
put(116, 26, 'e'); put(118, 26, '?'); put(120, 26, 'k'); put(124, 26, 'j')   # YES, NO, NOT
put(119, 29, 'C'); put(129, 29, 'C')
row_orbs(28, [126, 127, 128])
put(131, 26, '?'); put(132, 26, '?')
put(122, 23, '*')
fill(136, 137, 0, 26, '#'); fill(136, 137, 27, 29, '2')     # porta 2: ARE YOU A CRAWLER?

# ---------------- SEÇÃO 3 · O CORO DOS SINOS (138-205) ----------------
put(140, 29, 'F')
put(143, 26, 'l')                                           # 1UP logo depois da porta 2
put(148, 25, '5'); put(152, 25, '6')                        # sinos I e ARE (o que confunde)
fill(155, 157, 27, 29, '#')                                 # degrau
put(156, 22, '7')                                           # sino AM (só de cima do degrau)
put(161, 24, '(')                                           # lustre que leva ao sino FINE
put(164, 19, '8')                                           # sino FINE
put(167, 9, '~')                                            # o grande sino (decoração)
row_orbs(28, [145, 146, 150, 151])
put(146, 21, '*')
fill(170, 171, 0, 24, '#'); fill(170, 171, 25, 29, '4')     # portão dos sinos: HOW ARE YOU?
put(175, 26, 'a'); put(178, 26, 'r'); put(181, 26, 'i')     # THEY, ARE, IS
put(173, 26, 'c')                                           # cristal
put(177, 22, '*')
fill(184, 193, 30, 39, '.')                                 # fosso dos tubos do órgão
put(185, 31, '|'); put(189, 31, '!')                        # tubos (sobem e descem na batida)
put(189, 20, 's')                                           # SMALL (do alto do tubo 2)
put(191, 26, 'B')                                           # Alado sobre o fosso
put(191, 18, 'L')                                           # letra L (só com pisão no Alado)
row_orbs(28, [194, 195])
put(196, 26, 'u')                                           # WE (a isca do ladrão)
fill(198, 249, 9, 24, '#')                                  # teto do corredor e massa da cripta
put(201, 29, 'S')                                           # LADRÃO DE PALAVRAS (foge para o buraco na coluna 205)
row_orbs(28, [199, 200])

# ---------------- SEÇÃO 4 · A CRIPTA (206-249) ----------------
fill(206, 239, 25, 31, '#')                                 # massa entre a nave e a cripta
for k in range(6):                                          # escada descendo
    fill(206 + k, 206 + k, 25, 30 + k, '.')
fill(212, 237, 32, 35, '.')                                 # túnel da cripta (4 de altura)
put(212, 35, 'F')                                           # checkpoint na entrada da cripta
put(215, 35, 'V')                                           # altar 2: BIG OR SMALL?
put(217, 32, 'm')                                           # poço de palavras: dá a que falta para as frases do altar 2
put(213, 33, '*')
for x in (219, 221, 223): put(x, 35, '&')                   # três Rastejantes gigantes
fill(220, 222, 28, 31, '.')                                 # nicho no teto
put(221, 29, '%')                                           # letra R (quique num Rastejante)
row_orbs(34, [226, 227, 228])                               # a pedra IT fica nas colunas 230-232
# caminho alternativo (quem não abre o baú): poço escuro → quique no Alado → passagem baixa por cima do muro
fill(233, 235, 25, 31, '.'); put(233, 33, '='); put(235, 31, 'B')
fill(236, 239, 25, 26, '.'); row_orbs(26, [237, 238])
put(233, 35, '@')                                           # BAÚ DA MEMÓRIA
fill(238, 239, 32, 35, 'X')                                 # MURO DO SILÊNCIO (só a Nexy gigante quebra)
fill(240, 247, 25, 35, '.')                                 # câmara da luz
fill(241, 243, 33, 33, '=')
fill(245, 247, 30, 31, '#')                                 # patamar da porta 3
put(246, 29, 'F')
put(242, 29, 'h')                                           # YES de reserva
row_orbs(32, [241, 243]); put(245, 29, 'o'); put(247, 29, 'o')
fill(249, 251, 32, 35, '.')                                 # sala secreta, debaixo da torre
put(248, 32, 'W'); put(248, 33, 'W'); put(248, 34, 'W'); put(248, 35, 'W')   # parede falsa
put(250, 34, '$')                                           # A LUA: 3 vidas
row_orbs(33, [249, 251])
fill(248, 249, 25, 26, '#'); fill(248, 249, 27, 29, '3')    # porta 3: IS IT A DOOR?

# ---------------- SEÇÃO 5 · O CAMPANÁRIO (250-311) ----------------
fill(248, 249, 9, 24, '#')
fill(276, 279, 9, 39, '#')                                  # parede direita da torre
put(252, 29, ':'); put(256, 29, ';'); put(260, 29, '"')     # tubos do órgão da torre
fill(263, 270, 21, 21, '='); put(269, 20, '+'); put(266, 20, 'C')   # sacada do meio, com vida
put(273, 18, 'I'); put(271, 15, 'R')                        # atalho-fantasma (IS e ARE na barra): sacada → IS → ARE → plataforma alta
fill(259, 261, 18, 18, '=')
fill(254, 256, 15, 15, '=')
put(255, 11, 'f')                                           # FRIEND (bloco invisível)
put(263, 12, ')')                                           # lustre da torre
put(258, 13, 'H')
fill(270, 272, 12, 12, '=')
put(266, 17, 'z')                                           # cristal invisível (pulo da sacada)
fill(250, 275, 9, 9, '=')                                   # o telhado (atravessável por baixo)
put(254, 8, '^')                                            # altar 3: WHO IS BIG?
put(262, 1, '~')                                            # o grande sino do campanário
put(266, 5, 'H'); put(266, 1, 'D')                          # letra D (pisão no Alado)
row_orbs(8, [258, 259, 260, 270, 271, 272])
put(268, 25, '*'); put(257, 12, '*')
# a ponte da runa (colunas 280-287) leva ao fim normal; o Echo gigante leva ao fim secreto
fill(280, 287, 10, 39, '.')
fill(288, 294, 9, 39, '#'); put(289, 8, 'N')
fill(295, 303, 9, 39, '.')
fill(304, 310, 8, 39, '#'); put(305, 7, 'Z')
fill(311, 311, 0, 39, '.')
for x in range(296, 303, 2): put(x, 3, 'o')

out = '\n'.join(''.join(r) for r in m) + '\n'
open(sys.argv[1], 'w').write(out)
print(out)
