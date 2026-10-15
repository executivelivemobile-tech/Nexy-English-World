#!/usr/bin/env node
/* Agrupa as falas em blocos para a ElevenLabs (uma geração por bloco, separadas por [long pause]).
 *   node tools/voice/chunks.js [--only-missing]  → escreve tools/voice/chunks.json
 * Depois de gerar cada bloco, tools/voice/split.js corta o áudio nas pausas longas e cria um MP3 por fala.
 * O elenco (quem fala com qual voz) fica em CAST; trocar uma voz = mudar aqui e gerar de novo. */
'use strict';
const fs = require('fs'), path = require('path');
const { build, norm } = require('./lines');

const CAST = {
  echo:  { name: 'Lulu',        id: 'Lt0VPfndF8W0Iwvl0bDe', tag: '[warmly]' },  // a companheira: aveludada, sensual
  story: { name: 'Elder Rowan', id: 'N8jsIhEtPnj3PWFmH8hZ', tag: '[warmly]', tempo: 1.08 },  // o narrador do Baú: a mesma voz antiga das portas (pedido do dono)
  door:  { name: 'Elder Rowan', id: 'N8jsIhEtPnj3PWFmH8hZ', tag: '[slowly]', tempo: 1.15 },  // portas e altares: antiga, lenta, clara
  // tempo: acelera no corte sem mudar o tom (a Elder Rowan com [slowly] arrasta demais as frases curtas)
};
const MAX_LINES = 26, MAX_CHARS = 700;

function chunks(onlyMissing) {
  const manifest = path.join(__dirname, '..', '..', 'src', 'voice', 'manifest.json');
  const have = onlyMissing && fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')).clips : {};
  const lines = build().filter(l => !have[l.who + ':' + norm(l.text)]);
  const out = [];
  for (const who of Object.keys(CAST)) {
    // frases primeiro, palavras soltas depois (a voz mantém o ritmo dentro do bloco)
    const mine = lines.filter(l => l.who === who).sort((a, b) => (b.text.split(' ').length > 1) - (a.text.split(' ').length > 1));
    let cur = null;
    for (const l of mine) {
      const tagged = /^\[/.test(l.prompt) ? l.prompt : CAST[who].tag + ' ' + l.prompt;
      if (!cur || cur.lines.length >= MAX_LINES || cur.chars + tagged.length > MAX_CHARS) {
        cur = { id: who + '-' + (out.filter(c => c.who === who).length + 1), who, voice: CAST[who].id, lines: [], chars: 0 };
        out.push(cur);
      }
      cur.lines.push({ text: l.text, prompt: tagged }); cur.chars += tagged.length + 14;
    }
  }
  for (const c of out) c.prompt = c.lines.map(l => l.prompt).join(' [long pause] ');
  return out;
}

if (require.main === module) {
  const cs = chunks(process.argv.includes('--only-missing'));
  fs.writeFileSync(path.join(__dirname, 'chunks.json'), JSON.stringify(cs, null, 1) + '\n');
  for (const c of cs) console.log(c.id.padEnd(9), String(c.lines.length).padStart(3), 'falas', String(c.prompt.length).padStart(4), 'caracteres');
}
module.exports = { CAST, chunks };
