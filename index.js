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
// CLIENT SETUP
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
// COMMAND LOADER
// ─────────────────────────────────────────────
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'src', 'commands');

const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
const commandData = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  commandData.push(command.data.toJSON());
}

// ─────────────────────────────────────────────
// READY + SLASH COMMAND REGISTRATION
// ─────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔄 Enregistrement des commandes slash...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commandData });
    console.log('✅ Commandes enregistrées.');
  } catch (err) {
    console.error('❌ Erreur lors de l\'enregistrement des commandes:', err);
  }
});

// ─────────────────────────────────────────────
// INTERACTION HANDLER
// ─────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  // ── Slash Commands ──────────────────────────
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[${interaction.commandName}] Error:`, err);
      const payload = { content: '❌ Une erreur est survenue.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
    return;
  }

  // ── Button / Select interactions from PUBLISHED embeds ──────────────────
  // (handled by the button-actions handler — to be generated in Part 2)
  if (interaction.isButton() || interaction.isAnySelectMenu()) {
    const customId = interaction.customId;

    // Only route action_* customIds (published embed buttons)
    if (customId.startsWith('action_')) {
      const handler = require('./src/handlers/buttonActions');
      await handler(interaction, client).catch((err) => {
        console.error('[buttonActions] Error:', err);
      });
    }
    // Builder interactions are handled by the collector inside embed.js — no routing needed here.
  }
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
