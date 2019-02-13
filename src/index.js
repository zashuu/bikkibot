const Discord = require("discord.js");
const client = new Discord.Client();
const { version } = require("discord.js");
const moment = require("moment");
require("moment-duration-format");
client.logger = require("./Logger.js");
client.config = require("../config.js");

generateStats = (message) => {
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

pingMessage = async (message) => {
  const msg = await message.channel.send("Ping?");
  msg.edit(`Pong !Latency is ${msg.createdTimestamp -
                               message.createdTimestamp} ms.API Latency is ${
      Math.round(client.ping)} ms`);
};

rebootMessage = async (message) => {
  await message.reply("Bot is shutting down.");
  client.logger.log(`Received a reboot from message from ${message.channel}`);
  process.exit(1);
};

generalMessageAnswer = async (message) => {
  //client.logger.log(`Received a message from ${message.channel}`);
  if (message.content === "ping") {
    await pingMessage(message);
  }
  if (message.content === "stats") {
    await generateStats(message);
  }
  if (message.content === "reboot") {
    await rebootMessage(message);
  }
}

const init = async() => {
  client.on("ready", () => { client.logger.log("Started!"); });

  client.on("message", generalMessageAnswer);

  client.login(client.config.token);
};

init();
