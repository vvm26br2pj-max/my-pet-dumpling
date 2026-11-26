/* My Pet Dumpling — a walk outside in the park (tap to hop) */
(function (DG) {
  const TAU = Math.PI * 2;
  const W = 900, H = 420, GROUND = 330, PX = 250;
  const DURATION = 45;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function open() {
    const p = DG.pet();
    const night = DG.isNight();
    const res = { happy: 0, coins: 0, flowers: 0, friends: 0, puddles: 0, splashes: 0, butterflies: 0 };
    let raf = 0, last = 0, t = 0, scroll = 0, done = false, ended = false;
    const pet = { y: 0, vy: 0, squash: 0, mood: 'happy', moodT: 0, stopT: 0, speech: '', speechT: 0 };
    const items = [], parts = [];
    let nextSpawn = 380;
    const hills = Array.from({ length: 8 }, (_, i) => ({ x: i * 260, h: rand(60, 120), c: i % 2 }));
    const trees = Array.from({ length: 10 }, (_, i) => ({ x: i * 210 + rand(0, 80), s: rand(0.8, 1.2) }));
    const stars = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(10, 180), s: rand(1, 2.5) }));
    const NPCS = [
      { name: 'Pip', type: 'bao', look: { color: 'pink', eyes: 'sparkle', cheeks: 'hearts' } },
      { name: 'Momo', type: 'soup', look: { color: 'matcha', eyes: 'dot', cheeks: 'freckles' } },
      { name: 'Ziggy', type: 'gyoza', look: { color: 'sky', eyes: 'lash', cheeks: 'stars' } },
      { name: 'Taro', type: 'bao', look: { color: 'taro', eyes: 'wide', cheeks: 'blush' } },
    ];

    function say(text, d) { pet.speech = text; pet.speechT = d || 1.6; }
    function spawn(x) {
      const r = Math.random();
      let kind;
      if (r < 0.26) kind = 'coin';
      else if (r < 0.48) kind = 'puddle';
      else if (r < 0.68) kind = 'flower';
      else if (r < 0.84) kind = 'butterfly';
      else kind = 'friend';
      const it = { kind, x, done: false, t: rand(0, 6) };
      if (kind === 'coin') it.y = rand(70, 130);
      if (kind === 'flower') it.c = pick(['#ff9fbf', '#ffd36a', '#c7a5ff', '#9fd8ff', '#ff9f80']);
      if (kind === 'friend') it.npc = pick(NPCS);
      if (kind === 'butterfly') { it.c = pick(['#ff9fbf', '#ffd36a', '#9fd8ff']); it.y = rand(120, 200); }
      items.push(it);
    }
    function hop() {
      if (done) return;
      if (pet.y <= 0.5 && pet.stopT <= 0) { pet.vy = 640; DG.audio.play('jump'); }
    }
    function finish(early) {
      if (ended) return; ended = true; done = true;
      cancelAnimationFrame(raf);
      const frac = Math.min(1, t / DURATION);
      const happy = Math.min(30, Math.round(res.happy + 12 * frac));
      const energyCost = Math.round(3 + 4 * frac);
      DG.addNeeds({ happiness: happy, energy: -energyCost, fullness: -Math.round(4 * frac), cleanliness: -res.splashes * 6 });
      if (res.coins) DG.addCoins(res.coins);
      p.care.plays = (p.care.plays || 0) + 1;
      DG.state.counters.walks = (DG.state.counters.walks || 0) + 1;
      if (frac > 0.3) DG.unlock('firstWalk');
      DG.save();
      if (DG.Home) DG.Home.renderHud();
      const msg = el.querySelector('#wk-msg');
      msg.innerHTML = `<b>${early ? 'Back home!' : 'What a lovely walk!'}</b> 💖 +${happy} happiness · ⚡ −${energyCost} energy${res.coins ? ` · 🪙 +${res.coins}` : ''}${res.splashes ? ` · 💦 ${res.splashes} muddy splash${res.splashes > 1 ? 'es' : ''}` : ''}
        <br><small>🌼 ${res.flowers} flowers sniffed · 👋 ${res.friends} friends met · 🦋 ${res.butterflies} butterflies</small>`;
      el.querySelector('.modal-btns .btn').textContent = 'Go home 🏠';
      DG.audio.play(early ? 'good' : 'fanfare');
    }

    let el = null;
    DG.audio.setTrack('walk');
    const close = DG.ui.modal({
      title: night ? '🌙 Night Walk' : '🌳 Walk in the Park', wide: true, cls: 'walk-modal',
      html: `<p class="walk-msg" id="wk-msg">Tap (or press Space) to <b>hop</b> over puddles and grab coins. Sniff flowers and say hi to friends!</p>
        <canvas class="walk-canvas" id="wk-cv" aria-label="Walk in the park. Tap to hop."></canvas>`,
      buttons: [{ label: 'Head home', cls: 'ghost', keep: true, onClick: (cl) => { if (ended) cl(); else finish(true); } }],
      onClose() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); if (!ended) finish(true); DG.audio.homeTrack(); },
      onOpen(m) {
        el = m;
        const cv = m.querySelector('#wk-cv'), ctx = cv.getContext('2d');
        cv.addEventListener('pointerdown', (e) => { e.preventDefault(); DG.audio.unlock(); hop(); });
        last = performance.now();
        const frame = (now) => {
          if (!cv.isConnected) return;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (!done) update(dt);
          draw(ctx, cv);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      },
    });
    function onKey(e) { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); hop(); } }
    window.addEventListener('keydown', onKey);

    function update(dt) {
      t += dt;
      if (t >= DURATION) { finish(false); return; }
      const speed = pet.stopT > 0 ? 0 : 150;
      pet.stopT = Math.max(0, pet.stopT - dt);
      scroll += speed * dt;
      if (scroll + W > nextSpawn) { spawn(nextSpawn); nextSpawn += rand(230, 360); }
      // physics
      if (pet.y > 0 || pet.vy !== 0) {
        pet.vy -= 1700 * dt; pet.y += pet.vy * dt;
        if (pet.y <= 0) { if (pet.vy < -300) pet.squash = 0.18; pet.y = 0; pet.vy = 0; }
      }
      pet.squash *= Math.max(0, 1 - dt * 9);
      if (pet.moodT > 0) { pet.moodT -= dt; if (pet.moodT <= 0) pet.mood = 'happy'; }
      if (pet.speechT > 0) pet.speechT -= dt;
      const size = petSize();
      items.forEach((it) => {
        it.t += dt;
        const sx = it.x - scroll;
        if (it.done || sx < -100) return;
        const dx = sx - PX;
        if (it.kind === 'coin' && Math.abs(dx) < 40 && pet.y >= it.y - 0.65 * size + 28) {
          it.done = true; res.coins++; DG.audio.play('coin');
          parts.push({ kind: 'text', text: '+1 🪙', x: PX, y: GROUND - pet.y - size - 10, vy: -50, size: 20, life: 1, max: 1, color: '#d99a00', bold: true });
        } else if (it.kind === 'puddle' && Math.abs(dx) < 34) {
          it.done = true; res.puddles++;
          if (pet.y < 18) {
            res.splashes++; DG.audio.play('splash'); pet.mood = 'surprised'; pet.moodT = 1; say(pick(['Splish!', 'Muddy!', 'Oops!']));
            for (let k = 0; k < 14; k++) parts.push({ kind: 'dot', color: '#8fb7d9', x: PX + rand(-20, 20), y: GROUND - 4, vx: rand(-140, 140), vy: rand(-260, -80), g: 800, size: rand(3, 5), life: 0.8, max: 0.8 });
          } else { res.happy += 1; parts.push({ kind: 'text', text: 'Nice hop!', x: PX, y: GROUND - 120, vy: -40, size: 18, life: 1, max: 1, color: '#2a9d8f', bold: true }); }
        } else if (it.kind === 'flower' && Math.abs(dx) < 12 && pet.y <= 0) {
          it.done = true; res.flowers++; res.happy += 2; pet.stopT = 1.1; pet.mood = 'joy'; pet.moodT = 1.2;
          say(pick(['*sniff sniff*', 'Smells sweet!', 'Pretty!'])); DG.audio.play('good');
          for (let k = 0; k < 4; k++) parts.push({ kind: 'heart', x: PX + rand(-20, 20), y: GROUND - size, vx: rand(-30, 30), vy: rand(-90, -50), size: rand(8, 12), life: 1.2, max: 1.2 });
        } else if (it.kind === 'friend' && Math.abs(dx) < 120 && pet.y <= 0) {
          it.done = true; res.friends++; res.happy += 4; pet.stopT = 1.8; pet.mood = 'joy'; pet.moodT = 1.8; pet.vy = 360;
          say(`Hi ${it.npc.name}!`, 1.8); it.hi = 1.8; DG.audio.play('squeak');
          for (let k = 0; k < 6; k++) parts.push({ kind: 'heart', x: (PX + sx) / 2 + rand(-30, 30), y: GROUND - 90, vx: rand(-40, 40), vy: rand(-100, -60), size: rand(8, 13), life: 1.4, max: 1.4, color: '#ff4f7b' });
        } else if (it.kind === 'butterfly' && Math.abs(dx) < 40 && pet.y > 60) {
          it.done = true; res.butterflies++; res.happy += 3; DG.audio.play('perfect'); say(pick(['Hello, butterfly!', 'So pretty!']));
          for (let k = 0; k < 6; k++) parts.push({ kind: 'star', x: sx, y: GROUND - it.y, vx: rand(-60, 60), vy: rand(-60, 20), size: rand(5, 9), life: 0.8, max: 0.8 });
        }
        if (it.hi) it.hi -= dt;
      });
      DG.draw.updateParticles(parts, dt);
    }
    function petSize() { return 120 * Math.min(1.1, DG.stage().scale + 0.15); }

    function draw(ctx, cv) {
      const k = DG.ui.fitCanvas(cv, W, H); ctx.setTransform(k, 0, 0, k, 0, 0);
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, night ? '#1f2552' : '#8fd0ff'); sky.addColorStop(1, night ? '#4b4f98' : '#e6f6ff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      if (night) {
        stars.forEach((s, i) => DG.draw.sparkle(ctx, s.x, s.y, s.s * (1.5 + Math.sin(t * 3 + i)), '#fff6c2'));
        ctx.fillStyle = '#fff6c2'; ctx.beginPath(); ctx.arc(760, 70, 30, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2a3070'; ctx.beginPath(); ctx.arc(774, 62, 26, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = '#ffe17a'; ctx.beginPath(); ctx.arc(780, 70, 34, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) {
          const cx = ((i * 330 - scroll * 0.1) % (W + 200) + W + 200) % (W + 200) - 100, cy = 60 + i * 28;
          ctx.beginPath(); ctx.arc(cx, cy, 18, 0, TAU); ctx.arc(cx + 22, cy - 8, 22, 0, TAU); ctx.arc(cx + 46, cy, 17, 0, TAU); ctx.fill();
        }
      }
      // hills (parallax)
      hills.forEach((h) => {
        const x = ((h.x - scroll * 0.25) % 2080 + 2080) % 2080 - 260;
        ctx.fillStyle = night ? (h.c ? '#2f4f5a' : '#294652') : (h.c ? '#a8e0a0' : '#95d48f');
        ctx.beginPath(); ctx.ellipse(x + 130, GROUND - 10, 200, h.h, 0, Math.PI, TAU); ctx.fill();
      });
      // trees
      trees.forEach((tr) => {
        const x = ((tr.x - scroll * 0.55) % 2100 + 2100) % 2100 - 100;
        ctx.fillStyle = night ? '#5a4030' : '#a8754a'; ctx.fillRect(x - 7 * tr.s, GROUND - 90 * tr.s, 14 * tr.s, 90 * tr.s);
        ctx.fillStyle = night ? '#2d5a46' : '#6cbf7a';
        ctx.beginPath(); ctx.arc(x, GROUND - 110 * tr.s, 42 * tr.s, 0, TAU); ctx.arc(x - 30 * tr.s, GROUND - 85 * tr.s, 30 * tr.s, 0, TAU); ctx.arc(x + 30 * tr.s, GROUND - 85 * tr.s, 30 * tr.s, 0, TAU); ctx.fill();
      });
      // path + grass
      ctx.fillStyle = night ? '#3d6b4f' : '#8fd18a'; ctx.fillRect(0, GROUND - 8, W, H - GROUND + 8);
      ctx.fillStyle = night ? '#8a7a66' : '#f1d9b0'; ctx.fillRect(0, GROUND + 4, W, 46);
      ctx.fillStyle = night ? 'rgba(0,0,0,0.12)' : 'rgba(180,140,90,0.25)';
      for (let x = -((scroll) % 60); x < W; x += 60) { ctx.beginPath(); ctx.ellipse(x, GROUND + 28, 10, 4, 0, 0, TAU); ctx.fill(); }
      if (night) for (let i = 0; i < 10; i++) { const fx = (i * 97 + Math.sin(t + i) * 30) % W, fy = 200 + Math.sin(t * 1.3 + i * 2) * 50; ctx.fillStyle = `rgba(255,240,140,${0.5 + 0.5 * Math.sin(t * 4 + i)})`; ctx.beginPath(); ctx.arc(fx, fy, 3, 0, TAU); ctx.fill(); }
      // items
      items.forEach((it) => {
        const sx = it.x - scroll; if (sx < -120 || sx > W + 120) return;
        if (it.kind === 'coin' && !it.done) {
          const y = GROUND - it.y - 20 + Math.sin(it.t * 4) * 5, w = Math.abs(Math.cos(it.t * 3));
          ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.ellipse(sx, y, 14 * w + 2, 14, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#d99a00'; ctx.lineWidth = 2; ctx.stroke();
        } else if (it.kind === 'puddle') {
          ctx.fillStyle = night ? 'rgba(90,120,170,0.8)' : 'rgba(120,170,220,0.85)'; ctx.beginPath(); ctx.ellipse(sx, GROUND + 18, 42, 11, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(sx - 12, GROUND + 15, 10, 3, 0, 0, TAU); ctx.fill();
        } else if (it.kind === 'flower') {
          ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, GROUND + 4); ctx.lineTo(sx, GROUND - 34); ctx.stroke();
          ctx.fillStyle = it.c; for (let q = 0; q < 5; q++) { const a = q / 5 * TAU + Math.sin(it.t) * 0.2; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * 9, GROUND - 40 + Math.sin(a) * 9, 7, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#fff4c2'; ctx.beginPath(); ctx.arc(sx, GROUND - 40, 5, 0, TAU); ctx.fill();
        } else if (it.kind === 'butterfly' && !it.done) {
          const by = GROUND - it.y + Math.sin(it.t * 2) * 20, bx = sx + Math.sin(it.t * 1.3) * 20, f = Math.abs(Math.sin(it.t * 12));
          ctx.fillStyle = it.c;
          ctx.beginPath(); ctx.ellipse(bx - 8 * f, by, 9 * f + 1, 12, 0.3, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(bx + 8 * f, by, 9 * f + 1, 12, -0.3, 0, TAU); ctx.fill();
          ctx.fillStyle = '#5a4636'; ctx.fillRect(bx - 1.5, by - 8, 3, 16);
        } else if (it.kind === 'friend') {
          DG.draw.dumpling(ctx, { type: it.npc.type, look: it.npc.look, x: sx + 60, y: GROUND + 20, size: 90, t: it.t, flip: true,
            mood: it.hi > 0 ? 'joy' : 'happy', hop: it.hi > 0 ? Math.abs(Math.sin(it.t * 8)) * 14 : 0, blink: (it.t % 3) < 0.12 });
          if (it.hi > 0) { ctx.font = '600 15px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#5a4636'; ctx.fillText('Hiya! 👋', sx + 60, GROUND - 80); }
        }
      });
      // pet
      const size = petSize(), walking = pet.stopT <= 0 && !done;
      DG.draw.dumpling(ctx, { type: p.type, look: p.look, x: PX, y: GROUND + 22, size, t, stage: DG.stageIndex(), hop: pet.y + (walking && pet.y <= 0 ? Math.abs(Math.sin(t * 9)) * 7 : 0),
        squash: pet.squash, mood: done ? 'joy' : pet.mood, accessory: p.accessory, trait: p.trait, blink: (t % 3.3) < 0.12, rot: walking ? Math.sin(t * 9) * 0.05 : 0 });
      parts.forEach((pp) => DG.draw.particle(ctx, pp));
      if (pet.speechT > 0 && pet.speech) {
        ctx.font = '600 16px Fredoka, sans-serif'; ctx.textAlign = 'center';
        const w = ctx.measureText(pet.speech).width + 22, by = GROUND - pet.y - size - 4;
        ctx.fillStyle = '#fff'; DG.roundRect(ctx, PX - w / 2, by - 30, w, 30, 14); ctx.fill();
        ctx.fillStyle = '#5a4636'; ctx.fillText(pet.speech, PX, by - 10);
      }
      // progress
      const prog = Math.min(1, t / DURATION);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; DG.roundRect(ctx, 20, 16, 240, 16, 8); ctx.fill();
      ctx.fillStyle = '#7fd8a6'; DG.roundRect(ctx, 20, 16, Math.max(16, 240 * prog), 16, 8); ctx.fill();
      ctx.font = '600 13px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = night ? '#fff' : '#5a4636';
      ctx.fillText(`🪙 ${res.coins}   🌼 ${res.flowers}   👋 ${res.friends}`, 272, 29);
    }
    return close;
  }

  DG.Walk = { open };
})(window.DG);
