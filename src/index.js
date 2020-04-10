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
• Node       :: ${process.version}
  `, {code: "asciidoc"});
};

client.commands.ping = async (message, command, args) => {
  const msg = await message.channel.send("HEIKI?");
  msg.edit(`
HECCHARA! Latency is ${msg.createdTimestamp - message.createdTimestamp} ms. API Latency is ${Math.round(client.ping)} ms
  `.trim());
};

client.commands.heiki = client.commands.ping;

client.commands.reboot = async (message, command, args) => {
  await message.reply("Bot is shutting down.");
  client.logger.log(`Received a reboot from message from ${message.author.id}`);
  process.exit(1); // Cleaner exit code?
};

client.commands.macroadd = async (message, command, args) => {
  let deletable = false;
  if (args[0] == 'delete') {
    deletable = !!!deletable;
    args.shift();
  }
  const messageKey = args.join("");
  client.logger.log(`Adding a new messageKey ${messageKey}`);
  const response = await client.awaitReply(message, `Your next message will be the macro, unless you type "cancel"`);
  if (["n", "no", "cancel"].includes(response.content)) {
    return message.reply("cancelled, nothing was added.");
  }
  let imageURL = response.attachments.reduce((acc, attachment) => {
      client.logger.log(`With attachment ${attachment.filename}`);
      return attachment.url;
  }, null);
  await client.messagesMacros.defer;
  const savedResponse = response.content || "Bwaka!";
  client.messagesMacros.set(messageKey, {
      createdBy: message.author.id,
      guild: message.guild.id,
      deletable: deletable,
      imageURL: imageURL,
      response: response.content
  });
  message.reply(`Macro "${args}" was added`);
};

client.commands.macrols = async (message, command, args) => {
  const messageKey = args.join("");
  await client.messagesMacros.defer;
  const keys = client.messagesMacros.indexes;
  //client.logger.log(`Found keys: ${keys}`);
  let macros = ["These is the full list:"];
  let count = 0;
  for(let key of keys) {
    macros.push(`Macro-${count}: ${key}`);
    count++;
  }
  let listReply = macros.join("\n");
  return message.reply(listReply);
};

client.commands.macrorm = async (message, command, args) => {
  const messageKey = args.join("");
  client.logger.log(`Deleting macro ${messageKey}`);
  const response = await client.awaitReply(message, `Are you sure?`);
  if (["n", "no", "cancel"].includes(response.content)) {
    return message.reply("Cancelled, nothing was added.");
  }
  await client.messagesMacros.defer;
  // Needs treatment for emojis, and all that
  client.messagesMacros.delete(messageKey);
  message.reply(`macro "${args}" was deleted`);
};

client.awaitReply = async (msg, question, limit = 60000) => {
  const filter = m => m.author.id === msg.author.id;
  await msg.channel.send(question);
  try {
    const collected = await msg.channel.awaitMessages(
      filter,
      { max: 1, time: limit, errors: ["time"] }
    );
    return collected.first();
  } catch (e) {
    return false;
  }
};

client.commands.talkback = async (message, command, args) => {
  const response = await client.awaitReply(message, `Talk back!`);
  client.logger.log(`Talking back!`);
  if (response.attachments) {
    response.attachments.every((attachment) => {
      message.reply(`Right back at you: ${attachment.url}`);
    });
  }
};

// Answers!

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
    let responseMsg = macroInfo.response;
    let messageOptions = {};
    if (macroInfo.imageURL) {
      // This will force discord to reupload the image, not good
      //messageOptions.files = [macroInfo.imageURL];
      responseMsg = responseMsg.concat(`\n${macroInfo.imageURL}`);
    }
    await message.channel.send(responseMsg, messageOptions);
    if (macroInfo.deletable) {
      await message.delete(); // Maybe customizable?
    }
    return;
  }
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
