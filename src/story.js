'use strict';
// =====================================================================
//  STORY: between worlds. After Duck Island is saved, an emergency pigeon
//  brings a letter from Hammer Duck's little brother Drake... and carries
//  her off to Frosty Isle.
// =====================================================================
function drawPigeon(x, y, face, flying, letter) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  const flap = flying ? Math.sin(gT * 26) : 0;
  if (!flying) { ctx.strokeStyle = '#ff8c1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(-6, 24); ctx.moveTo(6, 14); ctx.lineTo(7, 24); ctx.stroke(); }
  else { ctx.strokeStyle = '#ff8c1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(-10, 20); ctx.moveTo(4, 14); ctx.lineTo(-2, 21); ctx.stroke(); }
  // tail + body
  ctx.fillStyle = '#7d8bb0'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-14, 2); ctx.lineTo(-30, 8); ctx.lineTo(-14, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ell(0, 4, 19, 14, '#a3b0d1', OUT, 2.5);
  ell(10, -6, 8, 9, '#6fbf9f');           // shiny neck
  ell(13, -14, 10, 10, '#a3b0d1', OUT, 2.5);
  ell(16, -16, 3, 3.5, '#fff'); ell(17, -16, 1.6, 2, '#111');
  ctx.fillStyle = '#ffb84d'; ctx.beginPath(); ctx.moveTo(22, -14); ctx.lineTo(31, -11); ctx.lineTo(22, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
  // wing
  ctx.save(); ctx.translate(-2, 0); ctx.rotate(flying ? -0.5 + flap * 0.9 : 0.2);
  ell(-6, -2, 15, 7, '#8794bb', OUT, 2.5); ctx.restore();
  // little red mail cap
  ctx.fillStyle = '#e8262e'; ctx.beginPath(); ctx.arc(13, -21, 7, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (letter) { ctx.fillStyle = '#fff6dc'; ctx.save(); ctx.translate(30, -8); ctx.rotate(0.2); ctx.fillRect(-2, -6, 18, 12); ctx.strokeRect(-2, -6, 18, 12); ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(7, 1); ctx.lineTo(16, -6); ctx.stroke(); ell(7, 2, 2.5, 2.5, '#e8262e'); ctx.restore(); }
  ctx.restore();
}

const STORY_END = 13.2;
const STORY = {
  holds: [1.55, 2.95, 4.55, 7.85, 9.85, 11.55], // dialogue (and the letter) wait for a press here
  track(t) { const tr = WORLDS[0].tracks; return t < 9.6 ? tr.calm : tr.hero; },
  finish() { startWorld(worldIndex() + 1, true, true); },
  update(dt) {
    const p = storyT; storyT += dt;
    const hit = t => p < t && storyT >= t;
    if (hit(1.7)) SFX.coo();
    if (hit(3.0)) SFX.coo();
    if (hit(4.6)) noise(0.3, 0.2, 3000); // paper rustle
    if (hit(9.9)) { SFX.coo(); SFX.jump(); }
    if (hit(12.1)) SFX.whoosh();
    if (storyT > 10 && storyT < 12.5 && Math.random() < dt * 5) { const pg = this.pigeon(storyT); addPart({ type: 'chip', x: pg.x, y: pg.y, vx: rand(-60, 60), vy: rand(-40, 40), g: 120, life: 1.2, size: 7, vr: rand(-4, 4), color: '#c9d2e8' }); }
    if (storyT >= STORY_END) this.finish();
  },
  hero() { return { x: P.x + P.w / 2, y: P.y + P.h }; },
  pigeon(t) {
    const h = this.hero();
    if (t < 3.0) { const u = easeOut(clamp((t - 1.5) / 1.5, 0, 1)); return { x: lerp(camX - 80, h.x - 80, u), y: lerp(camY + 80, h.y - 24, u) - Math.sin(Math.PI * u) * 60, flying: t < 2.95, face: 1 }; }
    if (t < 9.9) return { x: h.x - 80, y: h.y - 24, flying: false, face: 1 };
    if (t < 10.4) { const u = (t - 9.9) / 0.5; return { x: lerp(h.x - 80, h.x, u), y: lerp(h.y - 24, h.y - 120, u), flying: true, face: 1 }; }
    const k = t - 10.4; return { x: h.x + k * 300, y: h.y - 120 - k * 60 - k * k * 110, flying: true, face: 1 };
  },
  draw() {
    const t = storyT, h = this.hero(), pg = this.pigeon(t), f = L.family;
    // Hammer Duck (lifted away by the pigeon at the end)
    let hx = h.x, hy = h.y;
    if (t > 10.4) { hx = pg.x; hy = Math.min(h.y, pg.y + 78); }
    const carried = t > 10.4;
    drawDuck({ x: hx, y: hy, face: 1, scale: 1.12, body: '#ffd23f', light: '#fff0a6', dark: '#f0b400', acc: 'bandana', ham: carried ? 1.25 + Math.sin(gT * 5) * 0.1 : (t > 9.9 ? -1.57 : REST + Math.sin(gT * 3) * 0.04),
      happy: t < 4.6, determined: t > 8.2, rot: t > 10.4 ? Math.sin(gT * 6) * 0.15 : 0 });
    if (t > 1.5) drawPigeon(pg.x, pg.y, pg.face, pg.flying, t < 4.6);
    // speech
    if (t > 0.2 && t < 1.6) bubble(h.x, h.y - 92, 'Phew! Everyone is safe!', 0.2, { now: t });
    if (t > 1.7 && t < 3.0 && f) bubble(f.kids[1].x, f.y - 40, 'Look! A pigeon!', 1.7, { now: t });
    if (t > 3.0 && t < 4.6) bubble(pg.x - 10, pg.y - 30, 'COO COO! EMERGENCY MAIL!', 3.0, { now: t, color: '#e8262e' });
    if (t > 8.2 && t < 9.9) bubble(h.x + 10, h.y - 92, 'Drake needs me!\nKids, stay with Papa!', 8.2, { now: t, color: '#e8262e' });
    if (t > 8.8 && t < 10.2 && f) bubble(f.kids[2].x + 20, f.y - 40, "Go get 'em, Mama!", 8.8, { now: t });
    if (t > 10.0 && t < 11.6) bubble(Math.min(pg.x, camX + W - 160), pg.y - 30, 'Oof! Hold on tight! COO!', 10.0, { now: t });
  },
  overlay() {
    const t = storyT;
    if (t > 4.6 && t < 8.2) { // the letter
      const s = easeOut(Math.min(1, (t - 4.6) / 0.35)) * (t > 7.9 ? (8.2 - t) / 0.3 : 1);
      ctx.fillStyle = `rgba(20,10,50,${0.45 * Math.min(1, s)})`; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.03); ctx.scale(s, s);
      ctx.fillStyle = '#fff6dc'; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(-270, -170, 540, 330, 14); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,90,40,.25)'; ctx.lineWidth = 1.5;
      for (let y = -100; y < 140; y += 30) { ctx.beginPath(); ctx.moveTo(-240, y); ctx.lineTo(240, y); ctx.stroke(); }
      txt('Dear Sis,', -230, -128, 24, '#3b2410', null, 'left');
      const lines = ['HELP!!! Bugs are attacking Frosty Isle!', 'Their boss is the BIGGER BUG and he', 'is coming for my family! Please hurry!'];
      lines.forEach((l, i) => txt(l, -230, -78 + i * 32, 21, '#3b2410', null, 'left'));
      txt('Your little brother,', 60, 54, 19, '#3b2410', null, 'left');
      txt('Drake  ♥', 90, 92, 30, '#e8262e', null, 'left');
      ctx.save(); ctx.translate(-170, 96); ctx.scale(0.8, 0.8);
      drawDuck({ x: 0, y: 20, face: 1, body: '#ffd23f', light: '#fff0a6', dark: '#f0b400', acc: 'beanie', scarf: '#e8262e', determined: false });
      ctx.restore();
      ctx.restore();
    }
    if (t > 11.9) { // whoosh to the next world
      const a = clamp((t - 11.9) / 1.0, 0, 1);
      ctx.fillStyle = `rgba(225,240,255,${a})`; ctx.fillRect(0, 0, W, H);
      if (a > 0.5) txt('Off to FROSTY ISLE!  ❄', W / 2, H / 2, 44, '#2f7fc4', '#ffffff');
    }
    if (t < 11.9 && !touchMode) txt('ENTER = skip', W - 80, H - 22, 14, '#ffffff', OUT);
  },
};
