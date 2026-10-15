
/* ============================== MUNDO: tiles, blocos, portas, colisão ============================== */
const T = { AIR: 0, SOLID: 1, PLATFORM: 2, FAKE: 3, CRACKED: 4, BLOCK: 5, DOOR: 6, RUNE: 7 };
const TS = CFG.TILE;
// inimigos que nascem dos spawns (e o nome no Grimório)
const CREATURE_OF = { crawler: 'CRAWLER', casco: 'SHELL', flyer: 'FLYER', thief: 'THIEF', giant: 'CRAWLER' };

const World = {
  level: null, w: 0, h: 0, pxW: 0, pxH: 0, tiles: null, blocks: new Map(), doorTiles: new Map(), doors: {},
  spawns: [], statics: [], veils: [], start: null, chunks: new Map(), totals: null, cracks: new Map(), targets: {}, runeAt: new Map(),

  load(level) {
    this.level = level;
    const map = level.map;
    this.h = map.length; this.w = map[0].length; this.pxW = this.w * TS; this.pxH = this.h * TS;
    this.tiles = new Uint8Array(this.w * this.h);
    this.blocks = new Map(); this.doorTiles = new Map(); this.doors = {}; this.spawns = []; this.statics = [];
    this.veils = []; this.chunks.clear(); this.start = { x: 80, y: 19 * TS }; this.cracks = new Map(); this.targets = {}; this.runeAt = new Map();
    const cells = Object.assign({}, LEGEND, level.blocks || {}, level.entities || {});
    const doorChars = {};
    for (const id in level.doors) if (level.doors[id].char) doorChars[level.doors[id].char] = id;
    const rects = {}, words = new Set(), creatures = new Set();
    let secrets = 0, letters = 0, exits = 0;
    for (let r = 0; r < this.h; r++) {
      const row = map[r];
      for (let c = 0; c < this.w; c++) {
        const ch = row[c] || '.', i = r * this.w + c;
        if (doorChars[ch]) {
          const id = doorChars[ch], b = rects[id] || (rects[id] = { c0: c, r0: r, c1: c, r1: r });
          b.c0 = Math.min(b.c0, c); b.r0 = Math.min(b.r0, r); b.c1 = Math.max(b.c1, c); b.r1 = Math.max(b.r1, r);
          this.tiles[i] = T.DOOR; this.doorTiles.set(i, id); continue;
        }
        const def = cells[ch];
        if (!def) continue;
        if (def.tile) this.tiles[i] = { solid: T.SOLID, platform: T.PLATFORM, fake: T.FAKE, cracked: T.CRACKED }[def.tile];
        else if (def.block) {
          this.tiles[i] = T.BLOCK;
          const b = { c, r, kind: def.block, content: def.content || null, secret: def.secret || null, word: def.word, flag: def.flag,
            state: def.block === 'invisible' ? 'hidden' : 'ready', bump: 0, wob: 0, flash: 0 };
          if (b.kind === 'ghost') b.solid = this.ghostWanted(b);
          this.blocks.set(i, b);
          if (b.secret) secrets++;
          if (b.content && b.content.word) words.add(b.content.word);
          if (b.content && b.content.letter != null) letters++;
        } else if (def.entity) {
          if (def.entity === 'start') this.start = { x: c * TS + TS / 2, y: (r + 1) * TS };
          else if (CREATURE_OF[def.entity] && def.entity !== 'giant') {
            this.spawns.push({ type: def.entity, c, r, opts: def, state: 'waiting', ent: null, seen: false, timer: 0 });
            creatures.add(CREATURE_OF[def.entity]);
          } else {
            this.statics.push({ type: def.entity, c, r, opts: def });
            if (def.entity === 'letter') letters++;
            if (def.entity === 'goal') exits++;
            if (CREATURE_OF[def.entity]) creatures.add(CREATURE_OF[def.entity]);
          }
        }
      }
    }
    for (const id in rects) {
      const b = rects[id], def = level.doors[id];
      this.doors[id] = { id, def, kind: def.kind === 'bells' ? 'bells' : 'door', x: b.c0 * TS, y: b.r0 * TS, w: (b.c1 - b.c0 + 1) * TS, h: (b.r1 - b.r0 + 1) * TS,
        open: false, opening: 0, errors: 0, read: false, hint: false, morph: 0, mirror: 0, chimes: [] };
    }
    // alvos das frases (runas que crescem e encolhem, grupos de criaturas, o Echo)
    for (const id in level.targets || {}) {
      const t = Object.assign({ id, state: 'small', shake: 0, glow: 0 }, level.targets[id]);
      this.targets[id] = t;
      if (t.kind === 'rune') { t.cur = { w: 0, h: 0 }; t.goal = Object.assign({}, t[t.state]); t.stepT = 0; this.applyRune(t, t.goal, true); }
    }
    // paredes falsas: cada grupo de 'W' esconde a sala até a próxima pedra
    const seen = new Set();
    for (let r = 0; r < this.h; r++) for (let c = 0; c < this.w; c++) {
      const i = r * this.w + c;
      if (this.tiles[i] !== T.FAKE || seen.has(i)) continue;
      let r1 = r; while (r1 + 1 < this.h && this.tiles[(r1 + 1) * this.w + c] === T.FAKE) r1++;
      for (let rr = r; rr <= r1; rr++) seen.add(rr * this.w + c);
      // a sala fica do lado fechado; se os dois lados estão abertos, é o lado que termina primeiro em pedra
      const run = d => { let k = c + d; while (k > 0 && k < this.w - 1) { let blocked = false; for (let rr = r; rr <= r1; rr++) if (this.tiles[rr * this.w + k] === T.SOLID) blocked = true; if (blocked) break; k += d; } return k; };
      const openL = !this.solidStatic(c - 1, r), openR = !this.solidStatic(c + 1, r);
      const dir = openL && openR ? (run(1) - c <= c - run(-1) ? 1 : -1) : openL ? 1 : -1, openLeft = dir > 0;
      const c2 = run(dir);
      const cA = Math.min(c, c2 - dir), cB = Math.max(c, c2 - dir);
      this.veils.push({ x: cA * TS, y: r * TS, w: (cB - cA + 1) * TS, h: (r1 - r + 1) * TS, faceC: c, openLeft, alpha: 1, found: false, id: 'fake-wall-' + this.veils.length });
      secrets++;
    }
    for (const w of level.extraWords || []) words.add(w);
    this.totals = { words: words.size, wordList: [...words], letters, exits, secrets, creatures: creatures.size, creatureList: [...creatures] };
  },

  idx(c, r) { return r * this.w + c; },
  // zonas da fase (cripta escura e abafada, campanário em crescendo)
  zoneAt(x, y) {
    const c = Math.floor(x / TS), r = Math.floor(y / TS);
    for (const z of this.level.zones || []) if (c >= z.c0 && c <= z.c1 && r >= (z.r0 || 0) && r <= (z.r1 == null ? 1e9 : z.r1)) return z;
    return null;
  },
  type(c, r) {
    if (c < 0 || c >= this.w) return T.SOLID;
    if (r < 0) return this.tiles[c] === T.SOLID ? T.SOLID : T.AIR; // paredes que tocam o topo continuam para cima
    if (r >= this.h) return T.AIR;
    return this.tiles[r * this.w + c];
  },
  blockAt(c, r) { return this.blocks.get(r * this.w + c); },
  doorAt(c, r) { return this.doors[this.doorTiles.get(r * this.w + c)]; },
  solidStatic(c, r) { const t = this.type(c, r); return t === T.SOLID || t === T.FAKE; },
  // bloco-fantasma fica sólido enquanto o jogador carrega a palavra na barra (ou se o Palácio do To Be foi concluído)
  ghostWanted(b) { return Flags.get(b.flag) || (typeof Game !== 'undefined' && Game.bar.includes(b.word)); },
  blockSolid(b) {
    switch (b.kind) {
      case 'question': return true;
      case 'glass': return b.state !== 'broken';
      case 'invisible': return b.state === 'revealed';
      case 'ghost': return !!b.solid;
      default: return false;
    }
  },
  // sólido para um corpo, num eixo e direção. prevEdge = borda anterior (pés ao descer, cabeça ao subir)
  solidFor(c, r, body, axis, dir, prevEdge) {
    const t = this.type(c, r);
    switch (t) {
      case T.SOLID: case T.CRACKED: return true;
      case T.PLATFORM: return axis === 'y' && dir > 0 && prevEdge <= r * TS + 0.5;
      case T.BLOCK: {
        const b = this.blockAt(c, r);
        if (b.kind === 'invisible' && b.state === 'hidden')
          return axis === 'y' && dir < 0 && (body.kind === 'player' || body.kind === 'shell') && prevEdge >= (r + 1) * TS - 0.5;
        return this.blockSolid(b);
      }
      case T.DOOR: { const d = this.doorAt(c, r); return !d || !d.open; }
      case T.RUNE: return true;
      default: return false;
    }
  },
  isFloor(c, r) {
    const t = this.type(c, r);
    if (t === T.SOLID || t === T.CRACKED || t === T.PLATFORM || t === T.RUNE) return true;
    if (t === T.BLOCK) return this.blockSolid(this.blockAt(c, r));
    if (t === T.DOOR) { const d = this.doorAt(c, r); return !d || !d.open; }
    return false;
  },
  breakableByGiant(c, r) {
    const t = this.type(c, r);
    if (t === T.CRACKED) return true;
    if (t === T.BLOCK) { const b = this.blockAt(c, r); return b.kind === 'glass' && b.state !== 'broken'; }
    return false;
  },
  isGlass(c, r) { if (this.type(c, r) !== T.BLOCK) return false; const b = this.blockAt(c, r); return b.kind === 'glass' && b.state !== 'broken'; },

  // move um corpo com colisão por eixo. Retorna o que foi tocado.
  move(body, dx, dy) {
    const res = { wall: 0, floor: false, ceil: false, wallTiles: [], ceilTiles: [], floorTiles: [], spinBroke: false };
    if (dx) {
      body.x += dx;
      const r0 = Math.floor(body.y / TS), r1 = Math.floor((body.y + body.h - 0.01) / TS);
      const col = dx > 0 ? Math.floor((body.x + body.w - 0.001) / TS) : Math.floor(body.x / TS);
      let hit = false;
      for (let r = r0; r <= r1; r++) {
        if (!this.solidFor(col, r, body, 'x', dx)) continue;
        if (body.giant && this.breakableByGiant(col, r)) { this.giantBreak(col, r); continue; }
        hit = true; res.wallTiles.push([col, r]);
      }
      if (hit) { body.x = dx > 0 ? col * TS - body.w : (col + 1) * TS; res.wall = sign(dx); }
    }
    if (dy) {
      const prevTop = body.y, prevBot = body.y + body.h;
      body.y += dy;
      const c0 = Math.floor(body.x / TS), c1 = Math.floor((body.x + body.w - 0.01) / TS);
      if (dy > 0) {
        const row = Math.floor((body.y + body.h) / TS);
        let hit = false;
        for (let c = c0; c <= c1; c++) {
          if (!this.solidFor(c, row, body, 'y', 1, prevBot)) continue;
          if (body.giant && this.breakableByGiant(c, row)) { this.giantBreak(c, row); continue; }
          if (body.spinBreak && this.isGlass(c, row)) { this.breakGlass(this.blockAt(c, row), 'spin'); res.spinBroke = true; continue; }
          hit = true; res.floorTiles.push([c, row]);
        }
        if (hit) { body.y = row * TS - body.h; res.floor = true; }
      } else {
        const row = Math.floor(body.y / TS);
        let hit = false;
        for (let c = c0; c <= c1; c++) {
          if (!this.solidFor(c, row, body, 'y', -1, prevTop)) continue;
          if (body.giant && this.breakableByGiant(c, row)) { this.giantBreak(c, row); continue; }
          hit = true; res.ceilTiles.push([c, row]);
        }
        if (hit) { body.y = (row + 1) * TS; res.ceil = true; }
      }
    }
    return res;
  },
  // o corpo cabe aqui?
  fits(x, y, w, h, body) {
    const c0 = Math.floor(x / TS), c1 = Math.floor((x + w - 0.01) / TS), r0 = Math.floor(y / TS), r1 = Math.floor((y + h - 0.01) / TS);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = this.type(c, r);
      if (t === T.PLATFORM) continue;
      if (this.solidFor(c, r, body || {}, 'x', 0)) return false;
    }
    return true;
  },

  /* ---------- blocos ---------- */
  hitFromBelow(c, r, by) {
    const b = this.blockAt(c, r);
    if (!b) return;
    const cx = c * TS + TS / 2, cy = r * TS + TS / 2;
    if (b.kind === 'question' && b.state === 'ready') {
      b.state = 'used'; b.bump = 1; SFX.bump();
      FX.burst(cx, r * TS + 4, 18, 'm', 220, { up: 80, life: 0.6 });
      this.release(b, by === 'player');
    } else if (b.kind === 'invisible' && b.state === 'hidden') {
      b.state = 'revealed'; b.bump = 1; SFX.bump();
      FX.burst(cx, cy, 22, 'm', 240, { life: 0.7 });
      if (b.secret) Game.foundSecret(b.secret);
      this.release(b, by === 'player');
    } else if (b.kind === 'glass') { if (by === 'shell') this.breakGlass(b, 'shell'); else { b.wob = 1; SFX.thud(); } }
    else { b.bump = 0.6; SFX.thud(); }
    Ents.bumpFrom(c, r);
  },
  hitFromSide(c, r) {
    const b = this.blockAt(c, r);
    if (!b) { if (this.type(c, r) !== T.AIR) SFX.thud(); return; }
    if (b.kind === 'question' && b.state === 'ready') {
      b.state = 'used'; b.bump = 1; SFX.bump();
      FX.burst(c * TS + TS / 2, r * TS + 4, 18, 'm', 220, { up: 80 });
      this.release(b, false);
    } else if (b.kind === 'glass') this.breakGlass(b, 'shell');
    else SFX.thud();
  },
  breakGlass(b, by) {
    if (!b || b.state === 'broken') return;
    b.state = 'broken'; SFX.glass();
    const cx = b.c * TS + TS / 2, cy = b.r * TS + TS / 2;
    FX.burst(cx, cy, 26, 'c', 260, { life: 0.8, g: 600 });
    this.release(b, by === 'spin' || by === 'giant');
  },
  giantBreak(c, r) {
    if (Cine.active && Cine.onBreak(c, r)) return;
    if (this.type(c, r) === T.CRACKED) {
      this.tiles[r * this.w + c] = T.AIR; SFX.glass(); Game.shake(4);
      FX.burst(c * TS + TS / 2, r * TS + TS / 2, 30, 'c', 300, { life: 0.9, g: 600 });
    } else this.breakGlass(this.blockAt(c, r), 'giant');
  },
  release(b, homing) {
    const ct = b.content; if (!ct) return;
    const cx = b.c * TS + TS / 2, cy = b.r * TS + TS / 2;
    // bloco "de reserva": só dá a palavra se o jogador ainda não a tem (senão, orbes)
    if (ct.word && ct.ifMissing && Game.bar.includes(ct.word)) { for (let i = 0; i < 3; i++) Ents.spawn('orb', { x: cx, y: b.r * TS, vx: (i - 1) * 80, vy: -300, homing: true, delay: 0.2 + i * 0.05 }); return; }
    // poço de palavras: dá a primeira palavra da lista que o jogador não tem; se ainda faltar outra, volta a ficar pronto
    if (ct.reserve) {
      const flying = new Set(Ents.list.filter(e => e.type === 'capsule' && !e.dead).map(e => e.word));
      const missing = ct.reserve.filter(w => !Game.bar.includes(w) && !flying.has(w));
      if (!missing.length) { for (let i = 0; i < 3; i++) Ents.spawn('orb', { x: cx, y: b.r * TS, vx: (i - 1) * 80, vy: -300, homing: true, delay: 0.2 + i * 0.05 }); return; }
      Ents.spawn('capsule', { word: missing[0], x: cx, y: cy, baseY: b.r * TS - 1.1 * TS + TS * 0.5, homing, src: { c: b.c, r: b.r } }); SFX.wordAppear();
      if (missing.length > 1) Game.later(0.7, () => { b.state = 'ready'; b.bump = 0.5; });
      return;
    }
    if (ct.word) { Ents.spawn('capsule', { word: ct.word, x: cx, y: cy, baseY: b.r * TS - (ct.rise || 1.1) * TS + TS * 0.5, homing, src: { c: b.c, r: b.r } }); SFX.wordAppear(); }
    if (ct.life) { Ents.spawn('life', { x: cx, y: cy, baseY: b.r * TS - TS * 0.6, emerge: true }); SFX.wordAppear(); }
    if (ct.crystal) Ents.spawn('crystal', { x: cx, y: cy, baseY: b.r * TS - TS * 0.55, emerge: 1 });
    if (ct.orbs) for (let i = 0; i < ct.orbs; i++) Ents.spawn('orb', { x: cx, y: b.r * TS, vx: (Math.random() - 0.5) * 160, vy: -260 - Math.random() * 120, homing: true, delay: 0.2 + i * 0.05 });
    if (ct.letter != null) Ents.spawn('letter', { index: ct.letter, x: cx, y: cy, magnet: true });
  },
  updateBlocks(dt) {
    for (const b of this.blocks.values()) {
      if (b.bump > 0) b.bump = Math.max(0, b.bump - dt * 5.5);
      if (b.wob > 0) b.wob = Math.max(0, b.wob - dt * 4);
      if (b.ping > 0) b.ping -= dt; if (b.peek > 0) b.peek -= dt;
      if (b.kind !== 'ghost') continue;
      if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 0.9);
      const want = this.ghostWanted(b), cx = b.c * TS + TS / 2, cy = b.r * TS + TS / 2;
      // pegou a palavra: o fantasma vira chão (espera o jogador sair de dentro dele)
      if (!b.solid && want && !overlap({ x: b.c * TS, y: b.r * TS, w: TS, h: TS }, P.box())) {
        b.solid = true; b.flash = 1; SFX.letter();
        FX.burst(cx, cy, 26, 'c', 200, { life: 0.9, g: 0 });
      }
      // pisou num degrau que a palavra criou: a placa "WORDS ARE THE FLOOR" já cumpriu o papel
      if (b.solid && P.onGround && Math.abs(P.y + P.h - b.r * TS) < 1 && P.x + P.w > b.c * TS && P.x < (b.c + 1) * TS) Hints.mark('ghost');
      // a palavra saiu da barra (foi usada numa porta): o degrau volta a ser fantasma
      if (b.solid && !want) { b.solid = false; b.flash = 0; SFX.remove(); FX.burst(cx, cy, 16, 'c', 120, { life: 0.7, g: -40 }); }
    }
    for (const v of this.veils) { if (v.found && v.alpha > 0) v.alpha = Math.max(0, v.alpha - dt * 2); if (v.ping > 0) v.ping -= dt; }
    for (const id in this.doors) {
      const d = this.doors[id];
      if (d.opening > 0 && d.opening < 1) {
        d.opening = Math.min(1, d.opening + dt / 1.2);
        if (Math.random() < 0.9) FX.add(d.x + Math.random() * d.w, d.y + d.h * (1 - d.opening) + Math.random() * 20, { vy: -60 - Math.random() * 90, vx: (Math.random() - 0.5) * 30, life: 1.2, size: 1.6, c: 'c', g: -40 });
        if (d.opening >= 1) d.open = true;
      }
      if (d.morph > 0) d.morph = Math.max(0, d.morph - dt);
      if (d.mirror > 0) d.mirror = Math.max(0, d.mirror - dt);
    }
    this.updateTargets(dt);
  },

  /* ---------- alvos das frases ---------- */
  // retângulo de uma forma da runa, ancorado na linha de base (r) e na coluna c (anchor: left | center | right)
  runeRect(t, sh) {
    const c0 = t.anchor === 'center' ? t.c - Math.floor((sh.w - 1) / 2) : t.anchor === 'right' ? t.c - sh.w + 1 : t.c;
    return { c0, c1: c0 + sh.w - 1, r0: t.r - sh.h + 1, r1: t.r };
  },
  applyRune(t, sh, instant) {
    const old = this.runeRect(t, t.cur), nw = this.runeRect(t, sh);
    if (t.cur.w) for (let r = old.r0; r <= old.r1; r++) for (let c = old.c0; c <= old.c1; c++) { const i = r * this.w + c; if (this.runeAt.get(i) === t.id) { this.tiles[i] = T.AIR; this.runeAt.delete(i); } }
    for (let r = nw.r0; r <= nw.r1; r++) for (let c = nw.c0; c <= nw.c1; c++) { const i = r * this.w + c; this.tiles[i] = T.RUNE; this.runeAt.set(i, t.id); }
    t.cur = { w: sh.w, h: sh.h };
    if (instant) return;
    // quem estiver dentro da pedra que cresceu é empurrado para cima
    const box = { x: nw.c0 * TS, y: nw.r0 * TS, w: sh.w * TS, h: sh.h * TS };
    for (const b of [P, ...Ents.list.filter(e => e.enemy && !e.dead)]) {
      if (b.dead || !overlap(b, box)) continue;
      const up = nw.r0 * TS - b.h;
      if (this.fits(b.x, up, b.w, b.h, b)) { b.y = up; if (b === P) { P.vy = Math.min(P.vy, 0); P.py = P.y; } }
      else b.x = b.x + b.w / 2 < box.x + box.w / 2 ? box.x - b.w : box.x + box.w;
    }
  },
  // muda um alvo: runas crescem/encolhem tile a tile; grupos e o Echo são tratados por quem os desenha
  setTarget(id, act) {
    const t = this.targets[id]; if (!t) return false;
    if (t.kind === 'rune') {
      if (!t[act] || t.state === act) { t.shake = 0.8; SFX.thud(); return false; }
      t.state = act; t.goal = Object.assign({}, t[act]); t.stepT = 0; t.glow = 1; SFX.rune(act === 'big');
      return true;
    }
    if (t.kind === 'giants') return Ents.types.giant.setAll(act);
    return false;
  },
  confuse(id) {
    const t = this.targets[id];
    if (t && t.kind === 'giants') { for (const e of Ents.list) if (e.type === 'giant' && !e.dead) e.shake = 1; }
    else if (t) t.shake = 1;
    SFX.thud();
  },
  updateTargets(dt) {
    for (const id in this.targets) {
      const t = this.targets[id];
      if (t.shake > 0) t.shake = Math.max(0, t.shake - dt * 1.2);
      if (t.glow > 0) t.glow = Math.max(0, t.glow - dt * 0.6);
      if (t.kind !== 'rune' || (t.cur.w === t.goal.w && t.cur.h === t.goal.h)) continue;
      t.stepT -= dt; if (t.stepT > 0) continue;
      t.stepT = 0.07;
      // um passo por vez: primeiro a altura, depois a largura (ou o contrário ao encolher)
      const sh = Object.assign({}, t.cur), grow = t.goal.w * t.goal.h >= t.cur.w * t.cur.h;
      if (grow) { if (sh.h !== t.goal.h) sh.h += sign(t.goal.h - sh.h); else sh.w += sign(t.goal.w - sh.w); }
      else { if (sh.w !== t.goal.w) sh.w += sign(t.goal.w - sh.w); else sh.h += sign(t.goal.h - sh.h); }
      this.applyRune(t, sh);
      const rc = this.runeRect(t, sh);
      FX.burst((rc.c0 + sh.w / 2) * TS, rc.r0 * TS + 4, 6, 'c', 140, { life: 0.5, g: 0 });
      if (sh.w === t.goal.w && sh.h === t.goal.h) Game.shake(2);
    }
  },
  drawTargets(ctx, camX, camY, time) {
    for (const id in this.targets) {
      const t = this.targets[id]; if (t.kind !== 'rune' || !t.cur.w) continue;
      const rc = this.runeRect(t, t.cur), sx = t.shake > 0 ? Math.sin(time * 60) * 2.5 * t.shake : 0;
      const x = rc.c0 * TS - camX + sx, y = rc.r0 * TS - camY, w = t.cur.w * TS, h = t.cur.h * TS;
      if (x > CFG.VIEW_W + 40 || x + w < -40 || y > CFG.VIEW_H + 40 || y + h < -40) continue;
      const p = 0.5 + 0.5 * Math.sin(time * 2 + t.c);
      R.draw(R.glow('c', 48), x + w / 2, y + Math.min(h, 40) / 2, Math.max(1, w / 64), 0.18 + 0.12 * p + t.glow * 0.6, true);
      rrect(ctx, x + 1, y + 1, w - 2, h - 2, 8); ctx.fillStyle = 'rgba(10,15,18,0.94)'; ctx.fill();
      ctx.fillStyle = ca(0.04 + 0.04 * p + t.glow * 0.15); ctx.fill();
      ctx.strokeStyle = ca(0.55 + t.glow * 0.4); ctx.lineWidth = 1.2; ctx.stroke();
      rrect(ctx, x + 5, y + 5, w - 10, h - 10, 5); ctx.strokeStyle = ca(0.12); ctx.lineWidth = 1; ctx.stroke();
      // runa: a palavra IT gravada no topo
      R.draw(R.text('IT', '900 12px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,1)', 6), x + w / 2, y + Math.min(16, h / 2) + 1, 1, 0.75 + 0.25 * p);
      if (t.shake > 0) R.draw(R.text('?', '900 18px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(34,211,238,1)', 6), x + w / 2, y - 16, 1, t.shake);
    }
  },

  /* ---------- desenho do terreno estático em blocos de 16 colunas ---------- */
  CHUNK: 16,
  chunk(ci) {
    let ch = this.chunks.get(ci);
    if (ch) return ch;
    if (this.chunks.size > 6) this.chunks.delete(this.chunks.keys().next().value);
    const cw = this.CHUNK * TS, s = R.make(cw, this.pxH), x = s.x, ox = ci * cw;
    const c0 = ci * this.CHUNK - 1, c1 = c0 + this.CHUNK + 1;
    // brilho sob as plataformas. Uma plataforma comprida pode passar de um bloco de 16 colunas para o outro:
    // cada bloco desenha a plataforma inteira (a tela corta o que sobra), senão a parte do bloco seguinte some
    for (let r = 0; r < this.h; r++) for (let c = Math.max(0, c0); c <= Math.min(this.w - 1, c1); c++) {
      if (this.type(c, r) !== T.PLATFORM || (c > Math.max(0, c0) && this.type(c - 1, r) === T.PLATFORM)) continue;
      let s0 = c; while (s0 > 0 && this.type(s0 - 1, r) === T.PLATFORM) s0--;
      let e = c; while (this.type(e + 1, r) === T.PLATFORM) e++;
      const px = s0 * TS - ox + 3, pw = (e - s0 + 1) * TS - 6, py = r * TS;
      x.save(); x.translate(px + pw / 2, py + 16); x.scale(pw / 2 + 10, 20);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, ca(0.22)); g.addColorStop(1, ca(0));
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill(); x.restore();
      capsulePath(x, px + pw / 2, py + 7, pw, 13); x.fillStyle = '#0a0f12'; x.fill();
      x.strokeStyle = wa(0.12); x.lineWidth = 1; x.stroke();
      x.beginPath(); x.moveTo(px + 7, py + 1); x.lineTo(px + pw - 7, py + 1); x.strokeStyle = ca(0.65); x.stroke();
    }
    for (let r = 0; r < this.h; r++) for (let c = Math.max(0, c0); c <= Math.min(this.w - 1, c1); c++) {
      if (this.type(c, r) !== T.SOLID) continue;
      this.drawSolid(x, c, r, c * TS - ox, r * TS);
    }
    ch = s; this.chunks.set(ci, ch);
    return ch;
  },
  drawSolid(x, c, r, x0, y0) {
    const S = (cc, rr) => { const t = this.type(cc, rr); return t === T.SOLID || t === T.FAKE; };
    const up = r === 0 ? true : S(c, r - 1), dn = r === this.h - 1 ? true : S(c, r + 1), lf = S(c - 1, r), rt = S(c + 1, r);
    const RAD = 9, tl = !up && !lf ? RAD : 0, tr = !up && !rt ? RAD : 0, br = !dn && !rt ? RAD : 0, bl = !dn && !lf ? RAD : 0;
    const e = 0.6;
    rrect(x, x0 - (lf ? e : 0), y0 - (up ? e : 0), TS + (lf ? e : 0) + (rt ? e : 0), TS + (up ? e : 0) + (dn ? e : 0), [tl, tr, br, bl]);
    x.fillStyle = '#0a0f12'; x.fill();
    x.lineWidth = 1;
    if (!up) {
      const g = x.createLinearGradient(0, y0, 0, y0 + 24);
      g.addColorStop(0, ca(0.10)); g.addColorStop(1, ca(0));
      x.fillStyle = g; rrect(x, x0 + (lf ? 0 : 1), y0, TS - (lf ? 0 : 1) - (rt ? 0 : 1), 24, [tl, tr, 0, 0]); x.fill();
      x.beginPath();
      if (tl) { x.moveTo(x0 + 0.5, y0 + tl); x.arcTo(x0 + 0.5, y0 + 0.5, x0 + tl, y0 + 0.5, tl - 0.5); } else x.moveTo(x0 - (lf ? e : 0), y0 + 0.5);
      if (tr) { x.lineTo(x0 + TS - tr, y0 + 0.5); x.arcTo(x0 + TS - 0.5, y0 + 0.5, x0 + TS - 0.5, y0 + tr, tr - 0.5); } else x.lineTo(x0 + TS + (rt ? e : 0), y0 + 0.5);
      x.strokeStyle = ca(0.55); x.stroke();
      x.beginPath(); x.moveTo(x0 + (lf ? 0 : 6), y0 + 5.5); x.lineTo(x0 + TS - (rt ? 0 : 6), y0 + 5.5); x.strokeStyle = ca(0.07); x.stroke();
    }
    if (!lf) { x.beginPath(); x.moveTo(x0 + 0.5, y0 + tl); x.lineTo(x0 + 0.5, y0 + TS - bl); x.strokeStyle = wa(0.08); x.stroke(); }
    if (!rt) { x.beginPath(); x.moveTo(x0 + TS - 0.5, y0 + tr); x.lineTo(x0 + TS - 0.5, y0 + TS - br); x.strokeStyle = wa(0.08); x.stroke(); }
    if (!dn) { x.beginPath(); x.moveTo(x0 + bl, y0 + TS - 0.5); x.lineTo(x0 + TS - br, y0 + TS - 0.5); x.strokeStyle = wa(0.06); x.stroke(); }
  },
  drawTerrain(ctx, camX, camY) {
    const cw = this.CHUNK * TS, a = Math.floor(camX / cw), b = Math.floor((camX + CFG.VIEW_W) / cw);
    for (let ci = a; ci <= b; ci++) {
      if (ci < 0 || ci * this.CHUNK >= this.w) continue;
      const s = this.chunk(ci);
      ctx.drawImage(s.c, ci * cw - camX, -camY, cw, this.pxH);
    }
  },
  drawDynamic(ctx, camX, camY, time) {
    const c0 = Math.max(0, Math.floor(camX / TS) - 1), c1 = Math.min(this.w - 1, Math.floor((camX + CFG.VIEW_W) / TS) + 1);
    for (let r = 0; r < this.h; r++) for (let c = c0; c <= c1; c++) {
      const t = this.tiles[r * this.w + c];
      if (t === T.BLOCK) this.drawBlock(ctx, this.blockAt(c, r), c * TS - camX, r * TS - camY, time);
      else if (t === T.CRACKED) this.drawCracked(ctx, c, r, c * TS - camX, r * TS - camY, time);
    }
  },
  drawBlock(ctx, b, x, y, time) {
    const k = b.kind;
    // pulso do Echo: o bloco invisível aparece tracejado por alguns segundos; o "?" deixa ouvir a palavra de dentro
    if (b.ping > 0 && k === 'invisible' && b.state === 'hidden') {
      const a = Math.min(1, b.ping) * (0.6 + 0.4 * Math.sin(time * 10));
      R.draw(R.glow('m', 30), x + TS / 2, y + TS / 2, 1, 0.5 * a, true);
      ctx.save(); ctx.setLineDash([4, 3]); rrect(ctx, x + 2, y + 2, TS - 4, TS - 4, 7); ctx.strokeStyle = `rgba(232,121,249,${0.9 * a})`; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      R.draw(R.text('?', '900 16px Orbitron, Inter, sans-serif', '#f0abfc', 'rgba(217,70,239,1)', 6), x + TS / 2, y + TS / 2 + 1, 1, a);
      return;
    }
    if (b.peek > 0 && b.state === 'ready' && b.content && b.content.word) R.draw(R.text(b.content.word, '700 10px Orbitron, Inter, sans-serif', wa(0.85), 'rgba(217,70,239,0.8)', 5), x + TS / 2, y - 12, 1, Math.min(1, b.peek) * 0.85);
    if (k === 'invisible' && b.state === 'hidden') return;
    if (k === 'glass' && b.state === 'broken') return;
    const off = b.bump > 0 ? -Math.sin((1 - b.bump) * Math.PI) * 6 : 0;
    const wob = b.wob > 0 ? Math.sin(b.wob * 30) * 1.5 * b.wob : 0;
    y += off; x += wob;
    if (k === 'ghost') {
      const solid = b.solid;
      if (b.flash > 0) R.draw(R.glow('t', 48), x + TS / 2, y + TS / 2, 1 + b.flash * 0.6, b.flash, true);
      if (!solid) {
        // vazio: halo suave + tracejado ciano que "anda" + palavra só no contorno. Sem corpo, para não parecer preenchido.
        const p = 0.5 + 0.5 * Math.sin(time * 2.2 + b.c);
        R.draw(R.glow('c', 30), x + TS / 2, y + TS / 2, 1, 0.12 + 0.1 * p, true);
        ctx.save(); ctx.setLineDash([5, 4]); ctx.lineDashOffset = -time * 10;
        rrect(ctx, x + 2.5, y + 2.5, TS - 5, TS - 5, 8);
        ctx.strokeStyle = ca(0.32 + 0.08 * p); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
        R.draw(this.hollowWord(b.word), x + TS / 2, y + TS / 2, 1, 0.75 + 0.2 * p);
        return;
      }
      this.glassShape(ctx, x, y, true);
      R.draw(R.text(b.word, '700 10px Orbitron, Inter, sans-serif', wa(0.85), ca(0.9), 5), x + TS / 2, y + TS / 2);
      return;
    }
    if (k === 'glass') {
      this.glassShape(ctx, x, y, false);
      const ct = b.content;
      if (ct && ct.orbs) {
        ctx.strokeStyle = wa(0.26); ctx.lineWidth = 1;
        for (let i = 0; i < Math.min(3, ct.orbs); i++) { ctx.beginPath(); ctx.arc(x + 9 + i * 7, y + 16 + (i % 2 ? -4 : 3), 3.2, 0, Math.PI * 2); ctx.stroke(); }
      } else if (ct && ct.letter != null) {
        R.draw(R.text(this.level.masterWord[ct.letter], '900 15px Orbitron, Inter, sans-serif', wa(0.3), null, 0), x + TS / 2, y + TS / 2 + 1);
        ctx.beginPath(); ctx.arc(x + TS / 2, y + TS / 2, 10, 0, Math.PI * 2); ctx.strokeStyle = wa(0.16); ctx.stroke();
      }
      return;
    }
    // "?" e usados. O bloco usado continua bem visível (é chão!): borda ciano, bisel e a marca de vazio.
    // O Echo ilumina os blocos perto dele.
    const used = b.state !== 'ready', lit = this.echoLight(b.c * TS + TS / 2, b.r * TS + TS / 2);
    if (used && lit > 0) R.draw(R.glow('c', 30), x + TS / 2, y + TS / 2, 1.1, 0.35 * lit, true);
    rrect(ctx, x + 1, y + 1, TS - 2, TS - 2, 7);
    ctx.fillStyle = used ? 'rgba(12,18,22,0.97)' : 'rgba(10,15,18,0.92)'; ctx.fill();
    ctx.strokeStyle = used ? ca(0.3 + 0.35 * lit) : wa(0.16); ctx.lineWidth = 1; ctx.stroke();
    if (used) {
      ctx.beginPath(); ctx.moveTo(x + 6, y + 3.5); ctx.lineTo(x + TS - 6, y + 3.5); ctx.strokeStyle = ca(0.22 + 0.3 * lit); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + TS / 2, y + TS / 2, 5, 0, Math.PI * 2); ctx.strokeStyle = wa(0.22 + 0.4 * lit); ctx.stroke();
    }
    if (!used) {
      const g = ctx.createLinearGradient(x, y, x + TS, y + TS);
      g.addColorStop(0, wa(0.07)); g.addColorStop(0.5, wa(0)); g.addColorStop(1, 'rgba(217,70,239,0.06)');
      ctx.fillStyle = g; rrect(ctx, x + 2, y + 2, TS - 4, TS - 4, 6); ctx.fill();
      const p = 0.5 + 0.5 * Math.sin(time * 4 + b.c * 0.7);
      R.draw(R.glow('m', 18), x + TS / 2, y + TS / 2, 1, 0.25 + 0.35 * p, true);
      R.draw(R.text('?', '900 19px Orbitron, Inter, sans-serif', '#f0abfc', 'rgba(217,70,239,1)', 7), x + TS / 2, y + TS / 2 + 1, 0.94 + 0.08 * p, 0.7 + 0.3 * p);
    }
  },
  // quanto o Echo ilumina um ponto (0 a 1)
  echoLight(x, y) {
    if (typeof Echo === 'undefined' || Echo.hidden) return 0;
    return clamp(1 - Math.hypot(x - Echo.x, y - Echo.y) / 170, 0, 1);
  },
  // palavra vazada (só contorno) para os blocos-fantasma ainda vazios
  hollowWord(word) {
    return R.sprite('hollow:' + word, 40, 20, (x, w, h) => {
      x.font = '800 10px Orbitron, Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      try { x.letterSpacing = '0.6px'; } catch (e) { /* ok */ }
      x.lineWidth = 0.9; x.strokeStyle = 'rgba(255,255,255,0.95)'; x.strokeText(word, w / 2, h / 2 + 0.5);
    });
  },
  glassShape(ctx, x, y, ghostSolid) {
    rrect(ctx, x + 1, y + 1, TS - 2, TS - 2, 7);
    ctx.fillStyle = 'rgba(10,15,18,0.55)'; ctx.fill();
    ctx.fillStyle = ca(0.05); ctx.fill();
    ctx.strokeStyle = ghostSolid ? ca(0.45) : wa(0.2); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y + 13); ctx.lineTo(x + 13, y + 6); ctx.moveTo(x + 6, y + 19); ctx.lineTo(x + 19, y + 6);
    ctx.strokeStyle = wa(0.12); ctx.stroke();
  },
  drawCracked(ctx, c, r, x, y, time) {
    rrect(ctx, x + 1, y + 1, TS - 2, TS - 2, 6);
    ctx.fillStyle = 'rgba(10,15,18,0.7)'; ctx.fill(); ctx.fillStyle = 'rgba(34,211,238,' + (0.05 + 0.03 * Math.sin(time * 2 + r)) + ')'; ctx.fill();
    ctx.strokeStyle = wa(0.2); ctx.lineWidth = 1; ctx.stroke();
    let cr = this.cracks.get(r * this.w + c);
    if (!cr) {
      const rnd = mulberry32(c * 131 + r * 17); cr = [];
      let px = 8 + rnd() * 16, py = 2;
      while (py < TS - 2) { const nx = clamp(px + (rnd() - 0.5) * 14, 3, TS - 3), ny = py + 4 + rnd() * 7; cr.push([px, py, nx, ny]); if (rnd() < 0.4) cr.push([nx, ny, nx + (rnd() - 0.5) * 12, ny + rnd() * 6]); px = nx; py = ny; }
      this.cracks.set(r * this.w + c, cr);
    }
    ctx.beginPath(); for (const s of cr) { ctx.moveTo(x + s[0], y + s[1]); ctx.lineTo(x + s[2], y + s[3]); }
    ctx.strokeStyle = wa(0.32); ctx.stroke();
  },
  veilAlphaAt(x, y) {
    for (const v of this.veils) if (v.alpha > 0 && x >= v.x && x < v.x + v.w && y >= v.y && y < v.y + v.h) return v.alpha;
    return 0;
  },
  drawVeils(ctx, camX, camY) {
    for (const v of this.veils) {
      if (v.alpha <= 0) continue;
      const x = v.x - camX, y = v.y - camY;
      if (x > CFG.VIEW_W || x + v.w < 0) continue;
      ctx.save(); ctx.globalAlpha = v.alpha;
      ctx.fillStyle = '#0a0f12'; ctx.fillRect(x - 1, y - 1, v.w + 2, v.h + 16);
      const fx = (v.faceC * TS) - camX + (v.openLeft ? 0.5 : TS - 0.5);
      ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx, y + v.h); ctx.strokeStyle = wa(0.08); ctx.lineWidth = 1; ctx.stroke();
      // rachadura quase invisível (o pulso do Echo faz ela brilhar)
      const cx = v.faceC * TS - camX + 14, pg = v.ping > 0 ? Math.min(1, v.ping) * (0.6 + 0.4 * Math.sin(Game.time * 10)) : 0;
      ctx.beginPath(); ctx.moveTo(cx, y + 4); ctx.lineTo(cx + 5, y + 18); ctx.lineTo(cx + 1, y + 30); ctx.lineTo(cx + 6, y + 44); ctx.lineTo(cx + 3, y + 58);
      ctx.strokeStyle = pg ? `rgba(232,121,249,${0.9 * pg})` : wa(0.05); ctx.lineWidth = pg ? 2 : 1; ctx.stroke();
      if (pg) R.draw(R.glow('m', 40), cx + 3, y + v.h / 2, 1.2, 0.5 * pg, true);
      ctx.restore();
    }
  },
};

/* ============================== FUNDO: parallax em 3 camadas ============================== */
const BG = {
  built: false, far: null, near: null, naveFar: null, naveNear: null, dust: [],
  build() {
    this.far = this.makeFar(); this.near = this.makeNear(); this.naveFar = null; this.built = true;
    if (!this.dust.length) { const rnd = mulberry32(99); for (let i = 0; i < 60; i++) this.dust.push({ x: rnd() * 960, y: rnd() * 540, s: 0.6 + rnd() * 1.2, v: 6 + rnd() * 14, p: rnd() * 6 }); }
  },
  lancet(x, cx, top, w, h, light) {
    ogivePath(x, cx - w / 2, top, w, h);
    const g = x.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, `rgba(34,211,238,${light})`); g.addColorStop(1, `rgba(6,182,212,${light * 0.25})`);
    x.fillStyle = g; x.fill();
    x.strokeStyle = cb(0.12); x.lineWidth = 1; x.stroke();
    x.beginPath(); x.moveTo(cx, top + w * 0.3); x.lineTo(cx, top + h); x.moveTo(cx - w / 2, top + h * 0.55); x.lineTo(cx + w / 2, top + h * 0.55);
    x.strokeStyle = cb(0.07); x.stroke();
  },
  rose(x, cx, cy, r, light) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(34,211,238,${light})`); g.addColorStop(1, `rgba(6,182,212,${light * 0.2})`);
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = g; x.fill(); x.strokeStyle = cb(0.12); x.lineWidth = 1; x.stroke();
    x.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.moveTo(cx + Math.cos(a) * r * 0.25, cy + Math.sin(a) * r * 0.25); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    x.arc(cx, cy, r * 0.25, 0, Math.PI * 2); x.strokeStyle = cb(0.09); x.stroke();
  },
  tower(x, px, top, w, H, rnd) {
    const spire = w * (0.9 + rnd() * 0.9);
    x.beginPath(); x.moveTo(px, H); x.lineTo(px, top); x.lineTo(px + w * 0.5, top - spire); x.lineTo(px + w, top); x.lineTo(px + w, H); x.closePath();
    x.fillStyle = '#07090b'; x.fill(); x.strokeStyle = cb(0.08); x.lineWidth = 1; x.stroke();
    // pináculos
    for (const ex of [px - 3, px + w - 5]) { x.beginPath(); x.moveTo(ex, top + 6); x.lineTo(ex + 4, top - w * 0.35); x.lineTo(ex + 8, top + 6); x.fillStyle = '#07090b'; x.fill(); x.stroke(); }
    x.beginPath(); x.moveTo(px + w * 0.5, top - spire); x.lineTo(px + w * 0.5, top - spire - 14); x.stroke();
    const n = w > 120 ? 3 : w > 70 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const ww = Math.min(22, w / (n + 1) * 0.7), cx = px + w * (i + 1) / (n + 1);
      this.lancet(x, cx, top + 40 + rnd() * 30, ww, 70 + rnd() * 60, 0.06 + rnd() * 0.07);
    }
    if (w > 90 && rnd() < 0.7) this.rose(x, px + w / 2, top + 22, Math.min(18, w * 0.16), 0.1);
    // janelas baixas
    for (let yy = top + 190; yy < H - 30; yy += 70) for (let i = 0; i < n; i++) if (rnd() < 0.5) this.lancet(x, px + w * (i + 1) / (n + 1), yy, 10, 34, 0.04 + rnd() * 0.05);
  },
  makeFar() {
    const W = 1920, H = 600, s = R.make(W, H), x = s.x, rnd = mulberry32(7);
    const items = []; let px = 10;
    while (px < W - 40) { const w = 50 + rnd() * 150, h = 150 + rnd() * 260; items.push([px, H - h, w]); px += w + 14 + rnd() * 60; }
    // catedral central maior
    const cathedral = (cx) => {
      const w = 260, top = 230;
      x.beginPath(); x.moveTo(cx - w / 2, H); x.lineTo(cx - w / 2, top + 60); x.lineTo(cx, top - 30); x.lineTo(cx + w / 2, top + 60); x.lineTo(cx + w / 2, H); x.closePath();
      x.fillStyle = '#07090b'; x.fill(); x.strokeStyle = cb(0.08); x.lineWidth = 1; x.stroke();
      this.rose(x, cx, top + 90, 44, 0.13);
      for (const d of [-80, 80]) this.lancet(x, cx + d, top + 120, 26, 120, 0.08);
      this.lancet(x, cx, top + 160, 34, 140, 0.1);
    };
    for (const [ix, it, iw] of items) {
      this.tower(x, ix, it, iw, H, mulberry32(Math.floor(ix * 13)));
      if (ix + iw > W - 24) this.tower(x, ix - W, it, iw, H, mulberry32(Math.floor(ix * 13)));
    }
    cathedral(560); cathedral(1500);
    // névoa na base
    const g = x.createLinearGradient(0, H - 200, 0, H); g.addColorStop(0, 'rgba(5,5,5,0)'); g.addColorStop(1, 'rgba(5,5,5,0.85)');
    x.fillStyle = g; x.fillRect(0, H - 200, W, 200);
    return s;
  },
  makeNear() {
    const W = 1536, H = 600, s = R.make(W, H), x = s.x, gap = 256;
    const capY = 150;
    for (let i = 0; i <= W / gap; i++) {
      const px = i * gap;
      // vitral alto entre pilares
      if (i % 2 === 0) this.lancet(x, px + gap / 2, capY + 40, 46, 230, 0.06);
      else this.rose(x, px + gap / 2, capY + 70, 30, 0.05);
      // arco ogival entre este pilar e o próximo
      x.beginPath(); x.moveTo(px + 13, capY); x.quadraticCurveTo(px + 13, capY - 110, px + gap / 2 + 13, capY - 130);
      x.quadraticCurveTo(px + gap + 13, capY - 110, px + gap + 13, capY);
      x.strokeStyle = cb(0.15); x.lineWidth = 1; x.stroke();
      x.beginPath(); x.moveTo(px + 26, capY); x.quadraticCurveTo(px + 26, capY - 90, px + gap / 2 + 13, capY - 108);
      x.quadraticCurveTo(px + gap, capY - 90, px + gap, capY); x.strokeStyle = cb(0.07); x.stroke();
    }
    for (let i = 0; i <= W / gap; i++) {
      const px = i * gap;
      for (const off of [0, -W]) {
        const X0 = px + off; if (X0 < -40) continue;
        rrect(x, X0 + 2, capY + 10, 22, H - capY, [3, 3, 0, 0]); x.fillStyle = 'rgba(5,5,5,0.88)'; x.fill(); x.strokeStyle = cb(0.15); x.stroke();
        rrect(x, X0 - 4, capY, 34, 12, 4); x.fillStyle = 'rgba(5,5,5,0.92)'; x.fill(); x.stroke();
        x.beginPath(); x.moveTo(X0 + 13, capY + 26); x.lineTo(X0 + 13, H); x.strokeStyle = cb(0.05); x.stroke();
      }
    }
    const g = x.createLinearGradient(0, H - 260, 0, H); g.addColorStop(0, 'rgba(5,5,5,0)'); g.addColorStop(1, 'rgba(5,5,5,0.9)');
    x.fillStyle = g; x.fillRect(0, H - 260, W, 260);
    return s;
  },
  /* ---------- tema "nave": a catedral por dentro (1-2). Fase alta: o fundo acompanha a câmera na vertical ---------- */
  makeNaveFar() {
    const W = 1920, H = 900, s = R.make(W, H), x = s.x, bay = 240, rnd = mulberry32(21);
    x.fillStyle = '#040507'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W / bay; i++) {
      const cx = i * bay + bay / 2;
      // abóbada: nervuras ogivais de um pilar ao outro
      x.beginPath(); x.moveTo(i * bay, 150); x.quadraticCurveTo(i * bay, 30, cx, 10); x.quadraticCurveTo((i + 1) * bay, 30, (i + 1) * bay, 150);
      x.strokeStyle = cb(0.1); x.lineWidth = 1; x.stroke();
      x.beginPath(); x.moveTo(i * bay, 150); x.lineTo((i + 1) * bay, 10); x.moveTo((i + 1) * bay, 150); x.lineTo(i * bay, 10); x.strokeStyle = cb(0.04); x.stroke();
      // vitral alto com rosácea em cima
      this.rose(x, cx, 130, 30, 0.1 + rnd() * 0.05);
      this.lancet(x, cx - 34, 190, 40, 400, 0.07 + rnd() * 0.04);
      this.lancet(x, cx + 34, 190, 40, 400, 0.07 + rnd() * 0.04);
      this.lancet(x, cx, 230, 22, 340, 0.05);
      // arcada baixa
      x.beginPath(); x.moveTo(i * bay + 12, 900); x.lineTo(i * bay + 12, 700); x.quadraticCurveTo(i * bay + 12, 640, cx, 625); x.quadraticCurveTo((i + 1) * bay - 12, 640, (i + 1) * bay - 12, 700); x.lineTo((i + 1) * bay - 12, 900);
      x.strokeStyle = cb(0.08); x.stroke();
      // pilar
      rrect(x, i * bay - 8, 150, 16, H - 150, 3); x.fillStyle = '#06080a'; x.fill(); x.strokeStyle = cb(0.07); x.stroke();
    }
    const g = x.createLinearGradient(0, 600, 0, H); g.addColorStop(0, 'rgba(4,5,7,0)'); g.addColorStop(1, 'rgba(4,5,7,0.9)');
    x.fillStyle = g; x.fillRect(0, 600, W, 300);
    return s;
  },
  makeNaveNear() {
    const W = 1536, H = 1200, s = R.make(W, H), x = s.x, gap = 384;
    for (let i = 0; i <= W / gap; i++) for (const off of [0, -W]) {
      const X0 = i * gap + off; if (X0 < -60) continue;
      // coluna maciça com capitel e arcos que saem dela
      rrect(x, X0, 0, 34, H, 4); x.fillStyle = 'rgba(4,5,7,0.94)'; x.fill(); x.strokeStyle = cb(0.14); x.lineWidth = 1; x.stroke();
      for (const cy of [380, 860]) { rrect(x, X0 - 8, cy, 50, 14, 4); x.fillStyle = 'rgba(4,5,7,0.96)'; x.fill(); x.stroke(); }
      x.beginPath(); x.moveTo(X0 + 17, 0); x.lineTo(X0 + 17, H); x.strokeStyle = cb(0.05); x.stroke();
      for (const cy of [380, 860]) {
        x.beginPath(); x.moveTo(X0 + 34, cy); x.quadraticCurveTo(X0 + 34, cy - 170, X0 + gap / 2 + 17, cy - 200); x.quadraticCurveTo(X0 + gap, cy - 170, X0 + gap, cy);
        x.strokeStyle = cb(0.13); x.stroke();
      }
      // estandarte pendurado
      const bx = X0 + gap / 2 - 6;
      x.beginPath(); x.moveTo(bx, 470); x.lineTo(bx + 34, 470); x.lineTo(bx + 34, 610); x.lineTo(bx + 17, 590); x.lineTo(bx, 610); x.closePath();
      x.fillStyle = 'rgba(4,5,7,0.9)'; x.fill(); x.strokeStyle = cb(0.12); x.stroke();
      x.beginPath(); x.arc(bx + 17, 515, 7, 0, Math.PI * 2); x.strokeStyle = cb(0.16); x.stroke();
    }
    return s;
  },
  skyK(camX, camY) {
    const sk = World.level.sky; if (!sk) return 0;
    return clamp((sk.y - camY) / 300, 0, 1) * clamp((camX + 480 - sk.c * TS) / 400, 0, 1);
  },
  drawNave(ctx, camX, camY, time) {
    if (!this.naveFar) { this.naveFar = this.makeNaveFar(); this.naveNear = this.makeNaveNear(); }
    const sky = this.skyK(camX, camY);
    // no topo do campanário a catedral se abre para o céu e a cidade da 1-1 aparece lá embaixo
    if (sky > 0) {
      const fW = 1920, fx = -((camX * 0.1) % fW), fy = 300 - camY * 0.15;
      ctx.save(); ctx.globalAlpha = sky;
      R.draw(R.glow('w', 60), 820, 90, 1.2, 0.5, true);
      ctx.beginPath(); ctx.arc(820, 90, 22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(240,250,255,0.9)'; ctx.fill();
      ctx.beginPath(); ctx.arc(830, 84, 20, 0, Math.PI * 2); ctx.fillStyle = '#05060a'; ctx.fill();
      ctx.drawImage(this.far.c, fx, fy, fW, 600); ctx.drawImage(this.far.c, fx + fW, fy, fW, 600);
      ctx.restore();
    }
    if (sky < 1) {
      ctx.save(); ctx.globalAlpha = 1 - sky;
      const fW = 1920, fx = -((camX * 0.18) % fW), fy = -20 - camY * 0.22;
      ctx.drawImage(this.naveFar.c, fx, fy, fW, 900); ctx.drawImage(this.naveFar.c, fx + fW, fy, fW, 900);
      const nW = 1536, nx = -((camX * 0.45) % nW), ny = -camY * 0.45;
      ctx.drawImage(this.naveNear.c, nx, ny, nW, 1200); ctx.drawImage(this.naveNear.c, nx + nW, ny, nW, 1200);
      ctx.restore();
    }
    const gs = R.glow('c', 6);
    for (const d of this.dust) {
      const x = ((d.x - camX * 0.3) % 960 + 960) % 960, y = ((d.y - time * d.v * 0.6 - camY * 0.3) % 540 + 540) % 540;
      R.draw(gs, x, y, d.s, 0.16, true);
    }
  },
  draw(ctx, camX, camY, time) {
    if (!this.built) this.build();
    if (World.level.bg === 'nave') return this.drawNave(ctx, camX, camY, time);
    // camada 1: grade e partículas ciano bem apagadas
    ctx.save();
    ctx.strokeStyle = cb(0.05); ctx.lineWidth = 1;
    const gx = -((camX * 0.1) % 64), gy = -((camY * 0.1) % 64);
    ctx.beginPath();
    for (let x = gx; x < 960; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, 540); }
    for (let y = gy; y < 540; y += 64) { ctx.moveTo(0, y); ctx.lineTo(960, y); }
    ctx.stroke();
    const gs = R.glow('c', 6);
    for (const d of this.dust) {
      const x = ((d.x - camX * 0.12) % 960 + 960) % 960, y = ((d.y - time * d.v - camY * 0.1) % 540 + 540) % 540;
      R.draw(gs, x, y, d.s, 0.18, true);
    }
    ctx.restore();
    // camada 2: silhuetas góticas distantes
    const fW = 1920, fx = -((camX * 0.22) % fW), fy = -60 + (196 - camY) * 0.12;
    ctx.drawImage(this.far.c, fx, fy, fW, 600); ctx.drawImage(this.far.c, fx + fW, fy, fW, 600);
    // camada 3: pilares e arcos próximos
    const nW = 1536, nx = -((camX * 0.5) % nW), ny = -60 + (196 - camY) * 0.3;
    ctx.drawImage(this.near.c, nx, ny, nW, 600); ctx.drawImage(this.near.c, nx + nW, ny, nW, 600);
  },
};

/* ============================== ESCURIDÃO (cripta) ==============================
   Uma camada preta com buracos de luz no Nexy, no Echo (que brilha mais forte) e em quem tem luz própria. */
const Dark = {
  k: 0,
  draw(ctx, camX, camY) {
    if (this.k < 0.02) return;
    const s = R.sprite('darkLayer', 960, 540, () => { }), x = s.x;
    x.setTransform(R.k, 0, 0, R.k, 0, 0); x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, 960, 540); x.fillStyle = 'rgba(0,0,0,' + (0.97 * this.k).toFixed(3) + ')'; x.fillRect(0, 0, 960, 540);
    x.globalCompositeOperation = 'destination-out';
    const hole = (hx, hy, r, a = 1) => {
      const g = x.createRadialGradient(hx, hy, 0, hx, hy, r);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(0.55, 'rgba(0,0,0,' + (a * 0.7) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(hx - r, hy - r, r * 2, r * 2);
    };
    if (!P.dead) hole(P.cx - camX, P.cy - camY, 80, 0.6);
    if (!Echo.hidden) hole(Echo.x - camX, Echo.y - camY, 250 + 20 * Math.sin(Game.time * 2), 1);
    for (const e of Ents.list) if (e.light && !e.dead) hole(e.x + e.w / 2 - camX, e.y + e.h / 2 - camY, e.light, 0.8);
    x.globalCompositeOperation = 'source-over';
    ctx.drawImage(s.c, 0, 0, 960, 540);
    // a luz do Echo tinge o que está perto (halo claro, só no escuro)
    if (!Echo.hidden) {
      const ex = Echo.x - camX, ey = Echo.y - camY, f = 0.85 + 0.15 * Math.sin(Game.time * 2);
      R.draw(R.glow('c', 64), ex, ey, 3.6, 0.32 * this.k * f, true);
      R.draw(R.glow('w', 64), ex, ey, 1.6, 0.22 * this.k * f, true);
    }
  },
};

/* ============================== PARTÍCULAS ==============================
   Sempre pontos brancos pequenos com glow ciano ('c') ou magenta ('m'). */
const FX = {
  list: [],
  add(x, y, o = {}) {
    if (this.list.length > 800) this.list.shift();
    const life = o.life || 0.6;
    this.list.push({ x, y, vx: o.vx || 0, vy: o.vy || 0, life, max: life, size: o.size || 2, c: o.c || 'c', g: o.g != null ? o.g : 0, drag: o.drag != null ? o.drag : 1.2 });
  },
  burst(x, y, n, c, sp, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = sp * (0.35 + Math.random() * 0.65);
      this.add(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, {
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), life: (o.life || 0.6) * (0.6 + Math.random() * 0.7),
        size: (o.size || 2) * (0.6 + Math.random() * 0.8), c, g: o.g != null ? o.g : 420, drag: o.drag != null ? o.drag : 1.6,
      });
    }
  },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt * 0.5; p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); }
    }
  },
  draw(ctx, camX, camY) {
    const gc = R.glow('c', 10), gm = R.glow('m', 10), dot = R.glow('w', 3);
    for (const p of this.list) {
      const a = Math.min(1, p.life / p.max * 1.4), x = p.x - camX, y = p.y - camY;
      if (x < -20 || x > 980 || y < -20 || y > 560) continue;
      R.draw(p.c === 'm' ? gm : gc, x, y, p.size * 0.55, a * 0.9, true);
      R.draw(dot, x, y, p.size * 0.5, a, true);
    }
  },
};
