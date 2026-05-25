// commands/mp.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mp')
    .setDescription('Envoyer un message privé anonyme à un membre')
    .addUserOption(opt => opt.setName('cible').setDescription('Membre à contacter').setRequired(true)),
  async execute(interaction) {
    // Ouvre un modal via interactionCreate handler (on 'interactionCreate' we will handle modal show)
    // We send a customId that encodes the target id and the author id
    const cible = interaction.options.getUser('cible');
    const customId = `mp_modal_open|${interaction.user.id}|${cible.id}`;

    // Show a modal by replying with a special payload: we cannot directly show modal from command file
    // So we reply with a follow-up that triggers the modal via client (handled in interactionCreate)
    await interaction.reply({
      content: 'Ouverture du formulaire privé…',
      ephemeral: true,
      fetchReply: true
    });

    // Emit a custom event so the global interactionCreate handler can show the modal
    // If your architecture doesn't support client.emit, you can directly build and show the modal here
    interaction.client.emit('showMpModal', { interaction, customId });
  }
};
