import { server } from '../..';
import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';
import type { StreamGoodClips, TwitchChannel, TwitchUser } from '../Typings/TwitchAPI';

export default <ICommand>{
    name: 'shoutout',
    description: 'Sends a shoutout to a channel',
    moderatorOnly: true,
    aliases: ['so'],
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const targetChannel = context.args[0]?.toLowerCase().replace('@', '');

        if (!targetChannel) {
            await client.twitch.say('Usage: !so <channel>');
            return;
        }

        const userRes = await fetch(server.url + '/twitch/users?login=' + targetChannel);
        const user = await userRes.json() as { data: TwitchUser[] };

        const promiseArr = await Promise.allSettled([
            fetch(server.url + '/twitch/channels?broadcaster_id=' + user.data[0]?.id),
            fetch(server.url + `clips/${targetChannel}`),
            fetch(server.url + `/twitch/shoutout?to_id=${user.data[0]?.id}`)
        ]);

        const channelRes = promiseArr[0].status === 'fulfilled' ? promiseArr[0].value : null;
        const clipRes = promiseArr[1].status === 'fulfilled' ? promiseArr[1].value : null;

        if (clipRes && clipRes.ok) {
            const data = await clipRes.json() as StreamGoodClips;
            server.publish('clips', JSON.stringify(data));
        }

        else console.error(`Failed to fetch clip for ${targetChannel}`);

        let game = 'something cool';

        if (channelRes && channelRes.ok) {
            const data = await channelRes.json() as { data: TwitchChannel[] };
            game = data.data[0]?.game_name ?? game;
        }

        const prefix = game.toLowerCase() === 'just chatting' ? 'just chatting' : `last seen playing ${game}`;

        await client.twitch.say(
            `Check out @${targetChannel} at https://twitch.tv/${targetChannel} - they were ${prefix}!`
        );
    }
};