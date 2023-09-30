import { Command } from "../Core/Client";

export default new Command({
    Name: 'uptime',
    Description: 'Gets the uptime of the stream',
    Run: async ({ Message, Channel }, Client) => {
        const Uptime = await Client.GetUptime(Channel);
        if (Uptime === 'gianaa_ is offline') Client.say(Channel, `Shhh, my mamma is sleeping, do not disturb her`);
        else Client.say(Channel, `My mamma has been live for ${Uptime} blobDance`);
    }
})