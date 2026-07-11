import { formatDate } from '../Core/Functions';
import type { Command, DynamicCommand } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'cominfo',
    description: 'Show information about a dynamic command',
    aliases: ['commandinfo', 'command'],
    roles: ['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'],
    execute: async (notification, client, sharedContext) => {
        const args = notification.event.message.text.split(' ');
        const commandAlias = args.shift();

        const commandName = args[0]?.replace('!', '').toLowerCase();

        if (!commandName) {
            await client.reply(notification.event.message_id, `Usage: ${commandAlias} <!commandName>`);
            return;
        }

        let command: Command | DynamicCommand | undefined = sharedContext.commands.system.get(commandName);
        
        // Check if it's a hard-coded command
        if (command) {
            await client.reply(notification.event.message_id, `!${command.name} is a hard-coded command. Description: ${command.description}`);
            return;
        }

        command = sharedContext.commands.dynamic.get(commandName);

        // Check if dynamic command exists
        if (command) {
            const createdDate = formatDate(command.createdAt);
            await client.reply(notification.event.message_id, `!${command.name} - Created by ${command.createdBy} on ${createdDate}. Response: ${command.response}`);
        }

        else
            await client.reply(notification.event.message_id, `Command !${commandName} does not exist.`);
    }
};