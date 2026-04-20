/* ════════════════════════════════════════════
   NIT KKR — Backend API Client v2.0
   Handles all communication with FastAPI backend
   Replaces direct Groq API calls with RAG-based backend
════════════════════════════════════════════ */

const API = (() => {

  // ── CONFIG ──────────────────────────────────
  const BASE_URL = 'https://nitkkr-backend.onrender.com'; // No trailing slash!
  const TOKEN_KEY = 'nitkkr_jwt_token';
  const SESSION_KEY = 'nitkkr_session';
  const LAST_ACTIVE_KEY = 'nitkkr_last_active';

  // ── TOKEN MANAGEMENT ────────────────────────
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function getSession() {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  }

  function setSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    touchActivity();
  }

  function touchActivity() {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }

  // ── HTTP HELPERS ────────────────────────────
  async function request(method, path, body = null, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && getToken()) {
      headers['Authorization'] = 'Bearer ' + getToken();
    }

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(BASE_URL + path, opts);

      if (res.status === 401) {
        if (auth) {
          // Only redirect on authenticated requests (not during login itself)
          clearToken();
          window.location.href = 'login.html';
          return null;
        }
        // For unauthenticated requests (login), just throw so caller can handle
        throw new Error('Invalid email or password');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Request failed');
      }
      return data;
    } catch (e) {
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        throw new Error('Cannot connect to backend. Make sure the server is running at ' + BASE_URL);
      }
      throw e;
    }
  }

  async function formRequest(path, formData, auth = true) {
    const headers = {};
    if (auth && getToken()) {
      headers['Authorization'] = 'Bearer ' + getToken();
    }
    const res = await fetch(BASE_URL + path, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload failed');
    return data;
  }

  // ── AUTH ─────────────────────────────────────
  async function login(email, password) {
    try {
      const data = await request('POST', '/auth/login', { email, password }, false);
      if (data && data.access_token) {
        setToken(data.access_token);
        setSession({ email, role: data.role, name: data.name });
        return { success: true, role: data.role, name: data.name };
      }
      return { success: false, message: 'Login failed' };
    } catch (err) {
      // Backend login failed (wrong credentials or unavailable)
      return { success: false, message: err.message || 'Login failed' };
    }
  }

  async function signup(name, email, password) {
    const data = await request('POST', '/auth/signup', { name, email, password, role: 'student' }, false);
    if (data && data.access_token) {
      setToken(data.access_token);
      setSession({ email, role: data.role, name: data.name });
      return { success: true, role: data.role, name: data.name };
    }
    return { success: false, message: 'Signup failed' };
  }

  function logout() {
    clearToken();
    window.location.href = 'login.html';
  }

  function requireLogin(requiredRole) {
    const session = getSession();
    if (!session || !getToken()) {
      window.location.href = 'login.html';
      return false;
    }
    if (requiredRole && session.role !== requiredRole) {
      if (session.role === 'admin') window.location.href = 'dashboard-admin.html';
      else if (session.role === 'teacher') window.location.href = 'dashboard-teacher.html';
      else window.location.href = 'dashboard-student.html';
      return false;
    }
    return true;
  }

  // ── CHAT / RAG ───────────────────────────────
  /**
   * Unified RAG chat — works for students (authenticated) and guests.
   * Auto-detects: result queries, policy queries, announcement queries, general.
   */
  async function chat(question, context = null) {
    const body = { question, context };
    const token = getToken();
    if (token) {
      return await request('POST', '/student/chat', body, true);
    } else {
      // Guest access
      return await request('POST', '/student/chat/guest', body, false);
    }
  }

  /**
   * RAG chat for notifications/policies.
   */
  async function queryNotifications(question) {
    return await request('POST', '/notifications/query', { question });
  }

  /**
   * RAG chat for announcements.
   */
  async function queryAnnouncements(question) {
    return await request('POST', '/announcements/query', { question });
  }

  // ── RESULTS ──────────────────────────────────
  /**
   * Natural language result file search.
   * e.g. "BTech CSE semester 3 regular 2024"
   */
  async function searchResultFiles(question) {
    return await request('POST', '/student/query', { question });
  }

  /**
   * Extract specific student marks from result PDF.
   * Uses /guest endpoint — NO login required.
   */
  async function extractMyResult(rollNumber = null, studentName = null, resultId = null, branch = null, semester = null) {
    const token = localStorage.getItem('nitkkr_token');
    const endpoint = token ? '/student/extract-result' : '/student/extract-result/guest';
    const params = new URLSearchParams();
    if (rollNumber) params.append('roll_number', rollNumber);
    if (studentName) params.append('student_name', studentName);
    if (resultId) params.append('result_id', resultId);
    if (branch) params.append('branch', branch);
    if (semester) params.append('semester', semester);
    const path = endpoint + '?' + params.toString();
    const body = { question: 'Find result for ' + (rollNumber || studentName) };
    if (token) {
      return await request('POST', path, body);
    } else {
      const res = await fetch(BASE_URL + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error ' + res.status);
      }
      return await res.json();
    }
  }

  /**
   * List all available result files (with optional filters).
   */
  async function listResults(filters = {}) {
    let path = '/student/results/list?';
    const params = new URLSearchParams();
    if (filters.degree) params.append('degree', filters.degree);
    if (filters.branch) params.append('branch', filters.branch);
    if (filters.semester) params.append('semester', filters.semester);
    if (filters.year) params.append('year', filters.year);
    if (filters.type) params.append('result_type', filters.type);
    path += params.toString();
    return await request('GET', path, null, false);
  }

  // ── ADMIN UPLOADS ────────────────────────────
  async function uploadResult(formData) {
    return await formRequest('/admin/upload-result', formData, true);
  }

  async function uploadNotification(formData) {
    return await formRequest('/notifications/upload', formData, true);
  }

  async function uploadAnnouncement(formData) {
    return await formRequest('/announcements/upload', formData, true);
  }

  async function getAllResults() {
    return await request('GET', '/admin/results');
  }

  async function deleteResult(id) {
    return await request('DELETE', `/admin/results/${id}`);
  }

  async function getAdminStats() {
    return await request('GET', '/admin/stats');
  }

  // ── NOTIFICATIONS ────────────────────────────
  async function getAllNotifications() {
    return await request('GET', '/notifications/all', null, false);
  }

  async function getAllAnnouncements() {
    return await request('GET', '/announcements/all', null, false);
  }

  async function deleteAnnouncement(id) {
    return await request('DELETE', `/announcements/${id}`);
  }

  // ── FILE URL HELPER ──────────────────────────
  function fileUrl(filePath) {
    if (!filePath) return '#';
    // Backend serves files at /uploads/...
    const relative = filePath.replace(/^uploads[\/\\]/, '');
    return `${BASE_URL}/uploads/${relative}`;
  }

  // ── PUBLIC API ───────────────────────────────
  return {
    BASE_URL,
    // Auth
    login, signup, logout, requireLogin,
    isLoggedIn, getSession, getToken, setToken, setSession, clearToken,
    // Chat
    chat, queryNotifications, queryAnnouncements,
    // Results
    searchResultFiles, extractMyResult, listResults,
    // Admin
    uploadResult, uploadNotification, uploadAnnouncement,
    getAllResults, deleteResult, getAdminStats,
    // Public data
    getAllNotifications, getAllAnnouncements, deleteAnnouncement,
    // Helpers
    fileUrl,
  };
})();