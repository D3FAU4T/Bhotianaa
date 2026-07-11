import type { Command, DynamicCommand } from "../Typings/Bhotianaa";

export default <Command>{
    name: "editcom",
    description: "Edit a dynamic command (Mods/Broadcaster only)",
    aliases: ["editcommand", "updatecommand", "updatecom"],
    roles: ["broadcaster", "lead_moderator", "moderator"],
    execute: async (notification, client, sharedContext) => {
        const args = notification.event.message.text.split(" ");
        args.shift();

        if (!args[0] || !args[1]) {
            await client.reply(
                notification.event.message_id,
                `Usage: !editcom <!commandName> <new response>`,
            );
            return;
        }

        let commandName = args[0].replace("!", "").toLowerCase();

        // Check if it's a hard-coded command (cannot be edited)
        if (sharedContext.commands.system.has(commandName)) {
            await client.reply(
                notification.event.message_id,
                `Cannot edit hard-coded command !${commandName}.`,
            );
            return;
        }

        const command = sharedContext.commands.dynamic.get(commandName);

        // Check if dynamic command exists
        if (!command) {
            await client.reply(
                notification.event.message_id,
                `Dynamic command !${commandName} does not exist. Use !addcom to create it.`,
            );
            return;
        }

        const newResponse = args.slice(1).join(" ");

        const updatedCommand: DynamicCommand = {
            ...command,
            response: newResponse,
        };

        sharedContext.commands.dynamic.set(updatedCommand.name, updatedCommand);

        for (const alias of updatedCommand.aliases ?? [])
            sharedContext.commands.dynamic.set(alias, updatedCommand);

        try {
            const file = Bun.file("./src/Config/dynamic-commands.json");
            const commands: DynamicCommand[] = await file.json();
            const commandIndex = commands.findIndex(
                (cmd) => cmd.name === updatedCommand.name,
            );

            if (commandIndex !== -1) {
                commands[commandIndex] = updatedCommand;
                await file.write(JSON.stringify(commands, null, 2));
                await client.reply(
                    notification.event.message_id,
                    `Command !${command.name} has been updated successfully! VoHiYo`,
                );
            } else {
                await client.reply(
                    notification.event.message_id,
                    `Failed to update command !${command.name}`,
                );
            }
        } catch (e) {
            await client.reply(
                notification.event.message_id,
                `Failed to update command !${command.name}`,
            );
        }
    },
};
