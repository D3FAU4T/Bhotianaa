import { Helix } from 'twitch';
import type { Command } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'uptime',
    description: 'Gets the uptime of the stream',
    roles: ['broadcaster', 'moderator', 'lead_moderator', 'vip', 'subscriber', 'viewer'],
    aliases: null,
    async execute(notification, client, sharedContext) {

        let startedAt = sharedContext.streamInfo.startedAt;

        if (!startedAt) {
            const accessToken = sharedContext.env.broadcaster?.access_token || sharedContext.env.app;
            const res = await Helix.Stream.get(
                { user_id: [ Bun.env.BROADCASTER_USER_ID ] },
                { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken }
            );

            if (!res.is_success)
                return await client.reply(
                    notification.event.message_id,
                    `Failed to get stream info: ${res.error}`
                );

            if (!res.data[0])
                return await client.reply(
                    notification.event.message_id,
                    'Shhh, my mamma is sleeping, do not disturb her'
                );
            
            startedAt = res.data[0].started_at;
        }

        const currentTime = Date.now();
        const diff = currentTime - new Date(startedAt).getTime();

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const uptime = `${hours}h ${minutes}m ${seconds}s`;

        await client.reply(
            notification.event.message_id,
            `My mamma has been live for ${uptime} VoHiYo`
        );
    }
};