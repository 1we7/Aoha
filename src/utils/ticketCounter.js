'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/ticket_counters.json');

/**
 * Returns the next ticket number for a given guild + prefix, then increments it.
 * Counter is persisted to disk so it survives bot restarts.
 * @param {string} guildId
 * @param {string} prefix  e.g. "ticket-"
 * @returns {string}  e.g. "ticket-042"
 */
function nextTicketName(guildId, prefix) {
  let data = {};

  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    // File doesn't exist yet — start fresh
  }

  const key = `${guildId}_${prefix}`;
  const count = (data[key] ?? 0) + 1;
  data[key] = count;

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  return `${prefix}${String(count).padStart(3, '0')}`;
}

module.exports = { nextTicketName };
