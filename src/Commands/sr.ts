import type { Command } from '../Typings/Bhotianaa';
import {
    searchSpotifyTrack,
    addTrackToQueue,
    getValidSpotifyToken,
} from '../Core/Spotify';

export default <Command>{
    name: 'sr',
    description: 'Requests a song on Spotify and adds it to the queue',
    roles: ['broadcaster', 'moderator', 'lead_moderator', 'vip', 'subscriber', 'viewer'],
    aliases: ['songrequest', 'spotify'],
    async execute(notification, client) {
        const message = notification.event.message.text.trim();
        const firstSpaceIndex = message.indexOf(' ');

        if (firstSpaceIndex === -1 || !message.slice(firstSpaceIndex + 1).trim()) {
            return await client.reply(
                notification.event.message_id,
                `Usage: !sr <song title / artist / Spotify link>`
            );
        }

        const query = message.slice(firstSpaceIndex + 1).trim();

        const token = await getValidSpotifyToken();
        if (!token) {
            return await client.reply(
                notification.event.message_id,
                `Spotify is not connected yet! The broadcaster can link Spotify in the Accounts tab.`
            );
        }

        try {
            const track = await searchSpotifyTrack(query);
            if (!track) {
                return await client.reply(
                    notification.event.message_id,
                    `Couldn't find any tracks matching "${query}" on Spotify.`
                );
            }

            const queueResult = await addTrackToQueue(track, {
                name: notification.event.chatter_user_name || notification.event.chatter_user_login,
                id: notification.event.chatter_user_id,
            });

            const artistNames = track.artists.join(', ');
            const totalSeconds = Math.floor(track.durationMs / 1000);
            const duration = `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;

            if (!queueResult.success) {
                return await client.reply(
                    notification.event.message_id,
                    queueResult.message
                        ? `Found "${track.name}" by ${artistNames}, but ${queueResult.message}`
                        : `Failed to add "${track.name}" by ${artistNames} to the Spotify queue.`
                );
            }

            await client.reply(
                notification.event.message_id,
                `🎶 Added to queue: "${track.name}" by ${artistNames} [${duration}]`
            );
        } catch (error: any) {
            console.error('Error handling !sr command:', error);
            await client.reply(
                notification.event.message_id,
                `An error occurred while requesting song: ${error.message || 'Unknown error'}`
            );
        }
    },
};
