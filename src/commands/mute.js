// commands/mute.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) un membre (Owner only)')
    .addUserOption(o => o.setName('membre').setDescription('Membre').setRequired(true))
    .addIntegerOption(o => o.setName('days').setDescription('Jours').setRequired(false))
    .addIntegerOption(o => o.setName('hours').setDescription('Heures').setRequired(false))
    .addIntegerOption(o => o.setName('minutes').setDescription('Minutes').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Raison').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Commande disponible uniquement en serveur.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Commande réservée au Owner du serveur.', ephemeral: true });

    const member = interaction.options.getMember('membre');
    if (!member) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });

    const days = interaction.options.getInteger('days') || 0;
    const hours = interaction.options.getInteger('hours') || 0;
    const minutes = interaction.options.getInteger('minutes') || 0;
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie';

    const ms = ((days*24 + hours)*60 + minutes) * 60 * 1000;
    if (ms <= 0) return interaction.reply({ content: 'Durée invalide.', ephemeral: true });

    await member.timeout(ms, reason).catch(() => null);
    await interaction.reply({ content: `${member.user.tag} mis en timeout pour ${days}j ${hours}h ${minutes}m.`, ephemeral: true });
  }
};
