const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un membre du serveur')
        .addUserOption(opt => opt.setName('cible').setDescription('Le membre à bannir').setRequired(true))
        .addStringOption(opt => opt.setName('raison').setDescription('La raison du ban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('cible');
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
        if (!target.bannable) return interaction.reply({ content: 'Je ne peux pas bannir ce membre (permissions insuffisantes ou rôle trop haut).', ephemeral: true });

        await target.ban({ reason });
        await interaction.reply(`🔨 **${target.user.tag}** a été banni. Raison : ${reason}`);
    }
};
