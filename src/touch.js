'use strict';
// =====================================================================
//  HAMMER DUCK: touch controls for phones and tablets
//  An overlay canvas (#tc) covers the whole screen. The d-pad and buttons are
//  drawn in screen pixels (so they can sit in the black side bars on wide
//  phones) and feed the same input flags as the keyboard (TCH, jumpBuf...).
//  Menus (title, pause, skip, game over) are tapped in game coordinates.
// =====================================================================
const tcv = document.getElementById('tc'), tctx = tcv && tcv.getContext ? tcv.getContext('2d') : null;
let tvw = innerWidth, tvh = innerHeight, tdpr = 1;
const SAFE = { l: 0, r: 0, t: 0, b: 0 };
const fingers = new Map(); // touch identifier -> { kind: 'pad' | button id | 'menu' | 'none', x, y }
const BTN_PRESSED = {};
const IS_IPHONE = typeof navigator !== 'undefined' && /iPhone|iPod/.test(navigator.userAgent || '');
const STANDALONE = (typeof matchMedia === 'function' && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) ||
  (typeof navigator !== 'undefined' && navigator.standalone === true);
const canFullscreen = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const portrait = () => tvh > tvw * 1.05;

function touchResize() {
  tvw = innerWidth; tvh = innerHeight; tdpr = Math.min(2, window.devicePixelRatio || 1);
  if (tcv && tcv.style) { tcv.width = Math.round(tvw * tdpr); tcv.height = Math.round(tvh * tdpr); tcv.style.width = tvw + 'px'; tcv.style.height = tvh + 'px'; }
  const s = document.getElementById('safe');
  if (s && typeof getComputedStyle === 'function') {
    const cs = getComputedStyle(s);
    SAFE.l = parseFloat(cs.paddingLeft) || 0; SAFE.r = parseFloat(cs.paddingRight) || 0;
    SAFE.t = parseFloat(cs.paddingTop) || 0; SAFE.b = parseFloat(cs.paddingBottom) || 0;
  }
}
addEventListener('resize', touchResize); document.addEventListener('fullscreenchange', touchResize); document.addEventListener('webkitfullscreenchange', touchResize); addEventListener('orientationchange', () => setTimeout(touchResize, 200)); touchResize();

// ---------------------------------------------------------------- layout (screen px)
function layout() {
  const u = clamp(Math.min(tvw, tvh) * 0.1, 30, 62), m = u * 0.35;
  const pad = { x: SAFE.l + m + 2.1 * u, y: tvh - SAFE.b - m - 2.0 * u, r: 1.9 * u };
  const jx = tvw - SAFE.r - m - 1.35 * u, jy = tvh - SAFE.b - m - 1.3 * u;
  const btns = [
    { id: 'jump', x: jx, y: jy, r: 1.2 * u, label: 'JUMP', col: '#5fdc4b' },
    { id: 'atk', x: jx - 2.75 * u, y: jy + 0.2 * u, r: 1.1 * u, label: 'HAMMER', col: '#ff9a1f' },
    { id: 'throw', x: jx - 2.4 * u, y: jy - 2.35 * u, r: 0.85 * u, label: 'THROW', col: '#3fd0ff' },
    { id: 'slam', x: jx - 0.1 * u, y: jy - 2.55 * u, r: 0.85 * u, label: 'SLAM', col: '#c77dff' },
  ];
  return { u, pad, btns };
}
// game coordinates <-> screen px (the main canvas is centered and letterboxed)
function canvasRect() {
  if (cv.getBoundingClientRect) { const r = cv.getBoundingClientRect(); if (r.width) return r; }
  return { left: (tvw - W * scale) / 2, top: (tvh - H * scale) / 2, width: W * scale, height: H * scale };
}
function toGame(x, y) { const r = canvasRect(); return { x: (x - r.left) * W / r.width, y: (y - r.top) * H / r.height }; }
function toScreen(x, y) { const r = canvasRect(); return { x: r.left + x * r.width / W, y: r.top + y * r.height / H }; }

// on-screen menu buttons, in game coordinates (drawn by touchMenus)
const PAUSE_BTN = { x: 800, y: 32, r: 24 };
function pauseItems() {
  const items = [{ id: 'resume', label: '▶  Continue' }, { id: 'mute', label: muted ? '🔇  Sound: OFF' : '🔊  Sound: ON' }];
  if (canFullscreen()) items.push({ id: 'fs', label: isFullscreen() ? '⤡  Leave full screen' : '⤢  Full screen' });
  return items.map((it, i) => Object.assign(it, { x: W / 2 - 200, w: 400, h: 72, y: H / 2 - 30 + i * 90 }));
}
const inBox = (g, b) => g.x > b.x && g.x < b.x + b.w && g.y > b.y - b.h / 2 && g.y < b.y + b.h / 2;
const SKIP_BOX = { x: W - 230, y: H - 26, w: 230, h: 60 };
const FROSTY_BOX = { x: 560, y: 497, w: 420, h: 36 };

function goFullscreen() {
  if (!canFullscreen() || isFullscreen()) return;
  toggleFullscreen();
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
}

// ---------------------------------------------------------------- touch handling
function padDirs(f, pad) {
  const dx = f.x - pad.x, dy = f.y - pad.y, dz = pad.r * 0.22;
  return { left: dx < -dz, right: dx > dz, down: dy > pad.r * 0.38 };
}
function refreshPad() {
  const { pad } = layout(); let l = false, r = false, d = false;
  for (const f of fingers.values()) if (f.kind === 'pad') { const p = padDirs(f, pad); l = l || p.left; r = r || p.right; d = d || p.down; }
  if (d && !TCH.down && state === 'play') downBuf = 0.1;
  TCH.left = l; TCH.right = r; TCH.down = d;
}
function pressButton(id) {
  BTN_PRESSED[id] = (BTN_PRESSED[id] || 0) + 1;
  if (id === 'jump') { jumpBuf = 0.13; TCH.jump = true; }
  if (id === 'atk') atkBuf = 0.12;
  if (id === 'throw') throwBuf = 0.12;
  if (id === 'slam') downBuf = 0.1;
}
function releaseButton(id) {
  BTN_PRESSED[id] = Math.max(0, (BTN_PRESSED[id] || 0) - 1);
  if (id === 'jump' && !BTN_PRESSED.jump) TCH.jump = false;
}
function menuTap(sx, sy) {
  const g = toGame(sx, sy);
  if (state === 'title') {
    goFullscreen();
    if (unlocked() >= 2 && inBox(g, FROSTY_BOX)) onPress('Digit2'); else onPress('Enter');
  } else if (state === 'pause') {
    for (const it of pauseItems()) if (inBox(g, it)) {
      if (it.id === 'resume') onPress('Enter');
      if (it.id === 'mute') onPress('KeyM');
      if (it.id === 'fs') toggleFullscreen();
    }
  } else if (state === 'intro' || state === 'story') onPress(inBox(g, SKIP_BOX) ? 'Enter' : 'Space');
  else if (state === 'gameover' || state === 'win') onPress('Enter');
}
// Touch events (not pointer events): every touch event carries e.touches, the full list of fingers
// still on the screen. Rebuilding from it means a lost "finger up" (iOS edge swipes, notifications,
// app switches) can never leave a button stuck: the next touch fixes it.
function fingerDown(id, x, y) {
  if (state !== 'play') { fingers.set(id, { kind: 'menu', x, y }); return; } // menus act when the finger lifts
  const g = toGame(x, y);
  if (Math.hypot(g.x - PAUSE_BTN.x, g.y - PAUSE_BTN.y) < PAUSE_BTN.r * 1.8) { fingers.set(id, { kind: 'none', x, y }); onPress('Escape'); return; }
  const { pad, btns } = layout();
  if (x < tvw * 0.42 || Math.hypot(x - pad.x, y - pad.y) < pad.r * 1.4) { fingers.set(id, { kind: 'pad', x, y }); return; }
  let best = null, bd = 1e9;
  for (const b of btns) { const d = Math.hypot(x - b.x, y - b.y) / b.r; if (d < bd) { bd = d; best = b; } }
  if (best && bd < 2.2) { fingers.set(id, { kind: best.id, x, y }); pressButton(best.id); }
  else fingers.set(id, { kind: 'none', x, y });
}
function syncTouches(e) {
  const live = new Set();
  for (const t of e.touches || []) {
    live.add(t.identifier);
    const f = fingers.get(t.identifier); if (f) { f.x = t.clientX; f.y = t.clientY; }
  }
  for (const [id, f] of fingers) if (!live.has(id)) {
    fingers.delete(id);
    if (f.kind === 'menu') { if (!portrait()) menuTap(f.x, f.y); }
    else if (f.kind !== 'pad' && f.kind !== 'none') releaseButton(f.kind);
  }
  refreshPad();
}
function onTouchStart(e) {
  touchMode = true; initAudio();
  if (e.cancelable && e.preventDefault) e.preventDefault();
  for (const t of e.changedTouches || []) if (!fingers.has(t.identifier) && !portrait()) fingerDown(t.identifier, t.clientX, t.clientY);
  syncTouches(e);
}
function onTouchMove(e) { if (e.cancelable && e.preventDefault) e.preventDefault(); syncTouches(e); }
function onTouchEnd(e) { initAudio(); syncTouches(e); }
function releaseAll() { fingers.clear(); for (const k in BTN_PRESSED) BTN_PRESSED[k] = 0; TCH.left = TCH.right = TCH.down = TCH.jump = false; }
addEventListener('touchstart', onTouchStart, { passive: false });
addEventListener('touchmove', onTouchMove, { passive: false });
addEventListener('touchend', onTouchEnd); addEventListener('touchcancel', onTouchEnd);
addEventListener('blur', releaseAll);
// no pinch zoom, long-press menus or double-tap zoom while playing
addEventListener('gesturestart', e => e.preventDefault && e.preventDefault());
addEventListener('contextmenu', e => { if (touchMode && e.preventDefault) e.preventDefault(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseAll(); if (state === 'play') state = 'pause'; } });
// iOS: play sound even when the ring/silent switch is on silent (Safari 16.4+)
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

// ---------------------------------------------------------------- drawing (overlay canvas, screen px)
function tcircle(x, y, r, fill, stroke, lw) {
  tctx.beginPath(); tctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { tctx.fillStyle = fill; tctx.fill(); }
  if (stroke) { tctx.lineWidth = lw || 3; tctx.strokeStyle = stroke; tctx.stroke(); }
}
function ttext(s, x, y, size, fill = '#fff') {
  tctx.font = `bold ${size}px ${FONT}`; tctx.textAlign = 'center'; tctx.textBaseline = 'middle';
  tctx.lineJoin = 'round'; tctx.lineWidth = Math.max(3, size * 0.22); tctx.strokeStyle = OUT; tctx.strokeText(s, x, y);
  tctx.fillStyle = fill; tctx.fillText(s, x, y);
}
function arrow(x, y, s, rot, fill) {
  tctx.save(); tctx.translate(x, y); tctx.rotate(rot);
  tctx.beginPath(); tctx.moveTo(s, 0); tctx.lineTo(-s * 0.6, -s * 0.85); tctx.lineTo(-s * 0.6, s * 0.85); tctx.closePath();
  tctx.fillStyle = fill; tctx.fill(); tctx.lineWidth = 3; tctx.strokeStyle = OUT; tctx.lineJoin = 'round'; tctx.stroke();
  tctx.restore();
}
function drawIcon(id, x, y, r, on) {
  tctx.save(); tctx.translate(x, y);
  if (id === 'jump') { arrow(0, -r * 0.12, r * 0.42, -Math.PI / 2, '#fff'); }
  else if (id === 'slam') { arrow(0, -r * 0.05, r * 0.36, Math.PI / 2, '#fff'); tctx.fillStyle = '#ffe14d'; tctx.fillRect(-r * 0.45, r * 0.32, r * 0.9, r * 0.1); }
  else {
    // a little wooden hammer
    const k = r / 44; tctx.scale(k, k); tctx.rotate(id === 'throw' ? (on ? -2 : -0.9) : (on ? 0.3 : -0.5));
    tctx.fillStyle = '#c97a35'; tctx.strokeStyle = OUT; tctx.lineWidth = 3;
    tctx.beginPath(); tctx.roundRect(-4, -6, 8, 36, 3); tctx.fill(); tctx.stroke();
    tctx.fillStyle = '#e39b4a'; tctx.beginPath(); tctx.roundRect(-20, -24, 40, 22, 6); tctx.fill(); tctx.stroke();
    if (id === 'throw') { tctx.strokeStyle = '#fff'; tctx.lineWidth = 3; tctx.beginPath(); tctx.arc(0, 0, 34, 0.4, 2.2); tctx.stroke(); }
  }
  tctx.restore();
}
function drawControls() {
  const { u, pad, btns } = layout(), a = 0.55;
  // d-pad
  tcircle(pad.x, pad.y, pad.r, 'rgba(30,20,60,.32)', 'rgba(255,255,255,.55)', 3);
  const dirs = [['left', Math.PI, -1, 0], ['right', 0, 1, 0], ['down', Math.PI / 2, 0, 1]];
  for (const [k, rot, dx, dy] of dirs) {
    const on = TCH[k], px = pad.x + dx * pad.r * 0.58, py = pad.y + dy * pad.r * 0.58;
    if (on) tcircle(px, py, u * 0.62, 'rgba(255,225,77,.55)');
    tctx.globalAlpha = on ? 1 : a + 0.2; arrow(px, py, u * (k === 'down' ? 0.32 : 0.42), rot, on ? '#ffe14d' : '#fff'); tctx.globalAlpha = 1;
  }
  for (const f of fingers.values()) if (f.kind === 'pad') tcircle(f.x, f.y, u * 0.45, 'rgba(255,255,255,.25)', 'rgba(255,255,255,.6)', 2);
  // buttons
  for (const b of btns) {
    const on = BTN_PRESSED[b.id] > 0;
    let ready = true;
    if (b.id === 'throw') ready = P.hasHammer && P.throwCD <= 0;
    tctx.globalAlpha = on ? 0.95 : (ready ? a : 0.3);
    tcircle(b.x, b.y + (on ? 2 : 0), b.r, b.col, OUT, 3.5);
    tctx.globalAlpha = on ? 1 : (ready ? 0.85 : 0.45);
    tcircle(b.x, b.y + (on ? 2 : 0), b.r - 5, null, 'rgba(255,255,255,.7)', 2);
    drawIcon(b.id, b.x, b.y + (on ? 2 : 0) - b.r * 0.08, b.r, on);
    ttext(b.label, b.x, b.y + b.r * 0.58, Math.max(10, b.r * 0.27));
    if (b.id === 'throw' && !ready && P.hasHammer) { // reload ring
      tctx.globalAlpha = 0.9; tctx.lineWidth = 4; tctx.strokeStyle = '#ffd23f';
      tctx.beginPath(); tctx.arc(b.x, b.y, b.r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - P.throwCD / THROW_RELOAD)); tctx.stroke();
    }
    tctx.globalAlpha = 1;
  }
}
function drawRotate() {
  tctx.fillStyle = '#1b1530'; tctx.fillRect(0, 0, tvw, tvh);
  const cx = tvw / 2, cy = tvh * 0.42, s = Math.min(tvw, tvh) * 0.16;
  const ang = -Math.PI / 2 * easeInOut(clamp(((gT % 2.4) - 0.4) / 1.0, 0, 1));
  tctx.save(); tctx.translate(cx, cy); tctx.rotate(ang);
  tctx.fillStyle = '#ffd23f'; tctx.strokeStyle = OUT; tctx.lineWidth = 5;
  tctx.beginPath(); tctx.roundRect(-s * 0.55, -s, s * 1.1, s * 2, s * 0.18); tctx.fill(); tctx.stroke();
  tctx.fillStyle = '#1b1530'; tctx.beginPath(); tctx.roundRect(-s * 0.42, -s * 0.82, s * 0.84, s * 1.64, s * 0.08); tctx.fill();
  // the game itself, sideways, so it ends up the right way round once the phone has turned
  tctx.save(); tctx.rotate(Math.PI / 2); const gw = s * 1.6, gh = gw * H / W;
  try { tctx.drawImage(cv, -gw / 2, -gh / 2, gw, gh); } catch (e) {}
  tctx.restore(); tctx.restore();
  const fit = (str, max) => { tctx.font = `bold ${max}px ${FONT}`; return Math.min(max, max * tvw * 0.88 / tctx.measureText(str).width); };
  ttext('Turn your phone sideways!', cx, tvh * 0.72, fit('Turn your phone sideways!', 34), '#ffd23f');
  ttext('Hammer Duck needs a wide screen', cx, tvh * 0.72 + 46, fit('Hammer Duck needs a wide screen', 20));
}
// menu buttons drawn into the game canvas (game coordinates), called from render()
function drawTouchMenus() {
  if (!touchMode) return;
  if (state === 'pause') txt('PAUSED', W / 2, 110, 80, '#ffd23f', OUT);
  if (state === 'play') {
    const b = PAUSE_BTN;
    ell(b.x, b.y, b.r, b.r, 'rgba(30,20,60,.55)', '#fff', 3);
    ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 9, b.y - 10, 6, 20); ctx.fillRect(b.x + 3, b.y - 10, 6, 20);
  }
  if (state === 'pause') for (const it of pauseItems()) {
    ctx.fillStyle = it.id === 'resume' ? '#5fdc4b' : 'rgba(255,255,255,.92)'; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(it.x, it.y - it.h / 2, it.w, it.h, it.h / 2); ctx.fill(); ctx.stroke();
    txt(it.label, W / 2, it.y + 1, 32, it.id === 'resume' ? '#fff' : '#3b2410', it.id === 'resume' ? OUT : null);
  }
  if (state === 'intro' || state === 'story') {
    const b = SKIP_BOX;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(b.x + 40, b.y - 20, b.w - 54, 40, 20); ctx.fill(); ctx.stroke();
    txt('SKIP  ▶▶', b.x + 40 + (b.w - 54) / 2, b.y + 1, 20, '#3b2410', null);
  }
}
// called every frame after render()
function drawTouch() {
  if (!tctx) return;
  if (portrait() && touchMode && state === 'play') state = 'pause';
  // on touch screens the game sits at the top, so spare room ends up below it, under the buttons
  if (document.body && document.body.classList && document.body.classList.contains('touch') !== touchMode) document.body.classList.toggle('touch', touchMode);
  tctx.setTransform(tdpr, 0, 0, tdpr, 0, 0); tctx.clearRect(0, 0, tvw, tvh);
  if (!touchMode) return;
  if (portrait()) { drawRotate(); return; }
  if (state === 'play') drawControls();
  else if (TCH.left || TCH.right || TCH.down || TCH.jump || Object.values(BTN_PRESSED).some(n => n)) {
    for (const [id, f] of fingers) if (f.kind !== 'menu') f.kind = 'none';
    for (const k in BTN_PRESSED) BTN_PRESSED[k] = 0; TCH.left = TCH.right = TCH.down = TCH.jump = false;
  }
}
