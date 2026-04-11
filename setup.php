<?php
// ============================================================
//  Attendrollix — setup.php
//  Run this ONCE after importing database.sql to set the admin password.
//  Then DELETE this file from your server!
//  Usage: http://yourdomain.com/attendrollix/setup.php
// ============================================================
require_once __DIR__ . '/includes/db.php';

$email    = 'admin@tmv.edu';
$password = 'admin@123';
$hash     = password_hash($password, PASSWORD_BCRYPT);

$db   = getDB();
$stmt = $db->prepare('UPDATE colleges SET password = ? WHERE email = ?');
$stmt->execute([$hash, $email]);

if ($stmt->rowCount() > 0) {
    echo '<h2 style="color:green;font-family:sans-serif">✅ Password updated successfully!</h2>';
    echo '<p style="font-family:sans-serif">Admin password set to: <code>admin@123</code></p>';
    echo '<p style="color:red;font-family:sans-serif"><strong>⚠️ DELETE this setup.php file from your server now!</strong></p>';
} else {
    echo '<h2 style="color:red;font-family:sans-serif">❌ College not found. Make sure database.sql was imported first.</h2>';
}
