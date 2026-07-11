import type { Command, } from '../Typings/Bhotianaa';

export default <Command> {
    name: "bomb",
    description: "Send a bomb emote when someone bombs anyone on stream, to amplify the mood",
    aliases: null,
    roles: ['broadcaster', 'moderator', 'lead_moderator', 'subscriber', 'vip', 'viewer'],
    execute: async (notification, client, _sharedContext) => {

        const args = notification.event.message.text.split(' ');

        if (!args[1])
            return await client.reply(
                notification.event.message_id,
                `Usage: !bomb <username>`
            );

        const name = args[1].replace('@', '').toLowerCase();

        const exclusionList = ['bhotiana', 'gianaa_'];

        if (exclusionList.includes(name))
            await client.reply(
                notification.event.message_id,
                'No T^T'
            );

        else
            await client.say(`@${name} gianaaBomb 💥`);
    }
}