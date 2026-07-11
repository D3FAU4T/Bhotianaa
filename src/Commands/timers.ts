import { loadTimers } from "../Core/Functions";
import type { Command } from "../Typings/Bhotianaa";

export default <Command>{
    name: 'timers',
    description: 'List all active timers',
    aliases: ['timer'],
    roles: ['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'],
    execute: async (notification, client, sharedContext) => {
        if (sharedContext.timers.size === 0) {
            await client.reply(notification.event.message_id, `No timers available.`);
            return;
        }

        const timerInfo = (await loadTimers()).map(timer =>
            `${timer.name} (${timer.intervalMs / 60000}min, ${timer.enabled ? 'ON' : 'OFF'})`
        );
        
        const timerList = timerInfo.join(', ');

        await client.reply(notification.event.message_id, `Timers: ${timerList}`);
    }
};
