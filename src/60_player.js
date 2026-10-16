
/* ============================== JOGADOR ============================== */
const P = {
  kind: 'player', x: 0, y: 0, w: CFG.PLAYER_W, h: CFG.PLAYER_H, vx: 0, vy: 0, px: 0, py: 0,
  facing: 1, onGround: false, lastGround: -1, jumpedSinceGround: true, crouch: false, spinning: false, spinT: 0,
  scale: 1, visScale: 1, scaleFrom: 1, scaleT: 1, aura: false, invuln: 0, dead: false, deathT: 0, pitDeath: false,
  combo: 0, held: null, giant: false, spinBreak: false, trail: [], walkPhase: 0, squash: 0, interact: null,
  lastSafe: null, kickT: 0, riding: null, form: null, power: null, starT: 0,
  get cx() { return this.x + this.w / 2; },
  get cy() { return this.y + this.h / 2; },
  box() { return this.dead ? { x: -9999, y: -9999, w: 0, h: 0 } : this; },

  reset(footX, footY) {
    this.scale = 1; this.visScale = 1; this.scaleT = 1; this.w = CFG.PLAYER_W; this.h = CFG.PLAYER_H;
    this.x = footX - this.w / 2; this.y = footY - this.h; this.px = this.x; this.py = this.y;
    this.vx = 0; this.vy = 0; this.facing = 1; this.onGround = false; this.crouch = false; this.spinning = false;
    this.aura = false; this.invuln = 0; this.dead = false; this.deathT = 0; this.combo = 0; this.held = null;
    this.giant = false; this.trail = []; this.interact = null; this.lastSafe = { x: footX, y: footY }; this.jumpedSinceGround = true; this.bounceWindow = 0; this.lockRise = false; this.comboGlow = 0;
    this.riding = null; this.form = null; this.power = null; this.starT = 0;   // morreu ou trocou de fase: os poderes (1-3) se perdem
  },

  update(dt) {
    if (this.dead) return this.updateDeath(dt);
    const I = Input, now = Game.simTime;
    // forma de Rastejante ("YES, I AM [A CRAWLER]"): anda baixinho, devagar e sem pular por alguns segundos
    if (this.form) {
      this.form.t -= dt;
      if (this.form.t <= 0 && this.onGround) { this.setCrouch(false); if (!this.crouch) { this.form = null; SFX.grow(); FX.burst(this.cx, this.cy, 24, 'm', 200, { life: 0.6, g: 0 }); } }
    }
    const carry = I.get('run') && !this.form, run = (carry || I.dashing()) && !this.form, down = I.get('down') || !!this.form;
    const dir = (I.get('right') ? 1 : 0) - (I.get('left') ? 1 : 0);

    // agachar (reduz a altura)
    if (down && this.onGround && !this.crouch) this.setCrouch(true);
    else if (!down && this.crouch) this.setCrouch(false);

    // aceleração e inércia
    const maxV = this.form ? 80 : run ? CFG.RUN : CFG.WALK, av = Math.abs(this.vx);
    if (this.onGround) {
      if (this.crouch && !this.form) this.vx = approach(this.vx, 0, CFG.CROUCH_FRICTION * dt);
      else if (dir) {
        if (this.vx * dir < 0) { this.vx += dir * CFG.SKID * dt; if (av > 120 && Math.random() < 0.5) FX.add(this.cx, this.y + this.h, { vx: -dir * 40, vy: -30, life: 0.3, size: 1.2, c: 'c', g: 0 }); }
        else if (av < maxV) this.vx = dir * Math.min(av + (av > CFG.WALK ? CFG.RUN_ACC : CFG.ACC) * dt, maxV);
        else this.vx = approach(this.vx, dir * maxV, CFG.OVERSPEED_DECEL * dt);
      } else this.vx = approach(this.vx, 0, CFG.FRICTION * dt);
    } else if (dir) {
      const acc = CFG.ACC * CFG.AIR_CONTROL;
      if (this.vx * dir < 0) this.vx += dir * acc * 1.3 * dt;
      else if (av < maxV) this.vx = dir * Math.min(av + acc * dt, maxV);
    } else this.vx = approach(this.vx, 0, 50 * dt);
    if (dir) this.facing = dir;

    if (this.bounceWindow > 0) this.lateBounce(dt);
    // pulo com coyote time e buffer
    const canJump = this.onGround || (now - this.lastGround <= CFG.COYOTE && !this.jumpedSinceGround);
    const wj = now - I.pressedAt.jump <= CFG.BUFFER, ws = now - I.pressedAt.spin <= CFG.BUFFER;
    if (canJump && (wj || ws) && !this.form) {
      const spin = ws && (!wj || I.pressedAt.spin > I.pressedAt.jump);
      this.doJump(spin); I.pressedAt.jump = -1; I.pressedAt.spin = -1;
    }

    // gravidade: subida segurando < subida solta < descida
    if (this.vy >= 0) this.lockRise = false;
    const holdBtn = this.spinning ? (I.get('spin') || I.get('jump')) : I.get('jump');
    const g = this.vy < 0 ? (holdBtn || this.lockRise ? CFG.G_UP : CFG.G_CUT) : CFG.G_DOWN;
    this.vy = Math.min(this.vy + g * dt, CFG.MAX_FALL);
    // com as WINGS: segurando o pulo, a queda fica lenta (planar)
    if (this.power === 'wings' && !this.onGround && this.vy > CFG.GLIDE_FALL && holdBtn) this.vy = CFG.GLIDE_FALL;

    // movimento e colisão
    this.giant = this.scale > 1.5; this.spinBreak = this.spinning && this.vy > 0;
    const wasGround = this.onGround, prevFeet = this.y + this.h;
    const res = World.move(this, this.vx * dt, this.vy * dt);
    if (res.wall) this.vx = 0;
    this.riding = null;
    if (!res.floor && this.vy >= 0) this.landOnPlatforms(prevFeet, res);
    this.pushOutOfBodies();
    if (res.ceil && this.vy < 0) { this.vy = 30; this.headHit(res.ceilTiles); }
    if (res.spinBroke) { this.vy = -140; Game.hitstop(2); Game.shake(2); }
    if (res.floor) {
      if (!wasGround) this.land();
      this.vy = 0; this.onGround = true; this.lastGround = now; this.jumpedSinceGround = false;
    } else this.onGround = false;

    if (this.x < 0) { this.x = 0; if (this.vx < 0) this.vx = 0; }
    if (this.x + this.w > World.pxW) { this.x = World.pxW - this.w; if (this.vx > 0) this.vx = 0; }
    if (this.y > World.pxH + 30) return this.fallInPit();

    // última posição segura (para SAFE FALL)
    if (this.onGround && World.isFloor(Math.floor((this.x + 1) / TS), Math.floor((this.y + this.h + 2) / TS)) &&
        World.isFloor(Math.floor((this.x + this.w - 1) / TS), Math.floor((this.y + this.h + 2) / TS))) this.lastSafe = { x: this.cx, y: this.y + this.h };

    if (this.invuln > 0) this.invuln -= dt;
    if (this.spinning) this.spinT += dt;
    if (this.squash) this.squash = approach(this.squash, 0, dt * 2.2);
    if (this.kickT > 0) this.kickT -= dt;
    this.comboGlow = approach(this.comboGlow || 0, this.onGround ? 0 : Math.min(this.combo, 4), dt * (this.onGround ? 3 : 8));
    if (this.scaleT < 1) { this.scaleT = Math.min(1, this.scaleT + dt / 0.6); this.visScale = lerp(this.scaleFrom, this.scale, this.easeBack(this.scaleT)); }
    if (this.onGround && Math.abs(this.vx) > 5) this.walkPhase += Math.abs(this.vx) * dt * 0.09;

    // carapaça carregada
    if (this.held) { if (!carry) this.throwHeld(); else this.updateHeld(); }

    // rastro magenta
    this.trail.push({ x: this.cx, y: this.cy, s: Math.min(1, Math.hypot(this.vx, this.vy * 0.4) / CFG.RUN) });
    if (this.trail.length > 9) this.trail.shift();

    this.enemyContacts();
    this.findInteract();
    for (const v of World.veils) if (!v.found && overlap(v, this)) { v.found = true; Game.foundSecret(v.id); SFX.letter(); }
  },
  easeBack(t) { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  // plataformas móveis: sólidas só por cima. Quem pousa vai junto com elas (Game.step aplica dx/dy depois).
  landOnPlatforms(prevFeet, res) {
    const feet = this.y + this.h;
    for (const e of Ents.list) {
      if (!e.plat || e.dead) continue;
      if (this.x + this.w <= e.x + 2 || this.x >= e.x + e.w - 2) continue;
      if (prevFeet <= e.y + 2 + Math.max(0, -e.dy) && feet >= e.y) { this.y = e.y - this.h; res.floor = true; this.riding = e; return; }
    }
  },
  // o corpo dos tubos do órgão é sólido dos lados
  pushOutOfBodies() {
    for (const e of Ents.list) {
      if (!e.body || e.dead) continue;
      const bx = e.x + 4, bw = e.w - 8;
      if (this.x + this.w <= bx || this.x >= bx + bw || this.y + this.h <= e.y + 10) continue;
      const left = this.cx < bx + bw / 2;
      this.x = left ? bx - this.w : bx + bw;
      if (left ? this.vx > 0 : this.vx < 0) this.vx = 0;
    }
  },
  crawlerForm(sec) {
    if (this.form) { this.form.t = sec; return; }
    this.dropHeld(); this.form = { kind: 'crawler', t: sec }; if (this.onGround) this.setCrouch(true);
    SFX.shrink(); FX.burst(this.cx, this.cy, 30, 'm', 220, { life: 0.7, g: 0 });
  },

  setCrouch(on) {
    const s = this.scale, H = CFG.PLAYER_H * s, CH = CFG.CROUCH_H * s;
    if (on) { this.crouch = true; this.y += this.h - CH; this.h = CH; return; }
    if (World.fits(this.x, this.y + this.h - H, this.w, H, this)) { this.y += this.h - H; this.h = H; this.crouch = false; }
  },
  doJump(spin) {
    Hints.mark('jump');
    const v = CFG.JUMP_V + CFG.JUMP_RUN_BONUS * Math.min(1, Math.abs(this.vx) / CFG.RUN);
    this.vy = -v * (spin ? CFG.SPIN_FACTOR : 1);
    this.onGround = false; this.jumpedSinceGround = true; this.spinning = spin; this.spinT = 0; this.squash = -0.3;
    if (spin) SFX.spin(); else SFX.jump();
    for (let i = 0; i < 5; i++) FX.add(this.cx + (Math.random() - 0.5) * this.w, this.y + this.h, { vx: (Math.random() - 0.5) * 80, vy: -20 - Math.random() * 30, life: 0.35, size: 1.2, c: 'c', g: 0 });
  },
  land() {
    this.spinning = false; this.combo = 0; this.squash = 0.25; this.lockRise = false; this.bounceWindow = 0;
    if (this.vy > 450) for (let i = 0; i < 6; i++) FX.add(this.cx + (Math.random() - 0.5) * this.w, this.y + this.h, { vx: (Math.random() - 0.5) * 120, vy: -30, life: 0.35, size: 1.3, c: 'c', g: 0 });
  },
  headHit(tiles) {
    let best = null, bd = 1e9;
    for (const [c, r] of tiles) { const d = Math.abs(c * TS + TS / 2 - this.cx); if (d < bd) { bd = d; best = [c, r]; } }
    if (best) World.hitFromBelow(best[0], best[1], 'player');
  },
  bounce(spin) {
    const I = Input, now = Game.simTime;
    const held = I.get('jump') || I.get('spin');
    const early = now - Math.max(I.pressedAt.jump, I.pressedAt.spin) <= CFG.BOUNCE_EARLY;
    const CB = CFG.COMBO_BOUNCE, mult = CB[clamp(this.combo, 1, CB.length) - 1];
    const strong = (spin ? CFG.SPIN_BOUNCE_HELD : CFG.BOUNCE_HELD) * mult;
    this.vy = -(held || early ? strong : (spin ? CFG.SPIN_BOUNCE : CFG.BOUNCE) * mult);
    // apertou pouco antes do pisão: quique alto garantido, mesmo que solte o botão
    this.lockRise = early && !held;
    if (early) { I.pressedAt.jump = -1; I.pressedAt.spin = -1; }
    // quique fraco: abre uma janela curta para apertar o pulo logo em seguida
    this.bounceWindow = held || early ? 0 : CFG.BOUNCE_LATE;
    this.bounceFrom = this.y + this.h; this.bounceStrong = strong; this.stompT = now;
    this.onGround = false; this.jumpedSinceGround = true; this.squash = -0.25;
  },
  // pulo apertado logo depois do pisão, ainda no ar: vira o quique alto,
  // com o mesmo ápice de quem segurou o botão no impacto (a janela fecha ao tocar o chão)
  lateBounce(dt) {
    const I = Input;
    this.bounceWindow -= dt;
    if (Math.max(I.pressedAt.jump, I.pressedAt.spin) <= this.stompT) return;
    const risen = Math.max(-TS * 1.25, this.bounceFrom - (this.y + this.h));
    this.vy = -Math.sqrt(Math.max(0, this.bounceStrong * this.bounceStrong - 2 * CFG.G_UP * risen));
    this.lockRise = true; this.bounceWindow = 0; I.pressedAt.jump = -1; I.pressedAt.spin = -1;
    SFX.jump(); FX.burst(this.cx, this.y + this.h, 10, 'm', 140, { life: 0.4, g: 0 });
  },
  enemyContacts() {
    for (const e of Ents.enemies()) {
      if (e.state === 'held' || e.frozen > 0 || this.dead || !overlap(this, e)) continue;
      // gárgula de pedra: não machuca (é chão por cima); só voando ela ataca e pode levar pisão
      if (e.type === 'gargoyle' && e.state !== 'fly' && e.state !== 'home') continue;
      // com a STAR: quem a Nexy tocar explode (menos os gigantes, que só empurram)
      if (this.starT > 0 && e.type !== 'giant') { Enemy.kill(e, 'pop', sign(e.x + e.w / 2 - this.cx) || 1); SFX.crush(); Game.addOrbs(1); continue; }
      const falling = this.y - this.py > 0.01 || this.vy > 0;
      const above = this.py + this.h <= e.y + e.h * 0.5 + 3;
      // o trem de Rastejantes (1-1): em fila eles não mordem, só empurram (o pisão vale)
      if (e.type === 'conga' && !(falling && above)) {
        const left = this.cx < e.x + e.w / 2; this.x = left ? e.x - this.w : e.x + e.w; this.vx = left ? Math.min(this.vx, -60) : Math.max(this.vx, 60);
        if (e.bumpT <= 0) { e.bumpT = 0.4; SFX.thud(); }
        continue;
      }
      // gigantes: fecham a passagem (empurram, não machucam)
      if (e.type === 'giant') {
        if (falling && above) { this.y = e.y - this.h; this.bounce(false); SFX.thud(); }
        else {
          const left = this.cx < e.x + e.w / 2; this.x = left ? e.x - this.w : e.x + e.w; this.vx = left ? -90 : 90;
          if (e.shake <= 0) { e.shake = 0.35; SFX.thud(); Sentence.bumped('giants'); }
        }
        continue;
      }
      // ladrão: encostar não machuca, mas ele leva a última palavra da barra
      if (e.type === 'thief' && !(falling && above)) {
        if (e.state === 'idle' || e.state === 'charge') {
          if (Game.bar.length) Ents.types.thief.steal(e);
          else { this.vx = (this.cx < e.x + e.w / 2 ? -1 : 1) * 200; e.state = 'idle'; e.vx = -this.vx * 0.6; SFX.thud(); }
        }
        continue;
      }
      if (this.giant) { Enemy.kill(e, 'pop', sign(e.x + e.w / 2 - this.cx) || 1); SFX.crush(); Game.shake(3); continue; }
      if (e.type === 'casco' && e.state === 'shell') {
        if (e.immune > 0) continue;
        const kdir = e.x + e.w / 2 >= this.cx ? 1 : -1;
        if (falling && above) {
          if (this.spinning) { Enemy.kill(e, 'pop', kdir); this.bounce(true); Game.hitstop(2); }
          else { this.y = e.y - this.h; Ents.types.casco.kick(e, kdir); this.bounce(false); }
        } else if (Input.get('run') && !this.held) this.grab(e);
        else { Ents.types.casco.kick(e, kdir); this.kickT = 0.15; }
        continue;
      }
      if (e.type === 'casco' && e.state === 'slide' && e.immune > 0) continue;
      if (falling && above) { this.stomp(e); continue; }
      this.hurt();
    }
  },
  stomp(e) {
    const spin = this.spinning, topY = e.y, cx = e.x + e.w / 2;
    this.combo++;
    if (spin) Enemy.kill(e, 'pop', this.facing);
    else if (e.type === 'flyer') Ents.types.flyer.clip(e);
    else if (e.type === 'crawler' || e.type === 'thief' || e.type === 'conga') Enemy.kill(e, 'flat');
    else if (e.type === 'knight') Ents.types.knight.clang(e);   // o elmo só tine: com giro a armadura se desfaz
    else if (e.type === 'gargoyle') Ents.types.gargoyle.stun(e);   // vira pedra por 2 s: com giro ela quebra
    else if (e.type === 'drone') Enemy.kill(e, 'pop', this.facing);   // o drone cai com qualquer pisão
    else if (e.state === 'walk') { Ents.types.casco.toShell(e); e.immune = 0.15; Game.registerCreature('SHELL'); }
    else if (e.state === 'slide') { e.state = 'shell'; e.vx = 0; e.immune = 0.15; }
    this.y = topY - this.h;
    SFX.stomp(this.combo); Game.hitstop(CFG.HITSTOP_FRAMES);
    FX.burst(cx, topY + 4, 12, 'c', 160, { life: 0.45 });
    Ents.spawn('combotext', { x: cx, y: topY - 6, n: this.combo });
    if (this.combo > 1) FX.burst(this.cx, this.y + this.h, 10 + this.combo * 6, 'm', 160 + this.combo * 40, { life: 0.7, g: 0 });
    this.bounce(spin);
    Game.comboReward(this.combo);
  },
  hurt() {
    if (this.invuln > 0 || this.dead || this.starT > 0) return;
    // com um poder (LASER, WINGS), o golpe leva o poder e não a vida
    if (this.power) { Power.lose(); this.invuln = CFG.INVULN; this.dropHeld(); return; }
    if (this.aura) {
      this.aura = false; this.invuln = CFG.INVULN; SFX.damage(); Game.shake(4);
      FX.burst(this.cx, this.cy, 30, 'c', 260, { life: 0.8 });
      this.dropHeld(); Game.dropReserve(true);
    } else this.die();
  },
  die(pit) {
    if (this.dead) return;
    this.dropHeld(); this.dead = true; this.deathT = 0; this.pitDeath = !!pit; this.vx = 0; this.vy = pit ? 0 : -540;
    this.spinning = false; this.crouch = false; this.aura = false;
    SFX.death(); Game.shake(pit ? 0 : 5); Game.onDeath();
  },
  fallInPit() {
    if (Save.data.assist.safeFall && this.lastSafe) {
      this.x = this.lastSafe.x - this.w / 2; this.y = this.lastSafe.y - this.h; this.px = this.x; this.py = this.y;
      this.vx = 0; this.vy = 0; this.invuln = 1.2; SFX.damage(); Cam.ty = this.y + this.h - CFG.VIEW_H * 0.74;
      FX.burst(this.cx, this.cy, 24, 'm', 200, { life: 0.7, g: -60 });
      return;
    }
    this.die(true);
  },
  updateDeath(dt) {
    this.deathT += dt;
    if (!this.pitDeath && this.deathT > 0.45) { this.vy += 1600 * dt; this.y += this.vy * dt; }
    if (this.deathT > (this.pitDeath ? 1.4 : 2.1)) Game.respawn();
  },
  grab(e) { this.held = e; e.state = 'held'; e.vx = 0; e.vy = 0; SFX.ui(); this.updateHeld(); },
  updateHeld() {
    const e = this.held;
    if (!e || e.dead || e.state !== 'held') { this.held = null; return; }
    e.x = this.facing > 0 ? this.x + this.w - 6 : this.x - e.w + 6;
    e.y = this.y + this.h * 0.55 - e.h / 2;
  },
  throwHeld() {
    const e = this.held; this.held = null;
    if (!e || e.dead) return;
    if (!World.fits(e.x, e.y, e.w, e.h, e)) e.x = this.cx - e.w / 2;
    if (!World.fits(e.x, e.y, e.w, e.h, e)) e.y = this.y + this.h - e.h;
    if (Input.get('up')) {
      e.state = 'shell'; e.vx = this.vx * 0.4; e.vy = -CFG.SHELL_THROW_UP; e.immune = 0.45; e.x = this.cx - e.w / 2; e.y = this.y - e.h + 6;
      // encostado numa parede: o casco desliza uns pixels para fora dela em vez de nascer dentro
      if (!World.fits(e.x, e.y, e.w, e.h, e)) for (const dx of [2, -2, 4, -4, 6, -6, 8, -8]) if (World.fits(e.x + dx, e.y, e.w, e.h, e)) { e.x += dx; break; }
      if (!World.fits(e.x, e.y, e.w, e.h, e)) e.y = this.y;
      SFX.kick();
    }
    else if (Input.get('down')) {
      e.state = 'shell'; e.vx = 0; e.vy = 0; e.immune = 0.4; e.y = this.y + this.h - e.h;
      e.x = this.facing > 0 ? this.x + this.w + 1 : this.x - e.w - 1;
      if (!World.fits(e.x, e.y, e.w, e.h, e)) e.x = this.cx - e.w / 2;
    } else Ents.types.casco.kick(e, this.facing);
    this.kickT = 0.15;
  },
  dropHeld() { const e = this.held; this.held = null; if (e && e.state === 'held') { e.state = 'shell'; e.vx = 0; e.immune = 0.3; } },
  setScale(s) {
    if (s === this.scale) return false;
    const footX = this.cx, footY = this.y + this.h, nw = CFG.PLAYER_W * s, nh = CFG.PLAYER_H * s;
    let nx = footX - nw / 2; const ny = footY - nh;
    if (!World.fits(nx, ny, nw, nh, this)) {
      for (const d of [8, -8, 16, -16, 24, -24, 32, -32, 48, -48, 64, -64, 96, -96]) if (World.fits(nx + d, ny, nw, nh, this)) { nx += d; break; }
    }
    this.scaleFrom = this.scale / s; this.scaleT = 0; this.visScale = this.scaleFrom; // escala visual relativa à nova caixa
    this.scale = s; this.w = nw; this.h = nh; this.x = nx; this.y = ny; this.crouch = false; this.px = this.x; this.py = this.y;
    return true;
  },
  findInteract() {
    this.interact = null;
    for (const id in World.doors) {
      const d = World.doors[id], dcx = d.x + d.w / 2;
      if (!d.read && Math.abs(this.cx - dcx) < TS * 7 && Math.abs((this.y + this.h) - (d.y + d.h)) < TS * 4 && (d.kind === 'pedestal' || !d.open)) {
        d.read = true; Voice.say(Sentence.speakInscription(d.def.inscription), 'door');
      }
      if (d.open && d.kind !== 'pedestal' || d.kind === 'bells' || (d.kind === 'chest' && Cine.active) || d.opening > 0) continue;
      const feetOk = Math.abs((this.y + this.h) - (d.y + d.h)) < 10;
      const near = d.kind === 'door' ? (this.x + this.w > d.x - 44 && this.x < d.x + 2) : Math.abs(this.cx - dcx) < 40;
      if (near && feetOk && this.onGround) this.interact = d;
    }
  },
  tryInteract() {
    if (this.dead || !this.interact || this.held || !this.onGround) return false;
    Game.openPanel(this.interact); return true;
  },

  /* ---------- desenho ---------- */
  draw(ctx, camX, camY, a) {
    const x = lerp(this.px, this.x, a) - camX, y = lerp(this.py, this.y, a) - camY;
    const s = this.visScale * this.scale, t = Game.time;
    if (Cine.active && Cine.glow > 0) R.draw(R.glow('t', 64), x + this.w / 2, y + this.h / 2, 1.3 * s, Cine.glow * 0.7, true);
    if (this.dead && this.pitDeath) return;
    let alpha = 1;
    if (this.invuln > 0 && Math.floor(this.invuln * 18) % 2 === 0) alpha = 0.3;
    const fx = x + this.w / 2, fy = y + this.h;
    // rastro magenta que cresce com a velocidade
    if (!this.dead) for (let i = 0; i < this.trail.length - 1; i++) {
      const p = this.trail[i], k = (i + 1) / this.trail.length, sp = p.s;
      if (sp < 0.2) continue;
      const a2 = Math.min(1, (sp - 0.2) * (1 + (this.comboGlow || 0) * 0.5)) * k * alpha, tx = p.x - camX, ty = p.y - camY, hh = this.h * 0.86;
      R.draw(R.glow('m', 24), tx, ty, (0.5 + 0.6 * k) * s, a2 * 0.6, true);
      if (!Save.data.assist.classic && !this.form) {   // visual novo: o rastro é a sombra da própria Nexy
        ctx.save(); ctx.globalAlpha = a2 * 0.32; ctx.globalCompositeOperation = 'lighter'; ctx.translate(tx, ty + this.h / 2); ctx.scale(this.facing * s, s);
        NexyLook.draw(ctx, { t, phase: this.walkPhase || 0, speed: Math.abs(this.vx) / CFG.WALK, air: this.onGround ? 0 : (this.vy < 0 ? -1 : 1) }, NexyLook.stage, R.k * s);
        ctx.restore(); continue;
      }
      rrect(ctx, tx - 8 * s, ty - hh / 2, 16 * s, hh, 8 * s);
      ctx.fillStyle = `rgba(217,70,239,${(a2 * 0.16).toFixed(3)})`; ctx.fill();
      ctx.strokeStyle = `rgba(232,121,249,${(a2 * 0.45).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
    }
    if (this.spinning && !this.dead) {
      for (let i = 0; i < 10; i++) {
        const ang = this.spinT * 22 - i * 0.55, rr = (12 + i * 1.4) * s;
        R.draw(R.glow('m', 6), fx + Math.cos(ang) * rr, fy - 23 * s + Math.sin(ang) * rr * 0.45 + i * 1.6 * s, s, (1 - i / 10) * 0.8, true);
      }
    }
    if (!this.dead) R.draw(R.glow('m', 40), fx, fy - 24 * s, 0.85 * s, 0.24 * LOOK.rim * alpha, true);
    // brilho do combo: cresce a cada pisão seguido e se apaga ao tocar o chão
    const cg = this.dead ? 0 : this.comboGlow || 0;
    if (cg > 0.02) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 18);
      R.draw(R.glow('m', 64), fx, fy - 24 * s, (0.9 + cg * 0.35) * s, Math.min(1, 0.25 + cg * 0.22) * pulse * alpha, true);
      R.draw(R.glow('w', 32), fx, fy - 24 * s, (0.6 + cg * 0.2) * s, Math.min(0.5, cg * 0.12) * pulse * alpha, true);
    }
    if (this.aura && !this.dead) R.draw(R.glow('t', 64), fx, fy - 24 * s, 1.15 * s, (0.8 + 0.2 * Math.sin(t * 6)) * alpha, true);
    if (this.giant && !this.dead) R.draw(R.glow('m', 64), fx, fy - 24 * s, 1.2 * s, 0.35 * alpha, true);
    if (this.scaleT < 1) R.draw(R.glow('m', 64), fx, fy - 24 * s, 1.6 * s, (1 - this.scaleT) * 0.9, true);

    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(fx, fy);
    if (this.dead) { ctx.translate(0, -23 * s); ctx.rotate(Math.min(this.deathT, 0.5) * 6); ctx.translate(0, 23 * s); }
    let sx = 1 + this.squash * 0.6, sy = 1 - this.squash * 0.6;
    if (this.spinning) sx *= Math.cos(this.spinT * 26);
    ctx.scale(sx * s, sy * s);
    if (this.form) { this.drawCrawlerForm(ctx, t); ctx.restore(); return; }
    if (this.crouch) ctx.scale(1.06, CFG.CROUCH_H / CFG.PLAYER_H);
    this.drawBody(ctx, t);
    ctx.restore();
  },
  // o visual novo (62_nexy_look.js): o mesmo esqueleto ganha camadas fase a fase; só desenho, a caixa de colisão é a mesma
  drawLook(ctx, t) {
    const sp = this.poseSpeed != null ? this.poseSpeed : Math.abs(this.vx) / CFG.WALK;
    const pose = { t, phase: this.walkPhase || 0, speed: sp, air: this.onGround ? 0 : (this.vy < 0 ? -1 : 1), crouch: !!this.crouch,
      arm: this.held ? 'hold' : this.kickT > 0 ? 'kick' : 'idle' };
    ctx.save();
    if (this.crouch) ctx.scale(1 / 1.06, CFG.PLAYER_H / CFG.CROUCH_H);   // P.draw achata para agachar; o boneco agacha sozinho
    if (this.facing < 0) ctx.scale(-1, 1);
    NexyLook.draw(ctx, pose, NexyLook.stage, R.k * Math.max(0.5, Math.abs(this.visScale * this.scale)));
    ctx.restore();
  },
  drawCrawlerForm(ctx, t) {
    const f = this.facing, step = Math.abs(this.vx) > 5 ? Math.sin(t * 14) * 2 : 0;
    ctx.translate(-13, -24);
    ctx.strokeStyle = 'rgba(217,70,239,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(6, 18); ctx.lineTo(3 + step, 24); ctx.moveTo(13, 19); ctx.lineTo(13 - step, 24); ctx.moveTo(20, 18); ctx.lineTo(23 + step, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 20); ctx.lineTo(0, 13.2); ctx.lineTo(6, 4.8); ctx.lineTo(13, 1); ctx.lineTo(20, 4.8); ctx.lineTo(26, 13.2); ctx.lineTo(24, 20); ctx.closePath();
    ctx.fillStyle = '#050505'; ctx.fill(); ctx.strokeStyle = '#d946ef'; ctx.lineWidth = 1.6; ctx.stroke();
    capsulePath(ctx, 13 + f * 4, 12, 9, 3.6); ctx.fillStyle = '#f0abfc'; ctx.fill();
  },
  drawBody(ctx, t) {
    if (!Save.data.assist.classic) return this.drawLook(ctx, t);
    const f = this.facing, lw = 1.9 / (this.visScale * this.scale);
    const wp = this.onGround ? this.walkPhase : 0.6, airborne = !this.onGround;
    // pés
    for (const side of [-1, 1]) {
      const off = airborne ? side * 1.5 : Math.sin(wp + (side > 0 ? 0 : Math.PI)) * 4;
      const lift = airborne ? -3 : Math.max(0, Math.cos(wp + (side > 0 ? 0 : Math.PI))) * 2.5;
      capsulePath(ctx, side * 4.5 + off, -3 - lift, 8, 5);
      ctx.fillStyle = '#050505'; ctx.fill(); ctx.strokeStyle = 'rgba(217,70,239,0.85)'; ctx.lineWidth = lw; ctx.stroke();
    }
    // corpo em cápsula
    rrect(ctx, -9, -31, 18, 26, 9);
    ctx.fillStyle = '#050505'; ctx.fill(); ctx.strokeStyle = '#d946ef'; ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -25); ctx.lineTo(5, -25); ctx.strokeStyle = 'rgba(232,121,249,0.35)'; ctx.lineWidth = lw * 0.8; ctx.stroke();
    // braço (empurrando a carapaça ao chutar)
    const arm = this.held || this.kickT > 0 ? 9 : 4;
    capsulePath(ctx, f * (6 + arm / 2), -18, arm + 4, 4.5); ctx.fillStyle = '#050505'; ctx.fill(); ctx.strokeStyle = 'rgba(217,70,239,0.85)'; ctx.lineWidth = lw; ctx.stroke();
    // cabeça circular
    ctx.beginPath(); ctx.arc(0, -38.5, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = '#050505'; ctx.fill(); ctx.strokeStyle = '#d946ef'; ctx.lineWidth = lw; ctx.stroke();
    // visor
    R.draw(R.glow('m', 10), f * 3.5, -39, 1, 0.8, true);
    capsulePath(ctx, f * 3.5, -39, 9, 3.8); ctx.fillStyle = '#f0abfc'; ctx.fill();
  },
};

/* ============================== ECHO (familiar, a voz do jogo) ============================== */
const Echo = {
  x: 0, y: 0, px: 0, py: 0, pulse: 0, hidden: false, puff: 0, tiny: 0, shake: 0, line: null, lines: [], lineT: 0, birthK: 1,
  reset() {
    this.x = P.cx - 26; this.y = P.y - 10; this.px = this.x; this.py = this.y; this.hidden = false; this.puff = 0; this.tiny = 0; this.shake = 0;
    for (const e of Ents.list) if (e.type === 'echoride') e.dead = true;
    this.line = null; this.lines = [];
  },
  // o Echo fala (balão com o inglês e a legenda em português)
  talk(lines) { this.lines = lines.slice(); this.outT = null; this.nextLine(); },
  // o balão aparece quando a voz dela começa (se outra voz ainda fala, ela espera a vez) e fica até ela terminar
  nextLine() {
    const l = this.line = this.lines.shift() || null; this.lineT = 0; this.waitT = 0; this.outT = null;
    if (!l) return;
    this.said = false; this.heard = false;
    const ok = Voice.say(l.en, 'echo', {
      onStart: () => { if (this.line === l) { this.said = true; this.lineT = 0; } },
      onEnd: () => { if (this.line === l) { this.said = true; this.heard = true; } },
    });
    if (!ok) { this.said = true; this.heard = true; }
  },
  // alvo de YOU: cresce (e vira plataforma quando a fase tem um caminho para ele) ou encolhe
  act(what, ride) {
    if (what === 'big' && ride) {
      if (Ents.list.some(e => e.type === 'echoride' && !e.dead)) return false;
      const [c, r] = ride.board;
      Ents.spawn('echoride', { x: c * TS + TS / 2 - 48, y: r * TS, path: ride.path });
      this.hidden = true; SFX.grow(); FX.burst(this.x, this.y, 40, 'm', 260, { life: 0.9, g: 0 });
      return true;
    }
    if (what === 'big') { this.puff = 2.2; this.tiny = 0; SFX.grow(); return true; }
    if (what === 'small') { this.tiny = 2.2; this.puff = 0; SFX.shrink(); return true; }
    if (what === 'confused') { this.shake = 1; SFX.thud(); return true; }
    return false;
  },
  update(dt) {
    if (this.puff > 0) this.puff = Math.max(0, this.puff - dt);
    if (this.tiny > 0) this.tiny = Math.max(0, this.tiny - dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.line) {
      if (!this.said) { this.waitT += dt; if (this.waitT > 2.5) this.said = true; }   // a fila demorou demais: mostra assim mesmo
      else this.lineT += dt;
      if (this.outT == null && this.lineT > 2.8 && (this.heard || this.lineT > 7)) this.outT = 0.2;
      if (this.outT != null) { this.outT -= dt; if (this.outT <= 0) this.nextLine(); }
    }
    const t = Game.time, s = P.scale;
    const tx = P.cx - P.facing * (24 + 8 * s), ty = P.y - 6 - 6 * s + Math.sin(t * 2.2) * 4;
    const k = 1 - Math.exp(-dt * (P.dead ? 1.5 : 4.5));
    this.x = lerp(this.x, tx, k); this.y = lerp(this.y, ty, k);
    if (Voice.speaking && Voice.who === 'echo') this.pulse = 1; else this.pulse = Math.max(0, this.pulse - dt * 3);
  },
  draw(ctx, camX, camY, a) {
    if (this.hidden) return;
    let x = lerp(this.px, this.x, a) - camX; const y = lerp(this.py, this.y, a) - camY, t = Game.time;
    let size = this.puff > 0 ? 1 + 1.6 * Math.min(1, this.puff * 2, (2.2 - this.puff) * 4) : this.tiny > 0 ? 1 - 0.55 * Math.min(1, this.tiny * 2, (2.2 - this.tiny) * 4) : 1;
    if (this.birthK < 1) size *= P.easeBack(this.birthK);
    if (this.shake > 0) x += Math.sin(t * 40) * 3 * this.shake;
    if (size !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(size, size); ctx.translate(-x, -y); }
    this.drawOrb(ctx, x, y, t);
    if (size !== 1) ctx.restore();
    if (this.shake > 0) R.draw(R.text('?', '900 14px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 6), x, y - 18, 1, this.shake);
    if (this.line && !this.mirroring) this.drawBubble(ctx, x, y);   // o reflexo no chão do palácio não leva o balão
  },
  drawBubble(ctx, x, y) {
    const l = this.line, k = Math.min(1, this.lineT * 5, this.outT != null ? this.outT * 5 : 1);
    if (!this.said || k <= 0) return;
    const en = R.text(l.en, '700 12px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 5), pt = R.text(l.pt, '400 11px Inter, sans-serif', wa(0.75), null, 0);
    // o balão fica do lado de trás da Nexy (não cobre o que está à frente, nem o que o Echo revelou)
    const w = Math.max(en.w, pt.w) + 6, h = 44, bx = clamp(x - P.facing * (w / 2 - 14), w / 2 + 10, CFG.VIEW_W - w / 2 - 10), by = y - 40;
    ctx.save(); ctx.globalAlpha = k;
    rrect(ctx, bx - w / 2, by - h / 2, w, h, 14); ctx.fillStyle = 'rgba(2,2,2,0.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(217,70,239,0.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, by + h / 2); ctx.lineTo(x, by + h / 2 + 8); ctx.lineTo(x + 5, by + h / 2); ctx.fillStyle = 'rgba(2,2,2,0.82)'; ctx.fill();
    ctx.restore();
    R.draw(en, bx, by - 8, 1, k); R.draw(pt, bx, by + 10, 1, k);
  },
  drawOrb(ctx, x, y, t) {
    const talk = this.pulse > 0 ? 1 + 0.45 * Math.abs(Math.sin(t * 17)) * this.pulse : 1;
    R.draw(R.glow('m', 26), x, y, 0.7 * talk, 0.55 + 0.35 * this.pulse, true);
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x - 2.5, y - 2.5, 0, x, y, 7);
    g.addColorStop(0, wa(0.22)); g.addColorStop(1, wa(0.03));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = wa(0.32); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 2.8 * talk, 0, Math.PI * 2); ctx.fillStyle = '#e879f9'; ctx.fill();
    ctx.beginPath(); ctx.arc(x - 2.4, y - 2.6, 1.3, 0, Math.PI * 2); ctx.fillStyle = wa(0.65); ctx.fill();
  },
};

/* ============================== CÂMERA ============================== */
const Cam = {
  x: 0, y: 0, px: 0, py: 0, look: 0, ty: 0, shakeT: 0, shakeA: 0, sx: 0, sy: 0,
  snap() {
    this.look = 0; this.x = clamp(P.cx - CFG.VIEW_W / 2, 0, World.pxW - CFG.VIEW_W);
    this.ty = clamp(P.y + P.h - CFG.VIEW_H * 0.74, 0, World.pxH - CFG.VIEW_H); this.y = this.ty; this.px = this.x; this.py = this.y;
  },
  update(dt) {
    if (!P.dead) {
      const target = Math.abs(P.vx) > 40 ? sign(P.vx) * 88 : this.look;
      this.look = lerp(this.look, target, 1 - Math.exp(-dt * 2.4));
      const tx = clamp(P.cx - CFG.VIEW_W / 2 + this.look, 0, World.pxW - CFG.VIEW_W);
      this.x = lerp(this.x, tx, 1 - Math.exp(-dt * 9));
      // ajuste vertical só ao pousar numa nova altura ou perto da borda da tela
      const feet = P.y + P.h;
      if (P.onGround) this.ty = feet - CFG.VIEW_H * 0.74;
      if (P.y < this.y + 80) this.ty = Math.min(this.ty, P.y - 80);
      if (feet > this.y + CFG.VIEW_H - 60) this.ty = Math.max(this.ty, feet - CFG.VIEW_H + 60);
      this.ty = clamp(this.ty, 0, World.pxH - CFG.VIEW_H);
      this.y = lerp(this.y, this.ty, 1 - Math.exp(-dt * 4.5));
    }
    if (this.shakeT > 0) { this.shakeT -= dt; const a = this.shakeA * (this.shakeT / 0.3); this.sx = (Math.random() - 0.5) * a; this.sy = (Math.random() - 0.5) * a; }
    else { this.sx = 0; this.sy = 0; }
  },
};

/* ============================== PORTAS: desenho das inscrições e moldes ============================== */
const Doors = {
  moldSprite(d) {
    const solved = d.solved ? d.solved.join(',') : '';
    const key = 'moldS:' + d.id + ':' + solved, hit = R.cache.get(key);
    if (hit) return hit;
    {
      const parts = [], m = R.make(1, 1).x;
      let wi = 0, total = 0;
      for (const tok of d.def.mold) {
        if (tok === '_') {
          const w = d.solved ? d.solved[wi] : null; wi++;
          if (w) { m.font = '700 12px Orbitron, Inter, sans-serif'; const tw = m.measureText(w).width + w.length * 1.4 + 18; parts.push({ slot: true, word: w, w: tw }); total += tw; }
          else { parts.push({ slot: true, w: 44 }); total += 44; }
        } else if (/^[.,!?]$/.test(tok)) { m.font = '600 13px Orbitron, Inter, sans-serif'; const tw = m.measureText(tok).width; parts.push({ txt: tok, w: tw, punct: true }); total += tw; }
        else { m.font = '600 13px Orbitron, Inter, sans-serif'; const tw = m.measureText(tok).width + tok.length * 1.4; parts.push({ txt: tok, w: tw }); total += tw; }
      }
      const gap = 8; total += gap * (parts.length - 1);
      const s = R.make(total + 30, 40), x = s.x; let px = 15;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.punct && i > 0) px -= gap - 2;
        if (p.slot) {
          if (p.word) {
            x.save(); x.shadowColor = 'rgba(217,70,239,0.9)'; x.shadowBlur = 10 * R.k; capsulePath(x, px + p.w / 2, 20, p.w, 18);
            x.fillStyle = 'rgba(217,70,239,0.22)'; x.fill(); x.strokeStyle = '#d946ef'; x.lineWidth = 1; x.stroke(); x.restore();
            x.font = '700 12px Orbitron, Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
            try { x.letterSpacing = '1.4px'; } catch (e) { /* ok */ }
            x.fillText(p.word, px + p.w / 2 + 0.7, 20.5);
          } else {
            x.save(); x.setLineDash([3, 3]); capsulePath(x, px + p.w / 2, 20, p.w, 18); x.strokeStyle = wa(0.4); x.lineWidth = 1; x.stroke(); x.restore();
          }
        } else {
          x.font = '600 13px Orbitron, Inter, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = wa(0.88);
          try { x.letterSpacing = '1.4px'; } catch (e) { /* ok */ }
          x.fillText(p.txt, px, 20.5);
        }
        px += p.w + gap;
      }
      R.cache.set(key, s);
      return s;
    }
  },
  draw(ctx, camX, camY, t) {
    const sub = Save.data.assist.subtitles;
    for (const id in World.doors) {
      const d = World.doors[id], x = d.x - camX, y = d.y - camY;
      if (x > CFG.VIEW_W + 200 || x + d.w < -200 || d.kind === 'chest' || d.kind === 'engine' || d.kind === 'citymap' || d.def.quiet) continue;
      if (d.ent && d.ent.type === 'beswitch' && PalaceSwitch.active) continue;   // na cena do interruptor, só a cena
      if (d.kind === 'door' || d.kind === 'bells') this.drawArch(ctx, d, x, y, t);
      const cx = x + d.w / 2, top = d.kind === 'door' ? y - 40 : y - 92;
      const dim = d.kind === 'door' && d.open ? 0.4 : 1;
      R.draw(R.text(d.def.inscription, '700 15px Orbitron, Inter, sans-serif', '#22d3ee', 'rgba(0,217,249,0.7)', 10), cx, top - 62, 1, dim);
      if (sub || d.hint) R.draw(R.text(PHRASES_PT[d.def.inscription] || '', '400 11px Inter, sans-serif', wa(0.5), null, 0), cx, top - 44, 1, dim);
      R.draw(this.moldSprite(d), cx, top - 22, 1, dim);
      if (d.def.icon && !d.open) this.drawIcon(ctx, d, x - 30, y + 18 + Math.sin(t * 2) * 4, t);
    }
  },
  drawArch(ctx, d, x, y, t) {
    const a = d.open ? 0 : 1 - d.opening;
    // moldura gótica fixa na parede
    ctx.save();
    ogivePath(ctx, x - 6, y - 34, d.w + 12, d.h + 34); ctx.strokeStyle = ca(0.14); ctx.lineWidth = 1; ctx.stroke();
    if (a > 0) {
      ctx.globalAlpha = a;
      ogivePath(ctx, x + 1, y - 24, d.w - 2, d.h + 24);
      const g = ctx.createLinearGradient(0, y - 24, 0, y + d.h);
      g.addColorStop(0, 'rgba(10,15,18,0.96)'); g.addColorStop(1, 'rgba(5,8,10,0.96)');
      ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = `rgba(34,211,238,${0.03 + 0.02 * Math.sin(t * 2)})`; ctx.fill();
      ctx.strokeStyle = ca(0.9); ctx.lineWidth = 1; ctx.stroke();
      ogivePath(ctx, x + 9, y - 10, d.w - 18, d.h + 10); ctx.strokeStyle = ca(0.22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + d.w / 2, y + 6); ctx.lineTo(x + d.w / 2, y + d.h);
      ctx.moveTo(x + 9, y + d.h * 0.45); ctx.lineTo(x + d.w - 9, y + d.h * 0.45); ctx.strokeStyle = ca(0.12); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + d.w / 2, y - 2, 6, 0, Math.PI * 2); ctx.strokeStyle = ca(0.35); ctx.stroke();
      R.draw(R.glow('c', 24), x + d.w / 2, y - 2, 1, 0.35, true);
      if (d.kind === 'bells') for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + d.w / 2, y + d.h * (0.3 + i * 0.2), 4, 0, Math.PI * 2); ctx.strokeStyle = ca(0.3); ctx.stroke(); }
    }
    ctx.restore();
    // "I AM YOU.": o reflexo da Nexy aparece no vidro da porta e acena
    if (d.mirror > 0) {
      const k = Math.min(1, d.mirror * 2, (1.8 - d.mirror) * 4);
      R.draw(R.glow('m', 40), x + d.w / 2, y + d.h - 28, 1, 0.5 * k, true);
      ctx.save(); ctx.globalAlpha = 0.65 * k; ctx.translate(x + d.w / 2, y + d.h - 2); ctx.scale(0.95, 0.95);
      const of = P.facing, ok = P.kickT, og = P.onGround, ow = P.walkPhase, os = P.visScale, osc = P.scale;
      P.facing = -1; P.kickT = Math.sin(Game.time * 14) > 0 ? 0.1 : 0; P.onGround = true; P.walkPhase = 0.6; P.visScale = 1; P.scale = 1; P.poseSpeed = 0;
      P.drawBody(ctx, t);
      P.facing = of; P.kickT = ok; P.onGround = og; P.walkPhase = ow; P.visScale = os; P.scale = osc; P.poseSpeed = null;
      ctx.restore();
    }
  },
  drawIcon(ctx, d, x, y, t) {
    R.draw(R.glow('c', 30), x, y, 1, 0.6, true);
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    if (d.morph > 0) {
      // encenação: a chave vira uma pequena porta
      ogivePath(ctx, -7, -11, 14, 22); ctx.stroke(); ctx.beginPath(); ctx.arc(3, 2, 1.2, 0, Math.PI * 2); ctx.fillStyle = '#22d3ee'; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(-6, 0, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(11, 0); ctx.moveTo(7, 0); ctx.lineTo(7, 4); ctx.moveTo(10, 0); ctx.lineTo(10, 5); ctx.stroke();
    }
    ctx.restore();
  },
  drawPrompt(ctx, camX, camY) {
    const d = P.interact; if (!d || Game.state !== 'play') return;
    const label = d.kind === 'pedestal' ? '↑ SPEAK' : d.kind === 'engine' ? '↑ USE' : d.kind === 'citymap' ? '↑ READ' : '↑ OPEN';
    const s = R.text(label, '600 10px Orbitron, Inter, sans-serif', '#22d3ee', 'rgba(0,217,249,0.7)', 6);
    const x = P.cx - camX, y = P.y - camY - 30 - Math.sin(Game.time * 4) * 2;
    capsulePath(ctx, x, y, s.w - 14, 20); ctx.fillStyle = 'rgba(2,2,2,0.7)'; ctx.fill(); ctx.strokeStyle = ca(0.6); ctx.lineWidth = 1; ctx.stroke();
    R.draw(s, x, y + 0.5);
  },
};
