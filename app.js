// ============================================================
//  Attendrollix — app.js
//  Frontend logic — Design 2 (Light Elegant / Corporate)
//  Backend: PHP + MySQL (XAMPP / Laragon)
// ============================================================

const API_BASE = "http://localhost/attendrollix/api";

// ── API helper ────────────────────────────────────────────
async function api(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(API_BASE + endpoint, opts);
    const json = await res.json();
    return json;
  } catch {
    return { success: false, message: 'Network error. Is XAMPP running?', data: null };
  }
}

// ── App state ─────────────────────────────────────────────
let COURSES            = [];
let students           = [];
let attendance         = {};
let college            = { name: '', email: '', location: '', board: '', phone: '' };
const todayStr         = new Date().toISOString().split('T')[0];
let currentPage        = 'dashboard';
let selCourse          = null;
let aMode              = 'manual';
let activeQrTab        = 'type';
let reportRange        = 'date';
let reportDate         = todayStr;
let cameraStream       = null;
let dashActivityCourse = 'all';
let selectedCourseColor= '#3b82f6';

// ── Colour helpers ────────────────────────────────────────
const AV_COLORS = ['#1d4ed8','#c9872b','#2d6a4f','#b91c1c','#7c3aed','#0891b2','#b45309','#be185d'];
function avColor(name)   { return AV_COLORS[(name || 'A').charCodeAt(0) % AV_COLORS.length]; }
function initials(name)  { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2); }
function courseColor(id) { return COURSES.find(c => c.id == id)?.color  || '#1a1a2e'; }
function courseName(id)  { return COURSES.find(c => c.id == id)?.label  || String(id); }

function fmtDate(ds) {
  return new Date(ds + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday:'long', day:'numeric', month:'long', year:'numeric',
  });
}

function avatarHtml(name, size = 36) {
  const bg  = avColor(name);
  const ini = initials(name);
  const r   = Math.round(size * 0.28);
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.36)}px;
          background:${bg};border-radius:${r}px">${ini}</div>`;
}

function badgeHtml(status) {
  const map = {
    present: ['badge-present','✓ Present'],
    absent:  ['badge-absent', '✕ Absent'],
    late:    ['badge-late',   '⏰ Late'],
  };
  const [cls, lbl] = map[status] || ['','—'];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function todayAtt()      { return attendance[todayStr] || {}; }
function studentsIn(cid) { return students.filter(s => s.course_id == cid); }

function getStats() {
  const ta = todayAtt();
  return {
    total:   students.length,
    present: students.filter(s => ta[s.id]?.status === 'present').length,
    absent:  students.filter(s => ta[s.id]?.status === 'absent').length,
    late:    students.filter(s => ta[s.id]?.status === 'late').length,
  };
}

// ── Toast ─────────────────────────────────────────────────
function notify(msg, type = 'success') {
  const el = document.getElementById('notif');
  const icons = { success:'✓', error:'✕', warn:'⚠' };
  el.innerHTML  = `<span>${icons[type]||'✓'}</span> ${msg}`;
  el.className  = `show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, 3500);
}

// ── Modal ─────────────────────────────────────────────────
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = html;
  document.getElementById('modal-overlay').className = 'show';
}
function closeModal() {
  document.getElementById('modal-overlay').className = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Loading bar ───────────────────────────────────────────
function showLoading(show) {
  let el = document.getElementById('global-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-loader';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;' +
      'background:linear-gradient(90deg,var(--gold),var(--accent));z-index:9999;' +
      'animation:loadbar 1.5s ease infinite;';
    const st = document.createElement('style');
    st.textContent = '@keyframes loadbar{0%{transform:scaleX(0);transform-origin:left}' +
      '50%{transform:scaleX(1);transform-origin:left}' +
      '51%{transform:scaleX(1);transform-origin:right}' +
      '100%{transform:scaleX(0);transform-origin:right}}';
    document.head.appendChild(st);
    document.body.appendChild(el);
  }
  el.style.display = show ? 'block' : 'none';
}

// ════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════

function goScreen(name) {
  ['login','register','reg-success','forgot','reset'].forEach(s => {
    const el = document.getElementById('scr-' + s);
    if (el) el.style.display = 'none';
  });
  const el = document.getElementById('scr-' + name);
  if (el) el.style.display = '';
  clearAlert();

  const headings = {
    login:'Welcome Back', register:'Create Account',
    'reg-success':'Registration Done!', forgot:'Forgot Password', reset:'Set New Password',
  };
  const subs = {
    login:'Sign in to your admin panel', register:'Register your institution',
    'reg-success':'You can now log in', forgot:'We will email you a reset link',
    reset:'Choose a strong new password',
  };
  document.getElementById('auth-heading').textContent = headings[name] || '';
  document.getElementById('auth-sub').textContent     = subs[name]     || '';
}

function showAlert(msg, type = 'error') {
  const el = document.getElementById('auth-alert');
  el.className = 'auth-alert ' + type;
  el.textContent = msg;
  el.style.display = '';
}
function clearAlert() {
  document.getElementById('auth-alert').style.display = 'none';
}

async function doLogin() {
  const email    = document.getElementById('login-id').value.trim();
  const password = document.getElementById('login-pw').value;
  if (!email || !password) return showAlert('Email and password are required.');
  const btn = document.querySelector('#scr-login .btn-primary');
  btn.textContent = 'Signing in…'; btn.disabled = true;
  const res = await api('/auth.php?action=login', 'POST', { email, password });
  btn.textContent = 'Sign In →'; btn.disabled = false;
  if (!res.success) return showAlert(res.message);
  college = res.data;
  showApp();
  await loadInitialData();
  goPage('dashboard');
}

async function doRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pw1').value;
  const confirm  = document.getElementById('reg-pw2').value;
  const location = document.getElementById('reg-loc').value.trim();
  const board    = document.getElementById('reg-board').value.trim();
  const phone    = document.getElementById('reg-phone').value.trim();
  if (!name || !email || !password || !confirm)
    return showAlert('Please fill in all required fields.');
  if (password !== confirm) return showAlert('Passwords do not match.');
  if (password.length < 6)  return showAlert('Password must be at least 6 characters.');
  const btn = document.querySelector('#scr-register .btn-primary');
  btn.textContent = 'Creating account…'; btn.disabled = true;
  const res = await api('/auth.php?action=register', 'POST', { name, email, password, location, board, phone });
  btn.textContent = 'Create Account →'; btn.disabled = false;
  if (!res.success) return showAlert(res.message);
  document.getElementById('show-gen-email').textContent = email;
  goScreen('reg-success');
}

async function doForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return showAlert('Please enter your registered email address.');
  const btn = document.getElementById('forgot-btn');
  btn.textContent = 'Sending…'; btn.disabled = true;
  const res = await api('/auth.php?action=forgot', 'POST', { email });
  btn.textContent = 'Send Reset Link'; btn.disabled = false;
  showAlert(
    res.success ? '✅ Reset link sent! Please check your email.' : (res.message || 'Something went wrong.'),
    res.success ? 'success' : 'error'
  );
}

async function doReset() {
  const pw1   = document.getElementById('reset-pw1').value;
  const pw2   = document.getElementById('reset-pw2').value;
  const token = new URLSearchParams(window.location.search).get('reset_token') || '';
  if (!pw1 || !pw2)   return showAlert('Please fill in both fields.');
  if (pw1 !== pw2)    return showAlert('Passwords do not match.');
  if (pw1.length < 6) return showAlert('Password must be at least 6 characters.');
  if (!token)         return showAlert('Invalid or missing reset token.');
  const btn = document.getElementById('reset-btn');
  btn.textContent = 'Updating…'; btn.disabled = true;
  const res = await api('/auth.php?action=reset', 'POST', { token, password: pw1 });
  btn.textContent = 'Set New Password'; btn.disabled = false;
  if (!res.success) return showAlert(res.message || 'Reset failed.');
  window.history.replaceState({}, '', window.location.pathname);
  showAlert('✅ Password updated! You can now log in.', 'success');
  setTimeout(() => goScreen('login'), 1500);
}

async function logout() {
  await api('/auth.php?action=logout', 'POST');
  document.getElementById('app').style.display          = 'none';
  window.location.href = 'home.html'; return;
  stopCamera();
  students = []; COURSES = []; attendance = {};
  goScreen('login');
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display         = '';
  document.getElementById('college-name-top').textContent = college.name;
  document.getElementById('college-id-top').textContent   = college.email;
  const av = document.getElementById('topbar-avatar');
  if (av) av.textContent = initials(college.name || 'AD');
}

// ════════════════════════════════════════════════════════════
//  DATA
// ════════════════════════════════════════════════════════════

async function loadInitialData() {
  showLoading(true);
  await Promise.all([loadCourses(), loadStudents(), loadTodayAttendance()]);
  showLoading(false);
}
async function loadCourses() {
  const res = await api('/courses.php');
  if (res.success) COURSES = res.data;
}
async function loadStudents() {
  const res = await api('/students.php');
  if (res.success) students = res.data;
}
async function loadTodayAttendance() {
  const res = await api('/attendance.php?action=today');
  if (res.success) {
    attendance[todayStr] = {};
    Object.entries(res.data.records).forEach(([sid, rec]) => {
      attendance[todayStr][sid] = rec;
    });
  }
}

// ════════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════════

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function goPage(page) {
  currentPage = page;
  if (page !== 'courses') selCourse = null;
  stopCamera();
  closeSidebar();
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  const titles = {
    dashboard:'Dashboard', courses:'Courses',
    attendance:'Mark Attendance', reports:'Reports', profile:'College Profile',
  };
  document.getElementById('page-title').textContent      = titles[page] || page;
  document.getElementById('page-breadcrumb').textContent = fmtDate(todayStr);
  render();
}

function render() {
  const el = document.getElementById('main-content');
  if      (currentPage === 'dashboard')  el.innerHTML = renderDashboard();
  else if (currentPage === 'courses')    el.innerHTML = selCourse ? renderCourseStudents() : renderCourses();
  else if (currentPage === 'attendance') el.innerHTML = renderAttendance();
  else if (currentPage === 'reports')    el.innerHTML = renderReports();
  else if (currentPage === 'profile')    el.innerHTML = renderProfile();
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════

function renderDashboard() {
  const { total, present, absent, late } = getStats();
  const ta     = todayAtt();
  const attPct = total ? Math.round((present / total) * 100) : 0;
  const markedCount = present + absent + late;

  const statCards = `
  <div class="grid-stats">
    <div class="stat-card" style="border-color:rgba(29,78,216,0.2);cursor:pointer" onclick="showStatModal('total')">
      <div class="stat-icon-wrap" style="background:var(--blue-lt)">👨‍🎓</div>
      <div class="stat-value" style="color:var(--blue)">${total}</div>
      <div class="stat-label">Total Students</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">Click to view all →</div>
    </div>
    <div class="stat-card" style="border-color:rgba(45,106,79,0.2);cursor:pointer" onclick="showStatModal('present')">
      <div class="stat-icon-wrap" style="background:var(--green-lt)">✅</div>
      <div class="stat-value" style="color:var(--green)">${present}</div>
      <div class="stat-label">Present Today</div>
      <div class="stat-change" style="color:var(--green)">${attPct}% attendance rate</div>
    </div>
    <div class="stat-card" style="border-color:rgba(185,28,28,0.15);cursor:pointer" onclick="showStatModal('absent')">
      <div class="stat-icon-wrap" style="background:var(--red-lt)">❌</div>
      <div class="stat-value" style="color:var(--red)">${absent}</div>
      <div class="stat-label">Absent Today</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">Click to view →</div>
    </div>
    <div class="stat-card" style="border-color:rgba(180,83,9,0.2);cursor:pointer" onclick="showStatModal('late')">
      <div class="stat-icon-wrap" style="background:var(--amber-lt)">⏰</div>
      <div class="stat-value" style="color:var(--amber)">${late}</div>
      <div class="stat-label">Late Today</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">Click to view →</div>
    </div>
  </div>`;

  // Progress bar across top of panel
  const pctBar = total ? `
  <div style="margin-bottom:18px">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text3);margin-bottom:6px">
      <span>${markedCount} of ${total} students marked today</span>
      <span>${attPct}% present</span>
    </div>
    <div class="progress-track-lg">
      <div class="progress-fill-lg" style="width:${attPct}%;background:var(--green)"></div>
    </div>
  </div>` : '';

  // Course overview
  let courseRows = '';
  COURSES.forEach(c => {
    const cnt   = studentsIn(c.id).length;
    const pPct  = total ? Math.round((cnt / total) * 100) : 0;
    const pres  = studentsIn(c.id).filter(s => ta[s.id]?.status === 'present').length;
    courseRows += `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;cursor:pointer;padding:8px;
                border-radius:8px;transition:background .2s" 
         onmouseover="this.style.background='var(--bg2)'" 
         onmouseout="this.style.background=''"
         onclick="goPage('courses');selCourse=${c.id};render()">
      <div style="width:12px;height:12px;border-radius:4px;background:${c.color};flex-shrink:0"></div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
          <span style="font-weight:600">${c.label}</span>
          <span style="color:var(--text3)">${cnt} students · <span style="color:var(--green)">${pres} present</span></span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pPct}%;background:${c.color}"></div>
        </div>
      </div>
    </div>`;
  });

  // Recent activity
  const courseOptions = `<option value="all">All Courses</option>` +
    COURSES.map(c => `<option value="${c.id}" ${dashActivityCourse==c.id?'selected':''}>${c.label}</option>`).join('');
  const actStudents = dashActivityCourse === 'all'
    ? students : students.filter(s => s.course_id == dashActivityCourse);

  let recentRows = '';
  actStudents.slice(0, 10).forEach(s => {
    const rec = ta[s.id];
    recentRows += `
    <div class="stat-detail-row">
      ${avatarHtml(s.name, 36)}
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${s.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px">
          ${s.course_label || courseName(s.course_id)}${rec ? ' · ' + rec.time : ''}
        </div>
      </div>
      ${rec ? badgeHtml(rec.status) : '<span style="font-size:11px;color:var(--text3)">Not marked</span>'}
    </div>`;
  });

  return `${statCards}
  ${pctBar}
  <div class="grid-panels">
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Course Overview</div>
        <span class="panel-meta">${COURSES.length} courses active</span>
      </div>
      ${courseRows || `<div style="color:var(--text3);font-size:13px;text-align:center;padding:20px">
        No courses yet. <button class="btn-link" onclick="goPage('courses')">Add one →</button></div>`}
    </div>
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Today's Activity</div>
        <select class="course-filter-select" onchange="dashActivityCourse=this.value;render()">
          ${courseOptions}
        </select>
      </div>
      ${recentRows || `<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px">
        No students found.</div>`}
    </div>
  </div>`;
}

function showStatModal(type) {
  const ta = todayAtt();
  const labels = { total:'All Students', present:'Present Today', absent:'Absent Today', late:'Late Today' };
  let filtered;
  if      (type === 'total')   filtered = students;
  else if (type === 'present') filtered = students.filter(s => ta[s.id]?.status === 'present');
  else if (type === 'absent')  filtered = students.filter(s => ta[s.id]?.status === 'absent');
  else if (type === 'late')    filtered = students.filter(s => ta[s.id]?.status === 'late');

  let rows = '';
  if (!filtered.length) {
    rows = `<div style="text-align:center;padding:36px;color:var(--text3);font-size:14px">No students in this category.</div>`;
  } else {
    filtered.forEach(s => {
      const rec = ta[s.id];
      rows += `
      <div class="stat-detail-row">
        ${avatarHtml(s.name, 40)}
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600">${s.name}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">
            ${s.roll} · ${s.course_label || courseName(s.course_id)}
          </div>
        </div>
        <div style="text-align:right">
          ${rec ? badgeHtml(rec.status) + `<div style="font-size:11px;color:var(--text3);margin-top:3px">${rec.time}</div>`
                : '<span style="font-size:12px;color:var(--text3)">No record</span>'}
        </div>
      </div>`;
    });
  }
  openModal(`${labels[type]} (${filtered.length})`, `
    <div style="font-size:12px;color:var(--text3);margin-bottom:18px;font-weight:500">
      📅 ${fmtDate(todayStr)}
    </div>${rows}`);
}

// ════════════════════════════════════════════════════════════
//  COURSES
// ════════════════════════════════════════════════════════════

const COURSE_EMOJIS = { 'B.Sc':'🔬', 'B.Com':'💼', 'BCA':'💻', 'B.A':'📖', 'BBA':'📊' };
function getCourseEmoji(label) { return COURSE_EMOJIS[label] || '📚'; }

function renderCourses() {
  let cards = '';
  COURSES.forEach(c => {
    const cnt = studentsIn(c.id).length;
    const tp  = studentsIn(c.id).filter(s => todayAtt()[s.id]?.status === 'present').length;
    cards += `
    <div class="course-card" style="--c-color:${c.color}" onclick="selCourse=${c.id};render()">
      <div class="course-card-icon" style="background:${c.color}18">${getCourseEmoji(c.label)}</div>
      <div class="course-card-name" style="color:${c.color}">${c.label}</div>
      <div class="course-card-meta">${cnt} student${cnt!==1?'s':''} enrolled</div>
      <span class="course-card-badge" style="background:${c.color}12;color:${c.color};border:1px solid ${c.color}25">
        ✓ ${tp} present today
      </span>
      <div class="course-card-actions" onclick="event.stopPropagation()">
        <button class="cc-edit-btn" onclick="editCourseModal(${c.id})">✏ Edit</button>
        <button class="cc-edit-btn" style="color:var(--red)" onclick="deleteCourse(${c.id})">🗑 Delete</button>
      </div>
    </div>`;
  });
  if (!COURSES.length) {
    cards = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text3)">
      No courses yet.<br><br>
      <button class="btn-add" onclick="addCourseModal()">+ Add First Course</button>
    </div>`;
  }
  return `
  <div class="page-header">
    <div>
      <div class="page-heading">Courses</div>
      <div class="page-sub">${COURSES.length} active course${COURSES.length!==1?'s':''}</div>
    </div>
    <button class="btn-add" onclick="addCourseModal()">+ Add Course</button>
  </div>
  <div class="grid-courses">${cards}</div>`;
}

function renderCourseStudents() {
  const c    = COURSES.find(x => x.id == selCourse);
  const list = studentsIn(selCourse);
  let rows = '';
  list.forEach(s => {
    rows += `
    <div class="student-row">
      ${avatarHtml(s.name, 44)}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:15px">${s.name}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:3px">
          Roll: <strong>${s.roll}</strong> · ${s.phone || '—'}
        </div>
        <div style="font-size:11px;color:var(--gold);margin-top:3px;font-family:monospace">${s.qr_code}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn-sm btn-edit"   onclick="editStudent(${s.id})">✏ Edit</button>
        <button class="btn-sm btn-view"   onclick="viewStudent(${s.id})">👁 View</button>
        <button class="btn-sm btn-delete" onclick="deleteStudent(${s.id})">🗑</button>
      </div>
    </div>`;
  });
  if (!list.length) {
    rows = `<div style="text-align:center;padding:60px;color:var(--text3)">
      No students enrolled yet.<br><br>
      <button class="btn-add" onclick="addStudentModal()">+ Add First Student</button></div>`;
  }
  return `
  <div class="page-header">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <button class="btn-back" onclick="selCourse=null;render()">← Courses</button>
      <div>
        <div class="page-heading" style="color:${c?.color||'var(--text1)'}">
          ${getCourseEmoji(c?.label)} ${c?.label||''} — Students
        </div>
        <div class="page-sub">${list.length} enrolled</div>
      </div>
    </div>
    <button class="btn-add" onclick="addStudentModal()">+ Add Student</button>
  </div>
  <div class="panel">${rows}</div>`;
}

// ════════════════════════════════════════════════════════════
//  ATTENDANCE
// ════════════════════════════════════════════════════════════

function renderAttendance() {
  const ta = todayAtt();
  const { present, absent, late } = getStats();
  const displayed = selCourse ? studentsIn(selCourse) : students;

  const modeTabs = `
    <button class="tgl-btn ${aMode==='manual'?'active':''}" onclick="aMode='manual';render()">📝 Manual</button>
    <button class="tgl-btn ${aMode==='qr'?'active':''}"     onclick="aMode='qr';render()">📱 QR Scan</button>`;

  let courseFilters = `<button class="tgl-btn ${!selCourse?'active':''}" onclick="selCourse=null;render()">All</button>`;
  COURSES.forEach(c => {
    courseFilters += `<button class="tgl-btn ${selCourse==c.id?'active':''}"
      onclick="selCourse=${c.id};render()">${c.label}</button>`;
  });

  let qrPanel = '';
  if (aMode === 'qr') {
    qrPanel = `
    <div class="panel" style="margin-bottom:20px">
      <div class="panel-header">
        <div class="panel-title">QR Code Attendance</div>
        <span class="panel-meta">Scan or type the student's QR code</span>
      </div>
      <div class="qr-tabs">
        <button class="qr-tab ${activeQrTab==='type'?'active':''}"   onclick="switchQrTab('type')">⌨ Enter QR ID</button>
        <button class="qr-tab ${activeQrTab==='camera'?'active':''}" onclick="switchQrTab('camera')">📷 Camera Scan</button>
        <button class="qr-tab ${activeQrTab==='upload'?'active':''}" onclick="switchQrTab('upload')">📤 Upload Image</button>
      </div>
      <div class="qr-panel-content ${activeQrTab==='type'?'active':''}">
        <div style="display:flex;gap:10px">
          <input id="qr-input" class="form-input" style="flex:1"
                 placeholder="Type or paste QR code (e.g. QR-S1-ABCD1234)…"
                 onkeydown="if(event.key==='Enter')doQR()"/>
          <button class="btn-add" onclick="doQR()">Mark Present</button>
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--text3)">
          Press Enter or click Mark Present. Duplicate entries for the same date are automatically blocked.
        </div>
      </div>
      <div class="qr-panel-content ${activeQrTab==='camera'?'active':''}">
        <div class="camera-box" id="camera-box">
          <video id="qr-video" autoplay playsinline></video>
          <div class="camera-placeholder" id="camera-placeholder">
            <div style="font-size:42px;margin-bottom:12px">📷</div>
            <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Point the camera at a student QR code</div>
            <button class="btn-add" onclick="startCamera()">Start Camera</button>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-sm" onclick="startCamera()">🔄 Restart</button>
          <button class="btn-sm btn-delete" onclick="stopCamera();render()">⏹ Stop</button>
        </div>
      </div>
      <div class="qr-panel-content ${activeQrTab==='upload'?'active':''}">
        <div class="upload-zone" onclick="document.getElementById('qr-file-inp').click()">
          <div style="font-size:38px;margin-bottom:10px">📁</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:4px">Click to Upload QR Image</div>
          <div style="font-size:12px;color:var(--text3)">or drag and drop an image here</div>
        </div>
        <input id="qr-file-inp" type="file" accept="image/*" style="display:none" onchange="handleQrUpload(event)"/>
        <div id="upload-result" style="margin-top:10px;font-size:13px;color:var(--text3)"></div>
      </div>
    </div>`;
  }

  let rows = '';
  displayed.forEach(s => {
    const rec = ta[s.id];
    const bc  = rec
      ? (rec.status==='present' ? 'rgba(45,106,79,0.3)'
       : rec.status==='late'    ? 'rgba(180,83,9,0.3)'
                                : 'rgba(185,28,28,0.25)')
      : 'var(--border)';
    let actionHtml = '';
    if (rec) {
      actionHtml = `
      <div style="display:flex;align-items:center;gap:8px">
        ${badgeHtml(rec.status)}
        <button class="att-reset" onclick="resetAtt(${s.id})">Reset</button>
      </div>`;
    } else if (aMode === 'manual') {
      actionHtml = `
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="att-btn att-present" onclick="markAtt(${s.id},'present')">✓ Present</button>
        <button class="att-btn att-late"    onclick="markAtt(${s.id},'late')">⏰ Late</button>
        <button class="att-btn att-absent"  onclick="markAtt(${s.id},'absent')">✕ Absent</button>
      </div>`;
    }
    rows += `
    <div class="att-row" style="border-color:${bc}">
      ${avatarHtml(s.name, 40)}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${s.name}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">
          ${s.roll} · ${s.course_label || courseName(s.course_id)}${rec?' · 🕐 '+rec.time:''}
        </div>
      </div>
      ${actionHtml}
    </div>`;
  });

  return `
  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
    <div style="background:var(--white);border:1.5px solid var(--border);border-radius:var(--radius-sm);
                padding:8px 16px;font-size:13px;font-weight:600;color:var(--text2);
                box-shadow:0 1px 4px var(--shadow)">
      📅 ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
    </div>
    <div class="toggle-group">${modeTabs}</div>
    <div style="margin-left:auto;display:flex;gap:16px;font-size:14px;font-weight:700;align-items:center">
      <span style="color:var(--green)">✓ ${present}</span>
      <span style="color:var(--red)">✕ ${absent}</span>
      <span style="color:var(--amber)">⏰ ${late}</span>
    </div>
  </div>
  ${qrPanel}
  <div style="margin-bottom:16px">
    <div style="font-size:11px;font-weight:600;color:var(--text3);margin-bottom:8px;
                text-transform:uppercase;letter-spacing:1px">Filter by Course</div>
    <div class="toggle-group" style="display:inline-flex;flex-wrap:wrap">${courseFilters}</div>
  </div>
  ${rows || `<div style="text-align:center;padding:40px;color:var(--text3)">No students found.</div>`}`;
}

async function markAtt(sid, status) {
  const res = await api('/attendance.php?action=mark', 'POST', { student_id:sid, status, date:todayStr });
  if (!res.success) return notify(res.message, 'error');
  if (!attendance[todayStr]) attendance[todayStr] = {};
  attendance[todayStr][sid] = { status, time: res.data.marked_time };
  notify(`Marked as ${status}`, 'success');
  render();
}

async function resetAtt(sid) {
  const res = await api('/attendance.php?action=reset', 'POST', { student_id:sid, date:todayStr });
  if (!res.success) return notify(res.message, 'error');
  if (attendance[todayStr]) delete attendance[todayStr][sid];
  notify('Attendance record removed.', 'warn');
  render();
}

function switchQrTab(tab) {
  if (tab !== 'camera') stopCamera();
  activeQrTab = tab;
  render();
}

async function doQR() {
  const val = document.getElementById('qr-input')?.value.trim() || '';
  if (!val) return notify('Please enter a QR code.', 'error');
  const res = await api('/attendance.php?action=qr', 'POST', { qr_code:val, date:todayStr });
  if (!res.success) {
    notify(res.message, res.message.includes('already') ? 'warn' : 'error');
    return;
  }
  const d = res.data;
  if (!attendance[todayStr]) attendance[todayStr] = {};
  attendance[todayStr][d.student_id] = { status:'present', time:d.marked_time };
  notify(`✓ ${d.student_name} — Marked Present`, 'success');
  const inp = document.getElementById('qr-input');
  if (inp) inp.value = '';
  render();
}

function startCamera() {
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } })
      .then(stream => {
        cameraStream = stream;
        const video = document.getElementById('qr-video');
        const ph    = document.getElementById('camera-placeholder');
        if (video) { video.srcObject = stream; video.style.display = 'block'; }
        if (ph) ph.style.display = 'none';
      })
      .catch(() => notify('Camera access denied. Allow camera permissions.', 'error'));
  } else {
    notify('Camera is not supported in this browser.', 'error');
  }
}

function stopCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  const video = document.getElementById('qr-video');
  if (video) { video.style.display = 'none'; video.srcObject = null; }
  const ph = document.getElementById('camera-placeholder');
  if (ph) ph.style.display = '';
}

function handleQrUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const rd = document.getElementById('upload-result');
  rd.innerHTML = `<div style="color:var(--text2)">📄 <strong>${file.name}</strong> — Processing…</div>`;
  setTimeout(() => {
    rd.innerHTML = `<div style="color:var(--amber)">⚠️ Integrate the <strong>jsQR</strong> library for auto-decode.
      Use the "Enter QR ID" tab to mark attendance manually for now.</div>`;
  }, 1000);
}

// ════════════════════════════════════════════════════════════
//  REPORTS
// ════════════════════════════════════════════════════════════

function renderReports() {
  const tabs = ['date','6m','1y'].map(r =>
    `<button class="tgl-btn ${reportRange===r?'active':''}" onclick="reportRange='${r}';loadReport()">
      ${r==='date'?'📅 Date Wise':r==='6m'?'📊 6 Months':'📈 1 Year'}
    </button>`).join('');
  const dateInput = reportRange === 'date'
    ? `<input type="date" id="report-date" value="${reportDate}" max="${todayStr}"
         class="form-input" style="width:auto;padding:8px 12px"
         onchange="reportDate=this.value;loadReport()"/>`
    : '';
  return `
  <div class="page-header">
    <div>
      <div class="page-heading">Attendance Reports</div>
      <div class="page-sub">Track and analyse student attendance over time</div>
    </div>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;align-items:center">
    <div class="toggle-group">${tabs}</div>
    ${dateInput}
  </div>
  <div id="report-content">
    <div style="color:var(--text3);font-size:14px;padding:24px 0">Loading report…</div>
  </div>`;
}

async function loadReport() {
  render();
  const el = document.getElementById('report-content');
  if (!el) return;
  el.innerHTML = `<div class="panel" style="text-align:center;padding:30px;color:var(--text3)">
    Loading report data…</div>`;

  let rows = '';

  if (reportRange === 'date') {
    const res = await api(`/attendance.php?action=date&date=${reportDate}`);
    if (!res.success) { el.innerHTML = `<div style="color:var(--red)">${res.message}</div>`; return; }
    students.forEach(s => {
      const rec = res.data.records.find(r => r.student_id == s.id);
      rows += `
      <div class="report-row">
        ${avatarHtml(s.name, 38)}
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${s.name}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">
            ${s.roll} · ${s.course_label || courseName(s.course_id)}
          </div>
        </div>
        ${rec
          ? badgeHtml(rec.status) + `<span style="font-size:11px;color:var(--text3);margin-left:6px">🕐 ${rec.marked_time}</span>`
          : '<span style="font-size:12px;color:var(--text3)">No record</span>'}
      </div>`;
    });
    el.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Attendance — ${fmtDate(reportDate)}</div>
        <span class="panel-meta">${students.length} students</span>
      </div>
      ${rows || `<div style="text-align:center;padding:30px;color:var(--text3)">No data for this date.</div>`}
    </div>`;
  } else {
    const res = await api(`/attendance.php?action=report&range=${reportRange}`);
    if (!res.success) { el.innerHTML = `<div style="color:var(--red)">${res.message}</div>`; return; }
    res.data.records.forEach(s => {
      const pct = s.percentage || 0;
      const col = pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
      rows += `
      <div class="pct-row">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          ${avatarHtml(s.name, 38)}
          <div style="flex:1">
            <div style="font-weight:600;font-size:14px">${s.name}</div>
            <div style="font-size:12px;color:var(--text3)">${s.roll} · ${s.course_label}</div>
          </div>
          <div style="font-size:24px;font-weight:800;color:${col};font-family:'Playfair Display',serif">${pct}%</div>
        </div>
        <div class="progress-track-lg">
          <div class="progress-fill-lg" style="width:${pct}%;background:${col}"></div>
        </div>
        <div style="font-size:12px;color:var(--text3);margin-top:7px">
          ${s.days_attended} / ${s.total_days} days attended
          &nbsp;·&nbsp;
          ${pct < 75 ? '<span style="color:var(--red)">⚠️ Below 75% — At risk</span>'
           : pct < 90 ? '<span style="color:var(--amber)">✓ Satisfactory</span>'
                      : '<span style="color:var(--green)">⭐ Excellent</span>'}
        </div>
      </div>`;
    });
    el.innerHTML = `
    <div style="margin-bottom:18px">
      <div style="font-size:13px;color:var(--text3);margin-bottom:8px">
        Last <strong>${reportRange==='6m'?'6 Months':'1 Year'}</strong>
        — Cutoff: ${res.data.cutoff}
      </div>
      <div style="display:flex;gap:20px;font-size:13px;font-weight:600;flex-wrap:wrap">
        <span style="color:var(--green)">⭐ ≥90% Excellent</span>
        <span style="color:var(--amber)">✓ 75–89% Satisfactory</span>
        <span style="color:var(--red)">⚠️ &lt;75% At Risk</span>
      </div>
    </div>
    ${rows || `<div class="panel" style="text-align:center;padding:30px;color:var(--text3)">No attendance data found.</div>`}`;
  }
}

// ════════════════════════════════════════════════════════════
//  COLLEGE PROFILE
// ════════════════════════════════════════════════════════════

function renderProfile() {
  const fields = [
    ['🏢 College Name',       college.name],
    ['📧 Email / Login ID',   college.email],
    ['📍 Location',           college.location],
    ['🎓 Board / University', college.board],
    ['📞 Phone',              college.phone],
  ];
  const rows = fields.map(([label, value]) => `
    <div class="profile-row">
      <div class="profile-label">${label}</div>
      <div class="profile-val">${value || '—'}</div>
    </div>`).join('');

  const courseTags = COURSES.map(c => `
    <span style="background:${c.color}14;color:${c.color};border:1px solid ${c.color}30;
                 border-radius:50px;padding:5px 16px;font-size:13px;font-weight:600">
      ${c.label}
    </span>`).join('');

  const stats = getStats();

  return `
  <div style="max-width:680px">
    <div class="profile-hero">
      <div class="profile-icon">🏫</div>
      <div style="flex:1;min-width:0">
        <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;line-height:1.2">
          ${college.name}
        </div>
        <div style="font-size:13px;color:var(--text3);margin-top:4px">${college.email}</div>
        <div style="display:flex;gap:16px;margin-top:10px;font-size:13px;font-weight:600;flex-wrap:wrap">
          <span style="color:var(--blue)">${stats.total} Students</span>
          <span style="color:var(--green)">${stats.present} Present Today</span>
          <span>· ${COURSES.length} Courses</span>
        </div>
      </div>
      <button class="btn-add" onclick="editCollegeModal()">✏ Edit Profile</button>
    </div>
    ${rows}
    <div class="panel" style="margin-top:14px">
      <div class="panel-header" style="margin-bottom:14px">
        <div class="panel-title">Enrolled Courses</div>
        <button class="btn-sm btn-edit" onclick="goPage('courses')">Manage Courses →</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${courseTags||'<span style="color:var(--text3);font-size:13px">No courses added yet.</span>'}</div>
    </div>
  </div>`;
}

function editCollegeModal() {
  openModal('Edit College Profile', `
    <div class="form-group">
      <label class="form-label">College Name</label>
      <input class="form-input" id="col-name" value="${college.name||''}"/>
    </div>
    <div class="form-group">
      <label class="form-label">Location</label>
      <input class="form-input" id="col-location" value="${college.location||''}"/>
    </div>
    <div class="form-group">
      <label class="form-label">Board / University</label>
      <input class="form-input" id="col-board" value="${college.board||''}"/>
    </div>
    <div class="form-group">
      <label class="form-label">Phone</label>
      <input class="form-input" id="col-phone" value="${college.phone||''}"/>
    </div>
    <button class="btn-save" onclick="saveCollege()">Save Changes</button>
  `);
}

async function saveCollege() {
  const res = await api('/college.php', 'PUT', {
    name:     document.getElementById('col-name').value,
    location: document.getElementById('col-location').value,
    board:    document.getElementById('col-board').value,
    phone:    document.getElementById('col-phone').value,
  });
  if (!res.success) return notify(res.message, 'error');
  Object.assign(college, res.data);
  document.getElementById('college-name-top').textContent = college.name;
  const av = document.getElementById('topbar-avatar');
  if (av) av.textContent = initials(college.name || 'AD');
  notify('Profile updated successfully!');
  closeModal();
  render();
}

// ════════════════════════════════════════════════════════════
//  STUDENT MODALS
// ════════════════════════════════════════════════════════════

function addStudentModal() {
  const opts = COURSES.map(c =>
    `<option value="${c.id}" ${c.id==selCourse?'selected':''}>${c.label}</option>`).join('');
  openModal('Add New Student', `
    <div class="info-box">💡 A unique QR code will be automatically generated for this student.</div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Full Name <span class="req">*</span></label>
        <input class="form-input" id="m-name" placeholder="Student full name"/>
      </div>
      <div class="form-group">
        <label class="form-label">Roll Number <span class="req">*</span></label>
        <input class="form-input" id="m-roll" placeholder="e.g. BCA001"/>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Course</label>
      <select class="form-input" id="m-course">${opts}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Phone Number</label>
        <input class="form-input" id="m-phone" placeholder="10-digit mobile"/>
      </div>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input class="form-input" type="email" id="m-email" placeholder="student@email.com"/>
      </div>
    </div>
    <button class="btn-save" onclick="saveAddStudent()">Add Student</button>
  `);
}

async function saveAddStudent() {
  const name     = document.getElementById('m-name').value.trim();
  const roll     = document.getElementById('m-roll').value.trim();
  const courseId = document.getElementById('m-course').value;
  const phone    = document.getElementById('m-phone').value.trim();
  const email    = document.getElementById('m-email').value.trim();
  if (!name || !roll) return notify('Name and roll number are required.', 'error');
  const res = await api('/students.php', 'POST', { name, roll, course_id:parseInt(courseId), phone, email });
  if (!res.success) return notify(res.message, 'error');
  students.push(res.data);
  notify('Student added successfully!');
  closeModal();
  render();
}

async function viewStudent(sid) {
  const res = await api(`/students.php?id=${sid}`);
  if (!res.success) return notify(res.message, 'error');
  const s = res.data;
  const qrRes  = await api(`/students.php?action=qr&id=${sid}`);
  const qrUrl  = qrRes.success ? qrRes.data.qr_svg  : null;
  const qrCode = qrRes.success ? qrRes.data.qr_code : s.qr_code;
  openModal('Student Details', `
    <div style="text-align:center;margin-bottom:22px">
      ${avatarHtml(s.name, 68)}
      <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;margin-top:12px">${s.name}</div>
      <div style="font-size:13px;color:var(--text3);margin-top:3px">${s.course_label}</div>
    </div>
    ${[['Roll No',s.roll],['Phone',s.phone||'—'],['Email',s.email||'—']].map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;padding:12px 0;
                  border-bottom:1px solid var(--border);font-size:14px">
        <span style="color:var(--text3);font-weight:500">${k}</span>
        <span style="font-weight:600">${v}</span>
      </div>`).join('')}
    <div style="margin-top:22px;text-align:center">
      <div style="font-size:11px;font-weight:600;color:var(--text3);margin-bottom:12px;
                  text-transform:uppercase;letter-spacing:1px">QR Code</div>
      ${qrUrl
        ? `<img src="${qrUrl}" style="width:160px;height:160px;border-radius:12px;
               border:2px solid var(--border)" alt="Student QR"/>`
        : `<div style="color:var(--text3);font-size:13px">QR image unavailable (requires internet)</div>`}
      <div style="margin-top:12px;font-family:monospace;font-size:12px;color:var(--gold);
                  background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:8px 14px;
                  display:inline-block">${qrCode}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:8px">
        Student scans this code from their ID card to mark attendance.
      </div>
    </div>
  `);
}

function editStudent(sid) {
  const s = students.find(x => x.id == sid);
  if (!s) return;
  const opts = COURSES.map(c =>
    `<option value="${c.id}" ${c.id==s.course_id?'selected':''}>${c.label}</option>`).join('');
  openModal('Edit Student', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input class="form-input" id="m-name" value="${s.name}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Roll Number</label>
        <input class="form-input" id="m-roll" value="${s.roll}"/>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Course</label>
      <select class="form-input" id="m-course">${opts}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Phone Number</label>
        <input class="form-input" id="m-phone" value="${s.phone||''}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input class="form-input" id="m-email" value="${s.email||''}"/>
      </div>
    </div>
    <button class="btn-save" onclick="saveEditStudent(${sid})">Update Student</button>
  `);
}

async function saveEditStudent(sid) {
  const res = await api(`/students.php?id=${sid}`, 'PUT', {
    name:      document.getElementById('m-name').value,
    roll:      document.getElementById('m-roll').value,
    course_id: parseInt(document.getElementById('m-course').value),
    phone:     document.getElementById('m-phone').value,
    email:     document.getElementById('m-email').value,
  });
  if (!res.success) return notify(res.message, 'error');
  await loadStudents();
  notify('Student updated successfully!');
  closeModal();
  render();
}

async function deleteStudent(sid) {
  const s = students.find(x => x.id == sid);
  if (!confirm(`Delete "${s?.name}"? This cannot be undone.`)) return;
  const res = await api(`/students.php?id=${sid}`, 'DELETE');
  if (!res.success) return notify(res.message, 'error');
  students = students.filter(x => x.id != sid);
  notify('Student deleted.');
  render();
}

// ════════════════════════════════════════════════════════════
//  COURSE MODALS
// ════════════════════════════════════════════════════════════

const COLOR_OPTIONS = ['#3b82f6','#10b981','#c9872b','#b91c1c','#7c3aed','#0891b2','#b45309','#be185d','#1a1a2e'];

function addCourseModal() {
  selectedCourseColor = COLOR_OPTIONS[0];
  openModal('Add New Course', buildCourseForm(null));
}
function editCourseModal(cid) {
  const c = COURSES.find(x => x.id == cid);
  if (!c) return;
  selectedCourseColor = c.color;
  openModal('Edit Course', buildCourseForm(c));
}

function buildCourseForm(c) {
  const swatches = COLOR_OPTIONS.map(col => `
    <div class="course-color-swatch ${selectedCourseColor===col?'sel':''}"
         style="background:${col}" onclick="pickColor('${col}',this)" title="${col}"></div>`).join('');
  return `
  <div class="form-group">
    <label class="form-label">Course Name <span class="req">*</span></label>
    <input class="form-input" id="c-label" value="${c?.label||''}" placeholder="e.g. B.Tech"/>
  </div>
  <div class="form-group">
    <label class="form-label">Course ID <span class="req">*</span>
      <span style="font-weight:400;color:var(--text3)">(lowercase, no spaces)</span>
    </label>
    <input class="form-input" id="c-key" value="${c?.course_key||''}"
           placeholder="e.g. btech" ${c?'readonly':''}/>
  </div>
  <div class="form-group">
    <label class="form-label">Colour</label>
    <div id="color-swatches" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">${swatches}</div>
  </div>
  <button class="btn-save" style="margin-top:16px"
          onclick="${c?`saveCourse(${c.id})`:'saveNewCourse()'}">
    ${c?'Update Course':'Add Course'}
  </button>`;
}

function pickColor(col, el) {
  selectedCourseColor = col;
  document.querySelectorAll('.course-color-swatch').forEach(s => s.classList.remove('sel'));
  el.classList.add('sel');
}

async function saveNewCourse() {
  const label = document.getElementById('c-label').value.trim();
  const key   = document.getElementById('c-key').value.trim().toLowerCase();
  if (!label || !key) return notify('Course name and ID are required.', 'error');
  const res = await api('/courses.php', 'POST', { label, course_key:key, color:selectedCourseColor });
  if (!res.success) return notify(res.message, 'error');
  COURSES.push(res.data);
  notify('Course added successfully!');
  closeModal();
  render();
}

async function saveCourse(cid) {
  const res = await api(`/courses.php?id=${cid}`, 'PUT', {
    label: document.getElementById('c-label').value.trim(),
    color: selectedCourseColor,
  });
  if (!res.success) return notify(res.message, 'error');
  const idx = COURSES.findIndex(c => c.id == cid);
  if (idx >= 0) Object.assign(COURSES[idx], res.data);
  notify('Course updated!');
  closeModal();
  render();
}

async function deleteCourse(cid) {
  const c = COURSES.find(x => x.id == cid);
  if (!confirm(`Delete course "${c?.label}"? Student records will not be removed.`)) return;
  const res = await api(`/courses.php?id=${cid}`, 'DELETE');
  if (!res.success) return notify(res.message, 'error');
  COURSES = COURSES.filter(x => x.id != cid);
  notify('Course deleted.');
  render();
}

// ════════════════════════════════════════════════════════════
//  SESSION CHECK ON LOAD
// ════════════════════════════════════════════════════════════

async function checkSession() {
  const res = await api('/auth.php?action=me');
  if (res.success) {
    college = res.data;
    showApp();
    await loadInitialData();
    goPage('dashboard');
  }
}

// Set breadcrumb date
document.getElementById('page-breadcrumb').textContent = fmtDate(todayStr);

// Check for password reset token in URL
const _resetToken = new URLSearchParams(window.location.search).get('reset_token');
if (_resetToken) {
  document.getElementById('auth-screen').style.display = 'flex';
  goScreen('reset');
} else {
  checkSession();
}
