const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stat')
        .setDescription('Affiche vos statistiques d\'activité sur ce serveur.'),

    async execute(interaction, client) {
        const db = client.getDB();
        const userData = db.stats[interaction.user.id] || { messages: 0, voiceTime: 0 };

        const hours = Math.floor(userData.voiceTime / 3600);
        const minutes = Math.floor((userData.voiceTime % 3600) / 60);

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`📊 Vos Statistiques — ${interaction.user.username}`)
            .addFields(
                { name: '💬 Messages envoyés', value: `${userData.messages} messages`, inline: true },
                { name: '🔊 Temps passé en vocal', value: `${hours}h ${minutes}m`, inline: true }
            )
            .setFooter({ text: 'Les statistiques s\'actualisent en temps réel.' });

        await interaction.reply({ embeds: [embed] });
    }
};
