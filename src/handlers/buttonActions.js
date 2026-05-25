const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const embedCommand = require('../commands/embed.js');

const BLACKLISTED_WORDS = ['merde','putain','connard','salope','encule','pd','ntm'];

function validateSecureText(text) {
    const whitelistRegex = /^[a-zA-Z0-9éèàùçâêîôûëïü\s.,!?'-]+$/;
    if (!whitelistRegex.test(text)) return { valid: false, reason: 'Caractères spéciaux ou polices modifiées interdits.' };
    const lower = text.toLowerCase();
    for (const word of BLACKLISTED_WORDS) {
        if (lower.includes(word)) return { valid: false, reason: 'Mot inapproprié détecté.' };
    }
    return { valid: true };
}

module.exports = {
    async execute(interaction, client) {

        // ── 1. COMMANDES SLASH ───────────────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[ERREUR /${interaction.commandName}]`, error);
                // MAINTENANT L'ERREUR S'AFFICHERA SUR DISCORD
                const msg = { content: `Une erreur est survenue lors de l'exécution.\n\`\`\`js\n${error.message}\n\`\`\``, ephemeral: true };
                try {
                    if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
                    else await interaction.reply(msg);
                } catch (e) {}
            }
            return;
        }

        // ── 2. MODAL SUBMITS ─────────────────────────────────────────────────
        if (interaction.isModalSubmit()) {

            // Modals /embed (sw_modal_*) → redirigés vers embed.handleInteraction
            if (interaction.customId.startsWith('sw_modal_')) {
                try {
                    return await embedCommand.handleInteraction(interaction);
                } catch (error) {
                    console.error("[ERREUR MODAL EMBED]", error);
                    return interaction.reply({ content: `Erreur embed: ${error.message}`, ephemeral: true }).catch(()=>{});
                }
            }

            // Modals MP
            if (interaction.customId.startsWith('mp_modal_') || interaction.customId.startsWith('mp_reply_modal_')) {
                const isReply  = interaction.customId.startsWith('mp_reply_modal_');
                const targetId = interaction.customId.split('_')[isReply ? 3 : 2];
                const messageText = interaction.fields.getTextInputValue('mp_text_input');

                const validation = validateSecureText(messageText);
                if (!validation.valid)
                    return interaction.reply({ content: `⚠️ **Refusé :** ${validation.reason}`, ephemeral: true });

                try {
                    const targetUser = await client.users.fetch(targetId);
                    const mpEmbed = new EmbedBuilder()
                        .setColor('#2b2d31')
                        .setTitle(isReply ? '✉️ Réponse anonyme reçue !' : '✉️ Message anonyme reçu !')
                        .setDescription(messageText)
                        .setTimestamp();
                    const replyBtn = new ButtonBuilder()
                        .setCustomId(`mp_reply_btn_${interaction.user.id}`)
                        .setLabel('Répondre anonymement')
                        .setStyle(ButtonStyle.Primary);
                    await targetUser.send({ embeds: [mpEmbed], components: [new ActionRowBuilder().addComponents(replyBtn)] });
                    await interaction.reply({ content: '✅ Envoyé anonymement !', ephemeral: true });
                } catch {
                    await interaction.reply({ content: '❌ Impossible d\'envoyer le MP (MPs fermés).', ephemeral: true });
                }
                return;
            }

            // Modal embed legacy
            if (interaction.customId === 'embed_generator_modal') {
                const title  = interaction.fields.getTextInputValue('embed_title');
                const desc   = interaction.fields.getTextInputValue('embed_desc');
                const color  = interaction.fields.getTextInputValue('embed_color') || '#2b2d31';
                const footer = interaction.fields.getTextInputValue('embed_footer');
                const finalColor = /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : '#2b2d31';
                const embed = new EmbedBuilder().setDescription(desc).setColor(finalColor);
                if (title)  embed.setTitle(title);
                if (footer) embed.setFooter({ text: footer });
                await interaction.channel.send({ embeds: [embed] });
                await interaction.reply({ content: '✅ Embed généré !', ephemeral: true });
            }
            return;
        }

        // ── 3. BOUTONS ───────────────────────────────────────────────────────
        if (interaction.isButton()) {

            // Boutons /embed (sw_*) → redirigés vers embed.handleInteraction
            if (interaction.customId.startsWith('sw_')) {
                try {
                    return await embedCommand.handleInteraction(interaction);
                } catch (error) {
                    console.error("[ERREUR BOUTON EMBED]", error);
                    return interaction.reply({ content: `Erreur embed: ${error.message}`, ephemeral: true }).catch(()=>{});
                }
            }

            // Bouton répondre MP
            if (interaction.customId.startsWith('mp_reply_btn_')) {
                const targetId = interaction.customId.split('_')[3];
                const modal = new ModalBuilder()
                    .setCustomId(`mp_reply_modal_${targetId}`)
                    .setTitle('Répondre anonymement');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('mp_text_input')
                        .setLabel('Ta réponse')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                ));
                return interaction.showModal(modal);
            }

            // Bouton giveaway
            if (interaction.customId.startsWith('giveaway_join_')) {
                const giveawayId = interaction.customId.split('_')[2];
                const db = client.getDB();
                if (!db.giveaways[giveawayId])
                    return interaction.reply({ content: '❌ Ce giveaway est terminé.', ephemeral: true });
                if (db.giveaways[giveawayId].participants.includes(interaction.user.id))
                    return interaction.reply({ content: '⚠️ Tu participes déjà à ce tirage !', ephemeral: true });

                db.giveaways[giveawayId].participants.push(interaction.user.id);
                client.saveDB(db);

                const count      = db.giveaways[giveawayId].participants.length;
                const updatedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`giveaway_join_${giveawayId}`)
                        .setLabel(`Participer (${count})`)
                        .setStyle(ButtonStyle.Primary)
                );
                await interaction.message.edit({ components: [updatedRow] });
                return interaction.reply({ content: '✅ Inscription enregistrée !', ephemeral: true });
            }

            // Boutons anti-mention (Owner only)
            if (interaction.customId.startsWith('ping_approve_') || interaction.customId.startsWith('ping_deny_')) {
                if (interaction.user.id !== interaction.guild.ownerId)
                    return interaction.reply({ content: '❌ Seul le propriétaire peut valider cette action.', ephemeral: true });

                const parts   = interaction.customId.split('_');
                const action  = parts[1];
                const pingId  = parts[2];
                const db      = client.getDB();
                const pingData = db.pendingPings[pingId];

                if (!pingData)
                    return interaction.reply({ content: 'Données introuvables ou expirées.', ephemeral: true });

                if (action === 'approve') {
                    const channel = await client.channels.fetch(pingData.channelId);
                    await channel.send({ content: `📢 **Message de <@${pingData.authorId}> :**\n${pingData.content}` });
                    await interaction.reply({ content: '✅ Mention validée et renvoyée !', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ Message rejeté.', ephemeral: true });
                }
                delete db.pendingPings[pingId];
                client.saveDB(db);
                try { await interaction.message.delete(); } catch (e) {}
                return;
            }
        }
    }
};
