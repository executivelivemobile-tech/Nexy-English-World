#!/usr/bin/env node
/* Folha de evolução da Nexy: uma página que mostra os 6 estágios do visual, animados, usando o MESMO código do jogo
 * (src/62_nexy_look.js). Serve para o dono aprovar o visual antes de trocar o personagem nas fases.
 *   node tools/look_sheet.js <saida.html>     (sem esqueleto <html>/<body>: é publicada como página do claude.ai) */
'use strict';
const fs = require('fs'), path = require('path');
const look = fs.readFileSync(path.join(__dirname, '..', 'src', '62_nexy_look.js'), 'utf8');
const out = process.argv[2] || path.join(__dirname, 'nexy-evolution.html');

const html = `<title>Nexy Evolution Sheet</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
/* layout: uma faixa de título, os seis estágios em grade (a ordem é a evolução) e, embaixo, o tamanho real no jogo */
:root {
  --bg: #050409; --panel: #0b0912; --line: rgba(240,171,252,.16); --fg: #f4ecf7; --muted: #a596ad;
  --mag: #d946ef; --mag-hi: #f0abfc; --cy: #22d3ee;
  --f-display: 'Orbitron', 'Inter', system-ui, sans-serif; --f-body: 'Inter', system-ui, sans-serif; --f-mono: 'JetBrains Mono', ui-monospace, monospace;
  color-scheme: dark;
}
body { background: var(--bg); color: var(--fg); font: 400 15px/1.55 var(--f-body); }
.wrap { max-width: 1180px; margin: 0 auto; padding-block: 36px 56px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 28px; }
header { display: grid; gap: 8px; }
h1 { margin: 0; font: 900 clamp(34px, 6vw, 58px)/1 var(--f-display); letter-spacing: .12em; color: #fff; text-shadow: 0 0 18px rgba(217,70,239,.75), 0 0 2px #fff; text-wrap: balance; }
.lede { margin: 0; max-width: 64ch; color: var(--muted); }
.lede b { color: var(--mag-hi); font-weight: 600; }
.poses { display: flex; flex-wrap: wrap; gap: 8px; }
.poses button { font: 600 11px var(--f-display); letter-spacing: .16em; color: var(--muted); background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 9px 14px; cursor: pointer; }
.poses button[aria-pressed="true"] { color: #fff; border-color: var(--mag); box-shadow: 0 0 14px rgba(217,70,239,.45), inset 0 0 10px rgba(217,70,239,.2); }
.poses button:focus-visible { outline: 2px solid var(--cy); outline-offset: 2px; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 900px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .grid { grid-template-columns: minmax(0, 1fr); } }
.stage { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; display: grid; grid-template-rows: auto 1fr; min-width: 0; }
.stage canvas { width: 100%; aspect-ratio: 5 / 4; display: block; max-width: 100%; }
.info { padding: 14px 16px 16px; display: grid; gap: 6px; align-content: start; }
.tag { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.tag .n { font: 600 11px var(--f-mono); color: var(--cy); }
.tag .name { font: 700 15px var(--f-display); letter-spacing: .14em; color: #fff; }
.tag .pt { color: var(--mag-hi); font-weight: 500; }
.when { font: 400 11px var(--f-mono); letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }
.note { margin: 0; color: var(--muted); font-size: 14px; }
section h2 { margin: 0 0 6px; font: 700 14px var(--f-display); letter-spacing: .2em; color: #fff; }
section p { margin: 0; color: var(--muted); max-width: 70ch; }
.strip { display: grid; gap: 10px; }
.stripbox { border: 1px solid var(--line); border-radius: 14px; overflow-x: auto; background: #020205; }
.stripbox canvas { display: block; }
.scale { display: flex; gap: 8px; }
.how { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; }
@media (max-width: 700px) { .how { grid-template-columns: minmax(0, 1fr); } }
.how div { border-left: 1px solid var(--mag); padding-left: 12px; min-width: 0; }
.how b { display: block; color: #fff; font-weight: 600; margin-bottom: 2px; }
.how span { color: var(--muted); font-size: 14px; }
</style>
<div class="wrap">
  <header>
    <h1>NEXY</h1>
    <p class="lede">Do <b>rascunho de neon</b> na 1-1 até a <b>forma de fênix</b> no fim do jogo. Cada fase dá a chance de ganhar a próxima peça; o desenho fica mais rico junto com ele. Escolha uma pose para ver os seis estágios se movendo.</p>
  </header>
  <div class="poses" role="group" aria-label="Pose">
    <button id="p-idle" data-pose="idle" aria-pressed="false">PARADO</button>
    <button id="p-walk" data-pose="walk" aria-pressed="true">ANDANDO</button>
    <button id="p-run" data-pose="run" aria-pressed="false">CORRENDO</button>
    <button id="p-jump" data-pose="jump" aria-pressed="false">PULANDO</button>
    <button id="p-fall" data-pose="fall" aria-pressed="false">CAINDO</button>
    <button id="p-crouch" data-pose="crouch" aria-pressed="false">AGACHADO</button>
    <button id="p-slash" data-pose="slash" aria-pressed="false">GOLPE</button>
  </div>
  <div class="grid" id="grid"></div>
  <section class="strip">
    <h2>NO TAMANHO DO JOGO</h2>
    <p>Assim ela aparece jogando: a mesma caixa de colisão de hoje, então pulos e fases não mudam. Orelhas, cachecol e asas são só desenho.</p>
    <div class="scale" role="group" aria-label="Escala">
      <div class="poses"><button id="z1" data-zoom="1" aria-pressed="true">1× · CELULAR</button><button id="z2" data-zoom="2" aria-pressed="false">2× · TELA CHEIA</button></div>
    </div>
    <div class="stripbox"><canvas id="strip"></canvas></div>
  </section>
  <section>
    <h2>COMO É FEITO SEM PESAR O JOGO</h2>
    <div class="how">
      <div><b>Um boneco articulado</b><span>Quadril, tronco, cabeça, braços, pernas e cachecol se movem por código. A armadura são camadas novas presas ao mesmo esqueleto.</span></div>
      <div><b>Cada quadro é pintado uma vez</b><span>O brilho de neon é calculado na primeira vez e a imagem fica guardada. Depois o jogo só carimba, como nos sprites antigos.</span></div>
      <div><b>Mais detalhe onde aparece</b><span>Nas cenas épicas a câmera chega perto e o mesmo desenho sai em tamanho grande, com todos os detalhes.</span></div>
      <div><b>Paleta preservada</b><span>Magenta e ciano do começo ao fim. O fogo laranja das asas só existe na forma final, como prêmio.</span></div>
    </div>
  </section>
</div>
<script>
${look.replace(/<\/script>/g, '<\\/script>')}
(function () {
  const POSES = {
    idle: { speed: 0 }, walk: { speed: 1 }, run: { speed: 1.6 }, jump: { speed: 1, air: -1 }, fall: { speed: 1, air: 1 },
    crouch: { speed: 0, crouch: 1 }, slash: { speed: 0, arm: 'slash' },
  };
  let pose = 'walk', zoom = 1, t = 0, phase = 0, last = performance.now();
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const grid = document.getElementById('grid'), cards = [];
  NEXY_STAGES.forEach((s, i) => {
    const el = document.createElement('article'); el.className = 'stage';
    el.innerHTML = '<canvas id="stage-' + s.id + '" role="img" aria-label="Nexy, estágio ' + s.pt + '"></canvas>' +
      '<div class="info"><div class="tag"><span class="n">' + String(i + 1).padStart(2, '0') + '</span><span class="name">' + s.name + '</span><span class="pt">' + s.pt + '</span></div>' +
      '<div class="when">a partir de ' + s.from + '</div><p class="note">' + s.note + '</p></div>';
    grid.appendChild(el); cards.push({ c: el.querySelector('canvas'), s: i });
  });
  document.querySelectorAll('[data-pose]').forEach(b => b.addEventListener('click', () => {
    pose = b.dataset.pose; document.querySelectorAll('[data-pose]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (reduce) draw();
  }));
  document.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    zoom = +b.dataset.zoom; document.querySelectorAll('[data-zoom]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); NexyLook.cache.clear(); if (reduce) draw();
  }));
  const fit = c => { const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1; const w = Math.round(r.width * d), h = Math.round(r.height * d); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return { w, h, d }; };
  // fundo da carta: noite da cidade, chão de vidro com o reflexo do personagem
  function backdrop(x, w, h, d) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b0714'); g.addColorStop(1, '#030206'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(34,211,238,0.07)'; x.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const bx = (i * 0.13 + 0.02) * w, bw = w * 0.07, bh = h * (0.25 + ((i * 37) % 7) / 14); x.strokeRect(bx, h * 0.84 - bh, bw, bh); }
    x.fillStyle = 'rgba(217,70,239,0.05)'; x.fillRect(0, h * 0.84, w, h * 0.16);
    x.strokeStyle = 'rgba(240,171,252,0.35)'; x.beginPath(); x.moveTo(0, h * 0.84); x.lineTo(w, h * 0.84); x.stroke();
  }
  function poseNow(extra) { return Object.assign({ t, phase, speed: 0, air: 0, crouch: 0, arm: 'idle', boil: Math.floor(t * 3) % 3 }, POSES[pose], extra || {}); }
  function draw() {
    const p = poseNow();
    for (const card of cards) {
      const { w, h } = fit(card.c), x = card.c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); backdrop(x, w, h);
      const k = h / 92;   // a carta mostra a Nexy com uns 60 px do jogo de altura (orelhas incluídas)
      x.setTransform(k, 0, 0, k, w * 0.54, h * 0.84);
      NexyLook.paint(x, p, card.s, k);
      // reflexo no chão de vidro
      x.save(); x.globalAlpha = 0.12; x.scale(1, -0.45); NexyLook.paint(x, p, card.s, k); x.restore();
    }
    // tamanho real: os seis lado a lado, carimbados do cache como no jogo
    const sc = document.getElementById('strip'), d = window.devicePixelRatio || 1, W = 960, H = 150 * zoom;
    sc.style.width = (W * zoom) + 'px'; sc.style.height = H + 'px';
    if (sc.width !== W * zoom * d) { sc.width = W * zoom * d; sc.height = H * d; }
    const s = sc.getContext('2d');
    s.setTransform(d * zoom, 0, 0, d * zoom, 0, 0); s.fillStyle = '#020205'; s.fillRect(0, 0, W, 150);
    s.strokeStyle = 'rgba(34,211,238,0.35)'; s.beginPath(); s.moveTo(0, 118); s.lineTo(W, 118); s.stroke();
    s.fillStyle = 'rgba(34,211,238,0.06)'; for (let c = 0; c < 30; c++) s.fillRect(c * 32 + 1, 119, 30, 30);
    NEXY_STAGES.forEach((st, i) => {
      s.save(); s.translate(80 + i * 160, 118); NexyLook.draw(s, poseNow(), i, d * zoom); s.restore();
      s.fillStyle = '#a596ad'; s.font = '600 9px Orbitron, sans-serif'; s.textAlign = 'center'; s.fillText(st.name, 80 + i * 160, 140);
    });
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const sp = (POSES[pose].speed || 0); phase += dt * (sp > 1.3 ? 20.7 : sp > 0.5 ? 12.6 : 0);
    draw(); requestAnimationFrame(loop);
  }
  if (reduce) { t = 0.6; phase = 0.9; draw(); window.addEventListener('resize', draw); }
  else requestAnimationFrame(loop);
})();
</script>
`;
fs.writeFileSync(out, html);
console.log('folha de evolução:', out, Math.round(html.length / 1024) + ' KB');
