# My Pet Dumpling 🥟

A browser pet-raising game: adopt a baby dumpling, care for it, train it with minigames, and battle in a 3D bamboo-steamer arena.

## Play

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari). For best results serve the folder locally:

```bash
python3 -m http.server 8000
```

…then visit http://localhost:8000. The 3D arena loads three.js (r128) from cdnjs, so the first visit needs internet.

## Save data

Saved automatically to `localStorage` in **this browser** (key `myPetDumpling.save.v1`). Clearing site data or switching browsers starts fresh.

## What's in it

- Adopt Bao, Gyoza or Shumai and pick its **name, color, eyes, cheeks and accessory** (all changeable later in the Closet).
- Four needs. If any need drops **below 20, growing pauses** until you raise it.
- **Night time (9 PM to 7 AM):** your dumpling goes to bed by itself and wakes at 7 AM. Waking it at night makes its energy drain fast. Sleep refills energy slowly (about 12 per hour).
- **Walks** in the park (tap to hop), **8 toys**, and a **Decorate** screen for walls, wallpaper, floors and 12 decorations.
- Separate music for home, night, each training game, walks and battles.

## Controls

- **Home:** tap the dumpling to pet it; tap the bowl (feed), toy basket (play), bath (wash) or bed (sleep); tap the floor to make it walk there. Change walls, wallpaper and floors in Decorate.
- **Training:** Space / arrow keys / WASD, or the big on-screen buttons.
- **Arena (keyboard):** WASD/arrows move · J attack (tap 3 times for a combo, hold to charge a Smash) · K block (hold) · Space dodge · L special · I second move · O ultimate · Esc pause.
- **Battle tricks:** block just before a hit lands to **Parry**, or dodge at the last moment for a **Perfect Dodge**. Both slow time and make your next hit critical. A fully charged Smash breaks through blocks.
- **Arena (phone):** drag anywhere on the left half to move (the joystick appears under your thumb); big buttons on the right. Works upright or sideways. Touch controls can be forced on or off in Settings.

## Putting it on a website (Google Sites)

`my-pet-dumpling-single.html` is the whole game in one file. In Google Sites use **Insert → Embed → Embed code** and paste the file's contents. Rebuild it after changing the code:

```bash
python3 build_single.py
```

## Developer panel

Press **Ctrl+Shift+D** or add `?dev=1` to the URL. It can add a day of age, preview each growth stage, simulate 12 hours away, add coins, change needs, fake night or day, and reset the test save.

## Files

- `js/data.js`: starters, foods, items, opponents, achievements
- `js/state.js`: saving, real-time growth, needs decline (capped while away), stats, battle numbers
- `js/home.js`: room, care actions, bath, toys, personality moments
- `js/menus.js`: adoption, shop, closet, stats, trophies, settings, milestones, dev panel
- `js/training.js`: the five exercise minigames
- `js/walk.js`: the walk in the park
- `js/arena.js`: the three.js battle arena, AI and touch controls
- `js/draw.js`: anime-style art (cel shading, ink outlines, anime eyes and expressions), also used for the 3D fighters' faces
- `js/audio.js`, `js/ui.js`, `js/main.js`: art, synthesized sound, UI helpers, boot
