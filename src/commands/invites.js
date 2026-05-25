// commands/invites.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Afficher les stats d’invitation d’un utilisateur (Owner only)')
    .addUserOption(o => o.setName('membre').setDescription('Membre (optionnel)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Commande disponible uniquement en serveur.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Commande réservée au Owner du serveur.', ephemeral: true });

    const target = interaction.options.getUser('membre') || interaction.user;
    const invites = await interaction.guild.invites.fetch().catch(() => null);
    if (!invites) return interaction.reply({ content: 'Impossible de récupérer les invites (permissions manquantes).', ephemeral: true });

    const userInvites = invites.filter(i => i.inviter && i.inviter.id === target.id);
    const total = userInvites.reduce((acc, i) => acc + (i.uses || 0), 0);

    const embed = new EmbedBuilder()
      .setTitle(`Statistiques d'invites pour ${target.tag}`)
      .addFields(
        { name: 'Total de personnes invitées', value: `${total}`, inline: true },
        { name: 'Liens actifs', value: `${userInvites.size}`, inline: true }
      )
      .setColor('#FFD166')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
