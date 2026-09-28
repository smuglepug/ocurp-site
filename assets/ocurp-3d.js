/* Featured Projects section on the homepage: gives it its own 3D wireframe (a dodecahedron),
   distinct from the hero globe. The section is React-rendered, so the canvas is injected
   after mount and the shared renderer is loaded once it exists. */
(function () {
  var done = false;

  function inject() {
    var sec = document.getElementById('portfolio');
    if (!sec) return false;
    if (sec.querySelector('#ws-3d')) { done = true; return true; }

    sec.style.position = 'relative';
    sec.style.overflow = 'hidden';

    var wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.className = 'ocurp-3d';
    wrap.style.cssText = 'position:absolute;right:-70px;top:-30px;width:380px;height:380px;' +
      'opacity:.55;pointer-events:none;z-index:0';
    wrap.innerHTML = '<canvas id="ws-3d" data-shape="dodeca" style="width:100%;height:100%"></canvas>';
    sec.insertBefore(wrap, sec.firstChild);

    function size() { wrap.style.display = window.innerWidth >= 1024 ? 'block' : 'none'; }
    size();
    window.addEventListener('resize', size);

    /* load the shared renderer now that the canvas is in the DOM */
    if (!document.getElementById('ocurp-3d-lib')) {
      var s = document.createElement('script');
      s.id = 'ocurp-3d-lib';
      s.src = '/workspace/hero3d.js';
      document.head.appendChild(s);
    }
    done = true;
    return true;
  }

  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (done || inject() || tries > 60) clearInterval(iv);
  }, 250);
})();