import type { Command, DynamicCommand } from '../Typings/Bhotianaa';

export default <Command>{
    name: 'delcom',
    description: 'Delete a dynamic command (Mods/Broadcaster only)',
    aliases: ['deletecommand', 'removecommand', 'rmcommand', 'rmcom'],
    roles: ['broadcaster', 'lead_moderator', 'moderator'],
    execute: async (notification, client, sharedContext) => {
        const args = notification.event.message.text.split(' ');
        args.shift();

        const commandName = args[0]?.replace('!', '').toLowerCase();

        if (!commandName) {
            await client.reply(notification.event.message_id, `Usage: !delcom <!commandName>`);
            return;
        }

        // Check if it's a hard-coded command (cannot be deleted)
        if (sharedContext.commands.system.has(commandName)) {
            await client.reply(notification.event.message_id, `Cannot delete hard-coded command !${commandName}.`);
            return;
        }

        const command = sharedContext.commands.dynamic.get(commandName);

        // Check if dynamic command exists
        if (!command) {
            await client.reply(notification.event.message_id, `Dynamic command !${commandName} does not exist.`);
            return;
        }

        if (commandName !== command.name) {
            await client.reply(
                notification.event.message_id,
                `!${commandName} is an alias of !${command.name}. Use !delalias !${commandName} to delete the alias, or !delcom !${command.name} to delete the entire command.`
            );
            return;
        }

        try {
            for (const alias of command.aliases ?? [])
                sharedContext.commands.dynamic.delete(alias);

            sharedContext.commands.dynamic.delete(command.name);

            // Remove the dynamic command
            const file = Bun.file("./src/Config/dynamic-commands.json");
            const commands: DynamicCommand[] = await file.json();
            const updatedCommands = commands.filter(cmd => cmd.name !== command.name);
            await file.write(JSON.stringify(updatedCommands, null, 2));

            await client.reply(notification.event.message_id, `Command !${command.name} has been deleted successfully! VoHiYo`);
        }

        catch (e) {
            if (e instanceof Error)
                await client.reply(notification.event.message_id, `Failed to delete command !${command.name}. Error: ${e.message}`);
            else
                await client.reply(notification.event.message_id, `Failed to delete command !${command.name}. An unknown error occurred.`);
        }
    }
};
