'use strict';
// =====================================================================
//  HAMMER DUCK — shared engine
//  Physics, the duck & her hammer, enemies framework, HUD, screens, main loop.
//  Worlds (worlds/*.js) plug in through registerWorld() and the WORLD hooks.
// =====================================================================
const W = 1024, H = 576, TS = 48, ROWS = 12;
const G = 2300, JUMPV = 880, MAXV = 320, MAXFALL = 950, STEP_DT = 1 / 120;
const FONT = '"Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';
const OUT = '#3b2410';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let scale = 1, dpr = 1;
function resize() {
  dpr = window.devicePixelRatio || 1;
  scale = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = (W * scale) + 'px'; cv.style.height = (H * scale) + 'px';
  cv.width = Math.round(W * scale * dpr); cv.height = Math.round(H * scale * dpr);
}
addEventListener('resize', resize); resize();

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}

// ---------------------------------------------------------------- utils
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const rand = (a, b) => a + Math.random() * (b - a);
const aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- input
const keys = {};
let jumpBuf = 0, atkBuf = 0, downBuf = 0, throwBuf = 0;
// keyboard: SPACE jump · H hammer · J slam · G throw · ↓ slam (air) / crouch (ground)
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
const ATK_KEYS = ['KeyH', 'KeyX'];
const SLAM_KEYS = ['KeyJ', 'ArrowDown', 'KeyS'];
const THROW_KEYS = ['KeyG'];
let pad = {}, padPrev = {};
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  initAudio();
  if (e.repeat) return;
  keys[e.code] = true;
  if (JUMP_KEYS.includes(e.code)) jumpBuf = 0.13;
  if (SLAM_KEYS.includes(e.code)) downBuf = 0.1;
  if (ATK_KEYS.includes(e.code)) atkBuf = 0.12;
  if (THROW_KEYS.includes(e.code)) throwBuf = 0.12;
  onPress(e.code);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (state === 'play') state = 'pause'; });
addEventListener('pointerdown', () => initAudio());

function pollPad() {
  padPrev = pad; pad = {};
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let p = null; for (const x of pads || []) if (x) { p = x; break; }
  if (!p) return;
  const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
  pad = { left: ax < -0.4 || b(14), right: ax > 0.4 || b(15), down: ay > 0.5 || b(13), jump: b(0), atk: b(1), throw: b(2), slam: b(3), start: b(9) };
  if (pad.jump && !padPrev.jump) { jumpBuf = 0.13; initAudio(); onPress('Space'); }
  if (pad.atk && !padPrev.atk) atkBuf = 0.12;
  if (pad.throw && !padPrev.throw) throwBuf = 0.12;
  if ((pad.down && !padPrev.down) || (pad.slam && !padPrev.slam)) downBuf = 0.1;
  if (pad.start && !padPrev.start) onPress('Enter');
}
function input() {
  return {
    left: keys.ArrowLeft || keys.KeyA || pad.left,
    right: keys.ArrowRight || keys.KeyD || pad.right,
    down: keys.ArrowDown || keys.KeyS || pad.down,
    jump: keys.Space || keys.ArrowUp || keys.KeyW || pad.jump,
  };
}

// ---------------------------------------------------------------- audio
let actx = null, master = null, musicGain = null, nbuf = null, muted = false;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = actx.createGain(); master.gain.value = 0.55; master.connect(actx.destination);
  musicGain = actx.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master);
  nbuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function tone(freq, dur, type = 'square', vol = 0.15, slide = 0, when = 0, dest, attack = 0) {
  if (!actx || muted) return;
  const t = when || actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); }
  else g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur, vol = 0.3, freq = 1200, when = 0, dest) {
  if (!actx || muted) return;
  const t = when || actx.currentTime;
  const s = actx.createBufferSource(); s.buffer = nbuf;
  const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
}
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const SFX = {
  jump: () => tone(330, 0.16, 'square', 0.09, 2.4),
  swing: () => noise(0.14, 0.22, 2600),
  smash: () => { tone(180, 0.22, 'square', 0.2, 0.35); noise(0.2, 0.4, 700); tone(880, 0.1, 'triangle', 0.14, 1.6, actx && actx.currentTime + 0.05); },
  thud: () => { tone(120, 0.12, 'triangle', 0.18, 0.5); noise(0.08, 0.15, 500); },
  seed: () => { tone(988, 0.06, 'square', 0.08); tone(1319, 0.16, 'square', 0.08, 1, actx && actx.currentTime + 0.06); },
  heart: () => { [660, 880, 1100].forEach((f, i) => tone(f, 0.12, 'triangle', 0.15, 1, actx && actx.currentTime + i * 0.07)); },
  hurt: () => { tone(420, 0.3, 'sawtooth', 0.14, 0.35); },
  crate: () => { noise(0.18, 0.35, 1400); tone(220, 0.1, 'triangle', 0.18, 0.5); },
  spring: () => tone(180, 0.35, 'triangle', 0.22, 4.5),
  slam: () => { tone(90, 0.4, 'sawtooth', 0.22, 0.3); noise(0.35, 0.5, 400); },
  checkpoint: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.08, 1, actx && actx.currentTime + i * 0.08)); },
  die: () => { [600, 500, 400, 300, 200].forEach((f, i) => tone(f, 0.16, 'square', 0.1, 0.9, actx && actx.currentTime + i * 0.12)); },
  roar: () => { tone(110, 0.8, 'sawtooth', 0.25, 0.5); noise(0.7, 0.3, 300); },
  bossHit: () => { tone(140, 0.3, 'square', 0.22, 0.5); noise(0.25, 0.4, 900); },
  splash: () => { noise(0.4, 0.35, 900); },
  laugh: () => {
    if (!actx) return; const t = actx.currentTime;
    [392, 370, 349, 330].forEach((f, i) => {
      const w = t + i * 0.21;
      noise(0.05, 0.035, 1600, w);
      tone(f, 0.17, 'triangle', 0.13, 0.9, w + 0.02, null, 0.03);
      tone(f * 2, 0.14, 'sine', 0.03, 0.9, w + 0.02, null, 0.03);
    });
  },
  villain: () => { // silly low "bwa-ha-ha-ha"
    if (!actx) return; const t = actx.currentTime;
    [150, 140, 131, 122, 115].forEach((f, i) => { noise(0.04, 0.05, 900, t + i * 0.16); tone(f, 0.13, 'square', 0.09, 0.82, t + i * 0.16 + 0.02, null, 0.02); });
  },
  rumble: () => { noise(0.6, 0.35, 120); tone(55, 0.6, 'sawtooth', 0.12, 0.7); },
  whoosh: () => { noise(0.15, 0.2, 2200); tone(500, 0.15, 'triangle', 0.06, 2); },
  angry: () => { tone(330, 0.12, 'square', 0.1, 1.5); tone(392, 0.16, 'square', 0.1, 1.4, actx && actx.currentTime + 0.14); },
  ready: () => { if (!actx) return; const t = actx.currentTime; [660, 990, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.09, 1, t + i * 0.06)); },
  denied: () => tone(160, 0.08, 'square', 0.05, 0.8),
  throwIt: () => { noise(0.18, 0.3, 2400); tone(500, 0.18, 'triangle', 0.12, 1.8); },
  catchIt: () => { tone(880, 0.06, 'square', 0.08); tone(1320, 0.12, 'triangle', 0.1, 1, actx && actx.currentTime + 0.05); noise(0.05, 0.15, 1200); },
  win: () => {
    if (!actx) return; const t = actx.currentTime;
    const seq = [[72, 0], [76, .14], [79, .28], [84, .42], [79, .62], [84, .76]];
    seq.forEach(([m, d]) => tone(midi(m), 0.22, 'square', 0.12, 1, t + d));
    [72, 76, 79, 84].forEach(m => tone(midi(m), 1.4, 'triangle', 0.1, 1, t + 0.95));
  },
};

let nextNote = 0, stepIdx = 0, curTrack = null;
function currentMusic() {
  if (state === 'title') return WORLDS[0].tracks.main;
  if (state === 'story') return STORY.track(storyT);
  if (state === 'intro') { const n = WORLD.intro.track(introT); return n ? WORLD.tracks[n] : null; }
  const tr = WORLD.tracks;
  if (state === 'play') return boss && boss.dead ? tr.hero : (boss && boss.active ? tr.boss : tr.main);
  if (state === 'win' && winT > 2.6) return tr.calm;
  return null;
}
function trackName() { // for tests
  if (!curTrack) return null;
  for (const w of WORLDS) for (const k in w.tracks) if (w.tracks[k] === curTrack) return k;
  return 'other';
}
function music() {
  if (!actx || muted) { curTrack = null; return; }
  const tr = currentMusic();
  if (!tr) { curTrack = null; return; }
  if (tr !== curTrack) { curTrack = tr; stepIdx = 0; nextNote = actx.currentTime + 0.08; }
  if (nextNote < actx.currentTime - 0.3) nextNote = actx.currentTime + 0.05;
  const b = 60 / tr.bpm / 2;
  while (nextNote < actx.currentTime + 0.25) { tr.play(stepIdx, nextNote, b); nextNote += b; stepIdx++; }
}

// ---------------------------------------------------------------- level
let LW = 262, tiles, L, P, boss;
// ---- worlds
const WORLDS = [];
let WORLD = null;
function registerWorld(w) { WORLDS.push(w); }
const worldIndex = () => WORLDS.indexOf(WORLD);
function unlocked() { try { return Math.max(1, +localStorage.getItem('hammerduck.unlocked') || 1); } catch (e) { return 1; } }
function unlock(n) { try { if (n > unlocked()) localStorage.setItem('hammerduck.unlocked', String(n)); } catch (e) {} }
let state = 'title', camX = 0, camY = 0, shake = 0, freeze = 0, gT = 0, titleT = 0, winT = 0, playTime = 0;
const stats = { bugs: 0, seeds: 0 };
const T = (x, y) => (x < 0 || x >= LW) ? 4 : (y < 0 || y >= ROWS) ? 0 : tiles[y * LW + x];
const setT = (x, y, v) => { if (x >= 0 && x < LW && y >= 0 && y < ROWS) tiles[y * LW + x] = v; };
// tiles: 1 ground · 2 one-way plank · 3 crate · 4 stone · 6 boss gate · 7 snow · 8 ice · 9 cracking ice · 10 ice block
const SOLID = t => t === 1 || t === 3 || t === 4 || t === 6 || t === 7 || t === 8 || t === 9 || t === 10;
const ICY = t => t === 8 || t === 9;
function groundTop(col) { for (let y = 0; y < ROWS; y++) { const t = T(col, y); if (SOLID(t) || t === 2) return y * TS; } return ROWS * TS; }

// Bug types are registered by the worlds: { w, h, hp, speed?, fly?, boss?, init?, update?, draw, canHit?, onHurt?, harmless? }
const EDEF = {};
const STAND_H = 48, CROUCH_H = 30;
const START_LIVES = 3, MAX_LIVES = 9;
let goT = 0, sunJoy = 0, introT = 0, storyT = 0;
const allSeeds = () => stats.seeds >= L.totalSeeds;

// ---- level builder helpers handed to WORLD.build(B)
function makeBuilder() {
  const B = {};
  B.ground = (a, b, h, t = 1) => { for (let x = a; x <= b; x++) for (let y = ROWS - h; y < ROWS; y++) setT(x, y, t); };
  B.plat = (x, y, w) => { for (let i = 0; i < w; i++) setT(x + i, y, 2); };
  B.block = (x, y, w, h, t = 4) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) setT(x + i, y + j, t); };
  B.crate = (x, y, loot = 'seeds') => { setT(x, y, 3); L.crateLoot[x + ',' + y] = loot; if (loot === 'seeds') L.totalSeeds += 3; };
  B.seeds = (x, y, n = 1) => { for (let i = 0; i < n; i++) { L.items.push({ kind: 'seed', x: (x + i) * TS + TS / 2, y: y * TS + TS / 2, t: Math.random() * 6 }); L.totalSeeds++; } };
  B.seedsV = (x, y, n) => { for (let i = 0; i < n; i++) { L.items.push({ kind: 'seed', x: x * TS + TS, y: (y + i) * TS + TS / 2, t: Math.random() * 6 }); L.totalSeeds++; } };
  B.seedArc = (x, y, n) => { for (let i = 0; i < n; i++) { L.items.push({ kind: 'seed', x: (x + i) * TS + TS / 2, y: y * TS + TS / 2 - Math.sin(Math.PI * i / (n - 1)) * 60, t: Math.random() * 6 }); L.totalSeeds++; } };
  B.bug = (type, x, row) => {
    const d = EDEF[type];
    const e = { type, w: d.w, h: d.h, hp: d.hp, vx: 0, vy: 0, dir: -1, t: Math.random() * 5, dead: false, deadT: 0, inv: 0, kb: 0, awake: false };
    e.x = x * TS + TS / 2 - d.w / 2;
    if (d.fly) { e.y = row * TS; e.ox = e.hx = e.x; e.oy = e.hy = e.y; e.st = 'hover'; e.cd = 1.2; e.side = 0; }
    else e.y = (row !== undefined ? row * TS : groundTop(x)) - d.h;
    if (d.init) d.init(e, x, row);
    if (d.boss) { e.sx = e.x; e.sy = e.y; e.active = false; e.state = 'sleep'; e.faceT = 0; e.zt = 0; boss = e; }
    else L.totalBugs++;
    L.enemies.push(e);
    return e;
  };
  B.spring = (x, row) => L.springs.push({ x: x * TS, y: row * TS, w: TS, h: TS, comp: 0 });
  B.cp = x => L.cps.push({ x: x * TS + TS / 2, y: groundTop(x), active: false, raise: 0 });
  B.sign = (x, text) => L.signs.push({ x: x * TS + TS / 2, y: groundTop(x), text });
  B.mover = (x1, y1, x2, y2, w, period) => L.movers.push({ x: x1 * TS, y: y1 * TS, ax: x1 * TS, ay: y1 * TS, bx: x2 * TS, by: y2 * TS, w: w * TS, h: 20, period, t: 0, dx: 0, dy: 0 });
  B.gate = col => { for (let y = 0; y < ROWS - 2; y++) setT(col, y, 6); };
  return B;
}
function buildLevel() {
  LW = WORLD.width;
  tiles = new Uint8Array(LW * ROWS);
  L = { enemies: [], items: [], springs: [], cps: [], movers: [], signs: [], decor: [], crateLoot: {}, totalSeeds: 0, totalBugs: 0, family: null, shots: [] };
  boss = null;
  WORLD.build(makeBuilder());
  L.spawns = L.enemies.filter(e => !EDEF[e.type].boss).map(e => ({ ...e }));
}

function newPlayer() {
  const p = { x: (WORLD.startCol || 2) * TS, y: 0, w: 32, h: 48, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, hearts: 3, lives: START_LIVES, inv: 0, hurtT: 0,
    hasHammer: true, throwCD: 0, swinging: false, swingT: 0, swingCD: 0, hitSet: new Set(), thud: false, pound: false, poundT: 0, sx: 1, sy: 1, run: 0,
    dead: false, deadT: 0, rot: 0, riding: null, lastGroundY: 0, springBoost: false, blink: 2, look: 60, prevBottom: 0, splashed: false };
  const sc = WORLD.startCol || 2;
  p.spawn = { x: sc * TS + TS / 2, y: groundTop(sc) };
  p.y = p.spawn.y - p.h; p.lastGroundY = p.spawn.y;
  return p;
}
// start world i (0-based). Lives carry over when moving on to the next world.
function startWorld(i, withIntro, carryLives) {
  const lives = carryLives && P ? P.lives : START_LIVES;
  WORLD = WORLDS[i]; resetGame(); P.lives = lives;
  if (withIntro && WORLD.intro) { state = 'intro'; introT = 0; } else state = 'play';
  jumpBuf = atkBuf = downBuf = throwBuf = 0;
}
function goTitle() { WORLD = WORLDS[0]; resetGame(); state = 'title'; titleT = 0; }
function resetGame() {
  buildLevel(); P = newPlayer();
  camX = 0; camY = 0; shake = 0; freeze = 0; playTime = 0; winT = 0;
  parts.length = 0; pops.length = 0; stats.bugs = 0; stats.seeds = 0; sunJoy = 0;
  jumpBuf = 0; atkBuf = 0; downBuf = 0; throwBuf = 0; thrown = null;
}

// ---------------------------------------------------------------- physics
function moveBody(b, dt) {
  b.hitL = b.hitR = b.hitHead = false;
  b.x += b.vx * dt;
  const top = Math.floor(b.y / TS), bot = Math.floor((b.y + b.h - 0.01) / TS);
  if (b.vx > 0) {
    const cx = Math.floor((b.x + b.w) / TS);
    for (let ty = top; ty <= bot; ty++) if (SOLID(T(cx, ty))) { b.x = cx * TS - b.w; b.vx = 0; b.hitR = true; break; }
  } else if (b.vx < 0) {
    const cx = Math.floor(b.x / TS);
    for (let ty = top; ty <= bot; ty++) if (SOLID(T(cx, ty))) { b.x = (cx + 1) * TS; b.vx = 0; b.hitL = true; break; }
  }
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt;
  b.onGround = false;
  const l = Math.floor(b.x / TS), r = Math.floor((b.x + b.w - 0.01) / TS);
  if (b.vy > 0) {
    const cy = Math.floor((b.y + b.h) / TS);
    for (let tx = l; tx <= r; tx++) {
      const t = T(tx, cy);
      if (SOLID(t) || (t === 2 && prevBottom <= cy * TS + 0.5)) { b.y = cy * TS - b.h; b.vy = 0; b.onGround = true; break; }
    }
  } else if (b.vy < 0) {
    const cy = Math.floor(b.y / TS);
    for (let tx = l; tx <= r; tx++) if (SOLID(T(tx, cy))) { b.y = (cy + 1) * TS; b.vy = 0; b.hitHead = true; break; }
  }
}

// ---------------------------------------------------------------- effects
const parts = [], pops = [];
function addPart(p) { const o = Object.assign({ vx: 0, vy: 0, g: 0, life: 1, size: 6, rot: 0, vr: 0, color: '#fff', type: 'dust', drag: 0 }, p); o.max = o.life; parts.push(o); }
function burstStars(x, y, n = 8, sp = 1) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rand(-.2, .2), s = rand(180, 340) * sp;
    addPart({ type: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, g: 600, life: rand(.5, .8), size: rand(7, 12), vr: rand(-8, 8), color: ['#ffe14d', '#ffffff', '#ff9de2', '#7cf0ff'][i % 4] }); }
}
function dust(x, y, n = 6, sp = 1) { for (let i = 0; i < n; i++) addPart({ type: 'dust', x: x + rand(-10, 10), y: y - rand(0, 6), vx: rand(-140, 140) * sp, vy: rand(-90, -10), drag: 4, life: rand(.3, .55), size: rand(6, 11), color: '#fff' }); }
function chips(x, y) { for (let i = 0; i < 12; i++) addPart({ type: 'chip', x: x + rand(-14, 14), y: y + rand(-14, 14), vx: rand(-260, 260), vy: rand(-520, -150), g: 1500, life: rand(.6, 1), size: rand(6, 12), vr: rand(-12, 12), color: ['#e39b4a', '#8a5225', '#c97a35'][i % 3] }); }
function confetti(x, y, n = 30) { for (let i = 0; i < n; i++) addPart({ type: 'confetti', x: x + rand(-30, 30), y, vx: rand(-320, 320), vy: rand(-750, -350), g: 900, life: rand(1.6, 2.6), size: rand(7, 11), vr: rand(-10, 10), color: ['#ff4d6d', '#ffd23f', '#3fd0ff', '#7dff6b', '#c77dff', '#ff9a1f'][i % 6] }); }
function popup(x, y, text, color = '#ffe14d', size = 30, burst = true) { pops.push({ x, y, text, color, size, burst, t: 0, life: 0.9 }); }
const SMASH_WORDS = ['SMASH!', 'BONK!', 'POW!', 'WHAM!', 'THWACK!', 'KA-BONK!'];
function updateFx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy += p.g * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    if (p.type === 'confetti') { p.vx *= 0.985; if (p.vy > 140) p.vy = 140; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
  for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > pops[i].life) pops.splice(i, 1); }
}

// ---------------------------------------------------------------- game logic
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  else { const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) { const r = req.call(el); if (r && r.catch) r.catch(() => {}); } }
}
cv.addEventListener('dblclick', toggleFullscreen);
document.addEventListener('fullscreenchange', resize); document.addEventListener('webkitfullscreenchange', resize);
function onPress(code) {
  if (code === 'KeyF') { toggleFullscreen(); return; }
  if (code === 'KeyM') { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.55; return; }
  if (state === 'title' && (code === 'Enter' || code === 'Space')) { startWorld(0, true); return; }
  if (state === 'title' && code === 'Digit2' && unlocked() >= 2) { startWorld(1, true); return; }
  if (state === 'intro' && (code === 'Enter' || code === 'Space' || code === 'Escape')) { startPlay(); return; }
  if (state === 'story' && (code === 'Enter' || code === 'Space' || code === 'Escape')) { STORY.finish(); return; }
  if (state === 'play' && (code === 'Escape' || code === 'KeyP')) { state = 'pause'; return; }
  if (state === 'pause' && (code === 'Escape' || code === 'KeyP' || code === 'Enter')) { state = 'play'; return; }
  if (state === 'gameover' && goT > 1 && (code === 'Enter' || code === 'Space')) { startWorld(worldIndex(), false); return; }
  if (state === 'win' && winT > 3 && (code === 'Enter' || code === 'Space')) {
    if (worldIndex() < WORLDS.length - 1) { state = 'story'; storyT = 0; }
    else if (winT > 6) goTitle();
  }
}

const REST = -1.9;
function swingAngle(t) {
  if (t < 0.07) return lerp(REST, -2.75, easeOut(t / 0.07));
  if (t < 0.15) return lerp(-2.75, 0.6, easeOut((t - 0.07) / 0.08));
  if (t < 0.3) return lerp(0.6, REST, easeInOut((t - 0.15) / 0.15));
  return REST;
}
function swingRect() { return P.face > 0 ? { x: P.x + P.w - 12, y: P.y - 22, w: 80, h: P.h + 26 } : { x: P.x - 80 + 12, y: P.y - 22, w: 80, h: P.h + 26 }; }
function squash(sx, sy) { P.sx = sx; P.sy = sy; }

function updatePlayer(dt) {
  const inp = input();
  if (P.dead) {
    P.deadT += dt; P.vy += G * dt; P.y += P.vy * dt; P.rot += dt * 7;
    if (P.deadT > 1.6) { if (P.lives <= 0) { state = 'gameover'; goT = 0; } else respawn(); }
    return;
  }
  P.rideIce = !!(P.riding && P.riding.ice);
  if (P.riding) { P.x += P.riding.dx; P.y += P.riding.dy; P.riding = null; }
  P.inv -= dt; P.hurtT -= dt; P.swingCD -= dt;
  let dir = 0, jumpHeld = false, down = false;
  if (state === 'play') { dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0); jumpHeld = inp.jump; down = inp.down; }
  else if (state === 'win') { dir = P.x + P.w / 2 < WORLD.winStopX ? 1 : 0; jumpBuf = 0; atkBuf = 0; }
  if (P.pound || P.hurtT > 0) dir = 0;

  // crouch (duck!): hold down while standing
  const wantCrouch = state === 'play' && P.onGround && inp.down && !P.pound && jumpBuf <= 0;
  if (wantCrouch && !P.crouch) { P.crouch = true; P.y += STAND_H - CROUCH_H; P.h = CROUCH_H; }
  else if (!wantCrouch && P.crouch) {
    const l = Math.floor(P.x / TS), r = Math.floor((P.x + P.w - 0.01) / TS), ty = Math.floor((P.y - (STAND_H - CROUCH_H)) / TS);
    let room = true; for (let tx = l; tx <= r; tx++) if (SOLID(T(tx, ty))) room = false;
    if (room || !P.onGround) { P.crouch = false; P.y -= STAND_H - CROUCH_H; P.h = STAND_H; }
  }
  if (P.crouch) dir = 0;

  // horizontal (ice is slippery; crouching on ice = belly slide that keeps its speed)
  const under = T(Math.floor((P.x + P.w / 2) / TS), Math.floor((P.y + P.h + 2) / TS));
  P.onIce = P.onGround && (ICY(under) || P.rideIce);
  const accel = P.onGround ? (P.onIce ? 700 : 2800) : 1800;
  const fric = P.onGround ? (P.onIce ? (P.crouch ? 90 : 240) : 2600) : 700;
  const maxV = state === 'win' ? 200 : MAXV;
  if (dir) {
    if (Math.sign(P.vx) !== dir && P.vx !== 0) P.vx += dir * fric * dt;
    const prev = Math.abs(P.vx);
    P.vx += dir * accel * dt; P.face = dir;
    if (Math.abs(P.vx) > maxV) P.vx = Math.sign(P.vx) * Math.max(maxV, Math.min(Math.abs(P.vx), prev - 1500 * dt));
  } else {
    const d = fric * dt; P.vx = Math.abs(P.vx) <= d ? 0 : P.vx - Math.sign(P.vx) * d;
  }

  // jump
  P.coyote = P.onGround ? 0.1 : P.coyote - dt;
  if (jumpBuf > 0 && P.coyote > 0 && !P.pound) {
    P.vy = -JUMPV; P.coyote = 0; jumpBuf = 0; P.onGround = false; squash(0.72, 1.3); SFX.jump(); dust(P.x + P.w / 2, P.y + P.h, 4, 0.6);
  }

  // slam: just press down while in the air
  if (P.onGround) downBuf = 0;
  if (state === 'play' && downBuf > 0 && !P.onGround && !P.pound && P.hurtT <= 0 && P.hasHammer) {
    downBuf = 0; atkBuf = 0; P.pound = true; P.poundT = 0; P.vx = 0; P.swinging = false; SFX.swing();
  }
  // hammer throw
  // special move recharge (starts once the hammer is back in her wing)
  if (P.hasHammer && P.throwCD > 0) {
    P.throwCD -= dt;
    if (P.throwCD <= 0) {
      P.throwCD = 0; SFX.ready();
      popup(P.x + P.w / 2, P.y - 24, 'THROW READY!', '#9fe7ff', 20, false);
      for (let k = 0; k < 10; k++) addPart({ type: 'spark', x: P.x + P.w / 2 + rand(-24, 24), y: P.y + rand(-10, 40), vx: rand(-60, 60), vy: rand(-160, -40), drag: 3, life: .5, size: 3.5, color: k % 2 ? '#9fe7ff' : '#fff6b0' });
    }
  }
  if (state === 'play' && throwBuf > 0 && P.hasHammer && !P.pound && P.hurtT <= 0) {
    throwBuf = 0;
    if (P.throwCD <= 0) throwHammer(); else SFX.denied();
  }
  // attack
  if (atkBuf > 0 && P.swingCD <= 0 && !P.pound && P.hurtT <= 0 && P.hasHammer) {
    atkBuf = 0;
    { P.swinging = true; P.swingT = 0; P.swingCD = 0.32; P.hitSet = new Set(); P.thud = false; SFX.swing(); }
  }
  if (P.swinging) {
    P.swingT += dt;
    if (!P.thud && P.swingT > 0.15) {
      P.thud = true;
      if (P.onGround) { const hx = P.x + P.w / 2 + P.face * 52; if (SOLID(T(Math.floor(hx / TS), Math.floor((P.y + P.h + 4) / TS)))) { dust(hx, P.y + P.h, 5, 0.7); shake = Math.max(shake, 3); SFX.thud(); } }
    }
    if (P.swingT >= 0.3) P.swinging = false;
  }

  // gravity
  if (P.pound) {
    P.poundT += dt;
    if (P.poundT < 0.16) { P.vy = 0; P.vx = 0; }
    else {
      P.vy = 1400;
      const l = Math.floor(P.x / TS), r = Math.floor((P.x + P.w - 0.01) / TS), ty = Math.floor((P.y + P.h + P.vy * dt + 1) / TS);
      for (let tx = l; tx <= r; tx++) if (T(tx, ty) === 3) { breakCrate(tx, ty); freeze = 0.04; shake = Math.max(shake, 6); }
    }
  } else {
    const mult = (P.vy < 0 && !jumpHeld && !P.springBoost) ? 2.4 : 1;
    P.vy = Math.min(P.vy + G * mult * dt, MAXFALL);
  }
  if (P.vy >= 0) P.springBoost = false;

  const wasGround = P.onGround, fallV = P.vy;
  P.prevBottom = P.y + P.h;
  const ext = P.extVx || 0; P.extVx = 0; // e.g. wind gusts
  P.vx += ext;
  moveBody(P, dt);
  if (P.hitL || P.hitR) P.vx = 0; else P.vx -= ext;
  if (P.hitHead) P.springBoost = false;

  // moving platforms
  if (P.vy >= 0 && !P.onGround) {
    for (const m of L.movers) {
      if (P.x + P.w > m.x + 2 && P.x < m.x + m.w - 2 && P.prevBottom <= m.y - m.dy + 6 && P.y + P.h >= m.y) {
        P.y = m.y - P.h; P.vy = 0; P.onGround = true; P.riding = m; break;
      }
    }
  }
  if (P.pound && P.onGround) endPound();
  if (!wasGround && P.onGround && fallV > 300) { squash(1.25, 0.8); dust(P.x + P.w / 2, P.y + P.h, 5, 0.8); }

  // animation helpers
  P.sx += (1 - P.sx) * Math.min(1, dt * 12); P.sy += (1 - P.sy) * Math.min(1, dt * 12);
  if (P.onGround) P.lastGroundY = P.y + P.h;
  if (P.onGround) P.run += Math.abs(P.vx) * dt * 0.05;
  P.sliding = P.crouch && P.onGround && Math.abs(P.vx) > 140;
  if (P.sliding && Math.random() < dt * 30) addPart({ type: 'dust', x: P.x + P.w / 2 - P.face * 14, y: P.y + P.h, vx: -P.vx * 0.3 + rand(-30, 30), vy: rand(-80, -20), drag: 4, life: .35, size: rand(5, 9), color: '#fff' });
  P.blink -= dt; if (P.blink < -0.12) P.blink = rand(1.5, 4);

  // water
  if (!P.splashed && P.y + P.h > ROWS * TS - 30) {
    P.splashed = true; SFX.splash();
    for (let i = 0; i < 18; i++) addPart({ type: 'drop', x: P.x + P.w / 2 + rand(-20, 20), y: ROWS * TS - 40, vx: rand(-200, 200), vy: rand(-650, -250), g: 1600, life: rand(.5, .9), size: rand(4, 8), color: '#bff0ff' });
  }
  if (P.y > ROWS * TS + 40) { P.dead = true; P.deadT = 0.8; P.vy = 0; P.hearts = 0; P.lives--; SFX.die(); }
}

// ---- Thor-style hammer throw: spins forward, smashes everything, flies back to your hand
let thrown = null;
const THROW_RELOAD = 5;
function throwHammer() {
  P.hasHammer = false; P.swinging = false; P.throwAnim = 0.22; squash(1.18, 0.88);
  thrown = { x: P.x + P.w / 2 + P.face * 28, y: P.y + (P.crouch ? P.h * 0.5 : 20), dir: P.face, v: 950, phase: 'out', rot: -1.2, t: 0, hitSet: new Set(), whoosh: 0, trail: [] };
  SFX.throwIt();
}
function catchHammer() {
  thrown = null; P.hasHammer = true; P.throwCD = THROW_RELOAD; squash(0.88, 1.12); SFX.catchIt();
  for (let k = 0; k < 8; k++) addPart({ type: 'spark', x: P.x + P.w / 2 + P.face * 10, y: P.y + 16, vx: rand(-160, 160), vy: rand(-160, 60), drag: 5, life: .3, size: 3.5, color: k % 2 ? '#fff6b0' : '#9fe7ff' });
}
function updateThrown(dt) {
  const h = thrown; if (!h) return;
  h.t += dt; h.rot += h.dir * 26 * dt;
  h.trail.unshift({ x: h.x, y: h.y, rot: h.rot }); if (h.trail.length > 4) h.trail.pop();
  h.whoosh -= dt; if (h.whoosh <= 0) { h.whoosh = 0.12; noise(0.1, 0.13, 1800 + Math.random() * 900); }
  if (Math.random() < dt * 30) addPart({ type: 'spark', x: h.x + rand(-14, 14), y: h.y + rand(-14, 14), vx: rand(-40, 40), vy: rand(-40, 40), drag: 4, life: .28, size: rand(2.5, 4.5), color: Math.random() < 0.3 ? '#9fe7ff' : '#fff6b0' });
  if (h.phase === 'out') {
    h.v -= 1150 * dt; h.x += h.dir * Math.max(0, h.v) * dt;
    const tx = Math.floor((h.x + h.dir * 22) / TS), ty = Math.floor(h.y / TS), t = T(tx, ty);
    if (SOLID(t) && t !== 3) {
      h.phase = 'back'; h.v = 200; h.hitSet = new Set(); SFX.thud(); shake = Math.max(shake, 4);
      for (let k = 0; k < 6; k++) addPart({ type: 'spark', x: h.x + h.dir * 20, y: h.y, vx: -h.dir * rand(60, 240), vy: rand(-200, 200), drag: 4, life: .3, size: 3.5, color: '#fff' });
    } else if (h.v <= 0) { h.phase = 'back'; h.v = 0; h.hitSet = new Set(); }
  } else {
    const tx = P.x + P.w / 2, ty = P.y + P.h * 0.45, dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
    h.v = Math.min(1150, h.v + 2800 * dt);
    if (d < 30 || h.t > 4) { if (!P.dead) catchHammer(); else { thrown = null; P.hasHammer = true; } return; }
    const st = Math.min(d, h.v * dt); h.x += dx / d * st; h.y += dy / d * st;
  }
  // smash bugs and crates it passes through
  const r = { x: h.x - 26, y: h.y - 26, w: 52, h: 52 };
  let hit = 0;
  for (const e of L.enemies) if (!e.dead && e.awake !== false && !h.hitSet.has(e) && aabb(r, e)) {
    h.hitSet.add(e); if (hitEnemy(e, Math.sign(e.x + e.w / 2 - h.x) || h.dir, 'throw')) hit++;
  }
  hit += breakCratesIn(r);
  if (WORLD.onHammerArea) hit += WORLD.onHammerArea(r, 'throw') || 0;
  if (hit) { freeze = Math.max(freeze, 0.04); shake = Math.max(shake, 6); }
}
function drawHammerAt(x, y, rot, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1.12, 1.12); ctx.translate(-43, 24);
  drawHammer(0); ctx.restore(); ctx.globalAlpha = 1;
}
function drawThrown() {
  const h = thrown; if (!h) return;
  for (let i = h.trail.length - 1; i >= 1; i--) drawHammerAt(h.trail[i].x, h.trail[i].y, h.trail[i].rot, 0.12 + 0.08 * (h.trail.length - i));
  ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(h.x, h.y, 46, h.rot, h.rot + h.dir * 1.6, h.dir < 0); ctx.stroke(); ctx.restore();
  drawHammerAt(h.x, h.y, h.rot);
}

function endPound() {
  P.pound = false; P.swingCD = 0.2; squash(1.45, 0.65); shake = Math.max(shake, 12); freeze = 0.05; SFX.slam();
  const cx = P.x + P.w / 2, by = P.y + P.h;
  dust(cx, by, 14, 2.2);
  for (let i = 0; i < 2; i++) addPart({ type: 'ring', x: cx, y: by - 4, life: 0.35, size: 20 + i * 10, vx: 0, vy: 0 });
  const r = { x: P.x - 56, y: P.y + P.h - 52, w: P.w + 112, h: 58 };
  for (const e of L.enemies) if (!e.dead && e.awake !== false && aabb(r, e)) hitEnemy(e, Math.sign(e.x + e.w / 2 - cx) || 1, 'slam');
  breakCratesIn(r);
  if (WORLD.onHammerArea) WORLD.onHammerArea(r, 'slam');
}

function hurtPlayer(srcX) {
  if (P.inv > 0 || P.dead || state !== 'play') return;
  P.hearts--; P.inv = 1.4; P.hurtT = 0.3; P.pound = false; P.swinging = false;
  P.vx = (P.x + P.w / 2 < srcX ? -1 : 1) * 380; P.vy = -480; shake = Math.max(shake, 10); SFX.hurt();
  popup(P.x + P.w / 2, P.y - 10, 'OUCH!', '#ff6b8b', 26, false);
  if (P.hearts <= 0) { P.dead = true; P.deadT = 0; P.vy = -760; P.rot = 0; P.lives--; SFX.die(); }
}
function respawn() {
  const s = P.spawn;
  P.h = STAND_H; P.crouch = false;
  Object.assign(P, { x: s.x - P.w / 2, y: s.y - P.h, vx: 0, vy: 0, dead: false, hearts: 3, inv: 1.5, rot: 0, pound: false, swinging: false, splashed: false, riding: null, hurtT: 0, face: 1, hasHammer: true, throwCD: 0 });
  thrown = null;
  if (boss && !boss.dead && boss.active) {
    Object.assign(boss, { active: false, awake: false, state: 'sleep', hp: EDEF[boss.type].hp, inv: 0, kb: 0, t: 0, x: boss.sx, y: boss.sy, vx: 0, vy: 0, dir: -1 });
    for (let y = 0; y < ROWS - 2; y++) if (T(WORLD.arena.L, y) === 6) setT(WORLD.arena.L, y, 0);
  }
  if (WORLD.onRespawn) WORLD.onRespawn();
  // every bug comes back (the boss keeps its own state)
  L.enemies = L.spawns.map(e => ({ ...e }));
  if (boss) L.enemies.push(boss);
  camX = clamp(P.x - W * 0.4, 0, LW * TS - W);
}

function breakCrate(tx, ty) {
  setT(tx, ty, 0);
  const cx = tx * TS + TS / 2, cy = ty * TS + TS / 2;
  chips(cx, cy); SFX.crate();
  const loot = L.crateLoot[tx + ',' + ty];
  if (loot === 'seeds') for (let i = 0; i < 3; i++) L.items.push({ kind: 'seed', x: cx, y: cy, vx: (i - 1) * 140 + rand(-30, 30), vy: rand(-620, -420), phys: true, age: 0, t: 0 });
  if (loot === 'heart') L.items.push({ kind: 'heart', x: cx, y: cy, vx: 0, vy: -520, phys: true, age: 0, t: 0 });
}
function breakCratesIn(r) {
  let n = 0;
  for (let tx = Math.floor(r.x / TS); tx <= Math.floor((r.x + r.w) / TS); tx++)
    for (let ty = Math.floor(r.y / TS); ty <= Math.floor((r.y + r.h) / TS); ty++)
      if (T(tx, ty) === 3) { breakCrate(tx, ty); n++; }
  return n;
}

// src: 'swing' | 'slam' | 'throw' | 'slide' | 'shot' (a batted snowball) | 'boss' (boss defeat clears minions)
function hitEnemy(e, dir, src = 'swing') {
  if (e.dead || e.inv > 0) return false;
  const d = EDEF[e.type], cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  if (d.boss && !e.active) return false;
  if (d.canHit && !d.canHit(e, src, dir)) return false;
  e.hp--;
  if (d.boss) {
    burstStars(cx, cy, 10); shake = 16; freeze = 0.08;
    if (e.hp <= 0) { killBoss(e); return true; }
    e.inv = d.hurtInv || 1.0; SFX.bossHit();
    if (d.onHurt) d.onHurt(e, dir, src);
    const words = d.hurtWords || ['BONK!', 'OOF!', 'WHACK!', 'CRUNCH!'];
    popup(cx, e.y - 10, words[e.hp % words.length], '#ffe14d', 40);
    return true;
  }
  if (e.hp <= 0) {
    e.dead = true; e.deadT = 0; stats.bugs++;
    if (d.fallsWhenDead) { e.vy = -250; }
    SFX.smash(); burstStars(cx, cy, 8);
    popup(cx, e.y - 16, src === 'slide' ? 'SLIDE-BONK!' : src === 'shot' ? 'RETURN TO SENDER!' : SMASH_WORDS[Math.floor(Math.random() * SMASH_WORDS.length)]);
  } else {
    e.inv = 0.35; e.kb = 0.3; e.vx = dir * 300; e.vy = -300; e.cracked = true; SFX.bossHit();
    popup(cx, e.y - 16, 'CRACK!', '#9fe7ff', 26);
    burstStars(cx, cy, 4, 0.6);
  }
  return true;
}
function killBoss(e) {
  e.dead = true; e.deadT = 0; e.active = false;
  SFX.smash(); SFX.roar();
  setTimeout(() => SFX.checkpoint(), 500);
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  burstStars(cx, cy, 24, 1.6); confetti(cx, cy, 40);
  popup(cx, e.y - 30, WORLD.bossDefeatText, '#ffe14d', 46);
  for (let x of [WORLD.arena.L, WORLD.arena.R]) for (let y = 0; y < ROWS; y++) if (T(x, y) === 6) {
    setT(x, y, 0);
    for (let i = 0; i < 3; i++) addPart({ type: 'goo', x: x * TS + rand(0, TS), y: y * TS + rand(0, TS), vx: rand(-120, 120), vy: rand(-300, 0), g: 900, life: rand(.5, 1), size: rand(6, 12), color: WORLD.gateColor });
  }
  if (L.shots) L.shots.length = 0;
  for (let i = 0; i < 6; i++) L.items.push({ kind: 'seed', x: cx, y: cy, vx: rand(-300, 300), vy: rand(-700, -400), phys: true, age: 0, t: 0 });
  L.items.push({ kind: 'heart', x: cx, y: cy, vx: 0, vy: -650, phys: true, age: 0, t: 0 });
  for (const m of L.enemies) if (m.minion && !m.dead) hitEnemy(m, 1, 'boss');
}

// waking the boss closes the arena behind you (shared by all worlds)
function shouldWakeBoss(b) { return !b.dead && state === 'play' && !P.dead && P.x > (WORLD.arena.L + 4) * TS; }
function wakeBoss(b, text) {
  b.active = true; b.awake = true; b.t = 0;
  for (let y = 0; y < ROWS - 2; y++) setT(WORLD.arena.L, y, 6);
  shake = 18; SFX.roar(); popup(b.x + b.w / 2, b.y - 30, text, '#ff6b8b', 40);
}
function bossSnore(b, dt) {
  b.zt += dt;
  if (b.zt > 1.3 && Math.abs(b.x - P.x) < W) { b.zt = 0; pops.push({ x: b.x + b.w * 0.75, y: b.y - 10, text: 'z', color: '#ffffff', size: 26, burst: false, t: 0, life: 1.2, drift: 1 }); }
}
function updateMovers(dt) {
  for (const m of L.movers) {
    if (m.update) { m.update(m, dt); continue; }
    m.t += dt;
    const f = 0.5 - 0.5 * Math.cos(m.t / m.period * Math.PI * 2);
    const nx = lerp(m.ax, m.bx, f), ny = lerp(m.ay, m.by, f);
    m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
  }
}

function updateEnemies(dt) {
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  for (let i = L.enemies.length - 1; i >= 0; i--) {
    const e = L.enemies[i];
    const d = EDEF[e.type];
    if (e.dead) {
      e.deadT += dt;
      if (d.fallsWhenDead) { e.vy += G * dt; e.y += e.vy * dt; }
      if (e.deadT > 0.8 && !d.boss) L.enemies.splice(i, 1);
      continue;
    }
    if (d.boss) { d.update(e, dt); continue; }
    if (!e.awake) { if (Math.abs(e.x - P.x) < W * 0.75) e.awake = true; else continue; }
    e.t += dt; e.inv -= dt; e.kb -= dt;
    if (d.update) { d.update(e, dt); if (e.y > ROWS * TS + 100) L.enemies.splice(i, 1); continue; }
    const sp = EDEF[e.type].speed * (e.cracked ? 4.5 : 1);
    if (e.kb <= 0) e.vx = e.dir * sp; else e.vx *= 0.96;
    e.vy = Math.min(e.vy + G * dt, MAXFALL);
    moveBody(e, dt);
    if (e.kb <= 0) {
      if (e.hitL) e.dir = 1; else if (e.hitR) e.dir = -1;
      else if (e.onGround) {
        const fx = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
        const t = T(Math.floor(fx / TS), Math.floor((e.y + e.h + 4) / TS));
        if (!SOLID(t) && t !== 2) e.dir *= -1;
      }
    }
    if (e.y > ROWS * TS + 100) L.enemies.splice(i, 1);
  }
}


function combat() {
  if (P.dead) return;
  // hammer swing
  if (P.swinging && P.swingT >= 0.08 && P.swingT <= 0.21) {
    const r = swingRect(); let hit = 0;
    for (const e of L.enemies) if (!e.dead && e.awake !== false && !P.hitSet.has(e) && aabb(r, e)) { P.hitSet.add(e); if (hitEnemy(e, P.face, 'swing')) hit++; }
    hit += breakCratesIn(r);
    if (WORLD.onHammerArea) hit += WORLD.onHammerArea(r, 'swing') || 0;
    if (hit) { freeze = Math.max(freeze, 0.06); shake = Math.max(shake, 7); }
  }
  // slam falling through enemies
  if (P.pound && P.vy > 0) {
    const r = { x: P.x - 6, y: P.y + P.h - 14, w: P.w + 12, h: 28 };
    for (const e of L.enemies) if (!e.dead && e.awake !== false && aabb(r, e)) {
      if (hitEnemy(e, Math.sign(e.x + e.w / 2 - P.x - P.w / 2) || 1, 'slam') && EDEF[e.type].boss) { P.pound = false; P.vy = -700; P.inv = Math.max(P.inv, 0.4); }
    }
  }
  // contact damage
  const pr = { x: P.x + 5, y: P.y + 8, w: P.w - 10, h: P.h - 10 };
  for (const e of L.enemies) {
    const d = EDEF[e.type];
    if (e.dead || e.awake === false || (d.boss && !e.active) || (d.harmless && d.harmless(e))) continue;
    const er = { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - (d.fly ? 2 : 6) };
    if (!aabb(pr, er)) continue;
    if (P.sliding && !d.boss) { hitEnemy(e, Math.sign(P.vx) || 1, 'slide'); continue; } // belly slide bowls bugs over
    hurtPlayer(e.x + e.w / 2); break;
  }
}

function updateItems(dt) {
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  for (let i = L.items.length - 1; i >= 0; i--) {
    const it = L.items[i]; it.t += dt;
    if (it.phys) {
      it.age += dt;
      const b = { x: it.x - 9, y: it.y - 9, w: 18, h: 18, vx: it.vx, vy: Math.min(it.vy + G * 0.8 * dt, MAXFALL) };
      moveBody(b, dt);
      if (b.onGround) b.vx *= 0.9;
      it.x = b.x + 9; it.y = b.y + 9; it.vx = b.vx; it.vy = b.vy;
      if (it.y > ROWS * TS + 50) { L.items.splice(i, 1); continue; }
      if (it.age < 0.25) continue;
    }
    if (P.dead) continue;
    if (Math.abs(it.x - px) < 32 && Math.abs(it.y - py) < 38) {
      L.items.splice(i, 1);
      if (it.kind === 'seed') { stats.seeds++; SFX.seed(); for (let k = 0; k < 5; k++) addPart({ type: 'spark', x: it.x, y: it.y, vx: rand(-150, 150), vy: rand(-150, 150), drag: 5, life: .35, size: 4, color: WORLD.seedSpark || '#fff3a0' }); }
      else if (P.hearts < 3) { P.hearts++; SFX.heart(); popup(it.x, it.y - 20, '+♥', '#ff6b8b', 30, false); }
      else { P.lives = Math.min(MAX_LIVES, P.lives + 1); SFX.checkpoint(); popup(it.x, it.y - 20, '1-UP!', '#7dff6b', 34, true); burstStars(it.x, it.y, 8); }
    }
  }
}

function updateWorldBits(dt) {
  // springs
  for (const s of L.springs) {
    s.comp = Math.max(0, s.comp - dt * 4);
    const top = s.y + 18;
    if (!P.dead && P.vy > 0 && P.x + P.w > s.x + 8 && P.x < s.x + s.w - 8 && P.prevBottom <= top + 10 && P.y + P.h >= top) {
      P.y = top - P.h; P.vy = -1300; P.springBoost = true; P.pound = false; P.onGround = false; s.comp = 1;
      SFX.spring(); squash(0.65, 1.4);
      for (let k = 0; k < 8; k++) addPart({ type: 'spark', x: s.x + TS / 2 + rand(-20, 20), y: top, vx: rand(-120, 120), vy: rand(-300, -100), drag: 3, life: .4, size: 4, color: '#fff' });
    }
  }
  // checkpoints
  for (const c of L.cps) {
    if (c.active) { c.raise = Math.min(1, c.raise + dt * 2); continue; }
    if (!P.dead && P.x + P.w / 2 > c.x - 10) {
      c.active = true; P.spawn = { x: c.x + 30, y: c.y }; SFX.checkpoint();
      burstStars(c.x, c.y - 90, 10); popup(c.x, c.y - 140, 'CHECKPOINT!', '#7dff6b', 30, false);
    }
  }
  // bushes wiggle
  for (const d of L.decor) if (d.type === 'bush') {
    d.b = Math.max(0, d.b - dt * 2.5);
    if (Math.abs(d.x - (P.x + P.w / 2)) < 30 && Math.abs(d.y - (P.y + P.h)) < 20 && Math.abs(P.vx) > 50 && d.b < 0.2) d.b = 1;
  }
  // goal
  if (state === 'play' && !P.dead && P.x > WORLD.goalCol * TS) { state = 'win'; winT = 0; P.swinging = false; P.pound = false; unlock(worldIndex() + 2); }
}

function updateCamera(dt) {
  let tx;
  if (state === 'win') tx = WORLD.winCamX;
  else { P.look = lerp(P.look, P.face * 70, Math.min(1, dt * 2)); tx = P.x + P.w / 2 - W * 0.45 + P.look; }
  let minX = 0, maxX = LW * TS - W;
  if (boss && boss.active && !boss.dead) { minX = WORLD.arena.L * TS; maxX = (WORLD.arena.R + 1) * TS - W; }
  tx = clamp(tx, minX, maxX);
  camX += (tx - camX) * Math.min(1, dt * 7);
  const ty = P.dead ? camY : Math.min(0, P.y - 170);
  camY += (ty - camY) * Math.min(1, dt * 5);
}

function step(dt) {
  gT += dt;
  if (freeze > 0) { freeze -= dt; return; }
  jumpBuf -= dt; atkBuf -= dt; downBuf -= dt; throwBuf -= dt;
  if (state === 'play') playTime += dt;
  if (state === 'win') {
    const before = winT; winT += dt;
    if (before < 0.9 && winT >= 0.9) SFX.win();
    if (WORLD.winUpdate) WORLD.winUpdate(dt, before);
    if (winT > 0.9 && Math.floor(winT / 0.7) !== Math.floor(before / 0.7) && winT < 9) confetti(lerp(camX + 150, camX + W - 150, Math.random()), camY + H * 0.55, 26);
    if (winT > 1 && Math.random() < dt * 3) { const k = L.family.kids[Math.floor(Math.random() * L.family.kids.length)]; addPart({ type: 'heart', x: k.x, y: L.family.y - 40, vx: rand(-30, 30), vy: -90, life: 1.4, size: 14, color: '#ff6b8b' }); }
  }
  updateMovers(dt);
  updatePlayer(dt);
  updateThrown(dt);
  updateEnemies(dt);
  if (WORLD.update) WORLD.update(dt);
  combat();
  updateItems(dt);
  updateWorldBits(dt);
  updateFx(dt);
  updateCamera(dt);
  sunJoy += ((state === 'win' && winT > 1 && allSeeds() ? 1 : 0) - sunJoy) * Math.min(1, dt * 2);
  shake = Math.max(0, shake - dt * 40);
}

// =====================================================================
//  RENDERING
// =====================================================================
function ell(x, y, rx, ry, fill, stroke, lw = 3, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function heartPath(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); ctx.closePath();
}
function starPath(x, y, r, rot = 0, pts = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) { const a = rot + i * Math.PI / pts - Math.PI / 2, rr = i % 2 ? r * inner : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}
function txt(s, x, y, size, fill = '#fff', stroke = OUT, align = 'center', lw) {
  ctx.font = `bold ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (stroke) { ctx.lineWidth = lw || Math.max(3, size * 0.2); ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}


function drawTiles(cx) {
  const c0 = Math.max(0, Math.floor(cx / TS) - 1), c1 = Math.min(LW - 1, Math.floor((cx + W) / TS) + 1);
  for (let x = c0; x <= c1; x++) for (let y = 0; y < ROWS; y++) {
    const t = tiles[y * LW + x]; if (!t) continue;
    const px = x * TS, py = y * TS;
    WORLD.drawTile(t, x, y, px, py);
  }
}

function drawSign(s) {
  ctx.font = `bold 15px ${FONT}`;
  const tw = ctx.measureText(s.text).width + 24, bh = 34;
  ctx.fillStyle = '#6b3d1e'; ctx.fillRect(s.x - 4, s.y - 56, 8, 56);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.roundRect(s.x - tw / 2 - 3, s.y - 96, tw + 6, bh + 6, 9); ctx.fill();
  ctx.fillStyle = '#ffe3b0'; ctx.beginPath(); ctx.roundRect(s.x - tw / 2, s.y - 93, tw, bh, 7); ctx.fill();
  ctx.fillStyle = '#6b3d1e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.text, s.x, s.y - 76);
}
function drawCheckpoint(c) {
  ctx.fillStyle = OUT; ctx.fillRect(c.x - 4, c.y - 120, 8, 120);
  ctx.fillStyle = '#e8eef8'; ctx.fillRect(c.x - 2, c.y - 118, 4, 118);
  ell(c.x, c.y - 124, 8, 8, c.active ? '#ffd23f' : '#aab', OUT, 2.5);
  const fy = c.y - 40 - c.raise * 72;
  ctx.fillStyle = c.active ? '#3fd04f' : '#d9534f'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(c.x + 4, fy - 14);
  for (let i = 0; i <= 10; i++) ctx.lineTo(c.x + 4 + i * 4.5, fy - 14 + Math.sin(gT * 6 + i * 0.6) * 3 * (i / 10));
  for (let i = 10; i >= 0; i--) ctx.lineTo(c.x + 4 + i * 4.5, fy + 14 + Math.sin(gT * 6 + i * 0.6) * 3 * (i / 10));
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (c.active) { ell(c.x + 26, fy, 7, 6, '#ffd23f', OUT, 1.5); ell(c.x + 32, fy + 1, 3, 2, '#ff9a1f'); }
}
function drawSpring(s) {
  const c = s.comp, h = 30 - c * 14, bx = s.x + TS / 2, by = s.y + TS;
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.roundRect(bx - 20, by - 8, 40, 8, 3); ctx.fill();
  ctx.strokeStyle = '#8d93a8'; ctx.lineWidth = 4;
  ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(bx + (i % 2 ? 12 : -12), by - 8 - i * h / 6); ctx.stroke();
  const ty = by - 8 - h;
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.roundRect(bx - 22, ty - 10, 44, 12, 6); ctx.fill();
  ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.roundRect(bx - 20, ty - 8, 40, 8, 4); ctx.fill();
  ctx.fillStyle = '#ffb3c1'; ctx.fillRect(bx - 14, ty - 7, 16, 2);
}
function drawMover(m) {
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.roundRect(m.x, m.y, m.w, m.h, 10); ctx.fill();
  ctx.fillStyle = '#c98a4b'; ctx.beginPath(); ctx.roundRect(m.x + 3, m.y + 3, m.w - 6, m.h - 7, 7); ctx.fill();
  ctx.fillStyle = '#eab06e'; ctx.fillRect(m.x + 8, m.y + 5, m.w - 16, 3);
  ctx.strokeStyle = OUT; ctx.lineWidth = 2;
  for (let x = m.x + 24; x < m.x + m.w - 10; x += 24) { ctx.beginPath(); ctx.moveTo(x, m.y + 3); ctx.lineTo(x, m.y + m.h - 4); ctx.stroke(); }
  // leaf propeller underneath
  const sp = Math.sin(gT * 30) * 0.5 + 0.5;
  ell(m.x + m.w / 2, m.y + m.h + 6, 18 * sp + 4, 5, '#4cc23f', '#1e6b27', 2);
  ell(m.x + m.w / 2, m.y + m.h + 2, 4, 4, '#ffd23f', OUT, 1.5);
}
function drawItem(it) {
  const bob = it.phys ? 0 : Math.sin(it.t * 3) * 4;
  if (it.kind === 'seed' && WORLD.drawSeed) WORLD.drawSeed(it, bob);
  else if (it.kind === 'seed') {
    const sx = Math.cos(it.t * 3);
    ctx.save(); ctx.translate(it.x, it.y + bob); ctx.scale(0.35 + Math.abs(sx) * 0.65, 1);
    ell(0, 0, 10, 13, '#ffcf2a', OUT, 2.5);
    ell(0, 0, 5, 8, '#ffe98a');
    ell(-3, -5, 2, 3, '#fff');
    ctx.restore();
  } else {
    ctx.save(); ctx.translate(it.x, it.y + bob);
    const s = 1 + Math.sin(it.t * 6) * 0.08; ctx.scale(s, s);
    heartPath(0, -12, 26); ctx.fillStyle = '#ff4d6d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
  }
}

// ----------------------------------------------------------- characters
// Duck drawn facing right, origin at feet center.
function drawDuck(o) {
  const S = o.scale || 1;
  ctx.save(); ctx.translate(o.x, o.y);
  if (o.rot) { ctx.translate(0, -26 * S); ctx.rotate(o.rot); ctx.translate(0, 26 * S); }
  ctx.scale(o.face * (o.sx || 1) * S, (o.sy || 1) * S);
  const run = o.run || 0;
  const hamBehind = o.ham !== undefined && o.ham < -1.05;
  const cr = o.crouch || 0, bodyDY = cr * 5, headDX = cr * 6, headDY = cr * 18;
  if (hamBehind) { ctx.save(); ctx.translate(0, bodyDY); drawHammer(o.ham); ctx.restore(); }
  // feet
  const f1 = Math.sin(run) * 7, f2 = -Math.sin(run) * 7, l1 = Math.max(0, Math.cos(run)) * 4 * (o.moving ? 1 : 0), l2 = Math.max(0, -Math.cos(run)) * 4 * (o.moving ? 1 : 0);
  ell(-6 + f1, -3 - l1, 8, 4, '#ff8c1a', OUT, 2.5);
  ell(7 + f2, -3 - l2, 8, 4, '#ff8c1a', OUT, 2.5);
  // tail + body (lowered when crouching)
  ctx.save(); ctx.translate(0, bodyDY);
  ctx.beginPath(); ctx.moveTo(-14, -26); ctx.lineTo(-28, -33); ctx.lineTo(-17, -14); ctx.closePath();
  ctx.fillStyle = o.body; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  // body
  ell(0, -19, 19, 16, o.body, OUT, 3);
  ell(5, -14, 11, 8, o.light);
  ctx.restore();
  // head (drops down and forward when crouching)
  ctx.save(); ctx.translate(headDX, headDY);
  ell(6, -40, 13.5, 13.5, o.body, OUT, 3);
  // cheek
  ell(5, -34, 4, 2.5, 'rgba(255,110,110,.45)');
  // beak
  ell(22, -37, 10, 5.5, '#ff9a1f', OUT, 2.5, 0.08);
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14, -36.5); ctx.lineTo(30, -36); ctx.stroke();
  // eye
  if (o.dead) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(7, -47); ctx.lineTo(14, -40); ctx.moveTo(14, -47); ctx.lineTo(7, -40); ctx.stroke();
  } else if (o.blink) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(7, -43); ctx.lineTo(14, -43); ctx.stroke();
  } else if (o.happy) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(10.5, -42, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else {
    ell(10.5, -44, 4.8, 6, '#fff', OUT, 1.8);
    ell(12, -43.5, 2.5, 3.4, '#1a1a1a');
    ell(12.6, -45.3, 1, 1.2, '#fff');
    if (o.determined) { ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(5, -52); ctx.lineTo(15, -50); ctx.stroke(); }
  }
  // accessory
  if (o.acc === 'bandana') {
    ctx.strokeStyle = '#e8262e'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(6, -40, 12.5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    const fl = Math.sin(gT * 14) * 3;
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(-5, -48); ctx.quadraticCurveTo(-14, -52 + fl, -22, -48 + fl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -48); ctx.quadraticCurveTo(-13, -46 - fl, -20, -40 - fl); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3, -52, 1.6, 0, 7); ctx.arc(10, -53, 1.6, 0, 7); ctx.fill();
  } else if (o.acc === 'cap') {
    ctx.fillStyle = '#2f7de1'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(6, -45, 12, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(18, -45, 10, 3, 0, 0, 7); ctx.fill(); ctx.stroke();
    ell(6, -57, 2.5, 2.5, '#ffd23f', OUT, 1.5);
  } else if (o.acc === 'beanie') {
    ctx.fillStyle = '#2fbf71'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(6, -45, 13, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(-8, -48, 28, 6, 3); ctx.fill(); ctx.stroke();
    ell(6, -60, 5, 5, '#ffffff', OUT, 2);
  } else if (o.acc === 'earmuffs') {
    ctx.strokeStyle = '#ff5fa2'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(6, -41, 15, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ell(-6, -38, 5.5, 6.5, '#ff8fc4', OUT, 2);
  } else if (o.acc === 'bow') {
    ctx.fillStyle = '#ff5fa2'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(-9, -60); ctx.lineTo(-9, -48); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(9, -60); ctx.lineTo(9, -48); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.translate(0, bodyDY);
  if (o.scarf) { // cosy scarf around the neck
    ctx.fillStyle = o.scarf; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-9, -31, 28, 8, 4); ctx.fill(); ctx.stroke();
    const fl = Math.sin(gT * 9) * 2;
    ctx.beginPath(); ctx.roundRect(-11, -27 + fl * 0.3, 8, 16, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-5, -30, 3, 6); ctx.fillRect(5, -30, 3, 6);
  }
  if (o.ham !== undefined && !hamBehind) drawHammer(o.ham);
  // wing
  const wa = o.ham !== undefined ? clamp(o.ham * 0.35, -0.6, 0.4) : (o.wave ? Math.sin(gT * 14) * 0.6 - 0.6 : 0);
  ell(-1, -21, 11, 7, o.dark, OUT, 2.5, wa);
  ctx.restore();
  ctx.restore();
}
function drawHammer(a) {
  ctx.save(); ctx.translate(3, -24); ctx.rotate(a);
  ctx.fillStyle = '#8f5a2c'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(-4, -4, 48, 8, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c47e45'; ctx.fillRect(2, -2, 38, 2);
  // head
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.roundRect(38, -27, 32, 54, 9); ctx.fill();
  ctx.fillStyle = '#e0893f'; ctx.beginPath(); ctx.roundRect(41, -24, 26, 48, 7); ctx.fill();
  ctx.fillStyle = '#f6b26b'; ctx.fillRect(45, -20, 4, 40);
  ctx.fillStyle = '#9aa3b8'; ctx.beginPath(); ctx.roundRect(40, -26, 28, 9, 4); ctx.fill(); ctx.beginPath(); ctx.roundRect(40, 17, 28, 9, 4); ctx.fill();
  ctx.fillStyle = '#d9dfec'; ctx.fillRect(44, -24, 20, 2); ctx.fillRect(44, 19, 20, 2);
  // star emblem
  starPath(54, 0, 7, 0); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}
function drawPlayer() {
  if (P.inv > 0 && !P.dead && Math.floor(P.inv * 14) % 2 === 0) return;
  let ham;
  if (P.dead || !P.hasHammer) ham = undefined;
  else if (state === 'win' && P.vx === 0 && winT > 0.6) ham = -1.57 + Math.sin(gT * 8) * 0.25;
  else if (P.pound) ham = P.poundT < 0.16 ? lerp(REST, -1.2, P.poundT / 0.16) : 1.4;
  else if (P.swinging) ham = swingAngle(P.swingT);
  else ham = lerp(REST + Math.sin(gT * 3) * 0.04, -2.85, P.cv || 0);
  const idleBob = (P.onGround && Math.abs(P.vx) < 10 && !P.swinging && !P.crouch) ? Math.sin(gT * 4) * 0.025 : 0;
  P.cv = lerp(P.cv || 0, P.crouch ? 1 : 0, 0.35);
  let rot = 0;
  if (P.dead) rot = P.rot;
  else if (P.pound && P.poundT < 0.16) rot = -P.face * (P.poundT / 0.16) * Math.PI * 2;
  else if (P.sliding) { rot = P.face * 0.35; ham = -0.45 + Math.sin(gT * 30) * 0.04; } // belly slide: lean forward, hammer out front
  const hop = (state === 'win' && P.vx === 0 && winT > 0.6) ? Math.abs(Math.sin(gT * 6)) * 16 : 0;
  drawDuck({ x: P.x + P.w / 2, y: P.y + P.h - hop, face: P.face, sx: P.sx * (1 - idleBob), sy: P.sy * (1 + idleBob), crouch: P.cv, scale: 1.12, run: P.run, moving: P.onGround && Math.abs(P.vx) > 20,
    body: '#ffd23f', light: '#fff0a6', dark: '#f0b400', acc: 'bandana', scarf: WORLD.heroScarf, ham, rot, dead: P.dead, blink: P.blink < 0 && !P.dead, determined: !P.dead && state === 'play', happy: state === 'win' && winT > 0.6 });
}
function drawDuckling(x, y, face, hop, wave, scarf) {
  ctx.save(); ctx.translate(x, y - hop); ctx.scale(face, 1);
  ell(-4, -2, 5, 2.5, '#ff8c1a', OUT, 1.8); ell(4, -2, 5, 2.5, '#ff8c1a', OUT, 1.8);
  ell(0, -11, 11, 9, '#ffe45c', OUT, 2.5);
  ell(5, -24, 8.5, 8.5, '#ffe45c', OUT, 2.5);
  ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(3, -32); ctx.quadraticCurveTo(1, -38, 5, -39); ctx.moveTo(6, -32); ctx.quadraticCurveTo(8, -37, 11, -36); ctx.stroke();
  ell(14, -23, 5.5, 3, '#ff9a1f', OUT, 1.8);
  if (hop > 2) { ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, -25, 2.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  else { ell(8, -26, 2, 2.6, '#1a1a1a'); ell(8.5, -27, .8, .8, '#fff'); }
  ell(2, -20, 2.5, 1.5, 'rgba(255,110,110,.5)');
  ell(-3, -12, 6, 4, '#f5c932', OUT, 2, wave ? Math.sin(gT * 16) * 0.7 - 0.5 : 0);
  if (scarf) { ctx.fillStyle = scarf; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-3, -19, 16, 5, 2.5); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-5, -17, 5, 9, 2); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

function drawBug(e) { const d = EDEF[e.type]; if (d && d.draw) d.draw(e); }
function drawParts() {
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = p.type === 'confetti' ? Math.min(1, a * 3) : a;
    if (p.type === 'dust') { ell(p.x, p.y, p.size * (1.6 - a * 0.6), p.size * (1.6 - a * 0.6), p.color); }
    else if (p.type === 'star') { starPath(p.x, p.y, p.size, p.rot); ctx.fillStyle = p.color; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); }
    else if (p.type === 'chip' || p.type === 'confetti') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); if (p.type === 'confetti') ctx.scale(Math.cos(p.rot * 2), 1);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    }
    else if (p.type === 'spark' || p.type === 'drop' || p.type === 'goo') { ell(p.x, p.y, p.size, p.size, p.color); }
    else if (p.type === 'heart') { heartPath(p.x, p.y, p.size); ctx.fillStyle = p.color; ctx.fill(); }
    else if (p.type === 'streak') { ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06); ctx.stroke(); }
    else if (p.type === 'ring') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 6 * a; ell(p.x, p.y, p.size + (1 - a) * 120, (p.size + (1 - a) * 120) * 0.28, null, '#fff', 6 * a); }
  }
  ctx.globalAlpha = 1;
}
function drawPops() {
  for (const p of pops) {
    const t = p.t, s = t < 0.15 ? easeOut(t / 0.15) * 1.25 : 1.25 - Math.min(0.25, (t - 0.15) * 1.5);
    const a = t > p.life - 0.3 ? (p.life - t) / 0.3 : 1;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(p.x + (p.drift ? Math.sin(t * 4) * 8 + t * 20 : 0), p.y - t * 45); ctx.scale(s, s);
    if (p.burst) { starPath(0, 0, p.size * 1.5, 0.2, 9, 0.68); ctx.fillStyle = '#ff6b2b'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke(); }
    txt(p.text, 0, 0, p.size, p.color, OUT);
    ctx.restore();
  }
}

// ----------------------------------------------------------- HUD & screens
function pill(x, y, w, h) { ctx.fillStyle = 'rgba(30,20,60,.45)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); }
function drawHUD() {
  pill(12, 10, 136, 44);
  for (let i = 0; i < 3; i++) {
    heartPath(38 + i * 40, 18, 28); ctx.fillStyle = i < P.hearts ? '#ff4d6d' : 'rgba(255,255,255,.2)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
  }
  pill(160, 10, 130, 44);
  if (WORLD.drawSeedIcon) WORLD.drawSeedIcon(186, 32);
  else { ctx.save(); ctx.translate(186, 32); ell(0, 0, 10, 13, '#ffcf2a', OUT, 2.5); ell(0, 0, 5, 8, '#ffe98a'); ctx.restore(); }
  txt('× ' + stats.seeds, 206, 33, 24, '#fff', OUT, 'left');
  pill(302, 10, 130, 44);
  ctx.save(); ctx.translate(330, 38); ctx.scale(0.7, 0.7); drawBug({ type: WORLD.hudBug || 'beetle', x: -20, y: -30, w: EDEF[WORLD.hudBug || 'beetle'].w, h: EDEF[WORLD.hudBug || 'beetle'].h, dir: 1, t: gT, dead: false, inv: 0, hudIcon: true }); ctx.restore();
  txt('× ' + stats.bugs, 350, 33, 24, '#fff', OUT, 'left');
  pill(444, 10, 118, 44);
  ctx.save(); ctx.translate(472, 32);
  ell(0, 0, 13, 13, '#ffd23f', OUT, 2.5); ell(14, 3, 8, 4.5, '#ff9a1f', OUT, 2); ell(4, -3, 3, 4, '#fff', OUT, 1.2); ell(5, -2.5, 1.6, 2.2, '#111');
  ctx.strokeStyle = '#e8262e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.restore();
  txt('× ' + Math.max(0, P.lives), 494, 33, 24, P.lives <= 1 ? '#ff6b8b' : '#fff', OUT, 'left');
  // hammer-throw meter
  {
    const ready = P.throwCD <= 0 && P.hasHammer, frac = !P.hasHammer ? 0 : 1 - P.throwCD / THROW_RELOAD;
    pill(574, 10, 132, 44);
    const cx = 600, cy = 32;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, 7); ctx.stroke();
    ctx.strokeStyle = ready ? '#9fe7ff' : '#ffd23f'; ctx.beginPath(); ctx.arc(cx, cy, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();
    if (ready) { ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(gT * 6) * 0.25; ell(cx, cy, 22, 22, null, '#ffffff', 3); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = ready ? 1 : 0.45; ctx.translate(cx, cy); ctx.scale(0.36, 0.36); drawHammerAt(0, 0, ready ? -0.6 + Math.sin(gT * 4) * 0.2 : -0.6); ctx.restore();
    if (ready) txt('READY', 660, 33, 17, '#9fe7ff', OUT);
    else txt(P.hasHammer ? P.throwCD.toFixed(1) + 's' : '...', 660, 33, 17, '#fff', OUT);
  }
  pill(W - 130, 10, 118, 44);
  txt(fmtTime(playTime), W - 71, 33, 24, '#fff', OUT);
  if (boss && boss.active && !boss.dead) {
    const bw = 340, bx = W / 2 - bw / 2, by = 70;
    pill(bx - 16, by - 34, bw + 32, 70);
    txt(WORLD.bossName, W / 2, by - 14, 20, '#ffd23f', OUT);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 18, 9); ctx.fill();
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.roundRect(bx, by, bw * Math.max(0, boss.hp) / EDEF[boss.type].hp, 18, 9); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(bx, by, bw, 18, 9); ctx.stroke();
  }
  if (muted) txt('🔇 muted (M)', W - 80, 72, 14, '#fff', OUT);
}
const fmtTime = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

function rainbowTitle(s, x, y, size, t) {
  ctx.font = `bold ${size}px ${FONT}`;
  const cols = ['#ff4d6d', '#ff9a1f', '#ffd23f', '#5fdc4b', '#3fd0ff', '#8d6bff'];
  let w = 0; const ws = [...s].map(c => { const m = ctx.measureText(c).width; w += m; return m; });
  let cx = x - w / 2;
  [...s].forEach((c, i) => {
    const bob = Math.sin(t * 4 + i * 0.5) * size * 0.08;
    txt(c, cx + ws[i] / 2, y + bob, size, c === ' ' ? '#fff' : cols[i % cols.length], OUT, 'center', size * 0.22);
    cx += ws[i];
  });
}
function drawTitle() {
  ctx.fillStyle = 'rgba(20,10,50,.35)'; ctx.fillRect(0, 0, W, H);
  rainbowTitle('HAMMER DUCK', W / 2, 112, 92, titleT);
  txt('~ Bug Island Rescue ~', W / 2, 186, 30, '#fff', OUT);
  // big duck
  const cyc = titleT % 2.2, ham = cyc < 0.3 ? swingAngle(cyc) : REST + Math.sin(titleT * 3) * 0.05;
  drawDuck({ x: 250, y: 420, face: 1, scale: 2.6, body: '#ffd23f', light: '#fff0a6', dark: '#f0b400', acc: 'bandana', ham, determined: true, sy: 1 + Math.sin(titleT * 4) * 0.02 });
  if (cyc > 0.14 && cyc < 0.2) shake = Math.max(shake, 5);
  const scared = cyc > 0.15 && cyc < 1.0;
  ctx.save(); ctx.translate(0, scared ? -Math.sin((cyc - 0.15) / 0.85 * Math.PI) * 30 : 0);
  drawBug({ type: 'beetle', x: 440, y: 390, w: 52, h: 39, dir: -1, t: titleT, dead: false, inv: scared ? 0.05 : 0 });
  ctx.restore();
  drawBug({ type: 'fly', x: 500, y: 300 + Math.sin(titleT * 3) * 12, w: 36, h: 30, dir: -1, t: titleT, dead: false, inv: 0 });
  // story
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(560, 222, 420, 262, 22); ctx.fill(); ctx.stroke();
  const lines = ['Bugs are invading Duck Island!', 'Grab your mighty hammer, smash', 'every bug, and get home to your', 'duckling family!'];
  lines.forEach((l, i) => txt(l, 770, 248 + i * 24, 18, '#3b2410', null));
  const ctl = [['← →', 'walk'], ['SPACE', 'jump'], ['H', 'hammer'], ['G', 'THROW hammer!'], ['J / ↓ in air', 'slam!'], ['↓', 'duck']];
  ctl.forEach(([k, v], i) => { txt(k, 755, 354 + i * 21, 16, '#e8262e', null, 'right'); txt(v, 775, 354 + i * 21, 16, '#3b2410', null, 'left'); });
  if (Math.floor(titleT * 2) % 2 === 0) txt('Press ENTER or SPACE to start', W / 2, 520, 30, '#ffd23f', OUT);
  if (unlocked() >= 2) txt('❄  Press 2 to fly straight to FROSTY ISLE  ❄', 770, 497, 15, '#bfefff', OUT);
  txt('F = full screen   ·   M = mute   ·   P = pause   ·   gamepad works too', W / 2, 557, 14, '#fff', OUT);
}
function drawWin() {
  if (winT < 1.6) return;
  const t = winT - 1.6, s = t < 0.4 ? easeOut(t / 0.4) : 1;
  ctx.save(); ctx.translate(W / 2, 120); ctx.scale(s, s);
  rainbowTitle(WORLD.win.title, 0, 0, 78, gT);
  ctx.restore();
  if (t > 0.5) {
    const a = Math.min(1, (t - 0.5) * 3);
    ctx.globalAlpha = a;
    txt(WORLD.win.line, W / 2, 186, 26, '#fff', OUT);
    ctx.fillStyle = 'rgba(30,20,60,.55)'; ctx.beginPath(); ctx.roundRect(W / 2 - 200, 212, 400, 112, 20); ctx.fill();
    txt('Bugs smashed:  ' + stats.bugs + '  ' + WORLD.win.bossLabel, W / 2, 238, 20, '#fff', OUT);
    txt(WORLD.win.seedName + ':  ' + stats.seeds + ' / ' + L.totalSeeds, W / 2, 266, 20, '#ffd23f', OUT);
    txt('Time:  ' + fmtTime(playTime), W / 2, 294, 20, '#9fe7ff', OUT);
    ctx.globalAlpha = 1;
  }
  if (t > 1.2 && allSeeds()) txt(WORLD.win.allLine, W / 2, 346, 22, '#fff27a', '#c25a00');
  const last = worldIndex() === WORLDS.length - 1, py = allSeeds() ? 386 : 352;
  if (last && winT > 6) {
    const s2 = easeOut(Math.min(1, (winT - 6) / 0.4));
    ctx.save(); ctx.translate(W / 2, py + 4); ctx.scale(s2, s2); rainbowTitle('THE END ... for now!', 0, 0, 40, gT); ctx.restore();
    if (Math.floor(gT * 2) % 2 === 0) txt('Thanks for playing! ♥   Press ENTER for the title screen', W / 2, py + 44, 20, '#fff', OUT);
  } else if (!last && winT > 3 && Math.floor(gT * 2) % 2 === 0) txt('Press ENTER to continue the adventure!', W / 2, py, 26, '#ffd23f', OUT);
}

function startPlay() {
  P.x = WORLD.intro.heroX(Math.min(introT, WORLD.intro.end)) - P.w / 2; P.y = groundTop(Math.floor(P.x / TS)) - P.h; P.face = 1; camX = 0;
  state = 'play'; jumpBuf = atkBuf = downBuf = throwBuf = 0; parts.length = 0; pops.length = 0; shake = 0; }

// speech bubble; t0 = when it pops up, measured on opt.now (default: the intro clock)
function bubble(x, y, text, t0, opt = {}) {
  const t = (opt.now !== undefined ? opt.now : introT) - t0; if (t < 0) return;
  const lines = text.split('\n'), size = opt.size || 18;
  ctx.font = `bold ${size}px ${FONT}`;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 30, h = lines.length * (size + 6) + 18;
  const s = easeOut(Math.min(1, t / 0.15)) * (opt.shake ? 1 + Math.sin(gT * 30) * 0.02 : 1);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = opt.bg || '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h - 14, w, h, 16); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(0, 0); ctx.lineTo(10, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillRect(-12, -19, 24, 5);
  lines.forEach((l, i) => txt(l, 0, -h - 14 + 9 + (size + 6) * (i + 0.5) + 2, size, opt.color || '#3b2410', null));
  ctx.restore();
}

function render() {
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  const sx = (Math.random() - .5) * shake, sy = (Math.random() - .5) * shake;
  const cx = Math.round(camX + sx), cy = Math.round(camY + sy);
  WORLD.drawBackground(cx, cy);
  ctx.save(); ctx.translate(-cx, -cy);
  WORLD.drawWater(cx, cy);
  for (const d of L.decor) {
    if (d.x < cx - 160 || d.x > cx + W + 160) continue;
    WORLD.drawDecor(d);
  }
  if (state !== 'intro') for (const s of L.signs) if (Math.abs(s.x - cx - W / 2) < W) drawSign(s);
  for (const c of L.cps) if (Math.abs(c.x - cx - W / 2) < W) drawCheckpoint(c);
  drawTiles(cx);
  for (const s of L.springs) drawSpring(s);
  for (const m of L.movers) (m.draw || drawMover)(m);
  if (WORLD.drawWorld) WORLD.drawWorld(cx, cy);
  WORLD.drawFamily();
  if (state !== 'intro') {
    for (const it of L.items) if (Math.abs(it.x - cx - W / 2) < W) drawItem(it);
    for (const e of L.enemies) if (Math.abs(e.x - cx - W / 2) < W) drawBug(e);
  }
  if (state === 'intro') WORLD.intro.draw();
  else if (state === 'story') STORY.draw();
  else if (state !== 'title') drawPlayer();
  drawThrown();
  drawParts();
  drawPops();
  ctx.restore();
  if (WORLD.drawScreen) WORLD.drawScreen(cx, cy);
  if (state === 'intro') { WORLD.intro.overlay(); return; }
  if (state === 'story') { STORY.overlay(); return; }
  if (state === 'title') { drawTitle(); return; }
  drawHUD();
  if (state === 'win') drawWin();
  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(20,10,50,' + Math.min(0.6, goT) + ')'; ctx.fillRect(0, 0, W, H);
    const s = goT < 0.4 ? easeOut(goT / 0.4) : 1;
    ctx.save(); ctx.translate(W / 2, H / 2 - 60); ctx.scale(s, s); txt('GAME OVER', 0, 0, 84, '#ff4d6d', OUT); ctx.restore();
    if (goT > 0.6) txt(WORLD.gameOverLine, W / 2, H / 2 + 10, 22, '#fff', OUT);
    if (goT > 1 && Math.floor(gT * 2) % 2 === 0) txt('Press ENTER to start again', W / 2, H / 2 + 70, 30, '#ffd23f', OUT);
  }
  if (state === 'pause') {
    ctx.fillStyle = 'rgba(20,10,50,.5)'; ctx.fillRect(0, 0, W, H);
    txt('PAUSED', W / 2, H / 2 - 20, 70, '#ffd23f', OUT);
    txt('Press P or ENTER to continue', W / 2, H / 2 + 40, 24, '#fff', OUT);
    txt('F = full screen   ·   M = mute', W / 2, H / 2 + 80, 18, '#fff', OUT);
  }
}

// ---------------------------------------------------------------- main loop
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  pollPad();
  if (state === 'play' || state === 'win') {
    acc += dt;
    while (acc >= STEP_DT) { step(STEP_DT); acc -= STEP_DT; }
  } else {
    acc = 0; gT += dt;
    if (state === 'gameover') { goT += dt; updateFx(dt); }
    if (state === 'intro') { WORLD.intro.update(dt); updateFx(dt); shake = Math.max(0, shake - dt * 40); }
    if (state === 'story') { STORY.update(dt); updateFx(dt); shake = Math.max(0, shake - dt * 40); }
    if (state === 'title') { titleT += dt; updateMovers(dt); updateFx(dt); shake = Math.max(0, shake - dt * 40); }
  }
  music();
  render();
  requestAnimationFrame(frame);
}
