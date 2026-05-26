const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Interface visuelle interactive avancée de création d\'embeds (V2 Components)'),
    
    async execute(interaction) {
        let currentEmbed = new EmbedBuilder().setDescription("Description par défaut à configurer");
        let customButtonsData = []; // Stockage local temporaire de la configuration des boutons
        
        const generatePreviewComponents = () => {
            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('edit_menu')
                    .setPlaceholder('Sélectionnez un composant visuel à modifier')
                    .addOptions([
                        { label: 'Titre principal', value: 'title', emoji: '📝' },
                        { label: 'Corps de texte / Description', value: 'desc', emoji: '📄' },
                        { label: 'Code Couleur Hexadécimal', value: 'color', emoji: '🎨' }
                    ])
            );

            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('add_btn').setLabel('➕ Ajouter un composant d\'interaction').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('publish').setLabel('🚀 Publier l\'embed définitif').setStyle(ButtonStyle.Primary)
            );
            return [selectMenu, controlRow];
        };

        const response = await interaction.reply({ 
            content: "🛠️ **Console d'ingénierie d'Embed Interactif**\nGérez le rendu en temps réel via l'interface ci-dessous :", 
            embeds: [currentEmbed], 
            components: generatePreviewComponents(),
            ephemeral: true 
        });

        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'edit_menu') {
                const choice = i.values[0];
                const modal = new ModalBuilder().setCustomId(`modal_${choice}`).setTitle(`Éditeur de valeur : ${choice}`);
                const input = new TextInputBuilder()
                    .setCustomId('value')
                    .setLabel('Saisie de la donnée')
                    .setStyle(choice === 'desc' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                    .setRequired(true);
                
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await i.showModal(modal);

                try {
                    const submit = await i.awaitModalSubmit({ time: 60000, filter: m => m.customId === `modal_${choice}` });
                    const val = submit.fields.getTextInputValue('value');
                    
                    if (choice === 'title') currentEmbed.setTitle(val);
                    if (choice === 'desc') currentEmbed.setDescription(val);
                    if (choice === 'color') currentEmbed.setColor(val.startsWith('#') ? val : `#${val}`);
                    
                    await submit.update({ embeds: [currentEmbed], components: generatePreviewComponents() });
                } catch {}
            }

            else if (i.customId === 'add_btn') {
                const modal = new ModalBuilder().setCustomId('modal_btn').setTitle('Configuration du composant');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Label visible du bouton').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('type').setLabel('Action (link / mp / eph / ticket)').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('data').setLabel('Contenu de l\'action (URL ou Texte)').setStyle(TextInputStyle.Short).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('align').setLabel('Alignement graphique (left / center / right)').setStyle(TextInputStyle.Short).setRequired(true))
                );
                await i.showModal(modal);

                try {
                    const submit = await i.awaitModalSubmit({ time: 120000 });
                    const btnConfig = {
                        id: `btn_${Date.now()}`,
                        label: submit.fields.getTextInputValue('label'),
                        type: submit.fields.getTextInputValue('type').toLowerCase().trim(),
                        data: submit.fields.getTextInputValue('data'),
                        align: submit.fields.getTextInputValue('align').toLowerCase().trim()
                    };
                    customButtonsData.push(btnConfig);
                    await submit.update({ content: `⚡ File de composants mise à jour : (${customButtonsData.length}/5 boutons configurés)`, embeds: [currentEmbed] });
                } catch {}
            }

            else if (i.customId === 'publish') {
                let finalComponents = [];
                
                // Alignement millimétré et strict respect des contraintes de l'API Layouts Discord
                for (const btn of customButtonsData) {
                    const row = new ActionRowBuilder();
                    const actualBtn = new ButtonBuilder().setLabel(btn.label);
                    
                    if (btn.type === 'link') {
                        actualBtn.setStyle(ButtonStyle.Link).setURL(btn.data);
                    } else {
                        actualBtn.setStyle(ButtonStyle.Secondary).setCustomId(btn.id);
                        const mapType = btn.type === 'eph' ? 'ephemeral' : btn.type;
                        db.prepare('INSERT INTO custom_buttons (custom_id, action_type, action_data, guild_id) VALUES (?, ?, ?, ?)').run(btn.id, mapType, btn.data, interaction.guild.id);
                    }

                    // Bouton invisible désactivé pour forcer des espaces vides de positionnement
                    const spacer = new ButtonBuilder().setCustomId(`sp_${Math.random()}`).setLabel('\u200b').setStyle(ButtonStyle.Secondary).setDisabled(true);

                    if (btn.align === 'center') row.addComponents(spacer, spacer, actualBtn, spacer, spacer);
                    else if (btn.align === 'right') row.addComponents(spacer, spacer, spacer, spacer, actualBtn);
                    else row.addComponents(actualBtn);

                    finalComponents.push(row);
                }

                await interaction.channel.send({ embeds: [currentEmbed], components: finalComponents });
                await i.update({ content: "✨ L'embed et sa structure de composants ont été publiés de manière définitive.", components: [], embeds: [] });
                collector.stop();
            }
        });
    }
};
