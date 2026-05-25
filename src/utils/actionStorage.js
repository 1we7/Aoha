'use strict';

const fs = require('fs');
const path = require('path');

// Écrit dans le dossier global /data (liaison avec le volume permanent Railway)
const DATA_FILE = path.join(__dirname, '../../data/published_actions.json');

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('[ActionStorage] Erreur de lecture:', err);
    return {};
  }
}

function saveData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[ActionStorage] Erreur d\'écriture:', err);
  }
}

function saveAction(actionId, textValue) {
  const data = loadData();
  data[actionId] = textValue;
  saveData(data);
}

function getAction(actionId) {
  const data = loadData();
  return data[actionId] || null;
}

module.exports = { saveAction, getAction };
