/* Create-project flow. Saves to the Supabase `projects` table when a real session
   exists, otherwise keeps the draft in localStorage so nothing is lost before the
   backend is switched on. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var A = window.OcurpAuth;
  var kind = 'game';
  var thumbData = null;

  function gate() {
    var signed = !!(A && A.isSignedIn && A.isSignedIn());
    $('gate').classList.toggle('hidden', signed);
    $('form').classList.toggle('hidden', !signed);
  }

  function showKind() {
    document.querySelectorAll('.kind').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-kind') === kind);
    });
    var isWeb = kind === 'website';
    var isProject = kind === 'project';
    $('wrapUrl').classList.toggle('hidden', !isWeb);
    $('wrapBody').classList.toggle('hidden', !isProject);
    $('wrapRepo').classList.toggle('hidden', isWeb);
  }

  document.querySelectorAll('.kind').forEach(function (b) {
    b.addEventListener('click', function () {
      kind = b.getAttribute('data-kind');
      showKind();
    });
  });

  $('gateSignin').addEventListener('click', function () {
    if (A && A.promptSignIn) A.promptSignIn('Sign in to add projects to your profile.');
  });
  /* ---- import from GitHub: fills title, description and a thumbnail ---- */
  $('pull').addEventListener('click', function () {
    var raw = ($('repo').value || '').trim();
    var m = raw.match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/i);
    if (!m) { $('pullNote').textContent = 'Paste a github.com/owner/repo link.'; return; }
    var owner = m[1], name = m[2].replace(/\.git$/, '');
    $('pullNote').textContent = 'Looking up ' + owner + '/' + name + '...';
    fetch('https://api.github.com/repos/' + owner + '/' + name)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        if (!$('title').value) $('title').value = d.name || name;
        if (!$('blurb').value) $('blurb').value = d.description || '';
        if (d.homepage && !$('url').value) $('url').value = d.homepage;
        var og = 'https://opengraph.githubassets.com/1/' + owner + '/' + name;
        thumbData = null;
        var img = $('thumbPreview');
        img.src = og; img.classList.remove('hidden');
        img.setAttribute('data-remote', og);
        $('pullNote').textContent = 'Filled from GitHub. Language: ' + (d.language || 'n/a') +
          ', stars: ' + (d.stargazers_count || 0) + '.';
      })
      .catch(function (e) { $('pullNote').textContent = 'Could not read that repo (' + e + ').'; });
  });

  /* ---- thumbnail ---- */
  $('thumb').addEventListener('change', function (ev) {
    var f = ev.target.files && ev.target.files[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { $('thumbNote').textContent = 'Keep it under 4 MB.'; return; }
    var r = new FileReader();
    r.onload = function () {
      thumbData = r.result;
      $('thumbPreview').src = thumbData;
      $('thumbPreview').classList.remove('hidden');
      $('thumbNote').textContent = 'Ready (' + Math.round(f.size / 1024) + ' KB).';
    };
    r.readAsDataURL(f);
  });

  /* ---- save ---- */
  function payload() {
    return {
      kind: kind,
      title: ($('title').value || '').trim(),
      blurb: ($('blurb').value || '').trim(),
      url: ($('url').value || '').trim() || null,
      repo: ($('repo').value || '').trim() || null,
      body: ($('body').value || '').trim() || null,
      thumbnail_url: thumbData || $('thumbPreview').getAttribute('data-remote') || null
    };
  }

  function saveLocal(p) {
    try {
      var all = JSON.parse(localStorage.getItem('ocurp:projects') || '[]');
      p.created_at = new Date().toISOString();
      p.local = true;
      all.unshift(p);
      localStorage.setItem('ocurp:projects', JSON.stringify(all));
    } catch (e) {}
    $('status').textContent = 'Saved on this device. It syncs once the backend is live.';
    $('save').disabled = false;
    setTimeout(function () { location.href = '/ocurp/profile/'; }, 1000);
  }

  $('save').addEventListener('click', function () {
    var p = payload();
    if (!p.title) { $('status').textContent = 'Give it a title first.'; return; }
    $('save').disabled = true;
    $('status').textContent = 'Saving...';
    var client = A && A.client ? A.client() : null;
    var sess = A && A.session ? A.session() : null;
    if (client && sess && sess.user) {
      p.owner = sess.user.id;
      client.from('projects').insert(p).then(function (r) {
        if (r && r.error) {
          $('status').textContent = 'Server said: ' + r.error.message + ' - kept on this device instead.';
          saveLocal(p); return;
        }
        $('status').textContent = 'Saved to your account.';
        $('save').disabled = false;
        setTimeout(function () { location.href = '/ocurp/profile/'; }, 800);
      });
    } else { saveLocal(p); }
  });

  showKind();
  gate();
  if (A && A.onChange) A.onChange(gate);
})();