'use strict';
// Boot: start on the title screen of world 1.
WORLD = WORLDS[0];
resetGame();
// debug: index.html#x=120 starts at column 120 · #w=2 picks world 2 (combine: #w=2&x=80) · #win jumps to the ending
(function () {
  const h = location.hash, w = h.match(/w=(\d+)/), m = h.match(/x=(\d+)/);
  if (w) { WORLD = WORLDS[(+w[1] - 1) || 0]; resetGame(); }
  if (w || m || /win/.test(h)) {
    state = 'play';
    const col = m ? +m[1] : (/win/.test(h) ? WORLD.goalCol - 2 : (WORLD.startCol || 2));
    if (/win/.test(h)) { boss.dead = true; boss.active = false; for (let y = 0; y < ROWS; y++) { if (T(WORLD.arena.L, y) === 6) setT(WORLD.arena.L, y, 0); if (T(WORLD.arena.R, y) === 6) setT(WORLD.arena.R, y, 0); } keys.ArrowRight = true; }
    P.x = col * TS; P.y = groundTop(col) - P.h; camX = clamp(P.x - W * 0.4, 0, LW * TS - W);
  }
})();
requestAnimationFrame(frame);
