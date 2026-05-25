const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

// ⚠️ À REMPLACER PAR TES VRAIES INFOS (ou utilise un .env)
const clientId = process.env.CLIENT_ID || 'ID_DE_TON_BOT';
const guildId = process.env.GUILD_ID || 'ID_DE_TON_SERVEUR';
const token = process.env.TOKEN || 'TOKEN_DE_TON_BOT';

const commands = [];

// ✅ CORRIGÉ : chemin vers src/commands (et non commands/)
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Commande chargée : ${command.data.name}`);
    } else {
        console.log(`[ATTENTION] La commande dans ${file} n'a pas les propriétés "data" ou "execute".`);
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`\n🚀 Lancement du déploiement de ${commands.length} commandes (/) ...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`✅ Succès ! ${data.length} commandes (/) ont été enregistrées sur le serveur.`);
    } catch (error) {
        console.error('❌ Une erreur est survenue lors du déploiement :', error);
    }
})();
