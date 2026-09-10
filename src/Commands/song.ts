import type { Command } from '../Typings/Bhotianaa';
import {
    getValidSpotifyToken,
    getCurrentlyPlaying,
} from '../Core/Spotify';

const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default <Command>{
    name: 'song',
    description: 'Shows the name of the currently playing song with URL',
    roles: ['broadcaster', 'moderator', 'lead_moderator', 'vip', 'subscriber', 'viewer'],
    aliases: ['currentsong', 'nowplaying', 'np'],
    async execute(notification, client) {
        const token = await getValidSpotifyToken();
        if (!token) {
            return await client.reply(
                notification.event.message_id,
                `Spotify is not connected yet!`
            );
        }

        try {
            const current = await getCurrentlyPlaying();

            if (!current || !current.track) {
                return await client.reply(
                    notification.event.message_id,
                    `No song is currently playing on Spotify.`
                );
            }

            const artists = current.track.artists.join(', ');
            const progress = formatDuration(current.progressMs);
            const total = formatDuration(current.track.durationMs);
            const reqStr = current.requestedBy ? ` [Requested by @${current.requestedBy}]` : '';

            await client.reply(
                notification.event.message_id,
                `🎶 Now Playing: "${current.track.name}" by ${artists} [${progress} / ${total}]${reqStr} 🔗 ${current.track.url}`
            );
        } catch (error: any) {
            console.error('Error handling !song command:', error);
            await client.reply(
                notification.event.message_id,
                `An error occurred while fetching currently playing song: ${error.message || 'Unknown error'}`
            );
        }
    },
};
