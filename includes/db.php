<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
// ============================================================
//  includes/db.php
//  Database connection, response helpers, auth guard, mailer.
// ============================================================

// ── Database credentials ──────────────────────────────────
// XAMPP default  : DB_PASS = ''   (empty string)
// Laragon default: DB_PASS = 'root'
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');        // Change to 'root' if using Laragon
define('DB_NAME', 'attendrollix');

// ── PDO singleton connection ──────────────────────────────
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, array(
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ));
        } catch (PDOException $e) {
            jsonError('Database connection failed. Check DB credentials in includes/db.php', 500);
        }
    }
    return $pdo;
}

// ── JSON response helpers ─────────────────────────────────
function jsonSuccess($data = array(), $message = 'Success') {
    // Clear any buffered output before sending JSON
    if (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: application/json');
    echo json_encode(array('success' => true, 'message' => $message, 'data' => $data));
    exit;
}

function jsonError($message, $code = 400) {
    if (ob_get_level()) { ob_end_clean(); }
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(array('success' => false, 'message' => $message, 'data' => null));
    exit;
}

// ── CORS + Content-Type headers ───────────────────────────
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// ── Session authentication guard ─────────────────────────
function requireAuth() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['college_id'])) {
        jsonError('Not authenticated. Please log in first.', 401);
    }
    return array(
        'college_id' => (int) $_SESSION['college_id'],
        'email'      => $_SESSION['college_email'],
        'name'       => $_SESSION['college_name'],
    );
}

// ── Parse JSON request body ───────────────────────────────
function getBody() {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : array();
}

// ── Mail helper ───────────────────────────────────────────
function sendMail($to, $toName, $subject, $textBody) {
    $from     = 'noreply@' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'attendrollix.com');
    $fromName = 'Attendrollix';
    $headers  = "From: " . $fromName . " <" . $from . ">\r\n";
    $headers .= "Reply-To: " . $from . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    @mail($to, $subject, $textBody, $headers);
}
