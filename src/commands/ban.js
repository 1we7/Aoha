const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannit un membre du serveur (Owner ONLY).')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à bannir').setRequired(true))
        .addIntegerOption(opt => opt.setName('jours').setDescription('Jours à purger').setRequired(false))
        .addStringOption(opt => opt.setName('raison').setDescription('Raison du ban').setRequired(false)),

    async execute(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: "❌ Réservé à l'Owner.", ephemeral: true });
        }
        const user = interaction.options.getUser('membre');
        const days = interaction.options.getInteger('jours') || 0;
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        await interaction.guild.members.ban(user, { deleteMessageSeconds: days * 86400, reason });
        await interaction.reply({ content: `🔨 **${user.username}** a été banni définitivement du serveur.\n**Raison :** ${reason}` });
    }
};
