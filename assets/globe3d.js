/* Hero globe in real 3D (WebGL 1, no library).
   The Ocurp point-cloud sphere over a faint wireframe, an ember orbit ring with one satellite
   (the brand mark), and sparse dust behind it for depth. Normal alpha blending: no additive glow.
   Pointer or device tilt turns the scene; scrolling the hero away dollies the camera in.
   If WebGL is missing or fails, the old 2D canvas globe (/assets/globe.js) is loaded instead. */
(function () {
  var cv = document.getElementById('globe');
  if (!cv) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = cv.closest ? cv.closest('.hero') : cv.parentNode;

  function fallback() {
    /* a canvas that has handed out a WebGL context can't give a 2D one, so swap in a fresh canvas */
    var fresh = document.createElement('canvas');
    fresh.id = 'globe'; fresh.className = 'globe'; fresh.setAttribute('aria-hidden', 'true');
    cv.parentNode.replaceChild(fresh, cv);
    var s = document.createElement('script');
    s.src = '/assets/globe.js?v=1';
    document.body.appendChild(s);
  }

  var gl = null;
  try {
    var opts = { alpha: true, antialias: true, depth: false, stencil: false, powerPreference: 'low-power' };
    gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
  } catch (e) { gl = null; }
  if (!gl) { fallback(); return; }

  var VS = [
    'attribute vec3 aPos;',
    'uniform mat3 uRot; uniform vec3 uOff; uniform vec3 uCam; uniform vec4 uProj;',
    'uniform float uSize; uniform float uRef; uniform float uNear; uniform float uFar; uniform float uSpan;',
    'varying float vA;',
    'void main(){',
    '  vec3 r = uRot * aPos;',
    '  vec3 v = r + uOff - uCam;',
    '  gl_Position = vec4(v.x * uProj.x, v.y * uProj.y, v.z * uProj.z + uProj.w, -v.z);',
    '  gl_PointSize = max(1.0, uSize * uRef / max(0.2, -v.z));',
    '  vA = mix(uFar, uNear, clamp(r.z / uSpan * 0.5 + 0.5, 0.0, 1.0));',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float;',
    'uniform vec3 uCol; uniform float uRound; uniform float uFade;',
    'varying float vA;',
    'void main(){',
    '  float a = vA * uFade;',
    '  if (uRound > 0.5) { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; a *= smoothstep(0.5, 0.36, d); }',
    '  gl_FragColor = vec4(uCol * a, a);',
    '}'
  ].join('\n');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }

  /* geometry */
  function spherePts(seg) {
    var p = [];
    for (var i = 0; i <= seg; i++) {
      var th = i / seg * Math.PI;
      for (var j = 0; j < seg; j++) {
        var ph = j / seg * Math.PI * 2;
        p.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
      }
    }
    return p;
  }
  function sphereLines(seg) {
    var p = spherePts(seg), out = [];
    function v(i, j) { var k = (i * seg + (j % seg)) * 3; out.push(p[k], p[k + 1], p[k + 2]); }
    for (var i = 0; i <= seg; i++) for (var j = 0; j < seg; j++) {
      v(i, j); v(i, j + 1);
      if (i < seg) { v(i, j); v(i + 1, j); }
    }
    return out;
  }
  var RING_R = 1.42;
  function ringPts(n) {
    var p = [];
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; p.push(Math.cos(a) * RING_R, 0, Math.sin(a) * RING_R); }
    return p;
  }
  function dustPts(n) {
    var p = [], s = 20260904; /* fixed seed: the same sky on every visit */
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    for (var i = 0; i < n; i++) p.push((rnd() - 0.5) * 16, (rnd() - 0.5) * 10, -1.5 - rnd() * 7);
    return p;
  }

  var prog, loc = {}, buf = {}, count = {};
  function build() {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(prog);
    ['uRot', 'uOff', 'uCam', 'uProj', 'uSize', 'uRef', 'uNear', 'uFar', 'uSpan', 'uCol', 'uRound', 'uFade']
      .forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
    var geo = { dots: spherePts(44), wire: sphereLines(24), ring: ringPts(420), sat: [RING_R, 0, 0], dust: dustPts(240) };
    Object.keys(geo).forEach(function (k) {
      buf[k] = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf[k]);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo[k]), gl.STATIC_DRAW);
      count[k] = geo[k].length / 3;
    });
    gl.enableVertexAttribArray(0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   /* colours are premultiplied in the shader */
    gl.clearColor(0, 0, 0, 0);
  }
  try { build(); } catch (e) { fallback(); return; }

  /* 3x3 rotations, column-major */
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; }
  function rotZ(a) { var c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; }
  function mul(a, b) {
    var o = new Array(9);
    for (var c = 0; c < 3; c++) for (var r = 0; r < 3; r++)
      o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
    return o;
  }

  var W = 0, H = 0, dpr = 1, R = 200, liftY = 0;
  var FOV = 30 * Math.PI / 180, F = 1 / Math.tan(FOV / 2);
  function fit() {
    var r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    var w = Math.round(W * dpr), h = Math.round(H * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    /* same on-screen size and position as the 2D globe it replaces */
    R = Math.min(820, innerWidth * 1.3) * 0.4;
    liftY = innerWidth < 600 ? 0.2 : 0.1;
    return true;
  }

  var spin = 0, tx = 0, ty = 0, px = 0, py = 0, sp = 0, spT = 0, last = 0, intro = reduce ? 1 : 0;
  var running = false, visible = true, lost = false;
  var dYaw = 0, dPitch = 0, vYaw = 0, dragging = false, lastX = 0, lastY = 0;

  function draw(kind, mode, rot, off, cam, size, near, far, span, col, round, fade, ref) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf[kind]);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix3fv(loc.uRot, false, rot);
    gl.uniform3fv(loc.uOff, off); gl.uniform3fv(loc.uCam, cam);
    gl.uniform1f(loc.uSize, size * dpr); gl.uniform1f(loc.uRef, ref);
    gl.uniform1f(loc.uNear, near); gl.uniform1f(loc.uFar, far); gl.uniform1f(loc.uSpan, span);
    gl.uniform3fv(loc.uCol, col); gl.uniform1f(loc.uRound, round); gl.uniform1f(loc.uFade, fade);
    gl.drawArrays(mode, 0, count[kind]);
  }

  var ICE = [0.91, 0.957, 1], SKY = [0.49, 0.83, 0.99], EMBER = [1, 0.416, 0.169], IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  function frame() {
    if (!W && !fit()) return;
    var ease = 1 - Math.pow(1 - intro, 3);
    var d0 = F * H / (2 * R);                       /* distance at which the unit sphere is R css px */
    var dist = d0 * (1.28 - 0.28 * ease) * (1 - 0.42 * sp);
    var cam = [px * 0.28, -py * 0.16 - sp * 0.35, dist];
    var off = [0, liftY, 0];
    gl.uniform4f(loc.uProj, F * H / W, F, -1.002, -0.2);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var tilt = rotX(-0.25 + py * 0.22 + sp * 0.4 + dPitch);
    var globe = mul(tilt, rotY(spin + px * 0.5 + sp * 0.9 + dYaw));
    var ring = mul(mul(tilt, rotZ(-0.42)), mul(rotX(0.3), rotY(-spin * 2.4 - px * 0.3)));
    var sky = mul(rotX(py * 0.03), rotY(px * 0.05));

    draw('dust', gl.POINTS, sky, [0, 0, 0], cam, 1.5, 0.34, 0.34, 1, ICE, 1, ease, d0);
    draw('wire', gl.LINES, globe, off, cam, 1, 0.2, 0.05, 1, SKY, 0, ease, d0);
    draw('dots', gl.POINTS, globe, off, cam, 1.7, 0.8, 0.14, 1, ICE, 1, ease, d0);
    draw('ring', gl.POINTS, ring, off, cam, 1.7, 0.85, 0.1, RING_R, EMBER, 1, ease, d0);
    draw('sat', gl.POINTS, ring, off, cam, 8, 1, 0.3, RING_R, EMBER, 1, ease, d0);
  }

  function scrollTarget() {
    if (!hero) return 0;
    var r = hero.getBoundingClientRect();
    return Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
  }

  function loop(now) {
    if (!running) return;
    var dt = last ? Math.min(64, now - last) : 16; last = now;
    intro = Math.min(1, intro + dt / 1600);
    spin += dt * 0.0001;
    var k = 1 - Math.pow(0.001, dt / 1000);        /* frame-rate independent easing */
    px += (tx - px) * k; py += (ty - py) * k;
    sp += (spT - sp) * Math.min(1, k * 1.6);
    if (!dragging) { dYaw += vYaw; vYaw *= Math.pow(0.12, dt / 1000); dPitch *= Math.pow(0.2, dt / 1000); }
    frame();
    requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || lost || !visible || document.hidden) return; running = true; last = 0; requestAnimationFrame(loop); }
  function stop() { running = false; }

  addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  if (matchMedia('(pointer: coarse)').matches) {
    addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 28));
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 28));
    }, { passive: true });
  }
  /* grab the globe: drag anywhere in the hero that is not a link or button */
  if (hero) {
    var hintEl = null;
    hero.classList.add('spin');
    hero.addEventListener('pointerdown', function (e) {
      if (e.button || (e.target.closest && e.target.closest('a,button,input,textarea'))) return;
      dragging = true; lastX = e.clientX; lastY = e.clientY; vYaw = 0;
      hero.classList.add('dragging'); if (hintEl) hintEl.classList.add('gone');
    });
    addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      dYaw += dx * 0.007; vYaw = dx * 0.007;
      dPitch = Math.max(-0.9, Math.min(0.9, dPitch + dy * 0.005));
      if (!running) frame();
    }, { passive: true });
    var drop = function () { if (dragging) { dragging = false; hero.classList.remove('dragging'); } };
    addEventListener('pointerup', drop); addEventListener('pointercancel', drop);
    var inner = hero.querySelector('.hero-inner');
    if (inner) { hintEl = document.createElement('p'); hintEl.className = 'hero-hint'; hintEl.setAttribute('aria-hidden', 'true'); hintEl.textContent = 'Drag the globe to spin it'; inner.appendChild(hintEl); }
  }
  addEventListener('scroll', function () { spT = scrollTarget(); }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
  }
  var onSize = function () { W = 0; if (fit() && (reduce || !running)) frame(); };
  if ('ResizeObserver' in window) new ResizeObserver(onSize).observe(cv); else addEventListener('resize', onSize);
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; stop(); });
  cv.addEventListener('webglcontextrestored', function () { try { build(); lost = false; W = 0; start(); if (reduce) frame(); } catch (e) {} });

  cv.classList.add('gl');
  spT = sp = scrollTarget();
  fit();
  if (reduce) frame(); else start();
  requestAnimationFrame(function () { cv.classList.add('on'); });
})();
