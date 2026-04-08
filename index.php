<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Attendrollix — Admin Panel</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="style.css"/>
</head>
<body>

<!-- Toast -->
<div id="notif"></div>
<!-- Mobile overlay -->
<div id="overlay" onclick="closeSidebar()"></div>

<!-- ══════════════════════════════════════
     AUTH SCREEN
══════════════════════════════════════ -->
<div id="auth-screen">
  <div class="auth-bg-shape auth-bg-shape1"></div>
  <div class="auth-bg-shape auth-bg-shape2"></div>

  <div class="auth-card">
    <div class="auth-brand">
      <a href="home.html"><img src="assets\logo.png" alt="Attendrollix" class="auth-logo" style="cursor:pointer"/></a><div style="text-align:center;margin-top:6px"><a href="home.html" style="font-size:12px;color:#9a9080;text-decoration:none">← Back to Website</a></div>
    </div>

    <div class="auth-heading" id="auth-heading">Welcome Back</div>
    <div class="auth-sub"     id="auth-sub">Sign in to your admin panel</div>
    <div class="auth-alert"   id="auth-alert" style="display:none"></div>

    <!-- LOGIN -->
    <div id="scr-login">
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input class="form-input" id="login-id" type="email" placeholder="admin@college.com"
               onkeydown="if(event.key==='Enter')document.getElementById('login-pw').focus()"/>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <div class="pw-wrap">
          <input class="form-input" id="login-pw" type="password" placeholder="Enter your password"
                 onkeydown="if(event.key==='Enter')doLogin()"/>
        </div>
      </div>
      <button class="btn-primary" onclick="doLogin()">Sign In →</button>
      <div class="auth-links">
        <button class="btn-link" onclick="goScreen('forgot')">Forgot Password?</button>
        <button class="btn-link" onclick="goScreen('register')">New institution? Register →</button>
      </div>
    </div>

    <!-- REGISTER -->
    <div id="scr-register" style="display:none">
      <div class="info-box">💡 Your <strong>email address</strong> will be your login ID going forward.</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">College Name <span class="req">*</span></label>
          <input class="form-input" id="reg-name" placeholder="e.g. TMV College"/>
        </div>
        <div class="form-group">
          <label class="form-label">Location</label>
          <input class="form-input" id="reg-loc" placeholder="e.g. Pune, Maharashtra"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Board / University</label>
          <input class="form-input" id="reg-board" placeholder="e.g. SPPU"/>
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" id="reg-phone" placeholder="College phone number"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Email Address <span class="req">*</span></label>
        <input class="form-input" id="reg-email" type="email" placeholder="admin@college.com"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Password <span class="req">*</span></label>
          <input class="form-input" id="reg-pw1" type="password" placeholder="Min. 6 characters"/>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm Password <span class="req">*</span></label>
          <input class="form-input" id="reg-pw2" type="password" placeholder="Repeat password"/>
        </div>
      </div>
      <button class="btn-primary" onclick="doRegister()">Create Account →</button>
      <div style="text-align:center;margin-top:14px">
        <button class="btn-link" onclick="goScreen('login')">← Back to Login</button>
      </div>
    </div>

    <!-- REGISTER SUCCESS -->
    <div id="scr-reg-success" style="display:none;text-align:center">
      <div class="success-icon">🎉</div>
      <div class="success-title">Registration Successful!</div>
      <div class="success-sub">Your institution has been registered. Use your email and password to sign in.</div>
      <div class="success-id-box">
        <div class="sid-label">Registered Email</div>
        <div class="sid-val" id="show-gen-email"></div>
      </div>
      <button class="btn-primary" onclick="goScreen('login')" style="margin-top:20px">Go to Login →</button>
    </div>

    <!-- FORGOT -->
    <div id="scr-forgot" style="display:none">
      <div class="info-box">📧 Enter your registered email. A password reset link will be sent to your inbox.</div>
      <div class="form-group">
        <label class="form-label">Registered Email</label>
        <input class="form-input" id="forgot-email" type="email" placeholder="admin@college.com"
               onkeydown="if(event.key==='Enter')doForgot()"/>
      </div>
      <button class="btn-primary" id="forgot-btn" onclick="doForgot()">Send Reset Link</button>
      <div style="text-align:center;margin-top:14px">
        <button class="btn-link" onclick="goScreen('login')">← Back to Login</button>
      </div>
    </div>

    <!-- RESET -->
    <div id="scr-reset" style="display:none">
      <div class="info-box">🔐 Enter your new password below.</div>
      <div class="form-group">
        <label class="form-label">New Password <span class="req">*</span></label>
        <input class="form-input" id="reset-pw1" type="password" placeholder="At least 6 characters"/>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password <span class="req">*</span></label>
        <input class="form-input" id="reset-pw2" type="password" placeholder="Repeat new password"
               onkeydown="if(event.key==='Enter')doReset()"/>
      </div>
      <button class="btn-primary" id="reset-btn" onclick="doReset()">Set New Password</button>
      <div style="text-align:center;margin-top:14px">
        <button class="btn-link" onclick="goScreen('login')">← Back to Login</button>
      </div>
    </div>
  </div>
</div>


<!-- ══════════════════════════════════════
     MAIN APPLICATION
══════════════════════════════════════ -->
<div id="app" style="display:none">

  <!-- SIDEBAR -->
  <aside id="sidebar">
    <div class="sidebar-brand">
      <img src="assets\logo.png" alt="Attendrollix" />
      <div class="sidebar-brand-sub">Admin Panel</div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">Main</div>
      <button class="nav-item active" data-page="dashboard" onclick="goPage('dashboard')">
        <span class="nav-icon">📊</span> Dashboard
      </button>
      <button class="nav-item" data-page="courses" onclick="goPage('courses')">
        <span class="nav-icon">📚</span> Courses
      </button>
      <button class="nav-item" data-page="attendance" onclick="goPage('attendance')">
        <span class="nav-icon">✅</span> Mark Attendance
      </button>

      <div class="nav-section-label">Analytics</div>
      <button class="nav-item" data-page="reports" onclick="goPage('reports')">
        <span class="nav-icon">📈</span> Reports
      </button>

      <div class="nav-section-label">Settings</div>
      <button class="nav-item" data-page="profile" onclick="goPage('profile')">
        <span class="nav-icon">🏫</span> College Profile
      </button>
    </nav>

    <div class="sidebar-footer">
      <a href="home.html" class="logout-btn" style="text-decoration:none;margin-bottom:8px;display:flex;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)">
        <span>🌐</span> View Website
      </a>
      <button class="logout-btn" onclick="logout()">
        <span>🚪</span> Sign Out
      </button>
    </div>
  </aside>

  <!-- MAIN CONTENT AREA -->
  <div id="main-wrap">
    <!-- TOPBAR -->
    <header id="topbar">
      <div class="topbar-left">
        <button id="menu-btn" onclick="toggleSidebar()">☰</button>
        <div class="topbar-title-wrap">
          <div id="page-title">Dashboard</div>
          <div id="page-breadcrumb" class="topbar-breadcrumb"></div>
        </div>
      </div>
      <div class="topbar-right"><a href="home.html" style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:50px;border:1.5px solid #e8e3da;background:#fff;color:#5a5147;font-size:13px;font-weight:500;text-decoration:none;transition:all .2s;box-shadow:0 2px 8px rgba(26,26,46,0.07)" onmouseover="this.style.borderColor='#c9872b';this.style.color='#c9872b'" onmouseout="this.style.borderColor='#e8e3da';this.style.color='#5a5147'">🏠 Website</a>
        <div class="college-chip">
          <div class="college-chip-avatar" id="topbar-avatar">AD</div>
          <div class="college-chip-info">
            <strong id="college-name-top"></strong>
            <span id="college-id-top"></span>
          </div>
        </div>
      </div>
    </header>

    <div id="main-content">
      <div class="loading-screen">Loading your dashboard…</div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════
     MODAL
══════════════════════════════════════ -->
<div id="modal-overlay">
  <div class="modal-box">
    <div class="modal-header">
      <div class="modal-title" id="modal-title">Dialog</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<script src="app.js"></script>
</body>
</html>
