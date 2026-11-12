/* Home page depth: cards tilt toward the pointer (mouse) or with scroll position (touch),
   screenshots slide behind their frames under the pointer, and the hero copy recedes as the globe comes forward.
   Does nothing under prefers-reduced-motion. Styles are in home3d.css. */
(function () {
  var d = document;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  d.documentElement.classList.add('d3');
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var items = [].slice.call(d.querySelectorAll('.work-grid .card, .lab-item, .cat, .principles li'));
  var hero = d.querySelector('.hero'), heroInner = d.querySelector('.hero-inner');

  items.forEach(function (el) {
    el.classList.add('tilt');
    /* the entrance uses a slow transition; switch to a quick one once it has finished */
    if (!el.classList.contains('reveal')) { el.classList.add('settled'); return; }
    el.addEventListener('transitionend', function (e) {
      if (e.target === el && e.propertyName === 'opacity') el.classList.add('settled');
    });
  });
  setTimeout(function () { items.forEach(function (el) { el.classList.add('settled'); }); }, 4200);

  function set(el, k, v) { el.style.setProperty(k, v); }

  if (fine) {
    items.forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width * 2 - 1, ny = (e.clientY - r.top) / r.height * 2 - 1;
        var max = r.width > 700 ? 2 : r.width > 420 ? 4 : 6;
        set(el, '--tx', (nx * max).toFixed(2) + 'deg');
        set(el, '--ty', (-ny * max).toFixed(2) + 'deg');
        set(el, '--px', nx.toFixed(3)); set(el, '--py', ny.toFixed(3));
      }, { passive: true });
      el.addEventListener('pointerleave', function () {
        set(el, '--tx', '0deg'); set(el, '--ty', '0deg'); set(el, '--px', '0'); set(el, '--py', '0');
      }, { passive: true });
    });
  }

  /* scroll-driven depth: only for what is on screen */
  var seen = [];
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var i = seen.indexOf(e.target);
        if (e.isIntersecting && i < 0) seen.push(e.target);
        else if (!e.isIntersecting && i >= 0) seen.splice(i, 1);
      });
      queue();
    }, { rootMargin: '80px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else { seen = items.slice(); }

  var queued = false;
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  function update() {
    queued = false;
    var vh = innerHeight;
    for (var i = 0; i < seen.length; i++) {
      var el = seen[i], r = el.getBoundingClientRect();
      var n = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      n = Math.max(-1, Math.min(1, n));
      if (!fine) set(el, '--ty', (n * 6).toFixed(2) + 'deg');
    }
    if (hero && heroInner) {
      var h = hero.getBoundingClientRect();
      if (h.bottom > 0) {
        var p = Math.max(0, Math.min(1, -h.top / Math.max(1, h.height)));
        heroInner.style.transform = p ? 'translate3d(0,' + (p * 70).toFixed(1) + 'px,0) scale(' + (1 - p * 0.08).toFixed(4) + ')' : '';
        heroInner.style.opacity = p ? Math.max(0, 1 - p * 1.5).toFixed(3) : '';
      }
    }
  }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });
  queue();
})();
