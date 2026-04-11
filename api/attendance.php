<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// ============================================================
//  api/attendance.php  —  Attendance Management
//
//  POST /api/attendance.php?action=mark    Mark one student (manual)
//  POST /api/attendance.php?action=qr      Mark via QR code scan
//  POST /api/attendance.php?action=reset   Remove a student's attendance
//  GET  /api/attendance.php?action=today   Today's attendance map
//  GET  /api/attendance.php?action=date    Attendance for a specific date
//  GET  /api/attendance.php?action=report  Attendance % report (6m or 1y)
//  GET  /api/attendance.php?action=stats   Dashboard summary stats
// ============================================================

require_once __DIR__ . '/../includes/db.php';
setCorsHeaders();
$auth   = requireAuth();
$db     = getDB();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

match (true) {
    $method === 'POST' && $action === 'mark'   => markAttendance($db, $auth),
    $method === 'POST' && $action === 'qr'     => markByQR($db, $auth),
    $method === 'POST' && $action === 'reset'  => resetAttendance($db, $auth),
    $method === 'GET'  && $action === 'today'  => getTodayAttendance($db, $auth),
    $method === 'GET'  && $action === 'date'   => getDateAttendance($db, $auth),
    $method === 'GET'  && $action === 'report' => getReport($db, $auth),
    $method === 'GET'  && $action === 'stats'  => getTodayStats($db, $auth),
    default => jsonError('Unknown action.', 404),
};

// ── Manual attendance mark ────────────────────────────────
function markAttendance(PDO $db, array $auth): never {
    $body      = getBody();
    $studentId = (int)($body['student_id'] ?? 0);
    $status    = $body['status'] ?? '';
    $date      = $body['date']   ?? date('Y-m-d');

    if (!$studentId) jsonError('student_id is required.');
    if (!in_array($status, ['present', 'absent', 'late'])) {
        jsonError('Status must be present, absent, or late.');
    }

    // Confirm student belongs to this college
    $chk = $db->prepare('SELECT id FROM students WHERE id = ? AND college_id = ?');
    $chk->execute([$studentId, $auth['college_id']]);
    if (!$chk->fetch()) jsonError('Student not found.', 404);

    $time = date('H:i');

    // Upsert: insert new or update existing record for the same date
    $stmt = $db->prepare(
        'INSERT INTO attendance (student_id, college_id, att_date, status, marked_time)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), marked_time = VALUES(marked_time)'
    );
    $stmt->execute([$studentId, $auth['college_id'], $date, $status, $time]);

    jsonSuccess([
        'student_id'  => $studentId,
        'status'      => $status,
        'date'        => $date,
        'marked_time' => $time,
    ], "Marked as {$status}.");
}

// ── Mark attendance via QR code ───────────────────────────
function markByQR(PDO $db, array $auth): never {
    $body   = getBody();
    $qrCode = trim($body['qr_code'] ?? '');
    $date   = $body['date'] ?? date('Y-m-d');

    if (!$qrCode) jsonError('QR code is required.');

    // Look up the student by QR code
    $stmt = $db->prepare(
        'SELECT id, name FROM students WHERE qr_code = ? AND college_id = ?'
    );
    $stmt->execute([$qrCode, $auth['college_id']]);
    $student = $stmt->fetch();
    if (!$student) jsonError('QR code not recognised. Please check the student record.');

    // Block duplicate attendance on the same date
    $chk = $db->prepare(
        'SELECT status FROM attendance WHERE student_id = ? AND att_date = ?'
    );
    $chk->execute([$student['id'], $date]);
    $existing = $chk->fetch();
    if ($existing) {
        jsonError(
            "{$student['name']} is already marked as {$existing['status']} today.",
            409
        );
    }

    $time = date('H:i');
    $db->prepare(
        "INSERT INTO attendance (student_id, college_id, att_date, status, marked_time)
         VALUES (?, ?, ?, 'present', ?)"
    )->execute([$student['id'], $auth['college_id'], $date, $time]);

    jsonSuccess([
        'student_id'   => $student['id'],
        'student_name' => $student['name'],
        'status'       => 'present',
        'marked_time'  => $time,
    ], "✓ {$student['name']} marked Present via QR.");
}

// ── Reset (remove) a student's attendance ─────────────────
function resetAttendance(PDO $db, array $auth): never {
    $body      = getBody();
    $studentId = (int)($body['student_id'] ?? 0);
    $date      = $body['date'] ?? date('Y-m-d');

    if (!$studentId) jsonError('student_id is required.');

    $db->prepare(
        'DELETE FROM attendance WHERE student_id = ? AND att_date = ? AND college_id = ?'
    )->execute([$studentId, $date, $auth['college_id']]);

    jsonSuccess([], 'Attendance record removed successfully.');
}

// ── Today's attendance (keyed by student_id) ──────────────
function getTodayAttendance(PDO $db, array $auth): never {
    $date = date('Y-m-d');
    $stmt = $db->prepare(
        "SELECT a.student_id,
                a.status,
                TIME_FORMAT(a.marked_time, '%H:%i') AS marked_time
         FROM attendance a
         WHERE a.college_id = ? AND a.att_date = ?"
    );
    $stmt->execute([$auth['college_id'], $date]);
    $rows = $stmt->fetchAll();

    // Build a map { student_id => { status, time } } for fast JS lookups
    $map = [];
    foreach ($rows as $r) {
        $map[$r['student_id']] = [
            'status' => $r['status'],
            'time'   => $r['marked_time'],
        ];
    }
    jsonSuccess(['date' => $date, 'records' => $map]);
}

// ── Attendance for a specific date ────────────────────────
function getDateAttendance(PDO $db, array $auth): never {
    $date = $_GET['date'] ?? date('Y-m-d');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        jsonError('Invalid date format. Use YYYY-MM-DD.');
    }

    $stmt = $db->prepare(
        "SELECT a.student_id,
                a.status,
                TIME_FORMAT(a.marked_time, '%H:%i') AS marked_time,
                s.name, s.roll,
                c.label AS course_label,
                c.course_key
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         JOIN courses  c ON c.id = s.course_id
         WHERE a.college_id = ? AND a.att_date = ?
         ORDER BY c.course_key, s.name"
    );
    $stmt->execute([$auth['college_id'], $date]);
    jsonSuccess(['date' => $date, 'records' => $stmt->fetchAll()]);
}

// ── Percentage report (6 months or 1 year) ────────────────
function getReport(PDO $db, array $auth): never {
    $range  = $_GET['range'] ?? '6m';
    $days   = $range === '1y' ? 365 : 180;
    $cutoff = date('Y-m-d', strtotime("-{$days} days"));

    $sql = "SELECT s.id, s.name, s.roll,
                   c.label AS course_label,
                   c.color AS course_color,
                   COUNT(a.id)                                        AS total_days,
                   SUM(a.status IN ('present', 'late'))               AS days_attended,
                   ROUND(
                       SUM(a.status IN ('present', 'late')) * 100.0
                       / NULLIF(COUNT(a.id), 0)
                   )                                                  AS percentage
            FROM students s
            JOIN courses c ON c.id = s.course_id
            LEFT JOIN attendance a
                   ON a.student_id = s.id AND a.att_date >= ?
            WHERE s.college_id = ?
            GROUP BY s.id
            ORDER BY c.course_key, s.name";

    $stmt = $db->prepare($sql);
    $stmt->execute([$cutoff, $auth['college_id']]);
    jsonSuccess(['range' => $range, 'cutoff' => $cutoff, 'records' => $stmt->fetchAll()]);
}

// ── Dashboard summary stats ───────────────────────────────
function getTodayStats(PDO $db, array $auth): never {
    $date = date('Y-m-d');

    // Total number of students
    $total = $db->prepare('SELECT COUNT(*) FROM students WHERE college_id = ?');
    $total->execute([$auth['college_id']]);
    $totalCount = (int) $total->fetchColumn();

    // All attendance records for today with student details
    $stmt = $db->prepare(
        "SELECT a.status,
                s.id AS student_id,
                s.name,
                s.roll,
                TIME_FORMAT(a.marked_time, '%H:%i') AS marked_time,
                c.label AS course_label,
                c.color AS course_color
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         JOIN courses  c ON c.id = s.course_id
         WHERE a.college_id = ? AND a.att_date = ?
         ORDER BY c.course_key, s.name"
    );
    $stmt->execute([$auth['college_id'], $date]);
    $records = $stmt->fetchAll();

    $present = array_filter($records, fn($r) => $r['status'] === 'present');
    $absent  = array_filter($records, fn($r) => $r['status'] === 'absent');
    $late    = array_filter($records, fn($r) => $r['status'] === 'late');

    jsonSuccess([
        'date'          => $date,
        'total'         => $totalCount,
        'present_count' => count($present),
        'absent_count'  => count($absent),
        'late_count'    => count($late),
        'present'       => array_values($present),
        'absent'        => array_values($absent),
        'late'          => array_values($late),
        'all_records'   => $records,
    ]);
}
