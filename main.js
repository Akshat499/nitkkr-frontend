/* ════════════════════════════════════════════
   NIT KKR SEARCH ENGINE — MAIN.JS
════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ── NAVBAR HAMBURGER ─────────────────────
  const hamburger = document.getElementById('navbar-hamburger');
  const mobileMenu = document.getElementById('navbar-mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('is-open');
    });
  }

  // ── NAVBAR SCROLL EFFECT ─────────────────
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.style.background = window.scrollY > 20
        ? 'rgba(9,9,15,0.97)'
        : 'rgba(9,9,15,0.85)';
    });
  }

  // ── HERO SEARCH — redirect student directly ──
  const heroSearchBtn = document.getElementById('hero-search-btn');
  const heroSearchInput = document.getElementById('hero-search-input');
  if (heroSearchBtn && heroSearchInput) {
    heroSearchBtn.addEventListener('click', () => {
      const val = heroSearchInput.value.trim();
      const dest = val
        ? 'dashboard-student.html?q=' + encodeURIComponent(val)
        : 'dashboard-student.html';
      window.location.href = dest;
    });
    heroSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') heroSearchBtn.click();
    });
  }

  // Auto-fill search input on student dashboard if ?q= param present
  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  const pyqInput = document.getElementById('pyq-search-input');
  if (qParam && pyqInput) {
    pyqInput.value = qParam;
  }

  // ── LOGIN TABS ───────────────────────────
  const loginTabs = document.querySelectorAll('.login-tab');
  const authForms = document.querySelectorAll('.auth-form');
  loginTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      loginTabs.forEach(t => t.classList.remove('login-tab--active'));
      authForms.forEach(f => f.classList.remove('auth-form--active'));
      tab.classList.add('login-tab--active');
      const targetForm = document.getElementById('form-' + tab.dataset.tab);
      if (targetForm) targetForm.classList.add('auth-form--active');
    });
  });

  // ── EMAIL DOMAIN VALIDATION ──────────────
  const loginEmailInput = document.getElementById('login-email');
  const domainWarning = document.getElementById('login-domain-warning');
  if (loginEmailInput && domainWarning) {
    loginEmailInput.addEventListener('blur', () => {
      const val = loginEmailInput.value.trim();
      if (val && !val.endsWith('@nitkkr.ac.in')) {
        domainWarning.classList.remove('hidden');
      } else {
        domainWarning.classList.add('hidden');
      }
    });
    loginEmailInput.addEventListener('input', () => {
      if (domainWarning && loginEmailInput.value.endsWith('@nitkkr.ac.in')) {
        domainWarning.classList.add('hidden');
      }
    });
  }

  // ── LOGIN FORM SUBMIT ─────────────────────
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = formLogin.querySelector('button[type="submit"]') || formLogin.querySelector('.btn--primary');

      if (!email) { showError('login-email-error', 'Email is required.'); return; }
      if (!email.endsWith('@nitkkr.ac.in')) {
        if (domainWarning) domainWarning.classList.remove('hidden');
        showError('login-email-error', 'Only @nitkkr.ac.in emails are allowed.'); return;
      }
      if (!password) { showError('login-password-error', 'Password is required.'); return; }

      if (submitBtn) { submitBtn.textContent = 'Logging in…'; submitBtn.disabled = true; }

      try {
        // Try backend JWT login first
        const result = await API.login(email, password);
        if (result.success) {
          if (result.role === 'admin') window.location.href = 'dashboard-admin.html';
          else if (result.role === 'teacher') window.location.href = 'dashboard-teacher.html';
          else window.location.href = 'dashboard-student.html';
          return;
        }
      } catch (err) {
        // Backend unavailable — fall back to local config auth for admin/teacher
        console.warn('Backend unavailable, using local auth:', err.message);
      }

      // Fallback: local config-based auth for admin/teacher
      try {
        const localResult = await Auth.login(email, password);
        if (localResult.success) {
          if (localResult.role === 'admin') window.location.href = 'dashboard-admin.html';
          else if (localResult.role === 'teacher') window.location.href = 'dashboard-teacher.html';
          else window.location.href = 'dashboard-student.html';
        } else {
          showError('login-password-error', localResult.message || 'Invalid email or password.');
        }
      } catch (err2) {
        showError('login-password-error', 'Login failed. Please try again.');
      }

      if (submitBtn) { submitBtn.textContent = 'Login'; submitBtn.disabled = false; }
    });
  }

  // ── REGISTER FORM SUBMIT ─────────────────
  const formRegister = document.getElementById('form-register');
  if (formRegister) {
    formRegister.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const role = document.getElementById('reg-role').value;
      const password = document.getElementById('reg-password').value;

      let valid = true;
      if (!name) { showError('reg-name-error', 'Name is required.'); valid = false; }
      if (!email) { showError('reg-email-error', 'Email is required.'); valid = false; }
      else if (!email.endsWith('@nitkkr.ac.in')) { showError('reg-email-error', 'Only @nitkkr.ac.in emails allowed.'); valid = false; }
      if (!role) { showError('reg-role-error', 'Please select a role.'); valid = false; }
      if (!password || password.length < 8) { showError('reg-password-error', 'Password must be at least 8 characters.'); valid = false; }

      if (!valid) return;
      alert('Registration submitted! Admin will review and activate your account.');
    });
  }

  // ── ROLE DETECTION ────────────────────────
  function detectRole(email) {
    const prefix = email.split('@')[0].toLowerCase();
    if (prefix.includes('admin')) return 'admin';
    return 'teacher';
  }

  // ── SHOW ERROR HELPER ─────────────────────
  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; setTimeout(() => { el.textContent = ''; }, 4000); }
  }

  // ── PASSWORD TOGGLE ───────────────────────
  document.querySelectorAll('[id^="toggle-"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.form-input-wrapper')?.querySelector('input[type="password"], input[type="text"]');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? '👁' : '🙈';
      }
    });
  });

  // ── SIDEBAR NAVIGATION ────────────────────
  const sidebarNavItems = document.querySelectorAll('.sidebar__nav-item');
  const dashSections = document.querySelectorAll('.dash-section');
  const topbarTitle = document.getElementById('topbar-title');

  sidebarNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = item.dataset.section;

      sidebarNavItems.forEach(i => i.classList.remove('sidebar__nav-item--active'));
      item.classList.add('sidebar__nav-item--active');

      dashSections.forEach(s => s.classList.remove('dash-section--active'));
      const targetSection = document.getElementById('section-' + sectionId);
      if (targetSection) targetSection.classList.add('dash-section--active');

      // Update topbar title from nav item text
      const navText = item.querySelector('.sidebar__nav-icon')?.nextSibling?.textContent?.trim();
      if (topbarTitle && navText) topbarTitle.textContent = navText;

      // Auto-close sidebar on mobile
      const sidebar = document.getElementById('sidebar');
      if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('is-open');
      }
    });
  });

  // ── SIDEBAR TOGGLE (Mobile) ───────────────
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('is-open') &&
          !sidebar.contains(e.target) &&
          !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('is-open');
      }
    });
  }

  // ── LOGOUT ───────────────────────────────
  const logoutBtn = document.getElementById('sidebar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'index.html';
      }
    });
  }

  // ── TO-DO LIST ────────────────────────────
  const todoAddBtn = document.getElementById('todo-add-btn');
  const todoInput = document.getElementById('todo-input');
  const todoList = document.getElementById('todo-list');
  const todoPriority = document.getElementById('todo-priority');
  const todoDue = document.getElementById('todo-due');

  if (todoAddBtn && todoInput && todoList) {
    todoAddBtn.addEventListener('click', addTodoItem);
    todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodoItem(); });

    function addTodoItem() {
      const text = todoInput.value.trim();
      if (!text) return;

      const priority = todoPriority?.value || 'medium';
      const due = todoDue?.value || '';

      const li = document.createElement('li');
      li.className = `todo-item todo-item--${priority}`;
      li.id = 'todo-' + Date.now();
      li.innerHTML = `
        <input type="checkbox" class="todo-item__check" />
        <div class="todo-item__info">
          <span class="todo-item__text">${escapeHtml(text)}</span>
          <span class="todo-item__meta">${due ? 'Due: ' + due + ' • ' : ''}${capitalize(priority)} Priority</span>
        </div>
        <span class="todo-item__priority todo-item__priority--${priority}">${capitalize(priority)}</span>
        <button class="todo-item__delete btn btn--ghost btn--sm" aria-label="Delete task">🗑</button>
      `;

      li.querySelector('.todo-item__check').addEventListener('change', function () {
        li.classList.toggle('todo-item--done', this.checked);
      });
      li.querySelector('.todo-item__delete').addEventListener('click', () => li.remove());

      todoList.prepend(li);
      todoInput.value = '';
      if (todoDue) todoDue.value = '';
    }

    // Delegate for pre-existing items
    todoList.addEventListener('change', (e) => {
      if (e.target.classList.contains('todo-item__check')) {
        e.target.closest('.todo-item')?.classList.toggle('todo-item--done', e.target.checked);
      }
    });
    todoList.addEventListener('click', (e) => {
      if (e.target.classList.contains('todo-item__delete') || e.target.closest('.todo-item__delete')) {
        e.target.closest('.todo-item')?.remove();
      }
    });
  }

  // To-Do filter tabs
  document.querySelectorAll('.todo-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.todo-filter-tab').forEach(t => t.classList.remove('todo-filter-tab--active'));
      tab.classList.add('todo-filter-tab--active');
      const filter = tab.dataset.filter;
      document.querySelectorAll('.todo-item').forEach(item => {
        switch (filter) {
          case 'all':     item.style.display = ''; break;
          case 'done':    item.style.display = item.classList.contains('todo-item--done') ? '' : 'none'; break;
          case 'pending': item.style.display = !item.classList.contains('todo-item--done') ? '' : 'none'; break;
          case 'high':    item.style.display = item.classList.contains('todo-item--high') ? '' : 'none'; break;
        }
      });
    });
  });

  // ── AI CHAT ───────────────────────────────
  const chatInput = document.getElementById('ai-chat-input');
  const chatSendBtn = document.getElementById('ai-chat-send-btn');
  const chatMessages = document.getElementById('ai-chat-messages');

  if (chatSendBtn && chatInput && chatMessages) {
    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });

    function sendChatMessage() {
      const text = chatInput.value.trim();
      if (!text) return;

      // User bubble
      appendChatMsg('user', text);
      chatInput.value = '';

      // AI typing
      const aiMsg = appendChatMsg('ai', 'Searching NIT KKR knowledge base…');
      // Simulate backend response — replace with actual LangChain API call
      setTimeout(() => {
        aiMsg.querySelector('.chat-msg__bubble').textContent =
          `I found results for "${text}" in the database. Connect the LangChain backend to get actual AI-powered answers.`;
      }, 1500);
    }

    function appendChatMsg(role, text) {
      const div = document.createElement('div');
      div.className = `chat-msg chat-msg--${role}`;
      div.innerHTML = `
        <span class="chat-msg__avatar">${role === 'ai' ? '⬡' : '👤'}</span>
        <div class="chat-msg__bubble">${escapeHtml(text)}</div>
      `;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return div;
    }
  }

  // ── ADMIN APPROVE / REJECT ────────────────
  document.querySelectorAll('[id^="approve-btn-"]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.textContent = 'Approved ✓';
      btn.disabled = true;
      btn.closest('.content-item').style.opacity = '0.5';
    });
  });
  document.querySelectorAll('[id^="reject-btn-"]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.content-item')?.remove();
    });
  });

  // ── TOGGLE SWITCHES ───────────────────────
  document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(checkbox => {
    const label = checkbox.closest('.toggle-switch')?.querySelector('.toggle-switch__label');
    checkbox.addEventListener('change', () => {
      if (label) label.textContent = checkbox.checked ? 'On' : 'Off';
    });
  });

  // ── UPLOAD DROPZONE ───────────────────────
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('upload-file-input');
  if (dropzone && fileInput) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--clr-primary)';
      dropzone.style.background = 'rgba(108,99,255,0.06)';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
      const file = e.dataTransfer.files[0];
      if (file) updateDropzoneLabel(file.name);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) updateDropzoneLabel(fileInput.files[0].name);
    });
    function updateDropzoneLabel(name) {
      const p = dropzone.querySelector('p');
      if (p) p.innerHTML = `<strong>${escapeHtml(name)}</strong> — Ready to upload ✓`;
    }
  }

  // ── UPLOAD FORM SUBMIT ─────────────────────
  const uploadForm = document.getElementById('upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('upload-title')?.value.trim();
      if (!title) return;
      alert(`"${title}" has been submitted for admin approval.`);
      uploadForm.reset();
      const p = document.querySelector('#upload-dropzone p');
      if (p) p.innerHTML = 'Drag & drop your PDF here or <label for="upload-file-input" class="form-link">browse</label>';
    });
  }

  // ── HELPERS ───────────────────────────────
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

});