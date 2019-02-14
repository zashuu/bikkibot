const Discord = require("discord.js");
const { version } = require("discord.js");
const moment = require("moment");
require("moment-duration-format");
const Enmap = require("enmap");

// Initializers

const client = new Discord.Client();
client.logger = require("./Logger.js");
client.config = require("../config.js");

client.messagesMacros = new Enmap({
  name: "messages",
  autoFetch: true,
  fetchAll: false,
  polling: true
});

client.imagesMacros = new Enmap({
  name: "images",
  autoFetch: true,
  fetchAll: false,
  polling: true
});

// Functions
client.commands = {};

client.commands.stats = (message, command, args) => {
  const duration = moment.duration(client.uptime).format(" D [days], H [hrs], m [mins], s [secs]");
  message.channel.send(`= STATISTICS =
• Mem Usage  :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• Uptime     :: ${duration}
• Users      :: ${client.users.size.toLocaleString()}
• Servers    :: ${client.guilds.size.toLocaleString()}
• Channels   :: ${client.channels.size.toLocaleString()}
• Discord.js :: v${version}
• Node       :: ${process.version}`, {code: "asciidoc"});
};

client.commands.ping = async (message, command, args) => {
  const msg = await message.channel.send("Ping?");
  msg.edit(`Pong !Latency is ${msg.createdTimestamp -
                               message.createdTimestamp} ms.API Latency is ${
      Math.round(client.ping)} ms`);
};

client.commands.reboot = async (message, command, args) => {
  await message.reply("Bot is shutting down.");
  client.logger.log(`Received a reboot from message from ${message.channel}`);
  process.exit(1); // Cleaner exit code?
};

client.commands.macroadd = async (message, command, args) => {
  const messageKey = args.join("");
  client.logger.log(`Adding a new messageKey ${messageKey}`);
  const response = await client.awaitReply(message, `Your next message will be the macro, unless you type "cancel"`);
  if (["n", "no", "cancel"].includes(response)) {
    return message.reply("Cancelled, nothing was added.");
  }
  await client.messagesMacros.defer;
  // Needs treatment for emojis, and all that
  client.messagesMacros.set(messageKey, {
      createdBy: message.author.id,
      guild: message.guild.id,
      response: response
  });
  message.reply(`Macro "${args}" was added`);
};

client.commands.macrols = async (message, command, args) => {
  const messageKey = args.join("");
  await client.messagesMacros.defer;
  const keys = client.messagesMacros.indexes;
  //await message.reply(`Macro "${args}" was added`);
  client.logger.log(`Found keys: ${keys}`);
  const embed = new Discord.RichEmbed()
    .setTitle("Message Macros")
    .setAuthor(client.user.username, client.user.avatarURL)
    .setDescription("All macros defined")
    .setColor(0x00AE86);
  let count = 0;
  for(let key of keys) {
    embed.addField(`Macro-${count}`, `${key}`);
    count++;
  }
  return message.channel.send({embed});
};

client.commands.macrorm = async (message, command, args) => {
  const messageKey = args.join("");
  client.logger.log(`Deleting macro ${messageKey}`);
  const response = await client.awaitReply(message, `Are you sure?`);
  if (["n", "no", "cancel"].includes(response)) {
    return message.reply("Cancelled, nothing was added.");
  }
  await client.messagesMacros.defer;
  // Needs treatment for emojis, and all that
  client.messagesMacros.delete(messageKey);
  message.reply(`Macro "${args}" was deleted`);
};

client.awaitReply = async (msg, question, limit = 60000) => {
  const filter = m => m.author.id === msg.author.id;
  await msg.channel.send(question);
  try {
    const collected = await msg.channel.awaitMessages(filter, { max: 1, time: limit, errors: ["time"] });
    return collected.first().content;
  } catch (e) {
    return false;
  }
};

generalMessageAnswer = async (message) => {
  if (message.author.bot) return;
  if (!message.guild) {
    message.reply("No messages in DM!");
    return;
  }
  let args = message.content.slice().trim().split(/ +/g);
  if (args.length < 1) return;
  const command = args.shift().toLowerCase();
  //client.logger.log(`Received command ${command}, with args: ${args}`);
  const isKnowCommand = Object.keys(client.commands).
    some((key) => key.toLowerCase() === command);
  if (isKnowCommand) {
    return await client.commands[command](message, command, args);
  }
  await client.messagesMacros.defer;
  // Need to reset
  args = message.content.slice().trim().split(/ +/g);
  const messageKey = args.join("");
  //client.logger.log(`Looking for ${messageKey}`);
  if (client.messagesMacros.has(messageKey)) {
    const macroInfo = client.messagesMacros.get(messageKey);
    await message.channel.send(macroInfo.response);
    await message.delete(); // Maybe customizable?
  }
  //await imagesMacros.defer;
}

const init = async () => {
  client.on("ready", () => { client.logger.log("Started!"); });
  client.on("message", generalMessageAnswer);
  client.login(client.config.token);
};

process.on("uncaughtException", (err) => {
  const errorMsg = err.stack.replace(new RegExp(`${__dirname}/`, "g"), "./");
  client.logger.error(`Uncaught Exception: ${errorMsg}`);
  process.exit(1);
});

process.on("unhandledRejection", err => {
  client.logger.error(`Unhandled rejection: ${err}`);
});

init();