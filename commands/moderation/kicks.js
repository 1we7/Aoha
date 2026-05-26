const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kicks')
        .setDescription('Exécuter un bannissement collectif simultané (Jusqu\'à 5 cibles)')
        .addUserOption(opt => opt.setName('user1').setDescription('Cible n°1').setRequired(true))
        .addUserOption(opt => opt.setName('user2').setDescription('Cible n°2 (Optionnel)'))
        .addUserOption(opt => opt.setName('user3').setDescription('Cible n°3 (Optionnel)'))
        .addUserOption(opt => opt.setName('user4').setDescription('Cible n°4 (Optionnel)'))
        .addUserOption(opt => opt.setName('user5').setDescription('Cible n°5 (Optionnel)')),
        
    async execute(interaction) {
        await interaction.deferReply();
        const users = [
            interaction.options.getUser('user1'), interaction.options.getUser('user2'),
            interaction.options.getUser('user3'), interaction.options.getUser('user4'),
            interaction.options.getUser('user5')
        ].filter(u => u !== null);

        let success = [];
        let fails = [];

        for (const user of users) {
            try {
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member || !member.bannable) {
                    fails.push(`${user.username} (Permissions insuffisantes / Hors de portée)`);
                    continue;
                }
                await member.ban({ reason: `Exécution groupée initiée par ${interaction.user.tag}` });
                success.push(user.username);
            } catch {
                fails.push(`${user.username} (Exception système)`);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle("🛑 Rapport de bannissement collectif")
            .setColor(success.length > 0 ? '#d32f2f' : '#fbc02d')
            .addFields(
                { name: `Validés (${success.length})`, value: success.length ? success.map(s => `• ${s}`).join('\n') : '*Aucun*', inline: true },
                { name: `Échecs (${fails.length})`, value: fails.length ? fails.map(f => `• ${f}`).join('\n') : '*Aucun*', inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
