/* Page-to-page smoothness for every /workspace/ page (tools, games, websites
   listings and every leaf page).

   Two things happen here, both of them only possible because we own these pages:

   1. ROUND-TRIP LOADING STATE. A link click fades the page out, and the browser
      is told to KEEP the fade. The classic problem is that a real navigation wipes
      the DOM, so the exit animation is cut off and you get a flash. We snapshot
      what we painted (the card grid / page body) and replay it instantly on the
      next page as a skeleton, so the incoming page always has the right SHAPE
      before its own content lands -- and the fade never shows a white flash.

   2. CACHE-BUSTED ASSETS. listing.js is versioned in some page templates and not
      others; a correct edit that never renders is indistinguishable from a broken
      one. This stamps ?v= from a build constant so a new file is never served from
      the HTTP cache.

   No framework, no bundler. It is one file, injected by the builders, and it is
   inert on a page without the hooks. */
(function () {
  var BUILD = '20260929b';
  var KEY = 'ocurp.nav.snapshot';
  var PAGES = ['tools', 'games', 'websites'];

  /* ---------------------------------------------------------- cache busting */
  /* The version query has to be in the HTML, BEFORE the script tag is parsed --
     a deferred script that re-stamps src attributes runs after the browser has
     already fetched them, so it achieves nothing. The builders emit ?v= on
     listing.js and nav.js directly. Kept as a scan that warns in the console if
     a page is ever emitted without one, because a correct edit that never renders
     is indistinguishable from a broken one. */
  function stamp() {
    document.querySelectorAll('script[src^="/workspace/"]').forEach(function (s) {
      if (s.getAttribute('src').indexOf('?v=') === -1 && window.console) {
        window.console.warn('[ocurp] unstamped script, an edit to it may not render:', s.getAttribute('src'));
      }
    });
  }

  /* ------------------------------------------------------------- skeletons */
  /* Each listing page gets a skeleton grid shaped like the real one: same
     column count, same aspect ratio, same number of cards as the registry, so the
     page does not reflow when the real cards replace them. */
  /* Paint the skeleton INSIDE the existing #ws-grid, never in its place.
     listing.js holds a reference to that exact node, so it must survive. */
  function fillSkeleton() {
    var grid = document.getElementById('ws-grid');
    if (!grid) return;
    /* a second paint would fight listing.js -- once the real cards are in, the
       skeleton is gone, and grid.querySelector tells us which state we are in. */
    if (grid.querySelector('[data-card], .skeleton-shimmer')) return;
    var n = 12;
    try {
      var rec = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (rec && Date.now() - rec.at < 8000) n = Math.max(4, Math.min(rec.cards, 24));
    } catch (e) { }
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var card = document.createElement('div');
      card.className = 'overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]';
      card.innerHTML =
        '<div class="h-44 skeleton-shimmer"></div>'
        + '<div class="space-y-3 p-4 md:p-6">'
        + '<div class="h-2 w-14 rounded skeleton-shimmer"></div>'
        + '<div class="h-6 w-2/3 rounded skeleton-shimmer"></div>'
        + '<div class="h-3 w-full rounded skeleton-shimmer"></div>'
        + '<div class="h-3 w-4/5 rounded skeleton-shimmer"></div>'
        + '<div class="flex gap-1.5 pt-1"><span class="h-5 w-14 rounded-full skeleton-shimmer"></span>'
        + '<span class="h-5 w-16 rounded-full skeleton-shimmer"></span></div>'
        + '</div>';
      frag.appendChild(card);
    }
    grid.appendChild(frag);
  }

  function injectCSS() {
    if (document.getElementById('ocurp-nav-css')) return;
    var s = document.createElement('style');
    s.id = 'ocurp-nav-css';
    s.textContent = [
      /* the shimmer. A single accent-tinted sweep -- not grey -- so loading
         still reads as part of this site. */
      '.skeleton-shimmer{position:relative;overflow:hidden;background:rgba(255,255,255,.045)}',
      '.skeleton-shimmer::after{content:"";position:absolute;inset:0;transform:translateX(-100%);',
      'background:linear-gradient(90deg,transparent,rgba(255,95,31,.10),transparent);',
      'animation:ocurp-shimmer 1.25s ease-in-out infinite}',
      '@keyframes ocurp-shimmer{100%{transform:translateX(100%)}}',
      '@media (prefers-reduced-motion:reduce){.skeleton-shimmer::after{animation:none}}',
      /* page exit. 140ms is short enough to feel instant and long enough that the
         browser keeps the painted frame; anything slower feels like a stall. */
      'html.ocurp-leaving body{opacity:0;transform:translateY(-6px) scale(.995);',
      'transition:opacity .14s ease,transform .14s ease}',
      'html.ocurp-leaving body{pointer-events:none}',
      /* entrance: only run when we actually painted a skeleton, so a plain reload
         does not animate the whole page for no reason. */
      'html.ocurp-entering body{animation:ocurp-in .26s cubic-bezier(.2,.7,.3,1)}',
      '@keyframes ocurp-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      '@media (prefers-reduced-motion:reduce){html.ocurp-entering body{animation:none}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------- out / in handoff */
  function snapshot() {
    try {
      var grid = document.getElementById('ws-grid');
      if (!grid) return;
      var cards = grid.querySelectorAll('[data-card], .skeleton-shimmer').length;
      sessionStorage.setItem(KEY, JSON.stringify({ cards: Math.max(4, Math.min(cards, 24)), at: Date.now() }));
    } catch (e) { /* private mode -- degrade to a plain fade */ }
  }

  /* ------------------------------------------------------------- navigation */
  function wireLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      /* same page, or a hash on the same page: let the browser handle it */
      var u;
      try { u = new URL(href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname) return;
      if (u.pathname.indexOf('/workspace/') !== 0) return;  /* only our own section */
      e.preventDefault();
      snapshot();
      document.documentElement.classList.add('ocurp-leaving');
      setTimeout(function () { location.href = u.href; }, 120);
    }, true);
  }

  function boot() {
    stamp();
    injectCSS();
    var isListing = !!document.getElementById('ws-grid');
    if (isListing) {
      /* Paint the skeleton on EVERY listing load, not only after a nav click. A
         cold load of /workspace/games/ has ~120KB of registry JS to parse before
         the first card exists; without this the grid is simply blank for that
         window, which reads as a broken page rather than a loading one. The
         skeleton is replaced the instant listing.js renders, so a warm load costs
         one frame and never flashes.

         ORDER MATTERS, and getting it wrong is silent. listing.js captures
         var grid = document.getElementById('ws-grid') ONCE, at load, and writes
         into that captured element for the rest of the page's life. So this
         script must NOT swap the element out. Swapping it left the real cards
         rendering into a detached node: the count line said "15 of 15 shown" and
         every card existed, but the page displayed nothing but skeletons. Instead
         of replacing #ws-grid, FILL it -- listing.js then writes into the same
         element and the skeleton is overwritten naturally. */
      fillSkeleton();
    }
    wireLinks();
    document.documentElement.classList.remove('ocurp-entering');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
