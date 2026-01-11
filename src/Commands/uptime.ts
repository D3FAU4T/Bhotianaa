import { server } from '../..';
import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'uptime',
    description: 'Gets the uptime of the stream',
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        let uptime: string;

        if (context.args[0]) {
            const response = await fetch(server.url + `uptime/${context.args[0]}`);
            uptime = await response.text();
        }

        else {
            const response = await fetch(server.url + `uptime/${context.channel.replace('#', '')}`);
            uptime = await response.text();
        }

        if (uptime === 'gianaa_ is offline')
            await client.twitch.say('Shhh, my mamma is sleeping, do not disturb her');

        else if (context.args[0]?.toLowerCase() === 'gianaa_')
            await client.twitch.say(`My mamma has been live for ${uptime} blobDance`);

        else await client.twitch.say(`@${context.userstate.user_login}, ${uptime} VoHiYo`);
    }
};