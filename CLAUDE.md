# Hammer Duck: Bug Island Rescue

A 2D platformer for a family (played on a MacBook Air M4, in Safari/Chrome, keyboard or DualShock).
Bright, cartoony island style with comic "SMASH!" pop-ups and faces on bushes and clouds. All original art;
do not copy any existing game's characters, levels or look.
Hero: a yellow duck (mama) with a red bandana and a huge wooden hammer. Bugs invade her island; the hammer is the
only way to defeat them. **Story:** in the intro the Big Bug (the level-1 boss) kidnaps her family (papa duck in a blue cap
+ 4 ducklings) in a net on its back and runs off taunting her; she chases it across the island, beats it, and the
family celebrates at the end. **Tone:** silly, infantile, feel-good action fun. Never scary or serious.

## Files
- `index.html`: the entire game in one file: canvas 2D, Web Audio, no dependencies, no assets. Open it in a browser.
- `tools/harness.js`: headless Node harness (fake canvas/audio/gamepad/DOM) that runs the real game code.
- `tools/smoke-test.js`: regression test. Run `node tools/smoke-test.js` after every change. It must print "All passed".

## Layout of index.html (in order)
constants → input (keys, gamepad) → audio (`tone`, `noise`, `SFX`, music `TRACKS`) → level (`buildLevel`) →
player/physics (`moveBody`, `updatePlayer`) → combat (`hitEnemy`, `combat`, hammer throw) → enemies
(`updateEnemies`, `updateWasp`, `updateBoss`) → `step()` → rendering (background, tiles, decor, `drawDuck`,
`drawBug`, HUD, title/win/game-over/pause screens) → intro cutscene (`updateIntro`, `drawIntro`) → `render` → main loop.
States: `title` → `intro` (~15 s, Enter skips) → `play` ⇄ `pause` → `win` | `gameover`. Restarting after a win or game over skips the intro.
Fixed timestep 1/120 s. Logical resolution 1024×576, scaled to the window.

## Level building (`buildLevel`)
- Tile grid: `TS = 48` px, `ROWS = 12`, width `LW = 262` columns. Row 11 is the bottom; falling below = water death.
- Tile codes: 0 empty, 1 ground (grass top drawn automatically), 2 one-way wooden plank, 3 crate (breakable),
  4 stone block, 6 bug-goo gate (solid, removed when the boss dies).
- Helpers: `ground(x0, x1, h)`, `plat(x, row, w)`, `block(x, row, w, h)`, `crate(x, row, loot)` (loot `'seeds'` (3) | `'heart'` | `'none'`),
  `seeds(x, row, n)`, `seedsV`, `seedArc`, `bug(type, col, row?)`, `spring(col, row)`, `cp(col)` checkpoint,
  `sign(col, text)`, `mover(x1, y1, x2, y2, wTiles, periodSec)`.
- Bug types (`EDEF`): `beetle`, `ladybug` (fast), `armor` (2 hits; after the first hit it runs 4.5× faster),
  `fly` (wasp: hovers, then swoops to head height; ducking dodges it), `boss` (5 hp, in the arena `ARENA_L = 201` to `ARENA_R = 227`).
- Physics reach: jump ≈ 168 px (3.5 tiles high), gaps up to about 4–5 tiles; a spring launches about 7 tiles high.
- Current layout: start beach → hills → lagoon with moving rafts → crate fields → stone towers & springs →
  bug swarm → boss arena → home beach with the family (`GOAL_COL = 238`).
- Debug: `index.html#x=150` starts at column 150; `index.html#win` jumps to the ending.

## Design decisions agreed with the user (keep these unless asked)
- **Controls (keyboard):** ← → / A D walk · SPACE jump (↑/W also) · H hammer (X also) · J or ↓ in the air = slam ·
  ↓ on the ground = crouch · G = hammer throw · F full screen (also double-click) · M mute · P/Esc pause.
- **Controller (standard mapping):** Cross/A jump · Circle/B hammer · Square/X throw · Triangle/Y slam · stick down crouch/slam · Start.
- **Hammer throw:** Thor-style; it spins forward, smashes bugs and crates both ways, and boomerangs back. It's a special move:
  `THROW_RELOAD = 5` s, counted from the catch. Loaded at game start and after a respawn. HUD meter shows the reload.
- **Lives:** start with 3 lives, 3 hearts each. A heart found while hearts are full gives +1 life ("1-UP", max 9).
  0 lives → GAME OVER → Enter restarts the level from the beginning.
- **On death:** respawn at the last checkpoint; **all bugs respawn** (`L.spawns`); the boss resets to full health and
  sleeps until you re-enter the arena. Crates and seeds stay collected.
- **Sunseeds:** the level total must be **exactly 100**, counting placed seeds + crate seeds (3 each) + the boss drop (6).
  Collecting all 100 makes the sun laugh at the ending (visual only, NO laugh sound), the sky turns clear deep blue and the clouds go away.
- **Intro:** scripted with timestamps in `updateIntro`/`drawIntro` (speech bubbles via `bubble()`); the hero then starts
  playing from where she stopped. An empty nest with a feather stays at the start of the level.
- **Music:** `calm` → `boss` during the intro; `main` (cheerful island) on the title and level → `boss` (fast, dramatic minor) during the fight →
  `hero` (triumphant march) after beating the boss → victory jingle → `calm` (lullaby) with the family.
- Kid-friendly difficulty, but the user asked for the fast boss (2× speed) and the swooping wasps.

## Testing workflow
1. `node tools/smoke-test.js` must pass after every change. Add a check for each new feature.
2. For visuals, take headless Chrome screenshots and look at them:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --screenshot=out.png --window-size=1024,576 --virtual-time-budget=2500 "file://$PWD/index.html#x=120"`
   (headless Chrome runs few frames. To show a specific state, make a temporary copy that sets state before `requestAnimationFrame(frame)`).
3. Test through real key/button presses (`dn`/`up`/`BTN`), not just by calling functions. Calling functions directly once hid a bug.

## Gotchas learned
- Enemies start `awake: false` and combat skips them; anything with custom wake-up logic must set `awake = true`.
- Speed caps: apply the clamp after acceleration, or the speed grows without limit.
- In Node 26, `global.navigator` is read-only. The harness uses `Object.defineProperty`.
- Browsers only allow full screen after a key press or click, not after a gamepad button.

## Ideas for future levels (not built yet)
The game has one level. A second level needs: `buildLevel(n)` with per-level data, a level-complete screen
(the family ending maybe only after the final level), carrying lives/seeds between levels, and maybe a new theme
(e.g. a jungle or volcano part of the island) with new bug types and a new boss. Ask the user for their ideas first.
