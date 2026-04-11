<?php
// ============================================================
//  api/students.php  —  Student Management + QR Code
//
//  GET    /api/students.php                   List all students
//  GET    /api/students.php?id=X              Get single student
//  GET    /api/students.php?action=qr&id=X    Get QR code image URL
//  POST   /api/students.php                   Add student (QR auto-generated)
//  PUT    /api/students.php?id=X              Edit student
//  DELETE /api/students.php?id=X              Delete student
// ============================================================

require_once __DIR__ . '/../includes/db.php';
setCorsHeaders();
$auth   = requireAuth();
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = (int)($_GET['id'] ?? 0);

// Special route: QR code image
if ($method === 'GET' && $action === 'qr' && $id) {
    getQrImage($db, $auth, $id);
}

match ($method) {
    'GET'    => $id ? getStudent($db, $auth, $id) : listStudents($db, $auth),
    'POST'   => addStudent($db, $auth),
    'PUT'    => editStudent($db, $auth, $id),
    'DELETE' => deleteStudent($db, $auth, $id),
    default  => jsonError('Method not allowed.', 405),
};

// ── List students (optionally filtered by course) ─────────
function listStudents(PDO $db, array $auth): never {
    $courseId = (int)($_GET['course_id'] ?? 0);

    $sql = 'SELECT s.id, s.name, s.roll, s.phone, s.email, s.qr_code,
                   c.id AS course_id, c.course_key, c.label AS course_label, c.color AS course_color
            FROM students s
            JOIN courses c ON c.id = s.course_id
            WHERE s.college_id = ?';
    $params = [$auth['college_id']];

    if ($courseId) {
        $sql     .= ' AND s.course_id = ?';
        $params[] = $courseId;
    }
    $sql .= ' ORDER BY c.course_key, s.name';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonSuccess($stmt->fetchAll());
}

// ── Get a single student ──────────────────────────────────
function getStudent(PDO $db, array $auth, int $id): never {
    $stmt = $db->prepare(
        'SELECT s.id, s.name, s.roll, s.phone, s.email, s.qr_code,
                c.id AS course_id, c.course_key, c.label AS course_label, c.color AS course_color
         FROM students s
         JOIN courses c ON c.id = s.course_id
         WHERE s.id = ? AND s.college_id = ?'
    );
    $stmt->execute([$id, $auth['college_id']]);
    $student = $stmt->fetch();
    if (!$student) jsonError('Student not found.', 404);
    jsonSuccess($student);
}

// ── Add a student (QR code auto-generated) ────────────────
function addStudent(PDO $db, array $auth): never {
    $body     = getBody();
    $name     = trim($body['name']       ?? '');
    $roll     = trim($body['roll']       ?? '');
    $courseId = (int)($body['course_id'] ?? 0);
    $phone    = trim($body['phone']      ?? '');
    $email    = trim($body['email']      ?? '');

    if (!$name)     jsonError('Student name is required.');
    if (!$roll)     jsonError('Roll number is required.');
    if (!$courseId) jsonError('Course selection is required.');

    // Verify course belongs to this college
    $chk = $db->prepare('SELECT id FROM courses WHERE id = ? AND college_id = ?');
    $chk->execute([$courseId, $auth['college_id']]);
    if (!$chk->fetch()) jsonError('Invalid course selected.', 404);

    // Prevent duplicate roll number within the same college
    $dup = $db->prepare('SELECT id FROM students WHERE roll = ? AND college_id = ?');
    $dup->execute([$roll, $auth['college_id']]);
    if ($dup->fetch()) jsonError("Roll number '{$roll}' is already registered.");

    // Insert with a temporary QR placeholder (we need the ID first)
    $stmt = $db->prepare(
        'INSERT INTO students (college_id, course_id, name, roll, phone, email, qr_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$auth['college_id'], $courseId, $name, $roll, $phone, $email, 'TEMP']);
    $studentId = (int) $db->lastInsertId();

    // Generate a unique QR code using the new student ID
    $qrCode = generateUniqueQR($db, $studentId);
    $db->prepare('UPDATE students SET qr_code = ? WHERE id = ?')
       ->execute([$qrCode, $studentId]);

    // Return the full student record
    $get = $db->prepare(
        'SELECT s.id, s.name, s.roll, s.phone, s.email, s.qr_code,
                c.id AS course_id, c.course_key, c.label AS course_label, c.color AS course_color
         FROM students s
         JOIN courses c ON c.id = s.course_id
         WHERE s.id = ?'
    );
    $get->execute([$studentId]);
    jsonSuccess($get->fetch(), 'Student added successfully.');
}

// ── Edit a student ────────────────────────────────────────
function editStudent(PDO $db, array $auth, int $id): never {
    if (!$id) jsonError('Student ID is required.');
    $body = getBody();

    $chk = $db->prepare('SELECT id FROM students WHERE id = ? AND college_id = ?');
    $chk->execute([$id, $auth['college_id']]);
    if (!$chk->fetch()) jsonError('Student not found.', 404);

    $name     = trim($body['name']       ?? '');
    $roll     = trim($body['roll']       ?? '');
    $courseId = (int)($body['course_id'] ?? 0);
    $phone    = trim($body['phone']      ?? '');
    $email    = trim($body['email']      ?? '');

    if (!$name) jsonError('Student name is required.');
    if (!$roll) jsonError('Roll number is required.');

    $db->prepare(
        'UPDATE students SET name = ?, roll = ?, course_id = ?, phone = ?, email = ? WHERE id = ?'
    )->execute([$name, $roll, $courseId, $phone, $email, $id]);

    jsonSuccess(['id' => $id], 'Student updated successfully.');
}

// ── Delete a student ──────────────────────────────────────
function deleteStudent(PDO $db, array $auth, int $id): never {
    if (!$id) jsonError('Student ID is required.');

    $chk = $db->prepare('SELECT id FROM students WHERE id = ? AND college_id = ?');
    $chk->execute([$id, $auth['college_id']]);
    if (!$chk->fetch()) jsonError('Student not found.', 404);

    // Attendance records are removed automatically via ON DELETE CASCADE
    $db->prepare('DELETE FROM students WHERE id = ?')->execute([$id]);
    jsonSuccess([], 'Student deleted successfully.');
}

// ── Get QR code image URL ─────────────────────────────────
function getQrImage(PDO $db, array $auth, int $id): never {
    $stmt = $db->prepare('SELECT qr_code FROM students WHERE id = ? AND college_id = ?');
    $stmt->execute([$id, $auth['college_id']]);
    $row = $stmt->fetch();
    if (!$row) jsonError('Student not found.', 404);

    $qrCode  = $row['qr_code'];
    $encoded = urlencode($qrCode);

    // Returns a URL to a free QR image API — no library installation required
    $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={$encoded}&format=svg";

    jsonSuccess([
        'qr_code'    => $qrCode,
        'qr_svg'     => $qrImageUrl,
        'student_id' => $id,
    ]);
}

// ── Generate a unique QR code ─────────────────────────────
function generateUniqueQR(PDO $db, int $studentId): string {
    $attempts = 0;
    do {
        $rand = strtoupper(bin2hex(random_bytes(4)));
        $code = "QR-S{$studentId}-{$rand}";
        $stmt = $db->prepare('SELECT id FROM students WHERE qr_code = ?');
        $stmt->execute([$code]);
        $exists = $stmt->fetch();
        $attempts++;
        if ($attempts > 20) break; // Safety limit
    } while ($exists);
    return $code;
}
