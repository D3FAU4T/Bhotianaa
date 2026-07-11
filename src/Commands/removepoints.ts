import { Helix } from 'twitch';
import type { Command } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'removepoints',
    description: 'Remove points from a user (Broadcaster/Moderator only)',
    aliases: ['takepoints', 'deductpoints', 'rempoints', 'rmpoints', 'rmpts', 'rmpoints'],
    roles: ['broadcaster', 'lead_moderator', 'moderator'],
    async execute(notification, client, sharedContext) {
        const args = notification.event.message.text.split(' ');
        args.shift();

        if (!args[0] || !args[1])
            return await client.reply(
                notification.event.message_id,
                `Usage: !removepoints <username> <amount>`
            );

        const targetUsername = args[0].toLowerCase().replace('@', '');
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0)
            return await client.reply(
                notification.event.message_id,
                `Please provide a valid positive number for points.`
            );

        // Get user ID from username

        const userId = await Helix.Users.get(
            { names: [targetUsername] },
            { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken: sharedContext.env.broadcaster.access_token },
        );

        if (!userId.is_success || !userId.data[0])
            return await client.reply(
                notification.event.message_id,
                `User "${targetUsername}" not found.`
            );

        try {
            const pointsFile = Bun.file('./src/Config/points.json');
            let pointsData: Record<string, number> = {};

            if (await pointsFile.exists())
                pointsData = await pointsFile.json();

            const currentPoints = pointsData[userId.data[0].id] || 0;
            const newPoints = Math.max(0, currentPoints - amount);
            pointsData[userId.data[0].id] = newPoints;

            await Bun.write('./src/Config/points.json', JSON.stringify(pointsData, null, 2));

            await client.reply(
                notification.event.message_id,
                `Successfully removed ${amount} points from @${targetUsername}! New balance: ${pointsData[userId.data[0].id]} points`
            );
        }

        catch (error) {
            console.error('Error removing points:', error);
            await client.reply(
                notification.event.message_id,
                `Failed to remove points. Please try again.`
            );
        }
    }
};
