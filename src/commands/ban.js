// commands/ban.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre (Owner only)')
    .addUserOption(o => o.setName('membre').setDescription('Membre').setRequired(true))
    .addIntegerOption(o => o.setName('days').setDescription('Jours (pour prune)').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Raison').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Commande disponible uniquement en serveur.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Commande réservée au Owner du serveur.', ephemeral: true });

    const user = interaction.options.getUser('membre');
    const days = interaction.options.getInteger('days') || 0;
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });

    await member.ban({ days, reason }).catch(err => { console.error(err); });
    await interaction.reply({ content: `${user.tag} banni.`, ephemeral: true });
  }
};
