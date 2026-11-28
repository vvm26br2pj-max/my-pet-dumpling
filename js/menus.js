/* My Pet Dumpling — adoption, menus, shop, milestones, settings, developer panel */
(function (DG) {
  const esc = (s) => DG.ui.esc(s);
  const pname = () => esc(DG.pet().name);

  /* ================= Adoption ================= */
  const PREVIEW_STYLE = {
    bao: (t) => ({ mood: Math.sin(t * 0.8) > 0.6 ? 'joy' : 'happy', hop: Math.max(0, Math.sin(t * 4)) * 14, squash: Math.sin(t * 8) * 0.03, blink: (t % 3.5) < 0.12 }),
    gyoza: (t) => ({ mood: (t % 4) < 1.2 ? 'joy' : 'happy', rot: Math.sin(t * 7) * 0.12, hop: Math.max(0, Math.sin(t * 7)) * 8, flip: Math.sin(t * 1.3) > 0, blink: (t % 2.7) < 0.12 }),
    soup: (t) => ({ mood: (t % 6) < 2 ? 'sleeping' : 'sleepy', rot: Math.sin(t * 1.5) * 0.06, squash: Math.sin(t * 2) * 0.04 }),
  };
  let adoptStops = [];
  function adoptEnter() {
    const root = document.getElementById('screen-adopt');
    adoptStops.forEach((s) => s()); adoptStops = [];
    const THEME = { bao: 'pink', gyoza: 'orange', soup: 'blue' };
    root.innerHTML = `
      <div class="title-scr">
        <img class="title-art" src="img/title.webp?v=3" alt="My Pet Dumpling. Three baby dumplings are looking for a home. Who will you adopt?">
        <div class="ts-grid">
          ${Object.values(DG.STARTERS).map((s) => `
            <button class="ts-card ts-${THEME[s.id]}" data-type="${s.id}">
              <div class="ts-top"><canvas class="starter-canvas" data-type="${s.id}"></canvas></div>
              <div class="ts-name"><i aria-hidden="true">✿</i>${s.name}<i aria-hidden="true">✿</i></div>
              <div class="ts-kind">${s.kind}</div>
              <p class="ts-desc">${s.desc}</p>
              <div class="ts-box"><span class="ts-ico" aria-hidden="true">💪</span><span>${s.strength}</span></div>
              <div class="ts-ab-title">Special Ability</div>
              <div class="ts-box"><span class="ts-ico" aria-hidden="true">✨</span><span><b>${DG.MOVES[s.moves.special].name}:</b> ${DG.MOVES[s.moves.special].desc}</span></div>
            </button>`).join('')}
        </div>
      </div>`;
    root.querySelectorAll('.starter-canvas').forEach((cv) => {
      const type = cv.dataset.type;
      adoptStops.push(DG.ui.previewLoop(cv, (t) => Object.assign({ type, stage: 0, size: 150, shadow: false }, PREVIEW_STYLE[type](t)), 240, 170));
    });
    root.querySelectorAll('.ts-card').forEach((b) => (b.onclick = () => { DG.audio.unlock(); DG.audio.play('babysqueak'); adoptStep2(b.dataset.type); }));
  }
  /* Shared color / eyes / cheeks picker (adoption + closet) */
  function lookPickerHtml(type, look) {
    const colors = Object.entries(DG.LOOK_COLORS).map(([id, c]) => {
      const col = c.base ? c : DG.STARTERS[type].colors;
      return `<button class="swatch ${look.color === id ? 'on' : ''}" data-lk="color" data-v="${id}" title="${c.name}" aria-label="${c.name}" style="background:linear-gradient(135deg, ${col.light}, ${col.base});border-color:${col.line}"></button>`;
    }).join('');
    const chips = (key, table) => Object.entries(table).map(([id, x]) =>
      `<button class="chip-btn ${look[key] === id ? 'on' : ''}" data-lk="${key}" data-v="${id}">${x.name}</button>`).join('');
    return `<div class="lbl">Color <small class="lk-name" id="lk-color-name">${DG.LOOK_COLORS[look.color].name}</small></div>
      <div class="swatch-row">${colors}</div>
      <div class="lbl">Eyes</div><div class="chip-row tight">${chips('eyes', DG.EYES)}</div>
      <div class="lbl">Cheeks</div><div class="chip-row tight">${chips('cheeks', DG.CHEEKS)}</div>`;
  }
  function wireLookPicker(el, look, onChange) {
    el.querySelectorAll('[data-lk]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.lk; look[k] = b.dataset.v; DG.audio.play('pop');
      el.querySelectorAll(`[data-lk="${k}"]`).forEach((x) => x.classList.toggle('on', x === b));
      const nm = el.querySelector('#lk-color-name'); if (nm && k === 'color') nm.textContent = DG.LOOK_COLORS[look.color].name;
      if (onChange) onChange();
    }));
  }

  const BOW_SVG = '<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M32 22 C22 6 4 4 5 16 C6 28 20 30 32 25 Z M32 22 C42 6 60 4 59 16 C58 28 44 30 32 25 Z" fill="#ff8fb4" stroke="#c94f7c" stroke-width="2.6" stroke-linejoin="round"/><path d="M29 25 L20 42 L26 39 L28 45 L32 28 Z M35 25 L44 42 L38 39 L36 45 L32 28 Z" fill="#ff7aa6" stroke="#c94f7c" stroke-width="2.6" stroke-linejoin="round"/><ellipse cx="32" cy="23" rx="6.5" ry="6" fill="#ff6b9c" stroke="#c94f7c" stroke-width="2.6"/><path d="M12 13 C15 10 19 10 22 13" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/></svg>';
  const VIKING_SVG = '<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M14 30 C6 28 3 18 6 6 C9 16 13 20 19 22 Z" fill="#f6ead2" stroke="#a68858" stroke-width="2.4" stroke-linejoin="round"/><path d="M50 30 C58 28 61 18 58 6 C55 16 51 20 45 22 Z" fill="#f6ead2" stroke="#a68858" stroke-width="2.4" stroke-linejoin="round"/><path d="M13 36 C13 16 51 16 51 36 Z" fill="#c9d2df" stroke="#5f6878" stroke-width="2.6" stroke-linejoin="round"/><path d="M19 24 C23 18 30 17 34 18" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/><rect x="30" y="17" width="5" height="19" fill="#b8875a" stroke="#7a5530" stroke-width="1.6"/><rect x="11" y="33" width="42" height="7" rx="2" fill="#b8875a" stroke="#7a5530" stroke-width="2.4"/><circle cx="18" cy="36.5" r="1.6" fill="#ffd36a"/><circle cx="27" cy="36.5" r="1.6" fill="#ffd36a"/><circle cx="37" cy="36.5" r="1.6" fill="#ffd36a"/><circle cx="46" cy="36.5" r="1.6" fill="#ffd36a"/></svg>';
  const CAP_SVG = '<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M10 34 C10 12 46 10 50 32 Z" fill="#4a88de" stroke="#1f4f96" stroke-width="2.6" stroke-linejoin="round"/><path d="M8 34 C24 38 46 37 60 32 C58 40 30 44 8 38 Z" fill="#2f6cc4" stroke="#1f4f96" stroke-width="2.6" stroke-linejoin="round"/><circle cx="29" cy="14" r="2.6" fill="#2f6cc4" stroke="#1f4f96" stroke-width="1.8"/><path d="M38 19 l1.5 3.2 3.4.4-2.5 2.3.7 3.4-3.1-1.7-3 1.7.6-3.4-2.5-2.3 3.4-.4z" fill="#ffd36a" stroke="#c78a14" stroke-width="1"/><path d="M16 26 C18 20 22 17 26 16" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/></svg>';
  const PHONES_SVG = '<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M12 32 C10 6 54 6 52 32" fill="none" stroke="#2b2f3a" stroke-width="6.5" stroke-linecap="round"/><path d="M13 30 C12 9 52 9 51 30" fill="none" stroke="#545b6c" stroke-width="2.4" stroke-linecap="round"/><rect x="4" y="25" width="14" height="19" rx="6.5" fill="#3fbf7a" stroke="#1d6e46" stroke-width="2.4"/><rect x="46" y="25" width="14" height="19" rx="6.5" fill="#3fbf7a" stroke="#1d6e46" stroke-width="2.4"/><path d="M8.5 29 v9 M50.5 29 v9" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".6"/></svg>';
  const STARTER_ACC = [['bow', BOW_SVG], ['viking', VIKING_SVG], ['cap', CAP_SVG], ['headphones', PHONES_SVG]];
  function adoptStep2(type) {
    const s = DG.STARTERS[type];
    let acc = 'bow';
    const look = { color: 'classic', eyes: 'round', cheeks: 'blush' };
    let stop = null;
    const swatches = Object.entries(DG.LOOK_COLORS).map(([id, c]) => {
      const col = c.base ? c : DG.STARTERS[type].colors;
      return `<button class="ad2-sw ${look.color === id ? 'on' : ''}" data-lk="color" data-v="${id}" title="${c.name}" aria-label="${c.name}" style="--c:${col.base};--l:${col.light};--d:${col.line}"></button>`;
    }).join('');
    const pills = (key, table) => Object.entries(table).map(([id, x]) => `<button class="ad2-pill ${look[key] === id ? 'on' : ''}" data-lk="${key}" data-v="${id}">${x.name}</button>`).join('');
    const doAdopt = (close) => {
      const name = document.getElementById('ad-name').value.trim() || s.name;
      close(); if (stop) stop();
      DG.adopt(type, name, acc, look);
      DG.unlock('adopted');
      DG.audio.play('levelup');
      adoptStops.forEach((f) => f()); adoptStops = [];
      DG.ui.show('home');
      setTimeout(() => {
        DG.Home.celebrate(`Hi! I'm ${DG.pet().name}!`);
        welcomeHome();
      }, 400);
    };
    DG.ui.modal({
      cls: 'ad2-modal', wide: true,
      html: `<div class="ad2">
          <div class="ad2-sign"><h2>Adopt ${s.name}?</h2></div>
          <div class="ad2-stage"><canvas class="adopt-preview" id="ad-prev"></canvas></div>
          <label class="ad2-label" for="ad-name">Name your baby dumpling</label>
          <div class="ad2-name"><input id="ad-name" maxlength="14" value="${s.id === 'soup' ? 'Shu' : s.name}" autocomplete="off" enterkeyhint="done"><span aria-hidden="true">✏️</span></div>
          <div class="ad2-grid">
            <section class="ad2-card"><h4>Color</h4><div class="ad2-swatches">${swatches}</div></section>
            <section class="ad2-card"><h4>Eyes</h4><div class="ad2-pills">${pills('eyes', DG.EYES)}</div></section>
            <section class="ad2-card"><h4>Cheeks</h4><div class="ad2-pills">${pills('cheeks', DG.CHEEKS)}</div></section>
            <section class="ad2-card"><h4>Starting Accessory</h4><div class="ad2-accs">${STARTER_ACC.map(([a, svg]) => `<button class="ad2-acc ${a === acc ? 'on' : ''}" data-acc="${a}" title="${DG.ACCESSORIES[a].name}" aria-label="${DG.ACCESSORIES[a].name}">${svg}</button>`).join('')}</div></section>
          </div>
          <p class="fine ad2-fine">You can change all of this later in the Closet.</p>
          <div class="ad2-foot">
            <button class="ad2-back" id="ad-back"><span>←</span>Back</button>
            <button class="ad2-go" id="ad-go">Adopt!</button>
          </div>
        </div>`,
      onClose() { if (stop) stop(); },
      onOpen(el, close) {
        let pokeT = -9;
        stop = DG.ui.previewLoop(el.querySelector('#ad-prev'), (t) => {
          const o = Object.assign({ type, stage: 0, size: 150, accessory: acc, look, shadow: false }, PREVIEW_STYLE[type](t));
          if (o.mood === 'sleeping' || o.mood === 'sleepy') o.mood = 'happy';
          if (t - pokeT < 0.6) { o.mood = 'joy'; o.hop = Math.sin((t - pokeT) / 0.6 * Math.PI) * 18; }
          el._t = t;
          return o;
        }, 260, 190);
        const poke = () => { pokeT = el._t || 0; };
        el.querySelectorAll('[data-acc]').forEach((b) => (b.onclick = () => {
          acc = b.dataset.acc; DG.audio.play('pop'); poke();
          el.querySelectorAll('[data-acc]').forEach((x) => x.classList.toggle('on', x === b));
        }));
        wireLookPicker(el, look, poke);
        el.querySelector('#ad-back').onclick = () => { DG.audio.play('click'); close(); };
        el.querySelector('#ad-go').onclick = () => { DG.audio.play('click'); doAdopt(close); };
        const inp = el.querySelector('#ad-name');
        if (!DG.ui.isTouch()) { inp.focus(); inp.select(); }
      },
    });
  }
  /* "Welcome Home" card shown right after adopting: the dumpling, its growth stages and the four kinds of care */
  function welcomeHome() {
    const p = DG.pet(), sp = DG.STARTERS[p.type];
    const rm = (n) => (window.DG_ASSETS && window.DG_ASSETS[`img/rm_${n}.webp`]) || `img/rm_${n}.webp?v=6`;
    const when = (ms) => { const h = ms / DG.HOUR; return h < 24 ? `After ${h} hour${h > 1 ? 's' : ''}` : h < 24 * 28 ? `After ${h / 24} day${h > 24 ? 's' : ''}` : 'After 1 month'; };
    const stages = [1, 2, 3, 4].map((i) => ({ i, st: DG.STAGES[i] }));
    const care = [['feed', 'Feed', 'Raise Fullness!', `<img src="${rm('bowl')}" alt="">`], ['play', 'Play', 'Raise Happiness!', '<canvas class="wh-ball" width="120" height="120"></canvas>'],
      ['sleep', 'Sleep', 'Increase Energy!', `<img src="${rm('bed')}" alt=""><b class="wh-z">z<sup>z</sup><sup>z</sup></b>`], ['wash', 'Wash', 'Increase Cleanliness!', `<img src="${rm('bath')}" alt="">`]];
    let stop = null;
    DG.ui.modal({
      cls: 'wh-modal', wide: true,
      html: `<div class="wh">
          <div class="wh-sky"><i class="wh-cloud c1"></i><i class="wh-cloud c2"></i><i class="wh-bush b1"></i><i class="wh-bush b2"></i></div>
          <div class="wh-sign"><span class="wh-house" aria-hidden="true">🏠</span><h2>Welcome Home, ${esc(p.name)}!</h2></div>
          <div class="wh-peek"><canvas id="wh-pet" width="300" height="150"></canvas></div>
          <div class="wh-body">
            <div class="wh-pill"><span>⭐</span>Your ${esc(sp.name)} grows over time!<span>⭐</span></div>
            <div class="wh-stages">${stages.map(({ i, st }, n) => `${n ? '<i class="wh-arrow" aria-hidden="true">➜</i>' : ''}
              <div class="wh-st wh-st${i}"><div class="wh-st-art"><canvas data-stage="${i}" width="200" height="160"></canvas>${i === 4 ? '<span class="wh-crown" aria-hidden="true">👑</span>' : ''}</div>
                <b class="wh-tag">${st.name}</b><small>${when(st.at)}</small></div>`).join('')}</div>
            <div class="wh-care">${care.map(([k, name, tip, art]) => `<div class="wh-cc wh-${k}"><div class="wh-cc-art">${art}</div><b class="wh-tag">${name}</b><small>${tip}</small></div>`).join('')}</div>
            <button class="wh-go" id="wh-go">Let's Go! <span aria-hidden="true">➜</span></button>
          </div>
        </div>`,
      onClose() { if (stop) stop(); },
      onOpen(el, close) {
        const draw = (cv, o) => { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); DG.draw.dumpling(c, Object.assign({ type: p.type, look: p.look, shadow: false, t: 0 }, o)); };
        // your dumpling peeking over the banner, with its accessory
        stop = DG.ui.previewLoop(el.querySelector('#wh-pet'), (t) => ({ type: p.type, look: p.look, stage: 0, size: 150, accessory: p.accessory, mood: 'joy', shadow: false,
          hop: Math.max(0, Math.sin(t * 3)) * 6, blink: (t % 3.2) < 0.12, y: 132 }), 300, 150);
        el.querySelectorAll('[data-stage]').forEach((cv) => {
          const i = +cv.dataset.stage, k = DG.STAGES[i].scale / DG.STAGES[4].scale;
          draw(cv, { x: 100, y: 154, size: 165 * (0.4 + 0.6 * k), stage: i, mood: ['happy', 'happy', 'joy', 'happy', 'joy'][i] });
        });
        const ball = el.querySelector('.wh-ball'); if (ball && DG.draw.toy) DG.draw.toy(ball.getContext('2d'), 'ball', 60, 64, 1.9);
        el.querySelector('#wh-go').onclick = () => { DG.audio.play('click'); close(); };
      },
    });
  }
  DG.ui.register('adopt', { enter: adoptEnter, exit() { adoptStops.forEach((s) => s()); adoptStops = []; } });

  /* ================= Feed & toys ================= */
  function feed() {
    const p = DG.pet(), inv = DG.state.inventory.food, coins = DG.state.coins;
    const ids = DG.FOOD_MENU.concat(DG.FOOD_ORDER.filter((id) => !DG.FOOD_MENU.includes(id) && id !== 'cake' && inv[id] > 0));
    const art = (id) => ['rice', 'veg', 'tofu', 'noodle', 'butter', 'peach', 'cake'].includes(id) ? `<img src="${(window.DG_ASSETS && window.DG_ASSETS[`img/fd_${id}.webp`]) || `img/fd_${id}.webp?v=2`}" alt="">` : `<span class="fd-emoji">${DG.FOODS[id].icon}</span>`;
    const card = (id) => {
      const f = DG.FOODS[id], have = f.free ? '∞' : inv[id] || 0, fav = p.favoriteKnown && p.favoriteFood === id;
      return `<div class="fd-card fd-${id} ${fav ? 'fav' : ''}">
        ${fav ? '<span class="fd-fav">⭐ Favorite</span>' : ''}
        <div class="fd-art">${art(id)}</div>
        <div class="fd-body">
          <h4 class="fd-name">${f.name}</h4>
          <p class="fd-desc">${f.desc}</p>
          <p class="fd-have">Have: <b>${have}</b></p>
          <button class="fd-feed" data-feed="${id}" ${!f.free && !inv[id] ? 'disabled' : ''}>Feed</button>
          ${f.free ? '<span class="fd-free">Free!</span>' : `<button class="fd-buy" data-buy="${id}" ${coins < f.price ? 'disabled' : ''}>Buy <i class="fd-coin"></i>${f.price}</button>`}
        </div></div>`;
    };
    const close = DG.ui.modal({
      cls: 'fd-modal', wide: true,
      html: `<div class="fd">
          <div class="fd-sign"><span class="fd-bowl" aria-hidden="true">🍚</span><h2>What should we eat?</h2></div>
          <div class="fd-grid">${ids.map(card).join('')}</div>
          <div class="fd-cake-row">${card('cake')}</div>
        </div>`,
      onOpen(el, cl) {
        // shrink the whole menu to fit the screen, so it never needs scrolling
        const box = el.querySelector('.fd'), fit = () => {
          box.style.zoom = 1;
          const need = box.offsetHeight + 46, room = window.innerHeight - 12;
          if (need > room) box.style.zoom = Math.max(0.6, room / need).toFixed(3);
        };
        fit(); el.querySelectorAll('.fd-art img').forEach((im) => { if (!im.complete) im.addEventListener('load', fit, { once: true }); });
        el.querySelectorAll('[data-feed]').forEach((b) => (b.onclick = () => { if (DG.Home.feed(b.dataset.feed)) cl(); }));
        el.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => { if (buy('food', b.dataset.buy)) { cl(); feed(); } }));
      },
    });
    return close;
  }
  function toys() {
    const own = DG.state.inventory.toys;
    DG.ui.modal({
      title: '🧺 Toy Basket',
      html: `<div class="toy-row">${Object.entries(DG.TOYS).map(([id, t]) => own.includes(id)
        ? `<button class="toy-btn" data-toy="${id}"><span>${t.icon}</span>${t.name}<small>${t.tip}</small></button>`
        : `<div class="toy-btn locked"><span>${t.icon}</span>${t.name}<small>Shop · 🪙${t.price}</small></div>`).join('')}</div>
        <p class="fine">Playing makes your dumpling happy but uses a little energy. Every 5 plays completes a care challenge for coins.</p>`,
      onOpen(el, cl) { el.querySelectorAll('[data-toy]').forEach((b) => (b.onclick = () => { cl(); DG.Home.startPlay(b.dataset.toy); })); },
    });
  }

  /* ================= Shop ================= */
  function buy(cat, id) {
    const st = DG.state, inv = st.inventory;
    const table = { food: DG.FOODS, outfits: DG.OUTFITS, accessories: DG.ACCESSORIES, toys: DG.TOYS, decor: DG.DECOR, arenas: DG.ARENAS }[cat];
    const item = table[id];
    if (cat !== 'food' && inv[cat].includes(id)) return false;
    if (!DG.spend(item.price)) { DG.ui.toast('Not enough Dumpling Coins yet — train or battle to earn more!'); DG.audio.play('bad'); return false; }
    if (cat === 'food') inv.food[id] = (inv.food[id] || 0) + 1;
    else inv[cat].push(id);
    if (cat === 'decor') st.equipped.decor.push(id);
    DG.audio.play('coin');
    DG.ui.toast(`Bought ${item.icon} ${item.name}!`);
    DG.unlock('shopper');
    DG.save(); if (DG.Home) DG.Home.renderHud();
    return true;
  }
  function shop(tab) {
    tab = { food: 'outfits', arenas: 'decor' }[tab] || tab || 'outfits';
    const st = DG.state, inv = st.inventory, p = DG.pet();
    if (!inv.outfits) inv.outfits = [];
    let page = 0, stopPeek = null;
    const PER = 12;
    const A = (path) => (window.DG_ASSETS && window.DG_ASSETS[path]) || `${path}?v=1`;
    const ico = (n) => `<img class="sh-ico" src="${A(`img/sh_${n}.webp`)}" alt="">`;
    const ORB = { steampuff: ['#b78cff', 'e-steam-burst'], bunslam: ['#ffb34a', 'e-ground-shockwave'], crispydash: ['#ff7a3a', 'e-gold-sparks'], pleatflurry: ['#5fb0ff', 'e-attack-slash'],
      brothbubble: ['#4cc2ff', 'e-shield-bubble'], ladlesplash: ['#3fa0ff', 'e-broth-splash'], grandsteamer: ['#a54cf0', 'e-purple-tornado'], goldenfry: ['#ff5a2a', 'e-fire-dragon'], hotpot: ['#58c8ff', 'e-ice-burst'] };
    const RM = ['lantern', 'painting', 'poster', 'clock', 'shelf', 'fish', 'plant'];
    const TABS = {
      outfits:     { label: 'Outfits',     note: 'Dress up! Outfits are cosmetic and can be worn in the Closet.' },
      accessories: { label: 'Accessories', note: 'Build your style! Accessories are cosmetic and can be equipped in the Closet.' },
      toys:        { label: 'Toys',        note: 'Toys go in the toy basket. Playing makes your dumpling happy!' },
      decor:       { label: 'Decor',       note: 'Show or hide decorations with the House button. Arena looks change your battle arena.' },
      abilities:   { label: 'Abilities',   note: 'Special moves for tap battles. Equip two in the Arena under ✨ Specials.' },
    };
    const items = () => {
      if (tab === 'outfits') return Object.entries(DG.OUTFITS).map(([id, x]) => ({ cat: 'outfits', id, name: x.name, price: x.price, own: inv.outfits.includes(id), art: `<canvas class="sh-cv" data-outfit="${id}" width="160" height="120"></canvas>` }));
      if (tab === 'accessories') return Object.entries(DG.ACCESSORIES).map(([id, x]) => ({ cat: 'accessories', id, name: x.name, price: x.price, own: inv.accessories.includes(id), art: `<img src="${A(`img/col/a-${id}.webp`)}" alt="">` }));
      if (tab === 'toys') return Object.entries(DG.TOYS).filter(([, x]) => x.price > 0).map(([id, x]) => ({ cat: 'toys', id, name: x.name, price: x.price, own: inv.toys.includes(id), art: `<canvas class="sh-cv" data-toy="${id}" width="120" height="120"></canvas>` }));
      if (tab === 'decor') return Object.entries(DG.DECOR).map(([id, x]) => ({ cat: 'decor', id, name: x.name, price: x.price, own: inv.decor.includes(id),
        art: RM.includes(id) ? `<img src="${A(`img/rm_${id}.webp`)}" alt="">` : `<span class="sh-emoji">${x.icon}</span>` }))
        .concat(Object.entries(DG.ARENAS).filter(([, x]) => x.price > 0).map(([id, x]) => ({ cat: 'arenas', id, name: x.name, price: x.price, own: inv.arenas.includes(id), tag: 'Arena', art: `<span class="sh-emoji">${x.icon}</span>` })));
      return Object.entries(DG.TAP_MOVES).map(([id, x]) => {
        const can = DG.canUseMove(id), o = ORB[id] || ['#ffb34a', ''];
        return { cat: 'abilities', id, name: DG.MOVES[id].name, price: x.price, own: st.moves && st.moves.owned.includes(id), why: can.ok ? '' : can.why,
          art: `<span class="sh-orb" style="--oc:${o[0]}">${o[1] ? `<img src="${A(`img/col/${o[1]}.webp`)}" alt="">` : x.icon}</span>` };
      });
    };
    const card = (it, k) => `<div class="sh-card sh-c-${tab}">
        ${it.tag ? `<i class="sh-tag">${it.tag}</i>` : ''}<div class="sh-art">${it.art}</div>
        <b class="sh-name">${esc(it.name)}</b>
        ${it.own ? '<span class="sh-owned">Owned ✓</span>' : it.why ? `<span class="sh-lock">🔒 ${esc(it.why)}</span>`
          : `<button class="sh-buy" data-k="${k}" ${st.coins < it.price ? 'data-poor="1"' : ''}><i class="fd-coin"></i>${it.price}</button>`}
      </div>`;
    const render = (el) => {
      const all = items(), np = Math.max(1, Math.ceil(all.length / PER)); page = Math.min(page, np - 1);
      el.querySelector('#sh-coins').textContent = st.coins;
      el.querySelector('#sh-note').textContent = TABS[tab].note;
      el.querySelector('#sh-grid').innerHTML = all.slice(page * PER, page * PER + PER).map((it, i) => card(it, page * PER + i)).join('');
      el.querySelector('#sh-dots').innerHTML = np > 1 ? Array.from({ length: np }, (_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('') : '';
      el.querySelector('[data-pg="-1"]').disabled = !page; el.querySelector('[data-pg="1"]').disabled = page >= np - 1;
      el.querySelectorAll('.sh-cv').forEach((cv) => {
        const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
        if (cv.dataset.toy && DG.draw.toy) DG.draw.toy(c, cv.dataset.toy, 60, 92, 1.35, { t: 0 });
        if (cv.dataset.outfit && p) DG.draw.dumpling(c, { type: p.type, look: p.look, x: 80, y: 114, size: p.type === 'gyoza' ? 128 : 108, stage: 2, mood: 'happy', shadow: false, t: 0, accessory: null, outfit: cv.dataset.outfit });
      });
      if (tab === 'outfits' && !DG.outfitArtReady()) setTimeout(() => { if (el.isConnected) render(el); }, 200);
      el.querySelectorAll('.sh-buy').forEach((b) => (b.onclick = () => {
        const it = all[+b.dataset.k];
        if (it.cat === 'abilities') {
          const r = DG.buyMove(it.id);
          if (!r.ok) { DG.ui.toast(r.why.startsWith('Needs') ? 'Not enough Dumpling Coins yet — train or battle to earn more!' : r.why); DG.audio.play('bad'); return; }
          DG.audio.play('coin'); DG.ui.toast(`Learned ${DG.TAP_MOVES[it.id].icon} ${DG.MOVES[it.id].name}!`); if (DG.Home) DG.Home.renderHud();
        } else if (!buy(it.cat, it.id)) return;
        render(el);
      }));
    };
    const fit = (el) => { // shrink to fit the screen so the shop never needs scrolling
      const box = el.querySelector('.sh'); box.style.zoom = 1;
      const need = box.offsetHeight + 16, room = window.innerHeight - 12;
      if (need > room) box.style.zoom = Math.max(0.6, room / need).toFixed(3);
    };
    DG.ui.modal({
      cls: 'sh-modal', wide: true,
      html: `<div class="sh">
          <div class="sh-top"><div class="sh-awning"></div><div class="sh-sign"><span class="sh-store">${`<img src="${A('img/cl_shop.webp')}" alt="">`}</span><h2>Dumpling Shop</h2></div>
            <div class="sh-peek"><canvas id="sh-pet" width="240" height="90"></canvas></div></div>
          <div class="sh-body">
            <div class="sh-tabs">${Object.entries(TABS).map(([k, x]) => `<button class="sh-tab sh-t-${k} ${k === tab ? 'on' : ''}" data-tab="${k}">${ico(k)}<span>${x.label}</span></button>`).join('')}</div>
            <div class="sh-coinline">${ico('coin')}<b id="sh-coins"></b> Dumpling Coins</div>
            <div class="sh-pick"><button class="dc-arrow" data-pg="-1" aria-label="Previous">‹</button><div class="sh-grid" id="sh-grid"></div><button class="dc-arrow" data-pg="1" aria-label="Next">›</button></div>
            <div class="dc-dots" id="sh-dots"></div>
            <div class="sh-note"><span>✨</span><p><i class="sh-i">i</i><span id="sh-note"></span></p><span>✨</span></div>
          </div>
        </div>`,
      onClose() { if (stopPeek) stopPeek(); },
      onOpen(el) {
        if (p) stopPeek = DG.ui.previewLoop(el.querySelector('#sh-pet'), (t) => ({ type: p.type, look: p.look, stage: 0, size: 110, accessory: p.accessory, mood: 'joy', shadow: false,
          blink: (t % 3.1) < 0.12, y: 104 - Math.max(0, Math.sin(t * 3)) * 4 }), 240, 90);
        render(el);
        el.querySelectorAll('[data-pg]').forEach((b) => (b.onclick = () => { page += +b.dataset.pg; DG.audio.play('click'); render(el); }));
        el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
          tab = b.dataset.tab; page = 0; DG.audio.play('click');
          el.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b)); render(el); // same size on every tab: no re-fit
        }));
        fit(el); el.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => fit(el), { once: true }); });
      },
    });
  }

  /* ================= Closet ================= */
  function closet(startTab) {
    const st = DG.state, p = DG.pet(), inv = st.inventory;
    if (!p.look) p.look = { color: 'classic', eyes: 'round', cheeks: 'blush' };
    if (!inv.outfits) inv.outfits = [];
    let raf = 0, tab = startTab || 'outfits', page = 0, pokeT = -9;
    const PER = 9;
    const img = (n) => `<img class="dc-ico" src="${(window.DG_ASSETS && window.DG_ASSETS[`img/cl_${n}.webp`]) || `img/cl_${n}.webp?v=1`}" alt="">`;
    const TABS = {
      outfits:     { label: 'Outfits',     title: 'Outfits',     sub: 'Choose an outfit for your dumpling!' },
      accessories: { label: 'Accessories', title: 'Accessories', sub: 'Hats, glasses and more' },
      face:        { label: 'Face',        title: 'Face',        sub: 'Pick your eyes' },
      cheeks:      { label: 'Cheeks',      title: 'Cheeks',      sub: 'Pick your cheeks' },
      color:       { label: 'Color',       title: 'Color',       sub: 'Choose a color for your dumpling' },
    };
    /* every option, drawn on your own dumpling */
    const items = () => {
      if (tab === 'outfits') return [{ id: '', name: 'No outfit', on: !p.outfit, look: { outfit: null } }].concat(Object.entries(DG.OUTFITS).map(([id, x]) => {
        const own = inv.outfits.includes(id);
        return { id, name: own ? x.name : `🪙${x.price}`, full: x.name, on: p.outfit === id, locked: !own, look: { outfit: id } };
      }));
      if (tab === 'accessories') return [{ id: '', name: 'None', on: !p.accessory, look: { accessory: null, outfit: null } }].concat(Object.entries(DG.ACCESSORIES).map(([id, x]) => {
        const own = inv.accessories.includes(id);
        return { id, name: own ? x.name : `🪙${x.price}`, full: x.name, on: p.accessory === id, locked: !own, look: { accessory: id, outfit: null } };
      }));
      const key = { face: 'eyes', cheeks: 'cheeks', color: 'color' }[tab], table = { eyes: DG.EYES, cheeks: DG.CHEEKS, color: DG.LOOK_COLORS }[key];
      return Object.entries(table).map(([id, x]) => ({ id, name: x.name, on: p.look[key] === id, look: { lookPatch: { [key]: id } } }));
    };
    const pages = () => Math.max(1, Math.ceil(items().length / PER));
    const panel = () => {
      const all = items(), np = pages(); page = Math.min(page, np - 1);
      const T = TABS[tab], show = all.slice(page * PER, page * PER + PER);
      return `<div class="dc-head"><span class="dc-hicon">${img(tab)}</span><div><h3>${T.title}</h3><p>${T.sub}</p></div></div>
        <div class="dc-pick">
          <button class="dc-arrow" data-pg="-1" ${page ? '' : 'disabled'} aria-label="Previous">‹</button>
          <div class="cl-grid">${show.map((it, k) => `<button class="cl-it ${it.on ? 'on' : ''} ${it.locked ? 'locked' : ''}" data-id="${it.id}" data-k="${page * PER + k}" title="${esc(it.full || it.name)}">
            <canvas width="150" height="120"></canvas>${it.on ? '<span class="cl-check">✓</span>' : ''}${it.locked ? '<span class="cl-lock">🔒</span>' : ''}<small>${esc(it.name)}</small></button>`).join('')}</div>
          <button class="dc-arrow" data-pg="1" ${page < np - 1 ? '' : 'disabled'} aria-label="Next">›</button>
        </div>
        <div class="dc-dots">${np > 1 ? Array.from({ length: np }, (_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('') : ''}</div>`;
    };
    const drawItems = (pn) => {
      const all = items();
      pn.querySelectorAll('.cl-it').forEach((b) => {
        const it = all[+b.dataset.k], cv = b.querySelector('canvas'), c = cv.getContext('2d');
        const look = it.look.lookPatch ? Object.assign({}, p.look, it.look.lookPatch) : p.look;
        const o = { type: p.type, look, x: 75, y: 117, size: p.type === 'gyoza' ? 136 : 116, stage: Math.min(2, DG.stageIndex()), mood: 'happy', shadow: false, t: 0,
          accessory: 'accessory' in it.look ? it.look.accessory : p.accessory, outfit: 'outfit' in it.look ? it.look.outfit : (p.outfit || null) };
        c.clearRect(0, 0, cv.width, cv.height); DG.draw.dumpling(c, o);
      });
    };
    DG.ui.modal({
      cls: 'dc-modal cl-modal', wide: true,
      html: `<div class="dc cl">
          <div class="dc-sign"><span class="cl-wardrobe" aria-hidden="true"><img src="${(window.DG_ASSETS && window.DG_ASSETS['img/ic_wardrobe.webp']) || 'img/ic_wardrobe.webp?v=1'}" alt=""></span><h2>Closet</h2></div>
          <div class="dc-view cl-view"><canvas id="cl-prev"></canvas>
            <label class="cl-name"><span aria-hidden="true">✏️</span><input id="cl-name" maxlength="14" value="${esc(p.name)}" autocomplete="off" enterkeyhint="done" aria-label="Your dumpling's name"></label></div>
          <div class="dc-tabs cl-tabs">${Object.entries(TABS).map(([k, x]) => `<button class="dc-tab ${k === tab ? 'on' : ''}" data-tab="${k}"><span>${img(k)}</span>${x.label}</button>`).join('')}</div>
          <div class="dc-panel" id="cl-panel"></div>
          <div class="dc-foot"><button class="dc-shop" id="cl-shop">${img('shop')} Shop Outfits</button><button class="dc-done" id="cl-done">Done</button></div>
        </div>`,
      onClose() { cancelAnimationFrame(raf); DG.save(); if (DG.Home) DG.Home.renderHud(); },
      onOpen(el, close) {
        const cv = el.querySelector('#cl-prev'), c = cv.getContext('2d'), pn = el.querySelector('#cl-panel');
        const bg = new Image(); bg.src = (window.DG_ASSETS && window.DG_ASSETS['img/cl_scene.webp']) || 'img/cl_scene.webp?v=1'; let cap = null;
        const t0 = performance.now();
        const frame = (now) => {
          if (!cv.isConnected) return;
          const dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.clientWidth, ch = cv.clientHeight;
          if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
          c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cw, ch);
          // the dressing-room picture, covering the box (cropped at the sides when the box is narrow)
          // fit the width with the room standing on the bottom; a taller box just shows more striped wall above
          const BW = 826, BH = 392, k = Math.max(cw / BW, ch / BH), ox = (cw - BW * k) / 2, oy = ch - BH * k; // cover the box: no extra wall on top
          if (bg.complete && bg.naturalWidth) {
            if (!cap) { // one clean row of wall (wallpaper stripes repeat, so the wardrobe side borrows stripes from further right)
              cap = document.createElement('canvas'); cap.width = BW; cap.height = 1; const cc = cap.getContext('2d');
              for (let x = 0; x < BW; x++) cc.drawImage(bg, x < 262 ? x + 288 : x > 560 && x < 650 ? x - 96 : x, 4, 1, 1, x, 0, 1, 1);
            }
            if (oy > 0) c.drawImage(cap, 0, 0, BW, 1, ox, 0, BW * k, oy + 1);
            c.drawImage(bg, ox, oy, BW * k, BH * k);
          }
          const t = (now - t0) / 1000, poked = t - pokeT < 0.7;
          DG.draw.dumpling(c, { type: p.type, look: p.look, x: ox + 408 * k, y: oy + 346 * k, size: (p.type === 'gyoza' ? 300 : 260) * k * (0.8 + 0.2 * DG.stage().scale), stage: DG.stageIndex(),
            accessory: p.accessory, outfit: p.outfit || null, trait: p.trait, mood: poked ? 'joy' : 'happy', blink: (t % 3.2) < 0.12,
            hop: (poked ? Math.sin((t - pokeT) / 0.7 * Math.PI) * 16 : Math.max(0, Math.sin(t * 3)) * 5) * k * 2, t });
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        const poke = () => { pokeT = (performance.now() - t0) / 1000; };
        const draw = () => {
          pn.innerHTML = panel(); drawItems(pn);
          if (!DG.outfitArtReady()) { let n = 0; const again = () => { if (!pn.isConnected) return; drawItems(pn); if (!DG.outfitArtReady() && ++n < 20) setTimeout(again, 150); }; setTimeout(again, 150); }
          pn.querySelectorAll('[data-pg]').forEach((b) => (b.onclick = () => { page += +b.dataset.pg; DG.audio.play('click'); draw(); }));
          pn.querySelectorAll('.cl-it').forEach((b) => (b.onclick = () => {
            const it = items()[+b.dataset.k];
            if (it.locked) {
              const x = tab === 'outfits' ? DG.OUTFITS[it.id] : DG.ACCESSORIES[it.id];
              DG.ui.toast(`🔒 ${x.icon} ${x.name} is in the Shop for 🪙${x.price}`); DG.audio.play('bad'); return;
            }
            if (tab === 'outfits') p.outfit = it.id || null;
            else if (tab === 'accessories') { p.accessory = it.id || null; if (it.id && p.outfit && (DG.OUTFITS[p.outfit].hat || DG.OUTFITS[p.outfit].acc)) p.outfit = null; }
            else Object.assign(p.look, it.look.lookPatch);
            DG.audio.play('pop'); poke(); DG.save(); draw();
          }));
        };
        draw();
        el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
          tab = b.dataset.tab; page = 0; DG.audio.play('click');
          el.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b)); draw();
        }));
        // rename: updates as you type, so closing never loses it
        const nameIn = el.querySelector('#cl-name'), was = p.name;
        nameIn.addEventListener('input', () => { const v = nameIn.value.trim().slice(0, 14); if (v) { p.name = v; DG.save(); } });
        nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameIn.blur(); });
        nameIn.addEventListener('blur', () => {
          if (!nameIn.value.trim()) nameIn.value = p.name;
          if (p.name !== was) { DG.audio.play('good'); poke(); }
        });
        el.querySelector('#cl-done').onclick = () => { DG.audio.play('click'); close(); };
        el.querySelector('#cl-shop').onclick = () => { DG.audio.play('click'); close(); setTimeout(() => shop(tab === 'accessories' ? 'accessories' : 'outfits'), 220); };
      },
    });
  }
  /** Arena look picker (moved here from the closet). */
  function arenaLook() {
    const st = DG.state;
    DG.ui.modal({
      title: '🏟️ Arena look',
      html: `<div class="chip-row tight">${st.inventory.arenas.map((a) => `<button class="chip-btn ${st.equipped.arena === a ? 'on' : ''}" data-arena="${a}">${DG.ARENAS[a].icon} ${DG.ARENAS[a].name}</button>`).join('')}</div>
        <p class="fine">Buy more arena looks in the 🛍️ Shop.</p>`,
      buttons: [{ label: 'Done', cls: 'primary' }],
      onOpen(el) {
        el.querySelectorAll('[data-arena]').forEach((b) => (b.onclick = () => {
          st.equipped.arena = b.dataset.arena; DG.audio.play('pop'); DG.save();
          el.querySelectorAll('[data-arena]').forEach((x) => x.classList.toggle('on', x === b));
        }));
      },
    });
  }

  /* ================= Decorate home ================= */
  function decorate() {
    const st = DG.state;
    if (!st.home) st.home = { wall: 'peach', pattern: 'stripes', floor: 'wood' };
    const h = st.home, R = DG.ROOM;
    let raf = 0, tab = 'walls', page = 0;
    const PER = 10;
    const TABS = {
      walls:    { icon: 'walls', label: 'Walls',    title: 'Wall Color',    sub: 'Choose a color for your walls' },
      patterns: { icon: 'patterns', label: 'Patterns', title: 'Wallpaper',     sub: 'Pick a pattern for your walls' },
      floors:   { icon: 'floors', label: 'Floors',   title: 'Floor',         sub: 'Choose your floor' },
      decor:    { icon: 'decor', label: 'Decor',    title: 'Decorations',   sub: 'Tap to show or hide · buy more in the Shop' },
    };
    const ico = (n) => `<img class="dc-ico" src="${(window.DG_ASSETS && window.DG_ASSETS[`img/dc_${n}.webp`]) || `img/dc_${n}.webp?v=1`}" alt="">`;
    /* little samples of each pattern and floor, cut from a real render of the room */
    const thumbs = {};
    const sample = (home, kind) => {
      const tall = R.W < 700, box = kind === 'wall' ? (tall ? [380, 30, 150, 150] : [560, 30, 150, 150]) : (tall ? [185, 320, 160, 160] : [395, 305, 120, 120]);
      const full = document.createElement('canvas'); full.width = R.W * 0.5; full.height = (R.H + 140) * 0.5;
      const c = full.getContext('2d'), keep = [DG.devNight, DG.devSky]; c.scale(0.5, 0.5);
      DG.devNight = false; DG.devSky = { hour: 12, weather: 'clear' }; // samples always in daylight
      try { DG.draw.room(c, { t: 0, decor: [], toys: [], home, bottom: 140 }); } finally { [DG.devNight, DG.devSky] = keep; }
      const out = document.createElement('canvas'); out.width = out.height = 96;
      out.getContext('2d').drawImage(full, box[0] * 0.5, box[1] * 0.5, box[2] * 0.5, box[3] * 0.5, 0, 0, 96, 96);
      return out.toDataURL();
    };
    const thumb = (kind, id) => {
      const key = kind + id + (kind === 'wall' ? '' : h.wall + h.wallColor + (kind === 'pattern' ? '' : h.pattern));
      if (!thumbs[key]) {
        let over = {};
        if (kind === 'pattern') { // a high-contrast copy of the wall colour, so each pattern is easy to see
          const w0 = DG.WALLS[h.wall] && !DG.WALLS[h.wall].custom ? DG.WALLS[h.wall] : DG.WALLS.peach, mx = DG.draw.mix;
          DG.WALLS.__pv = w0.dark ? { a: w0.a, b: mx(w0.a, '#ffffff', 0.45), trim: w0.trim, dark: true } : { a: mx(w0.a, '#ffffff', 0.3), b: mx(w0.trim, '#000000', 0.12), trim: w0.trim };
          over = { pattern: id, wall: '__pv' };
        } else over = { floor: id };
        try { thumbs[key] = sample(Object.assign({}, h, over), kind === 'pattern' ? 'wall' : 'floor'); } finally { delete DG.WALLS.__pv; }
      }
      return thumbs[key];
    };
    const items = () => {
      if (tab === 'walls') return Object.entries(DG.WALLS).filter(([, x]) => !x.custom).map(([id, x]) => ({ id, name: x.name, on: h.wall === id,
        html: `<i class="dc-sw" style="background:radial-gradient(circle at 35% 30%, #ffffffaa, transparent 45%), ${x.dark ? x.a : DG.draw.mix(x.a, x.trim, 0.55)}"></i>` }));
      if (tab === 'patterns') return Object.entries(DG.PATTERNS).map(([id, x]) => ({ id, name: x.name, on: h.pattern === id, html: `<i class="dc-sw dc-pat" style="background-image:url(${thumb('pattern', id)})"></i>` }));
      if (tab === 'floors') return Object.entries(DG.FLOORS).map(([id, x]) => ({ id, name: x.name, on: h.floor === id, html: `<i class="dc-sw" style="background-image:url(${thumb('floor', id)})"></i>` }));
      return Object.entries(DG.DECOR).map(([id, x]) => {
        const own = st.inventory.decor.includes(id);
        return { id, name: own ? x.name : `🪙${x.price}`, on: own && st.equipped.decor.includes(id), locked: !own, html: `<i class="dc-sw dc-emoji">${x.icon}${own ? '' : '<b class="dc-lock">🔒</b>'}</i>` };
      });
    };
    const panel = () => {
      const all = items(), pages = Math.max(1, Math.ceil(all.length / PER)); page = Math.min(page, pages - 1);
      const T = TABS[tab], show = all.slice(page * PER, page * PER + PER);
      return `<div class="dc-head"><span class="dc-hicon">${ico(T.icon)}</span><div><h3>${T.title}</h3><p>${T.sub}</p></div></div>
        <div class="dc-pick">
          <button class="dc-arrow" data-pg="-1" ${page ? '' : 'disabled'} aria-label="Previous">‹</button>
          <div class="dc-sws ${tab === 'walls' ? 'plain' : ''}">${show.map((it) => `<button class="dc-it ${it.on ? 'on' : ''} ${it.locked ? 'locked' : ''}" data-id="${it.id}" title="${esc(it.name)}">${it.html}<span class="dc-check" aria-hidden="true">✓</span>${tab === 'walls' ? '' : `<small>${esc(it.name)}</small>`}</button>`).join('')}</div>
          <button class="dc-arrow" data-pg="1" ${page < pages - 1 ? '' : 'disabled'} aria-label="Next">›</button>
        </div>
        <div class="dc-dots">${pages > 1 ? Array.from({ length: pages }, (_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('') : ''}</div>`;
    };
    DG.ui.modal({
      cls: 'dc-modal', wide: true,
      html: `<div class="dc">
          <div class="dc-sign"><span class="dc-house" aria-hidden="true">🏠</span><h2>Decorate Your Home</h2></div>
          <div class="dc-view"><canvas id="dc-prev"></canvas></div>
          <div class="dc-tabs">${Object.entries(TABS).map(([k, x]) => `<button class="dc-tab ${k === tab ? 'on' : ''}" data-tab="${k}"><span>${ico(x.icon)}</span>${x.label}</button>`).join('')}</div>
          <div class="dc-panel" id="dc-panel"></div>
          <div class="dc-info"><span class="dc-i">i</span><p>Walls, patterns and floors are free to change anytime. Buy more decorations in the <b>Shop!</b> 🛍️</p></div>
          <div class="dc-foot"><button class="dc-shop" id="dc-shop">🛍️ Shop Decor</button><button class="dc-done" id="dc-done">Done</button></div>
        </div>`,
      onClose() { cancelAnimationFrame(raf); DG.save(); },
      onOpen(el, close) {
        const cv = el.querySelector('#dc-prev'), c = cv.getContext('2d'), pn = el.querySelector('#dc-panel');
        const t0 = performance.now();
        const frame = (now) => {
          if (!cv.isConnected) return;
          // same framing as the home screen on a phone: a strip of wall above the window, the furniture, then floor
          const dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.clientWidth, ch = cv.clientHeight;
          if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
          const TOP = 18, baseF = R.W < 700 ? 125 : 10, need = R.H - TOP + baseF;
          let s = cw / R.W, ox = 0;
          if (ch / s < need) { s = ch / need; ox = (cw - R.W * s) / 2; }
          const F = ch / s - (R.H - TOP);
          c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#f6e7d4'; c.fillRect(0, 0, cv.width, cv.height);
          c.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, 0); c.translate(0, -TOP);
          const t = (now - t0) / 1000;
          DG.draw.room(c, { t, decor: st.equipped.decor, toys: st.inventory.toys, home: h, bottom: F });
          const p = DG.pet();
          if (p) DG.draw.dumpling(c, { type: p.type, look: p.look, x: R.spots.home.x, y: R.spots.home.y, size: 150 * DG.stage().scale, t, stage: DG.stageIndex(),
            accessory: p.accessory, trait: p.trait, mood: 'happy', hop: Math.max(0, Math.sin(t * 3)) * 6, blink: (t % 3.4) < 0.12 });
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        const draw = () => {
          pn.innerHTML = panel();
          pn.querySelectorAll('[data-pg]').forEach((b) => (b.onclick = () => { page += +b.dataset.pg; DG.audio.play('click'); draw(); }));
          pn.querySelectorAll('.dc-it').forEach((b) => (b.onclick = (e) => {
            const id = b.dataset.id;
            if (tab === 'decor') {
              if (b.classList.contains('locked')) { DG.ui.toast(`${DG.DECOR[id].icon} ${DG.DECOR[id].name} is in the Shop for 🪙${DG.DECOR[id].price}`); return; }
              const eq = st.equipped.decor, i = eq.indexOf(id); if (i >= 0) eq.splice(i, 1); else eq.push(id);
            } else {
              const key = { walls: 'wall', patterns: 'pattern', floors: 'floor' }[tab];
              h[key] = id; DG.unlock('decorator');
            }
            DG.audio.play('pop'); DG.save(); draw();
          }));
        };
        draw();
        el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
          tab = b.dataset.tab; page = 0; DG.audio.play('click');
          el.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b)); draw();
        }));
        el.querySelector('#dc-done').onclick = () => { DG.audio.play('click'); close(); };
        el.querySelector('#dc-shop').onclick = () => { DG.audio.play('click'); close(); setTimeout(() => shop('decor'), 200); };
      },
    });
  }

  /* ================= Stats ================= */
  function stats() {
    const p = DG.pet(), si = DG.stageIndex(), cap = DG.statCap(), c = DG.state.counters;
    const bs = DG.battleStats(p.stats, null, false);
    const mv = DG.STARTERS[p.type].moves;
    const moveLine = (k, need, label) => `<li class="${si >= need ? '' : 'locked'}">${si >= need ? '✅' : '🔒'} <b>${label}: ${DG.MOVES[mv[k]].name}</b> — ${DG.MOVES[mv[k]].desc}${si >= need ? '' : ` <small>(${DG.STAGES[need].name} stage)</small>`}</li>`;
    DG.ui.modal({
      title: `📊 ${pname()}'s Stats`, wide: true,
      html: `<p><b>${DG.STARTERS[p.type].name}</b> · ${DG.STAGES[si].name} · ${DG.fmtAge(DG.ageMs())} · Personality: <b>${DG.personality()}</b></p>
        <p class="fine">Stats can grow up to <b>${cap}</b> at the ${DG.STAGES[si].name} stage. Growing bigger raises the cap.</p>
        <div class="stat-list">${DG.STAT_KEYS.map((k) => {
          const i = DG.STAT_INFO[k];
          return `<div class="stat-row"><span class="stat-name">${i.icon} ${i.name}</span>${DG.ui.bar(p.stats[k], cap, i.color, i.name)}<b>${Math.floor(p.stats[k])}<small>/${cap}</small></b></div>`;
        }).join('')}</div>
        <div class="two-col">
          <div><div class="lbl">Battle profile</div><ul class="nice-list small">
            <li>❤️ Health ${bs.maxHp}</li><li>🔋 Stamina ${bs.maxSta}</li><li>👊 Attack ${bs.dmg.toFixed(1)}</li>
            <li>💨 Speed ${bs.speed.toFixed(1)}</li><li>🛡️ Block ${Math.round(bs.blockRed * 100)}%</li><li>🎯 Special charge ${bs.charge.toFixed(1)}/s</li></ul></div>
          <div><div class="lbl">Moves</div><ul class="nice-list small">
            <li>✅ <b>Basic attack</b>, block and dodge</li>${moveLine('special', 2, 'Special')}${moveLine('move2', 3, 'Move 2')}${moveLine('ult', 4, 'Ultimate')}</ul></div>
        </div>
        <p>⭐ Favorite food: <b>${p.favoriteKnown ? DG.FOODS[p.favoriteFood].icon + ' ' + DG.FOODS[p.favoriteFood].name : '??? — try different foods!'}</b>
        ${p.foodBonus ? `<br>🍱 Next battle: <b>${p.foodBonus.label}</b>` : ''}
        ${DG.cozy() ? '<br>🏠 Cozy bonus: well cared for → +10% special charge in battle.' : '<br>🏠 Keep all needs high (avg 70+) for a cozy +10% special charge.'}
        <br>🏟️ Record: ${c.wins} wins · ${c.losses} losses · ${c.draws} draws · 🏋️ ${c.trainings} training sessions</p>`,
      buttons: [{ label: 'Close', cls: 'primary' }],
    });
  }

  function trophies() {
    const a = DG.state.achievements;
    const ids = Object.keys(DG.ACHIEVEMENTS);
    DG.ui.modal({
      title: `🏆 Trophies (${ids.filter((i) => a[i]).length}/${ids.length})`, wide: true,
      html: `<div class="ach-grid">${ids.map((id) => {
        const x = DG.ACHIEVEMENTS[id];
        return `<div class="ach ${a[id] ? 'got' : ''}"><div class="ach-ico">${a[id] ? x.icon : '🔒'}</div><b>${x.name}</b><small>${x.desc}</small><small class="coin">🪙 ${x.coins}</small></div>`;
      }).join('')}</div>`,
      buttons: [{ label: 'Close', cls: 'primary' }],
    });
  }

  function settings() {
    const s = DG.state.settings;
    DG.ui.modal({
      title: '⚙️ Settings',
      html: `<div class="settings">
          <label class="toggle"><input type="checkbox" id="st-sound" ${s.sound ? 'checked' : ''}> 🔊 Sound effects</label>
          <label class="toggle"><input type="checkbox" id="st-music" ${s.music ? 'checked' : ''}> 🎵 Music</label>
          <label class="toggle"><input type="checkbox" id="st-big" ${s.bigText ? 'checked' : ''}> 🔠 Larger text</label>
          <label class="lbl" for="st-touch">📱 On-screen touch controls</label>
          <select id="st-touch" class="text-in"><option value="auto">Automatic</option><option value="on">Always show</option><option value="off">Hide</option></select>
        </div>
        <details class="howto"><summary>❓ How to play</summary>
          <ul class="nice-list small">
            <li><b>Care:</b> tap your dumpling to pet it. Tap the food bowl, toy basket, bath and bed to keep its four needs up. Tap anywhere else in the room and it walks there.</li>
            <li><b>Grow:</b> your dumpling grows with real time — 1 hour to Small, 1 day to Medium, 7 days to Large, 1 month to Giant. Growing <b>pauses</b> while any need is below 20.</li>
            <li><b>Night:</b> from 9 PM to 7 AM your dumpling sleeps in bed. Waking it up makes its energy drain fast. Sleeping refills energy slowly (about 8 hours from empty to full).</li>
            <li><b>Walk:</b> take your dumpling to the park. Tap to hop over puddles and grab coins.</li>
            <li><b>Decorate:</b> change wall colors, wallpaper, floors and decorations for free.</li>
            <li><b>Train:</b> five 40-second minigames each raise a different stat.</li>
            <li><b>Battle (keyboard):</b> WASD/arrows move, J attack (tap 3 times for a combo, hold for a charged Smash), K block (hold), Space dodge, L special, I second move, O ultimate. Esc pauses.</li>
            <li><b>Battle tricks:</b> block just before a hit to <b>Parry</b>, or dodge at the last moment for a <b>Perfect Dodge</b>. Both slow time and make your next hit critical. A fully charged Smash breaks through blocks.</li>
            <li><b>Battle (phone):</b> drag anywhere on the left to move; tap the big buttons on the right. Turn your phone sideways for a bigger arena.</li>
            <li><b>Rewards:</b> earn Dumpling Coins from training, battles and care challenges; spend them in the Shop.</li>
            <li><b>Start over:</b> the 🐣 button at the bottom of Settings lets you adopt a brand new baby dumpling.</li>
          </ul></details>
        <p class="save-note">💾 Your save lives in <b>this browser</b> on this device and is saved automatically. Clearing browser data or using a different browser starts fresh.</p>
        ${DG.pet() ? '<button class="btn ghost start-over" id="st-restart">🐣 Start over with a new baby dumpling</button>' : ''}`,
      buttons: [{ label: 'Done', cls: 'primary' }],
      onOpen(el) {
        el.querySelector('#st-touch').value = s.touch || 'auto';
        el.querySelector('#st-sound').onchange = (e) => { s.sound = e.target.checked; DG.save(); DG.audio.play('pop'); };
        el.querySelector('#st-music').onchange = (e) => { s.music = e.target.checked; DG.save(); DG.audio.syncMusic(); };
        el.querySelector('#st-big').onchange = (e) => { s.bigText = e.target.checked; document.body.classList.toggle('big-text', s.bigText); DG.save(); };
        el.querySelector('#st-touch').onchange = (e) => { s.touch = e.target.value; DG.save(); };
        const rs = el.querySelector('#st-restart');
        if (rs) rs.onclick = () => { el.closest('.modal-wrap').querySelector('.modal-x')?.click(); setTimeout(startOver, 220); };
      },
    });
  }

  /** Say goodbye to the current dumpling and adopt a new baby. Keeps sound/music/text settings. */
  function startOver() {
    const p = DG.pet(); if (!p) return;
    DG.ui.modal({
      title: '🐣 Start over?',
      html: `<p>Say goodbye to <b>${esc(p.name)}</b> and adopt a brand new baby dumpling?</p>
        <p class="fine">This erases ${esc(p.name)}, your coins, items, decorations and trophies. It can't be undone.</p>`,
      buttons: [{ label: 'Keep ' + esc(p.name), cls: 'ghost' }, {
        label: '🐣 Start over', cls: 'danger', onClick() {
          const keep = Object.assign({}, DG.state.settings);
          if (DG.ui.current() === 'home' && DG.Home) DG.Home.exit();
          DG.resetSave();
          DG.state.settings = Object.assign(DG.state.settings, keep);
          DG.save();
          DG.ui.show('adopt');
        },
      }],
    });
  }

  /* ================= Milestones ================= */
  function checkMilestones() {
    const p = DG.pet();
    if (!p || DG._holdMilestones || DG.ui.current() !== 'home' || DG.ui.anyModal() || (DG.Home && DG.Home.isBusy())) return;
    const real = DG.realStageIndex();
    if (real > p.lastStageSeen) {
      const from = p.lastStageSeen;
      p.lastStageSeen = real;
      DG.save();
      celebrateStage(real, from);
    } else if (real >= 3 && !p.trait) traitPick();
  }
  function celebrateStage(idx, from, preview) {
    const p = DG.pet(), st = DG.STAGES[idx];
    const unlocks = [];
    for (let i = (from || 0) + 1; i <= idx; i++) {
      DG.STAGES[i].unlocks.forEach((u) => unlocks.push(u));
      if (!preview) DG.unlock(['', '', 'grownMedium', 'grownLarge', 'fullyGrown'][i]);
    }
    const mv = DG.STARTERS[p.type].moves;
    const moveName = idx === 2 ? DG.MOVES[mv.special].name : idx === 3 ? DG.MOVES[mv.move2].name : idx === 4 ? DG.MOVES[mv.ult].name : '';
    let stop = null;
    DG.audio.play('levelup');
    DG.ui.modal({
      title: `🎉 ${pname()} grew into a ${st.name} dumpling!`, wide: true, cls: 'celebrate',
      html: `<canvas class="celebrate-canvas" id="cel-cv"></canvas>
        <p>${idx === 4 ? `Look how HUGE and lovable ${pname()} is! 🌳` : `${pname()} is bigger, bouncier and more coordinated!`}</p>
        <div class="lbl">Unlocked</div>
        <ul class="nice-list">${unlocks.map((u) => `<li>✨ ${u}${u.includes('move') && moveName ? `: <b>${moveName}</b>` : ''}</li>`).join('')}</ul>`,
      buttons: [{ label: 'Hooray!', cls: 'primary' }],
      onClose() { if (stop) stop(); if (!preview) { DG.Home.celebrate('I grew!'); setTimeout(checkMilestones, 600); } },
      onOpen(el) {
        const parts = [];
        const fromScale = DG.STAGES[from || 0].scale, toScale = st.scale;
        stop = DG.ui.previewLoop(el.querySelector('#cel-cv'), (t) => {
          const k = Math.min(1, t / 1.2), e = 1 - Math.pow(1 - k, 3);
          const pulse = k < 1 ? Math.sin(t * 25) * 0.04 * (1 - k) : 0;
          return {
            type: p.type, look: p.look, stage: idx, accessory: p.accessory, trait: p.trait, mood: 'joy',
            size: 120 * (fromScale + (toScale - fromScale) * e) / 1.0 + 20, squash: pulse,
            hop: k >= 1 ? Math.max(0, Math.sin(t * 4)) * 14 : 0,
            after(ctx, tt) {
              if (Math.random() < 0.35) DG.draw.confetti(parts, Math.random() * 360, -10, 1);
              DG.draw.updateParticles(parts, 1 / 60); parts.forEach((pp) => DG.draw.particle(ctx, pp));
            },
          };
        }, 360, 240);
      },
    });
  }
  function traitPick() {
    const p = DG.pet(); if (p.trait) return;
    const c = DG.traitCandidates();
    const assign = (k) => {
      p.trait = k; DG.save();
      DG.ui.toast(`${DG.TRAITS[k].icon} ${pname()} earned the <b>${DG.TRAITS[k].name}</b>!`, 'gold');
      DG.audio.play('fanfare'); DG.Home.celebrate('Looking sharp!');
    };
    if (c.length === 1) {
      DG.ui.modal({
        title: `${DG.TRAITS[c[0]].icon} A new look!`,
        html: `<p>All that <b>${DG.STAT_INFO[c[0]].name.toLowerCase()}</b> training paid off. ${pname()} now wears a <b>${DG.TRAITS[c[0]].name}</b>!</p>`,
        buttons: [{ label: 'Awesome!', cls: 'primary', onClick: () => assign(c[0]) }], dismissable: false,
      });
    } else {
      DG.ui.modal({
        title: '✨ Choose a new look!', dismissable: false,
        html: `<p>${pname()} trained ${c.map((k) => DG.STAT_INFO[k].name.toLowerCase()).join(' and ')} equally. Which look should it wear?</p>`,
        buttons: c.map((k) => ({ label: `${DG.TRAITS[k].icon} ${DG.TRAITS[k].name}`, cls: 'primary', onClick: () => assign(k) })),
      });
    }
  }

  function welcomeBack(info) {
    const p = DG.pet();
    const grewFrom = info.stageBefore, grewTo = DG.realStageIndex();
    DG.ui.modal({
      title: `${pname()} missed you! 💕`,
      html: `<p>You were away for <b>${DG.fmtDuration(info.gap)}</b>.</p>
        <ul class="nice-list small">
          <li>🌱 ${pname()} is now ${DG.fmtAge(DG.ageMs())}${grewTo > grewFrom ? ` — and grew into a <b>${DG.STAGES[grewTo].name}</b>!` : '.'}</li>
          <li>Needs dipped a little while you were gone, but nothing a snack, a cuddle and a nap can't fix.</li>
          ${p.asleep ? (DG.isNight() ? `<li>🌙 It's night time, so ${pname()} is tucked into bed. It wakes up at 7 AM.</li>` : '<li>😴 Still napping.</li>') : info.wokeUp ? '<li>☀️ It woke up and is ready for the day.</li>' : ''}
          ${DG.frozenNeeds().length ? `<li>⏸ Growing is <b>paused</b> until ${DG.frozenNeeds().map((k) => DG.NEED_NAMES[k]).join(' and ')} ${DG.frozenNeeds().length > 1 ? 'are' : 'is'} above ${DG.GROWTH_FREEZE}.</li>` : ''}
        </ul>`,
      buttons: [{ label: 'Hello again! 👋', cls: 'primary' }],
      onClose() { if (!DG.pet().asleep) DG.Home.celebrate("You're back!!"); else DG.Home.say('zzz... ♥', 2); setTimeout(checkMilestones, 500); },
    });
  }

  /* ================= Developer panel ================= */
  function devPanel() {
    const el = document.getElementById('dev-panel');
    el.hidden = !el.hidden;
    if (el.hidden) return;
    const render = () => {
      const p = DG.pet();
      el.innerHTML = `<div class="dev-head">🛠️ DEVELOPER PANEL <small>testing only · Ctrl+Shift+D</small><button id="dv-x">✕</button></div>
        ${p ? `<div class="dev-info">Age: ${DG.fmtDuration(DG.ageMs())} · Growth: ${DG.fmtDuration(DG.growMs())} · Stage: ${DG.STAGES[DG.realStageIndex()].name}${DG.frozenNeeds().length ? ' · ⏸ paused' : ''}<br>Night: ${DG.isNight() ? 'yes' : 'no'} · Asleep: ${p.asleep ? 'yes' : 'no'}</div>
        <div class="dev-row"><button data-d="day">+1 day age</button><button data-d="hour">+1 hour age</button></div>
        <div class="dev-row"><label>Preview stage <select id="dv-stage"><option value="">Actual</option>${DG.STAGES.map((s, i) => `<option value="${i}" ${DG.devPreviewStage === i ? 'selected' : ''}>${s.name}</option>`).join('')}</select></label></div>
        <div class="dev-row"><button data-d="away">Simulate 12h away</button><button data-d="coins">+100 coins</button></div>
        <div class="dev-row"><button data-d="low">Lower needs</button><button data-d="fill">Fill needs</button></div>
        <div class="dev-row"><button data-d="night">Toggle fake night</button><button data-d="lowEnergy">Energy to 30</button></div>
        <div class="dev-row"><button data-d="sky">Window: next time of day</button><button data-d="wx">Window: next weather</button></div>` : '<div class="dev-info">No pet adopted yet.</div>'}
        <div class="dev-row"><button data-d="reset" class="danger">Reset test save</button></div>`;
      el.querySelector('#dv-x').onclick = () => (el.hidden = true);
      const sel = el.querySelector('#dv-stage');
      if (sel) sel.onchange = () => { DG.devPreviewStage = sel.value === '' ? null : +sel.value; DG.Home.renderHud(); render(); };
      el.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => {
        const d = b.dataset.d, pt = DG.pet();
        if (d === 'day') { pt.adoptedAt -= DG.DAY; pt.growMs = (pt.growMs || 0) + DG.DAY; DG.save(); DG.ui.toast('🛠️ Aged +1 day'); }
        if (d === 'hour') { pt.adoptedAt -= DG.HOUR; pt.growMs = (pt.growMs || 0) + DG.HOUR; DG.save(); }
        if (d === 'coins') { DG.state.coins += 100; DG.save(); }
        if (d === 'fill') { Object.keys(pt.needs).forEach((k) => (pt.needs[k] = 100)); DG.save(); }
        if (d === 'low') { Object.keys(pt.needs).forEach((k) => (pt.needs[k] = 15)); DG.save(); }
        if (d === 'lowEnergy') { pt.needs.energy = 30; DG.save(); }
        if (d === 'sky' || d === 'wx') {
          const cur = DG.devSky || {}, HRS = [6.2, 7, 12, 18.3, 19.4, 23], WX = ['clear', 'rain'];
          if (d === 'sky') cur.hour = HRS[(HRS.indexOf(cur.hour) + 1) % HRS.length]; else cur.weather = WX[(WX.indexOf(cur.weather) + 1) % WX.length];
          DG.devSky = cur; DG.ui.toast(`🛠️ Window: ${cur.hour != null ? cur.hour + ':00-ish' : 'real time'} · ${cur.weather || 'real weather'}`);
        }
        if (d === 'night') { DG.devNight = DG.devNight == null ? !DG.isNight() : null; DG.ui.toast(DG.devNight == null ? '🛠️ Using the real clock' : DG.devNight ? '🛠️ Pretending it is night' : '🛠️ Pretending it is day'); }
        if (d === 'away') {
          const stageBefore = DG.realStageIndex();
          pt.lastUpdate -= 12 * DG.HOUR; pt.adoptedAt -= 12 * DG.HOUR;
          const info = DG.updateNeeds(); DG.save();
          if (info) { info.stageBefore = stageBefore; if (DG.ui.current() === 'home') welcomeBack(info); }
        }
        if (d === 'reset') {
          if (!confirm('Reset the test save? This erases the pet and all progress in this browser.')) return;
          DG.resetSave(); el.hidden = true; DG.ui.show('adopt'); return;
        }
        if (DG.ui.current() === 'home') { DG.Home.renderHud(); checkMilestones(); }
        render();
      }));
    };
    render();
    clearInterval(el._t); el._t = setInterval(() => { if (!el.hidden && !el.contains(document.activeElement)) render(); }, 2000);
  }

  DG.Menus = { arenaLook, welcomeHome, startOver, feed, toys, shop, closet, decorate, stats, trophies, settings, checkMilestones, celebrateStage, traitPick, welcomeBack, devPanel, buy };
})(window.DG);
