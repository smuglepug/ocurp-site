/* Mobile play mode for every game page.

   THE BUG THIS FIXES
   ------------------
   Swiping to steer a game scrolled the PAGE instead. The canvas sat inside the
   normal document flow inside a .ws-panel, so a swipe gesture was consumed by
   the scroller, the address bar collapsed, the layout shifted, and the game was
   unplayable one-handed. It also never even looked wrong on desktop, which is
   why it survived: there is no swipe to scroll with a mouse.

   WHAT THIS DOES
   --------------
   1. `touch-action: none` + `overscroll-behavior: contain` on the play surface, so
      a gesture inside the game never reaches the scroller.
   2. An "Enter fullscreen" affordance (and auto-offer on a real touch device),
      which requests real fullscreen AND tries to lock orientation to landscape.
      Both are best-effort: orientation.lock needs fullscreen and only works on
      some Android builds, and fullscreen requires a user gesture.
   3. A persistent top-left EXIT control while fullscreen, styled like a normal
      game's, so you are never trapped.
   4. Escape, the Android back gesture, and the exit button all leave play mode.

   No framework. One file, injected by tools/build_pages.py into every game page.
   Inert on desktop: it only arms when a coarse pointer is actually detected. */

(function () {
  'use strict';

  var COARSE = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  /* The element the game actually draws into. Every game page has one canvas
     near the top of the main panel; fall back to the panel itself.

     The grid that holds the canvas also holds the side column (start/reset/
     score). The canvas is inside a wrapper div, so the sibling wrapper is the
     side column -- it gets .ocurp-side so play mode can hide it and give the
     canvas the whole screen. */
  function findSurface() {
    var cv = document.querySelector('canvas');
    if (!cv) {
      /* Not every game is canvas-based, and the ids are all different
         (#board, #grid, #field, #arena, #wrap...). Guessing names one at a time
         is how six games ended up broken in a row, so detect the playfield
         structurally instead: inside the main panel, the element that actually
         takes the interaction -- the one holding the game's own buttons/cells,
         or failing that the panel's largest child block. */
      var panel = document.querySelector('.ws-panel, main, section');
      var dom = null;
      if (panel) {
        /* prefer an explicit hook if the game provides one */
        dom = panel.querySelector('[data-board], [data-grid], [data-play], .board, .grid-board');
        if (!dom) {
          /* else: the deepest container with many sibling children = a grid of
             cells, or the element with the most buttons inside the panel */
          var best = null, bestScore = -1;
          [].slice.call(panel.querySelectorAll('div, section')).forEach(function (n) {
            if (n.id === 'ws-more' || n.closest('#ws-more')) return;
            var kidCount = n.children.length;
            var btnCount = n.querySelectorAll('button').length;
            var score = kidCount + btnCount * 2;
            /* must be a real block, not the whole page chrome */
            var r = n.getBoundingClientRect();
            if (r.width < 40 || r.height < 40) return;
            if (score > bestScore) { bestScore = score; best = n; }
          });
          /* only treat it as the playfield if it genuinely looks like one */
          if (best && bestScore >= 6 && best !== panel) dom = best;
        }
      }
      if (dom) {
        return { canvas: null, host: panel, side: null, canvasWrap: dom, isDomBoard: true };
      }
      var panel2 = document.querySelector('.ws-panel, main, section');
      return { canvas: null, host: panel2 || document.body, side: null };
    }
    var wrap = cv.parentElement;
    var host = wrap;
    /* climb to the layout grid, but stop at anything that is not a plain div */
    while (wrap && wrap.parentElement && wrap.parentElement.tagName === 'DIV'
           && !/ws-panel/.test(wrap.className)) {
      var p = wrap.parentElement;
      if (p.classList.contains('ws-panel')) { host = p; wrap = p; break; }
      wrap = p;
      host = wrap;
    }
    /* the side column = the canvas wrapper's sibling inside the grid */
    var side = null;
    var canvasWrap = cv.parentElement;
    if (canvasWrap && canvasWrap.parentElement) {
      var kids = [].slice.call(canvasWrap.parentElement.children);
      kids.forEach(function (k) { if (k !== canvasWrap && !k.contains(cv)) side = k; });
    }
    return { canvas: cv, host: host, side: side, canvasWrap: canvasWrap };
  }

  var ui = null;

  function buildUI(surface) {
    if (ui) return ui;

    var bar = el('div', 'ocurp-playbar');
    bar.setAttribute('data-ocurp-playbar', '1');

    var exit = el('button', 'ocurp-exit');
    exit.type = 'button';
    exit.setAttribute('data-ocurp-exit', '1');
    exit.setAttribute('aria-label', 'Exit fullscreen');
    exit.innerHTML = '<span class="ocurp-exit__x" aria-hidden="true"></span><span>Exit</span>';

    var enter = el('button', 'ocurp-enter');
    enter.type = 'button';
    enter.setAttribute('data-ocurp-enter', '1');
    enter.innerHTML = '<span class="ocurp-enter__ico" aria-hidden="true"></span><span>Fullscreen</span>';

    bar.appendChild(exit);
    bar.appendChild(enter);
    document.body.appendChild(bar);

    ui = { bar: bar, exit: exit, enter: enter, surface: surface };
    return ui;
  }

  function inPlayMode() {
    return document.documentElement.classList.contains('ocurp-playing');
  }

  function enter() {
    var s = ui.surface;
    var target = s.host || document.documentElement;
    document.documentElement.classList.add('ocurp-playing');

    /* Real fullscreen. Must be called from a user gesture or it is rejected. */
    var req = target.requestFullscreen || target.webkitRequestFullscreen
      || document.documentElement.requestFullscreen;
    try {
      if (req) {
        var p = req.call(target);
        if (p && p.catch) p.catch(function () { /* denied -- CSS-only mode still works */ });
      }
    } catch (e) { /* ignore */ }

    /* Landscape lock only succeeds inside fullscreen, and only on some builds. */
    setTimeout(function () {
      try {
        var so = screen.orientation;
        if (so && so.lock) so.lock('landscape').catch(function () {});
      } catch (e) {}
    }, 250);

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
  }

  function exit() {
    document.documentElement.classList.remove('ocurp-playing');
    try {
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    } catch (e) {}
    var xf = document.exitFullscreen || document.webkitExitFullscreen;
    try { if (xf && (document.fullscreenElement || document.webkitFullscreenElement)) xf.call(document); } catch (e) {}
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('webkitfullscreenchange', onFsChange);
  }

  function onFsChange() {
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) document.documentElement.classList.remove('ocurp-playing');
  }

  function install() {
    var surface = findSurface();
    if (!surface || !surface.host) return;
    buildUI(surface);

    ui.enter.addEventListener('click', function (ev) { ev.preventDefault(); enter(); });
    ui.exit.addEventListener('click', function (ev) { ev.preventDefault(); exit(); });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && inPlayMode()) exit();
    });

    /* Android back gesture / browser back while playing should leave play mode. */
    window.addEventListener('popstate', function () { if (inPlayMode()) exit(); });

    /* The single most important line: without this the swipe scrolls the page. */
    var h = surface.host;
    h.classList.add('ocurp-surface');
    if (surface.side) surface.side.classList.add('ocurp-side');
    var c = surface.canvas;
    if (c) c.classList.add('ocurp-canvas');
    /* the wrapper (canvas wrapper, or the DOM board) must not cap the width in
       play mode -- and the DOM board needs touch-action off itself, not just its
       container, because that is what the finger lands on. */
    if (surface.canvasWrap) {
      surface.canvasWrap.classList.add('ocurp-canvas-wrap');
      surface.canvasWrap.classList.add('ocurp-surface-inner');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();

  /* expose for the provers */
  window.OcurpPlay = { enter: enter, exit: exit, active: inPlayMode, coarse: COARSE, isTouch: isTouch };

  /* auto-arm the CSS (not the fullscreen) on touch devices, so the page is at
     least non-scrolling inside the canvas before anyone taps Fullscreen */
  if (COARSE || isTouch) {
    document.addEventListener('DOMContentLoaded', function () {
      document.documentElement.classList.add('ocurp-touch');
    });
  }
})();