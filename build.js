#!/usr/bin/env node
// Junta src/ num único index.html (o jogo continua sendo um arquivo autocontido).
//   node build.js          → gera index.html
//   node build.js --check  → só confere se index.html está em dia com src/ (sai com erro se não estiver)
// Os mapas ASCII ficam em src/levels/<id>.map e entram no lugar de /*MAP:<id>*/.
// As vozes gravadas (src/voice/manifest.json + MP3) entram em base64 no lugar de /*VOICE_PACK*/null (ver tools/voice).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'index.html');
const PARTS = [
  '00_head.html',       // HTML, CSS, HUD e telas
  '10_data.js',         // legenda do mapa, CONFIG, LOOK, palavras, fases, save e flags
  '12_level_1-2.js',    // fase 1-2 · WHO ARE YOU?
  '14_level_palace.js', // TO BE PALACE (a saída secreta da 1-1)
  '16_level_1-3.js',    // fase 1-3 · WHERE IS IT? (os telhados da cidade)
  '20_audio.js',        // efeitos, música em camadas, voz e reconhecimento de fala
  '30_input_render.js', // teclado, toque, escala e cache de brilhos
  '40_world.js',        // tiles, blocos, colisão, fundo em parallax e partículas
  '50_entities.js',     // inimigos, itens, portais, pedestal
  '55_entities2.js',    // peças da 1-2: lustres, tubos, Alado, Ladrão, gigantes, sinos, vidas, Echo gigante
  '60_player.js',       // jogador, Echo, câmera e desenho das portas
  '62_nexy_look.js',    // o visual da Nexy: boneco articulado que evolui fase a fase (a folha usa o mesmo código)
  '70_game.js',         // frases, painel, interface e laço principal
  '72_chest.js',        // Baú da Memória (leitura, perguntas, escalada) e a cena do Coração
  '73_echo.js',         // 1-1: a chegada, o nascimento do Echo, o pulso do Echo e as placas de dica
  '74_prologue.js',     // 1-1: A Lei das Palavras (o prólogo da primeira partida)
  '75_worldmap.js',     // transições (íris) e mapa-múndi
  '76_secret.js',       // 1-1: o segredo (tijolo do bug, WARP CARD, TO BE ENGINE, teletransporte) e o tiro da Echo
  '78_palace.js',       // TO BE PALACE: cavaleiro, interruptor do ser, alvos do passado, chão-espelho, fundo e cenas
  '80_city.js',         // 1-3: a caixa de neon, gárgula, trem, mapa da cidade, prédios, chuva, chegada e a bússola
  '82_city2.js',        // 1-3, a segunda metade: poderes (LASER, WINGS, STAR), drones, feixes de laser, ventilador e o Sentinela
  '84_testmode.js',     // o modo teste escondido (T ou 5 toques no título): pular para qualquer fase e trecho
  '99_boot.js',         // API de teste no console e partida
];

function mapRows(id) {
  const file = path.join(SRC, 'levels', id + '.map');
  const rows = fs.readFileSync(file, 'utf8').split('\n').map(r => r.replace(/\r$/, '')).filter(r => r.length);
  const width = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== width) throw new Error(`${id}.map, linha ${i}: ${r.length} colunas (esperado ${width})`);
    if (/['\\]/.test(r)) throw new Error(`${id}.map, linha ${i}: caractere inválido (' ou \\)`);
  });
  return rows.map((r, i) => `      '${r}'${i < rows.length - 1 ? ',' : ''} // ${String(i).padStart(2, '0')}`).join('\n');
}

function voicePack() {
  const file = path.join(SRC, 'voice', 'manifest.json');
  if (!fs.existsSync(file)) return 'null';
  const m = JSON.parse(fs.readFileSync(file, 'utf8')), clips = {};
  for (const [k, c] of Object.entries(m.clips)) clips[k] = [fs.readFileSync(path.join(SRC, 'voice', c.file)).toString('base64'), c.b || []];
  return JSON.stringify({ cast: m.cast, clips });
}

function build() {
  const html = PARTS.map(p => fs.readFileSync(path.join(SRC, p), 'utf8')).join('');
  return html.replace(/\/\*MAP:([\w-]+)\*\//g, (_, id) => mapRows(id)).replace('/*VOICE_PACK*/null', () => voicePack());
}

const out = build();
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== out) { console.error('index.html está desatualizado: rode "node build.js".'); process.exit(1); }
  console.log('index.html em dia com src/.');
} else {
  fs.writeFileSync(OUT, out);
  console.log(`index.html gerado (${(out.length / 1024).toFixed(0)} KB).`);
}
