import { Command } from "../Core/Client";

export default new Command({
    Name: 'settitle',
    Description: 'Sets the title of the stream',
    Run: ({ Message, Channel, UserState }, Client) => {
        const [CommandName, ...CommandArgs] = Message.split(' ');
        const IsAnnounced = Client.SetTitle(518259240, CommandArgs.join(' ')) // SetTitle(CommandArgs.join(' '));
        if (!IsAnnounced) Client.say(Channel, `[ERROR]: Failed to set the title. Check error logs.`);
        else {
            if (UserState.username === 'd3fau4t') Client.say(Channel, `Papa look, I changed the title to ${CommandArgs.join(' ')} VoHiYo`);
            else if (UserState.username === 'gianaa_') Client.say(Channel, `Mamma, I updated the title to ${CommandArgs.join(' ')} :)) <3`);
            else Client.say(Channel, `New title: ${CommandArgs.join(' ')}`);
        }
    }
})