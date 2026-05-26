const { Events } = require('discord.js');
const db = require('../database');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Statut opérationnel : Connecté sur le compte ${client.user.tag}`);

        // Cache des invitations pour tracker les arrivées
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (guild) {
            try {
                const invites = await guild.invites.fetch();
                client.invitesCache.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
            } catch (err) {
                console.error("Échec lors de la mise en cache des invitations.");
            }
        }

        // Tâche automatisée (Verification des bans temporaires expirés)
        setInterval(async () => {
            const now = Date.now();
            const expiredBans = db.prepare('SELECT * FROM temp_bans WHERE expires_at <= ?').all(now);
            
            for (const ban of expiredBans) {
                const guildBan = client.guilds.cache.get(ban.guild_id);
                if (guildBan) {
                    try {
                        await guildBan.members.unban(ban.user_id, 'Fin de la période de bannissement temporaire.');
                    } catch (e) {
                        console.error(`Erreur unban auto [${ban.user_id}]: ${e.message}`);
                    }
                }
                db.prepare('DELETE FROM temp_bans WHERE user_id = ? AND guild_id = ?').run(ban.user_id, ban.guild_id);
            }
        }, 60000);
    },
};
