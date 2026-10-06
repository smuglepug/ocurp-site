/* Workspace catalogue: renders /workspace/games/ and /workspace/tools/ from the registries
   (games-data.js / tools-data.js define RAW and CATS). Every card shows a real screenshot
   of the running page (<slug>/card.jpg). Shared genre/category colours live in WS_META so
   detail pages use the same colour. */
(function () {
  var M = window.WS_META;
  var kind = document.body.getAttribute('data-kind');           /* games | tools */
  var grid = document.getElementById('grid');
  if (!grid || typeof RAW === 'undefined' || !M) return;
  var items = RAW.filter(function (e) { return e.slug; });
  var search = document.getElementById('q'), chips = document.getElementById('chips'), count = document.getElementById('count');
  var empty = document.getElementById('empty'), feat = document.getElementById('featured');
  var active = 'all';
  var groupOf = function (e) { return M.group(kind, e); };
  var groups = M.groups(kind);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function href(e) { return '/workspace/' + kind + '/' + e.slug + '/'; }
  function shot(e) { return '/workspace/' + kind + '/' + e.slug + '/card.jpg?v=' + M.v; }
  var verb = kind === 'games' ? 'Play' : 'Open';
  var arrow = '<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14 14 6M7 6h7v7"/></svg>';

  function card(e, i) {
    var g = groups[groupOf(e)] || { label: '', c: '#8ab4ff' };
    return '<a class="tile-card" href="' + href(e) + '" style="--c:' + g.c + '">'
      + '<div class="shot"><img src="' + shot(e) + '" alt="" loading="' + (i < 8 ? 'eager' : 'lazy') + '" decoding="async" width="480" height="300" onerror="this.remove()">'
      + (e.ready === false ? '<span class="building">In build</span>' : '')
      + '<span class="go" aria-hidden="true">' + verb + ' ' + arrow + '</span></div>'
      + '<div class="body"><span class="genre">' + esc(g.label) + '</span><h3>' + esc(e.name) + '</h3><p>' + esc(e.blurb || e.desc || '') + '</p></div></a>';
  }

  function featured() {
    if (!feat) return;
    var picks = (M.featured[kind] || []).map(function (s) { return items.filter(function (e) { return e.slug === s; })[0]; }).filter(Boolean);
    feat.innerHTML = picks.map(function (e) {
      var g = groups[groupOf(e)] || { label: '', c: '#8ab4ff' };
      return '<a class="feat" href="' + href(e) + '" style="--c:' + g.c + '"><img src="' + shot(e) + '" alt="" decoding="async">'
        + '<span class="btn btn-primary play" aria-hidden="true">' + verb + ' ' + arrow + '</span>'
        + '<div class="meta"><span class="genre">' + esc(g.label) + '</span><h3>' + esc(e.name) + '</h3><p>' + esc(e.blurb || '') + '</p></div></a>';
    }).join('');
  }

  function renderChips() {
    var counts = {};
    items.forEach(function (e) { var k = groupOf(e); counts[k] = (counts[k] || 0) + 1; });
    var html = '<button class="chip" data-g="all" aria-pressed="' + (active === 'all') + '">All <small>' + items.length + '</small></button>';
    Object.keys(groups).forEach(function (k) {
      if (!counts[k]) return;
      html += '<button class="chip" data-g="' + k + '" style="--c:' + groups[k].c + '" aria-pressed="' + (active === k) + '"><i></i>' + esc(groups[k].label) + ' <small>' + counts[k] + '</small></button>';
    });
    chips.innerHTML = html;
  }

  function render() {
    var q = (search.value || '').trim().toLowerCase();
    var list = items.filter(function (e) {
      if (active !== 'all' && groupOf(e) !== active) return false;
      if (!q) return true;
      return (e.name + ' ' + (e.blurb || '') + ' ' + (e.tags || []).join(' ') + ' ' + e.slug).toLowerCase().indexOf(q) !== -1;
    });
    grid.innerHTML = list.map(card).join('');
    count.textContent = list.length === items.length ? items.length + ' ' + kind : list.length + ' of ' + items.length + ' ' + kind;
    empty.hidden = list.length > 0;
    if (feat) feat.hidden = !!q || active !== 'all';
    renderChips();
  }

  chips.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-g]'); if (!b) return;
    active = b.getAttribute('data-g'); render();
  });
  search.addEventListener('input', render);
  var p = new URLSearchParams(location.search);
  if (p.get('q')) search.value = p.get('q');
  if (p.get('c') && groups[p.get('c')]) active = p.get('c');
  featured(); render();

  /* faint mosaic of screenshots behind the hero */
  var mo = document.getElementById('mosaic');
  if (mo) mo.innerHTML = items.slice(0, 24).map(function (e) { return '<img src="' + shot(e) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">'; }).join('');
})();
