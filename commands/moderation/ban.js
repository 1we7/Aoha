const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Appliquer un bannissement temporaire restrictif')
        .addUserOption(opt => opt.setName('user').setDescription('Utilisateur ciblé').setRequired(true))
        .addStringOption(opt => opt.setName('durée').setDescription('Indice temporel : ex: 2j (jours), 5h (heures), 30m (minutes)').setRequired(true))
        .addStringOption(opt => opt.setName('raison').setDescription('Motif contextuel de la sanction')),
        
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('durée');
        const reason = interaction.options.getString('raison') || 'Aucun motif renseigné par le modérateur.';

        const match = durationStr.match(/^(\d+)([jhm])$/);
        if (!match) return interaction.reply({ content: '❌ Syntaxe temporelle invalide. Utilisez les suffixes structurels valides (ex: 2j, 5h, 30m).', ephemeral: true });

        const val = parseInt(match[1]);
        const unit = match[2];
        let ms = 0;
        
        if (unit === 'j') ms = val * 24 * 60 * 60 * 1000;
        else if (unit === 'h') ms = val * 60 * 60 * 1000;
        else if (unit === 'm') ms = val * 60 * 1000;

        const expiresAt = Date.now() + ms;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member && !member.bannable) {
            return interaction.reply({ content: `❌ Permissions insuffisantes : impossible d'appliquer l'exclusion sur l'utilisateur ${user.username}.`, ephemeral: true });
        }

        await interaction.guild.members.ban(user.id, { reason });
        
        db.prepare('INSERT INTO temp_bans (user_id, guild_id, expires_at) VALUES (?, ?, ?)')
          .run(user.id, interaction.guild.id, expiresAt);

        await interaction.reply({ content: `🔨 **${user.username}** a été banni de la structure pour une durée de **${durationStr}**. Raison : *${reason}*` });
    }
};
