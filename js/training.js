/* My Pet Dumpling — training grounds: five 40-second exercise minigames */
(function (DG) {
  const W = 800, H = 450, TAU = Math.PI * 2;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (n) => DG.audio.play(n);
  const DIFFS = [
    { name: 'Easy', cost: 5, stage: 0 },
    { name: 'Medium', cost: 6, stage: 1 },
    { name: 'Hard', cost: 8, stage: 2, tag: 'Advanced' },
  ];

  let root, canvas, ctx, raf = 0, last = 0, T = 0;
  let g = null, def = null, gameId = null, diff = 0, phase = 'menu', countT = 0, timeLeft = 0, held = {}, parts = [], hudAcc = 0;

  function pop(text, color, x, y) {
    parts.push({ kind: 'text', text, x: x || W / 2, y: y || 110, vy: -45, size: 28, life: 1.1, max: 1.1, color: color || '#e8a33a', bold: true });
  }
  function petOpts(extra) {
    const p = DG.pet();
    return Object.assign({ type: p.type, look: p.look, stage: DG.stageIndex(), accessory: p.accessory, trait: p.trait, t: T }, extra);
  }
  function sky(top, bottom) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }

  /* ======================= GAMES ======================= */
  const GAMES = {
    /* ---------- 1. Jump rope: stamina ---------- */
    jumprope: {
      name: 'Dumpling Jump Rope', stat: 'stamina', icon: '🪢', duration: 40,
      desc: 'Jump as the rope swings under your feet. Chain jumps to build a score multiplier!',
      how: 'Press <b>Space</b> (or tap <b>JUMP</b>) just before the rope reaches your feet. When the marker on the timing bar is in the <b style="color:#2a9d6f">green zone</b>, jump! The dark center is a <b>perfect</b> jump.',
      buttons: [{ id: 'jump', label: '⬆ JUMP', keys: ['Space', 'ArrowUp', 'KeyW', 'KeyJ'] }],
      create(d) {
        const g = { period: [1.7, 1.45, 1.25][d], minP: [1.05, 0.88, 0.72][d], phase: 0.4, air: 0.5, jumpT: -1,
          passes: 0, ok: 0, perfect: 0, streak: 0, mult: 1, score: 0, stumble: 0, land: 0 };
        g.press = (id) => {
          if (id !== 'jump' || g.jumpT >= 0 || g.stumble > 0) return;
          g.air = Math.min(0.5, g.period * 0.6); g.jumpT = 0; sfx('jump');
        };
        g.update = (dt) => {
          g.period = Math.max(g.minP, g.period - dt * 0.014 * (1 + d * 0.3));
          if (g.jumpT >= 0) { g.jumpT += dt; if (g.jumpT >= g.air) { g.jumpT = -1; g.land = 0.15; } }
          if (g.land > 0) g.land -= dt;
          if (g.stumble > 0) g.stumble -= dt;
          g.phase += dt / g.period;
          if (g.phase >= 1) {
            g.phase -= 1;
            if (g.stumble > 0) return;
            g.passes++;
            if (g.jumpT >= 0) {
              g.ok++; g.streak++;
              g.mult = 1 + Math.min(3, Math.floor(g.streak / 4) * 0.5);
              const perfect = Math.abs(g.jumpT - g.air / 2) < g.air * 0.2;
              if (perfect) { g.perfect++; DG.state.counters.perfectJumps++; sfx('perfect'); pop('Perfect!', '#2a9d6f', 400, 160); }
              else { sfx('good'); pop('Nice!', '#e8a33a', 400, 160); }
              g.score += Math.round(10 * g.mult * (perfect ? 1.5 : 1));
            } else {
              g.streak = 0; g.mult = 1; g.stumble = 0.8; sfx('bad'); pop('Oops! Tripped!', '#e8607a', 400, 160);
            }
          }
        };
        g.perf = () => g.ok / Math.max(8, g.passes);
        g.hud = () => `Jumps <b>${g.ok}</b> · Perfect <b>${g.perfect}</b> · Combo <b>x${g.mult}</b>`;
        g.summary = () => `${g.ok}/${g.passes} jumps cleared · ${g.perfect} perfect`;
        g.draw = () => {
          sky('#fff4e2', '#ffe1c8');
          ctx.fillStyle = '#f6cfa3'; ctx.fillRect(0, 405, W, 45);
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (let x = 0; x < W; x += 80) ctx.fillRect(x, 405, 40, 45);
          const a = g.phase * TAU, ropeY = 287 + Math.cos(a) * 118;
          const front = Math.sin(a) < 0;
          const rope = () => {
            ctx.strokeStyle = '#e8607a'; ctx.lineWidth = front ? 7 : 5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(178, 300); ctx.quadraticCurveTo(400, 2 * ropeY - 300, 622, 300); ctx.stroke();
          };
          DG.draw.dumpling(ctx, { type: 'soup', x: 130, y: 405, size: 90, t: T, mood: 'joy', colors: { base: '#d9ecc6', light: '#f6fff0', line: '#a9c493' }, rot: Math.sin(a) * 0.08 });
          DG.draw.dumpling(ctx, { type: 'bao', x: 670, y: 405, size: 90, t: T, mood: 'joy', colors: { base: '#ffd3df', light: '#fff4f7', line: '#e3a3b5' }, rot: -Math.sin(a) * 0.08 });
          if (!front) rope();
          const jh = g.jumpT >= 0 ? Math.sin(Math.PI * g.jumpT / g.air) * 115 : 0;
          DG.draw.dumpling(ctx, petOpts({ x: 400, y: 405, size: 100, hop: jh, mood: g.stumble > 0 ? 'dizzy' : jh > 0 ? 'joy' : 'happy',
            squash: g.land > 0 ? 0.15 : g.stumble > 0 ? 0.12 : 0, rot: g.stumble > 0 ? Math.sin(T * 20) * 0.1 : 0 }));
          if (front) rope();
          // timing bar
          const bx = 200, bw = 400, by = 28;
          const okStart = 1 - g.air / g.period, ideal = 1 - g.air / 2 / g.period, pw = (g.air * 0.2) / g.period;
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; DG.roundRect(ctx, bx - 6, by - 6, bw + 12, 34, 12); ctx.fill();
          ctx.fillStyle = '#bdf0d4'; ctx.fillRect(bx + okStart * bw, by, (1 - okStart) * bw, 22);
          ctx.fillStyle = '#4cc58a'; ctx.fillRect(bx + (ideal - pw) * bw, by, pw * 2 * bw, 22);
          ctx.strokeStyle = '#d6b89a'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 22);
          const mx = bx + g.phase * bw;
          ctx.fillStyle = '#5a4636'; ctx.beginPath(); ctx.moveTo(mx, by + 26); ctx.lineTo(mx - 9, by + 40); ctx.lineTo(mx + 9, by + 40); ctx.fill();
          ctx.fillRect(mx - 2, by - 2, 4, 26);
          ctx.font = '600 13px Fredoka, sans-serif'; ctx.fillStyle = '#7a6250'; ctx.textAlign = 'center';
          ctx.fillText('rope reaches your feet →', bx + bw - 70, by + 55);
          if (g.mult > 1) { ctx.font = '700 26px Fredoka, sans-serif'; ctx.fillStyle = '#ff8f3f'; ctx.fillText(`x${g.mult}`, 520, 250); }
        };
        return g;
      },
    },

    /* ---------- 2. Chopstick hurdles: agility ---------- */
    hurdles: {
      name: 'Chopstick Hurdles', stat: 'agility', icon: '🥢', duration: 40,
      desc: 'Dash down the track! Jump chopsticks, slide under spoon handles and switch lanes around teapots.',
      how: '<b>←/→</b> change lanes · <b>↑ or Space</b> jump over 🥢 chopsticks · <b>↓</b> slide under 🥄 spoon handles · switch lanes to dodge 🫖 teapots. Every obstacle has a sign!',
      buttons: [
        { id: 'left', label: '◀ LEFT', keys: ['ArrowLeft', 'KeyA'] },
        { id: 'jump', label: '⬆ JUMP', keys: ['Space', 'ArrowUp', 'KeyW'] },
        { id: 'slide', label: '⬇ SLIDE', keys: ['ArrowDown', 'KeyS'] },
        { id: 'right', label: 'RIGHT ▶', keys: ['ArrowRight', 'KeyD'] }],
      create(d) {
        const g = { lane: 1, lx: 1, jumpT: -1, slideT: -1, obs: [], spawnT: 1.2, speed: [0.45, 0.55, 0.66][d], total: 0, cleared: 0, hits: 0, stumble: 0, score: 0, run: 0, t: 0 };
        const types = d === 0 ? ['hurdle', 'hurdle', 'spoon', 'pot'] : ['hurdle', 'spoon', 'spoon', 'pot', 'hurdle'];
        g.press = (id) => {
          if (id === 'left' && g.lane > 0) { g.lane--; sfx('click'); }
          if (id === 'right' && g.lane < 2) { g.lane++; sfx('click'); }
          if (id === 'jump' && g.jumpT < 0 && g.slideT < 0) { g.jumpT = 0; sfx('jump'); }
          if (id === 'slide' && g.jumpT < 0 && g.slideT < 0) { g.slideT = 0; sfx('whoosh'); }
        };
        g.update = (dt) => {
          g.t += dt; g.lx += (g.lane - g.lx) * Math.min(1, dt * 14);
          if (g.jumpT >= 0) { g.jumpT += dt; if (g.jumpT > 0.6) g.jumpT = -1; }
          if (g.slideT >= 0) { g.slideT += dt; if (g.slideT > 0.65) g.slideT = -1; }
          if (g.stumble > 0) g.stumble -= dt;
          const sp = g.speed * (1 + g.t * 0.008) * (g.stumble > 0 ? 0.5 : 1);
          g.run += sp * dt;
          g.spawnT -= dt;
          if (g.spawnT <= 0) {
            g.spawnT = Math.max(0.75, [1.55, 1.3, 1.05][d] - g.t * 0.008);
            const lane = Math.random() < 0.6 ? g.lane : Math.floor(Math.random() * 3);
            g.obs.push({ lane, type: pick(types), z: 1 });
            if (d === 2 && Math.random() < 0.3) g.obs.push({ lane: (lane + 1 + Math.floor(Math.random() * 2)) % 3, type: pick(['hurdle', 'spoon']), z: 1 });
          }
          for (const o of g.obs) {
            o.z -= sp * dt;
            if (!o.done && o.z <= 0.03) {
              o.done = true; g.total++;
              if (o.lane === g.lane) {
                const air = g.jumpT >= 0.05 && g.jumpT < 0.56, low = g.slideT >= 0.02 && g.slideT < 0.62;
                const ok = o.type === 'hurdle' ? air : o.type === 'spoon' ? low : false;
                if (ok) { g.cleared++; g.score += 15; pop(o.type === 'hurdle' ? 'Hop!' : 'Whoosh!', '#2a9d6f', 400, 200); sfx('good'); }
                else { g.hits++; g.stumble = 0.6; pop('Bonk!', '#e8607a', 400, 200); sfx('bad'); }
              } else { g.cleared++; g.score += 5; }
            }
          }
          g.obs = g.obs.filter((o) => o.z > -0.25);
        };
        g.perf = () => clamp(1 - (g.hits * 2) / Math.max(8, g.total), 0, 1);
        g.hud = () => `Cleared <b>${g.cleared}</b> · Bonks <b>${g.hits}</b>`;
        g.summary = () => `${g.cleared} obstacles cleared · ${g.hits} bonks`;
        const proj = (z, lane) => {
          const f = (1 - z) * (1 - z), s = 0.15 + 0.85 * f;
          return { x: 400 + (lane - 1) * 170 * s, y: 160 + 250 * f, s };
        };
        const drawObs = (o) => {
          const p = proj(o.z, o.lane), s = p.s;
          ctx.save(); ctx.translate(p.x, p.y);
          let label, lc;
          if (o.type === 'hurdle') {
            ctx.fillStyle = '#8a5a3a'; ctx.fillRect(-62 * s, -26 * s, 7 * s, 26 * s); ctx.fillRect(55 * s, -26 * s, 7 * s, 26 * s);
            ctx.fillStyle = '#c4553e'; DG.roundRect(ctx, -75 * s, -34 * s, 150 * s, 10 * s, 5 * s); ctx.fill();
            ctx.fillStyle = '#e07a5f'; DG.roundRect(ctx, -70 * s, -24 * s, 140 * s, 7 * s, 3 * s); ctx.fill();
            label = 'JUMP ⬆'; lc = '#ffbf3c';
          } else if (o.type === 'spoon') {
            ctx.fillStyle = '#a9b6c4'; ctx.fillRect(-62 * s, -100 * s, 6 * s, 100 * s); ctx.fillRect(56 * s, -100 * s, 6 * s, 100 * s);
            ctx.fillStyle = '#d7e0ea'; DG.roundRect(ctx, -80 * s, -96 * s, 150 * s, 12 * s, 6 * s); ctx.fill();
            ctx.beginPath(); ctx.ellipse(78 * s, -90 * s, 20 * s, 14 * s, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#8a98a8'; ctx.lineWidth = 2 * s; ctx.stroke();
            label = 'SLIDE ⬇'; lc = '#6fb3ff';
          } else {
            ctx.fillStyle = '#4aa69a'; ctx.beginPath(); ctx.ellipse(0, -40 * s, 50 * s, 40 * s, 0, 0, TAU); ctx.fill();
            ctx.fillRect(-30 * s, -6 * s, 60 * s, 6 * s);
            ctx.beginPath(); ctx.moveTo(45 * s, -45 * s); ctx.lineTo(80 * s, -70 * s); ctx.lineTo(82 * s, -60 * s); ctx.lineTo(48 * s, -30 * s); ctx.fill();
            ctx.strokeStyle = '#4aa69a'; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.arc(-52 * s, -42 * s, 18 * s, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
            ctx.fillStyle = '#7fd0c4'; ctx.beginPath(); ctx.ellipse(0, -78 * s, 22 * s, 8 * s, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-15 * s, -45 * s, 4 * s, 0, TAU); ctx.arc(15 * s, -45 * s, 4 * s, 0, TAU); ctx.fill();
            label = 'MOVE ↔'; lc = '#ff7a7a';
          }
          if (o.z < 0.92 && o.z > 0.05) {
            const fs = Math.max(11, 22 * s);
            ctx.font = `700 ${fs}px Fredoka, sans-serif`; ctx.textAlign = 'center';
            const tw = ctx.measureText(label).width + 14;
            const ly = (o.type === 'spoon' ? -130 : -80) * s - 10;
            ctx.fillStyle = lc; DG.roundRect(ctx, -tw / 2, ly - fs, tw, fs + 8, 6); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillText(label, 0, ly);
          }
          ctx.restore();
        };
        g.draw = () => {
          sky('#bfe6ff', '#e9f7ff');
          ctx.fillStyle = '#a8dca0'; ctx.fillRect(0, 160, W, H - 160);
          const top = proj(1, 0), bot = proj(-0.08, 0);
          ctx.fillStyle = '#f2d2a9';
          ctx.beginPath(); ctx.moveTo(400 - 255 * top.s, 160); ctx.lineTo(400 + 255 * top.s, 160); ctx.lineTo(400 + 255 * bot.s, H); ctx.lineTo(400 - 255 * bot.s, H); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
          [-0.5, 0.5].forEach((off) => {
            for (let k = 0; k < 10; k++) {
              const z1 = ((k * 0.12 - g.run) % 1.2 + 1.2) % 1.2 - 0.1, z2 = z1 - 0.05;
              if (z1 > 1) continue;
              const a = proj(z1, 1 + off), b = proj(Math.max(-0.1, z2), 1 + off);
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          });
          const far = g.obs.filter((o) => o.z > 0.03).sort((a, b) => b.z - a.z), near = g.obs.filter((o) => o.z <= 0.03);
          far.forEach(drawObs);
          const jh = g.jumpT >= 0 ? Math.sin(Math.PI * g.jumpT / 0.6) * 120 : 0;
          const sl = g.slideT >= 0;
          DG.draw.dumpling(ctx, petOpts({ x: 400 + (g.lx - 1) * 170, y: 412, size: 92, hop: jh, squash: sl ? 0.38 : 0,
            mood: g.stumble > 0 ? 'dizzy' : jh > 0 || sl ? 'joy' : 'happy', rot: Math.sin(T * 14) * 0.05 }));
          near.forEach(drawObs);
        };
        return g;
      },
    },

    /* ---------- 3. Rice sack push: strength ---------- */
    ricesack: {
      name: 'Rice Sack Push', stat: 'strength', icon: '🍙', duration: 40,
      desc: 'Push a heavy rice sack up the hill with perfectly timed shoves.',
      how: 'Press <b>Space</b> (or tap <b>PUSH</b>) when the moving marker is inside the <b style="color:#2a9d6f">green zone</b>. The dark center gives a <b>perfect</b> push. Button mashing doesn\'t help — after each push, wait for the next good moment.',
      buttons: [{ id: 'push', label: '💪 PUSH', keys: ['Space', 'KeyJ', 'Enter', 'ArrowUp'] }],
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
          if (g.prog >= 100) { g.sacks++; g.score += 50; g.prog = 0; pop('Sack delivered! +50', '#d68a00', 400, 160); sfx('fanfare'); }
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
        g.hud = () => `Sacks <b>${g.sacks}</b> · Hill <b>${Math.round(g.prog)}%</b> · Perfect <b>${g.perfects}</b>`;
        g.summary = () => `${g.sacks} sacks delivered · ${g.perfects} perfect / ${g.goods} good / ${g.misses} slips`;
        g.draw = () => {
          sky('#ffe9c9', '#fff7ea');
          ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(680, 90, 40, 0, TAU); ctx.fill();
          const x0 = 60, y0 = 415, x1 = 740, y1 = 205, ang = Math.atan2(y1 - y0, x1 - x0);
          ctx.fillStyle = '#9fd38a'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, y0 + 10); ctx.lineTo(x1 + 60, y1 - 8); ctx.lineTo(W, y1 - 10); ctx.lineTo(W, H); ctx.fill();
          ctx.strokeStyle = '#7dba6a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, y0 + 10); ctx.lineTo(x1 + 60, y1 - 8); ctx.stroke();
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
          const bx = 150, bw = 500, by = 26;
          ctx.globalAlpha = g.lock > 0 ? 0.45 : 1;
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; DG.roundRect(ctx, bx - 8, by - 8, bw + 16, 42, 14); ctx.fill();
          ctx.fillStyle = '#bdf0d4'; ctx.fillRect(bx + (g.zc - g.zw / 2) * bw, by, g.zw * bw, 26);
          ctx.fillStyle = '#2fb57a'; ctx.fillRect(bx + (g.zc - 0.035) * bw, by, 0.07 * bw, 26);
          ctx.strokeStyle = '#d6b89a'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 26);
          const mx = bx + g.m * bw;
          ctx.fillStyle = '#5a4636'; ctx.fillRect(mx - 3, by - 4, 6, 34);
          ctx.globalAlpha = 1;
          if (g.lock > 0) { ctx.font = '600 14px Fredoka, sans-serif'; ctx.fillStyle = '#7a6250'; ctx.textAlign = 'center'; ctx.fillText('catching breath…', 400, by + 50); }
        };
        return g;
      },
    },

    /* ---------- 4. Pea dodge: defense ---------- */
    peadodge: {
      name: 'Pea Dodge', stat: 'defense', icon: '🟢', duration: 40,
      desc: 'Soft peas roll across the tray. Read the warning arrows and step into a safe square!',
      how: 'Move with <b>WASD / arrow keys</b> (or the arrow buttons). <b style="color:#e8607a">Red arrows</b> and tinted lanes show where peas will roll. Get out of the way before they arrive! Later rounds bring patterns.',
      buttons: [
        { id: 'left', label: '◀', keys: ['ArrowLeft', 'KeyA'], hold: true },
        { id: 'up', label: '▲', keys: ['ArrowUp', 'KeyW'], hold: true },
        { id: 'down', label: '▼', keys: ['ArrowDown', 'KeyS'], hold: true },
        { id: 'right', label: '▶', keys: ['ArrowRight', 'KeyD'], hold: true }],
      create(d) {
        const N = 5, C = 66, ox = 400 - (N * C) / 2, oy = 52;
        const g = { px: (N * C) / 2, py: (N * C) / 2, waves: 0, dodged: 0, hits: 0, inv: 0, wave: null, waveT: 1.0, t: 0, score: 0,
          warn: [1.35, 1.15, 0.95][d], roll: [1.2, 1.0, 0.85][d], gap: [0.7, 0.5, 0.35][d] };
        const covered = (lines, r, c) => lines.some((l) => (l.axis === 'row' && l.idx === r) || (l.axis === 'col' && l.idx === c));
        function makeWave() {
          const level = g.t / 10 + d * 0.8;
          const n = Math.min(4, 1 + Math.floor(level * 0.8));
          for (let tries = 0; tries < 30; tries++) {
            let lines = [];
            if (level > 2 && Math.random() < 0.35) {
              const axis = Math.random() < 0.5 ? 'row' : 'col', off = Math.floor(Math.random() * 2), dir = Math.random() < 0.5 ? 1 : -1;
              for (let i = off; i < N; i += 2) lines.push({ axis, idx: i, dir: i % 4 === off ? dir : -dir });
            } else {
              const used = new Set();
              while (lines.length < n) {
                const axis = Math.random() < 0.5 ? 'row' : 'col', idx = Math.floor(Math.random() * N);
                if (used.has(axis + idx)) continue; used.add(axis + idx);
                lines.push({ axis, idx, dir: Math.random() < 0.5 ? 1 : -1 });
              }
            }
            let safe = 0;
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!covered(lines, r, c)) safe++;
            if (safe >= 2) return { lines, t: 0, hit: false };
          }
          return { lines: [{ axis: 'row', idx: 2, dir: 1 }], t: 0, hit: false };
        }
        g.press = () => {};
        g.update = (dt, hd) => {
          g.t += dt;
          let dx = (hd.right ? 1 : 0) - (hd.left ? 1 : 0), dy = (hd.down ? 1 : 0) - (hd.up ? 1 : 0);
          const len = Math.hypot(dx, dy) || 1;
          g.px = clamp(g.px + (dx / len) * 220 * dt, 16, N * C - 16);
          g.py = clamp(g.py + (dy / len) * 220 * dt, 16, N * C - 16);
          if (g.inv > 0) g.inv -= dt;
          if (!g.wave) { g.waveT -= dt; if (g.waveT <= 0) g.wave = makeWave(); return; }
          const w = g.wave, roll = g.roll * (1 - Math.min(0.3, g.t / 140));
          w.t += dt;
          if (w.t > g.warn) {
            const k = (w.t - g.warn) / roll;
            w.k = k;
            for (const l of w.lines) {
              const pos = -40 + k * (N * C + 80), along = l.dir > 0 ? pos : N * C - pos;
              const peaX = l.axis === 'row' ? along : l.idx * C + C / 2, peaY = l.axis === 'row' ? l.idx * C + C / 2 : along;
              if (g.inv <= 0 && Math.hypot(peaX - g.px, peaY - g.py) < 36) {
                g.hits++; w.hit = true; g.inv = 1.0; pop('Bonk!', '#e8607a', ox + g.px, oy + g.py - 40); sfx('bad');
              }
            }
            if (k >= 1) {
              g.waves++;
              if (!w.hit) { g.dodged++; g.score += 10 * w.lines.length; pop('Dodged!', '#2a9d6f', ox + g.px, oy + g.py - 40); sfx('good'); }
              g.wave = null; g.waveT = g.gap;
            }
          }
        };
        g.perf = () => (g.waves ? g.dodged / g.waves : 0);
        g.hud = () => `Waves dodged <b>${g.dodged}/${g.waves}</b> · Bonks <b>${g.hits}</b>`;
        g.summary = () => `${g.dodged} of ${g.waves} waves dodged cleanly`;
        g.draw = () => {
          sky('#dff6ea', '#c8eedc');
          ctx.fillStyle = '#c99b6b'; DG.roundRect(ctx, ox - 16, oy - 16, N * C + 32, N * C + 32, 22); ctx.fill();
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            ctx.fillStyle = (r + c) % 2 ? '#fbeedd' : '#f4e0c6'; ctx.fillRect(ox + c * C, oy + r * C, C, C);
          }
          const w = g.wave;
          if (w) {
            const flash = 0.5 + 0.5 * Math.sin(T * 18);
            w.lines.forEach((l) => {
              ctx.fillStyle = `rgba(255,110,110,${w.t < g.warn ? 0.18 + 0.15 * flash : 0.12})`;
              if (l.axis === 'row') ctx.fillRect(ox, oy + l.idx * C, N * C, C); else ctx.fillRect(ox + l.idx * C, oy, C, N * C);
              ctx.fillStyle = '#ff5a5a';
              ctx.save();
              const cx = l.axis === 'row' ? (l.dir > 0 ? ox - 34 : ox + N * C + 34) : ox + l.idx * C + C / 2;
              const cy = l.axis === 'row' ? oy + l.idx * C + C / 2 : (l.dir > 0 ? oy - 34 : oy + N * C + 34);
              ctx.translate(cx, cy);
              ctx.rotate(l.axis === 'row' ? (l.dir > 0 ? 0 : Math.PI) : (l.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
              ctx.globalAlpha = w.t < g.warn ? 0.5 + 0.5 * flash : 0.6;
              ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -14); ctx.lineTo(-10, 14); ctx.fill();
              ctx.restore();
              if (w.t > g.warn) {
                const pos = -40 + (w.k || 0) * (N * C + 80), along = l.dir > 0 ? pos : N * C - pos;
                const x = ox + (l.axis === 'row' ? along : l.idx * C + C / 2), y = oy + (l.axis === 'row' ? l.idx * C + C / 2 : along);
                ctx.save(); ctx.beginPath(); ctx.rect(ox - 16, oy - 16, N * C + 32, N * C + 32); ctx.clip();
                ctx.fillStyle = '#7ccf5a'; ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fill();
                ctx.fillStyle = '#a6e584'; ctx.beginPath(); ctx.arc(x - 6, y - 7, 7, 0, TAU); ctx.fill();
                ctx.fillStyle = '#2f5a24'; ctx.beginPath(); ctx.arc(x - 6, y + 2, 2.2, 0, TAU); ctx.arc(x + 6, y + 2, 2.2, 0, TAU); ctx.fill();
                ctx.restore();
              }
            });
          }
          if (!(g.inv > 0 && Math.sin(T * 30) > 0)) {
            DG.draw.dumpling(ctx, petOpts({ x: ox + g.px, y: oy + g.py + 22, size: 52, mood: g.inv > 0 ? 'dizzy' : w && w.t < g.warn ? 'surprised' : 'happy' }));
          }
        };
        return g;
      },
    },

    /* ---------- 5. Steamer balance: focus ---------- */
    balance: {
      name: 'Steamer Balance', stat: 'focus', icon: '⭐', duration: 40,
      desc: 'Balance on a wobbly steamer lid, stay near the middle and collect floating stars.',
      how: 'Hold <b>←/→</b> (or A/D, or the buttons) to shuffle and keep your balance. Grab ⭐ stars, and stay inside the green middle zone for bonus points. Focus makes your special move recharge faster in battle!',
      buttons: [
        { id: 'left', label: '◀ LEFT', keys: ['ArrowLeft', 'KeyA'], hold: true },
        { id: 'right', label: 'RIGHT ▶', keys: ['ArrowRight', 'KeyD'], hold: true }],
      create(d) {
        const g = { t: 0, x: 0, vx: 0, ang: 0, amp: [0.12, 0.17, 0.22][d], falls: 0, fallT: 0, stars: [], starT: 0.8, spawned: 0,
          got: 0, center: 0, score: 0, ph: Math.random() * 6 };
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
          const inp = (hd.right ? 1 : 0) - (hd.left ? 1 : 0);
          g.vx += (Math.sin(g.ang) * 7 + inp * 4.5) * dt;
          g.vx *= Math.max(0, 1 - 1.8 * dt);
          g.x += g.vx * dt;
          if (Math.abs(g.x) < 0.3) { g.center += dt; g.score += dt * 2; }
          for (let i = g.stars.length - 1; i >= 0; i--) {
            if (Math.abs(g.stars[i].x - g.x) < 0.14) { g.stars.splice(i, 1); g.got++; g.score += 10; pop('+10 ⭐', '#e8a33a', 400 + g.x * 260, 150); sfx('coin'); }
          }
          if (Math.abs(g.x) > 1.06) { g.falls++; g.fallT = 1.2; g.fallDir = Math.sign(g.x); pop('Whoops! Fell off!', '#e8607a'); sfx('bad'); }
        };
        g.perf = () => clamp((0.6 * g.got) / Math.max(1, g.spawned) + (0.4 * g.center) / Math.max(1, g.t) + 0.1 - g.falls * 0.08, 0, 1);
        g.hud = () => `Stars <b>${g.got}</b> · Centered <b>${Math.round(g.center)}s</b> · Falls <b>${g.falls}</b>`;
        g.summary = () => `${g.got} stars · ${Math.round(g.center)}s centered · ${g.falls} falls`;
        g.draw = () => {
          sky('#ece3ff', '#fbefff');
          const px = 400, py = 300;
          for (let i = 0; i < 3; i++) {
            const k = (T * 0.4 + i / 3) % 1;
            ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; ctx.beginPath(); ctx.arc(220 + i * 180, 420 - k * 200, 20 + k * 30, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = '#d8ab6a'; DG.roundRect(ctx, 210, 320, 380, 110, 18); ctx.fill();
          ctx.strokeStyle = '#b98a4a'; ctx.lineWidth = 3;
          for (let y = 340; y < 430; y += 22) { ctx.beginPath(); ctx.moveTo(214, y); ctx.lineTo(586, y); ctx.stroke(); }
          ctx.save(); ctx.translate(px, py); ctx.rotate(g.ang);
          ctx.fillStyle = '#e8c48c'; ctx.beginPath(); ctx.ellipse(0, 6, 280, 12, 0, Math.PI, TAU); ctx.fill();
          ctx.fillStyle = '#d4a86a'; ctx.fillRect(-280, 4, 560, 12);
          ctx.fillStyle = 'rgba(80,200,140,0.45)'; ctx.fillRect(-0.3 * 260, -6, 0.6 * 260, 10);
          ctx.fillStyle = '#c4553e'; ctx.beginPath(); ctx.arc(0, -8, 6, 0, TAU); ctx.fill();
          const lidY = 6 - 12 * Math.sqrt(Math.max(0, 1 - ((g.x * 260) / 280) ** 2));
          if (g.fallT <= 0) DG.draw.dumpling(ctx, petOpts({ x: g.x * 260, y: lidY, size: 80, mood: Math.abs(g.x) > 0.75 ? 'surprised' : 'happy', rot: -g.ang * 0.5 + g.vx * 0.15, shadow: false }));
          ctx.restore();
          if (g.fallT > 0) {
            const k = 1.2 - g.fallT;
            DG.draw.dumpling(ctx, petOpts({ x: px + g.fallDir * (280 + k * 120), y: py - 16 + k * k * 400, size: 80, mood: 'dizzy', rot: k * 6 * g.fallDir, shadow: false }));
          }
          g.stars.forEach((s) => {
            const sx = px + s.x * 260 * Math.cos(g.ang), sy = py - 120 + s.x * 260 * Math.sin(g.ang) + Math.sin(T * 3 + s.bob) * 8;
            ctx.globalAlpha = Math.min(1, s.life);
            DG.draw.sparkle(ctx, sx, sy, 16, '#ffcc33');
            ctx.globalAlpha = 1;
          });
        };
        return g;
      },
    },
  };
  DG.TRAINING_GAMES = GAMES;

  /* ======================= Screens ======================= */
  function menu() {
    phase = 'menu'; cancelAnimationFrame(raf); g = null; DG.audio.homeTrack();
    const p = DG.pet(), si = DG.stageIndex(), cap = DG.statCap();
    root.innerHTML = `
      <header class="topbar slim">
        <button class="btn ghost" id="t-home">🏠 Home</button>
        <h2 class="screen-title">🏋️ Training Grounds</h2>
        <div class="coins">⚡ Energy <b>${Math.round(p.needs.energy)}</b></div>
      </header>
      <p class="lead">Each game lasts about 40 seconds and trains one stat. Everyone gets progress for joining in — great play earns more! Stats can reach <b>${cap}</b> at the ${DG.STAGES[si].name} stage.</p>
      <div class="train-grid">
        ${Object.entries(GAMES).map(([id, gm]) => {
          const si2 = DG.STAT_INFO[gm.stat];
          return `<div class="train-card">
            <div class="train-head"><span class="train-ico">${gm.icon}</span><div><h3>${gm.name}</h3><span class="stat-chip" style="background:${si2.color}">${si2.icon} ${si2.name}</span></div></div>
            <p>${gm.desc}</p>
            <div class="stat-row compact">${DG.ui.bar(p.stats[gm.stat], cap, si2.color)}<b>${Math.floor(p.stats[gm.stat])}<small>/${cap}</small></b></div>
            <div class="diff-row">${DIFFS.map((df, i) => {
              const locked = si < df.stage;
              return `<button class="btn small ${locked ? 'locked' : i === 0 ? 'primary' : ''}" data-g="${id}" data-d="${i}" ${locked ? `title="Unlocks at ${DG.STAGES[df.stage].name} stage"` : ''}>${locked ? '🔒 ' : ''}${df.name}${df.tag && !locked ? '★' : ''} <small>⚡${df.cost}</small></button>`;
            }).join('')}</div>
          </div>`;
        }).join('')}
      </div>
      <p class="fine center">Medium difficulty unlocks at the Medium stage; Hard (advanced) training unlocks at the Large stage. Harder levels give bigger rewards.</p>`;
    root.querySelector('#t-home').onclick = () => { DG.audio.play('click'); DG.ui.show('home'); };
    root.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => {
      const d = +b.dataset.d, df = DIFFS[d];
      if (DG.stageIndex() < df.stage) { DG.ui.toast(`🔒 ${df.name} training unlocks when your dumpling reaches the ${DG.STAGES[df.stage].name} stage.`); DG.audio.play('bad'); return; }
      if (DG.pet().needs.energy < df.cost) { DG.ui.toast(`😴 ${DG.ui.esc(DG.pet().name)} is too tired (needs ⚡${df.cost}). Try a nap or Warm Broth!`); DG.audio.play('bad'); return; }
      DG.audio.play('click'); start(b.dataset.g, d);
    }));
  }

  function start(id, d) {
    gameId = id; def = GAMES[id]; diff = d; held = {}; parts = []; T = 0; timeLeft = def.duration;
    DG.audio.setTrack(id);
    root.innerHTML = `
      <div class="t-game">
        <div class="t-top">
          <button class="btn small ghost" id="t-quit">✕ Quit</button>
          <b>${def.icon} ${def.name}</b><span class="diff-tag">${DIFFS[d].name}</span>
          <span class="t-time">⏱ <b id="t-time">${def.duration}</b>s</span>
          <span class="t-score" id="t-score"></span>
        </div>
        <div class="t-stage"><canvas id="t-cv"></canvas><div class="t-overlay" id="t-ov"></div></div>
        <div class="t-buttons ${def.buttons.length === 4 && def.buttons[0].label === '◀' ? 'dpad' : ''}" id="t-btns">
          ${def.buttons.map((b) => `<button class="tbtn" data-b="${b.id}">${b.label}</button>`).join('')}
        </div>
      </div>`;
    canvas = root.querySelector('#t-cv'); ctx = canvas.getContext('2d');
    g = def.create(d);
    root.querySelector('#t-quit').onclick = quit;
    root.querySelectorAll('.tbtn').forEach((b) => {
      const id2 = b.dataset.b;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); press(id2); });
      const up = () => { b.classList.remove('down'); held[id2] = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    });
    canvas.addEventListener('pointerdown', () => { if (phase === 'play' && def.buttons.length === 1) press(def.buttons[0].id); });
    showIntro();
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function showIntro() {
    phase = 'intro';
    const ov = root.querySelector('#t-ov'); ov.hidden = false;
    const st = DG.STAT_INFO[def.stat];
    ov.innerHTML = `<div class="ov-card"><h2>${def.icon} ${def.name}</h2><p class="stat-chip" style="background:${st.color}">${st.icon} Trains ${st.name}</p>
      <p>${def.how}</p><p class="fine">Uses ⚡${DIFFS[diff].cost} energy · ${def.duration} seconds</p>
      <button class="btn primary big" id="t-go">Start! <small>(Space)</small></button></div>`;
    ov.querySelector('#t-go').onclick = begin;
  }
  function begin() {
    if (phase !== 'intro') return;
    const p = DG.pet();
    if (p.needs.energy < DIFFS[diff].cost) { DG.ui.toast('Too tired to train right now!'); return menu(); }
    DG.addNeeds({ energy: -DIFFS[diff].cost });
    DG.save();
    phase = 'count'; countT = 3; timeLeft = def.duration;
    root.querySelector('#t-ov').hidden = true;
    DG.audio.play('click');
  }
  function press(id) {
    DG.audio.unlock();
    if (phase === 'intro') { begin(); return; }
    if (phase !== 'play') return;
    held[id] = true;
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
        g.update(dt, held);
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; finish(); }
      }
      const k = DG.ui.fitCanvas(canvas, W, H);
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

  function onKey(e, down) {
    if (DG.ui.current() !== 'train' || !def || phase === 'menu') return;
    if (DG.ui.anyModal()) return;
    if (down && e.code === 'Escape') { quit(); return; }
    if (down && phase === 'intro' && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); begin(); return; }
    const b = def.buttons.find((x) => x.keys.includes(e.code));
    if (!b) return;
    e.preventDefault();
    if (down) { if (!e.repeat) press(b.id); held[b.id] = true; }
    else held[b.id] = false;
  }
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));

  DG.Training = {
    enter() { root = document.getElementById('screen-train'); menu(); },
    exit() { cancelAnimationFrame(raf); phase = 'menu'; g = null; def = null; },
    GAMES,
    // test hooks (used by the verification script; not part of normal play)
    _start: (id, d) => start(id, d),
    _begin: () => begin(),
    _skip: () => { if (phase === 'count') phase = 'play'; timeLeft = 0.01; },
    _state: () => ({ phase, gameId, diff, g }),
  };
  DG.ui.register('train', DG.Training);
})(window.DG);
