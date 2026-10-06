/* On-screen key pad for keyboard-only games on phones and tablets.
   A page opts in with  <meta name="ocurp-touchpad" content="ArrowLeft|<;ArrowRight|>;...">
   (key|label pairs, ';' separated; the key ' ' is the space bar).  The pad only
   appears for a coarse pointer, and each button sends the same keydown/keyup a
   keyboard would, so the game code is untouched.  Nothing happens on desktop. */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="ocurp-touchpad"]');
  if (!meta) return;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!coarse && location.search.indexOf('pad=1') < 0) return;

  var css = document.createElement('style');
  css.textContent =
    '.ocurp-pad{position:fixed;left:0;right:0;bottom:0;z-index:9400;display:flex;justify-content:center;gap:10px;' +
    'flex-wrap:wrap;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(5,5,5,.88);' +
    'border-top:1px solid rgba(255,255,255,.12);touch-action:none;user-select:none;-webkit-user-select:none}' +
    '.ocurp-pad button{min-width:56px;height:56px;border-radius:14px;border:1px solid rgba(255,255,255,.18);' +
    'background:rgba(255,255,255,.07);color:#fff;font:800 18px Manrope,Inter,sans-serif;touch-action:none}' +
    '.ocurp-pad button.go{background:var(--hue,#5ec8ff);color:#0a0b0d;border-color:var(--hue,#5ec8ff);padding:0 18px;font-size:13px;letter-spacing:.12em;text-transform:uppercase}' +
    '.ocurp-pad button:active,.ocurp-pad button.on{background:rgba(255,255,255,.22)}' +
    'html.ocurp-playing body>.ocurp-pad.ocurp-pad.ocurp-pad{display:flex!important}' +
    'body.has-ocurp-pad{padding-bottom:84px}';
  document.head.appendChild(css);

  var pad = document.createElement('div');
  pad.className = 'ocurp-pad';
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'On-screen controls');
  var timers = {};

  function send(type, key) {
    var ev = new KeyboardEvent(type, { key: key, bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
  }
  function press(btn, key) {
    btn.classList.add('on');
    send('keydown', key);
    if (key !== ' ') timers[key] = setInterval(function () { send('keydown', key); }, 130);
  }
  function release(btn, key) {
    btn.classList.remove('on');
    if (timers[key]) { clearInterval(timers[key]); delete timers[key]; }
    send('keyup', key);
  }

  meta.content.split(';').forEach(function (spec) {
    var i = spec.indexOf('|');
    if (i < 0) return;
    var key = spec.slice(0, i), label = spec.slice(i + 1);
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (key === ' ' || label.length > 2) b.className = 'go';
    b.setAttribute('aria-label', label);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(b, key); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
      b.addEventListener(n, function () { if (timers[key] || b.classList.contains('on')) release(b, key); });
    });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    pad.appendChild(b);
  });
  document.body.appendChild(pad);
  document.body.classList.add('has-ocurp-pad');
})();
