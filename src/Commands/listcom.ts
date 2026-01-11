import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'listcom',
    description: 'List all dynamic commands',
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const { userstate } = context;

        if (client.dynamicCommands.size === 0) {
            await client.twitch.say(`@${userstate.user_name} No dynamic commands available.`);
            return;
        }

        const commandNames = Array.from(client.dynamicCommands.keys()).map(name => `!${name}`);
        const commandList = commandNames.join(', ');

        await client.twitch.say(`@${userstate.user_name} Dynamic commands: ${commandList}`);
    }
};