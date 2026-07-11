import type { Command } from "../Typings/Bhotianaa";

export default <Command>{
    name: 'lurk',
    description: 'Sends a lurk message to the chat',
    aliases: null,
    roles: ['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'],
    execute: async (notification, client, _sharedContext) => {
        const user = notification.event.chatter_user_name;

        if (user.toLowerCase() === 'gianaa_')
            await client.say(`But mamma, YOU are THE host! UHMDude`);
        else
            await client.say(`/me ${user} is now lurking! thats not weird or anything.. monkaHmm`);
    }
}