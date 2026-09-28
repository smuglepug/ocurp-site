// Related-items strip shown at the bottom of every tool/game page.
(function () {
  var m = document.getElementById('ws-more');
  if (!m) return;
  // a missing logo tile must not render as a broken image in the strip
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG' || t.dataset.fallback) return;
    if (t.getAttribute('src').indexOf('/workspace/logos/') === -1) return;
    t.dataset.fallback = '1';
    var span = document.createElement('span');
    span.className = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 font-display text-sm font-black text-white/20';
    var nameEl = t.parentElement && t.parentElement.querySelector('span span');
    span.textContent = (nameEl && nameEl.textContent ? nameEl.textContent : '?').slice(0, 2).toUpperCase();
    t.replaceWith(span);
  }, true);
  var isGames = location.pathname.indexOf('/workspace/games/') !== -1;
  var s = document.createElement('script');
  s.src = isGames ? '/workspace/games-data.js' : '/workspace/tools-data.js';
  s.onload = function () {
    if (typeof RAW === 'undefined') return;
    var cur = location.pathname.replace(/\/+$/, '').split('/').pop();
    var me = RAW.filter(function (e) { return e.slug === cur; })[0];
    var others = RAW.filter(function (e) { return e.slug !== cur; });
    if (me) others.sort(function (a, b) { return (b.cat === me.cat) - (a.cat === me.cat); });
    var pick = others.slice(0, 4);
    var sec = isGames ? 'games' : 'tools';
    m.innerHTML = '<p class="ws-label mb-3">More ' + sec + '</p>'
      + '<div class="grid gap-3 sm:grid-cols-2">' + pick.map(function (e) {
        var cat = (typeof CATS !== 'undefined' && CATS[e.cat]) || '';
        return '<a href="/workspace/' + sec + '/' + e.slug + '/" class="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-accent/40">'
          + '<img src="/workspace/logos/' + e.slug + '.png" alt="" loading="lazy" class="h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover">'
          + '<span class="min-w-0"><span class="block truncate font-display text-sm font-bold text-white transition-colors group-hover:text-accent">' + e.name + '</span>'
          + '<span class="block truncate text-[10px] font-black uppercase tracking-[0.2em] text-white/30">' + cat + '</span></span></a>';
      }).join('') + '</div>';
  };
  document.body.appendChild(s);
})();