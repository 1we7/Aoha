const { PermissionFlagsBits } = require('discord.js');
const db = require('../database');

/**
 * Vérifie si le membre est Administrateur ou s'il possède un rôle enregistré comme Staff en BDD.
 */
function isStaff(member) {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    
    const staffRoles = db.prepare('SELECT role_id FROM staff_roles').all();
    const roleIds = staffRoles.map(r => r.role_id);
    
    return member.roles.cache.some(role => roleIds.includes(role.id));
}

module.exports = { isStaff };
