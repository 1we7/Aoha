'use strict';

const { 
  ChannelType, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  Colors 
} = require('discord.js');
const { getAction } = require('../utils/actionStorage');
const { nextTicketName } = require('../utils/ticketCounter');

/**
 * Gestionnaire principal des boutons d'action générés par Aoha Bot.
 * @param {import('discord.js').Interaction} interaction
 * @param {import('discord.js').Client} client
 */
module.exports = async function buttonActions(interaction, client) {
  const customId = interaction.customId;

  // Extraction de l'ID unique de l'action (ex: "action_act_32m1z9_abc12" -> "act_32m1z9_abc12")
  const actionId = customId.replace('action_', '');
  
  // Récupération de la configuration sauvegardée sur le disque
  const config = getAction(actionId);

  // Sécurité anti-crash si l'embed est très vieux ou si le fichier JSON a été supprimé
  if (!config) {
    return interaction.reply({
      content: '❌ Cette action a expiré ou n\'existe plus dans la base de données de Aoha Bot.',
      ephemeral: true
    });
  }

  const { actionType, actionValue, ticketCategory, ticketPrefix, ticketStaffRoles } = config;

  try {
    switch (actionType) {
      
      // 💬 Message Éphémère
      case 'ephemeral':
        await interaction.reply({ content: actionValue, ephemeral: true });
        break;

      // 📩 Message Privé (DM)
      case 'dm':
        try {
          await interaction.user.send({ content: actionValue });
          await interaction.reply({ content: '✅ Message envoyé en DM !', ephemeral: true });
        } catch (err) {
          // Gestion du cas où l'utilisateur a bloqué les MPs du serveur
          await interaction.reply({ 
            content: '❌ Impossible de vous envoyer un DM. Vos messages privés sont fermés pour ce serveur.', 
            ephemeral: true 
          });
        }
        break;

      // 🧾 Message Classique dans le salon
      case 'channel_msg':
        await interaction.channel.send({ content: actionValue });
        await interaction.reply({ content: '✅ Message envoyé.', ephemeral: true });
        break;

      // 🎟️ Création de Ticket
      case 'ticket':
        await handleTicketCreation(interaction, ticketPrefix, ticketCategory, ticketStaffRoles);
        break;

      default:
        await interaction.reply({ content: '❌ Type d\'action inconnu.', ephemeral: true });
        break;
    }
  } catch (error) {
    console.error(`[ButtonActions] Erreur lors de l'exécution de ${actionType}:`, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Une erreur est survenue lors du traitement de l\'action.', ephemeral: true });
    }
  }
};

// ─────────────────────────────────────────────
// LOGIQUE DE CRÉATION DE TICKET SÉCURISÉE
// ─────────────────────────────────────────────
async function handleTicketCreation(interaction, prefix, categoryId, staffRoles) {
  const guild = interaction.guild;
  const user = interaction.user;

  // 1. Vérification des permissions du bot
  if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ 
      content: '❌ Aoha Bot n\'a pas la permission de créer des salons (`Gérer les salons`).', 
      ephemeral: true 
    });
  }

  // 2. On fait patienter Discord (la création de salon peut prendre plus de 3 secondes)
  await interaction.deferReply({ ephemeral: true });

  // 3. Génération du nom unique (ex: ticket-001)
  const ticketName = nextTicketName(guild.id, prefix || 'ticket-');

  // 4. Configuration stricte des permissions (Zero Trust par défaut)
  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel], // Personne ne voit le salon
    },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // Le créateur le voit
    },
    {
      id: guild.members.me.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels], // Aoha Bot le voit
    }
  ];

  // 5. Ajout des permissions pour les rôles Staff sélectionnés dans l'embed builder
  if (staffRoles && staffRoles.length > 0) {
    for (const roleId of staffRoles) {
      permissionOverwrites.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      });
    }
  }

  // 6. Paramétrage du salon
  const channelOptions = {
    name: ticketName,
    type: ChannelType.GuildText,
    permissionOverwrites,
  };

  // Ajout à la catégorie parente si elle existe toujours
  if (categoryId) {
    const category = guild.channels.cache.get(categoryId);
    if (category && category.type === ChannelType.GuildCategory) {
      channelOptions.parent = category.id;
    }
  }

  // 7. Création et notification
  const ticketChannel = await guild.channels.create(channelOptions);

  const welcomeEmbed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle(`🎟️ Ticket de ${user.username}`)
    .setDescription('Un membre de l\'équipe va vous répondre sous peu.\nMerci de décrire votre demande en détail ici.')
    .setTimestamp();

  // On ping l'utilisateur et le(s) rôle(s) staff
  const pings = [
    `<@${user.id}>`,
    ...(staffRoles || []).map(roleId => `<@&${roleId}>`)
  ].join(' ');

  await ticketChannel.send({
    content: pings,
    embeds: [welcomeEmbed]
  });

  // 8. Confirmation finale sur le bouton
  await interaction.editReply({ content: `✅ Votre ticket a été créé avec succès : ${ticketChannel}` });
}
