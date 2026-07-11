import type { Command } from '../Typings/Bhotianaa';
import type { DictionaryAPI, DictionaryAPIError } from '../Typings/DictionaryAPI';

export default <Command> {
    name: 'define',
    description: 'Defines a word',
    aliases: ['def', 'wtfis'],
    roles: ['broadcaster', 'moderator', 'lead_moderator', 'subscriber', 'vip', 'viewer'],
    async execute(notification, client, _sharedContext) {
        const args = notification.event.message.text.split(' ');
        const command = args.shift();

        if (!args[0])
            return await client.reply(
                notification.event.message_id,
                `Usage: ${command} <word>`,
            )

        const word = args.join(' ').trim();

        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const result = await response.json() as DictionaryAPI[] | DictionaryAPIError;

        if (!Array.isArray(result))
            return await client.say(`Oh no, I don't know the definition of ${word}, Mamma help D:`);

        if (result[0] && result[0].meanings[0] && result[0].meanings[0].definitions[0])
            await client.reply(
                notification.event.message_id,
                `${word}: ${result[0].meanings[0].definitions[0].definition}`
            );

        else
            await client.say(`Oh no, I don't know the definition of ${word}, Mamma help D:`);
    }
};