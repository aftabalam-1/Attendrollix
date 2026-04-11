# ![Attendrollix](Add_a_subheading.png)

# Attendrollix — Professional QR-Based Attendance Management System

> A complete, secure, and production-ready web application for managing student attendance in educational institutions — powered by PHP, MySQL, and a modern Design 2 (Light Elegant) frontend.

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Live Flow](#-live-flow)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Setup & Installation](#-setup--installation)
- [Demo Credentials](#-demo-credentials)
- [QR Code Flow](#-qr-code-flow)
- [Authentication Flow](#-authentication-flow)
- [Screenshots](#-screenshots)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)

---

## 🎯 About the Project

**Attendrollix** is a full-stack college attendance management system built for real-world deployment in Indian educational institutions. It eliminates paper registers and manual roll calls by providing:

- 🔐 **Secure multi-college authentication** with bcrypt passwords and PHP sessions
- 📱 **QR code-based attendance** — each student gets a unique, auto-generated QR code
- 📊 **Real-time dashboard** showing present, absent, and late counts
- 📈 **Attendance reports** — date-wise, 6-month, and 1-year percentage analysis
- 🏫 **Complete data isolation** — every college's data is 100% separated
- ⚡ **Zero-duplicate guarantee** — database-level unique key blocks double marking

The entire system runs locally on **XAMPP or Laragon** — no cloud, no subscription, no cost.

---

## 🔗 Live Flow

```
home.html  ──────────────────────────────────────────────────────────►
│                                                                      │
│  [Login / Register]          [? Guide Modal]         [Scroll →]     │
│         │                                                            │
▼         ▼                                                            ▼
index.html (Auth Screen)                                    Landing Page
│
│  ┌──────────────────────────────────────┐
│  │  Register → Login → Dashboard Panel  │
│  └──────────────────────────────────────┘
│         │
│   ┌─────▼──────────────────────────────────────────┐
│   │              ADMIN PANEL                        │
│   │                                                 │
│   │  📊 Dashboard    →  Live stats + activity       │
│   │  📚 Courses      →  Add / Edit / Delete         │
│   │  ✅ Attendance   →  Manual + QR scan mode       │
│   │  📈 Reports      →  Date / 6m / 1 year          │
│   │  🏫 Profile      →  College info editor         │
│   │                                                 │
│   │  [🌐 Website]  [🚪 Sign Out → home.html]        │
│   └─────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
attendrollix/
│
├── home.html                 ← 🌐 Landing / Portfolio Page (Design 2)
├── index.html                ← 🔐 App Entry: Auth screens + Admin Panel
├── style.css                 ← 🎨 Complete CSS — Design 2 Light Elegant theme
├── app.js                    ← ⚙️  Full frontend JavaScript (SPA logic)
├── Add_a_subheading.png      ← Logo image
│
├── database.sql              ← 🗄️  Run FIRST — creates DB + tables + demo data
├── setup.php                 ← Run ONCE — sets admin password hash, then DELETE
│
├── includes/
│   └── db.php                ← PDO singleton, response helpers, auth guard, mailer
│
└── api/
    ├── auth.php              ← Register · Login · Logout · Forgot · Reset · Me
    ├── courses.php           ← Course CRUD (list · add · edit · delete)
    ├── students.php          ← Student CRUD + auto QR code generation
    ├── attendance.php        ← Mark · QR · Reset · Today · Date · Report · Stats
    └── college.php           ← Get and update college profile
```

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) | — |
| **Fonts** | Playfair Display, Outfit (Google Fonts) | — |
| **Backend** | PHP | 8.0+ |
| **Database** | MySQL / MariaDB | 8.0 / 10.x |
| **Web Server** | Apache (via XAMPP / Laragon) | 2.4+ |
| **DB Interface** | phpMyAdmin | Bundled |
| **Auth** | PHP Sessions + bcrypt (`PASSWORD_BCRYPT`) | — |
| **DB Access** | PDO with Prepared Statements | — |
| **QR Images** | api.qrserver.com (external, SVG) | — |
| **Email** | PHP `mail()` function | — |

---

## ✨ Features

### 🔐 Authentication
- College registration with name, email, password, location, board, phone
- Secure login with bcrypt password verification
- PHP session-based authentication with `credentials: 'include'` on all API calls
- Email notification sent on every successful login
- Forgot password → secure token → reset link emailed (1-hour expiry)
- Auto-login on page refresh if session is still active

### 📊 Dashboard
- Real-time present / absent / late counts for today
- Attendance percentage bar across all students
- Course-wise overview with progress bars
- Today's activity feed with course filter
- Clickable stat cards → modal with full student list

### 📚 Course Management
- Add, edit, delete courses with custom names and colour codes
- 5 default courses auto-created on registration: B.Sc, B.Com, BCA, B.A, BBA
- Course key (unique lowercase ID) per college
- Emoji icons per course type for visual identification

### 👨‍🎓 Student Management
- Add students with name, roll number, course, phone, email
- Auto-generated unique QR code on student creation (`QR-S{id}-XXXXXXXX`)
- View student details + QR code image (from qrserver.com)
- Edit and delete students (cascade deletes attendance records)
- Duplicate roll number prevention per college

### ✅ Attendance Marking
- **Manual mode** — click Present / Absent / Late per student
- **QR Scan mode** — type or paste QR code string → instant mark
- **Camera scan** — open device camera to scan QR code (requires browser permission)
- **Upload image** — upload QR image (requires jsQR library for auto-decode)
- Time auto-recorded for every attendance entry
- Reset individual attendance records for any date
- Course-level filter on the attendance page
- Duplicate entries blocked at database level (`UNIQUE KEY` on `student_id + att_date`)

### 📈 Reports
- **Date-wise** — view every student's status for any past date
- **6-month** — attendance percentage per student over last 180 days
- **1-year** — attendance percentage over last 365 days
- Colour-coded progress bars: 🟢 ≥75% · 🟡 50–74% · 🔴 <75% (at risk)
- Days attended / total days shown alongside percentage

### 🏫 College Profile
- View and update college name, location, board, phone
- Course tags shown with their colour codes
- Quick link to Courses management

---

## 🗄 Database Schema

### Tables Overview

```sql
colleges          -- One record per institution
  └── courses     -- Courses belonging to a college (CASCADE)
      └── students    -- Students enrolled in a course (CASCADE)
          └── attendance  -- One record per student per date (CASCADE)
colleges
  └── password_resets  -- Active reset token per college (CASCADE)
```

### Key Constraints

| Table | Unique Key | Purpose |
|---|---|---|
| `colleges` | `email` | Login ID must be unique |
| `courses` | `(college_id, course_key)` | No duplicate course IDs per college |
| `students` | `qr_code` | Every QR code globally unique |
| `attendance` | `(student_id, att_date)` | One record per student per day |
| `password_resets` | `college_id` (PK) | One active token per college |

### Attendance Status ENUM

```sql
status ENUM('present', 'absent', 'late')
```

---

## 📡 API Reference

All endpoints require an active PHP session (set by login) **except** `auth.php`.  
All responses follow: `{ success: bool, message: string, data: object|array|null }`

### Auth — `/api/auth.php`

| Method | Action | Description |
|---|---|---|
| `POST` | `?action=register` | Register a new college |
| `POST` | `?action=login` | Login, creates PHP session |
| `POST` | `?action=logout` | Destroy session |
| `GET` | `?action=me` | Return current session info |
| `POST` | `?action=forgot` | Send password reset email |
| `POST` | `?action=reset` | Reset password using token |

### Courses — `/api/courses.php`

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/courses.php` | List all courses (with student count) |
| `POST` | `/api/courses.php` | Add a new course |
| `PUT` | `/api/courses.php?id=X` | Edit course name / colour |
| `DELETE` | `/api/courses.php?id=X` | Delete a course |

### Students — `/api/students.php`

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/students.php` | List all students (optional `?course_id=X`) |
| `GET` | `/api/students.php?id=X` | Get a single student |
| `GET` | `/api/students.php?action=qr&id=X` | Get QR code image URL |
| `POST` | `/api/students.php` | Add student (QR auto-generated) |
| `PUT` | `/api/students.php?id=X` | Edit student details |
| `DELETE` | `/api/students.php?id=X` | Delete student + all attendance |

### Attendance — `/api/attendance.php`

| Method | Action | Description |
|---|---|---|
| `POST` | `?action=mark` | Mark one student manually |
| `POST` | `?action=qr` | Mark via QR code string |
| `POST` | `?action=reset` | Remove a student's attendance record |
| `GET` | `?action=today` | Today's attendance map `{student_id: {status, time}}` |
| `GET` | `?action=date&date=YYYY-MM-DD` | Attendance for a specific date |
| `GET` | `?action=report&range=6m\|1y` | Percentage report |
| `GET` | `?action=stats` | Dashboard summary stats |

### College — `/api/college.php`

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/college.php` | Get college profile |
| `PUT` | `/api/college.php` | Update college profile |

---

## 🚀 Setup & Installation

### Prerequisites

- [XAMPP](https://www.apachefriends.org/) (recommended) **or** [Laragon](https://laragon.org/)
- PHP 8.0 or higher
- MySQL 8.0 / MariaDB 10.x
- Any modern browser (Chrome 90+, Firefox 88+, Edge 90+)

---

### Step 1 — Place the Project Folder

| Server | Path |
|---|---|
| **XAMPP** (Windows) | `C:\xampp\htdocs\attendrollix\` |
| **XAMPP** (Linux/Mac) | `/opt/lampp/htdocs/attendrollix/` |
| **Laragon** | `C:\laragon\www\attendrollix\` |

Make sure the folder name is exactly `attendrollix` (all lowercase).

---

### Step 2 — Start Services

Open **XAMPP Control Panel** and start:
- ✅ **Apache**
- ✅ **MySQL**

---

### Step 3 — Create the Database

1. Open **phpMyAdmin** → `http://localhost/phpmyadmin`
2. Click the **SQL** tab at the top
3. Paste the entire contents of `database.sql`
4. Click **Go**

The script will:
- Create the `attendrollix` database
- Create all 5 tables with proper constraints
- Insert the demo college (TMV College)
- Insert 5 default courses (B.Sc, B.Com, BCA, B.A, BBA)
- Insert 95 BCA students as demo data
- Generate QR codes for all demo students

> ✅ Safe to run multiple times — it drops and recreates cleanly.

---

### Step 4 — Set the Admin Password

Visit in your browser:
```
http://localhost/attendrollix/setup.php
```

You will see: **"✅ Password updated successfully!"**

> ⚠️ **IMPORTANT:** Delete `setup.php` from the server immediately after this step!

---

### Step 5 — Open the Application

**Landing Page (Website):**
```
http://localhost/attendrollix/home.html
```

**App / Admin Panel:**
```
http://localhost/attendrollix/index.html
```

---

## 🔑 Demo Credentials

| Field | Value |
|---|---|
| **Email** | `admin@tmv.edu` |
| **Password** | `tmv@123` |
| **College** | TMV College, Pune |

---

## 📱 QR Code Flow

```
1. Admin adds student via UI
       │
       ▼
2. PHP inserts temporary record → gets new student ID
       │
       ▼
3. Server generates unique code:
   format = "QR-S" + student_id + "-" + UPPERCASE(hex(random_bytes(4)))
   example = "QR-S42-3FA81C2D"
       │
       ▼
4. Code saved to students.qr_code column (UNIQUE constraint enforced)
       │
       ▼
5. Admin views student → QR image loaded from:
   https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=QR-S42-3FA81C2D
       │
       ▼
6. Student carries printed QR on ID card
       │
       ▼
7. Admin scans / types code → API marks student Present with timestamp
```

> **Note:** QR image loading requires an active internet connection (uses qrserver.com).  
> The QR code text itself is always stored locally in MySQL.

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Login Request                         │
│  email + password  ──►  password_verify(bcrypt)         │
│                              │                          │
│              ┌───────────────┴────────────┐             │
│           Match                        No Match         │
│              │                             │            │
│    Create PHP Session              Return 401 Error     │
│    $_SESSION['college_id']                              │
│    $_SESSION['college_email']                           │
│    $_SESSION['college_name']                            │
│              │                                          │
│    Send login notification email                        │
│              │                                          │
│    Frontend stores college data                         │
│    All subsequent API calls include session cookie      │
│    credentials: 'include' in every fetch()              │
└─────────────────────────────────────────────────────────┘

Password Reset Flow:
  Forgot → token = bin2hex(random_bytes(32))
         → stored in password_resets table (expires +1 hour)
         → emailed as: index.html?reset_token=<token>
         → User clicks link → enters new password
         → PHP verifies token + expiry → updates hash → deletes token
```

---

## 🖼 Screenshots

| Screen | Description |
|---|---|
| `home.html` | Landing page with hero section, features grid, QR demo panel, course tags, footer |
| Login | Clean auth card with email/password, Forgot Password, Register links |
| Register | Multi-field college registration with 2-column layout |
| Dashboard | 4 stat cards + course overview + today's activity feed |
| Courses | Coloured course cards with student count and present count |
| Students | Student list per course with QR code and action buttons |
| Attendance | Manual buttons (Present/Absent/Late) + QR scan + camera + upload tabs |
| Reports | Date picker + 6m/1y tabs + colour-coded progress bars per student |
| Profile | College info display with inline edit modal |
| Modals | Student details with QR image, Add/Edit forms, stat detail lists |

---

## ⚙️ Configuration

### Database Credentials — `includes/db.php`

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');          // XAMPP default = '' (empty)
                                 // Laragon default = 'root'
define('DB_NAME', 'attendrollix');
```

### API Base URL — `app.js`

```javascript
const API_BASE = '/attendrollix/api';
```

If you rename the project folder, update this constant accordingly.

### LAN / Network Access

To access from other devices on the same network:

1. Find your computer's local IP (e.g. `192.168.1.5`)
2. Open `app.js` and change:
   ```javascript
   const API_BASE = 'http://192.168.1.5/attendrollix/api';
   ```
3. Other devices on LAN access: `http://192.168.1.5/attendrollix/home.html`

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| **"Database connection failed"** | Check `DB_PASS` in `includes/db.php` — Laragon uses `'root'`, XAMPP uses `''` |
| **"Not authenticated" on all API calls** | Ensure Apache is running and you are visiting via `localhost`, not `file://` |
| **QR image not showing** | QR images require internet (loads from qrserver.com). QR text is always in DB. |
| **Emails not sending** | PHP `mail()` requires SMTP config. Use Mailtrap or SendGrid for local testing. |
| **"Table doesn't exist" error** | Re-run `database.sql` in phpMyAdmin SQL tab |
| **setup.php shows "College not found"** | Run `database.sql` first, then run `setup.php` |
| **Camera not working in browser** | Camera access requires HTTPS or localhost. Works on localhost by default. |
| **Blank page / JS errors** | Open browser DevTools (F12) → Console tab for error details |
| **Session expires on refresh** | This is normal if PHP session is configured for short lifetime. Check `php.ini` session settings. |
| **CORS error on API calls** | Ensure all files are served from the same Apache instance (localhost) |

---

## 🔮 Future Enhancements

- [ ] **Role-Based Access** — Faculty login (course-limited) and Student login (read-only)
- [ ] **Mobile App** — Flutter/React Native app with native QR camera scanning
- [ ] **jsQR Integration** — Auto-decode QR codes from camera feed in browser
- [ ] **Bulk Student Import** — CSV/Excel upload for mass student registration
- [ ] **SMTP Email** — Replace PHP `mail()` with PHPMailer + SendGrid/Gmail
- [ ] **Academic Year Management** — Year-wise data segmentation and archiving
- [ ] **Timetable-based Attendance** — Period/subject-wise granularity
- [ ] **Parent Portal** — Read-only parent login with WhatsApp/SMS alerts
- [ ] **Chart.js Dashboard** — Visual trend charts for attendance analytics
- [ ] **PWA Support** — Offline capability and home screen installation
- [ ] **Cloud Deployment** — Docker + Nginx configuration for VPS hosting
- [ ] **Database Backup UI** — One-click MySQL dump download from admin panel

---

## 📄 License

This project was developed as a **BCA Final Year Project** at TMV College, Pune under Savitribai Phule Pune University.

```
© 2026 Attendrollix. All rights reserved.
Developed for academic purposes.
```

---

## 👨‍💻 Developer

| Field | Details |
|---|---|
| **Project** | Attendrollix — Attendance Management System |
| **Institution** | TMV College, Pune, Maharashtra |
| **University** | Savitribai Phule Pune University (SPPU) |
| **Course** | Bachelor of Computer Applications (BCA) |
| **Academic Year** | 2025 – 2026 |

---

<div align="center">

**Built with ❤️ for Indian Colleges**

`PHP` · `MySQL` · `HTML5` · `CSS3` · `JavaScript` · `XAMPP`

</div>
