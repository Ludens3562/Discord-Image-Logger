import { Client, Intents, MessageAttachment, MessageEmbed } from "discord.js";
import { config } from "dotenv";
import { Data } from "../config.js";
import fetch from "node-fetch";

// インテントのリストを定義
const botIntents = [
	Intents.FLAGS.GUILDS,
	Intents.FLAGS.GUILD_MESSAGES,
	Intents.FLAGS.GUILD_MEMBERS,
];

// クライアントを作成
const client = new Client({
	allowedMentions: { parse: [], repliedUser: false },
	intents: botIntents,
});

const guildWarns = new Set();

client.on("error", console.error);
client.on("warn", console.warn);
process.on("unhandledRejection", console.error);

// ボットが起動したときの処理
client.once("ready", () => {
	console.log(`Successfully logged in as ${client.user.tag} (${client.user.id})`);
	client.user.setActivity("Logging files for you!", { type: "PLAYING" });
});

// メッセージが削除されたときの処理
client.on("messageDelete", handleDeletedMessage);

// 画像のダウンロード処理
async function fetchImage(url) {
	const response = await fetch(url);
	const buffer = await response.buffer();
	return buffer;
}

// メッセージが削除されたときの処理
async function handleDeletedMessage(message) {
	const attachments = [...message.attachments.values()];

	if (attachments.length === 0) return;

	const logChannel = Data.logChannels[message.guild.id];

	if (!logChannel && !guildWarns.has(message.guild.id)) {
		const warnMessage = `Received messageDelete event in guild "${message.guild.name}", but no log channel was found.
      Add a property named '${message.guild.id}' in logChannels in config.js with the corresponding ID of the channel where you would like file delete logs to be sent.
      This warning will not appear for the "${message.guild.name}" guild once again for the duration of this programme.`;

		console.warn(warnMessage);
		guildWarns.add(message.guild.id);
		return;
	}

	const [imageAttachments, otherAttachments] = separateAttachments(attachments);

	for (const attachment of imageAttachments) {
		await sendAttachmentDeletedLog(message, attachment, logChannel, true);
	}

	for (const attachment of otherAttachments) {
		await sendAttachmentDeletedLog(message, attachment, logChannel, false);
	}
}

// 画像とその他の添付ファイルを分類
function separateAttachments(attachments) {
	const imageAttachments = [];
	const otherAttachments = [];

	for (const attachment of attachments) {
		if (attachment.contentType.startsWith("image")) {
			imageAttachments.push(attachment);
		}
		else {
			otherAttachments.push(attachment);
		}
	}

	return [imageAttachments, otherAttachments];
}

// 添付ファイルの削除ログを送信
async function sendAttachmentDeletedLog(message, attachment, logChannel, isImage) {
	const attachmentBuffer = await fetchImage(attachment.url);
	const fileType = getFileType(attachment.name, isImage);
	const attachmentName = attachment.name || (isImage ? `deleted_image.${fileType}` : "unknown_file");

	const attachmentEmbed = createAttachmentEmbed(message, attachment, attachmentName, isImage);
	const fileAttachment = new MessageAttachment(attachmentBuffer, attachmentName);

	const channel = client.channels.cache.get(logChannel);
	if (channel) {
		channel.send({ embeds: [attachmentEmbed], files: [fileAttachment] });
	}
}

// ファイルタイプを取得
function getFileType(attachmentName, isImage) {
	return isImage ? attachmentName.split(".")[1] : "unknown";
}

// 添付ファイルの削除ログ用のMessageEmbedを作成
function createAttachmentEmbed(message, attachment, attachmentName, isImage) {
	const embed = new MessageEmbed()
		.setColor("#da0000")
		.setAuthor({
			name: `${message.author.tag} (${message.author.id})`,
			iconURL: message.author.displayAvatarURL({ dynamic: true }),
		})
		.setDescription(`${isImage ? "Image" : "File"} deleted in ${message.channel}.`)
		.addField("File Name", attachmentName);

	if (isImage) {
		embed.setImage(`attachment://${attachmentName}`);
	}
	else {
		embed.addField("Download URL", `[${attachmentName}](${attachment.url})`);
	}

	embed
		.setFooter({ text: `Message ID: ${message.id}` })
		.setTimestamp(message.createdTimestamp);

	return embed;
}

// 環境変数の読み込み
config();

// ボットのログイン
client.login(process.env.token);
