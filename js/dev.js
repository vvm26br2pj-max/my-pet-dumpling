/* My Pet Dumpling — DEVELOPER CODES (testing only)
 *
 * How to open: tap the coins counter at the top 5 times quickly,
 * or press Ctrl+Shift+C on a keyboard. Type a code and press Enter. Type HELP for the list.
 *
 * TO REMOVE BEFORE RELEASE: delete this file and the dev.js script line in index.html.
 * (The older keyboard-only panel, Ctrl+Shift+D, lives in menus.js devPanel() and main.js; remove those too.)
 */
(function (DG) {
  const H = DG.HOUR, D = DG.DAY;
  const pet = () => DG.pet();
  const refresh = () => {
    DG.save();
    if (DG.ui.current() === 'home' && DG.Home) { DG.Home.renderHud(); DG.Menus.checkMilestones(); }
  };
  const setNeeds = (o) => { const p = pet(); Object.keys(o).forEach((k) => (p.needs[k] = o[k])); };
  const growTo = (i) => {
    const p = pet(), at = DG.STAGES[i].at;
    const diff = at - (p.growMs || 0);
    p.growMs = at; p.adoptedAt -= Math.max(0, diff);
    DG.devPreviewStage = null;
  };

  // code -> [description, action]. Actions return a message (or nothing).
  const CODES = {
    HELP:     ['Show this list', () => { showHelp(); return null; }],
    DEV:      ['Open the full developer panel', () => { DG.Menus.devPanel(); return null; }],
    RICH:     ['+1,000 coins', () => { DG.state.coins += 1000; return '+1,000 coins'; }],
    BROKE:    ['Coins to 0', () => { DG.state.coins = 0; return 'Coins set to 0'; }],
    GROWUP:   ['Grow to the next stage', () => {
      const i = DG.realStageIndex(); if (i >= DG.STAGES.length - 1) return 'Already fully grown';
      growTo(i + 1); return `Grew into ${DG.STAGES[i + 1].name}`;
    }],
    BABY:     ['Back to Baby stage', () => { const p = pet(); p.growMs = 0; p.adoptedAt = DG.now(); p.lastStageSeen = 0; DG.devPreviewStage = null; return 'Back to Baby'; }],
    GIANT:    ['Jump straight to Giant', () => { growTo(DG.STAGES.length - 1); return 'Now Giant'; }],
    FULL:     ['Fill every need to 100', () => { setNeeds({ fullness: 100, happiness: 100, energy: 100, cleanliness: 100 }); return 'All needs full'; }],
    LOW:      ['Every need to 15', () => { setNeeds({ fullness: 15, happiness: 15, energy: 15, cleanliness: 15 }); return 'All needs low'; }],
    HUNGRY:   ['Fullness to 10', () => { setNeeds({ fullness: 10 }); return 'Hungry!'; }],
    SAD:      ['Happiness to 10', () => { setNeeds({ happiness: 10 }); return 'Sad'; }],
    TIRED:    ['Energy to 10', () => { setNeeds({ energy: 10 }); return 'Tired'; }],
    DIRTY:    ['Cleanliness to 5 (test bath time)', () => { setNeeds({ cleanliness: 5 }); return 'Very dirty'; }],
    STRONG:   ['All battle stats to this stage\'s max', () => {
      const p = pet(), cap = DG.statCap(DG.realStageIndex()); DG.STAT_KEYS.forEach((k) => (p.stats[k] = cap)); return `Stats maxed (${cap})`;
    }],
    WEAK:     ['All battle stats to 10', () => { const p = pet(); DG.STAT_KEYS.forEach((k) => (p.stats[k] = 10)); return 'Stats set to 10'; }],
    UNLOCKALL:['Own every accessory, toy, decoration, arena look, +10 of each food', () => {
      const inv = DG.state.inventory;
      inv.accessories = Object.keys(DG.ACCESSORIES);
      inv.toys = Object.keys(DG.TOYS);
      inv.decor = Object.keys(DG.DECOR);
      inv.arenas = Object.keys(DG.ARENAS);
      Object.keys(DG.FOODS).forEach((f) => { if (!DG.FOODS[f].free) inv.food[f] = (inv.food[f] || 0) + 10; });
      return 'Everything unlocked';
    }],
    TROPHIES: ['Unlock every trophy', () => { Object.keys(DG.ACHIEVEMENTS).forEach((a) => DG.unlock(a)); return 'All trophies unlocked'; }],
    BEATALL:  ['Mark every arena opponent as beaten', () => { DG.OPPONENTS.forEach((o) => (DG.state.beaten[o.id] = true)); return 'All opponents beaten'; }],
    NIGHT:    ['Pretend it is night', () => { DG.devNight = true; return 'Pretending it is night'; }],
    DAY:      ['Pretend it is day', () => { DG.devNight = false; return 'Pretending it is day'; }],
    CLOCK:    ['Use the real clock again', () => { DG.devNight = null; return 'Using the real clock'; }],
    SLEEP:    ['Put your dumpling to bed now', () => { const p = pet(); if (DG.Home && !p.asleep) DG.Home.bedtime ? DG.Home.bedtime() : (p.asleep = true); return 'Off to bed'; }],
    WAKE:     ['Wake your dumpling up', () => { pet().asleep = false; return 'Awake'; }],
    AWAY:     ['Simulate 12 hours away', () => {
      const p = pet(); p.lastUpdate -= 12 * H; p.adoptedAt -= 12 * H;
      const info = DG.updateNeeds(); if (info && DG.Menus.welcomeBack) DG.Menus.welcomeBack(info); return null;
    }],
    DAYPASS:  ['Age +1 day (also counts toward growing)', () => { const p = pet(); p.adoptedAt -= D; p.growMs = (p.growMs || 0) + D; return '+1 day'; }],
    RESET:    ['Erase this save and start over', () => {
      if (!confirm('Erase the pet and all progress in this browser?')) return null;
      DG.resetSave(); DG.ui.show('adopt'); return 'Save erased';
    }],
  };

  function run(raw) {
    const code = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return;
    const c = CODES[code];
    if (!c) { DG.audio.play('bad'); DG.ui.toast(`🛠️ Unknown code "${DG.ui.esc(code)}". Try HELP.`); return; }
    if (!pet() && !['HELP', 'DEV', 'RESET', 'RICH', 'UNLOCKALL', 'NIGHT', 'DAY', 'CLOCK'].includes(code)) { DG.ui.toast('🛠️ Adopt a dumpling first'); return; }
    const msg = c[1]();
    refresh();
    if (msg) { DG.audio.play('good'); DG.ui.toast('🛠️ ' + msg); }
  }

  function showHelp() {
    DG.ui.modal({
      title: '🛠️ Developer codes', wide: true,
      html: `<p class="fine">Testing only. Remove <b>js/dev.js</b> before release.</p>
        <div class="dev-codes">${Object.entries(CODES).map(([k, [d]]) => `<button class="chip-btn" data-code="${k}"><b>${k}</b> <small>${DG.ui.esc(d)}</small></button>`).join('')}</div>`,
      buttons: [{ label: 'Close', cls: 'primary' }],
      onOpen(el, close) { el.querySelectorAll('[data-code]').forEach((b) => (b.onclick = () => { close(); setTimeout(() => run(b.dataset.code), 200); })); },
    });
  }

  function openCodeBox() {
    DG.ui.modal({
      title: '🛠️ Developer code',
      html: `<input id="dev-code" class="text-in" placeholder="Type a code, e.g. RICH" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go">
        <p class="fine">Type <b>HELP</b> to see every code.</p>`,
      buttons: [{ label: 'Cancel', cls: 'ghost' }, { label: 'Go', cls: 'primary', onClick() { run(document.getElementById('dev-code').value); } }],
      onOpen(el, close) {
        const inp = el.querySelector('#dev-code');
        setTimeout(() => inp.focus(), 50);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = inp.value; close(); setTimeout(() => run(v), 150); } });
      },
    });
  }

  // Secret way in on a phone: 5 quick taps on the coins counter in the top bar.
  let taps = [];
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest || !e.target.closest('.hud .coins')) return;
    const now = performance.now();
    taps = taps.filter((t) => now - t < 2000); taps.push(now);
    if (taps.length >= 5) { taps = []; openCodeBox(); }
  });
  // Keyboard shortcut on a computer.
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') { e.preventDefault(); openCodeBox(); }
  });

  DG.dev = { run, codes: CODES, open: openCodeBox };
})(window.DG);
