import type { Command, DynamicCommand } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'addalias',
    description: 'Add an alias to an existing dynamic command (Mods/Broadcaster only)',
    aliases: ['newalias', 'createalias'],
    roles: ['broadcaster', 'moderator', 'lead_moderator'],
    execute: async (notification, client, sharedContext) => {
        const args = notification.event.message.text.split(' ');
        args.shift();

        if (!args[0] || !args[1]) {
            await client.reply(
                notification.event.message_id,
                `Usage: !addalias <!newAlias> <!existingCommand>`
            );
            return;
        }

        const newAlias = args[0].replace('!', '').toLowerCase();
        const existingCommandName = args[1].replace('!', '').toLowerCase();

        // Check if the new alias name is a hard-coded command
        if (sharedContext.commands.system.has(newAlias)) {
            await client.reply(
                notification.event.message_id,
                `Cannot create alias !${newAlias} because it matches a system command name.`
            );
            return;
        }

        // Check if the new alias name already exists as a dynamic command or alias
        if (sharedContext.commands.dynamic.has(newAlias)) {
            await client.reply(
                notification.event.message_id,
                `Cannot create alias !${newAlias} because a command or alias with that name already exists.`
            );
            return;
        }

        // Check if the existing command exists
        const existingCommand = sharedContext.commands.dynamic.get(existingCommandName);
        if (!existingCommand) {
            await client.reply(
                notification.event.message_id,
                `Dynamic command !${existingCommandName} does not exist.`
            );
            return;
        }

        // Add alias to dynamic command
        if (!existingCommand.aliases) {
            existingCommand.aliases = [newAlias];
        } else if (!existingCommand.aliases.includes(newAlias)) {
            existingCommand.aliases.push(newAlias);
        }

        try {
            // Update in-memory map
            sharedContext.commands.dynamic.set(newAlias, existingCommand);

            // Save to JSON file
            const file = Bun.file("./src/Config/dynamic-commands.json");
            const commands: DynamicCommand[] = await file.json();
            const cmdIndex = commands.findIndex(c => c.name === existingCommand.name);

            if (cmdIndex !== -1) {
                commands[cmdIndex] = existingCommand;
                await file.write(JSON.stringify(commands, null, 2));

                await client.reply(
                    notification.event.message_id,
                    `Alias !${newAlias} has been added to !${existingCommand.name} successfully! VoHiYo`
                );
            } else {
                await client.reply(
                    notification.event.message_id,
                    `Failed to find command !${existingCommand.name} in configuration.`
                );
            }
        } catch (e) {
            if (e instanceof Error) {
                await client.reply(
                    notification.event.message_id,
                    `Failed to add alias. Error: ${e.message}`
                );
            } else {
                await client.reply(
                    notification.event.message_id,
                    `Failed to add alias due to an unknown error.`
                );
            }
        }
    }
};
