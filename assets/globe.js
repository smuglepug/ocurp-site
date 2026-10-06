/* Hero globe: the original Ocurp point-cloud sphere (45x45 points over a faint 30x30 wireframe),
   redrawn on a 2D canvas so it needs no WebGL or library. No additive blending, no glow. */
(function () {
  var cv = document.getElementById('globe');
  if (!cv || !cv.getContext) return;
  var cx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sphere(seg) {
    var p = [];
    for (var i = 0; i <= seg; i++) {
      var th = i / seg * Math.PI;
      for (var j = 0; j < seg; j++) {
        var ph = j / seg * Math.PI * 2;
        p.push([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]);
      }
    }
    return p;
  }
  var dots = sphere(44), wire = sphere(24), WS = 24;
  var ry = 0, rx = -0.25, mx = 0, my = 0;
  function fit() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function proj(v, R, cyR, syR, cxR, sxR) {
    var x = v[0] * cyR - v[2] * syR, z = v[0] * syR + v[2] * cyR;
    var y = v[1] * cxR - z * sxR; z = v[1] * sxR + z * cxR;
    var f = 3.2 / (3.2 - z * 0.9);
    return [W / 2 + x * R * f, H / 2 + y * R * f, z];
  }
  function frame() {
    cx.clearRect(0, 0, W, H);
    var R = Math.min(W, H) * 0.4;
    var cyR = Math.cos(ry), syR = Math.sin(ry), cxR = Math.cos(rx), sxR = Math.sin(rx);
    /* wireframe: meridians and parallels */
    cx.lineWidth = 0.6;
    cx.strokeStyle = 'rgba(125,212,252,0.13)';
    cx.beginPath();
    var pw = wire.map(function (v) { return proj(v, R, cyR, syR, cxR, sxR); });
    for (var i = 0; i <= WS; i++) for (var j = 0; j < WS; j++) {
      var a = pw[i * WS + j], b = pw[i * WS + (j + 1) % WS];
      cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]);
      if (i < WS) { var c = pw[(i + 1) * WS + j]; cx.moveTo(a[0], a[1]); cx.lineTo(c[0], c[1]); }
    }
    cx.stroke();
    /* points, dimmer on the far side */
    for (var k = 0; k < dots.length; k++) {
      var p = proj(dots[k], R, cyR, syR, cxR, sxR);
      var t = (p[2] + 1) / 2;
      cx.fillStyle = 'rgba(232,244,255,' + (0.18 + t * 0.72).toFixed(2) + ')';
      var s = 0.6 + t * 0.9;
      cx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
    }
  }
  function loop() {
    ry += 0.0016 + mx; rx += my * 0.2;
    rx = Math.max(-0.6, Math.min(0.6, rx));
    frame();
    if (!reduce) requestAnimationFrame(loop);
  }
  addEventListener('pointermove', function (e) {
    mx = (e.clientX / innerWidth - 0.5) * 0.004; my = (e.clientY / innerHeight - 0.5) * 0.004;
  }, { passive: true });
  addEventListener('resize', function () { fit(); if (reduce) frame(); });
  fit(); loop();
})();
