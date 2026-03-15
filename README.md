# Attendrollix — Setup & Developer Guide

## Project Structure

```
attendrollix/
│
├── index.html          Main application (frontend entry point)
├── style.css           All CSS styles (light + dark mode)
├── app.js              Frontend JavaScript — connected to PHP backend
├── guide.html          User guide / documentation page
├── database.sql        Database setup — run this first in phpMyAdmin
│
├── includes/
│   └── db.php          PDO connection, response helpers, auth guard
│
└── api/
    ├── auth.php        Register · Login · Logout · Session check
    ├── courses.php     Course CRUD (list · add · edit · delete)
    ├── students.php    Student CRUD + auto QR code generation
    ├── attendance.php  Mark · Reset · Today · Date · Report · Stats
    └── college.php     Get and update college profile
```

---

## Step 1 — Place the folder

| Server   | Path                                          |
|----------|-----------------------------------------------|
| XAMPP    | `C:\xampp\htdocs\attendrollix\`    |
| Laragon  | `C:\laragon\www\attendrollix\`     |

---

## Step 2 — Create the database

1. Start XAMPP / Laragon (Apache + MySQL)
2. Open **phpMyAdmin** → `http://localhost/phpmyadmin`
3. Click the **SQL** tab
4. Paste the entire contents of `database.sql`
5. Click **Go**

The script drops and recreates the database cleanly, so it is safe to run multiple times.

---

## Step 3 — Check database credentials

Open `includes/db.php` and confirm the settings match your server:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');      // XAMPP default = '' (empty)
                             // Laragon default = 'root'
define('DB_NAME', 'attendrollix');
```

If you are using **Laragon**, change `DB_PASS` to `'root'`.

---

## Step 4 — Open the app

```
http://localhost/attendrollix/index.html
```

### Demo credentials

| Field    | Value           |
|----------|-----------------|
| Email    | admin@tmv.edu   |
| Password | tmv@123         |

---

## API Reference

All endpoints require an active PHP session (set by login) except `auth.php`.

| Method | Endpoint                               | Description                        |
|--------|----------------------------------------|------------------------------------|
| POST   | `/api/auth.php?action=register`        | Register a new college             |
| POST   | `/api/auth.php?action=login`           | Log in (sets PHP session)          |
| POST   | `/api/auth.php?action=logout`          | Destroy session                    |
| GET    | `/api/auth.php?action=me`              | Return current session info        |
| GET    | `/api/courses.php`                     | List all courses                   |
| POST   | `/api/courses.php`                     | Add a course                       |
| PUT    | `/api/courses.php?id=X`                | Edit a course                      |
| DELETE | `/api/courses.php?id=X`                | Delete a course                    |
| GET    | `/api/students.php`                    | List all students                  |
| GET    | `/api/students.php?id=X`               | Get a single student               |
| GET    | `/api/students.php?action=qr&id=X`     | Get QR code image URL              |
| POST   | `/api/students.php`                    | Add student (QR auto-generated)    |
| PUT    | `/api/students.php?id=X`               | Edit student                       |
| DELETE | `/api/students.php?id=X`               | Delete student                     |
| POST   | `/api/attendance.php?action=mark`      | Manual attendance mark             |
| POST   | `/api/attendance.php?action=qr`        | Mark via QR code                   |
| POST   | `/api/attendance.php?action=reset`     | Remove today's attendance record   |
| GET    | `/api/attendance.php?action=today`     | Today's attendance map             |
| GET    | `/api/attendance.php?action=date`      | Attendance for a specific date     |
| GET    | `/api/attendance.php?action=report`    | Percentage report (6m or 1y)       |
| GET    | `/api/attendance.php?action=stats`     | Dashboard summary stats            |
| GET    | `/api/college.php`                     | Get college profile                |
| PUT    | `/api/college.php`                     | Update college profile             |

---

## QR Code Flow

1. Admin adds a student via the UI
2. PHP inserts a temporary record then generates a unique code: `QR-S{id}-XXXXXXXX`
3. The QR code is saved to the `students.qr_code` column
4. The "View" modal fetches an image from `api.qrserver.com` using the code as data
5. Students scan this image from their identity card to mark attendance via the QR tab

> **Note:** QR image loading requires an internet connection (uses qrserver.com). The QR code
> text itself is always stored locally in MySQL.

---

## Authentication Flow

- Passwords are hashed with PHP `password_hash(..., PASSWORD_BCRYPT)` before storage
- Login calls `password_verify()` and sets a PHP `$_SESSION`
- All API files call `requireAuth()` which reads `$_SESSION['college_id']`
- The frontend sends `credentials: 'include'` with every `fetch()` call to forward the session cookie
- On page load, `checkSession()` calls `/api/auth.php?action=me` — if the session is valid the user is logged in automatically

---

## Notes

- All data persists in MySQL — no data is lost on page refresh or browser restart
- Each college's data is completely isolated by `college_id` foreign keys
- The `ON DELETE CASCADE` constraint means deleting a student automatically removes their attendance records
