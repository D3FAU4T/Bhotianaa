import type { Command, DynamicCommand } from '../Typings/Bhotianaa';

export default <Command> {
    name: 'addcom',
    description: 'Add a dynamic command (Mods/Broadcaster only)',
    aliases: ['addcommand', 'newcom', 'newcommand'],
    roles: ['broadcaster', 'moderator', 'lead_moderator'],

    async execute(notification, client, sharedContext) {
        
        const args = notification.event.message.text.split(' ');
        args.shift();

        if (!args[0] || !args[1])
            return await client.reply(
                notification.event.message_id,
                `Usage: !addcom <!commandName> <response>`
            );

        const commandName = args[0].replace('!', '').toLowerCase();

        const command = sharedContext.commands.dynamic.get(commandName);

        if (!command) {
            const response = args.slice(1).join(' ');

            const newCommand: DynamicCommand = {
                name: commandName,
                response,
                roles: ['broadcaster', 'moderator', 'lead_moderator', 'subscriber', 'vip', 'viewer'],
                aliases: null,
                createdBy: notification.event.chatter_user_login.toLowerCase(),
                createdAt: new Date().toISOString()
            }   

            try {
                sharedContext.commands.dynamic.set(newCommand.name, newCommand);
        
                const file = Bun.file("./src/Config/dynamic-commands.json");
                const commands: DynamicCommand[] = await file.json();
                commands.push(newCommand)
                await file.write(JSON.stringify(commands, null, 2));
        
                await client.reply(
                    notification.event.message_id,
                    `Command !${newCommand.name} has been added successfully! VoHiYo`
                );
            }

            catch (e) {
                if (e instanceof Error)
                    await client.reply(
                        notification.event.message_id,
                        `Failed to add command !${newCommand.name}. Error: ${e.message}`
                    );
                else
                    await client.reply(
                        notification.event.message_id,
                        `Failed to add command !${newCommand.name}. An unknown error occurred.`
                    );
            }
        }

        else return await client.reply(
            notification.event.message_id,
            `Command !${command.name} already exists.`
        );    
    }
};