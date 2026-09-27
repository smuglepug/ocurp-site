// Listing page behaviour: search, chips, cards. Loaded by /workspace/tools/, /workspace/games/ and /workspace/websites/.
(function () {
  var grid = document.getElementById('ws-grid');
  if (!grid || typeof RAW === 'undefined') return;
  var count = document.getElementById('ws-count');
  var empty = document.getElementById('ws-empty');
  var search = document.getElementById('ws-search');
  var cats = document.getElementById('ws-cats');
  var active = 'all';
  var isGames = !!document.querySelector('a[href="/workspace/games/"].text-accent, a[href="/workspace/games/"][class*="text-accent"]');
  var isWebsites = !!document.querySelector('a[href="/workspace/websites/"].text-accent, a[href="/workspace/websites/"][class*="text-accent"]');
  var base = isWebsites ? 'websites' : (isGames ? 'games' : 'tools');

  document.getElementById('ws-year').textContent = new Date().getFullYear();

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function chip(id, label) {
    var on = active === id;
    return '<button data-cat="' + esc(id) + '" class="rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all '
      + (on ? 'border-accent bg-accent/10 text-accent' : 'border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30 hover:text-white/90')
      + '">' + esc(label) + '</button>';
  }

  function cardHTML(e) {
    var cat = (typeof CATS !== 'undefined' && CATS[e.cat]) || (isGames ? 'GAME' : 'TOOL');
    var href = isWebsites ? e.url : '/workspace/' + base + '/' + e.slug + '/';
    var status = e.ready
      ? ''
      : '<span class="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/35"><span class="h-1.5 w-1.5 rounded-full bg-white/30"></span>Building</span>';
    var logo = isWebsites
      ? '<div class="flex h-full w-full items-center justify-center"><span class="font-display text-5xl font-black text-white/15">' + esc(e.name.slice(0, 2).toUpperCase()) + '</span></div>'
      : '<img src="/workspace/logos/' + esc(e.slug) + '.png" alt="' + esc(e.name) + ' logo" class="h-24 w-24 rounded-2xl border border-white/10 object-cover transition-transform duration-500 group-hover:scale-[1.04]">';
    var art = '<div class="relative flex h-44 items-center justify-center overflow-hidden rounded-t-2xl bg-[#0a0a0a]">'
      + '<div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/[0.07] blur-3xl"></div>'
      + logo
      + '</div>';
    var tags = e.tags.filter(function (t) { return String(t).toUpperCase() !== 'CLIENT-SIDE'; }).slice(0, 3).map(function (t) {
      return '<span class="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/65">' + esc(t) + '</span>';
    }).join('');
    var action = '<span class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] '
      + (e.ready ? 'text-accent' : 'text-white/25') + '">'
      + (e.ready ? (isGames ? 'Play' : (isWebsites ? 'Visit' : 'Open')) : 'In build')
      + (e.ready ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M7 17 17 7M9 7h8v8"/></svg>' : '')
      + '</span>';
    var target = isWebsites ? ' target="_blank" rel="noopener"' : '';
    return '<a href="' + href + '"' + target + ' class="group relative flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.045] transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:bg-white/[0.07]" data-card>'
      + art
      + '<div class="flex flex-1 flex-col p-6">'
      + '<div class="flex items-center justify-between gap-3"><span class="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-white/55">' + esc(cat) + '</span>' + status + '</div>'
      + '<h3 class="mt-3 font-display text-2xl font-black leading-tight tracking-tight text-white transition-colors duration-300 group-hover:text-accent">' + esc(e.name) + '</h3>'
      + '<p class="mt-3 line-clamp-2 text-sm leading-relaxed text-white/60">' + esc(e.blurb) + '</p>'
      + '<div class="mt-4 flex flex-wrap gap-1.5">' + tags + '</div>'
      + '<div class="mt-6 flex-1"></div>'
      + action
      + '</div></a>';
  }

  function render() {
    var q = (search.value || '').trim().toLowerCase();
    var items = RAW.filter(function (e) {
      var inCat = active === 'all' || e.cat === active;
      var hay = (e.name + ' ' + e.blurb + ' ' + e.tags.join(' ')).toLowerCase();
      return inCat && (!q || hay.indexOf(q) !== -1);
    });
    grid.innerHTML = items.map(cardHTML).join('');
    count.textContent = items.length + ' of ' + RAW.length + ' shown';
    empty.classList.toggle('hidden', items.length > 0);
    cats.innerHTML = Object.keys(CATS).map(function (id) { return chip(id, CATS[id]); }).join('');
    cats.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { active = b.getAttribute('data-cat'); render(); });
    });
  }

  search.addEventListener('input', render);
  render();
})();