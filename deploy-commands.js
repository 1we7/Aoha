const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// ⚠️ À REMPLACER PAR TES VRAIES INFOS
const clientId = 'ID_DE_TON_BOT'; // L'ID de l'application de ton bot
const guildId = 'ID_DE_TON_SERVEUR'; // L'ID de ton serveur Discord (pour que ça s'affiche instantanément)
const token = 'TOKEN_DE_TON_BOT'; // Le token de ton bot

const commands = [];
// On va chercher toutes tes commandes dans le dossier "commands"
const commandsPath = path.join(__dirname, 'commands'); 
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // On vérifie que le fichier est bien structuré
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[ATTENTION] La commande dans ${file} n'a pas les propriétés "data" ou "execute".`);
    }
}

// Préparation de la requête vers l'API Discord
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`🚀 Lancement du déploiement de ${commands.length} commandes (/) ...`);

        // On pousse les commandes sur TON serveur spécifique
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`✅ Succès ! ${data.length} commandes (/) ont été enregistrées sur le serveur.`);
    } catch (error) {
        console.error('❌ Une erreur est survenue lors du déploiement :', error);
    }
})();
