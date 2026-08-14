import { Helix } from 'twitch';
import type { Command } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'addpoints',
    aliases: ['grantpoints'],
    description: 'Grant points to a user',
    roles: ['broadcaster', 'lead_moderator', 'moderator'],

    async execute(notification, client, sharedContext) {
        const args = notification.event.message.text.split(' ');

        if (!args[1] || !args[2])
            return await client.reply(
                notification.event.message_id,
                `Usage: !addpoints <username> <amount>`
            );

        const targetUsername = args[1].toLowerCase().replace('@', '');
        const amount = parseInt(args[2]);

        if (isNaN(amount) || amount <= 0)
            return await client.reply(
                notification.event.message_id,
                `Please provide a valid positive number for points.`
            );

        const accessToken = sharedContext.env.broadcaster?.access_token || sharedContext.env.app;
        const targetUserId = await Helix.Users.get(
            { names: [targetUsername] },
            { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken }
        );

        if (!targetUserId.is_success || !targetUserId.data[0]) {
            return await client.reply(
                notification.event.message_id,
                `User "${targetUsername}" not found.`
            );
        }

        try {
            const pointsFile = Bun.file('./src/Config/points.json');
            let pointsData: Record<string, number> = {};

            if (await pointsFile.exists())
                pointsData = await pointsFile.json();

            const currentPoints = pointsData[targetUserId.data[0].id] || 0;
            pointsData[targetUserId.data[0].id] = currentPoints + amount;

            await pointsFile.write(JSON.stringify(pointsData, null, 2));
            await client.reply(
                notification.event.message_id,
                `Successfully granted ${amount} points to @${targetUsername}! New balance: ${pointsData[targetUserId.data[0].id]} points`
            );
        }

        catch (error) {
            console.error('Error adding points:', error);
            await client.reply(
                notification.event.message_id,
                `Failed to grant points. Please try again.`
            );
        }
    }
};
