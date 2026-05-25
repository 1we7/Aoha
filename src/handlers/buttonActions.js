'use strict';

const { ChannelType, PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');
const { getAction } = require('../utils/actionStorage');
const { nextTicketName } = require('../utils/ticketCounter');

module.exports = async function buttonActions(interaction, client) {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;

  // ── 1. GESTION DU SYSTÈME DE TICKETS ────────────────
  if (customId.startsWith('action_ticket_')) {
    const parts = customId.split(':');
    const categoryId = parts[1] || null;
    const prefix = parts[2] || 'ticket-';
    const rolesStr = parts[3] || '';
    const staffRoles = rolesStr ? rolesStr.split(';') : [];

    await interaction.deferReply({ ephemeral: true });

    // Compteur persistant
    const channelName = nextTicketName(interaction.guild.id, prefix);

    const permissionOverwrites = [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];

    for (const roleId of staffRoles) {
      if (roleId) {
        permissionOverwrites.push({
          id: roleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
      }
    }

    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId || null,
        permissionOverwrites,
      });

      await ticketChannel.send({
        content: `👋 Bienvenue <@${interaction.user.id}> dans votre ticket.\nLe personnel d'administration va vous prendre en charge sous peu.`,
      });

      await interaction.editReply({ content: `✅ Votre ticket privé a été ouvert avec succès ici : ${ticketChannel}` });
    } catch (err) {
      console.error('[Ticket System] Erreur de création du salon:', err);
      await interaction.editReply({ content: `❌ Impossible de créer le salon du ticket. Vérifiez mes permissions "Gérer les salons".` });
    }
    return;
  }

  // ── 2. GESTION DES ACTIONS TEXTUELLES (DATA PERSISTANTE) ──
  let actionType = null;
  let actionId = null;

  if (customId.startsWith('action_ephemeral_')) {
    actionType = 'ephemeral';
    actionId = customId.replace('action_ephemeral_', '');
  } else if (customId.startsWith('action_dm_')) {
    actionType = 'dm';
    actionId = customId.replace('action_dm_', '');
  } else if (customId.startsWith('action_channel_msg_')) {
    actionType = 'channel_msg';
    actionId = customId.replace('action_channel_msg_', '');
  }

  if (actionType && actionId) {
    const textMessage = getAction(actionId) || "Contenu textuel introuvable ou expiré.";

    if (actionType === 'ephemeral') {
      await interaction.reply({ content: textMessage, ephemeral: true });
    } 
    else if (actionType === 'dm') {
      try {
        await interaction.user.send({ content: textMessage });
        await interaction.reply({ content: "📥 Je vous ai envoyé la réponse dans vos messages privés !", ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: "❌ Impossible de vous envoyer un DM. Vos messages privés sur ce serveur sont probablement fermés.", ephemeral: true });
      }
    } 
    else if (actionType === 'channel_msg') {
      await interaction.reply({ content: "✅ Message envoyé dans le salon.", ephemeral: true });
      await interaction.channel.send({ content: textMessage });
    }
  }
};
