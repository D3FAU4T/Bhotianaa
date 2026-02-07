import type { ICommand } from '../Typings/Bhotianaa';

export default <ICommand> {
    name: 'addpoints',
    aliases: ['grantpoints'],
    description: 'Grant points to a user (Broadcaster/Moderator only)',
    moderatorOnly: true,
    streamerOnly: false,

    async execute({ userstate, args }, client) {
        if (args.length < 2) {
            await client.twitch.say(`@${userstate.user_login} Usage: !addpoints <username> <amount>`);
            return;
        }

        const targetUsername = args[0]!.toLowerCase().replace('@', '');
        const amount = parseInt(args[1]!);

        if (isNaN(amount) || amount <= 0) {
            await client.twitch.say(`@${userstate.user_login} Please provide a valid positive number for points.`);
            return;
        }

        const targetUserId = await client.twitch.getUserId(targetUsername);

        if (!targetUserId) {
            await client.twitch.say(`@${userstate.user_login} User "${targetUsername}" not found.`);
            return;
        }

        try {
            const pointsFile = Bun.file('./src/Config/points.json');
            let pointsData: Record<string, number> = {};

            if (await pointsFile.exists())
                pointsData = await pointsFile.json();

            const currentPoints = pointsData[targetUserId] || 0;
            pointsData[targetUserId] = currentPoints + amount;

            await Bun.write('./src/Config/points.json', JSON.stringify(pointsData, null, 2));
            await client.twitch.say(`@${userstate.user_login} Successfully granted ${amount} points to @${targetUsername}! New balance: ${pointsData[targetUserId]} points`);
        }

        catch (error) {
            console.error('Error adding points:', error);
            await client.twitch.say(`@${userstate.user_login} Failed to grant points. Please try again.`);
        }
    }
};
