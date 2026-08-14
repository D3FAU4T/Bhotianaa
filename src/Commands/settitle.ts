import { Helix } from 'twitch';
import type { Command } from '../Typings/Bhotianaa';

export default <Command> {
    name: 'settitle',
    description: 'Sets the title of the stream',
    roles: ['broadcaster', 'lead_moderator', 'moderator'],
    aliases: ['title'],
    async execute(notification, client, sharedContext) {
        const args = notification.event.message.text.split(' ');
        const command = args.shift();

        const title = args.join(' ');

        if (!title)
            return await client.reply(
                notification.event.message_id,
                `Usage: ${command} <title>`
            );

        if (!sharedContext.env.broadcaster?.access_token) {
            return await client.reply(
                notification.event.message_id,
                `Broadcaster is not logged in.`
            );
        }

        const response = await Helix.Channel.patch(
            Bun.env.BROADCASTER_USER_ID,
            { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken: sharedContext.env.broadcaster.access_token },
            { title }
        );
        

        if (!response.is_success)
            return await client.reply(
                notification.event.message_id,
                `Failed to set title: ${response.error}`
            );

        // Personalized response based on user
        const username = notification.event.chatter_user_login.toLowerCase();

        if (username === 'd3fau4t')
            await client.reply(
                notification.event.message_id,
                `Papa! look, I changed the title to "${title}" VoHiYo`
            );

        else if (username === 'gianaa_')
            await client.reply(
                notification.event.message_id,
                `Mamma! I updated the title to "${title}" :)) <3`
            );

        else
            await client.reply(
                notification.event.message_id,
                `New title: "${title}"`
            );
    }
};