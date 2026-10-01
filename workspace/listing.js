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

  /* A tool without a generated logo tile would otherwise render as a broken
     image on its card, so swap any failed logo for its monogram text. */
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG' || t.dataset.fallback) return;
    if (t.getAttribute('src').indexOf('/workspace/logos/') === -1) return;
    t.dataset.fallback = '1';
    var span = document.createElement('span');
    span.className = t.className + ' flex items-center justify-center font-display text-4xl font-black text-white/15';
    span.textContent = (t.alt || '?').replace(' logo', '').slice(0, 2).toUpperCase();
    t.replaceWith(span);
  }, true);

  function chip(id, label) {
    var on = active === id;
    return '<button data-cat="' + esc(id) + '" class="rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all '
      + (on ? 'border-accent bg-accent/10 text-accent' : 'border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30 hover:text-white/90')
      + '">' + esc(label) + '</button>';
  }

  /* ---- cover art ------------------------------------------------------------
     Full-bleed artwork behind each card so the container is covered edge to
     edge. Drawn in-page (no image requests, no hosting, no licensing), seeded
     off the slug so every card is stable and distinct. */
  function seeded(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5;
      var t = h; t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var ACCENT = '#FF5F1F';

  function patternKind(e) {
    var s = (e.slug + ' ' + (e.name || '') + ' ' + (e.tags || []).join(' ')).toLowerCase();
    if (/chess|checker|reversi|othello|go\b|gomoku|scrabble|wordsearch/.test(s)) return 'board';
    if (/sand|fall|fire|alchemy|element|particle|physic/.test(s)) return 'particles';
    if (/snake|maze|labyrinth|path|route|ant/.test(s)) return 'grid';
    if (/tetris|2048|tile|block|slide|puzzle|match|solitaire|memory/.test(s)) return 'tiles';
    if (/simon|ring|circle|orbit|spin|wheel|periodic/.test(s)) return 'rings';
    if (/mastermind|code|binary|hash|logic|deduc/.test(s)) return 'dots';
    if (/asteroid|space|star|ray|sky|planet|rocket|shooter/.test(s)) return 'rays';
    if (/hangman|word|letter|typing|type|text|prompt|human|correct|grammar/.test(s)) return 'tiles';
    if (/map|hex|empire|tactic|strateg|civ|territor|colony/.test(s)) return 'hexes';
    return ['grid', 'dots', 'tiles', 'rings', 'particles', 'rays'][Math.floor(seeded(e.slug)() * 6)];
  }

  function coverArt(e) {
    var r = seeded(e.slug + '|art');
    var W = 400, H = 200, out = [];

    if (patternKind(e) === 'board') {
      var cell = 25;
      for (var y = 0; y < H / cell; y++) for (var x = 0; x < W / cell; x++) {
        if ((x + y) % 2 === 0) continue;
        var on = r() > 0.55;
        out.push('<rect x="' + (x * cell) + '" y="' + (y * cell) + '" width="' + cell + '" height="' + cell + '" fill="' + ACCENT + '" opacity="' + (on ? 0.16 : 0.055).toFixed(3) + '"/>');
      }
      for (var k = 0; k < 3; k++) out.push('<circle cx="' + (r() * W).toFixed(0) + '" cy="' + (r() * H).toFixed(0) + '" r="' + (7 + r() * 6).toFixed(1) + '" fill="' + ACCENT + '" opacity="0.5"/>');
    } else if (patternKind(e) === 'particles') {
      for (var i = 0; i < 90; i++) {
        var rad = 1.2 + r() * 4.6;
        out.push('<circle cx="' + (r() * W).toFixed(1) + '" cy="' + (r() * H).toFixed(1) + '" r="' + rad.toFixed(2) + '" fill="' + ACCENT + '" opacity="' + (0.12 + r() * 0.5).toFixed(2) + '"/>');
      }
    } else if (patternKind(e) === 'grid') {
      out.push('<g stroke="' + ACCENT + '" stroke-width="1">');
      for (var gx = 20; gx < W; gx += 20) out.push('<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + H + '" opacity="0.10"/>');
      for (var gy = 20; gy < H; gy += 20) out.push('<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '" opacity="0.10"/>');
      out.push('</g>');
      var px = 20, py = 20;
      for (var step = 0; step < 9; step++) {
        out.push('<rect x="' + (px - 5) + '" y="' + (py - 5) + '" width="10" height="10" rx="2" fill="' + ACCENT + '" opacity="0.55"/>');
        var mv = Math.floor(r() * 4);
        px = mv === 0 ? Math.min(W - 20, px + 20) : mv === 1 ? Math.max(20, px - 20) : px;
        py = mv === 2 ? Math.min(H - 20, py + 20) : mv === 3 ? Math.max(20, py - 20) : py;
      }
    } else if (patternKind(e) === 'tiles') {
      var tw = 46, th = 46;
      for (var ty = 8; ty < H; ty += th + 8) for (var tx = 8; tx < W; tx += tw + 8) {
        var hot = r() > 0.72;
        out.push('<rect x="' + tx + '" y="' + ty + '" width="' + tw + '" height="' + th + '" rx="8" fill="' + ACCENT + '" opacity="' + (hot ? 0.34 : 0.07).toFixed(2) + '" stroke="' + ACCENT + '" stroke-opacity="0.13"/>');
      }
    } else if (patternKind(e) === 'rings') {
      var cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4);
      for (var ri = 1; ri <= 7; ri++) out.push('<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="' + (ri * ri * 5 + 8) + '" fill="none" stroke="' + ACCENT + '" stroke-width="1.4" opacity="' + (0.34 - ri * 0.035).toFixed(3) + '"/>');
      out.push('<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="5" fill="' + ACCENT + '" opacity="0.55"/>');
    } else if (patternKind(e) === 'dots') {
      for (var dy = 18; dy < H; dy += 26) for (var dx = 18; dx < W; dx += 26) {
        out.push('<circle cx="' + dx + '" cy="' + dy + '" r="' + (1.6 + r() * 2.6).toFixed(2) + '" fill="' + ACCENT + '" opacity="' + (0.14 + r() * 0.4).toFixed(2) + '"/>');
      }
    } else if (patternKind(e) === 'rays') {
      var ox = r() * W, oy = r() * H;
      for (var a = 0; a < 26; a++) {
        var ang = (a / 26) * Math.PI * 2;
        out.push('<line x1="' + ox.toFixed(0) + '" y1="' + oy.toFixed(0) + '" x2="' + (ox + Math.cos(ang) * 460).toFixed(0) + '" y2="' + (oy + Math.sin(ang) * 460).toFixed(0) + '" stroke="' + ACCENT + '" stroke-width="1" opacity="' + (0.05 + r() * 0.13).toFixed(3) + '"/>');
      }
      for (var st = 0; st < 22; st++) out.push('<circle cx="' + (r() * W).toFixed(0) + '" cy="' + (r() * H).toFixed(0) + '" r="' + (0.8 + r() * 1.9).toFixed(2) + '" fill="#fff" opacity="' + (0.2 + r() * 0.5).toFixed(2) + '"/>');
    } else {
      for (var hy = 0; hy < H + 30; hy += 30) for (var hx = 0; hx < W + 30; hx += 26) {
        var off = (Math.floor(hy / 30) % 2) * 13;
        var pts = [];
        for (var pn = 0; pn < 6; pn++) {
          var pa = (Math.PI / 3) * pn - Math.PI / 6;
          pts.push((hx + off + Math.cos(pa) * 14).toFixed(1) + ',' + (hy + Math.sin(pa) * 14).toFixed(1));
        }
        out.push('<polygon points="' + pts.join(' ') + '" fill="none" stroke="' + ACCENT + '" stroke-opacity="0.13"/>');
      }
    }

    return '<svg class="absolute inset-0 h-full w-full" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      + '<defs><linearGradient id="cg-' + esc(e.slug) + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#101010"/><stop offset="100%" stop-color="#050505"/></linearGradient></defs>'
      + '<rect width="' + W + '" height="' + H + '" fill="url(#cg-' + esc(e.slug) + ')"/>'
      + out.join('')
      + '</svg>';
  }

  function cardHTML(e) {
    var cat = (typeof CATS !== 'undefined' && CATS[e.cat]) || (isGames ? 'GAME' : 'TOOL');
    var href = isWebsites ? e.url : '/workspace/' + base + '/' + e.slug + '/';
    var status = e.ready
      ? ''
      : '<span class="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/35"><span class="h-1.5 w-1.5 rounded-full bg-white/30"></span>Building</span>';
    /* A website card shows its real site: the og:image when the entry has one.
       Previously every website rendered a 2-letter monogram, which is why the
       section read as "half pictures" with no photography in it at all.

       The image sits at z-0 and the scrim at z-10 on purpose. Without an explicit
       stacking order the scrim painted over the photo: every image loaded
       (naturalWidth > 0) and measured full width, yet the card rendered solid
       black -- the exact symptom that sent me hunting for a network fault that
       did not exist. */
    var logo = isWebsites
      ? (e.cover
          ? '<div class="absolute inset-0 z-0">'
            + '<img src="' + esc(e.cover) + '" alt="' + esc(e.name) + '" loading="lazy" decoding="async"'
            + ' class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"'
            + ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
            + '<span class="hidden h-full w-full items-center justify-center bg-[#0a0a0a]">'
            + '<span class="font-display text-4xl font-black text-white/15">' + esc(e.name.slice(0, 2).toUpperCase()) + '</span></span>'
            + '</div>'
          : '<div class="flex h-full w-full items-center justify-center bg-[#0a0a0a]">'
            + '<span class="font-display text-4xl font-black text-white/15">' + esc(e.name.slice(0, 2).toUpperCase()) + '</span></div>')
      : '<img src="/workspace/logos/' + esc(e.slug) + '.png" alt="' + esc(e.name) + ' logo" loading="lazy" decoding="async" width="96" height="96" class="h-24 w-24 rounded-2xl border border-white/10 object-cover transition-transform duration-500 group-hover:scale-[1.04]">';
    var isFav = !!(window.OcurpAuth && OcurpAuth.favourites && OcurpAuth.favourites.has(e.slug));
    var favBtn = '<button data-fav="' + esc(e.slug) + '" title="' + (isFav ? 'Remove from your profile' : 'Save to your profile') + '"'
      + ' aria-label="Save to profile" aria-pressed="' + (isFav ? 'true' : 'false') + '"'
      + ' class="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-black/55 text-base leading-none backdrop-blur transition-all '
      + (isFav ? 'border-accent text-accent' : 'border-white/20 text-white/55 hover:border-accent hover:text-accent')
      + '">' + (isFav ? '\u2605' : '\u2606') + '</button>';
    /* When the entry has a real cover image, the generated pattern must NOT sit
       on top of it -- the earlier version layered the pattern over the photo,
       which is why Rentify's real banner arrived tinted and the other cards
       looked like abstract wallpaper. A real image gets the banner to itself;
       the pattern is only for entries with no artwork. */
    var banner = isWebsites && e.cover ? logo : (coverArt(e) + '<div class="relative">' + logo + '</div>');
    var art = '<div class="relative flex h-40 items-center justify-center overflow-hidden rounded-t-[1.25rem] bg-[#0a0a0a] md:h-48">'
      + banner
      + '<div class="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#0a0a0a]/'
      + (isWebsites && e.cover ? '45' : '75')
      + ' via-transparent to-transparent"></div>'
      + favBtn
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
    return '<a href="' + href + '"' + target + ' class="group relative flex flex-col overflow-hidden rounded-[1.25rem] md:rounded-[1.75rem] border border-white/20 bg-white/[0.06] transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:bg-white/[0.09]" data-card>'
      + art
      + '<div class="flex flex-1 flex-col p-5 md:p-7 lg:p-8">'
      + '<div class="flex items-center justify-between gap-3"><span class="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-white/55">' + esc(cat) + '</span>' + status + '</div>'
      + '<h3 class="mt-3 font-display text-2xl font-black leading-tight tracking-tight text-white transition-colors duration-300 group-hover:text-accent">' + esc(e.name) + '</h3>'
      + '<p class="mt-3 line-clamp-2 text-sm leading-relaxed text-white/60">' + esc(e.blurb || e.desc || '') + '</p>'
      + '<div class="mt-4 flex flex-wrap gap-1.5">' + tags + '</div>'
      + '<div class="mt-6 flex-1"></div>'
      + action
      + '</div></a>';
  }

  /* Painting 285 cards in a single innerHTML blocks the main thread long enough
     that the page sits blank, then pops in fully-formed -- measured at 6.5s to
     DOMContentLoaded on /workspace/tools/ against 0.6-1.2s on every other
     listing. The browser cannot lay out or paint anything until that one
     assignment finishes, so lazy images below the fold all start fetching in the
     same tick: 251 requests fired before first paint.

     Chunking lets the browser breathe between batches, so the first screenful
     appears in the first frame and the rest streams in. Same markup, same order,
     same count -- only the timing changes. */
  function render() {
    var q = (search.value || '').trim().toLowerCase();
    var items = RAW.filter(function (e) {
      var inCat = active === 'all' || e.cat === active;
      var hay = (e.name + ' ' + (e.blurb || e.desc || '') + ' ' + e.tags.join(' ')).toLowerCase();
      return inCat && (!q || hay.indexOf(q) !== -1);
    });
    if (grid.__chunkTimer) { clearTimeout(grid.__chunkTimer); grid.__chunkTimer = 0; }
    grid.__chunkToken = (grid.__chunkToken || 0) + 1;
    var token = grid.__chunkToken;
    var CHUNK = 24;
    var html = items.map(cardHTML);
    grid.innerHTML = html.slice(0, CHUNK).join('');
    var i = CHUNK;
    (function step() {
      if (grid.__chunkToken !== token) return;   /* a newer render won */
      if (i >= html.length) return;
      grid.insertAdjacentHTML('beforeend', html.slice(i, i + CHUNK).join(''));
      i += CHUNK;
      grid.__chunkTimer = setTimeout(step, 0);
    })();
    count.textContent = items.length + ' of ' + RAW.length + ' shown';
    empty.classList.toggle('hidden', items.length > 0);
    /* "All" is not in CATS -- CATS only holds the real category ids. Without an
       explicit All chip there is no way back once a category is picked: the
       filter is a one-way door. Added first so it is always available. */
    cats.innerHTML = chip('all', 'All') + Object.keys(CATS).map(function (id) { return chip(id, CATS[id]); }).join('');
    cats.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { active = b.getAttribute('data-cat'); render(); });
    });
    wireCards();
  }

  /* Star buttons live inside the card <a>, so a click has to be stopped before it
     navigates. They are attached by delegation on the grid rather than per-button:
     with chunked rendering the later batches are appended after render() returns,
     and a querySelectorAll pass would miss them entirely -- half the stars would
     be dead with no error to show for it. */
  function wireCards() {
    if (grid.__favWired) return;
    grid.__favWired = true;
    grid.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-fav]');
      if (!b) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (!window.OcurpAuth || !OcurpAuth.favourites) return;
      OcurpAuth.favourites.toggle(b.getAttribute('data-fav'));  /* prompts sign-in when logged out */
      render();
    });
  }

  /* re-render when sign-in state changes, so stars reflect the new account */
  if (window.OcurpAuth && OcurpAuth.onChange) OcurpAuth.onChange(function () { render(); });
  /* auth resolves asynchronously, so favourites are not known when the grid is
     first built. Three unconditional re-renders used to run at 150/600/1600ms on
     top of the initial one -- four full passes over 285 cards each, which is most
     of the 6.5s this page was taking. Poll until the favourites set actually
     changes, then stop. */
  (function waitForAuth() {
    var tries = 0;
    (function tick() {
      var f = (window.OcurpAuth && OcurpAuth.favourites) || null;
      var sig = f ? Array.prototype.slice.call(f).sort().join(',') : null;
      if (sig !== null && sig !== window.__favSig) {
        window.__favSig = sig;
        render();
      }
      if (++tries < 12 && sig === null) setTimeout(tick, 250);
    })();
  })();

  search.addEventListener('input', render);
  render();
})();