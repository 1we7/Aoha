const { Events, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;

        // Enregistrement / Incrémentation du compteur textuel global
        db.prepare(`
            INSERT INTO stats (user_id, messages) 
            VALUES (?, 1) 
            ON CONFLICT(user_id) DO UPDATE SET messages = messages + 1
        `).run(message.author.id);

        const content = message.content.trim().toLowerCase();
        
        // Déclencheurs textuels directs requis : s?u ou stat
        if (content.startsWith('s?u') || content.startsWith('stat')) {
            const targetUser = message.mentions.users.first() || message.author;
            const userStats = db.prepare('SELECT * FROM stats WHERE user_id = ?').get(targetUser.id) || { messages: 0, voice_time: 0, invites: 0 };
            
            let totalSeconds = Math.floor(userStats.voice_time / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;
            const minutes = Math.floor(totalSeconds / 60);

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: `Statistiques d'activité de ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
                .addFields(
                    { name: '💬 Messages envoyés', value: `\`${userStats.messages}\``, inline: true },
                    { name: '🎙️ Session Vocal', value: `\`${hours}h ${minutes}m\``, inline: true },
                    { name: '🔗 Membres invités', value: `\`${userStats.invites}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Aoha Analytics Sync' });

            await message.reply({ embeds: [embed] });
        }
    },
};
