/* My Pet Dumpling — tiny synthesized sound effects and music (no audio files needed) */
(function (DG) {
  let ctx = null, master, sfxGain, musicGain, musicTimer = null, step = 0, nextTime = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.12; musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo, delay, dest, at) {
    const t0 = (at != null ? at : ctx.currentTime) + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, freq, delay) {
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1000; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(sfxGain); src.start(t0);
  }

  const SFX = {
    squeak() { tone(880, 0.12, 'sine', 0.22, 1500); tone(1300, 0.1, 'sine', 0.14, 1900, 0.09); },
    babysqueak() { tone(1300, 0.1, 'sine', 0.2, 2200); tone(1800, 0.08, 'sine', 0.12, 2400, 0.08); },
    boing() { tone(200, 0.28, 'triangle', 0.25, 560); },
    munch() { for (let i = 0; i < 3; i++) noise(0.07, 0.3, 1400, i * 0.14); },
    pop() { tone(500, 0.07, 'sine', 0.2, 1100); },
    coin() { tone(988, 0.08, 'square', 0.08); tone(1319, 0.18, 'square', 0.08, null, 0.08); },
    hit() { noise(0.12, 0.35, 700); tone(180, 0.14, 'triangle', 0.25, 90); },
    block() { tone(320, 0.1, 'square', 0.1, 220); noise(0.05, 0.15, 3000); },
    whoosh() { noise(0.22, 0.2, 2400); },
    bad() { tone(330, 0.22, 'triangle', 0.2, 180); },
    good() { tone(660, 0.08, 'sine', 0.18); tone(990, 0.12, 'sine', 0.16, null, 0.07); },
    perfect() { tone(784, 0.07, 'sine', 0.18); tone(1046, 0.07, 'sine', 0.18, null, 0.06); tone(1568, 0.15, 'sine', 0.14, null, 0.12); },
    jump() { tone(380, 0.14, 'square', 0.06, 760); },
    splash() { noise(0.3, 0.2, 1700); },
    snore() { tone(140, 0.7, 'sine', 0.08, 100); },
    click() { tone(720, 0.04, 'sine', 0.08); },
    hiccup() { tone(600, 0.06, 'sine', 0.2, 1000); },
    steam() { noise(0.5, 0.18, 4000); },
    special() { tone(300, 0.35, 'sawtooth', 0.08, 900); noise(0.35, 0.15, 2000); },
    cheer() { noise(0.9, 0.12, 2600); noise(0.6, 0.08, 1500, 0.15); },
    fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.15, null, i * 0.11)); },
    levelup() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, null, i * 0.12)); tone(1568, 0.6, 'sine', 0.1, null, 0.6); },
    sad() { [392, 349, 311].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, null, i * 0.18)); },
    thud() { tone(120, 0.25, 'sine', 0.35, 60); noise(0.2, 0.2, 300); },
    drum() { tone(160, 0.18, 'sine', 0.4, 70); noise(0.08, 0.2, 900); },
    charge() { tone(220, 0.6, 'sawtooth', 0.06, 880); },
    parry() { tone(1400, 0.06, 'square', 0.1); tone(2100, 0.3, 'sine', 0.16, null, 0.04); noise(0.08, 0.2, 5000); },
    crit() { noise(0.16, 0.45, 900); tone(240, 0.2, 'square', 0.18, 70); tone(1200, 0.1, 'sine', 0.12, null, 0.03); },
    stack() { tone(520, 0.06, 'square', 0.08, 420); tone(900, 0.05, 'sine', 0.08, null, 0.02); },
  };

  /* ---------- Music: one looping track at a time ---------- */
  // mel/bass are MIDI note numbers (0 = rest). bassEvery = steps per bass note.
  // drums: k = kick, s = snare, h = hi-hat; each is a function of the step number.
  const TRACKS = {
    home: { beat: 0.26, melType: 'triangle', melVol: 0.5, bassEvery: 4,
      mel: [72, 76, 79, 76, 74, 72, 69, 72, 74, 76, 79, 81, 79, 76, 74, 0, 72, 74, 76, 79, 76, 74, 72, 69, 67, 69, 72, 74, 72, 0, 0, 0],
      bass: [48, 48, 55, 55, 53, 53, 50, 55] },
    night: { beat: 0.42, melType: 'sine', melVol: 0.45, melLen: 1.6, bassEvery: 8,
      mel: [69, 0, 73, 0, 76, 0, 73, 0, 71, 0, 74, 0, 78, 0, 74, 0, 69, 0, 73, 0, 76, 0, 81, 0, 80, 0, 76, 0, 73, 0, 0, 0],
      bass: [45, 52, 50, 52] },
    jumprope: { beat: 0.15, melType: 'square', melVol: 0.22, melLen: 0.7, bassEvery: 4, bassType: 'triangle',
      mel: [72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 77, 0, 81, 0, 77, 0, 72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 74, 0, 0, 0],
      bass: [48, 55, 48, 55, 50, 57, 43, 55], drums: { k: (i) => i % 8 === 0, s: (i) => i % 8 === 4, h: (i) => i % 2 === 1 } },
    hurdles: { beat: 0.13, melType: 'triangle', melVol: 0.5, melLen: 0.9, bassEvery: 6,
      mel: [67, 0, 71, 74, 0, 71, 72, 0, 76, 79, 0, 76, 74, 0, 78, 81, 0, 78, 79, 0, 74, 71, 0, 0],
      bass: [43, 43, 48, 50], drums: { k: (i) => i % 6 === 0, h: (i) => i % 3 === 0, s: (i) => i % 12 === 9 } },
    ricesack: { beat: 0.2, melType: 'sawtooth', melVol: 0.16, melLen: 0.8, bassEvery: 4, bassType: 'triangle',
      mel: [57, 0, 57, 60, 64, 0, 62, 0, 60, 0, 60, 62, 64, 0, 0, 0, 57, 0, 57, 60, 64, 0, 67, 0, 65, 0, 64, 62, 60, 0, 0, 0],
      bass: [33, 33, 36, 38, 33, 33, 40, 38], drums: { k: (i) => i % 4 === 0 || i % 16 === 14, s: (i) => i % 8 === 4 } },
    peadodge: { beat: 0.17, melType: 'triangle', melVol: 0.5, melLen: 0.35, bassEvery: 2, bassLen: 0.5,
      mel: [62, 0, 65, 0, 69, 0, 68, 0, 67, 0, 65, 0, 64, 0, 0, 0, 62, 0, 65, 0, 69, 0, 72, 0, 70, 0, 69, 0, 67, 0, 0, 0],
      bass: [38, 45, 38, 45, 43, 46, 43, 46, 38, 45, 38, 45, 46, 45, 43, 41], drums: { h: (i) => i % 2 === 0, k: (i) => i % 16 === 0 } },
    balance: { beat: 0.38, melType: 'sine', melVol: 0.5, melLen: 2.4, bassEvery: 8,
      mel: [77, 0, 81, 0, 84, 0, 81, 0, 79, 0, 0, 0, 76, 0, 0, 0, 77, 0, 81, 0, 86, 0, 84, 0, 81, 0, 0, 0, 0, 0, 0, 0],
      bass: [41, 48, 46, 43] },
    battle: { beat: 0.14, melType: 'square', melVol: 0.2, melLen: 0.85, bassEvery: 2, bassType: 'sawtooth', bassVol: 0.25, bassLen: 0.9,
      mel: [64, 0, 67, 64, 71, 0, 69, 67, 66, 0, 67, 69, 71, 0, 0, 0, 64, 0, 67, 64, 72, 0, 71, 69, 67, 0, 66, 0, 64, 0, 0, 0],
      bass: [40, 40, 40, 40, 43, 43, 45, 45, 36, 36, 38, 38, 40, 40, 47, 47], drums: { k: (i) => i % 4 === 0, s: (i) => i % 8 === 4, h: (i) => i % 2 === 1 } },
    walk: { beat: 0.22, melType: 'triangle', melVol: 0.5, bassEvery: 4,
      mel: [76, 0, 79, 81, 79, 0, 76, 0, 74, 0, 76, 79, 76, 0, 72, 0, 74, 0, 76, 77, 79, 0, 81, 0, 79, 0, 76, 0, 72, 0, 0, 0],
      bass: [48, 52, 53, 55, 48, 52, 55, 48], drums: { h: (i) => i % 4 === 2, k: (i) => i % 8 === 0 } },
  };
  let track = 'home';
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function drum(kind, at) {
    if (kind === 'k') tone(130, 0.16, 'sine', 0.7, 45, 0, musicGain, at);
    else {
      const dur = kind === 's' ? 0.12 : 0.03;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = kind === 's' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 's' ? 1800 : 7000;
      const g = ctx.createGain(); g.gain.value = kind === 's' ? 0.45 : 0.25;
      src.connect(f); f.connect(g); g.connect(musicGain); src.start(at);
    }
  }
  function scheduler() {
    if (!ctx) return;
    const tr = TRACKS[track] || TRACKS.home, beat = tr.beat;
    while (nextTime < ctx.currentTime + 0.4) {
      const m = tr.mel[step % tr.mel.length];
      if (m) tone(mtof(m), beat * (tr.melLen || 0.9), tr.melType, tr.melVol, null, 0, musicGain, nextTime);
      if (step % tr.bassEvery === 0) {
        const b = tr.bass[(step / tr.bassEvery) % tr.bass.length];
        if (b) tone(mtof(b), beat * tr.bassEvery * (tr.bassLen || 0.9), tr.bassType || 'sine', tr.bassVol || 0.55, null, 0, musicGain, nextTime);
      }
      if (tr.drums) for (const k in tr.drums) if (tr.drums[k](step)) drum(k, nextTime);
      nextTime += beat; step++;
    }
  }

  DG.audio = {
    play(name) {
      if (!DG.state || !DG.state.settings.sound) return;
      if (!ensure()) return;
      try { SFX[name] && SFX[name](); } catch (e) {}
    },
    syncMusic() {
      const want = DG.state && DG.state.settings.music;
      if (want && !musicTimer) {
        if (!ensure()) return;
        nextTime = ctx.currentTime + 0.1;
        musicTimer = setInterval(scheduler, 150);
      } else if (!want && musicTimer) {
        clearInterval(musicTimer); musicTimer = null;
      }
    },
    unlock() { ensure(); DG.audio.syncMusic(); },
    /** Switch the background music (home, night, jumprope, hurdles, ricesack, peadodge, balance, battle, walk). */
    setTrack(name) {
      if (!TRACKS[name]) name = 'home';
      if (name === track) return;
      track = name; step = 0;
      if (ctx) nextTime = ctx.currentTime + 0.15;
    },
    homeTrack() { DG.audio.setTrack(DG.isNight && DG.isNight() ? 'night' : 'home'); },
    track: () => track,
  };
})(window.DG);
