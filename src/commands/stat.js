// commands/stat.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STATS_FILE)) fs.writeFileSync(STATS_FILE, JSON.stringify({}), 'utf8');

function loadStats(){ try { return JSON.parse(fs.readFileSync(STATS_FILE,'utf8')||'{}'); } catch { return {}; } }
function saveStats(s){ fs.writeFileSync(STATS_FILE, JSON.stringify(s,null,2),'utf8'); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stat')
    .setDescription('Afficher vos statistiques messages & vocales'),

  async execute(interaction) {
    const stats = loadStats();
    const uid = interaction.user.id;
    const userStats = stats[uid] || { messages: 0, voice_seconds: 0 };
    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.tag} — Statistiques`)
      .addFields(
        { name: 'Messages envoyés', value: `${userStats.messages}`, inline: true },
        { name: 'Temps vocal (s)', value: `${userStats.voice_seconds}`, inline: true }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: false });
  },

  // Helpers to be called from messageCreate and voiceStateUpdate in your central event handlers:
  incrementMessage(userId) {
    const s = loadStats();
    if (!s[userId]) s[userId] = { messages: 0, voice_seconds: 0 };
    s[userId].messages += 1;
    saveStats(s);
  },
  addVoiceTime(userId, seconds) {
    const s = loadStats();
    if (!s[userId]) s[userId] = { messages: 0, voice_seconds: 0 };
    s[userId].voice_seconds += seconds;
    saveStats(s);
  }
};
