<?php
// ============================================================
//  api/college.php  —  College Profile
//
//  GET /api/college.php   Get current college profile
//  PUT /api/college.php   Update college profile
// ============================================================

require_once __DIR__ . '/../includes/db.php';
setCorsHeaders();
$auth = requireAuth();
$db   = getDB();

match ($_SERVER['REQUEST_METHOD']) {
    'GET' => getProfile($db, $auth),
    'PUT' => updateProfile($db, $auth),
    default => jsonError('Method not allowed.', 405),
};

// ── Get profile ───────────────────────────────────────────
function getProfile(PDO $db, array $auth): never {
    $stmt = $db->prepare(
        'SELECT id, name, email, location, board, phone FROM colleges WHERE id = ?'
    );
    $stmt->execute([$auth['college_id']]);
    $college = $stmt->fetch();
    if (!$college) jsonError('College record not found.', 404);
    jsonSuccess($college);
}

// ── Update profile ────────────────────────────────────────
function updateProfile(PDO $db, array $auth): never {
    $body  = getBody();
    $name  = trim($body['name']     ?? '');
    $loc   = trim($body['location'] ?? '');
    $board = trim($body['board']    ?? '');
    $phone = trim($body['phone']    ?? '');

    if (!$name) jsonError('College name is required.');

    $db->prepare(
        'UPDATE colleges SET name = ?, location = ?, board = ?, phone = ? WHERE id = ?'
    )->execute([$name, $loc, $board, $phone, $auth['college_id']]);

    jsonSuccess([
        'name'     => $name,
        'location' => $loc,
        'board'    => $board,
        'phone'    => $phone,
    ], 'Profile updated successfully.');
}
