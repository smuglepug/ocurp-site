/* ==========================================================================
   Ocurp accounts — sign-in state, the sign-in prompt, and favourites.

   Storage shape is identical whether it runs locally now or against Supabase
   later: set window.OCURP_SUPABASE = { url, anonKey } and the Google button
   performs a real OAuth redirect. Until then it says so plainly and offers a
   device-local account so the rest of the flow is usable.
   ========================================================================== */
(function (global) {
  var USER_KEY = 'ocurp:user';
  var FAV_KEY = 'ocurp:favs';
  var listeners = [];

  function readJSON(k, fallback) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function emit() { listeners.forEach(function (fn) { try { fn(current()); } catch (e) {} }); }
  function current() { return readJSON(USER_KEY, null); }
  function isSignedIn() { return !!current(); }
  function supabaseReady() {
    var c = global.OCURP_SUPABASE || {};
    return !!(c.url && c.anonKey);
  }

  function signIn(user) {
    var u = user || {};
    if (!u.name) u.name = 'Ocurp member';
    if (!u.email) u.email = '';
    if (!u.id) u.id = 'local-' + Math.abs(hash(u.email + u.name)).toString(36);
    if (!u.since) u.since = new Date().toISOString().slice(0, 10);
    writeJSON(USER_KEY, u);
    window.dispatchEvent(new CustomEvent('ocurp:auth'));
    return u;
  }
  function signOut() {
    try { localStorage.removeItem(USER_KEY); } catch (e) {}
    window.dispatchEvent(new CustomEvent('ocurp:auth'));
  }

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
    return h;
  }

  /* ---- favourites ---- */
  function allFavs() { return readJSON(FAV_KEY, {}); }
  function favKey() { var u = current(); return u ? u.id : 'anon'; }
  function listFavs() { var a = allFavs(); return a[favKey()] || []; }
  function hasFav(slug) { return listFavs().indexOf(slug) !== -1; }
  function toggleFav(slug) {
    var u = current();
    if (!u) { promptSignIn('Sign in to save favourites to your profile.'); return false; }
    var a = allFavs(), k = favKey(), l = a[k] || [];
    var i = l.indexOf(slug);
    if (i === -1) l.push(slug); else l.splice(i, 1);
    a[k] = l; writeJSON(FAV_KEY, a);
    window.dispatchEvent(new CustomEvent('ocurp:favs'));
    return i === -1;
  }

  /* ---- sign-in prompt (small panel, dismissible) ---- */
  var panel = null;
  function closePanel() { if (panel) { panel.remove(); panel = null; } }

  function promptSignIn(message) {
    closePanel();
    panel = document.createElement('div');
    panel.setAttribute('role', 'dialog');
    panel.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);padding:20px';
    panel.innerHTML =
      '<div style="width:100%;max-width:380px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:#0d0d0d;padding:26px;position:relative;font-family:inherit">' +
        '<button id="ocurp-x" aria-label="Close" style="position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:9999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:rgba(255,255,255,.6);font-size:15px;line-height:1;cursor:pointer">&#10005;</button>' +
        '<p style="font-size:9px;font-weight:900;letter-spacing:.34em;text-transform:uppercase;color:rgba(255,255,255,.4);margin:0 0 10px">Account</p>' +
        '<h3 style="margin:0 0 8px;font-size:21px;font-weight:800;color:#fff;letter-spacing:-.01em">Sign in to continue</h3>' +
        '<p id="ocurp-msg" style="margin:0 0 18px;font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.55)"></p>' +
        '<div style="display:flex;flex-direction:column;gap:9px">' +
          '<button id="ocurp-google" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;border-radius:9999px;background:#FF5F1F;border:0;padding:13px 18px;font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#000;cursor:pointer">Continue with Google</button>' +
          '<button id="ocurp-local" style="width:100%;border-radius:9999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);padding:12px 18px;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.6);cursor:pointer">Use this device only</button>' +
        '</div>' +
        '<p id="ocurp-note" style="margin:14px 0 0;font-size:11px;line-height:1.5;color:rgba(255,255,255,.35)"></p>' +
      '</div>';
    document.body.appendChild(panel);
    panel.querySelector('#ocurp-msg').textContent = message || 'Save projects and favourites to your profile.';
    var note = panel.querySelector('#ocurp-note');
    var google = panel.querySelector('#ocurp-google');
    if (supabaseReady()) {
      note.textContent = 'You will be redirected to Google, then back here.';
    } else {
      note.textContent = 'Google sign-in switches on as soon as the Supabase project keys are added. Until then, a device-only account keeps your work saved in this browser.';
    }
    panel.querySelector('#ocurp-x').addEventListener('click', closePanel);
    panel.addEventListener('click', function (e) { if (e.target === panel) closePanel(); });
    google.addEventListener('click', function () {
      if (!supabaseReady()) {
        note.textContent = 'Not connected yet — use the device-only option below for now.';
        note.style.color = 'rgba(255,95,31,.85)';
        return;
      }
      var c = global.OCURP_SUPABASE;
      var back = encodeURIComponent(location.origin + '/ocurp/profile/');
      location.href = c.url + '/auth/v1/authorize?provider=google&redirect_to=' + back;
    });
    panel.querySelector('#ocurp-local').addEventListener('click', function () {
      signIn({ name: 'Device account', email: '', device: true });
      closePanel();
    });
    return panel;
  }

  /* ---- nav sync: Sign In  <->  Profile ---- */
  function syncNav() {
    var u = current();
    document.querySelectorAll('[data-ocurp-account]').forEach(function (el) {
      el.textContent = u ? 'Profile' : 'Sign In';
      el.setAttribute('href', u ? '/ocurp/profile/' : '#');
      el.dataset.bound = '1';
    });
    document.querySelectorAll('[data-ocurp-account-name]').forEach(function (el) {
      el.textContent = u ? (u.name || 'Profile') : 'Sign In';
    });
  }

  function bindNav() {
    document.querySelectorAll('[data-ocurp-account]').forEach(function (el) {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';
      el.addEventListener('click', function (e) {
        if (!current()) { e.preventDefault(); promptSignIn(); }
      });
    });
    syncNav();
  }

  window.addEventListener('ocurp:auth', function () { bindNav(); syncNav(); });

  function boot() { bindNav(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.OcurpAuth = {
    user: current, isSignedIn: isSignedIn, signIn: signIn, signOut: signOut,
    onChange: function (fn) { listeners.push(fn); },
    supabaseReady: supabaseReady,
    promptSignIn: promptSignIn, closePrompt: closePanel,
    favourites: { list: listFavs, has: hasFav, toggle: toggleFav },
    syncNav: syncNav
  };
})(window);