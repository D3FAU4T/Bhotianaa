import path from 'node:path';
import { Helix } from 'twitch';
import type { Command } from '../Typings/Bhotianaa';

type Unwrapped = Awaited<ReturnType<typeof Helix.Games.get>>;
type ExtractData<T> = T extends { is_success: true; data: infer D } ? D : never;

export default <Command>{
    name: 'setgame',
    description: 'Sets the game of the stream',
    roles: ['broadcaster', 'lead_moderator', 'moderator'],
    aliases: ['game'],
    async execute(notification, client, sharedContext) {
        const args = notification.event.message.text.split(' ');
        const command = args.shift();

        const gameInput = args.join(' ');

        if (!gameInput)
            return await client.reply(
                notification.event.message_id,
                `Usage: ${command} <game_name>`
            );

        const gamesFile = Bun.file(path.resolve('src', 'Cache', 'games.json'));
        const gamesCache = await gamesFile.exists() ? await gamesFile.json() as ExtractData<Unwrapped> : [];

        let game = gamesCache.find(game => game.name.toLowerCase() === gameInput.toLowerCase());

        if (!game) {
            const res = await Helix.Games.get(
                { name: gameInput },
                { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken: sharedContext.env.broadcaster.access_token }
            );

            if (!res.is_success || !res.data[0])
                return await client.reply(
                    notification.event.message_id,
                    `Game "${gameInput}" not found.`
                );

            game = res.data[0];
            gamesCache.push(game);
            await gamesFile.write(JSON.stringify(gamesCache, null, 2));
        }

        const response = await Helix.Channel.patch(
            Bun.env.BROADCASTER_USER_ID,
            { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken: sharedContext.env.broadcaster.access_token },
            { game_id: game.id }
        );

        if (!response.is_success)
            return await client.reply(
                notification.event.message_id,
                `Failed to set game: ${response.error}`
            );

        const username = notification.event.chatter_user_name.toLowerCase();

        if (username === 'd3fau4t')
            await client.reply(
                notification.event.message_id,
                `Papa, Mamma is playing a new game: ${game.name}`
            );

        else if (username === 'gianaa_')
            await client.reply(
                notification.event.message_id,
                `Mamma, I updated the game to ${game.name}`
            );

        else
            await client.announce(
                `EVERYONE! Mamma is playing a new game: ${game.name}`,
                "blue"
            );
    }
};