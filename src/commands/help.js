'use strict';

const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche l\'aide et les commandes disponibles.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📚 Aide — Embed Builder Bot')
      .setColor(Colors.Blurple)
      .setDescription(
        'Bienvenue ! Ce bot vous permet de créer des embeds Discord riches et interactifs ' +
        'avec un système de boutons configurables (tickets, DM, messages éphémères, liens).',
      )
      .addFields(
        {
          name: '`/embed`',
          value:
            'Lance le builder d\'embed interactif en **4 étapes guidées** :\n' +
            '> **Étape 1** — Contenu (Titre, Description, Couleur, Footer, Auteur)\n' +
            '> **Étape 2** — Images (Image principale, Thumbnail)\n' +
            '> **Étape 3** — Boutons interactifs (jusqu\'à 5 boutons)\n' +
            '> **Étape 4** — Salon de publication & envoi\n\n' +
            '📌 *L\'interface est éphémère et vous guidera pas à pas.*',
        },
        {
          name: '`/help`',
          value: 'Affiche ce message d\'aide.',
        },
        {
          name: '🎟️ Système de Tickets',
          value:
            'Lors de la configuration d\'un bouton en **mode Ticket**, vous pouvez :\n' +
            '• Choisir un **préfixe** de salon (ex: `ticket-`)\n' +
            '• Sélectionner une **catégorie parente** pour les tickets\n' +
            '• Définir les **rôles staff** autorisés à voir les tickets (multi-sélection)\n\n' +
            '➡️ Quand un membre clique sur le bouton, un **salon privé** est créé ' +
            'automatiquement avec les bonnes permissions (membre + staff).',
        },
        {
          name: '⚡ Actions disponibles pour les boutons',
          value:
            '• 🎟️ **Ticket** — Crée un salon privé\n' +
            '• 🔗 **Lien** — Redirige vers une URL\n' +
            '• 💬 **Message Éphémère** — Répond en privé à l\'utilisateur\n' +
            '• 📩 **DM** — Envoie un message en DM\n' +
            '• 🧾 **Message Salon** — Envoie un message dans le salon',
        },
      )
      .setFooter({ text: 'Session builder : 10 min max • Requiert la permission Gérer les messages pour /embed' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
