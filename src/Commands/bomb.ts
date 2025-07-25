import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand, } from '../Typings/Bhotianaa';

export default <ICommand> {
    name: "bomb",
    description: "Send a bomb emote when someone bombs anyone on stream, to amplify the mood",
    execute: async (context: CommandContext, client: Bhotianaa) => {
        const name = context.args[0]?.toLowerCase();

        if (name?.includes('bhotiana') || name?.includes('gianaa'))
            await client.twitch.say(context.channel, 'No T^T');

        else
            await client.twitch.say(context.channel, 'gianaaBomb');
    }
}