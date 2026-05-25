const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

// __dirname = .../src/commands  →  ../../ = racine du projet
const DATA_PATH = path.join(__dirname, '../../embed_data.json');

function readData() {
    if (!fs.existsSync(DATA_PATH))
        fs.writeFileSync(DATA_PATH, JSON.stringify({ templates: {}, active_sandwiches: {} }, null, 2));
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}
function saveData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

const activeBuilders = new Map();

function createDefaultConfig() {
    return {
        top:    { title: 'Gestion des tickets', description: 'Sélectionnez une catégorie pour ouvrir un ticket.', color: '#e67e22', thumbnail: '' },
        middle: { content: 'Cliquez sur un bouton ci-dessous :', buttons: [] },
        bottom: { footerText: 'Aoha Framework', footerIcon: '', image: '', timestamp: true },
        isEditing:      false,
        targetPackData: null
    };
}

async function sendDashboard(interaction, config, messageTitle = 'Configuration de votre Embed Sandwich') {
    const embed = new EmbedBuilder()
        .setTitle(`🛠️ ${messageTitle}`)
        .setDescription('Configurez chaque section via les boutons ci-dessous avant le déploiement.')
        .setColor('#2f3136')
        .addFields(
            { name: '🔼 Embed Haut',            value: `**Titre :** ${config.top.title || '*Aucun*'}\n**Couleur :** ${config.top.color}`,  inline: true },
            { name: '🥪 Milieu (Texte & Boutons)', value: `**Boutons :** ${config.middle.buttons.length}/5`, inline: true },
            { name: '🔽 Embed Bas',             value: `**Footer :** ${config.bottom.footerText || '*Aucun*'}\n**Image :** ${config.bottom.image ? '✅' : '❌'}`, inline: true }
        );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sw_edit_top').setLabel('Modifier Haut 🔼').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('sw_edit_middle').setLabel('Modifier Milieu 🥪').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('sw_edit_bottom').setLabel('Modifier Bas 🔽').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('sw_manage_buttons').setLabel(`Boutons (${config.middle.buttons.length}/5)`).setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sw_preview').setLabel('Aperçu 👀').setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(config.isEditing ? 'sw_deploy_edit' : 'sw_deploy')
            .setLabel(config.isEditing ? 'Mettre à jour 💾' : 'Déployer 🚀')
            .setStyle(ButtonStyle.Danger)
    );

    // Après un modal submit, l'interaction n'est ni replied ni deferred → reply classique
    // Après un bouton sw_reset_buttons etc, pareil
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    } else {
        await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }
}

function buildSandwichPayloads(config) {
    const embedTop = new EmbedBuilder()
        .setTitle(config.top.title)
        .setDescription(config.top.description)
        .setColor(config.top.color);
    if (config.top.thumbnail && config.top.thumbnail.startsWith('http'))
        embedTop.setThumbnail(config.top.thumbnail);

    const middlePayload = { content: config.middle.content };
    if (config.middle.buttons.length > 0) {
        const actionRow = new ActionRowBuilder();
        config.middle.buttons.forEach(btn =>
            actionRow.addComponents(
                new ButtonBuilder().setCustomId(btn.customId).setLabel(btn.label).setStyle(btn.style)
            )
        );
        middlePayload.components = [actionRow];
    }

    const embedBottom = new EmbedBuilder().setColor(config.top.color);
    if (config.bottom.footerText)
        embedBottom.setFooter({
            text: config.bottom.footerText,
            iconURL: config.bottom.footerIcon?.startsWith('http') ? config.bottom.footerIcon : undefined
        });
    if (config.bottom.image?.startsWith('http'))  embedBottom.setImage(config.bottom.image);
    if (config.bottom.timestamp)                   embedBottom.setTimestamp();

    return [{ embeds: [embedTop] }, middlePayload, { embeds: [embedBottom] }];
}

// ── Export principal ─────────────────────────────────────────────────────────
module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Système avancé d\'embeds en Sandwich')
        .addSubcommand(s => s.setName('create').setDescription('Ouvrir le panneau de création'))
        .addSubcommand(s => s.setName('edit')
            .setDescription('Modifier un pack existant')
            .addStringOption(o => o.setName('message_id').setDescription('ID d\'un message du pack').setRequired(true)))
        .addSubcommand(s => s.setName('save')
            .setDescription('Sauvegarder en template')
            .addStringOption(o => o.setName('nom').setDescription('Nom du template').setRequired(true)))
        .addSubcommand(s => s.setName('load')
            .setDescription('Charger un template')
            .addStringOption(o => o.setName('nom').setDescription('Nom du template').setRequired(true))),

    async execute(interaction) {
        if (interaction.user.id !== interaction.guild.ownerId)
            return interaction.reply({ content: '❌ Seul le propriétaire du serveur peut utiliser cette commande.', ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const data       = readData();

        if (!activeBuilders.has(interaction.user.id))
            activeBuilders.set(interaction.user.id, createDefaultConfig());
        const currentConfig = activeBuilders.get(interaction.user.id);

        if (subcommand === 'create') return sendDashboard(interaction, currentConfig);

        if (subcommand === 'edit') {
            const targetId   = interaction.options.getString('message_id');
            const targetPack = Object.values(data.active_sandwiches).find(p =>
                p.topId === targetId || p.middleId === targetId || p.bottomId === targetId
            );
            if (!targetPack)
                return interaction.reply({ content: '❌ Aucun pack trouvé avec cet ID.', ephemeral: true });
            const editConfig = JSON.parse(JSON.stringify(targetPack.config));
            editConfig.isEditing      = true;
            editConfig.targetPackData = targetPack;
            activeBuilders.set(interaction.user.id, editConfig);
            return sendDashboard(interaction, editConfig, 'Mode Édition Live');
        }

        if (subcommand === 'save') {
            const name = interaction.options.getString('nom').toLowerCase();
            data.templates[name] = currentConfig;
            saveData(data);
            return interaction.reply({ content: `💾 Template \`${name}\` sauvegardé !`, ephemeral: true });
        }

        if (subcommand === 'load') {
            const name = interaction.options.getString('nom').toLowerCase();
            if (!data.templates[name])
                return interaction.reply({ content: `❌ Template \`${name}\` introuvable.`, ephemeral: true });
            activeBuilders.set(interaction.user.id, JSON.parse(JSON.stringify(data.templates[name])));
            return interaction.reply({ content: `🔄 Template \`${name}\` chargé. Lance \`/embed create\` pour le voir.`, ephemeral: true });
        }
    }
};

// ── Handler boutons/modals sw_* ──────────────────────────────────────────────
module.exports.handleInteraction = async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('sw_')) return;

    if (interaction.user.id !== interaction.guild.ownerId)
        return interaction.reply({ content: '❌ Seul l\'Owner peut utiliser ce panneau.', ephemeral: true });

    const currentConfig = activeBuilders.get(interaction.user.id) || createDefaultConfig();

    try {
        // ── BOUTONS ──────────────────────────────────────────────────────────
        if (interaction.isButton()) {

            if (interaction.customId === 'sw_edit_top') {
                const modal = new ModalBuilder().setCustomId('sw_modal_top').setTitle('Éditer l\'Embed Supérieur');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Titre').setStyle(TextInputStyle.Short).setValue(currentConfig.top.title).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setValue(currentConfig.top.description).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Couleur hex (ex: #e67e22)').setStyle(TextInputStyle.Short).setValue(currentConfig.top.color).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('thumbnail').setLabel('URL Miniature (optionnel)').setStyle(TextInputStyle.Short).setValue(currentConfig.top.thumbnail).setRequired(false))
                );
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'sw_edit_middle') {
                const modal = new ModalBuilder().setCustomId('sw_modal_middle').setTitle('Éditer le Message Central');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('content').setLabel('Contenu textuel').setStyle(TextInputStyle.Paragraph).setValue(currentConfig.middle.content).setRequired(true))
                );
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'sw_edit_bottom') {
                const modal = new ModalBuilder().setCustomId('sw_modal_bottom').setTitle('Éditer l\'Embed Inférieur');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('footerText').setLabel('Texte du Footer').setStyle(TextInputStyle.Short).setValue(currentConfig.bottom.footerText).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('footerIcon').setLabel('URL Icône Footer (optionnel)').setStyle(TextInputStyle.Short).setValue(currentConfig.bottom.footerIcon).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image').setLabel('URL Grande Image (optionnel)').setStyle(TextInputStyle.Short).setValue(currentConfig.bottom.image).setRequired(false))
                );
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'sw_manage_buttons') {
                if (currentConfig.middle.buttons.length >= 5) {
                    return interaction.reply({
                        content: '❌ Limite de 5 boutons atteinte.',
                        components: [new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('sw_reset_buttons').setLabel('Réinitialiser les boutons').setStyle(ButtonStyle.Danger)
                        )],
                        ephemeral: true
                    });
                }
                const modal = new ModalBuilder().setCustomId('sw_modal_add_button').setTitle('Ajouter un bouton');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Label du bouton').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('custom_id').setLabel('Custom ID (ex: ticket_abus)').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('style').setLabel('Style : PRIMARY / SECONDARY / SUCCESS / DANGER').setStyle(TextInputStyle.Short).setValue('PRIMARY').setRequired(true))
                );
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'sw_reset_buttons') {
                currentConfig.middle.buttons = [];
                activeBuilders.set(interaction.user.id, currentConfig);
                return sendDashboard(interaction, currentConfig, 'Boutons réinitialisés !');
            }

            if (interaction.customId === 'sw_preview') {
                await interaction.deferReply({ ephemeral: true });
                const payloads = buildSandwichPayloads(currentConfig);
                await interaction.followUp({ content: '👀 **[APERÇU OWNER]**', ephemeral: true });
                for (const p of payloads) await interaction.followUp({ ...p, ephemeral: true });
                return;
            }

            if (interaction.customId === 'sw_deploy') {
                const modal = new ModalBuilder().setCustomId('sw_modal_deploy_target').setTitle('Salon de déploiement');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel_id').setLabel('ID du salon cible').setStyle(TextInputStyle.Short).setRequired(true))
                );
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'sw_deploy_edit') {
                await interaction.deferReply({ ephemeral: true });
                const data    = readData();
                const pack    = currentConfig.targetPackData;
                const channel = await interaction.guild.channels.fetch(pack.channelId).catch(() => null);
                if (!channel) return interaction.followUp({ content: '❌ Salon introuvable.', ephemeral: true });

                const payloads   = buildSandwichPayloads(currentConfig);
                const msgTop     = await channel.messages.fetch(pack.topId).catch(() => null);
                const msgMiddle  = await channel.messages.fetch(pack.middleId).catch(() => null);
                const msgBottom  = await channel.messages.fetch(pack.bottomId).catch(() => null);
                if (msgTop)    await msgTop.edit(payloads[0]);
                if (msgMiddle) await msgMiddle.edit(payloads[1]);
                if (msgBottom) await msgBottom.edit(payloads[2]);

                data.active_sandwiches[pack.topId].config = currentConfig;
                saveData(data);
                currentConfig.isEditing      = false;
                currentConfig.targetPackData = null;
                activeBuilders.set(interaction.user.id, currentConfig);
                return interaction.followUp({ content: '✅ Pack mis à jour en direct !', ephemeral: true });
            }
        }

        // ── MODALS ───────────────────────────────────────────────────────────
        if (interaction.isModalSubmit()) {

            if (interaction.customId === 'sw_modal_top') {
                currentConfig.top.title       = interaction.fields.getTextInputValue('title');
                currentConfig.top.description = interaction.fields.getTextInputValue('description');
                currentConfig.top.color       = interaction.fields.getTextInputValue('color') || '#e67e22';
                currentConfig.top.thumbnail   = interaction.fields.getTextInputValue('thumbnail');
                activeBuilders.set(interaction.user.id, currentConfig);
                return sendDashboard(interaction, currentConfig);
            }

            if (interaction.customId === 'sw_modal_middle') {
                currentConfig.middle.content = interaction.fields.getTextInputValue('content');
                activeBuilders.set(interaction.user.id, currentConfig);
                return sendDashboard(interaction, currentConfig);
            }

            if (interaction.customId === 'sw_modal_bottom') {
                currentConfig.bottom.footerText = interaction.fields.getTextInputValue('footerText');
                currentConfig.bottom.footerIcon = interaction.fields.getTextInputValue('footerIcon');
                currentConfig.bottom.image      = interaction.fields.getTextInputValue('image');
                activeBuilders.set(interaction.user.id, currentConfig);
                return sendDashboard(interaction, currentConfig);
            }

            if (interaction.customId === 'sw_modal_add_button') {
                const styleInput = interaction.fields.getTextInputValue('style').toUpperCase();
                const styleMap   = { PRIMARY: ButtonStyle.Primary, SECONDARY: ButtonStyle.Secondary, SUCCESS: ButtonStyle.Success, DANGER: ButtonStyle.Danger };
                currentConfig.middle.buttons.push({
                    label:    interaction.fields.getTextInputValue('label'),
                    customId: interaction.fields.getTextInputValue('custom_id'),
                    style:    styleMap[styleInput] ?? ButtonStyle.Primary
                });
                activeBuilders.set(interaction.user.id, currentConfig);
                return sendDashboard(interaction, currentConfig, 'Bouton ajouté !');
            }

            if (interaction.customId === 'sw_modal_deploy_target') {
                await interaction.deferReply({ ephemeral: true });
                const channelId = interaction.fields.getTextInputValue('channel_id');
                const channel   = await interaction.guild.channels.fetch(channelId).catch(() => null);
                if (!channel || !channel.isTextBased())
                    return interaction.followUp({ content: '❌ Salon introuvable ou invalide.', ephemeral: true });

                const payloads  = buildSandwichPayloads(currentConfig);
                const sentTop    = await channel.send(payloads[0]);
                const sentMiddle = await channel.send(payloads[1]);
                const sentBottom = await channel.send(payloads[2]);

                const data = readData();
                data.active_sandwiches[sentTop.id] = {
                    topId: sentTop.id, middleId: sentMiddle.id, bottomId: sentBottom.id,
                    channelId: channel.id, config: currentConfig
                };
                saveData(data);
                activeBuilders.set(interaction.user.id, createDefaultConfig());
                return interaction.followUp({ content: `🚀 Pack déployé dans <#${channel.id}> !`, ephemeral: true });
            }
        }

    } catch (error) {
        console.error('[EMBED ERROR]', error);
        try {
            const msg = { content: '❌ Erreur dans le système embed. Consulte les logs Railway.', ephemeral: true };
            if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
            else await interaction.reply(msg);
        } catch (e) {}
    }
};
