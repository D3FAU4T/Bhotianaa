import type { Command } from '../Typings/Bhotianaa';
import type { FreeDictionaryAPIResponse } from '../Typings/DictionaryAPI';

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

        const response = await fetch(`https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(word)}`);

        if (!response.ok) {
            return await client.reply(
                notification.event.message_id,
                "There was a problem with the dictionary server. Please try again later or ask my Mamma. She's very intelligent! 😊"
            );
        }
        
        const result = await response.json() as FreeDictionaryAPIResponse;

        const definition = result?.entries?.[0]?.senses?.[0]?.definition;

        if (definition) {
            await client.reply(
                notification.event.message_id,
                `${word}: ${definition}`
            );
        } else {
            await client.say(`Oh no, I don't know the definition of ${word}, Mamma help D:`);
        }
    }
};
