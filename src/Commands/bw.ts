import { server } from '../..';
import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'bw',
    description: 'Sets the big word',
    execute(context: CommandContext, client: Bhotianaa): void {
        const word = context.args.join(' ');

        if (!word) {
            client.twitch.say('Usage: !bw <word>');
            return;
        }

        const announcement = client.setBigWord(word);
        if (!announcement) return;

        fetch(server.url + '/twitch/announcements', {
            method: 'POST',
            body: JSON.stringify({
                message: announcement,
                color: 'green',
            }),
        });
    }
};