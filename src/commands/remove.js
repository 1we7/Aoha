const { SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Supprime les messages récents d\'un membre et permet de le sanctionner.')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre ciblé').setRequired(true))
        .addStringOption(opt => opt.setName('sanction').setDescription('Action complémentaire').addChoices(
            { name: 'Rien', value: 'none' },
            { name: 'Timeout 24h', value: 'timeout' },
            { name: 'Exclure (Kick)', value: 'kick' },
            { name: 'Bannir', value: 'ban' }
        ).setRequired(false)),

    async execute(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: "❌ Commande réservée à l'Owner.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        const target = interaction.options.getMember('membre');
        const action = interaction.options.getString('sanction') || 'none';

        if (!target) return interaction.editReply({ content: "Membre introuvable." });

        // ✅ CORRIGÉ : filtre les salons textuels avec ChannelType valide
        const textChannels = interaction.guild.channels.cache.filter(c =>
            c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement
        );

        let deletedCount = 0;

        for (const [_, channel] of textChannels) {
            try {
                const messages = await channel.messages.fetch({ limit: 100 });
                const userMessages = messages.filter(m => m.author.id === target.id);
                if (userMessages.size > 0) {
                    await channel.bulkDelete(userMessages, true);
                    deletedCount += userMessages.size;
                }
            } catch (e) {}
        }

        // Application de la sanction demandée
        let sanctionText = "Aucune sanction";
        try {
            if (action === 'timeout') {
                await target.timeout(24 * 60 * 60 * 1000, "Purge via /remove par l'Owner");
                sanctionText = "Timeout 24 heures";
            } else if (action === 'kick') {
                await target.kick("Purge via /remove par l'Owner");
                sanctionText = "Expulsion (Kick)";
            } else if (action === 'ban') {
                await target.ban({ reason: "Purge via /remove par l'Owner" });
                sanctionText = "Bannissement définitif";
            }
        } catch (e) {
            sanctionText = `Échec sanction : ${e.message}`;
        }

        await interaction.editReply({ content: `✅ Nettoyage terminé ! **${deletedCount}** messages supprimés.\n**Sanction appliquée :** ${sanctionText}` });
    }
};
