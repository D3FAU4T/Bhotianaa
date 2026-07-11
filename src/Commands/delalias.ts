import type { Command, DynamicCommand } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'delalias',
    description: 'Delete a dynamic command alias (Mods/Broadcaster only)',
    aliases: ['deletealias', 'removealias', 'rmalias'],
    roles: ['broadcaster', 'moderator', 'lead_moderator'],
    execute: async (notification, client, sharedContext) => {
        const args = notification.event.message.text.split(' ');
        args.shift();

        const aliasName = args[0]?.replace('!', '').toLowerCase();

        if (!aliasName) {
            await client.reply(notification.event.message_id, `Usage: !delalias <!aliasName>`);
            return;
        }

        // Check if dynamic command exists
        const command = sharedContext.commands.dynamic.get(aliasName);
        if (!command) {
            await client.reply(notification.event.message_id, `Alias !${aliasName} does not exist.`);
            return;
        }

        // Check if the targeted name is actually an alias and not the primary command name
        if (aliasName === command.name) {
            await client.reply(
                notification.event.message_id,
                `!${aliasName} is the primary command name, not an alias. Use !delcom !${aliasName} to delete the entire command.`
            );
            return;
        }

        try {
            // Remove from the command's aliases array
            if (command.aliases) {
                command.aliases = command.aliases.filter(a => a !== aliasName);
                if (command.aliases.length === 0) {
                    command.aliases = null;
                }
            }

            // Remove from the in-memory map
            sharedContext.commands.dynamic.delete(aliasName);

            // Save to JSON file
            const file = Bun.file("./src/Config/dynamic-commands.json");
            const commands: DynamicCommand[] = await file.json();
            const cmdIndex = commands.findIndex(c => c.name === command.name);

            if (cmdIndex !== -1) {
                commands[cmdIndex] = command;
                await file.write(JSON.stringify(commands, null, 2));

                await client.reply(
                    notification.event.message_id,
                    `Alias !${aliasName} has been deleted successfully! VoHiYo`
                );
            } else {
                await client.reply(
                    notification.event.message_id,
                    `Failed to find command !${command.name} in configuration.`
                );
            }
        } catch (e) {
            if (e instanceof Error) {
                await client.reply(
                    notification.event.message_id,
                    `Failed to delete alias. Error: ${e.message}`
                );
            } else {
                await client.reply(
                    notification.event.message_id,
                    `Failed to delete alias due to an unknown error.`
                );
            }
        }
    }
};
