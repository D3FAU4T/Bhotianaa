import path from 'node:path';
import { server } from '../..';
import type Bhotianaa from '../Core/Client';
import type { TwitchGame } from '../Typings/TwitchAPI';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand> {
    name: 'setgame',
    description: 'Sets the game of the stream',
    moderatorOnly: true,
    aliases: ['game'],
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const gameInput = context.args.join(' ');

        if (!gameInput) {
            await client.twitch.say('Usage: !setgame <game name or ID>');
            return;
        }

        const gamesFile = Bun.file(path.resolve('src', 'Cache', 'games.json'));
        const gamesCache = await gamesFile.exists() ? await gamesFile.json() as TwitchGame[] : [];

        let gameElement: TwitchGame | undefined;

        // Check if input is a number (game ID)
        const gameId = parseInt(gameInput);

        // Input is a game ID
        if (!isNaN(gameId)) {
            const response = await fetch(server.url + `twitch/games?id=${gameId}`);
            const data = await response.json() as { data: TwitchGame[] };
            
            if (data.data.length === 0 || !data.data[0]) {
                await client.twitch.say(`Game with ID "${gameId}" not found.`);
                return;
            }

            gameElement = data.data[0];

            // Save to cache if not already present
            if (!gamesCache.find(game => game.id === gameElement!.id)) {
                gamesCache.push(gameElement);
                await gamesFile.write(JSON.stringify(gamesCache, null, 2));
            }
        }
        
        // Input is a game name
        else {
            gameElement = gamesCache.find(game => game.name.toLowerCase() === gameInput.toLowerCase());

            if (!gameElement) {
                const response = await fetch(server.url + `twitch/games?name=${encodeURIComponent(gameInput)}`);
                const data = await response.json() as { data: TwitchGame[] };
                if (data.data.length === 0 || !data.data[0]) {
                    await client.twitch.say(`Game \"${gameInput}\" not found.`);
                    return;
                }

                gameElement = data.data[0];
            }
        }

        const response = await fetch(server.url + 'twitch/channels', {
            method: 'PATCH',
            body: JSON.stringify({ game_id: gameElement.id })
        });

        if (!response.ok) {
            await client.twitch.say(`Failed to set game: ${response.status} ${response.statusText}`);
            return;
        }

        // // Personalized response based on user
        if (context.userstate.user_login === 'd3fau4t')
            await client.twitch.say(
                `Papa, Mamma is playing a new game: ${gameElement.name}`
            );

        else if (context.userstate.user_login === 'gianaa_')
            await client.twitch.say(
                `Papa, Mamma is playing a new game: ${gameElement.name}`
            );

        else
            await client.twitch.say(
                `New game: ${gameElement.name}`
            );
    }
};