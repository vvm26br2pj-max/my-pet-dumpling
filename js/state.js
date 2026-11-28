/* My Pet Dumpling — save data, time, growth, needs, stats */
(function (DG) {
  const KEY = 'myPetDumpling.save.v1';
  DG.SAVE_KEY = KEY;
  DG.devPreviewStage = null; // dev-only visual/unlock preview (never saved)
  DG.clock = { offset: 0 };   // dev-only time offset for testing
  DG.now = () => Date.now() + DG.clock.offset;

  const OFFLINE_THRESHOLD = 5 * 60e3;     // gaps longer than this are treated as "away"
  const OFFLINE_DECAY_CAP_H = 10;         // at most 10 hours of decline while away
  const OFFLINE_FLOOR = 25;               // needs never drop below this while away
  const RATES = { fullness: 5, happiness: 4, energy: 2.2, cleanliness: 3 }; // per hour
  const SLEEP_REFILL = 12;     // energy per hour while asleep (about 8 hours from empty to full)
  const NIGHT_AWAKE_DRAIN = 12; // energy per hour lost when kept awake at night
  DG.GROWTH_FREEZE = 20;       // growth pauses while any need is below this
  DG.SLEEP_REFILL = SLEEP_REFILL;

  /** Night is 9 PM to 7 AM local time. */
  DG.devNight = null; // dev-only override (never saved)
  DG.isNight = function (ms) {
    if (DG.devNight != null) return DG.devNight;
    const h = new Date(ms || DG.now()).getHours();
    return h >= 21 || h < 7;
  };

  function today() {
    const d = new Date(DG.now());
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function defaults() {
    return {
      version: 2,
      pet: null,
      coins: 25,
      inventory: {
        food: { veg: 2, tofu: 1, noodle: 1, peach: 1 },
        accessories: [],
        outfits: [],
        toys: ['ball', 'mushroom'],
        decor: [],
        arenas: ['classic'],
      },
      equipped: { decor: [], arena: 'classic' },
      home: { wall: 'peach', pattern: 'stripes', floor: 'wood' },
      achievements: {},
      counters: { perfectJumps: 0, baths: 0, pets: 0, trainings: 0, wins: 0, losses: 0, draws: 0,
                  battles: 0, practice: 0, spent: 0, meals: 0, gamesTried: {} },
      beaten: {},
      daily: { date: '', care: 0 },
      settings: { sound: true, music: true, bigText: false, touch: 'auto' },
      lastSeen: 0,
    };
  }
  DG.defaults = defaults;

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(base, src) {
    for (const k in src) {
      if (isObj(base[k]) && isObj(src[k])) merge(base[k], src[k]);
      else base[k] = src[k];
    }
    return base;
  }

  DG.load = function () {
    let s = null;
    try { const raw = localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) { s = null; }
    DG.state = merge(defaults(), s || {});
    const p = DG.state.pet;
    if (p) { // upgrade older saves
      if (p.growMs == null) p.growMs = Math.max(0, (p.lastUpdate || DG.now()) - p.adoptedAt);
      if (!p.look) p.look = { color: 'classic', eyes: 'round', cheeks: 'blush' };
      if ((s && s.version || 1) < 2) { // a Small stage was added: keep each pet at the stage it already reached
        const OLD_AT = [0, 24, 72, 168].map((h) => h * DG.HOUR), MAP = [0, 2, 3, 4];
        let old = 0; OLD_AT.forEach((at, i) => { if ((p.growMs || 0) >= at) old = i; });
        p.growMs = Math.max(p.growMs || 0, DG.STAGES[MAP[old]].at);
        p.lastStageSeen = MAP[Math.min(3, p.lastStageSeen || 0)];
        DG.state.version = 2;
      }
      // Party Flags were removed: refund them
      const inv = DG.state.inventory;
      if (inv.decor.includes('bunting')) { inv.decor = inv.decor.filter((d) => d !== 'bunting'); DG.state.coins += 20; }
      DG.state.equipped.decor = DG.state.equipped.decor.filter((d) => d !== 'bunting');
      if (!DG.CHEEKS[p.look.cheeks]) p.look.cheeks = 'blush'; // e.g. removed War Paint
      // Berry Bites were removed: refund any left and pick a new favourite
      if (inv.food.berry) { DG.state.coins += inv.food.berry * 6; delete inv.food.berry; }
      if (!DG.FOODS[p.favoriteFood]) p.favoriteFood = 'peach';
      if (p.foodBonus && !DG.FOODS[p.foodBonus.food]) p.foodBonus = null;
      DG.seedMoves();
    }
    return DG.state;
  };
  DG.save = function () {
    try {
      if (DG.state.pet) DG.state.lastSeen = DG.now();
      localStorage.setItem(KEY, JSON.stringify(DG.state));
      return true;
    } catch (e) { return false; }
  };
  DG.resetSave = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    DG.state = defaults();
    DG.devPreviewStage = null;
    DG.clock.offset = 0;
  };

  DG.pet = () => DG.state && DG.state.pet;

  /* ---------- Tap-combat specials: ownership and the two equipped moves ---------- */
  /** Fills in owned / equipped specials for saves that don't have them (or have invalid ones). Safe to call any time. */
  DG.seedMoves = function () {
    const p = DG.pet(); if (!p) return;
    const st = DG.state, starters = DG.TAP_STARTERS[p.type] || DG.TAP_STARTERS.bao;
    if (!st.moves || typeof st.moves !== 'object') st.moves = {};
    const m = st.moves;
    m.owned = Array.isArray(m.owned) ? m.owned.filter((id) => DG.TAP_MOVES[id]) : [];
    starters.forEach((id) => { if (!m.owned.includes(id)) m.owned.push(id); });
    m.owned = [...new Set(m.owned)];
    const eq = Array.isArray(m.equipped) ? m.equipped.filter((id) => m.owned.includes(id) && DG.canUseMove(id).ok) : [];
    m.equipped = [...new Set(eq)].slice(0, 2);
    for (const id of starters) if (m.equipped.length < 2 && !m.equipped.includes(id)) m.equipped.push(id);
  };
  /** Can this dumpling use (or buy) a move right now? {ok, why} */
  DG.canUseMove = function (id) {
    const mv = DG.TAP_MOVES[id], p = DG.pet();
    if (!mv || !p) return { ok: false, why: 'Unknown move' };
    if (mv.species && mv.species !== p.type) return { ok: false, why: `${DG.STARTERS[mv.species].name} only` };
    if (DG.realStageIndex() < mv.minStage) return { ok: false, why: `Unlocks at ${DG.STAGES[mv.minStage].name} stage` };
    return { ok: true };
  };
  DG.buyMove = function (id) {
    const mv = DG.TAP_MOVES[id], m = DG.state.moves;
    if (!mv) return { ok: false, why: 'Unknown move' };
    if (m.owned.includes(id)) return { ok: false, why: 'Already yours' };
    const can = DG.canUseMove(id); if (!can.ok) return can;
    if (!DG.spend(mv.price)) return { ok: false, why: `Needs ${mv.price} coins` };
    m.owned.push(id); DG.save(); return { ok: true };
  };
  /** Put a move in slot 0 or 1. If it's already in the other slot, the two swap so they stay different. */
  DG.equipMove = function (slot, id) {
    const m = DG.state.moves;
    if (slot !== 0 && slot !== 1) return { ok: false, why: 'Bad slot' };
    if (!m.owned.includes(id)) return { ok: false, why: 'Not owned' };
    const can = DG.canUseMove(id); if (!can.ok) return can;
    const other = 1 - slot;
    if (m.equipped[other] === id) m.equipped[other] = m.equipped[slot];
    m.equipped[slot] = id;
    if (m.equipped[0] === m.equipped[1]) return { ok: false, why: 'Pick two different moves' };
    DG.save(); return { ok: true };
  };

  DG.adopt = function (type, name, accessory, look) {
    const st = DG.STARTERS[type];
    const now = DG.now();
    const favs = ['veg', 'tofu', 'noodle', 'broth', 'peach'];
    DG.state.pet = {
      type, name: (name || st.name).trim().slice(0, 14) || st.name, accessory: accessory || null,
      adoptedAt: now, lastUpdate: now, growMs: 0,
      look: Object.assign({ color: 'classic', eyes: 'round', cheeks: 'blush' }, look || {}),
      nightAwake: false, autoSlept: false,
      stats: Object.assign({}, st.base),
      needs: { fullness: 80, happiness: 85, energy: 90, cleanliness: 85 },
      favoriteFood: favs[Math.floor(Math.random() * favs.length)], favoriteKnown: false,
      foodBonus: null, trait: null, lastStageSeen: 0, asleep: false,
      care: { pets: 0, plays: 0, meals: 0, baths: 0, trains: 0 },
    };
    if (accessory && !DG.state.inventory.accessories.includes(accessory)) DG.state.inventory.accessories.push(accessory);
    DG.state.moves = {}; DG.seedMoves(); // a new dumpling starts with its own species' two specials
    DG.state.lastSeen = now;
    DG.save();
  };

  /* ---------- Growth ---------- */
  // ageMs = real time since adoption (shown as "X days old")
  // growMs = growth time, which pauses while any need is below DG.GROWTH_FREEZE
  DG.ageMs = () => Math.max(0, DG.now() - DG.pet().adoptedAt);
  DG.growMs = () => Math.max(0, DG.pet().growMs || 0);
  DG.stageForAge = function (ms) {
    let i = 0;
    DG.STAGES.forEach((s, j) => { if (ms >= s.at) i = j; });
    return i;
  };
  DG.realStageIndex = () => DG.stageForAge(DG.growMs());
  DG.stageIndex = () => (DG.devPreviewStage != null ? DG.devPreviewStage : DG.realStageIndex());
  DG.stage = () => DG.STAGES[DG.stageIndex()];
  DG.nextStage = function () {
    const i = DG.realStageIndex();
    if (i >= DG.STAGES.length - 1) return null;
    const nx = DG.STAGES[i + 1];
    return { stage: nx, index: i + 1, msLeft: nx.at - DG.growMs() };
  };
  /** Needs that are currently low enough to pause growth. */
  /** Milliseconds left on a butter freeze (0 when none). */
  DG.butterLeft = function () { const p = DG.pet(); return p && p.frozenUntil ? Math.max(0, p.frozenUntil - DG.now()) : 0; };
  DG.frozenNeeds = function () {
    const n = DG.pet().needs;
    return Object.keys(n).filter((k) => n[k] < DG.GROWTH_FREEZE);
  };
  DG.NEED_NAMES = { fullness: 'Fullness', happiness: 'Happiness', energy: 'Energy', cleanliness: 'Cleanliness' };
  DG.fmtDuration = function (ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
      m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
  };
  DG.fmtAge = function (ms) {
    const h = Math.floor(ms / 3600e3), d = Math.floor(h / 24);
    if (d >= 1) return `${d} day${d > 1 ? 's' : ''} ${h % 24}h old`;
    if (h >= 1) return `${h} hour${h > 1 ? 's' : ''} old`;
    return `${Math.max(1, Math.floor(ms / 60e3))} min old`;
  };

  /* ---------- Needs ---------- */
  DG.clampNeeds = function () {
    const n = DG.pet().needs;
    for (const k in n) n[k] = Math.max(0, Math.min(100, n[k]));
  };
  DG.addNeeds = function (delta) {
    const n = DG.pet().needs;
    for (const k in delta) n[k] = (n[k] || 0) + delta[k];
    DG.clampNeeds();
  };
  /** Advance needs to `now`. Returns info about time away when the gap counts as offline. */
  DG.updateNeeds = function (now) {
    const p = DG.pet(); if (!p) return null;
    now = now || DG.now();
    const gap = now - p.lastUpdate;
    if (gap <= 0) { p.lastUpdate = now; return null; }
    const offline = gap > OFFLINE_THRESHOLD;
    const hours = (offline ? Math.min(gap, OFFLINE_DECAY_CAP_H * DG.HOUR) : gap) / DG.HOUR;
    const n = p.needs;
    const before = Object.assign({}, n);
    const nightNow = DG.isNight(now);
    // being away over night means the dumpling put itself to bed
    if (offline && nightNow && !p.asleep) { p.asleep = true; p.autoSlept = true; p.nightAwake = false; }
    const awakeAtNight = !p.asleep && nightNow && !offline;
    // butter freezes every need: no loss for the part of this gap before p.frozenUntil
    const frozenK = p.frozenUntil > p.lastUpdate ? Math.min(1, (Math.min(now, p.frozenUntil) - p.lastUpdate) / gap) : 0, live = 1 - frozenK;
    const rates = {
      fullness: RATES.fullness * (p.asleep ? 0.5 : 1) * live, happiness: RATES.happiness * live, cleanliness: RATES.cleanliness * live,
      energy: p.asleep ? -SLEEP_REFILL : (awakeAtNight ? NIGHT_AWAKE_DRAIN : RATES.energy) * live,
    };

    // Growth: counts only while every need stays at or above the freeze line.
    // Work out how long until the first need would cross it during this gap.
    const F = DG.GROWTH_FREEZE;
    let growH = gap / DG.HOUR;
    for (const k in n) {
      if (before[k] < F) { growH = 0; break; }
      const r = rates[k];
      const floor = offline ? Math.min(OFFLINE_FLOOR, before[k]) : 0;
      if (r > 0 && floor < F) {
        const hoursToFreeze = (before[k] - F) / r;
        // offline decay stops after OFFLINE_DECAY_CAP_H, so needs can't cross after that
        if (!offline || hoursToFreeze < OFFLINE_DECAY_CAP_H) growH = Math.min(growH, hoursToFreeze);
      }
    }
    p.growMs = (p.growMs || 0) + Math.max(0, growH) * DG.HOUR;

    const dec = (k, amt) => {
      const floor = offline ? Math.min(OFFLINE_FLOOR, before[k]) : 0;
      n[k] = Math.max(floor, n[k] - amt);
    };
    dec('fullness', rates.fullness * hours);
    dec('happiness', rates.happiness * hours);
    dec('cleanliness', rates.cleanliness * hours);
    let wokeUp = null;
    if (p.asleep) {
      n.energy = Math.min(100, n.energy + SLEEP_REFILL * hours);
      if (!nightNow && (p.autoSlept || n.energy >= 100)) { p.asleep = false; p.autoSlept = false; wokeUp = 'morning'; }
    } else dec('energy', rates.energy * hours);
    if (!nightNow) p.nightAwake = false;
    DG.clampNeeds();
    p.lastUpdate = now;
    if (wokeUp) p._justWoke = wokeUp;
    return offline ? { gap, before, after: Object.assign({}, n) } : null;
  };

  /** Put the dumpling to bed automatically at night (unless the player woke it up). */
  DG.nightCheck = function () {
    const p = DG.pet(); if (!p) return false;
    if (DG.isNight() && !p.asleep && !p.nightAwake) { p.asleep = true; p.autoSlept = true; return true; }
    return false;
  };

  DG.mood = function () {
    const p = DG.pet(), n = p.needs;
    if (p.asleep) return 'sleeping';
    if (n.energy < 22) return 'sleepy';
    if (n.fullness < 22) return 'grumpy';
    if (n.happiness < 25) return 'sad';
    const avg = (n.fullness + n.happiness + n.energy + n.cleanliness) / 4;
    if (avg > 78) return 'joy';
    return 'happy';
  };
  DG.cozy = function () {
    const n = DG.pet().needs;
    return (n.fullness + n.happiness + n.energy + n.cleanliness) / 4 >= 70;
  };
  DG.personality = function () {
    const c = DG.pet().care;
    const map = [['pets', 'Cuddly'], ['plays', 'Playful'], ['meals', 'Foodie'], ['baths', 'Tidy'], ['trains', 'Sporty']];
    let best = null, bv = 2;
    map.forEach(([k, label]) => { if ((c[k] || 0) > bv) { bv = c[k]; best = label; } });
    const base = { bao: 'Cheerful', gyoza: 'Mischievous', soup: 'Sleepy' }[DG.pet().type];
    return best ? `${base} & ${best}` : base;
  };

  /* ---------- Coins / achievements ---------- */
  DG.addCoins = function (n) { DG.state.coins += Math.max(0, Math.round(n)); };
  DG.spend = function (n) {
    if (DG.state.coins < n) return false;
    DG.state.coins -= n; DG.state.counters.spent += n; return true;
  };
  /** Care-challenge coins are capped per day so the free care loop can't be farmed forever. */
  DG.careCoins = function (n) {
    const d = DG.state.daily;
    if (d.date !== today()) { d.date = today(); d.care = 0; }
    const give = Math.max(0, Math.min(n, 30 - d.care));
    d.care += give; DG.addCoins(give);
    return give;
  };
  DG.unlock = function (id) {
    if (DG.state.achievements[id]) return false;
    const a = DG.ACHIEVEMENTS[id]; if (!a) return false;
    DG.state.achievements[id] = DG.now();
    DG.addCoins(a.coins);
    if (DG.ui) DG.ui.toast(`${a.icon} Achievement: <b>${a.name}</b> · +${a.coins} 🪙`, 'gold');
    if (DG.audio) DG.audio.play('fanfare');
    DG.save();
    return true;
  };

  /* ---------- Stats & training ---------- */
  DG.statCap = (stageIdx) => DG.STAGES[stageIdx == null ? DG.stageIndex() : stageIdx].cap;
  DG.trained = (k) => DG.pet().stats[k] - DG.STARTERS[DG.pet().type].base[k];
  /** tier: 0 participated, 1 good, 2 great. diff: 0 easy, 1 medium, 2 hard */
  DG.applyTraining = function (stat, tier, diff) {
    const p = DG.pet();
    const cap = DG.statCap();
    const before = p.stats[stat];
    const base = [1, 2, 3.5][tier] * [1, 1.4, 1.8][diff];
    const ratio = before / cap;
    const factor = Math.max(0.3, 1 - ratio * ratio);
    let after = Math.min(cap, before + base * factor);
    after = Math.round(after * 10) / 10;
    if (after < before) after = before;
    p.stats[stat] = after;
    const coins = Math.round([3, 5, 8][tier] * [1, 1.3, 1.6][diff]);
    DG.addCoins(coins);
    return { before, after, gain: Math.round((after - before) * 10) / 10, coins, capped: after >= cap, cap };
  };

  /* ---------- Battle numbers (shared by player & opponents) ---------- */
  DG.battleStats = function (st, bonusType, cozy) {
    return {
      maxHp: Math.round(100 + st.defense * 0.7 + st.stamina * 0.5),
      maxSta: Math.round((80 + st.stamina * 0.9) * (bonusType === 'stamina' ? 1.2 : 1)),
      staRegen: 16 + st.stamina * 0.18,
      dmg: (7 + st.strength * 0.16) * (bonusType === 'strength' ? 1.1 : 1),
      speed: 3.4 + st.agility * 0.035,
      dodgeCost: Math.max(15, 26 - st.agility * 0.1),
      blockRed: Math.min(0.85, 0.55 + st.defense * 0.004),
      charge: (4 + st.focus * 0.09) * (cozy ? 1.1 : 1) * (bonusType === 'charge' ? 1.15 : 1),
    };
  };

  /* ---------- Large-stage trait ---------- */
  DG.traitCandidates = function () {
    const ks = ['strength', 'agility', 'defense'];
    const vals = ks.map((k) => Math.round(DG.trained(k) * 10) / 10);
    const mx = Math.max(...vals);
    return ks.filter((k, i) => vals[i] === mx);
  };
})(window.DG);
