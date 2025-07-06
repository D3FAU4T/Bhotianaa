import path from 'node:path';
import { server } from '../..';
import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand, whoamiData } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'bw',
    description: 'Sets the big word',
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const word = context.args.join(' ');

        if (!word) {
            client.twitch.say(context.channel, 'Usage: !bw <word>');
            return;
        }

        const whoamiFile = await Bun.file(path.resolve('src', 'Config', 'Whoami.json')).json() as whoamiData;

        const announcement = client.setBigWord(word);
        if (announcement)
            await fetch(server.url + '/twitch/announcements', {
                method: 'POST',
                body: JSON.stringify({
                    message: announcement,
                    color: 'green',
                    broadcaster_id: whoamiFile.broadcaster.id,
                    moderator_id: whoamiFile.app.id
                }),
            });
    }
};