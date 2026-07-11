import type { Command } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'bw',
    description: 'Sets the big word',
    aliases: null,
    roles: ['broadcaster', 'moderator', 'lead_moderator', 'subscriber', 'vip', 'viewer'],
    async execute(notification, client, sharedContext) {
        const args = notification.event.message.text.split(' ');
        args.shift();

        if (!args[0]) {
            return await client.reply(
                notification.event.message_id,
                `Usage: !bw <word>`
            );
        }

        const word = args[0].toUpperCase().split('').join(' ');
        sharedContext.wos.word = word;
        await client.announce(word, "green");
    }
};