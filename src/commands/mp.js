// commands/mp.js
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MP_STORE = path.join(DATA_DIR, 'mp_store.json');

// Ensure data dir/file
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MP_STORE)) fs.writeFileSync(MP_STORE, JSON.stringify({}), 'utf8');

const loadStore = () => {
  try { return JSON.parse(fs.readFileSync(MP_STORE, 'utf8') || '{}'); }
  catch { return {}; }
};
const saveStore = (obj) => fs.writeFileSync(MP_STORE, JSON.stringify(obj, null, 2), 'utf8');

let mpStore = loadStore();

/* ------------------ Filtrage strict (whitelist) ------------------ */
/*
  Autorisé UNIQUEMENT :
  - Lettres latines A-Z a-z
  - Chiffres 0-9
  - Accents français courants : é è à ù ç â ê î ô û ë ï ü (et majuscules)
  - Ponctuation de base : . , ! ? ' -
  - Espaces ASCII normaux
  Tout le reste est rejeté (cyrillique, symboles, emojis, polices modifiées, espaces non standards).
*/
const WHITELIST_REGEX = /^[A-Za-z0-9éèàùçâêîôûëïüÉÈÀÙÇÂÊÎÔÛËÏÜ\.\,\!\?\'\-\s]+$/u;

// Liste noire d'insultes basique (à étendre si besoin)
const BLACKLIST = [
  'connard','salope','pute','enculé','nique','ta mère','fdp','salo','merde','salaud','pd'
];

// Normalisation et vérification stricte
function normalizeAndValidate(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'Type invalide.' };

  // Normalisation Unicode pour neutraliser polices modifiées
  let s = text.normalize('NFKC');

  // Remplacer NBSP par espace normal
  s = s.replace(/\u00A0/g, ' ').trim();

  if (s.length === 0) return { ok: false, reason: 'Message vide.' };
  if (s.length > 4000) return { ok: false, reason: 'Message trop long.' };

  // Test whitelist
  if (!WHITELIST_REGEX.test(s)) return { ok: false, reason: 'Caractères non autorisés détectés.' };

  // Blacklist (simple includes)
  const lower = s.toLowerCase();
  for (const bad of BLACKLIST) {
    if (lower.includes(bad)) return { ok: false, reason: 'Langage interdit détecté.' };
  }

  return { ok: true, text: s };
}

/* ------------------ Helpers ------------------ */
function makeModalCustomId(fromId, toId) {
  // mp_modal|from|to
  return `mp_modal|${fromId}|${toId}`;
}
function makeReplyModalCustomId(fromId, toId) {
  // mp_reply_modal|from|to
  return `mp_reply_modal|${fromId}|${toId}`;
}
function makeReplyButtonCustomId(fromId, toId, token = '') {
  // mp_reply_btn|from|to|token
  return `mp_reply_btn|${fromId}|${toId}|${token}`;
}

/* ------------------ Export command ------------------ */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('mp')
    .setDescription('Envoyer un message privé anonyme à un membre')
    .addUserOption(opt => opt.setName('cible').setDescription('Membre à contacter').setRequired(true)),

  /**
   * execute(interaction)
   * - appelé par ton loader quand la commande slash /mp est utilisée.
   * - ouvre un Modal (via interaction.showModal) pour que l'utilisateur saisisse son texte.
   */
  async execute(interaction) {
    try {
      const cible = interaction.options.getUser('cible');
      if (!cible) return interaction.reply({ content: 'Cible introuvable.', ephemeral: true });

      // Construire modal
      const modal = new ModalBuilder()
        .setCustomId(makeModalCustomId(interaction.user.id, cible.id))
        .setTitle('Envoyer un MP anonyme');

      const input = new TextInputBuilder()
        .setCustomId('mp_text')
        .setLabel('Votre message (texte uniquement)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Écris ton message ici...')
        .setRequired(true)
        .setMaxLength(2000);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      await interaction.showModal(modal);
      // Pas de reply ici : le modal s'affiche directement
    } catch (err) {
      console.error('mp.execute error', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Impossible d’ouvrir le formulaire.', ephemeral: true });
      }
    }
  },

  /**
   * handleModal(interaction)
   * - appelé par ton interactionCreate central quand interaction.isModalSubmit() === true
   * - ce handler gère deux customId : mp_modal|from|to  et mp_reply_modal|from|to
   */
  async handleModal(interaction) {
    try {
      if (!interaction.isModalSubmit()) return false;
      const cid = interaction.customId;
      if (!cid || (!cid.startsWith('mp_modal|') && !cid.startsWith('mp_reply_modal|'))) return false;

      // mp_modal|from|to  => envoi initial
      if (cid.startsWith('mp_modal|')) {
        const [, fromId, toId] = cid.split('|');
        if (interaction.user.id !== fromId) {
          await interaction.reply({ content: 'Formulaire invalide pour cet utilisateur.', ephemeral: true });
          return true;
        }

        const raw = interaction.fields.getTextInputValue('mp_text') || '';
        const check = normalizeAndValidate(raw);
        if (!check.ok) {
          await interaction.reply({ content: `Envoi refusé : ${check.reason}`, ephemeral: true });
          return true;
        }

        // Récupérer cible
        const target = await interaction.client.users.fetch(toId).catch(() => null);
        if (!target) {
          await interaction.reply({ content: 'Impossible de trouver la cible.', ephemeral: true });
          return true;
        }

        // Construire embed anonyme
        const embed = new EmbedBuilder()
          .setTitle('Message anonyme')
          .setDescription(check.text)
          .setColor('#5865F2')
          .setFooter({ text: 'Répondre anonymement via le bouton ci‑dessous' })
          .setTimestamp();

        // Persistance token pour relier si besoin (on stocke un token)
        const token = `mp_${Date.now()}_${fromId}_${toId}`;
        mpStore[token] = { fromId, toId, timestamp: Date.now(), preview: check.text.slice(0, 300) };
        saveStore(mpStore);

        // Bouton de réponse (inclut token)
        const replyBtn = new ButtonBuilder()
          .setCustomId(makeReplyButtonCustomId(fromId, toId, token))
          .setLabel('Répondre anonymement')
          .setStyle(ButtonStyle.Primary);

        // Envoyer DM
        const sent = await target.send({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(replyBtn)]
        }).catch(() => null);

        if (!sent) {
          await interaction.reply({ content: 'Impossible d’envoyer le DM à la cible (DM fermés).', ephemeral: true });
          // Nettoyage store si nécessaire
          delete mpStore[token];
          saveStore(mpStore);
          return true;
        }

        // Si DM envoyé, ack à l'auteur
        await interaction.reply({ content: 'Message envoyé anonymement.', ephemeral: true });
        return true;
      }

      // mp_reply_modal|from|to  => réponse du destinataire vers l'expéditeur original
      if (cid.startsWith('mp_reply_modal|')) {
        const [, originalFromId, originalToId] = cid.split('|');
        // Seul originalToId (le destinataire du DM) peut soumettre ce modal
        if (interaction.user.id !== originalToId) {
          await interaction.reply({ content: 'Vous n’êtes pas autorisé à répondre via ce formulaire.', ephemeral: true });
          return true;
        }

        const rawReply = interaction.fields.getTextInputValue('mp_reply_text') || '';
        const check = normalizeAndValidate(rawReply);
        if (!check.ok) {
          await interaction.reply({ content: `Envoi refusé : ${check.reason}`, ephemeral: true });
          return true;
        }

        const originalUser = await interaction.client.users.fetch(originalFromId).catch(() => null);
        if (!originalUser) {
          await interaction.reply({ content: 'Impossible de retrouver l’expéditeur original.', ephemeral: true });
          return true;
        }

        const embed = new EmbedBuilder()
          .setTitle('Réponse anonyme')
          .setDescription(check.text)
          .setColor('#2ECC71')
          .setTimestamp();

        const sent = await originalUser.send({ embeds: [embed] }).catch(() => null);
        if (!sent) {
          await interaction.reply({ content: 'Impossible d’envoyer la réponse (DM fermés).', ephemeral: true });
          return true;
        }

        await interaction.reply({ content: 'Votre réponse a été envoyée anonymement.', ephemeral: true });
        return true;
      }

      return false;
    } catch (err) {
      console.error('mp.handleModal error', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
        }
      } catch {}
      return true;
    }
  },

  /**
   * handleButton(interaction)
   * - appelé par ton interactionCreate central quand interaction.isButton() === true
   * - gère le clic sur mp_reply_btn|from|to|token
   * - ouvre un Modal de réponse (reply modal)
   */
  async handleButton(interaction) {
    try {
      if (!interaction.isButton()) return false;
      const cid = interaction.customId;
      if (!cid || !cid.startsWith('mp_reply_btn|')) return false;

      const [, fromId, toId, token] = cid.split('|');

      // Seul le destinataire (toId) peut cliquer sur le bouton dans son DM
      if (interaction.user.id !== toId) {
        await interaction.reply({ content: 'Seul le destinataire peut utiliser ce bouton.', ephemeral: true });
        return true;
      }

      // Optionnel : vérifier token existe dans mpStore
      if (token && !mpStore[token]) {
        // On ne bloque pas l'ouverture mais on peut prévenir
        // console.warn('Token mp inconnu', token);
      }

      // Construire modal de réponse
      const modal = new ModalBuilder()
        .setCustomId(makeReplyModalCustomId(fromId, toId))
        .setTitle('Répondre anonymement');

      const input = new TextInputBuilder()
        .setCustomId('mp_reply_text')
        .setLabel('Votre réponse (texte uniquement)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Écris ta réponse ici...')
        .setRequired(true)
        .setMaxLength(2000);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      await interaction.showModal(modal);
      return true;
    } catch (err) {
      console.error('mp.handleButton error', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Impossible d’ouvrir le formulaire de réponse.', ephemeral: true });
        }
      } catch {}
      return true;
    }
  }
};

/* ------------------ Exemple d'intégration dans ton interactionCreate central ------------------
Dans ton fichier central qui gère toutes les interactions (ex: index.js ou events/interactionCreate.js),
importe la commande mp et appelle ses handlers quand nécessaire.

Exemple minimal (à adapter à ton loader) :

const mpCommand = require('./commands/mp.js');

// Quand interactionCreate arrive :
client.on('interactionCreate', async (interaction) => {
  // 1) Slash command execution (ton loader existant)
  if (interaction.isChatInputCommand()) {
    const cmdName = interaction.commandName;
    if (cmdName === 'mp') return mpCommand.execute(interaction);
    // ... autres commandes
  }

  // 2) Modal submit routing
  if (interaction.isModalSubmit()) {
    // Laisser mp gérer si customId commence par mp_
    if (interaction.customId && (interaction.customId.startsWith('mp_modal|') || interaction.customId.startsWith('mp_reply_modal|'))) {
      return mpCommand.handleModal(interaction);
    }
  }

  // 3) Button routing
  if (interaction.isButton()) {
    if (interaction.customId && interaction.customId.startsWith('mp_reply_btn|')) {
      return mpCommand.handleButton(interaction);
    }
  }
});

----------------------------------------------------------------- */

