'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/builder_sessions.json');

function loadSessions() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('[SessionStorage] Erreur de lecture:', err);
    return {};
  }
}

function saveSessions(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[SessionStorage] Erreur d\'écriture:', err);
  }
}

module.exports = {
  get: (userId) => loadSessions()[userId] || null,
  set: (userId, state) => {
    const data = loadSessions();
    data[userId] = state;
    saveSessions(data);
  },
  delete: (userId) => {
    const data = loadSessions();
    if (data[userId]) {
      delete data[userId];
      saveSessions(data);
    }
  },
  has: (userId) => !!loadSessions()[userId]
};
