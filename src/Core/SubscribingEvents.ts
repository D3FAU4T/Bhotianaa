import type { Client } from "twitch";

export const subscribe = async (client: Client) => {
    const topics = [
        {
            type: 'stream.online',
            version: '1',
            condition: {
                broadcaster_user_id: Bun.env.BROADCASTER_USER_ID
            }
        },
        {
            type: 'stream.offline',
            version: '1',
            condition: {
                broadcaster_user_id: Bun.env.BROADCASTER_USER_ID
            }
        },
        {
            type: 'channel.channel_points_custom_reward_redemption.add',
            version: '1',
            condition: {
                broadcaster_user_id: Bun.env.BROADCASTER_USER_ID,
                reward_id: 'fde52afc-7bc1-48ff-9c00-e72a7b2d022d'
            }
        }

    ] satisfies Parameters<typeof client.subscribe>[0][];

    await Promise.all(topics.map(topic => client.subscribe(topic)));
}