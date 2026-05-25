'use strict';

const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, ButtonStyle, TextInputStyle,
  ComponentType, ChannelType, Colors, PermissionFlagsBits,
} = require('discord.js');

const sessions = require('../utils/sessionStorage'); // NOUVEAU SYSTEME

function createSession() {
  return {
    step: 1, title: 'Mon Embed', description: 'Configurez votre embed avec le builder interactif.',
    color: '#5865F2', footer: null, author: null, image: null, thumbnail: null,
    fields: [], // AJOUT DES CHAMPS
    buttons: [], targetChannel: null, editingButtonIndex: -1,
  };
}

function buildPreview(state) {
  const embed = new EmbedBuilder()
    .setTitle(state.title || null)
    .setDescription(state.description || null)
    .setColor(state.color || Colors.Blurple);

  if (state.footer)    embed.setFooter({ text: state.footer });
  if (state.author)    embed.setAuthor({ name: state.author });
  if (state.image)     embed.setImage(state.image);
  if (state.thumbnail) embed.setThumbnail(state.thumbnail);
  if (state.fields && state.fields.length > 0) embed.addFields(state.fields); // RENDU DES CHAMPS

  return embed;
}

function renderStep1(state) {
  const preview = buildPreview(state);
  preview.setFooter({ text: `Étape 1/4 — Contenu de l'embed${state.footer ? ` | ${state.footer}` : ''}` });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_title').setLabel('✏️ Titre').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('eb_description').setLabel('📝 Description').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('eb_color').setLabel('🎨 Couleur').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('eb_footer').setLabel('🔻 Footer').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('eb_author').setLabel('👤 Auteur').setStyle(ButtonStyle.Secondary),
  );

  // NOUVEAU BOUTON POUR LES CHAMPS
  const rowField = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_add_field').setLabel('➕ Ajouter un champ').setStyle(ButtonStyle.Success).setDisabled((state.fields || []).length >= 25),
    new ButtonBuilder().setCustomId('eb_reset_fields').setLabel('🗑️ Vider les champs').setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_prev').setLabel('⬅️ Retour').setStyle(ButtonStyle.Danger).setDisabled(true),
    new ButtonBuilder().setCustomId('eb_next').setLabel('➡️ Suivant').setStyle(ButtonStyle.Primary),
  );

  return { embeds: [preview], components: [row1, rowField, row2] };
}

function renderStep2(state) {
  const preview = buildPreview(state);
  preview.setFooter({ text: `Étape 2/4 — Images${state.footer ? ` | ${state.footer}` : ''}` });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_image').setLabel('🖼️ Image principale').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('eb_thumbnail').setLabel('🔲 Thumbnail').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('eb_reset_images').setLabel('🗑️ Reset images').setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_prev').setLabel('⬅️ Retour').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('eb_next').setLabel('➡️ Suivant').setStyle(ButtonStyle.Primary),
  );

  return { embeds: [preview], components: [row1, row2] };
}

function renderStep3(state) {
  const preview = buildPreview(state);
  const btnCount = state.buttons.length;
  preview.setFooter({ text: `Étape 3/4 — Boutons (${btnCount}/5)${state.footer ? ` | ${state.footer}` : ''}` });

  const rows = [];
  const addRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_add_button').setLabel(`➕ Ajouter un bouton`).setStyle(ButtonStyle.Success).setDisabled(btnCount >= 5),
  );

  if (btnCount > 0) {
    const editRow = new ActionRowBuilder();
    for (let i = 0; i < btnCount; i++) {
      const b = state.buttons[i];
      editRow.addComponents(new ButtonBuilder().setCustomId(`eb_edit_btn_${i}`).setLabel(`${b.label || `Btn ${i + 1}`}`).setStyle(ButtonStyle.Secondary));
    }
    rows.push(editRow);
  }
  rows.push(addRow);
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_prev').setLabel('⬅️ Retour').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('eb_next').setLabel('➡️ Suivant').setStyle(ButtonStyle.Primary)
  ));
  return { embeds: [preview], components: rows };
}

function renderStep4(state) {
  const preview = buildPreview(state);
  preview.setFooter({ text: `Étape 4/4 — Publication${state.footer ? ` | ${state.footer}` : ''}` });

  const channelRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder().setCustomId('eb_channel_select').setPlaceholder('📢 Choisir le salon').addChannelTypes(ChannelType.GuildText),
  );

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_prev').setLabel('⬅️ Retour').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('eb_publish').setLabel('🚀 Créer l\'embed').setStyle(ButtonStyle.Success).setDisabled(!state.targetChannel),
  );

  return { embeds: [preview], components: [channelRow, navRow] };
}

function renderStep(state) {
  switch (state.step) {
    case 1: return renderStep1(state);
    case 2: return renderStep2(state);
    case 3: return renderStep3(state);
    case 4: return renderStep4(state);
    default: return renderStep1(state);
  }
}

function renderButtonConfig(state, index) {
  const isNew = index === state.buttons.length;
  const btn = isNew ? { label: '', emoji: null, style: ButtonStyle.Primary, actionType: null, actionValue: null, ticketCategory: null, ticketPrefix: 'ticket-', ticketStaffRoles: [] } : state.buttons[index];

  const embed = new EmbedBuilder().setTitle(`⚙️ Configuration du bouton ${index + 1}`).setColor('#FFA500').addFields(
      { name: 'Label', value: btn.label || '*(non défini)*', inline: true },
      { name: 'Emoji', value: btn.emoji || '*(aucun)*', inline: true },
      { name: 'Style', value: styleName(btn.style), inline: true },
      { name: 'Action', value: btn.actionType ? actionLabel(btn.actionType) : '*(non définie)*', inline: true },
    );

  return { embeds: [embed], components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ebbtn_label').setLabel('✏️ Label').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ebbtn_emoji').setLabel('😀 Emoji').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ebbtn_style').setLabel('🎨 Style').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('ebbtn_action_type').setPlaceholder('Sélectionner une action…').addOptions([
        { label: '🎟️ Système de ticket', value: 'ticket' }, { label: '🔗 Lien URL', value: 'link' },
        { label: '💬 Message éphémère', value: 'ephemeral' }, { label: '📩 DM Utilisateur', value: 'dm' },
        { label: '🧾 Message salon', value: 'channel_msg' },
      ])
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ebbtn_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ebbtn_save').setLabel('✅ Sauvegarder').setStyle(ButtonStyle.Success).setDisabled(!btn.label || !btn.actionType)
    )
  ]};
}

function styleName(style) { const map = { [ButtonStyle.Primary]: 'Primary (Bleu)', [ButtonStyle.Secondary]: 'Secondary (Gris)', [ButtonStyle.Success]: 'Success (Vert)', [ButtonStyle.Danger]: 'Danger (Rouge)', [ButtonStyle.Link]: 'Link (URL)' }; return map[style] || 'Primary'; }
function actionLabel(type) { const map = { ticket: '🎟️ Ticket', link: '🔗 Lien', ephemeral: '💬 Éphémère', dm: '📩 DM', channel_msg: '🧾 Message salon' }; return map[type] || type; }

function modalForField(field) {
  const configs = {
    title: { title: '✏️ Modifier le titre', inputs: [{ id: 'value', label: 'Titre de l\'embed', style: TextInputStyle.Short, max: 256 }] },
    description: { title: '📝 Modifier la description', inputs: [{ id: 'value', label: 'Description', style: TextInputStyle.Paragraph, max: 4096 }] },
    color: { title: '🎨 Modifier la couleur', inputs: [{ id: 'value', label: 'Hexadécimal (ex: #FF5733)', style: TextInputStyle.Short, max: 7 }] },
    footer: { title: '🔻 Modifier le footer', inputs: [{ id: 'value', label: 'Texte', style: TextInputStyle.Short, max: 2048 }] },
    author: { title: '👤 Modifier l\'auteur', inputs: [{ id: 'value', label: 'Nom', style: TextInputStyle.Short, max: 256 }] },
    image: { title: '🖼️ URL image', inputs: [{ id: 'value', label: 'URL', style: TextInputStyle.Short, max: 1024 }] },
    thumbnail: { title: '🔲 URL thumbnail', inputs: [{ id: 'value', label: 'URL', style: TextInputStyle.Short, max: 1024 }] },
    btn_label: { title: '✏️ Label bouton', inputs: [{ id: 'value', label: 'Texte', style: TextInputStyle.Short, max: 80 }] },
    btn_emoji: { title: '😀 Emoji bouton', inputs: [{ id: 'value', label: 'Emoji', style: TextInputStyle.Short, max: 100 }] },
    btn_action_value: { title: '⚙️ Action', inputs: [{ id: 'value', label: 'URL ou texte', style: TextInputStyle.Paragraph, max: 2000 }] },
    ticket_prefix: { title: '🎟️ Préfixe ticket', inputs: [{ id: 'prefix', label: 'Préfixe', style: TextInputStyle.Short, max: 20 }] },
    new_field: { title: '➕ Nouveau Champ', inputs: [
      { id: 'name', label: 'Titre du champ (Ex: 🎫 Owner)', style: TextInputStyle.Short, max: 256 },
      { id: 'value', label: 'Description courte du champ', style: TextInputStyle.Paragraph, max: 1024 }
    ]},
  };
  const cfg = configs[field];
  if (!cfg) return null;
  const modal = new ModalBuilder().setCustomId(`eb_modal_${field}`).setTitle(cfg.title);
  for (const inp of cfg.inputs) {
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(inp.id).setLabel(inp.label).setStyle(inp.style).setMaxLength(inp.max).setRequired(true)));
  }
  return modal;
}

function compileFinalMessage(state) {
  const embed = buildPreview(state);
  embed.setFooter(state.footer ? { text: state.footer } : null); // Enlève le "Étape X/4"
  const components = [];
  if (state.buttons.length > 0) {
    for (let i = 0; i < state.buttons.length; i++) {
      const btnRow = new ActionRowBuilder();
      const b = state.buttons[i];
      let customId;
      if (b.actionType === 'link') {
        const lb = new ButtonBuilder().setLabel(b.label).setStyle(ButtonStyle.Link).setURL(b.actionValue || 'https://discord.com');
        if (b.emoji) lb.setEmoji(b.emoji);
        btnRow.addComponents(lb);
        components.push(btnRow);
        continue;
      } else if (b.actionType === 'ticket') {
        customId = `action_ticket_${i}:${b.ticketCategory || ''}:${b.ticketPrefix || 'ticket-'}:${(b.ticketStaffRoles || []).join(';')}`;
      } else {
        const actionId = Math.random().toString(36).substring(2, 11);
        try { require('../utils/actionStorage').saveAction(actionId, b.actionValue || 'Vide'); } catch {}
        customId = `action_${b.actionType}_${actionId}`;
      }
      if (customId.length > 100) customId = customId.slice(0, 100);
      const bb = new ButtonBuilder().setCustomId(customId).setLabel(b.label).setStyle(b.style || ButtonStyle.Primary);
      if (b.emoji) bb.setEmoji(b.emoji);
      btnRow.addComponents(bb);
      components.push(btnRow);
    }
  }
  return { embed, components };
}

async function renderTicketConfig(state, index) {
  const btn = state.buttons[index];
  const embed = new EmbedBuilder().setTitle('🎟️ Configuration ticket').setColor('#FFD700').addFields(
      { name: 'Préfixe', value: btn.ticketPrefix || 'ticket-', inline: true },
      { name: 'Catégorie', value: btn.ticketCategory || '*(non sélectionnée)*', inline: true },
      { name: 'Rôles staff', value: btn.ticketStaffRoles.length ? btn.ticketStaffRoles.map((r) => `<@&${r}>`).join(', ') : '*(aucun)*', inline: false },
    );
  return { embeds: [embed], components: [
    new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ebbtn_ticket_prefix').setLabel('✏️ Préfixe').setStyle(ButtonStyle.Secondary)),
    new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('ebbtn_ticket_category').setPlaceholder('📁 Sélectionner la catégorie parente').addChannelTypes(ChannelType.GuildCategory)),
    new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('ebbtn_ticket_roles').setPlaceholder('🛡️ Rôles staff').setMinValues(0).setMaxValues(10)),
    new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ebbtn_ticket_done').setLabel('✅ Confirmer').setStyle(ButtonStyle.Success))
  ]};
}

async function startCollector(interaction, message) {
  const userId = interaction.user.id;
  const collector = message.createMessageComponentCollector({ filter: (i) => i.user.id === userId, time: 20 * 60 * 1000 });

  collector.on('collect', async (i) => {
    let state = sessions.get(userId);
    if (!state) { return i.reply({ content: 'Session expirée. Relancez /embed.', ephemeral: true }); }

    // Utilitaire pour sauvegarder sur le disque avant chaque update
    const updateAndSave = async (interactionObj, renderPayload) => {
      sessions.set(userId, state);
      await interactionObj.update(renderPayload);
    };

    if (i.customId === 'eb_next') { state.step = Math.min(state.step + 1, 4); return updateAndSave(i, renderStep(state)); }
    if (i.customId === 'eb_prev') { state.step = Math.max(state.step - 1, 1); return updateAndSave(i, renderStep(state)); }

    // GESTION DES CHAMPS (FIELDS)
    if (i.customId === 'eb_add_field') {
      await i.showModal(modalForField('new_field'));
      const sub = await i.awaitModalSubmit({ filter: m => m.user.id === userId && m.customId === 'eb_modal_new_field', time: 5 * 60 * 1000 }).catch(()=>null);
      if (!sub) return;
      if (!state.fields) state.fields = [];
      state.fields.push({ name: sub.fields.getTextInputValue('name'), value: sub.fields.getTextInputValue('value'), inline: false });
      return updateAndSave(sub, renderStep(state));
    }
    if (i.customId === 'eb_reset_fields') {
      state.fields = [];
      return updateAndSave(i, renderStep(state));
    }

    const fieldMap = { eb_title: 'title', eb_description: 'description', eb_color: 'color', eb_footer: 'footer', eb_author: 'author', eb_image: 'image', eb_thumbnail: 'thumbnail' };
    if (fieldMap[i.customId]) {
      const field = fieldMap[i.customId];
      await i.showModal(modalForField(field));
      const sub = await i.awaitModalSubmit({ filter: m => m.user.id === userId && m.customId === `eb_modal_${field}`, time: 5 * 60 * 1000 }).catch(()=>null);
      if (!sub) return;
      const val = sub.fields.getTextInputValue('value').trim();
      state[field] = val || null;
      if (field === 'title' && !val) state.title = null; // Autorise les embeds sans titre
      if (field === 'description' && !val) state.description = null;
      return updateAndSave(sub, renderStep(state));
    }

    if (i.customId === 'eb_reset_images') { state.image = null; state.thumbnail = null; return updateAndSave(i, renderStep(state)); }

    if (i.customId === 'eb_add_button') {
      const newIndex = state.buttons.length;
      state.buttons.push({ id: `btn_${newIndex}`, label: '', emoji: null, style: ButtonStyle.Primary, actionType: null, actionValue: null, ticketCategory: null, ticketPrefix: 'ticket-', ticketStaffRoles: [] });
      state.editingButtonIndex = newIndex;
      return updateAndSave(i, renderButtonConfig(state, newIndex));
    }

    if (i.customId.startsWith('eb_edit_btn_')) {
      state.editingButtonIndex = parseInt(i.customId.split('_').pop(), 10);
      return updateAndSave(i, renderButtonConfig(state, state.editingButtonIndex));
    }

    const idx = state.editingButtonIndex;
    if (idx !== -1) {
      if (i.customId === 'ebbtn_label' || i.customId === 'ebbtn_emoji') {
        const type = i.customId.replace('ebbtn_', '');
        await i.showModal(modalForField(`btn_${type}`));
        const sub = await i.awaitModalSubmit({ filter: m => m.user.id === userId && m.customId === `eb_modal_btn_${type}`, time: 5*60*1000 }).catch(()=>null);
        if (!sub) return;
        state.buttons[idx][type] = sub.fields.getTextInputValue('value').trim() || null;
        return updateAndSave(sub, renderButtonConfig(state, idx));
      }
      if (i.customId === 'ebbtn_style') {
        const styles = [ButtonStyle.Primary, ButtonStyle.Secondary, ButtonStyle.Success, ButtonStyle.Danger];
        state.buttons[idx].style = styles[(styles.indexOf(state.buttons[idx].style) + 1) % styles.length];
        return updateAndSave(i, renderButtonConfig(state, idx));
      }
      if (i.customId === 'ebbtn_action_type') {
        const selected = i.values[0];
        state.buttons[idx].actionType = selected;
        if (selected === 'ticket') return updateAndSave(i, await renderTicketConfig(state, idx));
        if (['ephemeral', 'dm', 'channel_msg', 'link'].includes(selected)) {
          const modal = modalForField('btn_action_value');
          modal.setCustomId('eb_modal_btn_action_value').setTitle(selected === 'link' ? '🔗 URL' : '✉️ Message');
          await i.showModal(modal);
          const sub = await i.awaitModalSubmit({ filter: m => m.user.id === userId && m.customId === 'eb_modal_btn_action_value', time: 5*60*1000 }).catch(()=>null);
          if (!sub) return;
          state.buttons[idx].actionValue = sub.fields.getTextInputValue('value').trim() || null;
          return updateAndSave(sub, renderButtonConfig(state, idx));
        }
        return updateAndSave(i, renderButtonConfig(state, idx));
      }
      if (i.customId === 'ebbtn_ticket_prefix') {
        await i.showModal(modalForField('ticket_prefix'));
        const sub = await i.awaitModalSubmit({ filter: m => m.user.id === userId && m.customId === 'eb_modal_ticket_prefix', time: 5*60*1000 }).catch(()=>null);
        if (!sub) return;
        state.buttons[idx].ticketPrefix = sub.fields.getTextInputValue('prefix').trim() || 'ticket-';
        return updateAndSave(sub, await renderTicketConfig(state, idx));
      }
      if (i.customId === 'ebbtn_ticket_roles' && i.componentType === ComponentType.RoleSelect) { state.buttons[idx].ticketStaffRoles = i.values; return updateAndSave(i, await renderTicketConfig(state, idx)); }
      if (i.customId === 'ebbtn_ticket_category') { state.buttons[idx].ticketCategory = i.values[0]; return updateAndSave(i, await renderTicketConfig(state, idx)); }
      if (i.customId === 'ebbtn_ticket_done') return updateAndSave(i, renderButtonConfig(state, idx));
      
      if (i.customId === 'ebbtn_save' || i.customId === 'ebbtn_cancel') {
        if (i.customId === 'ebbtn_cancel' && !state.buttons[idx]?.label) state.buttons.splice(idx, 1);
        state.editingButtonIndex = -1; state.step = 3;
        return updateAndSave(i, renderStep(state));
      }
    }

    if (i.customId === 'eb_channel_select') { state.targetChannel = i.values[0]; return updateAndSave(i, renderStep(state)); }
    if (i.customId === 'eb_publish') {
      const channel = interaction.guild.channels.cache.get(state.targetChannel);
      if (!channel) return i.reply({ content: '❌ Salon introuvable.', ephemeral: true });
      try {
        const { embed, components } = compileFinalMessage(state);
        await channel.send({ embeds: [embed], components });
        await i.update({ embeds: [new EmbedBuilder().setColor(Colors.Green).setTitle('✅ Publié !').setDescription(`Envoyé dans <#${state.targetChannel}>.`)], components: [] });
        collector.stop('published');
        sessions.delete(userId);
      } catch (err) {
        await i.update({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('❌ Erreur').setDescription(err.message)], components: [] });
      }
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason !== 'published') {
      await message.edit({ embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('⏰ Session en pause').setDescription('Faites /embed pour reprendre.')], components: [] }).catch(()=>null);
    }
  });
}

module.exports = {
  data: new SlashCommandBuilder().setName('embed').setDescription('Ouvre le builder d\'embed interactif.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const userId = interaction.user.id;
    if (!sessions.has(userId)) sessions.set(userId, createSession());
    const state = sessions.get(userId);
    const reply = await interaction.reply({ ...renderStep(state), ephemeral: true, fetchReply: true });
    await startCollector(interaction, reply);
  }
};
