import type { Command } from '../Typings/Bhotianaa';
import {
    getValidSpotifyToken,
    getSpotifyQueue,
} from '../Core/Spotify';

export default <Command>{
    name: 'queue',
    description: 'Shows the song queue in chat',
    roles: ['broadcaster', 'moderator', 'lead_moderator', 'vip', 'subscriber', 'viewer'],
    aliases: ['songlist', 'songs', 'q'],
    async execute(notification, client) {
        const token = await getValidSpotifyToken();
        if (!token) {
            return await client.reply(
                notification.event.message_id,
                `Spotify is not connected yet!`
            );
        }

        try {
            const { currentlyPlaying, queue } = await getSpotifyQueue();

            if (!currentlyPlaying && queue.length === 0) {
                return await client.reply(
                    notification.event.message_id,
                    `The song queue is currently empty. Use !sr <song name> to add a song!`
                );
            }

            const parts: string[] = [];

            if (currentlyPlaying) {
                const nowPlayingArtists = currentlyPlaying.artists.join(', ');
                parts.push(`▶️ Now: "${currentlyPlaying.name}" - ${nowPlayingArtists}`);
            }

            if (queue.length > 0) {
                const maxToShow = 4;
                const upcoming = queue.slice(0, maxToShow).map((t, i) => {
                    const artists = t.artists.join(', ');
                    const reqStr = t.requestedBy ? ` [${t.requestedBy}]` : '';
                    return `${i + 1}. "${t.name}" - ${artists}${reqStr}`;
                });

                const moreCount = queue.length - maxToShow;
                const moreStr = moreCount > 0 ? ` (+${moreCount} more)` : '';

                parts.push(`Next: ${upcoming.join(' | ')}${moreStr}`);
            } else {
                parts.push(`Queue is empty`);
            }

            await client.reply(
                notification.event.message_id,
                parts.join(' | ')
            );
        } catch (error: any) {
            console.error('Error handling !queue command:', error);
            await client.reply(
                notification.event.message_id,
                `An error occurred while fetching the queue: ${error.message || 'Unknown error'}`
            );
        }
    },
};
