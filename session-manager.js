/* ════════════════════════════════════════════
   NIT KKR — SESSION MANAGER
   Inactivity-based auto-logout ONLY.
   NO logout on tab switch / page refresh / nav.
   Warn at 2 min remaining, logout after 0.
════════════════════════════════════════════ */

const SessionManager = (() => {

  const WARN_AT_MS = 2 * 60 * 1000; // show warning when 2 min left
  let _warnShown    = false;
  let _intervalId   = null;
  let _onLogout     = null;

  const ACTIVITY_EVENTS = ['mousedown','keydown','touchstart','scroll','click'];

  function _touch() {
    Auth.touchActivity();
    if (_warnShown) _hideWarning();
  }

  function _showWarning(secondsLeft) {
    _warnShown = true;
    const overlay = document.getElementById('autologout-overlay');
    if (overlay) overlay.classList.remove('hidden');
    _updateCountdown(Math.ceil(secondsLeft / 1000));
  }

  function _hideWarning() {
    _warnShown = false;
    const overlay = document.getElementById('autologout-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function _updateCountdown(secs) {
    const el = document.getElementById('autologout-countdown');
    if (el) el.textContent = secs;
  }

  function _doLogout(reason) {
    clearInterval(_intervalId);
    Auth.logout();
    const overlay = document.getElementById('force-logout-overlay');
    const msg = document.getElementById('force-logout-msg');
    if (overlay) {
      if (msg) msg.textContent = reason || 'Session expired due to inactivity. Please login again.';
      overlay.classList.remove('hidden');
    } else {
      window.location.href = 'login.html';
    }
  }

  function init(onLogout) {
    _onLogout = onLogout;

    // Bind activity events — touch activity on user interaction
    ACTIVITY_EVENTS.forEach(ev => {
      document.addEventListener(ev, _touch, { passive: true });
    });

    // Tick every 5 seconds
    _intervalId = setInterval(() => {
      const remainMs = Auth.getRemainingMs();
      const secs = Math.ceil(remainMs / 1000);

      // Update timer displays
      document.querySelectorAll('.session-timer-display').forEach(el => {
        el.textContent = remainMs < 60000
          ? secs + 's'
          : Math.ceil(remainMs / 60000) + 'm';
      });

      if (remainMs <= 0) {
        _doLogout('Session ended due to inactivity.');
        if (_onLogout) _onLogout();
        return;
      }

      if (remainMs <= WARN_AT_MS && !_warnShown) {
        _showWarning(remainMs);
      }
      if (_warnShown) {
        _updateCountdown(secs);
      }
    }, 5000);

    // Wire up modal buttons
    const btnStay = document.getElementById('btn-stay-logged-in');
    const btnLogoutNow = document.getElementById('btn-logout-now');
    const btnRelogin = document.getElementById('btn-relogin');

    if (btnStay) btnStay.addEventListener('click', () => { _touch(); _hideWarning(); });
    if (btnLogoutNow) btnLogoutNow.addEventListener('click', () => { _doLogout('You have been logged out.'); });
    if (btnRelogin) btnRelogin.addEventListener('click', () => { window.location.href = 'login.html'; });

    // Sidebar & topbar logout buttons
    document.querySelectorAll('#sidebar-logout, #topbar-logout-btn').forEach(btn => {
      btn.addEventListener('click', () => _doLogout('You have been logged out successfully.'));
    });
  }

  function stop() {
    clearInterval(_intervalId);
    ACTIVITY_EVENTS.forEach(ev => document.removeEventListener(ev, _touch));
  }

  return { init, stop };

})();