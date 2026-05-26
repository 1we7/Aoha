const { Events } = require('discord.js');
const db = require('../database');

module.exports = {
    name: Events.VoiceStateUpdate,
    execute(oldState, newState, client) {
        if (newState.member.user.bot) return;
        const userId = newState.member.id;

        // Entrée en salon vocal
        if (!oldState.channelId && newState.channelId) {
            client.voiceJoinTimes.set(userId, Date.now());
        }
        // Sortie définitive du vocal
        else if (oldState.channelId && !newState.channelId) {
            const joinTime = client.voiceJoinTimes.get(userId);
            if (joinTime) {
                const duration = Date.now() - joinTime;
                client.voiceJoinTimes.delete(userId);

                db.prepare(`
                    INSERT INTO stats (user_id, voice_time) 
                    VALUES (?, ?) 
                    ON CONFLICT(user_id) DO UPDATE SET voice_time = voice_time + ?
                `).run(userId, duration, duration);
            }
        }
    },
};
