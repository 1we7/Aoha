const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Lance un concours avec inscription en temps réel par bouton.')
        .addStringOption(opt => opt.setName('lot').setDescription('Le prix à gagner').setRequired(true))
        .addStringOption(opt => opt.setName('duree').setDescription('Durée (ex: 10s, 5m, 2h, 1d)').setRequired(true))
        .addIntegerOption(opt => opt.setName('gagnants').setDescription('Nombre de gagnants').setRequired(true)),

    async execute(interaction, client) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: "❌ Commande réservée à l'Owner.", ephemeral: true });
        }

        const prize = interaction.options.getString('lot');
        const durationStr = interaction.options.getString('duree');
        const winnerCount = interaction.options.getInteger('gagnants');
        const duration = ms(durationStr);

        if (!duration) return interaction.reply({ content: "❌ Format de durée invalide (Utilise s, m, h, d).", ephemeral: true });

        await interaction.reply({ content: "Création du concours...", ephemeral: true });

        const giveawayId = Date.now().toString();
        const db = client.getDB();
        db.giveaways[giveawayId] = { prize, winnerCount, participants: [] };
        client.saveDB(db);

        const endTimestamp = Math.floor((Date.now() + duration) / 1000);
        const giveawayEmbed = new EmbedBuilder()
            .setColor('#ff007f')
            .setTitle(`🎉 GIVEAWAY : ${prize} 🎉`)
            .setDescription(`Cliquez sur le bouton ci-dessous pour participer !\n\n⏱️ **Fin du concours :** <t:${endTimestamp}:R>\n👥 **Nombre de gagnants :** ${winnerCount}`)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`giveaway_join_${giveawayId}`).setLabel('Participer (0)').setStyle(ButtonStyle.Primary)
        );

        const msg = await interaction.channel.send({ embeds: [giveawayEmbed], components: [row] });

        // Déclenchement automatique de la fin du chrono
        setTimeout(async () => {
            const currentDb = client.getDB();
            const gData = currentDb.giveaways[giveawayId];
            if (!gData) return;

            const participants = gData.participants;
            const winners = [];

            if (participants.length > 0) {
                const count = Math.min(participants.length, gData.winnerCount);
                for (let i = 0; i < count; i++) {
                    const index = Math.floor(Math.random() * participants.length);
                    winners.push(`<@${participants.splice(index, 1)[0]}>`);
                }
            }

            // On désactive le bouton de participation
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ended`).setLabel('Concours Terminé').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

            if (winners.length > 0) {
                await msg.edit({ content: `🎉 **Le concours est terminé !**`, components: [disabledRow] });
                await interaction.channel.send(`GG aux gagnants de **${gData.prize}** : ${winners.join(', ')} ! 🥳`);
            } else {
                await msg.edit({ content: `❌ **Giveaway annulé**, aucun participant inscrit.`, components: [disabledRow] });
            }

            delete currentDb.giveaways[giveawayId];
            client.saveDB(currentDb);
        }, duration);
    }
};
