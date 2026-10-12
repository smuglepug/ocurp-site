/* Juice: tiny shared game-feel helpers (particles, floating text, screen shake, easing, sfx).
   Usage: const fx = Juice.create();  fx.burst(x, y, '#5ec8ff', 24);  fx.shake(6);
          each frame: fx.update(dtSeconds); ctx.save(); fx.applyShake(ctx); ...draw...; fx.draw(ctx); ctx.restore(); */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function create() {
    var parts = [], texts = [], rings = [], shakeT = 0, shakeMag = 0;
    return {
      burst: function (x, y, color, n, speed, opts) {
        opts = opts || {};
        n = reduce ? Math.min(6, n || 16) : (n || 16);
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, s = (speed || 160) * (0.35 + Math.random() * 0.75);
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.up || 0), life: 0, max: (opts.life || 0.6) * (0.6 + Math.random() * 0.7),
            size: (opts.size || 3) * (0.6 + Math.random() * 0.8), color: Array.isArray(color) ? color[i % color.length] : color, g: opts.gravity == null ? 380 : opts.gravity, sq: !!opts.square });
        }
      },
      ring: function (x, y, color, r) { if (!reduce) rings.push({ x: x, y: y, color: color, r0: 4, r1: r || 48, life: 0, max: 0.45 }); },
      text: function (x, y, str, color, size) { texts.push({ x: x, y: y, str: String(str), color: color || '#fff', size: size || 18, life: 0, max: 0.9 }); },
      shake: function (mag, dur) { if (reduce) return; shakeMag = Math.max(shakeMag, mag || 6); shakeT = Math.max(shakeT, dur || 0.25); },
      update: function (dt) {
        dt = Math.min(dt, 0.05);
        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i]; p.life += dt;
          if (p.life >= p.max) { parts.splice(i, 1); continue; }
          p.vy += p.g * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt;
        }
        for (i = texts.length - 1; i >= 0; i--) { texts[i].life += dt; texts[i].y -= 38 * dt; if (texts[i].life >= texts[i].max) texts.splice(i, 1); }
        for (i = rings.length - 1; i >= 0; i--) { rings[i].life += dt; if (rings[i].life >= rings[i].max) rings.splice(i, 1); }
        if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) { shakeT = 0; shakeMag = 0; } }
      },
      applyShake: function (ctx) {
        if (shakeT > 0) { var m = shakeMag * Math.min(1, shakeT / 0.25); ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m); }
      },
      draw: function (ctx) {
        ctx.save();
        for (var i = 0; i < rings.length; i++) {
          var r = rings[i], t = r.life / r.max;
          ctx.globalAlpha = 1 - t; ctx.strokeStyle = r.color; ctx.lineWidth = 3 * (1 - t) + 0.5;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * Juice.ease.outCubic(t), 0, Math.PI * 2); ctx.stroke();
        }
        for (i = 0; i < parts.length; i++) {
          var p = parts[i], k = 1 - p.life / p.max;
          ctx.globalAlpha = Math.max(0, k); ctx.fillStyle = p.color;
          var s = p.size * (0.4 + k * 0.6);
          if (p.sq) ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          else { ctx.beginPath(); ctx.arc(p.x, p.y, s / 2 + 0.3, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (i = 0; i < texts.length; i++) {
          var tx = texts[i], u = tx.life / tx.max, sc = u < 0.15 ? Juice.ease.outBack(u / 0.15) : 1;
          ctx.globalAlpha = u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1;
          ctx.font = '700 ' + Math.round(tx.size * sc) + 'px "Space Grotesk", system-ui, sans-serif';
          ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(tx.str, tx.x, tx.y);
          ctx.fillStyle = tx.color; ctx.fillText(tx.str, tx.x, tx.y);
        }
        ctx.restore();
      },
      busy: function () { return parts.length || texts.length || rings.length || shakeT > 0; },
      clear: function () { parts.length = texts.length = rings.length = 0; shakeT = 0; }
    };
  }
  /* minimal WebAudio blips; silent until the first user gesture */
  var ac = null, muted = false;
  try { muted = localStorage.getItem('ocurp-mute') === '1'; } catch (e) {}
  function tone(freq, dur, type, vol, slide) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  window.Juice = {
    create: create,
    sfx: {
      blip: function () { tone(660, 0.06, 'square', 0.03); },
      hit: function () { tone(220, 0.12, 'square', 0.05, 0.5); },
      boom: function () { tone(120, 0.35, 'sawtooth', 0.06, 0.3); },
      up: function () { tone(440, 0.18, 'triangle', 0.06, 2); },
      clear: function () { tone(523, 0.08, 'triangle', 0.05); setTimeout(function () { tone(784, 0.14, 'triangle', 0.05); }, 70); },
      setMuted: function (m) { muted = !!m; try { localStorage.setItem('ocurp-mute', m ? '1' : '0'); } catch (e) {} },
      muted: function () { return muted; }
    },
    ease: {
      outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
      outBack: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
      inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    },
    /* rounded, bevelled block used by grid games */
    block: function (ctx, x, y, s, color, alpha) {
      ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
      var r = Math.max(2, s * 0.18);
      var g = ctx.createLinearGradient(x, y, x, y + s);
      g.addColorStop(0, shade(color, 0.28)); g.addColorStop(1, shade(color, -0.18));
      ctx.fillStyle = g; rr(ctx, x + 1, y + 1, s - 2, s - 2, r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(ctx, x + 3, y + 3, s - 6, Math.max(2, s * 0.22), r * 0.6); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; rr(ctx, x + 1.5, y + 1.5, s - 3, s - 3, r); ctx.stroke();
      ctx.restore();
    },
    shade: function (c, k) { return shade(c, k); },
    rr: function (ctx, x, y, w, h, r) { rr(ctx, x, y, w, h, r); }
  };
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)); }
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
})();
