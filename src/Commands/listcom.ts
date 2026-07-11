import type { Command } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'listcom',
    description: 'List all dynamic commands',
    aliases: ['listcommands', 'commands'],
    roles: ['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'],
    execute: async (notification, client, sharedContext) => {
        if (sharedContext.commands.dynamic.size === 0) {
            await client.reply(notification.event.message_id, `No dynamic commands available.`);
            return;
        }

        const commandNames = Array.from(sharedContext.commands.dynamic.keys()).map(name => `!${name}`);
        const commandList = commandNames.join(', ');

        await client.reply(notification.event.message_id, `Dynamic commands: ${commandList}`);
    }
};