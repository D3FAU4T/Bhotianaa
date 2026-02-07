import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'addcom',
    description: 'Add a dynamic command (Mods/Broadcaster only)',
    moderatorOnly: true,
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const { userstate, args } = context;

        if (args.length < 2) {
            await client.twitch.say(`@${userstate.user_name} Usage: !addcom <!commandName> <response>`);
            return;
        }

        let commandName = args[0];

        if (!commandName) {
            await client.twitch.say(`@${userstate.user_name} Invalid command name.`);
            return;
        }


        if (commandName.startsWith('!'))
            commandName = commandName.slice(1);


        if (!commandName || commandName.includes(' ')) {
            await client.twitch.say(`@${userstate.user_name} Invalid command name. Command names cannot contain spaces.`);
            return;
        }

        if (client.commands.has(commandName) || client.dynamicCommands.has(commandName)) {
            await client.twitch.say(`@${userstate.user_name} Command !${commandName} already exists.`);
            return;
        }

        const response = args.slice(1).join(' ');

        const success = await client.addDynamicCommand(commandName, response, userstate.user_login!);

        if (success)
            await client.twitch.say(`@${userstate.user_name} Command !${commandName} has been added successfully! VoHiYo`);

        else
            await client.twitch.say(`@${userstate.user_name} Failed to add command !${commandName}. Please try again.`);
    }
};