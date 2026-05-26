const { Events } = require('discord.js');
const db = require('../database');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const guild = member.guild;
        const cachedInvites = client.invitesCache.get(guild.id);
        if (!cachedInvites) return;

        try {
            const currentInvites = await guild.invites.fetch();
            for (const [code, invite] of currentInvites) {
                const previousUses = cachedInvites.get(code);
                if (previousUses !== undefined && invite.uses > previousUses) {
                    cachedInvites.set(code, invite.uses);
                    
                    if (invite.inviter) {
                        db.prepare(`
                            INSERT INTO stats (user_id, invites) 
                            VALUES (?, 1) 
                            ON CONFLICT(user_id) DO UPDATE SET invites = invites + 1
                        `).run(invite.inviter.id);
                    }
                    break;
                }
            }
        } catch (err) {
            console.error("Erreur d'analyse de l'invitation utilisée :", err);
        }
    },
};
