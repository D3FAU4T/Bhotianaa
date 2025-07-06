import { server } from '../..';
import type Bhotianaa from '../Core/Client';
import type { dictionaryAPI } from '../Typings/definitions';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand> {
    name: 'define',
    description: 'Defines a word',
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const word = context.args.join(' ');
        if (!word) {
            await client.twitch.say(context.channel, 'Usage: !define <word>');
            return;
        }

        const response = await fetch(`${server.url}/define?word=${word}`);
        const result = await response.json() as dictionaryAPI[];
        
        if ('message' in result) {
            await client.twitch.say(context.channel, `Oh no, I don't know the definition of ${word}, Mamma help D:`);
            return;
        }

        if (result[0] && result[0].meanings[0] && result[0].meanings[0].definitions[0])
            await client.twitch.say(context.channel, `${word}: ${result[0].meanings[0].definitions[0].definition}`);

        else
            await client.twitch.say(context.channel, `Oh no, I don't know the definition of ${word}, Mamma help D:`);
    }
};