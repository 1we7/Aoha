const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Suppression de messages en masse (Salons textuels)')
        .addIntegerOption(opt => 
            opt.setName('nombre')
               .setDescription('Quantité de messages à supprimer (1-100)')
               .setRequired(true)
               .setMinValue(1)
               .setMaxValue(100)
        ),
        
    async execute(interaction) {
        const amount = interaction.options.getInteger('nombre');
        
        await interaction.channel.bulkDelete(amount, true)
            .then(messages => {
                interaction.reply({ content: `🧹 Opération nettoyée avec succès : **${messages.size}** messages purgés.`, ephemeral: true });
            })
            .catch(err => {
                interaction.reply({ content: "❌ Erreur critique lors de la tentative de suppression (les messages datant de plus de 14 jours ne peuvent être purgés mécaniquement).", ephemeral: true });
            });
    }
};
