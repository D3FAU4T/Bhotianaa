import type { Command } from '../Typings/Bhotianaa';
import { getValidSpotifyToken, markWrongSong } from '../Core/Spotify';
import { getChatterRole } from '../Core/Functions';

export default <Command>{
    name: 'wrongsong',
    description: 'Removes your requested song from the song request queue',
    roles: ['broadcaster', 'moderator', 'lead_moderator', 'vip', 'subscriber', 'viewer'],
    aliases: ['removesong', 'delsong', 'cancelsr'],
    async execute(notification, client) {
        const token = await getValidSpotifyToken();
        if (!token) {
            return await client.reply(
                notification.event.message_id,
                `Spotify is not connected yet!`
            );
        }

        const message = notification.event.message.text.trim();
        const firstSpaceIndex = message.indexOf(' ');
        const query = firstSpaceIndex !== -1 ? message.slice(firstSpaceIndex + 1).trim() : undefined;

        const badges = notification.event.badges.map((badge) => badge.set_id);
        const role = getChatterRole(badges);
        const isMod = role === 'broadcaster' || role === 'moderator' || role === 'lead_moderator';

        const chatterName = notification.event.chatter_user_name || notification.event.chatter_user_login;
        const chatterId = notification.event.chatter_user_id;

        const removedTrack = await markWrongSong(
            {
                name: chatterName,
                id: chatterId,
                isMod,
            },
            query
        );

        if (!removedTrack) {
            return await client.reply(
                notification.event.message_id,
                query
                    ? `No matching song requests for "${query}" found for you in the queue.`
                    : `You don't have any songs in the request queue to remove.`
            );
        }

        const artists = removedTrack.artists.join(', ');
        await client.reply(
            notification.event.message_id,
            `Removed "${removedTrack.name}" by ${artists}`
        );
    },
};
