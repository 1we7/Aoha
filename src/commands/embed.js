const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../embed_data.json');

// Fonctions utilitaires pour la persistance des données
function readData() {
    if (!fs.existsSync(DATA_PATH)) {
        fs.writeFileSync(DATA_PATH, JSON.stringify({ templates: {}, active_sandwiches: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function saveData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Mémoire vive pour stocker la configuration en cours de création par l'Owner
const activeBuilders = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Système avancé d\'embeds en Sandwich')
        .addSubcommand(subcmd =>
            subcmd.setName('create')
                .setDescription('Ouvrir le panneau de création du Sandwich')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('edit')
                .setDescription('Modifier un pack Sandwich existant')
                .addStringOption(opt => opt.setName('message_id').setDescription('ID de l\'un des messages du pack (Haut, Milieu ou Bas)').setRequired(true))
        )
        .addSubcommand(subcmd =>
            subcmd.setName('save')
                .setDescription('Sauvegarder la configuration actuelle en template')
                .addStringOption(opt => opt.setName('nom').setDescription('Nom du template').setRequired(true))
        )
        .addSubcommand(subcmd =>
            subcmd.setName('load')
                .setDescription('Charger un template sauvegardé')
                .addStringOption(opt => opt.setName('nom').setDescription('Nom du template').setRequired(true))
        ),

    async execute(interaction) {
        // SÉCURITÉ STRICTE : Vérification de l'Owner du serveur
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                content: '❌ **Sécurité :** Seul le propriétaire du serveur (Owner) peut utiliser cette commande.', 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const data = readData();

        // Initier un builder par défaut si nécessaire
        if (!activeBuilders.has(interaction.user.id)) {
            activeBuilders.set(interaction.user.id, createDefaultConfig());
        }

        let currentConfig = activeBuilders.get(interaction.user.id);

        if (subcommand === 'create') {
            return sendDashboard(interaction, currentConfig);
        }

        if (subcommand === 'edit') {
            const targetId = interaction.options.getString('message_id');
            const targetPack = Object.values(data.active_sandwiches).find(pack => 
                pack.topId === targetId || pack.middleId === targetId || pack.bottomId === targetId
            );

            if (!targetPack) {
                return interaction.reply({ content: '❌ Aucun pack Sandwich actif trouvé avec cet ID de message.', ephemeral: true });
            }

            // Charger la config du pack pour édition en live
            currentConfig = JSON.parse(JSON.stringify(targetPack.config));
            currentConfig.isEditing = true;
            currentConfig.targetPackData = targetPack;
            activeBuilders.set(interaction.user.id, currentConfig);

            return sendDashboard(interaction, currentConfig, "Mode Édition en Live Activé");
        }

        if (subcommand === 'save') {
            const templateName = interaction.options.getString('nom').toLowerCase();
            data.templates[templateName] = currentConfig;
            saveData(data);
            return interaction.reply({ content: `💾 Template \`${templateName}\` sauvegardé avec succès !`, ephemeral: true });
        }

        if (subcommand === 'load') {
            const templateName = interaction.options.getString('nom').toLowerCase();
            if (!data.templates[templateName]) {
                return interaction.reply({ content: `❌ Le template \`${templateName}\` n'existe pas.`, ephemeral: true });
            }

            activeBuilders.set(interaction.user.id, JSON.parse(JSON.stringify(data.templates[templateName])));
            return interaction.reply({ content: `🔄 Template \`${templateName}\` chargé dans votre Dashboard. Faites \`/embed create\` pour le voir.`, ephemeral: true });
        }
    }
};

// --- CONFIGURATION PAR DÉFAUT ---
function createDefaultConfig() {
    return {
        top: { title: "Gestion des tickets", description: "Sélectionnez une catégorie pour ouvrir un ticket de support.", color: "#e67e22", thumbnail: "" },
        middle: { content: "Cliquez sur l'un des boutons ci-dessous pour interagir :", buttons: [] },
        bottom: { footerText: "Aoha Framework", footerIcon: "", image: "", timestamp: true },
        isEditing: false,
        targetPackData: null
    };
}

// --- RENDU DU PANNEAU DE CONTRÔLE (DASHBOARD EPHEMERAL) ---
async function sendDashboard(interaction, config, messageTitle = "Configuration de votre Embed Sandwich") {
    const embed = new EmbedBuilder()
        .setTitle(`🛠️ ${messageTitle}`)
        .setDescription("Configurez chaque section de votre pack unifié via les boutons ci-dessous avant le déploiement final.")
        .setColor('#2f3136')
        .addFields(
            { name: '🔼 Embed Haut', value: `**Titre :** ${config.top.title || '*Aucun*'}\n**Couleur :** ${config.top.color}`, inline: true },
            { name: '🥪 Milieu (Texte & Boutons)', value: `**Boutons configurés :** ${config.middle.buttons.length}/5`, inline: true },
            { name: '🔽 Embed Bas', value: `**Footer :** ${config.bottom.footerText || '*Aucun*'}\n**Image :** ${config.bottom.image ? '✅ Oui' : '❌ Non'}`, inline: true }
        );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sw_edit_top').setLabel('Modifier Haut 🔼').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('sw_edit_middle').setLabel('Modifier Milieu 🥪').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('sw_edit_bottom').setLabel('Modifier Bas 🔽').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('sw_manage_buttons').setLabel(`Gérer Boutons (${config.middle.buttons.length}/5)`).setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sw_preview').setLabel('Aperçu Réel 👀').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(config.isEditing ? 'sw_deploy_edit' : 'sw_deploy').setLabel(config.isEditing ? 'Mettre à jour le Live 💾' : 'Déployer le Sandwich 🚀').setStyle(ButtonStyle.Danger)
    );

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    } else {
        await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }
}

// --- GESTIONNAIRE GLOBAL DES INTERACTIONS (À INTÉGRER DANS TON EVENT INTERACTIONCREATE) ---
// Note : Tu peux placer cette logique directement dans ton gestionnaire d'événements principal.
module.exports.handleInteraction = async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('sw_')) return; // Filtrage strict pour éviter les conflits

    // Sécurité stricte sur l'édition du dashboard
    if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ Seul l'Owner possède l'accès à ce panneau.", ephemeral: true });
    }

    const currentConfig = activeBuilders.get(interaction.user.id) || createDefaultConfig();

    try {
        // --- GESTION DES MODALS (OUVERTURE) ---
        if (interaction.isButton()) {
            if (interaction.customId === 'sw_edit_top') {
                const modal = new ModalBuilder().setCustomId('sw_modal_top').setTitle('Éditer l\'Embed Supérieur');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Titre').setStyle(TextInputStyle.Short).setValue(currentConfig.top.title).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setValue(currentConfig.top.description).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Couleur (Hexadécimal)').setStyle(TextInputStyle.Short).setValue(currentConfig.top.color).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('thumbnail').setLabel('URL de la Miniature (Optionnel)').setStyle(TextInputStyle.Short).setValue(currentConfig.top.thumbnail).setRequired(false))
                );
                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'sw_edit_middle') {
                const modal = new ModalBuilder().setCustomId('sw_modal_middle').setTitle('Éditer le Message Central');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('content').setLabel('Contenu textuel incrusté').setStyle(TextInputStyle.Paragraph).setValue(currentConfig.middle.content).setRequired(true))
                );
                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'sw_edit_bottom') {
                const modal = new ModalBuilder().setCustomId('sw_modal_bottom').setTitle('Éditer l\'Embed Inférieur');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('footerText').setLabel('Texte du Footer').setStyle(TextInputStyle.Short).setValue(currentConfig.bottom.footerText).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('footerIcon').setLabel('URL Icone Footer').setStyle(TextInputStyle.Short).setValue(currentConfig.bottom.footerIcon).setRequired(false)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image').setLabel('URL de la Grande Image').setStyle(TextInputStyle.Short).setValue(currentConfig.bottom.image).setRequired(false))
                );
                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'sw_manage_buttons') {
                // Sous-panneau pour ajouter un bouton d'action
                if (currentConfig.middle.buttons.length >= 5) {
                    const resetRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('sw_reset_buttons').setLabel('Réinitialiser les boutons').setStyle(ButtonStyle.Danger));
                    return interaction.reply({ content: "❌ Limite de 5 boutons atteinte sur une seule ligne.", components: [resetRow], ephemeral: true });
                }

                const modal = new ModalBuilder().setCustomId('sw_modal_add_button').setTitle('Ajouter un bouton fonctionnel');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Label du bouton').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('custom_id').setLabel('Custom ID (ex: ticket_abus / ticket_owner)').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('style').setLabel('Style (PRIMARY, SECONDARY, SUCCESS, DANGER)').setStyle(TextInputStyle.Short).setValue('PRIMARY').setRequired(true))
                );
                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'sw_reset_buttons') {
                currentConfig.middle.buttons = [];
                activeBuilders.set(interaction.user.id, currentConfig);
                return sendDashboard(interaction, currentConfig, "Boutons réinitialisés !");
            }

            // --- APERÇU ÉPHÉMÈRE ---
            if (interaction.customId === 'sw_preview') {
                await interaction.deferReply({ ephemeral: true });
                const payloads = buildSandwichPayloads(currentConfig);
                
                await interaction.followUp({ content: "👀 **[APERÇU EXCLUSIF OWNER]** Layout Sandwich simulé ci-dessous :", ephemeral: true });
                for (const p of payloads) {
                    await interaction.followUp({ ...p, ephemeral: true });
                }
                return;
            }

            // --- DÉPLOIEMENT INITIAL ---
            if (interaction.customId === 'sw_deploy') {
                // Demande dans quel salon envoyer le pack
                const modal = new ModalBuilder().setCustomId('sw_modal_deploy_target').setTitle('Destination du Déploiement');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel_id').setLabel('ID du Salon Cible').setStyle(TextInputStyle.Short).setRequired(true))
                );
                return await interaction.showModal(modal);
            }

            // --- DEPLOIEMENT MODIFICATION EN LIVE ---
            if (interaction.customId === 'sw_deploy_edit') {
                await interaction.deferReply({ ephemeral: true });
                const data = readData();
                const pack = currentConfig.targetPackData;
                const channel = await interaction.guild.channels.fetch(pack.channelId).catch(() => null);

                if (!channel) return interaction.followUp({ content: "❌ Salon cible introuvable pour la mise à jour.", ephemeral: true });

                const payloads = buildSandwichPayloads(currentConfig);

                // Update les 3 messages en conservant l'ordre exact
                const msgTop = await channel.messages.fetch(pack.topId).catch(() => null);
                const msgMiddle = await channel.messages.fetch(pack.middleId).catch(() => null);
                const msgBottom = await channel.messages.fetch(pack.bottomId).catch(() => null);

                if (msgTop) await msgTop.edit(payloads[0]);
                if (msgMiddle) await msgMiddle.edit(payloads[1]);
                if (msgBottom) await msgBottom.edit(payloads[2]);

                // Mettre à jour le pack en BDD
                data.active_sandwiches[pack.topId].config = currentConfig;
                saveData(data);

                currentConfig.isEditing = false;
                currentConfig.targetPackData = null;
                activeBuilders.set(interaction.user.id, currentConfig);

                return interaction.followUp({ content: "✅ Le Pack Sandwich a été édité en direct avec succès !", ephemeral: true });
            }
        }

        // --- SUBMIT DES MODALS ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'sw_modal_top') {
                currentConfig.top.title = interaction.fields.getTextInputValue('title');
                currentConfig.top.description = interaction.fields.getTextInputValue('description');
                currentConfig.top.color = interaction.fields.getTextInputValue('color') || '#e67e22';
                currentConfig.top.thumbnail = interaction.fields.getTextInputValue('thumbnail');
                
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
                currentConfig.bottom.image = interaction.fields.getTextInputValue('image');
                activeBuilders.set(interaction.user.id, currentConfig);
                return sendDashboard(interaction, currentConfig);
            }

            if (interaction.customId === 'sw_modal_add_button') {
                const label = interaction.fields.getTextInputValue('label');
                const customId = interaction.fields.getTextInputValue('custom_id');
                const styleInput = interaction.fields.getTextInputValue('style').toUpperCase();

                let style = ButtonStyle.Primary;
                if (styleInput === 'SECONDARY') style = ButtonStyle.Secondary;
                if (styleInput === 'SUCCESS') style = ButtonStyle.Success;
                if (styleInput === 'DANGER') style = ButtonStyle.Danger;

                currentConfig.middle.buttons.push({ label, customId, style });
                activeBuilders.set(interaction.user.id, currentConfig);
                return sendDashboard(interaction, currentConfig, "Bouton ajouté avec succès !");
            }

            if (interaction.customId === 'sw_modal_deploy_target') {
                await interaction.deferReply({ ephemeral: true });
                const channelId = interaction.fields.getTextInputValue('channel_id');
                const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

                if (!channel || !channel.isTextBased()) {
                    return interaction.followUp({ content: "❌ Salon textuel introuvable. Assurez-vous d'entrer un ID valide.", ephemeral: true });
                }

                const payloads = buildSandwichPayloads(currentConfig);

                // Envoi consécutif et ultra-rapide pour simuler le bloc uni (Sandwich)
                const sentTop = await channel.send(payloads[0]);
                const sentMiddle = await channel.send(payloads[1]);
                const sentBottom = await channel.send(payloads[2]);

                // Enregistrement pour le Live Edit futur
                const data = readData();
                data.active_sandwiches[sentTop.id] = {
                    topId: sentTop.id,
                    middleId: sentMiddle.id,
                    bottomId: sentBottom.id,
                    channelId: channel.id,
                    config: currentConfig
                };
                saveData(data);

                // Reset le builder local
                activeBuilders.set(interaction.user.id, createDefaultConfig());

                return interaction.followUp({ content: `🚀 Pack Sandwich envoyé avec succès dans <#${channel.id}> !`, ephemeral: true });
            }
        }
    } catch (error) {
        console.error("[SANDWICH ERROR LOGS]", error);
        return interaction.reply({ content: "❌ Une erreur critique est survenue dans le moteur Sandwich. Consultez la console.", ephemeral: true }).catch(() => {});
    }
};

// --- COMPILATEUR DE CONTENU : L'ILLUSION PERFECT SANDWICH ---
function buildSandwichPayloads(config) {
    // 1. Partie Haute : Embed avec Barre colorée latérale et Titre
    const embedTop = new EmbedBuilder()
        .setTitle(config.top.title)
        .setDescription(config.top.description)
        .setColor(config.top.color);
    
    if (config.top.thumbnail && config.top.thumbnail.startsWith('http')) {
        embedTop.setThumbnail(config.top.thumbnail);
    }

    // 2. Partie Milieu : Message Textuel contenant les fameux boutons incrustés (comme sur ton screen)
    const actionRow = new ActionRowBuilder();
    if (config.middle.buttons.length > 0) {
        config.middle.buttons.forEach(btn => {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(btn.customId) // Laisse passer tes identifiants de tickets existants
                    .setLabel(btn.label)
                    .setStyle(btn.style)
            );
        });
    }

    const middlePayload = { content: config.middle.content };
    if (config.middle.buttons.length > 0) {
        middlePayload.components = [actionRow];
    }

    // 3. Partie Basse : Embed de fermeture pour parfaire l'unité graphique
    const embedBottom = new EmbedBuilder()
        .setColor(config.top.color); // Reste synchrone sur la couleur latérale

    if (config.bottom.footerText) {
        embedBottom.setFooter({ 
            text: config.bottom.footerText, 
            iconURL: config.bottom.footerIcon.startsWith('http') ? config.bottom.footerIcon : null 
        });
    }
    if (config.bottom.image && config.bottom.image.startsWith('http')) {
        embedBottom.setImage(config.bottom.image);
    }
    if (config.bottom.timestamp) {
        embedBottom.setTimestamp();
    }

    return [
        { embeds: [embedTop] },
        middlePayload,
        { embeds: [embedBottom] }
    ];
}
