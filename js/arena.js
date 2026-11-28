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
  /* Tap combat (single-player default). All times are in fight-seconds (they pause and slow with the match). */
  const TAP = {
    bubbleTime: 6, bubbleTimeRival: 5, bubbleReflect: 0.2, bubbleTake: 0.45, // Broth Bubble: how long it lasts, and how much damage bounces back
    hitCharge: 20,     // each of your normal hits that lands fills this much of the special meter (about 3 hits = one special)
    eHitCharge: 22, eDefCharge: 9, // the rival charges when its attacks land / when you defend them
    spWarn: 0.9,       // warning before a rival special
    spBlock: 0.35,     // damage you still take from a rival special while blocking
    windup: 0.65,      // enemy wind-up before impact (lower tiers get longer: see tapWindup)
    recover: 0.45,     // enemy recovery after an attack
    counter: 0.6,      // extra opening after you correctly dodge a red attack
    gapMin: 1.0, gapMax: 1.9, // pause between enemy attacks
    atkWindup: 0.1, atkLunge: 0.12, atkRecover: 0.22, // your basic attack
    blockHold: 0.45, dodgeHold: 0.42, defCd: 0.5,     // your block / dodge
    hitStun: 0.32,     // how long you're stunned when an attack lands
    atkGap: 0.3,       // minimum time between your basic attacks
    dodgeCost: 25,     // classic mode: stamina a dodge uses
    dodgeSta: 0.34, dodgeRegen: 0.14, // tap battles: dodging has its own energy (starts full, ~3 dodges in a row, refills in ~7 s)
    dodgeBack: 2.6,    // how far a dodge retreats (× size)
    spamWindow: 3.0,   // attacks inside this many seconds count as mashing…
    stumble: 2.0,      // …and a blocked attack leaves you stumbling (can't move or act) this long
    pummel: 3, pummelGap: 0.5, pummelDmg: 0.5, // while you stumble the rival gets free hits: count, spacing, damage × base
    tapRadius: 64,     // minimum tap target radius in CSS px (bigger on small screens)
    redDmg: 1.3, guardBreakDmg: 1.5,
  };
  /* Damage the existing special-move code already deals (as a multiple of base damage); tap mode rescales it to TAP_MOVES[id].power. */
  const MOVE_BASE = { steampuff: 1.1, crispydash: 1.6, bunslam: 1.4, pleatflurry: 1.65, ladlesplash: 1.3, brothbubble: 1, grandsteamer: 2.6, goldenfry: 2.6, hotpot: 2.6 };
  let tapMoveTo = null; // where you last tapped on the floor
  let tapQ = null; // the one queued tap-mode input: 'attack' | 'block' | 'dodge' | 'sp0' | 'sp1'

  let root, stageEl, renderer, scene, camera, raf = 0, last = 0, T = 0;
  let F = [], fx = [], projs = [], floats = [], crowd = [], petals = [], match = null;
  const keys = {}, edges = {}, touch = { x: 0, y: 0, btn: {}, edge: {} };

  /* ===================== Lobby ===================== */
  function lobby() {
    cleanupMatch(); DG.audio.homeTrack();
    const p = DG.pet(), si = DG.stageIndex(), st = DG.state;
    const hasThree = !!window.THREE;
    const nx = DG.nextStage();
    const OPP_IMG = Object.fromEntries(DG.OPPONENTS.map((o) => [o.id, assetSrc(`img/col/o-${o.id}.webp`, 1)])); // the Coliseum rival portraits
    const STYLE_IMG = { charger: 'img/ar_style_charger.webp?v=1', blocker: 'img/ar_style_blocker.webp?v=1', dodger: 'img/ar_style_dodger.webp?v=1', mixed: 'img/ar_style_champion.webp?v=1' };
    const STYLE_TINT = { charger: '#ffe2cf', blocker: '#fff0c4', dodger: '#e3ecff', mixed: '#fff0b8' };
    const useViking = p.accessory === 'viking';
    const tapOn = true; // solo battles always use tap controls
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
          <p class="ar-fine">Same Wi‑Fi only · just for fun · classic controls.</p>
        </div>
        <div class="ar-section ar-setup">
          <button class="ar-spbig" id="a-specials"><span class="ar-sp-orbs" aria-hidden="true"><i></i><i></i></span><span class="ar-sp-txt"><b>✨ Special Attacks</b><small>Buy &amp; equip your abilities</small></span><span class="ar-sp-go" aria-hidden="true">›</span></button>
          <button class="ar-controls ar-howto" id="a-controls"><span style="font-size:1.6em">🎮</span>How to play</button>
        </div>
      </div>`;
    root.querySelector('#a-home').onclick = () => { DG.audio.play('click'); DG.ui.show('home'); };
    root.querySelector('#a-controls').onclick = () => { DG.audio.play('click'); if (tapOn) battleTutorial(); else DG.ui.modal({ title: '🕹️ Classic controls', html: controlsHtml(), buttons: [{ label: 'Got it', cls: 'primary' }] }); };
    root.querySelector('#a-specials').onclick = () => { DG.audio.play('click'); specialsMenu(); };
    const pv = root.querySelector('#a-prev');
    root._stop = pv ? DG.ui.previewLoop(pv, (t) => ({ type: p.type, look: p.look, stage: si, size: 90, accessory: p.accessory, trait: p.trait, mood: 'joy', hop: Math.max(0, Math.sin(t * 4)) * 8 }), 140, 120) : null;
    root.querySelectorAll('[data-fight]').forEach((b) => (b.onclick = () => {
      DG.audio.unlock();
      const go = () => startMatch({ opp: +b.dataset.fight });
      if (tapOn && !st.settings.battleTutDone) battleTutorial(go); else go(); // first tap battle: learn the basics first
    }));
    root.querySelector('#a-host').onclick = () => { DG.audio.unlock(); hostGame(); };
    const ar = root.querySelector('.ar'); DG.ui.autoFit(ar, { top: ar.getBoundingClientRect().top + window.scrollY, pad: 10 }); // fit the phone screen without scrolling
    root.querySelector('#a-join').onclick = () => { DG.audio.unlock(); joinGame(); };
  }

  /** Battle tutorial: a few illustrated slides. Shown before your first tap battle and from "How to play". */
  function battleTutorial(onDone) {
    const eq = (DG.state.moves && DG.state.moves.equipped) || [], sp = eq[0] || 'steampuff', orb = ORB[sp] || ['#ffb34a', 'e-gold-sparks'];
    const img = (n) => `<img src="${colSrc(n)}" alt="">`;
    const SL = [
      { art: `<div class="tu-art tu-hit">${img('e-attack-slash')}<div class="tu-meter"><i></i></div></div>`, t: 'Tap to attack',
        p: `${DG.ui.isTouch() ? 'Tap' : 'Click'} your rival to attack. <b>Every hit that lands fills your ✨ special meter.</b> It starts empty, and about three hits charge one special.` },
      { art: `<div class="tu-art tu-blue">${img('e-block-shield')}</div>`, t: 'Blue glow = Block',
        p: 'When your rival glows <b style="color:#2e6fe0">blue</b>, it\'s about to attack. Tap 🛡️ <b>Block</b> before it strikes and you take no damage.' },
      { art: `<div class="tu-art tu-red">${img('e-attack-warning')}${img('e-dodge-chevron')}</div>`, t: 'Red glow = Dodge',
        p: 'A <b style="color:#e0342a">red</b> glow means a heavy attack that smashes through blocks. Tap 💨 <b>Dodge</b> to hop away. Dodging is tiring: you can do about three in a row, then it takes a few seconds to catch your breath.' },
      { art: `<div class="tu-art tu-sp"><span class="tu-orb" style="--oc:${orb[0]}">${img(orb[1])}</span><span class="tu-rune">〰</span></div>`, t: 'Special attacks',
        p: 'When the meter says <b>SPECIAL READY</b>, tap a special button. Time stops: <b>trace the glowing rune</b> with your finger. A neater trace hits harder!' },
      { art: `<div class="tu-art tu-rival">${img('e-purple-tornado')}${img('e-block-shield')}</div>`, t: 'Rival specials',
        p: 'Your rival charges up specials too. When it glows <b style="color:#8a4be0">purple</b> with <b>SPECIAL — BLOCK!</b>, you can\'t dodge it, but tapping <b>Block</b> keeps your shield up and cuts the damage a lot.' },
      { art: `<div class="tu-art tu-mash"><span>💫</span><span class="tu-birds">🐦🐦</span></div>`, t: 'Don\'t just mash!',
        p: 'Tapping nonstop is easy to read. Your rival will block, and you\'ll stumble while it gets free hits. Mix in blocks, dodges and specials!' },
    ];
    let i = 0;
    DG.ui.modal({
      cls: 'tu-modal', dismissable: false,
      html: `<div class="tu"><div class="tu-slide" id="tu-slide"></div><div class="tu-dots" id="tu-dots"></div>
        <div class="tu-btns"><button class="btn ghost" id="tu-back">← Back</button><button class="btn primary" id="tu-next">Next →</button></div>
        <button class="tu-skip" id="tu-skip">Skip</button></div>`,
      onOpen(el, close) {
        const done = () => { DG.state.settings.battleTutDone = true; DG.save(); close(); if (onDone) setTimeout(onDone, 230); };
        const show = () => {
          const s = SL[i];
          el.querySelector('#tu-slide').innerHTML = `${s.art}<h3>${s.t}</h3><p>${s.p}</p>`;
          el.querySelector('#tu-dots').innerHTML = SL.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
          el.querySelector('#tu-back').style.visibility = i ? 'visible' : 'hidden';
          el.querySelector('#tu-next').textContent = i === SL.length - 1 ? (onDone ? "Let's fight! ⚔️" : 'Got it!') : 'Next →';
        };
        el.querySelector('#tu-next').onclick = () => { DG.audio.play('click'); if (i < SL.length - 1) { i++; show(); } else done(); };
        el.querySelector('#tu-back').onclick = () => { DG.audio.play('click'); if (i) { i--; show(); } };
        el.querySelector('#tu-skip').onclick = () => { DG.audio.play('click'); done(); };
        show();
      },
    });
  }
  function tapHelpHtml() {
    const eq = (DG.state.moves && DG.state.moves.equipped || []).map((id) => DG.MOVES[id].name).join(' and ');
    return `<ul class="nice-list small">
      <li>👆 <b>${DG.ui.isTouch() ? 'Tap' : 'Click'} your rival</b> to attack (or press <kbd>J</kbd>).</li>
      <li>🔵 When your rival turns <b>blue</b> (<b>BLOCK</b>), press <b>Block</b> (<kbd>K</kbd>): a shield pops up around you.</li>
      <li>🔴 When it turns <b>red</b> (<b>DODGE</b>), press <b>Dodge</b> (<kbd>Space</kbd>) to hop back out of reach. Dodging uses a big chunk of your yellow energy, and red attacks break through a block!</li>
      <li>✨ Answer correctly and you get a moment to <b>counter</b> for a critical hit. Pressing too early or the wrong button won't stop the attack.</li>
      <li>😵 Don't just mash! Rivals read button-mashing and <b>block</b> — a blocked hit leaves you <b>stumbling</b> for a second or two.</li>
      <li>✍️ To cast a special, <b>trace its rune</b>: time stops, follow the glowing line from the dot. Neater tracing hits harder; a miss keeps your charge.</li>
      <li>🌟 Your two specials${eq ? ` (<b>${eq}</b>)` : ''} use half of the charge meter (<kbd>L</kbd> / <kbd>I</kbd>). Change them under <b>✨ Specials</b>.</li>
    </ul>`;
  }
  /** Buy and equip the two tap-combat specials. */
  function specialsMenu() {
    DG.seedMoves();
    const A = (n) => assetSrc(`img/${n}.webp`, 2);
    const ids = Object.keys(DG.TAP_MOVES);
    const fmtCd = (s) => `${s}s`;
    const card = (id) => {
      const st = DG.state, m = st.moves, mv = DG.TAP_MOVES[id], owned = m.owned.includes(id), can = DG.canUseMove(id), slot = m.equipped.indexOf(id);
      let act;
      if (!can.ok) act = `<span class="ab-lock">🔒 ${DG.ui.esc(can.why)}</span>`;
      else if (!owned) act = `<button class="ab-buy" data-buy="${id}" ${st.coins < mv.price ? 'data-poor="1"' : ''}>Buy <i class="fd-coin"></i>${mv.price}</button>`;
      else act = `<button class="ab-slot ${slot === 0 ? 'on' : ''}" data-eq="0" data-id="${id}">${slot === 0 ? '✓ ' : ''}Slot 1</button><button class="ab-slot ${slot === 1 ? 'on' : ''}" data-eq="1" data-id="${id}">${slot === 1 ? '✓ ' : ''}Slot 2</button>`;
      return `<div class="ab-card ${slot >= 0 ? 'eq' : ''}" data-card="${id}">
        <div class="ab-art"><img src="${A(`ab_${id}`)}" alt=""></div>
        <h4>${DG.ui.esc(DG.MOVES[id].name)}</h4>
        <p>${DG.ui.esc(((d) => d.charAt(0).toUpperCase() + d.slice(1))(DG.MOVES[id].desc.replace('ULTIMATE: ', '')))}</p>
        <div class="ab-stats"><span>⚡${mv.cost}</span><span>⏳${fmtCd(mv.cd)}</span><span>💥${Math.round(mv.power * 100)}%</span></div>
        <div class="ab-act">${act}</div>
      </div>`;
    };
    DG.ui.modal({
      cls: 'ab-modal', wide: true,
      html: `<div class="ab">
          <div class="ab-ribbon"><h2>✨ Abilities ✨</h2></div>
          <div class="ab-sub"><p>Equip two special moves for tap battles!</p><span class="ab-coins"><i class="fd-coin big"></i><b id="ab-coins"></b></span></div>
          <div class="ab-car">
            <button class="dc-arrow ab-prev" aria-label="Previous">‹</button>
            <div class="ab-track" id="ab-track">${ids.map(card).join('')}</div>
            <button class="dc-arrow ab-next" aria-label="Next">›</button>
          </div>
          <div class="dc-dots" id="ab-dots"></div>
          <div class="ab-foot"><img class="ab-mascot" src="${A('ab_mascot')}" alt=""><div class="ab-note"><i class="sh-i">i</i>Each ability uses charge from your meter. Your hits fill it up!</div>
            <button class="dc-done ab-done" id="ab-done">Done</button></div>
        </div>`,
      onClose() { lobby(); },
      onOpen(el, close) {
        const track = el.querySelector('#ab-track');
        const step = () => { const c = track.querySelector('.ab-card'); return c ? c.offsetWidth + 10 : 200; };
        const pages = () => Math.max(1, Math.round((track.scrollWidth - track.clientWidth) / step()) + 1);
        const dots = () => {
          const n = pages(), cur = Math.min(n - 1, Math.round(track.scrollLeft / step()));
          el.querySelector('#ab-dots').innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i === cur ? 'on' : ''}"></i>`).join('');
          el.querySelector('.ab-prev').disabled = cur <= 0; el.querySelector('.ab-next').disabled = cur >= n - 1;
        };
        const refresh = () => {
          el.querySelector('#ab-coins').textContent = DG.state.coins;
          ids.forEach((id) => { const old = track.querySelector(`[data-card="${id}"]`); const tmp = document.createElement('div'); tmp.innerHTML = card(id).trim(); old.replaceWith(tmp.firstChild); });
          wire();
        };
        const wire = () => {
          track.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => {
            const r = DG.buyMove(b.dataset.buy);
            if (r.ok) { DG.audio.play('coin'); DG.ui.toast(`✨ Learned ${DG.MOVES[b.dataset.buy].name}!`); } else { DG.audio.play('bad'); DG.ui.toast(r.why.startsWith('Needs') ? 'Not enough Dumpling Coins yet!' : r.why); }
            refresh();
          }));
          track.querySelectorAll('[data-eq]').forEach((b) => (b.onclick = () => {
            const r = DG.equipMove(+b.dataset.eq, b.dataset.id);
            DG.audio.play(r.ok ? 'pop' : 'bad'); if (!r.ok) DG.ui.toast(r.why);
            refresh();
          }));
        };
        el.querySelector('.ab-prev').onclick = () => { DG.audio.play('click'); track.scrollBy({ left: -step(), behavior: 'smooth' }); };
        el.querySelector('.ab-next').onclick = () => { DG.audio.play('click'); track.scrollBy({ left: step(), behavior: 'smooth' }); };
        track.addEventListener('scroll', () => { clearTimeout(track._t); track._t = setTimeout(dots, 60); }, { passive: true });
        el.querySelector('#ab-done').onclick = () => { DG.audio.play('click'); close(); };
        refresh();
        // start on your equipped moves
        const first = track.querySelector('.ab-card.eq'); if (first) track.scrollLeft = first.offsetLeft - track.offsetLeft - 4;
        requestAnimationFrame(dots);
      },
    });
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
  function setState(f, s) {
    if (f.state === 'move' && s !== 'move' && match && match.wave) match.wave = null; // an interrupted Ladle Splash washes away
    if (f.state === 'move' && s !== 'move') { f.ladle = null; if (match && match.hotpot && !match.hotpot.hit) match.hotpot = null; }
    if (f.state === 'move' && s !== 'move' && (f.mvPose || f.meteor || f.onFire || f.mvRot || f.mvSq)) { f.mvPose = f.mvRot = f.mvSq = null; f.mvFace = 0; f.meteor = f.onFire = false; f.hopY = 0; f.lockFacing = false; }
    f.state = s; f.stT = 0;
  }
  function facingVec(f) { return new THREE.Vector3(Math.sin(f.facing), 0, Math.cos(f.facing)); }
  function flatDist(a, b) { return Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z); }
  function dirTo(a, b) { const v = new THREE.Vector3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z); return v.lengthSq() > 1e-6 ? v.normalize() : facingVec(a); }

  function applyHit(att, def, dmg, o) {
    if (def.state === 'ko' || match.over) return 'none';
    const S = match.S;
    if (match.mode === 'tap' && !att.isPlayer && att.state === 'move' && att.mvMul) { // a rival special: no dodging it, but a shield helps
      dmg *= att.mvMul;
      if (def.bubble > 0) { bubbleReflect(att, def, dmg); return 'bubble'; }
      const guarded = def.blocking || def.shieldT > 0 || def.spGuard;
      let d2 = Math.max(1, Math.round(dmg * (guarded ? TAP.spBlock : 1)));
      if (def.state === 'dodge') { setState(def, 'idle'); def.dodgeTo = null; def.hopY = 0; }
      def.invuln = 0;
      def.hp = Math.max(0, def.hp - d2);
      if (guarded) { floatText(def, 'Blocked! −' + d2, '#9fc4ff', true); sfx('block'); def.shieldHit = 0.3; btBadge(def, 'blockbadge'); match.stats.blocks++; }
      else {
        floatText(def, '-' + d2, '#ff6b6b', true); sfx('crit'); def.flash = 0.18; sparks(def.pos); burst3d(def.pos, 3, 0xffffff);
        if (def.state !== 'move') { setState(def, 'stun'); def.stunDur = o.stun || 0.4; }
        def.kb.copy(dirTo(att, def)).multiplyScalar((o.kb || 3) * S * 3);
        match.shake = Math.max(match.shake, 0.3 * S); flashScreen();
      }
      if (def.hp <= 0) endMatch(def === F[0] ? 'lose' : 'win', 'ko');
      return guarded ? 'blocked' : 'hit';
    }
    if (def.invuln > 0) {
      if (def.state === 'dodge' && def.stT < 0.17 && !def.perfectUsed) perfectDodge(def);
      else if (def.msgT <= 0) { floatText(def, 'Dodged!', '#6fd3b5'); def.msgT = 0.4; }
      sfx('whoosh'); return 'dodged';
    }
    let crit = false;
    if (att.crit) { crit = true; att.crit = false; dmg *= 1.5; }
    if (match.mode === 'tap' && att.mvMul) dmg *= att.mvMul; // tap specials use their catalog power
    if (match.mode === 'tap' && crit && def.invuln <= 0) btBadge(def, 'crit');
    let d = dmg, kb = (o.kb || 3) * S, result = 'hit';
    const faceDot = facingVec(def).dot(dirTo(def, att));
    if (def.bubble > 0 && match.mode === 'tap') { bubbleReflect(att, def, dmg); return 'bubble'; }
    if (def.bubble > 0) { d *= 0.2; kb *= 0.2; floatText(def, 'Bubble!', '#7fd0ff'); sfx('pop'); result = 'bubble'; }
    else if (def.blocking && faceDot > 0.2) {
      if (def.parryT > 0 && !o.noParry && (def.isPlayer || Math.random() < def.skill * 0.6)) return parry(def, att);
      d *= 1 - def.blockRed; kb *= 0.35; def.sta -= o.blockCost || 18;
      floatText(def, 'Blocked!', '#7fb2ff'); sfx('block'); result = 'blocked';
      if (!def.isPlayer) def.ai.counter = true;
      if (o.crush) { floatText(def, 'GUARD CRUSH!', '#ff9f40', true); burst3d(def.pos, 3.2, 0xffc080); match.hitstop = 0.1; guardBreak(def); }
      else if (def.sta <= 0) guardBreak(def);
    } else {
      // in tap mode a winding-up enemy shrugs off plain hits (only specials and critical counters stagger it)
      const armored = match.mode === 'tap' && def.state === 'windup' && !att.mvMul && !crit;
      if (def.state !== 'move' && !armored) { setState(def, 'stun'); def.stunDur = o.stun || 0.3; }
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
    if (att.canSpecial && match.mode !== 'tap') att.special = Math.min(100, att.special + (result === 'hit' ? 8 : 4)); // tap battles charge only from landed normal hits (see tapPlayerImpact / tapEnemyImpact)
    if (def.canSpecial && match.mode !== 'tap') def.special = Math.min(100, def.special + 4);
    if (def.hp <= 0) knockout(def, att);
    return result;
  }
  /** Dodging at the very last moment: slow motion and a critical counter. */
  function perfectDodge(f) {
    f.perfectUsed = true; f.crit = true;
    if (f.canSpecial && !(match && match.mode === 'tap')) f.special = Math.min(100, f.special + 15);
    floatText(f, 'PERFECT DODGE!', '#9fe8ff', true); sfx('perfect');
    if (f.isPlayer) { match.slow = 0.6; speedLines(0.6); match.stats.perfect++; }
  }
  /** Blocking right before a hit lands: no damage, the attacker is stunned, and your next hit is critical. */
  function parry(f, att) {
    att.mv = null; att.spin = false; att.lockFacing = false; att.hopY = 0; att.combo = 0; att.heavy = 0;
    setState(att, 'stun'); att.stunDur = 0.8; att.kb.copy(dirTo(f, att)).multiplyScalar(4 * match.S);
    f.crit = true; if (f.canSpecial && !(match && match.mode === 'tap')) f.special = Math.min(100, f.special + 12);
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

  /* ===================== Battle art (tap battles) =====================
     Painted stands behind a transparent 3D canvas, the painted floor and railings in 3D (so the
     fighters' feet and shadows sit on them), and 2D sprite effects pinned to 3D positions. */
  const BT_V = 1;
  const assetSrc = (path, v) => (window.DG_ASSETS && window.DG_ASSETS[path]) || `${path}?v=${v}`;
  const btSrc = (n) => (window.DG_ASSETS && window.DG_ASSETS[`img/bt_${n}.webp`]) || `img/bt_${n}.webp?v=${BT_V}`;
  const BT_PRELOAD = ['floor', 'rail_l', 'rail_c', 'rail_r', 'ring_b1', 'ring_b2', 'ring_r', 'shield', 'bang', 'slash1', 'slash2', 'slash3', 'slash4',
    'impact1', 'impact2', 'impact3', 'puff1', 'puff2', 'puff3', 'goldring', 'goldring2', 'goldflat', 'goldburst', 'halo', 'tornado1', 'tornado2',
    'dragon', 'fireburst', 'ice1', 'ice2', 'bolt1', 'bolt2', 'cloud1', 'cloud2', 'cloud3', 'crit', 'blockbadge', 'dodgebadge', 'sparkle', 'ic_drop', 'ic_snow', 'ic_fire'];
  const btImgs = {};
  function btPreload() { BT_PRELOAD.forEach((n) => { if (!btImgs[n]) { const im = new Image(); im.src = btSrc(n); btImgs[n] = im; } }); }
  function btTexture(n) {
    const tex = new THREE.TextureLoader().load(btSrc(n));
    tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    return tex;
  }
  /** The arena for tap battles: painted floor + railings, soft lights, no sky (the painted stands show through). */
  function buildTapScene(R) {
    scene = new THREE.Scene(); scene.background = null; scene.fog = null; crowd = []; petals = [];
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9a877, 0.75));
    const dl = new THREE.DirectionalLight(0xfff0dc, 0.55); dl.position.set(-4, 12, 9); scene.add(dl);
    // painted platform: a disc with the painted top, and a wooden side so it has thickness
    const top = new THREE.Mesh(new THREE.CircleGeometry(R, 72), new THREE.MeshBasicMaterial({ map: btTexture('floor'), transparent: true }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.005; top.scale.setScalar(1.13); scene.add(top);
    const side = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.1, R * 1.06, R * 0.18, 72, 1, true), new THREE.MeshLambertMaterial({ color: 0xc98a4f, side: THREE.DoubleSide }));
    side.position.y = -R * 0.09; scene.add(side);
    // railings with lanterns along the back edge, facing the middle
    const rail = (n, w, h, ang, rr) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: btTexture(n), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide }));
      m.position.set(Math.sin(ang) * rr, h / 2 - 0.05, -Math.cos(ang) * rr); m.lookAt(0, h / 2, 0); scene.add(m);
    };
    const rr = R * 1.08, hgt = R * 0.32;
    rail('rail_c', hgt * 1.5, hgt * 1.1, 0, rr);
    rail('rail_l', hgt * 2.45, hgt, -0.62, rr);
    rail('rail_r', hgt * 2.3, hgt, 0.62, rr);
  }

  /* ---------- 2D sprite effects pinned to the 3D world ---------- */
  let fx2 = [];
  /** Spawns a sprite. o: { at: Vector3 | () => Vector3, size (world units), life, delay, z, anim(k, e) → {s, r, o, x, y} (x/y in world units), flip, cls } */
  function sprite(name, o) {
    if (!stageEl || !match || match.mode !== 'tap') return null;
    const layer = stageEl.querySelector('#bt-fx'); if (!layer) return null;
    const el = document.createElement('img'); el.src = name.startsWith('e-') ? colSrc(name) : btSrc(name); el.alt = ''; el.className = 'bt-sp' + (o.cls ? ' ' + o.cls : '');
    el.style.zIndex = o.z || 1; el.style.opacity = 0;
    layer.appendChild(el);
    const e = Object.assign({ el, t: 0, life: 0.6, delay: 0, size: 2, anim: null }, o);
    fx2.push(e); return e;
  }
  function fx2Update(dt) {
    if (!fx2.length || !colView) return;
    for (let i = fx2.length - 1; i >= 0; i--) {
      const e = fx2[i];
      if (e.delay > 0) { e.delay -= dt; continue; }
      e.t += dt; const k = Math.min(1, e.t / e.life);
      const base = typeof e.at === 'function' ? e.at() : e.at;
      const a = e.anim ? e.anim(k, e) : { s: 1, o: 1 - k };
      const p = new THREE.Vector3(base.x + (a.x || 0), base.y + (a.y || 0), base.z + (a.z || 0));
      const q = pj(p), ppu = q.ppu, px = q.x, py = q.y, size = e.size * ppu * (a.s == null ? 1 : a.s);
      e.el.style.width = size + 'px';
      e.el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%) rotate(${a.r || 0}rad) scaleX(${e.flip ? -1 : 1})`;
      e.el.style.opacity = Math.max(0, Math.min(1, a.o == null ? 1 : a.o));
      if (e.t >= e.life) { e.el.remove(); fx2.splice(i, 1); }
    }
  }
  function fx2Clear() { fx2.forEach((e) => e.el.remove()); fx2 = []; }
  const ease = { out: (k) => 1 - (1 - k) * (1 - k), pop: (k) => (k < 0.35 ? (k / 0.35) * 1.15 : 1.15 - 0.15 * Math.min(1, (k - 0.35) / 0.3)) };
  const fade = (k, from) => (k < from ? 1 : 1 - (k - from) / (1 - from));
  const mid = (f, y) => () => new THREE.Vector3(f.pos.x, (y == null ? 0.9 : y) * match.S + f.hopY, f.pos.z);
  const at = (f, y) => new THREE.Vector3(f.pos.x, (y == null ? 0.9 : y) * match.S, f.pos.z);
  function btBurst(f, name, size, life, y) { sprite(name, { at: at(f, y), size: size * match.S, life: life || 0.45, z: 5, anim: (k) => ({ s: ease.pop(k), r: k * 0.4, o: fade(k, 0.5) }) }); }
  function btRing(f, name, size, life, flat) { sprite(name, { at: at(f, flat ? 0.1 : 0.9), size: size * match.S, life: life || 0.6, z: 2, anim: (k) => ({ s: 0.3 + ease.out(k) * 1.2, o: fade(k, 0.3) }) }); }
  function btPuffs(f, n, spread) {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + rand(-0.3, 0.3), name = pick(['puff1', 'puff2', 'puff3']);
      sprite(name, { at: at(f, 0.3), size: rand(1.2, 1.8) * match.S, life: rand(0.5, 0.8), delay: i * 0.02, z: 3,
        anim: (k) => ({ x: Math.sin(ang) * spread * ease.out(k) * match.S, z: Math.cos(ang) * spread * 0.5 * ease.out(k) * match.S, y: k * 0.6 * match.S, s: 0.6 + k * 0.6, o: fade(k, 0.4) }) });
    }
  }
  function btBadge(f, name) { sprite(name, { at: at(f, 3.0), size: 3.2 * match.S, life: 0.9, z: 8, anim: (k) => ({ s: ease.pop(Math.min(1, k * 2)), y: k * 0.5 * match.S, o: fade(k, 0.6) }) }); }
  /** Hit spark at the point of contact between the two fighters. */
  function btSlash(att, def, name, big) {
    const c = new THREE.Vector3((att.pos.x + def.pos.x * 2) / 3, (def.mesh.topY * 0.42) * match.S, (att.pos.z + def.pos.z * 2) / 3);
    sprite('e-hit-spark', { at: c, size: (big ? 2.8 : 2.1) * match.S, life: 0.34, z: 7, anim: (k) => ({ s: ease.pop(k), r: k * 0.6, o: fade(k, 0.45) }) });
  }
  /** Big, layered sprite choreography for each special (called when the move starts; timings match the move's hit). */
  function btSpecialFx(id, f, o) {
    const S = match.S;
    const at0 = mid(f), atO = mid(o);
    // the painted coliseum effects, layered under the smaller sheet effects below
    const H = (g) => (g.mesh.topY * 0.45);
    switch (id) {
      case 'grandsteamer':
        sprite('e-purple-tornado', { at: at(f, H(f)), size: 4.5 * S, life: 0.75, z: 3, anim: (k) => ({ s: 0.4 + k * 0.7, r: Math.sin(k * 30) * 0.06, o: k < 0.2 ? k * 5 : 1 }) });
        sprite('e-purple-tornado', { at: at(o, H(o) + 0.6), delay: 0.6, size: 7.5 * S, life: 0.9, z: 8, anim: (k) => ({ s: ease.pop(Math.min(1, k * 1.4)), r: Math.sin(k * 26) * 0.08, y: k * 0.6 * S, o: fade(k, 0.6) }) });
        sprite('e-lightning-strike', { at: at(o, H(o)), delay: 0.75, size: 4 * S, life: 0.3, z: 9, anim: (k) => ({ o: k < 0.5 ? 1 : 0 }) });
        break;
      case 'brothbubble':
        sprite('e-broth-splash', { at: at(f, H(f)), delay: 0.55, size: 6 * S, life: 0.7, z: 8, anim: (k) => ({ s: 0.5 + ease.out(k) * 0.9, o: fade(k, 0.5) }) });
        break;
    }
    switch (id) {
      case 'brothbubble':
        sprite('ring_b1', { at: at0, size: 4.4 * S, life: 0.6, z: 6, anim: (k) => ({ s: 0.6 + ease.out(Math.min(1, k * 2)) * 0.45 + Math.sin(k * 20) * 0.02, r: k * 2, o: 0.9 }) });
        sprite('ring_b2', { at: at0, delay: 0.55, size: 4.6 * S, life: 0.5, z: 6, anim: (k) => ({ s: 1 + ease.out(k) * 1.4, r: k, o: fade(k, 0.2) }) });
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; sprite('ic_drop', { at: at(f, 1.0), delay: 0.55, size: 0.9 * S, life: 0.6, z: 7,
          anim: (k) => ({ x: Math.sin(a) * 3.2 * ease.out(k) * S, y: (Math.cos(a) * 1.6 * ease.out(k) - k * k * 1.2) * S, o: fade(k, 0.5) }) }); }
        sprite('cloud2', { at: at0, delay: 0.55, size: 3.4 * S, life: 0.7, z: 5, anim: (k) => ({ s: 0.5 + k, y: k * S, o: fade(k, 0.2) * 0.8 }) });
        break;
      case 'grandsteamer':
        [0, 1, 2].forEach((i) => { const a = (i / 3) * TAU; sprite(i === 1 ? 'tornado2' : 'tornado1', { at: at0, size: 3.6 * S, life: 1.3, z: 4,
          anim: (k) => ({ x: Math.sin(a + k * 9) * 2 * S * (1 - k * 0.4), z: Math.cos(a + k * 9) * S, y: k * 0.8 * S, s: 0.6 + k * 0.8, o: k < 0.15 ? k / 0.15 : fade(k, 0.7) }) }); });
        sprite('cloud3', { at: at0, size: 5 * S, life: 1.2, z: 2, anim: (k) => ({ s: 0.5 + k * 1.2, o: fade(k, 0.5) * 0.7 }) });
        sprite('goldburst', { at: at(f, 0.5), delay: 0.65, size: 5 * S, life: 0.6, z: 6, anim: (k) => ({ s: 0.8 + k, o: fade(k, 0.4) }) });
        sprite('tornado2', { at: atO, delay: 0.7, size: 6 * S, life: 0.7, z: 7, anim: (k) => ({ s: ease.pop(k), r: Math.sin(k * 20) * 0.1, o: fade(k, 0.6) }) });
        sprite('impact3', { at: atO, delay: 0.72, size: 5 * S, life: 0.5, z: 8, anim: (k) => ({ s: ease.pop(k), r: k, o: fade(k, 0.5) }) });
        sprite('halo', { at: at(o, 2.6), delay: 0.8, size: 3 * S, life: 0.8, z: 8, anim: (k) => ({ r: k * 4, o: fade(k, 0.5) }) });
        break;
    }
  }
  /** Run something after a number of fight-seconds (pauses and slows with the match). */
  function setTimeoutFight(sec, fn) { sprite('sparkle', { at: new THREE.Vector3(0, -50, 0), size: 0.01, delay: sec, life: 0.01, anim: (k, e) => { if (!e.done) { e.done = true; fn(); } return { o: 0 }; } }); }

  /* ---------- HUD for tap battles ---------- */
  function btHudHtml(p, e, oppImg) {
    return `<div class="bt-hud">
      <div class="bt-card me"><canvas class="bt-face" id="bt-face"></canvas><div class="bt-info"><b class="bt-name">${DG.ui.esc(p.name)}</b>
        <div class="bt-bar hp"><i></i><em></em></div><div class="bt-bar en"><i></i></div><div class="bt-ready" id="bt-ready1"></div></div></div>
      <div class="bt-timer"><img src="${btSrc('timer')}" alt=""><b id="bt-time">90</b></div>
      <div class="bt-card them"><div class="bt-info"><b class="bt-name">${DG.ui.esc(e.name)}</b>
        <div class="bt-bar hp"><i></i><em></em></div><div class="bt-bar en"><i></i></div><div class="bt-ready style">${DG.STYLES[e.style].name}</div></div>${oppImg ? `<img class="bt-face" src="${oppImg}" alt="">` : '<span class="bt-face"></span>'}</div>
    </div>`;
  }
  function btHudUpdate() {
    const hud = stageEl.querySelector('.bt-hud'); if (!hud) return;
    const [p, e] = F;
    const side = (f, el) => {
      const pct = Math.max(0, f.hp / f.maxHp) * 100;
      el.querySelector('.hp i').style.width = pct + '%';
      el.querySelector('.hp').classList.toggle('low', pct < 30);
      el.querySelector('.hp em').textContent = `${Math.ceil(f.hp)} / ${f.maxHp}`;
    };
    side(p, hud.querySelector('.me')); side(e, hud.querySelector('.them'));
    hud.querySelector('.me .en i').style.width = p.special + '%';
    hud.querySelector('.them .en i').style.width = (e.state === 'windup' ? Math.min(100, (e.stT / e.windup) * 100) : 0) + '%';
    const ready = [0, 1].some((i) => tapSpecialState(p, i).ready);
    const r = hud.querySelector('#bt-ready1'); r.textContent = ready ? 'SPECIAL READY ✦' : 'Charging…'; r.classList.toggle('on', ready); r.classList.toggle('low', false);
    hud.querySelector('#bt-time').textContent = Math.ceil(match.time);
  }
  /** A special's button: a glossy orb in the move's colour with its picture, and three charge pips. */
  const ORB = { steampuff: ['#b78cff', 'e-steam-burst'], bunslam: ['#ffb34a', 'e-ground-shockwave'], crispydash: ['#ff7a3a', 'e-gold-sparks'], pleatflurry: ['#5fb0ff', 'e-attack-slash'],
    brothbubble: ['#4cc2ff', 'e-shield-bubble'], ladlesplash: ['#ffb347', 'e-ladle-icon'], grandsteamer: ['#a54cf0', 'e-purple-tornado'], goldenfry: ['#ff5a2a', 'e-fire-dragon'], hotpot: ['#ffb347', 'e-hotpot-icon'] };
  function btOrb(id) { const o = ORB[id] || ['#ffb34a', 'sparkle']; return `<span class="bt-orb" style="--oc:${o[0]}"><img src="${o[1].startsWith('e-') ? colSrc(o[1]) : btSrc(o[1])}" alt=""></span>`; }

  /* ===================== Coliseum 2D stage (solo tap battles) =====================
     The painted portrait arena plate with hand-painted pose sprites layered over it. Combat still runs
     in world units on the floor plane (x across, z into the screen); this layer only maps them to the
     plate and draws. Pose canvases are 1024 logical px with the feet pivot at (512, 875), facing right. */
  const colSrc = (n) => assetSrc(`img/col/${n}.webp`, 1);
  const COL = {}; // image cache
  function colImg(n) { let im = COL[n]; if (!im) { im = COL[n] = new Image(); im.decoding = 'async'; im.src = colSrc(n); } return im; }
  const colOk = (im) => im && im.complete && im.naturalWidth > 0;
  const POSES = ['idle', 'wind-up', 'attack', 'hurt', 'dodge', 'block', 'knocked-out', 'neutral-front'];
  /* Per species and pose, measured from the art: [eyeX, eyeY, tilt, headTopY, mouthY, headWidth, eyeSpan, contentBox] in 1024 px. */
  const ANCH = {"bao":{"idle":[515,539,-0.006,229,612,662,267,[122,227,890,865]],"wind-up":[582,402,-0.155,279,460,478,184,[175,224,887,868]],"attack":[690,605,0.088,280,685,525,202,[109,269,910,870]],"hurt":[505,399,0.093,257,492,455,175,[166,210,861,870]],"dodge":[374,680,-0.002,350,747,580,223,[132,310,881,868]],"block":[607,570,-0.001,232,638,611,235,[145,232,878,864]],"knocked-out":[543,742,-0.009,426,793,666,256,[96,426,931,864]],"neutral-front":[505,537,-0.007,252,608,661,260,[114,248,904,869]]},"gyoza":{"idle":[523,661,-0.003,409,714,632,243,[94,409,929,874]],"wind-up":[589,589,-0.222,381,830,460,177,[138,380,883,873]],"attack":[671,700,0.091,433,775,465,179,[103,427,922,873]],"hurt":[491,616,0.343,378,798,421,162,[143,378,880,874]],"dodge":[443,746,-0.007,474,803,559,215,[116,465,908,872]],"block":[513,679,0.001,419,844,494,190,[96,419,929,872]],"knocked-out":[517,774,0.001,548,853,523,201,[84,548,940,873]],"neutral-front":[517,675,-0.001,419,850,556,214,[95,419,930,873]]},"soup":{"idle":[581,585,-0.01,240,669,720,277,[148,238,871,867]],"wind-up":[625,480,-0.18,197,540,647,249,[138,197,879,870]],"attack":[689,629,0.044,257,720,658,253,[135,220,882,868]],"hurt":[428,567,-0.242,226,645,658,253,[142,198,884,866]],"dodge":[662,656,-0.115,339,714,647,249,[131,331,891,871]],"block":[541,597,-0.005,222,655,681,262,[152,222,873,867]],"knocked-out":[533,736,-0.008,407,787,699,269,[88,407,939,861]],"neutral-front":[526,598,-0.001,226,666,716,279,[155,226,872,866]]}};
  /* Accessories: [kind, width × head width, drop, content box in their 1024 canvas].
     kind 'hat' sits its bottom edge `drop` of the way from head top to eyes; 'band' centres there;
     'eyes' / 'stache' / 'chest' are face and body anchors. */
  const ACC = {
    viking: ['hat', 1.0, 0.6, [64, 215, 960, 809]], cap: ['hat', 0.95, 0.58, [64, 198, 960, 826]], tinyhat: ['hat', 0.78, 0.3, [64, 149, 960, 874]],
    chef: ['hat', 0.68, 0.36, [64, 171, 960, 852]], party: ['hat', 0.42, 0.22, [142, 64, 882, 960]], crown: ['hat', 0.6, 0.28, [64, 190, 960, 834]],
    beret: ['hat', 0.85, 0.42, [64, 203, 960, 821]], bow: ['hat', 0.55, 0.22, [64, 203, 960, 820]], flower: ['hat', 0.86, 0.36, [64, 276, 960, 748]],
    headband: ['hat', 1.0, 0.48, [64, 216, 960, 808]], ninja: ['band', 1.04, 0.6, [64, 252, 960, 772]], headphones: ['band', 0.92, 0.08, [64, 145, 960, 879]],
    shades: ['eyes', 1.75, 0, [64, 338, 960, 686]], glasses: ['eyes', 1.8, 0, [64, 315, 960, 708]],
    mustache: ['stache', 1.3, 0, [64, 349, 960, 674]], bowtie: ['chest', 1.05, 0, [64, 256, 960, 767]],
  };
  const DROP = { bao: 1, gyoza: 0.85, soup: 0.75 }; // the shumai's open top sits lower than a bao's knot
  const STAGE_SIZE = [0.82, 0.88, 0.94, 1, 1.07];
  /* Where the floor is on the plate: world (x, z) → plate (u, v). */
  const PLATE = { U0: 0.5, AU: 0.45, V0: 0.47, AV: 0.16, W: 1080, H: 1920 };
  let colView = null; // { px, py, pw, ph, w, h, dpr }
  function colLayout(cv) {
    const w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight, dpr = Math.min(2.5, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    // keep the full-width composition; on very tall phones allow a slight side crop so the ring stays big
    const pw = Math.max(w, Math.min(h * (PLATE.W / PLATE.H) * 0.92, w * 1.12)), ph = pw * (PLATE.H / PLATE.W);
    const py = Math.min(0, (h - ph) * 0.5) + Math.max(0, (h - ph) * 0.42);
    colView = { px: (w - pw) / 2, py, pw, ph, w, h, dpr };
    return colView;
  }
  const depth = (v) => 1 + (v - PLATE.V0) * 1.5;
  /** World point → screen {x, y, ppu (px per world unit), ds (depth scale)} in CSS px. */
  function pj(p) {
    const V = colView, R = match.R, u = PLATE.U0 + (p.x / R) * PLATE.AU, v = PLATE.V0 + (p.z / R) * PLATE.AV, ds = depth(v);
    const ppu = (V.pw * PLATE.AU / R) * ds;
    return { x: V.px + u * V.pw, y: V.py + v * V.ph - (p.y || 0) * ppu, ppu, ds };
  }
  /** Screen point → floor point (world), or null if it's far off the ring. */
  function unpj(sx, sy) {
    const V = colView, R = match.R, u = (sx - V.px) / V.pw, v = (sy - V.py) / V.ph;
    const x = ((u - PLATE.U0) / PLATE.AU) * R, z = ((v - PLATE.V0) / PLATE.AV) * R, d = Math.hypot(x, z);
    if (d > R * 1.35) return null;
    const lim = R * 0.98, k = d > lim ? lim / d : 1;
    return new THREE.Vector3(x * k, 0, z * k);
  }
  /** How big a fighter's 1024-px pose canvas is drawn on screen. */
  function fighterPx(f, ds) { return colView.pw * 0.4 * STAGE_SIZE[Math.min(4, f.stageIdx == null ? 3 : f.stageIdx)] * ds; }

  /* Tinted copies (rival colours, Closet colours, white hit-flash) cached per image + colour. */
  const TINT = {};
  function tinted(name, color, mode) {
    const im = colImg(name); if (!colOk(im)) return null;
    const key = name + '|' + color + '|' + mode; if (TINT[key]) return TINT[key];
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    if (mode === 'white') { x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); }
    else { x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0); }
    return (TINT[key] = c);
  }
  /** The pose a fighter shows right now. */
  function poseOf(f) {
    if (f.state === 'ko') return 'knocked-out';
    if (f.state === 'stun') return 'hurt';
    if (f.state === 'dodge') return 'dodge';
    if (f.blocking || f.tapShieldT > 0) return 'block';
    if (f.state === 'windup' || f.state === 'charge') return 'wind-up';
    if (f.state === 'attack') return 'attack';
    if (f.state === 'recover') return f.stT < 0.14 ? 'attack' : 'idle';
    if (f.state === 'move') return f.mvPose || (f.mv && f.mv.t() < 0.2 ? 'wind-up' : 'attack');
    if (f.flash > 0.08) return 'hurt';
    return 'idle';
  }
  /** Draws one dumpling (body, then accessory) with its feet at (x, y). o: { species, pose, size, mirror, tint, acc, glow, flash, alpha, sx, sy, rot } */
  function drawDumpling2D(ctx, x, y, o) {
    const body = colImg(`f-${o.species}-${o.pose}`); if (!colOk(body)) return;
    const k = o.size / 1024;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale((o.mirror ? -1 : 1) * (o.sx || 1), o.sy || 1); ctx.translate(-512 * k, -875 * k);
    const src = o.tint ? (tinted(`f-${o.species}-${o.pose}`, o.tint, 'mul') || body) : body;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 34 * (o.size / 300); ctx.drawImage(src, 0, 0, 1024 * k, 1024 * k); ctx.drawImage(src, 0, 0, 1024 * k, 1024 * k); ctx.shadowBlur = 0; }
    ctx.drawImage(src, 0, 0, 1024 * k, 1024 * k);
    if (o.flash > 0) { const wc = tinted(`f-${o.species}-${o.pose}`, '#ffffff', 'white'); if (wc) { ctx.globalAlpha *= Math.min(1, o.flash * 5) * 0.7; ctx.drawImage(wc, 0, 0, 1024 * k, 1024 * k); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha; } }
    if (o.acc) drawAccessory2D(ctx, o.species, o.pose, o.acc, k);
    ctx.restore();
  }
  function drawAccessory2D(ctx, species, pose, id, k) {
    const a = ACC[id], an = ANCH[species] && ANCH[species][pose], im = colImg('a-' + id);
    if (!a || !an || !colOk(im)) return;
    const [ex, ey, tilt, top, mouthY, headW, span] = an, [kind, wf, drop, cb] = a;
    const cw = cb[2] - cb[0], ch = cb[3] - cb[1];
    let w, ax, ay, ox, oy; // draw width; anchor point on the head; anchor point in the accessory's own content
    if (kind === 'hat') { w = headW * wf; ax = ex; ay = top + (ey - top) * drop * DROP[species]; ox = (cb[0] + cb[2]) / 2; oy = cb[3] - ch * 0.06; }
    else if (kind === 'band') { w = headW * wf; ax = ex; ay = top + (ey - top) * drop; ox = (cb[0] + cb[2]) / 2; oy = (cb[1] + cb[3]) / 2; }
    else if (kind === 'eyes') { w = span * wf; ax = ex; ay = ey; ox = (cb[0] + cb[2]) / 2; oy = (cb[1] + cb[3]) / 2; }
    else if (kind === 'stache') { w = span * wf; ax = ex; ay = ey + (mouthY - ey) * 0.6; ox = (cb[0] + cb[2]) / 2; oy = (cb[1] + cb[3]) / 2; }
    else { w = span * wf; ax = ex; ay = ey + (875 - ey) * 0.66; ox = (cb[0] + cb[2]) / 2; oy = (cb[1] + cb[3]) / 2; }
    const s = w / cw;
    ctx.save();
    ctx.translate(ax * k, ay * k); ctx.rotate(tilt); ctx.scale(s * k, s * k); ctx.translate(-ox, -oy);
    ctx.drawImage(im, 0, 0, 1024, 1024);
    ctx.restore();
  }
  /** Colour used for a fighter's body: rivals use their colour; Closet colours tint the player (Classic stays natural). */
  function bodyTint(f) {
    if (!f.isPlayer) return f.tint2d || null;
    const lk = f.look && f.look.color;
    if (!lk || lk === 'classic') return null;
    const c = DG.lookColors(f.shape, f.look); return c && c.base ? DG.draw.mix(c.base, '#ffffff', 0.25) : null;
  }
  /** Screen box of a fighter's drawn body (for tap targeting). */
  function fighterBox(f) {
    const p = pj(f.pos), D = fighterPx(f, p.ds), an = ANCH[f.shape] && ANCH[f.shape][poseOf(f)], b = an ? an[7] : [150, 250, 870, 875], k = D / 1024;
    const mir = f.mirror2d;
    const x0 = p.x + (mir ? 512 - b[2] : b[0] - 512) * k, x1 = p.x + (mir ? 512 - b[0] : b[2] - 512) * k;
    const hy = f.hopY * p.ppu;
    return { x0, x1, y0: p.y - hy + (b[1] - 875) * k, y1: p.y - hy + (b[3] - 875) * k, cx: (x0 + x1) / 2, cy: p.y - hy + ((b[1] + b[3]) / 2 - 875) * k };
  }

  function colRender(dt) {
    const cv = stageEl && stageEl.querySelector('#bt-cv'); if (!cv) return;
    const V = colLayout(cv), ctx = cv.getContext('2d');
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    let sx = 0, sy = 0;
    if (match.shake > 0) { sx = rand(-1, 1) * match.shake * 14; sy = rand(-1, 1) * match.shake * 14; match.shake = Math.max(0, match.shake - dt * 1.2); }
    ctx.translate(sx, sy);
    // the plate (mirrored strips fill any space above/below on very tall screens)
    const plate = colImg('arena');
    ctx.fillStyle = '#d9925a'; ctx.fillRect(-20, -20, V.w + 40, V.h + 40);
    if (colOk(plate)) {
      if (V.py > 0) { ctx.save(); ctx.translate(0, V.py); ctx.scale(1, -1); ctx.drawImage(plate, 0, 0, PLATE.W, PLATE.H * (V.py / V.ph) + 2, V.px, 0, V.pw, V.py + 2); ctx.restore(); }
      const bot = V.py + V.ph;
      if (bot < V.h) { ctx.save(); ctx.translate(0, bot); ctx.scale(1, -1); const hh = V.h - bot; ctx.drawImage(plate, 0, PLATE.H * (1 - hh / V.ph), PLATE.W, PLATE.H * (hh / V.ph), V.px, -hh, V.pw, hh); ctx.restore(); }
      ctx.drawImage(plate, V.px, V.py, V.pw, V.ph);
      try { colCrowd(ctx, plate, V); } catch (err) { /* decoration only: never let it break the arena */ }
    }
    const e = F[1], sw = e && e.spWarn, a = sw ? { color: 'special' } : e && e.tap && e.tap.atk, warn = sw || (a && !a.resolved && e.state === 'windup');
    if (match.wave) { try { drawWave(ctx, match.wave, 'wave'); } catch (err) { match.wave = null; } } // the broth wave rolls behind the fighters
    if (match.hotpot) { try { drawHotPot(ctx, match.hotpot, 'floor'); } catch (err) { match.hotpot = null; } }
    // fighters, back to front
    const order = F.slice().sort((p, q) => p.pos.z - q.pos.z);
    order.forEach((f) => {
      const o = f === F[0] ? F[1] : F[0], p = pj(f.pos), D = fighterPx(f, p.ds);
      if (f.state === 'move' && f.mvFace) f.mirror2d = f.mvFace < 0; // a special steers which way you face
      else if (Math.abs(o.pos.x - f.pos.x) > 0.15 * match.S) f.mirror2d = o.pos.x < f.pos.x; // face the rival
      const pose = poseOf(f);
      // soft contact shadow
      const lift = Math.max(0, f.hopY) * p.ppu;
      ctx.save(); ctx.globalAlpha = Math.max(0.15, 0.32 - lift / 600);
      const sg = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, D * 0.32); sg.addColorStop(0, 'rgba(90,40,15,0.8)'); sg.addColorStop(1, 'rgba(90,40,15,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(p.x, p.y, D * 0.32, D * 0.07, 0, 0, TAU); ctx.fill(); ctx.restore();
      // a little life: breathing, wind-up shiver, hit squash
      let sxk = 1, syk = 1, rot = 0, dx = 0;
      if (pose === 'idle') { const b = Math.sin(T * 4 + (f.isPlayer ? 0 : 1.7)); syk = 1 + b * 0.025; sxk = 1 - b * 0.015; }
      if (pose === 'wind-up') { dx = Math.sin(T * 60) * 1.5; syk = 0.97; }
      if (pose === 'hurt') rot = f.stumbling ? Math.sin(T * 9) * 0.12 : (f.mirror2d ? 1 : -1) * 0.05;
      if (f.state === 'move') { if (f.mvRot) rot = f.mvRot * (f.mirror2d ? -1 : 1); if (f.mvSq) { syk = f.mvSq; sxk = 1 + (1 - f.mvSq) * 0.6; } }
      if (f.meteor) { // a blazing comet tail streaming up behind the falling bun
        const mx = p.x, my = p.y - lift - D * 0.3, len = D * 2.2, fl = Math.sin(T * 40) * D * 0.03;
        ctx.save();
        const layer = (w, l, c0, c1, c2) => {
          const g = ctx.createLinearGradient(mx, my - l, mx, my); g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, c2);
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mx - w * 0.15 + fl, my - l); ctx.quadraticCurveTo(mx - w * 0.6, my - l * 0.35, mx - w, my);
          ctx.arc(mx, my, w, Math.PI, 0, true); ctx.quadraticCurveTo(mx + w * 0.6, my - l * 0.35, mx + w * 0.15 - fl, my - l); ctx.closePath(); ctx.fill();
        };
        layer(D * 0.5, len, 'rgba(200,40,10,0)', 'rgba(230,70,20,0.75)', 'rgba(255,110,30,0.95)');
        layer(D * 0.36, len * 0.8, 'rgba(255,120,30,0)', 'rgba(255,160,40,0.85)', 'rgba(255,200,80,1)');
        layer(D * 0.2, len * 0.55, 'rgba(255,230,140,0)', 'rgba(255,240,170,0.9)', 'rgba(255,255,230,1)');
        ctx.restore();
      }
      if (f.state === 'dodge' && colOk(colImg('e-dodge-trail'))) { // speed trail behind the sidestep
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - f.stT / 0.4) * 0.85; ctx.translate(p.x, p.y - lift - D * 0.22); ctx.scale(f.mirror2d ? -1 : 1, 1);
        ctx.drawImage(colImg('e-dodge-trail'), -D * 0.95, -D * 0.25, D * 0.7, D * 0.5); ctx.restore();
      }
      if (f === e && warn) { // a coloured aura behind the rival while it winds up
        const kk = sw ? Math.min(1, sw.t / TAP.spWarn) : Math.min(1, e.stT / e.windup), pul = 0.75 + 0.25 * Math.sin(T * 18), cx0 = p.x, cy0 = p.y - lift - D * 0.3, rr = D * (0.5 + 0.08 * kk);
        const ag = ctx.createRadialGradient(cx0, cy0, rr * 0.25, cx0, cy0, rr);
        const c0 = a.color === 'blue' ? '70,150,255' : a.color === 'special' ? '160,80,255' : '255,60,45';
        ag.addColorStop(0, `rgba(${c0},${0.7 * pul})`); ag.addColorStop(0.55, `rgba(${c0},${0.5 * pul})`); ag.addColorStop(1, `rgba(${c0},0)`);
        ctx.save(); ctx.fillStyle = ag; ctx.beginPath(); ctx.ellipse(cx0, cy0, rr, rr * 0.85, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      const glow = f.meteor ? 'rgba(255,120,30,0.95)' : f.onFire ? `rgba(255,${90 + 40 * Math.sin(T * 30) | 0},20,0.95)` : f === e && warn ? (a.color === 'blue' ? `rgba(70,150,255,${0.75 + 0.25 * Math.sin(T * 20)})` : a.color === 'special' ? `rgba(170,90,255,${0.8 + 0.2 * Math.sin(T * 24)})` : `rgba(255,60,50,${0.75 + 0.25 * Math.sin(T * 20)})`) : null;
      const warnTint = f === e && warn ? (a.color === 'blue' ? '#5f9dff' : a.color === 'special' ? '#b98aff' : '#ff6a5a') : null; // the rival turns blue, red or purple
      drawDumpling2D(ctx, p.x + dx, p.y - lift, { species: f.shape, pose, size: D, mirror: f.mirror2d, tint: warnTint || bodyTint(f), acc: f.isPlayer ? null : f.accessory, glow, flash: f.flash, sx: sxk, sy: syk, rot,
        alpha: f.state === 'ko' && f.stT > 2.4 ? Math.max(0.4, 1 - (f.stT - 2.4)) : 1 });
      if (f.stumbling && f.state === 'stun') { // dazed: little birds flap in circles around the head
        const hy = p.y - lift - D * ((875 - ANCH[f.shape].idle[3]) / 1024) - D * 0.02;
        const birds = [];
        for (let i = 0; i < 3; i++) { const ang = T * 4.2 + (i * TAU) / 3; birds.push({ ang, x: p.x + Math.cos(ang) * D * 0.24, y: hy + Math.sin(ang) * D * 0.06 }); }
        birds.sort((a1, b1) => Math.sin(a1.ang) - Math.sin(b1.ang)).forEach((b1, i) => drawBird(ctx, b1.x, b1.y, D * 0.038 * (0.85 + 0.15 * Math.sin(b1.ang)), -Math.sin(b1.ang) < 0, T * 18 + i));
      }
      // gold slash sweeping around your attack
      if ((f.state === 'attack' || (f.state === 'recover' && f.stT < 0.16)) && colOk(colImg('e-attack-slash'))) {
        const kk = f.state === 'attack' ? 0.35 + f.stT * 3 : 0.75 + f.stT * 2;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, kk - 0.6) * 2.2); ctx.globalCompositeOperation = 'lighter';
        ctx.translate(p.x, p.y - lift - D * 0.3); ctx.scale(f.mirror2d ? -1 : 1, 1); ctx.rotate(-0.35 + kk * 0.5);
        ctx.drawImage(colImg('e-attack-slash'), -D * 0.62, -D * 0.5, D * 1.24, D * 1.0); ctx.restore();
      }
      // Block: a shield bubble pops up around YOU, with the shield held toward the rival
      if (f === F[0] && (f.shieldT || 0) > 0 && colOk(colImg('e-shield-bubble'))) {
        f.shieldT -= dt; f.shieldHit = Math.max(0, (f.shieldHit || 0) - dt);
        const kk = Math.min(1, (TAP.blockHold + 0.15 - f.shieldT) / 0.12), fadeK = Math.min(1, f.shieldT / 0.15);
        const s = D * 1.02 * (0.7 + 0.3 * ease.pop(kk)) * (1 + f.shieldHit * 0.25), cy0 = p.y - lift - D * 0.32;
        ctx.save(); ctx.globalAlpha = 0.9 * fadeK; ctx.drawImage(colImg('e-shield-bubble'), p.x - s / 2, cy0 - s / 2, s, s);
        const sh = colImg('e-block-shield');
        if (colOk(sh)) { const ss = D * 0.42, sx0 = p.x + (f.mirror2d ? -1 : 1) * D * 0.34; ctx.drawImage(sh, sx0 - ss / 2, cy0 - ss / 2, ss, ss); }
        ctx.restore();
      }
      if (f.ladle && f.state === 'move') drawLadle(ctx, p.x, p.y - lift, D, f.mirror2d, f.ladle);
      if (f.bubble > 0 && colOk(colImg('e-shield-bubble'))) { // Broth Bubble (flickers in its last seconds)
        const s = D * 1.12 * (1.0 + 0.04 * Math.sin(T * 9)) * (1 + (f.bubbleHit || 0) * 0.3);
        const al = f.bubble < 2 ? 0.35 + 0.4 * Math.abs(Math.sin(T * 14)) : 0.78;
        ctx.save(); ctx.globalAlpha = al; ctx.drawImage(colImg('e-shield-bubble'), p.x - s / 2, p.y - lift - D * 0.36 - s / 2, s, s); ctx.restore();
      }
    });
    if (match.wave) { try { drawWave(ctx, match.wave, 'splash'); } catch (err) { match.wave = null; } }
    if (match.hotpot) { try { drawHotPot(ctx, match.hotpot, 'top'); } catch (err) { match.hotpot = null; } }
  }
  /** A little cartoon bird (for the dazed effect). dir: true = flying right. */
  function drawBird(ctx, x, y, r, dir, flap) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir ? 1 : -1, 1); ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r, 0, 0, TAU); ctx.fill(); ctx.stroke(); // body
    ctx.beginPath(); ctx.arc(r * 0.95, -r * 0.55, r * 0.62, 0, TAU); ctx.fill(); ctx.stroke(); // head
    ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(r * 1.5, -r * 0.6); ctx.lineTo(r * 2.05, -r * 0.42); ctx.lineTo(r * 1.5, -r * 0.3); ctx.closePath(); ctx.fill(); // beak
    ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.arc(r * 1.1, -r * 0.68, r * 0.12, 0, TAU); ctx.fill(); // eye
    const w = Math.sin(flap) * 0.9; // flapping wing
    ctx.fillStyle = '#ffe98a'; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.1); ctx.quadraticCurveTo(-r * 0.9, -r * (0.6 + w), -r * 1.4, -r * (0.2 + w * 1.1)); ctx.quadraticCurveTo(-r * 0.7, r * 0.2, -r * 0.2, -r * 0.1); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  /** The painted crowd bounces: thin vertical strips of the stands hop up and down in waves, more when they cheer. */
  function colCrowd(ctx, plate, V) {
    // The painted crowd stays sharp; the stands come alive with camera flashes, and confetti rains after big moments.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cheerK = Math.min(1.5, match.cheer || 0), top = V.py + V.ph * 0.05, bot = V.py + V.ph * 0.2;
    const n = 4 + Math.round(cheerK * 5);
    for (let i = 0; i < n; i++) { // brief star-shaped flashes popping across the stands
      const cyc = 1.3 + (i % 4) * 0.37, ph = ((((T + i * 0.53) % cyc) + cyc) % cyc) / cyc;
      if (ph > 0.22) continue;
      const seed = Math.floor((T + i * 0.53) / cyc) * 31 + i * 17;
      const x = V.px + (((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1) * V.pw, y = top + (((Math.sin(seed * 78.233) * 12543.21) % 1 + 1) % 1) * (bot - top);
      const k = Math.max(0, Math.sin((ph / 0.22) * Math.PI)); if (k <= 0.01) continue;
      ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14 * k + 2); g.addColorStop(0, 'rgba(255,255,240,0.95)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14 * k + 2, 0, TAU); ctx.fill();
      DG.draw.sparkle(ctx, x, y, 6 * k + 1, '#ffffff'); ctx.restore();
    }
    // confetti
    if (!match.confetti) match.confetti = [];
    const cf = match.confetti;
    if (cheerK > 1 && cf.length < 70 && Math.random() < 0.5) for (let i = 0; i < 4; i++) cf.push({ x: V.px + Math.random() * V.pw, y: V.py + V.ph * 0.02, vx: rand(-20, 20), vy: rand(40, 90), r: Math.random() * TAU, vr: rand(-6, 6), c: pick(['#ff7a9a', '#ffd84a', '#7fd0ff', '#9fe08a', '#c49bff']), life: 3 });
    const dtc = 1 / 60;
    for (let i = cf.length - 1; i >= 0; i--) {
      const q = cf[i]; q.x += (q.vx + Math.sin(T * 3 + i) * 25) * dtc; q.y += q.vy * dtc; q.r += q.vr * dtc; q.life -= dtc;
      if (q.life <= 0 || q.y > V.py + V.ph * 0.6) { cf.splice(i, 1); continue; }
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.scale(1, Math.abs(Math.cos(q.r * 1.3)) * 0.8 + 0.2);
      ctx.fillStyle = q.c; ctx.fillRect(-3.5, -2, 7, 4); ctx.restore();
    }
  }

  /** Portrait for the HUD: the player's species with their Closet colour and accessory. */
  function drawFace2D(cv, f) {
    const draw = () => {
      if (!cv.isConnected) return;
      const im = colImg(`f-${f.shape}-neutral-front`), ai = f.accessory ? colImg('a-' + f.accessory) : null;
      if (!colOk(im) || (ai && !colOk(ai))) { setTimeout(draw, 120); return; }
      const dpr = Math.min(2.5, window.devicePixelRatio || 1), w = cv.clientWidth || 48, h = cv.clientHeight || 44;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const an = ANCH[f.shape]['neutral-front'], b = an[7], top = f.accessory && ACC[f.accessory] && ACC[f.accessory][0] === 'hat' ? an[3] - 160 : b[1];
      const k = Math.min(w / (b[2] - b[0]), h / (b[3] - top)) * 0.96;
      drawDumpling2D(ctx, w / 2 + (512 - (b[0] + b[2]) / 2) * k, h - 1 + (875 - b[3]) * k, { species: f.shape, pose: 'neutral-front', size: 1024 * k, tint: bodyTint(f), acc: f.accessory });
    };
    draw();
  }
  function colPreload(defs) {
    ['arena', 'e-attack-slash', 'e-shield-bubble', 'e-dodge-trail', 'e-hit-spark', 'e-block-shield', 'e-attack-warning', 'e-dodge-chevron'].forEach(colImg);
    defs.forEach((d) => { POSES.forEach((p) => colImg(`f-${d.shape}-${p}`)); if (d.accessory && ACC[d.accessory]) colImg('a-' + d.accessory); });
  }

  /* ===================== Signature special animations (tap battles) ===================== */
  const smooth = (k) => k * k * (3 - 2 * k);
  /** Steam Puff: zoom a full lap around the edge of the ring trailing steam, then rocket into the rival. */
  function tapSteamPuff(f, o) {
    const S = match.S, rr = match.R - f.radius * 1.05, start = f.pos.clone();
    const a0 = Math.atan2(f.pos.x, f.pos.z), dir = f.pos.x < o.pos.x ? -1 : 1; // circle away from the rival first
    let t = 0, hit = false, puffT = 0, edge = null, from = null;
    f.lockFacing = true;
    return { update(dt) {
      t += dt; f.vel.set(0, 0, 0);
      const ring = (a) => new THREE.Vector3(Math.sin(a) * rr, 0, Math.cos(a) * rr);
      if (t < 0.22) { f.mvPose = 'wind-up'; f.mvSq = 0.9; f.mvRot = 0; } // crouch and puff up
      else if (t < 1.5) { // the lap
        f.mvPose = 'attack'; f.mvSq = 1;
        const k = (t - 0.22) / 1.28, a = a0 + dir * smooth(k) * TAU;
        const p0 = ring(a); if (!edge) edge = start.clone();
        f.pos.copy(k < 0.12 ? edge.clone().lerp(p0, k / 0.12) : p0);
        const ahead = ring(a + dir * 0.2); f.mvFace = ahead.x >= f.pos.x ? 1 : -1;
        f.hopY = (0.35 + 0.15 * Math.sin(t * 18)) * S; f.mvRot = 0.18;
        puffT -= dt;
        if (puffT <= 0) { // steam trail
          puffT = 0.05; const here = f.pos.clone();
          sprite(Math.random() < 0.5 ? 'e-steam-burst' : 'cloud1', { at: new THREE.Vector3(here.x, 0.6 * S, here.z), size: rand(1.6, 2.4) * S, life: 0.7, z: 2,
            anim: (q) => ({ y: q * 1.1 * S, s: 0.5 + q * 0.7, r: q, o: fade(q, 0.2) * 0.85 }) });
        }
      } else if (t < 1.78) { // whack!
        if (!from) { from = f.pos.clone(); sfx('whoosh'); speedLines(0.35); }
        const k = Math.min(1, (t - 1.5) / 0.2), back = new THREE.Vector3(from.x - o.pos.x, 0, from.z - o.pos.z); if (back.lengthSq() < 1e-6) back.set(-1, 0, 0); back.normalize();
        const tgt = o.pos.clone().addScaledVector(back, f.radius + o.radius * 0.6);
        f.pos.copy(from.clone().lerp(tgt, smooth(k))); f.mvFace = tgt.x >= from.x ? 1 : -1; f.mvRot = 0.35; f.hopY = 0.2 * S;
        if (!hit && k >= 1) {
          hit = true; f.hopY = 0;
          applyHit(f, o, f.dmg * 1.1, { kb: 8, stun: 0.6, blockCost: 10, aoe: true, noParry: true, heavy: true });
          sprite('e-steam-burst', { at: at(o, o.mesh.topY * 0.45), size: 7 * S, life: 0.8, z: 8, anim: (q) => ({ s: 0.4 + ease.out(q) * 0.9, y: q * 0.8 * S, o: fade(q, 0.55) }) });
          sprite('e-hit-spark', { at: at(o, o.mesh.topY * 0.5), size: 3.4 * S, life: 0.4, z: 9, anim: (q) => ({ s: ease.pop(q), r: q, o: fade(q, 0.5) }) });
          match.shake = Math.max(match.shake, 0.3); cheer(1.2);
        }
      } else { f.mvRot = 0; f.mvFace = 0; f.mvPose = 'idle'; f.hopY = 0; if (t >= 1.95) { f.lockFacing = false; return true; } }
      return false;
    }, t: () => t };
  }
  /** Bun Slam: shoot up off the top of the screen, line up over the rival (its shadow grows), then crash down like a meteor. */
  function tapBunSlam(f, o) {
    const S = match.S, top = 16 * S;
    let t = 0, landed = false, launched = false, trailT = 0, target = null;
    f.lockFacing = true;
    return { update(dt) {
      t += dt; f.vel.set(0, 0, 0);
      if (t < 0.28) { f.mvPose = 'wind-up'; f.mvSq = 0.82 + 0.1 * Math.sin(t * 60); f.mvRot = 0; f.hopY = 0; } // deep crouch
      else if (t < 0.72) { // blast off
        if (!launched) {
          launched = true; sfx('jump'); f.mvSq = 1;
          sprite('e-dust-burst', { at: at(f, 0.3), size: 4 * S, life: 0.6, z: 3, anim: (q) => ({ s: 0.5 + q * 0.8, o: fade(q, 0.3) }) });
          sprite('goldring', { at: at(f, 0.1), size: 3 * S, life: 0.5, z: 1, anim: (q) => ({ s: 0.4 + ease.out(q) * 1.6, o: fade(q, 0.3) }) });
        }
        const k = (t - 0.28) / 0.44; f.hopY = top * k * k; f.mvPose = 'dodge'; f.mvRot = -0.25; f.mvSq = 1.15;
      } else if (t < 1.12) { // up out of sight, gliding over the rival
        f.hopY = top;
        target = o.pos.clone().addScaledVector(dirTo(o, f), 0.15 * S);
        f.pos.lerp(target, Math.min(1, dt * 9));
        if (Math.random() < 0.5) sprite('sparkle', { at: new THREE.Vector3(target.x, 0.05, target.z), size: 1.2 * S, life: 0.3, z: 1, anim: (q) => ({ s: 1 - q, o: 1 - q }) });
      } else if (t < 1.36) { // meteor!
        const k = (t - 1.12) / 0.24; f.hopY = top * (1 - k * k); f.mvPose = 'attack'; f.mvRot = 1.15; f.mvSq = 1.1; f.meteor = true;
        f.mvFace = o.pos.x >= f.pos.x ? 1 : -1;
        trailT -= dt;
        if (trailT <= 0) {
          trailT = 0.025;
          sprite(Math.random() < 0.5 ? 'fireburst' : 'e-gold-sparks', { at: new THREE.Vector3(f.pos.x + rand(-0.3, 0.3) * S, f.hopY + 1.2 * S, f.pos.z), size: rand(2, 3) * S, life: 0.45, z: 5,
            anim: (q) => ({ s: 1 - q * 0.5, y: q * 0.8 * S, o: fade(q, 0.2) }) });
        }
        if (k > 0.5 && Math.random() < 0.6) sfx('whoosh');
      } else if (!landed) {
        landed = true; f.hopY = 0; f.meteor = false; f.mvPose = 'block'; f.mvRot = 0; f.mvSq = 0.8;
        // land just beside the rival so the two don't overlap
        f.pos.copy(o.pos.clone().addScaledVector(dirTo(o, f), (f.radius + o.radius) * 0.75));
        sfx('thud'); sfx('special'); match.shake = 0.6 * S; flashScreen(); cheer(1.5);
        sprite('e-ground-shockwave', { at: at(o, 0.3), size: 9 * S, life: 0.8, z: 2, anim: (q) => ({ s: 0.3 + ease.out(q) * 1.2, o: fade(q, 0.4) }) });
        sprite('e-dust-burst', { at: at(o, 0.6), size: 6 * S, life: 0.7, z: 7, anim: (q) => ({ s: 0.6 + q * 0.7, o: fade(q, 0.4) }) });
        sprite('impact1', { at: at(o, 1.2), size: 5 * S, life: 0.45, z: 9, anim: (q) => ({ s: ease.pop(q), r: q, o: fade(q, 0.5) }) });
        btPuffs(o, 8, 3.2);
        if (flatDist(f, o) < (f.radius + o.radius) * 1.6) applyHit(f, o, f.dmg * 1.4, { kb: 6, stun: 0.7, aoe: true, noParry: true, heavy: true });
      } else {
        f.mvSq = 0.8 + Math.min(0.2, (t - 1.36) * 1.2); f.mvPose = t < 1.55 ? 'block' : 'idle';
        if (t >= 1.75) { f.mvRot = 0; f.mvSq = 1; f.mvFace = 0; f.lockFacing = false; return true; }
      }
      return false;
    }, t: () => t };
  }

  /** Crispy Dash: race laps of the ring, getting faster and hotter until you burst into flames, then hurtle into the rival. */
  function tapCrispyDash(f, o) {
    const S = match.S, rr = match.R - f.radius * 1.05, start = f.pos.clone();
    const a0 = Math.atan2(f.pos.x, f.pos.z), dir = f.pos.x < o.pos.x ? -1 : 1, LAP = 1.7;
    let t = 0, hit = false, trailT = 0, from = null, lit = false;
    f.lockFacing = true;
    const ring = (a) => new THREE.Vector3(Math.sin(a) * rr, 0, Math.cos(a) * rr);
    return { update(dt) {
      t += dt; f.vel.set(0, 0, 0);
      if (t < 0.2) { f.mvPose = 'wind-up'; f.mvSq = 0.88; }
      else if (t < 0.2 + LAP) { // the run: ~1.4 laps, speeding up (k²)
        const k = (t - 0.2) / LAP, a = a0 + dir * k * k * TAU * 1.4, p0 = ring(a);
        f.mvPose = 'attack'; f.mvSq = 1; f.pos.copy(k < 0.1 ? start.clone().lerp(p0, k / 0.1) : p0);
        f.mvFace = ring(a + dir * 0.2).x >= f.pos.x ? 1 : -1; f.mvRot = 0.12 + k * 0.2;
        f.hopY = Math.abs(Math.sin(t * 22)) * 0.25 * S; // little running bounces
        if (!lit && k > 0.55) { lit = true; f.onFire = true; sfx('special'); floatText(f, '🔥', '#ff9a3a'); }
        trailT -= dt;
        if (trailT <= 0) {
          trailT = lit ? 0.03 : 0.06; const here = f.pos.clone();
          const name = lit ? (Math.random() < 0.6 ? 'fireburst' : 'e-gold-sparks') : (k > 0.3 ? 'cloud1' : 'e-dust-burst');
          sprite(name, { at: new THREE.Vector3(here.x, (lit ? 0.7 : 0.3) * S, here.z), size: (lit ? rand(1.8, 2.6) : rand(1, 1.6)) * S, life: lit ? 0.5 : 0.45, z: 2,
            anim: (q) => ({ y: q * (lit ? 0.9 : 0.4) * S, s: lit ? 1 - q * 0.5 : 0.6 + q * 0.6, o: fade(q, 0.2) * (lit ? 1 : 0.6) }) });
        }
      } else if (t < 0.2 + LAP + 0.22) { // hurtle!
        if (!from) { from = f.pos.clone(); sfx('whoosh'); speedLines(0.4); }
        const k = Math.min(1, (t - 0.2 - LAP) / 0.18), back = new THREE.Vector3(from.x - o.pos.x, 0, from.z - o.pos.z);
        if (back.lengthSq() < 1e-6) back.set(-1, 0, 0); back.normalize();
        const tgt = o.pos.clone().addScaledVector(back, f.radius + o.radius * 0.6);
        f.pos.copy(from.clone().lerp(tgt, k * k)); f.mvFace = tgt.x >= from.x ? 1 : -1; f.mvRot = 0.4; f.hopY = 0.15 * S;
        if (Math.random() < 0.8) sprite('fireburst', { at: at(f, 0.7), size: 2.4 * S, life: 0.4, z: 3, anim: (q) => ({ s: 1 - q * 0.5, o: fade(q, 0.2) }) });
        if (!hit && k >= 1) {
          hit = true; f.hopY = 0;
          applyHit(f, o, f.dmg * 1.6, { kb: 9, stun: 0.6, blockCost: 12, aoe: true, noParry: true, heavy: true });
          sprite('e-fire-dragon', { at: at(o, o.mesh.topY * 0.5), size: 6 * S, life: 0.7, z: 8, anim: (q) => ({ s: 0.5 + ease.out(q) * 0.7, o: fade(q, 0.5) }) });
          sprite('impact2', { at: at(o, o.mesh.topY * 0.5), size: 4 * S, life: 0.4, z: 9, anim: (q) => ({ s: ease.pop(q), o: fade(q, 0.5) }) });
          for (let i = 0; i < 6; i++) sprite('fireburst', { at: at(o, 0.8), size: 2.2 * S, life: 0.6, z: 7, anim: ((a) => (q) => ({ x: Math.cos(a) * 2.4 * q * S, y: (Math.sin(a) * 1.6 * q + q * 0.6) * S, s: 1 - q * 0.5, o: fade(q, 0.3) }))(i / 6 * TAU) });
          match.shake = Math.max(match.shake, 0.4 * S); flashScreen(); cheer(1.3);
        }
      } else { f.onFire = false; f.mvRot = 0; f.mvFace = 0; f.mvPose = 'idle'; f.hopY = 0; if (t >= 0.2 + LAP + 0.42) { f.lockFacing = false; return true; } }
      return false;
    }, t: () => t };
  }
  /** Pleat Flurry: spin like a top and ricochet off the rival again and again — lots of little hits. */
  function tapPleatFlurry(f, o) {
    const S = match.S, HITS = 8, GAP = 0.17, start = f.pos.clone();
    let t = 0, n = 0, side = null;
    f.lockFacing = true;
    return { update(dt) {
      t += dt; f.vel.set(0, 0, 0);
      if (!side) { side = new THREE.Vector3(start.x - o.pos.x, 0, start.z - o.pos.z); if (side.lengthSq() < 1e-6) side.set(-1, 0, 0); side.normalize(); }
      const touch = f.radius + o.radius * 0.7;
      if (t < 0.25) { // spin up while closing in
        const k = t / 0.25; f.mvPose = 'dodge'; f.mvRot = k * k * 8;
        f.pos.copy(start.clone().lerp(o.pos.clone().addScaledVector(side, touch + 0.6 * S), k));
      } else if (n < HITS || t < 0.25 + HITS * GAP + 0.05) { // ricochet: bump in, bounce out, from alternating sides
        const tt = t - 0.25, ph = (tt % GAP) / GAP, i = Math.floor(tt / GAP);
        const s2 = side.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i % 2 ? 0.7 : -0.7));
        f.mvPose = 'dodge'; f.mvRot = 8 + tt * 34;
        f.pos.copy(o.pos.clone().addScaledVector(s2, touch + Math.sin(ph * Math.PI) * 0.9 * S));
        f.hopY = Math.sin(ph * Math.PI) * 0.25 * S;
        if (n < HITS && tt >= n * GAP) {
          n++; sfx('hit');
          applyHit(f, o, f.dmg * 0.21, { kb: 0.4, stun: 0.2, blockCost: 3, aoe: true, noParry: true });
          const nm = ['slash1', 'slash4', 'slash2', 'e-attack-slash'][n % 4];
          sprite(nm, { at: at(o, o.mesh.topY * rand(0.35, 0.65)), size: 3.2 * S, life: 0.25, z: 8, flip: n % 2 === 1, anim: (q) => ({ s: 0.7 + q * 0.5, r: (n % 2 ? 1 : -1) * (0.5 - q), o: fade(q, 0.4) }) });
          sprite('impact2', { at: at(o, o.mesh.topY * 0.5), size: 1.8 * S, life: 0.25, z: 9, anim: (q) => ({ s: ease.pop(q), o: fade(q, 0.5) }) });
          match.shake = Math.max(match.shake, 0.12 * S);
          if (n === HITS) { cheer(1.2); floatText(o, HITS + ' hits!', '#bfe3ff', true); }
        }
      } else { // spin down and hop back
        const k = Math.min(1, (t - 0.3 - HITS * GAP) / 0.3); f.mvRot = (1 - k) * 2; f.mvPose = 'idle'; f.hopY = Math.sin(k * Math.PI) * 0.5 * S;
        if (k >= 1) { f.mvRot = 0; f.hopY = 0; f.lockFacing = false; return true; }
      }
      return false;
    }, t: () => t };
  }
  /** Fiery Breath: puff up, then pour a stream of fire across the ring — several scorching hits and a final blast. */
  function tapFieryBreath(f, o) {
    const S = match.S, TICKS = 5;
    let t = 0, flameT = 0, n = 0, ended = false;
    f.lockFacing = true;
    return { update(dt) {
      t += dt; f.vel.set(0, 0, 0);
      f.mvFace = o.pos.x >= f.pos.x ? 1 : -1;
      const dir = dirTo(f, o), mouth = f.pos.clone().addScaledVector(dir, f.radius * 0.9); mouth.y = f.mesh.topY * 0.5 * S;
      if (t < 0.45) { // a deep breath in
        f.mvPose = 'wind-up'; f.mvSq = 1 + Math.min(1, t / 0.45) * 0.18; f.mvRot = 0;
        if (Math.random() < 0.3) sprite('sparkle', { at: mouth.clone().addScaledVector(dir, 0.8 * S), size: 0.9 * S, life: 0.35, z: 6, anim: (q) => ({ x: -dir.x * q * 0.8 * S, s: 1 - q, o: 1 - q }) });
      } else if (t < 1.75) { // the fire stream
        f.mvPose = 'attack'; f.mvSq = 0.94 + Math.sin(t * 40) * 0.03; f.mvRot = -0.08;
        const tgt = o.pos.clone(); tgt.y = o.mesh.topY * 0.45 * S;
        flameT -= dt;
        if (flameT <= 0) {
          flameT = 0.03;
          const dx = tgt.x - mouth.x, dz = tgt.z - mouth.z, dy = tgt.y - mouth.y, wob = rand(-0.4, 0.4) * S;
          sprite(Math.random() < 0.65 ? 'fireburst' : 'e-gold-sparks', { at: mouth.clone(), size: rand(1.4, 2.2) * S, life: 0.42, z: 7,
            anim: (q) => ({ x: dx * q * 1.08, z: dz * q, y: dy * q + wob * Math.sin(q * Math.PI), s: 0.5 + q * 1.1, r: q * 2, o: fade(q, 0.25) }) });
        }
        if (Math.random() < 0.25) sfx('whoosh');
        // scorching hits while the rival stands in the stream
        if (n < TICKS && t >= 0.6 + n * 0.22) {
          n++;
          if (flatDist(f, o) < 9 * S) {
            applyHit(f, o, f.dmg * (n === TICKS ? 0.8 : 0.33), { kb: n === TICKS ? 4 : 0.6, stun: 0.25, noParry: true, aoe: true, heavy: n === TICKS });
            sprite('impact2', { at: tgt.clone(), size: 2 * S, life: 0.3, z: 9, anim: (q) => ({ s: ease.pop(q), o: fade(q, 0.5) }) });
          }
        }
      } else if (!ended) {
        ended = true; f.mvPose = 'idle'; f.mvSq = 1; f.mvRot = 0;
        sprite('e-fire-dragon', { at: at(o, o.mesh.topY * 0.5), size: 6.5 * S, life: 0.8, z: 8, anim: (q) => ({ s: 0.4 + ease.out(q) * 0.8, y: q * 0.6 * S, o: fade(q, 0.5) }) });
        match.shake = Math.max(match.shake, 0.3 * S); cheer(1.2);
      } else if (t >= 2.0) { f.mvFace = 0; f.lockFacing = false; return true; }
      return false;
    }, t: () => t };
  }
  /** Ladle Splash (art: your sprite sheet): scoop broth with a ladle, fling it, and a golden broth wave grows and
      rolls across the ring, crashes on the rival in a big splash, and leaves a steaming puddle. */
  function tapLadleSplash(f, o) {
    const S = match.S, dir = o.pos.x >= f.pos.x ? 1 : -1, edge = match.R + 2 * S;
    let t = 0, w = null;
    f.lockFacing = true; f.mvFace = dir; f.ladle = { a: -0.5, broth: 1 };
    for (let i = 0; i < 7; i++) colImg('e-ladle-wave' + i); for (let i = 0; i < 5; i++) colImg('e-ladle-splash' + i);
    return { update(dt) {
      t += dt; f.vel.set(0, 0, 0);
      if (t < 0.5) { // dip and scoop
        f.mvPose = 'wind-up'; f.mvSq = 0.92;
        f.ladle.a = -0.5 + Math.sin(Math.min(1, t / 0.5) * Math.PI) * 0.45;

        if (Math.random() < 0.25) sprite('sparkle', { at: at(f, 0.6), size: 0.7 * S, life: 0.35, z: 6, anim: (q) => ({ x: dir * 0.9 * S, y: -q * 0.4 * S, s: 1 - q, o: 1 - q }) });
        return false;
      }
      if (t < 0.72) { // fling!
        f.mvPose = 'attack'; f.mvSq = 1;
        f.ladle.a = -0.5 + ((t - 0.5) / 0.22) * 2.2; f.ladle.broth = Math.max(0, 1 - (t - 0.5) / 0.15);
        return false;
      }
      if (!w) {
        sfx('splash'); sfx('whoosh'); match.shake = Math.max(match.shake, 0.15 * S); f.ladle.broth = 0;
        f.hopY = 0;
        w = match.wave = { kind: 'broth', x: f.pos.x - dir * 2.2 * S, z: (f.pos.z + o.pos.z) / 2, dir, t: 0, hit: false, splash: null, fade: 1 };
      }
      w.t += dt;
      if (t > 1.0) { f.ladle = null; f.mvPose = 'idle'; }
      if (!w.hit) {
        w.x += dir * 6.2 * S * dt * Math.min(1, 0.35 + w.t * 1.2);
        match.shake = Math.max(match.shake, 0.08 * S * Math.min(1, w.t * 2));
        if (w.t > 0.25 && Math.random() < 0.3) sprite('e-ladle-splash' + (Math.random() < 0.5 ? 0 : 1), { at: new THREE.Vector3(w.x + dir * rand(0.5, 2.5) * S, rand(4, 6) * S, w.z), size: rand(1.4, 2.4) * S, life: 0.6, z: 9,
          anim: (q) => ({ x: dir * q * 2 * S, y: -q * q * 3 * S, s: 0.7 + q * 0.4, r: dir * q, o: fade(q, 0.3) }) });
        if ((w.x - o.pos.x) * dir >= -o.radius * 0.4) { // crash!
          w.hit = true; w.hitT = w.t; w.splash = { x: o.pos.x, z: o.pos.z + 0.05 * S, t: 0 };
          applyHit(f, o, f.dmg * 1.35, { kb: 9, stun: 0.8, aoe: true, noParry: true, heavy: true });
          sfx('splash'); sfx('thud'); match.shake = Math.max(match.shake, 0.7 * S); flashScreen(); cheer(1.6);
        }
      } else {
        w.x += dir * 3 * S * dt; w.fade = Math.max(0, 1 - (w.t - w.hitT) / 0.5); w.splash.t += dt;
        if (w.splash.t > 1.5) { match.wave = null; f.ladle = null; f.mvFace = 0; f.lockFacing = false; f.mvPose = 'idle'; return true; }
      }
      if (!w.hit && ((w.x - dir * edge) * dir > 0 || w.t > 2.5)) { match.wave = null; f.ladle = null; f.mvFace = 0; f.lockFacing = false; return true; }
      return false;
    }, t: () => t };
  }
  /** Draws the broth wave (growing, rolling, then collapsing) and the splash → steaming puddle where it crashed. */
  function drawWave(ctx, w, part) {
    const S = match.S;
    const put = (name, wx, wz, worldW, alpha, flip, tall) => {
      const im = colImg(name); if (!colOk(im)) return;
      const g = pj(new THREE.Vector3(wx, 0, wz)), wp = worldW * S * g.ppu, hp = wp * im.naturalHeight / im.naturalWidth * (tall || 1);
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(g.x, g.y + hp * 0.06); if (flip) ctx.scale(-1, 1);
      ctx.drawImage(im, -wp / 2, -hp, wp, hp); ctx.restore();
    };
    if (part !== 'splash' && !w.hit) { // the wave: frames 0-5 as it builds (and grows), then rocking between 4 and 5 as it rolls
      const i = w.t < 0.6 ? Math.min(5, Math.floor(w.t / 0.1)) : 4 + (Math.floor(w.t / 0.13) % 2), grow = 0.55 + 0.45 * Math.min(1, w.t / 0.5);
      put('e-ladle-wave' + i, w.x - w.dir * 1.2 * S, w.z || 0, 10.5 * grow, 1, w.dir < 0, 1.3 + 0.08 * Math.sin(w.t * 9));
    }
    if (part !== 'wave' && w.hit && w.fade > 0) // crashing down right on top of the rival
      put('e-ladle-wave6', w.x - w.dir * 0.4 * S, (w.splash && w.splash.z) || 0, 10.5, w.fade, w.dir < 0, 1.35);
    if (part !== 'wave' && w.splash) { // splash 0-1 bursting, then the puddle rings (2-4) slowly fading with steam
      const st = w.splash.t, i = st < 0.12 ? 0 : st < 0.3 ? 1 : st < 0.6 ? 2 : st < 0.95 ? 3 : 4;
      const sz = i < 2 ? 8.5 + st * 5 : 9, al = st > 1.1 ? Math.max(0, 1 - (st - 1.1) / 0.4) : 1;
      put('e-ladle-splash' + i, w.splash.x, w.splash.z || 0, sz, al, w.dir < 0);
    }
  }
  /** A silver ladle in your dumpling's paws (Ladle Splash). a = swing angle, broth = how full it is. */
  function drawLadle(ctx, x, y, D, mirror, L) {
    const s = mirror ? -1 : 1;
    ctx.save(); ctx.translate(x + s * D * 0.14, y - D * 0.1); ctx.scale(s, 1); ctx.rotate(-L.a);
    const len = D * 0.2, r = D * 0.075;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7c8794'; ctx.lineWidth = D * 0.035; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    ctx.strokeStyle = '#e8edf2'; ctx.lineWidth = D * 0.018; ctx.beginPath(); ctx.moveTo(0, -D * 0.005); ctx.lineTo(len, -D * 0.005); ctx.stroke();
    const bg = ctx.createRadialGradient(len + r * 0.6, -r * 0.2, r * 0.2, len + r * 0.8, 0, r * 1.2); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, '#cfd6de'); bg.addColorStop(1, '#7c8794');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(len + r * 0.8, r * 0.2, r, 0, Math.PI); ctx.lineTo(len - r * 0.2, r * 0.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a6470'; ctx.lineWidth = Math.max(1, D * 0.012); ctx.stroke();
    if (L.broth > 0.05) { // golden broth in the bowl
      ctx.globalAlpha = L.broth; const bg2 = ctx.createLinearGradient(0, -r * 0.1, 0, r * 0.6); bg2.addColorStop(0, '#fff2a0'); bg2.addColorStop(1, '#f0a020');
      ctx.fillStyle = bg2; ctx.beginPath(); ctx.ellipse(len + r * 0.8, r * 0.25, r * 0.88, r * 0.32, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7cc84a'; ctx.beginPath(); ctx.arc(len + r * 0.6, r * 0.22, r * 0.1, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  /** Hot Pot Tsunami (art: your sprite sheet): a giant pot of broth drops in, tips and pours; a broth wave rolls
      into the rival, then the broth floods the whole ring and keeps scalding the rival, before steaming away. */
  function tapHotPot(f, o) {
    const S = match.S, dir = o.pos.x >= f.pos.x ? 1 : -1, z = (f.pos.z + o.pos.z) / 2;
    const NAMES = ['pour', 'pool', 'tofu', 'onion', 'steam0', 'steam1'].concat([0, 1, 2, 3, 4].map((i) => 'wave' + i), [0, 1, 2, 3, 4].map((i) => 'flood' + i), [0, 1, 2].map((i) => 'splash' + i));
    NAMES.forEach((n) => colImg('e-hotpot-' + n));
    const h = match.hotpot = { dir, z, px: f.pos.x + dir * 2.1 * S, t: 0, wave: null, flood: 0, fade: 1, hit: false, ticks: 0 };
    f.lockFacing = true; f.mvFace = dir;
    let bobT = 0;
    return { update(dt) {
      h.t += dt; const t = h.t; f.vel.set(0, 0, 0);
      f.mvPose = t < 0.55 ? 'wind-up' : t < 2.2 ? 'attack' : 'idle'; f.mvSq = t < 0.55 ? 0.9 : 1;
      if (t > 0.5 && !h.poured) { h.poured = true; sfx('splash'); sfx('whoosh'); match.shake = Math.max(match.shake, 0.25 * S); }
      if (h.poured && t < 2.3) match.shake = Math.max(match.shake, 0.06 * S);
      if (t > 0.75 && !h.wave) h.wave = { x: h.px, t: 0 };
      if (h.wave) {
        h.wave.t += dt;
        if (!h.hit) {
          h.wave.x += dir * 5.5 * S * dt * Math.min(1, 0.4 + h.wave.t * 1.2);
          if ((h.wave.x - o.pos.x) * dir >= -o.radius * 0.3) {
            h.hit = true; h.hitT = t;
            applyHit(f, o, f.dmg * 1.3, { kb: 8, stun: 0.9, aoe: true, noParry: true, heavy: true });
            sfx('splash'); sfx('thud'); match.shake = Math.max(match.shake, 0.6 * S); flashScreen(); cheer(1.6);
            sprite('e-hotpot-splash0', { at: new THREE.Vector3(o.pos.x, 0, o.pos.z + 0.05 * S), size: 7 * S, life: 0.7, z: 9, anim: (q) => ({ s: 0.6 + ease.out(q) * 0.6, o: fade(q, 0.5) }) });
          }
        }
      }
      if (t > 1.1) h.flood = Math.min(1, (t - 1.1) / 0.9); // broth fills the arena
      if (h.flood > 0.4 && h.ticks < 4 && t > 1.5 + h.ticks * 0.4 && o.state !== 'ko') { // scalding broth
        h.ticks++; applyHit(f, o, f.dmg * 0.3, { kb: 0.3, stun: 0.2, aoe: true, noParry: true });
        sprite('e-hotpot-splash2', { at: new THREE.Vector3(o.pos.x, 0, o.pos.z + 0.05 * S), size: 3 * S, life: 0.45, z: 9, anim: (q) => ({ s: 0.6 + q * 0.5, o: fade(q, 0.4) }) });
      }
      bobT -= dt;
      if (h.flood > 0.5 && t < 3 && bobT <= 0) { // tofu and green onions bobbing, steam rising
        bobT = 0.18;
        const bx = rand(-0.85, 0.85) * match.R, bz = z + rand(-0.4, 0.6) * S;
        sprite(Math.random() < 0.5 ? 'e-hotpot-tofu' : 'e-hotpot-onion', { at: new THREE.Vector3(bx, 0.2 * S, bz), size: 0.8 * S, life: 0.9, z: 4,
          anim: (q) => ({ y: Math.sin(q * Math.PI) * 0.35 * S, r: q * 2, o: fade(q, 0.3) }) });
        if (Math.random() < 0.5) sprite(Math.random() < 0.5 ? 'e-hotpot-steam0' : 'e-hotpot-steam1', { at: new THREE.Vector3(rand(-0.8, 0.8) * match.R, 0.8 * S, bz), size: 3 * S, life: 1.4, z: 8,
          anim: (q) => ({ y: q * 2.4 * S, s: 0.6 + q * 0.6, o: Math.sin(q * Math.PI) * 0.75 }) });
      }
      if (t > 2.6) h.fade = Math.max(0, 1 - (t - 2.6) / 0.8);
      if (t >= 3.4) { match.hotpot = null; f.mvFace = 0; f.lockFacing = false; f.mvPose = 'idle'; return true; }
      return false;
    }, t: () => h.t };
  }
  /** Draws Hot Pot Tsunami: 'floor' = the flood and the rolling wave (behind the fighters); 'top' = the pot, its pour and the splash. */
  function drawHotPot(ctx, h, part) {
    const S = match.S, R = match.R, flip = h.dir < 0;
    const put = (name, wx, wy, wz, worldW, alpha, opts) => {
      const im = colImg('e-hotpot-' + name); if (!colOk(im) || alpha <= 0.01) return;
      opts = opts || {};
      const g = pj(new THREE.Vector3(wx, wy, wz)), wp = worldW * S * g.ppu, hp = wp * im.naturalHeight / im.naturalWidth * (opts.tall || 1);
      const ax = opts.ax == null ? 0.5 : opts.ax, ay = opts.ay == null ? 1 : opts.ay, rev = opts.rev == null ? 1 : opts.rev;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(g.x, g.y); if (flip) ctx.scale(-1, 1); if (opts.rot) ctx.rotate(opts.rot);
      ctx.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * rev, -wp * ax, -hp * ay, wp, hp * rev);
      ctx.restore();
    };
    const t = h.t;
    if (part === 'floor') {
      if (h.flood > 0) { // the flood frames spreading over the ring, then the calm steaming pool
        const fi = Math.min(4, Math.floor(h.flood * 5)), grow = 0.45 + 0.55 * h.flood;
        put(t > 2.3 ? 'pool' : 'flood' + fi, h.px * (1 - h.flood), 0, h.z + 0.6 * S, 2 * R / S * 1.08 * grow, h.fade * Math.min(1, h.flood * 2), { ay: 0.72, tall: 0.62 });
      }
      if (h.wave && h.fade > 0) { // the broth wave building and rolling to the rival
        const wi = h.hit ? 4 : Math.min(4, Math.floor(h.wave.t / 0.1)), sz = 7.5 * (0.6 + 0.4 * Math.min(1, h.wave.t / 0.4));
        const al = h.hit ? Math.max(0, 1 - (t - h.hitT) / 0.5) : 1;
        put('wave' + wi, h.wave.x - h.dir * 1.6 * S, 0, h.z, sz, al * h.fade, { tall: 1.25 });
      }
      return;
    }
    // the pot: drops in from the sky, tips, pours (its stream revealed as it starts), then lifts away
    const drop = t < 0.45 ? 1 - Math.pow(Math.min(1, t / 0.45), 2) : 0, lift = t > 2.2 ? Math.pow((t - 2.2) / 0.9, 2) : 0;
    const rev = t < 0.45 ? 0.52 : Math.min(1, 0.52 + (t - 0.45) / 0.35 * 0.48);
    const potAlpha = Math.max(0, 1 - lift * 1.2);
    put('pour', h.px, (drop * 9 + lift * 8) * S, h.z, 7, potAlpha, { ax: 0.67, ay: 0.98, rev, rot: 0.06 * Math.sin(t * 3) });
    if (t > 0.5 && t < 2.3) { // splashing where the broth lands
      const si = Math.floor(t / 0.09) % 3;
      put('splash' + si, h.px, 0, h.z + 0.05 * S, 4.2, Math.min(1, (t - 0.5) * 4) * (t > 2.1 ? (2.3 - t) / 0.2 : 1));
    }
  }
  /* ===================== Trace-to-cast (tap battles) =====================
     Pressing a ready special freezes time and shows that move's rune. A glowing guide traces it to
     show the way; you draw over it. Good tracing casts the move (neater = stronger); a miss or the
     timer running out leaves your charge untouched. */
  const RUNES = { // points in a unit box (0..1), drawn in order
    steampuff: { name: 'Swirl', pts: [[0.72, 0.18], [0.35, 0.16], [0.24, 0.36], [0.5, 0.5], [0.76, 0.64], [0.66, 0.85], [0.28, 0.84]] }, // S
    bunslam: { name: 'Slam', pts: [[0.15, 0.18], [0.5, 0.86], [0.85, 0.18]] }, // V
    crispydash: { name: 'Bolt', pts: [[0.18, 0.2], [0.82, 0.2], [0.18, 0.8], [0.82, 0.8]] }, // Z
    pleatflurry: { name: 'Pleats', pts: [[0.08, 0.2], [0.29, 0.82], [0.5, 0.35], [0.71, 0.82], [0.92, 0.2]] }, // W
    brothbubble: { name: 'Bubble', circle: true },
    ladlesplash: { name: 'Wave', pts: [[0.06, 0.5], [0.2, 0.28], [0.36, 0.5], [0.52, 0.72], [0.68, 0.5], [0.82, 0.28], [0.94, 0.45]] },
    grandsteamer: { name: 'Tornado', spiral: true },
    goldenfry: { name: 'Flame', pts: [[0.5, 0.1], [0.86, 0.86], [0.14, 0.86], [0.5, 0.1]] }, // triangle
    hotpot: { name: 'Frost', pts: [[0.18, 0.18], [0.82, 0.18], [0.82, 0.82], [0.18, 0.82], [0.18, 0.18]] }, // square
  };
  const TRACE = { time: 6, need: 0.78, prec: 0.62 }; // seconds to trace; coverage and precision needed
  function runePoints(id) {
    const r = RUNES[id] || RUNES.steampuff;
    let pts;
    if (r.circle) pts = Array.from({ length: 49 }, (_, i) => { const a = -Math.PI / 2 + (i / 48) * TAU; return [0.5 + Math.cos(a) * 0.38, 0.5 + Math.sin(a) * 0.38]; });
    else if (r.spiral) pts = Array.from({ length: 70 }, (_, i) => { const k = i / 69, a = k * TAU * 2.1, rr = 0.06 + k * 0.36; return [0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr]; });
    else pts = r.pts;
    // resample evenly so scoring treats every part of the rune the same
    const segs = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); L += d; }
    const N = 72, out = [];
    for (let n = 0; n <= N; n++) {
      let want = (n / N) * L, i = 0;
      while (i < segs.length - 1 && want > segs[i]) { want -= segs[i]; i++; }
      const k = segs[i] ? Math.min(1, want / segs[i]) : 0;
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]);
    }
    return out;
  }
  function traceOpen(i) {
    const p = F[0], s = tapSpecialState(p, i);
    const ov = stageEl.querySelector('#bt-trace'); if (!ov || match.tracing) return;
    tapClearInputs();
    const tr = match.tracing = { i, id: s.id, t0: performance.now(), ink: [], down: false, done: false, cov: 0, best: 0 };
    ov.hidden = false;
    ov.querySelector('.tr-name').textContent = DG.MOVES[s.id].name;
    ov.querySelector('.tr-rune').textContent = (RUNES[s.id] || {}).name || '';
    sfx('charge'); speedLines(0.4);
    const cv = ov.querySelector('canvas');
    const box = () => { const w = cv.clientWidth, h = cv.clientHeight, sz = Math.min(w * 0.78, h * 0.5); return { x: (w - sz) / 2, y: h * 0.48 - sz / 2, s: sz, w, h }; };
    tr.box = box;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); if (tr.done) return; try { cv.setPointerCapture(e.pointerId); } catch (err) {} tr.down = true; tr.ink.push([pt(e)]); };
    cv.onpointermove = (e) => { if (!tr.down || tr.done) return; e.preventDefault(); tr.ink[tr.ink.length - 1].push(pt(e)); traceScore(tr); if (tr.cov >= 0.97 && tr.prec >= TRACE.prec) traceFinish(true); };
    cv.onpointerup = cv.onpointercancel = (e) => { if (!tr.down) return; tr.down = false; traceScore(tr); if (tr.cov >= TRACE.need && tr.prec >= TRACE.prec) traceFinish(true); };
    ov.querySelector('.tr-x').onclick = (e) => { e.stopPropagation(); traceFinish(false, 'cancel'); };
    requestAnimationFrame(traceLoop);
  }
  function traceScore(tr) {
    const b = tr.box(), rune = runePoints(tr.id).map(([u, v]) => [b.x + u * b.s, b.y + v * b.s]), tol = b.s * 0.11;
    const ink = tr.ink.flat(); if (ink.length < 4) { tr.cov = 0; tr.prec = 0; return; }
    tr.hit = rune.map(([x, y]) => ink.some(([a, c]) => (a - x) ** 2 + (c - y) ** 2 < tol * tol));
    tr.cov = tr.hit.filter(Boolean).length / rune.length;
    const near = ink.filter(([a, c]) => rune.some(([x, y]) => (a - x) ** 2 + (c - y) ** 2 < tol * tol * 2.6)).length;
    tr.prec = near / ink.length;
  }
  function traceLoop() {
    const tr = match && match.tracing; if (!tr || tr.done) return;
    const now = performance.now(); if (match.paused) tr.t0 += now - (tr.lastT || now); tr.lastT = now; // the clock waits while paused
    const ov = stageEl.querySelector('#bt-trace'), cv = ov.querySelector('canvas'), b = tr.box();
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(b.w * dpr) || cv.height !== Math.round(b.h * dpr)) { cv.width = Math.round(b.w * dpr); cv.height = Math.round(b.h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, b.w, b.h);
    const el = (performance.now() - tr.t0) / 1000, left = Math.max(0, TRACE.time - el);
    const rune = runePoints(tr.id).map(([u, v]) => [b.x + u * b.s, b.y + v * b.s]);
    const col = (ORB[tr.id] || ['#ffcc33'])[0];
    // magic circle behind the rune
    ctx.save(); ctx.translate(b.x + b.s / 2, b.y + b.s / 2); ctx.rotate(el * 0.4);
    ctx.strokeStyle = 'rgba(255,230,160,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.arc(0, 0, b.s * 0.56, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // the rune: a soft glow, then gold where you've traced
    const path = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = col; ctx.shadowBlur = 24; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = b.s * 0.075; path(rune); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([2, 9]); path(rune); ctx.stroke(); ctx.setLineDash([]);
    if (tr.hit) { ctx.strokeStyle = '#ffd84a'; ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 16; ctx.lineWidth = b.s * 0.05;
      for (let i = 1; i < rune.length; i++) if (tr.hit[i] && tr.hit[i - 1]) { ctx.beginPath(); ctx.moveTo(rune[i - 1][0], rune[i - 1][1]); ctx.lineTo(rune[i][0], rune[i][1]); ctx.stroke(); }
      ctx.shadowBlur = 0; }
    // start marker, and a guiding spark that runs along the rune to show the way (until you start drawing)
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rune[0][0], rune[0][1], 9 + Math.sin(el * 8) * 2, 0, TAU); ctx.fill();
    if (!tr.ink.length) {
      const k = (el * 0.55) % 1, gp = rune[Math.min(rune.length - 1, Math.floor(k * rune.length))];
      DG.draw.sparkle(ctx, gp[0], gp[1], 16, '#fff6c0');
      ctx.font = '34px serif'; ctx.textAlign = 'center'; ctx.fillText('👆', gp[0] + 14, gp[1] + 40);
    }
    // your ink
    ctx.strokeStyle = '#fff'; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.lineWidth = 7;
    tr.ink.forEach((st) => { if (st.length > 1) { path(st); ctx.stroke(); } }); ctx.shadowBlur = 0;
    // timer ring
    const ring = ov.querySelector('.tr-time'); if (ring) ring.style.setProperty('--k', (left / TRACE.time).toFixed(3));
    ov.querySelector('.tr-pct').textContent = Math.round(tr.cov * 100) + '%';
    if (left <= 0) { traceScore(tr); return traceFinish(tr.cov >= TRACE.need && tr.prec >= TRACE.prec); }
    requestAnimationFrame(traceLoop);
  }
  function traceFinish(ok, why) {
    const tr = match && match.tracing; if (!tr || tr.done) return;
    tr.done = true;
    const ov = stageEl.querySelector('#bt-trace'); ov.hidden = true;
    const ink = ov.querySelector('canvas'); ink.onpointerdown = ink.onpointermove = ink.onpointerup = null;
    match.tracing = null; tapClearInputs(); last = performance.now();
    const p = F[0], o = F[1];
    if (ok) {
      const acc = Math.min(1, (tr.cov + tr.prec) / 2), perfect = acc > 0.9;
      p.perfectRune = perfect;
      tapStartSpecial(p, o, tr.i, 0.9 + 0.35 * acc);
      if (perfect) { match.stats.perfectRunes = (match.stats.perfectRunes || 0) + 1; flashScreen(); }
    } else {
      floatText(p, why === 'cancel' ? 'Cancelled' : 'The rune fizzled…', '#ffe08a'); sfx('bad');
    }
  }

  /* ===================== Tap combat (single-player default) =====================
     Fighters stand facing each other. Tap the rival (or press J) to attack; Block / Dodge answer the
     opponent's telegraphed attacks: BLUE (shield, "BLOCK") = Block, RED (chevrons, "DODGE") = Dodge.
     The answer is accepted any time during the wind-up and resolved at impact. Two equipped specials
     spend the shared charge meter. Friend battles keep the classic controls. */
  /** The opponent's difficulty tier (0 = Chili Wonton … 6 = Grand Bao Champion); practice sparring counts as tier 0. */
  function tapTier() { return match && match.opp ? match.opp.tier : 0; }
  function tapWindup(e) { const t = tapTier(); return TAP.windup * (t <= 0 ? 1.5 : t === 1 ? 1.25 : t >= 6 ? 0.92 : 1); }
  function tapQueue(kind) {
    if (!match || match.mode !== 'tap' || match.paused || match.tracing || match.over || match.phase !== 'fight') return;
    tapQ = kind; // one input per press; a newer press replaces an older unhandled one
  }
  function tapClearInputs() { tapQ = null; tapMoveTo = null; Object.keys(edges).forEach((k) => (edges[k] = false)); Object.keys(keys).forEach((k) => (keys[k] = false)); }
  /** Cancel the opponent's current telegraph (pause, KO, time-out, end) so no cue is ever left hanging. */
  function tapCancelCue(reason) {
    const e = F[1]; if (!e || !e.tap) return;
    const a = e.tap.atk;
    if (a && !a.resolved) { a.resolved = true; a.cancelled = reason || true; }
    e.tap.atk = null;
    if (e.state === 'windup') { setState(e, 'idle'); e.tap.next = match.ft + rand(TAP.gapMin, TAP.gapMax); }
    tapCueEl(null);
  }
  function tapCueEl(a) {
    const el = stageEl && stageEl.querySelector('#a-cue'); if (!el) return;
    if (!a) { el.className = 'a-cue'; el.innerHTML = ''; return; }
    el.className = 'a-cue show ' + a.color;
    if (a.color === 'special') { el.innerHTML = `<img src="${colSrc('e-block-shield')}" alt=""><b>SPECIAL — BLOCK!</b>`; el.setAttribute('aria-label', 'Rival special coming: Block to take less damage'); return; }
    el.innerHTML = a.color === 'blue' ? `<img src="${colSrc('e-block-shield')}" alt=""><b>BLOCK</b>`
      : `<span class="cue-row"><img src="${colSrc('e-attack-warning')}" alt=""><img class="chev" src="${colSrc('e-dodge-chevron')}" alt=""></span><b>DODGE</b>`;
    const tele = stageEl.querySelector('#bt-tele'); if (tele) tele.src = btSrc(a.color === 'blue' ? 'ring_b1' : 'ring_r');
    el.setAttribute('aria-label', a.color === 'blue' ? 'Blue attack coming: Block' : 'Red attack coming: Dodge');
  }

  /** Where on the arena floor (y = 0) a screen point lands, kept inside the ring; null if off the floor. */
  function tapFloorPoint(clientX, clientY) {
    if (colView) { const r = stageEl.querySelector('#bt-cv').getBoundingClientRect(); return unpj(clientX - r.left, clientY - r.top); }
    const r = renderer.domElement.getBoundingClientRect();
    const rc = new THREE.Raycaster(); rc.setFromCamera({ x: ((clientX - r.left) / r.width) * 2 - 1, y: -((clientY - r.top) / r.height) * 2 + 1 }, camera);
    const hit = new THREE.Vector3();
    if (!rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
    const lim = match.R * 1.05, d = Math.hypot(hit.x, hit.z);
    if (d > lim * 1.25) return null; // well outside the ring (the stands)
    if (d > lim) hit.multiplyScalar(lim / d);
    return hit;
  }
  /** Is this screen point on the rival? Uses a raycast plus a generous circle around the projected fighter. */
  function tapHitsRival(clientX, clientY) {
    if (colView) {
      const r = stageEl.querySelector('#bt-cv').getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top, b = fighterBox(F[1]);
      const pad = Math.min(r.width, r.height) < 500 ? 22 : 12, rad = Math.max(TAP.tapRadius * (r.width < 500 ? 1.15 : 1), (b.y1 - b.y0) * 0.55);
      return (x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad) || Math.hypot(x - b.cx, y - b.cy) <= rad;
    }
    const e = F[1]; if (!e || !renderer) return false;
    const r = renderer.domElement.getBoundingClientRect();
    const nx = ((clientX - r.left) / r.width) * 2 - 1, ny = -((clientY - r.top) / r.height) * 2 + 1;
    const rc = new THREE.Raycaster(); rc.setFromCamera({ x: nx, y: ny }, camera);
    if (rc.intersectObject(e.mesh.body, true).length) return true;
    const c = new THREE.Vector3(e.pos.x, (e.mesh.topY * 0.5) * match.S, e.pos.z).project(camera);
    const top = new THREE.Vector3(e.pos.x, e.mesh.topY * match.S, e.pos.z).project(camera);
    const cx = r.left + (c.x * 0.5 + 0.5) * r.width, cy = r.top + (-c.y * 0.5 + 0.5) * r.height;
    const ty = r.top + (-top.y * 0.5 + 0.5) * r.height;
    const small = Math.min(r.width, r.height) < 500;
    const rad = Math.max(TAP.tapRadius * (small ? 1.3 : 1), Math.abs(cy - ty) * 1.35);
    return Math.hypot(clientX - cx, clientY - cy) <= rad;
  }

  function tapSpecialState(f, i) {
    const id = f.tapMoves[i], mv = DG.TAP_MOVES[id];
    const cd = f.tapCd[id] || 0, busy = f.state === 'move' || f.state === 'stun' || f.state === 'ko';
    return { id, mv, cd, ready: !!mv && f.special >= mv.cost && cd <= 0 && !busy && !match.over };
  }
  function tapStartSpecial(f, o, i, traced) {
    const s = tapSpecialState(f, i);
    if (!s.mv) return;
    if (!s.ready) {
      if (f.msgT <= 0) { floatText(f, s.cd > 0 ? 'Cooling down…' : f.special < s.mv.cost ? 'Still charging…' : 'Not now', '#ffe08a'); f.msgT = 0.5; }
      return;
    }
    if (f.isPlayer && !traced && colView) { traceOpen(i); return; } // trace the move's rune first (time stops)
    f.special -= s.mv.cost; f.tapCd[s.id] = s.mv.cd; // spent exactly once, here
    f.blocking = false; f.hitDone = true;
    setState(f, 'move');
    f.mvMul = (s.mv.power / (MOVE_BASE[s.id] || 1)) * (traced || 1);
    const make = () => {
      if (s.id === 'brothbubble') return tapBubble(f, o, s.mv);
      if (s.id === 'grandsteamer' || s.id === 'goldenfry' || s.id === 'hotpot') { speedLines(0.9); return ultimate(f, o, s.id); }
      return MOVES[s.id](f, o);
    };
    const SIG = { steampuff: tapSteamPuff, bunslam: tapBunSlam, crispydash: tapCrispyDash, pleatflurry: tapPleatFlurry, goldenfry: tapFieryBreath, ladlesplash: tapLadleSplash, brothbubble: tapBubble, hotpot: tapHotPot };
    f.mv = SIG[s.id] ? SIG[s.id](f, o) : tapCloseIn(f, o, make);
    f.mvSlot = 'tap' + i;
    btSpecialFx(s.id, f, o);
    banner(`<span class="mvname">${DG.ui.esc(DG.MOVES[s.id].name)}!</span>${f.perfectRune ? '<span class="mvsub">Perfect rune!</span>' : !f.isPlayer ? `<span class="mvsub">${DG.ui.esc(f.name)}'s special!</span>` : ''}`, 1.1); f.perfectRune = false;
    speedLines(0.25); sfx('special'); match.stats.specials++;
  }
  /** Specials first hop into range (fighters stand apart in tap mode), then run the move itself. */
  function tapCloseIn(f, o, make) {
    let inner = null, t = 0;
    const want = f.radius + o.radius + 0.5 * match.S;
    return { update(dt) {
      t += dt;
      if (!inner) {
        const d = flatDist(f, o);
        if (d > want && t < 0.25) { f.vel.copy(dirTo(f, o)).multiplyScalar(Math.min(26 * match.S, (d - want) / Math.max(dt, 0.016))); return false; }
        f.vel.set(0, 0, 0); inner = make();
      }
      return inner.update(dt);
    }, t: () => (inner ? inner.t() : 0) };
  }
  /** Broth Bubble in tap mode: a short protective bubble that pops outward for bonus damage. */
  function tapBubble(f, o) {
    let t = 0;
    f.bubble = f.isPlayer ? TAP.bubbleTime : TAP.bubbleTimeRival; sfx('pop'); sfx('splash');
    sprite('e-shield-bubble', { at: at(f, f.mesh.topY * 0.45), size: 5 * match.S, life: 0.5, z: 8, anim: (k) => ({ s: 0.3 + ease.pop(k) * 0.9, o: fade(k, 0.4) }) });
    floatText(f, 'Bubble shield!', '#9fe0ff', true);
    return { update(dt) { t += dt; f.vel.set(0, 0, 0); f.mvPose = t < 0.25 ? 'wind-up' : 'block'; return t >= 0.5; }, t: () => t };
  }
  /** A Broth Bubble soaks up most of a hit and bounces damage back at the attacker. */
  function bubbleReflect(att, def, dmg) {
    const back = Math.max(1, Math.round(dmg * TAP.bubbleReflect)), took = Math.max(1, Math.round(dmg * TAP.bubbleTake));
    def.hp = Math.max(0, def.hp - took); def.bubbleHit = 0.3;
    floatText(def, 'Bubble! -' + took, '#9fe0ff');
    if (att && att !== def && att.state !== 'ko') {
      att.hp = Math.max(0, att.hp - back); att.flash = 0.18;
      floatText(att, 'Deflected! -' + back, '#7fd0ff', true);
      sprite('e-broth-splash', { at: at(att, att.mesh.topY * 0.5), size: 2.6 * match.S, life: 0.45, z: 9, anim: (k) => ({ s: ease.pop(k), o: fade(k, 0.5) }) });
      att.kb.copy(dirTo(def, att)).multiplyScalar(4 * match.S);
      if (att.hp <= 0) endMatch(att === F[0] ? 'lose' : 'win', 'ko');
    }
    sfx('pop');
    if (def.hp <= 0) endMatch(def === F[0] ? 'lose' : 'win', 'ko');
  }

  function tapDefend(p, kind) {
    if (p.state === 'ko' || p.state === 'stun' || p.state === 'move') return;
    if (p.defCd > 0) return; // still busy with the last block/dodge
    // answering a warning cancels your own basic attack straight away (before its hit lands)
    if (p.state === 'windup' || (p.state === 'attack' && !p.hitDone) || p.state === 'recover') setState(p, 'idle');
    if (kind === 'dodge' && p.sta < p.maxSta * TAP.dodgeSta) { if (p.msgT <= 0) { floatText(p, 'Too tired to dodge!', '#ffc75a'); p.msgT = 0.6; } sfx('bad'); return; }
    p.defCd = TAP.defCd;
    if (kind === 'block') {
      p.blocking = true; p.blockT = TAP.blockHold; p.shieldT = TAP.blockHold + 0.15; sfx('block');
      const r = F[1]; if (r.spWarn || (r.state === 'move' && r.mvMul)) { p.spGuard = true; floatText(p, 'Bracing!', '#9fc4ff'); } // holds until the rival's special is over
    }
    else {
      p.sta -= p.maxSta * TAP.dodgeSta; // dodging is tiring (its own energy, not your special meter)
      setState(p, 'dodge'); p.dodgeTo = null; sfx('whoosh');
      sprite('e-dust-burst', { at: at(p, 0.3), size: 2.6 * match.S, life: 0.45, z: 2, anim: (k) => ({ s: 0.6 + k * 0.6, o: fade(k, 0.3) }) });
    }
    const a = F[1].tap && F[1].tap.atk;
    if (a && !a.resolved && !a.choice && F[1].state === 'windup') a.choice = kind; // first answer during the wind-up counts
  }
  function tapAttack(p) {
    if (p.state !== 'idle' || p.blocking || match.ft < (p.atkReady || 0)) return;
    p.atkReady = match.ft + TAP.atkWindup + TAP.atkRecover + TAP.atkGap;
    setState(p, 'windup'); p.hitDone = false; p.windup = TAP.atkWindup;
  }

  /** The enemy decides, at the moment your basic attack lands, whether it blocks or sidesteps. */
  function tapEnemyReact(e, spam) {
    if (e.state === 'stun' && spam < 3) return null; // a mashed rival shakes off the flinch and blocks
    if (e.state !== 'idle' && e.state !== 'recover' && e.state !== 'stun') return null;
    const st = e.style === 'mixed' ? e.ai.cur : e.style, t = tapTier(), r = Math.random();
    // every rival blocks now and then; mashing the attack makes them read it and block much more
    const read = Math.max(0, spam - 2) * (0.24 + t * 0.02);
    let pBlock = (st === 'blocker' ? 0.28 + t * 0.07 : 0.1 + t * 0.03) + read;
    if (e.state === 'recover') pBlock = read * 0.6; // a real opening after its own attack: only heavy mashing gets read
    if (e.state === 'stun') pBlock = read * 0.9;
    pBlock = Math.min(0.9, pBlock);
    const pDodge = e.state === 'recover' ? 0 : st === 'dodger' ? 0.2 + t * 0.06 : 0;
    if (r < pBlock) return 'block';
    if (r < pBlock + pDodge) return 'dodge';
    return null;
  }
  function tapPlayerImpact(p, e) {
    if (p.hitDone) return; p.hitDone = true; // one hit per attack
    slashFx(p, false);
    p.atkLog = (p.atkLog || []).filter((t0) => match.ft - t0 < TAP.spamWindow); p.atkLog.push(match.ft);
    const counter = e.state === 'recover' || e.state === 'stun';
    const react = tapEnemyReact(e, p.atkLog.length);
    if (react === 'block') { // blocked! the rival's guard bounces you off and you stumble
      e.blocking = true; e.tapShieldT = 0.5; setState(e, 'idle');
      sfx('block'); floatText(e, 'Blocked!', '#7fb2ff');
      sprite('e-block-shield', { at: at(e, e.mesh.topY * 0.55), size: 2.6 * match.S, life: 0.6, z: 7, anim: (k) => ({ s: ease.pop(k), o: fade(k, 0.5) }) });
      btBadge(e, 'blockbadge');
      setState(p, 'stun'); p.stunDur = TAP.stumble; p.stumbling = true; p.atkLog = []; p.goal = p.pos.clone(); p.blocking = false;
      p.kb.copy(dirTo(e, p)).multiplyScalar(5 * match.S); match.shake = Math.max(match.shake, 0.12);
      floatText(p, 'Stumbled!', '#ffc75a', true);
      tapCancelCue('stumble');
      e.pummel = { n: TAP.pummel, next: match.ft + 0.35 }; // …and the rival piles in while you're dazed
      return;
    }
    if (react === 'dodge') {
      setState(e, 'dodge'); e.tapSide = Math.random() < 0.5 ? 1 : -1; floatText(e, 'Dodged!', '#6fd3b5'); sfx('whoosh');
      if (e.ai) e.ai.counter = true; return;
    }
    let mult = 1;
    if (counter && e.state === 'recover') { mult = 1.25; floatText(p, 'COUNTER!', '#ffe066'); }
    const res = applyHit(p, e, p.dmg * mult, { kb: 1.4, stun: 0.18, noParry: true, aoe: true, blockCost: 0 });
    e.blocking = false;
    btSlash(p, e, null, mult > 1);
    if (!DG.state.settings.tapHintDone) { DG.state.settings.tapHintDone = true; DG.save(); const h = stageEl.querySelector('#a-taphint'); if (h) h.classList.add('gone'); } // onboarding done after the first hit
    if (res === 'hit') {
      btBurst(e, mult > 1 ? 'impact1' : 'impact2', mult > 1 ? 3 : 2.2, 0.35, 1.0);
      const before = p.special; p.special = Math.min(100, p.special + TAP.hitCharge * (p.chargeMul || 1));
      if (before < 50 && p.special >= 50) { floatText(p, 'Special ready! ✨', '#ffe066', true); sfx('special'); }
    }
    else if (res === 'blocked') sprite('shield', { at: at(e, 1.2), size: 2 * match.S, life: 0.45, z: 7, anim: (k) => ({ s: ease.pop(k), o: fade(k, 0.5) }) });
  }

  /** Resolve the enemy's telegraphed attack at impact against the answer you gave during the wind-up. */
  function tapEnemyImpact(e, p) {
    const a = e.tap.atk; if (!a || a.resolved) return;
    a.resolved = true; tapCueEl(null);
    if (p.state === 'ko' || match.over) return;
    const right = (a.color === 'blue' && a.choice === 'block') || (a.color === 'red' && a.choice === 'dodge');
    e.special = Math.min(100, (e.special || 0) + (right ? TAP.eDefCharge : TAP.eHitCharge) * (tapTier() === 0 ? 0.6 : 1));
    if (right && a.color === 'blue') {
      p.blocking = true; p.blockT = Math.max(p.blockT || 0, 0.25); parry(p, e); match.stats.blocks++;
      btBadge(p, 'blockbadge'); p.shieldT = Math.max(p.shieldT || 0, 0.55); p.shieldHit = 0.3;
      return;
    }
    if (right) {
      if (p.state !== 'dodge') { setState(p, 'dodge'); p.dodgeSide = p.dodgeSide || 1; }
      perfectDodge(p); match.stats.dodges++; btBadge(p, 'dodgebadge'); btPuffs(p, 5, 1.6);
      setState(e, 'recover'); e.tap.rec = TAP.recover + TAP.counter; return;
    }
    // missed it: the attack lands
    p.blocking = false; p.invuln = 0;
    if (p.state === 'dodge') setState(p, 'idle');
    let dmg = e.dmg * (a.color === 'red' ? TAP.redDmg : 1);
    if (a.color === 'red' && a.choice === 'block') { floatText(p, 'GUARD BREAK!', '#ff9f40', true); dmg = e.dmg * TAP.guardBreakDmg; }
    else if (a.choice) floatText(p, a.color === 'blue' ? 'Blue = Block!' : 'Red = Dodge!', '#ffffff');
    e.facing = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    applyHit(e, p, dmg, { kb: a.color === 'red' ? 3 : 2, stun: TAP.hitStun, noParry: true, aoe: true, heavy: a.color === 'red' });
    btSlash(e, p, a.color === 'red' ? 'slash2' : 'slash3', a.color === 'red'); btBurst(p, a.color === 'red' ? 'impact3' : 'impact2', a.color === 'red' ? 3.2 : 2.4, 0.4, 1.0);
  }

  function tapEnemyStart(e, p) {
    const t = tapTier(), st = e.style === 'mixed' ? e.ai.cur : e.style;
    e.tap.count++;
    let red = t === 0 && e.tap.count <= 3 ? 0 : st === 'charger' ? 0.3 : st === 'blocker' ? 0.35 : st === 'dodger' ? 0.5 : 0.45;
    if (e.ai.counter) { red = Math.max(red, 0.65); e.ai.counter = false; } // a blocked or dodged hit invites a guard-breaking counter
    const color = Math.random() < red ? 'red' : 'blue';
    e.tap.atk = { color, choice: null, resolved: false };
    setState(e, 'windup'); e.windup = tapWindup(e);
    tapCueEl(e.tap.atk); sfx('charge');
  }
  function tapEnemyGap(e) {
    const t = tapTier(), st = e.style === 'mixed' ? e.ai.cur : e.style;
    const slow = t === 0 ? 1.5 : t === 1 ? 1.2 : 1;
    let g = rand(TAP.gapMin, TAP.gapMax) * slow * (st === 'charger' ? 0.8 : st === 'blocker' ? 1.15 : 1);
    if (st === 'mixed' && Math.random() < 0.35) g = 0.35; // the champion likes quick double attacks
    return g;
  }

  function tapStep(dt) {
    const p = F[0], e = F[1], S = match.S;
    match.ft += dt;
    [p, e].forEach((f) => {
      f.stT += dt; f.flash = Math.max(0, f.flash - dt); f.msgT -= dt; f.invuln = Math.max(0, f.invuln - dt);
      f.defCd = Math.max(0, (f.defCd || 0) - dt); f.tapShieldT = Math.max(0, (f.tapShieldT || 0) - dt);
      if (f.chainT > 0) { f.chainT -= dt; if (f.chainT <= 0) f.chain = 0; }
      if (f.bubble > 0) f.bubble = Math.max(0, f.bubble - dt);
      if (f.bubbleHit > 0) f.bubbleHit = Math.max(0, f.bubbleHit - dt);
      Object.keys(f.tapCd || {}).forEach((k) => (f.tapCd[k] = Math.max(0, f.tapCd[k] - dt)));
    });
    if (e.style === 'mixed') { e.ai.mixT -= dt; if (e.ai.mixT <= 0) { e.ai.mixT = 7; e.ai.cur = pick(['charger', 'blocker', 'dodger']); } }
    if (e.spWarn) { // the rival is powering up a special
      if (e.state === 'stun' || e.state === 'ko' || match.over) { e.spWarn = null; tapCueEl(null); }
      else if ((e.spWarn.t += dt) >= TAP.spWarn) { const i = e.spWarn.i; e.spWarn = null; tapCueEl(null); setState(e, 'idle'); tapStartSpecial(e, p, i, 1); match.stats.rivalSpecials = (match.stats.rivalSpecials || 0) + 1; }
    }
    if (p.spGuard) { if (!e.spWarn && !(e.state === 'move' && e.mvMul)) p.spGuard = false; else p.shieldT = Math.max(p.shieldT || 0, 0.3); }
    // (tap battles: no passive special charging — your hits fill the meter; dodge energy refills by itself)
    if (!match.over && p.state !== 'ko') p.sta = Math.min(p.maxSta, p.sta + p.maxSta * TAP.dodgeRegen * dt);

    // --- your input (one per press) ---
    const k = E('KeyJ') ? 'attack' : E('KeyK') ? 'block' : E('Space') ? 'dodge' : E('KeyL') ? 'sp0' : E('KeyI') ? 'sp1' : null;
    let inp = tapQ || k; tapQ = null;
    if (p.stumbling) { inp = null; tapMoveTo = null; } // dazed: no moving, attacking or defending
    if (tapMoveTo) { if (['idle', 'recover', 'dodge'].includes(p.state) && !p.blocking) { p.goal = tapMoveTo.clone(); if (p.state === 'recover') setState(p, 'idle'); } tapMoveTo = null; }
    if (inp && !match.over) {
      if (inp === 'attack') tapAttack(p);
      else if (inp === 'block' || inp === 'dodge') tapDefend(p, inp);
      else tapStartSpecial(p, e, inp === 'sp0' ? 0 : 1);
    }

    // --- you ---  (you walk to wherever you tapped; an attack runs into range first)
    if (p.blocking) { p.blockT -= dt; if (p.blockT <= 0) p.blocking = false; }
    const reach = p.radius + e.radius + 0.25 * S;
    let walk0 = null; // where to walk this frame, and how fast (world units / second)
    switch (p.state) {
      case 'idle': walk0 = [p.goal, p.speed * S * 1.3]; break;
      case 'windup': if (p.stT >= p.windup) setState(p, 'attack'); break;
      case 'attack': {
        const dir = dirTo(p, e), stop = e.pos.clone().addScaledVector(dir, -reach);
        walk0 = [stop, 16 * S];
        if (!p.hitDone && (flatDist(p, e) <= reach + 0.2 * S || p.stT >= 0.55)) { if (flatDist(p, e) <= reach + 0.6 * S) tapPlayerImpact(p, e); else { p.hitDone = true; floatText(p, 'Too far!', '#ffe08a'); } }
        if (p.hitDone) { setState(p, 'recover'); p.goal = p.pos.clone(); }
        break;
      }
      case 'recover': if (p.stT >= TAP.atkRecover) { setState(p, 'idle'); p.goal = p.pos.clone(); } break;
      case 'dodge': {
        if (!p.dodgeTo) { // retreat straight back from the rival (sliding along the ring edge if needed)
          const back = p.pos.clone().addScaledVector(dirTo(p, e), -TAP.dodgeBack * S), lim = match.R - p.radius, d = Math.hypot(back.x, back.z);
          if (d > lim) back.multiplyScalar(lim / d);
          p.dodgeTo = back;
        }
        walk0 = [p.dodgeTo, 14 * S];
        p.hopY = Math.sin(Math.min(1, p.stT / TAP.dodgeHold) * Math.PI) * 0.45 * S;
        if (p.stT >= TAP.dodgeHold) { setState(p, 'idle'); p.goal = p.pos.clone(); p.dodgeTo = null; p.hopY = 0; }
        break;
      }
      case 'stun': if (p.stT >= p.stunDur) { setState(p, 'idle'); p.goal = p.pos.clone(); p.stumbling = false; } break;
      case 'move': if (p.mv && p.mv.update(dt)) { p.mv = null; p.mvMul = null; p.spin = false; p.lockFacing = false; p.hopY = 0; p.mvPose = p.mvRot = p.mvSq = null; p.mvFace = 0; p.meteor = false; p.onFire = false; setState(p, 'recover'); p.goal = p.pos.clone(); } break;
    }
    if (p.state !== 'dodge') p.dodgeTo = null;
    // --- the opponent ---  (closes in before it winds up; lunges at impact)
    const t = tapTier(), st = e.style === 'mixed' ? e.ai.cur : e.style;
    const atkRange = e.radius + p.radius + (st === 'dodger' ? 1.0 : 0.6) * S, hitRange = e.radius + p.radius + 1.9 * S;
    let walk1 = null;
    if (e.pummel && e.state !== 'ko' && !match.over) { // free hits on a stumbling player
      const pm = e.pummel;
      if (!p.stumbling || p.state === 'ko' || pm.n <= 0) { e.pummel = null; if (e.state !== 'stun') setState(e, 'idle'); e.tap.next = match.ft + tapEnemyGap(e); }
      else {
        walk1 = [p.pos.clone().addScaledVector(dirTo(p, e), atkRange * 0.85), e.speed * S * 1.8];
        if (e.state === 'recover' && e.stT > 0.18) setState(e, 'idle');
        if (e.state !== 'idle' && e.state !== 'recover') setState(e, 'idle');
        if (match.ft >= pm.next && flatDist(e, p) <= atkRange + 0.5 * S) {
          pm.n--; pm.next = match.ft + TAP.pummelGap; setState(e, 'recover');
          const rem = Math.max(0.15, p.stunDur - p.stT); // the hits don't shorten or lengthen the daze
          applyHit(e, p, e.dmg * TAP.pummelDmg, { kb: 1.2, stun: rem, noParry: true, aoe: true });
          p.stumbling = true; btSlash(e, p, null, pm.n === 0); cheer(0.6);
        }
      }
    } else if (e.state !== 'ko' && !match.over) {
      switch (e.state) {
        case 'idle': {
          const d = flatDist(e, p), keep = st === 'dodger' ? atkRange + 2.2 * S : st === 'blocker' ? atkRange + 0.6 * S : atkRange + 1.0 * S;
          const ready = match.ft >= e.tap.next && p.state !== 'move' && p.state !== 'ko';
          // circle a little around you while waiting
          if (Math.random() < dt * 0.4) e.ai.side *= -1;
          const side = new THREE.Vector3(-dirTo(e, p).z, 0, dirTo(e, p).x).multiplyScalar(e.ai.side * 1.2 * S);
          const want = p.pos.clone().addScaledVector(dirTo(p, e), ready ? atkRange * 0.95 : keep).add(ready ? new THREE.Vector3() : side);
          walk1 = [want, e.speed * S * (ready ? 1.5 : 0.7) * (t === 0 ? 0.8 : 1)];
          if (ready && !e.spWarn && e.special >= 50 && e.tapMoves && e.tapMoves.length && d <= atkRange + 2.5 * S && p.state !== 'ko') { // a full meter: unleash a special
            e.spWarn = { t: 0, i: Math.floor(Math.random() * e.tapMoves.length) }; walk1 = null;
            tapCueEl({ color: 'special' }); sfx('charge'); floatText(e, '⚡ Special incoming!', '#d9b8ff', true);
          } else if (ready && !e.spWarn && d <= atkRange + 0.3 * S) tapEnemyStart(e, p);
          if (e.spWarn) walk1 = null; // stands still while powering up
          break;
        }
        case 'windup':
          if (e.stT >= e.windup) {
            // lunge, then resolve: if you've walked out of reach it simply misses
            e.pos.addScaledVector(dirTo(e, p), Math.min(1.4 * S, Math.max(0, flatDist(e, p) - (e.radius + p.radius))));
            if (flatDist(e, p) > hitRange && e.tap.atk && !e.tap.atk.resolved) { e.tap.atk.resolved = true; tapCueEl(null); floatText(p, 'Missed!', '#9fe8ff'); }
            else tapEnemyImpact(e, p);
            if (e.state === 'windup') { setState(e, 'recover'); e.tap.rec = e.tap.rec || TAP.recover; }
          }
          break;
        case 'recover':
          if (e.stT >= (e.tap.rec || TAP.recover)) { e.tap.rec = 0; setState(e, 'idle'); e.tap.next = match.ft + tapEnemyGap(e); }
          break;
        case 'stun': if (e.stT >= e.stunDur) { setState(e, 'idle'); e.tap.next = match.ft + tapEnemyGap(e) * 0.6; } break;
        case 'move': // the rival's special plays out, then it takes a breather
          if (!e.mv || e.mv.update(dt)) {
            e.mv = null; e.mvMul = null; e.spin = false; e.lockFacing = false; e.hopY = 0; e.mvPose = e.mvRot = e.mvSq = null; e.mvFace = 0; e.meteor = false; e.onFire = false;
            setState(e, 'recover'); e.tap.rec = TAP.recover + 0.4; e.goal = e.pos.clone();
          }
          break;
        case 'dodge': {
          if (!e.dodgeTo) e.dodgeTo = e.pos.clone().add(new THREE.Vector3(-dirTo(e, p).z, 0, dirTo(e, p).x).multiplyScalar((e.tapSide || 1) * 1.8 * S));
          walk1 = [e.dodgeTo, 12 * S];
          if (e.stT >= 0.4) { setState(e, 'idle'); e.dodgeTo = null; }
          break;
        }
      }
    }
    // a telegraph that is no longer valid (the enemy was staggered, knocked out, or the match ended) is cleared
    if (e.tap.atk && !e.tap.atk.resolved && (e.state !== 'windup' || match.over)) tapCancelCue('interrupted');

    // --- positions: walk toward goals at a steady speed (specials drive their own movement) ---
    [[p, walk0], [e, walk1]].forEach(([f, w]) => {
      if (f.state !== 'move') f.vel.set(0, 0, 0); // a special keeps its own velocity
      if (f.state !== 'move' && w && f.state !== 'ko' && f.state !== 'stun') {
        const to = new THREE.Vector3(w[0].x - f.pos.x, 0, w[0].z - f.pos.z), d = to.length();
        if (d > 0.05) { f.vel.copy(to).multiplyScalar(Math.min(w[1], d / Math.max(dt, 0.016)) / d); }
      }
      f.pos.addScaledVector(f.vel, dt);
      f.pos.addScaledVector(f.kb, dt); f.kb.multiplyScalar(Math.max(0, 1 - dt * 7));
      const lim = match.R - f.radius, d = Math.hypot(f.pos.x, f.pos.z);
      if (d > lim) { f.pos.x *= lim / d; f.pos.z *= lim / d; }
      const o = f === p ? e : p;
      if (!f.lockFacing) { const want = Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z); let df = ((want - f.facing + Math.PI) % TAU + TAU) % TAU - Math.PI; f.facing += df * Math.min(1, dt * 12); }
    });
    // keep the two apart
    const d = flatDist(p, e), min = p.radius + e.radius;
    if (d < min && d > 1e-4 && p.state !== 'ko' && e.state !== 'ko') {
      const push = (min - d) / 2, nx = (e.pos.x - p.pos.x) / d, nz = (e.pos.z - p.pos.z) / d;
      p.pos.x -= nx * push; p.pos.z -= nz * push; e.pos.x += nx * push; e.pos.z += nz * push;
    }
  }
  /** Colours the opponent's outline / ring and keeps the BLOCK / DODGE cue above its head. */
  function tapDecor() {
    if (colView) { // 2D: the glow and bubble are drawn on the canvas; place the cue above the rival's head
      const e = F[1], a = e && e.tap && e.tap.atk, on = a && !a.resolved && e.state === 'windup', el = stageEl && stageEl.querySelector('#a-cue');
      const tele = stageEl && stageEl.querySelector('#bt-tele'); if (tele) tele.classList.remove('show');
      if (el && on) {
        const b = fighterBox(e), hudBottom = (stageEl.querySelector('.bt-hud') || { offsetHeight: 0 }).offsetHeight + 70;
        const hat = e.accessory && ACC[e.accessory] && ['hat', 'band'].includes(ACC[e.accessory][0]) ? (b.y1 - b.y0) * 0.42 : 0; // clear the hat
        el.style.transform = `translate(${b.cx}px, ${Math.max(hudBottom, b.y0 - hat - 4)}px) translate(-50%, -100%)`;
      }
      return;
    }
    const e = F[1], a = e && e.tap && e.tap.atk, m = e && e.mesh;
    if (!m) return;
    const on = a && !a.resolved && e.state === 'windup';
    if (on) {
      const k = Math.min(1, e.stT / e.windup), pulse = 0.5 + 0.5 * Math.sin(T * 22);
      const col = a.color === 'blue' ? 0x3a8cff : 0xff3a3a;
      m.mats.forEach((mt) => mt.emissive && mt.emissive.setHex(a.color === 'blue' ? (pulse > 0.5 ? 0x123a80 : 0x0a2050) : (pulse > 0.5 ? 0x801010 : 0x500808)));
      m.tele.material.color.setHex(col); m.tele.visible = true; m.tele.material.opacity = 0.5 + 0.45 * k; m.tele.scale.setScalar(1.35 - 0.3 * k);
      m.bang.visible = false;
      if (m.outline) { m.outline.visible = true; m.outline.material.color.setHex(col); }
    } else {
      m.tele.material.color.setHex(0xff4040); m.tele.visible = false; m.bang.visible = false;
      if (m.outline) m.outline.visible = false;
    }
    if (e.tapShieldT > 0) m.shield.visible = true;
    if (F[0].mesh) { F[0].mesh.tele.visible = false; }
    // cue above the opponent's head
    const el = stageEl && stageEl.querySelector('#a-cue');
    const tele = stageEl && stageEl.querySelector('#bt-tele');
    if (tele) tele.classList.toggle('show', !!on);
    if (el && on) {
      const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
      const v = new THREE.Vector3(e.pos.x, (e.mesh.topY + 0.9) * match.S + e.hopY, e.pos.z).project(camera);
      const hudBottom = (stageEl.querySelector('.bt-hud') || { offsetHeight: 0 }).offsetHeight + 70; // keep the cue below the HUD
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${Math.max(hudBottom, (-v.y * 0.5 + 0.5) * h)}px) translate(-50%, -100%)`;
      if (tele) { // the glowing ring around the opponent's body
        const c = new THREE.Vector3(e.pos.x, e.mesh.topY * 0.5 * match.S, e.pos.z), c2 = c.clone().add(new THREE.Vector3(1, 0, 0));
        const pc = c.clone().project(camera), p2 = c2.project(camera), ppu = Math.abs(p2.x - pc.x) * 0.5 * w;
        const k = Math.min(1, e.stT / e.windup), size = (e.radius * 3.0 + (1 - k) * 0.8 * match.S) * ppu;
        tele.style.width = size + 'px';
        tele.style.transform = `translate(${(pc.x * 0.5 + 0.5) * w}px, ${(-pc.y * 0.5 + 0.5) * h}px) translate(-50%, -50%) rotate(${T * 1.5}rad)`;
      }
    }
  }
  /** Back-face shell around a fighter so the telegraph reads as a coloured outline. */
  function addOutline(m) {
    const geo = new THREE.SphereGeometry(1.09, 28, 20);
    const shell = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3a8cff, side: THREE.BackSide, transparent: true, opacity: 0.9 }));
    const main = m.body.children[0];
    shell.scale.copy(main.scale).multiplyScalar(1.0); shell.position.copy(main.position); shell.visible = false;
    m.body.add(shell); m.outline = shell;
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
    // tap controls are the default for single-player; friend battles keep the classic controls and protocol
    const mode = opts.net ? 'classic' : 'tap'; // solo battles are always tap battles
    const Rt = mode === 'tap' ? 4.7 * S : R; // tap battles use a cosier painted ring
    if (mode === 'tap') {
      DG.seedMoves();
      Object.assign(pDef, { canSpecial: true, canMove2: false, canUlt: false, tapMoves: DG.state.moves.equipped.slice(0, 2).filter(Boolean) }); // snapshot of the loadout (empty slots skipped)
    }
    tapQ = null;
    match = { mode, ft: 0, R: Rt, net: !!opts.net, stats: { maxCombo: 0, perfect: 0, parries: 0, smashes: 0, blocks: 0, dodges: 0, specials: 0 }, hitstop: 0, slow: 0, speedT: 0, practice, opp, S, si, time: MATCH_TIME, phase: 'intro', phaseT: 0, over: false, endT: 0, shake: 0, cheer: 0.6, paused: false, winner: null };
    const tapMv = mode === 'tap' ? pDef.tapMoves.map((id) => ({ id, mv: DG.TAP_MOVES[id], name: DG.MOVES[id].name })) : [];
    root.innerHTML = `
      <div class="arena-stage ${mode === 'tap' ? 'tapmode' : ''}" id="a-stage">
        ${mode === 'tap' ? '<canvas class="bt-cv" id="bt-cv" aria-label="Battle arena"></canvas>' : ''}
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
        ${mode === 'tap' ? `<div class="bt-fx" id="bt-fx"></div>
        ${btHudHtml(pDef, oDef, opp ? colSrc('o-' + opp.id) : '')}
        <img class="bt-tele" id="bt-tele" alt="">
        <div class="a-cue" id="a-cue" role="status" aria-live="assertive"></div>
        <div class="a-taphint ${DG.state.settings.tapHintDone ? 'gone' : ''}" id="a-taphint"><img src="${btSrc('taphint')}" alt="${DG.ui.isTouch() ? 'Tap' : 'Click'} the opponent to attack!"><small>${DG.ui.isTouch() ? 'Tap the floor to move' : 'Click the floor to move'}</small></div>
        <div class="bt-trace" id="bt-trace" hidden role="dialog" aria-label="Trace the symbol to cast your special">
          <div class="tr-head"><b class="tr-name"></b><span>Trace the <em class="tr-rune"></em> rune!</span></div>
          <canvas aria-hidden="true"></canvas>
          <div class="tr-foot"><span class="tr-time"><b class="tr-pct">0%</b></span><span class="tr-tip">Start at the glowing dot and follow the line</span><button class="tr-x" aria-label="Cancel">✕</button></div>
        </div>
        <nav class="tap-pad" id="tap-pad" aria-label="Battle actions">
          <button class="tp blk" data-tap="block" aria-label="Block (K) — answers blue attacks"><img src="${btSrc('btn_block')}" alt=""><kbd>K</kbd></button>
          <button class="tp dge" data-tap="dodge" aria-label="Dodge (Space) — answers red attacks"><img src="${btSrc('btn_dodge')}" alt=""><kbd>Space</kbd></button>
          ${tapMv.map((x, i) => `<button class="tp sp" data-tap="sp${i}" data-id="${x.id}" aria-label="Special ${i + 1}: ${DG.ui.esc(x.name)}">${btOrb(x.id)}<span class="bt-pips"><i></i><i></i><i></i></span><b>${DG.ui.esc(x.name)}</b><kbd>${i ? 'I' : 'L'}</kbd></button>`).join('')}
          ${tapMv.length < 2 ? '<div class="tp sp sp-empty" aria-label="Empty special slot"><span class="sp-plus" aria-hidden="true">–</span><b>None</b></div>' : ''}
        </nav>` : ''}
        <div class="a-touch" id="a-touch" ${DG.ui.isTouch() && mode !== 'tap' ? '' : 'hidden'}>
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
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
    }
    if (mode !== 'tap') stageEl.prepend(renderer.domElement);
    resize();
    if (mode === 'tap') { btPreload(); colPreload([pDef, oDef]); buildTapScene(Rt); } else buildScene(DG.state.equipped.arena, R);
    F = [makeFighter(pDef, S), makeFighter(oDef, S)];
    F[0].pos.set(0, 0, R * 0.45); F[1].pos.set(0, 0, -R * 0.45);
    if (mode === 'tap') {
      F.forEach((f) => { f.tapCd = {}; f.defCd = 0; f.blockT = 0; });
      F[1].tap = { atk: null, next: 0, count: 0, rec: 0 };
      // 2D coliseum: hide the 3D models; size the fighters' reach and height to the painted sprites
      F.forEach((f) => {
        f.mesh.g.visible = false;
        const sf = STAGE_SIZE[Math.min(4, f.stageIdx == null ? 3 : f.stageIdx)], an = ANCH[f.shape].idle, unit = (0.4 * sf * Rt) / PLATE.AU / 1024;
        f.radius = ((an[7][2] - an[7][0]) / 2) * unit * 0.8;
        f.mesh.topY = ((875 - an[3]) * unit) / S;
      });
      F[0].special = 0; // the special meter starts empty and fills from your hits
      F[0].sta = F[0].maxSta; // dodge energy starts full
      F[0].chargeMul = Math.max(0.8, 0.85 + (F[0].charge - 4) / 10); // Focus training (and snack / cozy bonuses) make each hit charge more
      F[1].special = 0; F[1].tapMoves = (DG.TAP_STARTERS[F[1].shape] || []).slice(); F[1].tapCd = {}; F[1].spWarn = null; // rivals have their species' specials too
      if (!F[1].isPlayer) F[1].tint2d = DG.draw.mix('#' + new THREE.Color(F[1].hex).getHexString(), '#ffffff', 0.3);
      // feet at the art pack's anchors: you at (0.32, 0.50), the rival at (0.75, 0.51) of the plate
      F[0].pos.set(((0.32 - PLATE.U0) / PLATE.AU) * Rt, 0, ((0.50 - PLATE.V0) / PLATE.AV) * Rt);
      F[1].pos.set(((0.75 - PLATE.U0) / PLATE.AU) * Rt, 0, ((0.51 - PLATE.V0) / PLATE.AV) * Rt);
      F.forEach((f) => (f.goal = f.pos.clone()));
      const fc = root.querySelector('#bt-face');
      if (fc) drawFace2D(fc, F[0]);
    }
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
    if (match.mode === 'tap') {
      // tap the rival to attack; buttons and HUD never count as attack taps
      stageEl.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, .tap-pad, .a-hud, .a-pause, .a-rotate, .modal-wrap, .bt-trace')) return;
        DG.audio.unlock();
        if (!match || match.phase !== 'fight') return;
        e.preventDefault();
        if (tapHitsRival(e.clientX, e.clientY)) { tapQueue('attack'); return; }
        const pt = tapFloorPoint(e.clientX, e.clientY); // anywhere else on the ring: walk there
        if (pt && !match.over && !match.paused) { tapMoveTo = pt; sprite('goldflat', { at: pt.clone().setY(0.05), size: 1.8 * match.S, life: 0.45, z: 0, anim: (k) => ({ s: 0.5 + k * 0.7, o: 1 - k }) }); }
      });
      stageEl.querySelectorAll('[data-tap]').forEach((b) => {
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation(); DG.audio.unlock();
          if (e.button != null && e.button > 0) return;
          b.classList.add('down'); tapQueue(b.dataset.tap); if (navigator.vibrate) navigator.vibrate(8);
        });
        b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (e.detail === 0) tapQueue(b.dataset.tap); }); // keyboard / switch access
        const up = () => b.classList.remove('down');
        b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
      });
    }
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
    if (match.mode === 'tap') {
      btHudUpdate();
      stageEl.querySelectorAll('.tp.sp').forEach((b, i) => {
        const s = tapSpecialState(p, i); if (!s.mv) return;
        const n = Math.floor(Math.min(1, p.special / s.mv.cost) * 3 + 1e-6);
        b.querySelectorAll('.bt-pips i').forEach((pip, j) => pip.classList.toggle('on', j < n));
      });
      stageEl.querySelector('#a-moves').innerHTML = `<span class="mchip ok"><kbd>J</kbd>/click rival Attack</span><span class="mchip ok"><kbd>K</kbd>Block 🔵</span><span class="mchip ok"><kbd>Space</kbd>Dodge 🔴</span>`;
      stageEl.querySelectorAll('.tp.sp').forEach((b, i) => {
        const s = tapSpecialState(p, i); if (!s.mv) return;
        b.classList.toggle('ready', s.ready); b.classList.toggle('off', !s.ready);
        const why = s.cd > 0 ? `cooling down ${Math.ceil(s.cd)}s` : p.special < s.mv.cost ? `charging ${Math.floor(p.special)}/${s.mv.cost}` : s.ready ? 'ready' : 'busy';
        b.setAttribute('aria-label', `Special ${i + 1}: ${DG.MOVES[s.id].name}, ${why}`);
        b.dataset.cd = s.cd > 0 ? Math.ceil(s.cd) : '';
      });
      stageEl.querySelectorAll('.tp.blk, .tp.dge').forEach((b) => b.classList.toggle('off', p.defCd > 0 || p.state === 'stun' || p.state === 'move' || (b.classList.contains('dge') && p.sta < p.maxSta * TAP.dodgeSta)));
      return;
    }
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
    if (match.mode === 'tap') { tapCancelCue('pause'); tapClearInputs(); }
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
    if (match.mode === 'tap') { tapCancelCue('end'); tapClearInputs(); if (match.tracing) traceFinish(false, 'cancel'); }
    match.winner = result === 'win' ? F[0] : result === 'lose' ? F[1] : null;
    const loser = result === 'win' ? F[1] : result === 'lose' ? F[0] : null;
    if (loser && loser.state !== 'ko') { setState(loser, 'ko'); loser.mv = null; loser.hopY = 0; }
    F.forEach((f) => { f.blocking = false; f.bubble = 0; f.spin = false; f.hopY = 0; f.mv = null; if (f !== loser) setState(f, 'idle'); });
    const txt = how === 'forfeit' ? 'Match over' : how === 'time' ? "Time's up!" : 'Flop!';
    if (result === 'win' && !match.net) banner(`<span class="a-win"><span class="a-win-top">🏆 VICTORY! 🏆</span><span class="a-win-sub">${DG.ui.esc(F[0].name)} wins!</span></span>`, 3);
    else banner(result === 'win' ? `${txt} — <b>${DG.ui.esc(F[0].name)} wins!</b> 🏆` : result === 'lose' ? `${txt} — ${DG.ui.esc(F[1].name)} wins!` : `${txt} — It's a draw!`, 2.4);
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
    const CHEERS = ['What a champion!', 'Unstoppable!', 'Dumpling power!', 'Flawless steaming!', 'The crowd goes wild!', 'Legendary!'];
    const won = result === 'win';
    DG.ui.modal({
      cls: won ? 'ar-win-modal' : '', title: won ? '' : (match.practice ? 'Practice: ' : '') + titles[result], dismissable: false,
      html: `${won ? `<div class="ar-win-head"><div class="ar-win-stars" aria-hidden="true">⭐ ⭐ ⭐</div><h2>${match.practice ? 'Practice ' : ''}VICTORY!</h2>
          <p class="ar-win-cheer">${pick(CHEERS)} <b>${DG.ui.esc(a.name)}</b> beat <b>${DG.ui.esc(b.name)}</b>!</p></div>` : ''}<p>${DG.ui.esc(a.name)} ${Math.round((a.hp / a.maxHp) * 100)}% health · ${DG.ui.esc(b.name)} ${Math.round((b.hp / b.maxHp) * 100)}% health${match.how === 'time' ? ' (time ran out — higher health % wins)' : ''}</p>
        ${coins ? `<p class="gain">+${coins} 🪙 Dumpling Coins</p>` : ''}
        ${lines.map((l) => `<p>${l}</p>`).join('')}
        ${match.mode === 'tap'
          ? `<p class="fine">Tap controls · Blocked <b>${match.stats.blocks}</b> 🔵 · Dodged <b>${match.stats.dodges}</b> 🔴 · Specials used <b>${match.stats.specials}</b> · Best combo <b>${match.stats.maxCombo}</b></p>`
          : `<p class="fine">Classic controls · Best combo <b>${match.stats.maxCombo}</b> · Perfect dodges <b>${match.stats.perfect}</b> · Parries <b>${match.stats.parries}</b> · Smashes <b>${match.stats.smashes}</b></p>`}
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
      if (match.phaseT >= match.introLen) { match.phase = 'count'; match.phaseT = 0; F[1].hopY = 0; banner(match.mode === 'tap' ? '<span class="cnum">3</span>' : '3', 0.8); sfx('click'); match.cnt = 3; }
    } else if (match.phase === 'count') {
      const c = 3 - Math.floor(match.phaseT / 0.7);
      if (c !== match.cnt && c > 0) { match.cnt = c; banner(match.mode === 'tap' ? `<span class="cnum">${c}</span>` : String(c), match.mode === 'tap' ? 0.69 : 0.6); sfx('click'); }
      if (match.phaseT >= 2.1) {
        match.phase = 'fight'; banner(match.mode === 'tap' ? '<span class="cnum go">FIGHT!</span>' : 'Steam! 🔥', 0.8); sfx('good'); Object.keys(edges).forEach((k) => (edges[k] = false));
        if (match.mode === 'tap') { tapQ = null; F[1].tap.next = match.ft + (tapTier() === 0 ? 2.2 : 1.4); }
      }
    } else if (match.phase === 'fight') {
      if (!match.over) {
        match.time -= dt;
        if (match.time <= 0) {
          match.time = 0;
          const pa = Math.round((F[0].hp / F[0].maxHp) * 1000), pb = Math.round((F[1].hp / F[1].maxHp) * 1000);
          endMatch(pa > pb ? 'win' : pa < pb ? 'lose' : 'draw', 'time');
        }
      }
      if (match.mode === 'tap') tapStep(dt);
      else {
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
    if (match.mode === 'tap') tapDecor();
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
    let want = new THREE.Vector3(mid.x * 0.6, dist * 0.76, mid.z * 0.6 + dist * 0.74 * camSide());
    if (match.mode === 'tap') { // the painted coliseum: 2D plate + pose sprites
      colRender(realDt);
      fx2Update(dt);
      btFloatsUpdate(realDt);
      return;
    }
    if (false) {
      const spanX = Math.abs(a.x - b.x), halfW = spanX / 2 + 1.9 * match.S, vf = (camera.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
      const fitW = (halfW / Math.tan(hf / 2)) * 1.05, fitH = ((sep + 3.2 * match.S) / 2 / Math.tan(vf / 2)) * 1.05;
      const dd = clamp(Math.max(fitW, fitH), 7 * match.S, match.R * 1.1);
      want = aspect < 0.85 ? new THREE.Vector3(mid.x, 1.2 * match.S + dd * 0.6, mid.z + dd * 0.82) // tall: look down more steeply
        : new THREE.Vector3(mid.x, 1.2 * match.S + dd * 0.38, mid.z + dd * 0.92);
    }
    camera.position.lerp(want, Math.min(1, realDt * (match.phase === 'intro' ? 1.5 : 4)));
    if (match.shake > 0) {
      camera.position.x += rand(-1, 1) * match.shake; camera.position.y += rand(-1, 1) * match.shake;
      match.shake = Math.max(0, match.shake - realDt * 1.2);
    }
    camera.lookAt(mid.x, (match.mode === 'tap' ? 1.0 : 0.8) * match.S, mid.z);
    renderer.render(scene, camera);
    btFloatsUpdate(realDt);
  }
  function btFloatsUpdate(realDt) { // floating text
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight, two = match && match.mode === 'tap' && colView;
    for (let i = floats.length - 1; i >= 0; i--) {
      const fl = floats[i]; fl.life -= realDt; fl.pos.y += realDt * 1.5;
      let sxp, syp;
      if (two) { const q = pj(fl.pos); sxp = q.x; syp = q.y; } else { const v = fl.pos.clone().project(camera); sxp = (v.x * 0.5 + 0.5) * w; syp = (-v.y * 0.5 + 0.5) * h; }
      fl.el.style.transform = `translate(${sxp}px, ${syp}px) translate(-50%,-50%)`;
      fl.el.style.opacity = Math.min(1, fl.life * 2);
      if (fl.life <= 0) { fl.el.remove(); floats.splice(i, 1); }
    }
  }

  let hudAcc = 0;
  function loop(now) {
    if (!match || !stageEl || !stageEl.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (match.tracing && !match.paused) { // time stops while you trace a rune
      try { render(0, 0); } catch (e) { console.error(e); }
    } else if (!match.paused) {
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
    if (match && match.mode === 'tap') camera.setViewOffset(w, h, 0, h * (portrait ? -0.02 : 0.06), w, h); // ring sits mid-screen, above the action buttons
    else if (portrait && touchUI) camera.setViewOffset(w, h, 0, h * 0.13, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const rot = stageEl.querySelector('#a-rotate');
    if (rot) rot.hidden = !(portrait && touchUI && !rotDismissed) || !!(match && match.mode === 'tap');
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && match && match.mode === 'tap') tapClearInputs();
    if (document.hidden && match && !match.net && match.phase === 'fight' && !match.over && !DG.ui.anyModal()) pause(true);
  });

  function cleanupMatch() {
    cancelAnimationFrame(raf);
    if (scene) {
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    }
    scene = null; F = []; fx = []; projs = []; crowd = []; petals = [];
    floats.forEach((f) => f.el.remove()); floats = [];
    if (match && match.faceStop) match.faceStop();
    fx2Clear();
    match = null; stageEl = null; tapQ = null; tapMoveTo = null;
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
    _tap: { draw: (c, x, y, o) => drawDumpling2D(c, x, y, o), img: (n) => colImg(n), hits: (x, y) => tapHitsRival(x, y), box: () => fighterBox(F[1]), pj: (v) => pj(v), pose: (f) => poseOf(f) },
    _special: (i, traced) => tapStartSpecial(F[0], F[1], i, traced || 1),
    _forceEnd: (r) => { if (match) { endMatch(r, 'ko'); match.endT = 99; } },
  };
  DG.ui.register('arena', DG.Arena);
})(window.DG);
