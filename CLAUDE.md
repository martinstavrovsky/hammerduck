# Hammer Duck

Repo: https://github.com/martinstavrovsky/hammerduck (public, branch `main`). Work on a branch, open a PR, merge.

A 2D platformer for a family (played on a MacBook Air M4, in Safari/Chrome, keyboard or DualShock; also phones/tablets by touch).
Live on GitHub Pages: https://martinstavrovsky.github.io/hammerduck/
Bright, cartoony style with comic "SMASH!" pop-ups and faces on bushes, clouds, the sun and the moon. All original art;
do not copy any existing game's characters, levels or look.
**Tone:** silly, infantile, feel-good action fun. Never scary or serious.

**Hero:** Hammer Duck, a yellow mama duck with a red bandana and a huge wooden hammer. The hammer is the only way to beat bugs.
**Story so far:**
1. **Duck Island** (world 1): in the intro the Big Bug kidnaps her family (papa duck in a blue cap + 4 ducklings)
   in a net and runs off taunting her. She beats it and the family celebrates.
2. **Pigeon story:** an emergency pigeon brings a letter from her little brother **Drake** (yellow, green beanie,
   red scarf; wife **Daisy**, white with pink earmuffs; 3 ducklings in scarves). The pigeon carries her to Frosty Isle.
3. **Frosty Isle** (world 2): the **Bigger Bug** (the Big Bug's big brother: ice-blue, viking helmet, white mustache)
   cages Drake's family. "You beat my little brother? I'm the BIGGER BUG! You'll NEVER defeat ME!"
   She beats him, smashes the ice cage, and Drake's family thanks her. Then "THE END ... for now!".

The user asked that every new world be **clearly distinctive in every way**: different art, mechanics, terrain,
bugs, boss mechanics and music. Don't reuse hills/crates/springs-style layouts from earlier worlds.

## Files (plain `<script>` files, no modules, no build: double-clicking index.html must keep working)
- `index.html`: canvas + touch overlay canvas `#tc` + script tags in load order: engine → worlds → story → touch → main.
  Also the web-app manifest (`manifest.webmanifest`, `icons/`) so "Add to Home Screen" runs full screen.
- `src/engine.js`: shared engine (constants, input, audio + music scheduler, physics, the duck & hammer, enemy
  framework, combat, HUD, title/win/game-over/pause screens, render, main loop).
- `worlds/island.js` (world 1) and `worlds/frost.js` (world 2, wrapped in an IIFE): everything world-specific.
- `src/story.js`: the pigeon scene between worlds (`STORY`) + `drawPigeon`.
- `src/touch.js`: touch controls (d-pad + JUMP/HAMMER/THROW/SLAM drawn in screen px on `#tc`), tap menus
  (title, ⏸ pause menu, SKIP button, game over/win), "turn your phone sideways" screen.
- `src/main.js`: boot + debug hashes.
- `tools/harness.js`: headless Node harness: loads the same scripts as index.html with fake canvas/audio/gamepad.
- `tools/smoke-test.js` (world 1), `tools/world2-test.js` (world 2 + story) and `tools/touch-test.js` (fingers via
  `touchDown/touchMove/touchUp`): all must print "All passed".
- `tools/icon.html`: renders the app icons (`--window-size=N,N` screenshot of `icon.html#N` into `icons/icon-N.png`, N = 512/192/180).
- `tools/stage.html`: screenshot staging page (freeze any scene). `docs/screenshots/`: README images.

## World API (`registerWorld({...})`, order = world number)
`name, width, startCol, goalCol, arena {L, R}, winStopX, winCamX, bossName, bossDefeatText, gateColor, hudBug,
heroScarf?, seedSpark?, gameOverLine, win {title, line, seedName, bossLabel, allLine}, tracks {main, boss, hero, calm},
build(B), drawBackground(cx,cy), drawWater(cx), drawTile(t,x,y,px,py), drawDecor(d), drawFamily(), drawWorld?(),
drawScreen?(), update?(dt), onHammerArea?(rect, src), onRespawn?(), drawSeed?(it,bob), drawSeedIcon?(x,y),
winUpdate?(dt, before), intro {end, holds, update, draw, overlay, heroX(t), track(t)}`.
- **Cutscene dialogue waits for the player:** `intro.holds` / `STORY.holds` list times (just before a speech bubble ends)
  where `sceneStep()` stops the scene (`sceneWait`) until SPACE / H / tap / ✕ / ○; a "SPACE = next ▶" hint blinks.
  New dialogue lines need a hold time. Tests: press Space whenever `G.sceneWait`.
- Bug types go into `EDEF[type] = { w, h, hp, speed?, fly?, boss?, fallsWhenDead?, init?(e,col,row), update?(e,dt),
  draw(e), canHit?(e, src, dir), onHurt?(e,dir,src), harmless?(e), hurtInv?, hurtWords? }`.
  Hit sources: `'swing' | 'slam' | 'throw' | 'slide' | 'shot' | 'boss'`.
- Boss helpers: `shouldWakeBoss(b)`, `wakeBoss(b, text)` (closes the left arena gate), `bossSnore(b, dt)`.
- Music: `tracks.x = { bpm, play(step, time, beatLen) }`, scheduled in 8th-note steps.
- States: `title` → `intro` → `play` ⇄ `pause` → `win` → (`story` → next world's `intro`) | THE END → `title`; `gameover` restarts the current world.
  `startWorld(i, withIntro, carryLives)`. Finishing a world unlocks the next (`localStorage`), and the title offers "Press 2".

## Level building (`build(B)`)
- Grid: `TS = 48`, `ROWS = 12`. Ground top for height 2 is row 10 (y = 480); water surface y = 536; falling in = lose a life.
- Tiles: 0 empty · 1 grass ground · 2 one-way plank · 3 crate · 4 stone · 6 boss gate · 7 snow · 8 ice (slippery) ·
  9 cracking ice · 10 ice block. `SOLID()` / `ICY()` in the engine.
- Builder `B`: `ground(a,b,h,tile=1)`, `plat`, `block(x,row,w,h,tile=4)`, `crate(x,row,loot)`, `seeds(x,row,n)`, `seedsV`, `seedArc`,
  `bug(type,col,row?)`, `spring`, `cp(col)`, `sign(col,text)`, `mover(...)`, `gate(col)`. Movers may have custom `update/draw` (floes).
- Reach: jump ≈ 168 px (3.5 tiles); gaps ≤ 4–5 tiles; spring ≈ 7 tiles; Frosty geyser ≈ 8 tiles.
- **Collectibles: each world has exactly 100** (placed + crate seeds + 6 boss drop). Collecting all 100 triggers a special sky
  at the ending (world 1: laughing sun, clear sky; world 2: rainbow aurora, the moon wakes up and winks, the snow stops).
- Debug: `#x=150` (world 1) · `#w=2&x=80` (world 2) · `#win` / `#w=2&win`.

## Design decisions agreed with the user (keep these unless asked)
- **Controls (keyboard):** ← → / A D walk · SPACE jump (↑/W also) · H hammer (X also) · J or ↓ in the air = slam ·
  ↓ on the ground = crouch (on ice while moving = belly slide) · G = hammer throw · F full screen · M mute · P/Esc pause ·
  cutscenes: SPACE/H = next line, Enter/Esc = skip the whole scene (touch: tap = next, SKIP button = skip).
- **Controller (standard mapping):** Cross/A jump · Circle/B hammer · Square/X throw · Triangle/Y slam · stick down crouch/slam · Start.
- **Touch (phones/tablets):** `touchMode` is on after a finger touch (or on a coarse-pointer device) and off after a key or
  gamepad press; prompts use `ui(keyText, touchText)` and signs take an optional touch text `sign(col, text, touchText)`.
  Left 42% of the screen = d-pad (diagonals work: ▶+▼ belly slide); buttons pick the nearest within 2.2 radii.
  Uses touch events, rebuilt from `e.touches` on every event, so a lost touchend (iOS edge swipe) can't leave ▶ stuck
  (pointer events got stuck on an iPhone). Menu taps act when the finger lifts (user activation for full screen).
  Intro/story: tap = next line, skip only via the SKIP button (no accidental skips). Portrait = pause + "turn sideways" screen.
  Full screen: requested on the title tap (Android/iPad) + landscape lock; iPhone has no Fullscreen API → Add to Home Screen.
  Canvas resolution is capped at 2× devicePixelRatio. iOS `navigator.audioSession.type = 'playback'` so sound plays on silent.
- **Hammer throw:** Thor-style boomerang; `THROW_RELOAD = 5` s from the catch; loaded at start and after a respawn.
- **Lives:** 3 lives × 3 hearts; a heart at full hearts = +1 life (max 9); lives carry over to the next world; game over restarts the current world.
- **On death:** respawn at the checkpoint; all bugs respawn; the boss resets to full health and sleeps until you re-enter the arena.
- **World 1:** wasps swoop to head height (duck to dodge); armored beetles run 4.5× faster after the first hit; Big Bug boss 5 hp, 2× speed.
- **World 2:** ice + belly slide (bowls over bugs), sinking floes, cracking ice, geysers, wind (crouch braces), icicles;
  snow fleas, ice spiders (duck under them), frost moths (snowballs can be batted back and home in on the thrower), roly-polys
  (a swing only bounces a rolling one; throw/slam/slide stop it); Bigger Bug: 10 hp, flies + snow bombs, only the throw or a
  batted bomb hurts him in the air; he dives and gets stuck (harmless and hittable, ~3 hits per dive); angry at ≤ 5 hp (double dives, fleas).
- **Hammer Duck dresses for the weather:** on Frosty Isle she wears a white puffy coat + blue scarf (`heroCoat`, `heroScarf`).
- **Feet only move while you walk:** sliding on ice (no direction pressed) keeps the legs still (`P.walking`).
- **Bugs never fall off platforms or into water on their own:** walkers and rolling roly-polys bounce back at edges,
  fleas only hop where they can land (`groundAt()`); only a hit from Hammer Duck may knock a bug off.
- **Music per world:** intro (calm → boss) · main · boss · hero (after the boss) · victory jingle · calm (ending). No laugh sounds.

## Testing workflow
1. `node tools/smoke-test.js`, `node tools/world2-test.js` and `node tools/touch-test.js` must pass after every change; add checks for new features.
   Run the world 2 test a few times: the game uses randomness, so make tests deterministic (reset velocities, pick solid ground).
2. Visuals: headless Chrome screenshots, then look at them:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --screenshot=out.png --window-size=1024,576 --virtual-time-budget=2500 "file://$PWD/index.html#w=2&x=60"`
   For exact moments use `tools/stage.html` (it freezes a scene; see the hash options at its top), e.g.
   `--screenshot=out.png "file://$PWD/tools/stage.html#intro=2&t=8.4"` or `#w=2&x=196&boss=stuck&bx=199&t=0.6`.
   Touch UI: add `&touch=1` (and `&pause=1`), e.g. `--window-size=844,390` (iPhone) or `1180,820` (iPad).
   Headless Chrome can't go narrower than ~500 px, so test portrait at e.g. `600,900`.
   Note it keeps calling `render()` every frame: Chrome resizes after load, which clears a single draw.
3. Test through real key/button presses (`dn`/`up`/`BTN`), not only by calling functions.

## Gotchas learned
- Enemies start `awake: false` and combat skips them; custom wake-up logic must set `awake = true`.
- Speed caps: clamp after acceleration, or speed grows without limit.
- The swing hitbox is active for several frames: anything it "bats" must be skipped on the following frames (snowballs).
- `groundTop(col)` returns the first solid tile from the top, which can be an overhead ice bridge, not the floor.
- In Node 26, `global.navigator` is read-only; the harness uses `Object.defineProperty`.
- Browsers only allow full screen after a key press or click, not a gamepad button.
- Top-level `const`/`let` are shared across the classic script files: avoid duplicate names (frost.js uses an IIFE).
