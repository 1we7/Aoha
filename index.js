require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildInvites
    ]
});

client.commands = new Collection();
client.commandArray = [];
const voiceProfiles = new Map();

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ stats: {}, giveaways: {}, pendingPings: {} }, null, 4));
}

client.getDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
client.saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

// Chargement des commandes avec try/catch pour que si un fichier plante, les autres chargent quand même
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            client.commandArray.push(command.data.toJSON());
            console.log(`✅ Commande chargée : ${command.data.name}`);
        }
    } catch (err) {
        console.error(`❌ Erreur chargement ${file} :`, err.message);
    }
}

client.once('ready', async () => {
    console.log(`🤖 Bot connecté : ${client.user.tag}`);
    console.log(`📦 ${client.commandArray.length} commandes à déployer...`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        if (process.env.GUILD_ID) {
            // Déploiement instantané sur le serveur spécifique
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
                { body: client.commandArray }
            );
            console.log('✅ Commandes déployées sur le serveur (instantané).');
        } else {
            // Déploiement global (peut prendre jusqu'à 1h)
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: client.commandArray }
            );
            console.log('✅ Commandes déployées globalement.');
        }
    } catch (error) {
        console.error('❌ Erreur de déploiement des commandes:', error);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const db = client.getDB();
    if (!db.stats[message.author.id]) db.stats[message.author.id] = { messages: 0, voiceTime: 0 };
    db.stats[message.author.id].messages += 1;
    client.saveDB(db);

    if (message.content.toLowerCase() === 's?u') {
        const userData = db.stats[message.author.id] || { messages: 1, voiceTime: 0 };
        const hours = Math.floor(userData.voiceTime / 3600);
        const minutes = Math.floor((userData.voiceTime % 3600) / 60);
        const statEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`📊 Statistiques de ${message.author.username}`)
            .addFields(
                { name: '💬 Messages envoyés', value: `${userData.messages} messages`, inline: true },
                { name: '🔊 Temps en vocal', value: `${hours}h ${minutes}m`, inline: true }
            )
            .setTimestamp();
        return message.reply({ embeds: [statEmbed] });
    }

    const hasSensitivePing = message.mentions.everyone || message.mentions.roles.some(role =>
        ['staff', 'admin', 'modérateur', 'moderator', 'fondateur', 'owner'].some(keyword =>
            role.name.toLowerCase().includes(keyword)
        )
    );

    if (hasSensitivePing && message.author.id !== message.guild.ownerId) {
        const originalContent = message.content;
        const authorId = message.author.id;
        const channelId = message.channel.id;

        try { await message.delete(); } catch (e) {}

        const pingId = Date.now().toString();
        const dbNow = client.getDB();
        dbNow.pendingPings[pingId] = { authorId, channelId, content: originalContent };
        client.saveDB(dbNow);

        const controlEmbed = new EmbedBuilder()
            .setColor('#ffcc00')
            .setTitle('⚠️ Tentative de mention sensible interceptée')
            .setDescription(`**Membre :** <@${authorId}>\n**Salon :** <#${channelId}>\n**Contenu :** ${originalContent}`)
            .setFooter({ text: 'Action requise de l\'Owner du serveur uniquement' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ping_approve_${pingId}`).setLabel('Valider le ping').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`ping_deny_${pingId}`).setLabel('Annuler et avertir').setStyle(ButtonStyle.Danger)
        );

        const alertMsg = await message.channel.send({ embeds: [controlEmbed], components: [row] });
        setTimeout(async () => {
            try { await alertMsg.delete(); } catch (e) {}
        }, 300000);
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.user.bot) return;

    if (!oldState.channelId && newState.channelId) {
        voiceProfiles.set(newState.member.id, Date.now());
    } else if (oldState.channelId && !newState.channelId) {
        const joinTime = voiceProfiles.get(newState.member.id);
        if (joinTime) {
            const timeSpent = Math.floor((Date.now() - joinTime) / 1000);
            const db = client.getDB();
            if (!db.stats[newState.member.id]) db.stats[newState.member.id] = { messages: 0, voiceTime: 0 };
            db.stats[newState.member.id].voiceTime += timeSpent;
            client.saveDB(db);
            voiceProfiles.delete(newState.member.id);
        }
    }
});

const interactionHandler = require('./src/handlers/buttonActions.js');
client.on('interactionCreate', async (interaction) => {
    await interactionHandler.execute(interaction, client);
});

client.login(process.env.TOKEN);
