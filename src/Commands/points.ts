import { Helix } from 'twitch';
import type { Command } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'points',
    aliases: ['balance', 'checkpoints'],
    description: 'Check your current points balance',
    roles: ['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'],
    async execute(notification, client, sharedContext) {
        const args = notification.event.message.text.split(' ');
        args.shift();

        try {
            let targetUsername = notification.event.chatter_user_name;
            let targetUserId = notification.event.chatter_user_id;

            // Allow checking other users' points
            if (args[0]) {
                targetUsername = args[0].toLowerCase().replace('@', '');
                const userId = await Helix.Users.get(
                    { names: [targetUsername] },
                    { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken: sharedContext.env.broadcaster.access_token },
                );

                if (!userId.is_success || !userId.data[0])
                    return await client.reply(
                        notification.event.message_id,
                        `User "${targetUsername}" not found.`
                    );

                targetUserId = userId.data[0].id;
            }

            const pointsFile = Bun.file('./src/Config/points.json');
            let pointsData: Record<string, number> = {};

            if (await pointsFile.exists())
                pointsData = await pointsFile.json();

            const points = pointsData[targetUserId] || 0;

            if (targetUserId === notification.event.chatter_user_id)
                await client.reply(
                    notification.event.message_id,
                    `You have ${points} points!`
                );

            else
                await client.reply(
                    notification.event.message_id,
                    `${targetUsername} has ${points} points!`
                );
        }

        catch (error) {
            console.error('Error checking points:', error);
            await client.reply(
                notification.event.message_id,
                `Failed to check points. Please try again.`
            );
        }
    }
};
