
/* ============================== ÁUDIO: EFEITOS (Web Audio) ============================== */
const AudioSys = {
  ctx: null, master: null, sfx: null, music: null, duckNode: null, verb: null, noiseBuf: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.5; this.sfx.connect(this.master);
    this.duckNode = c.createGain(); this.duckNode.gain.value = 1; this.duckNode.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = 0.2; this.music.connect(this.duckNode);
    // ruído branco reutilizável
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // reverb gótico (impulso sintético)
    const len = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const b = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) b[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    const wet = c.createGain(); wet.gain.value = 0.32; this.verb.connect(wet); wet.connect(this.master);
    Music.init();
  },
  get t() { return this.ctx ? this.ctx.currentTime : 0; },
  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    if (m) Voice.stop();
  },
  duck(on) { if (this.ctx) this.duckNode.gain.setTargetAtTime(on ? 0.3 : 1, this.ctx.currentTime, on ? 0.05 : 0.35); },
};

// Oscilador com envelope. opts: to (glide), glide, a (attack), filter {type,freq,q,to}, dest, detune, verb
function tone(type, freq, when, dur, vol, opts = {}) {
  const A = AudioSys; if (!A.ctx) return;
  const c = A.ctx, t = Math.max(when, c.currentTime);
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (opts.detune) o.detune.value = opts.detune;
  if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(opts.to, 1), t + (opts.glide || dur));
  const a = opts.a || 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  if (opts.hold) g.gain.setValueAtTime(vol, t + a + opts.hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (opts.filter) {
    const f = c.createBiquadFilter(); f.type = opts.filter.type || 'lowpass';
    f.frequency.setValueAtTime(opts.filter.freq, t); f.Q.value = opts.filter.q || 0.7;
    if (opts.filter.to) f.frequency.exponentialRampToValueAtTime(opts.filter.to, t + dur);
    o.connect(f); node = f;
  }
  node.connect(g); g.connect(opts.dest || A.sfx);
  if (opts.verb && A.verb) g.connect(A.verb);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(when, dur, vol, opts = {}) {
  const A = AudioSys; if (!A.ctx) return;
  const c = A.ctx, t = Math.max(when, c.currentTime);
  const s = c.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = opts.type || 'highpass'; f.frequency.setValueAtTime(opts.freq || 1000, t); f.Q.value = opts.q || 0.8;
  if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (opts.a || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(opts.dest || A.sfx);
  if (opts.verb && A.verb) g.connect(A.verb);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

const SFX = {
  // TO BE PALACE: o elmo do cavaleiro e a alavanca do interruptor do ser
  clang() { const t = AudioSys.t; for (const [f, a] of [[1240, 0.06], [1870, 0.04], [2630, 0.025]]) tone('triangle', f, t, 0.5, a, { verb: true }); noise(t, 0.05, 0.08, { freq: 5000 }); },
  lever() { const t = AudioSys.t; tone('sawtooth', 70, t, 0.5, 0.25, { to: 35, filter: { freq: 500 } }); noise(t, 0.4, 0.25, { type: 'lowpass', freq: 900 }); tone('sine', 55, t, 1.2, 0.4, { to: 30 }); },
  // WORLD 1-3: o trovão da chuva, a buzina do trem, a gárgula virando pedra e a caixa de neon voando e pousando
  thunder(k = 1) { const t = AudioSys.t; noise(t, 2.6, 0.32 * k, { type: 'lowpass', freq: 380, to: 90, a: 0.04, verb: true }); tone('sine', 48, t, 2.2, 0.35 * k, { to: 30, glide: 2 }); noise(t, 0.12, 0.12 * k, { type: 'bandpass', freq: 1400, q: 0.6 }); },
  horn() { const t = AudioSys.t; for (const [f, d] of [[311, 0], [392, 0.02]]) tone('sawtooth', f, t + d, 0.7, 0.05, { a: 0.03, hold: 0.45, filter: { freq: 1400 }, verb: true }); },
  stone() { const t = AudioSys.t; noise(t, 0.22, 0.16, { type: 'lowpass', freq: 700, to: 260 }); tone('triangle', 140, t, 0.18, 0.12, { to: 70 }); },
  wake() { const t = AudioSys.t; noise(t, 0.3, 0.1, { type: 'bandpass', freq: 900, to: 2400, q: 1.2 }); tone('sine', 520, t, 0.25, 0.05, { to: 980 }); },
  boxFly() { const t = AudioSys.t; tone('sine', 320, t, 0.5, 0.07, { to: 900, glide: 0.45 }); noise(t, 0.45, 0.06, { type: 'bandpass', freq: 1200, to: 3600, q: 1.4 }); },
  boxLand() { const t = AudioSys.t; tone('sine', 110, t, 0.3, 0.4, { to: 46 }); tone('triangle', 660, t, 0.25, 0.05, { verb: true }); noise(t, 0.12, 0.14, { type: 'lowpass', freq: 900 }); },
  // o "bug" de propósito: estalos digitais e chiado
  glitch() { const t = AudioSys.t; for (let i = 0; i < 7; i++) tone('square', 80 + Math.random() * 900, t + i * 0.045, 0.04, 0.05, { filter: { freq: 2600 } }); noise(t, 0.35, 0.12, { type: 'bandpass', freq: 3200, q: 0.8 }); },
  // 1-3: o laser do Nexy (comum e carregado), a estrela, os tiros e a mira dos drones, o feixe ligando, o núcleo do chefe
  laser() { const t = AudioSys.t; tone('square', 1900, t, 0.09, 0.035, { to: 700, filter: { freq: 4200 } }); tone('sine', 1200, t, 0.08, 0.05, { to: 2200 }); },
  blast() { const t = AudioSys.t; tone('sawtooth', 900, t, 0.35, 0.08, { to: 140, filter: { freq: 2600 } }); tone('sine', 180, t, 0.3, 0.3, { to: 60 }); noise(t, 0.25, 0.14, { type: 'bandpass', freq: 1800, to: 500, q: 0.8 }); },
  charged() { const t = AudioSys.t; for (const [f, d] of [[1320, 0], [1980, 0.06], [2640, 0.12]]) tone('sine', f, t + d, 0.18, 0.04, { verb: true }); },
  star() { const t = AudioSys.t; [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => tone('square', midi(n), t + i * 0.04, 0.16, 0.035, { filter: { freq: 3800 }, verb: true })); },
  enemyShot() { const t = AudioSys.t; tone('sawtooth', 700, t, 0.14, 0.035, { to: 260, filter: { freq: 1800 } }); },
  aim() { const t = AudioSys.t; tone('sine', 1800, t, 0.06, 0.025); tone('sine', 1800, t + 0.12, 0.06, 0.025); },
  beamOn() { const t = AudioSys.t; tone('sawtooth', 120, t, 0.25, 0.05, { to: 240, filter: { freq: 900 } }); noise(t, 0.2, 0.05, { type: 'bandpass', freq: 2600, q: 2 }); },
  bossHit() { const t = AudioSys.t; tone('square', 300, t, 0.12, 0.08, { to: 120, filter: { freq: 2000 } }); tone('triangle', 1400, t, 0.18, 0.05, { verb: true }); noise(t, 0.08, 0.15, { freq: 2500 }); },
  // o tiro da Echo e o cristal que paralisa
  zap() { const t = AudioSys.t; tone('sawtooth', 1500, t, 0.12, 0.05, { to: 320, filter: { freq: 3200 } }); tone('sine', 900, t, 0.1, 0.06, { to: 1800 }); },
  freeze() { const t = AudioSys.t; tone('triangle', 1700, t, 0.28, 0.05, { to: 2700 }); tone('sine', 2600, t + 0.05, 0.22, 0.03, { to: 3400 }); noise(t, 0.18, 0.04, { type: 'highpass', freq: 5200 }); },
  jump() { const t = AudioSys.t; tone('square', 210, t, 0.16, 0.07, { to: 540, glide: 0.12, filter: { freq: 1800 } }); tone('sine', 420, t, 0.14, 0.08, { to: 900 }); },
  spin() { const t = AudioSys.t; noise(t, 0.28, 0.12, { type: 'bandpass', freq: 700, to: 3800, q: 2.5 }); tone('sawtooth', 280, t, 0.2, 0.04, { to: 760, filter: { freq: 1500 } }); },
  stomp(n = 0) {
    const t = AudioSys.t, up = Math.min(n, 8) * 0.06;
    tone('sine', 190 * (1 + up), t, 0.16, 0.5, { to: 45 }); noise(t, 0.07, 0.25, { type: 'lowpass', freq: 900 });
    tone('square', 520 * (1 + up), t + 0.01, 0.06, 0.05, { filter: { freq: 2000 } });
  },
  kick() { const t = AudioSys.t; tone('square', 640, t, 0.07, 0.08, { to: 180, filter: { freq: 2400 } }); noise(t, 0.04, 0.15, { freq: 3000 }); },
  thud() { const t = AudioSys.t; tone('triangle', 150, t, 0.07, 0.18, { to: 90 }); },
  orb() { const t = AudioSys.t; tone('triangle', 1318.5, t, 0.08, 0.1); tone('sine', 1760, t + 0.045, 0.22, 0.12); tone('sine', 3520, t + 0.045, 0.12, 0.025); },
  bump() { const t = AudioSys.t; tone('triangle', 240, t, 0.12, 0.22, { to: 520, glide: 0.06 }); tone('sine', 110, t, 0.1, 0.25, { to: 70 }); },
  glass() {
    const t = AudioSys.t; noise(t, 0.32, 0.26, { freq: 2600, verb: true });
    for (let i = 0; i < 7; i++) tone('sine', 2200 + Math.random() * 3800, t + i * 0.022, 0.16, 0.05, { verb: true });
  },
  wordAppear() { const t = AudioSys.t; [81, 84, 88, 93].forEach((n, i) => tone('sine', midi(n), t + i * 0.055, 0.5, 0.06, { verb: true })); },
  wordCollect() { const t = AudioSys.t; tone('sine', 880, t, 0.18, 0.08, { to: 1320 }); tone('triangle', 1760, t + 0.06, 0.25, 0.04, { verb: true }); },
  place() { const t = AudioSys.t; tone('triangle', 660, t, 0.08, 0.1, { to: 990 }); },
  remove() { const t = AudioSys.t; tone('triangle', 520, t, 0.08, 0.08, { to: 330 }); },
  select() { const t = AudioSys.t; tone('sine', 1100, t, 0.04, 0.04); },
  powerup() { const t = AudioSys.t; [57, 61, 64, 69, 73, 76, 81].forEach((n, i) => tone('sawtooth', midi(n), t + i * 0.045, 0.22, 0.045, { filter: { freq: 2600 }, verb: true })); },
  reserve() { const t = AudioSys.t; tone('sine', midi(88), t, 0.3, 0.08, { verb: true }); tone('sine', midi(93), t + 0.09, 0.4, 0.07, { verb: true }); },
  damage() { const t = AudioSys.t; tone('sawtooth', 620, t, 0.34, 0.14, { to: 140, filter: { freq: 1500 } }); noise(t, 0.12, 0.1, { type: 'bandpass', freq: 900 }); },
  death() { const t = AudioSys.t; [76, 72, 69, 64, 57].forEach((n, i) => tone('triangle', midi(n), t + i * 0.13, 0.3, 0.14, { verb: true })); },
  checkpoint() { const t = AudioSys.t; tone('sine', midi(81), t, 1.4, 0.1, { verb: true }); tone('sine', midi(88), t + 0.08, 1.4, 0.07, { verb: true }); tone('sine', midi(93), t + 0.16, 1.6, 0.05, { verb: true }); },
  doorOpen() {
    const t = AudioSys.t; noise(t, 1.4, 0.16, { type: 'bandpass', freq: 300, to: 4000, q: 1.2, a: 0.3, verb: true });
    tone('sine', 110, t, 1.6, 0.18, { to: 440, glide: 1.4, verb: true });
  },
  tape(level) { const t = AudioSys.t; [69, 73, 76, 81, 85].forEach((n, i) => tone('square', midi(n), t + i * 0.08, 0.3, 0.05, { filter: { freq: 2400 }, verb: true })); if (level > 0.5) tone('sine', midi(93), t + 0.42, 1.2, 0.08, { verb: true }); },
  goal() { const t = AudioSys.t; [57, 61, 64, 69].forEach(n => tone('sawtooth', midi(n), t, 2.2, 0.04, { a: 0.05, filter: { freq: 1600 }, verb: true })); },
  oneUp() { const t = AudioSys.t; [76, 79, 88, 84, 86, 91].forEach((n, i) => tone('square', midi(n), t + i * 0.07, 0.12, 0.05, { filter: { freq: 3000 } })); },
  wrong() {
    const t = AudioSys.t; [57, 58, 63].forEach(n => tone('sawtooth', midi(n), t, 0.9, 0.06, { a: 0.02, filter: { freq: 900 }, verb: true }));
    tone('sine', midi(45), t, 0.8, 0.14, { detune: 30 });
  },
  right() { Music.resolve(); },
  lantern() { const t = AudioSys.t; noise(t, 0.2, 0.18, { freq: 3500, verb: true }); tone('sine', midi(86), t, 0.5, 0.06, { verb: true }); tone('triangle', 300, t, 0.1, 0.12, { to: 180 }); },
  letter() { const t = AudioSys.t; tone('sine', midi(84), t, 0.6, 0.09, { verb: true }); tone('sine', midi(91), t + 0.08, 0.8, 0.07, { verb: true }); tone('triangle', midi(96), t + 0.16, 0.5, 0.03, { verb: true }); },
  grow() { const t = AudioSys.t; tone('sawtooth', 110, t, 1.0, 0.1, { to: 880, glide: 0.9, filter: { freq: 600, to: 4000 }, verb: true }); noise(t, 0.9, 0.08, { type: 'bandpass', freq: 400, to: 3000, q: 2 }); },
  shrink() { const t = AudioSys.t; tone('sawtooth', 880, t, 1.0, 0.1, { to: 110, glide: 0.9, filter: { freq: 4000, to: 500 }, verb: true }); noise(t, 0.9, 0.08, { type: 'bandpass', freq: 3000, to: 400, q: 2 }); },
  crush() { const t = AudioSys.t; tone('sine', 90, t, 0.3, 0.5, { to: 30 }); noise(t, 0.2, 0.2, { type: 'lowpass', freq: 600 }); },
  pop() { const t = AudioSys.t; tone('square', 900, t, 0.08, 0.06, { to: 300, filter: { freq: 3000 } }); noise(t, 0.08, 0.12, { freq: 2000 }); },
  summon() { const t = AudioSys.t; tone('sine', midi(57), t, 0.6, 0.06, { to: midi(69), verb: true }); },
  dash() { const t = AudioSys.t; noise(t, 0.14, 0.07, { type: 'bandpass', freq: 1200, to: 3200, q: 2 }); tone('triangle', 330, t, 0.1, 0.05, { to: 520 }); },
  ui() { const t = AudioSys.t; tone('sine', 1320, t, 0.05, 0.04); },
  // íris da transição: fechando desce, abrindo sobe
  iris(closing) {
    const t = AudioSys.t;
    noise(t, 0.55, 0.1, { type: 'bandpass', freq: closing ? 3200 : 380, to: closing ? 320 : 3600, q: 1.6, verb: true });
    tone('sine', closing ? 880 : 220, t, 0.55, 0.06, { to: closing ? 196 : 880, verb: true });
    if (!closing) tone('sine', midi(93), t + 0.32, 0.9, 0.04, { verb: true });
  },
  bell(n = 0) { const t = AudioSys.t, f = midi([72, 76, 79, 84, 67][n % 5]); tone('sine', f, t, 2.2, 0.12, { verb: true }); tone('sine', f * 2.76, t, 1.2, 0.04, { verb: true }); tone('sine', f * 5.4, t, 0.5, 0.02, { verb: true }); },
  steal() { const t = AudioSys.t; tone('square', 988, t, 0.09, 0.05, { to: 330, filter: { freq: 2400 } }); tone('square', 660, t + 0.09, 0.12, 0.05, { to: 220, filter: { freq: 2400 } }); },
  rune(up) { const t = AudioSys.t; [0, 4, 7, 12].forEach((iv, i) => tone('triangle', midi((up ? 64 : 76) + (up ? iv : -iv)), t + i * 0.06, 0.5, 0.05, { verb: true })); },
  moon() { const t = AudioSys.t; [69, 73, 76, 81, 85, 88, 93].forEach((n, i) => tone('sine', midi(n), t + i * 0.09, 1.4, 0.06, { verb: true })); },
  // ---- cena do Baú da Memória (pegada épica: tambor de guerra, coro, impacto pesado) ----
  // sonar do Echo: um "ping" que se espalha
  sonar(v = 1) {
    const t = AudioSys.t;
    tone('sine', 1320, t, 0.7, 0.09 * v, { to: 660, glide: 0.5, verb: true }); tone('sine', 1980, t + 0.02, 0.4, 0.03 * v, { to: 990, verb: true });
    tone('triangle', 220, t, 0.25, 0.08 * v, { to: 160 });
  },
  rumble(d = 1.2) { const t = AudioSys.t; noise(t, d, 0.22, { type: 'lowpass', freq: 140, a: 0.3 }); tone('sine', 41, t, d, 0.18, { a: 0.3 }); },
  warDrum() {
    const t = AudioSys.t;
    tone('sine', 72, t, 1.1, 0.75, { to: 34, glide: 0.5 }); tone('triangle', 120, t, 0.35, 0.3, { to: 55 });
    noise(t, 0.3, 0.35, { type: 'lowpass', freq: 520 }); noise(t, 0.05, 0.2, { freq: 2500 });
  },
  heartbeat() { const t = AudioSys.t; tone('sine', 64, t, 0.16, 0.45, { to: 40 }); tone('sine', 58, t + 0.15, 0.2, 0.35, { to: 36 }); },
  shimmer() { const t = AudioSys.t; for (let i = 0; i < 12; i++) tone('sine', midi(84 + (i % 6) * 2 + Math.floor(i / 6) * 12), t + i * 0.05, 0.6, 0.025, { verb: true }); },
  choir(d = 3) {
    const t = AudioSys.t;
    for (const n of [57, 60, 64, 69]) for (const dt of [-8, 8]) tone('sawtooth', midi(n), t, d, 0.02, { a: d * 0.45, hold: d * 0.3, filter: { freq: 1200 }, detune: dt, verb: true });
  },
  riser(d = 1) { const t = AudioSys.t; noise(t, d, 0.12, { type: 'bandpass', freq: 250, to: 5200, q: 1.4, a: d * 0.8 }); tone('sawtooth', 110, t, d, 0.04, { to: 880, glide: d, filter: { freq: 900, to: 4000 }, a: d * 0.7 }); },
  impact() {
    const t = AudioSys.t;
    tone('sine', 58, t, 1.6, 0.95, { to: 24, glide: 0.9 }); tone('triangle', 160, t, 0.5, 0.4, { to: 40 });
    noise(t, 0.7, 0.55, { type: 'lowpass', freq: 900, to: 120 }); noise(t, 0.25, 0.35, { freq: 3200, verb: true });
  },
  shatter() {
    const t = AudioSys.t; noise(t, 1.4, 0.3, { freq: 2400, to: 900, verb: true });
    for (let i = 0; i < 26; i++) tone('sine', 1800 + Math.random() * 4800, t + Math.random() * 0.9, 0.25, 0.04, { verb: true });
  },
};

/* ============================== MÚSICA PROCEDURAL ==============================
   Darksynth gótico em Lá menor, 96 BPM. Camadas: baixo em arpejo, pad grave, órgão, percussão. */
const Music = {
  bpm: 96, step: 0, next: 0, timer: null, bus: {}, target: { bass: 1, pad: 1, organ: 1, perc: 0.8 }, drone: null, variant: 'world1', lp: null, boost: 1,
  // progressão de 8 compassos: Am F C G | Am F Dm E
  chords: [[45, 0], [41, 1], [48, 1], [43, 1], [45, 0], [41, 1], [38, 0], [40, 1]],
  // melodia curta de órgão nos compassos 5–8: [passo, nota MIDI, duração em passos]
  melody: {
    4: [[0, 69, 4], [4, 72, 4], [8, 76, 4], [12, 81, 4]],
    5: [[0, 77, 6], [6, 76, 2], [8, 72, 8]],
    6: [[0, 74, 4], [4, 77, 4], [8, 76, 4], [12, 74, 4]],
    7: [[0, 71, 4], [4, 68, 4], [8, 64, 8]],
  },
  // variações por fase: a mesma progressão; mudam andamento, a melodia do órgão e alguns enfeites
  VARIANTS: {
    world1: { bpm: 96 },
    // mapa: mais calmo, sem bateria cheia, só um sino suave a cada ciclo
    map: { bpm: 84, melody: {}, bell: true, perc: 0.25 },
    // 1-2: 100 BPM, o órgão "responde" à melodia da 1-1, coro e sino no começo do ciclo
    nave: {
      bpm: 100, choir: true, bell: true,
      melody: {
        4: [[0, 81, 4], [4, 76, 4], [8, 72, 4], [12, 69, 4]],
        5: [[0, 72, 6], [6, 74, 2], [8, 77, 8]],
        6: [[0, 74, 4], [4, 69, 4], [8, 74, 4], [12, 77, 4]],
        7: [[0, 76, 4], [4, 80, 4], [8, 83, 8]],
      },
    },
    // TO BE PALACE: Ré menor, 84 BPM, o tique-taque do relógio e um cravo gótico por cima
    palace: {
      bpm: 84, bell: true, choir: true, tick: true,
      chords: [[38, 0], [46, 1], [41, 1], [48, 1], [38, 0], [46, 1], [43, 0], [45, 1]],
      melody: {
        4: [[0, 74, 4], [4, 77, 4], [8, 81, 4], [12, 77, 4]],
        5: [[0, 82, 6], [6, 81, 2], [8, 77, 8]],
        6: [[0, 79, 4], [4, 77, 4], [8, 74, 4], [12, 72, 4]],
        7: [[0, 73, 4], [4, 76, 4], [8, 81, 8]],
      },
    },
    // 1-3 · a cidade na chuva: Mi menor, 108 BPM, synthwave por cima do órgão e o chiado da chuva o tempo todo
    city: {
      bpm: 108, bell: true, rain: true,
      chords: [[40, 0], [48, 1], [43, 1], [50, 1], [40, 0], [48, 1], [45, 0], [47, 1]],
      melody: {
        4: [[0, 76, 3], [3, 79, 3], [6, 83, 2], [8, 88, 8]],
        5: [[0, 84, 4], [4, 83, 4], [8, 79, 8]],
        6: [[0, 81, 3], [3, 84, 3], [6, 88, 2], [8, 86, 8]],
        7: [[0, 83, 4], [4, 78, 4], [8, 75, 8]],
      },
    },
  },
  setVariant(name) {
    const v = this.VARIANTS[name] || this.VARIANTS.world1;
    this.variant = name; this.bpm = v.bpm; this.cur = v;
    this.zone({}); this.rain(!!v.rain);
  },
  // chuva: um chiado contínuo (ruído filtrado em laço) enquanto a fase tem chuva
  rain(on) {
    const A = AudioSys, c = A.ctx; if (!c) return;
    if (on && !this.rainNode) {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
      s.buffer = A.noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.5; f2.type = 'lowpass'; f2.frequency.value = 6000;
      g.gain.value = 0.0001; s.connect(f); f.connect(f2); f2.connect(g); g.connect(A.sfx);
      g.gain.setTargetAtTime(0.05, c.currentTime, 0.8); s.start();
      this.rainNode = { s, g };
    } else if (!on && this.rainNode) {
      const r = this.rainNode; this.rainNode = null;
      r.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.3); r.s.stop(c.currentTime + 1.5);
    }
  },
  // zonas da fase: muffle = abafada (cripta), boost = percussão em crescendo (campanário)
  zone(z) {
    const c = AudioSys.ctx; this.boost = z.boost ? 1.35 : 1;
    if (!c || !this.lp) return;
    this.lp.frequency.setTargetAtTime(z.muffle ? 650 : 18000, c.currentTime, 0.4);
    this.set({});
  },
  init() {
    const A = AudioSys, c = A.ctx;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 18000; this.lp.connect(A.music);
    for (const k of ['bass', 'pad', 'organ', 'perc']) {
      const g = c.createGain(); g.gain.value = this.target[k] * this.vol(k); g.connect(this.lp); this.bus[k] = g;
    }
    this.bus.pad.connect(A.verb); this.bus.organ.connect(A.verb);
    this.next = c.currentTime + 0.1; this.step = 0;
    this.timer = setInterval(() => this.tick(), 25);
    if (this.cur && this.cur.rain) this.rain(true);
  },
  vol(k) { const v = this.cur || {}; return { bass: 1, pad: 0.9, organ: 0.75, perc: 0.7 * (v.perc != null ? v.perc : 1) * this.boost }[k]; },
  set(levels) {
    const c = AudioSys.ctx; Object.assign(this.target, levels);
    if (!c) return;
    for (const k in this.bus) this.bus[k].gain.setTargetAtTime(this.target[k] * this.vol(k), c.currentTime, 0.25);
  },
  normal() { this.set({ bass: 1, pad: 1, organ: 1, perc: 0.8 }); this.setDrone(false); },
  layers(n) { this.set({ bass: n > 0 ? 1 : 0, pad: n > 1 ? 1 : 0, organ: n > 2 ? 1 : 0, perc: n > 3 ? 0.8 : 0 }); this.setDrone(true); },
  setDrone(on) {
    const A = AudioSys, c = A.ctx; if (!c) return;
    if (on && !this.drone) {
      const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = midi(33); o2.type = 'sine'; o2.frequency.value = midi(45);
      f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = 0.0001;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(A.music); g.connect(A.verb);
      g.gain.setTargetAtTime(0.16, c.currentTime, 0.6); o.start(); o2.start();
      this.drone = { o, o2, g };
    } else if (!on && this.drone) {
      const d = this.drone; this.drone = null;
      d.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.3); d.o.stop(c.currentTime + 1.5); d.o2.stop(c.currentTime + 1.5);
    }
  },
  resolve() {
    const t = AudioSys.t;
    [57, 61, 64, 69, 73].forEach((n, i) => {
      tone('sawtooth', midi(n), t + i * 0.03, 2.6, 0.035, { a: 0.08, filter: { freq: 2200, to: 900 }, verb: true, dest: AudioSys.music, detune: -6 });
      tone('sine', midi(n + 12), t + i * 0.03, 2.4, 0.05, { a: 0.05, verb: true, dest: AudioSys.music });
    });
    tone('sine', midi(33), t, 2.4, 0.3, { dest: AudioSys.music });
    this.normal();
  },
  tick() {
    const c = AudioSys.ctx; if (!c) return;
    if (c.state !== 'running') { this.next = c.currentTime + 0.05; return; }
    const sp = 60 / this.bpm / 4;
    if (this.next < c.currentTime - 0.5) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.15) { this.play(this.step, this.next, sp); this.next += sp; this.step = (this.step + 1) % 128; }
  },
  play(step, t, sp) {
    const bar = Math.floor(step / 16), s = step % 16, [root, maj] = ((this.cur && this.cur.chords) || this.chords)[bar], third = maj ? 4 : 3;
    const B = this.bus;
    // baixo em arpejo (colcheias)
    if (s % 2 === 0) {
      const pat = [0, 12, 7, 12, third, 12, 7, 12][s / 2];
      tone('sawtooth', midi(root + pat), t, sp * 1.7, 0.16, { filter: { freq: 380, to: 1300, q: 4 }, dest: B.bass });
      if (s === 0 || s === 8) tone('sine', midi(root - 12), t, sp * 3.5, 0.22, { dest: B.bass });
    }
    // pad grave
    if (s === 0) {
      for (const iv of [0, third, 7, 12]) {
        tone('sawtooth', midi(root + 12 + iv), t, sp * 16, 0.022, { a: 0.6, hold: sp * 11, filter: { freq: 750 }, detune: 7, dest: B.pad });
        tone('sawtooth', midi(root + 12 + iv), t, sp * 16, 0.022, { a: 0.6, hold: sp * 11, filter: { freq: 750 }, detune: -7, dest: B.pad });
      }
    }
    const V = this.cur || {};
    // sino no começo de cada ciclo de 8 compassos e coro suave (variações)
    if (V.bell && step === 0) { const f = midi(81); tone('sine', f, t, 3.2, 0.05, { verb: true, dest: B.pad }); tone('sine', f * 2.76, t, 1.6, 0.018, { verb: true, dest: B.pad }); }
    if (V.choir && s === 0) for (const iv of [0, 7, 12 + third]) for (const dt of [-5, 5]) tone('triangle', midi(root + 24 + iv), t, sp * 16, 0.012, { a: 1.1, hold: sp * 10, filter: { freq: 1500 }, detune: dt, dest: B.pad });
    // órgão
    const mel = (V.melody || this.melody)[bar];
    if (mel) for (const [ms, n, len] of mel) if (ms === s) {
      const d = len * sp;
      tone('sine', midi(n), t, d, 0.05, { a: 0.02, hold: d * 0.7, dest: B.organ });
      tone('sine', midi(n + 12), t, d, 0.022, { a: 0.02, hold: d * 0.7, dest: B.organ });
      tone('sine', midi(n + 19), t, d, 0.011, { a: 0.02, hold: d * 0.7, dest: B.organ });
    }
    // o relógio do palácio: tique-taque em semínimas
    if (V.tick && s % 4 === 0) tone('square', s % 8 === 0 ? 2400 : 1800, t, 0.025, 0.02, { filter: { freq: 3000 }, dest: B.perc });
    // percussão
    if (s === 0 || s === 8 || (s === 10 && bar % 2 === 1)) tone('sine', 130, t, 0.22, 0.5, { to: 38, glide: 0.12, dest: B.perc });
    if (s === 4 || s === 12) { noise(t, 0.14, 0.16, { type: 'bandpass', freq: 1700, q: 0.9, dest: B.perc }); tone('triangle', 190, t, 0.06, 0.1, { to: 120, dest: B.perc }); }
    if (s % 2 === 0) noise(t, 0.035, s % 4 === 2 ? 0.05 : 0.025, { freq: 7500, dest: B.perc });
  },
};

/* ============================== VOZ: gravada em estúdio (ElevenLabs) e, de reserva, a do aparelho ============================== */
// VOICE_PACK vem do build (src/voice/manifest.json + os MP3): { cast: { echo|story|door: { name } },
// clips: { 'quem:texto normalizado': [mp3 em base64, [[índice do caractere, segundos], ...]] } }.
// As marcas de tempo vêm da transcrição (ElevenLabs Scribe) e acendem o karaokê da leitura.
const VoiceClips = {
  pack: /*VOICE_PACK*/null,
  bufs: {}, pending: {}, sources: [], timers: [], out: null,
  key(who, text) { return who + ':' + String(text).toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim(); },
  has() { return !!(this.pack && this.pack.clips && Object.keys(this.pack.clips).length); },
  name(who) { const c = this.pack && this.pack.cast && this.pack.cast[who]; return c ? c.name : 'Studio'; },
  load(k) {
    if (this.bufs[k]) return Promise.resolve(this.bufs[k]);
    if (this.pending[k]) return this.pending[k];
    const c = AudioSys.ctx, e = this.pack && this.pack.clips[k];
    if (!c || !e) return Promise.resolve(null);
    const bin = atob(e[0]), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return (this.pending[k] = new Promise(res => {
      const ok = b => { this.bufs[k] = b; delete this.pending[k]; res(b); }, bad = () => { delete this.pending[k]; res(null); };
      try { const p = c.decodeAudioData(u8.buffer, ok, bad); if (p && p.catch) p.catch(bad); } catch (err) { bad(); }
    }));
  },
  // decodifica tudo aos poucos, em segundo plano, para a primeira fala não atrasar
  warm() {
    if (!this.has() || !AudioSys.ctx || this.warming) return;
    this.warming = true;
    const ks = Object.keys(this.pack.clips); let i = 0;
    const step = () => { const n = Math.min(ks.length, i + 4); for (; i < n; i++) this.load(ks[i]); if (i < ks.length) setTimeout(step, 80); };
    setTimeout(step, 500);
  },
  // o que tocar: a fala inteira; numa porta, palavra por palavra (a porta repete o que você disse); senão outra voz
  plan(who, text) {
    const clips = this.pack.clips, k = this.key(who, text);
    if (clips[k]) return [{ k, off: 0 }];
    if (who === 'door') {
      const out = []; let pos = 0, ok = true;
      for (const w of text.split(/\s+/)) {
        const at = text.indexOf(w, pos); pos = at + w.length;
        if (!this.key('', w).slice(1)) continue;
        const kk = this.key('door', w);
        if (!clips[kk]) { ok = false; break; }
        out.push({ k: kk, off: at });
      }
      if (ok && out.length) return out;
    }
    for (const o of ['echo', 'story', 'door']) { const kk = this.key(o, text); if (o !== who && clips[kk]) return [{ k: kk, off: 0 }]; }
    return null;
  },
  play(plan, who, opts, live, done) {
    Promise.all(plan.map(p => this.load(p.k))).then(bufs => {
      if (!live()) return;
      if (bufs.some(b => !b)) { done(true); return; }
      const c = AudioSys.ctx, rate = opts.pitch || 1;
      const out = c.createGain(); out.gain.value = opts.volume != null ? opts.volume : 1; out.connect(AudioSys.master);
      // a porta fala dentro da catedral; o Echo tem um brilho de eco; o narrador fica seco
      const send = { door: 0.6, echo: 0.16, story: 0.05 }[who] || 0;
      if (send && AudioSys.verb) { const s = c.createGain(); s.gain.value = send; out.connect(s); s.connect(AudioSys.verb); }
      this.out = out;
      let t = c.currentTime + 0.03;
      plan.forEach((p, i) => {
        const src = c.createBufferSource(); src.buffer = bufs[i]; src.playbackRate.value = rate; src.connect(out); src.start(t);
        this.sources.push(src);
        if (opts.onBoundary) for (const [ci, s] of (this.pack.clips[p.k][1] || [[0, 0]])) {
          this.timers.push(setTimeout(() => { if (live()) opts.onBoundary(p.off + ci); }, (t - c.currentTime + s / rate) * 1000));
        }
        t += bufs[i].duration / rate + (i < plan.length - 1 ? 0.14 : 0);
      });
      this.timers.push(setTimeout(() => done(false), (t - c.currentTime) * 1000 + 120));
    });
  },
  stop() {
    for (const s of this.sources) { try { s.stop(); } catch (e) { /* já parou */ } }
    for (const t of this.timers) clearTimeout(t);
    if (this.out) { try { this.out.disconnect(); } catch (e) { /* ignora */ } }
    this.sources = []; this.timers = []; this.out = null;
  },
};

const Voice = {
  enabled: false, voice: null, studio: false, speaking: false, who: null, timer: null, pulse: 0, seq: 0,
  // Voz do aparelho (reserva): as "Natural"/"Neural"/"Online" (Edge, Windows 11, Android) e as do Google (Chrome) soam bem;
  // as antigas do Windows (Zira, David, Mark "Desktop") são robóticas e ficam por último.
  score(v) {
    const n = (v.name || '').toLowerCase(), l = (v.lang || '').toLowerCase().replace('_', '-');
    let s = 0;
    if (l === 'en-us') s += 50; else if (l === 'en-gb') s += 40; else if (l.startsWith('en')) s += 20; else return -1;
    if (/natural|neural|online|premium|enhanced/.test(n)) s += 40;
    if (/google/.test(n)) s += 30;
    if (/aria|jenny|guy|ava|andrew|emma|brian|samantha|allison|serena|daniel|karen|moira|libby|sonia/.test(n)) s += 12;
    if (/desktop|zira|david|mark|hazel|george|espeak/.test(n)) s -= 25;
    return s;
  },
  list() {
    const vs = ('speechSynthesis' in window && window.speechSynthesis.getVoices()) || [];
    return vs.filter(v => this.score(v) >= 0).sort((a, b) => this.score(b) - this.score(a));
  },
  // ASSIST → ECHO'S VOICE: primeiro a voz gravada em estúdio, depois as do aparelho (fica salvo)
  choices() { return (VoiceClips.has() ? ['studio'] : []).concat(this.list()); },
  current() { return this.studio ? 'studio' : this.voice; },
  label(v) {
    if (v === 'studio') return VoiceClips.name('echo') + ' · studio';
    return v ? v.name.replace(/^Microsoft\s+|^Google\s+/, '').replace(/\s*Online\s*\(Natural\)/i, ' (Natural)').replace(/\s*-\s*English.*$/i, '') : '—';
  },
  init() {
    const want = Save.data && Save.data.voiceURI;
    this.studio = VoiceClips.has() && (!want || want === 'studio');
    if (!('speechSynthesis' in window)) return;
    const pick = () => {
      const vs = this.list();
      this.voice = (want && want !== 'studio' && vs.find(v => v.voiceURI === want)) || vs[0] || null;
      if (typeof UI !== 'undefined' && UI.renderAssist) UI.renderAssist();
    };
    pick();
    try { window.speechSynthesis.addEventListener('voiceschanged', pick); } catch (e) { window.speechSynthesis.onvoiceschanged = pick; }
  },
  nextVoice() {
    const cs = this.choices(); if (!cs.length) return null;
    const next = cs[(cs.indexOf(this.current()) + 1) % cs.length];
    this.studio = next === 'studio'; if (!this.studio) this.voice = next;
    Save.data.voiceURI = this.studio ? 'studio' : next.voiceURI; Save.write();
    this.say('Hello! I am Echo. I am your friend.', 'echo', { cut: true });
    return next;
  },
  // Uma fala de cada vez: quem chega enquanto outra voz fala entra na fila e só começa quando a anterior termina
  // (a Echo nunca atropela a porta, nem o narrador a Echo). opts.cut = o jogador pediu agora (botão, leitura do baú,
  // cena): corta o que estiver tocando e esvazia a fila.
  // opts: onBoundary(charIndex) para o karaokê da leitura, onStart(), onEnd(), volume, rate, pitch, cut
  queue: [], cur: null, gapT: null,
  say(text, who = 'echo', opts = {}) {
    if (!this.enabled || AudioSys.muted || !text) return false;
    text = String(text);
    const k = who + ':' + text.toLowerCase();
    if (opts.cut) this.stop();
    else if (this.speaking) {
      if (this.cur === k || this.queue.some(q => q.k === k)) return true;   // a mesma fala já vai tocar
      this.queue.push({ text, who, opts, k, at: performance.now() });
      while (this.queue.length > 4) this.drop(this.queue.shift());
      return true;
    }
    this.start(text, who, opts, k);
    return true;
  },
  start(text, who, opts, k) {
    VoiceClips.stop();
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignora */ }
    const id = ++this.seq, live = () => this.seq === id;
    const done = () => { if (!live()) return; clearTimeout(this.timer); this.cur = null; if (opts.onEnd) opts.onEnd(); this.next(who); };
    this.speaking = true; this.who = who; this.cur = k; this.pulse = 1; AudioSys.duck(true);
    if (opts.onStart) opts.onStart();
    const plan = this.studio && AudioSys.ctx ? VoiceClips.plan(who, text) : null;
    if (plan) { VoiceClips.play(plan, who, opts, live, failed => { if (!live()) return; if (failed) this.tts(text, who, opts, live, done); else done(); }); return; }
    this.tts(text, who, opts, live, done);
  },
  // a próxima da fila, depois de um respiro (maior depois da porta, por causa do eco da catedral);
  // falas que esperaram demais perderam a hora e saem da fila
  next(prevWho) {
    const now = performance.now();
    while (this.queue.length && !this.queue[0].opts.keep && now - this.queue[0].at > 6000) this.drop(this.queue.shift());
    const q = this.queue.shift();
    if (!q) { this.speaking = false; AudioSys.duck(false); return; }
    const id = this.seq;
    clearTimeout(this.gapT);
    this.gapT = setTimeout(() => { if (this.seq === id) this.start(q.text, q.who, q.opts, q.k); }, prevWho === 'door' ? 380 : 160);
  },
  drop(q) { if (q && q.opts.onEnd) q.opts.onEnd(); },
  tts(text, who, opts, live, done) {
    if (!('speechSynthesis' in window)) { done(); return; }
    const ss = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; if (this.voice) u.voice = this.voice;
    if (who === 'door') { u.pitch = 0.8; u.rate = 0.88; } else if (who === 'story') { u.pitch = 1; u.rate = 0.85; } else { u.pitch = 1.05; u.rate = 0.95; }
    if (opts.volume != null) u.volume = opts.volume; if (opts.rate) u.rate = opts.rate; if (opts.pitch) u.pitch = opts.pitch;
    if (opts.onBoundary) u.onboundary = e => { if (live() && (!e.name || e.name === 'word')) opts.onBoundary(e.charIndex); };
    u.onend = done; u.onerror = done;
    clearTimeout(this.timer); this.timer = setTimeout(done, 900 + text.length * 110);
    try { ss.speak(u); } catch (e) { done(); }
  },
  // para tudo: a fala atual e a fila
  stop() {
    VoiceClips.stop();
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignora */ }
    const q = this.queue; this.queue = []; for (const x of q) this.drop(x);
    this.seq++; clearTimeout(this.timer); clearTimeout(this.gapT); this.speaking = false; this.cur = null; AudioSys.duck(false);
  },
};

/* ============================== RECONHECIMENTO DE FALA (modo voz) ============================== */
const Listen = {
  SR: window.SpeechRecognition || window.webkitSpeechRecognition || null,
  rec: null, active: false,
  available() { return !!this.SR; },
  start(onResult, onDone) {
    if (!this.SR || this.active) return false;
    try {
      const r = new this.SR(); this.rec = r;
      r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 4; r.continuous = false;
      let got = false;
      r.onresult = e => {
        got = true; const alts = [];
        const res = e.results[0];
        for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
        onResult(alts);
      };
      r.onerror = () => { };
      r.onend = () => { this.active = false; onDone(got); };
      Voice.stop(); r.start(); this.active = true;
      return true;
    } catch (e) { this.active = false; return false; }
  },
  stop() { try { this.rec && this.rec.stop(); } catch (e) { /* ignora */ } },
};
