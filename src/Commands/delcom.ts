import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'delcom',
    description: 'Delete a dynamic command (Mods/Broadcaster only)',
    moderatorOnly: true,
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const { userstate, args } = context;

        if (args.length < 1) {
            await client.twitch.say(`@${userstate.user_name} Usage: !delcom <!commandName>`);
            return;
        }

        let commandName = args[0];

        if (!commandName) {
            await client.twitch.say(`@${userstate.user_name} Invalid command name.`);
            return;
        }


        if (commandName.startsWith('!'))
            commandName = commandName.slice(1);

        // Check if it's a hard-coded command (cannot be deleted)
        if (client.commands.has(commandName)) {
            await client.twitch.say(`@${userstate.user_name} Cannot delete hard-coded command !${commandName}.`);
            return;
        }

        // Check if dynamic command exists
        if (!client.dynamicCommands.has(commandName)) {
            await client.twitch.say(`@${userstate.user_name} Dynamic command !${commandName} does not exist.`);
            return;
        }

        // Remove the dynamic command
        const success = await client.removeDynamicCommand(commandName);

        if (success)
            await client.twitch.say(`@${userstate.user_name} Command !${commandName} has been deleted successfully! VoHiYo`);

        else
            await client.twitch.say(`@${userstate.user_name} Failed to delete command !${commandName}. Please try again.`);
    }
};