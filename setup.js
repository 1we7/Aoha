const fs = require('fs');
const path = require('path');

// 1. Création de l'arborescence
const dirs = ['src/commands', 'src/handlers', 'src/utils', 'data'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Base de données des fichiers et de leur contenu final
const files = {
    'index.js': `'use strict';
const { Client, GatewayIntentBits, Collection, PresenceUpdateStatus, ActivityType, REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  presence: { status: PresenceUpdateStatus.DoNotDisturb, activities: [{ name: '/help pour voir les commandes', type: ActivityType.Listening }] },
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
const commandData = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  commandData.push(command.data.toJSON());
}

client.once('ready', async () => {
  console.log(\`✅ Connecté en tant que \${client.user.tag}\`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commandData });
    console.log('✅ Commandes slash (/) enregistrées !');
  } catch (error) {
    console.error('❌ Erreur d\\'enregistrement:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try { await command.execute(interaction); } 
    catch (err) { console.error(err); await interaction.reply({ content: '❌ Erreur.', ephemeral: true }).catch(()=>null); }
  } else if (interaction.isButton() || interaction.isAnySelectMenu()) {
    if (interaction.customId.startsWith('action_')) {
      require('./src/handlers/buttonActions')(interaction, client).catch(console.error);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);`,

    'src/utils/actionStorage.js': `'use strict';
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, '../../data/published_actions.json');

function saveAction(actionId, config) {
  let data = {};
  if (fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  data[actionId] = config;
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getAction(actionId) {
  if (!fs.existsSync(DATA_FILE)) return null;
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))[actionId] || null;
}
module.exports = { saveAction, getAction };`,

    'src/utils/ticketCounter.js': `'use strict';
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, '../../data/ticket_counters.json');

function nextTicketName(guildId, prefix) {
  let data = {};
  try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch {}
  const key = \`\${guildId}_\${prefix}\`;
  const count = (data[key] ?? 0) + 1;
  data[key] = count;
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return \`\${prefix}\${String(count).padStart(3, '0')}\`;
}
module.exports = { nextTicketName };`
};

// 3. Écriture des fichiers
for (const [filePath, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(__dirname, filePath), content);
    console.log(`✔️ Fichier généré : ${filePath}`);
}

// 4. Nettoyage des vieux fichiers à la racine
const oldFiles = ['embed.js', 'help.js', 'buttonActions.js', 'ticketCounter.js', 'actionStorage.txt'];
oldFiles.forEach(f => {
    if (fs.existsSync(f)) {
        fs.unlinkSync(f);
        console.log(`🗑️ Ancien fichier supprimé : ${f}`);
    }
});

console.log('🚀 Migration terminée ! Tu peux faire ton commit Git et push sur GitHub.');
