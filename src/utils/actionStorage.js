'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/published_actions.json');

/**
 * Enregistre la configuration persistante d'un bouton configuré.
 * @param {string} actionId - L'ID unique du bouton (ex: "act_32m1z9")
 * @param {Object} config - Configuration complète de l'action du bouton
 */
function saveAction(actionId, config) {
  let data = {};
  try {
    if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[ActionStorage] Erreur de lecture, réinitialisation...', err);
  }

  data[actionId] = config;

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Récupère la configuration d'un bouton publié via son ID unique.
 * @param {string} actionId 
 * @returns {Object|null}
 */
function getAction(actionId) {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return data[actionId] || null;
  } catch {
    return null;
  }
}

module.exports = { saveAction, getAction };
