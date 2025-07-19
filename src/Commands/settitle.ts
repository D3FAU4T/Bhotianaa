import path from 'node:path';
import { server } from '../..';
import type Bhotianaa from '../Core/Client';
import type { whoamiData } from '../Typings/Bhotianaa';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'settitle',
    description: 'Sets the title of the stream',
    moderatorOnly: true,
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const title = context.args.join(' ');

        if (!title) {
            await client.twitch.say(context.channel, 'Usage: !settitle <title>');
            return;
        }

        const whoamiFile = await Bun.file(path.resolve('src', 'Config', 'whoami.json')).json() as whoamiData;

        const response = await fetch(server.url + `twitch/channels?broadcaster_id=${whoamiFile.broadcaster.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ title })
        });

        const data = await response.json() as object;

        // Personalized response based on user
        if (context.userstate.username === 'd3fau4t')
            await client.twitch.say(context.channel,
                'success' in data ?
                    `Papa! look, I changed the title to "${title}" VoHiYo` :
                    `Papa D: I tried to change the title but something went wrong, please check the logs :((`
            );

        else if (context.userstate.username === 'gianaa_')
            await client.twitch.say(context.channel,
                'success' in data ?
                    `Mamma! I updated the title to "${title}" :)) <3` :
                    `Mamma D: I tried to change the title but something went wrong, please ask papa to check the logs :((`
            );

        else
            await client.twitch.say(context.channel,
                'success' in data ?
                    `New title: "${title}"` :
                    'Failed to update title, please try again later.'
            );
    }
};