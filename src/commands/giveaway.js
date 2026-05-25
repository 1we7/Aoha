// commands/giveaway.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function parseDuration(str) {
  // simple parser: 1h, 30m, 1d
  const m = str.match(/^(\d+)(s|m|h|d)$/);
  if (!m) return null;
  const v = parseInt(m[1],10);
  const unit = m[2];
  let ms = 0;
  if (unit === 's') ms = v*1000;
  if (unit === 'm') ms = v*60*1000;
  if (unit === 'h') ms = v*3600*1000;
  if (unit === 'd') ms = v*24*3600*1000;
  return ms;
}

const giveaways = {}; // in-memory; pour persistance, remplace par fichier/BDD

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Créer un giveaway (Owner only)')
    .addStringOption(o => o.setName('lot').setDescription('Lot').setRequired(true))
    .addStringOption(o => o.setName('duree').setDescription('Durée ex: 1h, 1d').setRequired(true))
    .addIntegerOption(o => o.setName('gagnants').setDescription('Nombre de gagnants').setRequired(true)),

  async execute(interaction) {
    if (!interaction.guild) return interaction.reply({ content: 'Commande disponible uniquement en serveur.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Commande réservée au Owner du serveur.', ephemeral: true });

    const lot = interaction.options.getString('lot');
    const duree = interaction.options.getString('duree');
    const gagnants = interaction.options.getInteger('gagnants') || 1;

    const ms = parseDuration(duree);
    if (!ms) return interaction.reply({ content: 'Durée invalide. Exemple: 1h, 30m, 1d', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🎉 Giveaway')
      .setDescription(`${lot}\nTermine dans ${duree}\nGagnants: ${gagnants}`)
      .setColor('#00B894')
      .setTimestamp();

    const btn = new ButtonBuilder().setCustomId(`give_join|${Date.now()}`).setLabel('Participer (0)').setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(btn);

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // store giveaway
    const id = msg.id;
    giveaways[id] = { messageId: id, channelId: msg.channelId, lot, end: Date.now()+ms, participants: new Set(), gagnants };

    // schedule end
    setTimeout(async () => {
      const g = giveaways[id];
      if (!g) return;
      // pick winners
      const arr = Array.from(g.participants);
      const winners = [];
      for (let i=0;i<Math.min(g.gagnants, arr.length);i++) {
        const idx = Math.floor(Math.random()*arr.length);
        winners.push(arr.splice(idx,1)[0]);
      }
      // disable buttons
      try {
        const ch = await interaction.client.channels.fetch(g.channelId);
        const m = await ch.messages.fetch(g.messageId);
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('give_disabled').setLabel(`Participer (${g.participants.size})`).setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        await m.edit({ components: [disabledRow] });
        const resultText = winners.length ? winners.map(w => `<@${w}>`).join(', ') : 'Aucun participant';
        await ch.send({ content: `🎉 Giveaway terminé ! Gagnant(s): ${resultText}` });
      } catch (e) {}
      delete giveaways[id];
    }, ms);

    return;
  },

  async handleButton(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith('give_join|')) return false;
    const msgId = interaction.message.id;
    const g = giveaways[msgId];
    if (!g) return interaction.reply({ content: 'Giveaway introuvable ou terminé.', ephemeral: true });

    if (g.participants.has(interaction.user.id)) {
      g.participants.delete(interaction.user.id);
    } else {
      g.participants.add(interaction.user.id);
    }
    // update button label
    const newRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(interaction.customId).setLabel(`Participer (${g.participants.size})`).setStyle(ButtonStyle.Primary)
    );
    await interaction.update({ components: [newRow] }).catch(() => null);
    return true;
  }
};
