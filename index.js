'use strict';

const {
  Client,
  GatewayIntentBits,
  Collection,
  PresenceUpdateStatus,
  ActivityType,
  REST,
  Routes,
} = require('discord.js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ─────────────────────────────────────────────
// CONFIGURATION DU CLIENT DISCORD
// ─────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  presence: {
    status: PresenceUpdateStatus.DoNotDisturb,
    activities: [
      {
        name: '/help pour voir les commandes',
        type: ActivityType.Listening,
      },
    ],
  },
});

// ─────────────────────────────────────────────
// CHARGEMENT AUTOMATIQUE DES COMMANDES
// ─────────────────────────────────────────────
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'src', 'commands');

if (!fs.existsSync(commandsPath)) {
  fs.mkdirSync(commandsPath, { recursive: true });
}

const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
const commandData = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  commandData.push(command.data.toJSON());
}

// ─────────────────────────────────────────────
// ENREGISTREMENT SUR L'API DISCORD AU LANCEMENT
// ─────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔄 Enregistrement des commandes slash (/) en cours...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandData }
    );
    console.log('✅ Commandes slash (/) enregistrées avec succès au niveau mondial !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
  }
});

// ─────────────────────────────────────────────
// GESTION DES INTERACTIONS ET SÉCURITÉ ANTI-CRASH
// ─────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  // ── Commandes Slash (/) ──
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[${interaction.commandName}] Erreur:`, err);
      const payload = { content: '❌ Une erreur est survenue lors de l\'exécution.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
    return;
  }

  // ── Boutons et Menus de Sélection ──
  if (interaction.isButton() || interaction.isAnySelectMenu()) {
    const customId = interaction.customId;

    // 1. Routage des boutons finaux des embeds publiés (Tickets, DM, Ephemeral...)
    if (customId.startsWith('action_')) {
      const handler = require('./src/handlers/buttonActions');
      await handler(interaction, client).catch((err) => {
        console.error('[buttonActions] Erreur:', err);
      });
      return;
    }

// 2. Sécurité anti "Échec de l'interaction" pour le builder (/embed)
    if (customId.startsWith('eb_') || customId.startsWith('ebbtn_')) {
      const sessions = require('./src/utils/sessionStorage');
      
      if (!sessions.has(interaction.user.id)) {
        await interaction.reply({
          content: '❌ **Session expirée** : Le bot a redémarré ou vous avez été inactif trop longtemps. Veuillez relancer la commande `/embed`.',
          ephemeral: true
        }).catch(() => null);
      }
    }
  }
});

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);
