const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const { isStaff } = require('../utils/permissions');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // Isolation de la double vérification sur l'infrastructure sensible
            const sensitiveCommands = ['clear', 'kicks', 'ban', 'mute', 'embed'];
            if (sensitiveCommands.includes(interaction.commandName)) {
                if (!isStaff(interaction.member)) {
                    return interaction.reply({ 
                        content: "❌ Accès refusé. Cette action nécessite le statut d'Administrateur ou un rôle répertorié comme Staff.", 
                        ephemeral: true 
                    });
                }
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Une exception interne a bloqué l\'exécution de la commande.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Une exception interne a bloqué l\'exécution de la commande.', ephemeral: true });
                }
            }
        } 
        
        // Routage et gestion dynamique des composants d'embeds personnalisés
        else if (interaction.isButton()) {
            const customBtn = db.prepare('SELECT * FROM custom_buttons WHERE custom_id = ?').get(interaction.customId);
            if (!customBtn) return;

            if (customBtn.action_type === 'mp') {
                try {
                    await interaction.user.send(customBtn.action_data);
                    await interaction.reply({ content: "Notification transmise en message privé.", ephemeral: true });
                } catch {
                    await interaction.reply({ content: "Échec de l'envoi : vos messages privés semblent inaccessibles.", ephemeral: true });
                }
            } else if (customBtn.action_type === 'ephemeral') {
                await interaction.reply({ content: customBtn.action_data, ephemeral: true });
            } else if (customBtn.action_type === 'ticket') {
                const staffRoles = db.prepare('SELECT role_id FROM staff_roles').all().map(r => r.role_id);
                const permissionOverwrites = [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ];
                
                for (const roleId of staffRoles) {
                    permissionOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                }

                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: permissionOverwrites
                });
                await interaction.reply({ content: `Votre ticket d'assistance a été initialisé ici : ${ticketChannel}`, ephemeral: true });
            }
        }
    },
};
