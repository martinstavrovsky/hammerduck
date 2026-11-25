'use strict';
// =====================================================================
//  WORLD 1 — DUCK ISLAND
//  Sunny tropical island: the Big Bug kidnaps Hammer Duck's family.
// =====================================================================
// background music: cheerful island loop, dramatic boss theme, calm family theme
const MEL = [72, 0, 76, 79, 0, 76, 79, 81, 81, 0, 77, 0, 72, 0, 77, 81, 79, 0, 74, 0, 71, 74, 79, 0, 76, 77, 76, 74, 72, 0, 0, 0,
  76, 0, 72, 0, 69, 72, 76, 0, 77, 0, 81, 0, 84, 0, 81, 77, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0, 79, 0, 72, 0, 0, 0];
const ROOTS = [48, 41, 43, 48, 45, 41, 43, 48];
// Boss: A minor, driving octave bass, kick + snare backbeat
const BOSS_MEL = [69, 0, 72, 0, 76, 0, 75, 76, 77, 0, 76, 0, 72, 0, 69, 0, 72, 0, 77, 0, 81, 0, 80, 81, 79, 0, 77, 0, 74, 0, 71, 0,
  81, 0, 81, 79, 77, 0, 76, 0, 77, 76, 74, 0, 72, 0, 71, 0, 69, 0, 72, 0, 77, 0, 76, 74, 76, 0, 68, 0, 71, 0, 74, 0];
const BOSS_ROOTS = [45, 45, 41, 43, 45, 45, 41, 40];
// Calm: F major lullaby — [start step, note, length in steps]
const CALM_MEL = [[0, 72, 4], [4, 77, 4], [8, 76, 6], [14, 72, 2], [16, 74, 4], [20, 77, 2], [22, 74, 2], [24, 72, 8],
  [32, 69, 2], [34, 72, 2], [36, 77, 4], [40, 81, 4], [44, 79, 2], [46, 77, 2], [48, 74, 4], [52, 79, 4], [56, 77, 8]];
const CALM_CHORDS = [[53, 0], [57, 1], [58, 0], [60, 0], [53, 0], [50, 1], [58, 0], [60, 0]]; // root, minor?
// Hero: triumphant G-major march after beating the boss
const HERO_MEL = [67, 0, 71, 74, 79, 0, 78, 79, 76, 0, 72, 0, 76, 79, 84, 0, 81, 0, 78, 0, 74, 0, 78, 81, 79, 0, 0, 0, 74, 76, 78, 79,
  76, 0, 79, 0, 83, 0, 81, 79, 76, 0, 72, 76, 79, 0, 76, 0, 74, 0, 78, 81, 86, 0, 84, 81, 78, 0, 74, 0, 81, 0, 0, 0];
const HERO_ROOTS = [43, 48, 50, 43, 40, 48, 50, 50];
const ISLAND_TRACKS = {
  hero: { bpm: 126, play(s, t, b) {
    const i = s % 64, bar = Math.floor(i / 8), pos = i % 8, r = HERO_ROOTS[bar];
    if (HERO_MEL[i]) { tone(midi(HERO_MEL[i]), b * 0.95, 'square', 0.045, 0, t, musicGain); tone(midi(HERO_MEL[i] + 12), b * 0.8, 'triangle', 0.02, 0, t, musicGain); }
    if (pos % 2 === 0) tone(midi(pos % 4 === 0 ? r : r + 7), b * 1.6, 'triangle', 0.17, 0, t, musicGain);
    if (pos === 0 || pos === 4) tone(140, 0.12, 'sine', 0.3, 0.35, t, musicGain);
    if (pos === 2 || pos === 6) noise(0.1, 0.18, 1900, t, musicGain);
    if (pos === 7) { noise(0.05, 0.08, 1900, t, musicGain); noise(0.05, 0.08, 1900, t + b / 2, musicGain); }
    if (pos % 2 === 1) noise(0.03, 0.04, 8000, t, musicGain);
  } },
  main: { bpm: 138, play(s, t, b) {
    const m = MEL[s % 64], bar = Math.floor(s % 64 / 8), pos = s % 8, r = ROOTS[bar];
    if (m) tone(midi(m), b * 0.9, 'square', 0.045, 0, t, musicGain);
    const bn = (pos === 0 || pos === 4) ? r : (pos === 2 || pos === 6) ? r + 7 : 0;
    if (bn) tone(midi(bn), b * 1.5, 'triangle', 0.16, 0, t, musicGain);
    if (pos % 2 === 1) noise(0.04, 0.05, 7000, t, musicGain);
    if (pos === 0 || pos === 4) noise(0.08, 0.1, 150, t, musicGain);
  } },
  boss: { bpm: 168, play(s, t, b) {
    const i = s % 64, bar = Math.floor(i / 8), pos = i % 8, r = BOSS_ROOTS[bar];
    tone(midi(r + (pos % 2 ? 12 : 0)), b * 0.85, 'sawtooth', 0.07, 0, t, musicGain);
    if (BOSS_MEL[i]) tone(midi(BOSS_MEL[i]), b * 0.95, 'square', 0.05, 0, t, musicGain);
    if (pos === 0 || pos === 4 || (bar % 2 === 1 && pos === 7)) tone(150, 0.14, 'sine', 0.45, 0.3, t, musicGain);   // kick
    if (pos === 2 || pos === 6) { noise(0.13, 0.32, 1800, t, musicGain); tone(220, 0.08, 'triangle', 0.1, 0.5, t, musicGain); } // snare
    noise(0.03, pos % 2 ? 0.06 : 0.03, 8000, t, musicGain);                                                          // hats
    if (pos === 0 && bar % 4 === 0) { tone(midi(r + 12), b * 7, 'sawtooth', 0.025, 0, t, musicGain, 0.1); tone(midi(r + 15), b * 7, 'sawtooth', 0.02, 0, t, musicGain, 0.1); } // dark stab
    if (bar === 7 && pos >= 4) tone(midi(52 - (pos - 4) * 2), b * 0.9, 'triangle', 0.18, 0.7, t, musicGain);   // tom fill
  } },
  calm: { bpm: 72, play(s, t, b) {
    const i = s % 64, bar = Math.floor(i / 8), pos = i % 8, [r, minor] = CALM_CHORDS[bar], third = minor ? 3 : 4;
    const arp = [0, 7, 12, 12 + third, 19, 12 + third, 12, 7];
    tone(midi(r + arp[pos]), b * 1.8, 'triangle', 0.05, 0, t, musicGain, 0.02);
    if (pos === 0) tone(midi(r - 12), b * 8, 'sine', 0.12, 0, t, musicGain, 0.15);
    for (const [st, n, len] of CALM_MEL) if (st === i) { tone(midi(n), b * len * 1.05, 'sine', 0.09, 0, t, musicGain, 0.08); tone(midi(n + 12), b * len, 'sine', 0.015, 0, t, musicGain, 0.1); }
  } },
};

const ARENA_L = 201, ARENA_R = 227, GOAL_COL = 238;

function buildIsland(B) {
  const { ground, plat, block, crate, seeds, seedsV, seedArc, bug, spring, cp, sign, mover } = B;

  // ---- terrain
  ground(0, 29, 2);                       // 1: starting beach
  plat(23, 7, 3);
  crate(20, 9);
  ground(33, 58, 2); ground(40, 46, 3);   // 2: first hills
  plat(48, 6, 4);
  crate(52, 9); crate(53, 9); crate(52, 8, 'heart');
  plat(60, 8, 2);                         // log over water
  ground(63, 70, 3); ground(71, 78, 5); ground(79, 90, 3); // 3: big hill
  block(84, 6, 2, 1);
  block(100, 8, 2, 4);                    // 4: lagoon with rafts
  ground(111, 140, 2);                    // 5: crate fields
  for (let i = 0; i < 3; i++) { crate(124 + i, 9, i === 1 ? 'heart' : 'seeds'); crate(124 + i, 8, i === 1 ? 'seeds' : 'none'); }
  plat(129, 7, 3);
  ground(144, 170, 2);                    // 6: towers & springs
  block(148, 7, 2, 3); plat(151, 5, 2); block(154, 4, 2, 6); block(158, 8, 2, 2);
  plat(162, 6, 3);
  ground(173, 200, 2);                    // 7: bug swarm
  crate(186, 9, 'heart');
  plat(190, 7, 4);
  ground(201, LW - 1, 2);                 // 8+9: arena and home beach
  crate(205, 9, 'heart');
  B.gate(ARENA_R); // bug-goo gate

  // ---- entities

  // 1
  sign(3, '← →  walk', '◀ ▶  walk'); sign(8, 'SPACE  jump', 'JUMP  button'); sign(13, 'H  hammer   ·   G  THROW it!', 'HAMMER   ·   THROW it!');
  seeds(5, 8, 3); bug('beetle', 17); seeds(23, 6, 3); bug('beetle', 27); seedArc(29, 7, 5);
  // 2
  seeds(34, 8, 3); seedArc(41, 7, 4);
  bug('ladybug', 37); bug('beetle', 43); seeds(48, 5, 4); bug('ladybug', 56); seeds(60, 6, 2);
  // 3
  sign(65, 'Wasps swoop low! Hold ↓ to duck!', 'Wasps swoop low! Hold ▼ to duck!');
  bug('beetle', 68); bug('fly', 74, 4); seeds(72, 6, 6); seeds(84, 5, 2); bug('beetle', 81); bug('ladybug', 88); bug('fly', 87, 4);
  // 4 lagoon
  mover(92, 8, 96, 8, 3, 3.2); mover(103, 8, 103, 4, 2, 3); mover(105, 6, 108, 6, 3, 3);
  seeds(93, 6, 3); bug('fly', 100, 4); seeds(105, 4, 3);
  // 5
  seeds(135, 8, 3);
  cp(113); sign(117, 'In the air: press J or ↓ for a HAMMER SLAM!', 'In the air: press SLAM or ▼ for a HAMMER SLAM!');
  bug('armor', 121); seeds(129, 6, 3); bug('armor', 133); bug('ladybug', 138);
  // 6
  seeds(158, 7, 2); seedArc(170, 8, 4);
  spring(146, 9); seedsV(145.5, 4, 4); bug('fly', 156, 2); seeds(154, 3, 2);
  bug('beetle', 161); bug('ladybug', 166); seeds(162, 5, 3); spring(168, 9); seedsV(167.5, 1, 5);
  // 7
  seeds(184, 8, 2);
  cp(175); seeds(177, 8, 3); bug('fly', 180, 5); bug('beetle', 182); bug('fly', 185, 4);
  bug('armor', 189); seeds(190, 6, 4); bug('ladybug', 194); bug('beetle', 197); sign(199, 'Danger! BIG BUG ahead!');
  // 8 boss
  cp(203); seeds(210, 8, 3);
  L.totalSeeds += 6; // dropped by the Big Bug
  bug('boss', 219);
  // 9 home
  sign(232, 'Ducklings ahead! Hurry! ♥');
  const gy = groundTop(246);
  L.family = { nestX: 246.5 * TS, y: gy, papa: { x: 244.3 * TS }, kids: [245.5, 246.2, 246.9, 247.6].map((c, i) => ({ x: c * TS, ph: i * 0.9 })) };

  // ---- decorations
  const r = rng(11); let lastPalm = -10;
  const fixedPalms = [1, 31, 236, 251, 256];
  for (let x = 1; x < LW - 1; x++) {
    const gyr = groundTop(x) / TS; if (gyr >= ROWS || T(x, gyr) !== 1) continue;
    if (x >= ARENA_L && x <= ARENA_R) { if (r() < 0.3) L.decor.push({ type: 'flower', x: x * TS + r() * 30 + 8, y: gyr * TS, c: Math.floor(r() * 5), ph: r() * 6 }); continue; }
    if (x > 240 && x < 250) continue;
    if (L.signs.some(s => Math.abs(s.x - x * TS) < 60)) continue;
    const v = r();
    if ((fixedPalms.includes(x) || (v < 0.07 && x - lastPalm > 5)) && x < 258) { L.decor.push({ type: 'palm', x: x * TS + 24, y: gyr * TS, h: 130 + r() * 60, ph: r() * 6, lean: r() < 0.5 ? -1 : 1 }); lastPalm = x; }
    else if (v < 0.2) L.decor.push({ type: 'bush', x: x * TS + 24, y: gyr * TS, s: 0.8 + r() * 0.5, ph: r() * 6, b: 0 });
    else if (v < 0.5) L.decor.push({ type: 'flower', x: x * TS + r() * 30 + 8, y: gyr * TS, c: Math.floor(r() * 5), ph: r() * 6 });
    else if (v < 0.56) L.decor.push({ type: 'shell', x: x * TS + r() * 30 + 8, y: gyr * TS, c: Math.floor(r() * 3) });
  }
  L.decor.sort((a, b) => (a.type === 'palm' ? 0 : 1) - (b.type === 'palm' ? 0 : 1));
}

// Wasp: hovers near you in a swingy way, then swoops down to head height.
// The swoop passes just above a crouching duck, so ducking (↓) dodges it.
const WASP_SWOOP_Y = 64;
function updateWasp(e, dt) {
  const pcx = P.x + P.w / 2, gy = P.lastGroundY, ecx = e.x + e.w / 2;
  const inTerritory = !P.dead && Math.abs(pcx - (e.ox + e.w / 2)) < 520;
  e.cd -= dt;
  if (e.st === 'swoop') {
    e.su += dt / e.sd; const u = Math.min(1, e.su);
    e.x = lerp(e.sx0, e.sx1, u);
    e.y = lerp(e.sy0, e.sty, Math.min(1, Math.sin(Math.PI * u) * 1.7));
    e.dir = Math.sign(e.sx1 - e.sx0) || 1;
    if (u >= 1) {
      e.st = 'hover'; e.cd = rand(1.4, 2.6); e.side = Math.sign(e.sx1 - e.sx0) || 1;
      e.hx = e.x - Math.sin(e.t * 1.3) * 35; e.hy = e.y - Math.sin(e.t * 2.6) * 18;
    }
    return;
  }
  e.dir = pcx < ecx ? -1 : 1;
  if (e.st === 'windup') {
    e.wt += dt;
    e.x = e.hx + Math.sin(e.wt * 70) * 3; e.y = e.hy - e.wt * 40;
    if (e.wt > 0.5) {
      let dx = pcx - ecx; if (Math.abs(dx) < 150) dx = (Math.sign(dx) || 1) * 150;
      e.st = 'swoop'; e.su = 0; e.sx0 = e.x; e.sy0 = e.y; e.sx1 = e.x + dx * 2; e.sty = gy - WASP_SWOOP_Y;
      e.sd = clamp(Math.abs(dx * 2) / 400, 0.9, 1.7);
      tone(300, 0.5, 'sawtooth', 0.06, 0.5);
    }
    return;
  }
  // hover: drift toward a spot beside and above the duck
  let tx = e.ox, ty = e.oy;
  if (inTerritory) { if (!e.side) e.side = ecx < pcx ? -1 : 1; tx = pcx + e.side * 190 - e.w / 2; ty = gy - 210; }
  const sp = 170 * dt;
  e.hx += clamp(tx - e.hx, -sp, sp); e.hy += clamp(ty - e.hy, -sp, sp);
  e.x = e.hx + Math.sin(e.t * 1.3) * 35; e.y = e.hy + Math.sin(e.t * 2.6) * 18;
  if (inTerritory && e.cd <= 0 && Math.abs(e.hx - tx) < 70 && Math.abs(e.hy - ty) < 70) {
    e.st = 'windup'; e.wt = 0; e.hx = e.x; e.hy = e.y;
    popup(e.x + e.w / 2, e.y - 14, '!', '#ff4d4d', 30, false);
    tone(520, 0.25, 'square', 0.05, 1.4);
  }
}

function updateBoss(b, dt) {
  b.t += dt; b.inv -= dt; b.kb -= dt;
  if (!b.active) {
    bossSnore(b, dt);
    if (shouldWakeBoss(b)) { wakeBoss(b, 'BIG BUG WAKES UP!'); b.state = 'walk'; b.faceT = 0; }
    b.vy = Math.min(b.vy + G * dt, MAXFALL); b.vx = 0; moveBody(b, dt);
    return;
  }
  const px = P.x + P.w / 2, bx = b.x + b.w / 2, angry = b.hp <= 2;
  b.faceT -= dt;
  if (b.state === 'walk') {
    if (b.faceT <= 0) { b.dir = px < bx ? -1 : 1; b.faceT = angry ? 0.7 : 1.2; }
    if (b.kb <= 0) b.vx = b.dir * (angry ? 320 : 210);
    if (b.t > (angry ? 1.5 : 2.3) && b.onGround && b.kb <= 0) { b.state = 'crouch'; b.t = 0; }
  } else if (b.state === 'crouch') {
    b.vx = 0;
    if (b.t > 0.25) { b.state = 'air'; b.t = 0; b.dir = px < bx ? -1 : 1; b.vy = -1000; b.vx = b.dir * clamp(Math.abs(px - bx) * 1.15, 250, 800); SFX.jump(); }
  } else if (b.state === 'air') {
    if (b.onGround && b.t > 0.1) {
      b.state = 'walk'; b.t = 0; shake = 14; SFX.slam(); dust(bx, b.y + b.h, 16, 2.5);
      const alive = L.enemies.filter(m => m.minion && !m.dead).length;
      if (b.hp <= 3 && alive < 2 && Math.random() < 0.6) {
        const m = { type: 'ladybug', w: 38, h: 28, hp: 1, vx: 0, vy: 0, dir: Math.random() < .5 ? -1 : 1, t: 0, dead: false, deadT: 0, inv: 0, kb: 0, awake: true, minion: true };
        m.x = rand(ARENA_L + 2, ARENA_R - 3) * TS; m.y = -40; L.enemies.push(m); L.totalBugs++;
      }
    }
  }
  if (b.kb > 0) b.vx *= 0.97;
  b.vy = Math.min(b.vy + G * dt, MAXFALL);
  moveBody(b, dt);
  if (b.hitL) b.dir = 1; if (b.hitR) b.dir = -1;
}

// ----------------------------------------------------------- background
function drawCloud(x, y, s, face) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#cfe9ff';
  for (const [cx, cy, r] of [[-40, 10, 26], [0, 12, 30], [40, 10, 24]]) { ctx.beginPath(); ctx.arc(cx, cy + 5, r, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff';
  for (const [cx, cy, r] of [[-40, 6, 26], [-12, -12, 32], [22, -6, 30], [44, 8, 22], [0, 10, 28]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
  if (face) {
    ctx.fillStyle = '#3b4a6b'; ctx.beginPath(); ctx.ellipse(-10, 2, 3, 4.5, 0, 0, 7); ctx.ellipse(10, 2, 3, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,140,170,.5)'; ctx.beginPath(); ctx.ellipse(-20, 10, 6, 3, 0, 0, 7); ctx.ellipse(20, 10, 6, 3, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawSun(cy) {
  const j = sunJoy;
  const sx = 840 + 85 * j, sy = 92 - cy * 0.05 + 62 * j - Math.abs(Math.sin(gT * 9)) * 7 * j;
  if (j > 0.01) {
    const hg = ctx.createRadialGradient(sx, sy, 40, sx, sy, 60 + 260 * j);
    hg.addColorStop(0, 'rgba(255,240,150,' + (0.55 * j) + ')'); hg.addColorStop(1, 'rgba(255,250,190,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
  }
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(gT * (0.15 + 1.1 * j));
  const rayCols = ['#ff9de2', '#ffd23f', '#7cf0ff', '#b4f78a'];
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    const len = 110 + j * (50 + Math.sin(gT * 6 + i) * 18);
    ctx.fillStyle = j > 0.5 ? rayCols[i % 4] : 'rgba(255,246,170,' + (0.35 + 0.45 * j) + ')';
    ctx.globalAlpha = j > 0.5 ? 0.55 + 0.25 * j : 1;
    ctx.beginPath(); ctx.moveTo(-12 - 4 * j, -60); ctx.lineTo(12 + 4 * j, -60); ctx.lineTo(0, -len); ctx.closePath(); ctx.fill();
  }
  ctx.restore(); ctx.globalAlpha = 1;
  const r = 50 + 12 * j + Math.sin(gT * 14) * 2 * j;
  ell(sx, sy, r, r, j > 0.01 ? '#ffe94d' : '#fff27a', j > 0.01 ? '#ffaa00' : '#ffcf3a', 6);
  ctx.strokeStyle = j > 0.5 ? '#7a3a00' : '#c98a1a'; ctx.lineWidth = 3 + j; ctx.lineCap = 'round';
  if (j < 0.5) {
    ctx.beginPath(); ctx.arc(sx - 16, sy - 4, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx + 16, sy - 4, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy + 8, 14, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    // squeezed laughing eyes  > <
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx - 26, sy - 16); ctx.lineTo(sx - 14, sy - 9); ctx.lineTo(sx - 26, sy - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 26, sy - 16); ctx.lineTo(sx + 14, sy - 9); ctx.lineTo(sx + 26, sy - 3); ctx.stroke();
    // tears of joy
    ell(sx - 31, sy + 2 + (gT * 30) % 10, 3, 4.5, '#7cd8ff'); ell(sx + 31, sy + 2 + (gT * 30 + 5) % 10, 3, 4.5, '#7cd8ff');
    // big open laughing mouth
    const open = 10 + Math.abs(Math.sin(gT * 16)) * 10;
    ctx.fillStyle = '#9a2a2a'; ctx.beginPath(); ctx.moveTo(sx - 22, sy + 6); ctx.quadraticCurveTo(sx, sy + 6 + open * 2.2, sx + 22, sy + 6); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3; ctx.stroke();
    ell(sx, sy + 6 + open * 0.95, 9, Math.max(2, open * 0.35), '#ff7a8a');
  }
  ell(sx - 32, sy + 10, 9, 5, 'rgba(255,130,150,' + (0.35 + 0.4 * j) + ')');
  ell(sx + 32, sy + 10, 9, 5, 'rgba(255,130,150,' + (0.35 + 0.4 * j) + ')');
}
function drawIslandBackground(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#36a9ff'); g.addColorStop(0.55, '#8fdcff'); g.addColorStop(1, '#d6f6ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (sunJoy > 0.01) { // perfectly clear, deep-blue sky for the happy sun
    const cg = ctx.createLinearGradient(0, 0, 0, H);
    cg.addColorStop(0, '#1489ff'); cg.addColorStop(0.6, '#5cc8ff'); cg.addColorStop(1, '#b8ecff');
    ctx.globalAlpha = sunJoy; ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  // sun
  drawSun(cy);
  // clouds
  for (let i = 0; i < 9; i++) {
    const span = 1700;
    const x = ((i * 233 - cx * 0.1 + gT * 9) % span + span) % span - 220;
    const y = 50 + ((i * 73) % 5) * 26 - cy * 0.12;
    if (sunJoy > 0.98) break;
    ctx.globalAlpha = 1 - sunJoy;
    drawCloud(x - sunJoy * 300 * (i % 2 ? 1 : -1), y - sunJoy * 60, 0.6 + ((i * 37) % 4) * 0.14, i % 3 === 0);
    ctx.globalAlpha = 1;
  }
  // ocean
  const hy = 330 - cy * 0.25;
  const og = ctx.createLinearGradient(0, hy, 0, H);
  og.addColorStop(0, '#2bb3e6'); og.addColorStop(1, '#1673b6');
  ctx.fillStyle = og; ctx.fillRect(0, hy, W, H - hy + 400);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 26; i++) {
    const x = ((i * 97 - cx * 0.2 + Math.sin(gT + i) * 6) % W + W) % W, y = hy + 10 + (i * 37) % 120;
    ctx.fillRect(x, y, 14 + (i % 3) * 6, 2);
  }
  // distant islands
  for (let i = 0; i < 4; i++) {
    const span = 1500, x = ((i * 420 - cx * 0.2) % span + span) % span - 200, w = 120 + (i % 2) * 70;
    ell(x, hy + 6, w, 32 + (i % 2) * 14, '#59b98f');
    ell(x - w * 0.2, hy - 4, w * 0.5, 22, '#6fcf9c');
    ctx.strokeStyle = '#3e8c6b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 10, hy - 20); ctx.quadraticCurveTo(x + 18, hy - 50, x + 12, hy - 72); ctx.stroke();
    ctx.fillStyle = '#3e8c6b';
    for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(x + 12, hy - 72); ctx.rotate(-Math.PI + k * 1.05); ctx.beginPath(); ctx.ellipse(16, 0, 18, 5, 0, 0, 7); ctx.fill(); ctx.restore(); }
  }
  // near hills of the island
  const base = 470 - cy * 0.5;
  for (let i = 0; i < 5; i++) {
    const span = 1400, x = ((i * 330 - cx * 0.45) % span + span) % span - 250;
    const w = 150 + (i % 3) * 50, h = 120 + (i % 2) * 60;
    ctx.fillStyle = i % 2 ? '#8fe07a' : '#7bd46a';
    ctx.beginPath(); ctx.ellipse(x, base, w, h, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.ellipse(x - w * 0.3, base - h * 0.65, w * 0.25, h * 0.12, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(40,120,40,.18)';
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x - w * 0.6 + k * w * 0.24, base - h * 0.35 + (k % 2) * 20, 6, 0, 7); ctx.fill(); }
  }
}

function drawIslandWater(cx, cy) {
  const wy = ROWS * TS - 40;
  const wg = ctx.createLinearGradient(0, wy, 0, wy + 120);
  wg.addColorStop(0, '#3cc8f2'); wg.addColorStop(1, '#1a6fb8');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.moveTo(cx - 10, wy + 200);
  for (let x = cx - 10; x <= cx + W + 20; x += 16) ctx.lineTo(x, wy + Math.sin(x * 0.03 + gT * 2.5) * 5);
  ctx.lineTo(cx + W + 20, wy + 200); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = cx - 10; x <= cx + W + 20; x += 16) ctx.lineTo(x, wy + Math.sin(x * 0.03 + gT * 2.5) * 5);
  ctx.stroke();
}

// ----------------------------------------------------------- tiles
function drawGround(x, y, px, py) {
  const up = T(x, y - 1) !== 1, l = T(x - 1, y) !== 1 && T(x - 1, y) !== 4, r = T(x + 1, y) !== 1 && T(x + 1, y) !== 4;
  ctx.fillStyle = '#eaa65d'; ctx.fillRect(px, py, TS, TS);
  const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  ctx.fillStyle = '#cd8443';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 8 + ((h >> (i * 5)) & 31), py + 10 + ((h >> (i * 5 + 15)) & 27), 3 + (i & 1) * 2, 0, 7); ctx.fill(); }
  if (y > 0 && !up) { ctx.fillStyle = 'rgba(120,60,20,.08)'; ctx.fillRect(px, py, TS, 4); }
  if (l) { ctx.fillStyle = '#7a4420'; ctx.fillRect(px, py, 4, TS); }
  if (r) { ctx.fillStyle = '#7a4420'; ctx.fillRect(px + TS - 4, py, 4, TS); }
  if (up) {
    const x0 = px - (l ? 3 : 0), w = TS + (l ? 3 : 0) + (r ? 3 : 0);
    ctx.fillStyle = '#3faa2e'; ctx.fillRect(x0, py - 2, w, 16);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(px + 6 + i * 12, py + 13, 6.5, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = '#6fe04f'; ctx.fillRect(x0, py - 2, w, 9);
    ctx.fillStyle = '#b4f78a'; ctx.fillRect(px + 2, py, TS - 4, 3);
    ctx.fillStyle = '#2a6e1f'; ctx.fillRect(x0, py - 5, w, 3);
    if (l) { ctx.beginPath(); ctx.arc(px, py + 4, 7, 0, 7); ctx.fillStyle = '#3faa2e'; ctx.fill(); }
    if (r) { ctx.beginPath(); ctx.arc(px + TS, py + 4, 7, 0, 7); ctx.fillStyle = '#3faa2e'; ctx.fill(); }
  }
}
function drawStone(x, y, px, py) {
  ctx.fillStyle = '#46506b'; ctx.beginPath(); ctx.roundRect(px + 1, py + 1, TS - 2, TS - 2, 9); ctx.fill();
  ctx.fillStyle = '#9aa8cc'; ctx.beginPath(); ctx.roundRect(px + 4, py + 3, TS - 8, TS - 9, 7); ctx.fill();
  ctx.fillStyle = '#c6d0ee'; ctx.beginPath(); ctx.roundRect(px + 8, py + 7, TS - 26, 7, 4); ctx.fill();
  ctx.fillStyle = '#7f8bb0'; ctx.beginPath(); ctx.arc(px + TS - 14, py + TS - 15, 4, 0, 7); ctx.fill();
}
function drawPlank(x, y, px, py) {
  const l = T(x - 1, y) !== 2, r = T(x + 1, y) !== 2;
  ctx.fillStyle = '#6b3d1e'; ctx.beginPath(); ctx.roundRect(px - (l ? 0 : 1), py, TS + (l ? 0 : 1) + (r ? 0 : 1), 20, [l ? 9 : 0, r ? 9 : 0, r ? 9 : 0, l ? 9 : 0]); ctx.fill();
  ctx.fillStyle = '#d0904e'; ctx.beginPath(); ctx.roundRect(px + (l ? 3 : 0), py + 3, TS - (l ? 3 : 0) - (r ? 3 : 0), 13, [l ? 6 : 0, r ? 6 : 0, r ? 6 : 0, l ? 6 : 0]); ctx.fill();
  ctx.fillStyle = '#f0b878'; ctx.fillRect(px + (l ? 6 : 0), py + 5, TS - (l ? 6 : 0) - (r ? 6 : 0), 3);
  ctx.fillStyle = '#6b3d1e'; ctx.fillRect(px + TS - 2, py + 3, 2, 13);
  if (l) { ctx.strokeStyle = '#2f8a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + 10, py + 18); ctx.quadraticCurveTo(px + 4, py + 30, px + 12, py + 36); ctx.stroke(); }
}
function drawCrate(px, py) {
  ctx.fillStyle = '#6b3d1e'; ctx.beginPath(); ctx.roundRect(px + 2, py + 2, TS - 4, TS - 4, 6); ctx.fill();
  ctx.fillStyle = '#e39b4a'; ctx.beginPath(); ctx.roundRect(px + 6, py + 6, TS - 12, TS - 12, 3); ctx.fill();
  ctx.strokeStyle = '#9a5c28'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px + 10, py + 10); ctx.lineTo(px + TS - 10, py + TS - 10); ctx.moveTo(px + TS - 10, py + 10); ctx.lineTo(px + 10, py + TS - 10); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(px + 7, py + 7, TS - 14, 3);
}
function drawGate(px, py, y) {
  const wob = Math.sin(gT * 3 + y) * 3;
  ctx.fillStyle = '#5a1f8a'; ctx.beginPath(); ctx.roundRect(px + 4 + wob, py - 2, TS - 8, TS + 4, 14); ctx.fill();
  ctx.fillStyle = '#9b47e0'; ctx.beginPath(); ctx.roundRect(px + 9 + wob, py + 2, TS - 18, TS - 4, 10); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(px + 18 + wob, py + 12, 4, 0, 7); ctx.fill();
  if (y % 3 === 1) { ell(px + 18 + wob, py + 26, 5, 6, '#fff'); ell(px + 30 + wob, py + 26, 5, 6, '#fff'); ell(px + 19 + wob, py + 27, 2.2, 3, '#300'); ell(px + 31 + wob, py + 27, 2.2, 3, '#300'); }
}

// ----------------------------------------------------------- decor
const FLOWER_COLORS = ['#ff5fa2', '#ffcf3f', '#8d6bff', '#ff7a3d', '#3fd0ff'];
function drawPalm(d) {
  const sway = Math.sin(gT * 1.2 + d.ph) * 4, x = d.x, y = d.y, h = d.h, lean = d.lean * 22;
  const tx = x + lean + sway, ty = y - h;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b3d1e'; ctx.lineWidth = 17;
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x + lean * 0.2, y - h * 0.55, tx, ty); ctx.stroke();
  ctx.strokeStyle = '#b97b40'; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x + lean * 0.2, y - h * 0.55, tx, ty); ctx.stroke();
  ctx.strokeStyle = '#8a5225'; ctx.lineWidth = 2.5;
  for (let i = 1; i < 8; i++) {
    const t = i / 8, bx = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * (x + lean * 0.2) + t * t * tx, by = (1 - t) * (1 - t) * (y + 4) + 2 * (1 - t) * t * (y - h * 0.55) + t * t * ty;
    ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by + 2); ctx.stroke();
  }
  const angs = [-2.9, -2.3, -1.75, -1.25, -0.7, -0.15, 0.4, 2.7];
  angs.forEach((a, i) => {
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(a + Math.sin(gT * 1.6 + d.ph + i) * 0.06);
    ctx.fillStyle = i % 2 ? '#2f9e3a' : '#3fb84a'; ctx.strokeStyle = '#1e6b27'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(30, -14, 60, 8); ctx.quadraticCurveTo(30, 6, 0, 0); ctx.fill(); ctx.stroke();
    ctx.restore();
  });
  ell(tx - 6, ty + 7, 7, 7, '#7a4a22', OUT, 2); ell(tx + 6, ty + 8, 7, 7, '#8a5a2a', OUT, 2);
}
function drawBush(d) {
  const s = d.s, wig = Math.sin(d.b * 18) * d.b * 0.12;
  ctx.save(); ctx.translate(d.x, d.y + 2); ctx.scale(s * (1 + wig), s * (1 - wig));
  ctx.fillStyle = '#2a6e1f';
  for (const [x, y, r] of [[-22, -14, 17], [0, -24, 22], [22, -14, 17]]) { ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#4cc23f';
  for (const [x, y, r] of [[-22, -14, 17], [0, -24, 22], [22, -14, 17]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.fillRect(-36, -14, 72, 14);
  ctx.fillStyle = '#7be35f'; ctx.beginPath(); ctx.arc(-6, -32, 7, 0, 7); ctx.fill();
  const blink = (Math.sin(gT * 0.7 + d.ph * 3) > 0.97);
  if (blink) { ctx.fillStyle = '#163d12'; ctx.fillRect(-9, -18, 6, 2); ctx.fillRect(4, -18, 6, 2); }
  else { ell(-6, -18, 2.6, 4, '#163d12'); ell(7, -18, 2.6, 4, '#163d12'); }
  ctx.restore();
}
function drawFlower(d) {
  const sw = Math.sin(gT * 2 + d.ph) * 0.15;
  ctx.save(); ctx.translate(d.x, d.y);
  ctx.strokeStyle = '#2f8a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0, -10, Math.sin(sw) * 18, -20); ctx.stroke();
  ctx.translate(Math.sin(sw) * 18, -22); ctx.rotate(sw + gT * 0.3);
  ctx.fillStyle = FLOWER_COLORS[d.c];
  for (let i = 0; i < 5; i++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(0, -6, 4.5, 6, 0, 0, 7); ctx.fill(); }
  ell(0, 0, 4, 4, '#fff27a', '#c98a1a', 1.5);
  ctx.restore();
}
function drawShell(d) {
  ctx.save(); ctx.translate(d.x, d.y + 1);
  ctx.fillStyle = ['#ffc2d1', '#ffe0b3', '#e0d4ff'][d.c]; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-8, -12, 0, -12); ctx.quadraticCurveTo(8, -12, 8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10); ctx.moveTo(-4, 0); ctx.lineTo(-4, -8); ctx.moveTo(4, 0); ctx.lineTo(4, -8); ctx.stroke();
  ctx.restore();
}

function drawIslandFamily() {
  const f = L.family; if (!f) return;
  if (Math.abs(f.nestX - camX - W / 2) > W) return;
  const celebrate = (state === 'win' && winT > 0.6) || state === 'story';
  // nest back
  ell(f.nestX, f.y - 6, 92, 22, '#8a5a2a', OUT, 3);
  // papa
  const ph = celebrate ? Math.abs(Math.sin(gT * 5 + 1)) * 14 : 0;
  drawDuck({ x: f.papa.x, y: f.y - ph, face: -1, scale: 1.1, body: '#ffffff', light: '#f2f6ff', dark: '#dfe6f5', acc: 'cap', blink: Math.sin(gT * 0.9) > 0.97, happy: celebrate, wave: celebrate });
  // kids
  f.kids.forEach((k, i) => {
    const hop = celebrate ? Math.abs(Math.sin(gT * 7 + k.ph)) * (18 + i * 3) : Math.max(0, Math.sin(gT * 2.5 + k.ph)) * 4;
    drawDuckling(k.x, f.y - 8, -1, hop, celebrate);
  });
  // nest front rim
  ctx.fillStyle = '#a8703a'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(f.nestX + 20, f.y - 4, 70, 16, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#6b3d1e'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const x = f.nestX - 40 + i * 14; ctx.beginPath(); ctx.moveTo(x, f.y - 2); ctx.lineTo(x + 12, f.y + 8); ctx.stroke(); }
  if (state === 'play' && Math.abs(P.x - f.nestX) < 700) {
    const b = Math.sin(gT * 3) * 3;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(f.nestX - 70, f.y - 120 + b, 140, 40, 14); ctx.fill(); ctx.stroke();
    txt('Mama!! Help!', f.nestX, f.y - 100 + b, 18, '#e8262e', null);
  }
}
function drawIslandBug(e) {
  const cx = e.x + e.w / 2, by = e.y + e.h;
  ctx.save(); ctx.translate(cx, by);
  let sx = 1, sy = 1, alpha = 1;
  if (e.dead) {
    if (e.type === 'fly') { ctx.translate(0, -e.h / 2); ctx.rotate(e.deadT * 12); ctx.translate(0, e.h / 2); }
    else { sy = 0.3; sx = 1.35; }
    alpha = clamp(1 - (e.deadT - 0.35) / 0.45, 0, 1);
    if (e.type === 'boss') alpha = clamp(1 - (e.deadT - 0.6) / 0.6, 0, 1);
  }
  ctx.globalAlpha = alpha;
  const flash = e.inv > 0 && Math.floor(e.inv * 16) % 2 === 0;
  const k = e.w / 40;
  if (e.type === 'fly') {
    ctx.scale(e.dir, 1);
    const wf = Math.abs(Math.sin(gT * 45)) * 7 + 3;
    ell(-4, -30, 10, wf, 'rgba(225,245,255,.75)', '#7aa', 1.5, -0.4);
    ell(4, -31, 9, wf * 0.9, 'rgba(225,245,255,.75)', '#7aa', 1.5, 0.3);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-7, 2); ctx.moveTo(3, -8); ctx.lineTo(2, 3); ctx.stroke();
    ell(-4, -16, 13, 9, flash ? '#fff' : '#6e8a3e', OUT, 2.5);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-10, -22, 4, 13); ctx.fillRect(-2, -24, 4, 16);
    ell(-17, -17, 4, 3, '#3b2410');
    ell(10, -19, 8, 8, flash ? '#fff' : '#4d6630', OUT, 2.5);
    ell(13, -21, 4.5, 5, e.dead ? '#888' : '#ff3b3b', OUT, 1.5);
    ell(14, -22.5, 1.4, 1.4, '#fff');
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, -15); ctx.lineTo(25, -10); ctx.stroke();
    ctx.restore(); return;
  }
  // walkers + boss
  ctx.scale(sx * e.dir * k, sy * k);
  let shell = '#6a3fb8', shell2 = '#8f64e0', head = '#2b1a45';
  if (e.type === 'ladybug') { shell = '#e8352e'; shell2 = '#ff6a5e'; head = '#1d1d1d'; }
  if (e.type === 'armor') { shell = e.cracked ? '#6c8fb8' : '#3f6fb0'; shell2 = '#8fb6e8'; head = '#1d2a45'; }
  if (e.type === 'boss') { shell = e.hp <= 2 ? '#7a1f4a' : '#3b1d5e'; shell2 = e.hp <= 2 ? '#b03a6e' : '#6a3fa0'; head = '#1e0f30'; }
  if (flash) { shell = '#ffffff'; shell2 = '#ffffff'; }
  const walk = e.t * (e.type === 'boss' ? 16 : 14) * (e.cracked ? 3 : 1);
  ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) { const sw = e.dead ? 0 : Math.sin(walk + i * 2) * 4; ctx.beginPath(); ctx.moveTo(i * 10, -8); ctx.lineTo(i * 10 + sw - 3, 0); ctx.stroke(); }
  // antennae
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(16, -16); ctx.quadraticCurveTo(22, -28, 27, -27); ctx.moveTo(14, -16); ctx.quadraticCurveTo(16, -30, 20, -31); ctx.stroke();
  ell(27, -27, 2.5, 2.5, head); ell(20, -31, 2.5, 2.5, head);
  // shell
  ell(-3, -14, 19, 13, shell, OUT, 3);
  ctx.fillStyle = shell2; ctx.beginPath(); ctx.ellipse(-7, -19, 9, 4, -0.2, 0, 7); ctx.fill();
  if (e.type === 'ladybug') { ctx.fillStyle = '#1d1d1d'; for (const [x, y, r] of [[-12, -12, 3.5], [-2, -20, 3], [5, -10, 3.5], [-6, -6, 2.5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } }
  if (e.type === 'armor') {
    ctx.strokeStyle = '#d9e6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(10, -14); ctx.moveTo(-14, -8); ctx.lineTo(8, -8); ctx.stroke();
    if (e.cracked) { ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -27); ctx.lineTo(-1, -19); ctx.lineTo(-6, -14); ctx.lineTo(-2, -6); ctx.stroke(); }
  }
  if (e.type === 'boss') {
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, -25); ctx.lineTo(-12, -33); ctx.lineTo(-8, -27); ctx.lineTo(-4, -35); ctx.lineTo(0, -27); ctx.lineTo(4, -33); ctx.lineTo(6, -25); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; for (const [x, y] of [[-14, -12], [-4, -8], [6, -14]]) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); }
  }
  // head
  ell(15, -11, 8, 7, head, OUT, 2.5);
  if (e.type === 'armor' || e.type === 'boss') { ctx.fillStyle = head; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(19, -14); ctx.quadraticCurveTo(28, -18, 27, -26); ctx.quadraticCurveTo(24, -16, 21, -10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // eyes
  const sleeping = e.type === 'boss' && !e.active && !e.dead;
  if (e.dead) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(15, -15); ctx.lineTo(20, -10); ctx.moveTo(20, -15); ctx.lineTo(15, -10); ctx.stroke(); }
  else if (sleeping) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14, -12); ctx.lineTo(20, -12); ctx.stroke(); }
  else {
    ell(17.5, -12.5, 3.6, 4, e.type === 'boss' ? '#ffdd55' : '#fff');
    ell(18.8, -12, 1.8, 2.3, e.type === 'boss' ? '#d00' : '#111');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(13, -18); ctx.lineTo(21, -15.5); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// =====================================================================
//  INTRO: the Big Bug kidnaps the family. Silly, loud, ~15 s, skippable.
// =====================================================================
const ISLAND_INTRO_END = 14.8, HOME_NEST_X = 330, BOSS_LAND_X = 600;
const KID_HOME = [297, 319, 341, 363], PAPA_HOME = 440, HERO_X = 150;

function introBoss(t) {
  const gy = groundTop(10);
  if (t < 2.4) return null;
  let x = BOSS_LAND_X, y = gy, dir = -1;
  if (t < 2.9) y = lerp(-160, gy, Math.pow((t - 2.4) / 0.5, 2));
  if (t > 7.8 && t < 9.4) y -= Math.abs(Math.sin(t * 11)) * 8;
  if (t >= 9.4) dir = 1;
  if (t > 9.6) x += Math.pow(t - 9.6, 2) * 450 + (t - 9.6) * 120;
  return { x, y, dir };
}
function kidSlot(b, i) { return { x: b.x + [-40, -16, 8, 32][i] * (b.dir < 0 ? 1 : -1), y: b.y - 100 }; }
function updateIslandIntro(dt) {
  const p = introT; introT += dt;
  const hit = t => p < t && introT >= t, gy = groundTop(10);
  if (hit(1.95)) { shake = 6; SFX.rumble(); }
  if (hit(2.4)) { shake = 9; SFX.rumble(); }
  if (hit(2.9)) { shake = 22; SFX.slam(); SFX.roar(); dust(BOSS_LAND_X, gy, 22, 3); }
  if (hit(3.3)) SFX.villain();
  for (let i = 0; i < 5; i++) if (hit(6.2 + i * 0.22)) SFX.whoosh();
  if (hit(6.25)) SFX.hurt();
  if (hit(7.9)) SFX.villain();
  if (hit(9.6)) SFX.jump();
  if (hit(11.0)) { SFX.angry(); shake = 5; }
  if (hit(13.0)) { SFX.checkpoint(); confetti(W / 2, 260, 30); }
  const b = introBoss(introT);
  if (b && introT > 9.6 && b.x < 1150 && Math.random() < dt * 40) addPart({ type: 'dust', x: b.x - 50 + rand(-10, 10), y: b.y - 4, vx: rand(-160, -40), vy: rand(-80, -10), drag: 4, life: .5, size: rand(8, 14), color: '#fff' });
  if (introT > 10.6 && introT < 13 && Math.random() < dt * 6) addPart({ type: 'spark', x: islandHeroX(introT) + rand(-30, 30), y: gy - 70 + rand(-20, 20), vx: rand(-60, 60), vy: rand(-120, -40), drag: 3, life: .4, size: 4, color: '#ff6b2b' });
  if (introT >= ISLAND_INTRO_END) startPlay();
}
function islandHeroX(t) { return t < 9.7 ? HERO_X : HERO_X + Math.min(1, (t - 9.7) / 0.9) * 275; }
function drawNest(x, y, empty) {
  ell(x, y - 6, 70, 18, '#8a5a2a', OUT, 3);
  if (empty) { // a lonely feather in the empty nest
    ctx.save(); ctx.translate(x + 10, y - 14); ctx.rotate(-0.5); ell(0, 0, 10, 3.5, '#fff0a6', OUT, 1.5); ctx.restore();
  }
}
function drawNestFront(x, y) {
  ctx.fillStyle = '#a8703a'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y - 4, 64, 15, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#6b3d1e'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) { const xx = x - 50 + i * 13; ctx.beginPath(); ctx.moveTo(xx, y - 2); ctx.lineTo(xx + 11, y + 8); ctx.stroke(); }
}

function drawIslandIntro() {
  const t = introT, gy = groundTop(10), b = introBoss(t);
  const scared = t > 1.95 && t < 2.9;
  // nest (back)
  drawNest(HOME_NEST_X, gy, t > 7.2);
  // hero
  const running = t > 9.7 && t < 10.6;
  let ham = REST + Math.sin(gT * 3) * 0.04;
  if (t > 10.6) ham = -1.57 + Math.sin(gT * 22) * 0.18;
  const hop = scared ? Math.abs(Math.sin((t - 1.95) * 9)) * 14 : (t > 10.6 && t < 13 ? Math.abs(Math.sin(gT * 9)) * 6 : 0);
  drawDuck({ x: islandHeroX(t), y: gy - hop, face: 1, scale: 1.12, run: t * 14, moving: running, body: '#ffd23f', light: '#fff0a6', dark: '#f0b400',
    acc: 'bandana', ham, happy: t < 1.95, determined: t > 2.9, blink: false });
  // papa
  const papaU = clamp((t - 7.08) / 0.45, 0, 1);
  let px = PAPA_HOME, py = gy, pface = t > 2.9 ? 1 : -1;
  if (b && t > 7.08) { const sl = { x: b.x + 52 * (b.dir < 0 ? 1 : -1), y: b.y - 96 }; px = lerp(PAPA_HOME, sl.x, papaU); py = lerp(gy, sl.y, papaU) - Math.sin(Math.PI * papaU) * 120; pface = -b.dir; }
  drawDuck({ x: px, y: py - (scared ? Math.abs(Math.sin((t - 2) * 9)) * 12 : 0), face: pface, scale: 1.1, body: '#ffffff', light: '#f2f6ff', dark: '#dfe6f5', acc: 'cap', happy: t < 1.95, wave: t > 7.5 && t < 11 });
  // ducklings
  KID_HOME.forEach((hx, i) => {
    const g0 = 6.2 + i * 0.22, u = clamp((t - g0) / 0.45, 0, 1);
    let x = hx, y = gy - 8, face = -1, hop = t < 1.95 ? Math.max(0, Math.sin(gT * 3 + i)) * 5 : scared ? Math.abs(Math.sin((t - 2) * 10 + i)) * 10 : 0;
    if (b && t > g0) { const sl = kidSlot(b, i); x = lerp(hx, sl.x, u); y = lerp(gy - 8, sl.y, u) - Math.sin(Math.PI * u) * 110; face = -b.dir; hop = u >= 1 ? Math.abs(Math.sin(gT * 14 + i)) * 4 : 0; }
    drawDuckling(x, y, face, hop, t > 6.5);
  });
  drawNestFront(HOME_NEST_X, gy);
  // the Big Bug
  if (b) {
    drawBug({ type: 'boss', x: b.x - 60, y: b.y - 88, w: 120, h: 88, dir: b.dir, t: t > 9.6 ? t * 2.5 : t * 0.4, dead: false, inv: 0, active: true, hp: 5 });
    if (t > 6.6) { // net sack with the family inside
      ctx.save(); ctx.globalAlpha = 0.85;
      const sx = b.x + 6 * (b.dir < 0 ? 1 : -1);
      ell(sx, b.y - 94, 74, 15, 'rgba(160,110,60,.6)', OUT, 3);
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
      for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(sx + k * 16 - 6, b.y - 108); ctx.lineTo(sx + k * 16 + 6, b.y - 80); ctx.stroke(); }
      ctx.strokeStyle = '#6b3d1e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 70, b.y - 92); ctx.lineTo(sx - 40, b.y - 70); ctx.moveTo(sx + 70, b.y - 92); ctx.lineTo(sx + 40, b.y - 70); ctx.stroke();
      ctx.restore();
    }
    if (t > 7.8 && t < 9.4) { // nyah nyah tongue
      const hx = b.x + b.dir * 72, hy = b.y - 24;
      ell(hx, hy, 12 + Math.sin(gT * 20) * 3, 6, '#ff6b8b', OUT, 2);
    }
  }
  // "?!"
  if (scared) { txt('?!', HERO_X + 6, gy - 92, 28, '#ff4d4d', OUT); txt('?!', PAPA_HOME, gy - 90, 26, '#ff4d4d', OUT); txt('?!', 330, gy - 60, 24, '#ff4d4d', OUT); }
  // speech
  if (t > 0.3 && t < 1.95) bubble(330, gy - 52, 'We love you, Mama! ♥', 0.3);
  if (t > 1.0 && t < 1.95) bubble(HERO_X + 10, gy - 92, 'Quack! What a lovely day!', 1.0);
  if (t > 3.3 && t < 5.7 && b) bubble(b.x - 20, b.y - 120, 'MWAHAHA! What cute little\nducklings you have there!', 3.3, { color: '#c2185b', shake: true });
  if (t > 5.6 && t < 6.2) bubble(330, gy - 52, 'Eek!', 5.6);
  if (t > 6.3 && t < 7.8 && b) bubble(b.x, b.y - 165, 'HEEELP! MAMAAA!', 6.3, { size: 20, shake: true });
  if (t > 7.9 && t < 9.4 && b) bubble(b.x - 30, b.y - 165, "You'll NEVER catch me,\nHAMMER DUCK! Nyah nyah!", 7.9, { color: '#c2185b', shake: true });
  if (t > 9.4 && t < 10.5 && b) bubble(Math.min(b.x, 900), b.y - 165, 'BYE-BYEEE!', 9.4, { color: '#c2185b', size: 22 });
  if (t > 10.2 && t < 11.2) txt('Mamaaaa...!', 960, gy - 170 - (t - 10.2) * 20, 20, '#fff', OUT);
  if (t > 11.0 && t < 13.2) bubble(islandHeroX(t) + 10, gy - 112, "GRRR! Hold on, kids...\nMAMA'S COMING!", 11.0, { size: 20, color: '#e8262e', shake: true });
}
function drawIslandIntroOverlay() {
  const bar = 44 * Math.min(1, introT * 2) * (introT > ISLAND_INTRO_END - 0.4 ? (ISLAND_INTRO_END - introT) / 0.4 : 1);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  if (introT < 1.8) txt('Meanwhile, on sunny Duck Island...', W / 2, 90, 26, '#fff', OUT);
  if (introT > 13.0) {
    const s = easeOut(Math.min(1, (introT - 13) / 0.3));
    ctx.save(); ctx.translate(W / 2, 200); ctx.scale(s, s); rainbowTitle('GET THEM BACK!', 0, 0, 76, gT); ctx.restore();
  }
  if (bar > 20 && !touchMode) txt('ENTER = skip', W - 80, H - 22, 14, '#aaa', null);
}

// ---------------------------------------------------------------- bug types of this world
Object.assign(EDEF, {
  beetle: { w: 40, h: 30, speed: 55, hp: 1, draw: drawIslandBug },
  ladybug: { w: 38, h: 28, speed: 100, hp: 1, draw: drawIslandBug },
  armor: { w: 46, h: 34, speed: 42, hp: 2, draw: drawIslandBug },
  fly: { w: 36, h: 30, hp: 1, fly: true, fallsWhenDead: true, update: updateWasp, draw: drawIslandBug },
  boss: { w: 120, h: 88, speed: 100, hp: 5, boss: true, update: updateBoss, draw: drawIslandBug,
    onHurt(e, dir) { e.kb = 0.35; e.vx = dir * 380; e.vy = -350; e.state = 'walk'; e.t = 0; } },
});

function drawIslandTile(t, x, y, px, py) {
  if (t === 1) drawGround(x, y, px, py);
  else if (t === 2) drawPlank(x, y, px, py);
  else if (t === 3) drawCrate(px, py);
  else if (t === 4) drawStone(x, y, px, py);
  else if (t === 6) drawGate(px, py, y);
}
function drawIslandDecor(d) {
  if (d.type === 'palm') drawPalm(d); else if (d.type === 'bush') drawBush(d); else if (d.type === 'flower') drawFlower(d); else drawShell(d);
}

registerWorld({
  name: 'Duck Island',
  width: 262, startCol: 2, goalCol: GOAL_COL,
  arena: { L: ARENA_L, R: ARENA_R },
  winStopX: 242.6 * TS, winCamX: 245.5 * TS - W / 2,
  bossName: 'BIG BUG BOSS', bossDefeatText: 'BIG BUG BEATEN!', gateColor: '#b25cff', hudBug: 'beetle',
  gameOverLine: 'The bugs won this time... but the ducklings still need you!',
  win: { title: 'ISLAND SAVED!', line: 'The duckling family is safe and sound!', seedName: 'Sunseeds', bossLabel: '+ the Big Bug',
    allLine: '☀ ALL 100 SUNSEEDS!  The sun is laughing with joy! ☀' },
  tracks: ISLAND_TRACKS,
  build: buildIsland,
  drawBackground: drawIslandBackground,
  drawWater: drawIslandWater,
  drawTile: drawIslandTile,
  drawDecor: drawIslandDecor,
  drawFamily: drawIslandFamily,
  drawWorld() { // the empty nest at the start of the level
    if (state !== 'intro' && state !== 'title' && camX < 700) { drawNest(HOME_NEST_X, groundTop(6), true); drawNestFront(HOME_NEST_X, groundTop(6)); }
  },
  drawScreen() { // warm sunshine when the sun is laughing
    if (sunJoy <= 0.01) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(925, 150, 60, 925, 150, 1000);
    g.addColorStop(0, 'rgba(255,220,120,' + (0.16 * sunJoy) + ')'); g.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  winUpdate(dt) {
    if (allSeeds() && winT > 1.2 && Math.random() < dt * 1.3) pops.push({ x: camX + 905 + rand(-70, 50), y: camY + 250 + rand(-5, 45), text: Math.random() < 0.5 ? 'HA HA!' : 'HO HO!', color: '#ffb300', size: 22, burst: false, t: 0, life: 1.1, drift: 1 });
  },
  intro: {
    end: ISLAND_INTRO_END,
    update: updateIslandIntro, draw: drawIslandIntro, overlay: drawIslandIntroOverlay, heroX: islandHeroX,
    track: t => t < 1.9 ? 'calm' : (t > 2.5 && t < 11.2) ? 'boss' : null,
  },
});
