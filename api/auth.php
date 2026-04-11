<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
// ============================================================
//  api/auth.php — Authentication
//  POST ?action=login    | POST ?action=logout
//  POST ?action=register | POST ?action=forgot
//  POST ?action=reset    | GET  ?action=me
// ============================================================

ob_start();

require_once __DIR__ . '/../includes/db.php';
setCorsHeaders();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if      ($action === 'login')    { handleLogin();    }
elseif  ($action === 'logout')   { handleLogout();   }
elseif  ($action === 'register') { handleRegister(); }
elseif  ($action === 'forgot')   { handleForgot();   }
elseif  ($action === 'reset')    { handleReset();    }
elseif  ($action === 'me')       { handleMe();       }
else    { jsonError('Unknown action.', 404); }

// ── Register ──────────────────────────────────────────────
function handleRegister() {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) { $body = array(); }

    $name     = trim(isset($body['name'])     ? $body['name']     : '');
    $email    = strtolower(trim(isset($body['email'])    ? $body['email']    : ''));
    $password = isset($body['password']) ? $body['password'] : '';
    $location = trim(isset($body['location']) ? $body['location'] : '');
    $board    = trim(isset($body['board'])    ? $body['board']    : '');
    $phone    = trim(isset($body['phone'])    ? $body['phone']    : '');

    if ($name === '')     { jsonError('College name is required.'); }
    if ($email === '')    { jsonError('Email address is required.'); }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { jsonError('Invalid email format.'); }
    if (strlen($password) < 6) { jsonError('Password must be at least 6 characters.'); }

    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM colleges WHERE email = ?');
    $stmt->execute(array($email));
    if ($stmt->fetch()) {
        jsonError('This email is already registered. Please log in instead.');
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare(
        'INSERT INTO colleges (name, email, password, location, board, phone) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute(array($name, $email, $hash, $location, $board, $phone));
    $collegeId = (int) $db->lastInsertId();

    // Default courses
    $defaults = array(
        array('bsc',  'B.Sc',  '#3b82f6'),
        array('bcom', 'B.Com', '#f59e0b'),
        array('bca',  'BCA',   '#10b981'),
        array('ba',   'B.A',   '#ef4444'),
        array('bba',  'BBA',   '#8b5cf6'),
    );
    $cs = $db->prepare('INSERT IGNORE INTO courses (college_id, course_key, label, color) VALUES (?, ?, ?, ?)');
    foreach ($defaults as $d) {
        $cs->execute(array($collegeId, $d[0], $d[1], $d[2]));
    }

    jsonSuccess(array(
        'college_id' => $collegeId,
        'email'      => $email,
        'name'       => $name,
    ), 'Registration successful! You can now log in.');
}

// ── Login ─────────────────────────────────────────────────
function handleLogin() {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) { $body = array(); }

    $email    = strtolower(trim(isset($body['email'])    ? $body['email']    : ''));
    $password = trim(isset($body['password']) ? $body['password'] : '');

    if ($email === '' || $password === '') {
        jsonError('Email and password are required.');
    }

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM colleges WHERE email = ?');
    $stmt->execute(array($email));
    $college = $stmt->fetch();

    if (!$college || !password_verify($password, $college['password'])) {
        jsonError('Invalid email or password. Please try again.');
    }

    $_SESSION['college_id']    = $college['id'];
    $_SESSION['college_email'] = $college['email'];
    $_SESSION['college_name']  = $college['name'];

    // Login notification email
    $subject = 'Attendrollix — Successful Login';
    $msg = "Hello " . $college['name'] . ",\n\n"
         . "A successful login was recorded on your Attendrollix account.\n\n"
         . "Email : " . $college['email'] . "\n"
         . "Time  : " . date('d M Y, h:i A') . "\n\n"
         . "If this was not you, reset your password immediately.\n\n"
         . "— Attendrollix System";
    sendMail($college['email'], $college['name'], $subject, $msg);

    jsonSuccess(array(
        'college_id' => $college['id'],
        'email'      => $college['email'],
        'name'       => $college['name'],
        'location'   => $college['location'],
        'board'      => $college['board'],
        'phone'      => $college['phone'],
    ), 'Login successful. Welcome back!');
}

// ── Logout ────────────────────────────────────────────────
function handleLogout() {
    if (session_status() === PHP_SESSION_NONE) { session_start(); }
    $_SESSION = array();
    session_destroy();
    jsonSuccess(array(), 'You have been logged out successfully.');
}

// ── Forgot Password ───────────────────────────────────────
function handleForgot() {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) { $body = array(); }

    $email = strtolower(trim(isset($body['email']) ? $body['email'] : ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Please enter a valid email address.');
    }

    $db   = getDB();
    $stmt = $db->prepare('SELECT id, name FROM colleges WHERE email = ?');
    $stmt->execute(array($email));
    $college = $stmt->fetch();

    if (!$college) {
        jsonSuccess(array(), 'If this email is registered, a reset link has been sent.');
    }

    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

    $db->prepare(
        'INSERT INTO password_resets (college_id, token, expires_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)'
    )->execute(array($college['id'], $token, $expires));

    $proto    = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host     = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $dir      = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/');
    $resetUrl = $proto . '://' . $host . $dir . '/index.html?reset_token=' . $token;

    $subject = 'Attendrollix — Password Reset';
    $msg = "Hello " . $college['name'] . ",\n\n"
         . "Reset link (valid 1 hour):\n\n" . $resetUrl . "\n\n"
         . "If you did not request this, ignore this email.\n\n"
         . "— Attendrollix System";
    sendMail($email, $college['name'], $subject, $msg);

    jsonSuccess(array(), 'Password reset link sent to your email.');
}

// ── Reset Password ────────────────────────────────────────
function handleReset() {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) { $body = array(); }

    $token    = trim(isset($body['token'])    ? $body['token']    : '');
    $password = trim(isset($body['password']) ? $body['password'] : '');

    if ($token === '')          { jsonError('Reset token is missing.'); }
    if (strlen($password) < 6) { jsonError('Password must be at least 6 characters.'); }

    $db   = getDB();
    $stmt = $db->prepare('SELECT college_id FROM password_resets WHERE token = ? AND expires_at > NOW()');
    $stmt->execute(array($token));
    $row = $stmt->fetch();

    if (!$row) { jsonError('Reset link is invalid or expired. Please request a new one.'); }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $db->prepare('UPDATE colleges SET password = ? WHERE id = ?')->execute(array($hash, $row['college_id']));
    $db->prepare('DELETE FROM password_resets WHERE college_id = ?')->execute(array($row['college_id']));

    jsonSuccess(array(), 'Password reset successfully. You can now log in.');
}

// ── Me ────────────────────────────────────────────────────
function handleMe() {
    if (empty($_SESSION['college_id'])) {
        jsonError('No active session. Please log in.', 401);
    }
    $db   = getDB();
    $stmt = $db->prepare('SELECT id, name, email, location, board, phone FROM colleges WHERE id = ?');
    $stmt->execute(array($_SESSION['college_id']));
    $college = $stmt->fetch();
    if (!$college) { jsonError('College record not found.', 404); }
    jsonSuccess($college);
}
