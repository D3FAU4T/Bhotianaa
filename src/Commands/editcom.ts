import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'editcom',
    description: 'Edit a dynamic command (Mods/Broadcaster only)',
    moderatorOnly: true,
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const { userstate, args } = context;

        if (args.length < 2) {
            await client.twitch.say(`@${userstate.user_name} Usage: !editcom <!commandName> <new response>`);
            return;
        }

        let commandName = args[0];

        if (!commandName) {
            await client.twitch.say(`@${userstate.user_name} Invalid command name.`);
            return;
        }


        if (commandName.startsWith('!'))
            commandName = commandName.slice(1);

        // Check if it's a hard-coded command (cannot be edited)
        if (client.commands.has(commandName)) {
            await client.twitch.say(`@${userstate.user_name} Cannot edit hard-coded command !${commandName}.`);
            return;
        }

        // Check if dynamic command exists
        if (!client.dynamicCommands.has(commandName)) {
            await client.twitch.say(`@${userstate.user_name} Dynamic command !${commandName} does not exist. Use !addcom to create it.`);
            return;
        }

        const newResponse = args.slice(1).join(' ');

        const success = await client.updateDynamicCommand(commandName, newResponse);

        if (success)
            await client.twitch.say(`@${userstate.user_name} Command !${commandName} has been updated successfully! VoHiYo`);
        else
            await client.twitch.say(`@${userstate.user_name} Failed to update command !${commandName}. Please try again.`);
    }
};