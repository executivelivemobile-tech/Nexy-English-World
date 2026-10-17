/* ============================== API de teste no console ============================== */
window.NEXY = {
  Game, P, World, Ents, Cam, Flags, Save, CFG,
  setFlag(path, value = true, persist = false) { Flags.set(path, value, persist); return Flags.get(path); },
  teleport(c, r) { P.x = c * TS + TS / 2 - P.w / 2; P.y = (r + 1) * TS - P.h; P.px = P.x; P.py = P.y; P.vx = P.vy = 0; Cam.snap(); },
  give(...words) { for (const w of words) if (WORDS[w] && Game.bar.length < Game.barMax()) Game.bar.push(w); UI.renderBar(); },
};

Game.boot();
TestMode.init();
</script>
</body>
</html>
