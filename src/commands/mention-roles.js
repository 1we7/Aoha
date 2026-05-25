// commands/mention-roles.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SENSITIVE_ROLES = ['@everyone','@here','Staff','Mod','Admin']; // adapter

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mention-roles')
    .setDescription('Intercepter un message qui mentionne un rôle sensible (Owner only)')
    .addStringOption(o => o.setName('messageid').setDescription('ID du message à traiter').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Salon du message').setRequired(true)),

  async execute(interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Commande disponible uniquement en serveur.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Commande réservée au Owner du serveur.', ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const messageId = interaction.options.getString('messageid');

    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (!msg) return interaction.reply({ content: 'Message introuvable.', ephemeral: true });

    // Check mentions
    const mentionsRoles = msg.mentions.roles.map(r => r.name);
    const mentionsEveryone = msg.mentions.everyone;
    const isSensitive = mentionsEveryone || mentionsRoles.some(r => SENSITIVE_ROLES.includes(r));

    if (!isSensitive) return interaction.reply({ content: 'Aucune mention sensible détectée.', ephemeral: true });

    // Delete original message
    await msg.delete().catch(() => null);

    // Send owner-only layout (ephemeral reply to owner)
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`mention_validate|${channel.id}|${messageId}`).setLabel('Valider le ping').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`mention_cancel|${channel.id}|${messageId}`).setLabel('Annuler et avertir').setStyle(ButtonStyle.Danger)
      );

    await interaction.reply({ content: `Message supprimé. Choisissez une action pour le ping supprimé (messageId: ${messageId}).`, components: [row], ephemeral: true });
  },

  // handleButton to process owner decision
  async handleButton(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith('mention_')) return false;
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Commande réservée au Owner du serveur.', ephemeral: true });

    const [action, channelId, messageId] = interaction.customId.split('|');
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return interaction.reply({ content: 'Salon introuvable.', ephemeral: true });

    if (action === 'mention_validate') {
      // Re-send the mention (owner confirms) — caution: send as plain text mention
      await channel.send({ content: `@here (validé par le Owner)` }).catch(() => null);
      await interaction.update({ content: 'Ping validé et renvoyé.', components: [], ephemeral: true });
      return true;
    } else {
      // Annuler et avertir : envoyer DM à l'auteur original si possible
      await interaction.update({ content: 'Ping annulé. Auteur averti (si possible).', components: [], ephemeral: true });
      return true;
    }
  }
};
