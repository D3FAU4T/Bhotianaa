import { Helix } from "twitch";
import type { Command } from "../Typings/Bhotianaa";

export default <Command> {
    name: 'live',
    description: 'Sends a live notification to the discord channel',
    aliases: null,
    roles: ['broadcaster', 'lead_moderator', 'moderator'],
    execute: async (notification, client, sharedContext) => {

        const accessToken = sharedContext.env.broadcaster?.access_token || sharedContext.env.app;
        const result = await Helix.Channel.get(Bun.env.BROADCASTER_USER_ID, {
            clientId: Bun.env.TWITCH_CLIENT_ID,
            accessToken
        });

        if (!result.is_success) {
            await client.say(`Error fetching channel data. Check console for details.`);
            console.error(result.error);
            return;
        }
   
        const data = result.data[0];

        if (!data) {
            await client.say(`Error fetching channel data. Check console for details.`);
            return;
        }
       
        const payload = {
            content: `@everyone My Mamma is live on twitch and streaming ${data.game_name}`,
            embeds: [
                {
                    title: "Streaming time!",
                    description: `${data.title}`,
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
                        { name: "Game", value: `${data.game_name}`, inline: true },
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
            await client.reply(
                notification.event.message_id,
                `Mamma, I couldn't send the live notification to Discord. Please check the webhook URL or call Papa.`
            );
        }

        else await client.reply(
            notification.event.message_id,
            `Mamma, I sent the live notification to Discord!`
        );
    }
}