import { Command } from "../Core/Client";

export default new Command({
    Name: 'define',
    Description: 'Defines a word',
    Run: async ({ Message, Channel }, Client) => {
        const [_CommandName, ...CommandArgs] = Message.split(' ');
        Client.say(Channel, await Client.DefineWord(CommandArgs[0]));
    }
})