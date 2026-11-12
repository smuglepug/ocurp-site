/* Home page: the Orbit 30 drone as a live 3D model you can turn by hand.
   Nothing is downloaded until the stage is near the screen. Then three.js (already hosted for the
   CAD viewer) and three packed meshes (assets/models/*.bin, made by ederdrone/cad/src/pack_mesh.py)
   are fetched. If WebGL or a download fails, the poster image simply stays. */
(function () {
  var box = document.getElementById('drone3d');
  if (!box) return;
  var stage = box.querySelector('.model-stage'), canvas = box.querySelector('.model-canvas');
  var hint = box.querySelector('.model-hint'), tools = box.querySelector('.model-tools');
  if (!stage || !canvas) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THREE_URL = '/ederdrone/cad/vendor/three.min.js', MODELS = '/assets/models/';
  var started = false;

  function loadScript(src) {
    return new Promise(function (ok, bad) {
      if (window.THREE) return ok();
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s);
    });
  }
  function loadMesh(name) {
    return fetch(MODELS + name + '.bin').then(function (r) { if (!r.ok) throw new Error(name); return r.arrayBuffer(); }).then(function (buf) {
      var dv = new DataView(buf);
      if (dv.getUint32(0, true) !== 0x314d434f) throw new Error('format');   /* 'OCM1' */
      var n = dv.getUint32(4, true), ni = dv.getUint32(8, true), lo = [], size = [], i;
      for (i = 0; i < 3; i++) { lo.push(dv.getFloat32(12 + i * 4, true)); size.push(dv.getFloat32(24 + i * 4, true)); }
      var q = new Uint16Array(buf, 36, n * 3), pos = new Float32Array(n * 3);
      for (i = 0; i < n * 3; i++) pos[i] = lo[i % 3] + q[i] / 65535 * size[i % 3];
      var off = 36 + n * 6; off += (4 - off % 4) % 4;
      var idx = n <= 65535 ? new Uint16Array(buf, off, ni) : new Uint32Array(buf, off, ni);
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      return g;
    });
  }

  function canGL() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }
  function start() {
    if (started) return; started = true;
    if (!canGL()) return;                         /* keep the picture; download nothing */
    stage.classList.add('loading');
    loadScript(THREE_URL)
      .then(function () { return Promise.all([loadMesh('o30_frame'), loadMesh('o30_lid'), loadMesh('o30_deck')]); })
      .then(run)
      .catch(function () { stage.classList.remove('loading'); });
  }

  function run(geo) {
    var T = window.THREE, deg = Math.PI / 180, renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
    catch (e) { stage.classList.remove('loading'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(30, 1, 10, 20000);
    camera.up.set(0, 0, 1);                       /* Z-up, like FreeCAD */
    scene.add(new T.HemisphereLight(0xfff1e6, 0x1a1512, 0.75));
    var key = new T.DirectionalLight(0xffffff, 1.25);
    key.position.set(380, -260, 900); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    var sc = key.shadow.camera; sc.left = -420; sc.right = 420; sc.top = 420; sc.bottom = -420; sc.near = 100; sc.far = 2000;
    key.shadow.radius = 6; key.shadow.bias = -0.0004;
    scene.add(key);
    var fill = new T.DirectionalLight(0xffb48a, 0.4); fill.position.set(-600, 500, 250); scene.add(fill);
    var back = new T.DirectionalLight(0xffffff, 0.5); back.position.set(0, 700, 500); scene.add(back);
    var floor = new T.Mesh(new T.PlaneGeometry(4000, 4000), new T.ShadowMaterial({ opacity: 0.45 }));
    floor.position.z = -20.5; floor.receiveShadow = true; scene.add(floor);

    function std(o) { o.flatShading = true; return new T.MeshStandardMaterial(o); }
    var M = {
      frame: std({ color: 0xe6e8ec, roughness: 0.62, metalness: 0 }),
      dark: std({ color: 0x2a2f37, roughness: 0.45, metalness: 0.2 }),
      deck: std({ color: 0x58616d, roughness: 0.6 }),
      motor: new T.MeshStandardMaterial({ color: 0x1d2127, roughness: 0.3, metalness: 0.75 }),
      disc: new T.MeshStandardMaterial({ color: 0xff8a4c, roughness: 0.3, transparent: true, opacity: 0.13, side: T.DoubleSide, depthWrite: false }),
      blade: new T.MeshStandardMaterial({ color: 0x3a414b, roughness: 0.5 }),
      bat: new T.MeshStandardMaterial({ color: 0x7b8794, roughness: 0.55 })
    };
    function mesh(g, m) { var o = new T.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; }
    function cyl(r, h, x, y, z, m) { var g = new T.CylinderGeometry(r, r, h, 40); g.rotateX(Math.PI / 2); var o = mesh(g, m); o.position.set(x, y, z + h / 2); return o; }
    function prop(r, n) {
      var g = new T.Group();
      g.add(new T.Mesh(new T.CircleGeometry(r, 56), M.disc));
      for (var i = 0; i < n; i++) {
        var b = mesh(new T.BoxGeometry(r * 0.9, r * 0.11, 1.4), M.blade); b.position.x = r * 0.45;
        var p = new T.Group(); p.add(b); p.rotation.z = i * 2 * Math.PI / n; g.add(p);
      }
      return g;
    }

    /* Orbit 30, assembled exactly as the CAD viewer does it */
    var V = { dcr: 143, prop: 152, motorD: 29, motorH: 20, mountZ: 10, bat: [84, 70, 44], batZ: 28 };
    var root = new T.Group(), parts = [], spinners = [];
    function add(obj, explode) { obj.userData.base = obj.position.z; obj.userData.explode = explode * 0.6; root.add(obj); parts.push(obj); }
    add(mesh(geo[0], M.frame), 0);
    add(mesh(geo[2], M.deck), 90);
    add(mesh(geo[1], M.dark), 240);
    var motors = new T.Group(), props = new T.Group();
    [45, 135, 225, 315].forEach(function (a) {
      var x = V.dcr * Math.cos(a * deg), y = V.dcr * Math.sin(a * deg);
      motors.add(cyl(V.motorD / 2, V.motorH, x, y, V.mountZ, M.motor));
      var p = prop(V.prop / 2, 3); p.position.set(x, y, V.mountZ + V.motorH + 2);
      p.userData.dir = (a === 45 || a === 225) ? 1 : -1; props.add(p); spinners.push(p);
    });
    add(motors, 60); add(props, 120);
    var bat = mesh(new T.BoxGeometry(V.bat[0], V.bat[1], V.bat[2]), M.bat);
    bat.position.set(0, 0, V.batZ + V.bat[2] / 2); add(bat, 170);
    scene.add(root);

    /* hand-turned orbit camera: drag to turn, no zoom, so the page still scrolls */
    var yaw = -50 * deg, pitch = 27 * deg, vy = 0, dragging = false, lastX = 0, lastY = 0, idle = 0;
    var spinOn = !reduce, exploded = false, explodeT = 0, aspect = 1;
    function place() {
      var r = 980 * Math.max(1, 1 / aspect) * (1 + explodeT * 0.2);
      var cz = 20 + explodeT * 45;
      camera.position.set(r * Math.cos(pitch) * Math.cos(yaw), r * Math.cos(pitch) * Math.sin(yaw), cz + r * Math.sin(pitch));
      camera.lookAt(0, 0, cz);
    }
    function resize() {
      var r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      aspect = r.width / r.height; camera.aspect = aspect; camera.updateProjectionMatrix();
      if (!running) draw();
    }
    function draw() { place(); renderer.render(scene, camera); }

    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY; vy = 0; idle = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
      stage.classList.add('dragging'); if (hint) hint.classList.add('gone');
      wake();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      yaw -= dx * 0.008; pitch = Math.max(4 * deg, Math.min(86 * deg, pitch + dy * 0.006));
      vy = -dx * 0.008;
    });
    function release() { dragging = false; stage.classList.remove('dragging'); }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('keydown', function (e) {
      var k = e.key, hit = true;
      if (k === 'ArrowLeft') yaw += 0.15; else if (k === 'ArrowRight') yaw -= 0.15;
      else if (k === 'ArrowUp') pitch = Math.min(86 * deg, pitch + 0.1); else if (k === 'ArrowDown') pitch = Math.max(4 * deg, pitch - 0.1);
      else hit = false;
      if (hit) { e.preventDefault(); idle = 0; wake(); if (hint) hint.classList.add('gone'); }
    });
    if (tools) tools.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      if (b.dataset.act === 'explode') { exploded = !exploded; b.setAttribute('aria-pressed', String(exploded)); b.textContent = exploded ? 'Put it back' : 'Pull it apart'; }
      if (b.dataset.act === 'spin') { spinOn = !spinOn; b.setAttribute('aria-pressed', String(spinOn)); b.textContent = spinOn ? 'Stop the props' : 'Spin the props'; }
      wake();
    });

    var running = false, onScreen = true, last = 0, settle = 0;
    function tick(now) {
      if (!running) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      if (!dragging) {
        idle += dt;
        yaw += vy; vy *= Math.pow(0.004, dt);
        if (!reduce && idle > 2.5) yaw += dt * 0.22 * Math.min(1, (idle - 2.5) / 1.5);   /* drift when left alone */
      }
      if (spinOn) spinners.forEach(function (p) { p.rotation.z += p.userData.dir * dt * 16; });
      var target = exploded ? 1 : 0, was = explodeT;
      explodeT += (target - explodeT) * Math.min(1, dt * 6);
      parts.forEach(function (o) { o.position.z = o.userData.base + o.userData.explode * explodeT; });
      draw();
      /* under reduced motion nothing moves by itself, so stop once everything has settled */
      if (reduce && !spinOn && !dragging && Math.abs(vy) < 0.0004 && Math.abs(explodeT - was) < 0.0005) { if (++settle > 10) { running = false; return; } } else settle = 0;
      requestAnimationFrame(tick);
    }
    function wake() { if (running || !onScreen || document.hidden) return; running = true; last = 0; settle = 0; requestAnimationFrame(tick); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else wake(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; if (onScreen) wake(); else running = false; }).observe(stage);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage); else addEventListener('resize', resize);

    resize(); draw();
    canvas.hidden = false; canvas.tabIndex = 0;
    stage.classList.remove('loading'); stage.classList.add('live');
    if (hint) hint.hidden = false;
    if (tools) [].forEach.call(tools.querySelectorAll('button[data-act]'), function (b) {
      b.hidden = false;
      if (b.dataset.act === 'spin') { b.setAttribute('aria-pressed', String(spinOn)); b.textContent = spinOn ? 'Stop the props' : 'Spin the props'; }
    });
    wake();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '500px 0px' });
    io.observe(box);
  } else start();
})();
