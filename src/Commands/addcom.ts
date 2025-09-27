import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'addcom',
    description: 'Add a dynamic command (Mods/Broadcaster only)',
    moderatorOnly: true,
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const { channel, userstate, args } = context;

        if (args.length < 2) {
            await client.twitch.say(channel, `@${userstate.username} Usage: !addcom <!commandName> <response>`);
            return;
        }

        let commandName = args[0];

        if (!commandName) {
            await client.twitch.say(channel, `@${userstate.username} Invalid command name.`);
            return;
        }

        // Remove the ! prefix if provided
        if (commandName.startsWith('!'))
            commandName = commandName.slice(1);

        // Validate command name
        if (!commandName || commandName.includes(' ')) {
            await client.twitch.say(channel, `@${userstate.username} Invalid command name. Command names cannot contain spaces.`);
            return;
        }

        // Check if command already exists (hard-coded or dynamic)
        if (client.commands.has(commandName) || client.dynamicCommands.has(commandName)) {
            await client.twitch.say(channel, `@${userstate.username} Command !${commandName} already exists.`);
            return;
        }

        const response = args.slice(1).join(' ');

        // Add the dynamic command
        const success = await client.addDynamicCommand(commandName, response, userstate.username!);

        if (success)
            await client.twitch.say(channel, `@${userstate.username} Command !${commandName} has been added successfully! VoHiYo`);
        
        else
            await client.twitch.say(channel, `@${userstate.username} Failed to add command !${commandName}. Please try again.`);
    }
};