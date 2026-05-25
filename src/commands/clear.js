// commands/clear.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprimer des messages (Owner only)')
    .addStringOption(o => o.setName('amount').setDescription('Nombre ou "all"').setRequired(true)),

  async execute(interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Commande disponible uniquement en serveur.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Commande réservée au Owner du serveur.', ephemeral: true });

    const amountRaw = interaction.options.getString('amount');
    if (!interaction.channel.isTextBased()) return interaction.reply({ content: 'Salon non textuel.', ephemeral: true });

    if (amountRaw.toLowerCase() === 'all') {
      // fetch and bulk delete in batches
      await interaction.reply({ content: 'Vider le salon (opération en cours)…', ephemeral: true });
      let fetched;
      do {
        fetched = await interaction.channel.messages.fetch({ limit: 100 });
        const deletable = fetched.filter(m => (Date.now() - m.createdTimestamp) < 14*24*3600*1000);
        if (deletable.size > 0) await interaction.channel.bulkDelete(deletable, true).catch(() => null);
      } while (fetched.size >= 2);
      return interaction.followUp({ content: 'Salon vidé (dans la limite de l’API).', ephemeral: true });
    } else {
      const n = parseInt(amountRaw, 10);
      if (isNaN(n) || n < 1 || n > 9999) return interaction.reply({ content: 'Nombre invalide (1-9999).', ephemeral: true });
      // bulkDelete max 100 at once; loop
      let remaining = n;
      while (remaining > 0) {
        const toFetch = Math.min(100, remaining);
        const fetched = await interaction.channel.messages.fetch({ limit: toFetch }).catch(() => null);
        if (!fetched || fetched.size === 0) break;
        const deletable = fetched.filter(m => (Date.now() - m.createdTimestamp) < 14*24*3600*1000);
        if (deletable.size > 0) await interaction.channel.bulkDelete(deletable, true).catch(() => null);
        remaining -= fetched.size;
      }
      return interaction.reply({ content: `Suppression demandée: ${n} messages (opération terminée).`, ephemeral: true });
    }
  }
};
