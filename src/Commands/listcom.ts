import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'listcom',
    description: 'List all dynamic commands',
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const { channel, userstate } = context;

        if (client.dynamicCommands.size === 0) {
            await client.twitch.say(channel, `@${userstate.username} No dynamic commands available.`);
            return;
        }

        const commandNames = Array.from(client.dynamicCommands.keys()).map(name => `!${name}`);
        const commandList = commandNames.join(', ');

        await client.twitch.say(channel, `@${userstate.username} Dynamic commands: ${commandList}`);
    }
};