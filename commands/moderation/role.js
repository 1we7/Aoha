const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Configure la matrice d\'accès des rôles d\'administration (Staff)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => 
            opt.setName('action').setDescription('Action de modification').setRequired(true)
               .addChoices({ name: 'Ajouter', value: 'add' }, { name: 'Retirer', value: 'remove' })
        )
        .addRoleOption(opt => opt.setName('role').setDescription('Cible de la modification de privilège').setRequired(true)),
    
    async execute(interaction) {
        const action = interaction.options.getString('action');
        const role = interaction.options.getRole('role');

        if (action === 'add') {
            db.prepare('INSERT OR IGNORE INTO staff_roles (role_id) VALUES (?)').run(role.id);
            await interaction.reply({ content: `✅ Le rôle **${role.name}** est désormais validé comme modérateur/staff au niveau de la BDD.`, ephemeral: true });
        } else {
            db.prepare('DELETE FROM staff_roles WHERE role_id = ?').run(role.id);
            await interaction.reply({ content: `🗑️ Le rôle **${role.name}** a été révoqué des configurations staff de la BDD.`, ephemeral: true });
        }
    }
};
