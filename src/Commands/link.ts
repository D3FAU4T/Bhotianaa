import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'link',
    description: 'Sets the temporary link or get it',
    aliases: ['mirror'],
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const url = context.args[0];

        if (!url) {
            // Get current link
            const currentLink = client.state.temporaryLink || 'No link set';
            await client.twitch.say(context.channel, currentLink);
            return;
        }

        // Check if user has permissions to set link
        const hasPermissions = client.hasModPermissions(context.channel, context.userstate);
        if (!hasPermissions) {
            await client.twitch.say(context.channel, `@${context.userstate.username} You don't have permission to use this command`);
            return;
        }

        // Set the link
        client.setLink(url);

        // Personalized response
        if (context.userstate.username === 'gianaa_')
            await client.twitch.say(context.channel, 'Updated the link, mamma :))');

        else if (context.userstate.username === 'd3fau4t')
            await client.twitch.say(context.channel, 'Updated the link, papa 🙃');

        else
            await client.twitch.say(context.channel, 'Updated the link :>');
    }
};