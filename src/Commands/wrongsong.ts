import type { Command } from '../Typings/Bhotianaa';
import { getValidSpotifyToken, markWrongSong } from '../Core/Spotify';
import { getChatterRole } from '../Core/Functions';
import { readTokensSafe } from '../Core/RouteFunctions';

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

        const result = await markWrongSong(
            {
                name: chatterName,
                id: chatterId,
                isMod,
            },
            query
        );

        if (!result) {
            return await client.reply(
                notification.event.message_id,
                query
                    ? `No matching song requests for "${query}" found for you in the queue.`
                    : `You don't have any songs in the request queue to remove.`
            );
        }

        const { track: removedTrack, redemptionId } = result;
        let refunded = false;

        // Auto-refund Twitch channel points if requested via channel point reward
        if (redemptionId) {
            try {
                const tokens = await readTokensSafe();
                const broadcasterToken = tokens.broadcaster?.access_token;
                if (broadcasterToken) {
                    const res = await fetch(
                        `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${Bun.env.BROADCASTER_USER_ID}&reward_id=c34e696f-79a9-4c86-9e57-bf74c9b2a9bb&id=${redemptionId}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
                                Authorization: `Bearer ${broadcasterToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ status: 'CANCELED' }),
                        }
                    );
                    if (res.ok) refunded = true;
                }
            } catch (e) {
                console.error('Failed to refund channel points:', e);
            }
        }

        const artists = removedTrack.artists.join(', ');
        await client.reply(
            notification.event.message_id,
            `Removed "${removedTrack.name}" by ${artists}${refunded ? '. Refunded 100 channel points!' : ''}`
        );
    },
};
