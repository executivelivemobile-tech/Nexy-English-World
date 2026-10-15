#!/usr/bin/env node
/* Corta o áudio de um bloco (tools/voice/chunks.json) em uma fala por arquivo e registra no manifesto.
 *   node tools/voice/split.js <id do bloco> <bloco.mp3> <bloco.words.json>
 * <bloco.words.json> é o alinhamento palavra a palavra da transcrição (ElevenLabs Scribe, grátis): diz onde cada fala
 * começa e termina. Os silêncios (ffmpeg silencedetect) dão a borda exata; o alinhamento decide qual trecho é de qual
 * fala e dá o tempo de cada palavra (o karaokê da leitura). Cada fala: volume normalizado, MP3 mono 24 kHz 48 kbps,
 * em src/voice/<quem>/<nome>.mp3, registrada em src/voice/manifest.json. */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { norm } = require('./lines');
const { CAST } = require('./chunks');

const ROOT = path.join(__dirname, '..', '..'), VOICE = path.join(ROOT, 'src', 'voice');
const MANIFEST = path.join(VOICE, 'manifest.json');

const duration = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
// trechos com som entre silêncios de pelo menos `d` segundos
function soundSpans(file, noise = -40, d = 0.25) {
  const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af silencedetect=noise=${noise}dB:d=${d} -f null - 2>&1`]).toString();
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  const total = duration(file), spans = []; let at = 0;
  starts.forEach((s, i) => { if (s - at > 0.04) spans.push([at, s]); at = ends[i] != null ? ends[i] : total; });
  if (total - at > 0.04) spans.push([at, total]);
  return spans;
}
const slug = s => norm(s).replace(/'/g, '').replace(/ /g, '-').slice(0, 48) || 'x';
const isTag = t => /^\[|\]$/.test(t);

// as palavras de cada fala no alinhamento (o texto da transcrição é o próprio prompt, com as etiquetas)
function alignLines(chunk, words) {
  let k = 0;
  return chunk.lines.map((l, i) => {
    const toks = l.prompt.split(/\s+/).filter(Boolean), mine = [];
    for (const t of toks) {
      while (k < words.length && words[k].text !== t) k++;   // tolera pequenas diferenças de espaço
      if (k < words.length) { if (!isTag(t)) mine.push(words[k]); k++; }
    }
    if (i < chunk.lines.length - 1) { while (k < words.length && words[k].text !== 'pause]') k++; k++; }
    if (!mine.length) throw new Error(`fala sem alinhamento: ${l.text}`);
    return { line: l, words: mine, s: mine[0].start, e: mine[mine.length - 1].end };
  });
}

function main() {
  const [id, file, wordsFile] = process.argv.slice(2);
  const chunk = JSON.parse(fs.readFileSync(path.join(__dirname, 'chunks.json'), 'utf8')).find(c => c.id === id);
  if (!chunk || !file || !wordsFile) { console.error('uso: node tools/voice/split.js <bloco> <bloco.mp3> <bloco.words.json>'); process.exit(1); }
  const al = alignLines(chunk, JSON.parse(fs.readFileSync(wordsFile, 'utf8')).words);
  const spans = soundSpans(file), total = duration(file);
  const man = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { cast: {}, clips: {} };
  for (const w in CAST) man.cast[w] = { name: CAST[w].name, id: CAST[w].id };
  const dir = path.join(VOICE, chunk.who); fs.mkdirSync(dir, { recursive: true });
  const tempo = CAST[chunk.who].tempo || 1;
  let warn = 0;
  al.forEach((a, i) => {
    // limites: metade do caminho até a fala vizinha (nunca invade outra fala)
    const lo = i ? (al[i - 1].e + a.s) / 2 : 0, hi = i < al.length - 1 ? (a.e + al[i + 1].s) / 2 : total;
    // os trechos com som que tocam esta fala, presos aos limites
    const mine = spans.filter(([s, e]) => e > a.s - 0.05 && s < a.e + 0.05).map(([s, e]) => [Math.max(s, lo), Math.min(e, hi)]);
    // o que vier primeiro / por último entre o som e o alinhamento (finais sussurrados ficam abaixo do limiar de silêncio)
    let s = Math.min(a.s, ...mine.map(x => x[0])), e = Math.max(a.e, ...mine.map(x => x[1]));
    s = Math.max(lo, s - 0.04); e = Math.min(hi, e + 0.08);
    if (!mine.length) { warn++; console.warn(`  ! conferir (sem som detectado): ${a.line.text} (${s.toFixed(2)}–${e.toFixed(2)})`); }
    const name = slug(a.line.text) + '.mp3', out = path.join(dir, name);
    execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-loglevel', 'error', '-y', '-ss', s.toFixed(3), '-to', e.toFixed(3), '-i', file,
      '-af', `afade=t=in:d=0.015,areverse,afade=t=in:d=0.05,areverse${tempo !== 1 ? ',atempo=' + tempo : ''},loudnorm=I=-17:TP=-1.5:LRA=9`,
      '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', out]);
    // karaokê: [índice do caractere no texto, segundos desde o começo do arquivo]
    const b = []; let pos = 0;
    for (const w of a.words) {
      const bare = w.text.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
      const at = bare ? a.line.text.toLowerCase().indexOf(bare.toLowerCase(), pos) : -1;
      if (at >= 0) { b.push([at, +(Math.max(0, w.start - s) / tempo).toFixed(2)]); pos = at + bare.length; }
    }
    man.clips[chunk.who + ':' + norm(a.line.text)] = { file: chunk.who + '/' + name, text: a.line.text, dur: +((e - s) / tempo).toFixed(2), b, from: id };
  });
  const sorted = {}; for (const k of Object.keys(man.clips).sort()) sorted[k] = man.clips[k];
  man.clips = sorted;
  fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 1) + '\n');
  console.log(`${id}: ${al.length} falas gravadas${warn ? `, ${warn} para conferir` : ''}.`);
}
main();
