import type { Command } from "../Typings/Bhotianaa";

export default <Command>{
    name: 'bonk',
    description: 'Sends a conditional bonk message to the chat',
    aliases: ["bop"],
    roles: ['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'],
    execute: async (notification, client, _sharedContext) => {
        const args = notification.event.message.text.split(' ');
        args.shift();

        if (args[0]) {
            const targetUser = args[0].replace('@', '');
            await client.say(`/me BOP Take that, ${targetUser}! Punch`);
        }

        else
            await client.say(`Ouch! BigSad`);
    }
}