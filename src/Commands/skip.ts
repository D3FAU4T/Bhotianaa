import type { Command } from '../Typings/Bhotianaa';
import {
    getValidSpotifyToken,
    skipSpotifyTrack,
    getCurrentlyPlaying,
} from '../Core/Spotify';

export default <Command>{
    name: 'skip',
    description: 'Skips the currently playing Spotify song (Mod only)',
    roles: ['broadcaster', 'moderator', 'lead_moderator'],
    aliases: ['skipsong', 'next'],
    async execute(notification, client) {
        const token = await getValidSpotifyToken();
        if (!token) {
            return await client.reply(
                notification.event.message_id,
                `Spotify is not connected yet!`
            );
        }

        try {
            const current = await getCurrentlyPlaying().catch(() => null);
            const result = await skipSpotifyTrack();

            if (!result.success) {
                return await client.reply(
                    notification.event.message_id,
                    `${result.message || 'Failed to skip song.'}`
                );
            }

            const skippedTrack = result.track || current?.track;
            if (skippedTrack) {
                const artists = skippedTrack.artists.join(', ');
                await client.reply(
                    notification.event.message_id,
                    `Skipped "${skippedTrack.name}" by ${artists}.`
                );
            } else {
                await client.reply(
                    notification.event.message_id,
                    `Skipped current song.`
                );
            }
        } catch (error: any) {
            console.error('Error handling !skip command:', error);
            await client.reply(
                notification.event.message_id,
                `An error occurred while skipping: ${error.message || 'Unknown error'}`
            );
        }
    },
};
