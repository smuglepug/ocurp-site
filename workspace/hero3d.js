/* Section hero: a slowly rotating 3D wireframe, one distinct shape per section.
   The shape comes from the canvas data-shape attribute. No libraries.
   Shapes: "cubes" (nested cubes - tools), "torus" (games). Deliberately not a globe. */
(function () {
  var cv = document.getElementById('ws-3d');
  if (!cv) return;
  var cx = cv.getContext('2d');
  var shape = cv.dataset.shape || 'cubes';
  var W = 0, H = 0;

  function fit() {
    var r = cv.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var P = [], E = [];
  function pt(x, y, z) { P.push([x, y, z]); return P.length - 1; }
  function link(a, b) { E.push([a, b]); }

  /* nested cube shells joined corner-to-corner */
  function buildCubes(sizes) {
    var shells = [];
    for (var si = 0; si < sizes.length; si++) {
      var s = sizes[si], ids = [];
      for (var a = -1; a <= 1; a += 2)
        for (var b = -1; b <= 1; b += 2)
          for (var c = -1; c <= 1; c += 2) ids.push(pt(a * s, b * s, c * s));
      shells.push(ids);
      var id = function (x, y, z) { return ids[(x ? 4 : 0) + (y ? 2 : 0) + (z ? 1 : 0)]; };
      var pairs = [
        [0,0,0, 0,0,1], [0,0,0, 0,1,0], [0,0,0, 1,0,0],
        [0,0,1, 0,1,1], [0,0,1, 1,0,1], [0,1,0, 0,1,1],
        [0,1,0, 1,1,0], [1,0,0, 1,0,1], [1,0,0, 1,1,0],
        [1,1,0, 1,1,1], [1,0,1, 1,1,1], [0,1,1, 1,1,1]
      ];
      for (var p = 0; p < pairs.length; p++) {
        var q = pairs[p];
        link(id(q[0], q[1], q[2]), id(q[3], q[4], q[5]));
      }
    }
    for (var i = 1; i < shells.length; i++)
      for (var k = 0; k < 8; k++) link(shells[i - 1][k], shells[i][k]);
  }

  /* wireframe torus - playful, and nothing like a globe */
  function buildTorus(R, r, seg, tube) {
    var grid = [];
    for (var i = 0; i < seg; i++) {
      var u = i / seg * Math.PI * 2, row = [];
      for (var j = 0; j < tube; j++) {
        var v = j / tube * Math.PI * 2;
        row.push(pt((R + r * Math.cos(v)) * Math.cos(u),
                    r * Math.sin(v),
                    (R + r * Math.cos(v)) * Math.sin(u)));
      }
      grid.push(row);
    }
    for (var a = 0; a < seg; a++) for (var b = 0; b < tube; b++) {
      link(grid[a][b], grid[(a + 1) % seg][b]);
      link(grid[a][b], grid[a][(b + 1) % tube]);
    }
  }

  /* link every pair closer than 1.15x the shortest gap - gives correct edges for any
     reasonably regular solid without hardcoding an edge list */
  function autoEdges(from) {
    var min = Infinity, i, j, dx, dy, dz, d;
    for (i = 0; i < P.length; i++) for (j = i + 1; j < P.length; j++) {
      dx = P[i][0] - P[j][0]; dy = P[i][1] - P[j][1]; dz = P[i][2] - P[j][2];
      d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > 0.0001 && d < min) min = d;
    }
    for (i = 0; i < P.length; i++) for (j = i + 1; j < P.length; j++) {
      dx = P[i][0] - P[j][0]; dy = P[i][1] - P[j][1]; dz = P[i][2] - P[j][2];
      d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > 0.0001 && d <= min * 1.15) link(i, j);
    }
  }

  /* dodecahedron - for the projects section */
  function buildDodeca() {
    var PHI = (1 + Math.sqrt(5)) / 2, i = 1 / PHI;
    var v = [];
    [-1, 1].forEach(function (x) { [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) { v.push([x, y, z]); }); }); });
    [-i, i].forEach(function (a) { [-PHI, PHI].forEach(function (b) {
      v.push([0, a, b]); v.push([a, b, 0]); v.push([b, 0, a]);
    }); });
    v.forEach(function (p) { var s = 0.72; pt(p[0] * s, p[1] * s, p[2] * s); });
    autoEdges();
  }

  /* node network on a sphere - for the websites section */
  function buildNetwork() {
    var n = 26, pts = [];
    for (var k = 0; k < n; k++) {
      var y = 1 - (k / (n - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = k * 2.399963229728653;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    pts.forEach(function (p) { pt(p[0] * 1.15, p[1] * 1.15, p[2] * 1.15); });
    var min = Infinity, i, j, dx, dy, dz, d;
    for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) {
      dx = pts[i][0] - pts[j][0]; dy = pts[i][1] - pts[j][1]; dz = pts[i][2] - pts[j][2];
      d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < min) min = d;
    }
    for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) {
      dx = pts[i][0] - pts[j][0]; dy = pts[i][1] - pts[j][1]; dz = pts[i][2] - pts[j][2];
      d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d <= min * 1.55) link(i, j);
    }
  }

  if (shape === 'torus') buildTorus(1, 0.44, 20, 10);
  else if (shape === 'network') buildNetwork();
  else if (shape === 'dodeca') buildDodeca();
  else buildCubes([1, 0.58, 0.26]);

  function project(p, ry, rx) {
    var x = p[0], y = p[1], z = p[2];
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    var cxx = Math.cos(rx), sxx = Math.sin(rx);
    var y1 = y * cxx - z1 * sxx, z2 = y * sxx + z1 * cxx;
    var f = 3.4, s = Math.min(W, H) * 0.30;
    var k = f / (f + z2);
    return [W / 2 + x1 * s * k, H / 2 + y1 * s * k, k];
  }

  var t = 0;
  function draw() {
    cx.clearRect(0, 0, W, H);
    var ry = t, rx = 0.45 + Math.sin(t * 0.65) * 0.13;
    var pts = [];
    for (var i = 0; i < P.length; i++) pts.push(project(P[i], ry, rx));

    cx.lineWidth = 1;
    cx.strokeStyle = 'rgba(255,255,255,0.20)';
    cx.beginPath();
    for (var e = 0; e < E.length; e++) {
      cx.moveTo(pts[E[e][0]][0], pts[E[e][0]][1]);
      cx.lineTo(pts[E[e][1]][0], pts[E[e][1]][1]);
    }
    cx.stroke();

    var order = [];
    for (var n = 0; n < pts.length; n++) order.push(n);
    order.sort(function (a, b) { return pts[b][2] - pts[a][2]; });
    var glow = Math.max(4, Math.round(pts.length * 0.05));
    for (var m = 0; m < order.length; m++) {
      var idx = order[m], p = pts[idx];
      var near = m < glow;
      cx.fillStyle = near
        ? 'rgba(255,95,31,0.92)'
        : 'rgba(255,255,255,' + (0.16 + 0.40 * Math.max(0, Math.min(1, p[2] - 0.6))).toFixed(2) + ')';
      cx.beginPath();
      cx.arc(p[0], p[1], near ? 2.1 : 1.35, 0, Math.PI * 2);
      cx.fill();
    }
  }

  function loop() {
    t += 0.0042;
    draw();
    requestAnimationFrame(loop);
  }

  fit();
  draw();                                   /* paint the first frame immediately */
  window.addEventListener('resize', function () { fit(); draw(); });
  requestAnimationFrame(loop);
})();