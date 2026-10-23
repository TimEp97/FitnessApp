<?php
// Kopiere diese Datei nach config.php und trage die Zugangsdaten ein.

// MySQL/MariaDB-Datenbank (bei all-inkl im KAS unter „Datenbanken“). Die Tabellen legt die App selbst an.
define('DB_HOST', 'localhost');
define('DB_NAME', '');
define('DB_USER', '');
define('DB_PASS', '');

// Einmaliger Code zum Anlegen des ersten Kontos (Admin), mindestens 12 Zeichen.
// Ältere Installationen nutzen dafür den bisherigen SYNC_KEY.
define('SETUP_CODE', '');

// Optional: Absender für „Passwort vergessen“. Leer = noreply@<deine Domain>.
define('MAIL_FROM', '');
