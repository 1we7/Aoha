const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mp')
        .setDescription('Transmission d\'une notification textuelle privée par l\'intermédiaire du bot')
        .addUserOption(opt => opt.setName('user').setDescription('Destinataire de la notification').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('Contenu textuel brut').setRequired(true)),
        
    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const content = interaction.options.getString('message');

        try {
            await target.send(content);
            await interaction.reply({ content: `📥 Message envoyé avec succès aux correspondances privées de **${target.username}**.`, ephemeral: true });
        } catch {
            await interaction.reply({ content: `❌ Échec critique : L'utilisateur **${target.username}** restreint la réception de messages via ses paramètres de confidentialité.`, ephemeral: true });
        }
    }
};
