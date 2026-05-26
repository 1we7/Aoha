const Database = require('better-sqlite3');
const path = require('path');

// Initialisation de la BDD locale (Railway conserve le volume si configuré, ou recrée à la volée)
const db = new Database(path.join(__dirname, '../database.sqlite'));

db.exec(`
    CREATE TABLE IF NOT EXISTS stats (
        user_id TEXT PRIMARY KEY,
        messages INTEGER DEFAULT 0,
        voice_time INTEGER DEFAULT 0,
        invites INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS staff_roles (
        role_id TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS temp_bans (
        user_id TEXT,
        guild_id TEXT,
        expires_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS custom_buttons (
        custom_id TEXT PRIMARY KEY,
        action_type TEXT,
        action_data TEXT,
        guild_id TEXT
    );
`);

module.exports = db;
