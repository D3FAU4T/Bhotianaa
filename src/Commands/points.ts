import type { ICommand } from '../Typings/Bhotianaa';

export default <ICommand> {
    name: 'points',
    aliases: ['balance', 'checkpoints'],
    description: 'Check your current points balance',
    moderatorOnly: false,
    streamerOnly: false,

    async execute({ userstate, args }, client) {
        try {
            let targetUsername = userstate.user_login;
            let targetUserId = userstate.user_id;

            // Allow checking other users' points
            if (args.length > 0) {
                targetUsername = args[0]!.toLowerCase().replace('@', '');
                const userId = await client.twitch.getUserId(targetUsername);

                if (!userId) {
                    await client.twitch.say(`@${userstate.user_login} User "${targetUsername}" not found.`);
                    return;
                }

                targetUserId = userId;
            }

            const pointsFile = Bun.file('./src/Config/points.json');
            let pointsData: Record<string, number> = {};

            if (await pointsFile.exists())
                pointsData = await pointsFile.json();

            const points = pointsData[targetUserId] || 0;

            if (targetUserId === userstate.user_id)
                await client.twitch.say(`@${userstate.user_login} You have ${points} points!`);

            else
                await client.twitch.say(`@${userstate.user_login} ${targetUsername} has ${points} points!`);
        }

        catch (error) {
            console.error('Error checking points:', error);
            await client.twitch.say(`@${userstate.user_login} Failed to check points. Please try again.`);
        }
    }
};
