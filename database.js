/* ════════════════════════════════════════════════════
   NIT KKR — UNIFIED DATABASE v2
   Handles: PYQs, Assignments, Lab Manuals, Notes,
            Notifications, Announcements
════════════════════════════════════════════════════ */

const DB = (() => {

  const KEYS = {
    PYQ:           'nitkkr_pyq_db',
    ASSIGNMENTS:   'nitkkr_assignments',
    NOTES:         'nitkkr_notes',
    LAB_MANUALS:   'nitkkr_lab_manuals',
    NOTIFICATIONS: 'nitkkr_notifications',
    ANNOUNCEMENTS: 'nitkkr_announcements',
    SEARCH_LOG:    'nitkkr_search_log',
  };

  // ── Generic CRUD ──────────────────────────
  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  function _set(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; }
    catch(e) { console.error('DB write error:', e); return false; }
  }
  function _genId(prefix) { return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }

  // ── BRANCH NAMES ─────────────────────────
  const BRANCH_NAMES = {
    cse:'Computer Science & Engineering', ece:'Electronics & Communication Engineering',
    me:'Mechanical Engineering', ee:'Electrical Engineering',
    ce:'Civil Engineering', it:'Information Technology',
    che:'Chemical Engineering', mca:'MCA', mba:'MBA'
  };

  // ── NOTIFICATION HELPER ──────────────────
  function _addNotification(type, icon, text, meta = {}) {
    const notifs = _get(KEYS.NOTIFICATIONS);
    notifs.unshift({
      id: _genId('notif'), type, icon, text, ...meta,
      time: new Date().toISOString(), read: false
    });
    _set(KEYS.NOTIFICATIONS, notifs.slice(0, 100)); // keep last 100
  }

  // ════════════════════════════════════════
  //  PYQ MODULE
  // ════════════════════════════════════════
  const PYQ = {
    SAMPLE_QUESTIONS: [
      { number:"Q.1", text:"What is HTML? Explain the basic structure of an HTML document with a suitable example. Differentiate between HTML and XHTML. Also explain tags: <head>, <body>, <title>, <h1> to <h6>, <p>, <br/>, <hr/>, <b>, <i>, <u>, <strong>, <em>.", marks:15 },
      { number:"Q.2", text:"Explain HTML Tables in detail. Write HTML code to create a 3x3 table with merged header row (colspan=3) containing 'Student Result'. Also explain HTML Forms and form elements: input types (text, password, radio, checkbox), select, option, textarea, and submit button.", marks:15 },
      { number:"Q.3", text:"Explain Hyperlinks in HTML. Differentiate between absolute and relative URLs. Write HTML demonstrating: link to external website in new tab, link using mailto, and anchor link to section within same page. Also explain the img tag with all attributes and image maps.", marks:15 },
      { number:"Q.4", text:"What are Semantic HTML5 elements? Explain header, footer, nav, main, aside, article, section, figure, figcaption with layout diagram. Write a complete HTML5 Student Registration Form with Full Name, Roll Number, Branch dropdown, Gender radio buttons, Date of Birth, Email, Password, and Submit button.", marks:15 },
      { number:"Q.5", text:"Explain inline CSS, internal CSS, and external CSS with examples. Explain CSS selectors: element, class, id, attribute. Also explain HTML5 audio and video tags with attributes, Canvas element, local storage vs session storage, and DOCTYPE declaration.", marks:15 }
    ],

    init() {
      if (!localStorage.getItem(KEYS.PYQ)) {
        const sample = {
          id: 'pyq_sample_html_2024',
          title: 'Web Design (HTML)', subject: 'Web Design',
          branch: 'cse', branchName: 'Computer Science & Engineering',
          semester: '2', year: '2024',
          examType: 'end', examTypeLabel: 'End Semester',
          filename: 'HTML_CSE_Sem2_2024_EndSem.pdf',
          uploadedBy: 'system', uploadedAt: '2024-11-01',
          pages: 2, questions: this.SAMPLE_QUESTIONS,
          fileData: '', approved: true
        };
        _set(KEYS.PYQ, [sample]);
      }
    },

    getAll() { return _get(KEYS.PYQ); },

    getApproved() { return this.getAll().filter(p => p.approved !== false); },

    query({ branch, semester, subject, examType, year, search, showAll } = {}) {
      let r = showAll ? this.getAll() : this.getApproved();
      if (branch)   r = r.filter(p => p.branch === branch);
      if (semester) r = r.filter(p => p.semester === String(semester));
      if (subject)  r = r.filter(p => p.subject.toLowerCase().includes(subject.toLowerCase()));
      if (examType) r = r.filter(p => p.examType === examType);
      if (year)     r = r.filter(p => p.year === String(year));
      if (search) {
        const q = search.toLowerCase();
        r = r.filter(p =>
          p.title.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q) ||
          p.branch.toLowerCase().includes(q) || (p.branchName||'').toLowerCase().includes(q) ||
          p.year.includes(q) || (p.examTypeLabel||'').toLowerCase().includes(q) ||
          (p.questions||[]).some(qn => qn.text.toLowerCase().includes(q))
        );
      }
      return r.sort((a,b) => Number(b.year)-Number(a.year) || a.title.localeCompare(b.title));
    },

    add({ title, subject, branch, branchName, semester, year, examType, examTypeLabel, filename, uploadedBy, fileData, questions, pages }) {
      const db = this.getAll();
      const entry = {
        id: _genId('pyq'),
        title, subject,
        branch, branchName: branchName || BRANCH_NAMES[branch] || branch.toUpperCase(),
        semester: String(semester), year: String(year),
        examType, examTypeLabel: examTypeLabel || (examType==='end'?'End Semester':'Mid Semester'),
        filename, uploadedBy,
        uploadedAt: new Date().toISOString().split('T')[0],
        pages: pages||1, questions: questions||[], fileData: fileData||'',
        approved: true
      };
      db.push(entry);
      _set(KEYS.PYQ, db);
      _addNotification('new_paper', '📄',
        `New PYQ uploaded: ${title} (${entry.branchName} • Sem ${semester} • ${entry.examTypeLabel} ${year})`,
        { subject, branch, semester: String(semester), paperId: entry.id }
      );
      return entry;
    },

    getById(id) { return this.getAll().find(p => p.id === id) || null; },
    remove(id)  { _set(KEYS.PYQ, this.getAll().filter(p => p.id !== id)); },
    approve(id) {
      const all = this.getAll();
      const i = all.findIndex(p => p.id === id);
      if (i >= 0) { all[i].approved = true; _set(KEYS.PYQ, all); }
    },
    reject(id) { this.remove(id); },
    getPending() { return this.getAll().filter(p => p.approved === false); },
  };

  // ════════════════════════════════════════
  //  ASSIGNMENTS MODULE
  // ════════════════════════════════════════
  const Assignments = {
    getAll() { return _get(KEYS.ASSIGNMENTS); },

    query({ branch, semester, subject, status } = {}) {
      let r = this.getAll();
      if (branch)   r = r.filter(a => a.branch === branch);
      if (semester) r = r.filter(a => a.semester === String(semester));
      if (subject)  r = r.filter(a => a.subject.toLowerCase().includes(subject.toLowerCase()));
      if (status === 'active') r = r.filter(a => !a.dueDate || new Date(a.dueDate) >= new Date());
      if (status === 'expired') r = r.filter(a => a.dueDate && new Date(a.dueDate) < new Date());
      return r.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    add({ title, description, subject, branch, semester, dueDate, maxMarks, uploadedBy, attachments }) {
      const all = this.getAll();
      const entry = {
        id: _genId('asgn'),
        title, description: description||'',
        subject, branch, branchName: BRANCH_NAMES[branch]||branch.toUpperCase(),
        semester: String(semester),
        dueDate: dueDate||'', maxMarks: maxMarks||null,
        uploadedBy, attachments: attachments||[],
        createdAt: new Date().toISOString(),
      };
      all.push(entry);
      _set(KEYS.ASSIGNMENTS, all);
      _addNotification('new_assignment', '📝',
        `New assignment posted: ${title} (${entry.branchName} • Sem ${semester})`,
        { subject, branch, semester: String(semester), assignmentId: entry.id }
      );
      return entry;
    },

    getById(id) { return this.getAll().find(a => a.id === id) || null; },
    remove(id)  { _set(KEYS.ASSIGNMENTS, this.getAll().filter(a => a.id !== id)); },

    update(id, fields) {
      const all = this.getAll();
      const i = all.findIndex(a => a.id === id);
      if (i >= 0) { all[i] = { ...all[i], ...fields }; _set(KEYS.ASSIGNMENTS, all); }
    },
  };

  // ════════════════════════════════════════
  //  NOTES MODULE
  // ════════════════════════════════════════
  const Notes = {
    getAll() { return _get(KEYS.NOTES); },

    query({ branch, semester, subject } = {}) {
      let r = this.getAll();
      if (branch)   r = r.filter(n => n.branch === branch);
      if (semester) r = r.filter(n => n.semester === String(semester));
      if (subject)  r = r.filter(n => n.subject.toLowerCase().includes(subject.toLowerCase()));
      return r.sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    },

    add({ title, subject, branch, semester, description, filename, fileData, uploadedBy, unit }) {
      const all = this.getAll();
      const entry = {
        id: _genId('note'),
        title, subject, branch, branchName: BRANCH_NAMES[branch]||branch.toUpperCase(),
        semester: String(semester), description: description||'',
        filename, fileData: fileData||'', uploadedBy, unit: unit||'',
        uploadedAt: new Date().toISOString().split('T')[0],
      };
      all.push(entry);
      _set(KEYS.NOTES, all);
      _addNotification('new_notes', '📒', `New notes uploaded: ${title} (${entry.branchName} • Sem ${semester})`,
        { subject, branch, semester: String(semester) });
      return entry;
    },

    getById(id) { return this.getAll().find(n => n.id === id) || null; },
    remove(id)  { _set(KEYS.NOTES, this.getAll().filter(n => n.id !== id)); },
  };

  // ════════════════════════════════════════
  //  LAB MANUALS MODULE
  // ════════════════════════════════════════
  const LabManuals = {
    getAll() { return _get(KEYS.LAB_MANUALS); },

    query({ branch, semester, subject } = {}) {
      let r = this.getAll();
      if (branch)   r = r.filter(l => l.branch === branch);
      if (semester) r = r.filter(l => l.semester === String(semester));
      if (subject)  r = r.filter(l => l.subject.toLowerCase().includes(subject.toLowerCase()));
      return r.sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    },

    add({ title, subject, branch, semester, description, filename, fileData, uploadedBy, labCount }) {
      const all = this.getAll();
      const entry = {
        id: _genId('lab'),
        title, subject, branch, branchName: BRANCH_NAMES[branch]||branch.toUpperCase(),
        semester: String(semester), description: description||'',
        filename, fileData: fileData||'', uploadedBy, labCount: labCount||0,
        uploadedAt: new Date().toISOString().split('T')[0],
      };
      all.push(entry);
      _set(KEYS.LAB_MANUALS, all);
      _addNotification('new_lab', '🔬', `New lab manual uploaded: ${title} (${entry.branchName} • Sem ${semester})`,
        { subject, branch, semester: String(semester) });
      return entry;
    },

    getById(id) { return this.getAll().find(l => l.id === id) || null; },
    remove(id)  { _set(KEYS.LAB_MANUALS, this.getAll().filter(l => l.id !== id)); },
  };

  // ════════════════════════════════════════
  //  NOTIFICATIONS MODULE
  // ════════════════════════════════════════
  const Notifications = {
    getAll() { return _get(KEYS.NOTIFICATIONS); },
    getUnread() { return this.getAll().filter(n => !n.read); },
    markRead(id) {
      const all = this.getAll();
      const i = all.findIndex(n => n.id === id);
      if (i >= 0) { all[i].read = true; _set(KEYS.NOTIFICATIONS, all); }
    },
    markAllRead() {
      _set(KEYS.NOTIFICATIONS, this.getAll().map(n => ({...n, read:true})));
    },
    remove(id) { _set(KEYS.NOTIFICATIONS, this.getAll().filter(n => n.id !== id)); },
  };

  // ════════════════════════════════════════
  //  ANNOUNCEMENTS MODULE
  // ════════════════════════════════════════
  const Announcements = {
    getAll() { return _get(KEYS.ANNOUNCEMENTS); },
    getActive() {
      return this.getAll().filter(a => !a.expiresAt || new Date(a.expiresAt) >= new Date())
                          .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    },
    add({ title, body, type, branch, postedBy, expiresAt }) {
      const all = this.getAll();
      const entry = {
        id: _genId('ann'), title, body: body||'',
        type: type||'general', branch: branch||'all',
        postedBy, expiresAt: expiresAt||'',
        createdAt: new Date().toISOString(),
      };
      all.unshift(entry);
      _set(KEYS.ANNOUNCEMENTS, all);
      return entry;
    },
    remove(id) { _set(KEYS.ANNOUNCEMENTS, this.getAll().filter(a => a.id !== id)); },
  };

  // ════════════════════════════════════════
  //  SEARCH ANALYTICS
  // ════════════════════════════════════════
  const Analytics = {
    logSearch(query, branch) {
      const log = _get(KEYS.SEARCH_LOG);
      log.push({ query, branch: branch||'', time: new Date().toISOString() });
      _set(KEYS.SEARCH_LOG, log.slice(-500));
    },
    getStats() {
      const pyqs = PYQ.getAll().length;
      const asgns = Assignments.getAll().length;
      const notes = Notes.getAll().length;
      const labs = LabManuals.getAll().length;
      const searches = _get(KEYS.SEARCH_LOG).length;
      return { pyqs, asgns, notes, labs, searches, total: pyqs+asgns+notes+labs };
    },
    getTrending() {
      const log = _get(KEYS.SEARCH_LOG);
      const counts = {};
      log.forEach(l => { if(l.query) counts[l.query] = (counts[l.query]||0)+1; });
      return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8)
                   .map(([query,count])=>({query,count}));
    },
  };

  // Init on load
  PYQ.init();

  return { PYQ, Assignments, Notes, LabManuals, Notifications, Announcements, Analytics, BRANCH_NAMES };

})();