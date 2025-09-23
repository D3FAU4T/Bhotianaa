import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'editcom',
    description: 'Edit a dynamic command (Mods/Broadcaster only)',
    moderatorOnly: true,
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const { channel, userstate, args } = context;

        if (args.length < 2) {
            await client.twitch.say(channel, `@${userstate.username} Usage: !editcom <!commandName> <new response>`);
            return;
        }

        let commandName = args[0];

        if (!commandName) {
            await client.twitch.say(channel, `@${userstate.username} Invalid command name.`);
            return;
        }

        // Remove the ! prefix if provided
        if (commandName.startsWith('!')) {
            commandName = commandName.slice(1);
        }

        // Check if it's a hard-coded command (cannot be edited)
        if (client.commands.has(commandName)) {
            await client.twitch.say(channel, `@${userstate.username} Cannot edit hard-coded command !${commandName}.`);
            return;
        }

        // Check if dynamic command exists
        if (!client.dynamicCommands.has(commandName)) {
            await client.twitch.say(channel, `@${userstate.username} Dynamic command !${commandName} does not exist. Use !addcom to create it.`);
            return;
        }

        const newResponse = args.slice(1).join(' ');
        const existingCommand = client.dynamicCommands.get(commandName)!;

        // Update the command while preserving original creation info
        const updatedCommand = {
            ...existingCommand,
            response: newResponse
        };

        client.dynamicCommands.set(commandName, updatedCommand);

        try {
            await client.saveDynamicCommands();
            await client.twitch.say(channel, `@${userstate.username} Command !${commandName} has been updated successfully! VoHiYo`);
        } catch (error) {
            await client.twitch.say(channel, `@${userstate.username} Failed to update command !${commandName}. Please try again.`);
        }
    }
};