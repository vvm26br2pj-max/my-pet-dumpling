/* My Pet Dumpling — 2D canvas art: dumplings, accessories, room */
(function (DG) {
  const TAU = Math.PI * 2;
  const GEO = {
    bao:   { top: -1.36, eyeY: -0.64, eyeDX: 0.37, mid: -0.64 },
    gyoza: { top: -0.9, eyeY: -0.47, eyeDX: 0.34, mid: -0.45 },
    soup:  { top: -1.32, eyeY: -0.6, eyeDX: 0.31, mid: -0.66 },
  };
  DG.GEO = GEO;

  function bodyPath(ctx, type, u) {
    ctx.beginPath();
    if (type === 'bao') {
      ctx.moveTo(-0.88 * u, -0.08 * u);
      ctx.bezierCurveTo(-1.1 * u, -0.55 * u, -0.98 * u, -1.2 * u, -0.42 * u, -1.3 * u);
      ctx.bezierCurveTo(-0.2 * u, -1.34 * u, 0.2 * u, -1.34 * u, 0.42 * u, -1.3 * u);
      ctx.bezierCurveTo(0.98 * u, -1.2 * u, 1.1 * u, -0.55 * u, 0.88 * u, -0.08 * u);
      ctx.bezierCurveTo(0.66 * u, 0.08 * u, -0.66 * u, 0.08 * u, -0.88 * u, -0.08 * u);
    } else if (type === 'gyoza') {
      ctx.moveTo(-1.15 * u, -0.45 * u);
      ctx.bezierCurveTo(-0.9 * u, 0.12 * u, 0.9 * u, 0.12 * u, 1.15 * u, -0.45 * u);
      ctx.bezierCurveTo(0.85 * u, -1.05 * u, -0.85 * u, -1.05 * u, -1.15 * u, -0.45 * u);
    } else { // shumai: a plump little cup with a frilly, open top
      ctx.moveTo(-0.8 * u, -0.1 * u);
      ctx.bezierCurveTo(-0.92 * u, -0.45 * u, -0.84 * u, -0.9 * u, -0.78 * u, -1.14 * u);
      shumaiRim(ctx, u, Math.PI, 0); // back of the rim, left to right
      ctx.bezierCurveTo(0.84 * u, -0.9 * u, 0.92 * u, -0.45 * u, 0.8 * u, -0.1 * u);
      ctx.bezierCurveTo(0.58 * u, 0.07 * u, -0.58 * u, 0.07 * u, -0.8 * u, -0.1 * u);
    }
    ctx.closePath();
  }
  /** Frilly scalloped edge along the shumai's rim ellipse, from angle a0 to a1 (lineTo-style, path must be open). */
  const RIM = { cy: -1.14, rx: 0.78, ry: 0.19, n: 13, bump: 0.055 };
  function shumaiRim(ctx, u, a0, a1) {
    const steps = RIM.n, pt = (a, out) => [Math.cos(a) * (RIM.rx + out) * u, (RIM.cy - Math.sin(a) * (RIM.ry + out * 0.5)) * u];
    for (let k = 0; k < steps; k++) {
      const t0 = a0 + (a1 - a0) * k / steps, t1 = a0 + (a1 - a0) * (k + 1) / steps, tm = (t0 + t1) / 2;
      const [mx, my] = pt(tm, RIM.bump), [ex, ey] = pt(t1, 0);
      ctx.quadraticCurveTo(mx + (mx - (pt(t0, 0)[0] + ex) / 2) * 0.6, my - Math.abs(Math.sin(tm)) * RIM.bump * u * 0.6, ex, ey);
    }
  }
  function bez(t, a, b, c, d) { const m = 1 - t; return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d; }

  /* ---------- Color helpers (anime cel palette) ---------- */
  const INK = '#3a2418';
  function hexRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbHex(r, g, b) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  /** k < 1 darkens, k > 1 mixes toward white (2 = white). */
  function shade(h, k) {
    const [r, g, b] = hexRgb(h);
    return k <= 1 ? rgbHex(r * k, g * k, b * k) : rgbHex(r + (255 - r) * (k - 1), g + (255 - g) * (k - 1), b + (255 - b) * (k - 1));
  }
  function mix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); }
  function colorsFromHex(n) {
    const h = typeof n === 'number' ? '#' + n.toString(16).padStart(6, '0') : n;
    return { base: h, light: shade(h, 1.6), line: shade(h, 0.72) };
  }

  /**
   * Draw a dumpling. (x,y) is the bottom-center.
   * o: {type,size,t,mood,colors,squash,hop,rot,flip,accessory,trait,stage,blink,look,dirt,bubbles,shadow,glow}
   */
  function dumpling(ctx, o) {
    const type = o.type || 'bao';
    const u = o.size / 2, g = GEO[type], t = o.t || 0;
    const col = o.colors || DG.lookColors(type, o.look);
    o._col = col;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.shadow !== false) {
      const k = 1 - Math.min(0.5, (o.hop || 0) / (u * 5));
      ctx.fillStyle = 'rgba(90,55,30,0.16)';
      ctx.beginPath(); ctx.ellipse(0, 0.03 * u, u * 1.05 * k, u * 0.17 * k, 0, 0, TAU); ctx.fill();
    }
    ctx.translate(0, -(o.hop || 0));
    if (o.rot) { ctx.translate(0, g.mid * u); ctx.rotate(o.rot); ctx.translate(0, -g.mid * u); }
    const sq = o.squash || 0;
    ctx.scale((1 + sq) * (o.flip ? -1 : 1), 1 - sq);

    if (o.glow) {
      ctx.save(); ctx.shadowColor = o.glow; ctx.shadowBlur = u * 0.6;
      bodyPath(ctx, type, u); ctx.fillStyle = o.glow; ctx.fill(); ctx.restore();
    }
    const isBao = type === 'bao';
    const ol = isBao ? mix(col.line, '#6a3c14', 0.5) : col.line;
    if (isBao) baoFeet(ctx, u, col, ol);
    // body
    bodyPath(ctx, type, u);
    const grad = ctx.createRadialGradient(-0.35 * u, (g.mid - 0.3) * u, 0.1 * u, 0, g.mid * u, 1.35 * u);
    if (isBao) {
      grad.addColorStop(0, mix(col.light, '#ffffff', 0.6)); grad.addColorStop(0.45, mix(col.light, col.base, 0.45));
      grad.addColorStop(0.8, col.base); grad.addColorStop(1, mix(col.base, '#e2a85a', 0.35));
    } else { grad.addColorStop(0, col.light); grad.addColorStop(1, col.base); }
    ctx.fillStyle = grad; ctx.fill();

    // clipped details
    ctx.save(); bodyPath(ctx, type, u); ctx.clip();
    if (isBao) baoShading(ctx, u, col);
    if (type === 'gyoza') {
      const cg = ctx.createLinearGradient(0, -0.3 * u, 0, 0.1 * u);
      cg.addColorStop(0, 'rgba(214,150,70,0)'); cg.addColorStop(0.5, 'rgba(214,150,70,0.55)'); cg.addColorStop(1, 'rgba(170,105,40,0.85)');
      ctx.fillStyle = cg; ctx.fillRect(-1.3 * u, -0.35 * u, 2.6 * u, 0.5 * u);
    }
    if (type === 'soup') { // soft warm shading low on the cup
      const bg = ctx.createLinearGradient(0, -0.4 * u, 0, 0.05 * u);
      bg.addColorStop(0, 'rgba(220,170,120,0)'); bg.addColorStop(1, 'rgba(200,150,100,0.25)');
      ctx.fillStyle = bg; ctx.fillRect(-u * 1.2, -u * 0.45, u * 2.4, u * 0.6);
    }
    if (o.trait === 'defense') drawVest(ctx, u, type);
    if (o.dirt) o.dirt.forEach((d) => {
      if (d.a <= 0.02) return;
      ctx.fillStyle = `rgba(120,85,50,${0.55 * d.a})`;
      ctx.beginPath(); ctx.ellipse(d.x * u, d.y * u, d.r * u, d.r * u * 0.8, d.x, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(120,85,50,${0.35 * d.a})`;
      ctx.beginPath(); ctx.arc((d.x + d.r * 0.9) * u, (d.y - d.r * 0.5) * u, d.r * 0.35 * u, 0, TAU); ctx.fill();
    });
    ctx.restore();

    ctx.lineWidth = Math.max(1.5, 0.05 * u); ctx.strokeStyle = ol;
    bodyPath(ctx, type, u); ctx.stroke();

    // type features
    ctx.strokeStyle = col.line; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (isBao) {
      baoKnot(ctx, u, col, ol);
      if (!o.drum) baoArms(ctx, u, col, ol, o.mood, t);
    } else if (type === 'gyoza') {
      ctx.lineWidth = Math.max(1, 0.04 * u);
      for (let i = 0; i < 7; i++) {
        const tt = 0.14 + i * 0.12;
        const px = bez(tt, 1.15, 0.85, -0.85, -1.15) * u, py = bez(tt, -0.45, -1.05, -1.05, -0.45) * u;
        ctx.fillStyle = col.light;
        ctx.beginPath(); ctx.ellipse(px, py - 0.03 * u, 0.13 * u, 0.09 * u, 0, Math.PI, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px * 0.95, py + 0.12 * u, px * 0.9 + 0.04 * u, py + 0.2 * u); ctx.stroke();
      }
    } else {
      // open top: the empty inside of the wrapper, shaded deeper toward the back
      const ig = ctx.createLinearGradient(0, (RIM.cy - RIM.ry) * u, 0, (RIM.cy + RIM.ry) * u);
      ig.addColorStop(0, shade(col.base, 0.78)); ig.addColorStop(1, mix(col.base, col.line, 0.35));
      ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(0, RIM.cy * u, (RIM.rx - 0.1) * u, (RIM.ry - 0.05) * u, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = col.line; ctx.lineWidth = Math.max(1, 0.03 * u); ctx.stroke();
      // gathered pleats running down from the rim
      ctx.save(); bodyPath(ctx, 'soup', u); ctx.clip();
      ctx.strokeStyle = mix(col.base, col.line, 0.6); ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(1, 0.03 * u);
      for (let i = -5; i <= 5; i++) {
        const a = Math.PI / 2 - i * 0.26, x0 = Math.cos(a) * RIM.rx * u, y0 = (RIM.cy + Math.sin(a) * RIM.ry) * u;
        ctx.beginPath(); ctx.moveTo(x0, y0 + 0.02 * u); ctx.quadraticCurveTo(x0 * 1.02, y0 + 0.14 * u, x0 * 0.98, y0 + (0.24 - Math.abs(i) * 0.012) * u); ctx.stroke();
      }
      ctx.restore();
      // frilly front edge of the rim
      ctx.beginPath(); const [sx0, sy0] = [-RIM.rx * u, RIM.cy * u]; ctx.moveTo(sx0, sy0);
      shumaiRim(ctx, u, Math.PI, TAU);
      ctx.lineTo((RIM.rx - 0.1) * u, RIM.cy * u);
      ctx.ellipse(0, RIM.cy * u, (RIM.rx - 0.1) * u, (RIM.ry - 0.05) * u, 0, 0, Math.PI, false);
      ctx.closePath();
      ctx.fillStyle = mix(col.light, col.base, 0.25); ctx.fill();
      ctx.strokeStyle = col.line; ctx.lineWidth = Math.max(1.2, 0.04 * u);
      ctx.beginPath(); ctx.moveTo(sx0, sy0); shumaiRim(ctx, u, Math.PI, TAU); ctx.stroke();
    }

    // shine for older dumplings
    if ((o.stage || 0) >= 3 && !isBao && !o.back) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.ellipse(-0.5 * u, (g.mid - 0.25) * u, 0.13 * u, 0.07 * u, -0.6, 0, TAU); ctx.fill();
    }

    // outfit: worn by the player's own dumpling (recognised by its look) unless one is passed in
    const pet = DG.pet && DG.pet(), outfit = o.outfit !== undefined ? o.outfit : (pet && o.look && o.look === pet.look ? pet.outfit : null);
    const OF = outfit && DG.OUTFITS && DG.OUTFITS[outfit];
    if (OF && !o.back) wearOutfit(ctx, outfit, type, u, g);
    if (o.back) backView(ctx, o, u, g, col); else face(ctx, o, u, g, t); // seen from behind (running away from the camera): no face
    if (o.drum) drumArms(ctx, u, col, ol, o.drum);
    if (o.trait === 'strength') drawPowerBand(ctx, u, g, t, type);
    if (o.trait === 'agility') drawScarf(ctx, u, g, t);
    if (OF && OF.hat) outfitHat(ctx, outfit, type, u, g);
    else if (OF && OF.acc) accessory(ctx, OF.acc, u, g, t, type);
    else if (o.accessory) accessory(ctx, o.accessory, u, g, t, type);
    if ((o.stage || 0) >= 4) {
      for (let i = 0; i < 3; i++) {
        const a = t * 1.5 + i * 2.1;
        sparkle(ctx, Math.cos(a) * 1.25 * u, (g.mid - 0.2) * u + Math.sin(a * 1.3) * 0.6 * u, 0.08 * u * (0.6 + 0.4 * Math.sin(t * 4 + i)), '#ffd75a');
      }
    }
    ctx.restore();
  }

  /* ---------- Outfits (art cut from the closet design) ---------- */
  const OFIMG = {};
  const ofImg = (n) => {
    if (typeof Image === 'undefined') return null;
    if (!OFIMG[n]) { const im = new Image(); im.decoding = 'async'; im.src = (window.DG_ASSETS && window.DG_ASSETS[`img/of_${n}.webp`]) || `img/of_${n}.webp?v=2`; OFIMG[n] = im; }
    return OFIMG[n].complete && OFIMG[n].naturalWidth ? OFIMG[n] : null;
  };
  // where clothes sit on each body: top (in u, from the feet), bottom, width
  const OF_FIT = { bao: { top: -0.46, bot: 0.1, w: 2.2 }, gyoza: { top: -0.2, bot: 0.15, w: 2.4 }, soup: { top: -0.48, bot: 0.1, w: 1.95 } };
  function wearOutfit(ctx, id, type, u, g) {
    const im = ofImg(id + '_body'); if (!im) return;
    const F = OF_FIT[type] || OF_FIT.bao, w = F.w * u, h = (F.bot - F.top) * u;
    ctx.drawImage(im, -w / 2, F.top * u, w, h);
  }
  const HAT_FIT = { sailor: { w: 1.05, lift: 0.18 }, wizard: { w: 1.85, lift: 0.3 } };
  function outfitHat(ctx, id, type, u, g) {
    const im = ofImg(id + '_hat'); if (!im) return;
    const H = HAT_FIT[id] || { w: 1, lift: 0.2 }, w = H.w * u, h = w * im.naturalHeight / im.naturalWidth;
    const base = (g.top + Math.min(H.lift, (g.eyeY - g.top) * 0.4)) * u; // the hat's bottom edge rests a little below the top of the head, clear of the eyes
    ctx.drawImage(im, -w / 2, base - h, w, h);
  }
  DG.outfitArtReady = () => Object.keys(DG.OUTFITS || {}).every((id) => ofImg(id + '_body'));

  /** The back of the dumpling: a soft seam and a little shading where the face would be. */
  function backView(ctx, o, u, g, col) {
    ctx.save();
    ctx.strokeStyle = col.line; ctx.globalAlpha = 0.45; ctx.lineWidth = Math.max(1.2, 0.04 * u); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, (g.mid - 0.35) * u); ctx.quadraticCurveTo(0.06 * u, (g.mid + 0.05) * u, 0, (g.mid + 0.4) * u); ctx.stroke();
    ctx.globalAlpha = 0.18; ctx.fillStyle = col.line;
    ctx.beginPath(); ctx.ellipse(0, (g.mid + 0.3) * u, 0.55 * u, 0.16 * u, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- Bao: twisted top knot, stubby arms and feet ---------- */
  function limb(ctx, x, y, rx, ry, rot, col, ol, u) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const lg = ctx.createRadialGradient(-rx * 0.3, -ry * 0.4, ry * 0.1, 0, 0, rx * 1.1);
    lg.addColorStop(0, mix(col.light, '#ffffff', 0.5)); lg.addColorStop(1, col.base);
    ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(1.3, 0.045 * u); ctx.strokeStyle = ol; ctx.stroke();
    ctx.restore();
  }
  function baoFeet(ctx, u, col, ol) {
    [-1, 1].forEach((s) => limb(ctx, s * 0.4 * u, -0.01 * u, 0.17 * u, 0.12 * u, s * 0.15, col, ol, u));
  }
  function baoArms(ctx, u, col, ol, mood, t) {
    const up = mood === 'joy' || mood === 'love' || mood === 'cheer' || mood === 'squeak';
    const down = mood === 'sad' || mood === 'sleepy' || mood === 'sleeping';
    [-1, 1].forEach((s) => {
      const wave = up ? Math.sin(t * 9 + s) * 0.18 : Math.sin(t * 2 + s) * 0.05;
      const rot = s * (up ? -0.95 : down ? 0.35 : -0.45) + wave * s;
      limb(ctx, s * (down ? 0.93 : 0.98) * u, (up ? -0.6 : down ? -0.4 : -0.5) * u, 0.17 * u, 0.125 * u, rot, col, ol, u);
    });
  }
  /** Two little arms holding drumsticks; the hitting arm swings down onto the drum. */
  function drumArms(ctx, u, col, ol, d) {
    [-1, 1].forEach((s) => {
      const h = s === d.side ? d.hit : 0; // 1 right after a tap, fading to 0
      // the hitting stick winds up, slams onto the drum head, then settles back to hovering over it
      let a = 0.5; // angle below horizontal, pointing in toward the drum
      if (h > 0.7) a = 0.5 - (1 - h) / 0.3 * 0.9;
      else if (h > 0.4) a = -0.4 + (0.7 - h) / 0.3 * 1.25;
      else if (h > 0) a = 0.85 - (0.4 - h) / 0.4 * 0.35;
      const rot = s > 0 ? Math.PI - a : a;
      ctx.save(); ctx.translate(s * 0.84 * u, -0.6 * u); ctx.rotate(rot);
      ctx.strokeStyle = ol; ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, 0.075 * u); ctx.beginPath(); ctx.moveTo(0.12 * u, 0); ctx.lineTo(0.55 * u, 0); ctx.stroke();
      ctx.strokeStyle = '#e9c38e'; ctx.lineWidth = Math.max(1.6, 0.045 * u); ctx.stroke();
      ctx.fillStyle = '#fff6e6'; ctx.strokeStyle = ol; ctx.lineWidth = Math.max(1.2, 0.03 * u);
      ctx.beginPath(); ctx.arc(0.58 * u, 0, 0.065 * u, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
      limb(ctx, s * 0.84 * u, -0.6 * u, 0.17 * u, 0.125 * u, rot, col, ol, u);
    });
  }
  function baoShading(ctx, u, col) {
    // warm golden rim just inside the outline
    ctx.save(); ctx.globalAlpha = 0.35; ctx.lineWidth = 0.2 * u; ctx.strokeStyle = mix(col.base, '#f0b860', 0.55);
    ctx.filter = `blur(${Math.max(1, 0.05 * u)}px)`; bodyPath(ctx, 'bao', u); ctx.stroke(); ctx.restore();
    // soft base shadow and glossy highlights
    const bg = ctx.createLinearGradient(0, -0.35 * u, 0, 0.05 * u);
    bg.addColorStop(0, 'rgba(170,110,50,0)'); bg.addColorStop(1, 'rgba(170,110,50,0.16)');
    ctx.fillStyle = bg; ctx.fillRect(-1.2 * u, -0.35 * u, 2.4 * u, 0.45 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-0.62 * u, -0.9 * u, 0.17 * u, 0.06 * u, -0.85, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.64 * u, -0.98 * u, 0.09 * u, 0.04 * u, 0.8, 0, TAU); ctx.fill();
  }
  function knotPath(ctx, u, open, keep) {
    // twisted pleated top: base sits on the bun's shoulders, lumpy crown above
    const P = (x, y) => [x * 1.25 * u, (-1.29 + (y + 1.1) * 0.85) * u];
    const L = (x1, y1, x2, y2, x3, y3) => ctx.bezierCurveTo(...P(x1, y1), ...P(x2, y2), ...P(x3, y3));
    if (!keep) ctx.beginPath(); ctx.moveTo(...P(-0.38, -1.1));
    L(-0.3, -1.2, -0.36, -1.33, -0.25, -1.42);
    L(-0.17, -1.5, -0.08, -1.46, -0.03, -1.41);
    L(0.01, -1.53, 0.15, -1.55, 0.21, -1.47);
    L(0.27, -1.41, 0.32, -1.36, 0.26, -1.27);
    L(0.25, -1.2, 0.3, -1.13, 0.38, -1.1);
    if (!open) { ctx.quadraticCurveTo(...P(0, -0.98), ...P(-0.38, -1.1)); ctx.closePath(); }
  }
  function baoKnot(ctx, u, col, ol) {
    knotPath(ctx, u);
    const kg = ctx.createLinearGradient(-0.35 * u, -1.62 * u, 0.35 * u, -1.2 * u);
    kg.addColorStop(0, mix(col.light, '#ffffff', 0.4)); kg.addColorStop(0.6, mix(col.light, col.base, 0.5)); kg.addColorStop(1, col.base);
    ctx.fillStyle = kg; ctx.fill();
    ctx.lineWidth = Math.max(1.5, 0.05 * u); ctx.strokeStyle = ol; knotPath(ctx, u, true); ctx.stroke();
    // twisted pleats sweeping from the knot down over the top of the bun
    const pl = mix(col.base, col.line, 0.55);
    ctx.save(); bodyPath(ctx, 'bao', u); knotPath(ctx, u, false, true); ctx.clip();
    ctx.lineCap = 'round';
    for (let i = -3; i <= 3; i++) {
      const sx = i * 0.07 * u + 0.03 * u, sy = -1.55 * u + Math.abs(i) * 0.03 * u;
      const ex = (i * 0.24 + 0.12) * u, ey = (-0.98 - Math.abs(i) * 0.06) * u;
      const cx = (i * 0.09 + 0.24) * u, cy = -1.28 * u;
      ctx.strokeStyle = pl; ctx.globalAlpha = 0.6; ctx.lineWidth = Math.max(1, 0.035 * u);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(1, 0.03 * u);
      ctx.beginPath(); ctx.moveTo(sx - 0.045 * u, sy + 0.02 * u); ctx.quadraticCurveTo(cx - 0.06 * u, cy, ex - 0.07 * u, ey - 0.01 * u); ctx.stroke();
    }
    ctx.restore();
  }

  function face(ctx, o, u, g, t) {
    const mood = o.mood || 'happy';
    const big = (o.stage || 0) === 0 ? 1.18 : 1;
    const ex = g.eyeDX * u, ey = g.eyeY * u, lx = (o.gaze || 0) * 0.06 * u;
    const bao = (o.type || 'bao') === 'bao';
    const er = (bao ? 0.165 : 0.1) * u * big;
    ctx.save();
    const look = (o.look && typeof o.look === 'object') ? o.look : {}, eyes = look.eyes || 'round', cheeks = look.cheeks || 'blush';
    const happyBoost = mood === 'joy' || mood === 'love';
    // cheeks
    [-1, 1].forEach((s) => {
      const cx = s * (ex + 0.2 * u), cy = ey + 0.16 * u;
      if (bao && (cheeks === 'blush' || cheeks === 'big')) {
        const k = cheeks === 'big' ? 1.3 : 1, bx = s * (ex + 0.2 * u), by = ey + 0.2 * u;
        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 0.17 * u * k);
        bg.addColorStop(0, `rgba(255,120,130,${happyBoost ? 0.6 : 0.45})`); bg.addColorStop(1, 'rgba(255,120,130,0)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(bx, by, 0.17 * u * k, 0.11 * u * k, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(225,85,100,0.6)'; ctx.lineWidth = Math.max(1, 0.018 * u); ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(bx + (i * 0.05 - 0.02) * u, by + 0.035 * u); ctx.lineTo(bx + (i * 0.05 + 0.025) * u, by - 0.035 * u); ctx.stroke();
        }
      } else if (cheeks === 'blush' || cheeks === 'big') {
        const big = cheeks === 'big' ? 1.45 : 1;
        ctx.fillStyle = `rgba(255,140,150,${(happyBoost ? 0.6 : 0.4) + (cheeks === 'big' ? 0.1 : 0)})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, 0.12 * u * big, 0.07 * u * big, 0, 0, TAU); ctx.fill();
      } else if (cheeks === 'hearts') {
        const h = 0.09 * u; ctx.fillStyle = 'rgba(255,110,140,0.75)';
        ctx.beginPath(); ctx.moveTo(cx, cy + h * 0.6);
        ctx.bezierCurveTo(cx - h * 1.2, cy - h * 0.2, cx - h * 0.5, cy - h * 1.1, cx, cy - h * 0.35);
        ctx.bezierCurveTo(cx + h * 0.5, cy - h * 1.1, cx + h * 1.2, cy - h * 0.2, cx, cy + h * 0.6); ctx.fill();
      } else if (cheeks === 'freckles') {
        ctx.fillStyle = 'rgba(150,95,60,0.6)';
        [[-0.05, -0.02], [0.05, -0.03], [0, 0.04]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx * u, cy + dy * u, 0.022 * u, 0, TAU); ctx.fill(); });
      } else if (cheeks === 'bandage') {
        if (s > 0) {
          ctx.save(); ctx.translate(cx, cy - 0.02 * u); ctx.rotate(-0.5);
          ctx.fillStyle = '#f3c89a'; ctx.strokeStyle = '#c99868'; ctx.lineWidth = Math.max(1, 0.015 * u);
          roundRect(ctx, -0.15 * u, -0.05 * u, 0.3 * u, 0.1 * u, 0.04 * u); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ffe3c4'; roundRect(ctx, -0.05 * u, -0.045 * u, 0.1 * u, 0.09 * u, 0.015 * u); ctx.fill();
          ctx.fillStyle = 'rgba(180,130,90,0.6)';
          [[-0.11, -0.015], [-0.09, 0.02], [0.09, -0.02], [0.11, 0.015]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx * u, dy * u, 0.008 * u, 0, TAU); ctx.fill(); });
          ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(255,140,150,0.35)'; ctx.beginPath(); ctx.ellipse(cx, cy, 0.1 * u, 0.06 * u, 0, 0, TAU); ctx.fill();
        }
      } else if (cheeks === 'stars') {
        sparkle(ctx, cx, cy, 0.08 * u, 'rgba(255,190,60,0.9)');
      }
    });
    const INKF = bao ? '#3a1e10' : '#3b2a22';
    ctx.strokeStyle = INKF; ctx.fillStyle = INKF; ctx.lineWidth = Math.max(1.5, 0.045 * u); ctx.lineCap = 'round';
    const closed = o.blink || mood === 'sleeping';
    [-1, 1].forEach((s) => {
      const x = s * ex + lx;
      if (mood === 'joy' || mood === 'love') {
        ctx.beginPath(); ctx.arc(x, ey + er * 0.4, er * 0.9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      } else if (closed) {
        ctx.beginPath(); ctx.arc(x, ey - er * 0.3, er * 0.85, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      } else if (mood === 'dizzy') {
        ctx.beginPath(); ctx.moveTo(x - er * 0.7, ey - er * 0.7); ctx.lineTo(x + er * 0.7, ey + er * 0.7);
        ctx.moveTo(x + er * 0.7, ey - er * 0.7); ctx.lineTo(x - er * 0.7, ey + er * 0.7); ctx.stroke();
      } else {
        if (eyes === 'dot') {
          ctx.beginPath(); ctx.arc(x, ey, er * 0.55, 0, TAU); ctx.fill();
        } else if (eyes === 'wide') {
          ctx.beginPath(); ctx.ellipse(x, ey, er * 0.95, er * 1.25, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#6b4a8a'; ctx.beginPath(); ctx.ellipse(x, ey + er * 0.35, er * 0.7, er * 0.6, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(x + er * 0.3, ey - er * 0.45, er * 0.42, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(x - er * 0.3, ey + er * 0.5, er * 0.18, 0, TAU); ctx.fill();
        } else {
          const k = eyes === 'sparkle' ? 1.15 : 1;
          ctx.beginPath(); ctx.ellipse(x, ey, er * 0.82 * k, er * k, 0, 0, TAU); ctx.fill();
          if (bao) { // warm brown glow in the lower iris, like an anime eye
            ctx.save(); ctx.clip();
            const ig = ctx.createRadialGradient(x, ey + er * 0.6, 0, x, ey + er * 0.6, er * 0.75);
            ig.addColorStop(0, '#c98a4a'); ig.addColorStop(0.6, 'rgba(150,85,40,0.6)'); ig.addColorStop(1, 'rgba(120,60,30,0)');
            ctx.fillStyle = ig; ctx.fillRect(x - er, ey - er * 1.2, er * 2, er * 2.4); ctx.restore();
          }
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(x + er * 0.25, ey - er * 0.35, er * (eyes === 'sparkle' ? 0.4 : 0.32), 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(x - er * 0.25, ey + er * 0.35, er * 0.14, 0, TAU); ctx.fill();
          if (eyes === 'sparkle') sparkle(ctx, x - er * 0.3, ey - er * 0.45, er * 0.3, '#fff');
        }
        ctx.fillStyle = INKF;
        if (bao && mood !== 'grumpy' && mood !== 'sad' && eyes !== 'fierce' && eyes !== 'cool') { // soft arched brows
          ctx.save(); ctx.lineWidth = Math.max(1.2, 0.03 * u);
          ctx.beginPath(); ctx.arc(x + s * 0.02 * u, ey - er * 1.05, er * 0.85, Math.PI * (s < 0 ? 1.28 : 1.32), Math.PI * (s < 0 ? 1.68 : 1.72)); ctx.stroke();
          ctx.restore();
        }
        if (eyes === 'lash') {
          for (let i = 0; i < 3; i++) {
            const a = -Math.PI / 2 + s * (0.5 + i * 0.35);
            ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * er * 0.8, ey + Math.sin(a) * er);
            ctx.lineTo(x + Math.cos(a) * er * 1.35, ey + Math.sin(a) * er * 1.45); ctx.stroke();
          }
        }
        if (eyes === 'cool' && mood !== 'sleepy') { // half-lidded, unimpressed
          const c = (o._col || DG.STARTERS[o.type || 'bao'].colors).light;
          ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - er * 1.1, ey - er * 1.3); ctx.lineTo(x + er * 1.1, ey - er * 1.3);
          ctx.lineTo(x + er * 1.1, ey - er * (0.05 - s * 0.18)); ctx.lineTo(x - er * 1.1, ey - er * (0.05 + s * 0.18)); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x - er * 0.95, ey - er * (0.05 + s * 0.16)); ctx.lineTo(x + er * 0.95, ey - er * (0.05 - s * 0.16)); ctx.stroke();
          ctx.fillStyle = INKF;
        }
        if (eyes === 'fierce' && mood !== 'grumpy' && mood !== 'sad') { // bold, determined brows
          ctx.save(); ctx.lineWidth = Math.max(2, 0.06 * u);
          ctx.beginPath(); ctx.moveTo(x + s * er * 1.05, ey - er * 1.75); ctx.lineTo(x - s * er * 0.75, ey - er * 1.3); ctx.stroke();
          ctx.restore();
        }
        if (mood === 'sleepy' || eyes === 'sleepy') { // droopy lids
          const c = (o._col || DG.STARTERS[o.type || 'bao'].colors).light;
          ctx.fillStyle = c; ctx.fillRect(x - er, ey - er * 1.2, er * 2, er * 1.05);
          ctx.beginPath(); ctx.moveTo(x - er, ey - er * 0.15); ctx.lineTo(x + er, ey - er * 0.15); ctx.stroke();
          ctx.fillStyle = '#3b2a22';
        }
        if (mood === 'grumpy') {
          ctx.beginPath(); ctx.moveTo(x - s * er * 1.0, ey - er * 1.7); ctx.lineTo(x + s * er * 0.7, ey - er * 1.25); ctx.stroke();
        }
        if (mood === 'sad') {
          ctx.beginPath(); ctx.moveTo(x - s * er * 0.9, ey - er * 1.25); ctx.lineTo(x + s * er * 0.7, ey - er * 1.7); ctx.stroke();
        }
      }
    });
    // mouth
    const my = ey + (bao ? 0.14 : 0.2) * u;
    const mw = 0.1 * u;
    if (bao && (mood === 'happy' || mood === 'joy' || mood === 'squeak' || mood === 'love' || mood === 'cheer')) {
      // big open anime smile with a pink tongue
      const w = (mood === 'happy' ? 0.14 : 0.16) * u, d = (mood === 'happy' ? 1.45 : 1.7) * w, top = my - 0.02 * u;
      const mp = () => {
        ctx.beginPath(); ctx.moveTo(-w, top);
        ctx.quadraticCurveTo(-w * 0.5, top + w * 0.14, 0, top + w * 0.02); ctx.quadraticCurveTo(w * 0.5, top + w * 0.14, w, top);
        ctx.bezierCurveTo(w * 0.95, top + d, -w * 0.95, top + d, -w, top); ctx.closePath();
      };
      mp(); ctx.fillStyle = '#8a3426'; ctx.fill();
      ctx.save(); mp(); ctx.clip();
      ctx.fillStyle = '#f2828a'; ctx.beginPath(); ctx.ellipse(0, top + d * 0.82, w * 0.7, d * 0.42, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.lineWidth = Math.max(1.2, 0.028 * u); ctx.strokeStyle = '#4a2012'; ctx.lineJoin = 'round'; mp(); ctx.stroke();
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * w * 1.13, top - w * 0.1); ctx.lineTo(s * w * 0.96, top + w * 0.06); ctx.stroke(); });
      ctx.restore(); return;
    }
    if (mood === 'munch') {
      const open = Math.sin(t * 16) > 0;
      if (open) { ctx.fillStyle = '#7a3b32'; ctx.beginPath(); ctx.ellipse(0, my, mw * 0.8, mw * 0.65, 0, 0, TAU); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(-mw * 0.8, my); ctx.lineTo(mw * 0.8, my); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,170,160,0.5)';
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * (ex + 0.12 * u), my, 0.13 * u, 0, TAU); ctx.fill(); });
    } else if (mood === 'joy' || mood === 'squeak' || mood === 'love' || mood === 'cheer') {
      ctx.fillStyle = '#7a3b32';
      ctx.beginPath(); ctx.moveTo(-mw, my - mw * 0.2); ctx.quadraticCurveTo(0, my + mw * 1.6, mw, my - mw * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff8f9a';
      ctx.beginPath(); ctx.ellipse(0, my + mw * 0.5, mw * 0.45, mw * 0.25, 0, 0, TAU); ctx.fill();
    } else if (mood === 'grumpy' || mood === 'sad') {
      ctx.beginPath(); ctx.arc(0, my + mw * 0.8, mw * 0.8, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    } else if (mood === 'sleeping' || mood === 'surprised' || mood === 'dizzy') {
      ctx.beginPath(); ctx.ellipse(0, my, mw * 0.35, mw * 0.45, 0, 0, TAU); ctx.stroke();
    } else if (mood === 'sleepy') {
      ctx.beginPath(); ctx.moveTo(-mw * 0.5, my); ctx.lineTo(mw * 0.5, my); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-mw, my - mw * 0.1);
      ctx.quadraticCurveTo(-mw * 0.5, my + mw * 0.7, 0, my); ctx.quadraticCurveTo(mw * 0.5, my + mw * 0.7, mw, my - mw * 0.1); ctx.stroke();
    }
    ctx.restore();
  }


  function sparkle(ctx, x, y, r, color, outline) {
    ctx.save(); ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, rr = i % 2 ? r * 0.35 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1, r * 0.14); ctx.strokeStyle = outline; ctx.stroke(); }
    ctx.restore();
  }
  function burstShape(ctx, x, y, r, n, inner) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU, rr = i % 2 ? r * inner : r * (0.85 + ((i * 37) % 7) / 30);
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function drawVest(ctx, u, type) {
    const top = type === 'gyoza' ? -0.38 : -0.48;
    ctx.fillStyle = '#ffa24c';
    ctx.fillRect(-1.3 * u, top * u, 2.6 * u, 0.8 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(-0.18 * u, top * u); ctx.lineTo(0, (top + 0.3) * u); ctx.lineTo(0.18 * u, top * u); ctx.fill();
    ctx.strokeStyle = 'rgba(160,80,20,0.6)'; ctx.lineWidth = Math.max(1, 0.03 * u);
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 0.28 * u, top * u); ctx.lineTo(i * 0.28 * u, 0.2 * u); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-1.3 * u, (top + 0.22) * u); ctx.lineTo(1.3 * u, (top + 0.22) * u); ctx.stroke();
    ctx.fillStyle = '#ffd36a';
    [-0.5, 0.5].forEach((x) => { ctx.beginPath(); ctx.arc(x * u, (top + 0.12) * u, 0.05 * u, 0, TAU); ctx.fill(); });
  }
  function drawPowerBand(ctx, u, g, t, type) {
    const y = (g.eyeY - 0.27) * u;
    const hw = type === 'gyoza' ? 0.86 : type === 'soup' ? 0.82 : 0.9;
    ctx.fillStyle = '#e8453c';
    ctx.beginPath(); ctx.moveTo(-hw * u, y + 0.03 * u); ctx.quadraticCurveTo(0, y - 0.08 * u, hw * u, y + 0.03 * u);
    ctx.lineTo(hw * u, y + 0.15 * u); ctx.quadraticCurveTo(0, y + 0.04 * u, -hw * u, y + 0.15 * u); ctx.fill();
    const w = Math.sin(t * 6) * 0.06 * u;
    ctx.beginPath(); ctx.moveTo(-hw * u, y + 0.05 * u); ctx.lineTo(-(hw + 0.35) * u, y - 0.05 * u + w); ctx.lineTo(-(hw + 0.3) * u, y + 0.1 * u + w); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-hw * u, y + 0.1 * u); ctx.lineTo(-(hw + 0.3) * u, y + 0.22 * u - w); ctx.lineTo(-(hw + 0.18) * u, y + 0.28 * u - w); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${0.12 * u}px Fredoka, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('★', 0, y + 0.12 * u);
  }
  function drawScarf(ctx, u, g, t) {
    const y = -0.32 * u;
    ctx.save();
    ctx.fillStyle = '#2ab7a9';
    roundRect(ctx, -1.05 * u, y, 2.1 * u, 0.2 * u, 0.1 * u); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -4; i <= 4; i += 2) ctx.fillRect(i * 0.2 * u, y, 0.1 * u, 0.2 * u);
    const w = Math.sin(t * 5) * 0.08 * u;
    ctx.fillStyle = '#2ab7a9';
    ctx.beginPath(); ctx.moveTo(0.6 * u, y + 0.1 * u); ctx.lineTo(0.9 * u + w, y + 0.5 * u); ctx.lineTo(0.68 * u + w, y + 0.55 * u); ctx.lineTo(0.45 * u, y + 0.15 * u); ctx.fill();
    ctx.restore();
  }
  function heartShape(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.6);
    ctx.bezierCurveTo(x - s * 1.2, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.2, y - s * 0.2, x, y + s * 0.6); ctx.fill();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  DG.roundRect = roundRect;

  /* ---------- Accessories: shaded, outlined and anchored to the dumpling ---------- */
  function accessory(ctx, id, u, g, t, type) {
    const top = g.top * u, ey = g.eyeY * u, ex = g.eyeDX * u, bao = type === 'bao';
    const LW = Math.max(1.3, 0.034 * u);
    const OL = (c) => shade(c, 0.5);
    const grad = (y0, y1, c) => { const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, mix(c, '#ffffff', 0.45)); gr.addColorStop(0.55, c); gr.addColorStop(1, shade(c, 0.78)); return gr; };
    const hgrad = (x0, x1, c) => { const gr = ctx.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, mix(c, '#ffffff', 0.35)); gr.addColorStop(0.45, c); gr.addColorStop(1, shade(c, 0.7)); return gr; };
    const paint = (fill, c) => { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL(c); ctx.stroke(); };
    const shine = (x, y, rx, ry, r) => { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r || 0, 0, TAU); ctx.fill(); };
    const contact = (x, y, rx, ry) => { // soft shadow on the body under the accessory
      ctx.save(); bodyPath(ctx, type, u); ctx.clip();
      const sg = ctx.createRadialGradient(x, y, 0, x, y, rx);
      sg.addColorStop(0, 'rgba(110,60,25,0.22)'); sg.addColorStop(1, 'rgba(110,60,25,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); ctx.restore();
    };
    // a band that wraps around the head, clipped to the body outline so it hugs the curve
    const band = (y, h, c, extra) => {
      ctx.save(); bodyPath(ctx, type, u); ctx.clip();
      const W = 1.3 * u;
      ctx.beginPath(); ctx.moveTo(-W, y + 0.1 * u); ctx.quadraticCurveTo(0, y - 0.14 * u, W, y + 0.1 * u);
      ctx.lineTo(W, y + 0.1 * u + h); ctx.quadraticCurveTo(0, y - 0.14 * u + h, -W, y + 0.1 * u + h); ctx.closePath();
      ctx.fillStyle = grad(y - 0.05 * u, y + h, c); ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL(c); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = LW * 0.8;
      ctx.beginPath(); ctx.moveTo(-W, y + 0.1 * u + LW); ctx.quadraticCurveTo(0, y - 0.14 * u + LW, W, y + 0.1 * u + LW); ctx.stroke();
      if (extra) extra(W);
      ctx.restore();
    };
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (id === 'bow') {
      const c = '#ff8fb4';
      const bx = (bao ? 0.5 : 0.52) * u, by = top + (bao ? 0.36 : 0.26) * u;
      contact(bx, by + 0.1 * u, 0.32 * u, 0.1 * u);
      ctx.translate(bx, by); ctx.rotate(0.32 + Math.sin(t * 3) * 0.04);
      [-1, 1].forEach((s) => { // tails
        ctx.beginPath(); ctx.moveTo(s * 0.03 * u, 0.04 * u); ctx.lineTo(s * 0.17 * u, 0.3 * u); ctx.lineTo(s * 0.11 * u, 0.27 * u);
        ctx.lineTo(s * 0.08 * u, 0.33 * u); ctx.lineTo(-s * 0.01 * u, 0.07 * u); ctx.closePath(); paint(grad(0, 0.33 * u, shade(c, 0.92)), c);
      });
      [-1, 1].forEach((s) => { // puffy loops with a fold
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(s * 0.1 * u, -0.27 * u, s * 0.43 * u, -0.26 * u, s * 0.39 * u, -0.01 * u);
        ctx.bezierCurveTo(s * 0.43 * u, 0.22 * u, s * 0.12 * u, 0.2 * u, 0, 0); ctx.closePath();
        paint(grad(-0.25 * u, 0.2 * u, c), c);
        ctx.strokeStyle = 'rgba(160,40,90,0.35)'; ctx.lineWidth = LW * 0.8;
        ctx.beginPath(); ctx.moveTo(s * 0.07 * u, -0.03 * u); ctx.quadraticCurveTo(s * 0.2 * u, -0.05 * u, s * 0.3 * u, -0.14 * u); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.07 * u, 0.03 * u); ctx.quadraticCurveTo(s * 0.2 * u, 0.06 * u, s * 0.3 * u, 0.1 * u); ctx.stroke();
        shine(s * 0.24 * u, -0.15 * u, 0.06 * u, 0.025 * u, s * -0.5);
      });
      roundRect(ctx, -0.075 * u, -0.085 * u, 0.15 * u, 0.17 * u, 0.06 * u); paint(grad(-0.08 * u, 0.08 * u, shade(c, 0.9)), c);
      shine(-0.02 * u, -0.04 * u, 0.025 * u, 0.015 * u);
    } else if (id === 'tinyhat') {
      contact(0.04 * u, top + 0.24 * u, 0.52 * u, 0.12 * u);
      ctx.translate(0.07 * u, top + 0.16 * u); ctx.rotate(-0.12); ctx.scale(1.3, 1.3);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.37 * u, 0.1 * u, 0, 0, TAU); paint('#2c2735', '#2c2735');
      ctx.fillStyle = '#4a4258'; ctx.beginPath(); ctx.ellipse(0, -0.012 * u, 0.33 * u, 0.075 * u, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.2 * u, -0.46 * u); ctx.lineTo(-0.2 * u, -0.03 * u); ctx.ellipse(0, -0.03 * u, 0.2 * u, 0.05 * u, 0, Math.PI, 0, true); ctx.lineTo(0.2 * u, -0.46 * u); ctx.closePath();
      const cg = ctx.createLinearGradient(-0.2 * u, 0, 0.2 * u, 0); cg.addColorStop(0, '#6a6078'); cg.addColorStop(0.35, '#3d3649'); cg.addColorStop(1, '#221e2b');
      paint(cg, '#3d3649');
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.moveTo(-0.21 * u, -0.15 * u); ctx.ellipse(0, -0.15 * u, 0.21 * u, 0.05 * u, 0, Math.PI, 0, true); ctx.lineTo(0.21 * u, -0.06 * u); ctx.ellipse(0, -0.06 * u, 0.21 * u, 0.05 * u, 0, 0, Math.PI, false); ctx.closePath();
      ctx.fillStyle = hgrad(-0.2 * u, 0.2 * u, '#e8453c'); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, -0.46 * u, 0.2 * u, 0.055 * u, 0, 0, TAU); paint('#544b63', '#3d3649');
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-0.15 * u, -0.42 * u, 0.04 * u, 0.36 * u);
    } else if (id === 'headband') {
      const y = (g.eyeY - 0.4) * u;
      band(y, 0.11 * u, '#b48cf0', () => {
        ctx.fillStyle = '#fff';
        for (let i = -4; i <= 4; i++) { const x = i * 0.2 * u, yy = y + 0.1 * u - 0.24 * u * (1 - (x / (1.3 * u)) ** 2) * 0.5 + 0.055 * u; ctx.beginPath(); ctx.arc(x, yy - 0.02 * u, 0.025 * u, 0, TAU); ctx.fill(); }
      });
      const fx = -0.5 * u, fy = y + 0.02 * u;
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU - Math.PI / 2;
        ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 0.085 * u, fy + Math.sin(a) * 0.085 * u, 0.07 * u, 0.055 * u, a, 0, TAU); paint(grad(fy - 0.15 * u, fy + 0.15 * u, '#ff9fbf'), '#ff9fbf');
      }
      ctx.beginPath(); ctx.arc(fx, fy, 0.05 * u, 0, TAU); paint('#ffd36a', '#e0a92c');
    } else if (id === 'cap') {
      const cy = top + (bao ? 0.16 : 0.12) * u;
      contact(0.05 * u, cy + 0.08 * u, 0.55 * u, 0.12 * u);
      ctx.translate(0, cy + 0.03 * u); ctx.rotate(-0.06); ctx.scale(1.15, 1.15);
      ctx.beginPath(); ctx.moveTo(-0.52 * u, 0.02 * u); ctx.bezierCurveTo(-0.52 * u, -0.56 * u, 0.52 * u, -0.56 * u, 0.52 * u, 0.02 * u); ctx.quadraticCurveTo(0, 0.1 * u, -0.52 * u, 0.02 * u); ctx.closePath();
      paint(grad(-0.45 * u, 0.06 * u, '#4a88de'), '#3f7fd6');
      ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(20,50,110,0.35)'; ctx.lineWidth = LW * 0.8;
      [-0.18, 0.18].forEach((k) => { ctx.beginPath(); ctx.moveTo(0, -0.41 * u); ctx.quadraticCurveTo(k * u * 1.4, -0.2 * u, k * u * 1.8, 0.06 * u); ctx.stroke(); });
      ctx.restore();
      shine(-0.24 * u, -0.26 * u, 0.1 * u, 0.04 * u, -0.6);
      ctx.beginPath(); ctx.arc(0, -0.415 * u, 0.045 * u, 0, TAU); paint('#3f7fd6', '#3f7fd6');
      sparkle(ctx, 0.2 * u, -0.2 * u, 0.08 * u, '#ffd36a', '#c78a14');
      // brim sticking out to the front-right, with a darker underside
      ctx.beginPath(); ctx.ellipse(0.33 * u, 0.04 * u, 0.4 * u, 0.1 * u, 0.06, 0, TAU); paint(grad(-0.06 * u, 0.14 * u, '#3a76cc'), '#2f6cc4');
      ctx.save(); ctx.beginPath(); ctx.ellipse(0.33 * u, 0.04 * u, 0.4 * u, 0.1 * u, 0.06, 0, TAU); ctx.clip();
      ctx.fillStyle = 'rgba(10,30,80,0.35)'; ctx.beginPath(); ctx.ellipse(0.33 * u, 0.1 * u, 0.42 * u, 0.08 * u, 0.06, 0, TAU); ctx.fill(); ctx.restore();
    } else if (id === 'shades') {
      const w = (bao ? 0.38 : 0.25) * u, h = (bao ? 0.27 : 0.17) * u, c = '#2a2d38';
      contact(0, ey + h * 0.7, ex + w * 0.6, h * 0.3);
      [-1, 1].forEach((s) => {
        const x = s * ex;
        ctx.beginPath(); ctx.moveTo(x - w * 0.52, ey - h * 0.55); ctx.lineTo(x + w * 0.52, ey - h * 0.55);
        ctx.quadraticCurveTo(x + w * 0.58, ey + h * 0.62, x, ey + h * 0.62); ctx.quadraticCurveTo(x - w * 0.58, ey + h * 0.62, x - w * 0.52, ey - h * 0.55); ctx.closePath();
        const lg = ctx.createLinearGradient(x - w / 2, ey - h / 2, x + w / 2, ey + h / 2); lg.addColorStop(0, '#5b6478'); lg.addColorStop(0.5, '#262a35'); lg.addColorStop(1, '#14161d');
        ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = LW * 1.3; ctx.strokeStyle = '#111'; ctx.stroke();
        ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = w * 0.12;
        ctx.beginPath(); ctx.moveTo(x - w * 0.35, ey + h * 0.3); ctx.lineTo(x - w * 0.05, ey - h * 0.55); ctx.stroke();
        ctx.lineWidth = w * 0.05; ctx.beginPath(); ctx.moveTo(x - w * 0.1, ey + h * 0.4); ctx.lineTo(x + w * 0.12, ey - h * 0.3); ctx.stroke(); ctx.restore();
        ctx.strokeStyle = '#111'; ctx.lineWidth = LW * 1.4; ctx.beginPath(); ctx.moveTo(x + s * w * 0.5, ey - h * 0.48); ctx.lineTo(x + s * w * 0.95, ey - h * 0.68); ctx.stroke();
      });
      ctx.strokeStyle = '#111'; ctx.lineWidth = LW * 1.4;
      ctx.beginPath(); ctx.moveTo(-ex + w * 0.5, ey - h * 0.42); ctx.quadraticCurveTo(0, ey - h * 0.75, ex - w * 0.5, ey - h * 0.42); ctx.stroke();
    } else if (id === 'bowtie') {
      const y = (g.eyeY + (type === 'gyoza' ? 0.34 : 0.45)) * u, w = 0.21 * u, h = 0.13 * u, c = '#3b5fa6';
      contact(0, y + 0.05 * u, 0.26 * u, 0.07 * u);
      [-1, 1].forEach((s) => {
        ctx.beginPath(); ctx.moveTo(0, y - 0.03 * u); ctx.quadraticCurveTo(s * w * 0.5, y - h * 1.15, s * w, y - h); ctx.quadraticCurveTo(s * w * 1.15, y, s * w, y + h);
        ctx.quadraticCurveTo(s * w * 0.5, y + h * 1.05, 0, y + 0.03 * u); ctx.closePath(); paint(grad(y - h, y + h, c), c);
        ctx.strokeStyle = 'rgba(20,30,70,0.35)'; ctx.lineWidth = LW * 0.7;
        ctx.beginPath(); ctx.moveTo(s * 0.06 * u, y - 0.03 * u); ctx.lineTo(s * w * 0.8, y - h * 0.55); ctx.moveTo(s * 0.06 * u, y + 0.03 * u); ctx.lineTo(s * w * 0.8, y + h * 0.55); ctx.stroke();
        ctx.fillStyle = '#fff'; [[0.55, -0.35], [0.75, 0.3], [0.4, 0.45]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(s * w * dx, y + h * dy, 0.016 * u, 0, TAU); ctx.fill(); });
      });
      roundRect(ctx, -0.055 * u, y - 0.06 * u, 0.11 * u, 0.12 * u, 0.035 * u); paint(grad(y - 0.06 * u, y + 0.06 * u, '#4a6bb0'), c);
    } else if (id === 'headphones') {
      const hw = (type === 'gyoza' ? 1.1 : 0.96) * u, cy = ey + 0.02 * u;
      ctx.strokeStyle = '#1f2229'; ctx.lineWidth = 0.11 * u;
      ctx.beginPath(); ctx.moveTo(-hw * 0.98, cy - 0.05 * u); ctx.bezierCurveTo(-hw * 0.9, top - 0.02 * u, hw * 0.9, top - 0.02 * u, hw * 0.98, cy - 0.05 * u); ctx.stroke();
      ctx.strokeStyle = '#3d4250'; ctx.lineWidth = 0.06 * u; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.02 * u;
      ctx.beginPath(); ctx.moveTo(-hw * 0.7, top + 0.12 * u); ctx.quadraticCurveTo(-hw * 0.4, top + 0.02 * u, 0, top + 0.0 * u); ctx.stroke();
      [-1, 1].forEach((s) => {
        ctx.beginPath(); ctx.ellipse(s * (hw + 0.03 * u), cy, 0.12 * u, 0.21 * u, 0, 0, TAU); paint('#2a8f59', '#2a8f59');
        ctx.beginPath(); ctx.ellipse(s * (hw - 0.02 * u), cy, 0.11 * u, 0.2 * u, 0, 0, TAU); paint(hgrad(s * hw - 0.12 * u, s * hw + 0.12 * u, '#3fbf7a'), '#2a8f59');
        ctx.beginPath(); ctx.ellipse(s * (hw - 0.09 * u), cy, 0.05 * u, 0.15 * u, 0, 0, TAU); ctx.fillStyle = '#23262e'; ctx.fill();
        shine(s * (hw - 0.02 * u) - 0.03 * u, cy - 0.1 * u, 0.025 * u, 0.06 * u, 0.2);
      });
    } else if (id === 'ninja') {
      const y = (g.eyeY - 0.36) * u, w = Math.sin(t * 6) * 0.05 * u;
      const hw = (type === 'gyoza' ? 0.95 : type === 'soup' ? 0.86 : 0.9) * u;
      const c = '#3a4258';
      [[0, 0.3, -0.1], [1, 0.26, 0.12]].forEach(([i, len, dy]) => { // two wide ribbon tails fluttering out the left side
        const ww = i ? -w : w, bx = -hw + 0.06 * u, by = y + 0.06 * u;
        ctx.beginPath(); ctx.moveTo(bx, by - 0.05 * u);
        ctx.bezierCurveTo(bx - len * 0.4 * u, by + (dy - 0.06) * u + ww, bx - len * 0.7 * u, by + (dy - 0.1) * u - ww, bx - len * u, by + dy * u + ww);
        ctx.lineTo(bx - len * 0.92 * u, by + (dy + 0.09) * u + ww);
        ctx.bezierCurveTo(bx - len * 0.65 * u, by + (dy + 0.03) * u - ww, bx - len * 0.35 * u, by + (dy + 0.08) * u + ww, bx, by + 0.06 * u); ctx.closePath();
        paint(grad(by - 0.12 * u, by + 0.2 * u, c), c);
      });
      band(y, 0.15 * u, c);
      const py = y - 0.02 * u;
      roundRect(ctx, -0.21 * u, py - 0.08 * u, 0.42 * u, 0.17 * u, 0.04 * u);
      const pg = ctx.createLinearGradient(0, py - 0.08 * u, 0, py + 0.09 * u); pg.addColorStop(0, '#f4f7fb'); pg.addColorStop(0.5, '#c4ccd8'); pg.addColorStop(1, '#8e98a8');
      paint(pg, '#8e98a8');
      ctx.fillStyle = '#6b7587'; [-0.16, 0.16].forEach((x) => { ctx.beginPath(); ctx.arc(x * u, py, 0.016 * u, 0, TAU); ctx.fill(); });
      ctx.strokeStyle = '#4a5468'; ctx.lineWidth = LW;
      ctx.beginPath(); ctx.moveTo(-0.07 * u, py); ctx.lineTo(0.07 * u, py); ctx.moveTo(0, py - 0.05 * u); ctx.lineTo(0, py + 0.05 * u); ctx.stroke();
      shine(-0.1 * u, py - 0.045 * u, 0.06 * u, 0.012 * u);
    } else if (id === 'viking') {
      const hy = top + (bao ? 0.2 : 0.16) * u;
      contact(0, hy + 0.06 * u, 0.6 * u, 0.12 * u);
      ctx.translate(0, hy);
      [-1, 1].forEach((s) => { // curved horns
        ctx.beginPath(); ctx.moveTo(s * 0.42 * u, -0.14 * u);
        ctx.bezierCurveTo(s * 0.7 * u, -0.16 * u, s * 0.8 * u, -0.42 * u, s * 0.7 * u, -0.66 * u);
        ctx.bezierCurveTo(s * 0.66 * u, -0.46 * u, s * 0.56 * u, -0.34 * u, s * 0.38 * u, -0.32 * u); ctx.closePath();
        const hg = ctx.createLinearGradient(s * 0.4 * u, -0.2 * u, s * 0.7 * u, -0.66 * u); hg.addColorStop(0, '#fff6e2'); hg.addColorStop(0.7, '#ecd9b3'); hg.addColorStop(1, '#c9ae7f');
        paint(hg, '#c9ae7f');
        ctx.strokeStyle = 'rgba(150,120,70,0.4)'; ctx.lineWidth = LW * 0.6;
        for (let k = 1; k < 4; k++) { const f = k / 4; ctx.beginPath(); ctx.moveTo(s * (0.42 + f * 0.25) * u, -(0.16 + f * 0.36) * u); ctx.lineTo(s * (0.4 + f * 0.2) * u, -(0.3 + f * 0.3) * u); ctx.stroke(); }
      });
      ctx.beginPath(); ctx.moveTo(-0.5 * u, 0); ctx.bezierCurveTo(-0.52 * u, -0.6 * u, 0.52 * u, -0.6 * u, 0.5 * u, 0); ctx.closePath();
      const mg = ctx.createRadialGradient(-0.18 * u, -0.38 * u, 0.02 * u, 0, -0.2 * u, 0.6 * u); mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.35, '#cfd6e0'); mg.addColorStop(1, '#8590a2');
      paint(mg, '#6a7486');
      ctx.fillStyle = hgrad(-0.04 * u, 0.04 * u, '#b8875a'); ctx.fillRect(-0.04 * u, -0.43 * u, 0.08 * u, 0.42 * u);
      ctx.beginPath(); ctx.moveTo(-0.53 * u, -0.07 * u); ctx.quadraticCurveTo(0, -0.14 * u, 0.53 * u, -0.07 * u); ctx.lineTo(0.53 * u, 0.04 * u); ctx.quadraticCurveTo(0, -0.03 * u, -0.53 * u, 0.04 * u); ctx.closePath();
      paint(grad(-0.1 * u, 0.04 * u, '#b8875a'), '#7a5530');
      ctx.fillStyle = '#ffd36a'; [-0.38, -0.13, 0.13, 0.38].forEach((x) => { ctx.beginPath(); ctx.arc(x * u, -0.04 * u - 0.03 * u * (1 - Math.abs(x) * 1.5), 0.025 * u, 0, TAU); ctx.fill(); });
    } else if (id === 'mustache') {
      const y = (g.eyeY + (bao ? 0.1 : 0.16)) * u, c = '#6e4428';
      [-1, 1].forEach((s) => {
        ctx.beginPath(); ctx.moveTo(0, y - 0.02 * u);
        ctx.bezierCurveTo(s * 0.1 * u, y - 0.09 * u, s * 0.26 * u, y - 0.06 * u, s * 0.3 * u, y + 0.02 * u);
        ctx.bezierCurveTo(s * 0.34 * u, y - 0.04 * u, s * 0.38 * u, y - 0.06 * u, s * 0.36 * u, y - 0.1 * u);
        ctx.bezierCurveTo(s * 0.44 * u, y - 0.02 * u, s * 0.34 * u, y + 0.08 * u, s * 0.22 * u, y + 0.06 * u);
        ctx.bezierCurveTo(s * 0.12 * u, y + 0.05 * u, s * 0.05 * u, y + 0.03 * u, 0, y + 0.02 * u); ctx.closePath();
        paint(grad(y - 0.1 * u, y + 0.08 * u, c), c);
        shine(s * 0.14 * u, y - 0.04 * u, 0.06 * u, 0.012 * u, s * -0.2);
      });
    } else if (id === 'chef') {
      const cy = top + (bao ? 0.14 : 0.1) * u;
      contact(0, cy + 0.1 * u, 0.5 * u, 0.12 * u);
      ctx.translate(0, cy + 0.06 * u); ctx.scale(1.4, 1.4);
      const puffs = [[-0.22, -0.34, 0.17], [0.22, -0.34, 0.17], [0, -0.46, 0.2], [-0.12, -0.55, 0.15], [0.13, -0.55, 0.15]];
      ctx.lineWidth = LW; ctx.strokeStyle = '#b9c2cc';
      puffs.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * u, y * u, r * u, 0, TAU); ctx.stroke(); });
      const pg = ctx.createRadialGradient(-0.1 * u, -0.6 * u, 0.02 * u, 0, -0.4 * u, 0.45 * u); pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#dfe5ec');
      ctx.fillStyle = pg; puffs.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * u, y * u, r * u, 0, TAU); ctx.fill(); });
      ctx.strokeStyle = 'rgba(150,160,175,0.6)'; ctx.lineWidth = LW * 0.7;
      [[-0.1, -0.32], [0.1, -0.32], [0, -0.5]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * u, y * u, 0.09 * u, 0.6, 2.4); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(-0.27 * u, -0.22 * u); ctx.lineTo(-0.27 * u, 0); ctx.quadraticCurveTo(0, 0.07 * u, 0.27 * u, 0); ctx.lineTo(0.27 * u, -0.22 * u); ctx.quadraticCurveTo(0, -0.17 * u, -0.27 * u, -0.22 * u); ctx.closePath();
      paint(hgrad(-0.27 * u, 0.27 * u, '#f4f6f9'), '#b9c2cc');
      ctx.strokeStyle = 'rgba(150,160,175,0.5)'; ctx.lineWidth = LW * 0.6;
      [-0.12, 0, 0.12].forEach((x) => { ctx.beginPath(); ctx.moveTo(x * u, -0.18 * u); ctx.lineTo(x * u, 0.02 * u); ctx.stroke(); });
    } else if (id === 'party') {
      const c = '#6fc3ff';
      contact(-0.1 * u, top + 0.16 * u, 0.3 * u, 0.08 * u);
      ctx.translate(-0.12 * u, top + 0.16 * u); ctx.rotate(-0.25); ctx.scale(1.3, 1.3);
      ctx.beginPath(); ctx.moveTo(-0.22 * u, 0); ctx.quadraticCurveTo(0, 0.06 * u, 0.22 * u, 0); ctx.lineTo(0, -0.62 * u); ctx.closePath();
      paint(hgrad(-0.22 * u, 0.22 * u, c), c);
      ctx.save(); ctx.clip();
      [['#ffd36a', -0.12], ['#ff7fa8', -0.32], ['#ffd36a', -0.5]].forEach(([col, y]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-0.3 * u, y * u + 0.05 * u); ctx.quadraticCurveTo(0, y * u + 0.1 * u, 0.3 * u, y * u - 0.02 * u); ctx.lineTo(0.3 * u, y * u - 0.08 * u); ctx.quadraticCurveTo(0, y * u + 0.03 * u, -0.3 * u, y * u - 0.01 * u); ctx.fill(); });
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-0.12 * u, -0.6 * u, 0.04 * u, 0.6 * u);
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(-0.22 * u, 0); ctx.quadraticCurveTo(0, 0.06 * u, 0.22 * u, 0); ctx.lineTo(0, -0.62 * u); ctx.closePath(); ctx.lineWidth = LW; ctx.strokeStyle = OL(c); ctx.stroke();
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * 0.05 * u, -0.64 * u + Math.sin(a) * 0.05 * u, 0.045 * u, 0, TAU); ctx.fillStyle = i % 2 ? '#ff7fa8' : '#ff9fc0'; ctx.fill(); }
      shine(-0.02 * u, -0.67 * u, 0.02 * u, 0.012 * u);
    } else if (id === 'flower') {
      const cols = ['#ff9fbf', '#ffd36a', '#9fd8ff', '#c7a5ff', '#ff9f80'];
      const ry = top + (bao ? 0.3 : 0.14) * u;
      ctx.strokeStyle = '#6cae5a'; ctx.lineWidth = 0.05 * u;
      ctx.beginPath(); ctx.moveTo(-0.6 * u, ry + 0.12 * u); ctx.quadraticCurveTo(0, ry - 0.12 * u, 0.6 * u, ry + 0.12 * u); ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.26 * u, y = ry - 0.02 * u + Math.abs(i - 2) * 0.06 * u;
        ctx.fillStyle = '#7cc46a'; ctx.beginPath(); ctx.ellipse(x + 0.08 * u, y + 0.04 * u, 0.05 * u, 0.025 * u, 0.5, 0, TAU); ctx.fill();
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * TAU + t * 0.5 + i;
          ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 0.07 * u, y + Math.sin(a) * 0.07 * u, 0.065 * u, 0.05 * u, a, 0, TAU);
          ctx.fillStyle = grad(y - 0.08 * u, y + 0.08 * u, cols[i]); ctx.fill(); ctx.lineWidth = LW * 0.7; ctx.strokeStyle = OL(cols[i]); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(x, y, 0.045 * u, 0, TAU); ctx.fillStyle = '#fff4c2'; ctx.fill(); ctx.lineWidth = LW * 0.6; ctx.strokeStyle = '#d9a52a'; ctx.stroke();
      }
    } else if (id === 'beret') {
      const c = '#d94a5a';
      contact(-0.05 * u, top + 0.3 * u, 0.62 * u, 0.12 * u);
      ctx.translate(-0.06 * u, top + 0.24 * u); ctx.rotate(-0.16); ctx.scale(1.3, 1.3);
      ctx.beginPath(); ctx.moveTo(-0.46 * u, 0.02 * u); ctx.bezierCurveTo(-0.5 * u, -0.28 * u, 0.48 * u, -0.3 * u, 0.48 * u, -0.02 * u);
      ctx.quadraticCurveTo(0.46 * u, 0.08 * u, 0.2 * u, 0.07 * u); ctx.quadraticCurveTo(-0.2 * u, 0.1 * u, -0.46 * u, 0.02 * u); ctx.closePath();
      paint(grad(-0.28 * u, 0.08 * u, c), c);
      ctx.strokeStyle = 'rgba(120,20,30,0.35)'; ctx.lineWidth = LW * 0.8;
      ctx.beginPath(); ctx.moveTo(-0.42 * u, 0.03 * u); ctx.quadraticCurveTo(0, 0.1 * u, 0.44 * u, 0.0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.02 * u, -0.22 * u); ctx.quadraticCurveTo(0.0, -0.32 * u, 0.04 * u, -0.34 * u); ctx.lineWidth = 0.04 * u; ctx.strokeStyle = shade(c, 0.6); ctx.stroke();
      shine(-0.2 * u, -0.14 * u, 0.12 * u, 0.04 * u, -0.25);
    } else if (id === 'glasses') {
      const r = (bao ? 0.21 : 0.17) * u, c = '#5a4a7a';
      [-1, 1].forEach((s) => {
        ctx.beginPath(); ctx.arc(s * ex, ey, r, 0, TAU); ctx.fillStyle = 'rgba(200,225,255,0.22)'; ctx.fill();
        ctx.lineWidth = 0.045 * u; ctx.strokeStyle = c; ctx.stroke();
        ctx.lineWidth = 0.015 * u; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(s * ex, ey, r - 0.02 * u, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.02 * u; ctx.beginPath(); ctx.moveTo(s * ex - r * 0.4, ey + r * 0.2); ctx.lineTo(s * ex - r * 0.05, ey - r * 0.4); ctx.stroke();
        ctx.strokeStyle = c; ctx.lineWidth = 0.04 * u; ctx.beginPath(); ctx.moveTo(s * (ex + r), ey - r * 0.2); ctx.lineTo(s * (ex + r + 0.12 * u), ey - r * 0.35); ctx.stroke();
      });
      ctx.strokeStyle = c; ctx.lineWidth = 0.04 * u; ctx.beginPath(); ctx.moveTo(-ex + r, ey - 0.02 * u); ctx.quadraticCurveTo(0, ey - 0.09 * u, ex - r, ey - 0.02 * u); ctx.stroke();
    } else if (id === 'crown') {
      const cy = top + (bao ? 0.16 : 0.1) * u, gold = '#ffc93a';
      contact(0, cy + 0.1 * u, 0.55 * u, 0.12 * u);
      ctx.translate(0, cy + 0.05 * u); ctx.scale(1.4, 1.4);
      const pts = [[-0.32, -0.3], [-0.16, -0.17], [0, -0.38], [0.16, -0.17], [0.32, -0.3]];
      ctx.beginPath(); ctx.moveTo(-0.33 * u, 0.0);
      pts.forEach(([x, y], i) => { ctx.lineTo(x * u, y * u); if (i < pts.length - 1) ctx.lineTo((x + 0.08) * u, (i % 2 ? -0.28 : -0.12) * u); });
      ctx.lineTo(0.33 * u, 0); ctx.quadraticCurveTo(0, 0.07 * u, -0.33 * u, 0); ctx.closePath();
      paint(hgrad(-0.33 * u, 0.33 * u, gold), '#d99a00');
      ctx.beginPath(); ctx.moveTo(-0.34 * u, -0.1 * u); ctx.quadraticCurveTo(0, -0.04 * u, 0.34 * u, -0.1 * u); ctx.lineTo(0.34 * u, 0.0); ctx.quadraticCurveTo(0, 0.07 * u, -0.34 * u, 0.0); ctx.closePath();
      paint(grad(-0.1 * u, 0.04 * u, '#ffb81c'), '#d99a00');
      pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * u, y * u - 0.02 * u, 0.035 * u, 0, TAU); paint('#fff6e0', '#d9c7a0'); });
      [['#e8453c', 0], ['#4a8bf0', -0.2], ['#4a8bf0', 0.2]].forEach(([col, x]) => { ctx.beginPath(); ctx.ellipse(x * u, -0.045 * u, 0.04 * u, 0.032 * u, 0, 0, TAU); paint(grad(-0.08 * u, 0, col), col); shine(x * u - 0.012 * u, -0.055 * u, 0.012 * u, 0.008 * u); });
      shine(-0.2 * u, -0.2 * u, 0.02 * u, 0.06 * u, 0.3);
    }
    ctx.restore();
  }

  function particle(ctx, p) {
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
    if (p.kind === 'heart') {
      ctx.fillStyle = p.color || '#ff6f91';
      const s = p.size; ctx.translate(p.x, p.y);
      ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.4, -s, 0, -s * 0.4);
      ctx.bezierCurveTo(s * 0.4, -s, s, -s * 0.4, 0, s * 0.3); ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.16); ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
    } else if (p.kind === 'star') sparkle(ctx, p.x, p.y, p.size, p.color || '#ffd75a', INK);
    else if (p.kind === 'burst') {
      const k = 1 - p.life / p.max, r = p.size * (0.5 + k * 0.9);
      ctx.globalAlpha = 1 - k * k; ctx.lineJoin = 'round';
      burstShape(ctx, p.x, p.y, r, 9, 0.42); ctx.fillStyle = p.color || '#ffe066'; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.strokeStyle = INK; ctx.stroke();
      burstShape(ctx, p.x, p.y, r * 0.6, 9, 0.5); ctx.fillStyle = '#fff'; ctx.fill();
    } else if (p.kind === 'speed') {
      const k = p.life / p.max; ctx.globalAlpha = k * 0.8;
      ctx.strokeStyle = p.color || '#fff'; ctx.lineWidth = p.size; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (p.vx || 0) * 0.08, p.y - (p.vy || 0) * 0.08); ctx.stroke();
    } else if (p.kind === 'text' || p.kind === 'emoji') {
      ctx.font = `${p.bold ? '700' : '600'} ${p.size}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      if (p.kind === 'text') {
        ctx.lineWidth = Math.max(5, p.size * 0.34); ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.strokeText(p.text, p.x, p.y);
        ctx.lineWidth = Math.max(2.5, p.size * 0.14); ctx.strokeStyle = INK; ctx.strokeText(p.text, p.x, p.y);
      }
      ctx.fillStyle = p.color || '#5a4636'; ctx.fillText(p.text, p.x, p.y);
    } else if (p.kind === 'steam') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.5 - p.life / p.max), 0, TAU); ctx.fill();
    } else if (p.kind === 'bubble') {
      ctx.strokeStyle = 'rgba(120,180,255,0.9)'; ctx.fillStyle = 'rgba(220,240,255,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (p.kind === 'confetti') {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.fillStyle = p.color || '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function updateParticles(list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
      if (p.g) p.vy += p.g * dt;
      if (p.rot != null) p.rot += (p.vr || 3) * dt;
      if (p.life <= 0) list.splice(i, 1);
    }
  }
  function confetti(list, x, y, n) {
    const cols = ['#ff7fa8', '#ffd36a', '#6fd3b5', '#7fb2ff', '#c49bff', '#ff9f80'];
    for (let i = 0; i < n; i++) list.push({ kind: 'confetti', x, y, vx: (Math.random() - 0.5) * 500, vy: -200 - Math.random() * 400, g: 600,
      size: 8 + Math.random() * 6, color: cols[i % cols.length], life: 2 + Math.random(), max: 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
  }

  /* ---------- Room ---------- */
  const ROOM = {
    W: 900, H: 520, floorY: 300,
    tub: { x: 25, y: 345, w: 190, h: 125 }, bowl: { x: 248, y: 412, w: 112, h: 76 },
    basket: { x: 505, y: 410, w: 115, h: 80 }, bed: { x: 645, y: 300, w: 250, h: 180 },
    door: { x: 30, y: 58, w: 104, h: 242 }, // front door in the back wall (tap it to go for a walk)
    spots: { home: { x: 450, y: 455 }, bowl: { x: 382, y: 462 }, bed: { x: 772, y: 488 }, tub: { x: 120, y: 430 } },
  };
  DG.ROOM = ROOM;

  /* Two room arrangements. 'wide' is the original landscape room (computers). 'tall' is a narrower room for
     phones, arranged like the cozy portrait design: door on the left, curtained window, wall art on the right,
     the bath front-left, the bed on the right and the rug with the bowl and toy basket in the middle.
     Wall pieces keep their own drawing code and are moved/scaled into place with deco transforms:
     name -> [targetX, targetY, scale, anchorX, anchorY] (the anchor is the piece's point in the wide room). */
  const LAYOUTS = {
    wide: {
      W: 900,
      tub: { x: 25, y: 362, w: 158, h: 107 }, bowl: { x: 286, y: 444, w: 89, h: 58 },
      basket: { x: 520, y: 420, w: 102, h: 83 }, bed: { x: 690, y: 300, w: 182, h: 171 },
      door: { x: 14, y: 62, w: 144, h: 239 },
      spots: { home: { x: 450, y: 455 }, bowl: { x: 400, y: 490 }, bed: { x: 781, y: 490 }, tub: { x: 104, y: 450 } },
      bedO: [636, 312], bedK: 0.207,
      pos: { door: [14, 62], mat: [29, 297], pot: [162, 222], lantern: [205, 28], window: [272, 89], painting: [470, 91],
        poster: [566, 140], clock: [810, 58], shelf: [680, 128], fish: [494, 253], plant: [580, 251] },
      deco: { beanbag: [396, 346, 1, 420, 346], rug: [450, 450, 1, 450, 450] },
    },
    tall: {
      W: 560,
      tub: { x: 14, y: 412, w: 158, h: 107 }, bowl: { x: 190, y: 524, w: 89, h: 58 },
      basket: { x: 444, y: 548, w: 102, h: 83 }, bed: { x: 368, y: 320, w: 182, h: 171 },
      door: { x: 5, y: 62, w: 144, h: 239 },
      spots: { home: { x: 270, y: 462 }, bowl: { x: 234, y: 516 }, bed: { x: 458, y: 500 }, tub: { x: 93, y: 496 } },
      bedO: [339, 345], bedK: 0.172,
      pos: { door: [5, 62], mat: [20, 297], pot: [144, 222], lantern: [131, 28], window: [168, 89], painting: [354, 91],
        poster: [354, 154], clock: [480, 61], shelf: [431, 114], fish: [312, 253], plant: [364, 251] },
      deco: { beanbag: [222, 340, 0.72, 420, 346], rug: [262, 525, 0.86, 450, 450] },
    },
  };
  let BEDO = [648, 300], BEDK = 0.207;
  /** Switch the room arrangement ('wide' or 'tall'); updates every tap area and walking spot in place. */
  DG.setRoomLayout = function (name) {
    const L = LAYOUTS[name] || LAYOUTS.wide;
    if (ROOM.layout === name) return false;
    ROOM.layout = name; ROOM.W = L.W;
    ['tub', 'bowl', 'basket', 'bed', 'door'].forEach((k) => Object.assign(ROOM[k], L[k]));
    Object.keys(L.spots).forEach((k) => Object.assign(ROOM.spots[k], L.spots[k]));
    ROOM.deco = L.deco; ROOM.pos = L.pos; BEDO = L.bedO.slice(); BEDK = L.bedK;
    return true;
  };
  ROOM.layout = null; DG.setRoomLayout('wide');
  DG.bedScale = () => BEDK / 0.207;
  /* Painted room pieces, cut from the cozy room design picture. Sizes are in room units (picture px x SPR_K). */
  const SPR_K = 0.6565;
  const SPR_PX = { door: [220, 364], window: [289, 238], lantern: [100, 215], painting: [112, 81], poster: [113, 132], clock: [98, 97],
    shelf: [185, 218], fish: [89, 129], plant: [140, 140], pot: [97, 127], mat: [172, 43], bath: [240, 163], bowl: [136, 88], basket: [156, 126], bed: [279, 258] };
  const SPR = {};
  if (typeof Image !== 'undefined') Object.keys(SPR_PX).forEach((n) => {
    const im = new Image(); im.decoding = 'async'; im.src = (window.DG_ASSETS && window.DG_ASSETS[`img/rm_${n}.webp`]) || `img/rm_${n}.webp?v=6`; // the one-file build bundles these
    SPR[n] = { im, w: SPR_PX[n][0] * SPR_K, h: SPR_PX[n][1] * SPR_K };
  });
  const sprReady = () => Object.keys(SPR).length && Object.values(SPR).every((o) => o.im.complete && o.im.naturalWidth);
  function spr(ctx, n, x, y) { const o = SPR[n]; if (o) ctx.drawImage(o.im, x, y, o.w, o.h); }
  function sprAt(ctx, n) { const p = ROOM.pos[n]; spr(ctx, n, p[0], p[1]); }
  /* ===== The view through the window: live time of day and weather ===== */
  DG.devSky = null; // dev-only: { hour, weather }
  const frac = (x) => x - Math.floor(x);
  /** Real sunrise and sunset for today (mid-northern latitude, ~40°N): days are ~9½ h in December and ~15 h in June.
      Daylight saving moves the clock an hour later in summer. */
  DG.sunTimes = function (d) {
    d = d || new Date(DG.now());
    const y0 = new Date(d.getFullYear(), 0, 1), doy = (d - y0) / 864e5;
    const len = 12.15 + 2.85 * Math.sin(TAU * (doy - 80) / 365.25);
    const jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset(), jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset();
    const dst = Math.max(jan, jul) !== d.getTimezoneOffset() ? 1 : 0, noon = 12 + dst;
    return { rise: noon - len / 2, set: noon + len / 2, noon };
  };
  /** Converts the real clock into the sky's own day (sun up at 6.2, high at 12.7, down at 19.2), so the window matches the real sunrise and sunset. */
  function skyHour(d) {
    const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600, { rise, set, noon } = DG.sunTimes(d);
    if (h >= rise && h <= noon) return 6.2 + (h - rise) / (noon - rise) * 6.5;
    if (h > noon && h <= set) return 12.7 + (h - noon) / (set - noon) * 6.5;
    const nightLen = 24 - (set - rise), since = h > set ? h - set : h + 24 - set; // through the night
    return (19.2 + since / nightLen * 11) % 24;
  }
  /** Local hour (fractional) and the weather. Weather (clear or rain) changes every 3 hours, fading over 10 minutes. */
  DG.skyNow = function () {
    const now = DG.now(), d = new Date(now);
    let h = skyHour(d);
    if (DG.devSky && DG.devSky.hour != null) h = DG.devSky.hour; else if (DG.devNight != null) h = DG.devNight ? 23 : 13;
    const BL = 3 * 3600e3, blk = Math.floor(now / BL), wet = (b) => frac(Math.sin(b * 12.9898 + 4.1) * 43758.5453) < 0.2;
    let w = wet(blk) ? 'rain' : 'clear';
    const into = (now - blk * BL) / 60e3, left = 180 - into; // minutes into / left in this spell
    let rain = w === 'rain' ? Math.min(1, wet(blk - 1) ? 1 : into / 10, wet(blk + 1) ? 1 : left / 10) : 0;
    if (DG.devSky && DG.devSky.weather) { w = DG.devSky.weather; rain = w === 'rain' ? 1 : 0; }
    return { h, w, rain };
  };
  /** 0 at night … 1 in full day, and how golden the light is (sunrise / sunset). */
  DG.skyLight = function () {
    const { h, w, rain } = DG.skyNow();
    const day = h < 5.5 || h > 20.8 ? 0 : h < 7.5 ? (h - 5.5) / 2 : h > 18.5 ? (20.8 - h) / 2.3 : 1;
    const warm = Math.max(0, 1 - Math.abs(h - 6.6) / 1.2, 1 - Math.abs(h - 18.9) / 1.3);
    return { day, warm, wet: rain > 0.5, rain, w };
  };
  /* Night and rainy versions of the door and window (your art), faded in over the day ones. */
  const SKYV = {};
  if (typeof Image !== 'undefined') ['door_night', 'door_rain', 'window_night', 'window_rain'].forEach((n) => {
    const im = new Image(); im.decoding = 'async'; im.src = (window.DG_ASSETS && window.DG_ASSETS[`img/rm_${n}.webp`]) || `img/rm_${n}.webp?v=1`; SKYV[n] = im;
  });
  const vOk = (n) => SKYV[n] && SKYV[n].complete && SKYV[n].naturalWidth;
  /** Draws the door or window for the current light: day art, with rain and night versions faded on top. */
  function skyVariant(ctx, n) {
    sprAt(ctx, n);
    const L = DG.skyLight(), p = ROOM.pos[n], o = SPR[n];
    const night = 1 - L.day, rain = L.rain * L.day;
    ctx.save();
    if (rain > 0.01 && vOk(n + '_rain')) { ctx.globalAlpha = Math.min(1, rain); ctx.drawImage(SKYV[n + '_rain'], p[0], p[1], o.w, o.h); }
    if (night > 0.01 && vOk(n + '_night')) { ctx.globalAlpha = Math.min(1, night); ctx.drawImage(SKYV[n + '_night'], p[0], p[1], o.w, o.h); }
    ctx.restore();
  }

  /** A cream part (curtains, door frame) recoloured toward the wall colour; cached per colour. */
  const TINTS = {};
  function tinted(n, color) {
    const key = n + color; if (TINTS[key]) return TINTS[key];
    const o = SPR[n], c = document.createElement('canvas'); c.width = o.im.naturalWidth; c.height = o.im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(o.im, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(o.im, 0, 0);
    return (TINTS[key] = c);
  }
  const RECOL = {};
  function recoloured(n, color) {
    const key = n + color; if (RECOL[key]) return RECOL[key];
    const o = SPR[n], c = document.createElement('canvas'); c.width = o.im.naturalWidth; c.height = o.im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(o.im, 0, 0); x.globalCompositeOperation = 'color'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(o.im, 0, 0);
    return (RECOL[key] = c);
  }
  function tintAt(ctx, n, at, color) { const p = ROOM.pos[at], o = SPR[n]; ctx.drawImage(tinted(n, color), p[0], p[1], o.w, o.h); }
  /** Soft contact shadow so pieces sit on the floor. */
  function floorShadow(ctx, cx, y, rx, ry, a) {
    const g = ctx.createRadialGradient(cx, y, 1, cx, y, rx);
    g.addColorStop(0, `rgba(110,60,30,${a || 0.28})`); g.addColorStop(1, 'rgba(110,60,30,0)');
    ctx.save(); ctx.translate(cx, y); ctx.scale(1, ry / rx); ctx.translate(-cx, -y);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, y, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  /** Twinkling 4-point sparkles scattered around the room. */
  function twinkles(ctx, W, H, t, n) {
    for (let i = 0; i < n; i++) {
      const cyc = 2.6 + (i % 5) * 0.45, ph = ((t + i * 0.77) % cyc) / cyc, life = Math.sin(ph * Math.PI);
      if (life <= 0.05) continue;
      const seed = Math.floor((t + i * 0.77) / cyc) * 13 + i * 7;
      const x = (Math.sin(seed * 12.9898) * 43758.5453 % 1 + 1) % 1 * W, y = (Math.sin(seed * 78.233) * 12543.231 % 1 + 1) % 1 * H;
      ctx.globalAlpha = life * 0.9; sparkle(ctx, x, y, 3 + life * 5, '#fffbe6'); ctx.globalAlpha = 1;
    }
  }
  /** Bubbles in the painted bath: the foam bobs, and now and then a bubble floats up and pops. */
  function bubble(ctx, x, y, r, a) {
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#f2f9ff'); g.addColorStop(1, '#cfe6fb');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,170,220,0.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.18, -0.6, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  const FOAM = [[44, 20, 7], [62, 14, 8], [80, 18, 9], [98, 12, 8], [116, 17, 9], [134, 13, 9.5], [146, 22, 7.5], [56, 27, 6], [90, 27, 6.5], [124, 27, 6.5]];
  function tubBubbles(ctx, b, t) {
    ctx.save();
    FOAM.forEach(([x, y, r], i) => bubble(ctx, b.x + x + Math.sin(t * 1.6 + i) * 1.2, b.y + y + Math.sin(t * 2.2 + i * 1.3) * 1.6, r * (1 + Math.sin(t * 1.9 + i * 2) * 0.06), 0.95));
    for (let i = 0; i < 4; i++) { // rising bubbles
      const cyc = 3.2 + i * 0.7, k = ((t + i * 1.1) % cyc) / cyc, x = b.x + 40 + i * 30 + Math.sin(t * 2 + i) * 5, y = b.y + 14 - k * 46;
      if (k < 0.9) bubble(ctx, x, y, 3 + i % 2 * 1.5, 0.85 * (1 - k));
      else { ctx.strokeStyle = `rgba(200,230,255,${(1 - k) * 8})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 6 + (k - 0.9) * 40, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }
  /** Draw a wall/floor piece moved into place for the current layout. */
  function place(ctx, name, fn) {
    const L = ROOM.deco && ROOM.deco[name];
    if (!L) { fn(); return; }
    ctx.save(); ctx.translate(L[0], L[1]); ctx.scale(L[2], L[2]); ctx.translate(-L[3], -L[4]); fn(); ctx.restore();
  }

  /** Wall colors from any picked color: a light base, a slightly deeper pattern tone and a trim. */
  function customWall(hex) {
    const [r, g, b] = hexRgb(hex), lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const dark = lum < 0.45;
    return { a: hex, b: dark ? shade(hex, 1.12) : shade(hex, 0.93), trim: shade(hex, dark ? 0.7 : 0.8), dark };
  }
  const WALL_DY = 0;
  /** The wall colours for a home's settings (handles the custom colour too). */
  function wallColors(home) {
    home = home || {};
    const w = DG.WALLS[home.wall] || DG.WALLS.peach;
    return w.custom ? customWall(home.wallColor || w.a) : w;
  }
  /** The front door: an arched wooden door in a cream casing with gold trim and a leafy garland, a little arched
      window, mail slot, carved panels and a round brass knob. `open` (0..1) swings it inwards to show the garden. */
  function frontDoor(ctx, open, night, t) {
    const { x, y, w, h } = ROOM.door, b = y + h, r = w / 2, cx = x + w / 2, ink = '#5a3519';
    const archPath = (l, rr, top, bottom) => { ctx.beginPath(); ctx.moveTo(l, bottom); ctx.lineTo(l, top + rr); ctx.arc(l + rr, top + rr, rr, Math.PI, TAU); ctx.lineTo(l + rr * 2, bottom); ctx.closePath(); };
    ctx.save(); ctx.lineJoin = 'round';
    // casing
    ctx.fillStyle = 'rgba(80,50,25,0.14)'; archPath(x - 14, r + 14, y - 10, b); ctx.fill();
    const cg = ctx.createLinearGradient(x - 16, 0, x + w + 16, 0); cg.addColorStop(0, '#fff3e2'); cg.addColorStop(0.5, '#fffaf2'); cg.addColorStop(1, '#f3e2cb');
    ctx.fillStyle = cg; ctx.strokeStyle = '#d9bf98'; ctx.lineWidth = 2; archPath(x - 16, r + 16, y - 16, b); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#e2b55a'; ctx.lineWidth = 2; archPath(x - 9, r + 9, y - 9, b); ctx.stroke();
    // keystone (plain, no heart)
    ctx.fillStyle = '#fff6e8'; ctx.strokeStyle = '#d9bf98'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 11, y - 20); ctx.lineTo(cx + 11, y - 20); ctx.lineTo(cx + 7, y - 2); ctx.lineTo(cx - 7, y - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    // plinths
    ctx.fillStyle = '#f3e2cb'; [x - 18, x + w + 2].forEach((px) => { roundRect(ctx, px, b - 26, 16, 26, 3); ctx.fill(); ctx.stroke(); });
    // opening: the garden outside
    ctx.save(); archPath(x, r, y, b); ctx.clip();
    const sky = ctx.createLinearGradient(0, y, 0, b);
    sky.addColorStop(0, night ? '#283066' : '#a8dcff'); sky.addColorStop(0.62, night ? '#47508f' : '#e6f6ff');
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = night ? '#3c6b4a' : '#8fd27c'; ctx.fillRect(x, b - 70, w, 70);
    ctx.fillStyle = night ? '#2f5a3c' : '#72bf63';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 14 + i * 28, b - 70, 18, Math.PI, TAU); ctx.fill(); }
    ctx.fillStyle = night ? '#8a7a66' : '#e9d3ad'; ctx.beginPath(); ctx.moveTo(x + w * 0.38, b - 70); ctx.lineTo(x + w * 0.62, b - 70); ctx.lineTo(x + w * 0.85, b); ctx.lineTo(x + w * 0.15, b); ctx.fill();
    ctx.fillStyle = night ? '#fff6c2' : '#ffe17a'; ctx.beginPath(); ctx.arc(x + w * 0.7, y + 50, 10, 0, TAU); ctx.fill();
    ctx.restore();
    // the door slab, hinged on the left; it narrows as it swings open
    const k = 1 - 0.82 * open, dw = w * k;
    ctx.save(); ctx.translate(x, 0); ctx.scale(k, 1); ctx.translate(-x, 0);
    const wood = ctx.createLinearGradient(x, 0, x + w, 0);
    wood.addColorStop(0, '#a8662f'); wood.addColorStop(0.5, '#c27c41'); wood.addColorStop(1, '#9e5e2c');
    archPath(x, r, y, b); ctx.fillStyle = wood; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    if (open < 0.6) {
      ctx.save(); archPath(x, r, y, b); ctx.clip();
      ctx.strokeStyle = 'rgba(90,45,15,0.18)'; ctx.lineWidth = 1.2; // wood grain
      for (let gx = x + 12; gx < x + w; gx += 16) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + 2, b); ctx.stroke(); }
      // little arched window, four panes
      const ww = w * 0.58, wl = cx - ww / 2, wt = y + 14, wh = h * 0.3;
      ctx.fillStyle = '#7a4520'; archPath(wl - 4, ww / 2 + 4, wt - 4, wt + wh + 4); ctx.fill();
      const gl = ctx.createLinearGradient(0, wt, 0, wt + wh); gl.addColorStop(0, night ? '#3b4386' : '#bfe6ff'); gl.addColorStop(1, night ? '#5a62a8' : '#eef9ff');
      ctx.fillStyle = gl; archPath(wl, ww / 2, wt, wt + wh); ctx.fill();
      ctx.strokeStyle = '#e8b27a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx, wt + 2); ctx.lineTo(cx, wt + wh); ctx.moveTo(wl, wt + wh * 0.58); ctx.lineTo(wl + ww, wt + wh * 0.58); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(wl + ww * 0.28, wt + wh * 0.4, 3, 9, 0.4, 0, TAU); ctx.fill();
      // mail slot
      const my = wt + wh + 16;
      ctx.fillStyle = '#f2c45a'; ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 1.5; roundRect(ctx, cx - 20, my, 40, 8, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a6420'; ctx.fillRect(cx - 14, my + 3, 28, 2);
      // carved lower panels with a wheat sprig
      const pt = my + 22, ph = b - pt - 16, pw = w / 2 - 16;
      [x + 10, cx + 6].forEach((px) => {
        ctx.fillStyle = 'rgba(70,35,10,0.22)'; roundRect(ctx, px, pt, pw, ph, 6); ctx.fill();
        ctx.fillStyle = '#b87038'; roundRect(ctx, px + 3, pt + 3, pw - 6, ph - 6, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,170,0.25)'; ctx.fillRect(px + 4, pt + 4, pw - 8, 2.5);
        const sx = px + pw / 2, sy0 = pt + ph - 10, sy1 = pt + 12;
        ctx.strokeStyle = '#8a4f22'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy0); ctx.lineTo(sx, sy1); ctx.stroke();
        ctx.fillStyle = '#e0a45f';
        for (let yy = sy1 + 4; yy < sy0 - 6; yy += 8) [-1, 1].forEach((sd) => { ctx.beginPath(); ctx.ellipse(sx + sd * 4, yy, 4, 2.2, sd * 0.6, 0, TAU); ctx.fill(); });
      });
      ctx.restore();
    }
    ctx.restore();
    if (open < 0.6) { // round brass knob
      const kx = x + dw - 12, ky = y + h * 0.58;
      const kg = ctx.createRadialGradient(kx - 2, ky - 2, 1, kx, ky, 8); kg.addColorStop(0, '#fff1b8'); kg.addColorStop(1, '#e0a92e');
      ctx.fillStyle = '#c9902a'; ctx.beginPath(); ctx.arc(kx, ky, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(kx, ky, 6.5, 0, TAU); ctx.fill();
    }
    // leafy garland over the arch (leaves only)
    const sw = Math.sin(t * 1.3) * 0.04;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI, gx = cx + Math.cos(a) * (r + 16), gy = y + r + Math.sin(a) * (r + 16) - 4;
      if (i > 3 && i < 7) continue; // keep the keystone clear
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(a + Math.PI / 2 + sw + (i % 2 ? 0.5 : -0.5));
      ctx.fillStyle = i % 2 ? '#6cbf7a' : '#4f9e5c'; ctx.beginPath(); ctx.ellipse(0, -6, 5, 10, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -13); ctx.stroke();
      ctx.restore();
    }
    // threshold
    ctx.fillStyle = '#e8d8c2'; ctx.strokeStyle = '#c4ae90'; ctx.lineWidth = 1.5; ctx.fillRect(x - 18, b - 5, w + 36, 7); ctx.strokeRect(x - 18, b - 5, w + 36, 7);
    // potted flowers beside the door
    const fx = x + w + 34, fy = b + 4;
    ctx.fillStyle = 'rgba(80,50,25,0.18)'; ctx.beginPath(); ctx.ellipse(fx, fy, 18, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e0825a'; ctx.strokeStyle = '#a4583a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx - 15, fy - 28); ctx.lineTo(fx + 15, fy - 28); ctx.lineTo(fx + 11, fy); ctx.lineTo(fx - 11, fy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ee9a72'; roundRect(ctx, fx - 17, fy - 33, 34, 7, 3); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(fx, fy - 33); ctx.rotate(sw);
    [['#4f9e5c', 0, -16, 15], ['#62b46c', -12, -9, 11], ['#62b46c', 12, -10, 11]].forEach(([c, dx, dy, rr]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(dx, dy, rr, 0, TAU); ctx.fill(); });
    [[-10, -16], [6, -24], [12, -10], [-2, -8]].forEach(([dx, dy]) => {
      ctx.fillStyle = '#ffb3c6'; for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; ctx.beginPath(); ctx.arc(dx + Math.cos(a) * 3.2, dy + Math.sin(a) * 3.2, 2.8, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, TAU); ctx.fill();
    });
    ctx.restore();
    ctx.restore();
  }
  function doorMat(ctx) {
    const { x, w, y, h } = ROOM.door, cx = x + w / 2, my = y + h + 14;
    ctx.save();
    ctx.fillStyle = 'rgba(80,50,25,0.15)'; ctx.beginPath(); ctx.ellipse(cx, my + 4, 62, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c98f52'; ctx.beginPath(); ctx.moveTo(cx - 50, my - 9); ctx.lineTo(cx + 50, my - 9); ctx.lineTo(cx + 58, my + 9); ctx.lineTo(cx - 58, my + 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9a6a35'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,210,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx - 45, my - 5); ctx.lineTo(cx + 45, my - 5); ctx.lineTo(cx + 51, my + 6); ctx.lineTo(cx - 51, my + 6); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  /** Arched wooden window with tied-back curtains; garden view by day, moon and stars at night. */
  function archWindow(ctx, night, t) {
    const cx = 355, hw = 84, top = 34, ay = top + hw, bot = 192, ink = '#8a5a32';
    const arch = (inset) => { ctx.beginPath(); ctx.moveTo(cx - hw + inset, bot - inset); ctx.lineTo(cx - hw + inset, ay); ctx.arc(cx, ay, hw - inset, Math.PI, TAU); ctx.lineTo(cx + hw - inset, bot - inset); ctx.closePath(); };
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(90,50,25,0.15)'; ctx.save(); ctx.translate(4, 6); arch(-6); ctx.fill(); ctx.restore();
    const fr = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0); fr.addColorStop(0, '#d79a5c'); fr.addColorStop(0.5, '#e8b27a'); fr.addColorStop(1, '#c98a4f');
    arch(-6); ctx.fillStyle = fr; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    // the view
    ctx.save(); arch(5); ctx.clip();
    const sky = ctx.createLinearGradient(0, top, 0, bot);
    sky.addColorStop(0, night ? '#2b3170' : '#8fd0ff'); sky.addColorStop(1, night ? '#4b4f98' : '#e3f6ff');
    ctx.fillStyle = sky; ctx.fillRect(cx - hw, top, hw * 2, bot - top);
    if (night) {
      ctx.fillStyle = '#fff6c2'; ctx.beginPath(); ctx.arc(cx + 40, 74, 15, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3b4086'; ctx.beginPath(); ctx.arc(cx + 47, 69, 13, 0, TAU); ctx.fill();
      for (let i = 0; i < 9; i++) sparkle(ctx, cx - 70 + (i * 53) % 140, 52 + (i * 37) % 80, 3 + Math.sin(t * 3 + i) * 1.4, '#fff');
    } else {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 2; i++) {
        const x = cx - hw + ((t * 10 + i * 100) % (hw * 2 + 80)) - 40, y = 78 + i * 30;
        ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.arc(x + 13, y - 5, 13, 0, TAU); ctx.arc(x + 27, y, 10, 0, TAU); ctx.fill();
      }
    }
    // treetops and bushes outside
    [[cx - 62, 172, 30, '#7cc56f'], [cx - 22, 160, 34, '#8fd27c'], [cx + 30, 166, 32, '#7cc56f'], [cx + 70, 176, 26, '#8fd27c']].forEach(([x, y, r, c]) => {
      ctx.fillStyle = night ? shade(c, 0.55) : c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = night ? '#3c6b4a' : '#a6dc8e'; ctx.fillRect(cx - hw, 180, hw * 2, 20);
    ctx.restore();
    // glazing bars
    ctx.strokeStyle = '#e8b27a'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx, top + 4); ctx.lineTo(cx, bot - 4); ctx.moveTo(cx - hw + 4, 124); ctx.lineTo(cx + hw - 4, 124); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, ay, hw * 0.48, Math.PI, TAU); ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2; arch(5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(cx - 60, 70); ctx.lineTo(cx - 40, 70); ctx.lineTo(cx - 70, 150); ctx.lineTo(cx - 80, 150); ctx.fill();
    // sill
    const sg = ctx.createLinearGradient(0, bot, 0, bot + 14); sg.addColorStop(0, '#fff6ea'); sg.addColorStop(1, '#efd9bf');
    ctx.fillStyle = sg; roundRect(ctx, cx - hw - 20, bot - 2, hw * 2 + 40, 14, 6); ctx.fill(); ctx.strokeStyle = '#d6b893'; ctx.lineWidth = 1.5; ctx.stroke();
    // curtain rod
    ctx.fillStyle = '#c98a4f'; roundRect(ctx, cx - hw - 44, top - 14, hw * 2 + 88, 7, 3.5); ctx.fill();
    ctx.fillStyle = '#e8b27a'; [cx - hw - 46, cx + hw + 46].forEach((x) => { ctx.beginPath(); ctx.arc(x, top - 10.5, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke(); });
    // curtains, tied back with pink ribbons
    [-1, 1].forEach((sd) => {
      const ox = cx + sd * (hw + 36), ix = cx + sd * (hw - 6), tie = 132, sw = Math.sin(t * 0.8 + sd) * 1.5;
      ctx.beginPath();
      ctx.moveTo(ox + sd * 8, top - 10); ctx.lineTo(ix - sd * 4, top - 10);
      ctx.quadraticCurveTo(ix - sd * 10, 86, ox - sd * 6 + sw, tie);
      ctx.quadraticCurveTo(ix - sd * 2 + sw, 176, ix + sd * 10 + sw, bot + 18);
      ctx.lineTo(ox + sd * 14 + sw, bot + 18);
      ctx.quadraticCurveTo(ox + sd * 4, tie + 10, ox + sd * 8, top - 10);
      ctx.closePath();
      const cg = ctx.createLinearGradient(ox - 30, 0, ox + 30, 0); cg.addColorStop(0, '#fffaf2'); cg.addColorStop(0.5, '#fbeedd'); cg.addColorStop(1, '#fffaf2');
      ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = '#e3cbb0'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(210,180,150,0.5)'; ctx.lineWidth = 1.4;
      [0.3, 0.6].forEach((k) => { ctx.beginPath(); ctx.moveTo(ox + (ix - ox) * k, top - 6); ctx.quadraticCurveTo(ox + (ix - ox) * k * 0.5, tie - 10, ox - sd * 2, tie); ctx.stroke(); });
      ctx.fillStyle = '#f7a3b3'; ctx.strokeStyle = '#d97088'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(ox - sd * 4 + sw, tie, 9, 6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox - sd * 4 + sw, tie + 4); ctx.lineTo(ox - sd * 9 + sw, tie + 18); ctx.lineTo(ox + sd * 1 + sw, tie + 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }
  function room(ctx, o) {
    const { W, H, floorY } = ROOM, t = o.t || 0, decor = o.decor || [];
    const E = o.top || 0, F = o.bottom || 0, Hf = H + F; // extra wall above / extra floor below (tall phone view)
    const home = o.home || {};
    let wall = DG.WALLS[home.wall] || DG.WALLS.peach; const pat = home.pattern || 'stripes';
    if (wall.custom) wall = customWall(home.wallColor || wall.a);
    const flo = DG.FLOORS[home.floor] || DG.FLOORS.wood;
    // wall (tiled upwards when the view is taller than the room)
    const wallPaint = () => {
    ctx.fillStyle = wall.a; ctx.fillRect(0, 0, W, floorY);
    ctx.fillStyle = wall.b;
    if (pat === 'stripes') for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 28, floorY);
    else if (pat === 'dots') { for (let y = 20; y < floorY - 40; y += 44) for (let x = ((y / 44) % 2) * 30 + 15; x < W; x += 60) { ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill(); } }
    else if (pat === 'hearts') { for (let y = 26; y < floorY - 40; y += 52) for (let x = ((y / 52 | 0) % 2) * 35 + 20; x < W; x += 70) heartShape(ctx, x, y, 10); }
    else if (pat === 'stars') { for (let y = 24; y < floorY - 40; y += 50) for (let x = ((y / 50 | 0) % 2) * 32 + 18; x < W; x += 64) sparkle(ctx, x, y, 9, wall.dark ? 'rgba(255,240,180,0.55)' : wall.b); }
    else if (pat === 'plaid') {
      ctx.globalAlpha = 0.7; for (let x = 0; x < W; x += 70) ctx.fillRect(x, 0, 26, floorY);
      for (let y = 0; y < floorY; y += 70) ctx.fillRect(0, y, W, 26);
      ctx.globalAlpha = 1; ctx.strokeStyle = wall.trim; ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
      for (let x = 13; x < W; x += 70) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, floorY); ctx.stroke(); }
      for (let y = 13; y < floorY; y += 70) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (pat === 'brick') {
      ctx.strokeStyle = wall.b; ctx.lineWidth = 4;
      for (let r = 0, y = 0; y < floorY; y += 34, r++) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        for (let x = (r % 2) * 40; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 34); ctx.stroke(); }
      }
    } else if (pat === 'planks') {
      for (let x = 0; x < W; x += 56) { ctx.fillRect(x, 0, 3, floorY); ctx.globalAlpha = 0.35; ctx.fillRect(x + 6, 0, 46, floorY); ctx.globalAlpha = 1; }
      ctx.fillRect(0, floorY - 110, W, 8);
    } else if (pat === 'zigzag') {
      ctx.strokeStyle = wall.b; ctx.lineWidth = 9; ctx.lineJoin = 'round';
      for (let y = 30; y < floorY - 40; y += 48) { ctx.beginPath(); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, y + ((x / 30) % 2 ? 12 : -12)); ctx.stroke(); }
    } else if (pat === 'diamonds') {
      for (let y = 0, r = 0; y < floorY; y += 40, r++) for (let x = (r % 2) * 30; x < W + 30; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 18); ctx.lineTo(x - 14, y); ctx.closePath(); ctx.fill();
      }
    } else if (pat === 'clouds') {
      for (let y = 40, r = 0; y < floorY - 40; y += 70, r++) for (let x = (r % 2) * 70 + 20; x < W; x += 140) {
        ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.arc(x + 15, y - 7, 15, 0, TAU); ctx.arc(x + 32, y, 12, 0, TAU); ctx.fill();
        ctx.fillRect(x, y, 32, 12);
      }
    } else if (pat === 'rockets') {
      for (let y = 46, r = 0; y < floorY - 40; y += 80, r++) for (let x = (r % 2) * 60 + 30; x < W; x += 120) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(0.6);
        ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(9, -8, 7, 10); ctx.lineTo(-7, 10); ctx.quadraticCurveTo(-9, -8, 0, -18); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(-13, 14); ctx.lineTo(-7, 12); ctx.moveTo(7, 4); ctx.lineTo(13, 14); ctx.lineTo(7, 12); ctx.fill();
        ctx.restore();
        sparkle(ctx, x + 40, y + 22, 5, ctx.fillStyle);
      }
    }
    };
    const WT = floorY - 36;
    for (let k = 1; (k - 1) * WT < E; k++) { ctx.save(); ctx.translate(0, -k * WT); ctx.beginPath(); ctx.rect(0, 0, W, WT); ctx.clip(); wallPaint(); ctx.restore(); }
    wallPaint();
    if (!(sprReady() && !o.vector)) { // the painted room has its own skirting board right at the floor
      ctx.fillStyle = wall.trim; ctx.fillRect(0, floorY - 36, W, 36);
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, floorY - 38, W, 5);
    }
    // window + wall decorations sit a bit lower, clear of the floating button bar
    ctx.save(); ctx.translate(0, WALL_DY);
    const night = DG.isNight ? DG.isNight() : false;
    const useSpr = sprReady() && !o.vector; ROOM.painted = useSpr;
    if (useSpr) {
      // soft light on the wall around the window, and a cream skirting board
      const wp = ROOM.pos.window, wcx = wp[0] + SPR.window.w / 2;
      const wl = ctx.createRadialGradient(wcx, 150, 20, wcx, 150, W * 0.55);
      const SL = DG.skyLight(), wlc = SL.day < 0.35 ? 'rgba(160,170,255,0.12)' : SL.warm > 0.3 ? `rgba(255,190,130,${0.3 * SL.day + 0.1})` : `rgba(255,250,235,${(SL.wet ? 0.18 : 0.45) * SL.day})`;
      wl.addColorStop(0, wlc); wl.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.fillStyle = wl; ctx.fillRect(0, -E, W, floorY + E);
      const sk = ctx.createLinearGradient(0, floorY - 14, 0, floorY); sk.addColorStop(0, '#fffaf2'); sk.addColorStop(1, '#ecd6bd');
      ctx.fillStyle = sk; ctx.fillRect(0, floorY - 14, W, 14);
      ctx.fillStyle = 'rgba(150,90,50,0.18)'; ctx.fillRect(0, floorY - 15, W, 1.5); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(0, floorY - 13.5, W, 1.5);
      ctx.fillStyle = 'rgba(110,60,30,0.22)'; ctx.fillRect(0, floorY, W, 3); // where the floor meets the board
      skyVariant(ctx, 'window'); // day, rain or night art
      // the door, with the garden showing through as it swings open
      const dp = ROOM.pos.door; skyVariant(ctx, 'door');
      if (o.doorOpen > 0.02) {
        const dx = dp[0] + SPR.door.w * 0.2, dw = SPR.door.w * 0.6, dy = dp[1] + SPR.door.h * 0.14, dh = SPR.door.h * 0.8;
        ctx.save(); ctx.globalAlpha = Math.min(1, o.doorOpen * 1.3);
        ctx.beginPath(); ctx.moveTo(dx, dy + dh); ctx.lineTo(dx, dy + dw / 2); ctx.arc(dx + dw / 2, dy + dw / 2, dw / 2, Math.PI, TAU); ctx.lineTo(dx + dw, dy + dh); ctx.closePath(); ctx.clip();
        const gs = ctx.createLinearGradient(0, dy, 0, dy + dh); gs.addColorStop(0, night ? '#283066' : '#a8dcff'); gs.addColorStop(0.65, night ? '#47508f' : '#eaf8ff');
        ctx.fillStyle = gs; ctx.fillRect(dx, dy, dw, dh);
        ctx.fillStyle = night ? '#3c6b4a' : '#8fd27c'; ctx.fillRect(dx, dy + dh - 50, dw, 50);
        ctx.fillStyle = night ? '#2f5a3c' : '#72bf63'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(dx + 10 + i * 24, dy + dh - 50, 14, Math.PI, TAU); ctx.fill(); }
        ctx.restore();
      }
    } else place(ctx, 'window', () => archWindow(ctx, night, t));
    if (!useSpr) frontDoor(ctx, o.doorOpen || 0, night, t);
    // decor: wall pieces
    if (decor.includes('lights')) {
      ctx.strokeStyle = '#7a6a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 18);
      for (let x = 0; x <= W; x += 90) ctx.quadraticCurveTo(x + 45, 48, x + 90, 18);
      ctx.stroke();
      const cs = ['#ff8fa8', '#ffd36a', '#8fe0c0', '#9fc4ff'];
      for (let x = 20; x < W; x += 45) {
        const k = (x % 90) / 90, y = 18 + Math.sin(k * Math.PI) * 22;
        ctx.fillStyle = cs[(x / 45 | 0) % 4]; ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 3 + x);
        ctx.beginPath(); ctx.arc(x, y + 8, 6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    if (useSpr) {
      if (decor.includes('lantern')) { const lp = ROOM.pos.lantern; ctx.save(); ctx.translate(lp[0] + SPR.lantern.w / 2, lp[1]); ctx.rotate(Math.sin(t * 1.2) * 0.03); ctx.translate(-(lp[0] + SPR.lantern.w / 2), -lp[1]);
        ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lp[0] + SPR.lantern.w / 2, lp[1] - E - 30); ctx.lineTo(lp[0] + SPR.lantern.w / 2, lp[1] + 4); ctx.stroke();
        sprAt(ctx, 'lantern'); ctx.restore();
        const lg2 = ctx.createRadialGradient(lp[0] + SPR.lantern.w / 2, lp[1] + 70, 4, lp[0] + SPR.lantern.w / 2, lp[1] + 70, 70);
        lg2.addColorStop(0, 'rgba(255,200,140,0.35)'); lg2.addColorStop(1, 'rgba(255,200,140,0)'); ctx.fillStyle = lg2; ctx.fillRect(lp[0] - 50, lp[1], 170, 160); }
      if (decor.includes('painting')) { // hung on a nail by a string
        const pp = ROOM.pos.painting, cx = pp[0] + SPR.painting.w / 2;
        ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(pp[0] + 10, pp[1] + 3); ctx.lineTo(cx, pp[1] - 15); ctx.lineTo(pp[0] + SPR.painting.w - 10, pp[1] + 3); ctx.stroke();
        ctx.fillStyle = '#c9a26a'; ctx.beginPath(); ctx.arc(cx, pp[1] - 15, 2.6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1; ctx.stroke();
      }
      ['painting', 'poster', 'clock', 'shelf'].forEach((n) => { if (decor.includes(n)) sprAt(ctx, n); });
    }
    if (!useSpr && decor.includes('poster')) place(ctx, 'poster', () => {
      ctx.save(); ctx.translate(608, 62); ctx.rotate(0.03);
      ctx.fillStyle = 'rgba(80,45,20,0.15)'; ctx.fillRect(4, 5, 110, 140);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 110, 140);
      ctx.fillStyle = '#ffe5b8'; ctx.fillRect(8, 8, 94, 100);
      dumpling(ctx, { type: 'bao', x: 55, y: 92, size: 64, mood: 'joy', shadow: false, t });
      ctx.fillStyle = '#ff7f9f'; heartShape(ctx, 88, 24, 7); heartShape(ctx, 20, 30, 5);
      ctx.fillStyle = '#d65c4a'; ctx.font = '700 14px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BAO STAR', 55, 128);
      ctx.fillStyle = 'rgba(255,170,190,0.75)'; // washi tape corners
      [[-6, -4, -0.6], [100, -4, 0.6]].forEach(([x, y, r]) => { ctx.save(); ctx.translate(x + 8, y + 6); ctx.rotate(r); ctx.fillRect(-12, -5, 24, 10); ctx.restore(); });
      ctx.restore();
    });
    if (!useSpr && decor.includes('lantern')) place(ctx, 'lantern', () => { // paper lantern in the room's colour
      const lc = themeColor(wall), ink = shade(lc, 0.5);
      ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(212, -E - 40); ctx.lineTo(212, 50); ctx.stroke();
      const sw = Math.sin(t * 1.2) * 0.05;
      ctx.save(); ctx.translate(212, 50); ctx.rotate(sw); ctx.lineJoin = 'round';
      const glow = ctx.createRadialGradient(0, 46, 10, 0, 46, 80); glow.addColorStop(0, mix(lc, '#fff3c0', 0.5) + '66'); glow.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 46, 80, 0, TAU); ctx.fill();
      const lg = ctx.createRadialGradient(-12, 30, 4, 0, 46, 48); lg.addColorStop(0, mix(lc, '#fff6d8', 0.55)); lg.addColorStop(0.6, lc); lg.addColorStop(1, shade(lc, 0.75));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(0, 46, 38, 42, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = ink; ctx.stroke();
      ctx.strokeStyle = shade(lc, 0.7); ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) if (i) { ctx.beginPath(); ctx.ellipse(0, 46, Math.abs(i) * 12, 42, 0, 0, TAU); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 88); ctx.stroke();
      ctx.fillStyle = '#ffcc33'; ctx.strokeStyle = '#b9861a'; ctx.lineWidth = 1.5;
      roundRect(ctx, -17, -1, 34, 8, 3); ctx.fill(); ctx.stroke(); roundRect(ctx, -17, 85, 34, 8, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#e8453c'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3, 93); ctx.lineTo(i * 4, 110 + Math.sin(t * 2 + i) * 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-16, 30, 5, 14, 0.25, 0, TAU); ctx.fill();
      ctx.restore();
    });
    if (!useSpr && decor.includes('painting')) place(ctx, 'painting', () => {
      ctx.save(); ctx.translate(470, 0);
      ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(30, 60); ctx.lineTo(63, 40); ctx.lineTo(96, 60); ctx.stroke();
      ctx.fillStyle = '#b8864f'; ctx.beginPath(); ctx.arc(63, 40, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(80,45,20,0.15)'; ctx.fillRect(18, 62, 92, 74);
      ctx.fillStyle = '#c99b6a'; ctx.fillRect(14, 56, 98, 78); ctx.fillStyle = '#e3b57e'; ctx.fillRect(17, 59, 92, 72);
      ctx.fillStyle = '#cfe9ff'; ctx.fillRect(26, 66, 74, 58);
      ctx.fillStyle = '#9fcf9a'; ctx.beginPath(); ctx.moveTo(26, 124); ctx.lineTo(52, 84); ctx.lineTo(70, 108); ctx.lineTo(82, 92); ctx.lineTo(100, 124); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(46, 93); ctx.lineTo(52, 84); ctx.lineTo(58, 93); ctx.fill();
      ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(88, 78, 6, 0, TAU); ctx.fill();
      ctx.restore();
    });
    if (!useSpr && decor.includes('clock')) place(ctx, 'clock', () => {
      const cx = 820, cy = 82;
      ctx.fillStyle = '#e8a35c'; ctx.beginPath(); ctx.arc(cx, cy, 36, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 29, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a4636';
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 23, cy + Math.sin(a) * 23, i % 3 ? 1.5 : 2.6, 0, TAU); ctx.fill(); }
      const d = new Date(DG.now()), hA = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * TAU - Math.PI / 2, mA = d.getMinutes() / 60 * TAU - Math.PI / 2;
      ctx.strokeStyle = '#5a4636'; ctx.lineCap = 'round';
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(hA) * 13, cy + Math.sin(hA) * 13); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(mA) * 20, cy + Math.sin(mA) * 20); ctx.stroke();
      ctx.fillStyle = '#ff7f5f'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
    });
    if (!useSpr && decor.includes('shelf')) place(ctx, 'shelf', () => { // wall-mounted bookcase, hung clear of the floor
      const x = 724, y = 120, w = 108, h = 118, ink = '#6b4223';
      ctx.save(); ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(80,45,20,0.18)'; roundRect(ctx, x + 6, y + 8, w, h, 6); ctx.fill(); // shadow on the wall
      const wg = ctx.createLinearGradient(x, 0, x + w, 0); wg.addColorStop(0, '#d9a066'); wg.addColorStop(1, '#b97c45');
      ctx.fillStyle = wg; roundRect(ctx, x, y, w, h, 6); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = ink; ctx.stroke();
      ctx.fillStyle = '#7a4b28'; ctx.fillRect(x + 8, y + 10, w - 16, h - 20); // dark back
      const rows = [y + 10, y + 59];
      rows.forEach((ry, r) => { // books
        let bx = x + 11; const bc = ['#ff8f7d', '#7fb2ff', '#ffd36a', '#6fd3b5', '#c49bff', '#ff7fa8', '#9fd8ff'];
        for (let i = 0; i < 8 && bx < x + w - 22; i++) {
          const bw = 8 + ((i * 7 + r * 3) % 4) * 2, bh = 30 + ((i * 5 + r) % 3) * 5, c = bc[(i + r * 3) % bc.length];
          const tilt = (r === 0 && i === 5) ? 0.22 : 0;
          ctx.save(); ctx.translate(bx, ry + 44); ctx.rotate(tilt);
          ctx.fillStyle = c; ctx.fillRect(0, -bh, bw, bh); ctx.lineWidth = 1.2; ctx.strokeStyle = shade(c, 0.55); ctx.strokeRect(0, -bh, bw, bh);
          ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(1.5, -bh + 5, bw - 3, 2.5); ctx.fillRect(1.5, -10, bw - 3, 2);
          ctx.restore();
          bx += bw + 1 + (tilt ? 7 : 0);
        }
        if (r === 1) { // a little potted plant at the end of the lower shelf
          ctx.fillStyle = '#d9845a'; ctx.beginPath(); ctx.moveTo(x + w - 24, ry + 32); ctx.lineTo(x + w - 10, ry + 32); ctx.lineTo(x + w - 12, ry + 44); ctx.lineTo(x + w - 22, ry + 44); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.fillStyle = '#6cbf7a'; [[-5, -6], [0, -10], [5, -6]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(x + w - 17 + dx, ry + 30 + dy, 3.5, 7, dx * 0.12, 0, TAU); ctx.fill(); });
        }
      });
      [y + 54, y + h - 10].forEach((sy) => { // shelves with a light front edge
        ctx.fillStyle = '#c98a4f'; ctx.fillRect(x + 4, sy, w - 8, 7); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.strokeRect(x + 4, sy, w - 8, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 6, sy + 1, w - 12, 2);
      });
      ctx.fillStyle = '#c98a4f'; roundRect(ctx, x - 5, y - 8, w + 10, 12, 4); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke(); // crown
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 2, y - 6, w + 4, 3);
      ctx.restore();
    });
    if (!useSpr && decor.includes('fish')) place(ctx, 'fish', () => { // round fishbowl with an open top, on a little round stool
      const x = 540, y = 248, R = 28, wl = y - 6; // water line
      ctx.save(); ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(80,45,20,0.18)'; ctx.beginPath(); ctx.ellipse(x, 302, 28, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c98f52'; ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 1.5;
      [[x - 22, -0.12], [x + 16, 0.12], [x - 3, 0]].forEach(([lx, r]) => { ctx.save(); ctx.translate(lx + 3, y + 28); ctx.rotate(r); ctx.fillRect(-3, 0, 6, 24); ctx.strokeRect(-3, 0, 6, 24); ctx.restore(); });
      ctx.fillStyle = '#d9a066'; ctx.beginPath(); ctx.ellipse(x, y + 28, 32, 7, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8b880'; ctx.beginPath(); ctx.ellipse(x, y + 25, 32, 7, 0, 0, TAU); ctx.fill(); ctx.stroke();
      const open = 0.62; // the opening at the top, in radians either side of straight up
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.clip();
      ctx.fillStyle = 'rgba(230,245,255,0.35)'; ctx.fillRect(x - R, y - R, R * 2, R * 2); // empty glass
      const wg = ctx.createLinearGradient(0, wl, 0, y + R); wg.addColorStop(0, 'rgba(140,205,250,0.85)'); wg.addColorStop(1, 'rgba(90,165,230,0.9)');
      ctx.fillStyle = wg; ctx.fillRect(x - R, wl, R * 2, R * 2);
      ctx.fillStyle = '#e8d6a8'; ctx.beginPath(); ctx.ellipse(x, y + R - 3, R, 7, 0, 0, TAU); ctx.fill(); // sand
      ctx.fillStyle = '#6cbf7a'; ctx.beginPath(); ctx.ellipse(x - 12, y + 14, 3, 9, -0.2, 0, TAU); ctx.fill();
      const fx = x + Math.sin(t * 1.3) * 12, dir = Math.cos(t * 1.3) > 0 ? 1 : -1, fy = y + 6 + Math.sin(t * 2.1) * 3;
      ctx.fillStyle = '#ff8f40'; ctx.beginPath(); ctx.ellipse(fx, fy, 8, 5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx - dir * 6, fy); ctx.lineTo(fx - dir * 13, fy - 5); ctx.lineTo(fx - dir * 13, fy + 5); ctx.fill();
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(fx + dir * 4, fy - 1, 1.2, 0, TAU); ctx.fill();
      const by = y + 10 - ((t * 18) % (y + 10 - wl)); // bubble rising to the surface
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 6, by, 2, 0, TAU); ctx.stroke();
      ctx.restore();
      // water surface
      const sx = Math.sqrt(R * R - (wl - y) ** 2);
      ctx.fillStyle = 'rgba(190,230,255,0.9)'; ctx.beginPath(); ctx.ellipse(x, wl, sx, 3.5, 0, 0, TAU); ctx.fill();
      // glass outline, open at the top
      ctx.strokeStyle = 'rgba(120,170,210,0.95)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2 + open, -Math.PI / 2 - open + TAU); ctx.stroke();
      const ox = Math.sin(open) * R, oy = y - Math.cos(open) * R;
      ctx.strokeStyle = 'rgba(150,195,230,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, oy, ox + 1, 4, 0, 0, TAU); ctx.stroke(); // rim of the opening
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(x - 15, y - 6, 3, 9, 0.35, 0, TAU); ctx.fill(); // glass shine
      ctx.restore();
    });
    ctx.restore(); // end wall shift
    // floor
    const fg = ctx.createLinearGradient(0, floorY, 0, Hf);
    fg.addColorStop(0, flo.a); fg.addColorStop(1, flo.b);
    ctx.fillStyle = fg; ctx.fillRect(0, floorY, W, Hf - floorY);
    if (flo.checker) {
      ctx.fillStyle = flo.b;
      for (let r = 0; r < Math.ceil((Hf - floorY) / 40); r++) for (let x = (r % 2) * 60; x < W; x += 120) ctx.fillRect(x, floorY + r * 40, 60, 40);
    } else if (flo.line && !flo.tatami) {
      // wooden planks running back toward the wall, in perspective
      const vx = W / 2, vy = floorY - 620, atY = (x0, y) => vx + (x0 - vx) * (y - vy) / (Hf - vy);
      const pw = 64, n = Math.ceil(W / pw) + 8;
      for (let i = -n; i <= n; i++) { // alternate plank tones
        if (i % 2) continue;
        const a0 = vx + i * pw, a1 = a0 + pw;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath(); ctx.moveTo(atY(a0, floorY), floorY); ctx.lineTo(atY(a1, floorY), floorY); ctx.lineTo(a1, Hf); ctx.lineTo(a0, Hf); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = flo.line; ctx.lineWidth = 2;
      for (let i = -n; i <= n; i++) { const x0 = vx + i * pw; ctx.beginPath(); ctx.moveTo(atY(x0, floorY), floorY); ctx.lineTo(x0, Hf); ctx.stroke(); }
      // staggered plank ends
      for (let r = 0, y = floorY + 26; y < Hf; r++, y += 22 + r * 5) {
        for (let i = -n; i <= n; i++) {
          if ((i * 7 + r * 3) % 4) continue;
          const x0 = vx + i * pw, xa = atY(x0, y), xb = atY(x0 + pw, y);
          ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, floorY, W, 6);
    } else if (flo.line) {
      ctx.strokeStyle = flo.line; ctx.lineWidth = 2;
      for (let y = floorY + 30; y < Hf; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      const step = flo.tatami ? 150 : 180;
      for (let r = 0; r < Math.ceil((Hf - floorY) / 40); r++) for (let x = (r % 2) * (step / 2); x < W; x += step) {
        const y = floorY + r * 40 - 10; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, y + 40); ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 60 + F / 4; i++) { ctx.beginPath(); ctx.arc((i * 137) % W, floorY + 10 + (i * 71) % (Hf - floorY - 10), 3, 0, TAU); ctx.fill(); }
    }
    if (useSpr) {
      // glossy sheen on the floor, the doormat, and the floor-standing pieces by the wall
      const sh = ctx.createRadialGradient(W * 0.55, floorY + 120, 10, W * 0.55, floorY + 120, W * 0.7);
      sh.addColorStop(0, night ? 'rgba(200,210,255,0.10)' : 'rgba(255,250,235,0.32)'); sh.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.fillStyle = sh; ctx.fillRect(0, floorY, W, Hf - floorY);
      sprAt(ctx, 'mat');
      const fp = ROOM.pos.fish, pp = ROOM.pos.plant;
      if (decor.includes('fish')) { floorShadow(ctx, fp[0] + SPR.fish.w / 2, fp[1] + SPR.fish.h - 2, 30, 7); sprAt(ctx, 'fish'); }
      if (decor.includes('plant')) { floorShadow(ctx, pp[0] + SPR.plant.w / 2, pp[1] + SPR.plant.h - 3, 34, 8); sprAt(ctx, 'plant'); }
    } else doorMat(ctx);
    if (decor.includes('beanbag')) place(ctx, 'beanbag', () => { // squishy beanbag in the room's colour
      const bc = themeColor(wall), ink = shade(bc, 0.5);
      ctx.save(); ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(90,55,30,0.18)'; ctx.beginPath(); ctx.ellipse(420, 346, 56, 10, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(368, 342); ctx.bezierCurveTo(360, 312, 380, 288, 418, 288); ctx.bezierCurveTo(458, 288, 480, 312, 472, 342); ctx.quadraticCurveTo(420, 354, 368, 342); ctx.closePath();
      const gg = ctx.createRadialGradient(400, 300, 4, 420, 320, 60); gg.addColorStop(0, mix(bc, '#ffffff', 0.45)); gg.addColorStop(0.65, bc); gg.addColorStop(1, shade(bc, 0.8));
      ctx.fillStyle = gg; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = ink; ctx.stroke();
      ctx.strokeStyle = shade(bc, 0.75); ctx.lineWidth = 1.5; // dent and seams
      ctx.beginPath(); ctx.moveTo(392, 312); ctx.quadraticCurveTo(420, 324, 448, 312); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(420, 290); ctx.quadraticCurveTo(414, 316, 420, 346); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(398, 302, 13, 6, -0.4, 0, TAU); ctx.fill();
      ctx.restore();
    });
    if (decor.includes('rug') && useSpr) place(ctx, 'rug', () => {
      ctx.fillStyle = 'rgba(120,60,40,0.14)'; ctx.beginPath(); ctx.ellipse(452, 458, 196, 52, 0, 0, TAU); ctx.fill();
      const rc = mix(themeColor(wall), '#ffd6dc', 0.35); // the rug follows the wall colour (pink on the default walls)
      const rg = ctx.createRadialGradient(420, 430, 20, 450, 450, 200); rg.addColorStop(0, mix(rc, '#ffffff', 0.35)); rg.addColorStop(1, rc);
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(450, 450, 192, 49, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = shade(rc, 0.85); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([12, 9]);
      ctx.beginPath(); ctx.ellipse(450, 450, 170, 40, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(400, 440, 90, 16, -0.05, 0, TAU); ctx.fill();
    });
    else if (decor.includes('rug')) place(ctx, 'rug', () => {
      // the rug matches the wallpaper colours
      ctx.fillStyle = 'rgba(90,55,30,0.12)'; ctx.beginPath(); ctx.ellipse(450, 454, 194, 50, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = wall.b; ctx.beginPath(); ctx.ellipse(450, 450, 190, 48, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = wall.trim; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = wall.a; ctx.beginPath(); ctx.ellipse(450, 450, 150, 34, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = wall.dark ? 'rgba(255,255,255,0.6)' : '#fff'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.ellipse(450, 450, 165, 38, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    });
    if (!useSpr && decor.includes('plant')) place(ctx, 'plant', () => {
      ctx.fillStyle = '#6cbf7a';
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.35 + Math.sin(t * 1.5 + i) * 0.04;
        ctx.save(); ctx.translate(645, 300); ctx.rotate(a + Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(0, -45, 14, 45, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = '#d9845a'; ctx.beginPath(); ctx.moveTo(615, 300); ctx.lineTo(675, 300); ctx.lineTo(665, 350); ctx.lineTo(625, 350); ctx.fill();
      ctx.fillStyle = '#c56f47'; ctx.fillRect(610, 295, 70, 10);
    });
    // furniture and anything standing on the floor are drawn back-to-front by where they touch the floor
    const items = [
      { y: ROOM.tub.y + (useSpr ? ROOM.tub.h - 6 : 117), draw: () => {
        if (!useSpr) return drawTub(ctx, t);
        const b = ROOM.tub; floorShadow(ctx, b.x + b.w / 2, b.y + b.h - 4, b.w * 0.5, 12, 0.3); spr(ctx, 'bath', b.x, b.y);
        tubBubbles(ctx, b, t);
      } },
      { y: ROOM.bowl.y + ROOM.bowl.h - 4, draw: () => {
        if (!useSpr) return drawBowl(ctx, o.bowlFood, t, wall);
        const b = ROOM.bowl; floorShadow(ctx, b.x + b.w / 2, b.y + b.h - 3, b.w * 0.55, 8, 0.32);
        ctx.drawImage(recoloured('bowl', themeColor(wall)), b.x, b.y, SPR.bowl.w, SPR.bowl.h); // the bowl matches the walls
        if (o.bowlFood) { ctx.font = '34px serif'; ctx.textAlign = 'center'; ctx.fillText(o.bowlFood, b.x + b.w / 2, b.y + 22 + Math.sin(t * 10) * 1.5); }
      } },
      { y: ROOM.basket.y + ROOM.basket.h - 4, draw: () => {
        if (!useSpr) return drawBasket(ctx, o.toys || ['ball']);
        const b = ROOM.basket; floorShadow(ctx, b.x + b.w / 2, b.y + b.h - 3, b.w * 0.55, 9, 0.3); spr(ctx, 'basket', b.x, b.y);
      } },
      { y: ROOM.bed.y + ROOM.bed.h * 0.94, draw: () => {
        if (useSpr) { const b = ROOM.bed; spr(ctx, 'bed', b.x, b.y); return; }
        drawBed(ctx, t);
        if (decor.includes('teddy')) {
          ctx.save(); ctx.translate(BEDO[0], BEDO[1]); ctx.scale(BEDK / 0.207, BEDK / 0.207); ctx.translate(-648, -300);
          const x = 700, y = 352;
          ctx.fillStyle = '#c98f52';
          [[-11, -16], [11, -16]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 7, 0, TAU); ctx.fill(); });
          ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x, y + 22, 15, 14, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#f2d1a8'; ctx.beginPath(); ctx.ellipse(x, y + 4, 7, 5, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#3b2a22'; [-5, 5].forEach((dx) => { ctx.beginPath(); ctx.arc(x + dx, y - 3, 1.8, 0, TAU); ctx.fill(); });
          ctx.beginPath(); ctx.arc(x, y + 2, 2, 0, TAU); ctx.fill();
          ctx.restore();
        }
      } },
    ].concat(o.sprites || []);
    items.sort((p, q) => p.y - q.y).forEach((it) => it.draw());
    // anime-style window light, dust motes and a soft vignette
    if (useSpr) { // sunbeams from the window, drifting dust and twinkles
      const wp = ROOM.pos.window, x0 = wp[0] + 30, x1 = wp[0] + SPR.window.w - 30, y0 = wp[1] + SPR.window.h - 30;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      [[0, 0.9], [0.38, 0.65], [0.7, 0.8]].forEach(([k, a], i) => {
        const xa = x0 + (x1 - x0) * k, sw = 26 + i * 6, drift = W * 0.32, pulse = 0.75 + 0.25 * Math.sin(t * 0.8 + i * 1.7);
        const g = ctx.createLinearGradient(0, y0, 0, Hf);
        const SL = DG.skyLight(), bk = SL.wet ? 0.35 : 1;
        g.addColorStop(0, SL.day < 0.35 ? `rgba(150,170,255,${0.18 * a * pulse})` : SL.warm > 0.3 ? `rgba(255,185,120,${0.4 * a * pulse * SL.day * bk})` : `rgba(255,245,210,${0.42 * a * pulse * SL.day * bk})`); g.addColorStop(1, 'rgba(255,245,210,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(xa, y0); ctx.lineTo(xa + sw, y0); ctx.lineTo(xa + sw * 3 + drift, Hf); ctx.lineTo(xa + drift, Hf); ctx.closePath(); ctx.fill();
      });
      for (let i = 0; i < 22; i++) {
        const dx = x0 + ((i * 61 + t * (5 + i % 4)) % (W * 0.6)), dy = y0 + (((i * 47) - t * (4 + i % 3)) % (Hf - y0) + (Hf - y0)) % (Hf - y0);
        ctx.fillStyle = `rgba(255,250,225,${0.3 + 0.35 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.arc(dx, dy, 1.2 + (i % 3) * 0.8, 0, TAU); ctx.fill();
      }
      ctx.restore();
      twinkles(ctx, W, Hf, t, 9);
    }
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    if (useSpr) ctx.globalAlpha = 0;
    if (ROOM.deco.window) { const L = ROOM.deco.window; ctx.translate(L[0], L[1]); ctx.scale(L[2], L[2]); ctx.translate(-L[3], -L[4]); }
    const lg = ctx.createLinearGradient(0, 185 + WALL_DY, 0, H);
    lg.addColorStop(0, night ? 'rgba(150,170,255,0.25)' : 'rgba(255,244,205,0.45)'); lg.addColorStop(1, 'rgba(255,244,205,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(268, 182 + WALL_DY); ctx.lineTo(442, 182 + WALL_DY); ctx.lineTo(640, H); ctx.lineTo(330, H); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const dx = 300 + ((i * 71 + t * (6 + i % 4)) % 280), dy = 200 + (((i * 53) - t * (5 + i % 3)) % 300 + 300) % 300;
      ctx.fillStyle = `rgba(255,250,225,${0.35 + 0.35 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.arc(dx, dy, 1.5 + (i % 3), 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    const vg = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.4, W / 2, H * 0.55, W * 0.65);
    vg.addColorStop(0, 'rgba(120,60,30,0)'); vg.addColorStop(1, 'rgba(120,60,30,0.16)');
    ctx.fillStyle = vg; ctx.fillRect(0, -E, W, Hf + E);
    // night: dim the room a little
    if (night && !o.noNight) { ctx.fillStyle = 'rgba(30,30,90,0.22)'; ctx.fillRect(0, -E, W, Hf + E); if (decor.includes('lights') || decor.includes('lantern')) { ctx.fillStyle = 'rgba(255,210,120,0.08)'; ctx.fillRect(0, -E, W, Hf + E); } }
    // labels
    ctx.font = '600 14px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(90,70,54,0.55)';
    if (o.labels) {
      ctx.fillText('Bath', 120, 500); ctx.fillText('Food', 304, 505); ctx.fillText('Toys', 562, 505); ctx.fillText('Bed', 790, 505);
    }
  }
  /* ---------- colour helpers for themed furniture ---------- */
  function hexHsl(h) {
    let [r, g, b] = hexRgb(h).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let hh = 0, ss = 0;
    if (mx !== mn) {
      const d = mx - mn; ss = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6;
    }
    return [hh, ss, l];
  }
  function hslHex(h, s, l) {
    const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return rgbHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  /** A cheerful bowl colour in the same hue as the room's walls. */
  function themeColor(wall) {
    const [h, s] = hexHsl(wall.trim || wall.b);
    return s < 0.12 ? hslHex(h, Math.max(s, 0.12), 0.62) : hslHex(h, Math.min(0.85, Math.max(0.6, s + 0.25)), 0.7);
  }

  /** Clawfoot bathtub with a faucet and a heap of bubbles. */
  function drawTub(ctx, t) {
    const b = ROOM.tub, x0 = b.x + 6, x1 = b.x + b.w - 6, cx = (x0 + x1) / 2;
    const rimY = b.y + 34, bot = b.y + b.h - 16, ink = '#56707c';
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // claw feet
    ctx.fillStyle = '#c9b48a'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    [x0 + 30, x1 - 30].forEach((fx, i) => {
      const s = i ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(fx - 9, bot - 4); ctx.quadraticCurveTo(fx + s * 4, bot + 6, fx + s * 6, bot + 13);
      ctx.lineTo(fx + s * 14, bot + 13); ctx.quadraticCurveTo(fx + s * 10, bot + 2, fx + 9, bot - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    // white enamel body
    ctx.beginPath(); ctx.moveTo(x0 - 2, rimY);
    ctx.bezierCurveTo(x0 + 2, bot - 6, x0 + 18, bot + 2, x0 + 40, bot + 2); ctx.lineTo(x1 - 40, bot + 2);
    ctx.bezierCurveTo(x1 - 18, bot + 2, x1 - 2, bot - 6, x1 + 2, rimY); ctx.closePath();
    const bg = ctx.createLinearGradient(0, rimY, 0, bot);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.6, '#eef4f8'); bg.addColorStop(1, '#d3e0e8');
    ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(x0 + 26, rimY + 30, 6, 20, -0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,160,185,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 14, bot - 14); ctx.quadraticCurveTo(cx, bot - 4, x1 - 14, bot - 14); ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = 3.5;
    // white rim + water
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx, rimY, (x1 - x0) / 2 + 4, 17, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const wg = ctx.createLinearGradient(0, rimY - 10, 0, rimY + 10);
    wg.addColorStop(0, '#8fd3f5'); wg.addColorStop(1, '#bfe8fb');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(cx, rimY + 1, (x1 - x0) / 2 - 8, 10, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9fc4d4'; ctx.lineWidth = 2; ctx.stroke();
    // bubbles
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#8cc7e2'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const bx = x0 + 24 + i * ((x1 - x0 - 50) / 8), by = rimY - 2 + Math.sin(t * 2 + i) * 2 - (i % 3) * 3, r = 7 + (i % 3) * 3;
      ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill(); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) { // floating bubbles
      const k = ((t * 0.35 + i / 3) % 1), bx = cx - 40 + i * 36 + Math.sin(t * 2 + i) * 6, by = rimY - 18 - k * 60;
      ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(bx, by, 4 + i, 0, TAU); ctx.fillStyle = 'rgba(230,248,255,0.85)'; ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // rubber duck on the left rim
    const dx = x0 + 14, dy = rimY - 12;
    ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#a3741c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(dx, dy + 4, 12, 8, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(dx + 6, dy - 6, 7, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9f40'; ctx.beginPath(); ctx.moveTo(dx + 12, dy - 7); ctx.lineTo(dx + 19, dy - 5); ctx.lineTo(dx + 12, dy - 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.arc(dx + 8, dy - 8, 1.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /** Glossy pet bowl with a heart, coloured to match the room. Seen nearly side-on so it sits flat on the floor. */
  function drawBowl(ctx, food, t, wall) {
    const b = ROOM.bowl, cx = b.x + b.w / 2, baseY = b.y + b.h - 2, k = 0.1;
    const col = themeColor(wall || DG.WALLS.peach), ink = shade(col, 0.42), dark = shade(col, 0.8), light = mix(col, '#ffffff', 0.4);
    ctx.save(); ctx.translate(cx, baseY); ctx.scale(k, k); ctx.translate(-750, -930); ctx.lineJoin = 'round';
    // contact shadow hugging the flat base
    const sg = ctx.createRadialGradient(750, 930, 30, 750, 930, 640);
    sg.addColorStop(0, 'rgba(80,45,25,0.38)'); sg.addColorStop(0.75, 'rgba(80,45,25,0.16)'); sg.addColorStop(1, 'rgba(80,45,25,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(750, 930, 640, 46, 0, 0, TAU); ctx.fill();
    // body: rim on top, flaring out to a wide, flat base
    const body = () => {
      ctx.beginPath(); ctx.moveTo(282, 400);
      ctx.bezierCurveTo(272, 560, 214, 680, 205, 800);
      ctx.quadraticCurveTo(200, 900, 300, 914);
      ctx.quadraticCurveTo(750, 944, 1200, 914);
      ctx.quadraticCurveTo(1300, 900, 1295, 800);
      ctx.bezierCurveTo(1286, 680, 1228, 560, 1218, 400); ctx.closePath();
    };
    body();
    const g = ctx.createLinearGradient(205, 0, 1295, 0);
    g.addColorStop(0, light); g.addColorStop(0.3, col); g.addColorStop(0.72, col); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 26; ctx.strokeStyle = ink; ctx.stroke();
    ctx.save(); body(); ctx.clip();
    // shade under the rim and a soft band where the base flares
    const ug = ctx.createLinearGradient(0, 400, 0, 520); ug.addColorStop(0, 'rgba(0,0,0,0.14)'); ug.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ug; ctx.fillRect(150, 400, 1200, 130);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(230, 790); ctx.quadraticCurveTo(750, 840, 1270, 790); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.moveTo(210, 830); ctx.quadraticCurveTo(750, 880, 1290, 830); ctx.lineTo(1300, 950); ctx.lineTo(200, 950); ctx.closePath(); ctx.fill();
    ctx.restore();
    // thick rim, seen almost edge-on: only a sliver of the inside shows
    ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(750, 395, 478, 92, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 26; ctx.strokeStyle = ink; ctx.stroke();
    ctx.fillStyle = shade(col, 0.68); ctx.beginPath(); ctx.ellipse(750, 388, 404, 56, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(750, 395, 446, 76, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    // food sits in the bowl, peeking over the rim
    if (food) { ctx.font = '360px serif'; ctx.textAlign = 'center'; ctx.fillText(food, 750, 470 + Math.sin(t * 10) * 15); }
    // heart + glossy highlights
    ctx.fillStyle = '#fff5f0'; heartShape(ctx, 750, 660, 112);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    [[312, 520, 18, 50, 0.3], [585, 405, 70, 10, 0], [1050, 380, 50, 9, 0], [290, 760, 26, 12, 0.6], [930, 880, 70, 10, -0.05]].forEach(([x, y, rx, ry, r]) => {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r, 0, TAU); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(330, 660, 36, 120, 0.15, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /** Woven toy basket with the owned toys peeking out. */
  function drawBasket(ctx, toys) {
    const b = ROOM.basket, cx = b.x + b.w / 2, rimY = b.y + 30, bot = b.y + b.h - 2, w = b.w / 2 - 6, ink = '#6b4223';
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = ink;
    ctx.fillStyle = 'rgba(90,55,30,0.16)'; ctx.beginPath(); ctx.ellipse(cx, bot + 2, w + 6, 8, 0, 0, TAU); ctx.fill();
    // inside of the basket
    ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.ellipse(cx, rimY, w, 11, 0, 0, TAU); ctx.fill();
    // toys peeking out
    const show = toys.slice(0, 3), pos = [[-24, 10, -0.25], [20, 8, 0.2], [0, 4, 0]];
    show.forEach((id, i) => {
      const [dx, dy, r] = pos[i];
      ctx.save(); ctx.translate(cx + dx, rimY + dy); ctx.rotate(r);
      toy(ctx, id === 'blocks' ? 'block' : id, 0, 0, id === 'mushroom' ? 0.62 : id === 'drum' || id === 'kite' || id === 'feather' ? 0.6 : 0.95, { t: 0 });
      ctx.restore();
    });
    // woven body
    const body = () => { ctx.beginPath(); ctx.moveTo(cx - w, rimY); ctx.lineTo(cx - w + 8, bot - 8); ctx.quadraticCurveTo(cx, bot + 6, cx + w - 8, bot - 8); ctx.lineTo(cx + w, rimY); ctx.ellipse(cx, rimY, w, 11, 0, 0, Math.PI, false); ctx.closePath(); };
    body(); const bg = ctx.createLinearGradient(0, rimY, 0, bot); bg.addColorStop(0, '#e3a862'); bg.addColorStop(1, '#c0803f');
    ctx.fillStyle = bg; ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.strokeStyle = 'rgba(120,70,30,0.55)'; ctx.lineWidth = 2;
    for (let r = 0, y = rimY + 10; y < bot; y += 9, r++) for (let x = cx - w + (r % 2) * 9; x < cx + w; x += 18) { ctx.beginPath(); ctx.ellipse(x, y, 7, 3.5, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(cx - w, rimY, w * 0.6, bot - rimY);
    ctx.restore();
    body(); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
    // rolled rim
    ctx.lineWidth = 9; ctx.strokeStyle = ink; ctx.beginPath(); ctx.ellipse(cx, rimY, w, 11, 0, 0, Math.PI); ctx.stroke();
    ctx.lineWidth = 5; ctx.strokeStyle = '#e9b574'; ctx.stroke();
    ctx.restore();
  }
  /* ---------- Bed: cosy wooden bed with a patchwork quilt, 3/4 view (drawn in a 1536x1024 design space) ---------- */
  const BEDP = [160, 90]; // BEDO / BEDK (where the bed sits and its size) come from the room layout
  function bedSpace(ctx) { ctx.translate(BEDO[0], BEDO[1]); ctx.scale(BEDK, BEDK); ctx.translate(-BEDP[0], -BEDP[1]); }
  DG.bedPoint = (x, y) => ({ x: BEDO[0] + (x - BEDP[0]) * BEDK, y: BEDO[1] + (y - BEDP[1]) * BEDK });
  const BW = { ink: '#7a4a26', wood: '#f2c58c', woodL: '#fbdcae', woodD: '#d9a062' };
  function post(ctx, x, top, bot, w) {
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, BW.woodL); g.addColorStop(0.45, BW.wood); g.addColorStop(1, BW.woodD);
    ctx.fillStyle = g; roundRect(ctx, x - w / 2, top, w, bot - top, w * 0.35); ctx.fill(); ctx.stroke();
    ctx.fillStyle = BW.woodD; roundRect(ctx, x - w / 2 - 6, top - 4, w + 12, 26, 12); ctx.fill(); ctx.stroke();
    const r = w * 0.62, bg = ctx.createRadialGradient(x - r * 0.35, top - r - 4 - r * 0.35, r * 0.1, x, top - r + 4, r);
    bg.addColorStop(0, '#ffe9c8'); bg.addColorStop(0.5, BW.wood); bg.addColorStop(1, BW.woodD);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, top - r + 6, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, top - r * 1.25, r * 0.22, r * 0.14, -0.6, 0, TAU); ctx.fill();
  }
  function quiltPath(ctx) {
    ctx.beginPath(); ctx.moveTo(250, 600);
    ctx.bezierCurveTo(300, 470, 430, 370, 600, 345);
    ctx.lineTo(1190, 470);
    ctx.bezierCurveTo(1240, 490, 1275, 520, 1262, 560);
    ctx.bezierCurveTo(1250, 610, 1200, 650, 1150, 665);
    ctx.bezierCurveTo(1060, 790, 640, 820, 360, 730);
    ctx.bezierCurveTo(280, 705, 228, 665, 250, 600); ctx.closePath();
  }
  function drawBedBack(ctx) {
    ctx.save(); bedSpace(ctx); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = BW.ink; ctx.lineWidth = 13;
    // floor shadow
    const sg = ctx.createRadialGradient(760, 900, 40, 760, 900, 640);
    sg.addColorStop(0, 'rgba(90,55,30,0.30)'); sg.addColorStop(1, 'rgba(90,55,30,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(760, 900, 640, 120, -0.1, 0, TAU); ctx.fill();
    // headboard
    ctx.beginPath(); ctx.moveTo(625, 360); ctx.lineTo(625, 185); ctx.quadraticCurveTo(690, 118, 770, 128);
    ctx.bezierCurveTo(800, 30, 1110, 30, 1140, 150); ctx.quadraticCurveTo(1195, 158, 1222, 205); ctx.lineTo(1222, 450); ctx.closePath();
    const hg = ctx.createLinearGradient(0, 40, 0, 450); hg.addColorStop(0, BW.woodL); hg.addColorStop(1, BW.wood);
    ctx.fillStyle = hg; ctx.fill(); ctx.stroke();
    // recessed slatted panel
    ctx.save(); ctx.beginPath(); ctx.moveTo(668, 262); ctx.quadraticCurveTo(730, 190, 810, 222); ctx.quadraticCurveTo(950, 262, 1095, 226);
    ctx.quadraticCurveTo(1170, 210, 1192, 270); ctx.lineTo(1192, 440); ctx.lineTo(668, 380); ctx.closePath();
    ctx.fillStyle = BW.woodD; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 8; ctx.stroke(); ctx.clip();
    ctx.strokeStyle = 'rgba(150,95,45,0.45)'; ctx.lineWidth = 6;
    for (let x = 700; x < 1190; x += 46) { ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x, 460); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(880, 92, 120, 14, -0.08, 0, TAU); ctx.fill();
    // back posts
    post(ctx, 600, 190, 580, 66);
    post(ctx, 1265, 248, 735, 82);
    // right side rail
    ctx.beginPath(); ctx.moveTo(985, 835); ctx.quadraticCurveTo(1110, 760, 1228, 640); ctx.lineTo(1228, 720); ctx.quadraticCurveTo(1110, 840, 985, 910); ctx.closePath();
    const rg = ctx.createLinearGradient(0, 640, 0, 910); rg.addColorStop(0, BW.wood); rg.addColorStop(1, BW.woodD);
    ctx.fillStyle = rg; ctx.fill(); ctx.stroke();
    // mattress: top + front + side faces
    ctx.fillStyle = '#f2e6cc';
    ctx.beginPath(); ctx.moveTo(240, 640); ctx.bezierCurveTo(500, 790, 760, 820, 905, 815); ctx.quadraticCurveTo(1100, 720, 1245, 590);
    ctx.lineTo(1245, 655); ctx.quadraticCurveTo(1100, 790, 905, 868); ctx.bezierCurveTo(740, 870, 470, 840, 240, 700); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbf3e2';
    ctx.beginPath(); ctx.moveTo(240, 640); ctx.bezierCurveTo(330, 470, 450, 380, 600, 340); ctx.lineTo(1220, 440); ctx.lineTo(1245, 590);
    ctx.quadraticCurveTo(1100, 720, 905, 815); ctx.bezierCurveTo(760, 820, 500, 790, 240, 640); ctx.closePath(); ctx.fill(); ctx.stroke();
    // pillow
    ctx.beginPath(); ctx.moveTo(640, 215); ctx.quadraticCurveTo(900, 180, 1160, 250); ctx.quadraticCurveTo(1195, 330, 1168, 405);
    ctx.quadraticCurveTo(880, 440, 600, 392); ctx.quadraticCurveTo(575, 300, 640, 215); ctx.closePath();
    const pg = ctx.createRadialGradient(820, 260, 30, 880, 320, 360); pg.addColorStop(0, '#fffaf0'); pg.addColorStop(1, '#eadcbd');
    ctx.fillStyle = pg; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,110,60,0.35)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(700, 280); ctx.quadraticCurveTo(800, 320, 900, 300); ctx.moveTo(960, 270); ctx.quadraticCurveTo(1060, 300, 1120, 350); ctx.stroke();
    ctx.restore();
  }
  function drawBedFront(ctx, asleep) {
    ctx.save(); bedSpace(ctx); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = BW.ink; ctx.lineWidth = 13;
    // patchwork quilt
    quiltPath(ctx); ctx.fillStyle = '#a9cd92'; ctx.fill();
    ctx.save(); quiltPath(ctx); ctx.clip();
    const cols = ['#a9cd92', '#93ccc6', '#f6ecd4'], A = [175, 62], B = [-118, 96], O = [600, 330];
    for (let j = -1; j < 6; j++) for (let i = -2; i < 6; i++) {
      const p = (u, v) => [O[0] + (i + u) * A[0] + (j + v) * B[0], O[1] + (i + u) * A[1] + (j + v) * B[1]];
      const c = cols[((i + j * 2) % 3 + 3) % 3];
      const [cx, cy] = p(0.5, 0.5);
      const g = ctx.createRadialGradient(cx - 20, cy - 25, 10, cx, cy, 120); g.addColorStop(0, mix(c, '#ffffff', 0.35)); g.addColorStop(1, shade(c, 0.9));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(...p(0.04, 0.04));
      ctx.quadraticCurveTo(...p(0.5, -0.06), ...p(0.96, 0.04)); ctx.quadraticCurveTo(...p(1.06, 0.5), ...p(0.96, 0.96));
      ctx.quadraticCurveTo(...p(0.5, 1.06), ...p(0.04, 0.96)); ctx.quadraticCurveTo(...p(-0.06, 0.5), ...p(0.04, 0.04)); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(80,110,70,0.35)'; ctx.lineWidth = 5;
    for (let k = -2; k < 8; k++) {
      ctx.beginPath(); ctx.moveTo(O[0] + k * A[0] - 2 * B[0], O[1] + k * A[1] - 2 * B[1]); ctx.lineTo(O[0] + k * A[0] + 7 * B[0], O[1] + k * A[1] + 7 * B[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(O[0] + k * B[0] - 3 * A[0], O[1] + k * B[1] - 3 * A[1]); ctx.lineTo(O[0] + k * B[0] + 7 * A[0], O[1] + k * B[1] + 7 * A[1]); ctx.stroke();
    }
    ctx.restore();
    // green binding along the quilt edge
    ctx.strokeStyle = '#7fae6a'; ctx.lineWidth = 26; quiltPath(ctx); ctx.stroke();
    ctx.strokeStyle = BW.ink; ctx.lineWidth = 13; quiltPath(ctx); ctx.stroke();
    // star cushion (left behind a sleeping dumpling)
    if (!asleep) { ctx.save(); ctx.translate(1080, 430); ctx.rotate(0.12);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 62 : 128; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.lineWidth = 46; ctx.strokeStyle = BW.ink; ctx.stroke();
    ctx.lineWidth = 30; ctx.strokeStyle = '#f3d468'; ctx.stroke(); ctx.fillStyle = '#f7dc78'; ctx.fill();
    const stg = ctx.createRadialGradient(-30, -40, 10, 0, 0, 130); stg.addColorStop(0, 'rgba(255,255,255,0.5)'); stg.addColorStop(1, 'rgba(200,150,40,0.15)');
    ctx.fillStyle = stg; ctx.fill();
    ctx.restore(); }
    // front rail (gently bowed)
    ctx.beginPath(); ctx.moveTo(225, 735); ctx.bezierCurveTo(420, 840, 700, 860, 900, 830);
    ctx.lineTo(900, 920); ctx.bezierCurveTo(700, 945, 420, 925, 225, 815); ctx.closePath();
    const fg = ctx.createLinearGradient(0, 735, 0, 940); fg.addColorStop(0, BW.woodL); fg.addColorStop(0.5, BW.wood); fg.addColorStop(1, BW.woodD);
    ctx.fillStyle = fg; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(280, 770); ctx.bezierCurveTo(450, 850, 700, 865, 860, 850); ctx.stroke();
    ctx.strokeStyle = BW.ink; ctx.lineWidth = 13;
    // front posts
    post(ctx, 210, 580, 870, 84);
    post(ctx, 935, 770, 980, 92);
    ctx.restore();
  }
  function drawBed(ctx) { drawBedBack(ctx); drawBedFront(ctx); }
  /** Redraws the quilt and front of the bed over a sleeping dumpling, so it looks tucked in. */
  function bedBlanket(ctx) {
    if (!ROOM.painted) { drawBedFront(ctx, true); return; }
    const b = ROOM.bed, o = SPR.bed;
    ctx.save(); ctx.beginPath(); ctx.moveTo(b.x, b.y + o.h * 0.5); ctx.lineTo(b.x + o.w, b.y + o.h * 0.4); ctx.lineTo(b.x + o.w, b.y + o.h); ctx.lineTo(b.x, b.y + o.h); ctx.closePath(); ctx.clip();
    spr(ctx, 'bed', b.x, b.y); ctx.restore();
  }

  /* ---------- Toys: chunky outlined cartoon toys (x, y = bottom centre, s = scale) ---------- */
  function quad(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
  const TOY_INK = '#3d2a20';
  function shine(ctx, x, y, rx, ry, rot) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill(); }
  function toy(ctx, id, x, y, s, o) {
    o = o || {}; s = s || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = TOY_INK; ctx.lineWidth = 2.6;
    if (id === 'ball') {
      const r = 17, cy = -r; ctx.translate(0, cy); ctx.rotate(o.rot || 0);
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(-r, -r, r * 2, r * 2);
      const cols = ['#4cbf5a', '#f5893a', '#2fb0d0', '#ffd23f', '#4cbf5a', '#f5893a'], pole = [-r * 0.25, -r * 0.3];
      for (let i = 0; i < 6; i++) {
        const a0 = (i / 6) * TAU, a1 = ((i + 0.5) / 6) * TAU;
        ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(...pole);
        ctx.arc(0, 0, r * 1.2, a0, a1); ctx.closePath(); ctx.fill();
      }
      const sh = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.2, 0, 0, r * 1.05);
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.75, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(40,20,10,0.25)');
      ctx.fillStyle = sh; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(...pole, r * 0.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.rotate(-(o.rot || 0)); shine(ctx, -r * 0.45, -r * 0.5, 4, 2.5, -0.6);
    } else if (id === 'mushroom') {
      ctx.fillStyle = '#fff1dc'; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(-16, -22, -10, -34); ctx.lineTo(10, -34); ctx.quadraticCurveTo(16, -22, 13, 0); ctx.quadraticCurveTo(0, 4, -13, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = TOY_INK; ctx.beginPath(); ctx.arc(-5, -18, 2.3, 0, TAU); ctx.arc(5, -18, 2.3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,130,140,0.6)'; ctx.beginPath(); ctx.ellipse(-9, -13, 3.5, 2, 0, 0, TAU); ctx.ellipse(9, -13, 3.5, 2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = TOY_INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, -15, 2.5, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.lineWidth = 2.6;
      const cg = ctx.createLinearGradient(0, -66, 0, -30); cg.addColorStop(0, '#ff7a6e'); cg.addColorStop(1, '#e0443c');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(-40, -32); ctx.bezierCurveTo(-42, -70, 42, -70, 40, -32); ctx.quadraticCurveTo(0, -24, -40, -32); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; [[-20, -48, 6], [6, -56, 5], [24, -42, 5], [-4, -40, 4], [-30, -38, 3]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.ellipse(a, b, r, r * 0.8, 0, 0, TAU); ctx.fill(); });
      shine(ctx, -18, -58, 7, 3, -0.4);
    } else if (id === 'hoop') {
      const R = o.r || 22, cy = -R;
      ctx.lineWidth = 11; ctx.strokeStyle = TOY_INK; ctx.beginPath(); ctx.arc(0, cy, R, 0, TAU); ctx.stroke();
      ctx.lineWidth = 6.5; ctx.strokeStyle = '#ff7fa8'; ctx.beginPath(); ctx.arc(0, cy, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffd36a'; ctx.setLineDash([R * 0.5, R * 0.5]); ctx.lineDashOffset = (o.rot || 0) * R; ctx.beginPath(); ctx.arc(0, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, cy, R - 1.5, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    } else if (id === 'drum') {
      const w = 34, h = 40, ry = 10;
      ctx.fillStyle = '#e8453c'; ctx.beginPath(); ctx.moveTo(-w, -h); ctx.lineTo(-w, -ry * 0.3); ctx.ellipse(0, -ry * 0.3, w, ry, 0, Math.PI, 0, true); ctx.lineTo(w, -h); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 8; i++) ctx.lineTo(-w + i * (w / 4), i % 2 ? -h + 6 : -10); ctx.stroke();
      const dg = ctx.createLinearGradient(-w, 0, w, 0); dg.addColorStop(0, 'rgba(255,255,255,0.25)'); dg.addColorStop(0.4, 'rgba(255,255,255,0)'); dg.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = dg; ctx.fillRect(-w, -h - ry, w * 2, h + ry * 2); ctx.restore();
      ctx.strokeStyle = TOY_INK; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-w, -h); ctx.lineTo(-w, -ry * 0.3); ctx.ellipse(0, -ry * 0.3, w, ry, 0, Math.PI, 0, true); ctx.lineTo(w, -h); ctx.stroke();
      ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.ellipse(0, -ry * 0.3, w, ry, 0, 0.1, Math.PI - 0.1); ctx.lineWidth = 5; ctx.strokeStyle = '#d9a52a'; ctx.stroke();
      ctx.lineWidth = 2.6; ctx.strokeStyle = TOY_INK;
      ctx.fillStyle = '#fff6e6'; ctx.beginPath(); ctx.ellipse(0, -h, w, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -h, w - 2, ry - 1.5, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = TOY_INK; ctx.lineWidth = 2.6;
      if (!o.noSticks) [[-1, 0.5], [1, -0.4]].forEach(([s2, r]) => { ctx.save(); ctx.translate(s2 * 18, -h - 12); ctx.rotate(r + s2 * (o.hit || 0) * 0.5);
        ctx.fillStyle = '#e9c38e'; roundRect(ctx, -2.5, -22, 5, 26, 2.5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -23, 4.5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); });
    } else if (id === 'feather') {
      ctx.fillStyle = '#d9a86b'; roundRect(ctx, -3, -8, 6, 60, 3); ctx.fill(); ctx.stroke();
      [['#ff8fb4', -0.35, -10], ['#8fd0ff', 0.3, -8], ['#ffd36a', 0, -14]].forEach(([c, r, dy]) => {
        ctx.save(); ctx.translate(0, dy); ctx.rotate(r + Math.sin((o.t || 0) * 6 + r * 9) * 0.12);
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-12, -10, -10, -38, 0, -50); ctx.bezierCurveTo(10, -38, 12, -10, 0, 0); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -44); ctx.stroke(); ctx.lineWidth = 2.6; ctx.restore();
      });
    } else if (id === 'blocks' || id === 'block') {
      const n = id === 'block' ? 1 : 3;
      const one = (bx, by, c, L) => {
        const a = 15, d = 7;
        ctx.fillStyle = shade(c, 0.8); quad(ctx, [[bx + a, by - a * 2], [bx + a + d, by - a * 2 - d], [bx + a + d, by - d], [bx + a, by]]); ctx.fill(); ctx.stroke();
        ctx.fillStyle = mix(c, '#ffffff', 0.35); quad(ctx, [[bx - a, by - a * 2], [bx - a + d, by - a * 2 - d], [bx + a + d, by - a * 2 - d], [bx + a, by - a * 2]]); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c; ctx.beginPath(); ctx.rect(bx - a, by - a * 2, a * 2, a * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; roundRect(ctx, bx - a + 4, by - a * 2 + 4, a * 2 - 8, a * 2 - 8, 3); ctx.fill();
        ctx.fillStyle = shade(c, 0.6); ctx.font = '700 17px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(L, bx, by - a + 6);
      };
      if (n === 1) one(0, 0, o.color || '#ff8f7d', o.letter || 'A');
      else { one(-17, 0, '#7fb2ff', 'A'); one(17, 0, '#ff8f7d', 'C'); one(0, -32, '#6fd3b5', 'B'); }
    } else if (id === 'kite') {
      const cols = ['#ff7fa8', '#ffd36a', '#7fb2ff', '#6fd3b5'];
      const pts = [[0, -78], [24, -52], [0, -14], [-24, -52]];
      for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(...pts[i]); ctx.lineTo(...pts[(i + 1) % 4]); ctx.closePath(); ctx.fill(); }
      quad(ctx, pts); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(0, -14); ctx.moveTo(-24, -52); ctx.lineTo(24, -52); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -14);
      for (let i = 1; i <= 4; i++) ctx.lineTo(Math.sin((o.t || 0) * 4 + i) * 8, -14 + i * 12); ctx.stroke();
      for (let i = 1; i <= 3; i++) { const tx = Math.sin((o.t || 0) * 4 + i + 0.5) * 8, ty = -8 + i * 12; ctx.fillStyle = cols[i % 4];
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 6, ty - 4); ctx.lineTo(tx - 6, ty + 4); ctx.closePath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 6, ty - 4); ctx.lineTo(tx + 6, ty + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      shine(ctx, -6, -62, 4, 2, -0.6);
    } else if (id === 'bubbles') {
      ctx.fillStyle = '#c49bff'; roundRect(ctx, -3, -34, 6, 34, 3); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -46, 12, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#c49bff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(200,235,255,0.55)'; ctx.beginPath(); ctx.arc(0, -46, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,180,230,0.9)'; ctx.lineWidth = 1.5;
      [[16, -62, 6], [24, -48, 4]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, TAU); ctx.stroke(); });
      shine(ctx, -4, -50, 3, 2, -0.6);
    }
    ctx.restore();
  }

  DG.draw = { wallColors, toy, bedBlanket, dumpling, room, particle, updateParticles, confetti, sparkle, roundRect, bodyPath, shade, mix, colorsFromHex, burstShape, INK };
})(window.DG);
