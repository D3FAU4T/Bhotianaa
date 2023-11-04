import { Command } from "../Core/Client";
import { CustomWebSocket } from "../Typings/WebSocket";

export default new Command({
    Name: 'so',
    Description: 'Sends a shoutout to a channel',
    Run: async ({ Message, Channel }, Client) => {
        const [_CommandName, ...CommandArgs] = Message.split(' ');
        const clip = await Client.GetRandomClip(CommandArgs[0]);
        // @ts-ignore
        if (!clip || clip === "") return;
        if ('errors' in clip) { clip.errors.forEach(err => console.error(err)); return; }
        else {
            if (Client.BotOptions.WebSocket) {
                Client.BotOptions.WebSocket.clients.forEach((client: CustomWebSocket) => {
                    if (client.hasOwnProperty("channel") && client.channel === Channel.slice(1)) client.send(`{ "Server": ["Mostrar bhai", ${JSON.stringify(clip)} ] }`);
                })
            }
        }
    }
})