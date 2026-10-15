#!/usr/bin/env node
// Junta src/ num único index.html (o jogo continua sendo um arquivo autocontido).
//   node build.js          → gera index.html
//   node build.js --check  → só confere se index.html está em dia com src/ (sai com erro se não estiver)
// Os mapas ASCII ficam em src/levels/<id>.map e entram no lugar de /*MAP:<id>*/.
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
  '20_audio.js',        // efeitos, música em camadas, voz e reconhecimento de fala
  '30_input_render.js', // teclado, toque, escala e cache de brilhos
  '40_world.js',        // tiles, blocos, colisão, fundo em parallax e partículas
  '50_entities.js',     // inimigos, itens, portais, pedestal
  '55_entities2.js',    // peças da 1-2: lustres, tubos, Alado, Ladrão, gigantes, sinos, vidas, Echo gigante
  '60_player.js',       // jogador, Echo, câmera e desenho das portas
  '70_game.js',         // frases, painel, interface e laço principal
  '75_worldmap.js',     // transições (íris) e mapa-múndi
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

function build() {
  const html = PARTS.map(p => fs.readFileSync(path.join(SRC, p), 'utf8')).join('');
  return html.replace(/\/\*MAP:([\w-]+)\*\//g, (_, id) => mapRows(id));
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
