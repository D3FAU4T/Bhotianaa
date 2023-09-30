import { Command } from "../Core/Client";

export default new Command({
    Name: 'bw',
    Description: 'Sets the big word',
    Run: ({ Message, Channel }, Client) => {
        const [CommandName, ...CommandArgs] = Message.split(' ');
        const IsAnnounced = Client.SetBigWord(CommandArgs.join(' '));
        if (IsAnnounced !== null) Client.say(Channel, IsAnnounced);
    }
})