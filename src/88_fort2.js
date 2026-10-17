/* ============================== O GUARDIÃO DE FERRO (o chefe do forte) e o SELO DA LEI ==============================
   A cada rodada o Guardião escreve uma lei nova na tábua (FORT.warden.rounds): THE WARDEN CAN FLY (voa e solta bolas
   de ferro), YOU CAN'T JUMP (anda no chão e o martelo solta ondas que só se pulam), NOBODY CAN SEE (a arena escurece e
   ele mergulha). Reescrever a lei na tábua o derruba por FORT.warden.stun s: pisão, fogo, martelo, laser.
   Sem inglês: as BOLAS DE FERRO que ele solta são cascos (segure CORRER para pegar, ↑ e solte para jogar para cima;
   chutadas deslizam) e tiram 2; o FOGO tira 1 a qualquer hora. Morreu: ele volta a dormir e a rodada fica.
   Depois da 3ª rodada, a cena (o CAN'T se parte, sobra o CAN) e o SELO DA LEI no Coração: o pulo duplo do Forte em
   diante. A leitura e a escalada (A2 → B1, com COULD) no painel do Baú deixam o selo mais forte (SealPanel). */
const ARENA = { c0: 248, c1: 296, floor: 13 };
const Warden = {
  ent: null, waves: [], shakeT: 0,
  reset() { this.ent = null; this.waves = []; this.shakeT = 0; },
  R() { return FORT.warden.rounds; },
  round(e = this.ent) { return this.R()[Math.min(e ? e.round : 0, this.R().length - 1)]; },
  fighting(e = this.ent) { return !!e && ['write', 'fight', 'stun', 'rise'].includes(e.state); },
  // a lei desta rodada vale (o jogador ainda não a reescreveu)
  lawOn(kind) { const e = this.ent; return !!e && this.fighting(e) && !e.broken && e.state !== 'rise' && this.round(e).law === kind; },
  inArena() { const c = P.cx / TS; return c >= ARENA.c0 && c <= ARENA.c1 + 1; },
  noJump() { return this.lawOn('jump') && this.inArena(); },
  darkK() { return this.lawOn('see') && this.inArena() ? 0.9 : 0; },
  floorY() { return ARENA.floor * TS; },
  shake() { this.shakeT = 0.8; },
  // a tábua: só a resposta da rodada de agora vale; as outras palavras viram dica da Echo
  live(def) {
    const e = this.ent, i = e && e.state !== 'dead' && e.state !== 'dying' ? Math.min(e.round, this.R().length - 1) : 0, r = this.R()[i];
    def.inscription = r.text; def.mold = r.mold.slice();
    def.accept = [{ words: [r.answer], result: { type: 'warden', round: i } }];
    def.enact = Object.keys(r.tips).filter(k => k !== '*').map(k => ({ words: [k], result: { type: 'stone', law: 'warden', tip: r.tips[k] } }))
      .concat([{ words: ['*'], result: { type: 'stone', law: 'warden', tip: r.tips['*'] } }]);
  },
  // a frase certa: a lei se quebra e o Guardião cai
  answer(i) {
    const e = this.ent; if (!e || e.state === 'dead' || e.state === 'dying' || e.round !== i || e.broken) return;
    // respondeu na tábua antes de ele acordar: ele acorda já derrubado
    if (e.state === 'sleep' || e.state === 'wake') { e.woke = true; e.metEcho = true; Game.registerCreature('WARDEN'); SFX.roar(); }
    e.broken = true; e.crack = 1;
    SFX.law(); SFX.shatter(); Game.shake(7); Game.hitstop(5); Hints.mark('warden');
    FX.burst(e.cx, e.cy, 50, 'm', 320, { life: 0.9, g: 300 });
    this.stun(e, FORT.warden.stun);
    if (Game.echoBorn) Game.later(0.6, () => Echo.talk(ECHO.lines.wardenDown));
  },
  stun(e, sec) { e.state = 'stun'; e.stateT = sec; e.vy = 0; e.swoop = null; e.slam = 0; },
  damage(e, n, src) {
    if (e.iT > 0 || !this.fighting(e) || e.state === 'write' || e.state === 'rise') return false;
    if (e.state !== 'stun' && src !== 'ball' && src !== 'fire') return false;
    e.hp -= n; e.iT = 0.3; e.hitT = 0.2; SFX.bossHit(); Game.hitstop(2); Game.shake(2); Hints.mark('warden');
    FX.burst(e.cx, e.cy, 16 + n * 6, 'm', 220, { life: 0.5, g: 0 });
    if (e.hp <= 0) this.roundOver(e);
    return true;
  },
  roundOver(e) {
    e.hp = 0; this.waves = []; this.clearBalls();
    if (e.round >= this.R().length - 1) return WardenScene.start(e);
    e.round++; e.hp = FORT.warden.hp; e.broken = false; e.crack = 0;
    e.state = 'rise'; e.stateT = 1.3; SFX.roar(); Game.shake(6);
    FX.burst(e.cx, e.cy, 40, 'w', 300, { life: 0.8, g: 300 });
  },
  clearBalls() { for (const b of Ents.list) if (b.type === 'casco' && b.iron && !b.dead) { if (P.held === b) P.dropHeld(); b.dead = true; FX.burst(b.x + 13, b.y + 11, 10, 'w', 140, { life: 0.4, g: 300 }); } },
  ball(x, y, vx, vy) {
    if (Ents.list.filter(b => b.type === 'casco' && b.iron && !b.dead).length >= 3) return;
    const b = Ents.spawn('casco', { x: x - 13, y: y - 11 }); b.iron = true; Ents.types.casco.toShell(b); b.vx = vx; b.vy = vy; b.immune = 0.3; SFX.drop();
  },
  // morreu: o Guardião volta a dormir (a rodada fica) e as leis da arena se desfazem
  respawn() {
    const e = this.ent; this.waves = []; this.clearBalls();
    if (!e || e.state === 'dead' || e.state === 'dying') return;
    e.state = 'sleep'; e.broken = false; e.crack = 0; e.hp = FORT.warden.hp; e.cx = e.hx; e.cy = e.hy; e.swoop = null; e.slam = 0;
  },
  // as ondas do martelo correm pelo chão: só quem está no ar escapa (até o pulinho curto serve)
  updateWaves(dt) {
    const fy = this.floorY();
    for (const w of this.waves) {
      w.x += w.dir * 250 * dt; w.life -= dt;
      if (!P.dead && Math.abs(P.cx - w.x) < 14 && P.y + P.h >= fy - 3 && P.onGround) P.hurt();
      if (World.solidStatic(Math.floor((w.x + w.dir * 8) / TS), ARENA.floor - 1)) w.life = 0;
    }
    this.waves = this.waves.filter(w => w.life > 0);
  },
  drawWaves(ctx, camX, camY) {
    const fy = this.floorY() - camY;
    for (const w of this.waves) {
      const x = w.x - camX, k = Math.min(1, w.life * 2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      R.draw(Fort.glowA(24), x, fy - 6, 1.2, 0.8 * k, true);
      ctx.beginPath(); ctx.moveTo(x - 14, fy); ctx.quadraticCurveTo(x - 4, fy - 18, x + w.dir * 4, fy - 14); ctx.quadraticCurveTo(x + 8, fy - 6, x + 14, fy);
      ctx.strokeStyle = `rgba(253,224,71,${(0.9 * k).toFixed(3)})`; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
    }
  },
  /* ---------- a tábua do Guardião (pedestal look 'tablet') ---------- */
  drawTablet(ctx, x, y, t) {
    const e = this.ent, cx = x + 16, w = 176, h = 92, tx = cx - w / 2, ty = y - h - 6, p = 0.5 + 0.5 * Math.sin(t * 2);
    const dead = !e || e.state === 'dead' || e.state === 'dying', asleep = e && e.state === 'sleep' && !e.woke;
    const r = this.round(e), broken = dead || (e && e.broken), sh = this.shakeT > 0 ? Math.sin(t * 70) * 2.4 * this.shakeT : 0;
    ctx.save(); ctx.translate(sh, 0);
    for (const px of [tx + 22, tx + w - 22]) { rrect(ctx, px - 5, ty + h - 4, 10, y + 32 - (ty + h - 4), 2); ctx.fillStyle = '#100d14'; ctx.fill(); ctx.strokeStyle = AMBER(0.3); ctx.lineWidth = 1; ctx.stroke(); }
    R.draw(broken ? R.glow('m', 64) : Fort.glowA(64), cx, ty + h / 2, 2, 0.25 + 0.12 * p, true);
    ctx.beginPath(); ctx.moveTo(tx, ty + h); ctx.lineTo(tx, ty + 18); ctx.quadraticCurveTo(cx, ty - 26, tx + w, ty + 18); ctx.lineTo(tx + w, ty + h); ctx.closePath();
    const g = ctx.createLinearGradient(0, ty, 0, ty + h); g.addColorStop(0, '#1b1522'); g.addColorStop(1, '#0b090e');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = broken ? 'rgba(240,171,252,0.9)' : AMBER(0.75); ctx.lineWidth = 1.6; ctx.stroke();
    R.draw(R.text('THE LAW OF THE WARDEN', '700 7px Orbitron, Inter, sans-serif', AMBER(0.8), null, 0), cx, ty + 12, 1, 0.9);
    if (dead) R.draw(R.text('THE LAW IS BROKEN', '900 12px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 8), cx, ty + 52, 1, 1);
    else if (!asleep) {
      const [l1, l2] = Fort.split(broken ? r.done : r.text);
      R.draw(R.text(l1, '700 11px Orbitron, Inter, sans-serif', wa(0.85), null, 0), cx, ty + 36, 1, 1);
      R.draw(R.text(l2, '900 17px Orbitron, Inter, sans-serif', '#ffffff', broken ? 'rgba(34,211,238,1)' : 'rgba(251,191,36,1)', 12), cx, ty + 62, 1, 1);
    } else R.draw(R.text('. . .', '900 16px Orbitron, Inter, sans-serif', AMBER(0.7), null, 0), cx, ty + 52, 1, 0.6 + 0.4 * p);
    // a rachadura da lei quebrada
    if (broken && !dead) { ctx.beginPath(); ctx.moveTo(cx - 40, ty + 20); ctx.lineTo(cx - 12, ty + 44); ctx.lineTo(cx - 22, ty + 58); ctx.lineTo(cx + 8, ty + 86); ctx.moveTo(cx - 12, ty + 44); ctx.lineTo(cx + 30, ty + 36); ctx.strokeStyle = 'rgba(240,171,252,0.8)'; ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.restore();
  },
  drawBall(ctx, e, x, y) {
    const cx = x + e.w / 2, cy = y + e.h / 2, t = e.t, fast = e.state === 'slide' || e.vy < -50;
    R.draw(Fort.glowA(24), cx, cy, 1, fast ? 0.7 : 0.3, true);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(e.state === 'slide' ? t * 14 * (e.dir || 1) : 0);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 11); g.addColorStop(0, '#5b5266'); g.addColorStop(1, '#141018');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = AMBER(0.7); ctx.lineWidth = 1.2; ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.strokeStyle = 'rgba(200,190,215,0.6)'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
  },
};
Ents.reg('warden', {
  layer: 'enemy',
  init(e) {
    e.hx = e.c * TS + TS / 2; e.hy = e.r * TS + 16; e.cx = e.hx; e.cy = e.hy; e.vy = 0;
    e.persist = true; e.shootable = true; e.state = 'sleep'; e.round = 0; e.hp = FORT.warden.hp; e.stateT = 0;
    e.mx = 0; e.ballT = 1.5; e.slamT = 3; e.throwT = 4; e.swoopT = 3.4; e.swoop = null; e.slam = 0; e.hitT = 0; e.iT = 0; e.broken = false; e.crack = 0;
    Warden.ent = e; this.box(e);
  },
  box(e) { e.w = 72; e.h = 88; e.x = e.cx - e.w / 2; e.y = e.cy - e.h / 2; },
  body(e) { return { x: e.cx - 26, y: e.cy - 40, w: 52, h: 84 }; },
  update(e, dt) {
    if (e.state === 'dead') return;
    if (e.state === 'dying') { e.cx += Math.sin(e.t * 70) * 0.5; this.box(e); return; }
    const W = Warden, fr = FORT.warden, fy = W.floorY(), rd = e.round, ox = e.cx, oy = e.cy;
    if (e.hitT > 0) e.hitT -= dt; if (e.iT > 0) e.iT -= dt; if (W.shakeT > 0) W.shakeT -= dt; if (e.crack > 0) e.crack = Math.max(0, e.crack - dt * 0.4);
    if (Fort.frozen() && e.state !== 'sleep') { this.box(e); W.updateWaves(0); return; }   // o CLOCK para até o Guardião
    let tx = e.hx, ty = e.hy + Math.sin(e.t * 1.4) * 12, k = 2.4;
    const low = fy - 44;   // a altura do corpo no chão
    if (e.state === 'sleep') {
      ty = e.hy + Math.sin(e.t * 0.9) * 6;
      if (!P.dead && P.cx > (ARENA.c0 + 5) * TS) { e.state = 'wake'; e.stateT = 1.3; e.woke = true; SFX.roar(); SFX.warDrum(); Game.shake(5); }
    } else if (e.state === 'wake') {
      e.stateT -= dt; ty = e.hy - 12;
      if (e.stateT <= 0) { e.state = 'write'; e.stateT = 1.8; e.wrote = false; Game.registerCreature('WARDEN'); }
    } else if (e.state === 'write') {
      // escreve a lei: a tábua acende, a voz das portas lê
      e.stateT -= dt; tx = e.cx; ty = e.hy - 6;
      if (!e.wrote && e.stateT < 1.4) {
        e.wrote = true; SFX.law(); Game.shake(3); Voice.say(W.round(e).text, 'door', { cut: true });
        if (Game.echoBorn) Game.later(1.6, () => Echo.talk(!e.metEcho ? ECHO.lines.warden : rd === 2 ? ECHO.lines.wardenDark : ECHO.lines.wardenLaw));
        e.metEcho = true;
        for (const w of ['WARDEN', 'FLY', 'NOBODY']) { if (!Game.wordsSeen.has(w)) { Game.wordsSeen.add(w); Game.learnedOrder.push(w); } Game.grimoireWord(w, null); }
      }
      if (e.stateT <= 0) { e.state = 'fight'; e.ballT = 1.2; e.slamT = 2.4; e.throwT = 3.5; e.swoopT = 2.6; }
    } else if (e.state === 'fight') {
      e.mx += dt * (0.5 + rd * 0.1);
      if (rd === 1) {
        // anda no chão atrás da Nexy; o martelo bate e solta ondas pelos dois lados
        ty = low; k = 6;
        if (e.slam > 0) { e.slam -= dt; tx = e.cx; if (e.slam <= 0) { SFX.slam(); Game.shake(6); W.waves.push({ x: e.cx - 30, dir: -1, life: 2 }, { x: e.cx + 30, dir: 1, life: 2 }); FX.burst(e.cx, fy, 30, 'w', 260, { life: 0.6, g: 500 }); } }
        else {
          tx = clamp(e.cx + sign(P.cx - e.cx) * 55 * dt * 8, (ARENA.c0 + 2) * TS, (ARENA.c1 - 1) * TS);
          e.slamT -= dt; if (e.slamT <= 0) { e.slam = 0.55; e.slamT = 3.2; SFX.wake(); }
          e.throwT -= dt; if (e.throwT <= 0) { e.throwT = 4.5; W.ball(e.cx, e.cy - 30, sign(P.cx - e.cx) * 160, -420); }
        }
      } else {
        // voa sobre a arena e solta bolas de ferro; na 3ª rodada, no escuro, mergulha na Nexy
        tx = e.hx + Math.sin(e.mx) * 9 * TS;
        e.ballT -= dt; if (e.ballT <= 0) { e.ballT = rd === 2 ? 3 : fr.ballEvery; W.ball(e.cx, e.cy + 40, 0, 0); }
        if (rd === 2) {
          if (!e.swoop) { e.swoopT -= dt; if (e.swoopT <= 0) { e.swoop = { t: 0, x: P.cx, from: e.cx }; e.swoopT = 3.4; SFX.wake(); } }
          else {
            const s = e.swoop; s.t += dt;
            if (s.t < 0.6) { tx = e.cx; ty = e.cy; }                       // o aviso: os olhos acendem
            else if (s.t < 1.1) { tx = s.x; ty = low - 10; k = 9; }          // o mergulho
            else if (s.t < 1.9) { tx = s.x; ty = e.hy; k = 3; }              // volta para cima
            else e.swoop = null;
          }
        }
      }
    } else if (e.state === 'stun') {
      // caiu: fica no chão, aberto
      e.stateT -= dt; tx = e.cx; e.vy = Math.min(e.vy + 1600 * dt, 700); ty = Math.min(low, e.cy + e.vy * dt); k = 60;
      if (e.cy >= low - 1 && !e.landed) { e.landed = true; SFX.slam(); Game.shake(5); FX.burst(e.cx, fy, 26, 'w', 220, { life: 0.6, g: 500 }); }
      if (Math.random() < 0.3) FX.add(e.cx + (Math.random() - 0.5) * 50, e.cy - 30, { vx: (Math.random() - 0.5) * 40, vy: -50, life: 0.6, size: 1.4, c: 'm', g: 0 });
      if (e.stateT <= 0) { e.landed = false; e.broken = false; e.crack = 0; e.state = 'write'; e.stateT = 1.8; e.wrote = false; }   // ele escreve a lei de novo
    } else if (e.state === 'rise') {
      e.stateT -= dt; tx = e.hx; ty = e.hy; k = 3;
      if (e.stateT <= 0) { e.state = 'write'; e.stateT = 1.8; e.wrote = false; }
    }
    const kk = 1 - Math.exp(-dt * k);
    e.cx = lerp(e.cx, tx, kk); e.cy = e.state === 'stun' ? ty : lerp(e.cy, ty, kk);
    this.box(e);
    // as bolas de ferro jogadas (para cima ou chutadas) batem nele
    for (const b of Ents.list) {
      if (b.type !== 'casco' || !b.iron || b.dead || !(b.state === 'slide' || (b.state === 'shell' && b.vy < -60))) continue;
      if (overlap(b, this.body(e)) && W.damage(e, 2, 'ball')) { b.dead = true; SFX.clang(); FX.burst(b.x + 13, b.y + 11, 20, 'w', 260, { life: 0.5, g: 400 }); }
    }
    W.updateWaves(dt);
    // encostar machuca; caído, o pisão em cima vale 2
    const B = this.body(e);
    if (!P.dead && W.fighting(e) && e.state !== 'write' && overlap(P, B)) {
      if (e.state === 'stun' && P.vy > 0 && P.py + P.h <= B.y + 16) { P.y = B.y - P.h; P.combo++; P.bounce(false); SFX.stomp(P.combo); W.damage(e, 2, 'stomp'); }
      else if (e.state !== 'stun') P.hurt();
      else { const left = P.cx < e.cx; P.x = left ? B.x - P.w : B.x + B.w; P.vx = left ? -150 : 150; }
    }
    e.dx = e.cx - ox; e.dy = e.cy - oy;
  },
  shot(e, dmg, b) {
    if (e.state === 'dead' || e.state === 'dying' || !overlap({ x: b.x - 6, y: b.y - 6, w: 12, h: 12 }, this.body(e))) return false;
    if (!Warden.damage(e, dmg, b.fire ? 'fire' : 'shot')) { SFX.clang(); FX.burst(b.x, b.y, 8, 'w', 140, { life: 0.3, g: 200 }); }
    return true;
  },
  draw(ctx, e, x, y) {
    if (e.state === 'dead') return;
    const t = e.t, camX = e.x - x, camY = e.y - y, cx = e.cx - camX + (e.hitT > 0 ? Math.sin(t * 90) * 2 : 0), cy = e.cy - camY;
    const stun = e.state === 'stun', fly = !stun && e.round !== 1 || e.state === 'write' || e.state === 'rise' || e.state === 'sleep' || e.state === 'wake';
    const hot = e.swoop && e.swoop.t < 0.6 || e.slam > 0, tilt = stun ? 0.5 : Math.sin(t * 1.4) * 0.04;
    R.draw(stun ? R.glow('m', 64) : Fort.glowA(64), cx, cy, 2, 0.25 + (hot ? 0.25 : 0), true);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    // as asas de ferro (voando)
    if (fly) for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(Math.sin(t * 6) * 0.25 - 0.1);
      ctx.beginPath(); ctx.moveTo(18, -24); ctx.quadraticCurveTo(60, -64, 104, -40); ctx.lineTo(92, -22); ctx.lineTo(80, -30); ctx.lineTo(74, -8); ctx.lineTo(60, -20); ctx.lineTo(50, 2); ctx.lineTo(38, -12); ctx.lineTo(24, 4); ctx.closePath();
      const gw = ctx.createLinearGradient(20, -60, 90, 0); gw.addColorStop(0, 'rgba(76,29,149,0.85)'); gw.addColorStop(1, 'rgba(112,26,117,0.6)');
      ctx.fillStyle = gw; ctx.fill(); ctx.strokeStyle = AMBER(0.6); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, -22); ctx.lineTo(80, -30); ctx.moveTo(20, -22); ctx.lineTo(60, -20); ctx.moveTo(20, -22); ctx.lineTo(38, -12); ctx.strokeStyle = 'rgba(200,190,215,0.35)'; ctx.stroke();
      ctx.restore();
    }
    // a capa
    ctx.beginPath(); ctx.moveTo(-22, -26); ctx.quadraticCurveTo(-34, 10, -28 + Math.sin(t * 3) * 4, 46); ctx.lineTo(28 + Math.sin(t * 3 + 1) * 4, 46); ctx.quadraticCurveTo(34, 10, 22, -26); ctx.closePath();
    const gc = ctx.createLinearGradient(0, -26, 0, 46); gc.addColorStop(0, '#3b0764'); gc.addColorStop(1, '#1e0532'); ctx.fillStyle = gc; ctx.fill(); ctx.strokeStyle = 'rgba(217,70,239,0.45)'; ctx.lineWidth = 1; ctx.stroke();
    // a armadura
    rrect(ctx, -20, -28, 40, 50, 8); const ga = ctx.createLinearGradient(0, -28, 0, 22); ga.addColorStop(0, '#2b2533'); ga.addColorStop(1, '#100c14');
    ctx.fillStyle = ga; ctx.fill(); ctx.strokeStyle = AMBER(0.7); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-20, -8); ctx.lineTo(20, -8); ctx.moveTo(0, -28); ctx.lineTo(0, 22); ctx.strokeStyle = 'rgba(200,190,215,0.18)'; ctx.lineWidth = 1; ctx.stroke();
    // a runa da lei no peito
    const word = { fly: 'FLY', jump: 'JUMP', see: 'SEE' }[Warden.round(e).law];
    R.draw(R.text(word, '900 8px Orbitron, Inter, sans-serif', '#fff7ed', e.broken ? 'rgba(217,70,239,1)' : 'rgba(251,191,36,1)', 6), 0, 2, 1, e.state === 'sleep' ? 0.4 : 1);
    // pernas e botas
    for (const s of [-1, 1]) { rrect(ctx, s * 12 - 6, 20, 12, 22, 3); ctx.fillStyle = '#16121b'; ctx.fill(); ctx.strokeStyle = wa(0.15); ctx.stroke(); }
    // o elmo com chifres e o visor em T (os olhos acendem antes do golpe)
    ctx.beginPath(); ctx.moveTo(-16, -30); ctx.quadraticCurveTo(-16, -56, 0, -58); ctx.quadraticCurveTo(16, -56, 16, -30); ctx.closePath();
    ctx.fillStyle = '#1c1722'; ctx.fill(); ctx.strokeStyle = AMBER(0.75); ctx.lineWidth = 1.4; ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 13, -50); ctx.quadraticCurveTo(s * 30, -60, s * 30, -78); ctx.quadraticCurveTo(s * 22, -62, s * 9, -55); ctx.closePath(); ctx.fillStyle = '#2a2330'; ctx.fill(); ctx.strokeStyle = 'rgba(200,190,215,0.4)'; ctx.stroke(); }
    const eyeC = stun ? 'rgba(165,243,252,0.5)' : e.hitT > 0 ? '#ffffff' : hot ? '#fde047' : '#f59e0b';
    ctx.fillStyle = '#05040a'; ctx.fillRect(-10, -46, 20, 5); ctx.fillRect(-2.5, -46, 5, 13);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 6, -43.5, 1.8, 0, Math.PI * 2); ctx.fillStyle = eyeC; ctx.fill(); }
    if (!stun) R.draw(Fort.glowA(16), 0, -44, 1, hot ? 1 : 0.6, true);
    // o martelo gigante (na 2ª rodada ele bate)
    const ang = e.slam > 0 ? -1.8 + (1 - e.slam / 0.55) * 2.6 : stun ? 1.2 : -0.5 + Math.sin(t * 2) * 0.1;
    ctx.save(); ctx.translate(24, -6); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -40); ctx.strokeStyle = '#8b7d6b'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    rrect(ctx, -16, -58, 32, 20, 3); ctx.fillStyle = '#231d29'; ctx.fill(); ctx.strokeStyle = AMBER(0.85); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
    // caído: anéis girando em volta do elmo
    if (stun) for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; ctx.beginPath(); ctx.arc(Math.cos(a) * 20, -64 + Math.sin(a) * 5, 2.2, 0, Math.PI * 2); ctx.fillStyle = '#a5f3fc'; ctx.fill(); }
    ctx.restore();
    Warden.drawWaves(ctx, camX, camY);
    // a vida da rodada e as rodadas
    if (Warden.fighting(e)) {
      const w = 96, bx = cx - w / 2, by = cy - 104;
      rrect(ctx, bx, by, w, 5, 2.5); ctx.fillStyle = 'rgba(8,6,10,0.9)'; ctx.fill(); ctx.strokeStyle = AMBER(0.5); ctx.lineWidth = 1; ctx.stroke();
      rrect(ctx, bx + 1, by + 1, (w - 2) * Math.max(0, e.hp) / FORT.warden.hp, 3, 1.5); ctx.fillStyle = stun ? '#f0abfc' : AMBER(0.9); ctx.fill();
      for (let i = 0; i < Warden.R().length; i++) { ctx.beginPath(); ctx.arc(cx - 12 + i * 12, by - 7, 2.6, 0, Math.PI * 2); ctx.fillStyle = i < e.round ? 'rgba(240,171,252,0.9)' : AMBER(0.4); ctx.fill(); }
    }
  },
});

/* ---------- a cena da queda do Guardião (na pegada God of War): o CAN'T se parte, sobra o CAN e ele vai para o Coração ---------- */
const WardenScene = {
  active: false, t: 0, zoom: 1, sat: 0, letter: 0, timeScale: 0, flash: 0, ev: {},
  start(e) {
    Object.assign(this, { active: true, t: 0, zoom: 1, sat: 0, letter: 0, flash: 0, ev: {}, e, text: null, textT: 0, voiceDone: true, title: 0, shards: [], word: 0, fly: 0 });
    e.state = 'dying'; Warden.waves = []; Warden.clearBalls(); FortPower.balls = []; Power.bolts = []; EnemyFire.list = [];
    Game.state = 'cinematic'; Game.clearInput(); P.vx = 0;
    Music.set({ bass: 0, organ: 0, perc: 0, pad: 0.4 }); Music.setDrone(true);
    SFX.impact(); Game.shake(8);
  },
  once(k, fn) { if (!this.ev[k]) { this.ev[k] = true; fn(); } },
  say(line, who = 'story') {
    this.text = line; this.textT = 0; this.voiceDone = false;
    if (!Voice.say(line.en, who, { onEnd: () => { this.voiceDone = true; } })) this.voiceDone = true;
  },
  key(e) {
    if (e.code === 'Escape') return this.end();
    if (['Enter', 'NumpadEnter', 'Space', 'KeyZ'].includes(e.code) && this.t > 1) { Voice.stop(); this.voiceDone = true; if (this.t > 5) this.end(); else this.t = Math.max(this.t, 3.4); }
  },
  tap() { this.key({ code: 'Enter' }); },
  update(dt) {
    if (!this.active) return;
    this.t += dt; this.textT += dt; const t = this.t, e = this.e, W = CFG.VIEW_W;
    this.letter = Math.min(1, t * 2);
    this.zoom = 1 + 0.2 * Math.min(1, t / 0.6) * (t < 4.4 ? 1 : Math.max(0, 1 - (t - 4.4) / 0.8));
    this.sat = t < 3 ? Math.min(0.85, t * 1.5) : Math.max(0, 0.85 - (t - 3) * 0.5);
    this.word = Math.min(1, Math.max(0, (t - 0.5) * 2));
    for (const [k, at] of [['d1', 0.35], ['d2', 1], ['d3', 1.6], ['d4', 2.2]]) if (t > at) this.once(k, () => { SFX.warDrum(); Game.shake(3); });
    if (t > 1.3) this.once('beat', () => SFX.heartbeat());
    if (t > 1.8) this.once('rise', () => SFX.riser(1));
    // o 'T se parte: cacos voam; sobra o CAN
    if (t > 2.8) this.once('break', () => {
      SFX.impact(); SFX.shatter(); Game.shake(14); this.flash = 1;
      for (let i = 0; i < 26; i++) this.shards.push({ x: W / 2 + 70 + Math.random() * 30, y: 160 + (Math.random() - 0.5) * 30, vx: 60 + Math.random() * 380, vy: -260 + Math.random() * 300, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, s: 3 + Math.random() * 7 });
      FX.burst(e.cx, e.cy, 80, 'w', 480, { life: 1.4, g: 500 }); FX.burst(e.cx, e.cy, 40, 'm', 380, { life: 1.2, g: 300 });
      for (let i = 0; i < 8; i++) Ents.spawn('orb', { x: e.cx, y: e.cy, vx: (i - 3.5) * 70, vy: -360, homing: true, delay: 0.6 + i * 0.05 });
      e.state = 'dead';
    });
    for (const s of this.shards) { s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt; }
    if (t > 3.5) { this.fly = Math.min(1, (t - 3.5) / 0.8); this.once('line1', () => this.say(FORT.warden.scene[0])); }
    if (t > 4.3) this.once('heart', () => { SFX.powerup(); Game.shake(4); FX.burst(P.cx, P.cy, 60, 'm', 320, { life: 1, g: 0 }); });
    if (t > 4.4) this.title = Math.min(1, this.title + dt * 2);
    if (t > 5.4) this.once('line2', () => { if (this.voiceDone) this.say(FORT.warden.scene[1]); else this.ev.line2 = false; });
    if (t > 9 && this.voiceDone || t > 15) this.end();
    this.flash = Math.max(0, this.flash - dt * 1.4);
    FX.update(dt);
  },
  end() {
    if (!this.active) return;
    const e = this.e; if (e.state !== 'dead') e.state = 'dead';
    this.active = false; this.letter = 0; this.zoom = 1; this.sat = 0;
    const H = Save.data.heart; H.seal = Math.max(1, H.seal | 0); Save.data.met.warden = true; Save.write();
    Music.setDrone(false); Music.normal();
    if (Game.state === 'cinematic') Game.state = 'play';
    Game.clearInput();
    SealPanel.open(true);
  },
  drawWorld() { },
  drawScreen(ctx) {
    if (!this.active) return;
    const W = CFG.VIEW_W, H = CFG.VIEW_H, bar = 62 * this.letter, t = this.t;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    // CAN'T no alto; o 'T se parte; o CAN desce até a Nexy (o Coração)
    if (this.word > 0) {
      const gone = t > 2.8, crack = clamp((t - 2.2) / 0.6, 0, 1), fk = this.fly, sx = W / 2, sy = 160;
      const px = lerp(P.px, P.x, 1) + P.w / 2 - Cam.x, py = lerp(P.py, P.y, 1) + P.h / 2 - Cam.y;
      const x = lerp(sx - (gone ? 0 : 30), px, fk * fk), y = lerp(sy, py, fk * fk), s = (1 + (1 - this.word) * 0.5) * (1 - fk * 0.85);
      if (fk < 1) R.draw(R.text('CAN', '900 64px Orbitron, Inter, sans-serif', '#ffffff', gone ? 'rgba(251,191,36,1)' : 'rgba(217,70,239,1)', 22), x, y, s, this.word);
      if (!gone) {
        const ox = sx + 92 + Math.sin(t * 60) * 2 * crack;
        R.draw(R.text("'T", '900 64px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,1)', 22), ox, sy, 1 + (1 - this.word) * 0.5, this.word);
        if (crack > 0) { ctx.beginPath(); ctx.moveTo(ox - 30, sy - 30); ctx.lineTo(ox - 6, sy - 4); ctx.lineTo(ox - 16, sy + 8); ctx.lineTo(ox + 4, sy + 34); ctx.moveTo(ox - 6, sy - 4); ctx.lineTo(ox + 26, sy - 14);
          ctx.strokeStyle = `rgba(255,255,255,${crack.toFixed(3)})`; ctx.lineWidth = 2.2; ctx.stroke(); }
      }
      for (const sd of this.shards) { ctx.save(); ctx.translate(sd.x, sd.y); ctx.rotate(sd.r); ctx.beginPath(); ctx.moveTo(-sd.s, -sd.s * 0.4); ctx.lineTo(sd.s, -sd.s * 0.7); ctx.lineTo(sd.s * 0.3, sd.s); ctx.closePath(); ctx.fillStyle = 'rgba(240,171,252,0.9)'; ctx.fill(); ctx.restore(); }
    }
    if (this.title > 0) {
      R.draw(R.text('THE LAW IS BROKEN', '900 30px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(251,191,36,1)', 16), W / 2, 250, 1 + (1 - this.title) * 0.4, this.title);
      R.draw(R.text('A LEI SE QUEBROU · O CORAÇÃO GANHOU O SELO DA LEI', '600 11px Orbitron, Inter, sans-serif', wa(0.75), null, 0), W / 2, 282, 1, this.title);
    }
    if (this.text) {
      const kt = Math.min(1, this.textT * 3);
      R.draw(R.text(this.text.en, '700 20px Orbitron, Inter, sans-serif', '#ffffff', 'rgba(217,70,239,0.9)', 12), W / 2, H - bar - 52, 1, kt);
      if (this.text.pt) R.draw(R.text(this.text.pt, '400 13px Inter, sans-serif', wa(0.78), null, 0), W / 2, H - bar - 26, 1, kt);
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,247,237,${this.flash.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  },
};

/* ---------- O SELO DA LEI: ler as leis novas (karaokê do narrador) e a escalada A2 → B1 (COULD) ----------
   Usa o painel do Baú. Cada acerto sobe o selo um nível (fica salvo): o 2º pulo fica mais alto. Errar encerra; o selo fica.
   Fechar pela 1ª vez abre o portão da torre de menagem. */
const SealPanel = {
  st: null, showPt: false, timers: [], first: false,
  open(first) {
    this.first = !!first; Game.state = 'seal'; P.vx = 0;
    this.st = { step: first ? 'intro' : 'online', rung: 0, fell: false };
    this.showPt = !!Save.data.assist.subtitles;
    $('ckind').textContent = 'THE SEAL OF THE LAW'; $('chest').classList.add('on', 'citymap'); $('chest').classList.remove('dim');
    $('ckeys').textContent = '← → CHOOSE · ENTER OK · H TRANSLATION · ESC CLOSE';
    Music.set({ perc: 0, organ: 0.3, bass: 0.5 });
    this.render();
  },
  close() {
    this.stop(); Voice.stop();
    $('chest').classList.remove('on', 'citymap'); $('ckind').textContent = 'MEMORY CHEST';
    if (Game.state === 'seal') { Game.state = 'play'; Music.normal(); }
    Game.clearInput();
    if (this.first) {
      this.first = false;
      World.setTarget('keepgate', 'small'); SFX.doorOpen(); Game.shake(3);
      if (Game.echoBorn) Game.later(0.6, () => Echo.talk(ECHO.lines.fortWin.concat(ECHO.lines.seal)));
    }
  },
  stop() { for (const k of this.timers) clearTimeout(k); this.timers = []; },
  later(ms, fn) { this.timers.push(setTimeout(fn, ms)); },
  key(e) {
    const c = e.code;
    if (c === 'Escape') { if (this.st.step !== 'climb' || document.querySelector('#chest .copt[disabled]')) this.close(); return; }
    if (c === 'KeyH') { this.showPt = !this.showPt; SFX.ui(); document.querySelectorAll('#chest [data-pt]').forEach(el => { el.textContent = this.showPt ? el.dataset.pt : ''; }); return; }
    UI.menuKey(e);
  },
  pt(text) { return CityMap.pt.call(this, text); },
  btn(label, act, cls = '') { return `<button class="btn ${cls}" data-a="${act}">${label}</button>`; },
  tiers() { const lv = Save.data.heart.seal | 0; return `<div class="c-row">${FORT.seal.tiers.map((c, i) => `<div class="e-tier${i < lv ? ' on' : ''}"><i></i><span class="n">${c.name}</span><span class="d">${c.info}</span></div>`).join('')}</div>`; },
  go(step, extra = {}) { Object.assign(this.st, { step }, extra); this.render(); },
  hl(s) { return s.replace(/\b(can't|can|could)\b/gi, '<b>$1</b>'); },
  render() {
    const st = this.st, body = $('cbody'), S = FORT.seal, lv = Save.data.heart.seal | 0;
    this.stop();
    $('csteps').innerHTML = ['intro', 'learn', 'climb'].map((s, i, a) => { const cur = { online: 'climb', done: 'climb' }[st.step] || st.step, ci = a.indexOf(cur); return `<i class="${i < ci ? 'done' : i === ci ? 'on' : ''}"></i>`; }).join('');
    $('cpower').innerHTML = lv > 0 ? [1, 2, 3, 4].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('') : '';
    $('cpower').style.display = $('cpower').innerHTML ? 'flex' : 'none';
    let h = '';
    if (st.step === 'intro') {
      h = `<div class="c-title chal">${S.tiers[0].name}</div><div class="c-sub">The law is broken. The Heart has a seal now: jump, and jump again.</div>
        ${this.pt('A lei se quebrou. O Coração ganhou um selo: pule, e pule de novo (no ar, aperte o pulo outra vez). Vale do Forte em diante.')}${this.tiers()}
        <div class="c-actions">${this.btn('READ THE NEW LAWS →', 'learn', 'primary')}</div>`;
    } else if (st.step === 'learn') {
      h = `<div class="c-title">THE NEW LAWS</div><div class="c-sub">${S.intro.en}</div>${this.pt(S.intro.pt)}
        <div class="cm-lines">${S.lines.map((l, i) => `<button class="btn cm-line" data-a="line" data-i="${i}">${this.hl(l.en)}${l.fresh ? ' <b class="e-new">NEW</b>' : ''}</button>`).join('')}</div>
        ${this.pt(S.lines.map(l => l.pt).join(' · '))}
        <div class="c-actions">${this.btn('▶ LISTEN', 'hear', 'small')}${this.btn('THE SEAL →', 'online', 'primary')}</div>`;
    } else if (st.step === 'online') {
      h = `<div class="c-title chal">${S.tiers[Math.max(0, lv - 1)].name}</div><div class="c-sub">Climb higher: harder questions, above A1. Every right answer makes the seal stronger. One try each. A wrong answer ends the climb, but you keep your seal.</div>
        ${this.pt('Suba mais: perguntas mais difíceis, acima do A1. Cada acerto deixa o selo mais forte (o 2º pulo mais alto). Uma tentativa por pergunta; errar encerra a escalada, mas o selo fica.')}
        ${this.tiers()}
        <div class="c-actions">${lv < S.tiers.length ? this.btn('CLIMB ↑', 'climb', 'primary') : ''}${this.btn('← READ AGAIN', 'learn', 'small')}${this.btn('CLOSE', 'close', lv >= S.tiers.length ? 'primary' : '')}</div>`;
    } else if (st.step === 'climb') {
      const r = S.climb[st.rung];
      h = `<div class="c-sub">STEP ${st.rung + 1} / ${S.climb.length} · LEVEL ${r.level} · ${S.tiers[Math.max(0, lv - 1)].name}</div>
        <div class="c-q">${r.q.replace('___', '<b>___</b>')}</div>
        <div class="c-opts tight">${r.options.map((o, i) => `<button class="btn copt" data-a="rung" data-i="${i}">${o}</button>`).join('')}</div><div class="c-ev" id="cev"></div><div class="c-actions" id="cnext"></div>`;
    } else if (st.step === 'done') {
      const C = S.tiers[lv - 1];
      h = `<div class="c-title chal">${C.name}</div><div class="c-sub">${C.pt}. ${C.info}</div>${this.pt('No ar, aperte o pulo de novo: o pulo duplo vale do Forte em diante.')}
        ${this.tiers()}
        <div class="c-actions">${lv < S.tiers.length ? this.btn('CLIMB AGAIN ↑', 'climb') : ''}${this.btn('CLOSE', 'close', 'primary')}</div>`;
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.a, b)));
    if (st.step === 'learn') this.read();
    if (st.step === 'intro') Voice.say(FORT.warden.scene[1].en, 'story', { cut: true });
    this.later(30, () => { const f = body.querySelector('.btn.primary') || body.querySelector('.copt') || body.querySelector('.btn'); if (f) f.focus({ preventScroll: true }); });
  },
  read() {
    if (!Game.wordsSeen.has('COULD')) { Game.wordsSeen.add('COULD'); Game.learnedOrder.push('COULD'); }
    Game.grimoireWord('COULD', 'THE SEAL OF THE LAW');
    const rows = [...document.querySelectorAll('#chest .cm-line')];
    FORT.seal.lines.forEach((l, i) => this.later(300 + i * 2600, () => { rows.forEach((el, j) => el.classList.toggle('say', j === i)); Voice.say(l.en, 'story', { cut: true }); }));
    this.later(300 + FORT.seal.lines.length * 2600, () => rows.forEach(el => el.classList.remove('say')));
  },
  act(a, el) {
    const st = this.st, S = FORT.seal;
    if (a === 'learn') { SFX.ui(); return this.go('learn'); }
    if (a === 'hear') { this.stop(); return this.read(); }
    if (a === 'line') { const l = S.lines[+el.dataset.i]; this.stop(); Voice.say(l.en, 'story', { cut: true }); document.querySelectorAll('#chest .cm-line').forEach(x => x.classList.toggle('say', x === el)); return; }
    if (a === 'online') { SFX.ui(); return this.go('online'); }
    if (a === 'climb') { SFX.ui(); return this.go('climb', { rung: 0, fell: false }); }
    if (a === 'rung') return this.answer(+el.dataset.i, el);
    if (a === 'up') { SFX.ui(); return st.rung < S.climb.length - 1 && !st.fell && (Save.data.heart.seal | 0) < S.tiers.length ? this.go('climb', { rung: st.rung + 1 }) : this.go('done'); }
    if (a === 'close') { SFX.ui(); return this.close(); }
  },
  answer(i, el) {
    const st = this.st, S = FORT.seal, r = S.climb[st.rung], opts = [...document.querySelectorAll('#chest .copt')];
    if (opts.some(b => b.disabled)) return;
    opts.forEach(b => { b.disabled = true; });
    const right = i === r.answer, H = Save.data.heart;
    opts[r.answer].classList.add('right');
    if (right) {
      H.seal = Math.min(S.tiers.length, (H.seal | 0) + 1); Save.write(); SFX.powerup();
      const C = S.tiers[H.seal - 1];
      $('cev').innerHTML = `<b>${C.name}</b> · ${C.info}<br><span style="color:var(--txt-3)">${r.tip}</span>`;
    } else {
      el.classList.add('wrong'); SFX.wrong(); st.fell = true;
      $('cev').innerHTML = `The climb ends here. The Heart keeps <b>${S.tiers[Math.max(0, H.seal - 1)].name}</b>.<br><span style="color:var(--txt-3)">${r.tip}</span>`;
    }
    this.later(450, () => Voice.say(r.q.includes('___') ? r.q.replace('___', r.options[r.answer]) : r.options[r.answer], 'echo', { cut: true }));
    const last = st.rung >= S.climb.length - 1 || H.seal >= S.tiers.length;
    $('cnext').innerHTML = this.btn(right && !last ? 'NEXT STEP ↑' : 'FINISH →', 'up', 'primary');
    $('cnext').querySelector('button').addEventListener('click', () => this.act('up'));
    this.later(30, () => { const b = $('cnext') && $('cnext').querySelector('button'); if (b) b.focus({ preventScroll: true }); });
  },
};

/* ---------- o PULO DUPLO do selo (do Forte em diante): no ar, o pulo de novo ---------- */
const Seal = {
  ok() {
    return !!(World.level && World.level.seal) && (Save.data.heart.seal | 0) > 0 && !P.usedDouble && !P.onGround && !P.form && !P.held && !P.dead && Fort.jumpK() === 1;
  },
  jump() {
    const lv = Math.min(FORT.seal.tiers.length, Save.data.heart.seal | 0), k = FORT.seal.tiers[lv - 1].k;
    P.vy = -CFG.JUMP_V * k; P.usedDouble = true; P.spinning = false; P.squash = -0.3; P.combo = 0;
    SFX.jump2(); FX.burst(P.cx, P.y + P.h, 22, 'm', 200, { life: 0.5, g: 0 }); FX.burst(P.cx, P.y + P.h, 10, 'w', 120, { life: 0.4, g: 0 });
  },
};
