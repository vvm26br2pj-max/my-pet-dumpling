/* My Pet Dumpling — shared UI helpers: screens, modals, toasts */
(function (DG) {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const screens = {};
  let current = null;

  DG.ui = {
    $, esc,
    register(id, handlers) { screens[id] = handlers; },
    current: () => current,
    show(id, arg) {
      if (current && screens[current] && screens[current].exit) screens[current].exit();
      document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== 'screen-' + id));
      current = id;
      const scr = document.getElementById('screen-' + id); // a soft fade-in instead of a hard cut
      if (scr) { scr.classList.remove('scr-in'); void scr.offsetWidth; scr.classList.add('scr-in'); }
      if (screens[id] && screens[id].enter) screens[id].enter(arg);
      window.scrollTo(0, 0);
    },

    toast(html, kind) {
      const el = document.createElement('div');
      el.className = 'toast ' + (kind || '');
      el.innerHTML = html;
      $('#toasts').appendChild(el);
      setTimeout(() => el.classList.add('out'), 2800);
      setTimeout(() => el.remove(), 3300);
    },

    /** opts: {title, html, buttons:[{label, cls, onClick, keep}], onOpen(el), dismissable, wide, cls} */
    modal(opts) {
      const root = $('#modal-root');
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      wrap.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''} ${opts.cls || ''}" role="dialog" aria-modal="true">
        ${opts.title ? `<h2 class="modal-title">${opts.title}</h2>` : ''}
        ${opts.dismissable !== false ? '<button class="modal-x" aria-label="Close">✕</button>' : ''}
        <div class="modal-body">${opts.html || ''}</div>
        <div class="modal-btns"></div></div>`;
      const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 220); if (opts.onClose) opts.onClose(); };
      const btns = wrap.querySelector('.modal-btns');
      (opts.buttons || []).forEach((b) => {
        const be = document.createElement('button');
        be.className = 'btn ' + (b.cls || '');
        be.innerHTML = b.label;
        be.onclick = () => { DG.audio.play('click'); if (b.onClick) b.onClick(close); if (!b.keep) close(); };
        btns.appendChild(be);
      });
      if (!btns.children.length) btns.remove();
      const x = wrap.querySelector('.modal-x');
      if (x) x.onclick = () => { DG.audio.play('click'); close(); };
      if (opts.dismissable !== false) wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
      root.appendChild(wrap);
      if (opts.onOpen) opts.onOpen(wrap.querySelector('.modal'), close);
      return close;
    },
    anyModal: () => !!$('#modal-root').children.length,

    bar(value, max, color, label) {
      const pct = Math.max(0, Math.min(100, (value / max) * 100));
      return `<div class="bar" ${label ? `aria-label="${esc(label)}"` : ''}><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
    },
    needColor(v) { return v < 25 ? '#ff8a80' : v < 50 ? '#ffc75a' : '#7fd8a6'; },

    /** Keep a canvas crisp: sets backing size from CSS size; returns scale from logical to device px. */
    fitCanvas(canvas, logicalW, logicalH) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth || logicalW;
      const h = (w * logicalH) / logicalW;
      canvas.style.height = h + 'px';
      const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      return bw / logicalW;
    },
    toLogical(canvas, e, logicalW) {
      const r = canvas.getBoundingClientRect();
      const k = logicalW / r.width;
      return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
    },
    /** Small animated dumpling preview loop on a canvas. Returns a stop() function. */
    previewLoop(canvas, getOpts, W, H) {
      W = W || 240; H = H || 200;
      const ctx = canvas.getContext('2d');
      let raf = 0, t0 = performance.now();
      const frame = (now) => {
        if (!canvas.isConnected) return;
        const t = (now - t0) / 1000;
        const k = DG.ui.fitCanvas(canvas, W, H);
        ctx.setTransform(k, 0, 0, k, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const o = getOpts(t);
        DG.draw.dumpling(ctx, Object.assign({ x: W / 2, y: H - 22, size: Math.min(W, H) * 0.55, t }, o));
        if (o.after) o.after(ctx, t);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    },
    isTouch() {
      const s = DG.state && DG.state.settings.touch;
      if (s === 'on') return true;
      if (s === 'off') return false;
      return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    },
  };
})(window.DG);
