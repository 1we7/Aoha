'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  ButtonStyle,
  TextInputStyle,
  ComponentType,
  ChannelType,
  Colors,
  PermissionFlagsBits,
} = require('discord.js');

// ─────────────────────────────────────────────
// STATE FACTORY
// ─────────────────────────────────────────────
function createSession() {
  return {
    step: 1,
    title: 'Mon Embed',
    description: 'Configurez votre embed avec le builder interactif.',
    color: '#5865F2',
    footer: null,
    author: null,
    image: null,
    thumbnail: null,
    buttons: [],
    targetChannel: null,
    editingButtonIndex: -1,
  };
}

const sessions = new Map();

// ─────────────────────────────────────────────
// EMBED PREVIEW BUILDER
// ─────────────────────────────────────────────
function buildPreview(state) {
  const embed = new EmbedBuilder()
    .setTitle(state.title || '(Sans titre)')
    .setDescription(state.description || '(Sans description)')
    .setColor(state.color || Colors.Blurple);

  if (state.footer)    embed.setFooter({ text: state.footer });
  if (state.author)    embed.setAuthor({ name: state.author });
  if (state.image)     embed.setImage(state.image);
  if (state.thumbnail) embed.setThumbnail(state.thumbnail);

  return embed;
}

// ─────────────────────────────────────────────
// STEP RENDERERS
// ─────────────────────────────────────────────
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

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_prev').setLabel('⬅️ Retour').setStyle(ButtonStyle.Danger).setDisabled(true),
    new ButtonBuilder().setCustomId('eb_next').setLabel('➡️ Suivant').setStyle(ButtonStyle.Primary),
  );

  return { embeds: [preview], components: [row1, row2] };
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
    new ButtonBuilder()
      .setCustomId('eb_add_button')
      .setLabel(`➕ Ajouter un bouton`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(btnCount >= 5),
  );

  if (btnCount > 0) {
    const editRow = new ActionRowBuilder();
    for (let i = 0; i < btnCount; i++) {
      const b = state.buttons[i];
      editRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`eb_edit_btn_${i}`)
          .setLabel(`${b.label || `Btn ${i + 1}`}`)
          .setStyle(ButtonStyle.Secondary),
      );
    }
    rows.push(editRow);
  }

  rows.push(addRow);

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_prev').setLabel('⬅️ Retour').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('eb_next').setLabel('➡️ Suivant').setStyle(ButtonStyle.Primary),
  );

  rows.push(navRow);

  return { embeds: [preview], components: rows };
}

function renderStep4(state) {
  const preview = buildPreview(state);
  preview.setFooter({ text: `Étape 4/4 — Publication${state.footer ? ` | ${state.footer}` : ''}` });

  const channelRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('eb_channel_select')
      .setPlaceholder('📢 Choisir le salon de destination')
      .addChannelTypes(ChannelType.GuildText),
  );

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eb_prev').setLabel('⬅️ Retour').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('eb_publish')
      .setLabel('🚀 Créer l\'embed')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!state.targetChannel),
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

// ─────────────────────────────────────────────
// BUTTON CONFIGURATOR
// ─────────────────────────────────────────────
function renderButtonConfig(state, index) {
  const isNew = index === state.buttons.length;
  const btn = isNew
    ? { label: '', emoji: null, style: ButtonStyle.Primary, actionType: null, actionValue: null, ticketCategory: null, ticketPrefix: 'ticket-', ticketStaffRoles: [] }
    : state.buttons[index];

  const embed = new EmbedBuilder()
    .setTitle(`⚙️ Configuration du bouton ${index + 1}`)
    .setColor('#FFA500')
    .addFields(
      { name: 'Label', value: btn.label || '*(non défini)*', inline: true },
      { name: 'Emoji', value: btn.emoji || '*(aucun)*', inline: true },
      { name: 'Style', value: styleName(btn.style), inline: true },
      { name: 'Action', value: btn.actionType ? actionLabel(btn.actionType) : '*(non définie)*', inline: true },
    );

  const visualRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ebbtn_label').setLabel('✏️ Label').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ebbtn_emoji').setLabel('😀 Emoji').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ebbtn_style').setLabel('🎨 Style').setStyle(ButtonStyle.Secondary),
  );

  const actionSelectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ebbtn_action_type')
      .setPlaceholder('Sélectionner une action…')
      .addOptions([
        { label: '🎟️ Système de ticket', value: 'ticket' },
        { label: '🔗 Lien URL', value: 'link' },
        { label: '💬 Message éphémère', value: 'ephemeral' },
        { label: '📩 DM Utilisateur', value: 'dm' },
        { label: '🧾 Message salon', value: 'channel_msg' },
      ]),
  );

  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ebbtn_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ebbtn_save')
      .setLabel('✅ Sauvegarder')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!btn.label || !btn.actionType),
  );

  return { embeds: [embed], components: [visualRow, actionSelectRow, controlRow] };
}

function styleName(style) {
  const map = {
    [ButtonStyle.Primary]:   'Primary (Bleu)',
    [ButtonStyle.Secondary]: 'Secondary (Gris)',
    [ButtonStyle.Success]:   'Success (Vert)',
    [ButtonStyle.Danger]:    'Danger (Rouge)',
    [ButtonStyle.Link]:      'Link (URL)',
  };
  return map[style] || 'Primary';
}

function actionLabel(type) {
  const map = {
    ticket:      '🎟️ Ticket',
    link:        '🔗 Lien',
    ephemeral:   '💬 Éphémère',
    dm:          '📩 DM',
    channel_msg: '🧾 Message salon',
  };
  return map[type] || type;
}

// ─────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────
function modalForField(field) {
  const configs = {
    title: { title: '✏️ Modifier le titre', inputs: [{ id: 'value', label: 'Titre de l\'embed', style: TextInputStyle.Short, max: 256 }] },
    description: { title: '📝 Modifier la description', inputs: [{ id: 'value', label: 'Description', style: TextInputStyle.Paragraph, max: 4096 }] },
    color: { title: '🎨 Modifier la couleur', inputs: [{ id: 'value', label: 'Couleur hexadécimale (ex: #FF5733)', style: TextInputStyle.Short, max: 7 }] },
    footer: { title: '🔻 Modifier le footer', inputs: [{ id: 'value', label: 'Texte du footer', style: TextInputStyle.Short, max: 2048 }] },
    author: { title: '👤 Modifier l\'auteur', inputs: [{ id: 'value', label: 'Nom de l\'auteur', style: TextInputStyle.Short, max: 256 }] },
    image: { title: '🖼️ URL de l\'image principale', inputs: [{ id: 'value', label: 'URL (https://...)', style: TextInputStyle.Short, max: 1024 }] },
    thumbnail: { title: '🔲 URL du thumbnail', inputs: [{ id: 'value', label: 'URL (https://...)', style: TextInputStyle.Short, max: 1024 }] },
    btn_label: { title: '✏️ Label du bouton', inputs: [{ id: 'value', label: 'Texte du bouton', style: TextInputStyle.Short, max: 80 }] },
    btn_emoji: { title: '😀 Emoji du bouton', inputs: [{ id: 'value', label: 'Emoji (ex: 🎫 ou <:name:id>)', style: TextInputStyle.Short, max: 100 }] },
    btn_action_value: { title: '⚙️ Valeur de l\'action', inputs: [{ id: 'value', label: 'URL ou texte du message', style: TextInputStyle.Paragraph, max: 2000 }] },
    ticket_prefix: { title: '🎟️ Configuration ticket', inputs: [{ id: 'prefix', label: 'Préfixe du salon (ex: ticket-)', style: TextInputStyle.Short, max: 20 }] },
  };

  const cfg = configs[field];
  if (!cfg) return null;

  const modal = new ModalBuilder().setCustomId(`eb_modal_${field}`).setTitle(cfg.title);
  for (const inp of cfg.inputs) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId(inp.id).setLabel(inp.label).setStyle(inp.style).setMaxLength(inp.max).setRequired(false),
      ),
    );
  }
  return modal;
}

// ─────────────────────────────────────────────
// PUBLISH — CRÉATION DU MESSAGE FINAL (1 ligne par bouton)
// ─────────────────────────────────────────────
function compileFinalMessage(state, guild) {
  const embed = new EmbedBuilder()
    .setTitle(state.title || null)
    .setDescription(state.description || null)
    .setColor(state.color || Colors.Blurple);

  if (state.footer)    embed.setFooter({ text: state.footer });
  if (state.author)    embed.setAuthor({ name: state.author });
  if (state.image)     embed.setImage(state.image);
  if (state.thumbnail) embed.setThumbnail(state.thumbnail);

  const components = [];

  if (state.buttons.length > 0) {
    for (let i = 0; i < state.buttons.length; i++) {
      const btnRow = new ActionRowBuilder();
      const b = state.buttons[i];

      let customId;
      if (b.actionType === 'link') {
        const lb = new ButtonBuilder()
          .setLabel(b.label)
          .setStyle(ButtonStyle.Link)
          .setURL(b.actionValue || 'https://discord.com');
        if (b.emoji) lb.setEmoji(b.emoji);
        btnRow.addComponents(lb);
        components.push(btnRow);
        continue;
      } else if (b.actionType === 'ticket') {
        const roles = (b.ticketStaffRoles || []).join(';');
        customId = `action_ticket_${i}:${b.ticketCategory || ''}:${b.ticketPrefix || 'ticket-'}:${roles}`;
      } else {
        // Sauvegarde de l'action de texte (éphémère/DM/salon) dans le fichier JSON persistent
        const actionId = Math.random().toString(36).substring(2, 11);
        try {
          const { saveAction } = require('../utils/actionStorage');
          saveAction(actionId, b.actionValue || 'Pas de texte défini.');
        } catch (err) {
          console.error('[EmbedBuilder] Erreur actionStorage:', err);
        }
        customId = `action_${b.actionType}_${actionId}`;
      }

      if (customId.length > 100) customId = customId.slice(0, 100);

      const bb = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(b.label)
        .setStyle(b.style || ButtonStyle.Primary);

      if (b.emoji) bb.setEmoji(b.emoji);
      btnRow.addComponents(bb);
      components.push(btnRow); // Ajoute chaque bouton dans une ligne exclusive
    }
  }

  return { embed, components };
}

// ─────────────────────────────────────────────
// INTERACTION HANDLER
// ─────────────────────────────────────────────
async function startCollector(interaction, message) {
  const userId = interaction.user.id;
  const collector = message.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    time: 10 * 60 * 1000,
  });

  collector.on('collect', async (i) => {
    const state = sessions.get(userId);
    if (!state) { collector.stop('session_lost'); return; }

    if (i.customId === 'eb_next') {
      state.step = Math.min(state.step + 1, 4);
      await i.update(renderStep(state));
      return;
    }
    if (i.customId === 'eb_prev') {
      state.step = Math.max(state.step - 1, 1);
      await i.update(renderStep(state));
      return;
    }

    const fieldMap = { eb_title: 'title', eb_description: 'description', eb_color: 'color', eb_footer: 'footer', eb_author: 'author' };
    if (fieldMap[i.customId]) {
      const modal = modalForField(fieldMap[i.customId]);
      await i.showModal(modal);
      const submitted = await i.awaitModalSubmit({ filter: (m) => m.user.id === userId && m.customId === `eb_modal_${fieldMap[i.customId]}`, time: 5 * 60 * 1000 }).catch(() => null);
      if (!submitted) return;
      const value = submitted.fields.getTextInputValue('value').trim();
      if (value) state[fieldMap[i.customId]] = value;
      await submitted.update(renderStep(state));
      return;
    }

    if (i.customId === 'eb_image' || i.customId === 'eb_thumbnail') {
      const field = i.customId === 'eb_image' ? 'image' : 'thumbnail';
      const modal = modalForField(field);
      await i.showModal(modal);
      const submitted = await i.awaitModalSubmit({ filter: (m) => m.user.id === userId && m.customId === `eb_modal_${field}`, time: 5 * 60 * 1000 }).catch(() => null);
      if (!submitted) return;
      state[field] = submitted.fields.getTextInputValue('value').trim() || null;
      await submitted.update(renderStep(state));
      return;
    }

    if (i.customId === 'eb_reset_images') {
      state.image = null;
      state.thumbnail = null;
      await i.update(renderStep(state));
      return;
    }

    if (i.customId === 'eb_add_button') {
      const newIndex = state.buttons.length;
      state.buttons.push({ id: `btn_${newIndex}`, label: '', emoji: null, style: ButtonStyle.Primary, actionType: null, actionValue: null, ticketCategory: null, ticketPrefix: 'ticket-', ticketStaffRoles: [] });
      state.editingButtonIndex = newIndex;
      await i.update(renderButtonConfig(state, newIndex));
      return;
    }

    if (i.customId.startsWith('eb_edit_btn_')) {
      const idx = parseInt(i.customId.split('_').pop(), 10);
      state.editingButtonIndex = idx;
      await i.update(renderButtonConfig(state, idx));
      return;
    }

    const idx = state.editingButtonIndex;
    if (i.customId === 'ebbtn_label') {
      const modal = modalForField('btn_label');
      await i.showModal(modal);
      const sub = await i.awaitModalSubmit({ filter: (m) => m.user.id === userId && m.customId === 'eb_modal_btn_label', time: 5 * 60 * 1000 }).catch(() => null);
      if (!sub) return;
      state.buttons[idx].label = sub.fields.getTextInputValue('value').trim() || state.buttons[idx].label;
      await sub.update(renderButtonConfig(state, idx));
      return;
    }

    if (i.customId === 'ebbtn_emoji') {
      const modal = modalForField('btn_emoji');
      await i.showModal(modal);
      const sub = await i.awaitModalSubmit({ filter: (m) => m.user.id === userId && m.customId === 'eb_modal_btn_emoji', time: 5 * 60 * 1000 }).catch(() => null);
      if (!sub) return;
      state.buttons[idx].emoji = sub.fields.getTextInputValue('value').trim() || null;
      await sub.update(renderButtonConfig(state, idx));
      return;
    }

    if (i.customId === 'ebbtn_style') {
      const styles = [ButtonStyle.Primary, ButtonStyle.Secondary, ButtonStyle.Success, ButtonStyle.Danger];
      const current = styles.indexOf(state.buttons[idx].style);
      state.buttons[idx].style = styles[(current + 1) % styles.length];
      await i.update(renderButtonConfig(state, idx));
      return;
    }

    if (i.customId === 'ebbtn_action_type') {
      const selected = i.values[0];
      state.buttons[idx].actionType = selected;

      if (selected === 'ticket') {
        await i.update(await renderTicketConfig(state, idx));
        return;
      }

      if (['ephemeral', 'dm', 'channel_msg', 'link'].includes(selected)) {
        const modal = modalForField('btn_action_value');
        modal.setCustomId('eb_modal_btn_action_value').setTitle(selected === 'link' ? '🔗 URL du lien' : '✉️ Contenu du message');
        await i.showModal(modal);
        const sub = await i.awaitModalSubmit({ filter: (m) => m.user.id === userId && m.customId === 'eb_modal_btn_action_value', time: 5 * 60 * 1000 }).catch(() => null);
        if (!sub) return;
        state.buttons[idx].actionValue = sub.fields.getTextInputValue('value').trim() || null;
        await sub.update(renderButtonConfig(state, idx));
        return;
      }
      await i.update(renderButtonConfig(state, idx));
      return;
    }

    if (i.customId === 'ebbtn_ticket_prefix') {
      const modal = modalForField('ticket_prefix');
      await i.showModal(modal);
      const sub = await i.awaitModalSubmit({ filter: (m) => m.user.id === userId && m.customId === 'eb_modal_ticket_prefix', time: 5 * 60 * 1000 }).catch(() => null);
      if (!sub) return;
      state.buttons[idx].ticketPrefix = sub.fields.getTextInputValue('prefix').trim() || 'ticket-';
      await sub.update(await renderTicketConfig(state, idx));
      return;
    }

    if (i.customId === 'ebbtn_ticket_roles' && i.componentType === ComponentType.RoleSelect) {
      state.buttons[idx].ticketStaffRoles = i.values;
      await i.update(await renderTicketConfig(state, idx));
      return;
    }

    if (i.customId === 'ebbtn_ticket_category') {
      state.buttons[idx].ticketCategory = i.values[0];
      await i.update(await renderTicketConfig(state, idx));
      return;
    }

    if (i.customId === 'ebbtn_ticket_done') {
      await i.update(renderButtonConfig(state, idx));
      return;
    }

    if (i.customId === 'ebbtn_save') {
      state.editingButtonIndex = -1;
      state.step = 3;
      await i.update(renderStep(state));
      return;
    }

    if (i.customId === 'ebbtn_cancel') {
      if (!state.buttons[idx]?.label) state.buttons.splice(idx, 1);
      state.editingButtonIndex = -1;
      state.step = 3;
      await i.update(renderStep(state));
      return;
    }

    if (i.customId === 'eb_channel_select') {
      state.targetChannel = i.values[0];
      await i.update(renderStep(state));
      return;
    }

    if (i.customId === 'eb_publish') {
      await handlePublish(i, state, interaction.guild);
      collector.stop('published');
      sessions.delete(userId);
      return;
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'published') return;
    sessions.delete(userId);
    await message.edit({
      embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('⏰ Session expirée').setDescription('Votre session de builder d\'embed a expiré. Relancez `/embed` pour recommencer.')],
      components: [],
    }).catch(() => null);
  });
}

// ─────────────────────────────────────────────
// TICKET CONFIG VIEW
// ─────────────────────────────────────────────
async function renderTicketConfig(state, index) {
  const btn = state.buttons[index];
  const embed = new EmbedBuilder()
    .setTitle('🎟️ Configuration du ticket')
    .setColor('#FFD700')
    .addFields(
      { name: 'Préfixe', value: btn.ticketPrefix || 'ticket-', inline: true },
      { name: 'Catégorie', value: btn.ticketCategory || '*(non sélectionnée)*', inline: true },
      { name: 'Rôles staff', value: btn.ticketStaffRoles.length ? btn.ticketStaffRoles.map((r) => `<@&${r}>`).join(', ') : '*(aucun)*', inline: false },
    );

  const prefixRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ebbtn_ticket_prefix').setLabel('✏️ Préfixe').setStyle(ButtonStyle.Secondary));
  const categoryRow = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('ebbtn_ticket_category').setPlaceholder('📁 Sélectionner la catégorie parente').addChannelTypes(ChannelType.GuildCategory));
  const rolesRow = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('ebbtn_ticket_roles').setPlaceholder('🛡️ Rôles staff (multi-sélection)').setMinValues(0).setMaxValues(10));
  const doneRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ebbtn_ticket_done').setLabel('✅ Confirmer').setStyle(ButtonStyle.Success));

  return { embeds: [embed], components: [prefixRow, categoryRow, rolesRow, doneRow] };
}

// ─────────────────────────────────────────────
// PUBLISH HANDLER
// ─────────────────────────────────────────────
async function handlePublish(interaction, state, guild) {
  const channel = guild.channels.cache.get(state.targetChannel);
  if (!channel) {
    await interaction.reply({ content: '❌ Salon introuvable.', ephemeral: true });
    return;
  }

  const { embed, components } = compileFinalMessage(state, guild);

  try {
    await channel.send({ embeds: [embed], components });
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(Colors.Green).setTitle('✅ Embed publié !').setDescription(`Votre embed a été envoyé dans <#${state.targetChannel}>.`)],
      components: [],
    });
  } catch (err) {
    console.error('[embed] Publish error:', err);
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(Colors.Red).setTitle('❌ Erreur de publication').setDescription(`Impossible d'envoyer l'embed : ${err.message}`)],
      components: [],
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder().setName('embed').setDescription('Ouvre le builder d\'embed interactif guidé par étapes.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const userId = interaction.user.id;
    sessions.set(userId, createSession());
    const state = sessions.get(userId);
    const payload = renderStep(state);
    const reply = await interaction.reply({ ...payload, ephemeral: true, fetchReply: true });
    await startCollector(interaction, reply);
  },
  sessions,
};
