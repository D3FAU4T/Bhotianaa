import { Command } from "../Core/Client";

export default new Command({
    Name: 'bw',
    Description: 'Sets the big word',
    Run: ({ Message }, Client) => {
        const [CommandName, ...CommandArgs] = Message.split(' ');
        Client.SetBigWord(CommandArgs.join(' '));
    }
})