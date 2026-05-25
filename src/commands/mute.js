const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Met en sourdine (Timeout) un membre avec une précision chirurgicale (Owner ONLY).')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à exclure temporairement').setRequired(true))
        .addIntegerOption(opt => opt.setName('jours').setDescription('Nombre de jours').setRequired(false))
        .addIntegerOption(opt => opt.setName('heures').setDescription('Nombre d\'heures').setRequired(false))
        .addIntegerOption(opt => opt.setName('minutes').setDescription('Nombre de minutes').setRequired(false)),

    async execute(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: "❌ Réservé à l'Owner.", ephemeral: true });
        }
        const member = interaction.options.getMember('membre');
        if (!member) return interaction.reply({ content: "Membre introuvable.", ephemeral: true });

        const d = interaction.options.getInteger('jours') || 0;
        const h = interaction.options.getInteger('heures') || 0;
        const m = interaction.options.getInteger('minutes') || 0;

        const totalMs = ((d * 24 * 60) + (h * 60) + m) * 60 * 1000;
        if (totalMs <= 0) return interaction.reply({ content: "❌ Durée totale invalide ou égale à zéro.", ephemeral: true });

        await member.timeout(totalMs, "Mute appliqué par l'Owner.");
        await interaction.reply({ content: `🔇 **${member.user.username}** a été rendu muet pendant **${d}j ${h}h ${m}m**.` });
    }
};
