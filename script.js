/* ═══════════════════════════════════════════════════════════
   FlagVault CTF — SQL Injection Login Bypass
   Challenge #02 · Web Exploitation

   HOW IT WORKS (for CTF authors):
   ─────────────────────────────────
   The "backend" is simulated entirely in JS.
   A fake SQL query engine checks if the username payload
   contains classic SQLi bypass patterns:
     ' OR 1=1-- -
     ' OR '1'='1
     admin'--
     ' OR 1=1#
     etc.

   Correct bypass → admin panel shown with flag.
   Normal credentials → only "admin / password123" works
   (to let authors verify the non-inject path).
   Any wrong input → "Invalid credentials" error.

   FLAG: FlagVault{1nj3ct3d_4nd_byp4ss3d_l1k3_4_pr0}
═══════════════════════════════════════════════════════════ */

'use strict';

/* ── Fake user database ── */
const USERS_DB = [
  { username: 'admin',    password: 'password123' },
  { username: 'john.doe', password: 'qwerty456'   },
  { username: 'alice',    password: 'securepass'   },
];

/* ── The flag ── */
const FLAG = 'FlagVault{1nj3ct3d_4nd_byp4ss3d_l1k3_4_pr0}';

/* ── SQLi detection patterns ──
   Simulates a vulnerable PHP-style query:
   "SELECT * FROM users WHERE username='INPUT' AND password='...'"
   We detect when the user breaks out of the string and injects
   OR / comment operators that make the query always TRUE.
*/
const SQLI_PATTERNS = [
  /'\s*or\s+1\s*=\s*1\s*(-{2}|#)/i,          // ' OR 1=1-- or ' OR 1=1#
  /'\s*or\s+1\s*=\s*1\s*$/i,                   // ' OR 1=1  (no comment)
  /'\s*or\s+'?1'?\s*=\s*'?1'?/i,              // ' OR '1'='1
  /'\s*or\s+true\s*(-{2}|#|$)/i,              // ' OR true--
  /admin\s*'?\s*(-{2}|#)/i,                    // admin'-- (admin with comment)
  /'\s*;\s*(-{2}|#|$)/i,                       // '; --
  /'\s*or\s+['"a-z0-9]+\s*=\s*['"a-z0-9]+/i, // generic ' OR x=x
  /1\s*=\s*1/,                                 // any 1=1 variant
  /-{2}\s*-?/,                                 // just -- comment
  /\/\*.*\*\//,                                // /* */ comment
];

/* ══════════════════════════════
   Live query preview updater
══════════════════════════════ */
function updateQueryPreview() {
  const userEl  = document.getElementById('sqli-user');
  const passEl  = document.getElementById('sqli-pass');
  const qUser   = document.getElementById('q-user');
  const qPass   = document.getElementById('q-pass');

  const uVal = userEl.value || '...';
  const pVal = passEl.value || '...';

  qUser.textContent = uVal;
  qPass.textContent = pVal;

  // Highlight red if looks like injection
  const isInjected = SQLI_PATTERNS.some(p => p.test(uVal));
  qUser.classList.toggle('injected', isInjected);
  userEl.classList.toggle('injected', isInjected);

  if (isInjected) {
    // Show the comment effect in the query display
    qPass.textContent = pVal + "'  ← commented out";
    qPass.classList.add('injected');
  } else {
    qPass.classList.remove('injected');
  }
}

/* ══════════════════════════════
   Simulated SQL login engine
══════════════════════════════ */
function simulateSQLQuery(username, password) {
  /*
    Simulates:
    SELECT * FROM users WHERE username='<username>' AND password='<password>'

    If injection detected → query returns first row (admin)
    If plain credentials → check against DB
    Otherwise → empty result (login fail)
  */

  // 1. Check for SQLi bypass in username
  const isInjection = SQLI_PATTERNS.some(p => p.test(username));
  if (isInjection) {
    return { success: true, user: USERS_DB[0], injected: true };
  }

  // 2. Normal credential check
  const match = USERS_DB.find(
    u => u.username === username.trim() && u.password === password
  );
  if (match) {
    return { success: true, user: match, injected: false };
  }

  return { success: false, user: null, injected: false };
}

/* ══════════════════════════════
   Login handler
══════════════════════════════ */
function doSQLiLogin() {
  const username    = document.getElementById('sqli-user').value;
  const password    = document.getElementById('sqli-pass').value;
  const resultEl    = document.getElementById('login-result');
  const btn         = document.getElementById('btn-login');

  if (!username) {
    showLoginResult('error', '[ ERROR ] Username field is empty.');
    return;
  }

  // Button loading state
  btn.disabled = true;
  btn.textContent = '>_ QUERYING DATABASE...';

  // Simulate network delay
  setTimeout(() => {
    const result = simulateSQLQuery(username, password);
    btn.disabled = false;
    btn.textContent = '>_ AUTHENTICATE';

    if (result.success) {
      if (result.injected) {
        showLoginResult('success', '[ SQL ]  Injection detected — query returned TRUE. Bypassing auth...');
        setTimeout(() => showAdminPanel(username, true), 900);
      } else {
        // Legit login (only admin/password123 in DB)
        showLoginResult('success', `[ INFO ] Credentials valid. Welcome, ${result.user.username}.`);
        setTimeout(() => showAdminPanel(result.user.username, false), 900);
      }
    } else {
      // Vary error messages for realism
      const errors = [
        `[ ERROR ] Invalid credentials for user '${escHtml(username)}'.`,
        `[ ERROR ] Authentication failed. Username or password incorrect.`,
        `[ ERROR ] No matching record found in users table.`,
      ];
      showLoginResult('error', errors[Math.floor(Math.random() * errors.length)]);
    }
  }, 600);
}

/* ══════════════════════════════
   Show admin panel
══════════════════════════════ */
function showAdminPanel(username, wasInjected) {
  document.getElementById('app-login').classList.add('hidden');
  document.getElementById('app-admin').classList.remove('hidden');
  document.getElementById('admin-username').textContent = wasInjected ? 'admin' : username;
  document.getElementById('log-username').textContent   = wasInjected ? 'admin (via injection)' : username;
}

/* ══════════════════════════════
   Reset
══════════════════════════════ */
function resetChallenge() {
  document.getElementById('app-login').classList.remove('hidden');
  document.getElementById('app-admin').classList.add('hidden');
  document.getElementById('sqli-user').value = '';
  document.getElementById('sqli-pass').value = '';
  document.getElementById('login-result').className = 'login-result';
  document.getElementById('login-result').style.display = 'none';
  document.getElementById('q-user').textContent = '...';
  document.getElementById('q-pass').textContent = '...';
  document.getElementById('q-user').classList.remove('injected');
  document.getElementById('q-pass').classList.remove('injected');
  document.getElementById('sqli-user').classList.remove('injected');
}

/* ══════════════════════════════
   Hints toggle
══════════════════════════════ */
function toggleHint(n) {
  const body   = document.getElementById(`hint${n}-body`);
  const toggle = document.getElementById(`hint${n}-toggle`);
  const hidden = body.classList.toggle('hidden');
  toggle.textContent = hidden ? '▼ Reveal' : '▲ Hide';
}

/* ══════════════════════════════
   Flag submission
══════════════════════════════ */
function submitFlag() {
  const input    = document.getElementById('flag-input').value.trim();
  const resultEl = document.getElementById('flag-result');
  const full     = `FlagVault{${input}}`;

  if (full === FLAG) {
    resultEl.className = 'submit-result correct';
    resultEl.innerHTML = `✓ &nbsp;Correct! Flag accepted. +150 pts`;
  } else {
    resultEl.className = 'submit-result incorrect';
    resultEl.innerHTML = `✗ &nbsp;Incorrect flag. Keep trying.`;
  }
}

/* ══════════════════════════════
   Copy flag
══════════════════════════════ */
function copyFlag() {
  const text  = document.getElementById('captured-flag').textContent;
  const toast = document.getElementById('copy-toast');

  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });

  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}

/* ── Utility ── */
function showLoginResult(type, msg) {
  const el = document.getElementById('login-result');
  el.className = `login-result ${type}`;
  el.innerHTML = msg;
  el.style.display = 'block';
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Enter key support ── */
document.addEventListener('DOMContentLoaded', () => {
  ['sqli-user','sqli-pass'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') doSQLiLogin();
    });
  });
  document.getElementById('flag-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitFlag();
  });

  // Console hints for players
  console.log('%c🗄️  FlagVault CTF — SQL Injection Challenge', 'font-size:15px;font-weight:bold;color:#00e8c8;');
  console.log('%cHint: The login query is: SELECT * FROM users WHERE username=\'INPUT\' AND password=\'...\'', 'color:#f5a623;font-family:monospace;');
  console.log('%cTry injecting into the username field to comment out the password check.', 'color:#b8cdd9;font-family:monospace;');
});
