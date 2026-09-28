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
    var logo = isWebsites
      ? '<div class="flex h-full w-full items-center justify-center"><span class="font-display text-5xl font-black text-white/15">' + esc(e.name.slice(0, 2).toUpperCase()) + '</span></div>'
      : '<img src="/workspace/logos/' + esc(e.slug) + '.png" alt="' + esc(e.name) + ' logo" class="h-24 w-24 rounded-2xl border border-white/10 object-cover transition-transform duration-500 group-hover:scale-[1.04]">';
    var isFav = !!(window.OcurpAuth && OcurpAuth.favourites && OcurpAuth.favourites.has(e.slug));
    var favBtn = '<button data-fav="' + esc(e.slug) + '" title="' + (isFav ? 'Remove from your profile' : 'Save to your profile') + '"'
      + ' aria-label="Save to profile" aria-pressed="' + (isFav ? 'true' : 'false') + '"'
      + ' class="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-black/55 text-base leading-none backdrop-blur transition-all '
      + (isFav ? 'border-accent text-accent' : 'border-white/20 text-white/55 hover:border-accent hover:text-accent')
      + '">' + (isFav ? '\u2605' : '\u2606') + '</button>';
    var art = '<div class="relative flex h-44 items-center justify-center overflow-hidden rounded-t-2xl bg-[#0a0a0a]">'
      + coverArt(e)
      + '<div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/75 via-transparent to-transparent"></div>'
      + '<div class="relative">' + logo + '</div>'
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
    return '<a href="' + href + '"' + target + ' class="group relative flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/[0.06] transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:bg-white/[0.09]" data-card>'
      + art
      + '<div class="flex flex-1 flex-col p-4 md:p-6">'
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
    /* star: save to the profile. Inside the card link, so stop the navigation. */
    grid.querySelectorAll('[data-fav]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!window.OcurpAuth || !OcurpAuth.favourites) return;
        OcurpAuth.favourites.toggle(b.getAttribute('data-fav'));  /* prompts sign-in when logged out */
        render();
      });
    });
  }

  /* re-render when sign-in state changes, so stars reflect the new account */
  if (window.OcurpAuth && OcurpAuth.onChange) OcurpAuth.onChange(function () { render(); });
  /* auth resolves asynchronously, so favourites are not known when the grid is
     first built. Re-render unconditionally once it lands (3 cheap passes). */
  [150, 600, 1600].forEach(function (t) { setTimeout(render, t); });

  search.addEventListener('input', render);
  render();
})();