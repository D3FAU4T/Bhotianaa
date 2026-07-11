import type { Command } from '../Typings/Bhotianaa';

export default <Command> {
    name: 'link',
    description: 'Sets the temporary link or get it',
    aliases: ['mirror', 'wos', 'gos', 'ml'],
    roles: ['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'],
    async execute(notification, client, sharedContext) {
        const args = notification.event.message.text.split(' ');
        const command = args.shift();

        const modRoles = ['broadcaster', 'lead_moderator', 'moderator'];
        const isMod = notification.event.badges.some(badge => modRoles.includes(badge.set_id));
        const url = args[0];

        if (isMod) {
            if (!url && sharedContext.link)
                await client.reply(notification.event.message_id, sharedContext.link);
            else if (!url && !sharedContext.link)
                await client.reply(notification.event.message_id, `No link set. Usage: ${command} <URL>`);
            else if (url) {
                sharedContext.link = url;
                await client.reply(notification.event.message_id, `Link updated to: ${url}`);
            }
        }

        else {
            if (!url && sharedContext.link)
                await client.reply(notification.event.message_id, sharedContext.link);
            else if (!url && !sharedContext.link)
                await client.reply(notification.event.message_id, `No link set. Ask a moderator to set it.`);
            else if (url)
                await client.reply(notification.event.message_id, `Only moderators can set the link.`);
        }
    }
};