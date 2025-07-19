import path from 'node:path';
import { server } from '../..';
import type Bhotianaa from '../Core/Client';
import type { whoamiData } from '../Typings/Bhotianaa';
import type { TwitchGame } from '../Typings/TwitchAPI';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand> {
    name: 'setgame',
    description: 'Sets the game of the stream',
    moderatorOnly: true,
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const gameName = context.args.join(' ');

        if (!gameName) {
            await client.twitch.say(context.channel, 'Usage: !setgame <game name>');
            return;
        }

        const whoamiFile = await Bun.file(path.resolve('src', 'Config', 'whoami.json')).json() as whoamiData;
        const gamesCache = await Bun.file(path.resolve('src', 'Cache', 'games.json')).json() as TwitchGame[];

        let gameElement = gamesCache.find(game => game.name.toLowerCase() === gameName.toLowerCase());

        if (!gameElement) {
            const response = await fetch(server.url + `twitch/games?name=${encodeURIComponent(gameName)}`);
            const data = await response.json() as { data: TwitchGame[] };
            if (data.data.length === 0 || !data.data[0]) {
                await client.twitch.say(context.channel, `Game "${gameName}" not found.`);
                return;
            }

            gameElement = data.data[0];
        }

        const response = await fetch(server.url + `twitch/channels?broadcaster_id=${whoamiFile.broadcaster.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ game_id: gameElement.id })
        });

        const data = await response.json() as object;

        // // Personalized response based on user
        if (context.userstate.username === 'd3fau4t')
            await client.twitch.say(context.channel,
                'success' in data ?
                    `Papa, Mamma is playing a new game: ${gameElement.name}` :
                    `Something went wrong, Papa. I couldn't set the game :<`
            );

        else if (context.userstate.username === 'gianaa_')
            await client.twitch.say(context.channel,
                'success' in data ?
                    `Mamma, I updated the game: ${gameElement.name}` :
                    `Oh no, Mamma. I couldn't set the game :<`
            );

        else
            await client.twitch.say(context.channel,
                'success' in data ?
                    `New game: ${gameElement.name}` :
                    `Something went wrong. Try again later.`
            );
    }
};