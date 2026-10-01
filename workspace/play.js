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

  /* The consent sheet.

     The user asked for a normal-looking pop-up offering accept or decline when
     they press Start. Deliberately NOT window.confirm(): a native dialog in the
     middle of a game reads as a scam, and mobile Chrome suppresses it often
     enough to make it a dead end. This is an ordinary in-page panel, styled to
     match the site, and it is keyboard/touch dismissible.

     Declining is not a dead end either -- it drops straight into CSS-only play
     mode, so the screen still locks and the swipe still controls the game; the
     user just keeps their browser chrome. */
  var sheetOpen = false;

  function buildSheet() {
    if (document.querySelector('[data-ocurp-sheet]')) return;
    var wrap = el('div', 'ocurp-sheet');
    wrap.setAttribute('data-ocurp-sheet', '1');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'ocurp-sheet-title');
    wrap.innerHTML =
      '<div class="ocurp-sheet__card" role="document">' +
        '<h2 class="ocurp-sheet__title" id="ocurp-sheet-title">Play fullscreen?</h2>' +
        '<p class="ocurp-sheet__body">The game fills your screen and the page stops scrolling, so swipes control the game instead of the page. You can leave any time with the Exit button in the corner.</p>' +
        '<div class="ocurp-sheet__row">' +
          '<button type="button" class="ocurp-sheet__btn ocurp-sheet__btn--ghost" data-ocurp-decline>Not now</button>' +
          '<button type="button" class="ocurp-sheet__btn ocurp-sheet__btn--go" data-ocurp-accept>Play fullscreen</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      var t = e.target;
      if (t === wrap || t.closest('[data-ocurp-decline]')) { closeSheet(); enter(); return; }
      if (t.closest('[data-ocurp-accept]')) { closeSheet(); enter(); }
    });

    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSheet(); }
    });
  }

  function openSheet() {
    buildSheet();
    var w = document.querySelector('[data-ocurp-sheet]');
    if (!w) return;
    sheetOpen = true;
    /* lock the page behind the sheet so it cannot scroll under the dialog */
    document.documentElement.classList.add('ocurp-sheet-open');
    w.classList.add('is-open');
    var accept = w.querySelector('[data-ocurp-accept]');
    if (accept) accept.focus();
  }

  function closeSheet() {
    sheetOpen = false;
    var w = document.querySelector('[data-ocurp-sheet]');
    if (w) w.classList.remove('is-open');
    document.documentElement.classList.remove('ocurp-sheet-open');
  }

  function inPlayMode() {
    return document.documentElement.classList.contains('ocurp-playing');
  }

  /* Entering play mode.

     THE ORDER MATTERS. The CSS class goes on FIRST and unconditionally, so the
     screen locks and the Exit button appears even if the browser then refuses
     fullscreen. The previous version added the class only on the way to a
     fullscreen request whose result it never checked, so on any browser that
     rejected the request (very common on Android Chrome and iOS Safari) the
     page stayed scrollable and Exit stayed at opacity 0 -- i.e. the user got
     "a locked screen I cannot get out of" and a Fullscreen button that did
     nothing.

     requestFullscreen is asked for on the DOCUMENT, never on a nested node:
     the spec only grants fullscreen to the top-level browsing context, so
     asking a <section> inside <div> does nothing at all. */
  function enter() {
    var s = ui.surface;
    document.documentElement.classList.add('ocurp-playing');

    var docEl = document.documentElement;
    var req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    try {
      if (req) {
        var p = req.call(docEl);
        if (p && p.catch) {
          p.catch(function () {
            /* Denied. We are already locked into CSS play mode and Exit is
               visible, so this is a degraded experience, not a broken one. */
          });
        }
      }
    } catch (e) { /* same: CSS-only play mode is still usable */ }

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

  /* Leaving play mode. Deliberately forgiving: we clear our own state FIRST and
     then try to hand control back to the browser. Every browser call in here
     can throw or be rejected, and if any of them did we would be stuck in a
     locked screen with no way out -- which is the exact failure the user hit. */
  function exit(opts) {
    var fromPopstate = !!(opts && opts.fromPopstate);

    /* Clear our own state FIRST and unconditionally. Everything else here is a
       request to the browser, and every one of those can fail or do something
       unexpected; none of them may be allowed to strand the user in a locked
       screen with no way out. */
    document.documentElement.classList.remove('ocurp-playing');

    if (fromPopstate) {
      /* Do NOT call exitFullscreen here. A popstate means the browser is
         already navigating, and on Android Chrome unwinding fullscreen during a
         back navigation sends the tab to about:blank -- which is exactly the
         dark empty screen the user reported. Drop the state and let the
         browser restore the page it was going to anyway. */
      return;
    }

    try {
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    } catch (e) {}
    var xf = document.exitFullscreen || document.webkitExitFullscreen;
    try { if (xf && (document.fullscreenElement || document.webkitFullscreenElement)) xf.call(document); } catch (e) {}
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('webkitfullscreenchange', onFsChange);
    /* Belt and braces: if the browser is still showing fullscreen a moment
       later we did not get out, so force the class off on the next frame. */
    requestAnimationFrame(function () {
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      document.documentElement.classList.remove('ocurp-playing');
    });
  }

  function onFsChange() {
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) document.documentElement.classList.remove('ocurp-playing');
  }

  function install() {
    var surface = findSurface();
    if (!surface || !surface.host) return;
    buildUI(surface);

    /* The Fullscreen pill asked for fullscreen straight from the click. On a
       touch browser that request is routinely rejected, which is why the button
       read as dead: nothing visibly happened. On touch, ask first; on desktop
       the pill is unambiguous so go straight in. */
    ui.enter.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (COARSE || isTouch) openSheet(); else enter();
    });
    ui.exit.addEventListener('click', function (ev) { ev.preventDefault(); exit(); });

    /* THE BLANK-SCREEN BACK BUG.

       Going back while playing used to leave the user staring at a dark page.
       Cause: on a phone, the back gesture fires popstate, we called exit(),
       exit() called document.exitFullscreen(), and on Android Chrome leaving
       fullscreen that the page entered itself can navigate the tab to
       about:blank. Verified: location.pathname === "blank", body had 0
       children and 0 painted elements.

       Two parts, both needed:
         1. get OUT of play mode on the way IN to the back navigation, so the
            browser never has to unwind our fullscreen state;
         2. never call exitFullscreen from a popstate handler at all -- that is
            the call that produces about:blank. Leave the state behind and let
            the browser restore the page. */
    window.addEventListener('popstate', function () {
      if (inPlayMode()) exit({ fromPopstate: true });
    });

    /* The single most important line: without this the swipe scrolls the page. */
    var h = surface.host;
    h.classList.add('ocurp-surface');
    if (surface.side) surface.side.classList.add('ocurp-side');
    var c = surface.canvas;
    if (c) c.classList.add('ocurp-canvas');
    /* Tag every ancestor up to <body> as .ocurp-shell. In play mode the chrome
       rule hides body's children EXCEPT these, so the surface's own subtree
       survives and can be promoted to the whole screen. Without this the
       wrapper containing the surface gets display:none and the screen goes
       black. */
    var anc = h.parentElement;
    while (anc && anc !== document.body) {
      anc.classList.add('ocurp-shell');
      anc = anc.parentElement;
    }
    /* The wrapper (canvas wrapper, or the DOM board) must not cap the width in
       play mode -- and the board needs touch-action off itself, not just the
       container, because that is what the finger lands on.

       `.ocurp-surface-inner` carries `touch-action: none`, so it must NEVER be
       put on the surface itself. On canvas games `surface.canvasWrap` resolves
       to the same node as the surface (the canvas's parent IS the panel), which
       put the gesture lock back on the whole game panel and made the page
       unscrollable again -- the exact bug this class was meant to fix. Only tag
       a wrapper that is genuinely a separate, inner node. */
    if (surface.canvasWrap && surface.canvasWrap !== h) {
      surface.canvasWrap.classList.add('ocurp-canvas-wrap');
      surface.canvasWrap.classList.add('ocurp-surface-inner');
    }
  }

  /* Pressing the game's own Start/Play button should pop the play shell --
     that is the gesture a player expects, and it is a real user gesture, so
     the browser will honour requestFullscreen from it. Wired by CAPTION so a
     page's own handler still runs.

     An in-page confirmation sheet, not a browser dialog: a native confirm()
     mid-game looks like a scam and mobile Chrome may suppress it entirely. */
  function looksLikeStart(el) {
    if (!el) return false;
    var t = (el.textContent || '').trim().toLowerCase();
    return /^(start|play|begin|new game|new duel|start game|tap to play|launch)\b/.test(t) ||
           /\b(start|begin|play)\b/.test(el.getAttribute('aria-label') || '');
  }

  function onDocClick(e) {
    if (!COARSE && !isTouch) return;
    if (inPlayMode()) return;
    /* Never react to our own UI. Without this the sheet's own "Play fullscreen"
       button matched the Start pattern, so accepting the dialog re-opened the
       dialog: the sheet flashed back and play mode never latched. Also guard the
       playbar so Exit/Fullscreen clicks can never feed this hook. */
    var own = e.target && e.target.closest && e.target.closest('[data-ocurp-sheet],[data-ocurp-playbar]');
    if (own) return;
    var b = e.target && e.target.closest && e.target.closest('button,[role=button],.btn');
    if (!b || !looksLikeStart(b)) return;
    /* Defer by a tick so the page's own Start handler runs first (many games
       reset state on click) and we do not steal the gesture. */
    setTimeout(function () {
      if (!inPlayMode()) openSheet();
    }, 0);
  }
  document.addEventListener('click', onDocClick, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (sheetOpen) { closeSheet(); return; }
    if (inPlayMode()) exit();
  });

  /* If the page is put into the background mid-game, drop out of play mode so
     the user never comes back to a locked screen they cannot explain. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && inPlayMode()) exit();
  });

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