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
        <img class="title-art" src="img/title.webp?v=2" alt="My Pet Dumpling. Three baby dumplings are looking for a home. Who will you adopt?">
        <div class="ts-grid">
          ${Object.values(DG.STARTERS).map((s) => `
            <button class="ts-card ts-${THEME[s.id]}" data-type="${s.id}">
              <div class="ts-top"><span class="ts-pop" aria-hidden="true"></span><canvas class="starter-canvas" data-type="${s.id}"></canvas></div>
              <div class="ts-name"><i aria-hidden="true">✿</i>${s.name}<i aria-hidden="true">✿</i></div>
              <div class="ts-kind">${s.kind}</div>
              <p class="ts-desc">${s.desc}</p>
              <div class="ts-box"><span class="ts-ico" aria-hidden="true">💪</span><span>${s.strength}</span></div>
              <div class="ts-box"><span class="ts-ico" aria-hidden="true">✨</span><span><b>${DG.MOVES[s.moves.special].name}:</b> ${DG.MOVES[s.moves.special].desc}</span></div>
            </button>`).join('')}
        </div>
        <div class="ts-note"><canvas class="ts-note-pet" width="160" height="130" aria-hidden="true"></canvas><p>All three are equally strong overall — training can improve any weaker area.</p></div>
      </div>`;
    { // the little happy bao in the bottom note
      const nc = root.querySelector('.ts-note-pet').getContext('2d');
      DG.draw.dumpling(nc, { type: 'bao', x: 80, y: 118, size: 92, mood: 'joy', stage: 1, shadow: false, t: 0 });
      nc.fillStyle = '#ff7f9e'; [[22, 30, 9], [138, 22, 7], [30, 62, 6]].forEach(([x, y, s]) => { nc.beginPath(); nc.moveTo(x, y + s * 0.6); nc.bezierCurveTo(x - s * 1.2, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.35); nc.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.2, y - s * 0.2, x, y + s * 0.6); nc.fill(); });
    }
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
        DG.ui.modal({
          title: `Welcome home, ${pname()}! 🎉`,
          html: `<p>Your baby dumpling grows in <b>real time</b> — even when the game is closed:</p>
            <ul class="nice-list"><li>🌱 <b>Small</b> after 1 hour — unlocks arena battles</li><li>🌿 <b>Medium</b> after 1 day — a special move</li><li>🌳 <b>Large</b> after 7 days — advanced training & a second move</li><li>🏔️ <b>Giant</b> after 1 month — an ultimate move!</li></ul>
            <p>Keep ${pname()} fed, happy, rested and clean. If any need drops below <b>20</b>, growing <b>pauses</b> until you raise it again. Dumplings never lose progress.</p>
            <p>🌙 From <b>9 PM to 7 AM</b>, ${pname()} goes to bed on its own.</p>
            <p>Want to battle right away? In the <b>Arena</b> you can battle a friend on the same Wi‑Fi.</p>`,
          buttons: [{ label: "Let's go!", cls: 'primary' }],
        });
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
    const table = { food: DG.FOODS, accessories: DG.ACCESSORIES, toys: DG.TOYS, decor: DG.DECOR, arenas: DG.ARENAS }[cat];
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
    tab = tab || 'food';
    const st = DG.state, inv = st.inventory;
    const tabs = [['food', '🍱 Food'], ['accessories', '🎀 Hats & Accessories'], ['toys', '🧸 Toys'], ['decor', '🪴 Decor'], ['arenas', '🏟️ Arenas']];
    const table = { food: DG.FOODS, accessories: DG.ACCESSORIES, toys: DG.TOYS, decor: DG.DECOR, arenas: DG.ARENAS }[tab];
    const items = Object.entries(table).filter(([, it]) => !(tab === 'food' && it.free) && !(tab !== 'food' && it.price === 0));
    DG.ui.modal({
      title: '🛍️ Dumpling Shop', wide: true,
      html: `<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
        <p class="coins-line">🪙 <b>${st.coins}</b> Dumpling Coins</p>
        <div class="shop-grid">${items.map(([id, it]) => {
          const owned = tab !== 'food' && inv[tab].includes(id);
          return `<div class="shop-item ${owned ? 'owned' : ''}" title="${esc(it.desc || it.name)}"><div class="shop-ico">${it.icon}</div><b>${it.name}</b>
            ${tab === 'food' ? `<small class="desc">${it.desc}</small><small class="have">Have: ${inv.food[id] || 0}</small>` : ''}
            ${owned ? '<span class="owned-tag">Owned ✓</span>' : `<button class="btn small primary" data-buy="${id}" ${st.coins < it.price ? 'disabled' : ''}>🪙 ${it.price}</button>`}</div>`;
        }).join('')}</div>
        <p class="fine">Everything is earned through play. Accessories, decor and arenas are cosmetic. Equip them in the Closet.</p>`,
      onOpen(el, cl) {
        el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { cl(); shop(b.dataset.tab); }));
        el.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => { if (buy(tab, b.dataset.buy)) { cl(); shop(tab); } }));
      },
    });
  }

  /* ================= Closet ================= */
  function closet() {
    const st = DG.state, p = DG.pet();
    let stop = null;
    const accs = st.inventory.accessories;
    if (!p.look) p.look = { color: 'classic', eyes: 'round', cheeks: 'blush' };
    DG.ui.modal({
      title: '🎀 Closet', wide: true,
      html: `<div class="closet">
        <canvas class="closet-prev" id="cl-prev"></canvas>
        <div>
          <label class="lbl" for="cl-name">Name</label>
          <div class="name-row"><input id="cl-name" class="text-in" maxlength="14" value="${esc(p.name)}" autocomplete="off" enterkeyhint="done"><button class="btn small" id="cl-rename">Rename</button></div>
          ${lookPickerHtml(p.type, p.look)}
          <div class="lbl">Accessory</div>
          <div class="chip-row tight" id="cl-acc">
            <button class="chip-btn ${!p.accessory ? 'on' : ''}" data-acc="">🚫 None</button>
            ${accs.map((a) => `<button class="chip-btn ${p.accessory === a ? 'on' : ''}" data-acc="${a}">${DG.ACCESSORIES[a].icon} ${DG.ACCESSORIES[a].name}</button>`).join('')}
          </div>
          ${p.trait ? `<p class="note">${DG.TRAITS[p.trait].icon} Training look: <b>${DG.TRAITS[p.trait].name}</b> (earned at Large stage)</p>` : ''}
          <div class="lbl">Arena look</div>
          <div class="chip-row tight">${st.inventory.arenas.map((a) => `<button class="chip-btn ${st.equipped.arena === a ? 'on' : ''}" data-arena="${a}">${DG.ARENAS[a].icon} ${DG.ARENAS[a].name}</button>`).join('')}</div>
          <p class="fine">Decorate your house with the 🏠 <b>Decorate</b> button on the home screen.</p>
        </div></div>`,
      buttons: [{ label: 'Done', cls: 'primary' }],
      onClose() { if (stop) stop(); DG.save(); if (DG.Home) DG.Home.renderHud(); },
      onOpen(el) {
        let pokeT = -9;
        stop = DG.ui.previewLoop(el.querySelector('#cl-prev'), (t) => {
          el._t = t;
          const poked = t - pokeT < 0.7;
          return { type: p.type, look: p.look, stage: DG.stageIndex(), size: 130, accessory: p.accessory, trait: p.trait,
            mood: poked ? 'joy' : 'happy', blink: (t % 3.2) < 0.12, hop: poked ? Math.sin((t - pokeT) / 0.7 * Math.PI) * 16 : Math.max(0, Math.sin(t * 3)) * 5 };
        }, 240, 200);
        const poke = () => { pokeT = el._t || 0; DG.save(); };
        wireLookPicker(el, p.look, poke);
        const nameIn = el.querySelector('#cl-name');
        // the name updates as you type (so closing the closet never loses it); Rename / Enter confirms it
        let announced = p.name;
        const live = () => {
          const v = nameIn.value.trim().slice(0, 14);
          if (!v || v === p.name) return;
          p.name = v; DG.save();
          if (DG.Home) DG.Home.renderHud();
        };
        const rename = () => {
          live();
          if (!nameIn.value.trim()) nameIn.value = p.name;
          if (p.name === announced) return;
          announced = p.name; DG.audio.play('good'); poke();
          DG.ui.toast(`✏️ Your dumpling is now called <b>${esc(p.name)}</b>!`);
        };
        nameIn.addEventListener('input', live);
        nameIn.addEventListener('blur', live);
        el.querySelector('#cl-rename').onclick = rename;
        nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { rename(); nameIn.blur(); } });
        el.querySelectorAll('[data-acc]').forEach((b) => (b.onclick = () => {
          p.accessory = b.dataset.acc || null; DG.audio.play('pop'); poke();
          el.querySelectorAll('[data-acc]').forEach((x) => x.classList.toggle('on', x === b));
        }));
        el.querySelectorAll('[data-arena]').forEach((b) => (b.onclick = () => {
          st.equipped.arena = b.dataset.arena; DG.audio.play('pop');
          el.querySelectorAll('[data-arena]').forEach((x) => x.classList.toggle('on', x === b)); DG.save();
        }));
      },
    });
  }

  /* ================= Decorate home ================= */
  function decorate() {
    const st = DG.state;
    if (!st.home) st.home = { wall: 'peach', pattern: 'stripes', floor: 'wood' };
    const h = st.home;
    let raf = 0;
    const chips = (key, table) => Object.entries(table).map(([id, x]) =>
      `<button class="chip-btn ${h[key] === id ? 'on' : ''}" data-hk="${key}" data-v="${id}">${x.a ? `<i class="dot" style="background:${x.custom ? (h.wallColor || x.a) : x.a};border-color:${x.trim || x.b}"></i>` : ''}${x.name}</button>`).join('');
    DG.ui.modal({
      title: '🏠 Decorate Your Home', wide: true, cls: 'decor-modal',
      html: `<canvas class="decor-prev" id="dc-prev"></canvas>
        <div class="lbl">Wall color</div><div class="chip-row tight">${chips('wall', DG.WALLS)}<label class="chip-btn color-pick" title="Pick any wall color">🎨 Pick any color <input type="color" id="dc-wallcol" value="${h.wallColor || '#ffe9d6'}"></label></div>
        <div class="lbl">Wallpaper pattern</div><div class="chip-row tight">${chips('pattern', DG.PATTERNS)}</div>
        <div class="lbl">Floor</div><div class="chip-row tight">${chips('floor', DG.FLOORS)}</div>
        <div class="lbl">Decorations <small>(tap to show or hide)</small></div>
        <div class="chip-row tight">${Object.entries(DG.DECOR).map(([d, x]) => st.inventory.decor.includes(d)
          ? `<button class="chip-btn ${st.equipped.decor.includes(d) ? 'on' : ''}" data-decor="${d}">${x.icon} ${x.name}</button>`
          : `<span class="chip-btn locked" title="Buy in the Shop">🔒 ${x.icon} ${x.name} · 🪙${x.price}</span>`).join('')}</div>
        <p class="fine">Walls, patterns and floors are free to change any time. Buy more decorations in the 🛍️ Shop.</p>`,
      buttons: [{ label: '🛍️ Shop decor', cls: 'ghost', onClick: () => setTimeout(() => shop('decor'), 200) }, { label: 'Done', cls: 'primary' }],
      onClose() { cancelAnimationFrame(raf); DG.save(); },
      onOpen(el) {
        const cv = el.querySelector('#dc-prev'), c = cv.getContext('2d'), R = DG.ROOM;
        const t0 = performance.now();
        const frame = (now) => {
          if (!cv.isConnected) return;
          const k = DG.ui.fitCanvas(cv, R.W, R.H); c.setTransform(k, 0, 0, k, 0, 0);
          const t = (now - t0) / 1000;
          DG.draw.room(c, { t, decor: st.equipped.decor, toys: st.inventory.toys, home: h });
          const p = DG.pet();
          if (p) DG.draw.dumpling(c, { type: p.type, look: p.look, x: R.spots.home.x, y: R.spots.home.y, size: 150 * DG.stage().scale, t, stage: DG.stageIndex(),
            accessory: p.accessory, trait: p.trait, mood: 'happy', hop: Math.max(0, Math.sin(t * 3)) * 6, blink: (t % 3.4) < 0.12 });
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        el.querySelectorAll('[data-hk]').forEach((b) => (b.onclick = () => {
          const key = b.dataset.hk; h[key] = b.dataset.v; DG.audio.play('pop');
          el.querySelectorAll(`[data-hk="${key}"]`).forEach((x) => x.classList.toggle('on', x === b));
          DG.unlock('decorator'); DG.save();
        }));
        const wc = el.querySelector('#dc-wallcol');
        wc.oninput = () => {
          h.wallColor = wc.value; h.wall = 'custom';
          const dot = el.querySelector('[data-hk="wall"][data-v="custom"] .dot'); if (dot) dot.style.background = wc.value;
          el.querySelectorAll('[data-hk="wall"]').forEach((x) => x.classList.toggle('on', x.dataset.v === 'custom'));
          DG.save();
        };
        el.querySelectorAll('[data-decor]').forEach((b) => (b.onclick = () => {
          const d = b.dataset.decor, eq = st.equipped.decor, i = eq.indexOf(d);
          if (i >= 0) eq.splice(i, 1); else eq.push(d);
          b.classList.toggle('on', i < 0); DG.audio.play('pop'); DG.save();
        }));
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

  DG.Menus = { startOver, feed, toys, shop, closet, decorate, stats, trophies, settings, checkMilestones, celebrateStage, traitPick, welcomeBack, devPanel, buy };
})(window.DG);
