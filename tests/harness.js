// Abre o jogo no Chromium (Playwright) com o laço em tempo real desligado, para a simulação andar
// quadro a quadro de forma determinística. Expõe window.H com atalhos de teste.
// A tela inicial leva ao mapa; o harness entra direto na fase pedida (level, padrão '1-1').
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');

// echo: true (padrão) = o Echo já nasceu (os testes antigos da 1-1 continuam valendo); false = a 1-1 começa sem ele.
async function openGame(browser, { hash = '', realtime = false, context = {}, level = '1-1', echo = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...context });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  await page.goto(GAME + hash);
  await page.waitForTimeout(400);
  if (!realtime) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await page.evaluate(([level, echo]) => {
      const G = NEXY.Game;
      G.noIntro = true; G.enterLevel(level);
      if (echo) { G.echoBorn = true; Echo.hidden = false; }
      G.frame = function () { this.render(1); UI.frame(); };
      window.H = {
        set(keys) { for (const k in Input.held) Input.held[k] = false; Input.touchHeld = {}; for (const k of keys) Input.held[k] = true; },
        press(k) { Input.edge(k); },
        step(n = 1) { for (let i = 0; i < n; i++) G.step(1 / 60); },
        tp(c, r, inv = 0) { const P = NEXY.P; P.dead = false; P.pitDeath = false; P.invuln = inv; NEXY.teleport(c, r); H.step(2); },
        noEnemies() { NEXY.Ents.list = NEXY.Ents.list.filter(e => !e.enemy || e.persist); NEXY.World.spawns.forEach(s => { s.state = 'consumed'; }); },
        wakeSpawns() { NEXY.Ents.list = NEXY.Ents.list.filter(e => !e.enemy || e.persist); NEXY.World.spawns.forEach(s => { s.state = 'waiting'; s.wasVis = false; s.timer = 0; }); },
        block(c, r) { const b = NEXY.World.blockAt(c, r); return b && b.state; },
        wait(ms) { return new Promise(r => setTimeout(r, ms)); },
      };
    }, [level, echo]);
  }
  return { ctx, page, errors };
}

module.exports = { chromium, openGame };
