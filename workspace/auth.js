/* ==========================================================================
   Ocurp accounts — sign-in state, the sign-in prompt, and favourites.

   Uses Supabase (Google OAuth) when workspace/supabase-config.js is present,
   and falls back to a device-local account otherwise so the flow still works.

   Favourites are cached locally for instant UI and written through to the
   `favourites` table when a real session exists.
   ========================================================================== */
(function (global) {
  var USER_KEY = 'ocurp:user';
  var FAV_KEY = 'ocurp:favs';
  var listeners = [];
  var client = null;
  var session = null;

  function cfg() { return global.OCURP_SUPABASE || {}; }
  function supabaseReady() { var c = cfg(); return !!(c.url && c.anonKey && global.supabase && global.supabase.createClient); }

  /* Google has to be switched on in the Supabase dashboard first, otherwise
     signInWithOAuth dumps the visitor on a raw error page. Ask the project. */
  var googleOn = null;
  function checkGoogle() {
    if (googleOn !== null) return Promise.resolve(googleOn);
    var c = cfg();
    if (!c.url || !c.anonKey) return Promise.resolve(false);
    return fetch(c.url + '/auth/v1/settings', { headers: { apikey: c.anonKey } })
      .then(function (r) { return r.json(); })
      .then(function (d) { googleOn = !!(d && d.external && d.external.google); return googleOn; })
      .catch(function () { googleOn = false; return false; });
  }

  function readJSON(k, fallback) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function current() { return readJSON(USER_KEY, null); }
  function isSignedIn() { return !!current(); }
  function emit() {
    listeners.forEach(function (fn) { try { fn(current()); } catch (e) {} });
    window.dispatchEvent(new CustomEvent('ocurp:auth'));
  }

  /* ---- identity ---- */
  function userFromSession(s) {
    if (!s || !s.user) return null;
    var u = s.user, m = u.user_metadata || {};
    return {
      id: u.id,
      name: m.full_name || m.name || (u.email ? u.email.split('@')[0] : 'Ocurp member'),
      email: u.email || '',
      avatar: m.avatar_url || '',
      since: (u.created_at || '').slice(0, 10),
      provider: 'google'
    };
  }

  function signInLocal(user) {
    var u = user || {};
    if (!u.name) u.name = 'Device account';
    if (!u.id) u.id = 'local-' + Math.abs(hash(u.email + u.name)).toString(36);
    if (!u.since) u.since = new Date().toISOString().slice(0, 10);
    writeJSON(USER_KEY, u);
    emit();
    return u;
  }


  /* ---- email sign-in -----------------------------------------------------
     Google is switched off on the Supabase project, so Google-only would leave
     visitors with no way to make an account at all. Email/password is enabled
     and works today, so it is offered first and Google appears only when the
     project reports the provider as available. */

  function emailReady() {
    var c = cfg();
    return !!(c.url && c.anonKey && global.supabase && global.supabase.createClient);
  }

  function ensureClient() {
    if (!client && emailReady()) {
      try { client = global.supabase.createClient(cfg().url, cfg().anonKey); } catch (e) { client = null; }
    }
    return client;
  }

  function userFromRow(u) {
    if (!u) return null;
    var m = u.user_metadata || {};
    return {
      id: u.id,
      email: u.email || '',
      name: m.full_name || m.name || (u.email || 'Member').split('@')[0],
      avatar_url: m.avatar_url || m.picture || null,
      since: (u.created_at || new Date().toISOString()).slice(0, 10),
      provider: 'supabase'
    };
  }

  function signUp(email, password) {
    var c = ensureClient();
    if (!c) return Promise.reject(new Error('Accounts are unavailable right now.'));
    return c.auth.signUp({ email: email, password: password }).then(function (r) {
      if (r && r.error) throw r.error;
      // Supabase may return a user with no session when email confirmation is
      // on. Do not pretend they are signed in until a session really exists.
      if (r && r.data && r.data.session) {
        session = r.data.session;
        var u = userFromRow(r.data.user);
        writeJSON(USER_KEY, u);
        emit();
        return { user: u, needsConfirm: false };
      }
      return { user: null, needsConfirm: true };
    });
  }

  function signInWithEmail(email, password) {
    var c = ensureClient();
    if (!c) return Promise.reject(new Error('Accounts are unavailable right now.'));
    return c.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
      if (r && r.error) throw r.error;
      session = r.data.session;
      var u = userFromRow(r.data.user);
      writeJSON(USER_KEY, u);
      emit();
      pullFavourites();
      return { user: u, needsConfirm: false };
    });
  }

  function signInWithGoogle() {
    if (!supabaseReady()) return false;
    var back = location.origin + location.pathname.replace(/[^/]*$/, '');
    client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + '/ocurp/profile/' }
    });
    return true;
  }

  function signOut() {
    if (client) { try { client.auth.signOut(); } catch (e) {} }
    session = null;
    try { localStorage.removeItem(USER_KEY); } catch (e) {}
    emit();
  }

  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }

  /* ---- favourites (local cache + write-through) ---- */
  function allFavs() { return readJSON(FAV_KEY, {}); }
  function favKey() { var u = current(); return u ? u.id : 'anon'; }
  function listFavs() { var a = allFavs(); return a[favKey()] || []; }
  function setLocalFavs(list) { var a = allFavs(); a[favKey()] = list; writeJSON(FAV_KEY, a); }
  function hasFav(slug) { return listFavs().indexOf(slug) !== -1; }

  function toggleFav(slug) {
    var u = current();
    if (!u) { promptSignIn('Sign in to save favourites to your profile.'); return false; }
    var l = listFavs(), i = l.indexOf(slug), added;
    if (i === -1) { l.push(slug); added = true; } else { l.splice(i, 1); added = false; }
    setLocalFavs(l);
    window.dispatchEvent(new CustomEvent('ocurp:favs'));
    if (client && session) {
      var uid = session.user.id;
      if (added) {
        client.from('favourites').insert({ user_id: uid, slug: slug })
          .then(function (r) { if (r && r.error) console.warn('favourite sync failed:', r.error.message); });
      } else {
        client.from('favourites').delete().eq('user_id', uid).eq('slug', slug)
          .then(function (r) { if (r && r.error) console.warn('favourite sync failed:', r.error.message); });
      }
    }
    return added;
  }

  /* The favourites table is not created on the Supabase project yet, so this
     404s. Local favourites already work, so treat a missing table as "nothing
     to pull" rather than an error - and remember that so we stop asking. */
  var favTableMissing = false;

  function pullFavourites() {
    if (!client || !session || favTableMissing) return Promise.resolve([]);
    return client.from('favourites').select('slug').then(function (r) {
      if (r && r.error) {
        var msg = String((r.error && r.error.message) || '');
        if (/Could not find the table|schema cache|PGRST205/i.test(msg)) {
          favTableMissing = true;
          return [];
        }
        return [];
      }
      if (r && r.data) {
        setLocalFavs(r.data.map(function (row) { return row.slug; }));
        window.dispatchEvent(new CustomEvent('ocurp:favs'));
      }
      return (r && r.data ? r.data : []).map(function (row) { return row.slug; });
    }).catch(function () { return []; });
  }

  function pushFavourites() {
    if (!client || !session || favTableMissing) return Promise.resolve(false);
    var slugs = listFavs();
    return client.from('favourites').upsert(
      slugs.map(function (s) { return { slug: s }; }),
      { onConflict: 'user_id,slug' }
    ).then(function (r) {
      if (r && r.error && /Could not find the table|schema cache|PGRST205/i.test(String(r.error.message))) {
        favTableMissing = true;
        return false;
      }
      return !(r && r.error);
    }).catch(function () { return false; });
  }

  /* ---- sign-in prompt ---- */
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
        '<h3 style="margin:0 0 8px;font-size:21px;font-weight:800;color:#fff">Sign in to continue</h3>' +
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
    note.textContent = supabaseReady()
      ? 'You will be sent to Google and brought straight back here.'
      : 'Google sign-in needs the Supabase library to load. The device option keeps everything in this browser.';
    panel.querySelector('#ocurp-x').addEventListener('click', closePanel);
    panel.addEventListener('click', function (e) { if (e.target === panel) closePanel(); });
    panel.querySelector('#ocurp-google').addEventListener('click', function () {
      checkGoogle().then(function (on) {
        if (on) { signInWithGoogle(); return; }
        note.innerHTML = 'Google sign-in is not switched on for this project yet. In Supabase: <strong>Authentication &rarr; Providers &rarr; Google</strong>, then add <code>http://localhost:8899/**</code> and <code>https://ocurp.com/**</code> to the redirect list.';
        note.style.color = 'rgba(255,95,31,.85)';
      });
    });
    checkGoogle().then(function (on) {
      if (!on) {
        var g = panel.querySelector('#ocurp-google');
        g.style.background = 'rgba(255,95,31,.28)';
        g.style.color = 'rgba(0,0,0,.65)';
        note.textContent = 'Google sign-in is not switched on for this project yet — the device option works now.';
      }
    });
    panel.querySelector('#ocurp-local').addEventListener('click', function () {
      signInLocal({ name: 'Device account' });
      closePanel();
    });
    return panel;
  }

  /* ---- nav ---- */
  function syncNav() {
    var u = current();
    document.querySelectorAll('[data-ocurp-account]').forEach(function (el) {
      el.textContent = u ? 'Profile' : 'Projects';
      el.setAttribute('href', u ? '/ocurp/profile/' : '/ocurp/signin/');
      el.dataset.bound = '1';
    });
    document.querySelectorAll('[data-ocurp-account-name]').forEach(function (el) {
      el.textContent = u ? (u.name || 'Profile') : 'Projects';
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

  /* ---- boot ---- */
  function boot() {
    bindNav();
    if (supabaseReady()) {
      client = global.supabase.createClient(cfg().url, cfg().anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.getSession().then(function (r) {
        session = r && r.data ? r.data.session : null;
        var u = userFromSession(session);
        if (u) { writeJSON(USER_KEY, u); } else if (current() && current().provider === 'google') { try { localStorage.removeItem(USER_KEY); } catch (e) {} }
        emit();
        pullFavourites();
      });
      client.auth.onAuthStateChange(function (_evt, s) {
        session = s;
        var u = userFromSession(s);
        if (u) writeJSON(USER_KEY, u);
        else if (current() && current().provider === 'google') { try { localStorage.removeItem(USER_KEY); } catch (e) {} }
        emit();
        pullFavourites();
      });
    }
  }

  window.addEventListener('ocurp:auth', function () { bindNav(); syncNav(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.OcurpAuth = {
    user: current, isSignedIn: isSignedIn, signOut: signOut,
    signIn: signInLocal, signInWithGoogle: signInWithGoogle,
    signUp: signUp, signInWithEmail: signInWithEmail, emailReady: emailReady,
    onChange: function (fn) { listeners.push(fn); },
    supabaseReady: supabaseReady,
    googleEnabled: checkGoogle,
    client: function () { return client; },
    session: function () { return session; },
    promptSignIn: promptSignIn, closePrompt: closePanel,
    favourites: { list: listFavs, has: hasFav, toggle: toggleFav, refresh: pullFavourites, push: pushFavourites },
    syncNav: syncNav
  };
})(window);