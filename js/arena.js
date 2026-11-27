/* My Pet Dumpling — friendly 3D arena battles inside a giant bamboo steamer (three.js) */
(function (DG) {
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (n) => { DG.audio.play(n); netFx('sfx', [n]); };
  const STAGE_SCALE = { 0: 0.9, 1: 0.95, 2: 1, 3: 1.2, 4: 1.6 };
  const ARENA_R = { 0: 8.5, 1: 9, 2: 9, 3: 10.5, 4: 14 };
  const GIANT = 4;
  const MATCH_TIME = 90;

  let root, stageEl, renderer, scene, camera, raf = 0, last = 0, T = 0;
  let F = [], fx = [], projs = [], floats = [], crowd = [], petals = [], match = null;
  const keys = {}, edges = {}, touch = { x: 0, y: 0, btn: {}, edge: {} };

  /* ===================== Lobby ===================== */
  function lobby() {
    cleanupMatch(); DG.audio.homeTrack();
    const p = DG.pet(), si = DG.stageIndex(), st = DG.state;
    const hasThree = !!window.THREE;
    const nx = DG.nextStage();
    const OPP_IMG = { chili: 'img/ar_opp_chili.webp?v=1', shumai: 'img/ar_opp_shumai.webp?v=1', hargow: 'img/ar_opp_hargow.webp?v=1', pierogi: 'img/ar_opp_pierogi.webp?v=1', momo: 'img/ar_opp_momo.webp?v=1', mandu: 'img/ar_opp_mandu.webp?v=1', champion: 'img/ar_opp_champion.webp?v=1' };
    const STYLE_IMG = { charger: 'img/ar_style_charger.webp?v=1', blocker: 'img/ar_style_blocker.webp?v=1', dodger: 'img/ar_style_dodger.webp?v=1', mixed: 'img/ar_style_champion.webp?v=1' };
    const STYLE_TINT = { charger: '#ffe2cf', blocker: '#fff0c4', dodger: '#e3ecff', mixed: '#fff0b8' };
    const useViking = p.accessory === 'viking';
    root.innerHTML = `
      <div class="ar">
        <div class="ar-hero">
          <img class="ar-scene" src="img/ar_scene.webp?v=1" alt="">
          <header class="ar-top">
            <button class="ar-pill" id="a-home"><span aria-hidden="true">🏠</span> Home</button>
            <h2 class="ar-pill ar-title"><span aria-hidden="true">🏟️</span> Steamer Arena</h2>
            <div class="ar-pill ar-coins"><span aria-hidden="true">🪙</span> <b>${st.coins}</b></div>
          </header>
        </div>
        ${hasThree ? '' : '<p class="note warn">The 3D arena needs the three.js library, which loads from the internet. Please connect once and reload the page.</p>'}
        <div class="ar-card ar-me">
          ${useViking ? '<img class="ar-me-pic" src="img/ar_viking.webp?v=1" alt="">' : '<canvas id="a-prev" class="ar-me-pic"></canvas>'}
          <div class="ar-me-txt">
            <h3>${DG.ui.esc(p.name)} <span>${DG.STAGES[si].name}</span></h3>
            ${p.foodBonus ? `<p>${DG.FOODS[p.foodBonus.food].icon} Snack bonus ready: <b>${p.foodBonus.label}</b><br><small>Used up after your next real battle.</small></p>` : '<p>Tip: eat Tofu Bites or a Noodle Nest before a battle for a one-time boost.</p>'}
            ${DG.cozy() ? '<p>🏠 Cozy bonus active: +10% special charge.</p>' : ''}
          </div>
        </div>
        <div class="ar-section">
          <img class="ar-ribbon" src="img/ar_rib_opp.webp?v=1" alt="Opponents">
          ${si < 1 ? `<p class="ar-note">🌱 Arena battles unlock when ${DG.ui.esc(p.name)} reaches the <b>Small</b> stage${nx ? ` — in <b>${DG.fmtDuration(nx.msLeft)}</b>` : ''}. You can still battle a friend!</p>` : ''}
          <div class="ar-opps">${DG.OPPONENTS.map((o, i) => {
            const prev = DG.OPPONENTS[i - 1];
            const beaten = st.beaten[o.id];
            let lock = '';
            if (si < o.minStage) lock = `${DG.STAGES[o.minStage].name} stage`;
            else if (prev && !st.beaten[prev.id]) lock = `Beat ${prev.name}`;
            return `<div class="ar-opp ${lock ? 'locked' : ''}" style="--tint:${STYLE_TINT[o.style]}" title="${DG.ui.esc(DG.STYLES[o.style].tip)}">
              <img class="ar-style" src="${STYLE_IMG[o.style]}" alt="${DG.STYLES[o.style].name}">
              <img class="ar-face" src="${OPP_IMG[o.id]}" alt="">
              <div class="ar-opp-txt"><b>${o.name}${beaten ? ' <span class="won">✓</span>' : ''}</b><small>${DG.STYLES[o.style].name} · <i>${'★'.repeat(o.tier + 1)}</i></small></div>
              ${lock ? `<span class="ar-lock">🔒 ${lock}</span>` : `<button class="ar-fight" data-fight="${i}" ${hasThree ? '' : 'disabled'}>Fight!</button>`}
            </div>`;
          }).join('')}</div>
          <p class="ar-fine">Win to unlock the next challenger. You earn coins even if you lose!</p>
        </div>
        <div class="ar-section">
          <img class="ar-ribbon" src="img/ar_rib_mp.webp?v=1" alt="Multiplayer">
          <div class="ar-mp">
            <img class="ar-friends" src="img/ar_friends.webp?v=1" alt="">
            <div><h3>Battle a Friend</h3><p>Battle a friend's dumpling on another phone or computer. You both need to be on the <b>same Wi‑Fi</b>. Just for fun: no coins or rewards.</p></div>
          </div>
          <div class="ar-mp-btns">
            <button class="ar-btn host" id="a-host" ${hasThree ? '' : 'disabled'}>⚔️ Host a Battle</button>
            <button class="ar-btn join" id="a-join" ${hasThree ? '' : 'disabled'}>🔑 Join with a Code</button>
          </div>
          <button class="ar-controls" id="a-controls">🎮 Controls</button>
        </div>
      </div>`;
    root.querySelector('#a-home').onclick = () => { DG.audio.play('click'); DG.ui.show('home'); };
    root.querySelector('#a-controls').onclick = () => { DG.audio.play('click'); DG.ui.modal({ title: '🎮 Controls', html: controlsHtml(), buttons: [{ label: 'Got it', cls: 'primary' }] }); };
    const pv = root.querySelector('#a-prev');
    root._stop = pv ? DG.ui.previewLoop(pv, (t) => ({ type: p.type, look: p.look, stage: si, size: 90, accessory: p.accessory, trait: p.trait, mood: 'joy', hop: Math.max(0, Math.sin(t * 4)) * 8 }), 140, 120) : null;
    root.querySelectorAll('[data-fight]').forEach((b) => (b.onclick = () => { DG.audio.unlock(); startMatch({ opp: +b.dataset.fight }); }));
    root.querySelector('#a-host').onclick = () => { DG.audio.unlock(); hostGame(); };
    root.querySelector('#a-join').onclick = () => { DG.audio.unlock(); joinGame(); };
  }

  function controlsHtml() {
    return `<ul class="nice-list small">
              ${DG.ui.isTouch() ? `<li>👈 <b>Left side:</b> put your thumb down anywhere and drag to move.</li>
              <li>👉 <b>Right side:</b> big 👊 <b>Attack</b> (tap for combos, hold to Smash), hold 🛡️ <b>Block</b>, tap 💨 <b>Dodge</b>, and ✨ <b>Special</b> when it glows.</li>
              <li>📱 Turn your phone sideways for a bigger arena. Attacks reach a little farther on touch screens.</li>` : `<li><kbd>WASD</kbd>/<kbd>Arrows</kbd> move · <kbd>Space</kbd> dodge (uses stamina)</li>
              <li><kbd>J</kbd> attack (tap 3 times for a combo) · hold <kbd>J</kbd> to charge a <b>Smash</b> · <kbd>K</kbd> hold to block</li>
              <li><kbd>L</kbd> special (½ meter) · <kbd>I</kbd> second move · <kbd>O</kbd> ultimate (full meter)</li>`}
              <li>✨ <b>Parry:</b> raise your guard just before a hit lands. <b>Perfect dodge:</b> dodge at the last moment. Both slow time and make your next hit <b>critical</b>.</li>
              <li>💥 A fully charged Smash crushes the opponent's guard.</li>
              <li>Watch for the <b style="color:#e8453c">red ring and "!"</b> — that's an attack wind-up. Dodge or block!</li>
              <li>Blocking only stops hits from the front, and a tired guard breaks.</li>
            </ul>`;
  }

  /* ===================== Fighter setup ===================== */
  function playerDef(practice) {
    const p = DG.pet(), real = DG.stageIndex();
    const stageIdx = practice ? Math.max(3, real) : real; // friend battles: a temporary Large
    const stats = {};
    DG.STAT_KEYS.forEach((k) => (stats[k] = practice ? Math.max(p.stats[k], 30) : p.stats[k]));
    const moves = DG.STARTERS[p.type].moves;
    return {
      isPlayer: true, name: p.name, shape: p.type, hex: DG.lookColors(p.type, p.look).hex, accessory: p.accessory, trait: p.trait, look: p.look, colors2d: null,
      stats, stageIdx, bonus: practice ? null : p.foodBonus && p.foodBonus.type, cozy: DG.cozy(), moves,
      canSpecial: stageIdx >= 2, canMove2: stageIdx >= 3, canUlt: stageIdx >= 4,
    };
  }
  function oppDef(opp, pDef, practiceStyle) {
    const vals = DG.STAT_KEYS.map((k) => DG.pet().stats[k]);
    let avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const stats = {};
    let style, factor, skill, name, shape, hex, acc;
    if (practiceStyle) {
      avg = DG.STAT_KEYS.reduce((a, k) => a + pDef.stats[k], 0) / 5;
      style = practiceStyle; factor = 0.8; skill = 0.25; name = 'Sparring Buddy';
      shape = pick(['bao', 'gyoza', 'soup']); hex = 0xbfe3ff; acc = 'headband';
    } else {
      style = opp.style; factor = 0.85 + opp.tier * 0.05; skill = 0.35 + opp.tier * 0.09; name = opp.name; shape = opp.shape; hex = opp.hex; acc = opp.acc;
    }
    const tweak = {
      charger: { strength: 1.15, stamina: 1.05, defense: 0.9 }, blocker: { defense: 1.2, agility: 0.85 },
      dodger: { agility: 1.25, defense: 0.9 }, mixed: { strength: 1.05, stamina: 1.05, agility: 1.05, defense: 1.05, focus: 1.05 },
    }[style];
    DG.STAT_KEYS.forEach((k) => (stats[k] = avg * factor * (tweak[k] || 1)));
    const si = pDef.stageIdx;
    return {
      isPlayer: false, name, shape, hex, accessory: acc, trait: null, stats, stageIdx: si, style, skill, bonus: null,
      look: { eyes: { charger: 'lash', blocker: 'round', dodger: 'sparkle', mixed: 'wide' }[style] || 'round', cheeks: 'blush' }, colors2d: DG.draw.colorsFromHex(hex),
      moves: DG.STARTERS[shape].moves, canSpecial: si >= 2, canMove2: si >= 3, canUlt: si >= 4,
    };
  }

  /* ===================== 3D models ===================== */
  const BODY = { bao: { cy: 0.82, sx: 1, sy: 0.82, sz: 1 }, gyoza: { cy: 0.72, sx: 1.35, sy: 0.72, sz: 0.85 }, soup: { cy: 0.8, sx: 1, sy: 0.8, sz: 1 } };
  function toon(c, extra) { return new THREE.MeshToonMaterial(Object.assign({ color: c }, extra || {})); }
  function frontZ(b, x, y) { return b.sz * Math.sqrt(Math.max(0.01, 1 - ((y - b.cy) / b.sy) ** 2 - (x / b.sx) ** 2)); }
  function ringAt(body, b, y, color, tube) {
    const k = Math.sqrt(Math.max(0.05, 1 - ((y - b.cy) / b.sy) ** 2));
    const grp = new THREE.Group();
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, tube || 0.07, 8, 32), toon(color));
    m.rotation.x = Math.PI / 2; grp.add(m);
    grp.scale.set(b.sx * k * 1.03, 1, b.sz * k * 1.03); grp.position.y = y;
    body.add(grp); return grp;
  }
  function buildDumpling(def) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const b = BODY[def.shape];
    const mat = toon(def.hex);
    const mats = [mat];
    const main = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat);
    main.scale.set(b.sx, b.sy, b.sz); main.position.y = b.cy; body.add(main);
    const darker = new THREE.Color(def.hex).multiplyScalar(0.85).getHex();
    let topY;
    let arms = null;
    if (def.shape === 'bao') {
      // twisted, lumpy top knot
      const base = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 12), mat); base.scale.set(1, 0.5, 1); base.position.y = 1.58; body.add(base);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.4;
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), mat);
        l.scale.set(1, 1.1, 0.85); l.rotation.y = a; l.position.set(Math.sin(a) * 0.14, 1.76 + (i % 2) * 0.05, Math.cos(a) * 0.14); body.add(l);
      }
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat); tip.position.y = 1.9; body.add(tip);
      // swirling pleat lines from the knot down over the bun
      const pleatMat = toon(darker);
      for (let i = 0; i < 9; i++) {
        const a0 = (i / 9) * TAU, pts = [];
        for (let k = 0; k <= 8; k++) {
          const t = k / 8, y = 1.88 - t * 0.66, a = a0 + t * 1.3;
          const er = b.sx * Math.sqrt(Math.max(0, 1 - ((y - b.cy) / b.sy) ** 2));
          const r = y > 1.55 ? 0.1 + (1.88 - y) * 0.75 : er + 0.01;
          pts.push(new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r * (b.sz / b.sx)));
        }
        body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.018, 4, false), pleatMat));
      }
      // stubby arms (pivot at the shoulder) and little feet
      arms = [-1, 1].map((s) => {
        const pv = new THREE.Group(); pv.position.set(s * 0.88, 0.78, 0.1); body.add(pv);
        const a = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat); a.scale.set(1.1, 0.8, 0.85); a.position.x = s * 0.17; pv.add(a);
        pv.userData.side = s; return pv;
      });
      [-1, 1].forEach((s) => {
        const ft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat); ft.scale.set(1.05, 0.6, 1.25); ft.position.set(s * 0.42, 0.08, 0.32); body.add(ft);
      });
      topY = 1.82;
    } else if (def.shape === 'gyoza') {
      for (let i = 0; i < 7; i++) {
        const x = -0.95 + i * 0.317, h = Math.sqrt(Math.max(0, 1 - (x / b.sx) ** 2));
        const pl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat);
        pl.scale.set(0.8, 1, 0.7); pl.position.set(x, b.cy + b.sy * h * 0.92, 0); body.add(pl);
      }
      const crisp = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), toon(0xd9a05a));
      crisp.scale.set(b.sx * 0.95, 0.28, b.sz * 0.92); crisp.position.y = 0.24; body.add(crisp);
      topY = 1.55;
    } else {
      // shumai: a wrapper wall rising above the body, a frilly rim and an empty open top
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.88, 0.55, 28, 1, true), toon(def.hex, { side: THREE.DoubleSide })); wall.position.y = 1.42; body.add(wall);
      const inside = new THREE.Mesh(new THREE.CircleGeometry(0.79, 28), toon(new THREE.Color(def.hex).multiplyScalar(0.72).getHex(), { side: THREE.DoubleSide }));
      inside.rotation.x = -Math.PI / 2; inside.position.y = 1.6; body.add(inside);
      for (let i = 0; i < 16; i++) { // ruffles around the rim
        const a = (i / 16) * TAU, rf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat);
        rf.scale.set(1, 0.6, 0.8); rf.position.set(Math.sin(a) * 0.82, 1.71, Math.cos(a) * 0.82); rf.rotation.y = a; body.add(rf);
      }
      for (let i = 0; i < 10; i++) { // pleat lines down the sides
        const a = (i / 10) * TAU, ln = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 4), toon(darker));
        ln.position.set(Math.sin(a) * 0.86, 1.4, Math.cos(a) * 0.86); body.add(ln);
      }
      topY = 1.8;
    }
    // face
    const isBao = def.shape === 'bao';
    const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
    const eyeY = b.cy + b.sy * (isBao ? 0.2 : 0.18), eyes = [];
    const eDX = isBao ? 0.33 : 0.3, eR = isBao ? 0.14 : 0.11;
    [-1, 1].forEach((s) => {
      const x = s * eDX, z = frontZ(b, x, eyeY);
      const eg = new THREE.Group(); eg.position.set(x, eyeY, z); eg.rotation.y = s * 0.3; body.add(eg); eyes.push(eg);
      const e = new THREE.Mesh(new THREE.SphereGeometry(eR, 14, 10), basic(isBao ? 0x3a1e10 : 0x3b2a22));
      e.scale.set(0.85, 1.1, 0.5); e.position.z = -0.02; eg.add(e);
      if (isBao) { // warm brown glow in the lower iris
        const gl = new THREE.Mesh(new THREE.SphereGeometry(eR * 0.62, 12, 8), basic(0xb9783c));
        gl.scale.set(0.95, 0.65, 0.4); gl.position.set(0, -eR * 0.5, 0.03); eg.add(gl);
        const br = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 14, Math.PI * 0.55), basic(0x3a1e10));
        br.rotation.z = Math.PI * 0.225; br.position.set(s * 0.015, eR * 1.25, 0.0); eg.add(br);
      }
      const hl = new THREE.Mesh(new THREE.SphereGeometry(eR * 0.32, 8, 6), basic(0xffffff));
      hl.position.set(eR * 0.25, eR * 0.38, 0.05); eg.add(hl);
      const hl2 = new THREE.Mesh(new THREE.SphereGeometry(eR * 0.14, 6, 5), basic(0xffffff));
      hl2.position.set(-eR * 0.3, -eR * 0.1, 0.05); eg.add(hl2);
      const bx = s * (isBao ? 0.58 : 0.55), by = eyeY - (isBao ? 0.2 : 0.17), bz = frontZ(b, bx, by);
      const bl = new THREE.Mesh(new THREE.CircleGeometry(isBao ? 0.14 : 0.11, 16), basic(0xff9aa8, { transparent: true, opacity: 0.6 }));
      bl.scale.y = isBao ? 0.7 : 1; bl.position.set(bx, by, bz + 0.01); bl.rotation.y = s * 0.55; body.add(bl);
    });
    let mouthGrp = null, smallMouth = null;
    if (isBao) { // big open smile with a pink tongue
      const my = eyeY - 0.13, mz = frontZ(b, 0, my);
      mouthGrp = new THREE.Group(); mouthGrp.position.set(0, my, mz + 0.012); body.add(mouthGrp);
      const mo = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24, Math.PI, Math.PI), basic(0x8a3426)); mo.scale.y = 1.25; mouthGrp.add(mo);
      const tg = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), basic(0xf2828a)); tg.scale.y = 0.55; tg.position.set(0, -0.115, 0.004); mouthGrp.add(tg);
      smallMouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 14), basic(0x3a1e10));
      smallMouth.position.set(0, my - 0.06, mz + 0.012); smallMouth.visible = false; body.add(smallMouth);
    } else {
      const my = eyeY - 0.18;
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 6, 12, Math.PI), basic(0x3b2a22));
      mouth.rotation.z = Math.PI; mouth.position.set(0, my + 0.05, frontZ(b, 0, my) + 0.01); body.add(mouth);
    }
    const face = { expr: null, set(expr) { if (expr === this.expr) return; this.expr = expr;
      const sy = expr === 'ko' ? 0.2 : expr === 'hurt' ? 0.4 : 1; eyes.forEach((e) => { e.scale.y = sy; });
      if (mouthGrp) { const sad = expr === 'ko' || expr === 'hurt' || expr === 'sad'; mouthGrp.visible = !sad; smallMouth.visible = sad; } } };
    // accessories
    const acc = def.accessory;
    if (acc === 'bow') {
      const bm = toon(0xff7fa8);
      [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 8), bm); c.rotation.z = s * Math.PI / 2; c.position.set(0.5 + s * 0.15, topY - 0.35, 0.3); body.add(c); });
    } else if (acc === 'tinyhat') {
      const hm = toon(0x3a3240);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 20), hm); brim.position.y = topY - 0.05; body.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 20), hm); crown.position.y = topY + 0.15; body.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.08, 20), toon(0xe8453c)); band.position.y = topY + 0.02; body.add(band);
    } else if (acc === 'headband') ringAt(body, b, b.cy + b.sy * 0.62, 0xb48cf0, 0.08);
    else if (acc === 'chef') {
      const w = toon(0xffffff);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 16), w); c.position.y = topY + 0.05; body.add(c);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), w); puff.scale.y = 0.7; puff.position.y = topY + 0.35; body.add(puff);
    } else if (acc === 'party') {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 16), toon(0x6fc3ff)); c.position.y = topY + 0.2; body.add(c);
      const pp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(0xff7fa8)); pp.position.y = topY + 0.52; body.add(pp);
    } else if (acc === 'flower') {
      const cols = [0xff9fbf, 0xffd36a, 0x9fd8ff, 0xc7a5ff, 0xff9f80];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon(cols[i % 5])); f.position.set(Math.sin(a) * 0.45, topY - 0.35, Math.cos(a) * 0.45); body.add(f); }
    } else if (acc === 'beret') {
      const be = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10), toon(0xd94a5a)); be.scale.y = 0.3; be.position.set(-0.1, topY - 0.05, 0); be.rotation.z = 0.25; body.add(be);
    } else if (acc === 'glasses') {
      [-1, 1].forEach((s) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 20), toon(0x4a3a6a)); r.position.set(s * 0.3, eyeY, frontZ(b, s * 0.3, eyeY) + 0.04); body.add(r); });
    } else if (acc === 'cap') {
      const cm = toon(0x3f7fd6);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12, 0, TAU, 0, Math.PI / 2), cm); dome.scale.y = 0.75; dome.position.y = topY - 0.22; body.add(dome);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 20, 1, false, -Math.PI / 2, Math.PI), toon(0x2f6cc4));
      brim.scale.set(1, 1, 1.4); brim.position.set(0, topY - 0.21, 0.4); body.add(brim);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon(0xffffff)); btn.position.y = topY + 0.16; body.add(btn);
    } else if (acc === 'shades') {
      const sm = toon(0x23252e);
      [-1, 1].forEach((s) => {
        const ex = s * eDX, z = frontZ(b, ex, eyeY);
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.05, 16), sm); l.rotation.x = Math.PI / 2; l.scale.set(1.1, 1, 0.8);
        l.position.set(ex, eyeY, z + 0.07); l.rotation.y = s * 0.3; body.add(l);
      });
      const br = new THREE.Mesh(new THREE.BoxGeometry(eDX * 2 - 0.3, 0.04, 0.04), sm); br.position.set(0, eyeY + 0.08, frontZ(b, 0, eyeY) + 0.07); body.add(br);
    } else if (acc === 'bowtie') {
      const y = b.cy - b.sy * 0.3, z = frontZ(b, 0, y) + 0.02, bm = toon(0x34528f);
      [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 8), bm); c.rotation.z = s * Math.PI / 2; c.position.set(s * 0.13, y, z); body.add(c); });
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon(0x4a6bb0)); k.position.set(0, y, z + 0.03); body.add(k);
    } else if (acc === 'headphones') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(b.sx * 0.98, 0.05, 8, 28, Math.PI), toon(0x2b2f3a));
      band.scale.y = (topY + 0.05 - eyeY) / (b.sx * 0.98); band.position.y = eyeY; body.add(band);
      [-1, 1].forEach((s) => {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 18), toon(0x3fbf7a)); cup.rotation.z = Math.PI / 2;
        cup.position.set(s * b.sx * 0.98, eyeY, 0); body.add(cup);
      });
    } else if (acc === 'ninja') {
      ringAt(body, b, b.cy + b.sy * 0.6, 0x3a4258, 0.07);
      const y = b.cy + b.sy * 0.6, z = frontZ(b, 0, y);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.04), toon(0xc9d1de)); plate.position.set(0, y, z + 0.06); plate.rotation.x = -0.35; body.add(plate);
      [-1, 1].forEach((s) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.5), toon(0x3a4258)); t.position.set(s * 0.12, y - 0.05, -b.sz - 0.15); t.rotation.set(0.35, s * 0.35, 0); body.add(t); });
    } else if (acc === 'viking') {
      const hm = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 12, 0, TAU, 0, Math.PI / 2), toon(0xb3bccb)); hm.scale.y = 0.8; hm.position.y = topY - 0.25; body.add(hm);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 8, 24), toon(0xb8875a)); rim.rotation.x = Math.PI / 2; rim.position.y = topY - 0.24; body.add(rim);
      [-1, 1].forEach((s) => {
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 10), toon(0xfff4dc)); h.position.set(s * 0.6, topY + 0.02, 0); h.rotation.z = -s * 0.7; body.add(h);
      });
    } else if (acc === 'mustache') {
      const y = eyeY - 0.08, mm = toon(0x6e4428);
      [-1, 1].forEach((s) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mm); m.scale.set(1.5, 0.55, 0.6);
        m.position.set(s * 0.12, y, frontZ(b, s * 0.12, y) + 0.04); m.rotation.z = s * 0.25; body.add(m);
      });
    } else if (acc === 'crown') {
      const gm = toon(0xffcc33);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.2, 16, 1, true), gm); c.position.y = topY; body.add(c);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), gm); sp.position.set(Math.sin(a) * 0.3, topY + 0.18, Math.cos(a) * 0.3); body.add(sp); }
    }
    if (def.trait === 'strength') ringAt(body, b, b.cy + b.sy * 0.5, 0xe8453c, 0.09);
    if (def.trait === 'agility') ringAt(body, b, b.cy - b.sy * 0.55, 0x2ab7a9, 0.12);
    if (def.trait === 'defense') {
      const v = new THREE.Mesh(new THREE.SphereGeometry(1.04, 24, 12, 0, TAU, Math.PI * 0.55, Math.PI * 0.4), toon(0xffa24c, { side: THREE.DoubleSide }));
      v.scale.set(b.sx, b.sy, b.sz); v.position.y = b.cy; v.userData.noOutline = true; body.add(v);
    }
    // shadow
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1.1 * b.sx, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
    // telegraph ring
    const tele = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.5, 40), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    tele.rotation.x = -Math.PI / 2; tele.position.y = 0.05; tele.visible = false; g.add(tele);
    // "!" sprite
    const bang = textSprite('!', '#ff4040'); bang.position.y = topY + 0.9; bang.visible = false; bang.scale.set(0.9, 0.9, 1); g.add(bang);
    const dizzy = textSprite('💫', '#ffcc33'); dizzy.position.y = topY + 0.5; dizzy.visible = false; dizzy.scale.set(1.1, 1.1, 1); g.add(dizzy);
    // block shield
    const shield = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    shield.position.set(0, 0.9, 1.5); shield.visible = false; g.add(shield);
    // bubble
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.75, 24, 16), new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.28 }));
    bubble.position.y = 0.9; bubble.visible = false; g.add(bubble);
    // facing marker for the player
    if (def.isMe != null ? def.isMe : def.isPlayer) {
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 3), new THREE.MeshBasicMaterial({ color: 0x4cc58a }));
      arrow.rotation.x = Math.PI / 2; arrow.position.set(0, 0.06, 1.65); g.add(arrow);
    }
    // charge aura for the held Smash attack
    const charge = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.3, 40), new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    charge.rotation.x = -Math.PI / 2; charge.position.y = 0.07; charge.visible = false; g.add(charge);
    return { g, body, mats, tele, bang, dizzy, shield, bubble, eyes, topY, face, charge, arms };
  }
  function textSprite(text, color) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.font = '700 100px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 12; x.strokeStyle = '#fff'; x.strokeText(text, 64, 70); x.fillStyle = color; x.fillText(text, 64, 70);
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  }

  /* ===================== Arena scene ===================== */
  function floorTexture(color) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = 'rgba(120,80,30,0.25)'; x.lineWidth = 3;
    for (let r = 20; r < 260; r += 22) { x.beginPath(); x.arc(256, 256, r, 0, TAU); x.stroke(); }
    x.strokeStyle = 'rgba(120,80,30,0.12)'; x.lineWidth = 2;
    for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(a) * 256, 256 + Math.sin(a) * 256); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(256, 256, 40, 0, TAU); x.fill();
    return new THREE.CanvasTexture(c);
  }
  function wallTexture(color) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, 512, 64);
    for (let i = 0; i < 512; i += 16) { x.fillStyle = i % 32 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'; x.fillRect(i, 0, 8, 64); }
    x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(0, 26, 512, 6);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.x = 6; return t;
  }
  function buildScene(themeId, R) {
    const th = DG.ARENAS[themeId] || DG.ARENAS.classic;
    scene = new THREE.Scene();
    {
      const c = document.createElement('canvas'); c.width = 2; c.height = 256;
      const x = c.getContext('2d'), base = '#' + new THREE.Color(th.sky).getHexString();
      const gr = x.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, themeId === 'night' ? DG.draw.shade(base, 0.55) : DG.draw.mix(base, '#9fd0ff', 0.55));
      gr.addColorStop(0.65, base); gr.addColorStop(1, DG.draw.shade(base, 1.25));
      x.fillStyle = gr; x.fillRect(0, 0, 2, 256);
      scene.background = new THREE.CanvasTexture(c);
    }
    scene.fog = new THREE.Fog(th.sky, R * 3, R * 7);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9a77a, themeId === 'night' ? 0.45 : 0.55));
    const dl = new THREE.DirectionalLight(0xfff4e6, 0.6); dl.position.set(5, 12, 8); scene.add(dl);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(R * 6, 48), new THREE.MeshLambertMaterial({ color: th.ground }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.6; scene.add(ground);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.4, R + 0.6, 0.6, 64), [
      new THREE.MeshLambertMaterial({ color: th.wall }), new THREE.MeshLambertMaterial({ map: floorTexture(th.floor) }), new THREE.MeshLambertMaterial({ color: th.wall })]);
    floor.position.y = -0.3; scene.add(floor);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.5, R + 0.5, 1.6, 64, 1, true),
      new THREE.MeshLambertMaterial({ map: wallTexture(th.wall), side: THREE.DoubleSide }));
    wall.position.y = 0.5; scene.add(wall);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.5, 0.22, 8, 64), new THREE.MeshLambertMaterial({ color: new THREE.Color(th.wall).multiplyScalar(0.8) }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 1.3; scene.add(rim);
    // crowd
    crowd = [];
    const cols = [0xfff4e6, 0xf7dba2, 0xfbf0e2, 0xffd3df, 0xd4ecc4, 0xc9dbf5, 0xffe08a, 0xffb08a];
    // bleacher ring for the back row
    const benchMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(th.wall).multiplyScalar(0.9), side: THREE.DoubleSide });
    const benchTop = new THREE.Mesh(new THREE.RingGeometry(R + 2.9, R + 4.5, 64), benchMat);
    benchTop.rotation.x = -Math.PI / 2; benchTop.position.y = 0.9; scene.add(benchTop);
    const benchSide = new THREE.Mesh(new THREE.CylinderGeometry(R + 2.9, R + 2.9, 1.5, 64, 1, true), benchMat);
    benchSide.position.y = 0.15; scene.add(benchSide);
    const n = Math.round(R * 4.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.05, 0.05);
      if (Math.cos(a) > 0.15) continue; // spectators sit behind and beside the ring, never between camera and fighters
      const tier = i % 2;
      const r = R + 2 + tier * 1.7;
      const grp = new THREE.Group();
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), toon(pick(cols))); s.scale.y = 0.8; s.position.y = 0.55; grp.add(s);
      [-1, 1].forEach((k) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0x3b2a22 })); e.position.set(k * 0.2, 0.7, 0.62); grp.add(e); });
      grp.position.set(Math.sin(a) * r, 0.2 + tier * 0.9, Math.cos(a) * r);
      grp.lookAt(0, grp.position.y, 0);
      scene.add(grp);
      crowd.push({ g: grp, baseY: grp.position.y, ph: Math.random() * TAU });
    }
    // theme extras
    petals = [];
    if (themeId === 'night') {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU, r = R + 4.5;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 6), new THREE.MeshLambertMaterial({ color: 0x5a3a2a }));
        pole.position.set(Math.sin(a) * r, 2, Math.cos(a) * r); scene.add(pole);
        const lan = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff5a4a }));
        lan.scale.y = 1.2; lan.position.set(Math.sin(a) * r, 4.6, Math.cos(a) * r); scene.add(lan);
      }
    }
    if (themeId === 'blossom') {
      const pm = new THREE.MeshBasicMaterial({ color: 0xffa8c8, side: THREE.DoubleSide });
      for (let i = 0; i < 70; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14), pm);
        m.position.set(rand(-R - 4, R + 4), rand(0, 12), rand(-R - 4, R + 4)); scene.add(m);
        petals.push({ m, v: rand(0.5, 1.2), ph: Math.random() * TAU });
      }
    }
  }

  /* ===================== Effects ===================== */
  function addFx(mesh, life, update) { scene.add(mesh); fx.push({ mesh, life, max: life, update }); }
  let burstTex = null;
  function burstTexture() {
    if (burstTex) return burstTex;
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.lineJoin = 'round';
    DG.draw.burstShape(x, 128, 128, 118, 10, 0.42); x.fillStyle = '#ffe066'; x.fill(); x.lineWidth = 9; x.strokeStyle = '#3a2418'; x.stroke();
    DG.draw.burstShape(x, 128, 128, 70, 10, 0.5); x.fillStyle = '#fff'; x.fill();
    burstTex = new THREE.CanvasTexture(c); return burstTex;
  }
  /** Comic-style impact starburst. */
  function burst3d(pos, size, tint, y) {
    netFx('burst3d', [pos, size, tint, y]);
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: burstTexture(), color: tint || 0xffffff, transparent: true, depthTest: false }));
    m.position.set(pos.x, (y || 1) * match.S, pos.z); m.material.rotation = Math.random() * TAU;
    addFx(m, 0.24, (e, k) => { const sc = size * match.S * (0.6 + k * 0.8); m.scale.set(sc, sc, 1); m.material.opacity = 1 - k * k; });
  }
  /** White crescent swipe in front of an attacker. */
  function slashFx(f, big) {
    netFx('slashFx', [f, big]);
    const S = match.S, grp = new THREE.Group();
    const m = new THREE.Mesh(new THREE.RingGeometry(1.0, big ? 1.6 : 1.35, 24, 1, -Math.PI / 2 - 1.0, 2.0),
      new THREE.MeshBasicMaterial({ color: big ? 0xffe39a : 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; grp.add(m);
    const dir = (f.combo % 2 ? -1 : 1);
    grp.position.set(f.pos.x, 0.9 * S + f.hopY, f.pos.z);
    addFx(grp, 0.18, (e, k) => { m.material.opacity = 0.9 * (1 - k); grp.scale.setScalar(S * (1.1 + k * 0.5) * (f.radius / S)); grp.rotation.y = f.facing + (k - 0.5) * 0.7 * dir; });
  }
  /** Translucent afterimage left behind while dashing or dodging. */
  function ghost(f) {
    const b = BODY[f.shape], S = match.S;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: f.isPlayer ? 0x9fe8ff : 0xffb0a0, transparent: true, opacity: 0.4, depthWrite: false }));
    m.scale.set(b.sx * S, b.sy * S, b.sz * S); m.position.set(f.pos.x, b.cy * S + f.hopY, f.pos.z);
    addFx(m, 0.25, (e, k) => { m.material.opacity = 0.4 * (1 - k); });
  }
  function overlay(sel, cls, dur) {
    const el = stageEl && stageEl.querySelector(sel); if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    if (dur) { clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove(cls), dur * 1000); }
  }
  const flashScreen = () => { overlay('.a-flash', 'go'); netFx('flashScreen', []); };
  function speedLines(d) {
    netFx('speedLines', [d]); match.speedT = Math.max(match.speedT || 0, d); }
  function cutIn(f, text) {
    netFx('cutIn', [f, text]);
    const el = stageEl && stageEl.querySelector('.a-cutin'); if (!el) return;
    el.className = 'a-cutin' + (f === meF() ? '' : ' enemy');
    el.innerHTML = `<canvas width="220" height="190"></canvas><b>${DG.ui.esc(text)}!</b>`;
    const c = el.querySelector('canvas').getContext('2d');
    DG.draw.dumpling(c, { type: f.shape, look: f.look, colors: f.colors2d || undefined, x: 110, y: 182, size: 150, mood: 'grumpy', stage: f.stageIdx,
      accessory: f.accessory, trait: f.trait, shadow: false, t: T });
    void el.offsetWidth; el.classList.add('show');
  }
  function comboText(n) {
    const el = stageEl && stageEl.querySelector('.a-combo'); if (!el) return;
    el.innerHTML = `${n} HITS!<small>${n >= 6 ? 'UNSTOPPABLE' : n >= 4 ? 'AMAZING' : 'COMBO'}</small>`;
    overlay('.a-combo', 'show', 1.4);
  }
  function ring(pos, color, maxR, dur) {
    netFx('ring', [pos, color, maxR, dur]);
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.08, pos.z);
    addFx(m, dur, (e, k) => { const s = 0.3 + maxR * k; m.scale.set(s, s, s); m.material.opacity = 0.85 * (1 - k); });
  }
  function puffs(pos, n, color, spread, y) {
    netFx('puffs', [pos, n, color, spread, y]);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(rand(0.3, 0.6) * match.S, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
      const a = Math.random() * TAU, v = new THREE.Vector3(Math.cos(a), rand(0.1, 0.6), Math.sin(a)).multiplyScalar(spread * rand(1.2, 2));
      m.position.set(pos.x, (y || 0.6) * match.S, pos.z);
      addFx(m, rand(0.5, 0.8), (e, k, dt) => { m.position.addScaledVector(v, dt); v.multiplyScalar(1 - dt * 2.5); m.material.opacity = 0.85 * (1 - k); m.scale.setScalar(1 + k); });
    }
  }
  function sparks(pos, color) {
    netFx('sparks', [pos, color]);
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.09 * match.S, 6, 4), new THREE.MeshBasicMaterial({ color: color || 0xffd36a, transparent: true }));
      const v = new THREE.Vector3(rand(-1, 1), rand(0.5, 1.8), rand(-1, 1)).multiplyScalar(6 * match.S);
      m.position.set(pos.x, 1 * match.S, pos.z);
      addFx(m, 0.45, (e, k, dt) => { v.y -= 20 * dt; m.position.addScaledVector(v, dt); m.material.opacity = 1 - k; });
    }
  }
  function confetti3d() {
    const cols = [0xff7fa8, 0xffd36a, 0x6fd3b5, 0x7fb2ff, 0xc49bff];
    for (let i = 0; i < 80; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.14), new THREE.MeshBasicMaterial({ color: pick(cols), side: THREE.DoubleSide, transparent: true }));
      const R = match.R;
      m.position.set(rand(-R, R), rand(8, 14), rand(-R, R));
      const vr = rand(2, 6);
      addFx(m, rand(2.5, 3.5), (e, k, dt) => { m.position.y -= dt * 4; m.rotation.x += vr * dt; m.rotation.y += vr * dt * 0.7; m.material.opacity = 1 - Math.max(0, k - 0.7) / 0.3; });
    }
  }
  function floatText(f, text, color, big) {
    netFx('floatText', [f, text, color, big]);
    const el = document.createElement('div');
    el.className = 'ftext' + (big ? ' big' : '');
    el.textContent = text; el.style.color = color || '#fff';
    stageEl.querySelector('.a-floats').appendChild(el);
    floats.push({ el, pos: new THREE.Vector3(f.pos.x + rand(-0.4, 0.4), (f.mesh.topY + 0.6) * match.S, f.pos.z), life: 1.0 });
  }
  function banner(html, dur) {
    netFx('banner', [html, dur]);
    const b = stageEl.querySelector('.a-banner');
    b.innerHTML = html; b.classList.add('show');
    clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), (dur || 1.2) * 1000);
  }
  function cheer(amount) { match.cheer = Math.min(1.5, match.cheer + amount); }

  /* ===================== Combat ===================== */
  function makeFighter(def, S) {
    const bs = DG.battleStats(def.stats, def.bonus, def.cozy);
    const mesh = buildDumpling(def);
    mesh.g.scale.setScalar(S);
    scene.add(mesh.g);
    return Object.assign({}, def, bs, {
      hp: bs.maxHp, sta: bs.maxSta, special: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), kb: new THREE.Vector3(),
      facing: 0, state: 'idle', stT: 0, invuln: 0, stunDur: 0, blocking: false, bubble: 0, cd2: 0, flash: 0, hopY: 0,
      hitDone: false, mv: null, lockFacing: false, spin: false, mesh, radius: 1.0 * S * (def.shape === 'gyoza' ? 1.15 : 1),
      windup: def.isPlayer ? 0.28 : 0.56 - def.skill * 0.16, msgT: 0,
      combo: 0, heavy: 0, buf: 0, parryT: 0, guardCd: 0, chain: 0, chainT: 0, crit: false, perfectUsed: false, lastResult: null, blinkT: rand(1, 3), ghostT: 0,
      ai: { holdT: 0, comboDecided: false, atkCd: 1.0, blockT: 0, side: Math.random() < 0.5 ? 1 : -1, sideT: 2, reacted: false, counter: false, dart: 0, postDodge: 0, mixT: 0, cur: 'charger' },
    });
  }
  function setState(f, s) { f.state = s; f.stT = 0; }
  function facingVec(f) { return new THREE.Vector3(Math.sin(f.facing), 0, Math.cos(f.facing)); }
  function flatDist(a, b) { return Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z); }
  function dirTo(a, b) { const v = new THREE.Vector3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z); return v.lengthSq() > 1e-6 ? v.normalize() : facingVec(a); }

  function applyHit(att, def, dmg, o) {
    if (def.state === 'ko' || match.over) return 'none';
    const S = match.S;
    if (def.invuln > 0) {
      if (def.state === 'dodge' && def.stT < 0.17 && !def.perfectUsed) perfectDodge(def);
      else if (def.msgT <= 0) { floatText(def, 'Dodged!', '#6fd3b5'); def.msgT = 0.4; }
      sfx('whoosh'); return 'dodged';
    }
    let crit = false;
    if (att.crit) { crit = true; att.crit = false; dmg *= 1.5; }
    let d = dmg, kb = (o.kb || 3) * S, result = 'hit';
    const faceDot = facingVec(def).dot(dirTo(def, att));
    if (def.bubble > 0) { d *= 0.2; kb *= 0.2; floatText(def, 'Bubble!', '#7fd0ff'); sfx('pop'); result = 'bubble'; }
    else if (def.blocking && faceDot > 0.2) {
      if (def.parryT > 0 && !o.noParry && (def.isPlayer || Math.random() < def.skill * 0.6)) return parry(def, att);
      d *= 1 - def.blockRed; kb *= 0.35; def.sta -= o.blockCost || 18;
      floatText(def, 'Blocked!', '#7fb2ff'); sfx('block'); result = 'blocked';
      if (!def.isPlayer) def.ai.counter = true;
      if (o.crush) { floatText(def, 'GUARD CRUSH!', '#ff9f40', true); burst3d(def.pos, 3.2, 0xffc080); match.hitstop = 0.1; guardBreak(def); }
      else if (def.sta <= 0) guardBreak(def);
    } else {
      if (def.state !== 'move') { setState(def, 'stun'); def.stunDur = o.stun || 0.3; }
      def.flash = 0.18; sfx(crit || o.heavy ? 'crit' : 'hit'); sparks(def.pos); cheer(o.heavy || crit ? 1 : 0.5);
      const big = o.heavy || crit;
      burst3d(def.pos, big ? 3.6 : 2.1, crit ? 0xffd0d0 : 0xffffff);
      match.hitstop = Math.max(match.hitstop || 0, big ? 0.12 : 0.05);
      match.shake = Math.max(match.shake, (big ? 0.3 : 0.12) * S);
      if (big) flashScreen();
      att.chain++; att.chainT = 1.6; def.chain = 0;
      if (att === meF()) { match.stats.maxCombo = Math.max(match.stats.maxCombo, att.chain); if (att.chain >= 2) comboText(att.chain); }
      else if (match.net && att.chain >= 2) netSendFx('comboText', [att.chain]);
    }
    d = Math.max(1, Math.round(d));
    def.hp = Math.max(0, def.hp - d);
    floatText(def, (crit ? 'CRIT! ' : '') + '-' + d, result === 'hit' ? (crit ? '#ffd36a' : '#ff6b6b') : '#ffffff', crit || (o.heavy && result === 'hit'));
    def.kb.copy(dirTo(att, def)).multiplyScalar(kb * 3);
    if (att.canSpecial) att.special = Math.min(100, att.special + (result === 'hit' ? 8 : 4));
    if (def.canSpecial) def.special = Math.min(100, def.special + 4);
    if (def.hp <= 0) knockout(def, att);
    return result;
  }
  /** Dodging at the very last moment: slow motion and a critical counter. */
  function perfectDodge(f) {
    f.perfectUsed = true; f.crit = true;
    if (f.canSpecial) f.special = Math.min(100, f.special + 15);
    floatText(f, 'PERFECT DODGE!', '#9fe8ff', true); sfx('perfect');
    if (f.isPlayer) { match.slow = 0.6; speedLines(0.6); match.stats.perfect++; }
  }
  /** Blocking right before a hit lands: no damage, the attacker is stunned, and your next hit is critical. */
  function parry(f, att) {
    att.mv = null; att.spin = false; att.lockFacing = false; att.hopY = 0; att.combo = 0; att.heavy = 0;
    setState(att, 'stun'); att.stunDur = 0.8; att.kb.copy(dirTo(f, att)).multiplyScalar(4 * match.S);
    f.crit = true; if (f.canSpecial) f.special = Math.min(100, f.special + 12);
    floatText(f, 'PARRY!', '#ffe066', true); sfx('parry');
    const mid = { x: (f.pos.x + att.pos.x) / 2, z: (f.pos.z + att.pos.z) / 2 };
    burst3d(mid, 3, 0xbfe6ff); match.hitstop = 0.12; match.shake = Math.max(match.shake, 0.18 * match.S);
    if (f.isPlayer) { match.slow = 0.45; match.stats.parries++; }
    return 'parried';
  }
  function tryHit(att, def, dmg, o) {
    // touch players get a little extra reach (aim assist), since thumbs are less precise than keys
    const assist = att.isPlayer && DG.ui.isTouch() ? 0.45 : 0;
    const reach = att.radius + def.radius + ((o.range || 1.0) + assist) * match.S;
    // a last-moment dodge out of range still counts as a perfect dodge
    if (def.state === 'dodge' && def.stT < 0.17 && !def.perfectUsed && flatDist(att, def) <= reach + 1.5 * match.S) { perfectDodge(def); return 'dodged'; }
    if (flatDist(att, def) > reach) return 'miss';
    if (!o.aoe && facingVec(att).dot(dirTo(att, def)) < 0.34) return 'miss';
    return applyHit(att, def, dmg, o);
  }
  function guardBreak(f) {
    f.sta = 0; f.blocking = false; setState(f, 'stun'); f.stunDur = 0.9;
    floatText(f, 'Guard tired!', '#ffc75a'); sfx('bad');
  }
  function knockout(loser, winner) {
    loser.hp = 0; setState(loser, 'ko'); loser.mv = null; loser.blocking = false; loser.bubble = 0;
    sfx('thud'); cheer(1.5); match.shake = 0.3 * match.S;
    match.hitstop = 0.18; match.slow = 1.1; speedLines(1.1); flashScreen(); burst3d(loser.pos, 5, 0xffffff);
    endMatch(winner === F[0] ? 'win' : 'lose', 'ko');
  }

  /* ---------- Special moves ---------- */
  const MOVES = {
    steampuff(f, o) {
      let t = 0, fired = false;
      return { update(dt) {
        t += dt; f.vel.multiplyScalar(0.5);
        if (!fired && t >= 0.3) {
          fired = true; sfx('steam'); puffs(f.pos, 18, 0xffffff, 3.2 * match.S); ring(f.pos, 0xffffff, 3.6 * match.S, 0.5);
          if (flatDist(f, o) < 3.4 * match.S + o.radius) applyHit(f, o, f.dmg * 1.1, { kb: 6, stun: 0.5, blockCost: 10 });
        }
        return t >= 0.6;
      }, t: () => t };
    },
    crispydash(f, o) {
      let t = 0, hit = false; const dir = dirTo(f, o);
      f.lockFacing = true;
      return { update(dt) {
        t += dt;
        if (t < 0.18) f.vel.set(0, 0, 0);
        else if (t < 0.58) {
          f.spin = true; f.vel.copy(dir).multiplyScalar(15 * match.S); f.invuln = 0;
          if (Math.random() < 0.5) sparks(f.pos, 0xffa040);
          if (!hit && flatDist(f, o) < f.radius + o.radius + 0.4 * match.S) { hit = true; applyHit(f, o, f.dmg * 1.6, { kb: 5, stun: 0.5 }); }
        } else { f.spin = false; f.vel.multiplyScalar(0.5); f.lockFacing = false; return t >= 0.75; }
        return false;
      }, t: () => t };
    },
    brothbubble(f) {
      let t = 0;
      f.bubble = 3.5; ring(f.pos, 0x9fe0ff, 2.5 * match.S, 0.5); sfx('pop');
      return { update(dt) { t += dt; f.vel.set(0, 0, 0); return t >= 0.3; }, t: () => t };
    },
    bunslam(f, o) {
      let t = 0, landed = false;
      return { update(dt) {
        t += dt;
        if (t < 0.15) f.vel.set(0, 0, 0);
        else if (t < 0.7) { const k = (t - 0.15) / 0.55; f.hopY = Math.sin(Math.PI * k) * 3 * match.S; f.vel.copy(dirTo(f, o)).multiplyScalar(Math.min(5, flatDist(f, o)) * match.S * 0.9); }
        else if (!landed) {
          landed = true; f.hopY = 0; f.vel.set(0, 0, 0); sfx('thud'); match.shake = 0.2 * match.S;
          ring(f.pos, 0xfff1d6, 3 * match.S, 0.5); puffs(f.pos, 10, 0xfff1d6, 2 * match.S, 0.2);
          if (flatDist(f, o) < 2.8 * match.S + o.radius) applyHit(f, o, f.dmg * 1.4, { kb: 5, stun: 0.6, aoe: true });
        }
        return t >= 0.9;
      }, t: () => t };
    },
    pleatflurry(f, o) {
      let t = 0, n = 0;
      return { update(dt) {
        t += dt; f.vel.copy(facingVec(f)).multiplyScalar(2 * match.S);
        if (n < 3 && t >= 0.12 + n * 0.15) { n++; sfx('whoosh'); tryHit(f, o, f.dmg * 0.55, { kb: 1.4, stun: 0.25, range: 1.5 }); }
        return t >= 0.62;
      }, t: () => t };
    },
    ladlesplash(f, o) {
      let t = 0, fired = false;
      return { update(dt) {
        t += dt; f.vel.set(0, 0, 0);
        if (!fired && t >= 0.2) {
          fired = true; sfx('splash');
          const dir = facingVec(f);
          const m = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.25, 8, 20, Math.PI), new THREE.MeshToonMaterial({ color: 0xf2b46b, transparent: true, opacity: 0.85 }));
          m.scale.setScalar(match.S); scene.add(m);
          projs.push({ m, owner: f, target: o, pos: f.pos.clone().addScaledVector(dir, 1.3 * match.S), dir, dist: 0, hit: false });
        }
        return t >= 0.45;
      }, t: () => t };
    },
  };
  function ultimate(f, o, kind) {
    let t = 0, fired = false;
    const col = { grandsteamer: 0xffffff, goldenfry: 0xffb040, hotpot: 0xf2b46b }[kind];
    f.mesh.mats.forEach((m) => m.emissive && m.emissive.setHex(0x664400));
    return { update(dt) {
      t += dt; f.vel.set(0, 0, 0);
      if (t < 0.7) { f.hopY = Math.sin((t / 0.7) * Math.PI * 0.5) * 1.5 * match.S; if (kind === 'goldenfry') f.spin = true; if (Math.random() < 0.4) puffs(f.pos, 1, col, 1 * match.S); }
      else if (!fired) {
        fired = true; f.hopY = 0; f.spin = false; sfx('special'); sfx('cheer'); match.shake = 0.45 * match.S; cheer(1.5);
        ring(f.pos, col, 6.5 * match.S, 0.8); ring(f.pos, col, 4.5 * match.S, 0.6); puffs(f.pos, 30, col, 5 * match.S);
        flashScreen();
        if (flatDist(f, o) < 6 * match.S + o.radius) applyHit(f, o, f.dmg * 2.6, { kb: 8, stun: 1.0, blockCost: 40, aoe: true, noParry: true, heavy: true });
        f.mesh.mats.forEach((m) => m.emissive && m.emissive.setHex(0x000000));
      }
      return t >= 1.3;
    }, t: () => t };
  }
  function startMove(f, o, slot) {
    const id = f.moves[slot];
    if (slot === 'special') f.special -= 50;
    if (slot === 'ult') f.special = 0;
    if (slot === 'move2') f.cd2 = 7;
    f.blocking = false;
    setState(f, 'move');
    f.mv = slot === 'ult' ? ultimate(f, o, id) : MOVES[id](f, o);
    f.mvSlot = slot;
    floatText(f, DG.MOVES[id].name + '!', slot === 'ult' ? '#ffcc33' : '#ffe08a', slot === 'ult');
    if (slot === 'ult') { cutIn(f, DG.MOVES[id].name); speedLines(1.4); }
    if (slot === 'move2' || slot === 'special') speedLines(0.25);
    sfx('special');
  }

  /* ---------- Intents ---------- */
  const K = (c) => !!keys[c];
  const E = (c) => { if (edges[c]) { edges[c] = false; return true; } return false; };
  const TE = (b) => { if (touch.edge[b]) { touch.edge[b] = false; return true; } return false; };
  function playerIntents() {
    const x = (K('KeyD') || K('ArrowRight') ? 1 : 0) - (K('KeyA') || K('ArrowLeft') ? 1 : 0) + touch.x;
    const z = (K('KeyS') || K('ArrowDown') ? 1 : 0) - (K('KeyW') || K('ArrowUp') ? 1 : 0) + touch.y;
    return {
      move: { x, z }, block: K('KeyK') || !!touch.btn.block,
      attack: E('KeyJ') || TE('attack'), attackHeld: K('KeyJ') || !!touch.btn.attack, dodge: E('Space') || TE('dodge'), special: E('KeyL') || TE('special'),
      move2: E('KeyI') || TE('move2'), ult: E('KeyO') || TE('ult'),
    };
  }
  function aiIntents(f, o, dt) {
    const a = f.ai, S = match.S, it = { move: { x: 0, z: 0 } };
    const dist = flatDist(f, o), dir = dirTo(f, o), perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const reach = f.radius + o.radius + 1.0 * S;
    a.atkCd -= dt; a.blockT -= dt; a.sideT -= dt;
    if (a.sideT <= 0) { a.side *= -1; a.sideT = rand(1.5, 3); }
    let style = f.style;
    if (style === 'mixed') { a.mixT -= dt; if (a.mixT <= 0) { a.mixT = 6; a.cur = pick(['charger', 'blocker', 'dodger']); } style = a.cur; }
    const threat = (o.state === 'windup' || o.state === 'charge' || (o.state === 'move' && o.mv && o.mv.t() < 0.35)) && dist < reach + 2 * S;
    let dodgeDir = null;
    if (threat && !a.reacted && f.state === 'idle') {
      a.reacted = true;
      const r = Math.random(), sk = f.skill;
      if (style === 'blocker') { if (r < sk * 1.05) a.blockT = 0.65; else if (r < sk * 1.25) { it.dodge = true; dodgeDir = perp.clone().multiplyScalar(a.side); } }
      else if (style === 'dodger') { if (r < sk * 1.05) { it.dodge = true; dodgeDir = perp.clone().multiplyScalar(a.side); } }
      else if (r < sk * 0.55) { if (Math.random() < 0.5) a.blockT = 0.5; else { it.dodge = true; dodgeDir = dir.clone().multiplyScalar(-1); } }
    }
    if (!threat) a.reacted = false;
    if (a.blockT > 0 && f.sta > 15) it.block = true;
    const low = f.sta < f.maxSta * 0.22;
    const mv = new THREE.Vector3();
    if (low) { mv.copy(dir).multiplyScalar(-1).addScaledVector(perp, 0.6 * a.side); it.block = false; }
    else if (style === 'charger') {
      if (dist > reach * 0.85) mv.copy(dir);
      else if (a.atkCd <= 0) { it.attack = true; a.atkCd = rand(0.5, 1.2) * (1.3 - f.skill * 0.5); if (Math.random() < 0.06 + f.skill * 0.2) a.holdT = rand(0.8, 1.3); }
      else mv.copy(perp).multiplyScalar(a.side * 0.4);
    } else if (style === 'blocker') {
      if (dist > reach * 1.3) mv.copy(dir).multiplyScalar(0.7);
      else {
        if (a.counter && a.atkCd <= 0) { it.attack = true; a.counter = false; a.atkCd = 0.5; }
        else if (a.atkCd <= 0 && Math.random() < dt * (0.8 + f.skill)) { it.attack = true; a.atkCd = rand(1, 2); }
        else if (Math.random() < dt * 0.9) a.blockT = rand(0.4, 0.9);
        mv.copy(perp).multiplyScalar(a.side * 0.3);
      }
    } else {
      const want = reach * 1.9;
      if (a.dart > 0) {
        a.dart -= dt; mv.copy(dir);
        if (dist < reach * 0.9) { it.attack = true; a.dart = 0; a.postDodge = 0.55; a.atkCd = rand(0.8, 1.6); }
      } else {
        mv.copy(perp).multiplyScalar(a.side);
        if (dist > want * 1.2) mv.add(dir); if (dist < want * 0.8) mv.sub(dir);
        if (a.atkCd <= 0) a.dart = 1.2;
      }
      if (a.postDodge > 0) { a.postDodge -= dt; if (a.postDodge <= 0.2 && f.state === 'idle' && Math.random() < f.skill) { it.dodge = true; dodgeDir = dir.clone().multiplyScalar(-1); a.postDodge = 0; } }
    }
    // special moves
    if (f.canUlt && f.special >= 100 && dist < 5 * S) it.ult = true;
    else if (f.canSpecial && f.special >= 50 && Math.random() < dt * 0.8) {
      const sp = f.moves.special;
      if ((sp === 'steampuff' && dist < 3 * S) || (sp === 'crispydash' && dist < 7 * S && dist > 2 * S) || (sp === 'brothbubble' && f.hp < f.maxHp * 0.65)) it.special = true;
    }
    if (f.canMove2 && f.cd2 <= 0 && dist < reach * 1.6 && Math.random() < dt * 0.5) it.move2 = true;
    // chain combos after a landed hit, and hold the button for a charged smash
    if (f.state === 'recover') { if (!a.comboDecided) { a.comboDecided = true; if (f.lastResult === 'hit' && f.combo < 2 && Math.random() < f.skill * 0.5) it.attack = true; } }
    else a.comboDecided = false;
    a.holdT -= dt; it.attackHeld = a.holdT > 0;
    const m = dodgeDir || mv;
    it.move = { x: m.x, z: m.z };
    return it;
  }

  /* ---------- Fighter step ---------- */
  function swing(f, spd) {
    setState(f, 'attack'); f.hitDone = false;
    f.vel.copy(facingVec(f)).multiplyScalar(spd * (f.heavy > 0 ? 3 : 2.2));
    sfx(f.heavy > 0 ? 'special' : 'whoosh');
  }
  function stepFighter(f, o, it, dt) {
    const S = match.S;
    f.stT += dt; f.invuln = Math.max(0, f.invuln - dt); f.cd2 = Math.max(0, f.cd2 - dt); f.flash = Math.max(0, f.flash - dt); f.msgT -= dt;
    f.buf = Math.max(0, f.buf - dt); f.parryT = Math.max(0, f.parryT - dt); f.guardCd = Math.max(0, f.guardCd - dt);
    if (f.chainT > 0) { f.chainT -= dt; if (f.chainT <= 0) f.chain = 0; }
    if (f.bubble > 0) { f.bubble = Math.max(0, f.bubble - dt); f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.035 * dt); }
    if (f.state === 'ko') { f.vel.set(0, 0, 0); f.kb.multiplyScalar(Math.max(0, 1 - dt * 5)); f.pos.addScaledVector(f.kb, dt); return; }
    if (match.over) { f.vel.set(0, 0, 0); f.blocking = false; return; }
    const free = f.state === 'idle';
    if (free && !f.blocking) f.sta = Math.min(f.maxSta, f.sta + f.staRegen * dt);
    else if (f.state === 'recover' || f.state === 'stun') f.sta = Math.min(f.maxSta, f.sta + f.staRegen * 0.5 * dt);
    if (f.canSpecial) f.special = Math.min(100, f.special + f.charge * dt);
    const wasBlocking = f.blocking;
    f.blocking = free && it.block && f.sta > 0;
    // raising your guard just before a hit lands turns the block into a parry
    if (f.blocking && !wasBlocking && f.guardCd <= 0) { f.parryT = 0.2; f.guardCd = 0.55; }
    if (f.blocking) { f.sta -= 14 * dt; if (f.sta <= 0) guardBreak(f); }
    const mvec = new THREE.Vector3(it.move.x, 0, it.move.z);
    if (mvec.lengthSq() > 1) mvec.normalize();
    if (it.attack && !free) { if (f.buf > 0) f.bufQ = true; f.buf = 0.45; } // remember early presses so combos feel responsive
    if (f.state === 'idle' && !f.blocking) {
      if (it.dodge) {
        if (f.sta >= f.dodgeCost) {
          f.sta -= f.dodgeCost; setState(f, 'dodge'); f.invuln = 0.3; f.perfectUsed = false; sfx('whoosh');
          const dd = mvec.lengthSq() > 0.01 ? mvec.clone().normalize() : facingVec(f).multiplyScalar(-1);
          f.vel.copy(dd).multiplyScalar(f.speed * S * 3.2);
          puffs(f.pos, 4, 0xfff1d6, 1.2 * S, 0.15);
        } else if (f.isPlayer && f.msgT <= 0) { floatText(f, 'Need stamina!', '#ffc75a'); f.msgT = 0.6; }
      } else if (it.ult && f.canUlt && f.special >= 100) startMove(f, o, 'ult');
      else if (it.special && f.canSpecial && f.special >= 50) startMove(f, o, 'special');
      else if (it.move2 && f.canMove2 && f.cd2 <= 0) startMove(f, o, 'move2');
      else if (it.attack || f.buf > 0) {
        f.buf = 0;
        if (f.sta >= 6) { f.sta -= 6; f.combo = 0; f.heavy = 0; setState(f, 'windup'); f.hitDone = false; }
        else if (f.isPlayer && f.msgT <= 0) { floatText(f, 'Too tired!', '#ffc75a'); f.msgT = 0.6; }
      } else if (f.isPlayer && f.msgT <= 0 && ((it.special && f.canSpecial) || (it.ult && f.canUlt) || (it.move2 && f.canMove2))) {
        floatText(f, it.move2 ? 'Cooling down…' : 'Still charging…', '#ffe08a'); f.msgT = 0.6;
      } else if (f.isPlayer && f.msgT <= 0 && (it.special || it.ult || it.move2)) {
        floatText(f, 'Not unlocked yet', '#ffe08a'); f.msgT = 0.6;
      }
    }
    const spd = f.speed * S;
    switch (f.state) {
      case 'idle': f.vel.copy(mvec).multiplyScalar(spd * (f.blocking ? 0.4 : 1)); break;
      case 'windup': {
        f.vel.copy(mvec).multiplyScalar(spd * 0.2);
        const wu = f.combo > 0 ? 0.1 : f.windup;
        if (f.stT >= wu) {
          if (f.combo === 0 && it.attackHeld) { setState(f, 'charge'); sfx('charge'); }
          else swing(f, spd);
        }
        break;
      }
      case 'charge':
        f.vel.copy(mvec).multiplyScalar(spd * 0.25);
        if (Math.random() < dt * 14) sparks(f.pos, f.stT > 0.85 ? 0xffffff : 0xffb040);
        if (!it.attackHeld || f.stT >= 1.1) { f.heavy = Math.max(0.15, Math.min(1, f.stT / 0.9)); if (f.isPlayer) match.stats.smashes++; swing(f, spd); }
        break;
      case 'attack':
        if (!f.hitDone) {
          f.hitDone = true;
          const fin = f.combo === 2, h = f.heavy;
          const mult = h > 0 ? 1.5 + h : fin ? 1.6 : 1 + f.combo * 0.1;
          slashFx(f, fin || h > 0.5);
          f.lastResult = tryHit(f, o, f.dmg * mult, {
            kb: h > 0 ? 4 + 4 * h : fin ? 6 : 2.5, stun: h > 0 ? 0.5 + 0.35 * h : fin ? 0.55 : 0.32, range: h > 0 ? 1.3 : 1.0,
            blockCost: h > 0 ? 25 + 30 * h : fin ? 26 : 16, heavy: h > 0.5 || fin, crush: h >= 0.95,
          });
          if (fin || h > 0.5) puffs(f.pos, 5, 0xffffff, 1.4 * S, 0.3);
        }
        if (f.stT >= 0.15) setState(f, 'recover');
        break;
      case 'recover':
        f.vel.multiplyScalar(Math.max(0, 1 - dt * 10));
        if (f.buf > 0 && f.combo < 2 && f.heavy === 0 && f.sta >= 5 && f.stT > 0.04) { f.buf = f.bufQ ? 0.45 : 0; f.bufQ = false; f.sta -= 5; f.combo++; f.hitDone = false; setState(f, 'windup'); }
        else if (f.stT >= (f.heavy > 0 || f.combo === 2 ? 0.45 : 0.3)) { f.combo = 0; f.heavy = 0; setState(f, 'idle'); }
        break;
      case 'dodge': if (f.stT >= 0.32) { setState(f, 'idle'); f.vel.set(0, 0, 0); } break;
      case 'stun': f.combo = 0; f.heavy = 0; f.vel.multiplyScalar(Math.max(0, 1 - dt * 10)); if (f.stT >= f.stunDur) setState(f, 'idle'); break;
      case 'move': if (f.mv && f.mv.update(dt)) { f.mv = null; f.spin = false; f.lockFacing = false; f.hopY = 0; setState(f, 'idle'); } break;
    }
    f.pos.addScaledVector(f.vel, dt);
    f.pos.addScaledVector(f.kb, dt);
    f.kb.multiplyScalar(Math.max(0, 1 - dt * 6));
    const lim = match.R - f.radius, d = Math.hypot(f.pos.x, f.pos.z);
    if (d > lim) { f.pos.x *= lim / d; f.pos.z *= lim / d; }
    if (!f.lockFacing) {
      const want = Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z);
      let diff = ((want - f.facing + Math.PI) % TAU + TAU) % TAU - Math.PI;
      f.facing += diff * Math.min(1, dt * (f.state === 'windup' || f.state === 'charge' ? 4 : 12));
    }
  }

  function animFighter(f, dt) {
    const m = f.mesh, S = match.S;
    m.g.position.set(f.pos.x, f.hopY, f.pos.z);
    m.g.rotation.y = f.facing;
    const moving = f.vel.lengthSq() > 0.5;
    let rx = 0, rz = 0, sy = 1, by = 0;
    if (f.state === 'ko') {
      const k = Math.min(1, f.stT / 0.5);
      const back = f.stT > 1.6 ? Math.min(1, (f.stT - 1.6) / 0.4) : 0;
      rx = -1.35 * (1 - (1 - k) ** 2) * (1 - back);
      by = back > 0 && back < 1 ? Math.sin(back * Math.PI) * 0.8 : 0;
      m.dizzy.visible = f.stT < 1.6; m.dizzy.material.rotation = T * 3;
      m.face.set(f.stT < 1.6 ? 'ko' : 'sad');
    } else {
      m.dizzy.visible = f.state === 'stun' && f.stunDur > 0.6;
      f.blinkT -= dt;
      m.face.set(f.state === 'stun' ? 'hurt' : 'idle');
      if (f.blinkT < -0.12) f.blinkT = rand(2, 4.5);
      if (moving && f.state === 'idle') by = Math.abs(Math.sin(T * 12)) * 0.25;
      else sy = 1 + Math.sin(T * 5 + (f.isPlayer ? 0 : 1)) * 0.03;
      if (f.state === 'windup') { rx = -0.35; sy = 0.88; }
      if (f.state === 'attack') { rx = 0.45; sy = 1.1; }
      if (f.state === 'charge') { rx = -0.5; sy = 0.82; rz = Math.sin(T * 50) * 0.05; }
      if (f.state === 'dodge') { sy = 0.8; rz = Math.sin(f.stT * 30) * 0.3; }
      if (f.state === 'stun') rz = Math.sin(T * 30) * 0.15;
      if (f.blocking) sy = 0.9;
      if (match.over && match.winner === f) by = Math.abs(Math.sin(T * 7)) * 0.9;
    }
    m.body.rotation.x = rx; m.body.rotation.z = rz;
    if (f.spin) m.body.rotation.y += dt * 30; else m.body.rotation.y *= 0.8;
    m.body.scale.set(1 + (1 - sy) * 0.5, sy, 1 + (1 - sy) * 0.5);
    m.body.position.y = by;
    if (m.arms) { // bao's little arms: raised to attack or cheer, tucked when blocking, droopy when knocked out
      const atk = f.state === 'windup' || f.state === 'attack' || f.state === 'charge' || f.state === 'move';
      const win = match.over && match.winner === f;
      m.arms.forEach((pv) => {
        const s = pv.userData.side;
        let rz = Math.sin(T * 4 + s) * 0.12, ry = 0;
        if (win) rz = 0.9 + Math.sin(T * 14 + s) * 0.35;
        else if (f.state === 'ko' || f.state === 'stun') rz = -0.6;
        else if (f.blocking) { rz = 0.3; ry = -s * 1.1; }
        else if (f.state === 'charge') rz = 0.5 + Math.sin(T * 40) * 0.1;
        else if (atk) { rz = 0.7; ry = -s * 0.5; }
        else if (moving) rz = Math.sin(T * 14 + s * 1.5) * 0.4;
        pv.rotation.z += (s * rz - pv.rotation.z) * Math.min(1, dt * 14);
        pv.rotation.y += (ry - pv.rotation.y) * Math.min(1, dt * 14);
      });
    }
    if (f.state === 'dodge' || f.spin) { f.ghostT -= dt; if (f.ghostT <= 0) { f.ghostT = 0.045; ghost(f); } }
    m.charge.visible = f.state === 'charge';
    if (m.charge.visible) { const k = Math.min(1, f.stT / 0.9); m.charge.scale.setScalar(1 + k * 0.9 + Math.sin(T * 30) * 0.05); m.charge.material.color.setHex(k >= 1 ? 0xffffff : 0xffb030); m.charge.material.opacity = 0.5 + 0.4 * k; }
    m.tele.visible = f.state === 'windup' || f.state === 'charge' || (f.state === 'move' && f.mv && f.mv.t() < 0.3);
    if (m.tele.visible) { const k = f.state === 'windup' ? f.stT / f.windup : 0.5; m.tele.material.opacity = 0.4 + 0.5 * k; m.tele.scale.setScalar(1.3 - 0.3 * k); }
    m.bang.visible = !f.isPlayer && m.tele.visible;
    m.shield.visible = f.blocking;
    m.bubble.visible = f.bubble > 0;
    if (f.bubble > 0) m.bubble.material.opacity = 0.2 + 0.1 * Math.sin(T * 8) + (f.bubble < 1 ? 0.1 * Math.sin(T * 30) : 0);
    m.mats.forEach((mt) => { if (mt.emissive && f.state !== 'move') mt.emissive.setHex(f.flash > 0 ? 0xaa3333 : f.state === 'charge' ? (Math.sin(T * 30) > 0 ? 0x664400 : 0x2a1500) : f.invuln > 0 ? 0x224444 : f.crit ? 0x2a2000 : 0x000000); });
  }

  /* ===================== Match flow ===================== */
  function startMatch(opts) {
    if (!window.THREE) { DG.ui.toast('3D library not loaded — check your internet connection and reload.'); return; }
    if (root._stop) root._stop();
    DG.audio.setTrack('battle');
    const practice = opts.net ? null : opts.practice || null;
    const pDef = opts.net ? Object.assign({}, opts.net.hostDef, { isMe: net.me === 0 }) : playerDef(!!practice);
    const opp = practice || opts.net ? null : DG.OPPONENTS[opts.opp];
    const oDef = opts.net ? Object.assign({}, opts.net.guestDef, { isMe: net.me === 1 }) : oppDef(opp, pDef, practice);
    const myDef = opts.net && net.me === 1 ? oDef : pDef;
    const si = opts.net ? Math.max(pDef.stageIdx, oDef.stageIdx) : pDef.stageIdx;
    const S = STAGE_SCALE[si] || 1.2, R = ARENA_R[si] || 10.5;
    match = { net: !!opts.net, stats: { maxCombo: 0, perfect: 0, parries: 0, smashes: 0 }, hitstop: 0, slow: 0, speedT: 0, practice, opp, S, R, si, time: MATCH_TIME, phase: 'intro', phaseT: 0, over: false, endT: 0, shake: 0, cheer: 0.6, paused: false, winner: null };
    root.innerHTML = `
      <div class="arena-stage" id="a-stage">
        <div class="a-hud">
          <div class="a-side" id="a-p1"></div>
          <div class="a-timer" id="a-timer">90</div>
          <div class="a-side right" id="a-p2"></div>
        </div>
        <div class="a-sub">${opts.net ? '👥 Friend battle — just for fun' : practice ? '🥋 Practice match — no rewards' : DG.pet().foodBonus ? `${DG.FOODS[DG.pet().foodBonus.food].icon} Snack bonus: ${DG.pet().foodBonus.label}` : ''}</div>
        <div class="a-moves" id="a-moves"></div>
        <div class="a-speed"></div>
        <div class="a-flash"></div>
        <div class="a-cutin"></div>
        <div class="a-combo"></div>
        <div class="a-banner"></div>
        <div class="a-floats"></div>
        <button class="a-pause" id="a-pause" aria-label="Pause">⏸</button>
        <div class="a-touch" id="a-touch" ${DG.ui.isTouch() ? '' : 'hidden'}>
          <div class="joy-zone" id="a-joyzone">
            <div class="joy idle" id="a-joy"><div class="joy-knob"></div></div>
            <span class="joy-hint">Drag anywhere here to move</span>
          </div>
          <div class="a-pad">
            <button data-t="attack" class="t-att" aria-label="Attack">👊<small>Attack</small></button>
            <button data-t="block" class="t-blk" aria-label="Block (hold)">🛡️<small>Block</small></button>
            <button data-t="dodge" class="t-dge" aria-label="Dodge">💨<small>Dodge</small></button>
            <button data-t="special" class="t-sp ${myDef.canSpecial ? '' : 'off'}" aria-label="Special">✨<small>${myDef.canSpecial ? 'Special' : '🔒'}</small></button>
            ${myDef.canMove2 ? '<button data-t="move2" class="t-m2" aria-label="Move 2">🌀<small>Move 2</small></button>' : ''}
            ${myDef.canUlt ? '<button data-t="ult" class="t-ult" aria-label="Ultimate">🌟<small>Ultimate</small></button>' : ''}
          </div>
        </div>
        <div class="a-rotate" id="a-rotate" hidden>🔄 Turn your phone sideways for a bigger arena <button aria-label="Dismiss">✕</button></div>
      </div>`;
    stageEl = root.querySelector('#a-stage');
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
    }
    stageEl.prepend(renderer.domElement);
    resize();
    buildScene(DG.state.equipped.arena, R);
    F = [makeFighter(pDef, S), makeFighter(oDef, S)];
    F[0].pos.set(0, 0, R * 0.45); F[1].pos.set(0, 0, -R * 0.45);
    F[0].facing = Math.PI; F[1].facing = 0;
    F[0].hopY = (si === GIANT ? 30 : 12) * S; F[1].hopY = 0;
    camera.position.set(0, R * 1.2, R * 2.2 * camSide()); camera.lookAt(0, 0, 0);
    if (si === GIANT) camera.position.set(0, R * 2, R * 3.2 * camSide());
    renderHud(true);
    wireControls();
    banner(si === GIANT ? `🌟 GIANT ${DG.ui.esc(pDef.name)} ENTERS! 🌟` : `${DG.ui.esc(pDef.name)} <span class="vs">VS</span> ${DG.ui.esc(oDef.name)}`, si === GIANT ? 2.6 : 1.8);
    match.introLen = si === GIANT ? 3.2 : 2.0;
    last = performance.now(); T = 0;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function wireControls() {
    stageEl.querySelector('#a-pause').onclick = () => pause(true);
    // floating joystick: touch anywhere in the left zone and it appears under your thumb
    const zone = stageEl.querySelector('#a-joyzone'), joy = stageEl.querySelector('#a-joy');
    if (zone && joy) {
      const knob = joy.querySelector('.joy-knob');
      const RAD = 52;
      let id = null, cx = 0, cy = 0;
      const place = (x, y) => { const r = zone.getBoundingClientRect(); joy.style.left = (x - r.left) + 'px'; joy.style.top = (y - r.top) + 'px'; };
      const set = (e) => {
        let dx = (e.clientX - cx) / RAD, dy = (e.clientY - cy) / RAD;
        const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
        if (l < 0.12) { dx = 0; dy = 0; }
        touch.x = dx; touch.y = dy; knob.style.transform = `translate(${dx * RAD * 0.75}px, ${dy * RAD * 0.75}px)`;
      };
      zone.addEventListener('pointerdown', (e) => {
        if (id !== null) return;
        e.preventDefault(); DG.audio.unlock();
        id = e.pointerId; try { zone.setPointerCapture(id); } catch (err) {} cx = e.clientX; cy = e.clientY;
        place(cx, cy); joy.classList.remove('idle'); zone.classList.add('used'); set(e);
      });
      zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
      const up = (e) => { if (e.pointerId !== id) return; id = null; touch.x = touch.y = 0; knob.style.transform = ''; joy.classList.add('idle'); joy.style.left = ''; joy.style.top = ''; };
      zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
    }
    stageEl.querySelectorAll('[data-t]').forEach((b) => {
      const k = b.dataset.t;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); touch.btn[k] = true; touch.edge[k] = true; b.classList.add('down'); DG.audio.unlock(); if (navigator.vibrate) navigator.vibrate(8); });
      const up = () => { touch.btn[k] = false; b.classList.remove('down'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    const rot = stageEl.querySelector('#a-rotate');
    if (rot) rot.querySelector('button').onclick = () => { rot.hidden = true; rotDismissed = true; };
    stageEl.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    stageEl.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  let rotDismissed = false;

  function renderHud(full) {
    if (!stageEl) return;
    const side = (f, el) => {
      if (full || !el.firstChild) {
        el.innerHTML = `<div class="a-name">${DG.ui.esc(f.name)} <small>${match.net ? (f === meF() ? 'You' : 'Friend') : f.isPlayer ? DG.STAGES[f.stageIdx].name : DG.STYLES[f.style].name}</small></div>
          <div class="a-bar hp"><i></i><em></em></div><div class="a-bar sta"><i></i></div>${f.canSpecial ? '<div class="a-bar sp"><i></i><b></b></div>' : ''}`;
      }
      const hpPct = (f.hp / f.maxHp) * 100;
      el.querySelector('.hp i').style.width = hpPct + '%';
      el.querySelector('.hp em').textContent = `${Math.ceil(f.hp)} / ${f.maxHp}`;
      el.querySelector('.sta i').style.width = (f.sta / f.maxSta) * 100 + '%';
      el.querySelector('.sta').classList.toggle('low', f.sta < f.dodgeCost);
      const sp = el.querySelector('.sp');
      if (sp) { sp.querySelector('i').style.width = f.special + '%'; sp.classList.toggle('ready', f.special >= 50); sp.querySelector('b').textContent = f.special >= 100 && f.canUlt ? 'ULTIMATE!' : f.special >= 50 ? 'SPECIAL READY' : ''; }
    };
    const me = meF(), them = F[0] === me ? F[1] : F[0];
    side(me, stageEl.querySelector('#a-p1'));
    side(them, stageEl.querySelector('#a-p2'));
    stageEl.querySelector('#a-timer').textContent = Math.ceil(match.time);
    const p = me;
    const chip = (key, label, ok, extra) => `<span class="mchip ${ok ? 'ok' : ''}"><kbd>${key}</kbd>${label}${extra || ''}</span>`;
    stageEl.querySelector('#a-moves').innerHTML =
      chip('J', 'Attack ×3', true) + chip('Hold J', 'Smash', p.sta >= 6) + chip('K', 'Block / Parry', p.sta > 0) + chip('Space', 'Dodge', p.sta >= p.dodgeCost) +
      (p.canSpecial ? chip('L', DG.MOVES[p.moves.special].name, p.special >= 50) : '<span class="mchip off">🔒 Special at Medium</span>') +
      (p.canMove2 ? chip('I', DG.MOVES[p.moves.move2].name, p.cd2 <= 0, p.cd2 > 0 ? ` ${Math.ceil(p.cd2)}s` : '') : '') +
      (p.canUlt ? chip('O', DG.MOVES[p.moves.ult].name, p.special >= 100) : '');
    stageEl.querySelectorAll('.t-sp').forEach((b) => b.classList.toggle('ready', p.special >= 50));
    stageEl.querySelectorAll('.t-ult').forEach((b) => b.classList.toggle('ready', p.special >= 100));
  }

  function pause(on) {
    if (!match || match.over) return;
    if (match.net) { if (on && !DG.ui.anyModal()) netLeavePrompt(); return; }
    if (on && match.paused) return;
    match.paused = on;
    if (!on) return;
    DG.ui.modal({
      title: '⏸ Paused', dismissable: false,
      html: `<p>Take a breather!</p>${match.practice ? '' : '<p class="fine">Leaving counts as a loss (you still get a few coins, and your snack bonus is used).</p>'}`,
      buttons: [{ label: '▶ Resume', cls: 'primary', onClick: () => { match.paused = false; last = performance.now(); } },
        { label: 'Leave match', cls: 'ghost', onClick: () => { match.paused = false; endMatch('lose', 'forfeit'); } }],
    });
  }

  function endMatch(result, how) {
    if (match.over) return;
    match.over = true; match.result = result; match.how = how; match.endT = 0;
    match.winner = result === 'win' ? F[0] : result === 'lose' ? F[1] : null;
    const loser = result === 'win' ? F[1] : result === 'lose' ? F[0] : null;
    if (loser && loser.state !== 'ko') { setState(loser, 'ko'); loser.mv = null; loser.hopY = 0; }
    F.forEach((f) => { f.blocking = false; f.bubble = 0; f.spin = false; f.hopY = 0; f.mv = null; if (f !== loser) setState(f, 'idle'); });
    const txt = how === 'forfeit' ? 'Match over' : how === 'time' ? "Time's up!" : 'Flop!';
    banner(result === 'win' ? `${txt} — <b>${DG.ui.esc(F[0].name)} wins!</b> 🏆` : result === 'lose' ? `${txt} — ${DG.ui.esc(F[1].name)} wins!` : `${txt} — It's a draw!`, 2.4);
    endSounds(result);
    if (how === 'forfeit') showResults();
  }

  /** Win/lose sounds from this device's point of view (the guest flips the host's result). */
  function endSounds(result) {
    const mine = match.net && net && net.me === 1 ? ({ win: 'lose', lose: 'win' }[result] || result) : result;
    if (mine === 'win') { DG.audio.play('cheer'); setTimeout(() => DG.audio.play('fanfare'), 300); confetti3d(); }
    else if (mine === 'lose') DG.audio.play('sad');
    else DG.audio.play('good');
  }
  function showResults() {
    if (match.resultsShown) return;
    match.resultsShown = true;
    if (match.net) return netResults();
    const p = DG.pet(), st = DG.state, c = st.counters, result = match.result;
    let coins = 0, lines = [];
    if (match.practice) {
      c.practice++; DG.unlock('practice');
      lines.push('Practice matches give no coins and don\'t use your snack bonus.');
    } else {
      const tier = match.opp.tier, si = match.si;
      coins = result === 'win' ? 12 + tier * 4 + si * 3 : result === 'draw' ? 8 + si : 5 + si;
      DG.addCoins(coins);
      c.battles++;
      if (result === 'win') { c.wins++; st.beaten[match.opp.id] = true; DG.addNeeds({ happiness: 8 }); }
      else if (result === 'lose') { c.losses++; DG.addNeeds({ happiness: 2 }); lines.push(`${DG.ui.esc(p.name)} bounced right back — it had fun anyway!`); }
      else { c.draws++; DG.addNeeds({ happiness: 5 }); }
      DG.addNeeds({ energy: -3 });
      if (p.foodBonus) { lines.push(`${DG.FOODS[p.foodBonus.food].icon} Your ${DG.FOODS[p.foodBonus.food].name} bonus was used up.`); p.foodBonus = null; }
      const idx = DG.OPPONENTS.indexOf(match.opp), next = DG.OPPONENTS[idx + 1];
      if (result === 'win' && next) lines.push(next.minStage <= DG.stageIndex() ? `🔓 New challenger unlocked: <b>${next.name}</b>!` : `Next challenger <b>${next.name}</b> appears at the ${DG.STAGES[next.minStage].name} stage.`);
    }
    DG.save();
    if (!match.practice && result === 'win') DG.unlock('firstWin');
    if (DG.OPPONENTS.every((o) => st.beaten[o.id])) DG.unlock('champion');
    const [a, b] = F;
    const titles = { win: '🏆 Victory!', lose: '💫 Nice try!', draw: '🤝 It\'s a draw!' };
    DG.ui.modal({
      title: (match.practice ? 'Practice: ' : '') + titles[result], dismissable: false,
      html: `<p>${DG.ui.esc(a.name)} ${Math.round((a.hp / a.maxHp) * 100)}% health · ${DG.ui.esc(b.name)} ${Math.round((b.hp / b.maxHp) * 100)}% health${match.how === 'time' ? ' (time ran out — higher health % wins)' : ''}</p>
        ${coins ? `<p class="gain">+${coins} 🪙 Dumpling Coins</p>` : ''}
        ${lines.map((l) => `<p>${l}</p>`).join('')}
        <p class="fine">Best combo <b>${match.stats.maxCombo}</b> · Perfect dodges <b>${match.stats.perfect}</b> · Parries <b>${match.stats.parries}</b> · Smashes <b>${match.stats.smashes}</b></p>
        <p class="fine">Battle health is separate from home needs — everyone is fully healed now.</p>`,
      buttons: [{ label: '🏠 Return home', cls: 'primary', onClick: () => DG.ui.show('home') }, { label: 'Arena lobby', cls: 'ghost', onClick: () => lobby() }],
    });
  }


  /* ===================== Friend battles (same Wi‑Fi) =====================
     One device hosts and shows a 4-letter code; the other joins with it. PeerJS's public server only
     introduces the two devices; with no STUN/TURN servers the connection itself can only be made
     directly across the local network. The host runs the battle and sends snapshots ~30 times a
     second plus the effects to replay; the guest sends its button presses back. */
  const NET_PREFIX = 'mypetdumpling-v1-';
  let net = null;
  const meF = () => (match && match.net && net ? F[net.me] : F[0]);
  const camSide = () => (match && match.net && net && net.me === 1 ? -1 : 1);
  function netFx(name, args) {
    if (!net || net.role !== 'host' || !match || !match.net || net.replaying) return;
    net.out.push([name, args.map(packArg)]);
  }
  function netSendFx(name, args) { if (net && net.role === 'host') net.out.push([name, args.map(packArg)]); }
  function packArg(a) {
    if (a && a.mesh && F.includes(a)) return { F: F.indexOf(a) };
    if (a && typeof a === 'object' && 'x' in a && 'z' in a) return { V: [a.x, a.y || 0, a.z] };
    return a === undefined ? null : a;
  }
  function unpackArg(a) {
    if (a && typeof a === 'object' && 'F' in a) return F[a.F];
    if (a && typeof a === 'object' && 'V' in a) return new THREE.Vector3(a.V[0], a.V[1], a.V[2]);
    return a === null ? undefined : a;
  }
  const FX = { sfx: (n) => DG.audio.play(n), floatText, banner, burst3d, slashFx, speedLines, cutIn, ring, puffs, sparks, flashScreen, comboText };
  function netDef() { const d = playerDef(true); d.bonus = null; d.cozy = false; d.isPlayer = true; return d; }
  function newCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; return c; }
  function needPeer() {
    if (window.Peer) return true;
    DG.ui.toast('Friend battles need an internet connection to load. Please reload the page and try again.'); return false;
  }
  const PEER_OPTS = { debug: 0, config: { iceServers: [] } }; // local network only
  function netClose() {
    if (!net) return;
    try { if (net.conn) net.conn.close(); } catch (e) { /* ignore */ }
    try { if (net.peer) net.peer.destroy(); } catch (e) { /* ignore */ }
    clearTimeout(net.timer); net = null;
  }
  function netSend(msg) { try { if (net && net.conn && net.conn.open) net.conn.send(msg); } catch (e) { /* ignore */ } }
  function waitingModal(title, html, onCancel) {
    let closeFn = null;
    closeFn = DG.ui.modal({ title, html, dismissable: false, buttons: [{ label: 'Cancel', cls: 'ghost', onClick: onCancel }] });
    return closeFn;
  }
  function setNetStatus(t) { const el = document.getElementById('net-status'); if (el) el.innerHTML = t; }

  function hostGame() {
    if (!needPeer()) return;
    netClose();
    const code = newCode();
    net = { role: 'host', me: 0, code, out: [], acc: 0, remote: { move: { x: 0, z: 0 } }, edges: {} };
    net.close = waitingModal('📡 Host a battle', `<p>Ask your friend to tap <b>Join with a code</b> and type:</p>
      <div class="net-code">${code}</div><p class="fine" id="net-status">Getting ready…</p>
      <p class="fine">Both devices need to be on the same Wi‑Fi.</p>`, () => netClose());
    const peer = new window.Peer(NET_PREFIX + code, PEER_OPTS);
    net.peer = peer;
    peer.on('open', () => setNetStatus('Waiting for your friend to join…'));
    peer.on('error', (e) => {
      if (!net) return;
      if (e.type === 'unavailable-id') { net.close && net.close(); netClose(); hostGame(); return; }
      setNetStatus(e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? '⚠️ Can\'t reach the matchmaking server. Check your internet and try again.' : '⚠️ Something went wrong (' + e.type + ').');
    });
    peer.on('connection', (conn) => {
      if (!net || net.conn) { conn.close(); return; }
      net.conn = conn; wireConn(conn);
      conn.on('open', () => setNetStatus('Friend found! Starting…'));
    });
  }
  function joinGame() {
    if (!needPeer()) return;
    netClose();
    DG.ui.modal({
      title: '🔑 Join a battle',
      html: `<p>Type the code shown on your friend's screen:</p>
        <input id="net-in" class="text-in net-in" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="ABCD">
        <p class="fine">Both devices need to be on the same Wi‑Fi.</p>`,
      buttons: [{ label: 'Cancel', cls: 'ghost' }, { label: 'Join', cls: 'primary', onClick() { connectTo(document.getElementById('net-in').value); } }],
      onOpen(el, close) {
        const inp = el.querySelector('#net-in'); setTimeout(() => inp.focus(), 50);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = inp.value; close(); setTimeout(() => connectTo(v), 150); } });
      },
    });
  }
  function connectTo(raw) {
    const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { DG.ui.toast('The code has 4 letters or numbers.'); return; }
    net = { role: 'guest', me: 1, code, out: [], acc: 0, pend: {}, snap: null };
    net.close = waitingModal('🔑 Joining…', `<div class="net-code">${code}</div><p class="fine" id="net-status">Looking for your friend's battle…</p>`, () => netClose());
    const peer = new window.Peer(undefined, PEER_OPTS);
    net.peer = peer;
    peer.on('open', () => {
      if (!net) return;
      const conn = peer.connect(NET_PREFIX + code, { reliable: true });
      net.conn = conn; wireConn(conn);
      conn.on('open', () => { setNetStatus('Connected! Waiting for the battle to start…'); netSend({ t: 'hello', def: netDef() }); });
      net.timer = setTimeout(() => { if (net && !(net.conn && net.conn.open)) setNetStatus('⚠️ Couldn\'t connect. Check the code, and that you\'re both on the <b>same Wi‑Fi</b>.'); }, 12000);
    });
    peer.on('error', (e) => {
      if (!net) return;
      setNetStatus(e.type === 'peer-unavailable' ? '⚠️ No battle found with that code. Check the letters and try again.'
        : e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? '⚠️ Can\'t reach the matchmaking server. Check your internet and try again.' : '⚠️ Something went wrong (' + e.type + ').');
    });
  }
  function wireConn(conn) {
    conn.on('data', onNet);
    conn.on('close', onNetClose);
    conn.on('error', () => {});
  }
  function onNetClose() {
    if (!net) return;
    const n = net; net = null;
    try { n.peer && n.peer.destroy(); } catch (e) { /* ignore */ }
    if (match && match.net && !match.over) {
      DG.ui.toast('👋 Your friend left the battle.');
      net = { role: n.role, me: n.me, out: [], dead: true };
      if (n.role === 'host') endMatch('win', 'forfeit');
      else { match.over = true; match.result = 'lose'; match.how = 'forfeit'; match.left = true; showResults(); }
      net = null;
    } else if (!match) { if (n.close) n.close(); setNetStatus(''); DG.ui.toast('👋 Connection closed.'); }
  }
  function startNetMatch(hostDef, guestDef) {
    document.querySelectorAll('.modal-wrap').forEach((m) => m.remove());
    net.close = null;
    startMatch({ net: { hostDef, guestDef } });
  }
  function onNet(msg) {
    if (!net || !msg) return;
    if (net.role === 'host') {
      if (msg.t === 'hello') {
        net.guestDef = msg.def; net.hostDef = netDef();
        netSend({ t: 'start', hostDef: net.hostDef, guestDef: net.guestDef });
        startNetMatch(net.hostDef, net.guestDef);
      } else if (msg.t === 'in') {
        net.remote = msg;
        ['attack', 'dodge', 'special', 'move2', 'ult'].forEach((k) => { if (msg[k]) net.edges[k] = true; });
      } else if (msg.t === 'leave') onNetClose();
    } else {
      if (msg.t === 'start') { net.snap = null; startNetMatch(msg.hostDef, msg.guestDef); }
      else if (msg.t === 's' && match && match.net) applySnapshot(msg);
      else if (msg.t === 'leave') onNetClose();
    }
  }
  function remoteIntents() {
    const r = net ? net.remote : null, e = net ? net.edges : {};
    if (!r) return { move: { x: 0, z: 0 } };
    const it = { move: r.move || { x: 0, z: 0 }, block: !!r.block, attackHeld: !!r.attackHeld,
      attack: !!e.attack, dodge: !!e.dodge, special: !!e.special, move2: !!e.move2, ult: !!e.ult };
    net.edges = {};
    return it;
  }
  const FIELDS = ['facing', 'hopY', 'state', 'stT', 'hp', 'sta', 'special', 'blocking', 'bubble', 'spin', 'flash', 'invuln', 'crit', 'stunDur', 'cd2', 'heavy'];
  function netTick(dt) {
    if (!net || !net.conn || !net.conn.open) return;
    net.acc += dt;
    if (net.acc < 1 / 30) return;
    net.acc = 0;
    if (net.role === 'host') {
      netSend({
        t: 's',
        m: { time: match.time, phase: match.phase, over: match.over, result: match.result || null, how: match.how || null, shake: match.shake, slow: match.slow > 0 },
        f: F.map((f) => { const o = { x: f.pos.x, z: f.pos.z, vx: f.vel.x, vz: f.vel.z, mvT: f.mv && f.mv.t ? f.mv.t() : -1 }; FIELDS.forEach((k) => (o[k] = f[k])); return o; }),
        p: projs.map((pr) => [pr.pos.x, pr.pos.z, pr.dir.x, pr.dir.z]),
        e: net.out,
      });
      net.out = [];
    } else {
      const it = playerIntents();
      const msg = { t: 'in', move: it.move, block: it.block, attackHeld: it.attackHeld };
      ['attack', 'dodge', 'special', 'move2', 'ult'].forEach((k) => { msg[k] = !!(it[k] || net.pend[k]); });
      net.pend = {};
      netSend(msg);
    }
  }
  function applySnapshot(s) {
    net.snap = s;
    // replay the host's effects
    net.replaying = true;
    (s.e || []).forEach(([name, args]) => { const fn = FX[name]; if (fn) try { fn.apply(null, args.map(unpackArg)); } catch (err) { /* ignore */ } });
    net.replaying = false;
    // projectiles: keep one simple mesh per projectile the host has
    while (projs.length < s.p.length) { const m = projMesh(); scene.add(m); projs.push({ m, pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), dist: 0 }); }
    while (projs.length > s.p.length) { const pr = projs.pop(); scene.remove(pr.m); }
    s.p.forEach(([x, z, dx, dz], i) => { const pr = projs[i]; pr.pos.set(x, 0, z); pr.dir.set(dx, 0, dz); pr.m.position.set(x, 0.2, z); pr.m.rotation.y = Math.atan2(dx, dz) + Math.PI / 2; });
    const m = s.m;
    match.time = m.time; match.shake = Math.max(match.shake, m.shake || 0);
    if (m.phase !== match.phase) { match.phase = m.phase; match.phaseT = 0; }
    if (m.over && !match.over) {
      match.over = true; match.result = m.result; match.how = m.how; match.endT = 0;
      match.winner = m.result === 'win' ? F[0] : m.result === 'lose' ? F[1] : null;
      endSounds(m.result);
      if (m.how === 'forfeit') showResults();
    }
  }
  function guestStep(dt) {
    // keep any one-shot presses until the next send
    ['attack', 'dodge', 'special', 'move2', 'ult'].forEach((k) => { if (edges[{ attack: 'KeyJ', dodge: 'Space', special: 'KeyL', move2: 'KeyI', ult: 'KeyO' }[k]] || touch.edge[k]) net.pend[k] = true; });
    const s = net.snap; if (!s) return;
    s.f.forEach((o, i) => {
      const f = F[i]; if (!f) return;
      const k = Math.min(1, dt * 18);
      f.pos.x += (o.x - f.pos.x) * k; f.pos.z += (o.z - f.pos.z) * k;
      f.vel.set(o.vx, 0, o.vz);
      FIELDS.forEach((key) => { if (key === 'facing') { let d = o.facing - f.facing; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; f.facing += d * k; } else f[key] = o[key]; });
      f.mv = o.mvT >= 0 ? { t: () => o.mvT } : null;
    });
    if (match.over) { match.endT += dt; if (match.endT > 3.2 && !match.resultsShown) showResults(); }
  }
  function projMesh() {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.25, 8, 20, Math.PI), new THREE.MeshToonMaterial({ color: 0xf2b46b, transparent: true, opacity: 0.85 }));
    m.scale.setScalar(match.S); return m;
  }
  function netLeavePrompt() {
    DG.ui.modal({
      title: '👥 Leave the battle?', html: '<p>Your friend will win if you leave now.</p>',
      buttons: [{ label: 'Keep battling', cls: 'primary' }, { label: 'Leave', cls: 'ghost', onClick() {
        netSend({ t: 'leave' });
        if (net && net.role === 'host') { endMatch('lose', 'forfeit'); }
        else if (match) { match.over = true; match.result = 'win'; match.how = 'forfeit'; showResults(); }
        setTimeout(netClose, 300);
      } }],
    });
  }
  function netResults() {
    const meIdx = net ? net.me : (match.result === 'win' ? 0 : 1);
    let mine = match.result;
    if (net && net.me === 1) mine = { win: 'lose', lose: 'win' }[match.result] || match.result;
    if (match.left) mine = 'win';
    const me = F[net ? net.me : 0] || F[0], them = me === F[0] ? F[1] : F[0];
    const titles = { win: '🏆 You win!', lose: '💫 Your friend wins!', draw: '🤝 It\'s a draw!' };
    const stillConnected = !!(net && net.conn && net.conn.open);
    const isHost = net && net.role === 'host';
    DG.ui.modal({
      title: titles[mine], dismissable: false,
      html: `<p>${DG.ui.esc(me.name)} ${Math.round((me.hp / me.maxHp) * 100)}% health · ${DG.ui.esc(them.name)} ${Math.round((them.hp / them.maxHp) * 100)}% health${match.how === 'time' ? ' (time ran out — higher health % wins)' : ''}</p>
        ${match.how === 'forfeit' ? '<p class="fine">The battle ended early.</p>' : ''}
        <p class="fine">Friend battles are just for fun — no coins, and everyone is fully healed.</p>
        ${stillConnected && !isHost ? '<p class="fine" id="net-status">Waiting for your friend to start a rematch…</p>' : ''}`,
      buttons: [
        ...(stillConnected && isHost ? [{ label: '🔁 Rematch', cls: 'primary', onClick: () => { netSend({ t: 'start', hostDef: net.hostDef, guestDef: net.guestDef }); startNetMatch(net.hostDef, net.guestDef); } }] : []),
        { label: 'Leave', cls: stillConnected && isHost ? 'ghost' : 'primary', onClick: () => { netSend({ t: 'leave' }); netClose(); lobby(); } },
      ],
    });
  }

  /* ===================== Loop ===================== */
  function update(dt) {
    match.phaseT += dt;
    if (match.phase === 'intro') {
      const k = Math.min(1, match.phaseT / (match.introLen * 0.6));
      const f0 = F[0];
      if (f0.hopY > 0) {
        f0.hopY = Math.max(0, (match.si === GIANT ? 30 : 12) * match.S * (1 - k * k));
        if (f0.hopY === 0) {
          sfx('thud'); match.shake = (match.si === GIANT ? 0.6 : 0.2) * match.S; ring(f0.pos, 0xffffff, (match.si === GIANT ? 8 : 3) * match.S, 0.7);
          puffs(f0.pos, match.si === GIANT ? 30 : 10, 0xffffff, 2 * match.S, 0.2); cheer(1.5);
          if (match.si === GIANT) { confetti3d(); sfx('cheer'); }
        }
      }
      F[1].hopY = Math.abs(Math.sin(match.phaseT * 6)) * 0.6 * match.S;
      if (match.phaseT >= match.introLen) { match.phase = 'count'; match.phaseT = 0; F[1].hopY = 0; banner('3', 0.8); sfx('click'); match.cnt = 3; }
    } else if (match.phase === 'count') {
      const c = 3 - Math.floor(match.phaseT / 0.7);
      if (c !== match.cnt && c > 0) { match.cnt = c; banner(String(c), 0.6); sfx('click'); }
      if (match.phaseT >= 2.1) { match.phase = 'fight'; banner('Steam! 🔥', 0.8); sfx('good'); Object.keys(edges).forEach((k) => (edges[k] = false)); }
    } else if (match.phase === 'fight') {
      if (!match.over) {
        match.time -= dt;
        if (match.time <= 0) {
          match.time = 0;
          const pa = Math.round((F[0].hp / F[0].maxHp) * 1000), pb = Math.round((F[1].hp / F[1].maxHp) * 1000);
          endMatch(pa > pb ? 'win' : pa < pb ? 'lose' : 'draw', 'time');
        }
      }
      const i0 = match.over ? { move: { x: 0, z: 0 } } : playerIntents();
      const i1 = match.over ? { move: { x: 0, z: 0 } } : match.net ? remoteIntents() : aiIntents(F[1], F[0], dt);
      stepFighter(F[0], F[1], i0, dt);
      stepFighter(F[1], F[0], i1, dt);
      // separation
      const d = flatDist(F[0], F[1]), min = F[0].radius + F[1].radius;
      if (d < min && d > 1e-4 && F[0].state !== 'ko' && F[1].state !== 'ko') {
        const push = (min - d) / 2, nx = (F[1].pos.x - F[0].pos.x) / d, nz = (F[1].pos.z - F[0].pos.z) / d;
        F[0].pos.x -= nx * push; F[0].pos.z -= nz * push; F[1].pos.x += nx * push; F[1].pos.z += nz * push;
      }
      // projectiles
      for (let i = projs.length - 1; i >= 0; i--) {
        const pr = projs[i], step = 11 * match.S * dt;
        pr.pos.addScaledVector(pr.dir, step); pr.dist += step;
        pr.m.position.set(pr.pos.x, 0.2, pr.pos.z); pr.m.rotation.y = Math.atan2(pr.dir.x, pr.dir.z) + Math.PI / 2;
        if (!pr.hit && Math.hypot(pr.pos.x - pr.target.pos.x, pr.pos.z - pr.target.pos.z) < pr.target.radius + 0.8 * match.S) { pr.hit = true; applyHit(pr.owner, pr.target, pr.owner.dmg * 1.3, { kb: 4, stun: 0.4, aoe: true }); }
        if (pr.dist > 10 * match.S || pr.hit) { scene.remove(pr.m); projs.splice(i, 1); }
      }
      if (match.over) {
        match.endT += dt;
        if (match.endT > 3.2 && !match.resultsShown) showResults();
      }
    }
  }

  function render(dt, realDt) {
    if (realDt == null) realDt = dt;
    F.forEach((f) => animFighter(f, dt));
    // fx
    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i]; e.life -= dt;
      const k = 1 - e.life / e.max;
      if (e.update) e.update(e, Math.min(1, k), dt);
      if (e.life <= 0) { scene.remove(e.mesh); e.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); fx.splice(i, 1); }
    }
    // crowd
    match.cheer = Math.max(0.3, match.cheer - dt * 0.4);
    crowd.forEach((c) => { c.g.position.y = c.baseY + Math.abs(Math.sin(T * (5 + c.ph) + c.ph)) * 0.35 * match.cheer; });
    petals.forEach((p) => { p.m.position.y -= p.v * dt; p.m.position.x += Math.sin(T + p.ph) * dt * 0.5; p.m.rotation.x += dt * 2; if (p.m.position.y < 0) p.m.position.y = 12; });
    // camera
    const a = F[0].pos, b = F[1].pos;
    const mid = new THREE.Vector3((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    const sep = Math.hypot(a.x - b.x, a.z - b.z);
    const aspect = camera.aspect || 1;
    const dist = clamp(sep * (aspect < 1 ? 1.6 : 1.1) + 10 * match.S, 13 * match.S, match.R * 2.6);
    const want = new THREE.Vector3(mid.x * 0.6, dist * 0.76, mid.z * 0.6 + dist * 0.74 * camSide());
    camera.position.lerp(want, Math.min(1, realDt * (match.phase === 'intro' ? 1.5 : 4)));
    if (match.shake > 0) {
      camera.position.x += rand(-1, 1) * match.shake; camera.position.y += rand(-1, 1) * match.shake;
      match.shake = Math.max(0, match.shake - realDt * 1.2);
    }
    camera.lookAt(mid.x, 0.8 * match.S, mid.z);
    renderer.render(scene, camera);
    // floating text
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    for (let i = floats.length - 1; i >= 0; i--) {
      const fl = floats[i]; fl.life -= realDt; fl.pos.y += realDt * 1.5;
      const v = fl.pos.clone().project(camera);
      fl.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`;
      fl.el.style.opacity = Math.min(1, fl.life * 2);
      if (fl.life <= 0) { fl.el.remove(); floats.splice(i, 1); }
    }
  }

  let hudAcc = 0;
  function loop(now) {
    if (!match || !stageEl || !stageEl.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!match.paused) {
      let gdt = dt;
      if (match.hitstop > 0) { match.hitstop -= dt; gdt = 0; } // impact freeze
      else if (match.slow > 0) { match.slow -= dt; gdt = dt * 0.35; } // slow motion
      if (match.speedT > 0) match.speedT -= dt;
      const sp = stageEl.querySelector('.a-speed'); if (sp) sp.classList.toggle('on', match.speedT > 0);
      T += gdt;
      try {
        if (match.net && net && net.role === 'guest') { guestStep(dt); render(dt, dt); }
        else { update(gdt); render(gdt, dt); }
        if (match.net && net) netTick(dt);
      } catch (e) { console.error(e); }
      hudAcc += dt;
      if (hudAcc > 0.06) { hudAcc = 0; renderHud(false); }
    }
    raf = requestAnimationFrame(loop);
  }

  function resize() {
    if (!renderer || !stageEl) return;
    const w = stageEl.clientWidth || window.innerWidth, h = stageEl.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    const portrait = w < h, touchUI = DG.ui.isTouch();
    camera.fov = portrait ? 62 : 48;
    // on phones in portrait, nudge the picture up so the fighters aren't hidden under your thumbs
    if (portrait && touchUI) camera.setViewOffset(w, h, 0, h * 0.13, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const rot = stageEl.querySelector('#a-rotate');
    if (rot) rot.hidden = !(portrait && touchUI && !rotDismissed);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  document.addEventListener('visibilitychange', () => { if (document.hidden && match && !match.net && match.phase === 'fight' && !match.over && !DG.ui.anyModal()) pause(true); });

  function cleanupMatch() {
    cancelAnimationFrame(raf);
    if (scene) {
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    }
    scene = null; F = []; fx = []; projs = []; crowd = []; petals = [];
    floats.forEach((f) => f.el.remove()); floats = [];
    match = null; stageEl = null;
    touch.x = touch.y = 0; touch.btn = {}; touch.edge = {};
  }

  window.addEventListener('keydown', (e) => {
    if (DG.ui.current() !== 'arena' || !match) return;
    const game = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (game.includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' || e.code === 'KeyP') { if (!DG.ui.anyModal()) pause(true); return; }
    if (!e.repeat) edges[e.code] = true;
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { Object.keys(keys).forEach((k) => (keys[k] = false)); if (match && !match.net && match.phase === 'fight' && !match.over && !DG.ui.anyModal()) pause(true); });

  DG.Arena = {
    enter() { root = document.getElementById('screen-arena'); lobby(); },
    exit() { if (root && root._stop) root._stop(); netClose(); cleanupMatch(); if (root) root.innerHTML = ''; },
    // test hooks
    _debug: () => ({ match, F }),
    _forceEnd: (r) => { if (match) { endMatch(r, 'ko'); match.endT = 99; } },
  };
  DG.ui.register('arena', DG.Arena);
})(window.DG);
