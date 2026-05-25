// commands/remove.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Supprimer les messages récents d’un membre et option ban/timeout (Owner only)')
    .addUserOption(o => o.setName('membre').setDescription('Membre à traiter').setRequired(true))
    .addBooleanOption(o => o.setName('ban').setDescription('Bannir après suppression').setRequired(false))
    .addIntegerOption(o => o.setName('timeout_minutes').setDescription('Timeout en minutes (0 = none)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Commande disponible uniquement en serveur.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Commande réservée au Owner du serveur.', ephemeral: true });

    const member = interaction.options.getMember('membre');
    const doBan = interaction.options.getBoolean('ban') || false;
    const timeoutMinutes = interaction.options.getInteger('timeout_minutes') || 0;

    if (!member) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });

    await interaction.reply({ content: 'Démarrage de la suppression (cela peut prendre du temps)…', ephemeral: true });

    // Parcourir les channels textuels et bulkDelete par batch (limite 14 jours)
    const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
    for (const [id, ch] of channels) {
      try {
        // fetch messages and filter by author
        const fetched = await ch.messages.fetch({ limit: 100 }).catch(() => null);
        if (!fetched) continue;
        const toDelete = fetched.filter(m => m.author && m.author.id === member.id);
        if (toDelete.size > 0) {
          // bulk delete only messages younger than 14 days
          const deletable = toDelete.filter(m => (Date.now() - m.createdTimestamp) < 14 * 24 * 3600 * 1000);
          if (deletable.size > 0) await ch.bulkDelete(deletable, true).catch(() => null);
        }
      } catch (e) { /* ignore per-channel errors */ }
    }

    // Timeout
    if (timeoutMinutes > 0) {
      const until = Date.now() + timeoutMinutes * 60 * 1000;
      await member.timeout(timeoutMinutes * 60 * 1000, `Action remove par Owner`).catch(() => null);
    }

    // Ban
    if (doBan) {
      await member.ban({ reason: 'Banni via commande remove par Owner' }).catch(() => null);
    }

    await interaction.followUp({ content: `Suppression terminée. Ban: ${doBan}. Timeout: ${timeoutMinutes} minutes.`, ephemeral: true });
  }
};
