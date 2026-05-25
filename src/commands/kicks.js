// commands/kicks.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kicks')
    .setDescription('Expulser plusieurs membres (Owner only)')
    .addStringOption(o => o.setName('ids').setDescription('Liste d\'IDs ou mentions séparées par des espaces').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Raison').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Commande disponible uniquement en serveur.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Commande réservée au Owner du serveur.', ephemeral: true });

    const idsRaw = interaction.options.getString('ids');
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie';
    const ids = idsRaw.split(/\s+/).map(s => s.replace(/[<@!>]/g,'')).filter(Boolean);

    const results = [];
    for (const id of ids) {
      const member = await interaction.guild.members.fetch(id).catch(() => null);
      if (!member) { results.push(`${id}: introuvable`); continue; }
      await member.kick(reason).catch(() => { results.push(`${id}: échec`); return; });
      results.push(`${id}: expulsé`);
    }

    await interaction.reply({ content: `Résultats:\n${results.join('\n')}`, ephemeral: true });
  }
};
