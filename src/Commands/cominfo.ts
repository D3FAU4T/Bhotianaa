import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'cominfo',
    description: 'Show information about a dynamic command',
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const { channel, userstate, args } = context;

        if (args.length < 1) {
            await client.twitch.say(channel, `@${userstate.username} Usage: !cominfo <!commandName>`);
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

        // Check if it's a hard-coded command
        if (client.commands.has(commandName)) {
            const command = client.commands.get(commandName)!;
            await client.twitch.say(channel, `@${userstate.username} !${commandName} is a hard-coded command. Description: ${command.description}`);
            return;
        }

        // Check if dynamic command exists
        if (!client.dynamicCommands.has(commandName)) {
            await client.twitch.say(channel, `@${userstate.username} Command !${commandName} does not exist.`);
            return;
        }

        const dynamicCommand = client.dynamicCommands.get(commandName)!;
        const date = new Date(dynamicCommand.createdAt);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        const createdDate = `${day} ${month} ${year}`;

        await client.twitch.say(channel, `@${userstate.username} !${commandName} - Created by ${dynamicCommand.createdBy} on ${createdDate}. Response: ${dynamicCommand.response}`);
    }
};