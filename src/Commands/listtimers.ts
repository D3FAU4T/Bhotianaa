import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: 'listtimers',
    description: 'List all active timers',
    aliases: ['timers'],
    async execute(context: CommandContext, client: Bhotianaa): Promise<void> {
        const { userstate } = context;

        if (client.timers.size === 0) {
            await client.twitch.say(`@${userstate.user_name} No timers available.`);
            return;
        }

        const timerInfo = Array.from(client.timers.values()).map(timer =>
            `${timer.name} (${timer.interval}min, ${timer.enabled ? 'ON' : 'OFF'})`
        );
        const timerList = timerInfo.join(', ');

        await client.twitch.say(`@${userstate.user_name} Timers: ${timerList}`);
    }
};
