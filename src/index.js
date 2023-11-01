import { Client, Intents, MessageEmbed } from "discord.js";
import { config } from "dotenv";
import { Data } from "../config.js";
import fetch from "node-fetch";

const client = new Client({
	allowedMentions: { parse: [], repliedUser: false },
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
});

const guildWarns = new Set();

client.on("error", console.error);
client.on("warn", console.warn);
process.on("unhandledRejection", console.error);

// ボットが起動したときの処理
client.once("ready", () => {
	console.log(`Successfully logged in as ${client.user.tag} (${client.user.id})`);
	client.user.setActivity("Logging images for you!", { type: "PLAYING" });
});

// メッセージが削除されたときの処理
client.on("messageDelete", async (message) => {
	const images = [...message.attachments.values()]
		.filter((attachment) => attachment.contentType.startsWith("image"));

	if (images.length === 0) return;

	const logChannel = Data.logChannels[message.guild.id];

	if (!logChannel && !guildWarns.has(message.guild.id)) {
		console.warn(`Received messageDelete event in guild "${message.guild.name}", but no log channel was found.
      Add a property named '${message.guild.id}' in logChannels in config.js with the corresponding ID of the channel where you would like image delete logs to be sent.
      This warning will not appear for the "${message.guild.name}" guild once again for the duration of this programme.`);
		guildWarns.add(message.guild.id);
		return;
	}

	for (const [index, image] of images.entries()) {
		const imageBuffer = await fetchImage(image.url);
		const fileType = image.contentType.split("/")[1];

		// メッセージの投稿日時を取得
		const messageTimestamp = message.createdTimestamp; // メッセージのUnixタイムスタンプ

		const embed = new MessageEmbed()
			.setColor("#da0000")
			.setAuthor({
				name: `${message.author.tag} (${message.author.id})`,
				iconURL: message.author.displayAvatarURL({ dynamic: true }),
			})
			.setDescription(`Image ${index + 1} of ${images.length} deleted in ${message.channel}.`)
			.setImage(`attachment://deleted_image${index}.${fileType}`)
			.setFooter({ text: `Message ID: ${message.id}` })
			.setTimestamp(messageTimestamp); // メッセージの投稿日時を設定

		const embedMessage = {
			embeds: [embed],
			files: [
				{
					attachment: imageBuffer,
					name: `deleted_image${index}.${fileType}`,
				},
			],
		};

		client.channels.cache.get(logChannel).send(embedMessage);
	}
});

// 画像のダウンロード処理
async function fetchImage(url) {
	const response = await fetch(url);
	const buffer = await response.buffer();
	return buffer;
}

// 環境変数の読み込み
config();

// ボットのログイン
client.login(process.env.token);