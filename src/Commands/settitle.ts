import { server } from '../..';
import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'settitle',
    description: 'Sets the title of the stream',
    moderatorOnly: true,
    aliases: ['title'],
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const title = context.args.join(' ');

        if (!title) {
            await client.twitch.say('Usage: !settitle <title>');
            return;
        }

        const response = await fetch(server.url + 'twitch/channels', {
            method: 'PATCH',
            body: JSON.stringify({ title })
        });

        if (!response.ok) {
            await client.twitch.say(`Failed to set title: ${response.status} ${response.statusText}`);
            return;
        }
        
        // Personalized response based on user
        if (context.userstate.user_login === 'd3fau4t')
            await client.twitch.say(
                `Papa! look, I changed the title to "${title}" VoHiYo`
            );

        else if (context.userstate.user_login === 'gianaa_')
            await client.twitch.say(
                `Mamma! I updated the title to "${title}" :)) <3`
            );

        else
            await client.twitch.say(`New title: \"${title}\"`);
    }
};