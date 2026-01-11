import { server } from "../..";
import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from "../Typings/Bhotianaa";
import type { TwitchChannel } from "../Typings/TwitchAPI";

export default <ICommand>{
    name: 'live',
    description: 'Sends a live notification to the discord channel',
    aliases: ['announce'],
    moderatorOnly: true,
    execute: async (context: CommandContext, client: Bhotianaa) => {
        const channelFetch = await fetch(server.url + `twitch/channels?broadcaster_id=${client.broadcasterId}`);
        const channelData = channelFetch.ok ? await channelFetch.json() as { data: TwitchChannel[] } : null;

        if (!channelData) {
            await client.twitch.say(`Mamma, I couldn't retrieve your channel data. Can you wait a little bit for the Twitch API to update your channel data?`);
            return;
        }

        const payload = {
            content: `@everyone My Mamma is live on twitch and streaming ${channelData.data[0]?.game_name}`,
            embeds: [
                {
                    title: "Streaming time!",
                    description: `${channelData.data[0]?.title}`,
                    url: "https://twitch.tv/gianaa_",
                    color: 11342935,
                    thumbnail: {
                        url: "https://assets.stickpng.com/images/580b57fcd9996e24bc43c540.png"
                    },
                    image: {
                        url: "https://cdn.discordapp.com/attachments/1005205775150481428/1223977843558453258/3.png"
                    },
                    author: {
                        name: "Gianaa_",
                        icon_url: "https://cdn.discordapp.com/avatars/748141473513603164/e94ba01ce421ec5d483ad9ec8c209e34.webp?size=128"
                    },
                    footer: {
                        text: "Yay! I created the Embed",
                        icon_url: "https://images-ext-1.discordapp.net/external/xeu1afV92cXfj9ICm7f0Ll52ughrWfj4RR5MHv0S_Kg/https/cdn.discordapp.com/icons/1005194560303013920/581e47ff8e43bd2680c160bf1c21fa33.webp"
                    },
                    fields: [
                        { name: "Game", value: `${channelData.data[0]?.game_name}`, inline: true },
                        { name: "Viewers Count", value: 3, inline: true }
                    ]
                }
            ]
        }

        const discordNotification = await fetch(Bun.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!discordNotification.ok) {
            await client.twitch.say(`Mamma, I couldn't send the live notification to Discord. Please check the webhook URL or call Papa.`);
        }

        else await client.twitch.say(`Mamma, I sent the live notification to Discord!`);
    }
}