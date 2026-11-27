/* My Pet Dumpling — the cozy home: care, play, personality moments */
(function (DG) {
  const R = DG.ROOM, TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let root, canvas, ctx, raf = 0, last = 0, T = 0, hudAcc = 0, lastPet = 0;
  const P = {
    x: R.spots.home.x, y: R.spots.home.y, tx: 0, ty: 0, walking: false, onArrive: null, flip: false,
    hop: 0, hopV: 0, squash: 0, rot: 0, mood: null, moodT: 0, speech: '', speechT: 0,
    blinkT: 2, blinkOn: 0, action: null, actionT: 0, momentT: 10, zzzT: 0,
  };
  let parts = [], bowlFood = null, busy = false, play = null, partyT = 0;

  const size = () => 150 * DG.stage().scale;
  const pname = () => DG.ui.esc(DG.pet().name);
  function say(text, dur) { P.speech = text; P.speechT = dur || 2.2; }
  function hearts(n, color) {
    for (let i = 0; i < n; i++) parts.push({ kind: 'heart', x: P.x + rand(-30, 30), y: P.y - size() * 0.9 - P.hop, vx: rand(-40, 40), vy: rand(-120, -60),
      size: rand(9, 15), life: 1.4, max: 1.4, color });
  }
  function floatText(text, color, x, y) {
    parts.push({ kind: 'text', text, x: x || P.x, y: y || P.y - size() * 1.1, vy: -40, size: 22, life: 1.6, max: 1.6, color: color || '#e8607a', bold: true });
  }
  function walkTo(spot, cb) { P.tx = spot.x; P.ty = spot.y; P.walking = true; P.onArrive = cb || null; P.action = null; }
  function wakeIfAsleep() { if (DG.pet().asleep) wake(false); }

  const NEED_ITEMS = [['fullness', 'Fullness', '🥟'], ['happiness', 'Happiness', '💖'], ['energy', 'Energy', '⚡'], ['cleanliness', 'Cleanliness', '🫧']];

  /** Little portrait of your dumpling sitting in a bamboo steamer, for the top bar. */
  function drawHudPic() {
    const cv = root && root.querySelector('#h-pic'); if (!cv) return;
    const p = DG.pet(), c = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2;
    c.clearRect(0, 0, W, H);
    const by = H * 0.64, bw = W * 0.42, bh = H * 0.24, rim = bw * 0.26;
    // basket back rim
    c.fillStyle = '#b9783c'; c.beginPath(); c.ellipse(cx, by, bw, rim, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8d5426'; c.beginPath(); c.ellipse(cx, by + 3, bw * 0.88, rim * 0.72, 0, 0, Math.PI * 2); c.fill();
    const mood = p.asleep ? 'sleeping' : DG.mood();
    DG.draw.dumpling(c, { type: p.type, look: p.look, x: cx, y: by + bh * 0.5, size: W * 0.56, t: T, stage: Math.min(3, DG.stageIndex()),
      mood: mood === 'happy' ? 'joy' : mood, accessory: p.accessory, trait: null, shadow: false, blink: !p.asleep && (T % 4) < 0.15 });
    // basket front band
    c.save();
    c.beginPath(); c.moveTo(cx - bw, by); c.lineTo(cx - bw * 0.96, by + bh); c.ellipse(cx, by + bh, bw * 0.96, rim, 0, Math.PI, 0, true); c.lineTo(cx + bw, by);
    c.ellipse(cx, by, bw, rim, 0, 0, Math.PI, false); c.closePath();
    const bg = c.createLinearGradient(0, by, 0, by + bh + rim);
    bg.addColorStop(0, '#f2c27c'); bg.addColorStop(0.5, '#e0a35a'); bg.addColorStop(1, '#c4813f');
    c.fillStyle = bg; c.fill(); c.lineWidth = 4; c.strokeStyle = '#8d5426'; c.stroke(); c.clip();
    c.strokeStyle = 'rgba(141,84,38,0.45)'; c.lineWidth = 3;
    [0.38, 0.72].forEach((k) => { c.beginPath(); c.ellipse(cx, by + bh * k, bw, rim, 0, 0, Math.PI); c.stroke(); });
    c.restore();
    c.lineWidth = 4; c.strokeStyle = '#8d5426'; c.beginPath(); c.ellipse(cx, by, bw, rim, 0, 0, Math.PI); c.stroke();
  }
  /** Header trim, bow and border take their color from the accessory your dumpling wears. */
  function tintHud(p) {
    const hud = root; if (!hud) return;
    const a = p.accessory && DG.ACCESSORIES[p.accessory];
    const c = (a && a.tint) || '#c9a8f5';
    if (hud._tint === c) return; hud._tint = c;
    const S = DG.draw.shade, M = DG.draw.mix;
    hud.style.setProperty('--trim', c);
    hud.style.setProperty('--trim-dark', S(c, 0.78));
    hud.style.setProperty('--trim-deep', S(c, 0.6));
    hud.style.setProperty('--trim-light', M(c, '#ffffff', 0.45));
    hud.style.setProperty('--hud-border', M(c, '#ffffff', 0.62));
    hud.style.setProperty('--hud-shadow', M(c, '#f3c9a6', 0.45));
  }
  /** The button bar takes its colours from the house wallpaper. */
  function tintDock() {
    const dock = root.querySelector('.dock'); if (!dock) return;
    const w = DG.draw.wallColors(DG.state.home), key = w.a + w.b + w.trim;
    if (dock._k === key) return; dock._k = key;
    const M = DG.draw.mix;
    dock.style.setProperty('--dk-a', w.dark ? M(w.a, '#ffffff', 0.12) : M(w.a, '#ffffff', 0.35));
    dock.style.setProperty('--dk-b', w.dark ? w.b : w.b);
    dock.style.setProperty('--dk-edge', w.dark ? M(w.trim, '#ffffff', 0.25) : M(w.trim, '#ffffff', 0.15));
    dock.style.setProperty('--dk-line', w.dark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)');
  }
  /** Fullness icon: a glossy rice bowl piled with fluffy rice and a pair of chopsticks. */
  function drawRiceBowl(c) {
    const ink = '#6b3a22';
    c.lineJoin = 'round'; c.lineCap = 'round';
    // chopsticks behind the rice
    [[[58, 8], [30, 54]], [[72, 12], [40, 56]]].forEach(([a, b]) => {
      c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
      c.strokeStyle = '#d9a45e'; c.lineWidth = 4; c.stroke();
      c.strokeStyle = '#c0392b'; c.lineWidth = 4; c.beginPath(); c.moveTo(...a); c.lineTo(a[0] + (b[0] - a[0]) * 0.18, a[1] + (b[1] - a[1]) * 0.18); c.stroke();
    });
    // inside of the bowl (back of the rim), behind the rice
    c.fillStyle = '#dbe8f6'; c.beginPath(); c.ellipse(48, 54, 39, 6, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 3.5; c.strokeStyle = ink; c.stroke();
    // fluffy rice mound
    const bumps = [[22, 52, 12], [34, 44, 14], [49, 39, 15], [63, 44, 14], [74, 52, 11], [48, 53, 16]];
    c.fillStyle = ink; bumps.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r + 2.4, 0, Math.PI * 2); c.fill(); });
    const rg = c.createRadialGradient(42, 36, 4, 48, 48, 32); rg.addColorStop(0, '#ffffff'); rg.addColorStop(1, '#efe8dc');
    c.fillStyle = rg; bumps.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = 'rgba(200,185,160,0.8)';
    [[30, 46], [42, 40], [55, 36], [66, 45], [38, 52], [58, 50], [48, 44], [26, 52]].forEach(([x, y], i) => {
      c.save(); c.translate(x, y); c.rotate(i * 0.7); c.beginPath(); c.ellipse(0, 0, 3, 1.4, 0, 0, Math.PI * 2); c.fill(); c.restore();
    });
    c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.ellipse(40, 34, 5, 2.5, -0.4, 0, Math.PI * 2); c.fill();
    // the bowl
    const bowl = () => { c.beginPath(); c.moveTo(10, 54); c.quadraticCurveTo(14, 86, 48, 88); c.quadraticCurveTo(82, 86, 86, 54); c.closePath(); };
    bowl(); const bg = c.createLinearGradient(10, 0, 86, 0);
    bg.addColorStop(0, '#7fb5ee'); bg.addColorStop(0.45, '#4f8fdc'); bg.addColorStop(1, '#2f6cc4');
    c.fillStyle = bg; c.fill(); c.lineWidth = 4; c.strokeStyle = ink; c.stroke();
    c.save(); bowl(); c.clip();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2.5; // little wave pattern
    for (let x = 14; x < 86; x += 12) { c.beginPath(); c.arc(x + 6, 72, 5, Math.PI, 0); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(24, 64, 4, 10, 0.4, 0, Math.PI * 2); c.fill();
    c.restore();
    // rim and foot
    c.lineWidth = 5; c.strokeStyle = ink; c.beginPath(); c.ellipse(48, 54, 39, 6, 0, 0.05, Math.PI - 0.05); c.stroke(); // front lip of the rim
    c.lineWidth = 2.5; c.strokeStyle = '#e9f2fc'; c.beginPath(); c.ellipse(48, 54.5, 37, 5, 0, 0.25, Math.PI - 0.25); c.stroke();
    c.fillStyle = '#2f6cc4'; c.beginPath(); c.moveTo(36, 87); c.lineTo(38, 93); c.lineTo(58, 93); c.lineTo(60, 87); c.closePath(); c.fill(); c.lineWidth = 3; c.stroke();
  }
  function drawNeedIcon() {
    const cv = root && root.querySelector('#h-ico-full');
    if (cv && !cv._done) { cv._done = true; drawRiceBowl(cv.getContext('2d')); }
    // happiness: a beaming pink bao with rosy cheeks and a couple of sparkles
    const hv = root && root.querySelector('#h-ico-happy');
    if (hv && !hv._done) {
      hv._done = true;
      const c = hv.getContext('2d');
      const glow = c.createRadialGradient(48, 56, 6, 48, 56, 46);
      glow.addColorStop(0, 'rgba(255,190,210,0.55)'); glow.addColorStop(1, 'rgba(255,190,210,0)');
      c.fillStyle = glow; c.fillRect(0, 0, 96, 96);
      DG.draw.dumpling(c, { type: 'bao', x: 48, y: 90, size: 74, mood: 'joy', shadow: false, t: 0, stage: 1,
        look: { color: 'pink', eyes: 'round', cheeks: 'big' }, colors: { base: '#ffa9c2', light: '#ffe4ee', line: '#d4577c' } });
      DG.draw.sparkle(c, 82, 20, 9, '#ffd36a', '#c78a14');
      DG.draw.sparkle(c, 14, 34, 6, '#ffd36a', '#c78a14');
    }
  }

  /* ---------- Phone camera: the room is zoomed in to fill a tall phone screen ---------- */
  const CAM = { on: false, x: 0, vw: R.W, s: 1, E: 0, F: 0, cssW: 0, cssH: 0, userT: -99, measured: false };
  const clampCam = (x) => Math.max(0, Math.min(R.W - CAM.vw, x));
  function layoutRoom() {
    const phone = window.matchMedia('(max-width: 600px)').matches;
    const dockEl = root.querySelector('.dock');
    placeProps(phone);
    if (!phone) { // whole room visible, with a strip of extra floor under it for the button bar
      const k = (canvas.clientWidth || R.W) / R.W;
      Object.assign(CAM, { on: false, E: 0, x: 0, vw: R.W, measured: true, F: ((dockEl ? dockEl.offsetHeight : 70) + 16) / k });
      return;
    }
    const r = canvas.getBoundingClientRect(), top = r.top + window.scrollY;
    const cssW = canvas.clientWidth, cssH = Math.max(300, Math.round(window.innerHeight - top - 12));
    // Fit the room so only a thin strip of wall shows above the window (window top is at y=40),
    // with just enough floor under the furniture for the button bar. Solved for the zoom s.
    const dock = root.querySelector('.dock'), dockPx = (dock ? dock.offsetHeight : 50) + 14;
    const TOP_WALL = 22; // room units of wall visible above the window
    // keep the zoom close to the old phone view; trim the wall to a thin strip above the window and
    // give the rest of the height to extra floor (the dumpling can walk there; the button bar sits on it)
    // zoom = how much of the room's width is shown; players change it by pinching (remembered in settings)
    const sMin = Math.max(cssW / R.W, (cssH - dockPx) / (R.H - 40 + TOP_WALL + 18 + 400)); // most zoomed out
    CAM.zoomMax = cssW / sMin; CAM.zoomMin = 260;
    const zoom = Math.max(CAM.zoomMin, Math.min(CAM.zoomMax, (DG.state.settings && DG.state.settings.roomZoom) || 430));
    let s = Math.max(cssW / zoom, sMin);
    const vw = Math.min(R.W, cssW / s), vh = cssH / s;
    const dockL = dockPx / s;
    // spare height goes to floor first; past ~120 units it is shared with the wall so the room stays centred
    const spare = Math.max(0, vh - (R.H - 40 + TOP_WALL) - (dockL + 18));
    const F = dockL + 18 + Math.min(spare, 120) + Math.max(0, spare - 120) / 2;
    const extra = vh - R.H;
    Object.assign(CAM, { on: true, s, vw, cssW, cssH, E: extra - F, F, measured: true, walkMax: 495 + Math.max(0, F - dockL - 18) });
    if (!CAM.init) { CAM.init = true; CAM.x = clampCam(P.x - vw / 2); }
  }
  function setRoomZoom(z) {
    const st = DG.state.settings || (DG.state.settings = {});
    st.roomZoom = Math.max(CAM.zoomMin || 260, Math.min(CAM.zoomMax || 900, z));
    layoutRoom();
  }
  /** On tall phone screens the bowl and toy basket sit further forward on the floor, so the
      furniture isn't all in one line. Their tap areas and the eating spot move with them. */
  const PROP_HOME = { bowl: R.bowl.y, basket: R.basket.y, eat: R.spots.bowl.y };
  const PHONE_DROP = { bowl: 120, basket: 48 };
  function placeProps(phone) {
    R.bowl.y = PROP_HOME.bowl + (phone ? PHONE_DROP.bowl : 0);
    R.basket.y = PROP_HOME.basket + (phone ? PHONE_DROP.basket : 0);
    R.spots.bowl.y = PROP_HOME.eat + (phone ? PHONE_DROP.bowl : 0);
  }
  function toRoom(e) {
    if (!CAM.on) return DG.ui.toLogical(canvas, e, R.W);
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / CAM.s + CAM.x, y: (e.clientY - r.top) / CAM.s - CAM.E };
  }

  /* ---------- Build ---------- */
  function build() {
    root = document.getElementById('screen-home');
    root.innerHTML = `
      <header class="hud">
        <div class="hud-pic" aria-hidden="true"><canvas id="h-pic" width="260" height="240"></canvas><i class="hud-pop"></i></div>
        <div class="hud-id">
          <div class="pet-name"><span id="h-name"></span><span class="hud-heart" aria-hidden="true">💕</span></div>
          <div class="pet-sub"><span class="badge" id="h-stage"></span> <span id="h-age"></span> · <span id="h-pers"></span></div>
        </div>
        <div class="top-right">
          <div class="coins" title="Dumpling Coins"><span class="coin-ico">🪙</span><b id="h-coins">0</b></div>
          <button class="icon-btn" id="h-settings" aria-label="Settings">⚙️</button>
        </div>
        <div class="hud-deco" aria-hidden="true"><span class="sp s1">✦</span><span class="sp s2">✦</span><span class="sp s3">✦</span></div>
        <div class="grow-box" id="h-grow"></div>
        <div class="needs" id="h-needs">${NEED_ITEMS.map(([k, label, icon]) => `
          <div class="need n-${k}" data-k="${k}"><div class="need-top"><span class="need-name">${k === 'fullness' ? '<canvas class="need-ico" id="h-ico-full" width="96" height="96" aria-hidden="true"></canvas>' : k === 'happiness' ? '<canvas class="need-ico" id="h-ico-happy" width="96" height="96" aria-hidden="true"></canvas>' : `<span class="need-ico">${icon}</span>`}<span class="need-lbl">${label}</span></span><b class="need-val">0</b></div>${DG.ui.bar(0, 100, '#7fd8a6', label)}</div>`).join('')}
        </div>
        <div class="hud-trim" aria-hidden="true"></div><svg aria-hidden="true" class="hud-bow" viewBox="0 0 64 44"><path d="M32 20 C22 6 6 2 4 12 C2 22 16 28 32 22 Z M32 20 C42 6 58 2 60 12 C62 22 48 28 32 22 Z" class="bw-a" stroke-linejoin="round"/><path d="M29 23 L20 40 L26 37 L28 42 L32 26 Z M35 23 L44 40 L38 37 L36 42 L32 26 Z" class="bw-b" stroke-linejoin="round"/><ellipse cx="32" cy="21" rx="6" ry="5.5" class="bw-c" /><path d="M12 10 C14 8 18 8 20 10" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/></svg>
      </header>
      <div class="room-wrap">
        <canvas id="room-canvas" aria-label="Your dumpling's home. Tap your dumpling to pet it."></canvas>
        <nav class="actions dock glass" aria-label="Actions">
          <button class="act a-walk" data-a="walk" title="Walk" aria-label="Walk"><span>🌳</span></button>
          <button class="act big train" data-a="train" title="Training" aria-label="Training"><span>🏋️</span></button>
          <button class="act big arena" data-a="arena" id="h-arena" title="Arena" aria-label="Arena"><span>🏟️</span></button>
          <button class="act a-shop" data-a="shop" title="Shop" aria-label="Shop"><span>🛍️</span></button>
          <button class="act a-closet" data-a="closet" title="Closet" aria-label="Closet"><span><svg class="ico-svg" viewBox="0 0 64 64" aria-hidden="true"><path d="M10 14 Q32 3 54 14 L54 18 L10 18 Z" fill="#c98a4f" stroke="#6b3f1e" stroke-width="3" stroke-linejoin="round"/><rect x="12" y="17" width="40" height="38" rx="4" fill="#e6b073" stroke="#6b3f1e" stroke-width="3"/><rect x="16" y="21" width="15" height="30" rx="2.5" fill="#f2c890" stroke="#6b3f1e" stroke-width="2.2"/><rect x="33" y="21" width="15" height="30" rx="2.5" fill="#f2c890" stroke="#6b3f1e" stroke-width="2.2"/><circle cx="28" cy="36" r="2.2" fill="#ffd36a" stroke="#6b3f1e" stroke-width="1.5"/><circle cx="36" cy="36" r="2.2" fill="#ffd36a" stroke="#6b3f1e" stroke-width="1.5"/><path d="M15 55 v5 M49 55 v5" stroke="#6b3f1e" stroke-width="4" stroke-linecap="round"/><path d="M18 24 v10" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/></svg></span></button>
          <button class="act a-decorate" data-a="decorate" title="Decorate" aria-label="Decorate"><span>🏠</span></button>
          <button class="act a-stats" data-a="stats" title="Stats" aria-label="Stats"><span>📊</span></button>
          <button class="act a-trophies" data-a="trophies" title="Trophies" aria-label="Trophies"><span>🏆</span></button>
        </nav>
        <div class="bonus-chip" id="h-bonus" hidden></div>
        <div class="play-bar" id="h-play" hidden></div>
      </div>
      <p class="hint" id="h-hint" hidden></p>
`;
    canvas = root.querySelector('#room-canvas');
    ctx = canvas.getContext('2d');
    root.querySelector('#h-settings').onclick = () => DG.Menus.settings();
    root.querySelectorAll('.act').forEach((b) => (b.onclick = () => { DG.audio.play('click'); action(b.dataset.a); }));
    // On phones the room is shown zoomed in: a swipe pans the view, a tap acts, two fingers pinch to zoom.
    let down = null, pinch = null;
    const touches = new Map();
    const pinchInfo = () => {
      const [a, b] = [...touches.values()], r = canvas.getBoundingClientRect();
      return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2 - r.left };
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (!CAM.on) { onPointer(e); return; }
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) { // start pinching: remember the spot between the fingers
        const pi = pinchInfo();
        pinch = { d0: pi.d, zoom0: CAM.vw, anchor: CAM.x + pi.mx / CAM.s };
        down = null; return;
      }
      if (touches.size > 2) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      down = { x: e.clientX, y: e.clientY, cam: CAM.x, panned: false };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (CAM.on && pinch && touches.size >= 2) {
        const pi = pinchInfo();
        setRoomZoom(pinch.zoom0 * pinch.d0 / Math.max(10, pi.d));
        CAM.x = clampCam(pinch.anchor - pi.mx / CAM.s); CAM.userT = T;
        return;
      }
      if (CAM.on && down) {
        const dx = e.clientX - down.x;
        if (!down.panned && Math.abs(dx) > 10) down.panned = true;
        if (down.panned) { CAM.x = clampCam(down.cam - dx / CAM.s); CAM.userT = T; return; }
      }
      onHover(e);
    });
    const up = (e) => {
      touches.delete(e.pointerId);
      if (pinch) { if (touches.size < 2) { pinch = null; DG.save(); } down = null; return; }
      if (CAM.on && down && !down.panned) onPointer(e);
      down = null;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; down = null; });
    // trackpad pinch / Ctrl + scroll wheel also zooms the phone view
    canvas.addEventListener('wheel', (e) => {
      if (!CAM.on || !e.ctrlKey) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, anchor = CAM.x + mx / CAM.s;
      setRoomZoom(CAM.vw * Math.exp(e.deltaY * 0.01));
      CAM.x = clampCam(anchor - mx / CAM.s); CAM.userT = T;
      clearTimeout(canvas._zt); canvas._zt = setTimeout(() => DG.save(), 400);
    }, { passive: false });
    window.addEventListener('resize', () => { CAM.measured = false; });
  }

  function action(a) {
    if (a === 'feed') DG.Menus.feed();
    else if (a === 'play') DG.Menus.toys();
    else if (a === 'wash') openBath();
    else if (a === 'sleep') goSleep();
    else if (a === 'train') { wakeIfAsleep(); endPlay(); DG.ui.show('train'); }
    else if (a === 'arena') { wakeIfAsleep(); endPlay(); DG.ui.show('arena'); }
    else if (a === 'shop') DG.Menus.shop();
    else if (a === 'closet') DG.Menus.closet();
    else if (a === 'decorate') DG.Menus.decorate();
    else if (a === 'walk') goWalk();
    else if (a === 'stats') DG.Menus.stats();
    else if (a === 'trophies') DG.Menus.trophies();
  }

  /* ---------- HUD ---------- */
  function renderHud() {
    const p = DG.pet(); if (!p || !root) return;
    const si = DG.stageIndex(), st = DG.STAGES[si];
    root.querySelector('#h-name').textContent = p.name;
    root.querySelector('#h-stage').textContent = st.name + (DG.devPreviewStage != null ? ' (preview)' : '');
    root.querySelector('#h-age').textContent = DG.fmtAge(DG.ageMs());
    root.querySelector('#h-pers').textContent = DG.personality();
    root.querySelector('#h-coins').textContent = DG.state.coins;
    const nx = DG.nextStage();
    const grow = root.querySelector('#h-grow');
    const frozen = DG.frozenNeeds();
    if (nx) {
      const prevAt = DG.STAGES[nx.index - 1].at, span = nx.stage.at - prevAt;
      const pct = ((DG.growMs() - prevAt) / span) * 100;
      const label = frozen.length
        ? `<div class="grow-label paused">⏸ Growing paused! Raise <b>${frozen.map((k) => DG.NEED_NAMES[k]).join(' & ')}</b> above ${DG.GROWTH_FREEZE}.</div>`
        : `<div class="grow-label">Grows into <b>${nx.stage.name}</b> in <b>${DG.fmtDuration(nx.msLeft)}</b></div>`;
      grow.innerHTML = label + DG.ui.bar(pct, 100, frozen.length ? '#c9bfd6' : 'linear-gradient(180deg,#c39bff,#9a62f0)', 'growth');
    } else grow.innerHTML = `<div class="grow-label">🌳 <b>Fully grown!</b> A magnificent Giant dumpling.</div>`;
    const n = p.needs;
    root.querySelectorAll('#h-needs .need').forEach((el) => {
      const v = n[el.dataset.k];
      el.classList.toggle('low', v < 30 || v < DG.GROWTH_FREEZE); el.classList.toggle('frozen', v < DG.GROWTH_FREEZE);
      el.querySelector('.need-val').textContent = Math.round(v);
      const f = el.querySelector('.bar-fill'); f.style.width = Math.max(0, Math.min(100, v)) + '%';
      f.style.background = v < 25 ? 'linear-gradient(180deg,#ff9f96,#f06a5e)' : v < 50 ? 'linear-gradient(180deg,#ffd77a,#f5b23c)' : 'linear-gradient(180deg,#7fe08f,#3fbf5a)';
    });
    drawNeedIcon(); drawHudPic(); tintHud(p); tintDock();
    CAM.measured = false;
    const bonus = root.querySelector('#h-bonus');
    if (p.foodBonus) { bonus.hidden = false; bonus.innerHTML = `${DG.FOODS[p.foodBonus.food].icon} Next battle: <b>${p.foodBonus.label}</b>`; }
    else bonus.hidden = true;
    const sb = root.querySelector('#h-sleep');
    if (sb) {
    sb.innerHTML = p.asleep ? '<span>☀️</span>' : '<span>🛏️</span>';
    sb.title = p.asleep ? 'Wake up' : 'Sleep'; sb.setAttribute('aria-label', sb.title);
    }
    const hint = root.querySelector('#h-hint');
    hint.innerHTML = p.asleep && DG.isNight() ? `🌙 It's night (9 PM to 7 AM). ${pname()} is sleeping and will wake up at 7 AM. Waking it now makes its energy drain fast.`
      : !p.asleep && DG.isNight() ? `🌙 It's late! ${pname()} is up past bedtime, so its energy is draining fast. Tap the bed to tuck it in.`
      : '';
    hint.hidden = !hint.innerHTML;
    hint.classList.toggle('night', DG.isNight());
    if (['home', 'night'].includes(DG.audio.track())) DG.audio.homeTrack();
    const ab = root.querySelector('#h-arena');
    ab.classList.toggle('soft-lock', si < 1);
    ab.innerHTML = '<span>🏟️</span>';
    ab.title = si < 1 ? 'Arena (friend battles only until Small)' : 'Arena'; ab.setAttribute('aria-label', ab.title);
  }

  /* ---------- Interactions ---------- */
  function petBox() {
    const s = size();
    return { x: P.x, y: P.y - s * 0.5 - P.hop, r: s * 0.62 };
  }
  function inRect(pt, r) { return pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h; }
  function hitPet(pt) {
    if (DG.pet().asleep) return Math.hypot(pt.x - DG.bedPoint(860, 0).x, pt.y - (DG.bedPoint(0, 440).y - 30)) < 70;
    const b = petBox(); return Math.hypot(pt.x - b.x, pt.y - b.y) < b.r;
  }
  function onHover(e) {
    const pt = toRoom(e);
    const over = hitPet(pt) || ['bowl', 'tub', 'bed', 'basket'].some((k) => inRect(pt, R[k])) || !!play;
    canvas.style.cursor = over ? 'pointer' : 'default';
  }
  function onPointer(e) {
    DG.audio.unlock();
    const pt = toRoom(e);
    if (play) { playClick(pt); return; }
    if (hitPet(pt)) return petPet();
    if (inRect(pt, R.bowl)) return DG.Menus.feed();
    if (inRect(pt, R.tub)) return openBath();
    if (inRect(pt, R.bed)) return goSleep();
    if (inRect(pt, R.basket)) return DG.Menus.toys();
    tapToWalk(pt);
  }
  /** Tap anywhere else in the room and your dumpling waddles over there. */
  function tapToWalk(pt) {
    const p = DG.pet();
    if (p.asleep) { say('zzz...', 1.2); return; }
    if (busy || P.action === 'eat') return;
    const x = Math.max(70, Math.min(R.W - 70, pt.x)), y = Math.max(410, Math.min(CAM.on ? CAM.walkMax : 495, pt.y < R.floorY ? 450 : pt.y));
    P.action = null; P.flip = x < P.x;
    walkTo({ x, y }, () => { if (Math.random() < 0.35) { P.mood = 'joy'; P.moodT = 1; say(pick(['Here!', '♪', 'Ta-da!', 'Hi!']), 1.1); } });
    P.momentT = Math.max(P.momentT, 8);
    parts.push({ kind: 'star', x, y: y - 6, vy: -20, size: 12, life: 0.7, max: 0.7, color: '#ffd75a' });
    DG.audio.play('pop');
  }

  function petPet() {
    const p = DG.pet();
    if (p.asleep) { say('zzz... ♥', 1.5); hearts(2); DG.addNeeds({ happiness: 1 }); return; }
    DG.audio.play(DG.stageIndex() === 0 ? 'babysqueak' : 'squeak');
    if (P.hop < 5) P.hopV = 330;
    P.mood = 'joy'; P.moodT = 1.3; hearts(3);
    const now = performance.now();
    if (now - lastPet > 900) {
      lastPet = now;
      DG.addNeeds({ happiness: 3 }); p.care.pets++; DG.state.counters.pets++;
      if (DG.state.counters.pets >= 25) DG.unlock('bestBuds');
      renderHud();
    }
    if (Math.random() < 0.3) say(pick(['Hehe!', '♥', 'Again!', 'Squee!', 'Purr~']), 1.2);
  }

  function feed(id) {
    const p = DG.pet(), f = DG.FOODS[id];
    if (busy || play) { DG.ui.toast('One thing at a time! 🥟'); return false; }
    wakeIfAsleep();
    const snack = id === 'berry' || id === 'peach' || id === 'cake';
    if (p.needs.fullness >= 96 && !snack) {
      say("I'm stuffed!"); DG.ui.toast(`${pname()} is full! Try a light snack, or play instead.`); DG.audio.play('bad'); return false;
    }
    if (!f.free) {
      const inv = DG.state.inventory.food;
      if (!inv[id]) { DG.ui.toast(`No ${f.name} left. Buy more in the Shop.`); return false; }
      inv[id]--;
    }
    busy = true;
    walkTo(R.spots.bowl, () => {
      P.flip = true; bowlFood = f.icon; P.action = 'eat'; P.actionT = 2.4; P.eatId = id; P.munchT = 0;
    });
    return true;
  }
  function finishEat(id) {
    const p = DG.pet(), f = DG.FOODS[id];
    DG.addNeeds({ fullness: f.full, happiness: f.hap, energy: f.en });
    p.care.meals++; DG.state.counters.meals++;
    DG.unlock('firstMeal');
    let msg = `${f.icon} ${pname()} ate ${f.name}! +${f.full} fullness`;
    if (f.en) msg += `, +${f.en} energy`;
    if (f.hap > 5) msg += `, +${f.hap} happiness`;
    if (f.bonus) {
      const prev = p.foodBonus;
      p.foodBonus = { food: id, type: f.bonus.type, label: f.bonus.label };
      msg += `<br>💪 Next-battle bonus: <b>${f.bonus.label}</b>`;
      if (prev && prev.food !== id) msg += ` <small>(replaces ${DG.FOODS[prev.food].name})</small>`;
    }
    if (id === p.favoriteFood) {
      DG.addNeeds({ happiness: 10 });
      hearts(12, '#ff4f7b'); P.mood = 'love'; P.moodT = 3; P.hopV = 420;
      say('My FAVORITE!!', 2.5); DG.audio.play('squeak'); setTimeout(() => DG.audio.play('boing'), 200);
      if (!p.favoriteKnown) {
        p.favoriteKnown = true;
        DG.ui.toast(`⭐ Favorite food discovered! ${pname()} <b>LOVES</b> ${f.name}!`, 'gold');
        DG.unlock('favorite');
      }
    } else {
      P.mood = 'joy'; P.moodT = 1.5; hearts(3); say(pick(['Yum!', 'Nom nom!', 'Delicious!', 'Mmm~']), 1.6);
    }
    if (id === 'cake') {
      partyT = 4.5; DG.draw.confetti(parts, P.x, P.y - 100, 60); DG.audio.play('fanfare');
      say('PARTY TIME!!', 3); DG.unlock('party');
    }
    DG.ui.toast(msg);
    bowlFood = null; busy = false; P.flip = false;
    DG.save(); renderHud();
  }

  function goSleep() {
    const p = DG.pet();
    if (p.asleep) return wake(false);
    if (busy || play) { DG.ui.toast('One thing at a time! 🥟'); return; }
    const night = DG.isNight();
    if (p.needs.energy >= 92 && !night) { say('Not sleepy!'); DG.ui.toast(`${pname()} is full of energy! Try again when Energy is lower.`); return; }
    busy = true; say('*yawn*', 1.4);
    walkTo(R.spots.bed, () => {
      p.asleep = true; p.nightAwake = false; p.autoSlept = night; busy = false; DG.audio.play('snore');
      DG.ui.toast(night ? `🌙 Night night! ${pname()} will sleep until 7 AM.` : `🛏️ ${pname()} is napping. Energy slowly refills while asleep (about ${DG.SLEEP_REFILL} per hour).`);
      DG.save(); renderHud();
    });
  }
  function bedtime() {
    const p = DG.pet();
    endPlay();
    // p.asleep was just set by DG.nightCheck(); walk over first, then lie down
    p.asleep = false; busy = true; say('*big yawn* Bedtime...', 2);
    walkTo(R.spots.bed, () => {
      p.asleep = true; p.autoSlept = true; busy = false; DG.audio.play('snore');
      DG.ui.toast(`🌙 It's 9 PM. ${pname()} climbed into bed and will wake up at 7 AM.`);
      DG.save(); renderHud();
    });
  }
  function wake(auto) {
    const p = DG.pet(); if (!p.asleep) return;
    p.asleep = false; p.autoSlept = false; P.x = R.spots.bed.x - 110; P.y = R.spots.bed.y; P.hopV = 300;
    if (!auto && DG.isNight()) {
      p.nightAwake = true; P.mood = 'sleepy'; P.moodT = 3;
      say('*yawn* ...but it\'s night...', 2.5);
      DG.ui.toast(`🌙 ${pname()} is awake past bedtime. Energy drains fast until you tuck it back in.`);
    } else say(auto ? 'Good morning! ☀️' : '*yawn* Morning!', 2);
    if (auto) DG.ui.toast(`☀️ Good morning! ${pname()} is up and ready for the day.`);
    DG.save(); renderHud();
  }

  /* ---------- Play ---------- */
  function startPlay(toy) {
    const p = DG.pet();
    if (busy) { DG.ui.toast('One thing at a time! 🥟'); return; }
    wakeIfAsleep();
    if (p.needs.energy < 10) { say('Too sleepy...'); DG.ui.toast(`${pname()} is too tired to play. Try a nap first!`); return; }
    endPlay();
    play = { toy, count: 0 };
    if (P.walking) { P.walking = false; P.onArrive = null; }
    if (toy === 'ball') play.ball = { state: 'held', x: P.x, y: P.y };
    if (toy === 'mushroom') play.mush = { x: Math.min(820, P.x + 170), y: 470, sq: 0 };
    if (toy === 'hoop') play.hoop = null;
    if (toy === 'bubbles') play.bubs = [];
    if (toy === 'drum') { play.drum = { x: P.x, y: P.y + 34, hit: 0, side: 1 }; play.beats = []; play.dance = 0; P.flip = false; }
    if (toy === 'feather') play.feather = { x: P.x + 150, y: 380, tx: P.x + 150, ty: 380, caught: 0 };
    if (toy === 'blocks') {
      // stack on open floor next to the dumpling, away from the furniture
      const clear = (x) => !['tub', 'bowl', 'basket', 'bed'].some((k) => x > R[k].x - 30 && x < R[k].x + R[k].w + 30);
      const opts = [115, -115, 170, -170, 230, -230].map((dx) => P.x + dx).filter((x) => x > 90 && x < R.W - 90);
      const bx = opts.find(clear) || opts[0] || P.x + 115;
      play.blocks = { x: bx, y: Math.min(CAM.on ? CAM.walkMax : 492, P.y + 26), n: 0, fall: null };
    }
    if (toy === 'kite') play.kite = { x: 450, y: 120, tx: 450, ty: 120, swoop: 0, t: 0 };
    const bar = root.querySelector('#h-play');
    bar.hidden = false;
    bar.innerHTML = `<span>${DG.TOYS[toy].icon} ${DG.TOYS[toy].tip}</span> <b id="play-count">0</b> <button class="btn small">Done</button>`;
    bar.querySelector('button').onclick = () => endPlay();
  }
  function endPlay() {
    if (!play) return;
    play = null; P.rot = 0; const bar = root && root.querySelector('#h-play'); if (bar) bar.hidden = true;
    DG.save();
  }
  function playReward(text) {
    const p = DG.pet();
    DG.addNeeds({ happiness: 5, energy: -0.8 });
    p.care.plays++; play.count++;
    hearts(3); floatText(text || '+5 ♥');
    const pc = root.querySelector('#play-count'); if (pc) pc.textContent = play.count;
    if (play.count % 5 === 0) {
      const c = DG.careCoins(3);
      DG.ui.toast(c ? `🎉 Play challenge: ${play.count} plays! +${c} 🪙` : `🎉 ${play.count} plays! (Today's care coins are maxed — still fun!)`, c ? 'gold' : '');
      if (c) DG.audio.play('coin');
    }
    renderHud();
    if (p.needs.energy < 8) { say('So tired...'); DG.ui.toast(`${pname()} is worn out. Time for a nap!`); endPlay(); }
  }
  function playClick(pt) {
    if (!play) return;
    if (play.toy === 'ball') {
      const b = play.ball; if (b.state !== 'held') return;
      const ex = Math.max(80, Math.min(840, pt.x)), ey = Math.max(350, Math.min(490, pt.y));
      Object.assign(b, { state: 'fly', sx: P.x, sy: P.y - size() * 0.6, ex, ey, t: 0 });
      DG.audio.play('whoosh'); P.mood = 'surprised'; P.moodT = 0.6;
    } else if (play.toy === 'mushroom') {
      const m = play.mush;
      if (Math.hypot(pt.x - m.x, pt.y - (m.y - 30)) < 70) {
        m.sq = 1; DG.audio.play('squeak');
        P.hopV = 380; P.mood = 'joy'; P.moodT = 1;
        parts.push({ kind: 'text', text: 'SQUEAK!', x: m.x, y: m.y - 80, vy: -50, size: 18, life: 1, max: 1, color: '#d65c4a', bold: true });
        playReward('Hee hee!');
      } else {
        m.x = Math.max(80, Math.min(840, pt.x)); m.y = Math.max(360, Math.min(490, pt.y));
        walkTo({ x: m.x - 110, y: m.y }, null);
      }
    } else if (play.toy === 'hoop') {
      if (play.hoop) return;
      if (P.walking) return;
      play.hoop = { x: -60, y: P.y, jumped: false };
      DG.audio.play('whoosh');
    } else if (play.toy === 'bubbles') {
      if (play.bubs.length > 7) return;
      DG.audio.play('pop');
      for (let i = 0; i < 3; i++) play.bubs.push({ x: pt.x + rand(-30, 30), y: Math.min(440, pt.y) + rand(-20, 20), vx: rand(-25, 25), vy: rand(-30, -12), r: rand(14, 24), w: rand(0, 6), life: rand(5, 8) });
      chaseBubble();
    } else if (play.toy === 'drum') {
      const d = play.drum;
      if (Math.hypot(pt.x - d.x, pt.y - (d.y - 40)) < 95) { // tap the drum (or your dumpling) to play it
        d.hit = 1; d.side = -d.side; DG.audio.play('drum'); P.squash = 0.06;
        const now = T; play.beats.push(now); play.beats = play.beats.filter((b) => now - b < 2.5);
        parts.push({ kind: 'text', text: pick(['♪', '♫', 'BOM!', 'ba-dum!']), x: d.x + rand(-20, 20), y: d.y - 80, vy: -60, size: 22, life: 1, max: 1, color: '#c96f3a', bold: true });
        P.mood = 'joy'; P.moodT = 0.6;
        play.dance = Math.min(3, play.dance + 0.45);
        if (play.beats.length >= 6) { play.beats = []; say(pick(['Dance party!', 'Groovy!', '♪ La la la ♪']), 1.4); playReward('Groovy!'); }
      } else { // tap elsewhere: carry the drum over there
        walkTo({ x: Math.max(80, Math.min(R.W - 80, pt.x)), y: Math.max(420, Math.min(CAM.on ? CAM.walkMax : 480, pt.y)) }, () => { P.flip = false; });
      }
    } else if (play.toy === 'feather') {
      const f = play.feather;
      f.tx = Math.max(60, Math.min(860, pt.x)); f.ty = Math.max(240, Math.min(470, pt.y));
      DG.audio.play('whoosh');
      walkTo({ x: f.tx, y: Math.max(420, Math.min(490, f.ty + 60)) }, () => {
        if (!play || play.toy !== 'feather') return;
        P.hopV = 520; DG.audio.play('jump'); P.mood = 'joy'; P.moodT = 1;
        if (Math.hypot(play.feather.x - P.x, play.feather.y - (P.y - 60)) < 140) { say(pick(['Got it!', 'Pounce!', 'Tickly!']), 1.2); playReward('Pounce!'); }
      });
    } else if (play.toy === 'blocks') {
      const b = play.blocks;
      if (b.fall) return;
      b.n++; DG.audio.play('stack');
      if (b.n >= 5 || (b.n >= 3 && Math.random() < 0.3)) {
        walkTo({ x: b.x + (P.x < b.x ? -70 : 70), y: b.y - 20 }, () => {
          if (!play || play.toy !== 'blocks') return;
          b.fall = { t: 0, n: b.n, pieces: Array.from({ length: b.n }, (_, i) => ({ x: b.x, y: b.y - i * 34 - 17, vx: rand(60, 240) * (P.x < b.x ? 1 : -1), vy: rand(-260, -80), r: 0, vr: rand(-6, 6) })) };
          DG.audio.play('thud'); P.hopV = 360; P.mood = 'joy'; P.moodT = 1.5; say('CRASH! Hee hee!', 1.6);
          playReward('Crash!');
        });
      } else say(pick(['Higher!', 'Ooh!', 'Careful...']), 0.9);
    } else if (play.toy === 'kite') {
      const k = play.kite;
      k.tx = Math.max(80, Math.min(820, pt.x)); k.ty = Math.max(60, Math.min(260, pt.y)); k.swoop = 1.3;
      DG.audio.play('whoosh');
      walkTo({ x: k.tx, y: 455 }, null);
    }
  }
  function chaseBubble() {
    if (!play || play.toy !== 'bubbles' || P.walking || !play.bubs.length) return;
    const b = play.bubs.reduce((best, x) => (Math.abs(x.x - P.x) < Math.abs(best.x - P.x) ? x : best), play.bubs[0]);
    walkTo({ x: Math.max(60, Math.min(860, b.x)), y: Math.max(420, Math.min(490, P.y)) }, () => {
      if (!play || play.toy !== 'bubbles') return;
      P.hopV = 480; DG.audio.play('jump');
      setTimeout(() => {
        if (!play || play.toy !== 'bubbles') return;
        const hit = play.bubs.filter((x) => Math.abs(x.x - P.x) < 70);
        if (hit.length) {
          hit.forEach((x) => { x.life = 0; for (let k = 0; k < 6; k++) parts.push({ kind: 'dot', color: '#bfe3ff', x: x.x, y: x.y, vx: rand(-90, 90), vy: rand(-90, 60), size: 3, life: 0.5, max: 0.5 }); });
          DG.audio.play('pop'); playReward(hit.length > 1 ? `Pop x${hit.length}!` : 'Pop!');
        }
        setTimeout(chaseBubble, 350);
      }, 220);
    });
  }
  function updatePlay(dt) {
    if (!play) return;
    if (play.toy === 'ball') {
      const b = play.ball;
      if (b.state === 'held') { b.x = P.x + (P.flip ? -30 : 30); b.y = P.y - 10 - P.hop; }
      else if (b.state === 'fly') {
        b.t += dt / 0.7; const k = Math.min(1, b.t);
        b.x = b.sx + (b.ex - b.sx) * k; b.y = b.sy + (b.ey - b.sy) * k - Math.sin(Math.PI * k) * 140;
        if (k >= 1) { // land, then keep bouncing and rolling in the direction it was thrown
          DG.audio.play('boing');
          Object.assign(b, { state: 'bounce', gx: b.ex, gy: b.ey, z: 0, vz: 330, vx: (b.ex - b.sx) * 0.75, vy: (b.ey - b.sy) * 0.25 });
          P.mood = 'joy'; P.moodT = 1;
        }
      } else if (b.state === 'bounce') {
        const maxY = CAM.on ? CAM.walkMax : 495;
        b.vz -= 1500 * dt; b.z += b.vz * dt;
        if (b.z <= 0) {
          b.z = 0;
          if (b.vz < -90) { b.vz = -b.vz * 0.55; DG.audio.play('boing'); } else b.vz = 0;
        }
        const fr = b.z > 0 ? 0.25 : 2.4; // rolls to a stop once it stops bouncing
        b.vx *= Math.max(0, 1 - fr * dt); b.vy *= Math.max(0, 1 - fr * dt);
        b.gx += b.vx * dt; b.gy += b.vy * dt;
        if (b.gx < 70) { b.gx = 70; b.vx = Math.abs(b.vx) * 0.7; DG.audio.play('boing'); }
        if (b.gx > R.W - 70) { b.gx = R.W - 70; b.vx = -Math.abs(b.vx) * 0.7; DG.audio.play('boing'); }
        if (b.gy < 415) { b.gy = 415; b.vy = Math.abs(b.vy) * 0.6; }
        if (b.gy > maxY) { b.gy = maxY; b.vy = -Math.abs(b.vy) * 0.6; }
        b.x = b.gx; b.y = b.gy - b.z;
        if (!P.walking || Math.hypot(P.tx - b.gx, P.ty - b.gy) > 40) walkTo({ x: b.gx, y: b.gy }); // chase it
        if (b.z === 0 && b.vz === 0 && Math.hypot(b.vx, b.vy) < 12) {
          b.state = 'ground';
          walkTo({ x: b.gx, y: b.gy }, () => { b.state = 'held'; DG.audio.play('squeak'); P.hopV = 300; say(pick(['Got it!', 'Again!', 'Wheee!']), 1.2); playReward(); });
        }
      }
    } else if (play.toy === 'mushroom') {
      play.mush.sq = Math.max(0, play.mush.sq - dt * 3);
    } else if (play.toy === 'hoop' && play.hoop) {
      const h = play.hoop; h.x += 340 * dt;
      if (!h.jumped && Math.abs(h.x - P.x) < 80) { h.jumped = true; P.hopV = 560; DG.audio.play('jump'); }
      if (h.x > 980) { play.hoop = null; if (h.jumped) { say('Through the hoop!', 1.3); playReward('Nice jump!'); } }
    } else if (play.toy === 'bubbles') {
      play.bubs.forEach((b) => { b.x += (b.vx + Math.sin(T * 2 + b.w) * 15) * dt; b.y += b.vy * dt; b.life -= dt; });
      play.bubs = play.bubs.filter((b) => b.life > 0 && b.y > 60);
      if (!P.walking && play.bubs.length && P.hop <= 0) chaseBubble();
    } else if (play.toy === 'drum') {
      const d = play.drum;
      d.hit = Math.max(0, d.hit - dt * 5);
      d.x += (P.x - d.x) * Math.min(1, dt * 12); d.y = P.y + 34; // the drum stays right in front
      P.squash *= Math.max(0, 1 - dt * 10);
      play.dance = Math.max(0, play.dance - dt);
      if (play.dance > 0.2 && !P.walking) P.rot = Math.sin(T * 8) * 0.08 * Math.min(1, play.dance); // sway to the beat
      else if (!P.action) P.rot *= 0.85;
    } else if (play.toy === 'feather') {
      const f = play.feather;
      f.x += (f.tx - f.x) * Math.min(1, dt * 5) + Math.sin(T * 3) * 0.6; f.y += (f.ty - f.y) * Math.min(1, dt * 5) + Math.cos(T * 4) * 0.5;
    } else if (play.toy === 'blocks' && play.blocks.fall) {
      const fl = play.blocks.fall; fl.t += dt;
      const fy = play.blocks.y + 6; fl.pieces.forEach((q) => { q.vy += 900 * dt; q.x += q.vx * dt; q.y = Math.min(fy, q.y + q.vy * dt); if (q.y >= fy) { q.vx *= 0.9; q.vy = 0; } q.r += q.vr * dt * (q.vy ? 1 : 0.2); });
      if (fl.t > 1.6) { play.blocks.fall = null; play.blocks.n = 0; }
    } else if (play.toy === 'kite') {
      const k = play.kite; k.t += dt;
      k.swoop = Math.max(0, k.swoop - dt);
      const wantY = k.swoop > 0 ? k.ty + 160 * Math.sin((1.3 - k.swoop) / 1.3 * Math.PI) : 110 + Math.sin(k.t * 1.3) * 25;
      k.x += (k.tx - k.x) * Math.min(1, dt * 2.5); k.y += (wantY - k.y) * Math.min(1, dt * 4);
      if (k.swoop > 0 && !k.jumped && k.y > 250 && Math.abs(k.x - P.x) < 110) {
        k.jumped = true; P.hopV = 600; DG.audio.play('jump'); say(pick(['Almost!', 'Wheee!', 'Up up up!']), 1.2); playReward('Wheee!');
      }
      if (k.swoop <= 0) k.jumped = false;
    }
  }
  function drawBall() {
    if (!play || play.toy !== 'ball') return;
      const b = play.ball;
    if (b.state !== 'held') {
      const fly = b.state === 'fly', sx = fly ? b.sx + (b.ex - b.sx) * Math.min(1, b.t) : b.state === 'bounce' ? b.gx : b.x;
      const sy = fly ? b.sy + (b.ey - b.sy) * Math.min(1, b.t) + 20 : b.state === 'bounce' ? b.gy + 2 : b.y + 2;
      const k = b.state === 'bounce' ? Math.max(0.45, 1 - b.z / 160) : 1;
      ctx.fillStyle = `rgba(90,55,30,${0.18 * k})`; ctx.beginPath(); ctx.ellipse(sx, sy, 16 * k, 5 * k, 0, 0, TAU); ctx.fill();
    }
    DG.draw.toy(ctx, 'ball', b.x, b.y + 6, 1.05, { rot: (b.state === 'bounce' ? b.gx : b.x) / 17 });
  }
  function drawPlay() {
    if (!play) return;
    if (play.toy === 'ball') {
      // drawn depth-sorted with the furniture (see drawBall)
    } else if (play.toy === 'mushroom') {
      const m = play.mush, s = 1 - m.sq * 0.3;
      ctx.save(); ctx.translate(m.x, m.y); ctx.scale(1 + m.sq * 0.3, s);
      ctx.fillStyle = 'rgba(90,55,30,0.15)'; ctx.beginPath(); ctx.ellipse(0, 2, 30, 6, 0, 0, TAU); ctx.fill();
      DG.draw.toy(ctx, 'mushroom', 0, 0, 1.05);
      ctx.restore();
    } else if (play.toy === 'hoop' && play.hoop) {
      const h = play.hoop;
      DG.draw.toy(ctx, 'hoop', h.x, h.y - 2, 1, { r: 68, rot: h.x / 60 });
    } else if (play.toy === 'bubbles') {
      play.bubs.forEach((b) => {
        ctx.globalAlpha = Math.min(1, b.life);
        ctx.fillStyle = 'rgba(220,240,255,0.45)'; ctx.strokeStyle = 'rgba(140,190,240,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.22, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      });
    } else if (play.toy === 'drum') {
      const d = play.drum, k = 1 + d.hit * 0.08;
      ctx.save(); ctx.translate(d.x, d.y); ctx.scale(k, 2 - k);
      ctx.fillStyle = 'rgba(90,55,30,0.15)'; ctx.beginPath(); ctx.ellipse(0, 2, 40, 7, 0, 0, TAU); ctx.fill();
      DG.draw.toy(ctx, 'drum', 0, 0, 1.1, { hit: d.hit, noSticks: true });
      ctx.restore();
    } else if (play.toy === 'feather') {
      const f = play.feather;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(Math.PI + 0.4 + Math.sin(T * 5) * 0.4);
      DG.draw.toy(ctx, 'feather', 0, 0, 1, { t: T });
      ctx.restore();
    } else if (play.toy === 'blocks') {
      const b = play.blocks, cols = ['#ff8f7d', '#7fb2ff', '#ffd36a', '#6fd3b5', '#c49bff'];
      const drawBlock = (x, y, i, r) => { ctx.save(); ctx.translate(x, y); ctx.rotate(r || 0); DG.draw.toy(ctx, 'block', 0, 15, 1.1, { color: cols[i % 5], letter: 'ABCDE'[i % 5] }); ctx.restore(); };
      if (b.fall) b.fall.pieces.forEach((q, i) => drawBlock(q.x, q.y, i, q.r));
      else for (let i = 0; i < b.n; i++) drawBlock(b.x + Math.sin(T * 3 + i) * i * 0.8, b.y - i * 34 - 17, i);
      if (!b.fall && !b.n) { ctx.fillStyle = 'rgba(90,70,54,0.4)'; ctx.font = '600 14px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('tap to stack', b.x, b.y); }
    } else if (play.toy === 'kite') {
      const k = play.kite;
      ctx.strokeStyle = 'rgba(90,70,54,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(k.x, k.y + 30);
      ctx.quadraticCurveTo((k.x + P.x) / 2, Math.max(k.y, P.y - 200), P.x + 20, P.y - size() * 0.5 - P.hop); ctx.stroke();
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(Math.sin(k.t * 2) * 0.15);
      DG.draw.toy(ctx, 'kite', 0, 50, 1.15, { t: k.t });
      ctx.restore();
    }
  }

  /* ---------- Walk ---------- */
  function goWalk() {
    const p = DG.pet();
    if (busy || play) { DG.ui.toast('One thing at a time! 🥟'); return; }
    if (p.needs.energy < 15) { wakeIfAsleep(); say('Too tired...'); DG.ui.toast(`${pname()} is too tired for a walk. Let it rest first!`); return; }
    wakeIfAsleep();
    busy = true; say(pick(['Walkies!', 'Adventure time!', 'Outside!!']), 1.2); P.hopV = 380; DG.audio.play('squeak');
    walkTo({ x: R.W - 40, y: 470 }, () => {
      busy = false;
      DG.Walk.open();
      P.x = R.spots.home.x; P.y = R.spots.home.y; P.flip = false;
    });
  }

  /* ---------- Bath ---------- */
  function openBath() {
    const p = DG.pet();
    if (busy || play) { DG.ui.toast('One thing at a time! 🥟'); return; }
    wakeIfAsleep();
    if (p.needs.cleanliness >= 98) { say('Already sparkly!'); DG.ui.toast(`${pname()} is already squeaky clean!`); return; }
    busy = true; say(pick(['Bath time!', 'Splish splash!', 'Bubbles!']), 1.4);
    walkTo(R.spots.tub, () => {
      P.flip = true; P.hopV = 420; DG.audio.play('splash'); P.inTub = true;
      for (let i = 0; i < 10; i++) parts.push({ kind: 'bubble', x: R.spots.tub.x + rand(-60, 60), y: R.tub.y + 30, vx: rand(-30, 30), vy: rand(-90, -40), size: rand(5, 10), life: 1, max: 1 });
      setTimeout(() => { busy = false; bathModal(); }, 650);
    });
  }
  function bathModal() {
    const p = DG.pet();
    const BW = 520, BH = 400;
    const n = Math.max(5, Math.min(12, Math.round((100 - p.needs.cleanliness) / 7)));
    const spots = [];
    for (let i = 0; i < n; i++) spots.push({ x: rand(-0.65, 0.65), y: rand(-0.95, -0.3) * (p.type === 'gyoza' ? 0.75 : 1), r: rand(0.09, 0.14), a: 1, done: false });
    const bubbles = [], fx = [];
    let phase = 'scrub', drag = false, lastPt = null, raf2 = 0, done = false, t = 0;
    const startClean = p.needs.cleanliness;
    const cx = BW / 2, cy = 330, U = 125;
    DG.ui.modal({
      title: '🛁 Bath Time', wide: true, cls: 'bath-modal',
      html: `<p class="bath-msg" id="bath-msg">Rub the dirty spots to scrub them! 🧽</p><canvas class="bath-canvas" id="bath-canvas"></canvas>`,
      buttons: [{ label: 'Done', cls: 'ghost' }],
      onClose() {
        cancelAnimationFrame(raf2);
        P.inTub = false; P.flip = false; P.x = R.spots.tub.x + 70; P.hopV = 380;
        if (!done) {
          const frac = spots.filter((s) => s.done).length / spots.length * 0.6 + (phase === 'rinse' ? 0.3 : 0);
          p.needs.cleanliness = Math.min(100, startClean + (100 - startClean) * frac);
          DG.save(); renderHud();
        }
      },
      onOpen(el) {
        const cv = el.querySelector('#bath-canvas'), c2 = cv.getContext('2d'), msg = el.querySelector('#bath-msg');
        const check = (pt, moved) => {
          if (phase === 'scrub') {
            spots.forEach((s) => {
              if (s.done) return;
              const sx = cx + s.x * U, sy = cy + s.y * U;
              if (Math.hypot(pt.x - sx, pt.y - sy) < s.r * U + 28) {
                s.a -= moved * 0.0045;
                if (Math.random() < 0.3) fx.push({ kind: 'bubble', x: pt.x + rand(-10, 10), y: pt.y + rand(-10, 10), vy: -30, size: rand(4, 8), life: 0.6, max: 0.6 });
                if (s.a <= 0) {
                  s.done = true; s.a = 0; DG.audio.play('pop');
                  for (let k = 0; k < 4; k++) bubbles.push({ x: sx + rand(-25, 25), y: sy + rand(-20, 20), r: rand(10, 18), w: rand(0, 6) });
                }
              }
            });
            if (spots.every((s) => s.done)) { phase = 'rinse'; msg.innerHTML = 'Sparkly! Now <b>rinse off the bubbles</b> 🚿 — rub over them with the shower.'; DG.audio.play('good'); }
          } else if (phase === 'rinse') {
            for (let i = bubbles.length - 1; i >= 0; i--) {
              const b = bubbles[i];
              if (Math.hypot(pt.x - b.x, pt.y - b.y) < b.r + 30) {
                bubbles.splice(i, 1); DG.audio.play('pop');
                for (let k = 0; k < 4; k++) fx.push({ kind: 'dot', color: '#8fd0ff', x: b.x, y: b.y, vx: rand(-80, 80), vy: rand(-120, 0), g: 500, size: 3, life: 0.6, max: 0.6 });
              }
            }
            if (!bubbles.length) finish();
          }
        };
        const finish = () => {
          phase = 'done'; done = true;
          p.needs.cleanliness = 100; DG.addNeeds({ happiness: 8 });
          p.care.baths++; DG.state.counters.baths++;
          DG.unlock('firstBath');
          const c = DG.careCoins(3);
          msg.innerHTML = `✨ All clean! ${pname()} is squeaky clean and happy. ${c ? `<b>+${c} 🪙</b>` : ''}`;
          DG.audio.play('fanfare');
          for (let k = 0; k < 14; k++) fx.push({ kind: 'star', x: cx + rand(-120, 120), y: cy - rand(20, 260), vy: -20, size: rand(6, 12), life: 1.5, max: 1.5 });
          DG.save(); renderHud();
        };
        cv.addEventListener('pointerdown', (e) => { drag = true; lastPt = DG.ui.toLogical(cv, e, BW); cv.setPointerCapture(e.pointerId); });
        cv.addEventListener('pointerup', () => { drag = false; lastPt = null; });
        cv.addEventListener('pointermove', (e) => {
          const pt = DG.ui.toLogical(cv, e, BW); cv._pt = pt;
          if (!drag) return;
          const moved = lastPt ? Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) : 0;
          lastPt = pt; check(pt, moved);
        });
        let lt = performance.now();
        const frame = (now) => {
          if (!cv.isConnected) return;
          const dt = Math.min(0.05, (now - lt) / 1000); lt = now; t += dt;
          const k = DG.ui.fitCanvas(cv, BW, BH); c2.setTransform(k, 0, 0, k, 0, 0);
          c2.fillStyle = '#dff1ff'; c2.fillRect(0, 0, BW, BH);
          c2.fillStyle = '#cfe8fb';
          for (let x = 0; x < BW; x += 40) for (let y = 0; y < 260; y += 40) if (((x + y) / 40) % 2 === 0) c2.fillRect(x, y, 40, 40);
          c2.fillStyle = '#9fd6ff'; c2.beginPath(); c2.ellipse(cx, cy - 10, 220, 30, 0, 0, TAU); c2.fill();
          DG.draw.dumpling(c2, { type: p.type, look: p.look, x: cx, y: cy, size: U * 2, t, stage: DG.stageIndex(), shadow: false,
            mood: phase === 'done' ? 'joy' : drag ? 'squeak' : 'happy', accessory: null, trait: p.trait, dirt: spots, squash: Math.sin(t * 3) * 0.015 });
          bubbles.forEach((b) => {
            const by = b.y + Math.sin(t * 2 + b.w) * 3;
            c2.fillStyle = 'rgba(255,255,255,0.85)'; c2.strokeStyle = 'rgba(140,190,240,0.9)'; c2.lineWidth = 2;
            c2.beginPath(); c2.arc(b.x, by, b.r, 0, TAU); c2.fill(); c2.stroke();
            c2.fillStyle = 'rgba(255,255,255,1)'; c2.beginPath(); c2.arc(b.x - b.r * 0.3, by - b.r * 0.3, b.r * 0.25, 0, TAU); c2.fill();
          });
          // tub front
          c2.fillStyle = '#fff'; DG.roundRect(c2, 20, cy - 10, BW - 40, 120, 50); c2.fill();
          c2.strokeStyle = '#bcd6ea'; c2.lineWidth = 4; c2.stroke();
          c2.fillStyle = '#ffd36a'; c2.beginPath(); c2.ellipse(BW - 90, cy - 18, 18, 13, 0, 0, TAU); c2.fill(); c2.beginPath(); c2.arc(BW - 80, cy - 34, 10, 0, TAU); c2.fill();
          DG.draw.updateParticles(fx, dt); fx.forEach((pp) => DG.draw.particle(c2, pp));
          if (cv._pt && phase !== 'done') {
            c2.font = '40px serif'; c2.textAlign = 'center'; c2.fillText(phase === 'scrub' ? '🧽' : '🚿', cv._pt.x, cv._pt.y + 14);
            if (phase === 'rinse' && drag) for (let i = 0; i < 2; i++) fx.push({ kind: 'dot', color: '#7cc4ff', x: cv._pt.x + rand(-14, 14), y: cv._pt.y + 20, vy: 300, size: 3, life: 0.3, max: 0.3 });
          }
          // progress
          const prog = phase === 'scrub' ? spots.filter((s) => s.done).length / spots.length * 0.5 : phase === 'rinse' ? 0.5 + 0.5 * (1 - bubbles.length / Math.max(1, spots.length * 4)) : 1;
          c2.fillStyle = 'rgba(255,255,255,0.8)'; DG.roundRect(c2, 20, BH - 34, BW - 40, 18, 9); c2.fill();
          c2.fillStyle = '#7fd8a6'; DG.roundRect(c2, 20, BH - 34, (BW - 40) * prog, 18, 9); c2.fill();
          raf2 = requestAnimationFrame(frame);
        };
        raf2 = requestAnimationFrame(frame);
      },
    });
  }

  /* ---------- Personality moments ---------- */
  function doMoment() {
    const p = DG.pet(), n = p.needs;
    const opts = ['wander', 'wander', 'chase', 'hiccup', 'look'];
    if (n.energy < 40) opts.push('nap', 'nap');
    if (n.fullness < 30 || n.energy < 25) opts.push('grumble');
    const m = pick(opts);
    if (m === 'wander') walkTo({ x: rand(330, 650), y: rand(440, 480) });
    else if (m === 'chase') { P.action = 'chase'; P.actionT = 2.2; say('*chases its own pleat!*', 2); DG.audio.play('boing'); }
    else if (m === 'hiccup') { P.action = 'hiccup'; P.actionT = 2.0; P.hicN = 0; }
    else if (m === 'look') { P.mood = 'joy'; P.moodT = 1.5; say(pick(['♪', 'Hi!', '♥', 'La la~']), 1.5); parts.push({ kind: 'star', x: P.x + 40, y: P.y - size(), vy: -30, size: 10, life: 1, max: 1 }); }
    else if (m === 'nap') {
      busy = true;
      walkTo({ x: R.spots.bowl.x + 10, y: R.spots.bowl.y }, () => { P.action = 'doze'; P.actionT = 6; say('*dozed off by the bowl*', 2.5); DG.audio.play('snore'); });
    } else if (m === 'grumble') { say(n.fullness < 30 ? 'Tummy rumbles...' : 'So sleepy...', 2); P.mood = n.fullness < 30 ? 'grumpy' : 'sleepy'; P.moodT = 2; }
    P.momentT = rand(10, 22);
  }

  /* ---------- Main loop ---------- */
  function update(dt) {
    const p = DG.pet(); if (!p) return;
    T += dt;
    if (p.asleep) {
      P.zzzT -= dt;
      if (P.zzzT <= 0) { P.zzzT = 1.2; parts.push({ kind: 'text', text: 'z', x: DG.bedPoint(860, 0).x + 30, y: DG.bedPoint(0, 440).y - 90, vx: 20, vy: -35, size: 18 + Math.random() * 10, life: 2, max: 2, color: '#8a7ab8', bold: true }); }
    }
    if (p._justWoke) { // the clock woke the dumpling up (morning, or a full nap)
      delete p._justWoke; p.asleep = true; wake(true);
    }
    // walking
    if (P.walking) {
      const dx = P.tx - P.x, dy = P.ty - P.y, d = Math.hypot(dx, dy);
      const sp = 190 * (0.8 + DG.stage().scale * 0.3);
      if (d < 4) {
        P.walking = false; P.x = P.tx; P.y = P.ty;
        const cb = P.onArrive; P.onArrive = null; if (cb) cb();
      } else {
        P.x += (dx / d) * Math.min(d, sp * dt); P.y += (dy / d) * Math.min(d, sp * dt);
        if (Math.abs(dx) > 2) P.flip = dx < 0;
        if (P.hop <= 0 && P.hopV === 0) P.hopV = 170;
      }
    }
    // hop physics
    if (P.hop > 0 || P.hopV !== 0) {
      P.hopV -= 1500 * dt; P.hop += P.hopV * dt;
      if (P.hop <= 0) { if (P.hopV < -250) P.squash = Math.min(0.22, -P.hopV / 2500); P.hop = 0; P.hopV = 0; }
    }
    P.squash *= Math.max(0, 1 - dt * 9);
    // actions
    if (P.action) {
      P.actionT -= dt;
      if (P.action === 'eat') {
        P.munchT -= dt;
        if (P.munchT <= 0) { P.munchT = 0.6; DG.audio.play('munch'); for (let i = 0; i < 3; i++) parts.push({ kind: 'dot', color: '#fff1d6', x: P.x - 40, y: P.y - 40, vx: rand(-60, 20), vy: rand(-120, -40), g: 500, size: 3, life: 0.6, max: 0.6 }); }
        if (P.actionT <= 0) { P.action = null; finishEat(P.eatId); }
      } else if (P.action === 'chase') {
        P.flip = Math.sin(T * 14) > 0; P.rot = Math.sin(T * 14) * 0.25;
        if (P.hop <= 0) P.hopV = 140;
        if (P.actionT <= 0) { P.action = null; P.rot = 0; P.mood = 'dizzy'; P.moodT = 1.2; }
      } else if (P.action === 'hiccup') {
        const k = Math.floor((2.0 - P.actionT) / 0.6);
        if (k > P.hicN && k <= 3) {
          P.hicN = k; P.hopV = 260; DG.audio.play('hiccup'); P.mood = 'surprised'; P.moodT = 0.4;
          parts.push({ kind: 'text', text: 'hic!', x: P.x + 50, y: P.y - size(), vy: -40, size: 18, life: 1, max: 1, color: '#8a6a50', bold: true });
          for (let i = 0; i < 4; i++) parts.push({ kind: 'steam', x: P.x + rand(-15, 15), y: P.y - size() * 1.1, vx: rand(-20, 20), vy: -60, size: rand(6, 11), life: 1, max: 1 });
        }
        if (P.actionT <= 0) P.action = null;
      } else if (P.action === 'doze') {
        P.zzzT -= dt;
        if (P.zzzT <= 0) { P.zzzT = 1.1; parts.push({ kind: 'text', text: 'z', x: P.x + 30, y: P.y - size(), vx: 15, vy: -30, size: 16, life: 1.6, max: 1.6, color: '#8a7ab8', bold: true }); }
        if (P.actionT <= 0) { P.action = null; busy = false; say('*snort* Huh?', 1.4); DG.addNeeds({ energy: 4 }); }
      }
    }
    // idle moments
    if (!P.action && !P.walking && !busy && !play && !p.asleep && !DG.ui.anyModal()) {
      P.momentT -= dt;
      if (P.momentT <= 0) doMoment();
    }
    if (P.moodT > 0) { P.moodT -= dt; if (P.moodT <= 0) P.mood = null; }
    if (P.speechT > 0) P.speechT -= dt;
    P.blinkT -= dt;
    if (P.blinkT <= 0) { P.blinkOn = 0.13; P.blinkT = rand(2, 5); }
    if (P.blinkOn > 0) P.blinkOn -= dt;
    if (partyT > 0) { partyT -= dt; if (Math.random() < 0.3) DG.draw.confetti(parts, rand(100, 800), 0, 1); if (P.hop <= 0) P.hopV = 300; P.rot = Math.sin(T * 8) * 0.15; if (partyT <= 0) P.rot = 0; }
    updatePlay(dt);
    DG.draw.updateParticles(parts, dt);
  }

  function draw() {
    const p = DG.pet(); if (!p) return;
    if (!CAM.measured) layoutRoom();
    if (CAM.on) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), bw = Math.round(CAM.cssW * dpr), bh = Math.round(CAM.cssH * dpr);
      canvas.style.height = CAM.cssH + 'px';
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      // follow the dumpling unless you've just swiped around
      if (T - CAM.userT > 4) CAM.x += (clampCam(P.x - CAM.vw / 2) - CAM.x) * 0.06;
      const sc = dpr * CAM.s;
      ctx.setTransform(sc, 0, 0, sc, -CAM.x * sc, CAM.E * sc);
    } else {
      const k = DG.ui.fitCanvas(canvas, R.W, R.H + CAM.F);
      ctx.setTransform(k, 0, 0, k, 0, 0);
    }
    const st = DG.state;
    const si = DG.stageIndex(), s = size();
    // your dumpling and the ball are depth-sorted with the furniture, so they can go behind the bath, bed and so on
    const sprites = [];
    if (!p.asleep && !P.inTub) sprites.push({ y: P.y, draw: () => drawPet(p, si, s) });
    if (play && play.toy === 'ball') { const b = play.ball; sprites.push({ y: b.state === 'held' ? P.y + 1 : b.state === 'bounce' ? b.gy : b.state === 'fly' ? b.sy + (b.ey - b.sy) * Math.min(1, b.t) + 20 : b.y, draw: drawBall }); }
    DG.draw.room(ctx, { t: T, decor: st.equipped.decor, bowlFood, toys: st.inventory.toys, labels: false, home: st.home, top: CAM.E, bottom: CAM.F, sprites });
    if (p.asleep) {
      const b = R.spots.bed;
      DG.draw.dumpling(ctx, { type: p.type, look: p.look, x: DG.bedPoint(860, 0).x, y: DG.bedPoint(0, 440).y, size: Math.min(s, 150), t: T, mood: 'sleeping', stage: si, accessory: p.accessory, trait: p.trait,
        squash: Math.sin(T * 1.6) * 0.03, shadow: false });
      DG.draw.bedBlanket(ctx, true);
    } else if (P.inTub) {
      const tb = R.tub;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, R.W, tb.y + 34); ctx.clip();
      DG.draw.dumpling(ctx, { type: p.type, look: p.look, x: tb.x + tb.w / 2, y: tb.y + 30 + s * 0.45 - P.hop * 0.3, size: s, t: T, mood: 'joy', stage: si, accessory: null, trait: p.trait, shadow: false, squash: Math.sin(T * 3) * 0.03 });
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(tb.x + 30 + i * 26, tb.y + 30 + Math.sin(T * 3 + i) * 3, 10 + (i % 3) * 2, 0, TAU); ctx.fill(); }
    } else {
      const n = p.needs;
      if (n.cleanliness < 30 && Math.random() < 0.05) parts.push({ kind: 'dot', color: 'rgba(130,110,80,0.6)', x: P.x + rand(-40, 40), y: P.y - s * 0.9, vx: rand(-20, 20), vy: -20, size: 2, life: 1, max: 1 });
    }
    drawPlay();
    parts.forEach((pp) => DG.draw.particle(ctx, pp));
    if (P.speechT > 0 && P.speech) {
      const bx = p.asleep ? DG.bedPoint(860, 0).x - 40 : P.x, by = (p.asleep ? DG.bedPoint(0, 440).y - 110 : P.y - s * 1.3 - P.hop) - 10;
      ctx.font = '600 17px Fredoka, sans-serif';
      const w = ctx.measureText(P.speech).width + 24;
      const x0 = Math.max(10, Math.min(R.W - w - 10, bx - w / 2));
      ctx.globalAlpha = Math.min(1, P.speechT * 3);
      ctx.fillStyle = '#fff'; DG.roundRect(ctx, x0, by - 30, w, 34, 16); ctx.fill();
      ctx.strokeStyle = '#e9cdb6'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 8, by + 3); ctx.lineTo(bx, by + 14); ctx.lineTo(bx + 8, by + 3); ctx.fill();
      ctx.fillStyle = '#5a4636'; ctx.textAlign = 'center'; ctx.fillText(P.speech, x0 + w / 2, by - 7);
      ctx.globalAlpha = 1;
    }
  }
  function drawPet(p, si, s) {
    const n = p.needs;
    const mood = P.mood || (P.action === 'eat' ? 'munch' : P.action === 'doze' ? 'sleeping' : DG.mood());
    const breathe = Math.sin(T * (si === 0 ? 5 : 2.5)) * (si === 0 ? 0.035 : 0.02);
    const wobble = si === 0 ? Math.sin(T * 3.3) * 0.05 : 0;
    DG.draw.dumpling(ctx, {
      type: p.type, look: p.look, x: P.x, y: P.y, size: s, t: T, mood, stage: si, flip: P.flip, hop: P.hop,
      squash: P.squash + breathe, rot: P.rot + wobble, accessory: partyT > 0 ? 'party' : p.accessory, trait: p.trait,
      blink: P.blinkOn > 0, gaze: P.flip ? -1 : 1,
      dirt: n.cleanliness < 45 ? dirtSpots(n.cleanliness) : null,
      drum: play && play.toy === 'drum' && !P.walking ? { hit: play.drum.hit, side: play.drum.side } : null,
    });
    if (n.cleanliness < 35) drawStink(P.x, P.y - P.hop, s, n.cleanliness);
  }
  /** Stink lines rising off a dirty dumpling and little flies buzzing around it. */
  function drawStink(x, y, s, clean) {
    const k = Math.min(1, (35 - clean) / 25); // 0 just dirty .. 1 filthy
    const top = y - s * 0.75;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // wavy stink lines drifting upward
    const lines = 2 + Math.round(k);
    for (let i = 0; i < lines; i++) {
      const ph = ((T * 0.55 + i / lines) % 1), lx = x + (i - (lines - 1) / 2) * s * 0.32, ly = top - ph * s * 0.45;
      ctx.globalAlpha = (0.35 + 0.45 * k) * Math.sin(ph * Math.PI);
      ctx.strokeStyle = '#8fa85a'; ctx.lineWidth = Math.max(2.5, s * 0.03);
      ctx.beginPath();
      for (let j = 0; j <= 10; j++) {
        const t = j / 10, yy = ly - t * s * 0.32, xx = lx + Math.sin(t * Math.PI * 2 + T * 3 + i) * s * 0.045;
        j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // flies orbiting in loopy figure-eights
    const flies = clean < 15 ? 3 : 2;
    for (let i = 0; i < flies; i++) {
      const a = T * (2.2 + i * 0.4) + i * 2.1;
      const fx = x + Math.sin(a) * s * 0.7, fy = y - s * 0.6 + Math.sin(a * 2) * s * 0.22 - i * s * 0.08;
      const dir = Math.cos(a) > 0 ? 1 : -1, flap = Math.sin(T * 60 + i) > 0;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(1.8, 1.8); ctx.translate(-fx, -fy);
      ctx.fillStyle = 'rgba(210,235,255,0.85)'; ctx.strokeStyle = 'rgba(90,110,130,0.7)'; ctx.lineWidth = 1;
      [-1, 1].forEach((w) => { // wings
        ctx.beginPath(); ctx.ellipse(fx - dir * 1, fy - 4, 4, flap ? 2.5 : 4.5, w * 0.6 - dir * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = '#2b2b30'; ctx.beginPath(); ctx.ellipse(fx, fy, 4.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(fx + dir * 4.2, fy - 0.5, 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(fx + dir * 5, fy - 1.2, 0.9, 0, Math.PI * 2); ctx.fill();
      if (Math.sin(a * 3) > 0.92) { ctx.fillStyle = 'rgba(70,70,80,0.6)'; ctx.font = '600 11px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('bzz', fx, fy - 9); }
      ctx.restore();
    }
    ctx.restore();
  }
  const dirtCache = {};
  function dirtSpots(clean) {
    const n = Math.round((45 - clean) / 7) + 1;
    if (!dirtCache[n]) { dirtCache[n] = []; for (let i = 0; i < n; i++) dirtCache[n].push({ x: Math.sin(i * 7.3) * 0.6, y: -0.35 - ((i * 0.37) % 0.6), r: 0.1, a: 0.8 }); }
    return dirtCache[n];
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    try { update(dt); draw(); } catch (e) { console.error(e); }
    hudAcc += dt;
    if (hudAcc > 0.5) { hudAcc = 0; renderHud(); }
    raf = requestAnimationFrame(frame);
  }

  DG.Home = {
    enter() {
      DG.audio.homeTrack();
      if (!root || !root.children.length) build();
      P.x = R.spots.home.x; P.y = R.spots.home.y; P.walking = false; P.action = null; busy = false; bowlFood = null; P.rot = 0; P.inTub = false;
      renderHud();
      last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      DG.Menus.checkMilestones();
    },
    exit() { cancelAnimationFrame(raf); endPlay(); busy = false; P.action = null; },
    feed, startPlay, openBath, renderHud, say, bedtime,
    celebrate(text) { P.hopV = 450; P.mood = 'joy'; P.moodT = 2.5; say(text, 3); DG.draw.confetti(parts, P.x, P.y - 120, 40); hearts(6); DG.audio.play('fanfare'); },
    isBusy: () => busy || !!play,
  };
  DG.ui.register('home', DG.Home);
})(window.DG);
