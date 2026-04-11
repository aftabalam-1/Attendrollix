<?php
// ============================================================
//  api/courses.php  —  Course Management (CRUD)
//
//  GET    /api/courses.php          List all courses
//  POST   /api/courses.php          Add a new course
//  PUT    /api/courses.php?id=X     Edit a course
//  DELETE /api/courses.php?id=X     Delete a course
// ============================================================

require_once __DIR__ . '/../includes/db.php';
setCorsHeaders();
$auth = requireAuth();
$db   = getDB();

match ($_SERVER['REQUEST_METHOD']) {
    'GET'    => listCourses($db, $auth),
    'POST'   => addCourse($db, $auth),
    'PUT'    => editCourse($db, $auth),
    'DELETE' => deleteCourse($db, $auth),
    default  => jsonError('Method not allowed.', 405),
};

// ── List all courses ──────────────────────────────────────
function listCourses(PDO $db, array $auth): never {
    $stmt = $db->prepare(
        'SELECT c.id, c.course_key, c.label, c.color,
                COUNT(s.id) AS student_count
         FROM courses c
         LEFT JOIN students s ON s.course_id = c.id
         WHERE c.college_id = ?
         GROUP BY c.id
         ORDER BY c.created_at ASC'
    );
    $stmt->execute([$auth['college_id']]);
    jsonSuccess($stmt->fetchAll());
}

// ── Add a new course ──────────────────────────────────────
function addCourse(PDO $db, array $auth): never {
    $body       = getBody();
    $course_key = strtolower(trim($body['course_key'] ?? ''));
    $label      = trim($body['label'] ?? '');
    $color      = trim($body['color'] ?? '#3b82f6');

    if (!$course_key) jsonError('Course ID (key) is required.');
    if (!$label)      jsonError('Course name is required.');
    if (!preg_match('/^[a-z0-9_]+$/', $course_key)) {
        jsonError('Course ID must contain only lowercase letters, numbers, or underscores.');
    }

    // Prevent duplicate course key within the same college
    $chk = $db->prepare('SELECT id FROM courses WHERE college_id = ? AND course_key = ?');
    $chk->execute([$auth['college_id'], $course_key]);
    if ($chk->fetch()) {
        jsonError("Course key '{$course_key}' already exists in your college.");
    }

    $stmt = $db->prepare(
        'INSERT INTO courses (college_id, course_key, label, color) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$auth['college_id'], $course_key, $label, $color]);
    $newId = (int) $db->lastInsertId();

    jsonSuccess([
        'id'            => $newId,
        'course_key'    => $course_key,
        'label'         => $label,
        'color'         => $color,
        'student_count' => 0,
    ], 'Course added successfully.');
}

// ── Edit a course ─────────────────────────────────────────
function editCourse(PDO $db, array $auth): never {
    $id   = (int)($_GET['id'] ?? 0);
    $body = getBody();
    if (!$id) jsonError('Course ID is required.');

    // Verify this course belongs to the logged-in college
    $chk = $db->prepare('SELECT id FROM courses WHERE id = ? AND college_id = ?');
    $chk->execute([$id, $auth['college_id']]);
    if (!$chk->fetch()) jsonError('Course not found.', 404);

    $label = trim($body['label'] ?? '');
    $color = trim($body['color'] ?? '');
    if (!$label) jsonError('Course name is required.');

    $db->prepare('UPDATE courses SET label = ?, color = ? WHERE id = ?')
       ->execute([$label, $color, $id]);

    jsonSuccess(['id' => $id, 'label' => $label, 'color' => $color], 'Course updated successfully.');
}

// ── Delete a course ───────────────────────────────────────
function deleteCourse(PDO $db, array $auth): never {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonError('Course ID is required.');

    $chk = $db->prepare('SELECT id FROM courses WHERE id = ? AND college_id = ?');
    $chk->execute([$id, $auth['college_id']]);
    if (!$chk->fetch()) jsonError('Course not found.', 404);

    $db->prepare('DELETE FROM courses WHERE id = ?')->execute([$id]);
    jsonSuccess([], 'Course deleted. Student records were not affected.');
}
