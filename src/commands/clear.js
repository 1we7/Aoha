const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime massivement les messages du salon courant.')
        .addStringOption(opt => opt.setName('quantite').setDescription('Nombre de messages (1-9999) ou le mot "all"').setRequired(true)),

    async execute(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: "❌ Commande réservée à l'Owner.", ephemeral: true });
        }

        const input = interaction.options.getString('quantite');
        await interaction.deferReply({ ephemeral: true });

        if (input.toLowerCase() === 'all') {
            let totalDeleted = 0;
            let fetched;
            do {
                fetched = await interaction.channel.messages.fetch({ limit: 100 });
                // Filtre les messages de moins de 14 jours (limite stricte API Discord)
                const deletable = fetched.filter(m => (Date.now() - m.createdTimestamp) < 1209600000);
                if (deletable.size === 0) break;
                await interaction.channel.bulkDelete(deletable, true);
                totalDeleted += deletable.size;
            } while (fetched.size >= 100 && totalDeleted < 500); // Protection pour éviter le spam API rate limit

            return interaction.editReply({ content: `🧹 Le salon a été vidé ! (**${totalDeleted}** messages récents purgés).` });
        }

        const amount = parseInt(input);
        if (isNaN(amount) || amount < 1 || amount > 9999) {
            return interaction.editReply({ content: "❌ Quantité invalide. Indique un nombre entre 1 et 9999 ou tape 'all'." });
        }

        // Discord limite bulkDelete à 100 messages par appel
        let remaining = amount;
        let totalPurged = 0;

        while (remaining > 0) {
            const deleteBatch = Math.min(remaining, 100);
            const fetched = await interaction.channel.messages.fetch({ limit: deleteBatch });
            const deletable = fetched.filter(m => (Date.now() - m.createdTimestamp) < 1209600000);
            
            if (deletable.size === 0) break;
            await interaction.channel.bulkDelete(deletable, true);
            totalPurged += deletable.size;
            remaining -= deleteBatch;
            if (fetched.size < deleteBatch) break;
        }

        await interaction.editReply({ content: `🧹 **${totalPurged}** messages ont été effacés avec succès.` });
    }
};
