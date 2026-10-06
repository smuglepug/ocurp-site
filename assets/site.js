(function () {
  var d = document;
  /* mobile menu */
  var btn = d.querySelector('.menu-btn'), nav = d.getElementById('mobile-nav');
  if (btn && nav) {
    var set = function (on) {
      nav.classList.toggle('open', on); btn.setAttribute('aria-expanded', String(on));
      btn.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
      d.body.style.overflow = on ? 'hidden' : '';
    };
    btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    matchMedia('(min-width:900px)').addEventListener('change', function (e) { if (e.matches) set(false); });
  }
  /* scroll reveal, with a fail-safe so content is never left hidden */
  var els = [].slice.call(d.querySelectorAll('.reveal'));
  var showAll = function () { els.forEach(function (el) { el.classList.add('in'); }); };
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(showAll, 2500);
    addEventListener('pageshow', showAll);
  } else { showAll(); }
  /* current section in the header nav */
  var links = [].slice.call(d.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window && links.length) {
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false'); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['work', 'workspace', 'about', 'contact'].forEach(function (id) { var s = d.getElementById(id); if (s) so.observe(s); });
  }
  var yr = d.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
  /* live counts from the registries; the static fallback values stay if a fetch fails */
  var targets = { tools: '/workspace/tools-data.js', games: '/workspace/games-data.js', sites: '/workspace/websites-data.js' };
  Object.keys(targets).forEach(function (k) {
    fetch(targets[k]).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      var n = (t.match(/^\s*\{slug:.*$/gm) || []).filter(function (l) { return l.indexOf('ready:false') < 0; }).length;
      if (!n) return;
      d.querySelectorAll('[data-count="' + k + '"]').forEach(function (el) {
        el.textContent = el.tagName === 'B' ? String(n) : n + (k === 'sites' ? ' sites' : ' ' + k);
      });
    }).catch(function () {});
  });
  /* contact form: builds a mailto so the message really goes somewhere */
  var f = d.getElementById('contact-form');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = f.elements.name.value.trim(), m = f.elements.message.value.trim();
    location.href = 'mailto:oowenosayi@gmail.com?subject=' + encodeURIComponent('Project enquiry from ' + n) +
      '&body=' + encodeURIComponent(m + '\n\n' + n);
  });
})();
