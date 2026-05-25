const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mp')
        .setDescription('Ouvre un formulaire de message privé 100% anonyme.')
        .addUserOption(opt => opt.setName('cible').setDescription('Le membre destinataire').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('cible');
        if (target.id === interaction.user.id || target.bot) {
            return interaction.reply({ content: "❌ Envoi impossible à toi-même ou à un bot.", ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId(`mp_modal_${target.id}`).setTitle('Message Anonyme');
        const input = new TextInputBuilder()
            .setCustomId('mp_text_input')
            .setLabel('Message')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Lettres, chiffres et ponctuation simple autorisés uniquement...')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
};
