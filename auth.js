/* ════════════════════════════════════════════
   NIT KKR — AUTH.JS v2
   - Session stored in localStorage (persists across tabs/refresh)
   - Auto-logout ONLY after inactivity timeout (30 min default)
   - No logout on tab hide / page refresh / accidental navigation
   - Logout only on: manual click, or true inactivity timeout
════════════════════════════════════════════ */

const Auth = (() => {

  const SESSION_KEY    = 'nitkkr_session';
  const LAST_ACTIVE_KEY = 'nitkkr_last_active';
  const TIMEOUT_MS     = 30 * 60 * 1000; // 30 minutes inactivity

  // ── Load config ───────────────────────────
  async function loadConfig() {
    const localTeachers = localStorage.getItem('nitkkr_teachers');
    try {
      const res = await fetch('config.json');
      const config = await res.json();
      if (localTeachers) config.teachers = JSON.parse(localTeachers);
      return config;
    } catch {
      // fallback if fetch fails (e.g. file:// protocol)
      return {
        admin: { email: 'admin@nitkkr.ac.in', password: 'admin@123' },
        teachers: localTeachers ? JSON.parse(localTeachers) : [
          { email:'prof.sharma@nitkkr.ac.in', password:'teacher@123', name:'Prof. Sharma', department:'CSE' },
          { email:'dr.gupta@nitkkr.ac.in',    password:'teacher@123', name:'Dr. Gupta',    department:'ECE' }
        ]
      };
    }
  }

  // ── LOGIN ─────────────────────────────────
  async function login(email, password) {
    const config = await loadConfig();
    if (email === config.admin.email && password === config.admin.password) {
      setSession({ email, role: 'admin', name: 'Admin' });
      return { success: true, role: 'admin' };
    }
    const teacher = config.teachers.find(t => t.email===email && t.password===password);
    if (teacher) {
      setSession({ email, role:'teacher', name:teacher.name, department:teacher.department });
      return { success: true, role:'teacher' };
    }
    return { success: false, message: 'Invalid email or password.' };
  }

  // ── SESSION ───────────────────────────────
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    touchActivity();
  }

  function getSession() {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
  }

  function isLoggedIn() { return !!getSession(); }
  function getRole() { const s = getSession(); return s ? s.role : null; }

  // ── ACTIVITY TRACKING ─────────────────────
  function touchActivity() {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }

  function getLastActive() {
    return parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0');
  }

  function isSessionExpired() {
    const last = getLastActive();
    if (!last) return false;
    return (Date.now() - last) > TIMEOUT_MS;
  }

  function getRemainingMs() {
    const last = getLastActive();
    if (!last) return TIMEOUT_MS;
    const elapsed = Date.now() - last;
    return Math.max(0, TIMEOUT_MS - elapsed);
  }

  // ── PROTECT ROUTE ─────────────────────────
  function requireLogin(requiredRole) {
    const session = getSession();
    if (!session) { window.location.href = 'login.html'; return false; }
    if (requiredRole && session.role !== requiredRole) {
      if (session.role === 'admin')   window.location.href = 'dashboard-admin.html';
      else if (session.role === 'teacher') window.location.href = 'dashboard-teacher.html';
      else window.location.href = 'login.html';
      return false;
    }
    // Check inactivity expiry
    if (isSessionExpired()) {
      clearSession();
      window.location.href = 'login.html';
      return false;
    }
    touchActivity();
    return true;
  }

  // ── TEACHER MANAGEMENT ────────────────────
  function getTeachers() {
    const local = localStorage.getItem('nitkkr_teachers');
    return local ? JSON.parse(local) : [];
  }

  function saveTeachers(teachers) {
    localStorage.setItem('nitkkr_teachers', JSON.stringify(teachers));
  }

  function addTeacher(name, email, password, department) {
    const teachers = getTeachers();
    if (teachers.find(t => t.email === email)) return { success:false, message:'Email already exists.' };
    teachers.push({ name, email, password, department });
    saveTeachers(teachers);
    return { success: true };
  }

  function updateTeacher(email, fields) {
    const teachers = getTeachers();
    const i = teachers.findIndex(t => t.email === email);
    if (i >= 0) { teachers[i] = {...teachers[i], ...fields}; saveTeachers(teachers); return {success:true}; }
    return {success:false, message:'Teacher not found.'};
  }

  function removeTeacher(email) {
    saveTeachers(getTeachers().filter(t => t.email !== email));
    return { success: true };
  }

  async function getAllTeachers() {
    const config = await loadConfig();
    return config.teachers;
  }

  // ── PUBLIC API ────────────────────────────
  return {
    login, logout: clearSession, getSession, isLoggedIn, getRole,
    requireLogin, touchActivity, getRemainingMs, isSessionExpired,
    getTeachers, getAllTeachers, addTeacher, updateTeacher, removeTeacher,
    TIMEOUT_MS,
  };

})();