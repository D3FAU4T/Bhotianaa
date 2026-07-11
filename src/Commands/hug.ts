import type { Command } from "../Typings/Bhotianaa";

export default <Command>{
    name: 'hug',
    description: 'Sends a hug message to the chat',
    aliases: ['embrace'],
    roles: ['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'],
    execute: async (notification, client, _sharedContext) => {
        const user = notification.event.chatter_user_name;
        const args = notification.event.message.text.split(' ');
        const command = args.shift();

        if (args[0]) {
            const targetUser = args[0].replace('@', '');
            await client.say(`/me thanks for being here ${targetUser}! pepeL ${command === 'embrace' ? ` PS: Stop using fancy schmancy terms T^T` : '\b'}`);
        }

        else
            await client.say(`/me thanks for being here ${user}! pepeL ${command === 'embrace' ? ` PS: Stop using fancy schmancy terms T^T` : '\b'}`);
    }
}