'use strict';
// =====================================================================
//  WORLD 2 — FROSTY ISLE
//  Snowy night island of Hammer Duck's little brother Drake.
//  New here: slippery ice + belly slide, sinking ice floes, cracking ice,
//  steam geysers, wind gusts, falling icicles, snowball throwers.
//  Boss: the BIGGER BUG, the Big Bug's big brother. He flies, drops snow
//  bombs and dives; only a thrown hammer (or a batted snowball) hurts him
//  in the air, but when his head gets stuck in the snow, smash away!
// =====================================================================
(function () {
const F_ARENA_L = 186, F_ARENA_R = 212, F_GOAL = 218, F_WIDTH = 236;
const WATER_Y = ROWS * TS - 40;
const CRACK_TIME = 0.55;

// ---------------------------------------------------------------- sounds
Object.assign(SFX, {
  shatter: () => { noise(0.25, 0.28, 4200); if (actx) [1800, 2500, 3200].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, 0.9, actx.currentTime + i * 0.04)); },
  crackle: () => noise(0.1, 0.22, 3200),
  poof: () => noise(0.15, 0.22, 1500),
  bat: () => { tone(760, 0.08, 'square', 0.12, 1.7); noise(0.08, 0.25, 2600); },
  boing: () => tone(240, 0.28, 'triangle', 0.2, 2.4),
  geyser: () => { noise(1.0, 0.22, 650); tone(120, 0.6, 'triangle', 0.06, 1.8); },
  wind: () => { noise(1.8, 0.14, 380); noise(1.4, 0.06, 1200); },
  coo: () => { if (!actx) return; tone(520, 0.12, 'sine', 0.13, 0.85); tone(470, 0.18, 'sine', 0.13, 0.85, actx.currentTime + 0.16); },
  plop: () => { noise(0.25, 0.3, 500); tone(160, 0.2, 'triangle', 0.15, 0.5); },
});

// ---------------------------------------------------------------- music
// main: twinkly D-major waltz (3/4) · boss: galloping 6/8 in E minor
// hero: sleigh-bell march after the boss · calm: music-box lullaby
const WALTZ_MEL = [74, 0, 78, 0, 81, 0, 81, 0, 79, 78, 76, 0, 78, 0, 74, 0, 71, 0, 74, 0, 71, 0, 67, 0,
  69, 0, 74, 0, 78, 81, 83, 0, 81, 79, 78, 0, 76, 0, 78, 0, 79, 76, 74, 0, 0, 0, 0, 0];
const WALTZ_CH = [[50, 0], [45, 0], [47, 1], [43, 0], [50, 0], [43, 0], [45, 0], [50, 0]];
const GALLOP_MEL = [76, 0, 79, 0, 83, 0, 82, 0, 83, 0, 79, 0, 84, 0, 83, 81, 79, 0, 81, 0, 78, 0, 74, 0,
  76, 0, 79, 83, 88, 0, 86, 0, 83, 0, 79, 0, 81, 0, 79, 0, 76, 0, 75, 0, 78, 0, 71, 0];
const GALLOP_ROOTS = [40, 40, 36, 38, 40, 40, 36, 35];
const JINGLE_MEL = [69, 0, 73, 76, 81, 0, 80, 81, 78, 0, 74, 0, 78, 81, 86, 0, 83, 0, 80, 0, 76, 0, 80, 83, 81, 0, 0, 0, 76, 78, 80, 81,
  78, 0, 81, 0, 85, 0, 83, 81, 78, 0, 74, 78, 81, 0, 78, 0, 76, 0, 80, 83, 88, 0, 86, 83, 81, 0, 76, 0, 81, 0, 0, 0];
const JINGLE_ROOTS = [45, 50, 40, 45, 42, 50, 40, 45];
const BOX_MEL = [[0, 75, 4], [4, 79, 4], [8, 84, 6], [14, 82, 2], [16, 80, 4], [20, 79, 4], [24, 77, 8],
  [32, 75, 4], [36, 79, 4], [40, 84, 4], [44, 87, 4], [48, 86, 4], [52, 84, 2], [54, 82, 2], [56, 87, 8]];
const BOX_CH = [[51, 0], [48, 1], [56, 0], [58, 0], [51, 0], [48, 1], [56, 0], [51, 0]];
const FROST_TRACKS = {
  main: { bpm: 150, play(s, t, b) {
    const i = s % 48, bar = Math.floor(i / 6), pos = i % 6, [r, mi] = WALTZ_CH[bar];
    if (pos === 0) tone(midi(r), b * 2.2, 'triangle', 0.17, 0, t, musicGain);
    if (pos === 2 || pos === 4) { [0, mi ? 3 : 4, 7].forEach(k => tone(midi(r + 24 + k), b * 0.9, 'sine', 0.03, 0, t, musicGain)); noise(0.05, 0.03, 9000, t, musicGain); }
    const m = WALTZ_MEL[i];
    if (m) { tone(midi(m), b * 3, 'sine', 0.075, 0, t, musicGain, 0.005); tone(midi(m + 12), b * 1.4, 'triangle', 0.02, 0, t, musicGain); }
  } },
  boss: { bpm: 176, play(s, t, b) {
    const i = s % 48, bar = Math.floor(i / 6), pos = i % 6, r = GALLOP_ROOTS[bar];
    if (pos === 0 || pos === 3) tone(midi(r), b * 1.4, 'sawtooth', 0.09, 0, t, musicGain);
    if (pos === 2 || pos === 5) tone(midi(r + 12), b * 0.8, 'sawtooth', 0.06, 0, t, musicGain);
    tone(midi(r + 24 + (pos % 2 ? 7 : 0)), b * 0.5, 'sawtooth', 0.018, 0, t, musicGain); // tremolo strings
    if (GALLOP_MEL[i]) tone(midi(GALLOP_MEL[i]), b * 1.6, 'square', 0.045, 0, t, musicGain);
    if (pos === 0) tone(90, 0.3, 'sine', 0.42, 0.4, t, musicGain); // timpani
    if (pos === 3) { noise(0.12, 0.25, 1700, t, musicGain); tone(70, 0.18, 'sine', 0.25, 0.5, t, musicGain); }
    if (bar === 7 && pos >= 3) tone(120 - pos * 10, 0.15, 'sine', 0.3, 0.6, t, musicGain);
  } },
  hero: { bpm: 132, play(s, t, b) {
    const i = s % 64, bar = Math.floor(i / 8), pos = i % 8, r = JINGLE_ROOTS[bar];
    if (JINGLE_MEL[i]) { tone(midi(JINGLE_MEL[i]), b * 0.95, 'square', 0.04, 0, t, musicGain); tone(midi(JINGLE_MEL[i] + 12), b * 0.6, 'sine', 0.03, 0, t, musicGain); }
    if (pos % 2 === 0) tone(midi(pos % 4 === 0 ? r : r + 7), b * 1.5, 'triangle', 0.16, 0, t, musicGain);
    noise(0.06, pos % 2 ? 0.05 : 0.09, 9500, t, musicGain); // sleigh bells
    if (pos === 0 || pos === 4) tone(130, 0.12, 'sine', 0.28, 0.35, t, musicGain);
    if (pos === 2 || pos === 6) noise(0.09, 0.14, 2000, t, musicGain);
  } },
  calm: { bpm: 66, play(s, t, b) {
    const i = s % 64, bar = Math.floor(i / 8), pos = i % 8, [r, mi] = BOX_CH[bar], th = mi ? 3 : 4;
    const arp = [0, 7, 12, 12 + th, 19, 12 + th, 12, 7];
    tone(midi(r + 12 + arp[pos]), b * 2.5, 'sine', 0.045, 0, t, musicGain, 0.004);
    if (pos === 0) tone(midi(r - 12), b * 8, 'sine', 0.1, 0, t, musicGain, 0.2);
    for (const [st, n, len] of BOX_MEL) if (st === i) tone(midi(n), b * len, 'triangle', 0.06, 0, t, musicGain, 0.05);
  } },
};

// ---------------------------------------------------------------- level
function buildFrost(B) {
  const { ground, block, seeds, seedArc, seedsV, bug, cp, sign } = B;
  const iceTop = (a, b) => { for (let x = a; x <= b; x++) setT(x, ROWS - 2, 8); };
  const hole = (a, b) => { for (let x = a; x <= b; x++) for (let y = 0; y < ROWS; y++) setT(x, y, 0); };
  const crackRow = (a, b, row) => { for (let x = a; x <= b; x++) setT(x, row, 9); };
  Object.assign(L, { geysers: [], winds: [], icicles: [], cracks: {}, shots: [] });
  const floe = (col, w) => L.movers.push({ ice: true, x: col * TS, y: WATER_Y - 16, baseY: WATER_Y - 16, w: w * TS, h: 20, sink: 0, sit: 0, t: Math.random() * 6, dx: 0, dy: 0, update: updateFloe, draw: drawFloe });
  const geyser = (col, phase) => L.geysers.push({ x: col * TS + TS / 2, y: groundTop(col), phase, period: 2.8, was: false });
  const wind = (a, b, phase) => L.winds.push({ x0: a * TS, x1: (b + 1) * TS, phase, period: 4, on: 2.2, was: false });
  const icicle = (col, row) => L.icicles.push({ x: col * TS + TS / 2, y0: row * TS, y: row * TS, vy: 0, st: 'hang', t: 0, grow: 1 });

  // ---- terrain
  ground(0, 22, 2, 7); iceTop(11, 21);                              // 1: landing beach, first ice
  ground(23, 52, 2, 7); iceTop(23, 52); hole(30, 31); hole(38, 40); hole(46, 47); // 2: frozen lake with holes
  [[54, 3], [59, 2], [63, 3], [68, 2], [72, 3], [77, 2]].forEach(([c, w]) => floe(c, w)); // 3: sinking floes
  ground(81, 108, 2, 7);                                            // 4: geyser valley
  block(86, 4, 2, 6, 10); block(94, 3, 3, 7, 10); block(101, 7, 2, 3, 10);
  geyser(84, 0); geyser(92, 1.4);
  ground(109, 130, 2, 7);                                           // 5: icicle canyon
  block(111, 4, 8, 1, 10); block(121, 4, 9, 1, 10);
  for (const c of [112, 114, 116, 118, 122, 124, 127, 129]) icicle(c, 5);
  crackRow(131, 136, 10);                                           //    cracking ice bridge
  ground(137, 158, 2, 7); iceTop(148, 156);                         // 6: blizzard pass
  crackRow(160, 161, 9); crackRow(163, 164, 9); crackRow(166, 166, 9);
  ground(168, 185, 2, 7);
  wind(143, 157, 0); wind(159, 176, 2);
  ground(186, F_WIDTH - 1, 2, 7); iceTop(187, 211);                 // 7: icy boss arena + Drake's igloo
  B.gate(F_ARENA_R);

  // ---- snowflakes (94 placed + 6 from the boss = 100)
  seeds(6, 8, 3); seeds(17, 8, 4);
  seedArc(29, 8, 4); seedArc(37, 8, 5); seedArc(45, 8, 4); seeds(33, 9, 3);
  for (const c of [55, 59, 64, 68, 73, 77]) seeds(c, 10, 2);
  seedsV(83.5, 2, 4); seedsV(91.5, 1, 4); seeds(86, 3, 2); seeds(94, 2, 3); seeds(103, 8, 3);
  seeds(112, 9, 6); seeds(122, 9, 6); seedArc(131, 8, 6);
  seeds(144, 9, 4); seeds(150, 9, 5); seeds(160, 8, 2); seeds(163, 8, 2); seeds(166, 8, 1); seeds(170, 9, 4);
  seeds(179, 8, 3); seeds(194, 9, 2); seeds(204, 9, 2);
  L.totalSeeds += 6; // dropped by the Bigger Bug

  // ---- bugs
  bug('flea', 18);
  bug('roly', 34); bug('flea', 42); bug('roly', 50);
  bug('moth', 61, 4); bug('moth', 74, 3);
  bug('flea', 90); bug('flea', 98); bug('roly', 105);
  bug('spider', 115, 5); bug('spider', 126, 5); bug('flea', 120);
  bug('roly', 146); bug('moth', 152, 4); bug('flea', 156); bug('moth', 171, 3); bug('roly', 175); bug('flea', 182);
  bug('bigger', 205);

  // ---- checkpoints & signs
  sign(4, 'Brrr! ICE is slippery!'); sign(12, 'Run + ↓ on ice = BELLY SLIDE!', 'Run + ▼ on ice = BELLY SLIDE!');
  sign(51, 'Ice floes SINK! Keep hopping!');
  sign(82, 'Ride the GEYSER steam up!'); cp(89);
  cp(105); sign(110, 'Look out for ICICLES!');
  sign(130, "Cracking ice! Don't stop!");
  cp(139); sign(142, 'WIND! Duck (↓) to brace!', 'WIND! Duck (▼) to brace!');
  cp(178); sign(183, 'BIGGER BUG ahead! THROW the hammer at him!');
  sign(215, "Drake's igloo →");

  // ---- Drake's family (caged by the Bigger Bug until you arrive)
  const gy = groundTop(226);
  L.family = { y: gy, x: 228 * TS, drake: 226.7 * TS, daisy: 227.7 * TS, cageX0: 226.1 * TS, cageX1: 230.3 * TS, iglooX: 232.6 * TS,
    kids: [228.5, 229.1, 229.7].map((c, i) => ({ x: c * TS, ph: i * 1.1 })) };

  // ---- decorations
  const r = rng(23); let lastPine = -10;
  for (let x = 1; x < F_WIDTH - 1; x++) {
    const gyr = groundTop(x) / TS; if (gyr >= ROWS || T(x, gyr) !== 7) continue;
    if (x >= F_ARENA_L && x <= F_ARENA_R) continue;
    if (x > 223) continue;
    if (L.signs.some(s => Math.abs(s.x - x * TS) < 70)) continue;
    if (L.geysers.some(g => Math.abs(g.x - x * TS) < 70)) continue;
    const v = r();
    if (v < 0.14 && x - lastPine > 3 && T(x, gyr - 1) === 0 && T(x, gyr - 3) === 0) { L.decor.push({ type: 'pine', x: x * TS + 24, y: gyr * TS, h: 110 + r() * 70, ph: r() * 6 }); lastPine = x; }
    else if (v < 0.19) L.decor.push({ type: 'snowman', x: x * TS + 24, y: gyr * TS, s: 0.8 + r() * 0.3, ph: r() * 6 });
    else if (v < 0.34) L.decor.push({ type: 'crystal', x: x * TS + r() * 30 + 8, y: gyr * TS, c: Math.floor(r() * 3), s: 0.7 + r() * 0.6 });
    else if (v < 0.5) L.decor.push({ type: 'mound', x: x * TS + r() * 30 + 8, y: gyr * TS, w: 14 + r() * 16 });
  }
  L.decor.sort((a, b) => (a.type === 'pine' ? 0 : 1) - (b.type === 'pine' ? 0 : 1));
}

// ---------------------------------------------------------------- floes, geysers, wind, icicles, cracks, snowballs
function updateFloe(m, dt) {
  m.t += dt;
  const stood = P.riding === m && !P.dead;
  if (stood) { m.sit += dt; if (m.sit > 0.25) m.sink += 30 * dt; } else { m.sit = 0; m.sink = Math.max(0, m.sink - 45 * dt); }
  m.sink = Math.min(m.sink, 170);
  const ny = m.baseY + m.sink + Math.sin(m.t * 2) * 2;
  m.dx = 0; m.dy = ny - m.y; m.y = ny;
  if (stood && m.sink > 4 && Math.random() < dt * 10) addPart({ type: 'spark', x: m.x + rand(0, m.w), y: WATER_Y + 4, vx: 0, vy: rand(-60, -20), life: .5, size: rand(2, 4), color: '#d9f4ff' });
}
function frostUpdate(dt) {
  const pcx = P.x + P.w / 2, near = x => Math.abs(x - camX - W / 2) < W;
  // geysers: blast you up when they erupt
  for (const g of L.geysers) {
    const ph = (gT + g.phase) % g.period, erupt = ph < 1.0;
    g.erupt = erupt; g.warn = ph > g.period - 0.7; g.ph = ph;
    if (erupt && !g.was && near(g.x)) SFX.geyser();
    g.was = erupt;
    if (erupt && Math.random() < dt * 50) addPart({ type: 'dust', x: g.x + rand(-16, 16), y: g.y - rand(0, 340 * Math.min(1, ph * 4)), vx: rand(-30, 30), vy: rand(-240, -120), drag: 1.5, life: .55, size: rand(10, 18), color: 'rgba(255,255,255,0.85)' });
    if (g.warn && Math.random() < dt * 14) addPart({ type: 'spark', x: g.x + rand(-12, 12), y: g.y - 4, vx: rand(-20, 20), vy: rand(-90, -40), life: .4, size: rand(2.5, 4), color: '#e8f7ff' });
    if (erupt && !P.dead && Math.abs(pcx - g.x) < 30 && P.y + P.h > g.y - 380 && P.y + P.h <= g.y + 4 && P.vy > -900) {
      P.vy = -1320; P.springBoost = true; P.pound = false; P.onGround = false; squash(0.7, 1.3); SFX.spring();
    }
  }
  // wind gusts push you back (crouching braces you)
  for (const w of L.winds) {
    const ph = (gT + w.phase) % w.period, on = ph < w.on, visible = w.x1 > camX && w.x0 < camX + W;
    if (on && !w.was && visible) SFX.wind();
    w.was = on; w.active = on;
    const rate = on ? 45 : (ph > w.period - 0.5 ? 6 : 0);
    if (visible && Math.random() < dt * rate) {
      const x0 = Math.max(w.x0, camX), x1 = Math.min(w.x1, camX + W);
      addPart({ type: 'streak', x: rand(x0, x1), y: rand(camY + 70, camY + H - 40), vx: -rand(650, 950), vy: rand(-10, 40), life: rand(.35, .6), size: rand(1.5, 3), color: 'rgba(255,255,255,0.75)' });
    }
    if (on && !P.dead && state === 'play' && pcx > w.x0 && pcx < w.x1) P.extVx = (P.extVx || 0) - (P.crouch ? 70 : 200);
  }
  // icicles: shake, drop, shatter, grow back
  for (const ic of L.icicles) {
    if (ic.st === 'gone') { ic.t += dt; if (ic.t > 4) { ic.st = 'hang'; ic.y = ic.y0; ic.grow = 0; } continue; }
    ic.grow = Math.min(1, ic.grow + dt * 1.5);
    if (ic.st === 'hang') { if (ic.grow >= 1 && !P.dead && Math.abs(pcx - ic.x) < 58 && P.y > ic.y0) { ic.st = 'shake'; ic.t = 0; SFX.crackle(); } }
    else if (ic.st === 'shake') { ic.t += dt; if (ic.t > 0.35) { ic.st = 'fall'; ic.vy = 0; } }
    else if (ic.st === 'fall') {
      ic.vy += G * dt; ic.y += ic.vy * dt;
      const tip = ic.y + 38;
      if (!P.dead && aabb({ x: ic.x - 9, y: ic.y + 6, w: 18, h: 32 }, { x: P.x + 4, y: P.y + 4, w: P.w - 8, h: P.h - 6 })) { hurtPlayer(ic.x); shatterIcicle(ic); }
      else if (SOLID(T(Math.floor(ic.x / TS), Math.floor(tip / TS))) || tip > WATER_Y) shatterIcicle(ic);
    }
  }
  // cracking ice: breaks a moment after you step on it, freezes back later
  if (P.onGround && !P.dead) {
    const ty = Math.floor((P.y + P.h + 1) / TS);
    for (let tx = Math.floor(P.x / TS); tx <= Math.floor((P.x + P.w - 0.01) / TS); tx++) {
      const k = tx + ',' + ty;
      if (T(tx, ty) === 9 && !L.cracks[k]) { L.cracks[k] = { x: tx, y: ty, t: 0, broken: false, rt: 0 }; SFX.crackle(); }
    }
  }
  for (const k in L.cracks) {
    const c = L.cracks[k];
    if (!c.broken) {
      c.t += dt;
      if (c.t > CRACK_TIME) { c.broken = true; setT(c.x, c.y, 0); SFX.shatter(); shards(c.x * TS + TS / 2, c.y * TS + TS / 2, 10); }
    } else {
      c.rt += dt;
      if (c.rt > 3.5 && !aabb({ x: c.x * TS, y: c.y * TS, w: TS, h: TS }, P)) { setT(c.x, c.y, 9); delete L.cracks[k]; }
    }
  }
  // snowballs & snow bombs
  for (let i = L.shots.length - 1; i >= 0; i--) {
    const s = L.shots[i];
    if (!s.gone) {
      s.t += dt; s.rot += dt * 8;
      const o = s.reflected && s.owner && !s.owner.dead ? s.owner : null;
      if (o) { // a batted snowball homes in on whoever threw it: RETURN TO SENDER!
        const dx = o.x + o.w / 2 - s.x, dy = o.y + o.h / 2 - s.y, d = Math.hypot(dx, dy) || 1;
        s.vx = dx / d * 760; s.vy = dy / d * 760;
      } else s.vy += s.g * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const r = { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
      if (s.reflected) {
        for (const e of L.enemies) if (!e.dead && e.awake !== false && aabb(r, e) && hitEnemy(e, Math.sign(s.vx) || 1, 'shot')) { s.gone = true; break; }
      } else if (!P.dead && aabb(r, { x: P.x + 5, y: P.y + 8, w: P.w - 10, h: P.h - 10 })) { hurtPlayer(s.x); s.gone = true; }
      if (!s.gone && (SOLID(T(Math.floor(s.x / TS), Math.floor((s.y + s.r * 0.5) / TS))) || s.y > WATER_Y + 10 || s.t > 6)) {
        s.gone = true;
        if (s.bomb) { shake = Math.max(shake, 7); dust(s.x, s.y + s.r, 12, 2); if (!P.dead && Math.abs(pcx - s.x) < 58 && Math.abs(P.y + P.h - (s.y + s.r)) < 60) hurtPlayer(s.x); }
      }
      if (s.gone) { SFX.poof(); shards(s.x, s.y, s.bomb ? 12 : 6, '#ffffff'); }
    }
    if (s.gone) L.shots.splice(i, 1);
  }
}
function shards(x, y, n, color) {
  for (let i = 0; i < n; i++) addPart({ type: 'chip', x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-240, 240), vy: rand(-420, -120), g: 1400, life: rand(.5, .9), size: rand(5, 10), vr: rand(-12, 12), color: color || ['#bfefff', '#ffffff', '#8fd8ff'][i % 3] });
}
function shatterIcicle(ic) { ic.st = 'gone'; ic.t = 0; SFX.shatter(); shards(ic.x, ic.y + 20, 8); }
// the hammer smashes icicles and snowballs; a SWING bats snowballs back where they came from
function frostHammerArea(r, src) {
  let n = 0;
  for (const s of L.shots) {
    if (s.gone || s.reflected || !aabb(r, { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 })) continue; // already batted: leave it flying
    if (src === 'swing' && !s.reflected) {
      const o = s.owner && !s.owner.dead ? s.owner : null, Tt = 0.45;
      if (o) { const tx = o.x + o.w / 2, ty = o.y + o.h / 2; s.vx = (tx - s.x) / Tt; s.vy = (ty - s.y) / Tt - 0.5 * s.g * Tt; }
      else { s.vx = P.face * 700; s.vy = -380; }
      s.reflected = true; s.t = 0; SFX.bat(); popup(s.x, s.y - 20, 'BATTED!', '#9fe7ff', 24, true);
    } else { s.gone = true; SFX.poof(); shards(s.x, s.y, 6, '#ffffff'); }
    n++;
  }
  for (const ic of L.icicles) {
    if (ic.st === 'gone' || (ic.st === 'hang' && ic.grow < 1)) continue;
    if (aabb(r, { x: ic.x - 10, y: ic.y, w: 20, h: 38 })) { shatterIcicle(ic); n++; }
  }
  return n;
}
function throwSnowball(e) {
  const sx = e.x + e.w / 2, sy = e.y + e.h, tx = P.x + P.w / 2 + P.vx * 0.35, ty = P.y + P.h * 0.5, Tt = 1.0, g = 900;
  L.shots.push({ x: sx, y: sy, vx: (tx - sx) / Tt, vy: (ty - sy) / Tt - 0.5 * g * Tt, g, r: 11, owner: e, t: 0, rot: 0 });
  tone(420, 0.1, 'triangle', 0.06, 0.6);
}

// ---------------------------------------------------------------- bugs
function fleaUpdate(e, dt) {
  e.vy = Math.min(e.vy + G * dt, MAXFALL);
  e.squish = Math.max(0, (e.squish || 0) - dt);
  if (e.onGround) {
    e.vx *= Math.pow(0.002, dt); e.cd -= dt;
    if (e.cd <= 0) {
      const dx = P.x + P.w / 2 - (e.x + e.w / 2), close = Math.abs(dx) < 520 && !P.dead;
      e.dir = close ? Math.sign(dx) || 1 : -e.dir;
      e.vx = close ? e.dir * rand(150, 230) : 0; e.vy = -rand(close ? 560 : 380, close ? 720 : 480);
      const land = e.x + e.w / 2 + e.vx * (2 * -e.vy / G); // never hop into the water: if it's not safe, hop on the spot
      if (e.vx && !(groundAt(land, e.y + e.h, 2) && groundAt(land + e.dir * 14, e.y + e.h, 2))) e.vx = 0;
      e.cd = rand(0.8, 1.5); e.squish = 0.15;
    }
  }
  moveBody(e, dt);
  if (e.hitL || e.hitR) e.vx = -e.vx * 0.5;
}
function spiderUpdate(e, dt) {
  const px = P.x + P.w / 2, ex = e.x + e.w / 2, lowY = P.lastGroundY - 58;
  e.cd -= dt; e.dir = px < ex ? -1 : 1;
  if (e.st === 'up') { e.y = Math.max(e.anchorY + 6, e.y - 160 * dt); if (e.cd <= 0 && Math.abs(px - ex) < 100 && !P.dead && lowY > e.anchorY) { e.st = 'down'; tone(880, 0.25, 'sine', 0.05, 0.4); } }
  else if (e.st === 'down') { e.y += 560 * dt; if (e.y >= lowY) { e.y = lowY; e.st = 'low'; e.lt = 0; } }
  else if (e.st === 'low') { e.lt += dt; e.y = lowY + Math.sin(e.lt * 12) * 2; if (e.lt > 1.1) e.st = 'climb'; }
  else if (e.st === 'climb') { e.y -= 170 * dt; if (e.y <= e.anchorY + 6) { e.y = e.anchorY + 6; e.st = 'up'; e.cd = 1.0; } }
}
function mothUpdate(e, dt) {
  const px = P.x + P.w / 2, inRange = !P.dead && Math.abs(px - (e.ox + e.w / 2)) < 520;
  let tx = e.ox, ty = e.oy;
  if (inRange) tx = clamp(px + (e.x + e.w / 2 < px ? -170 : 170) - e.w / 2, e.ox - 260, e.ox + 260);
  const sp = 120 * dt;
  e.hx += clamp(tx - e.hx, -sp, sp); e.hy += clamp(ty - e.hy, -sp, sp);
  e.x = e.hx + Math.sin(e.t * 1.7) * 24; e.y = e.hy + Math.sin(e.t * 3.1) * 14;
  e.dir = px < e.x + e.w / 2 ? -1 : 1;
  e.cd -= dt; e.throwA = Math.max(0, (e.throwA || 0) - dt);
  if (inRange && e.cd <= 0) { e.cd = rand(2.3, 3.2); e.throwA = 0.3; throwSnowball(e); }
}
function rolyUpdate(e, dt) {
  const px = P.x + P.w / 2, ex = e.x + e.w / 2;
  e.st_t += dt;
  if (e.st === 'walk') {
    e.vx = e.dir * 40;
    if (!P.dead && Math.abs(px - ex) < 240 && Math.abs(P.lastGroundY - (e.y + e.h)) < 40) { e.st = 'curl'; e.st_t = 0; e.vx = 0; }
  } else if (e.st === 'curl') { e.vx = 0; if (e.st_t > 0.4) { e.st = 'roll'; e.rollT = 2.2; e.dir = px < ex ? -1 : 1; tone(200, 0.3, 'triangle', 0.1, 2); } }
  else if (e.st === 'roll') { e.vx = e.dir * 400; e.rollT -= dt; if (e.rollT <= 0) { e.st = 'dizzy'; e.st_t = 0; } }
  else if (e.st === 'dizzy') { e.vx = 0; if (e.st_t > 1.0) e.st = 'walk'; }
  if (e.st === 'roll') e.spin = (e.spin || 0) + e.dir * dt * 14;
  e.vy = Math.min(e.vy + G * dt, MAXFALL);
  moveBody(e, dt);
  if (e.hitL) e.dir = 1; else if (e.hitR) e.dir = -1;
  else if (e.onGround && !groundAt(e.dir > 0 ? e.x + e.w + 2 : e.x - 2, e.y + e.h)) { // bounce back at the edge
    e.dir *= -1; e.x += e.dir * 3;
    if (e.st === 'roll') { SFX.boing(); dust(e.x + e.w / 2, e.y + e.h, 4, 0.6); }
  }
}

// ---- the BIGGER BUG
function updateBigger(b, dt) {
  b.t += dt; b.inv -= dt; b.st_t = (b.st_t || 0) + dt;
  const gy = groundTop(Math.floor((F_ARENA_L + F_ARENA_R) / 2)), HOVER_Y = gy - 270, angry = b.hp <= 5;
  const px = P.x + P.w / 2, bx = b.x + b.w / 2, minX = (F_ARENA_L + 1) * TS, maxX = F_ARENA_R * TS - b.w;
  const set = s => { b.state = s; b.st_t = 0; if (s === 'aim') { popup(b.x + b.w / 2, b.y - 20, '!', '#ff4d4d', 40, false); tone(330, 0.4, 'sawtooth', 0.08, 2); } };
  if (!b.active) {
    if (!b.dead) bossSnore(b, dt);
    if (shouldWakeBoss(b)) { wakeBoss(b, 'THE BIGGER BUG WAKES UP!'); b.fromY = b.y; b.didDouble = false; set('rise'); }
    return;
  }
  if (b.state !== 'dive' && b.state !== 'stuck') b.dir = px < bx ? -1 : 1;
  if (b.state === 'rise') {
    const u = Math.min(1, b.st_t / 0.9); b.y = lerp(b.fromY, HOVER_Y, easeOut(u));
    if (u >= 1) { b.bombT = 0.7; set(b.again ? 'aim' : 'hover'); b.again = false; }
  } else if (b.state === 'hover') {
    const tx = clamp(px - b.w / 2, minX, maxX), sp = (angry ? 240 : 170) * dt;
    b.x += clamp(tx - b.x, -sp, sp); b.y = HOVER_Y + Math.sin(b.t * 3) * 14;
    b.bombT -= dt;
    if (b.bombT <= 0) { b.bombT = angry ? 0.75 : 1.2; L.shots.push({ x: b.x + b.w / 2, y: b.y + b.h - 10, vx: 0, vy: 60, g: 1300, r: 15, owner: b, bomb: true, t: 0, rot: 0 }); tone(220, 0.2, 'triangle', 0.08, 0.6); }
    if (b.st_t > (angry ? 2.6 : 3.6)) set('aim');
  } else if (b.state === 'aim') {
    b.x += Math.sin(b.st_t * 60) * 2;
    if (b.st_t > 0.6) { b.tx = clamp(px - b.w / 2, minX, maxX); b.ty = gy - b.h; b.dir = b.tx + b.w / 2 < bx ? -1 : 1; set('dive'); SFX.whoosh(); }
  } else if (b.state === 'dive') {
    const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy), st = 820 * dt;
    if (d <= st) {
      b.x = b.tx; b.y = b.ty; set('stuck'); shake = 18; SFX.slam(); dust(b.x + b.w / 2, gy, 20, 2.5);
      popup(b.x + b.w / 2, b.y - 30, 'STUCK! SMASH HIM!', '#9fe7ff', 30, false);
      if (angry && L.enemies.filter(m => m.minion && !m.dead).length < 2) {
        const m = { type: 'flea', w: 30, h: 26, hp: 1, vx: 0, vy: 0, dir: -1, t: 0, dead: false, deadT: 0, inv: 0, kb: 0, awake: true, minion: true, cd: 0.6 };
        m.x = rand(F_ARENA_L + 2, F_ARENA_R - 3) * TS; m.y = -40; L.enemies.push(m); L.totalBugs++;
      }
    } else { b.x += dx / d * st; b.y += dy / d * st; }
  } else if (b.state === 'stuck') {
    b.y = gy - b.h;
    if (b.st_t > (angry ? 1.8 : 2.5)) { b.fromY = b.y; b.again = angry && !b.didDouble; b.didDouble = b.again; set('rise'); SFX.whoosh(); }
  }
}

// ---------------------------------------------------------------- drawing: bugs
function bugFade(e) { if (e.dead) ctx.globalAlpha = clamp(1 - (e.deadT - 0.35) / 0.45, 0, 1); }
function drawFlea(e) {
  const cx = e.x + e.w / 2, by = e.y + e.h, sq = (e.squish || 0) > 0 ? 0.75 : 1, air = !e.onGround && !e.dead;
  ctx.save(); ctx.translate(cx, by); bugFade(e);
  if (e.dead) ctx.scale(1.3, 0.35);
  ctx.scale(e.dir, sq);
  const flash = e.inv > 0 && Math.floor(e.inv * 16) % 2 === 0;
  ctx.strokeStyle = '#2b4a8a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  const kick = air ? 8 : 0;
  ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-14, -16 + kick); ctx.lineTo(-12, 0 + kick * 0.3); ctx.moveTo(4, -8); ctx.lineTo(-2, -15 + kick); ctx.lineTo(2, 0 + kick * 0.3); ctx.stroke();
  ell(0, -13, 14, 11, flash ? '#fff' : '#f4fbff', '#2b4a8a', 2.5);
  ctx.fillStyle = '#bfe6ff'; for (const [x, y] of [[-6, -17], [3, -9], [-2, -20]]) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); }
  ell(9, -16, 4.5, 5.5, '#fff', '#2b4a8a', 1.5); ell(10.5, -15.5, 2.2, 3, '#13254d');
  ctx.strokeStyle = '#2b4a8a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, -23); ctx.quadraticCurveTo(16, -30, 20, -27); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawSpider(e) {
  const cx = e.x + e.w / 2, by = e.y + e.h;
  if (!e.dead && !e.hudIcon) { ctx.strokeStyle = 'rgba(230,245,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, e.anchorY); ctx.lineTo(cx, e.y + 4); ctx.stroke(); }
  ctx.save(); ctx.translate(cx, by - 15); bugFade(e);
  const flash = e.inv > 0 && Math.floor(e.inv * 16) % 2 === 0, wig = Math.sin(gT * 10) * 2;
  ctx.strokeStyle = '#1d3b5c'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const a = -0.9 + i * 0.6; ctx.beginPath(); ctx.moveTo(s * 8, 0); ctx.quadraticCurveTo(s * (20 + i * 2), -10 + i * 6 + wig, s * (24 + i), 6 + i * 4 + a); ctx.stroke();
  }
  ell(0, -4, 12, 11, flash ? '#fff' : '#47c1c9', '#1d3b5c', 2.5);
  ell(0, 9, 9, 8, flash ? '#fff' : '#2f8f9a', '#1d3b5c', 2.5);
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(-4, -9, 3, 0, 7); ctx.fill();
  ell(-4, 9, 3.5, 4, '#fff'); ell(4, 9, 3.5, 4, '#fff'); ell(-4, 10, 1.6, 2, '#111'); ell(4, 10, 1.6, 2, '#111');
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawMoth(e) {
  const cx = e.x + e.w / 2, by = e.y + e.h;
  ctx.save(); ctx.translate(cx, by); bugFade(e);
  if (e.dead) { ctx.translate(0, -e.h / 2); ctx.rotate(e.deadT * 10); ctx.translate(0, e.h / 2); }
  ctx.scale(e.dir, 1);
  const flap = Math.sin(gT * 16) * 0.6, flash = e.inv > 0 && Math.floor(e.inv * 16) % 2 === 0;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(-2, -18); ctx.rotate(s * (0.5 + flap * 0.6) - 0.2);
    ell(0, -14, 13, 18, 'rgba(235,240,255,.92)', '#6b6fb0', 2); ell(0, -18, 5, 6, '#a9b6ff'); ell(0, -8, 3, 3, '#ffd6f5');
    ctx.restore();
  }
  ell(0, -14, 9, 12, flash ? '#fff' : '#d9d2ff', '#5a5aa0', 2.5);
  ctx.strokeStyle = '#5a5aa0'; ctx.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-7, -14 + i * 5); ctx.lineTo(7, -14 + i * 5); ctx.stroke(); }
  ell(9, -20, 6.5, 6.5, flash ? '#fff' : '#e9e4ff', '#5a5aa0', 2);
  ell(11, -21, 2.5, 3, '#2a1f5c');
  ctx.strokeStyle = '#5a5aa0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, -26); ctx.quadraticCurveTo(14, -36, 20, -36); ctx.moveTo(8, -26); ctx.quadraticCurveTo(8, -38, 13, -40); ctx.stroke();
  if (e.throwA > 0) ell(14, -8, 6, 6, '#fff', '#8fb6e8', 1.5);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawRoly(e) {
  const cx = e.x + e.w / 2, by = e.y + e.h, flash = e.inv > 0 && Math.floor(e.inv * 16) % 2 === 0;
  const body = flash ? '#fff' : '#8b9bc4', band = '#5b6b96';
  ctx.save(); ctx.translate(cx, by); bugFade(e);
  if (e.dead) ctx.scale(1.3, 0.35);
  if (!e.hudIcon && (e.st === 'roll' || e.st === 'curl')) {
    ctx.translate(0, -15); ctx.rotate(e.spin || 0);
    ell(0, 0, 15, 15, body, '#2d3a5c', 2.5);
    ctx.strokeStyle = band; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 15, 15, 0, -0.6 + i * 0.45, -0.4 + i * 0.45); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 5, -14); ctx.quadraticCurveTo(i * 7, 0, i * 5, 14); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-5, -6, 4, 0, 7); ctx.fill();
  } else {
    ctx.scale(e.dir, 1);
    ctx.strokeStyle = '#2d3a5c'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { const sw = Math.sin(e.t * 12 + i) * 2; ctx.beginPath(); ctx.moveTo(i * 6, -4); ctx.lineTo(i * 6 + sw, 0); ctx.stroke(); }
    ctx.fillStyle = body; ctx.strokeStyle = '#2d3a5c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, -12, 20, 12, 0, Math.PI, 0); ctx.lineTo(20, -4); ctx.lineTo(-20, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = band; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 7, -22 + Math.abs(i) * 2); ctx.lineTo(i * 7.5, -5); ctx.stroke(); }
    ell(18, -9, 5, 5, '#5b6b96', '#2d3a5c', 2);
    if (e.st === 'dizzy') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(19, -10, 2.5, 0, 5); ctx.stroke(); }
    else { ell(19.5, -10, 2, 2.4, '#fff'); ell(20, -10, 1, 1.4, '#111'); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
  if (e.st === 'dizzy' && !e.dead) for (let i = 0; i < 3; i++) { starPath(cx + Math.cos(gT * 6 + i * 2.1) * 16, by - 38 + Math.sin(gT * 6 + i * 2.1) * 4, 5, gT * 4); ctx.fillStyle = '#ffe14d'; ctx.fill(); }
}
function drawBigger(e) {
  const cx = e.x + e.w / 2, by = e.y + e.h, stuck = e.state === 'stuck' && !e.dead;
  const flying = e.active && !stuck && !e.dead, angry = e.hp <= 5;
  const flash = e.inv > 0 && Math.floor(e.inv * 16) % 2 === 0;
  ctx.save(); ctx.translate(cx, by);
  if (e.dead) ctx.globalAlpha = clamp(1 - (e.deadT - 0.6) / 0.6, 0, 1);
  if (stuck) { ctx.beginPath(); ctx.rect(-400, -600, 800, 600); ctx.clip(); ctx.translate(0, -10); ctx.rotate(e.dir * 0.6); } // nothing pokes through the ice
  const k = 3.25;
  ctx.scale(e.dir * k, k);
  // wings
  if (flying) {
    const f = Math.sin(gT * 34) * 0.35;
    for (const s of [0, 1]) { ctx.save(); ctx.translate(-4, -22); ctx.rotate(-0.9 - f - s * 0.35); ell(-12, 0, 16, 5.5, 'rgba(210,240,255,.75)', '#6aa6d6', 1); ctx.restore(); }
  }
  // legs
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) { const sw = flying ? Math.sin(gT * 8 + i) * 3 : 0; ctx.beginPath(); ctx.moveTo(i * 10, -8); ctx.lineTo(i * 10 + sw - 3, flying ? 2 : 0); ctx.stroke(); }
  // shell
  const shell = flash ? '#ffffff' : (angry ? '#5b8fd9' : '#3d6fb8');
  ell(-3, -14, 19, 13, shell, OUT, 2.2);
  ctx.fillStyle = flash ? '#fff' : '#a9dcff'; ctx.beginPath(); ctx.ellipse(-7, -20, 9, 4, -0.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff'; for (const [x, y] of [[-14, -9], [-2, -24], [6, -12]]) { starPath(x, y, 2.6, 0, 6, 0.4); ctx.fill(); }
  // head + viking helmet
  ell(15, -11, 8, 7, '#1c2f55', OUT, 2);
  ctx.fillStyle = '#c9d2e3'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(15, -15, 7, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff7d6';
  ctx.beginPath(); ctx.moveTo(9, -17); ctx.quadraticCurveTo(3, -22, 5, -28); ctx.quadraticCurveTo(8, -22, 11, -19); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(21, -17); ctx.quadraticCurveTo(27, -22, 25, -28); ctx.quadraticCurveTo(22, -22, 19, -19); ctx.closePath(); ctx.fill(); ctx.stroke();
  // eyes
  if (!e.active && !e.dead) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(15, -12); ctx.lineTo(21, -12); ctx.stroke(); }
  else if (stuck || e.dead) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(18, -12, 2.2, 0, 5.5); ctx.stroke(); }
  else { ell(18, -12, 3.2, 3.6, '#ffdd55'); ell(19, -11.5, 1.6, 2.1, '#d00'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(14, -16.5); ctx.lineTo(22, -14.5); ctx.stroke(); }
  // the magnificent mustache
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(19, -7.5); ctx.quadraticCurveTo(24, -10, 28, -6); ctx.quadraticCurveTo(29, -3, 26, -3); ctx.quadraticCurveTo(25, -6, 19, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(19, -7.5); ctx.quadraticCurveTo(15, -10, 12, -6); ctx.quadraticCurveTo(11, -3, 14, -3); ctx.quadraticCurveTo(15, -6, 19, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
  if (stuck) {
    // his head is buried in a lumpy snowdrift sitting on the ice; the helmet horns poke out of it
    const d = e.dir, hx = cx + d * 62, gy = by + 3, X = v => hx + d * v;
    const mound = () => {
      ctx.moveTo(X(-56), gy);
      ctx.quadraticCurveTo(X(-54), by - 26, X(-30), by - 34);
      ctx.quadraticCurveTo(X(-20), by - 60, X(2), by - 54);
      ctx.quadraticCurveTo(X(24), by - 66, X(36), by - 40);
      ctx.quadraticCurveTo(X(58), by - 30, X(56), gy);
    };
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); mound(); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.beginPath(); mound(); ctx.closePath(); ctx.clip(); // soft blue shade along the bottom
    ctx.fillStyle = 'rgba(160,185,235,.45)'; ctx.beginPath(); ctx.ellipse(hx, gy + 4, 64, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#9fb4e0'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); mound(); ctx.stroke();
    ctx.fillStyle = 'rgba(160,185,235,.6)'; // little snow lumps
    for (const [x, y, r] of [[-30, -16, 7], [14, -24, 6], [34, -10, 5]]) { ctx.beginPath(); ctx.arc(X(x), by + y, r, Math.PI, 0); ctx.fill(); }
    if (e.st_t < 0.7) { // chunks of snow fly off on impact
      const t = e.st_t;
      for (let i = 0; i < 6; i++) {
        const vx = (i - 2.5) * 70, vy = -330 - (i % 2) * 90, x = hx + vx * t, y = by - 40 + vy * t + 650 * t * t;
        ctx.globalAlpha = clamp(1 - t / 0.7, 0, 1); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#9fb4e0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 7 - (i % 3), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 3; i++) { starPath(cx + Math.cos(gT * 5 + i * 2.1) * 50, e.y - 4 + Math.sin(gT * 5 + i * 2.1) * 10, 9, gT * 3); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
function drawShots() {
  for (const s of L.shots) {
    if (s.bomb && !s.reflected) { // shadow where the bomb will land
      const gy = groundTop(Math.floor(s.x / TS)), close = clamp(1 - (gy - s.y) / 300, 0.2, 1);
      ell(s.x, gy - 2, 18 * close + 6, 5 * close + 2, 'rgba(20,40,90,' + (0.35 * close) + ')');
    }
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    if (s.bomb) {
      ctx.fillStyle = '#e8f7ff'; starPath(0, 0, s.r + 7, 0, 8, 0.65); ctx.fill(); ctx.strokeStyle = '#5aa9d6'; ctx.lineWidth = 2; ctx.stroke();
      ell(0, 0, s.r, s.r, '#ffffff', '#5aa9d6', 2.5); ell(-4, -4, 4, 4, '#ffffff');
      ctx.fillStyle = '#ff6b8b'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
    } else {
      ell(0, 0, s.r, s.r, s.reflected ? '#fff6b0' : '#ffffff', s.reflected ? '#e0a020' : '#7fa8d8', 2.5);
      ell(-3, -3, 4, 3.5, 'rgba(255,255,255,.9)'); ell(3, 4, 4, 2.5, 'rgba(120,160,220,.35)');
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- drawing: world
const STARS = (() => { const r = rng(5); return Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * 300, s: 0.8 + r() * 1.8, ph: r() * 6 })); })();
function drawFrostBackground(cx, cy) {
  const j = sunJoy;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a1640'); g.addColorStop(0.55, '#24357a'); g.addColorStop(1, '#6a6cb6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stars
  for (const s of STARS) {
    const tw = 0.5 + 0.5 * Math.sin(gT * 2 + s.ph);
    ctx.globalAlpha = 0.35 + tw * 0.65; ctx.fillStyle = '#fff';
    const x = ((s.x - cx * 0.02) % W + W) % W, y = s.y - cy * 0.03;
    ctx.beginPath(); ctx.arc(x, y, s.s * (0.7 + tw * 0.5), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // aurora ribbons (they go wild when all 100 snowflakes are found)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const hue = j > 0.3 ? (gT * 70 + k * 120) % 360 : 150 + k * 45;
    ctx.strokeStyle = `hsla(${hue}, 90%, 62%, ${0.16 + 0.08 * Math.sin(gT * 0.8 + k) + j * 0.32})`;
    ctx.lineWidth = 26 + k * 6 + j * 24; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = -60; x <= W + 60; x += 24) {
      const y = 70 + k * 34 + Math.sin(x * 0.006 + gT * (0.35 + j * 1.5) + k * 1.7) * (32 + j * 22) - cy * 0.05;
      if (x === -60) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  // moon (sleepy... until it sees all 100 snowflakes)
  const mx = 830, my = 96 - cy * 0.05 - Math.abs(Math.sin(gT * 6)) * 6 * j, mr = 46 + 8 * j;
  const mg = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 2.6);
  mg.addColorStop(0, `rgba(255,250,220,${0.35 + 0.3 * j})`); mg.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = mg; ctx.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
  ell(mx, my, mr, mr, '#fff6d6', '#e8d9a8', 4);
  ell(mx - 18, my - 20, 8, 6, '#f1e6bd'); ell(mx + 22, my + 16, 6, 5, '#f1e6bd'); ell(mx + 14, my - 26, 4, 3, '#f1e6bd');
  ctx.strokeStyle = '#a8905a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  if (j < 0.5) { // sleepy face
    ctx.beginPath(); ctx.arc(mx - 15, my - 2, 6, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx + 15, my - 2, 6, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx, my + 14, 6, 0.3, Math.PI - 0.3); ctx.stroke();
    if (Math.sin(gT) > 0) txt('z', mx + mr + 6 + Math.sin(gT * 2) * 3, my - mr + (gT * 10) % 14, 18, '#fff6d6', null);
  } else { // wide awake and delighted, with a wink
    ell(mx - 15, my - 6, 5, 7, '#5a4a20'); ell(mx - 13, my - 9, 1.8, 2, '#fff');
    ctx.beginPath(); ctx.moveTo(mx + 9, my - 5); ctx.lineTo(mx + 15, my - 9); ctx.lineTo(mx + 21, my - 5); ctx.stroke();
    ctx.fillStyle = '#9a2a2a'; ctx.beginPath(); ctx.arc(mx, my + 10, 12, 0.1, Math.PI - 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ell(mx - 28, my + 8, 8, 4, 'rgba(255,140,160,.6)'); ell(mx + 28, my + 8, 8, 4, 'rgba(255,140,160,.6)');
  }
  // far snowy mountains
  for (let i = 0; i < 7; i++) {
    const span = 1500, x = ((i * 260 - cx * 0.12) % span + span) % span - 200, h = 150 + (i % 3) * 50, base = 380 - cy * 0.2;
    ctx.fillStyle = '#34478a'; ctx.beginPath(); ctx.moveTo(x - h * 0.9, base); ctx.lineTo(x, base - h); ctx.lineTo(x + h * 0.9, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.moveTo(x - h * 0.28, base - h * 0.69); ctx.lineTo(x, base - h); ctx.lineTo(x + h * 0.28, base - h * 0.69);
    ctx.lineTo(x + h * 0.14, base - h * 0.62); ctx.lineTo(x, base - h * 0.7); ctx.lineTo(x - h * 0.14, base - h * 0.62); ctx.closePath(); ctx.fill();
  }
  // frozen sea with icebergs
  const hy = 372 - cy * 0.25;
  const sg = ctx.createLinearGradient(0, hy, 0, H); sg.addColorStop(0, '#24508a'); sg.addColorStop(1, '#16345f');
  ctx.fillStyle = sg; ctx.fillRect(0, hy, W, H - hy + 400);
  for (let i = 0; i < 6; i++) {
    const span = 1400, x = ((i * 300 - cx * 0.22) % span + span) % span - 150, w = 50 + (i % 3) * 30;
    ctx.fillStyle = '#dfeeff'; ctx.beginPath(); ctx.moveTo(x - w, hy + 14); ctx.lineTo(x - w * 0.5, hy - 18 - (i % 2) * 14); ctx.lineTo(x + w * 0.3, hy - 10); ctx.lineTo(x + w, hy + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,160,220,.5)'; ctx.fillRect(x - w, hy + 10, w * 2, 4);
  }
  // near snow hills with little pines
  const base2 = 470 - cy * 0.45;
  for (let i = 0; i < 5; i++) {
    const span = 1400, x = ((i * 330 - cx * 0.42) % span + span) % span - 250, w = 170 + (i % 3) * 50, h = 110 + (i % 2) * 50;
    ctx.fillStyle = i % 2 ? '#cfdcf7' : '#bfcff2'; ctx.beginPath(); ctx.ellipse(x, base2, w, h, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(x - w * 0.3, base2 - h * 0.7, w * 0.25, h * 0.1, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#5d77b8';
    for (let t = 0; t < 3; t++) { const px = x - w * 0.4 + t * w * 0.35, py = base2 - h * 0.55 + (t % 2) * 18; ctx.beginPath(); ctx.moveTo(px - 9, py); ctx.lineTo(px, py - 26); ctx.lineTo(px + 9, py); ctx.closePath(); ctx.fill(); }
  }
}
function drawFrostWater(cx) {
  const wg = ctx.createLinearGradient(0, WATER_Y, 0, WATER_Y + 120);
  wg.addColorStop(0, '#2f7fae'); wg.addColorStop(1, '#123d66');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.moveTo(cx - 10, WATER_Y + 220);
  for (let x = cx - 10; x <= cx + W + 20; x += 16) ctx.lineTo(x, WATER_Y + Math.sin(x * 0.025 + gT * 1.6) * 3);
  ctx.lineTo(cx + W + 20, WATER_Y + 220); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(220,245,255,.9)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = cx - 10; x <= cx + W + 20; x += 16) ctx.lineTo(x, WATER_Y + Math.sin(x * 0.025 + gT * 1.6) * 3);
  ctx.stroke();
  for (let i = Math.floor(cx / 260) - 1; i < Math.floor((cx + W) / 260) + 2; i++) { // little floating ice chunks
    const x = i * 260 + 90, b = Math.sin(gT * 1.5 + i) * 2;
    ctx.fillStyle = '#e6f6ff'; ctx.beginPath(); ctx.roundRect(x, WATER_Y - 3 + b, 26, 9, 4); ctx.fill();
  }
}
function drawFrostScreen() { // gentle snowfall in front of everything (stops when the sky celebrates)
  const a = 1 - sunJoy; if (a <= 0.02) return;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 70; i++) {
    const sp = 30 + (i % 7) * 12, x = ((i * 137 + Math.sin(gT * 0.8 + i) * 30 - camX * 0.3 * ((i % 3) + 1) / 3) % W + W) % W;
    const y = ((i * 89 + gT * sp) % (H + 20)) - 10;
    ctx.globalAlpha = a * (0.45 + (i % 4) * 0.15);
    ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// ---- tiles
function drawSnowTile(x, y, px, py) {
  const up = !SOLID(T(x, y - 1)), l = !SOLID(T(x - 1, y)), r = !SOLID(T(x + 1, y));
  ctx.fillStyle = '#9fb2e3'; ctx.fillRect(px, py, TS, TS);
  const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  ctx.fillStyle = '#8b9fd6';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 8 + ((h >> (i * 5)) & 31), py + 12 + ((h >> (i * 5 + 15)) & 25), 2.5 + (i & 1) * 2, 0, 7); ctx.fill(); }
  if (l) { ctx.fillStyle = '#4a5a92'; ctx.fillRect(px, py, 4, TS); }
  if (r) { ctx.fillStyle = '#4a5a92'; ctx.fillRect(px + TS - 4, py, 4, TS); }
  if (up) {
    const x0 = px - (l ? 4 : 0), w = TS + (l ? 4 : 0) + (r ? 4 : 0);
    ctx.fillStyle = '#c9d8f5'; ctx.fillRect(x0, py - 3, w, 20);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 8 + i * 16, py + 16, 8, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, py - 4, w, 14);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 8 + i * 16, py - 2, 8, Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px + 8 + ((h >> 3) & 15), py + 13, 5, 0, Math.PI); ctx.fill();
    if (l) { ctx.beginPath(); ctx.arc(px, py + 4, 8, 0, 7); ctx.fill(); }
    if (r) { ctx.beginPath(); ctx.arc(px + TS, py + 4, 8, 0, 7); ctx.fill(); }
  }
}
function drawIceTile(x, y, px, py, crack) {
  const shakeX = crack ? Math.sin(gT * 70) * 2.5 * crack : 0; px += shakeX;
  const up = !SOLID(T(x, y - 1));
  ctx.fillStyle = '#3a8fc2'; ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = crack !== undefined ? '#b8efff' : '#8fdcff'; ctx.fillRect(px + 2, py + 2, TS - 4, TS - 4);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.moveTo(px + 8, py + TS - 6); ctx.lineTo(px + 22, py + 6); ctx.lineTo(px + 28, py + 6); ctx.lineTo(px + 14, py + TS - 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(px + 32, py + 10, 4, 22);
  if (up) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px, py, TS, 4); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(px, py + 4, TS, 3); }
  if (crack) { // cracks spreading from the middle
    ctx.strokeStyle = '#2a6f9e'; ctx.lineWidth = 2; ctx.beginPath();
    const c = px + TS / 2, m = py + TS / 2, L1 = 22 * crack;
    ctx.moveTo(c, m); ctx.lineTo(c - L1 * 0.6, m - L1 * 0.5); ctx.lineTo(c - L1, m - L1 * 0.2);
    ctx.moveTo(c, m); ctx.lineTo(c + L1 * 0.5, m - L1 * 0.7); ctx.moveTo(c, m); ctx.lineTo(c + L1 * 0.8, m + L1 * 0.4); ctx.lineTo(c + L1, m + L1 * 0.1);
    ctx.moveTo(c, m); ctx.lineTo(c - L1 * 0.3, m + L1 * 0.8); ctx.stroke();
  } else if (crack !== undefined) { // cracking-ice tiles look a bit fragile even before you step on them
    ctx.strokeStyle = 'rgba(42,111,158,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 10, py + 30); ctx.lineTo(px + 20, py + 24); ctx.lineTo(px + 26, py + 32); ctx.stroke();
  }
}
function drawIceBlock(px, py) {
  ctx.fillStyle = '#2f6aa8'; ctx.beginPath(); ctx.roundRect(px + 1, py + 1, TS - 2, TS - 2, 6); ctx.fill();
  ctx.fillStyle = '#6fb8e8'; ctx.beginPath(); ctx.roundRect(px + 4, py + 3, TS - 8, TS - 8, 5); ctx.fill();
  ctx.fillStyle = '#bfeaff'; ctx.beginPath(); ctx.roundRect(px + 8, py + 6, TS - 24, 6, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; starPath(px + TS - 14, py + TS - 15, 5, 0, 6, 0.4); ctx.fill();
}
function drawIceGate(px, py, y) {
  const sh = Math.sin(gT * 2 + y) * 0.15;
  ctx.fillStyle = 'rgba(205,243,255,.85)'; ctx.strokeStyle = '#5aa9d6'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(px + 10, py + TS + 1); ctx.lineTo(px + 6, py + 10); ctx.lineTo(px + TS / 2, py - 4); ctx.lineTo(px + TS - 6, py + 10); ctx.lineTo(px + TS - 10, py + TS + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${0.5 + sh})`; ctx.fillRect(px + 16, py + 8, 5, TS - 12);
}
function drawFrostTile(t, x, y, px, py) {
  if (t === 7) drawSnowTile(x, y, px, py);
  else if (t === 8) drawIceTile(x, y, px, py);
  else if (t === 9) { const c = L.cracks[x + ',' + y]; drawIceTile(x, y, px, py, c ? Math.min(1, c.t / CRACK_TIME) : 0); }
  else if (t === 10) drawIceBlock(px, py);
  else if (t === 6) drawIceGate(px, py, y);
}
// ---- decor
function drawFrostDecor(d) {
  if (d.type === 'pine') {
    const sw = Math.sin(gT * 0.9 + d.ph) * 2;
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(d.x - 6, d.y - 18, 12, 18);
    for (let i = 0; i < 3; i++) {
      const w = d.h * (0.42 - i * 0.1), top = d.y - 12 - d.h * (0.3 + i * 0.27), bot = d.y - 12 - d.h * i * 0.25;
      ctx.fillStyle = '#1f6b52'; ctx.strokeStyle = '#123f33'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(d.x - w, bot); ctx.lineTo(d.x + sw * (i + 1) * 0.3, top - d.h * 0.18); ctx.lineTo(d.x + w, bot); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(d.x - w * 0.55, bot - (bot - top) * 0.35); ctx.lineTo(d.x + sw * (i + 1) * 0.3, top - d.h * 0.18); ctx.lineTo(d.x + w * 0.55, bot - (bot - top) * 0.35);
      ctx.quadraticCurveTo(d.x, bot - (bot - top) * 0.2, d.x - w * 0.55, bot - (bot - top) * 0.35); ctx.fill();
    }
  } else if (d.type === 'snowman') {
    const s = d.s, x = d.x, y = d.y, look = clamp((P.x - x) / 400, -1, 1) * 2;
    ell(x, y - 18 * s, 20 * s, 18 * s, '#ffffff', '#9fb4e0', 2.5);
    ell(x, y - 46 * s, 15 * s, 14 * s, '#ffffff', '#9fb4e0', 2.5);
    ell(x, y - 68 * s, 11 * s, 11 * s, '#ffffff', '#9fb4e0', 2.5);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 13 * s, y - 48 * s); ctx.lineTo(x - 30 * s, y - 60 * s + Math.sin(gT * 2 + d.ph) * 3); ctx.moveTo(x + 13 * s, y - 48 * s); ctx.lineTo(x + 30 * s, y - 58 * s); ctx.stroke();
    ell(x - 4 * s + look, y - 71 * s, 1.8, 2, '#1a1a1a'); ell(x + 4 * s + look, y - 71 * s, 1.8, 2, '#1a1a1a');
    ctx.fillStyle = '#ff8c1a'; ctx.beginPath(); ctx.moveTo(x + look, y - 68 * s); ctx.lineTo(x + 12 * s + look * 2, y - 66 * s); ctx.lineTo(x + look, y - 65 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8262e'; ctx.fillRect(x - 11 * s, y - 59 * s, 22 * s, 5 * s); ctx.fillRect(x + 4 * s, y - 59 * s, 5 * s, 13 * s);
    for (let i = 0; i < 3; i++) ell(x, y - (40 - i * 7) * s, 1.8, 1.8, '#1a1a1a');
  } else if (d.type === 'crystal') {
    ctx.fillStyle = ['rgba(160,230,255,.85)', 'rgba(210,190,255,.85)', 'rgba(190,255,240,.85)'][d.c]; ctx.strokeStyle = '#5aa9d6'; ctx.lineWidth = 1.5;
    for (const [dx, h, a] of [[0, 26, 0], [-7, 16, -0.4], [7, 18, 0.35]]) {
      ctx.save(); ctx.translate(d.x + dx * d.s, d.y); ctx.rotate(a); ctx.scale(d.s, d.s);
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4, -h + 6); ctx.lineTo(0, -h); ctx.lineTo(4, -h + 6); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (Math.sin(gT * 3 + d.x) > 0.9) { ctx.fillStyle = '#fff'; starPath(d.x, d.y - 24 * d.s, 4, gT, 4, 0.3); ctx.fill(); }
  } else if (d.type === 'mound') {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(d.x, d.y + 2, d.w, d.w * 0.45, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(160,185,235,.5)'; ctx.beginPath(); ctx.ellipse(d.x + d.w * 0.2, d.y + 1, d.w * 0.6, d.w * 0.15, 0, Math.PI, 0); ctx.fill();
  }
}
function drawFloe(m) {
  ctx.fillStyle = '#e9f8ff'; ctx.strokeStyle = '#5aa9d6'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(m.x, m.y, m.w, 26, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(m.x + 4, m.y - 4, m.w - 8, 10, 6); ctx.fill();
  ctx.fillStyle = 'rgba(90,169,214,.35)'; ctx.fillRect(m.x + 10, m.y + 14, m.w - 20, 3);
  const under = Math.max(m.y, WATER_Y), depth = m.y + 26 - under;
  if (depth > 0) { ctx.fillStyle = 'rgba(30,100,160,0.55)'; ctx.fillRect(m.x - 2, under, m.w + 4, depth + 2); }
  if (m.sink > 2) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(m.x + m.w / 2, WATER_Y, m.w / 2 + 8, 5, 0, 0, 7); ctx.stroke(); }
}
function drawFrostWorld() {
  // geyser vents and steam columns
  for (const g of L.geysers) {
    if (Math.abs(g.x - camX - W / 2) > W) continue;
    if (g.erupt) {
      const h = 360 * Math.min(1, g.ph * 5) * (g.ph > 0.8 ? (1 - (g.ph - 0.8) / 0.2) : 1);
      const sg = ctx.createLinearGradient(0, g.y - h, 0, g.y);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.3, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,.85)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(g.x - 14, g.y); ctx.lineTo(g.x - 30, g.y - h); ctx.lineTo(g.x + 30, g.y - h); ctx.lineTo(g.x + 14, g.y); ctx.closePath(); ctx.fill();
    }
    ell(g.x, g.y - 4, 28, 9, '#6b7aa8', '#3c4a7d', 3); ell(g.x, g.y - 6, 14, 5, g.warn || g.erupt ? '#e8f7ff' : '#26305a');
  }
  // icicles
  for (const ic of L.icicles) {
    if (ic.st === 'gone' || Math.abs(ic.x - camX - W / 2) > W) continue;
    const len = 38 * (ic.st === 'hang' ? ic.grow : 1), sx = ic.st === 'shake' ? Math.sin(gT * 80) * 2.5 : 0;
    ctx.fillStyle = 'rgba(200,240,255,.95)'; ctx.strokeStyle = '#5aa9d6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ic.x - 10 + sx, ic.y); ctx.lineTo(ic.x + 10 + sx, ic.y); ctx.lineTo(ic.x + sx, ic.y + len); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(ic.x - 5 + sx, ic.y + 3, 3, len * 0.5);
  }
  drawShots();
}
// ---- the family (in an ice cage until you smash it open)
function drawIgloo(x, y) {
  ctx.fillStyle = '#f4f9ff'; ctx.strokeStyle = '#9fb4e0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, 82, 76, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#c9d8f5'; ctx.lineWidth = 2;
  for (let r = 1; r < 4; r++) { const yy = y - r * 19; const hw = 82 * Math.sqrt(1 - Math.pow((r * 19) / 76, 2)); ctx.beginPath(); ctx.moveTo(x - hw, yy); ctx.lineTo(x + hw, yy); ctx.stroke(); }
  ctx.fillStyle = '#26305a'; ctx.beginPath(); ctx.ellipse(x - 30, y, 22, 30, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,120,.8)'; ctx.beginPath(); ctx.ellipse(x - 30, y, 14, 20, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
}
function drawCage(x0, x1, y) {
  ctx.strokeStyle = 'rgba(180,235,255,.95)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (let x = x0; x <= x1 + 1; x += (x1 - x0) / 6) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 96); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x0 - 6, y - 98); ctx.lineTo(x1 + 6, y - 98); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
  for (let x = x0; x <= x1 + 1; x += (x1 - x0) / 6) { ctx.beginPath(); ctx.moveTo(x - 1.5, y - 8); ctx.lineTo(x - 1.5, y - 88); ctx.stroke(); }
}
const KID_SCARVES = ['#3fd0ff', '#7dff6b', '#c77dff'];
function drawDrakeFamily(f, x0, y, opts) { // f: positions (drake, daisy, kids), opts: {celebrate, scared, face}
  const c = opts.celebrate, face = opts.face || -1;
  const hop = (ph, a) => c ? Math.abs(Math.sin(gT * 6 + ph)) * a : (opts.scared ? Math.abs(Math.sin(gT * 9 + ph)) * 4 : 0);
  drawDuck({ x: f.drake + x0, y: y - hop(0.5, 14), face, scale: 1.1, body: '#ffd23f', light: '#fff0a6', dark: '#f0b400', acc: 'beanie', scarf: '#e8262e', happy: c, wave: c, blink: Math.sin(gT * 0.8) > 0.97 });
  drawDuck({ x: f.daisy + x0, y: y - hop(1.6, 12), face, scale: 1.05, body: '#ffffff', light: '#f2f6ff', dark: '#dfe6f5', acc: 'earmuffs', scarf: '#ff8fc4', happy: c, wave: c });
  f.kids.forEach((k, i) => drawDuckling(k.x + x0, y - 2, face, c ? Math.abs(Math.sin(gT * 7 + k.ph)) * (16 + i * 3) : hop(k.ph, 0), c, KID_SCARVES[i]));
}
function drawFrostFamily() {
  const f = L.family; if (!f || Math.abs(f.x - camX - W / 2) > W + 200) return;
  if (state === 'intro') return;
  drawIgloo(f.iglooX, f.y);
  const free = state === 'win' && winT > 0.55, celebrate = state === 'win' && winT > 0.9;
  drawDrakeFamily(f, 0, f.y, { celebrate, scared: !free });
  if (!free) drawCage(f.cageX0, f.cageX1, f.y);
  if (state === 'play' && Math.abs(P.x - f.x) < 700) {
    const b = Math.sin(gT * 3) * 3;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(f.drake - 70, f.y - 150 + b, 150, 40, 14); ctx.fill(); ctx.stroke();
    txt('Sis! Over here!', f.drake + 5, f.y - 130 + b, 18, '#e8262e', null);
  }
  if (state === 'win') {
    if (winT > 0.95 && winT < 5.9) bubble(f.drake, f.y - 78, 'THANK YOU, SIS!', 0.95, { now: winT, color: '#e8262e', size: 20 });
    if (winT > 1.7 && winT < 5.9) bubble(f.kids[1].x + 10, f.y - 40, 'Yay, Auntie!', 1.7, { now: winT });
  }
}

// ---------------------------------------------------------------- intro: the Bigger Bug shows up
const FI_END = 14.0, FI_HERO_X = 170;
function fiBoss(t) { // Bigger Bug position during the intro
  if (t < 4.2) return null;
  let x = lerp(W + 160, 650, easeOut(Math.min(1, (t - 4.2) / 0.9))), y = lerp(-120, 205, easeOut(Math.min(1, (t - 4.2) / 0.9))) + Math.sin(t * 3) * 8;
  if (t > 10.6) { x += Math.pow(t - 10.6, 2) * 420; y -= Math.pow(t - 10.6, 2) * 120; }
  return { x, y, dir: t > 10.4 ? 1 : -1 };
}
function updateFrostIntro(dt) {
  const p = introT; introT += dt;
  const hit = t => p < t && introT >= t, gy = groundTop(3);
  if (hit(0.5)) SFX.coo();
  if (hit(2.25)) { SFX.plop(); shake = 6; dust(FI_HERO_X, gy, 16, 2); }
  if (hit(2.5)) SFX.coo();
  if (hit(4.1)) SFX.wind();
  if (hit(4.4)) { SFX.roar(); shake = 10; }
  if (hit(5.1)) SFX.villain();
  if (hit(7.5)) SFX.villain();
  if (hit(9.9)) SFX.hurt();
  if (hit(10.6)) SFX.whoosh();
  if (hit(11.7)) { SFX.angry(); shake = 5; }
  if (hit(13.0)) { SFX.checkpoint(); confetti(W / 2, 260, 30); }
  if (introT > 11.6 && introT < 13.2 && Math.random() < dt * 8) addPart({ type: 'spark', x: FI_HERO_X + rand(-30, 30), y: gy - 70 + rand(-20, 20), vx: rand(-60, 60), vy: rand(-120, -40), drag: 3, life: .4, size: 4, color: '#9fe7ff' });
  if (introT >= FI_END) startPlay();
}
function pigeonCarryPos(t) { // pigeon flies in with Hammer Duck dangling, drops her, flies off
  let px, py;
  if (t < 2.1) { const u = easeOut(Math.min(1, t / 2.1)); px = lerp(-120, FI_HERO_X, u); py = lerp(60, 300, u); }
  else { const u = Math.min(1, (t - 2.3) / 1.6); px = FI_HERO_X + Math.max(0, u) * -380; py = 300 - Math.max(0, u) * 320; }
  return { px, py };
}
function drawFrostIntro() {
  const t = introT, gy = groundTop(3), b = fiBoss(t);
  const pc = pigeonCarryPos(t);
  // Hammer Duck
  let hy = gy, hx = FI_HERO_X, sx = 1, sy = 1;
  if (t < 2.1) { hx = pc.px; hy = pc.py + 78; }
  else if (t < 2.25) { hy = lerp(pc.py + 78, gy, (t - 2.1) / 0.15); }
  else if (t < 2.6) { sx = 1.3; sy = 0.7; }
  let ham = REST + Math.sin(gT * 3) * 0.04;
  if (t < 2.25) ham = 1.25 + Math.sin(gT * 5) * 0.1; // hammer dangling while she is carried
  if (t > 11.6) ham = -1.57 + Math.sin(gT * 22) * 0.18;
  drawDuck({ x: hx, y: hy, face: 1, scale: 1.12, sx, sy, body: '#ffd23f', light: '#fff0a6', dark: '#f0b400', acc: 'bandana', scarf: '#4fc3f7', coat: '#ffffff', ham,
    determined: t > 4.4, happy: t > 2.6 && t < 4.2, run: 0, rot: t < 2.1 ? Math.sin(gT * 5) * 0.15 : 0 });
  if (t < 4.2) drawPigeon(pc.px, pc.py, t < 2.1 ? 1 : -1, true, false);
  // the Bigger Bug with the caged family dangling below
  if (b) {
    const cy = b.y + 175, cx = b.x;
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y + 70); ctx.lineTo(cx, cy - 100); ctx.stroke();
    const fam = { drake: -52, daisy: -18, kids: [12, 32, 52].map((x, i) => ({ x, ph: i })) };
    drawDrakeFamily(fam, cx, cy, { scared: true, face: -1 });
    drawCage(cx - 78, cx + 78, cy);
    ctx.fillStyle = 'rgba(180,235,255,.95)'; ctx.fillRect(cx - 84, cy - 4, 168, 8);
    drawBigger({ type: 'bigger', x: b.x - 65, y: b.y - 48, w: 130, h: 96, dir: b.dir, active: true, dead: false, inv: 0, hp: 10, state: 'hover', t });
    if (t > 7.5 && t < 9.8) { const mx = b.x + b.dir * 68; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, b.y + 30, 8 + Math.sin(gT * 20) * 2, 0, Math.PI * 1.5); ctx.stroke(); }
  }
  // speech
  if (t > 0.4 && t < 2.0) bubble(pc.px + 20, pc.py - 30, 'Coo! Almost there!', 0.4);
  if (t > 2.5 && t < 3.5) bubble(pc.px, pc.py - 30, 'Coo! Good luck!', 2.5);
  if (t > 2.7 && t < 4.1) bubble(FI_HERO_X + 10, gy - 92, 'Brrr! Hello, Frosty Isle!', 2.7);
  if (b && t > 5.0 && t < 7.4) bubble(b.x - 20, b.y - 50, "So YOU'RE the duck who beat\nmy little brother?", 5.0, { color: '#1d5fa8', shake: true });
  if (b && t > 7.4 && t < 9.8) bubble(b.x - 20, b.y - 50, "HA! I'm the BIGGER BUG!\nYou'll NEVER defeat ME!", 7.4, { color: '#1d5fa8', shake: true, size: 20 });
  if (b && t > 9.8 && t < 10.9) bubble(b.x - 50, b.y + 80, 'SIS! HELP US!', 9.8, { color: '#e8262e', size: 20, shake: true });
  if (b && t > 10.6 && t < 11.6) bubble(Math.min(b.x, 900), b.y - 50, 'MWAHAHA!', 10.6, { color: '#1d5fa8', size: 22 });
  if (t > 11.6 && t < 13.2) bubble(FI_HERO_X + 30, gy - 112, 'Bigger bug? Then I need a\nBIGGER SWING!', 11.6, { size: 20, color: '#e8262e', shake: true });
}
function drawFrostIntroOverlay() {
  const bar = 44 * Math.min(1, introT * 2) * (introT > FI_END - 0.4 ? (FI_END - introT) / 0.4 : 1);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  if (introT < 1.8) txt('Frosty Isle...  brrr!', W / 2, 90, 28, '#dff4ff', '#1d3b5c');
  if (introT > 13.0) { const s = easeOut(Math.min(1, (introT - 13) / 0.3)); ctx.save(); ctx.translate(W / 2, 200); ctx.scale(s, s); rainbowTitle('GO GET HIM!', 0, 0, 76, gT); ctx.restore(); }
  if (bar > 20 && !touchMode) txt('ENTER = skip', W - 80, H - 22, 14, '#aaa', null);
}

// ---------------------------------------------------------------- register
Object.assign(EDEF, {
  flea: { w: 30, h: 26, hp: 1, init(e) { e.cd = rand(0.4, 1.4); }, update: fleaUpdate, draw: drawFlea },
  spider: { w: 34, h: 30, hp: 1, fallsWhenDead: true, init(e, col, row) { e.anchorY = row * TS; e.y = e.anchorY + 6; e.st = 'up'; e.cd = 0; }, update: spiderUpdate, draw: drawSpider },
  moth: { w: 40, h: 32, hp: 1, fly: true, fallsWhenDead: true, init(e) { e.cd = rand(1.0, 2.0); }, update: mothUpdate, draw: drawMoth },
  roly: { w: 40, h: 30, hp: 1, init(e) { e.st = 'walk'; e.st_t = 0; }, update: rolyUpdate, draw: drawRoly,
    canHit(e, src, dir) {
      if (e.st === 'roll' && src === 'swing') { e.dir = dir; e.rollT = Math.max(e.rollT, 0.8); SFX.boing(); popup(e.x + e.w / 2, e.y - 14, 'BOING!', '#ffe14d', 24, false); return false; }
      return true;
    } },
  bigger: { w: 130, h: 96, hp: 10, boss: true, fallsWhenDead: true, hurtInv: 0.45, update: updateBigger, draw: drawBigger,
    hurtWords: ['BONK!', 'MY MUSTACHE!', 'OUCH!', 'NOT THE HELMET!', 'YOWCH!'],
    canHit(e, src) {
      if (e.state === 'stuck' || src === 'throw' || src === 'shot' || src === 'boss') return true;
      tone(900, 0.08, 'square', 0.08, 1.2); popup(e.x + e.w / 2, e.y + e.h + 10, 'CLANG! Throw it!', '#9fe7ff', 20, false);
      return false;
    },
    harmless(e) { return e.state === 'stuck' || e.state === 'sleep'; } },
});

registerWorld({
  name: 'Frosty Isle',
  width: F_WIDTH, startCol: 2, goalCol: F_GOAL,
  arena: { L: F_ARENA_L, R: F_ARENA_R },
  winStopX: 225.0 * TS, winCamX: 228 * TS - W / 2,
  bossName: 'THE BIGGER BUG', bossDefeatText: 'BIGGER BUG BEATEN!', gateColor: '#cdf3ff', hudBug: 'flea', heroScarf: '#4fc3f7', heroCoat: '#ffffff', seedSpark: '#bfefff',
  gameOverLine: "Brrr! Don't give up, Drake's family needs you!",
  win: { title: 'FROSTY ISLE SAVED!', line: "Drake's family is safe and warm!", seedName: 'Snowflakes', bossLabel: '+ the Bigger Bug',
    allLine: '❄ ALL 100 SNOWFLAKES!  The northern lights are dancing! ❄' },
  tracks: FROST_TRACKS,
  build: buildFrost,
  drawBackground: drawFrostBackground,
  drawWater: drawFrostWater,
  drawTile: drawFrostTile,
  drawDecor: drawFrostDecor,
  drawFamily: drawFrostFamily,
  drawWorld: drawFrostWorld,
  drawScreen: drawFrostScreen,
  update: frostUpdate,
  onHammerArea: frostHammerArea,
  onRespawn() {
    L.shots.length = 0;
    for (const k in L.cracks) { const c = L.cracks[k]; if (c.broken) setT(c.x, c.y, 9); }
    L.cracks = {};
    for (const ic of L.icicles) { ic.st = 'hang'; ic.y = ic.y0; ic.grow = 1; }
    for (const m of L.movers) if (m.ice) { m.sink = 0; m.sit = 0; }
  },
  drawSeed(it, bob) { drawSnowflake(it.x, it.y + bob, 13, it.t); },
  drawSeedIcon(x, y) { drawSnowflake(x, y, 14, gT * 0.5); },
  winUpdate(dt, before) {
    const f = L.family;
    if (before < 0.42 && winT >= 0.42) { P.swinging = true; P.swingT = 0; P.hitSet = new Set(); P.face = 1; SFX.swing(); }
    if (before < 0.55 && winT >= 0.55) { SFX.shatter(); shake = 12; for (let i = 0; i < 4; i++) shards(lerp(f.cageX0, f.cageX1, i / 3), f.y - 50, 10); popup(f.x, f.y - 120, 'FREE!', '#9fe7ff', 44); }
    if (allSeeds() && winT > 1.2 && Math.random() < dt * 2) addPart({ type: 'streak', x: camX + rand(200, W), y: camY + rand(20, 160), vx: -rand(500, 800), vy: rand(200, 320), life: .7, size: 2.5, color: '#fff6b0' });
  },
  intro: { end: FI_END, holds: [1.95, 3.45, 4.05, 7.35, 9.75, 10.85, 11.55, 12.9], update: updateFrostIntro, draw: drawFrostIntro, overlay: drawFrostIntroOverlay, heroX: () => FI_HERO_X,
    track: t => t < 4.1 ? 'calm' : (t < 11.4 ? 'boss' : null) },
});

function drawSnowflake(x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = '#2f7fc4'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const arms = () => { for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.3, -r * 0.8); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.3, -r * 0.8); ctx.stroke(); } };
  arms(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; arms();
  ell(0, 0, 3.5, 3.5, '#bfefff');
  ctx.restore();
}
})();
