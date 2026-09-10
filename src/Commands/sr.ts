import type { Command } from '../Typings/Bhotianaa';
import {
    searchSpotifyTrack,
    addTrackToPlaylistAndPlay,
    getValidSpotifyToken,
} from '../Core/Spotify';

const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

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

        // Check if Spotify is authenticated
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

            const queueResult = await addTrackToPlaylistAndPlay(track, {
                name: notification.event.chatter_user_name || notification.event.chatter_user_login,
                id: notification.event.chatter_user_id,
            });

            const duration = formatDuration(track.durationMs);
            const artistNames = track.artists.join(', ');

            if (!queueResult.success) {
                if (queueResult.message) {
                    return await client.reply(
                        notification.event.message_id,
                        `Found "${track.name}" by ${artistNames}, but ${queueResult.message}`
                    );
                }
                return await client.reply(
                    notification.event.message_id,
                    `Failed to add "${track.name}" by ${artistNames} to the Spotify playlist.`
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
