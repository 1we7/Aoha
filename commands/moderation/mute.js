const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Rendre muet nativement un utilisateur via la technologie Timeout')
        .addUserOption(opt => opt.setName('user').setDescription('Utilisateur à restreindre').setRequired(true))
        .addStringOption(opt => opt.setName('durée').setDescription('Syntaxe temporelle : ex: 30m, 2h, 1j').setRequired(true))
        .addStringOption(opt => opt.setName('raison').setDescription('Motif de l\'exclusion de parole')),
        
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('durée');
        const reason = interaction.options.getString('raison') || 'Aucun motif renseigné.';

        const match = durationStr.match(/^(\d+)([jhm])$/);
        if (!match) return interaction.reply({ content: '❌ Syntaxe de la durée erronée. Utilisez par exemple : 30m, 2h ou 1j.', ephemeral: true });

        const val = parseInt(match[1]);
        const unit = match[2];
        let ms = 0;
        
        if (unit === 'j') ms = val * 24 * 60 * 60 * 1000;
        else if (unit === 'h') ms = val * 60 * 60 * 1000;
        else if (unit === 'm') ms = val * 60 * 1000;

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: "❌ Cet utilisateur n'est pas présent sur ce serveur.", ephemeral: true });
        
        if (!member.moderatable) {
            return interaction.reply({ content: "❌ Impossible d'isoler cet utilisateur (Hiérarchie de rôles ou privilèges manquants).", ephemeral: true });
        }

        await member.timeout(ms, reason);
        await interaction.reply({ content: `🤫 **${user.username}** a été mis en sourdine pendant **${durationStr}**. Raison : *${reason}*` });
    }
};
