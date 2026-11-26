/* My Pet Dumpling — boot, ticking clock, autosave */
(function (DG) {
  let saveAcc = 0;

  function checkAway() {
    const p = DG.pet(); if (!p) return null;
    const wasAsleep = p.asleep;
    const stageBefore = DG.realStageIndex();
    const info = DG.updateNeeds();
    if (info) { info.stageBefore = stageBefore; info.wokeUp = wasAsleep && !p.asleep; info.nightSleep = p.asleep && DG.isNight(); DG.save(); }
    return info;
  }

  function tick() {
    const p = DG.pet(); if (!p) return;
    const info = checkAway();
    const onHome = DG.ui.current() === 'home';
    if (info && onHome && !DG.ui.anyModal()) { DG._holdMilestones = true; DG.Menus.welcomeBack(info); }
    // bedtime: at night the dumpling heads to bed by itself (only while you're on the home screen)
    if (onHome && DG.Home && !DG.Home.isBusy() && DG.nightCheck()) DG.Home.bedtime();
    if (onHome && !DG._holdMilestones) DG.Menus.checkMilestones();
    if (++saveAcc >= 5) { saveAcc = 0; DG.save(); }
  }

  function boot() {
    DG.load();
    document.body.classList.toggle('big-text', !!DG.state.settings.bigText);
    if (DG.pet()) {
      const info = checkAway();
      if (!info) DG.nightCheck();
      DG.save();
      if (info) DG._holdMilestones = true;
      DG.ui.show('home');
      if (info) DG.Menus.welcomeBack(info);
    } else DG.ui.show('adopt');

    setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) DG.save(); else tick(); });
    window.addEventListener('pagehide', () => DG.save());
    window.addEventListener('beforeunload', () => DG.save());
    const unlock = () => DG.audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchend', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') { e.preventDefault(); DG.Menus.devPanel(); }
    });
    if (/[?&]dev=1/.test(location.search)) DG.Menus.devPanel();
    // iPhone: stop double-tap zoom and pinch zoom from fighting with the game
    document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    const setVh = () => document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
    setVh(); window.addEventListener('resize', setVh);
    if (DG.ui.isTouch()) document.body.classList.add('touch');
  }

  // the welcome-back modal releases the milestone hold when closed
  const origWelcome = () => DG.Menus.welcomeBack;
  document.addEventListener('DOMContentLoaded', () => {
    const wb = origWelcome();
    DG.Menus.welcomeBack = function (info) {
      DG._holdMilestones = true;
      wb(info);
      const obs = setInterval(() => { if (!DG.ui.anyModal()) { DG._holdMilestones = false; clearInterval(obs); DG.Menus.checkMilestones(); } }, 300);
    };
    boot();
  });
})(window.DG);
