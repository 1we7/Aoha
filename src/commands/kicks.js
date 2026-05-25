const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kicks')
        .setDescription('Expulse plusieurs personnes simultanément via IDs ou mentions (Owner ONLY).')
        .addStringOption(opt => opt.setName('targets').setDescription('IDs ou Mentions des cibles séparés par des espaces').setRequired(true))
        .addStringOption(opt => opt.setName('raison').setDescription('Raison du kick collectif').setRequired(false)),

    async execute(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: "❌ Réservé à l'Owner.", ephemeral: true });
        }
        const input = interaction.options.getString('targets');
        const reason = interaction.options.getString('raison') || 'Expulsion groupée par l\'Owner';

        // Extraction propre de tous les IDs valides (qu'ils soient entrés en mention ou en ID brut)
        const matches = input.match(/\d+/g) || [];
        if (matches.length === 0) return interaction.reply({ content: "❌ Aucun identifiant valide détecté.", ephemeral: true });

        await interaction.deferReply();
        let kicked = [];
        let failed = [];

        for (const id of matches) {
            try {
                const member = await interaction.guild.members.fetch(id);
                await member.kick(reason);
                kicked.push(member.user.username);
            } catch {
                failed.push(id);
            }
        }

        await interaction.editReply({ 
            content: `👢 **Rapport d'expulsion collective :**\n✅ Expulsés : ${kicked.join(', ') || 'Aucun'}\n❌ Échecs (Introuvables/Hiérarchie trop haute) : ${failed.join(', ') || 'Aucun'}` 
        });
    }
};
