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
    return '<button data-cat="' + esc(id) + '" class="rounded-full border px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all '
      + (on ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 bg-white/[0.03] text-white/40 hover:border-white/25 hover:text-white/70')
      + '">' + esc(label) + '</button>';
  }

  function cardHTML(e) {
    var cat = (typeof CATS !== 'undefined' && CATS[e.cat]) || (isGames ? 'GAME' : 'TOOL');
    var href = isWebsites ? e.url : '/workspace/' + base + '/' + e.slug + '/';
    var status = e.ready
      ? '<span class="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2 py-0.5 text-[8px] font-black text-green-400 uppercase tracking-widest"><span class="h-1 w-1 rounded-full bg-green-500"></span>Ready</span>'
      : '<span class="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[8px] font-black text-white/30 uppercase tracking-widest"><span class="h-1 w-1 rounded-full bg-white/30"></span>Building</span>';
    var logo = isWebsites
      ? '<div class="flex h-full w-full items-center justify-center"><span class="font-display text-3xl font-black text-white/15">' + esc(e.name.slice(0,2).toUpperCase()) + '</span></div>'
      : '<img src="/workspace/logos/' + esc(e.slug) + '.png" alt="' + esc(e.name) + ' logo" loading="lazy" class="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-lg transition-transform duration-500 group-hover:scale-105">';
    var art = '<div class="relative flex h-40 items-center justify-center overflow-hidden rounded-t-[1.2rem] border-b border-white/5 bg-[#0a0a0a]">'
      + '<div class="absolute inset-0 opacity-[0.06]" style="background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);background-size:22px 22px"></div>'
      + '<div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl"></div>'
      + '<span class="absolute left-4 top-4 font-mono text-[9px] font-black uppercase tracking-[0.3em] text-white/25">' + esc(cat) + '</span>'
      + logo
      + '</div>';
    var tags = e.tags.map(function (t) {
      return '<span class="rounded-md border border-white/5 bg-white/5 px-2 py-1 text-[7px] font-black uppercase tracking-[0.15em] text-white/30">' + esc(t) + '</span>';
    }).join('');
    var action = e.ready
      ? '<span class="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-[9px] font-black uppercase tracking-[0.3em] text-black shadow-lg">' + (isGames ? 'Play' : (isWebsites ? 'Visit' : 'Open')) + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg></span>'
      : '<span class="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] py-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">In build</span>';
    var target = isWebsites ? ' target="_blank" rel="noopener"' : '';
    return '<a href="' + href + '"' + target + ' class="group relative overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.03] transition-all duration-500 hover:-translate-y-1 hover:border-accent/40 hover:bg-white/[0.05]" data-card>'
      + art
      + '<div class="flex flex-col p-5">'
      + '<div class="flex items-center justify-between"><span class="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white/30">' + esc(e.slug) + '</span>' + status + '</div>'
      + '<h3 class="mt-2 font-display text-lg font-black text-white leading-tight group-hover:text-accent transition-colors duration-300">' + esc(e.name) + '</h3>'
      + '<p class="mt-2 line-clamp-2 text-[11px] text-white/45 leading-relaxed">' + esc(e.blurb) + '</p>'
      + '<div class="mt-3 flex flex-wrap gap-1">' + tags + '</div>'
      + '<div class="mt-4">' + action + '</div>'
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