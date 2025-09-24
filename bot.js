import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField,
  ActivityType
} from "discord.js";
import fs from "fs";
import mysql from "mysql2/promise";

const config = JSON.parse(fs.readFileSync("./config.json"));
const data = JSON.parse(fs.readFileSync("./tickets.json"));

function getEmoji(emojiKey) {
    const emoji = config.emojis?.[emojiKey];
    return emoji || undefined;
}

function parseEmoji(emojiString) {
    if (!emojiString) return { name: "❓" };

    if (emojiString.length === 1 || emojiString.length === 2) {
        return { name: emojiString };
    }

    const match = emojiString.match(/<:(\w+):(\d+)>/);
    if (match) {
        return { id: match[2], name: match[1] };
    }

    return { name: "❓" };
}

function renderEmoji(emojiString) {
    if (!emojiString) return "❓";

    if (emojiString.length === 1 || emojiString.length === 2) {
        return emojiString;
    }

    const match = emojiString.match(/<:(\w+):(\d+)>/);
    if (match) {
        return emojiString;
    }

    return "❓";
}

let ticketCount = data.ticketCounter || 0;
let applyCount = data.applyCounter || 0;
let unbanCount = data.unbanCounter || 0;

let db;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ["CHANNEL"]
});

function calculateBanDuration(start, end, punishmentType) {
  if (punishmentType === "BAN" || punishmentType === "PERMANENT_BAN") {
    return "Permanent";
  }

  if (!start || !end || end === "0" || end === "permanent") {
    return "Permanent";
  }

  try {
    const startTime = parseInt(start);
    const endTime = parseInt(end);

    if (isNaN(startTime) || isNaN(endTime)) {
      return "Unknown";
    }

    const durationMs = endTime - startTime;

    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    let result = "";
    if (durationDays > 0) {
      result += `${durationDays}d`;
    }
    if (durationHours > 0) {
      if (result) result += ", ";
      result += `${durationHours}h`;
    }
    if (durationMinutes > 0 || !result) {
      if (result) result += ", ";
      result += `${durationMinutes}m`;
    }

    return result || "Less than 1m";

  } catch (error) {
    console.error("Error calculating ban duration:", error);
    return "Unknown";
  }
}

async function getLastThreeBans(playerName, db) {
  try {
    const [historyRows] = await db.execute(
      `SELECT reason, punishmentType, start, end
       FROM PunishmentHistory
       WHERE name = ? AND punishmentType IN ('BAN', 'TEMP_BAN', 'PERMANENT_BAN')
       ORDER BY start DESC
       LIMIT 3`,
      [playerName]
    );

    return historyRows.map(ban => ({
      reason: ban.reason || "Unknown",
      type: ban.punishmentType || "Unknown",
      duration: calculateBanDuration(ban.start, ban.end, ban.punishmentType)
    }));

  } catch (error) {
    console.error("Error fetching last three bans:", error);
    return [];
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    db = await mysql.createPool({
      host: config.mysql.dbHost,
      user: config.mysql.dbUser,
      password: config.mysql.dbPassword,
      database: config.mysql.dbName,
      port: config.mysql.dbPort || 3306
    });
    console.log("✅ Verbindung zur Datenbank erfolgreich");
  } catch (error) {
    console.error("❌ Fehler bei der DB-Verbindung:", error);
  }

  client.user.setActivity("tickets", { type: ActivityType.Listening });
});

client.on("messageCreate", async (msg) => {
  if (msg.content === "!setup-tickets") {
    const embed = new EmbedBuilder()
      .setTitle(`${renderEmoji(getEmoji("ticket")) || "🎫"} Ticket System`)
      .setDescription("Need support or want to ask a question?\nSelect the subject below to create a ticket.")
      .setColor("Purple");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("Choose a category...")
      .addOptions([
        {
          label: "Technical Problem",
          value: "tech",
          description: "Help with a technical issue",
          emoji: parseEmoji(getEmoji("technical"))
        },
        {
          label: "Player Report",
          value: "report",
          description: "Report a player",
          emoji: parseEmoji(getEmoji("report"))
        },
        {
          label: "Bug Report",
          value: "bug",
          description: "Report a bug",
          emoji: parseEmoji(getEmoji("bug"))
        },
        {
          label: "Other",
          value: "other",
          description: "Anything else",
          emoji: parseEmoji(getEmoji("other"))
        }
      ]);

    await msg.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  }

  if (msg.content === "!setup-apply") {
    const embed = new EmbedBuilder()
      .setTitle(`${renderEmoji(getEmoji("apply")) || "📝"} Applications`)
      .setDescription("Want to apply for our team? Please choose a position below.")
      .setColor("Green");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("apply_select")
      .setPlaceholder("Select a position...")
      .addOptions([
        {
          label: "Moderator",
          value: "moderator",
          description: "Apply as Moderator",
          emoji: parseEmoji(getEmoji("moderator"))
        },
        {
          label: "Developer",
          value: "developer",
          description: "Apply as Developer",
          emoji: parseEmoji(getEmoji("developer"))
        },
        {
          label: "Builder",
          value: "builder",
          description: "Apply as Builder",
          emoji: parseEmoji(getEmoji("builder"))
        },
        {
          label: "Media / Famous",
          value: "media",
          description: "Apply as Media/Famous",
          emoji: parseEmoji(getEmoji("media"))
        }
      ]);

    await msg.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  }

  if (msg.content === "!setup-unban") {
    const embed = new EmbedBuilder()
      .setTitle(`${renderEmoji(getEmoji("unban")) || "🔒"} Unban Appeal`)
      .setDescription(
        `**You were banned and want to appeal for an unban?**
If you have been banned from the Server, you can appeal using the button below. Please enter your Ban ID (not your Minecraft name) when creating an appeal.

**How to find your Ban ID:**
- Check your ban message in-game
- Ask a staff member for your Ban ID
- The Ban ID is a number that identifies your specific ban

Ensure to be truthful and honest about your appeal in order to increase your chances of getting unbanned. Lying to Staff is strictly prohibited!`
      )
      .setColor("Red");

    const buttonEmoji = parseEmoji("<:book2:1420129491757436979>");

    const button = new ButtonBuilder()
      .setCustomId("unban_request_user")
      .setLabel("Appeal")
      .setEmoji(buttonEmoji)
      .setStyle(ButtonStyle.Primary);

    await msg.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "ticket_select") await handleModal(interaction, "ticket");
      if (interaction.customId === "apply_select") await handleModal(interaction, "apply");
    }

    if (interaction.isButton() && interaction.customId === "unban_request_user") {
      await showUnbanModal(interaction);
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("ticket_modal")) await createTicket(interaction, "ticket");
      if (interaction.customId.startsWith("apply_modal")) await createTicket(interaction, "apply");
      if (interaction.customId.startsWith("unban_modal")) await createTicket(interaction, "unban");
    }

    if (interaction.isButton()) await handleButtons(interaction);
  } catch (err) {
    console.error("Fehler bei interactionCreate:", err);
  }
});

async function handleModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`${type}_modal`)
    .setTitle(type === "ticket" ? "Create a Ticket" : "Submit Application");

  const mcInput = new TextInputBuilder()
    .setCustomId("mc_name")
    .setLabel("Minecraft Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const issueInput = new TextInputBuilder()
    .setCustomId("issue")
    .setLabel(type === "ticket" ? "Issue / Concern" : "Why should we accept you?")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(mcInput),
    new ActionRowBuilder().addComponents(issueInput)
  );

  if (type === "apply" && interaction.values?.[0] === "media") {
    const twitch = new TextInputBuilder().setCustomId("twitch").setLabel("Twitch Link (optional)").setStyle(TextInputStyle.Short).setRequired(false);
    const yt = new TextInputBuilder().setCustomId("youtube").setLabel("YouTube Link (optional)").setStyle(TextInputStyle.Short).setRequired(false);
    const tik = new TextInputBuilder().setCustomId("tiktok").setLabel("TikTok Link (optional)").setStyle(TextInputStyle.Short).setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(twitch),
      new ActionRowBuilder().addComponents(yt),
      new ActionRowBuilder().addComponents(tik)
    );
  }

  interaction.client.tempCategory = interaction.values?.[0] || type;
  interaction.client.tempType = type;

  await interaction.showModal(modal);
}

async function showUnbanModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("unban_modal")
    .setTitle("Unban Appeal");

  const banIdInput = new TextInputBuilder()
    .setCustomId("ban_id")
    .setLabel("Ban ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("Enter your Ban ID (e.g., 12345)");

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Write your unban appeal here")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder("Explain why you should be unbanned...");

  modal.addComponents(
    new ActionRowBuilder().addComponents(banIdInput),
    new ActionRowBuilder().addComponents(reasonInput)
  );

  interaction.client.tempType = "unban";
  await interaction.showModal(modal);
}

async function createTicket(interaction, type) {
  try {
    await interaction.deferReply({ flags: 64 });

    let mcName, issue, bannedReason;
    const categoryValue = interaction.client.tempCategory;

    if (type === "unban") {
      const banId = interaction.fields.getTextInputValue("ban_id");
      issue = interaction.fields.getTextInputValue("reason");
      bannedReason = null;
      mcName = `BanID-${banId}`;
    } else {
      mcName = interaction.fields.getTextInputValue("mc_name");
      issue = interaction.fields.getTextInputValue("issue");
      bannedReason = null;
    }

    if (type === "ticket") ticketCount++;
    if (type === "apply") applyCount++;
    if (type === "unban") unbanCount++;

    const number = String(type === "ticket" ? ticketCount : type === "apply" ? applyCount : unbanCount).padStart(3, "0");

    data.ticketCounter = ticketCount;
    data.applyCounter = applyCount;
    data.unbanCounter = unbanCount;
    fs.writeFileSync("./tickets.json", JSON.stringify(data, null, 2));

    const guild = client.guilds.cache.get(config.guildId);
    let parent, prefix;

    if (type === "ticket") {
      parent = guild.channels.cache.get(config.ticketCategoryId);
      prefix = categoryValue === "tech" ? "problem" : categoryValue;
    } else if (type === "apply") {
      parent = guild.channels.cache.get(config.applyCategoryId);
      prefix = categoryValue;
    } else if (type === "unban") {
      parent = guild.channels.cache.get(config.unbanCategoryId);
      prefix = "unban";
    }

    const ticketChannel = await guild.channels.create({
      name: `${prefix}-${number}-${mcName}`,
      type: 0,
      parent: parent.id,
      topic: interaction.user.id,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.adminRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.moderatorRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
      ]
    });

    let embed;

    if (type === "unban") {
      embed = new EmbedBuilder()
        .setColor("DarkButNotBlack")
        .addFields(
          { name: `${renderEmoji(getEmoji("appealType")) || "📘"} Appeal Type`, value: `\`\`\`Unban Appeal\`\`\``, inline: false },
          { name: `${renderEmoji(getEmoji("appealReason")) || "📗"} Appeal Reason`, value: `\`\`\`${issue}\`\`\``, inline: false }
        );

      const banId = interaction.fields.getTextInputValue("ban_id");
      console.log(`🔍 Searching for ban record with ID: ${banId}`);

      if (db) {
        try {
          console.log("✅ Database connection available");
          const [rows] = await db.execute(
            "SELECT id, name, reason, end, start, operator, punishmentType FROM Punishments WHERE id = ?",
            [banId]
          );

          console.log(`📊 Found ${rows.length} ban records for ID: ${banId}`);

          if (rows.length > 0) {
            const banInfo = rows[0];
            console.log("Ban Info:", banInfo);

            const actualMcName = banInfo.name || "Unknown";
            await ticketChannel.edit({
              name: `${prefix}-${number}-${actualMcName}`
            });

            let banDate = "Unknown";
            if (banInfo.start) {
              const date = new Date(parseInt(banInfo.start));
              banDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            }

            let banEnd = "Permanent";
            if (banInfo.end && banInfo.end !== "0" && banInfo.end !== "permanent") {
              const endDate = new Date(parseInt(banInfo.end));
              banEnd = `${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')}.${endDate.getFullYear()} ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
            }

            const banDuration = calculateBanDuration(banInfo.start, banInfo.end, banInfo.punishmentType);

            let totalBans = 0;
            try {
              const [banCountRows] = await db.execute(
                "SELECT COUNT(*) as totalBans FROM PunishmentHistory WHERE name = ? AND punishmentType IN ('BAN', 'TEMP_BAN', 'PERMANENT_BAN')",
                [banInfo.name]
              );
              totalBans = banCountRows[0].totalBans || 0;
            } catch (historyError) {
              const [banCountRows] = await db.execute(
                "SELECT COUNT(*) as totalBans FROM Punishments WHERE name = ? AND punishmentType IN ('BAN', 'TEMP_BAN', 'PERMANENT_BAN')",
                [banInfo.name]
              );
              totalBans = banCountRows[0].totalBans || 0;
            }

            const banNumber = totalBans === 1 ? "1st Ban" :
                             totalBans === 2 ? "2nd Ban" :
                             totalBans === 3 ? "3rd Ban" :
                             `${totalBans}th Ban`;

            embed.addFields(
              { name: `${renderEmoji(getEmoji("banId")) || "📔"} Ban ID`, value: `\`\`\`${banInfo.id || "Unknown"}\`\`\``, inline: true },
              { name: `${renderEmoji(getEmoji("minecraftName")) || "👤"} Minecraft Name`, value: `\`\`\`${banInfo.name || "Unknown"}\`\`\``, inline: true },
              { name: `${renderEmoji(getEmoji("banReason")) || "💣"} Ban Reason`, value: `\`\`\`${banInfo.reason || "Unknown"}\`\`\``, inline: false },
              { name: `${renderEmoji(getEmoji("bannedBy")) || "📛"} Banned by`, value: `\`\`\`${banInfo.operator || "Unknown"}\`\`\``, inline: true },
              { name: `${renderEmoji(getEmoji("bannedOn")) || "💣"} Banned on`, value: `\`\`\`${banDate}\`\`\``, inline: true },
              { name: `${renderEmoji(getEmoji("banUntil")) || "🍎"} Ban until`, value: `\`\`\`${banEnd}\`\`\``, inline: true },
              { name: `${renderEmoji(getEmoji("banDuration")) || "⏰"} Ban Duration`, value: `\`\`\`${banDuration}\`\`\``, inline: true },
              { name: `${renderEmoji(getEmoji("banCount")) || "🔮"} Ban Count`, value: `\`\`\`${banNumber} (Total: ${totalBans})\`\`\``, inline: true },
              { name: `${renderEmoji(getEmoji("punishmentType")) || "🔍"} Punishment Type`, value: `\`\`\`${banInfo.punishmentType || "Unknown"}${banInfo.punishmentType === 'TEMP_BAN' ? ` (${banDuration})` : ''}\`\`\``, inline: true }
            );

            const lastThreeBans = await getLastThreeBans(banInfo.name, db);
            if (lastThreeBans.length > 0) {
              let lastBansText = "";
              lastThreeBans.forEach((ban, index) => {
                lastBansText += `**${index + 1}.** ${ban.reason} (${ban.type} - ${ban.duration})\n`;
              });

              embed.addFields({
                name: `${renderEmoji(getEmoji("lastBans")) || "📚"} Last ${lastThreeBans.length} Bans`,
                value: lastBansText,
                inline: false
              });
            }
          } else {
            embed.addFields(
              { name: "❌ Ban ID Not Found", value: `\`\`\`No ban found with ID: ${banId}\`\`\``, inline: false },
              { name: `${renderEmoji(getEmoji("minecraftName")) || "👤"} Minecraft Name`, value: `\`\`\`Unknown (ID not found)\`\`\``, inline: false }
            );
          }
        } catch (err) {
          console.error("❌ Error fetching ban info:", err);
          embed.addFields(
            { name: "❌ Database Error", value: "```Could not retrieve ban information```", inline: false },
            { name: `${renderEmoji(getEmoji("minecraftName")) || "👤"} Minecraft Name`, value: `\`\`\`Unknown (Database error)\`\`\``, inline: false }
          );
        }
      } else {
        embed.addFields(
          { name: "ℹ️ Database", value: "```Database connection not available```", inline: false },
          { name: `${renderEmoji(getEmoji("minecraftName")) || "👤"} Minecraft Name`, value: `\`\`\`Unknown (No DB connection)\`\`\``, inline: false }
        );
      }

    } else if (type === "apply") {
      embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle(`${renderEmoji(getEmoji("apply")) || "📝"} Application`)
        .addFields(
          { name: `${renderEmoji(getEmoji("minecraftName")) || "👤"} Minecraft Name`, value: `\`\`\`${mcName}\`\`\``, inline: true },
          { name: `${renderEmoji(getEmoji("position")) || "💼"} Position`, value: `\`\`\`${categoryValue}\`\`\``, inline: true },
          { name: `${renderEmoji(getEmoji("applicationText")) || "📋"} Application Text`, value: `\`\`\`${issue}\`\`\``, inline: false }
        );

      if (categoryValue === "media") {
        const twitch = interaction.fields.getTextInputValue("twitch") || "Not provided";
        const youtube = interaction.fields.getTextInputValue("youtube") || "Not provided";
        const tiktok = interaction.fields.getTextInputValue("tiktok") || "Not provided";

        embed.addFields(
          { name: `${renderEmoji(getEmoji("twitch")) || "📺"} Twitch`, value: `\`\`\`${twitch}\`\`\``, inline: true },
          { name: `${renderEmoji(getEmoji("youtube")) || "🎥"} YouTube`, value: `\`\`\`${youtube}\`\`\``, inline: true },
          { name: `${renderEmoji(getEmoji("tiktok")) || "📱"} TikTok`, value: `\`\`\`${tiktok}\`\`\``, inline: true }
        );
      }

    } else {
      embed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle(`${renderEmoji(getEmoji("ticket")) || "🎫"} Support Ticket`)
        .addFields(
          { name: `${renderEmoji(getEmoji("minecraftName")) || "👤"} Minecraft Name`, value: `\`\`\`${mcName}\`\`\``, inline: true },
          { name: `${renderEmoji(getEmoji("category")) || "📂"} Category`, value: `\`\`\`${categoryValue}\`\`\``, inline: true },
          { name: `${renderEmoji(getEmoji("issue")) || "📝"} Issue / Concern`, value: `\`\`\`${issue}\`\`\``, inline: false }
        );
    }

    const buttons = [];
    if (type === "ticket" || type === "apply") {
      buttons.push(new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close")
        .setEmoji(parseEmoji(getEmoji("close") || "🔒"))
        .setStyle(ButtonStyle.Danger));
    } else if (type === "unban") {
      const buttonEmoji = parseEmoji("<:book2:1420129491757436979>");
      buttons.push(new ButtonBuilder()
        .setCustomId("unban_request_staff")
        .setLabel("Unban Request")
        .setEmoji(buttonEmoji)
        .setStyle(ButtonStyle.Primary));
    }

    await ticketChannel.send({
      content: `${interaction.user} Welcome!`,
      embeds: [embed],
      components: buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : []
    });

    await interaction.editReply({
      content: `✅ ${type === "ticket" ? "Ticket" : type === "apply" ? "Application" : "Unban appeal"} created: ${ticketChannel}`
    });
  } catch (error) {
    console.error("Fehler beim Erstellen des Tickets:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Ein Fehler ist aufgetreten', flags: 64 });
    } else {
      await interaction.editReply({ content: 'Ein Fehler ist beim Erstellen des Tickets aufgetreten' });
    }
  }
}

async function handleButtons(interaction) {
  const guild = interaction.guild;
  const ticketChannel = interaction.channel;
  const ticketOwnerId = ticketChannel.topic;

  let baseName = ticketChannel.name.replace(/^closed-+/g, "");
  const type = baseName.startsWith("unban") ? "unban" : baseName.startsWith("moderator") || baseName.startsWith("developer") || baseName.startsWith("builder") || baseName.startsWith("media") ? "apply" : "ticket";

  if (interaction.customId === "close_ticket") {
    await interaction.deferUpdate();
    await ticketChannel.edit({
      name: `closed-${baseName}`,
      parent: type === "ticket" ? config.closedCategoryId : type === "apply" ? config.closedApplyCategoryId : config.closedUnbanCategoryId
    });

    const row = new ActionRowBuilder();
    if (type === "unban") {
      const buttonEmoji = parseEmoji("<:book2:1420129491757436979>");
      row.addComponents(new ButtonBuilder()
        .setCustomId("unban_request_staff")
        .setLabel("Unban Request")
        .setEmoji(buttonEmoji)
        .setStyle(ButtonStyle.Primary));
    } else {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("reopen_ticket")
          .setLabel("Re-Open")
          .setEmoji(parseEmoji(getEmoji("reopen") || "🔄"))
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("delete_ticket")
          .setLabel("Delete")
          .setEmoji(parseEmoji(getEmoji("delete") || "🗑️"))
          .setStyle(ButtonStyle.Danger)
      );
    }

    await ticketChannel.send({ content: `${renderEmoji(getEmoji("close")) || "🔒"} Ticket closed by ${interaction.user}`, components: [row] });
  }

  if (interaction.customId === "reopen_ticket") {
    await interaction.deferUpdate();
    await ticketChannel.edit({
      name: baseName,
      parent: type === "ticket" ? config.ticketCategoryId : type === "apply" ? config.applyCategoryId : config.unbanCategoryId
    });

    const row = new ActionRowBuilder();
    if (type !== "unban") {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close")
          .setEmoji(parseEmoji(getEmoji("close") || "🔒"))
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("delete_ticket")
          .setLabel("Delete")
          .setEmoji(parseEmoji(getEmoji("delete") || "🗑️"))
          .setStyle(ButtonStyle.Secondary)
      );
    }

    await ticketChannel.send({ content: `${renderEmoji(getEmoji("reopen")) || "🔄"} Ticket is reopened! You can continue here.`, components: row.components.length > 0 ? [row] : [] });
  }

  if (interaction.customId === "delete_ticket") {
    await interaction.deferUpdate();
    await interaction.followUp({ content: `${renderEmoji(getEmoji("delete")) || "🗑️"} Ticket will be deleted in a few seconds...`, ephemeral: true });
    setTimeout(() => ticketChannel.delete(), 5000);
  }

  if (interaction.customId === "unban_request_staff") {
    if (!interaction.member.roles.cache.has(config.adminRoleId) && !interaction.member.roles.cache.has(config.moderatorRoleId)) {
      return interaction.reply({ content: "❌ You don't have permission to process this unban request.", ephemeral: true });
    }

    await interaction.deferUpdate();
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("accept_unban")
          .setLabel("Accepted")
          .setEmoji(parseEmoji(getEmoji("accept") || "✅"))
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("reject_unban")
          .setLabel("Rejected")
          .setEmoji(parseEmoji(getEmoji("reject") || "❌"))
          .setStyle(ButtonStyle.Danger)
      );

    await interaction.followUp({ content: "🔔 Unban request options:", components: [row], ephemeral: true });
  }

  if (interaction.customId === "accept_unban") {
    await interaction.deferUpdate();
    await ticketChannel.edit({
      parent: config.unbanAcceptedCategoryId,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: ticketOwnerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.adminRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.moderatorRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
      ]
    });

    await ticketChannel.send({ content: `${renderEmoji(getEmoji("accept")) || "✅"} Your unban appeal has been **accepted**. You are now unbanned!` });
  }

  if (interaction.customId === "reject_unban") {
    await interaction.deferUpdate();

    await ticketChannel.edit({
      parent: config.unbanRejectedCategoryId || "1378790224586608880",
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: ticketOwnerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.adminRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.moderatorRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
      ]
    });

    await ticketChannel.send({ content: `${renderEmoji(getEmoji("reject")) || "❌"} Your unban appeal has been **rejected**. Please review the rules and try again later.` });

    const deleteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("delete_ticket")
        .setLabel("Delete")
        .setEmoji(parseEmoji(getEmoji("delete") || "🗑️"))
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.followUp({
      content: `${renderEmoji(getEmoji("delete")) || "🗑️"} Click the delete button if you want to delete this appeal.`,
      components: [deleteRow],
      ephemeral: true
    });
  }
}

client.login(config.token);
