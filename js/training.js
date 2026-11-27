/* My Pet Dumpling — training grounds: five 40-second exercise minigames.
   The play area fills the screen (tall on phones, wide on computers) and every game is played with
   swipes / taps on the play area or the keyboard. No on-screen buttons. */
(function (DG) {
  let W = 800, H = 450, PT = false; // logical play-area size; PT = tall phone (portrait) layout
  const TAU = Math.PI * 2;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (n) => DG.audio.play(n);
  const DIFFS = [
    { name: 'Easy', cost: 5, stage: 0 },
    { name: 'Medium', cost: 6, stage: 2 },
    { name: 'Hard', cost: 8, stage: 3, tag: 'Advanced' },
  ];

  let root, canvas, ctx, raf = 0, last = 0, T = 0;
  let g = null, def = null, gameId = null, diff = 0, phase = 'menu', countT = 0, timeLeft = 0, held = {}, parts = [], hudAcc = 0;

  function pop(text, color, x, y) {
    parts.push({ kind: 'text', text, x: x == null ? W / 2 : x, y: y == null ? H * 0.25 : y, vy: -45, size: 28, life: 1.1, max: 1.1, color: color || '#e8a33a', bold: true });
  }
  function petOpts(extra) {
    const p = DG.pet();
    return Object.assign({ type: p.type, look: p.look, stage: DG.stageIndex(), accessory: p.accessory, trait: p.trait, t: T }, extra);
  }
  function sky(top, bottom, h) {
    const gr = ctx.createLinearGradient(0, 0, 0, h || H);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, h || H);
  }
  function cloud(x, y, s) {
    ctx.beginPath(); ctx.arc(x, y, 16 * s, 0, TAU); ctx.arc(x + 18 * s, y - 8 * s, 19 * s, 0, TAU); ctx.arc(x + 38 * s, y, 15 * s, 0, TAU); ctx.fill();
  }
  function hills(y, c1, c2) {
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y - 34 - Math.sin(x / 90) * 22);
    ctx.lineTo(W, y + 4); ctx.lineTo(0, y + 4); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y - 14 - Math.sin(x / 60 + 2) * 12);
    ctx.lineTo(W, y + 4); ctx.lineTo(0, y + 4); ctx.fill();
  }
  function bush(x, y, s, c) {
    ctx.fillStyle = c || '#7cc56f';
    ctx.beginPath(); ctx.arc(x - 18 * s, y, 16 * s, Math.PI, TAU); ctx.arc(x, y - 6 * s, 20 * s, Math.PI, TAU); ctx.arc(x + 19 * s, y, 15 * s, Math.PI, TAU); ctx.fill();
  }

  /* ======================= GAMES ======================= */
  const GAMES = {
    /* ---------- 1. Jump rope: stamina ---------- */
    jumprope: {
      name: 'Dumpling Jump Rope', stat: 'stamina', icon: '🪢', duration: 40,
      desc: 'Jump as the rope swings under your feet. Chain jumps to build a score multiplier!',
      how: '<b>Tap</b> or <b>swipe up</b> (or press <b>Space</b>) just before the rope reaches your feet. When the marker on the timing bar is in the <b style="color:#2a9d6f">green zone</b>, jump! The dark center is a <b>perfect</b> jump.',
      keys: { Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyJ: 'jump' },
      gestures: { tap: 'jump', up: 'jump' },
      create(d) {
        const g = { period: [1.7, 1.45, 1.25][d], minP: [1.05, 0.88, 0.72][d], ph: 0.4, air: 0.5, jumpT: -1, t: 0, seed: Math.random() * 6,
          passes: 0, ok: 0, perfect: 0, streak: 0, mult: 1, score: 0, stumble: 0, land: 0 };
        /* The rope doesn't keep a perfectly even beat: it drifts a little faster and slower, so the moment it reaches
           your feet (and the green zone on the timing bar) slides around. The drift grows as the round goes on. */
        const feetAt = () => {
          const amp = [0.035, 0.055, 0.075][d] * Math.min(2, 1 + g.t / 25);
          return 0.88 + amp * Math.sin(g.t * 0.6 + g.seed) + amp * 0.5 * Math.sin(g.t * 1.45 + g.seed * 2);
        };
        g.k = Math.floor(g.ph - feetAt());
        const airFor = () => Math.min(0.5, g.period * 0.6);
        g.feetAt = feetAt;
        g.press = (id) => {
          if (id !== 'jump' || g.jumpT >= 0 || g.stumble > 0) return;
          g.air = airFor(); g.jumpT = 0; sfx('jump');
        };
        g.update = (dt) => {
          g.period = Math.max(g.minP, g.period - dt * 0.014 * (1 + d * 0.3));
          if (g.jumpT >= 0) { g.jumpT += dt; if (g.jumpT >= g.air) { g.jumpT = -1; g.land = 0.15; } }
          if (g.land > 0) g.land -= dt;
          if (g.stumble > 0) g.stumble -= dt;
          g.t += dt;
          g.ph += dt / g.period;
          const k = Math.floor(g.ph - feetAt());
          if (k > g.k) { // the rope just swept under the dumpling's feet
            g.k = k;
            if (g.stumble > 0) return;
            g.passes++;
            const gy = ground();
            if (g.jumpT >= 0) {
              g.ok++; g.streak++;
              g.mult = 1 + Math.min(3, Math.floor(g.streak / 4) * 0.5);
              const perfect = Math.abs(g.jumpT - g.air / 2) < g.air * 0.2;
              if (perfect) { g.perfect++; DG.state.counters.perfectJumps++; sfx('perfect'); pop('Perfect!', '#2a9d6f', W / 2, gy - 250); }
              else { sfx('good'); pop('Nice!', '#e8a33a', W / 2, gy - 250); }
              g.score += Math.round(10 * g.mult * (perfect ? 1.5 : 1));
            } else {
              g.streak = 0; g.mult = 1; g.stumble = 0.8; sfx('bad'); pop('Oops! Tripped!', '#e8607a', W / 2, gy - 250);
            }
          }
        };
        const ground = () => (PT ? H - Math.max(70, H * 0.17) : H - 45);
        g.perf = () => g.ok / Math.max(8, g.passes);
        g.hud = () => `Jumps <b>${g.ok}</b> · ⭐<b>${g.perfect}</b>`;
        g.summary = () => `${g.ok}/${g.passes} jumps cleared · ${g.perfect} perfect`;
        g.draw = () => {
          const cx = W / 2, gy = ground();
          sky('#ffe3c8', '#fff6ea', gy);
          ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(W - 90, PT ? 170 : 100, 34, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; cloud(((T * 8) % (W + 120)) - 60, PT ? 230 : 120, 1); cloud(W - ((T * 5 + 200) % (W + 120)), PT ? 330 : 170, 0.8);
          if (PT) { // tall phone: a couple of big round trees fill the sky
            [[40, 1.25], [W - 30, 1.05]].forEach(([tx2, sc]) => {
              ctx.fillStyle = '#a8764a'; ctx.fillRect(tx2 - 9 * sc, gy - 250 * sc, 18 * sc, 200 * sc);
              [['#8fcf7a', 0, -270, 70], ['#a5da8e', -34, -230, 52], ['#a5da8e', 36, -236, 50], ['#b8e4a0', -6, -300, 40]].forEach(([c, dx, dy, r]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(tx2 + dx * sc, gy + dy * sc, r * sc, 0, TAU); ctx.fill(); });
            });
          }
          hills(gy - 60, '#cfe9b8', '#b5dd9c');
          ctx.fillStyle = '#b5dd9c'; ctx.fillRect(0, gy - 58, W, 60);
          bush(40, gy - 2, 1, '#93cf80'); bush(W - 40, gy - 2, 1.1, '#93cf80');
          ctx.fillStyle = '#f6cfa3'; ctx.fillRect(0, gy, W, H - gy);
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (let x = 0; x < W; x += 80) ctx.fillRect(x, gy, 40, H - gy);
          const Tc = feetAt(), a = (g.ph - Tc) * TAU, ropeY = gy - 118 + Math.cos(a) * 118;
          const front = Math.sin(a) < 0;
          const ts = PT ? 76 : 90, tx = PT ? W / 2 - 52 : 270;
          // the two friends turn the rope: each holds a handle and cranks it round in a little circle
          const FR = [
            { x: cx - tx, s: 1, type: 'soup', col: { base: '#d9ecc6', light: '#f6fff0', line: '#a9c493' } },
            { x: cx + tx, s: -1, type: 'bao', col: { base: '#ffd3df', light: '#fff4f7', line: '#e3a3b5' } },
          ];
          FR.forEach((f) => {
            f.sx = f.x + f.s * ts * 0.3; f.sy = gy - ts * 0.48; // shoulder
            f.hx = f.x + f.s * (ts * 0.5 + Math.cos(a) * 4); f.hy = gy - ts * 0.42 - Math.sin(a) * 5; // rope end, right at their side
          });
          const L = FR[0], R2 = FR[1];
          const rope = () => {
            ctx.strokeStyle = '#e8607a'; ctx.lineWidth = front ? 7 : 5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(L.hx + 6, L.hy); ctx.quadraticCurveTo(cx, 2 * ropeY - (L.hy + R2.hy) / 2, R2.hx - 6, R2.hy); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 7]);
            ctx.beginPath(); ctx.moveTo(L.hx + 6, L.hy); ctx.quadraticCurveTo(cx, 2 * ropeY - (L.hy + R2.hy) / 2, R2.hx - 6, R2.hy); ctx.stroke(); ctx.setLineDash([]);
          };
          const hands = () => FR.forEach((f) => {
            // handle gripped in the hand (points along the rope)
            ctx.save(); ctx.translate(f.hx, f.hy); ctx.rotate(f.s > 0 ? -0.35 + Math.cos(a) * 0.25 : Math.PI + 0.35 - Math.cos(a) * 0.25);
            ctx.fillStyle = '#4f8ee8'; ctx.strokeStyle = '#2c5fa8'; ctx.lineWidth = 2; DG.roundRect(ctx, -4, -5, 16, 10, 5); ctx.fill(); ctx.stroke();
            ctx.restore();
          });
          if (!front) rope();
          FR.forEach((f) => DG.draw.dumpling(ctx, { type: f.type, x: f.x, y: gy, size: ts, t: T, mood: 'joy', colors: f.col, rot: f.s * Math.sin(a) * 0.06, flip: f.s < 0 }));
          hands();
          const jh = g.jumpT >= 0 ? Math.sin(Math.PI * g.jumpT / g.air) * 115 : 0;
          DG.draw.dumpling(ctx, petOpts({ x: cx, y: gy, size: 100, hop: jh, mood: g.stumble > 0 ? 'dizzy' : jh > 0 ? 'joy' : 'happy',
            squash: g.land > 0 ? 0.15 : g.stumble > 0 ? 0.12 : 0, rot: g.stumble > 0 ? Math.sin(T * 20) * 0.1 : 0 }));
          if (front) { rope(); hands(); }
          // timing bar: the green zone sits just before the moment the rope reaches your feet, and drifts with the rope
          const bw = Math.min(400, W - 70), bx = cx - bw / 2, by = PT ? 40 : 28;
          const air = airFor(), okStart = Tc - air / g.period, ideal = Tc - air / 2 / g.period, pw = (air * 0.2) / g.period;
          ctx.fillStyle = 'rgba(255,255,255,0.88)'; DG.roundRect(ctx, bx - 6, by - 6, bw + 12, 34, 12); ctx.fill();
          ctx.fillStyle = '#bdf0d4'; ctx.fillRect(bx + okStart * bw, by, (Tc - okStart) * bw, 22);
          ctx.fillStyle = '#4cc58a'; ctx.fillRect(bx + (ideal - pw) * bw, by, pw * 2 * bw, 22);
          ctx.strokeStyle = '#d6b89a'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 22);
          const fx = bx + Tc * bw; // the "feet" line
          ctx.fillStyle = '#e8607a'; ctx.fillRect(fx - 1.5, by - 4, 3, 30);
          const mph = ((g.ph % 1) + 1) % 1, mx = bx + mph * bw;
          ctx.fillStyle = '#5a4636'; ctx.beginPath(); ctx.moveTo(mx, by + 26); ctx.lineTo(mx - 9, by + 40); ctx.lineTo(mx + 9, by + 40); ctx.fill();
          ctx.fillRect(mx - 2, by - 2, 4, 26);
          ctx.font = '600 13px Fredoka, sans-serif'; ctx.fillStyle = '#c4505f'; ctx.textAlign = 'center';
          ctx.fillText('feet ↑', Math.min(bx + bw - 18, fx), by + 55);
          if (g.mult > 1) { ctx.font = '700 30px Fredoka, sans-serif'; ctx.fillStyle = '#ff8f3f'; ctx.fillText(`x${g.mult} combo`, cx, by + 95); }
        };
        return g;
      },
    },

    /* ---------- 2. Chopstick hurdles: agility (3-lane runner) ---------- */
    hurdles: {
      name: 'Chopstick Hurdles', stat: 'agility', icon: '🥢', duration: 40, lives: true,
      desc: 'Dash down the kitchen track! Jump, slide and switch lanes past all kinds of obstacles, and catch butterflies.',
      how: '<b>Swipe left / right</b> to switch lanes · <b>swipe up</b> to jump · <b>swipe down</b> to slide. On a keyboard use the <b>arrow keys</b> (or WASD). Catch 🦋 butterflies for points. You have <b>3 stars</b>: bump into 3 obstacles and you have to restart!',
      keys: { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down' },
      gestures: { left: 'left', right: 'right', up: 'up', down: 'down' },
      create(d) {
        const JUMP = 0.62, SLIDE = 0.7;
        const KIND = { chop: 'jump', puddle: 'jump', bowl: 'jump', spoon: 'slide', lantern: 'slide', noodles: 'slide', teapot: 'dodge', steamer: 'dodge', bottle: 'dodge', roller: 'dodge' };
        const POOL = {
          jump: d === 0 ? ['chop', 'chop', 'puddle'] : ['chop', 'puddle', 'bowl'],
          slide: d === 0 ? ['spoon', 'lantern'] : ['spoon', 'lantern', 'noodles'],
          dodge: d === 0 ? ['teapot', 'steamer'] : ['teapot', 'steamer', 'bottle'],
        };
        const g = { lane: 1, lx: 1, jumpT: -1, slideT: -1, obs: [], spawnT: 1.1, speed: [0.5, 0.6, 0.72][d], t: 0, run: 0,
          stars: 3, inv: 0, stumble: 0, flies: 0, fliesSeen: 0, cleared: 0, hits: 0, score: 0, dead: false, shake: 0 };
        const add = (type, lane, extra) => g.obs.push(Object.assign({ type, lane, lf: lane, z: 1, ph: Math.random() * 6 }, extra));
        const fly = (lane, z, high) => { add('fly', lane, { z, high, hue: pick(['#ff9fc4', '#8fd0ff', '#ffd36a', '#b99bff', '#7fe0b0']) }); g.fliesSeen++; };
        const randLane = () => Math.floor(Math.random() * 3);
        function pattern() {
          const r = Math.random(), near = Math.random() < 0.6 ? g.lane : randLane();
          let gap = 0;
          if (r < 0.16) { // butterfly trail (sometimes floating over a hurdle: jump to catch them)
            const lane = randLane();
            if (d > 0 && Math.random() < 0.45) { add('chop', lane, { z: 1.1 }); fly(lane, 1.03, true); fly(lane, 1.1, true); fly(lane, 1.17, true); }
            else for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) fly(lane, 1 + i * 0.08, false);
            gap = 0.2;
          } else if (r < 0.3) { // the same move needed in every lane
            const act = pick(['jump', 'slide']);
            for (let l = 0; l < 3; l++) add(pick(POOL[act]), l);
            gap = 0.25;
          } else if (r < 0.52 && d > 0) { // a wall with one way through
            const open = randLane();
            for (let l = 0; l < 3; l++) {
              if (l !== open) add(pick(POOL.dodge), l);
              else if (Math.random() < 0.5) add(pick(POOL[pick(['jump', 'slide'])]), l);
              else fly(l, 1, false);
            }
            gap = 0.3;
          } else if (r < 0.62 && d === 2) { // a rolling egg tart that swerves into the next lane
            const lane = randLane(), to = lane === 1 ? pick([0, 2]) : 1;
            add('roller', lane, { to });
            gap = 0.15;
          } else {
            const t1 = pick(POOL[pick(['jump', 'jump', 'slide', 'slide', 'dodge'])]);
            add(t1, near);
            if (Math.random() < 0.35) fly((near + 1 + Math.floor(Math.random() * 2)) % 3, 1, d > 0 && Math.random() < 0.3);
            if (d === 2 && Math.random() < 0.35) add(pick(POOL[pick(['jump', 'slide', 'dodge'])]), (near + 1 + Math.floor(Math.random() * 2)) % 3);
          }
          g.spawnT = Math.max([0.85, 0.72, 0.6][d], [1.35, 1.15, 0.98][d] - g.t * 0.008) + gap;
        }
        g.press = (id) => {
          if (id === 'left' && g.lane > 0) { g.lane--; sfx('click'); }
          if (id === 'right' && g.lane < 2) { g.lane++; sfx('click'); }
          if (id === 'up') { if (g.slideT >= 0) g.slideT = -1; if (g.jumpT < 0) { g.jumpT = 0; sfx('jump'); } }
          if (id === 'down') { if (g.jumpT >= 0) g.jumpT = -1; if (g.slideT < 0) { g.slideT = 0; sfx('whoosh'); } }
        };
        g.update = (dt) => {
          g.t += dt; g.lx += (g.lane - g.lx) * Math.min(1, dt * 16);
          if (g.jumpT >= 0) { g.jumpT += dt; if (g.jumpT > JUMP) g.jumpT = -1; }
          if (g.slideT >= 0) { g.slideT += dt; if (g.slideT > SLIDE) g.slideT = -1; }
          if (g.inv > 0) g.inv -= dt;
          if (g.stumble > 0) g.stumble -= dt;
          if (g.shake > 0) g.shake -= dt;
          const sp = g.speed * (1 + g.t * 0.01) * (g.stumble > 0 ? 0.6 : 1);
          g.run += sp * dt;
          g.spawnT -= dt;
          if (g.spawnT <= 0) pattern();
          const air = g.jumpT >= 0.06 && g.jumpT < JUMP - 0.05, low = g.slideT >= 0.02 && g.slideT < SLIDE - 0.04;
          const me = Math.round(g.lx), py = H * 0.25;
          for (const o of g.obs) {
            o.z -= sp * dt;
            if (o.type === 'roller' && o.z < 0.6) o.lane = o.to;
            o.lf += (o.lane - o.lf) * Math.min(1, dt * 5);
            if (o.done || o.z > 0.02) continue;
            o.done = true;
            if (o.type === 'fly') {
              if (o.lane === me && (!o.high || air)) { o.got = true; g.flies++; g.score += 10; sfx('coin'); pop('Butterfly! +10', '#e0559a', W / 2 + (g.lx - 1) * laneW(), playerY() - 190); }
              continue;
            }
            if (o.lane !== me) { g.cleared++; g.score += 5; continue; }
            const act = KIND[o.type], ok = act === 'jump' ? air : act === 'slide' ? low : false;
            if (ok) { g.cleared++; g.score += 15; sfx('good'); pop(act === 'jump' ? 'Hop!' : 'Whoosh!', '#2a9d6f', W / 2 + (g.lx - 1) * laneW(), playerY() - 190); }
            else if (g.inv <= 0) {
              g.hits++; g.stars--; g.inv = 1.2; g.stumble = 0.45; g.shake = 0.3; sfx('bad');
              pop(g.stars > 0 ? 'Bonk! −⭐' : 'Out of stars!', '#e8607a', W / 2 + (g.lx - 1) * laneW(), playerY() - 190);
              if (g.stars <= 0) g.dead = true;
            }
            void py;
          }
          g.obs = g.obs.filter((o) => o.z > -0.3 && !o.got);
        };
        g.perf = () => clamp(0.3 + g.stars * 0.15 + 0.25 * (g.flies / Math.max(4, g.fliesSeen)), 0, 1);
        g.hud = () => `Score <b>${Math.round(g.score)}</b>`;
        g.summary = () => `${g.cleared} obstacles passed · ${g.flies} butterflies · ${g.stars} ⭐ left`;

        /* ---- drawing ---- */
        /* A calm, straight track seen from above: everything slides down the screen at a steady speed
           (no zooming perspective). z = 1 at the top of the screen, 0 at the dumpling. */
        const topY = () => (PT ? -70 : -60); // obstacles slide in from above the screen
        const playerY = () => (PT ? H - Math.max(90, H * 0.13) : H - 34);
        const laneW = () => (PT ? W * 0.235 : 140);
        const span = () => playerY() - topY();
        const SC = () => (PT ? 0.72 : 0.58);
        const proj = (z, lane) => ({ x: W / 2 + (lane - 1) * laneW(), y: playerY() - z * span(), s: SC() });
        const ink = '#5a3a22';
        function sign(act, top) {
          const col = act === 'jump' ? '#ffb52e' : act === 'slide' ? '#5aa8ff' : '#ff6f6f', ch = act === 'jump' ? '⬆' : act === 'slide' ? '⬇' : '↔';
          ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, top - 22, 17, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '700 20px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, top - 21); ctx.textBaseline = 'alphabetic';
        }
        const shadow = (w) => { ctx.fillStyle = 'rgba(90,50,20,0.18)'; ctx.beginPath(); ctx.ellipse(0, 2, w, 9, 0, 0, TAU); ctx.fill(); };
        const pole = (x, h, c) => { ctx.fillStyle = c || '#8a5a3a'; DG.roundRect(ctx, x - 4, -h, 8, h, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 3, -h, 2, h); };
        const DRAW = {
          chop() { // a hurdle made of two lacquered chopsticks
            shadow(70); pole(-58, 34); pole(58, 34);
            [[-40, '#c4373a'], [-30, '#a82c30']].forEach(([y, c], i) => {
              ctx.save(); ctx.translate(0, y); ctx.rotate(i ? 0.03 : -0.02);
              ctx.fillStyle = c; DG.roundRect(ctx, -76, -4.5, 120, 9, 4.5); ctx.fill();
              ctx.fillStyle = '#f0c75a'; ctx.fillRect(28, -4.5, 6, 9);
              ctx.fillStyle = '#f3dcb5'; ctx.beginPath(); ctx.moveTo(42, -4); ctx.lineTo(78, -2); ctx.lineTo(78, 2); ctx.lineTo(42, 4); ctx.fill();
              ctx.restore();
            });
            return -46;
          },
          puddle() { // spilled soy sauce: jump over it or slip
            ctx.fillStyle = '#4a2812'; ctx.beginPath(); ctx.ellipse(0, -2, 66, 15, 0, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-44, -4, 18, 8, 0.3, 0, TAU); ctx.ellipse(48, 1, 16, 7, -0.2, 0, TAU); ctx.fill();
            ctx.fillStyle = '#7a4a26'; ctx.beginPath(); ctx.ellipse(-6, -4, 40, 7, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-20, -6, 14, 3, -0.1, 0, TAU); ctx.fill();
            ctx.fillStyle = '#4a2812'; [[-20, -24], [12, -30], [30, -20]].forEach(([x, y], i) => { const k = (T * 2 + i * 0.4) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(x, y - k * 14, 4, 0, TAU); ctx.fill(); });
            ctx.globalAlpha = 1;
            return -20;
          },
          bowl() { // an upturned-rice bowl, low enough to hop
            shadow(56);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -40, 40, Math.PI, TAU); ctx.fill();
            ctx.fillStyle = '#eef3f8'; ctx.beginPath(); ctx.ellipse(-12, -58, 10, 6, -0.4, 0, TAU); ctx.fill();
            ctx.fillStyle = '#e9eef5'; ctx.strokeStyle = '#7a95b8'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(-54, -40); ctx.quadraticCurveTo(-50, 0, -18, -2); ctx.lineTo(18, -2); ctx.quadraticCurveTo(50, 0, 54, -40); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#4f78b8'; ctx.fillRect(-52, -38, 104, 7);
            ctx.fillStyle = '#4f78b8'; [-26, 0, 26].forEach((x) => { ctx.beginPath(); ctx.arc(x, -20, 5, 0, TAU); ctx.fill(); });
            return -82;
          },
          spoon() { // a porcelain spoon held up on two poles: slide under it
            shadow(74); pole(-62, 104, '#a9b6c4'); pole(62, 104, '#a9b6c4');
            ctx.fillStyle = '#f7f4ee'; ctx.strokeStyle = '#8fa3bf'; ctx.lineWidth = 2.5;
            DG.roundRect(ctx, -84, -104, 130, 13, 6.5); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(66, -97, 26, 16, 0, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#5a84c4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-74, -98); ctx.lineTo(36, -98); ctx.stroke();
            return -120;
          },
          lantern() { // a string of paper lanterns: slide under
            shadow(76); pole(-66, 128, '#9a3a2a'); pole(66, 128, '#9a3a2a');
            ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-66, -124); ctx.quadraticCurveTo(0, -104, 66, -124); ctx.stroke();
            [-38, 0, 38].forEach((x, i) => {
              const sw = Math.sin(T * 2.5 + i) * 0.08, ly = -112 + (x === 0 ? 4 : 0);
              ctx.save(); ctx.translate(x, ly); ctx.rotate(sw);
              ctx.strokeStyle = '#5a3a22'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 6); ctx.stroke();
              const lg = ctx.createRadialGradient(-5, 18, 2, 0, 20, 18); lg.addColorStop(0, '#ff9a7a'); lg.addColorStop(1, '#d83a2e');
              ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(0, 20, 14, 15, 0, 0, TAU); ctx.fill();
              ctx.fillStyle = '#f2c14e'; ctx.fillRect(-7, 4, 14, 4); ctx.fillRect(-7, 33, 14, 4);
              ctx.strokeStyle = 'rgba(120,20,10,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 20, 7, 15, 0, 0, TAU); ctx.stroke();
              ctx.restore();
            });
            return -134;
          },
          noodles() { // a rack of drying noodles: slide under
            shadow(74); pole(-64, 120); pole(64, 120);
            ctx.fillStyle = '#b07a48'; DG.roundRect(ctx, -74, -122, 148, 9, 4); ctx.fill();
            ctx.strokeStyle = '#f5d27a'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
            for (let x = -56; x <= 56; x += 9) {
              const sw = Math.sin(T * 3 + x * 0.1) * 3;
              ctx.beginPath(); ctx.moveTo(x, -114); ctx.bezierCurveTo(x + sw, -100, x - sw, -86, x + sw * 0.6, -70 - Math.abs(x % 4)); ctx.stroke();
            }
            ctx.lineCap = 'butt';
            return -132;
          },
          teapot() { // switch lanes!
            shadow(58);
            const tg = ctx.createRadialGradient(-16, -62, 6, 0, -44, 56); tg.addColorStop(0, '#8fe0d2'); tg.addColorStop(1, '#3a9486');
            ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(0, -44, 52, 44, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#2b6f64'; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.fillStyle = '#3a9486'; ctx.beginPath(); ctx.moveTo(44, -50); ctx.lineTo(86, -82); ctx.lineTo(90, -72); ctx.lineTo(50, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#3a9486'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(-56, -46, 18, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
            ctx.fillStyle = '#7fd0c4'; ctx.beginPath(); ctx.ellipse(0, -86, 26, 9, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2b6f64'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#2b6f64'; ctx.beginPath(); ctx.arc(0, -96, 6, 0, TAU); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-14, -46, 4, 0, TAU); ctx.arc(14, -46, 4, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -40, 6, 0.2, Math.PI - 0.2); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.75)'; [0, 1].forEach((i) => { const k = (T * 0.8 + i * 0.5) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(88 + k * 8, -92 - k * 30, 6 + k * 6, 0, TAU); ctx.fill(); });
            ctx.globalAlpha = 1;
            return -108;
          },
          steamer() { // a tall stack of bamboo steamers
            shadow(58);
            for (let i = 0; i < 3; i++) {
              const y = -i * 34;
              ctx.fillStyle = i % 2 ? '#d7b072' : '#e2bf82'; DG.roundRect(ctx, -52, y - 32, 104, 30, 6); ctx.fill();
              ctx.strokeStyle = '#a9824a'; ctx.lineWidth = 2; ctx.stroke();
              ctx.strokeStyle = 'rgba(150,110,50,0.5)'; ctx.lineWidth = 1.5;
              for (let x = -44; x < 52; x += 10) { ctx.beginPath(); ctx.moveTo(x, y - 28); ctx.lineTo(x + 5, y - 6); ctx.stroke(); }
            }
            ctx.fillStyle = '#ecd09a'; ctx.beginPath(); ctx.ellipse(0, -104, 52, 12, 0, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = '#a9824a'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#c99b5a'; ctx.beginPath(); ctx.arc(0, -116, 6, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)'; [0, 1, 2].forEach((i) => { const k = (T * 0.7 + i / 3) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(-24 + i * 24, -120 - k * 36, 7 + k * 6, 0, TAU); ctx.fill(); });
            ctx.globalAlpha = 1;
            return -132;
          },
          bottle() { // a big soy sauce bottle
            shadow(40);
            const bg = ctx.createLinearGradient(-30, 0, 30, 0); bg.addColorStop(0, '#5a2c12'); bg.addColorStop(0.4, '#8a4a22'); bg.addColorStop(1, '#4a2410');
            ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-30, -70); ctx.quadraticCurveTo(-30, -92, -12, -100); ctx.lineTo(-12, -116); ctx.lineTo(12, -116); ctx.lineTo(12, -100); ctx.quadraticCurveTo(30, -92, 30, -70); ctx.lineTo(30, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#e0453a'; DG.roundRect(ctx, -14, -132, 28, 18, 5); ctx.fill();
            ctx.fillStyle = '#fff6e6'; DG.roundRect(ctx, -24, -64, 48, 38, 6); ctx.fill();
            ctx.fillStyle = '#e0453a'; ctx.beginPath(); ctx.arc(0, -45, 10, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-22, -88, 6, 80);
            return -140;
          },
          roller(o) { // a rolling egg tart that swerves
            shadow(44);
            ctx.save(); ctx.translate(0, -40); ctx.rotate(-g.run * 30);
            ctx.fillStyle = '#d99a4a'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#b8742e'; ctx.lineWidth = 3;
            for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.lineTo(Math.cos(a) * 39, Math.sin(a) * 39); ctx.stroke(); }
            ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill();
            ctx.fillStyle = '#c9781f'; ctx.beginPath(); ctx.arc(8, -6, 6, 0, TAU); ctx.arc(-10, 8, 4, 0, TAU); ctx.fill();
            ctx.restore();
            if (o.z > 0.6 && o.to !== o.lane) { // warning arrow showing where it will swerve
              const dir = Math.sign(o.to - o.lane), fl = 0.5 + 0.5 * Math.sin(T * 14);
              ctx.fillStyle = `rgba(255,90,90,${0.5 + 0.5 * fl})`; ctx.beginPath();
              ctx.moveTo(dir * 78, -40); ctx.lineTo(dir * 54, -58); ctx.lineTo(dir * 54, -22); ctx.fill();
            }
            return -86;
          },
        };
        function drawFlyIcon(x, y) {
          ctx.save(); ctx.translate(x, y); const fl = 0.6 + 0.4 * Math.abs(Math.sin(T * 6));
          ctx.fillStyle = '#ff9fc4'; ctx.strokeStyle = '#b45a84'; ctx.lineWidth = 1.2;
          [-1, 1].forEach((sd) => { ctx.save(); ctx.scale(sd * fl, 1); ctx.beginPath(); ctx.ellipse(7, -5, 8, 7, -0.5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(6, 6, 5, 5, 0.5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); });
          ctx.fillStyle = '#4a2a3a'; DG.roundRect(ctx, -2, -8, 4, 16, 2); ctx.fill();
          ctx.restore();
        }
        function drawFly(o) {
          const p = proj(o.z, o.lf), s = p.s;
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
          const y = o.high ? -150 : -64 + Math.sin(T * 3 + o.ph) * 6;
          ctx.fillStyle = 'rgba(90,50,20,0.12)'; ctx.beginPath(); ctx.ellipse(0, 2, 16, 4, 0, 0, TAU); ctx.fill();
          ctx.translate(Math.sin(T * 2 + o.ph) * 6, y);
          const fl = 0.35 + 0.65 * Math.abs(Math.sin(T * 13 + o.ph));
          ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill();
          ctx.fillStyle = o.hue; ctx.strokeStyle = 'rgba(80,40,60,0.6)'; ctx.lineWidth = 1.5;
          [-1, 1].forEach((sd) => {
            ctx.save(); ctx.scale(sd * fl, 1);
            ctx.beginPath(); ctx.ellipse(11, -7, 12, 10, -0.5, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(9, 8, 8, 7, 0.5, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(12, -8, 3, 0, TAU); ctx.fill(); ctx.fillStyle = o.hue;
            ctx.restore();
          });
          ctx.fillStyle = '#4a2a3a'; DG.roundRect(ctx, -2.5, -11, 5, 22, 2.5); ctx.fill();
          ctx.strokeStyle = '#4a2a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1, -10); ctx.lineTo(-6, -18); ctx.moveTo(1, -10); ctx.lineTo(6, -18); ctx.stroke();
          ctx.restore();
        }
        function drawObs(o) {
          if (o.type === 'fly') return drawFly(o);
          const p = proj(o.z, o.lf);
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
          const top = DRAW[o.type](o);
          if (d < 2 && o.z < 0.98 && o.z > 0.06) sign(KIND[o.type], top);
          ctx.restore();
        }
        g.draw = () => {
          const py = playerY(), cx = W / 2;
          ctx.save();
          if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * g.shake / 0.3, (Math.random() - 0.5) * 8 * g.shake / 0.3);
          // grass with a straight path down the middle
          ctx.fillStyle = '#93cf80'; ctx.fillRect(0, 0, W, H);
          const off = (g.run * span()) % 80;
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          for (let y = -80 + off; y < H; y += 80) ctx.fillRect(0, y, W, 40);
          const tl = W / 2 - laneW() * 1.5 - 14, tw = laneW() * 3 + 28;
          ctx.fillStyle = '#c99b6b'; ctx.fillRect(tl - 6, 0, tw + 12, H);
          ctx.fillStyle = '#f2d2a9'; ctx.fillRect(tl, 0, tw, H);
          ctx.fillStyle = 'rgba(214,170,120,0.25)';
          for (let y = -120 + ((g.run * span()) % 120); y < H; y += 120) ctx.fillRect(tl, y, tw, 50);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4; ctx.setLineDash([26, 26]); ctx.lineDashOffset = -(g.run * span()) % 52;
          [0.5, 1.5].forEach((l) => { const x = W / 2 + (l - 1) * laneW(); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); });
          ctx.setLineDash([]); ctx.lineDashOffset = 0;
          // soft grass tufts drifting past on both sides (shows the speed without busy scenery)
          ctx.strokeStyle = 'rgba(70,140,60,0.35)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          for (let k = -1; k < H / 90 + 1; k++) {
            const y = k * 90 + ((g.run * span()) % 90);
            [tl * 0.35 + (k % 2) * tl * 0.25, W - tl * 0.35 - (k % 2) * tl * 0.25].forEach((x) => {
              ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 8, y - 9); ctx.moveTo(x, y); ctx.lineTo(x, y - 12); ctx.moveTo(x + 5, y); ctx.lineTo(x + 8, y - 9); ctx.stroke();
            });
          }
          ctx.lineCap = 'butt';
          // obstacles behind the dumpling, the dumpling, then anything that has passed it
          const far = g.obs.filter((o) => o.z > 0.0).sort((p, q) => q.z - p.z), near = g.obs.filter((o) => o.z <= 0.0).sort((p, q) => q.z - p.z);
          far.forEach(drawObs);
          const jh = g.jumpT >= 0 ? Math.sin(Math.PI * g.jumpT / JUMP) * 135 : 0, sl = g.slideT >= 0;
          if (!(g.inv > 0 && Math.sin(T * 30) > 0.3)) {
            DG.draw.dumpling(ctx, petOpts({ back: true, x: cx + (g.lx - 1) * laneW(), y: py, size: PT ? 86 : 70, hop: jh, squash: sl ? 0.4 : 0,
              mood: g.stumble > 0 ? 'dizzy' : jh > 0 || sl ? 'joy' : 'happy', rot: (g.lane - g.lx) * -0.25 + Math.sin(T * 14) * 0.05 }));
          }
          if (sl) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx + (g.lx - 1) * laneW() - 40 - i * 14, py - 8 + i * 3, 5 - i, 0, TAU); ctx.fill(); } }
          near.forEach(drawObs);
          ctx.restore();
          // stars + butterflies, drawn on the play area
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; DG.roundRect(ctx, 10, 10, 128, 40, 20); ctx.fill();
          for (let i = 0; i < 3; i++) DG.draw.sparkle(ctx, 34 + i * 38, 30, 14, i < g.stars ? '#ffc93c' : 'rgba(150,130,110,0.35)');
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; DG.roundRect(ctx, W - 104, 10, 94, 40, 20); ctx.fill();
          drawFlyIcon(W - 80, 30);
          ctx.font = '700 22px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#7a4a6a'; ctx.fillText(`${g.flies}`, W - 42, 38);
        };
        return g;
      },
    },

    /* ---------- 3. Rice sack push: strength ---------- */
    ricesack: {
      name: 'Rice Sack Push', stat: 'strength', icon: '🍙', duration: 40,
      desc: 'Push a heavy rice sack up the hill with perfectly timed shoves.',
      how: '<b>Tap</b> or <b>swipe up</b> (or press <b>Space</b>) when the moving marker is inside the <b style="color:#2a9d6f">green zone</b>. The dark center gives a <b>perfect</b> push. Mashing doesn\'t help: after each push, wait for the next good moment.',
      keys: { Space: 'push', KeyJ: 'push', Enter: 'push', ArrowUp: 'push', KeyW: 'push' },
      gestures: { tap: 'push', up: 'push', right: 'push' },
      create(d) {
        const g = { m: 0.1, dir: 1, speed: [0.85, 1.15, 1.5][d], zw: [0.3, 0.22, 0.16][d], zc: 0.5, lock: 0, prog: 0, sacks: 0,
          presses: 0, perfects: 0, goods: 0, misses: 0, score: 0, push: 0, t: 0 };
        g.press = (id) => {
          if (id !== 'push') return;
          if (g.lock > 0) return;
          g.presses++;
          const dist = Math.abs(g.m - g.zc);
          let gain;
          if (dist < 0.035) { g.perfects++; gain = 13; pop('PERFECT PUSH!', '#2a9d6f'); sfx('perfect'); }
          else if (dist < g.zw / 2) { g.goods++; gain = 7 + 5 * (1 - dist / (g.zw / 2)); pop('Good push!'); sfx('good'); }
          else { g.misses++; gain = -4; pop('Slipped!', '#e8607a'); sfx('bad'); }
          g.prog = Math.max(0, g.prog + gain); g.score += Math.max(0, Math.round(gain));
          g.push = gain > 0 ? 1 : -1; g.lock = 0.45; g.zc = 0.2 + Math.random() * 0.6;
          if (g.prog >= 100) { g.sacks++; g.score += 50; g.prog = 0; pop('Sack delivered! +50', '#d68a00', W / 2, H * 0.32); sfx('fanfare'); }
        };
        g.update = (dt) => {
          g.t += dt;
          if (g.lock > 0) g.lock -= dt;
          else {
            g.m += g.dir * g.speed * dt * (1 + g.t * 0.006);
            if (g.m > 1) { g.m = 1; g.dir = -1; } if (g.m < 0) { g.m = 0; g.dir = 1; }
          }
          g.push *= Math.max(0, 1 - dt * 5);
        };
        g.perf = () => ((g.perfects + g.goods * 0.75) / Math.max(1, g.presses)) * Math.min(1, g.presses / (14 + d * 3));
        g.hud = () => `Sacks <b>${g.sacks}</b> · ⭐<b>${g.perfects}</b>`;
        g.summary = () => `${g.sacks} sacks delivered · ${g.perfects} perfect / ${g.goods} good / ${g.misses} slips`;
        g.draw = () => {
          sky('#ffe9c9', '#fff7ea');
          const x0 = PT ? 130 : 60, y0 = PT ? H - Math.max(70, H * 0.12) : H - 35, x1 = W - (PT ? 100 : 60), y1 = PT ? y0 - (x1 - x0) * 1.05 : 205, ang = Math.atan2(y1 - y0, x1 - x0);
          const by = PT ? Math.max(40, y1 - 300) : 26;
          if (PT) { // mountains + a terraced rice field fill the tall sky
            ctx.fillStyle = '#d9e6f5'; ctx.beginPath(); ctx.moveTo(0, y1 - 40); ctx.lineTo(W * 0.25, by + 140); ctx.lineTo(W * 0.5, y1 - 70); ctx.lineTo(W * 0.75, by + 110); ctx.lineTo(W, y1 - 60); ctx.lineTo(W, y1 + 40); ctx.lineTo(0, y1 + 40); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(W * 0.75, by + 110); ctx.lineTo(W * 0.7, by + 150); ctx.lineTo(W * 0.8, by + 150); ctx.fill();
          }
          ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(W - 110, by + (PT ? 120 : 70), 40, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; cloud(((T * 9) % (W + 140)) - 70, by + (PT ? 170 : 90), 0.9);
          ctx.fillStyle = '#c5e6ad'; ctx.beginPath(); ctx.moveTo(0, y1 + 30); ctx.quadraticCurveTo(W * 0.3, y1 - 60, W * 0.6, y1 + 10); ctx.quadraticCurveTo(W * 0.85, y1 - 40, W, y1 - 20); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
          ctx.fillStyle = '#9fd38a'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, y0 + 10); ctx.lineTo(x1 + 60, y1 - 8); ctx.lineTo(W, y1 - 10); ctx.lineTo(W, H); ctx.fill();
          ctx.strokeStyle = '#7dba6a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, y0 + 10); ctx.lineTo(x1 + 60, y1 - 8); ctx.stroke();
          for (let i = 0; i < 5; i++) bush(80 + i * (W / 5), y0 + 40 + i * 10 + (PT ? 40 : 0), 0.8, '#86c672');
          ctx.fillStyle = '#c4553e'; ctx.fillRect(x1 + 20, y1 - 90, 5, 80);
          ctx.fillStyle = '#ff7a7a'; ctx.beginPath(); ctx.moveTo(x1 + 25, y1 - 90); ctx.lineTo(x1 + 70, y1 - 75); ctx.lineTo(x1 + 25, y1 - 60); ctx.fill();
          for (let i = 0; i < Math.min(g.sacks, 4); i++) { ctx.fillStyle = '#f0e2c4'; DG.roundRect(ctx, x1 - 10 + i * 12, y1 - 40 - i * 8, 40, 32, 10); ctx.fill(); }
          const k = 0.12 + (g.prog / 100) * 0.78;
          const sx = x0 + (x1 - x0) * k, sy = y0 + (y1 - y0) * k;
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
          ctx.fillStyle = '#f3e6c9'; DG.roundRect(ctx, -45, -80, 90, 80, 22); ctx.fill();
          ctx.strokeStyle = '#d6c39b'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#c4553e'; ctx.fillRect(-10, -92, 20, 14);
          ctx.fillStyle = '#c4553e'; ctx.font = '700 18px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RICE', 0, -36);
          ctx.restore();
          const back = 78 + g.push * 10;
          const px = sx - Math.cos(ang) * back, py = sy - Math.sin(ang) * back;
          DG.draw.dumpling(ctx, petOpts({ x: px, y: py, size: 88, rot: ang + 0.25, squash: g.push > 0.3 ? -0.1 : 0.04,
            mood: g.push < -0.3 ? 'surprised' : g.push > 0.3 ? 'joy' : 'grumpy', shadow: false }));
          if (Math.sin(T * 6) > 0.7) parts.push({ kind: 'dot', color: '#8fd0ff', x: px - 30, y: py - 80, vx: -40, vy: -60, g: 300, size: 4, life: 0.5, max: 0.5 });
          // timing bar
          const bw = Math.min(500, W - 60), bx = W / 2 - bw / 2;
          ctx.globalAlpha = g.lock > 0 ? 0.45 : 1;
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; DG.roundRect(ctx, bx - 8, by - 8, bw + 16, 42, 14); ctx.fill();
          ctx.fillStyle = '#bdf0d4'; ctx.fillRect(bx + (g.zc - g.zw / 2) * bw, by, g.zw * bw, 26);
          ctx.fillStyle = '#2fb57a'; ctx.fillRect(bx + (g.zc - 0.035) * bw, by, 0.07 * bw, 26);
          ctx.strokeStyle = '#d6b89a'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 26);
          const mx = bx + g.m * bw;
          ctx.fillStyle = '#5a4636'; ctx.fillRect(mx - 3, by - 4, 6, 34);
          ctx.globalAlpha = 1;
          ctx.font = '600 14px Fredoka, sans-serif'; ctx.fillStyle = '#7a6250'; ctx.textAlign = 'center';
          ctx.fillText(g.lock > 0 ? 'catching breath…' : 'tap when the marker is in the green!', W / 2, by + 52);
          // progress up the hill
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; DG.roundRect(ctx, bx, by + 64, bw, 14, 7); ctx.fill();
          ctx.fillStyle = '#ffb04a'; DG.roundRect(ctx, bx, by + 64, Math.max(14, bw * g.prog / 100), 14, 7); ctx.fill();
        };
        return g;
      },
    },

    /* ---------- 4. Pea dodge: defense ---------- */
    peadodge: {
      name: 'Pea Dodge', stat: 'defense', icon: '🟢', duration: 40, repeatKeys: true,
      desc: 'Peas roll across the tray and drop from above. Every wave aims at you, so keep hopping to a safe square!',
      how: '<b>Swipe</b> up, down, left or right to hop one square (or use the <b>arrow keys / WASD</b>). <b style="color:#e8607a">Red arrows</b> show rows and columns where peas will roll, and <b>growing shadows</b> show where big peas will land. Every wave aims at your square, so you have to move! Grab ✨ <b>golden peas</b> for bonus points.',
      keys: { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' },
      gestures: { left: 'left', right: 'right', up: 'up', down: 'down' },
      create(d) {
        const N = 5;
        const geo = () => {
          const C = PT ? Math.min(84, (W - 90) / N) : 66, B = N * C;
          return { C, B, ox: W / 2 - B / 2, oy: PT ? Math.max(90, (H - B) / 2 - 10) : 52 };
        };
        const g = { r: 2, c: 2, fx: 2, fy: 2, hopT: 0, waves: 0, dodged: 0, hits: 0, inv: 0, wave: null, waveT: 0.9, t: 0, score: 0,
          gold: null, goldT: 2.5, golds: 0, n: 0,
          warn: [1.25, 1.05, 0.88][d], roll: [1.1, 0.95, 0.8][d], gap: [0.45, 0.32, 0.22][d] };
        const rnd = (n) => Math.floor(Math.random() * n);
        const inLine = (l, r, c) => (l.axis === 'row' && l.idx === r) || (l.axis === 'col' && l.idx === c);
        const danger = (w, r, c) => w.lines.some((l) => inLine(l, r, c)) || w.cells.some((q) => q.r === r && q.c === c);
        function safeNear(w) { // is there a safe square the dumpling can reach (within 2 hops)?
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!danger(w, r, c) && Math.abs(r - g.r) + Math.abs(c - g.c) <= 2) return true;
          return false;
        }
        function makeWave() {
          const level = g.t / 9 + d * 0.9; g.n++;
          for (let tries = 0; tries < 40; tries++) {
            const w = { lines: [], cells: [], t: 0, hit: false, landed: false };
            const kind = level < 1 ? (g.n % 2 ? 'roll' : 'drop') : pick(level > 2.5 ? ['roll', 'drop', 'mix', 'mix'] : ['roll', 'drop', 'mix']);
            if (kind !== 'drop') { // rolling peas: one line always runs through the dumpling's square
              const nl = Math.min(4, 1 + Math.floor(level * 0.7)) - (kind === 'mix' ? 1 : 0);
              const first = Math.random() < 0.5 ? { axis: 'row', idx: g.r } : { axis: 'col', idx: g.c };
              w.lines.push(Object.assign(first, { dir: Math.random() < 0.5 ? 1 : -1 }));
              while (w.lines.length < Math.max(1, nl)) {
                const axis = Math.random() < 0.5 ? 'row' : 'col', idx = rnd(N);
                if (w.lines.some((l) => l.axis === axis && l.idx === idx)) continue;
                w.lines.push({ axis, idx, dir: Math.random() < 0.5 ? 1 : -1 });
              }
            }
            if (kind !== 'roll') { // big peas dropping from above: one lands right where the dumpling is
              const nc = Math.min(11, 3 + Math.floor(level * 2)) - (kind === 'mix' ? 2 : 0);
              w.cells.push({ r: g.r, c: g.c });
              while (w.cells.length < nc) {
                const q = { r: rnd(N), c: rnd(N) };
                if (!w.cells.some((o) => o.r === q.r && o.c === q.c)) w.cells.push(q);
              }
            }
            let safe = 0;
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!danger(w, r, c)) safe++;
            if (safe >= 3 && safeNear(w)) return w;
          }
          return { lines: [{ axis: 'row', idx: g.r, dir: 1 }], cells: [], t: 0, hit: false };
        }
        g.press = (id) => {
          const dr = id === 'up' ? -1 : id === 'down' ? 1 : 0, dc = id === 'left' ? -1 : id === 'right' ? 1 : 0;
          const r = clamp(g.r + dr, 0, N - 1), c = clamp(g.c + dc, 0, N - 1);
          if (r === g.r && c === g.c) return;
          g.r = r; g.c = c; g.hopT = 0.16; sfx('pop');
          if (g.gold && g.gold.r === r && g.gold.c === c) {
            const { C, ox, oy } = geo();
            g.golds++; g.score += 15; sfx('coin'); pop('✨ +15', '#d6a100', ox + c * C + C / 2, oy + r * C - 10); g.gold = null; g.goldT = 1.6 + Math.random() * 1.6;
          }
        };
        const hurt = (px, py) => {
          const { ox, oy } = geo();
          g.hits++; g.wave.hit = true; g.inv = 1.0; pop('Bonk!', '#e8607a', ox + px, oy + py - 50); sfx('bad');
        };
        g.update = (dt) => {
          g.t += dt;
          g.fx += (g.c - g.fx) * Math.min(1, dt * 18); g.fy += (g.r - g.fy) * Math.min(1, dt * 18);
          if (g.hopT > 0) g.hopT -= dt;
          if (g.inv > 0) g.inv -= dt;
          // golden pea to chase
          if (g.gold) { g.gold.life -= dt; if (g.gold.life <= 0) { g.gold = null; g.goldT = 1.5 + Math.random() * 2; } }
          else if ((g.goldT -= dt) <= 0) {
            let r, c; do { r = rnd(N); c = rnd(N); } while (Math.abs(r - g.r) + Math.abs(c - g.c) < 2);
            g.gold = { r, c, life: 3.2 };
          }
          if (!g.wave) { g.waveT -= dt; if (g.waveT <= 0) g.wave = makeWave(); return; }
          const { C } = geo();
          const w = g.wave, sp = 1 - Math.min(0.3, g.t / 140), warn = g.warn * sp, roll = g.roll * sp;
          w.t += dt;
          if (w.t <= warn) return;
          const px = g.fx * C + C / 2, py = g.fy * C + C / 2;
          if (w.lines.length) {
            const k = (w.t - warn) / roll; w.k = k;
            for (const l of w.lines) {
              const pos = (-40 / 66) * C + Math.min(1, k) * (N * C + (80 / 66) * C), along = l.dir > 0 ? pos : N * C - pos;
              const peaX = l.axis === 'row' ? along : l.idx * C + C / 2, peaY = l.axis === 'row' ? l.idx * C + C / 2 : along;
              if (k < 1 && g.inv <= 0 && Math.hypot(peaX - px, peaY - py) < C * 0.55) hurt(px, py);
            }
          }
          if (w.cells.length && !w.landed) {
            w.landed = true; sfx('thud');
            if (g.inv <= 0 && w.cells.some((q) => q.r === g.r && q.c === g.c)) hurt(px, py);
          }
          const end = warn + Math.max(w.lines.length ? roll : 0, w.cells.length ? 0.5 : 0);
          if (w.t >= end) {
            g.waves++;
            if (!w.hit) { g.dodged++; g.score += 10 + 3 * (w.lines.length + w.cells.length); pop('Dodged!', '#2a9d6f', geo().ox + px, geo().oy + py - 50); sfx('good'); }
            g.wave = null; g.waveT = g.gap;
          }
        };
        g.perf = () => clamp((g.waves ? (0.8 * g.dodged) / g.waves : 0) + 0.2 * Math.min(1, g.golds / 6), 0, 1);
        g.hud = () => `Dodged <b>${g.dodged}/${g.waves}</b> · ✨<b>${g.golds}</b>`;
        g.summary = () => `${g.dodged} of ${g.waves} waves dodged · ${g.golds} golden peas`;
        const pea = (x, y, r, gold) => {
          ctx.fillStyle = gold ? '#f2c230' : '#7ccf5a'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = gold ? '#fff0a0' : '#a6e584'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, TAU); ctx.fill();
          if (!gold) { ctx.fillStyle = '#2f5a24'; ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.1, r * 0.11, 0, TAU); ctx.arc(x + r * 0.3, y + r * 0.1, r * 0.11, 0, TAU); ctx.fill(); }
        };
        g.draw = () => {
          const { C, B, ox, oy } = geo(), u = C / 66;
          sky('#dff6ea', '#c8eedc');
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc((i * 151 + T * 6) % (W + 60) - 30, 30 + (i * 97) % (H - 60), 10 + (i % 3) * 6, 0, TAU); ctx.fill(); }
          ctx.fillStyle = 'rgba(120,80,40,0.15)'; DG.roundRect(ctx, ox - 16, oy - 10, B + 32, B + 32, 22); ctx.fill();
          ctx.fillStyle = '#c99b6b'; DG.roundRect(ctx, ox - 16, oy - 16, B + 32, B + 32, 22); ctx.fill();
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            ctx.fillStyle = (r + c) % 2 ? '#fbeedd' : '#f4e0c6'; ctx.fillRect(ox + c * C, oy + r * C, C, C);
          }
          const w = g.wave, sp = 1 - Math.min(0.3, g.t / 140), warn = g.warn * sp;
          if (g.gold) { // golden pea sparkles on its square
            const x = ox + g.gold.c * C + C / 2, y = oy + g.gold.r * C + C / 2;
            ctx.globalAlpha = g.gold.life < 1 ? 0.4 + 0.6 * Math.abs(Math.sin(T * 10)) : 1;
            ctx.fillStyle = 'rgba(255,215,80,0.35)'; ctx.beginPath(); ctx.arc(x, y, 26 * u, 0, TAU); ctx.fill();
            pea(x, y + Math.sin(T * 4) * 3, 15 * u, true); DG.draw.sparkle(ctx, x + 14 * u, y - 14 * u, 6 * u, '#fff');
            ctx.globalAlpha = 1;
          }
          if (w) {
            const flash = 0.5 + 0.5 * Math.sin(T * 18);
            w.lines.forEach((l) => {
              ctx.fillStyle = `rgba(255,110,110,${w.t < warn ? 0.18 + 0.15 * flash : 0.12})`;
              if (l.axis === 'row') ctx.fillRect(ox, oy + l.idx * C, B, C); else ctx.fillRect(ox + l.idx * C, oy, C, B);
              ctx.fillStyle = '#ff5a5a';
              ctx.save();
              const cx = l.axis === 'row' ? (l.dir > 0 ? ox - 34 : ox + B + 34) : ox + l.idx * C + C / 2;
              const cy = l.axis === 'row' ? oy + l.idx * C + C / 2 : (l.dir > 0 ? oy - 34 : oy + B + 34);
              ctx.translate(cx, cy);
              ctx.rotate(l.axis === 'row' ? (l.dir > 0 ? 0 : Math.PI) : (l.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
              ctx.globalAlpha = w.t < warn ? 0.5 + 0.5 * flash : 0.6;
              ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -14); ctx.lineTo(-10, 14); ctx.fill();
              ctx.restore();
              if (w.t > warn && (w.k || 0) < 1) {
                const pos = -40 * u + (w.k || 0) * (B + 80 * u), along = l.dir > 0 ? pos : B - pos;
                const x = ox + (l.axis === 'row' ? along : l.idx * C + C / 2), y = oy + (l.axis === 'row' ? l.idx * C + C / 2 : along);
                ctx.save(); ctx.beginPath(); ctx.rect(ox - 16, oy - 16, B + 32, B + 32); ctx.clip();
                pea(x, y, 20 * u, false);
                ctx.restore();
              }
            });
            w.cells.forEach((q) => { // shadows grow, then a big pea lands and bounces off
              const x = ox + q.c * C + C / 2, y = oy + q.r * C + C / 2;
              if (w.t < warn) {
                const k = w.t / warn;
                ctx.fillStyle = `rgba(60,110,50,${0.15 + 0.3 * k})`; ctx.beginPath(); ctx.ellipse(x, y + 6 * u, C * 0.42 * k, C * 0.2 * k + 2, 0, 0, TAU); ctx.fill();
                ctx.strokeStyle = `rgba(255,90,90,${0.4 + 0.4 * flash})`; ctx.lineWidth = 2; ctx.strokeRect(ox + q.c * C + 3, oy + q.r * C + 3, C - 6, C - 6);
                const fy = y - (1 - k) * (H * 0.5);
                if (k > 0.55) pea(x, fy, 22 * u, false);
              } else {
                const k = (w.t - warn) / 0.5, b = Math.sin(Math.min(1, k) * Math.PI) * 14 * u;
                ctx.globalAlpha = 1 - Math.min(1, k) * 0.6;
                pea(x, y - b, 22 * u * (1 + 0.15 * (1 - Math.min(1, k * 3))), false);
                ctx.globalAlpha = 1;
              }
            });
          }
          if (!(g.inv > 0 && Math.sin(T * 30) > 0)) {
            const hop = g.hopT > 0 ? Math.sin((1 - g.hopT / 0.16) * Math.PI) * 14 : 0;
            DG.draw.dumpling(ctx, petOpts({ x: ox + g.fx * C + C / 2, y: oy + g.fy * C + C / 2 + 22 * u, size: 54 * u, hop,
              mood: g.inv > 0 ? 'dizzy' : w && w.t < warn ? 'surprised' : 'happy' }));
          }
          if (PT) { ctx.font = '600 15px Fredoka, sans-serif'; ctx.fillStyle = '#4f8a6a'; ctx.textAlign = 'center'; ctx.fillText('swipe to hop one square', W / 2, oy + B + 78); }
        };
        return g;
      },
    },

    /* ---------- 5. Steamer balance: focus ---------- */
    balance: {
      name: 'Steamer Balance', stat: 'focus', icon: '⭐', duration: 40, drag: true, tilt: true,
      desc: 'Balance on a wobbly steamer lid, stay near the middle and collect floating stars.',
      how: '<b>Hold your finger down and slide it</b> left or right to shuffle (or hold <b>←/→</b> / A/D). Keep your balance, grab ⭐ stars, and stay inside the green middle zone for bonus points. Focus makes your special move recharge faster in battle!',
      keys: { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' },
      gestures: {},
      create(d) {
        const g = { t: 0, x: 0, vx: 0, ang: 0, amp: [0.12, 0.17, 0.22][d], falls: 0, fallT: 0, stars: [], starT: 0.8, spawned: 0,
          got: 0, center: 0, score: 0, ph: Math.random() * 6, steer: 0, tilt: 0 };
        const geo = () => ({ px: W / 2, py: PT ? H * 0.56 : 300, L: PT ? W * 0.39 : 260 });
        g.press = () => {};
        g.update = (dt, hd) => {
          g.t += dt;
          const w = 1 + g.t / 90;
          g.ang = g.amp * w * (Math.sin(g.t * 1.25 + g.ph) * 0.65 + Math.sin(g.t * 2.6 + 1.3) * 0.35);
          g.starT -= dt;
          if (g.starT <= 0) {
            g.starT = [1.4, 1.2, 1.0][d];
            g.stars.push({ x: (Math.random() * 2 - 1) * (Math.random() < 0.5 ? 0.45 : 0.8), life: 3.6, bob: Math.random() * 6 });
            g.spawned++;
          }
          g.stars.forEach((s) => (s.life -= dt));
          g.stars = g.stars.filter((s) => s.life > 0);
          if (g.fallT > 0) { g.fallT -= dt; if (g.fallT <= 0) { g.x = 0; g.vx = 0; } return; }
          const inp = clamp((hd.right ? 1 : 0) - (hd.left ? 1 : 0) + g.steer + g.tilt, -1, 1);
          g.vx += (Math.sin(g.ang) * 7 + inp * 4.5) * dt;
          g.vx *= Math.max(0, 1 - 1.8 * dt);
          g.x += g.vx * dt;
          if (Math.abs(g.x) < 0.3) { g.center += dt; g.score += dt * 2; }
          const { px, py, L } = geo();
          for (let i = g.stars.length - 1; i >= 0; i--) {
            if (Math.abs(g.stars[i].x - g.x) < 0.14) { g.stars.splice(i, 1); g.got++; g.score += 10; pop('+10 ⭐', '#e8a33a', px + g.x * L, py - 150); sfx('coin'); }
          }
          if (Math.abs(g.x) > 1.06) { g.falls++; g.fallT = 1.2; g.fallDir = Math.sign(g.x); pop('Whoops! Fell off!', '#e8607a'); sfx('bad'); }
        };
        g.perf = () => clamp((0.6 * g.got) / Math.max(1, g.spawned) + (0.4 * g.center) / Math.max(1, g.t) + 0.1 - g.falls * 0.08, 0, 1);
        g.hud = () => `⭐<b>${g.got}</b> · Falls <b>${g.falls}</b>`;
        g.summary = () => `${g.got} stars · ${Math.round(g.center)}s centered · ${g.falls} falls`;
        g.draw = () => {
          const { px, py, L } = geo(), R = L * 1.077;
          sky('#ece3ff', '#fbefff');
          // kitchen wall tiles + a counter top under the steamer stack
          const ct = py + 20 + 2 * 58; // counter top
          ctx.strokeStyle = 'rgba(160,130,210,0.18)'; ctx.lineWidth = 2;
          for (let y = 40; y < ct; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
          for (let y = 40, r = 0; y < ct; y += 48, r++) for (let x = (r % 2) * 24; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 48); ctx.stroke(); }
          for (let i = 0; i < 4; i++) {
            const k = (T * 0.4 + i / 4) % 1;
            ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.beginPath(); ctx.arc(px - L * 0.8 + i * L * 0.55, py + 80 - k * 240, 20 + k * 30, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = '#c99566'; ctx.fillRect(0, ct, W, H - ct);
          ctx.fillStyle = '#e0b07e'; ctx.fillRect(0, ct, W, 16);
          ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, ct, W, 4);
          ctx.strokeStyle = 'rgba(120,70,30,0.25)'; ctx.lineWidth = 2;
          for (let x = 40; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, ct + 30); ctx.lineTo(x, H); ctx.stroke(); }
          // the steamer stack (two bamboo baskets) underneath the lid
          for (let i = 0; i < 2; i++) {
            const y = py + 20 + i * 58;
            ctx.fillStyle = i ? '#d2a463' : '#dcb174'; DG.roundRect(ctx, px - L * 0.73, y, L * 1.46, 54, 12); ctx.fill();
            ctx.strokeStyle = '#a97a3e'; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.strokeStyle = 'rgba(150,105,50,0.45)'; ctx.lineWidth = 1.6;
            for (let x = px - L * 0.68; x < px + L * 0.72; x += 14) { ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + 6, y + 48); ctx.stroke(); }
            ctx.fillStyle = '#c4945a'; ctx.fillRect(px - L * 0.73, y + 22, L * 1.46, 8);
          }
          ctx.save(); ctx.translate(px, py); ctx.rotate(g.ang);
          ctx.fillStyle = '#e8c48c'; ctx.beginPath(); ctx.ellipse(0, 6, R, 12, 0, Math.PI, TAU); ctx.fill();
          ctx.fillStyle = '#d4a86a'; ctx.fillRect(-R, 4, R * 2, 12);
          ctx.fillStyle = 'rgba(80,200,140,0.45)'; ctx.fillRect(-0.3 * L, -6, 0.6 * L, 10);
          ctx.fillStyle = '#c4553e'; ctx.beginPath(); ctx.arc(0, -8, 6, 0, TAU); ctx.fill();
          const lidY = 6 - 12 * Math.sqrt(Math.max(0, 1 - ((g.x * L) / R) ** 2));
          if (g.fallT <= 0) DG.draw.dumpling(ctx, petOpts({ x: g.x * L, y: lidY, size: 84, mood: Math.abs(g.x) > 0.75 ? 'surprised' : 'happy', rot: -g.ang * 0.5 + g.vx * 0.15, shadow: false }));
          ctx.restore();
          if (g.fallT > 0) {
            const k = 1.2 - g.fallT;
            DG.draw.dumpling(ctx, petOpts({ x: px + g.fallDir * (R + k * 120), y: py - 16 + k * k * 400, size: 84, mood: 'dizzy', rot: k * 6 * g.fallDir, shadow: false }));
          }
          g.stars.forEach((s) => {
            const sx = px + s.x * L * Math.cos(g.ang), sy = py - 130 + s.x * L * Math.sin(g.ang) + Math.sin(T * 3 + s.bob) * 8;
            ctx.globalAlpha = Math.min(1, s.life);
            DG.draw.sparkle(ctx, sx, sy, 17, '#ffcc33');
            ctx.globalAlpha = 1;
          });
          // steering hint: shows how far the finger has slid
          if (PT || g.steer || tiltOn()) {
            const hy = PT ? H - 46 : H - 26, hw = Math.min(150, W * 0.3), v = clamp(g.steer + g.tilt, -1, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; DG.roundRect(ctx, W / 2 - hw, hy - 9, hw * 2, 18, 9); ctx.fill();
            ctx.fillStyle = '#c49bff'; ctx.beginPath(); ctx.arc(W / 2 + v * (hw - 10), hy, 12, 0, TAU); ctx.fill();
            if (PT) { ctx.font = '600 14px Fredoka, sans-serif'; ctx.fillStyle = '#7a62a0'; ctx.textAlign = 'center'; ctx.fillText(tiltOn() ? 'tilt your phone (or hold & slide)' : 'hold & slide to shuffle', W / 2, hy - 18); }
          }
        };
        return g;
      },
    },
  };
  DG.TRAINING_GAMES = GAMES;

  /* ======================= Phone tilt (Steamer Balance option) ======================= */
  let tiltRaw = null, tiltZero = 0, tiltListening = false;
  const tiltSupported = () => typeof window.DeviceOrientationEvent !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const tiltOn = () => !!(DG.state && DG.state.settings && DG.state.settings.tiltBalance) && tiltSupported();
  function listenTilt() {
    if (tiltListening) return; tiltListening = true;
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      tiltRaw = ang === 90 ? e.beta : (ang === -90 || ang === 270) ? -e.beta : e.gamma; // left/right tilt, whichever way the phone is held
    });
  }
  async function setTilt(on) {
    if (on && typeof DeviceOrientationEvent.requestPermission === 'function') { // iPhone asks first
      try { if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') { DG.ui.toast('📱 Tilt needs motion access. You can allow it in your browser settings.'); return false; } }
      catch (e) { DG.ui.toast('📱 Couldn\'t turn on tilt here.'); return false; }
    }
    DG.state.settings.tiltBalance = on; DG.save();
    if (on) listenTilt();
    return true;
  }

  /* ======================= Menu (Training Grounds) ======================= */
  /* art cut from the Training Grounds design picture (img/tg_*.webp) */
  const TG_IMG = {
    jumprope: '<img src="img/tg_jumprope.webp?v=1" alt="">',
    hurdles: '<img src="img/tg_hurdles.webp?v=1" alt="">',
    ricesack: '<img src="img/tg_ricesack.webp?v=1" alt="">',
    peadodge: '<img src="img/tg_peadodge.webp?v=1" alt="">',
    balance: '<img src="img/tg_balance.webp?v=1" alt="">',
  };
  const TG_CHIP = {
    stamina: '<img class="tg-chipimg" src="img/tg_chip_stamina.webp?v=1" alt="Stamina">',
    agility: '<img class="tg-chipimg" src="img/tg_chip_agility.webp?v=1" alt="Agility">',
    strength: '<img class="tg-chipimg" src="img/tg_chip_strength.webp?v=1" alt="Strength">',
    defense: '<img class="tg-chipimg" src="img/tg_chip_defense.webp?v=1" alt="Defense">',
    focus: '<img class="tg-chipimg" src="img/tg_chip_focus.webp?v=1" alt="Focus">',
  };
  const HOUSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 3 L21 11" fill="none" stroke="#e0603a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10 V20 H18.5 V10" fill="#ffd9a8" stroke="#a8582e" stroke-width="2" stroke-linejoin="round"/><rect x="10" y="13.5" width="4" height="6.5" fill="#c4553e"/></svg>';
  const BOLT = '<svg class="bolt" viewBox="0 0 16 22" aria-hidden="true"><path d="M10 1 L2 13 H8 L6 21 L14 8 H8 Z" fill="#ffd23a" stroke="#e8a21a" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const LOCK = '<svg class="lock" viewBox="0 0 16 18" aria-hidden="true"><rect x="2" y="8" width="12" height="9" rx="2" fill="#b49a82"/><path d="M5 8 V5.5 a3 3 0 0 1 6 0 V8" fill="none" stroke="#b49a82" stroke-width="2.2"/></svg>';

  function menu() {
    phase = 'menu'; cancelAnimationFrame(raf); g = null; DG.audio.homeTrack();
    const p = DG.pet(), si = DG.stageIndex(), cap = DG.statCap();
    root.classList.remove('playing');
    root.innerHTML = `
      <div class="tg">
        <header class="tg-top">
          <button class="tg-home img" id="t-home" aria-label="Home"><img src="img/tg_home.webp?v=1" alt="Home"></button>
          <h2 class="tg-sign img"><img src="img/tg_sign.webp?v=1" alt="Training Grounds"></h2>
          <div class="tg-energy">${BOLT}<span>Energy <b>${Math.round(p.needs.energy)}</b></span></div>
        </header>
        <p class="tg-info">Each game lasts about <b>40</b> seconds and trains one stat. Everyone gets progress for joining in — great play earns more! Stats can reach <b>${cap}</b> at the ${DG.STAGES[si].name} stage.</p>
        <div class="tg-list">
          ${Object.entries(GAMES).map(([id, gm]) => {
            const s2 = DG.STAT_INFO[gm.stat], v = Math.floor(p.stats[gm.stat]);
            return `<div class="tg-card">
              <div class="tg-ico img">${TG_IMG[id]}</div>
              <div class="tg-main">
                <div class="tg-row"><h3>${gm.name}</h3>${TG_CHIP[gm.stat]}</div>
                <div class="tg-bar"><i style="width:${Math.min(100, (v / cap) * 100)}%;background:${s2.color}"></i></div>
                <div class="tg-diffs">${DIFFS.map((df, i) => {
                  const locked = si < df.stage;
                  return `<button class="tg-d ${locked ? 'locked' : 'go'}" data-g="${id}" data-d="${i}" ${locked ? `title="Unlocks at ${DG.STAGES[df.stage].name} stage"` : ''}>${locked ? LOCK : ''}<span>${df.name}</span>${BOLT}<b>${df.cost}</b></button>`;
                }).join('')}</div>
              </div>
              <div class="tg-num">${v}/${cap}</div>
            </div>`;
          }).join('')}
        </div>
        <p class="tg-note">Medium difficulty unlocks at the Medium stage.<br>Hard training unlocks at the Large stage.</p>
      </div>`;
    root.querySelector('#t-home').onclick = () => { DG.audio.play('click'); DG.ui.show('home'); };
    root.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => {
      const d = +b.dataset.d, df = DIFFS[d];
      if (DG.stageIndex() < df.stage) { DG.ui.toast(`🔒 ${df.name} training unlocks when your dumpling reaches the ${DG.STAGES[df.stage].name} stage.`); DG.audio.play('bad'); return; }
      if (DG.pet().needs.energy < df.cost) { DG.ui.toast(`😴 ${DG.ui.esc(DG.pet().name)} is too tired (needs ⚡${df.cost}). Try a nap or Warm Broth!`); DG.audio.play('bad'); return; }
      DG.audio.play('click'); start(b.dataset.g, d);
    }));
  }

  /* ======================= Playing ======================= */
  function layout() {
    const st = root.querySelector('.t-stage');
    if (!st || !canvas) return 1;
    const cssW = st.clientWidth || 800, cssH = st.clientHeight || 450;
    PT = cssW < 640 && cssH > cssW * 1.05;
    W = PT ? 480 : 800;
    H = Math.max(300, Math.round((W * cssH) / cssW));
    const dpr = Math.min(2, window.devicePixelRatio || 1), bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    return bw / W;
  }

  function start(id, d) {
    gameId = id; def = GAMES[id]; diff = d; held = {}; parts = []; T = 0; timeLeft = def.duration;
    DG.audio.setTrack(id);
    root.classList.add('playing');
    root.innerHTML = `
      <div class="t-game">
        <div class="t-top">
          <button class="btn small ghost" id="t-quit">✕ Quit</button>
          <b class="t-name">${def.icon} ${def.name}</b><span class="diff-tag">${DIFFS[d].name}</span>
          <span class="t-time">⏱ <b id="t-time">${def.duration}</b>s</span>
          <span class="t-score" id="t-score"></span>
        </div>
        <div class="t-stage"><canvas id="t-cv"></canvas><div class="t-overlay" id="t-ov"></div></div>
      </div>`;
    canvas = root.querySelector('#t-cv'); ctx = canvas.getContext('2d');
    layout();
    g = def.create(d);
    root.querySelector('#t-quit').onclick = quit;
    bindGestures(root.querySelector('.t-stage'));
    showIntro();
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  /** Swipes, taps and (for balance) hold-and-slide on the play area. */
  function bindGestures(el) {
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.t-overlay:not([hidden])')) return;
      DG.audio.unlock();
      if (phase === 'intro') { begin(); return; }
      down = { x: e.clientX, y: e.clientY, t: performance.now(), fired: false, id: e.pointerId };
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (def && def.drag && g) { g.steer = clamp(dx / 50, -1, 1); return; }
      if (down.fired || Math.hypot(dx, dy) < 22) return;
      down.fired = true;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      gesture(dir);
    });
    const end = (e) => {
      if (!down || e.pointerId !== down.id) return;
      const quick = performance.now() - down.t < 350, far = Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 22;
      if (!down.fired && quick && !far) gesture('tap');
      if (def && def.drag && g) g.steer = 0;
      down = null;
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  function gesture(kind) {
    if (!def) return;
    const act = (def.gestures || {})[kind];
    if (act) press(act);
  }

  function showIntro() {
    phase = 'intro';
    const ov = root.querySelector('#t-ov'); ov.hidden = false;
    const st = DG.STAT_INFO[def.stat];
    ov.innerHTML = `<div class="ov-card"><h2>${def.icon} ${def.name}</h2><p class="stat-chip" style="background:${st.color}">${st.icon} Trains ${st.name}</p>
      <p>${def.how}</p>
      ${def.tilt && tiltSupported() ? `<button class="btn small tilt-btn ${tiltOn() ? 'on' : ''}" id="t-tilt">📱 Phone tilt: <b>${tiltOn() ? 'On' : 'Off'}</b></button>` : ''}
      <p class="fine">Uses ⚡${DIFFS[diff].cost} energy · ${def.duration} seconds</p>
      <button class="btn primary big" id="t-go">Start! <small>(Space)</small></button></div>`;
    ov.querySelector('#t-go').onclick = begin;
    const tb = ov.querySelector('#t-tilt');
    if (tb) tb.onclick = async () => {
      DG.audio.play('click');
      const want = !tiltOn();
      if (await setTilt(want)) { tb.classList.toggle('on', want); tb.querySelector('b').textContent = want ? 'On' : 'Off'; if (want) DG.ui.toast('📱 Hold your phone the way you like, then tilt left and right to shuffle.'); }
    };
  }
  function begin() {
    if (phase !== 'intro') return;
    const p = DG.pet();
    if (p.needs.energy < DIFFS[diff].cost) { DG.ui.toast('Too tired to train right now!'); return menu(); }
    DG.addNeeds({ energy: -DIFFS[diff].cost });
    DG.save();
    phase = 'count'; countT = 3; timeLeft = def.duration;
    root.querySelector('#t-ov').hidden = true;
    tiltZero = tiltRaw || 0; // however the phone is held right now counts as level
    DG.audio.play('click');
  }
  /** Hurdles: out of stars. Start the run again (no extra energy). */
  function crashed() {
    phase = 'crashed';
    const ov = root.querySelector('#t-ov'); ov.hidden = false;
    ov.innerHTML = `<div class="ov-card"><h2>💫 Out of stars!</h2>
      <p>${DG.ui.esc(DG.pet().name)} bumped into 3 obstacles. Try the run again — no extra energy needed.</p>
      <p class="fine">${g.summary()}</p>
      <div class="btn-row"><button class="btn primary big" id="t-retry">↻ Restart</button><button class="btn ghost" id="t-giveup">Quit</button></div></div>`;
    ov.querySelector('#t-retry').onclick = () => {
      DG.audio.play('click');
      g = def.create(diff); parts = []; held = {};
      ov.hidden = true; phase = 'count'; countT = 3; timeLeft = def.duration;
    };
    ov.querySelector('#t-giveup').onclick = () => { DG.audio.play('click'); menu(); };
  }
  function press(id) {
    DG.audio.unlock();
    if (phase === 'intro') { begin(); return; }
    if (phase !== 'play') return;
    g.press(id);
  }
  function quit() {
    DG.audio.play('click');
    if (phase === 'play' || phase === 'count') {
      const was = phase; phase = 'paused';
      DG.ui.modal({
        title: 'Quit training?', html: '<p>You won\'t get rewards for this session, and the energy is already spent.</p>',
        buttons: [{ label: 'Keep going', cls: 'primary', onClick: () => (phase = was) }, { label: 'Quit', cls: 'ghost', onClick: menu }],
        dismissable: false,
      });
    } else menu();
  }

  function finish() {
    phase = 'done';
    const p = DG.pet(), st = DG.STAT_INFO[def.stat];
    const perf = clamp(g.perf(), 0, 1);
    const tier = perf >= 0.75 ? 2 : perf >= 0.45 ? 1 : 0;
    const res = DG.applyTraining(def.stat, tier, diff);
    DG.addNeeds({ happiness: 3, fullness: -3 });
    p.care.trains++; DG.state.counters.trainings++;
    DG.state.counters.gamesTried[gameId] = true;
    DG.save();
    DG.unlock('firstTrain');
    if (DG.state.counters.perfectJumps >= 10) DG.unlock('tenPerfect');
    if (Object.keys(GAMES).every((k) => DG.state.counters.gamesTried[k])) DG.unlock('allTraining');
    DG.audio.play(tier === 2 ? 'levelup' : 'fanfare');
    DG.draw.confetti(parts, W / 2, H / 2, tier === 2 ? 60 : 25);
    const titles = ['Nice effort! 💪', 'Good work! 🌟', 'GREAT job! 🏅'];
    const ov = root.querySelector('#t-ov'); ov.hidden = false;
    ov.innerHTML = `<div class="ov-card result">
      <h2>${titles[tier]}</h2>
      <p>${g.summary()} · Score <b>${Math.round(g.score)}</b></p>
      <div class="perf-meter">${['Joined in', 'Good', 'Great'].map((l, i) => `<span class="${i === tier ? 'on' : ''}">${l}</span>`).join('')}</div>
      <div class="stat-row result-row"><span class="stat-name">${st.icon} ${st.name}</span>
        <div class="bar"><div class="bar-fill" id="t-resbar" style="width:${(res.before / res.cap) * 100}%;background:${st.color}"></div></div>
        <b>${Math.floor(res.after)}<small>/${res.cap}</small></b></div>
      <p class="gain">+${res.gain} ${st.name} · +${res.coins} 🪙${tier === 0 ? ' · Practice makes progress!' : ''}</p>
      ${res.capped ? `<p class="note">🌱 ${st.name} has reached the cap for the ${DG.STAGES[DG.stageIndex()].name} stage. Growing bigger raises the cap!</p>` : ''}
      <div class="btn-row">
        <button class="btn primary" id="t-again">Play again <small>⚡${DIFFS[diff].cost}</small></button>
        <button class="btn" id="t-menu">Other games</button>
        <button class="btn ghost" id="t-homeb">🏠 Home</button>
      </div></div>`;
    requestAnimationFrame(() => setTimeout(() => { const b = ov.querySelector('#t-resbar'); if (b) b.style.width = (res.after / res.cap) * 100 + '%'; }, 60));
    ov.querySelector('#t-again').onclick = () => {
      if (DG.pet().needs.energy < DIFFS[diff].cost) { DG.ui.toast('😴 Too tired for another round. Time for a nap!'); return; }
      start(gameId, diff);
    };
    ov.querySelector('#t-menu').onclick = menu;
    ov.querySelector('#t-homeb').onclick = () => DG.ui.show('home');
  }

  function loop(now) {
    if (!canvas || !canvas.isConnected || !g || DG.ui.current() !== 'train') return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    T += dt;
    try {
      if (phase === 'count') {
        countT -= dt;
        if (countT <= 0) { phase = 'play'; sfx('good'); pop('GO!', '#2a9d6f', W / 2, H / 2); }
      } else if (phase === 'play') {
        if (def.tilt && tiltOn() && tiltRaw != null) g.tilt = clamp((tiltRaw - tiltZero) / 18, -1, 1);
        g.update(dt, held);
        if (g.dead) crashed();
        else {
          timeLeft -= dt;
          if (timeLeft <= 0) { timeLeft = 0; finish(); }
        }
      }
      const k = layout();
      ctx.setTransform(k, 0, 0, k, 0, 0);
      g.draw();
      DG.draw.updateParticles(parts, dt);
      parts.forEach((pp) => DG.draw.particle(ctx, pp));
      if (phase === 'count') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, 0, W, H);
        ctx.font = '700 90px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff8f3f';
        ctx.fillText(Math.ceil(countT), W / 2, H / 2 + 30);
      }
      hudAcc += dt;
      if (hudAcc > 0.1) {
        hudAcc = 0;
        const te = root.querySelector('#t-time'), se = root.querySelector('#t-score');
        if (te) te.textContent = Math.ceil(timeLeft);
        if (se) se.innerHTML = g.hud();
      }
    } catch (e) { console.error(e); }
    raf = requestAnimationFrame(loop);
  }

  function onKey(e, isDown) {
    if (DG.ui.current() !== 'train' || !def || phase === 'menu') return;
    if (DG.ui.anyModal()) return;
    if (isDown && e.code === 'Escape') { quit(); return; }
    if (isDown && phase === 'intro' && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); begin(); return; }
    if (isDown && phase === 'crashed' && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); const r = root.querySelector('#t-retry'); if (r) r.click(); return; }
    const act = (def.keys || {})[e.code];
    if (!act) return;
    e.preventDefault();
    if (isDown) { if (!e.repeat || def.repeatKeys) press(act); held[act] = true; }
    else held[act] = false;
  }
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));

  DG.Training = {
    enter() { root = document.getElementById('screen-train'); if (tiltOn()) listenTilt(); menu(); },
    exit() { cancelAnimationFrame(raf); phase = 'menu'; g = null; def = null; if (root) root.classList.remove('playing'); },
    GAMES,
    // test hooks (used by the verification script; not part of normal play)
    _start: (id, d) => start(id, d),
    _begin: () => begin(),
    _skip: () => { if (phase === 'count') phase = 'play'; timeLeft = 0.01; },
    _state: () => ({ phase, gameId, diff, g, W, H, PT }),
    _press: (id) => press(id),
  };
  DG.ui.register('train', DG.Training);
})(window.DG);
