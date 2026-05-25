const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Affiche le nombre de personnes recrutées par un membre.')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à analyser').setRequired(true)),

    async execute(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: "❌ Commande réservée à l'Owner.", ephemeral: true });
        }

        const target = interaction.options.getUser('membre');
        const invites = await interaction.guild.invites.fetch();
        const userInvites = invites.filter(i => i.inviter && i.inviter.id === target.id);

        let totalUses = 0;
        userInvites.forEach(invite => totalUses += invite.uses);

        const inviteEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`📨 Statistiques d'invitation de ${target.username}`)
            .setDescription(`<@${target.id}> a fait rejoindre un total de **${totalUses}** membres via ses liens personnalisés.`);

        await interaction.reply({ embeds: [inviteEmbed] });
    }
};
