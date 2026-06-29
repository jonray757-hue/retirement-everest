const HOST_AUTH_KEY = 're_host_authed_v1';

function isHostAuthed() {
  return sessionStorage.getItem(HOST_AUTH_KEY) === '1';
}

function setHostAuthed() {
  sessionStorage.setItem(HOST_AUTH_KEY, '1');
}

function hostLockHTML(title, subtitle) {
  return `<div id="lock-screen">
  <div style="font-size:2rem;margin-bottom:20px">🔒</div>
  <h2 style="font-family:var(--heading-font);margin-bottom:8px">${title}</h2>
  <p style="color:var(--muted);margin-bottom:28px;font-size:0.85rem">${subtitle}</p>
  <input type="password" class="lock-input" id="pwInput" placeholder="••••" autocomplete="current-password">
  <button type="button" class="lock-btn" id="pwSubmit">Enter</button>
  <div id="lockErr" style="color:var(--red);margin-top:10px;display:none">Incorrect password.</div>
</div>`;
}

function initHostLock(opts) {
  const content = document.getElementById(opts.contentId);
  if (!content) return;

  const unlock = () => {
    const pw = document.getElementById('pwInput')?.value;
    if (pw === RETIREMENT_EVEREST.hostPassword) {
      setHostAuthed();
      document.getElementById('lock-screen')?.remove();
      content.style.display = '';
      opts.onUnlock?.();
    } else {
      const err = document.getElementById('lockErr');
      if (err) err.style.display = 'block';
      const input = document.getElementById('pwInput');
      if (input) input.value = '';
    }
  };

  if (isHostAuthed()) {
    document.getElementById('lock-screen')?.remove();
    content.style.display = '';
    opts.onUnlock?.();
    return;
  }

  content.style.display = 'none';
  document.body.insertAdjacentHTML('afterbegin', hostLockHTML(opts.title, opts.subtitle));
  document.getElementById('pwSubmit')?.addEventListener('click', unlock);
  document.getElementById('pwInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') unlock();
  });
}