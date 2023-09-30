import { writeFileSync } from "fs";
import { Command } from "../Core/Client";

export default new Command({
    Name: 'link',
    Description: 'Sets the temporary link or get it',
    Run: ({ Message, Channel, UserState }, Client) => {
        const args = Message.substring(1).split(' ');

        if (!args.length) Client.say(Channel, `${Client.TemporaryLink}`);
        
        else {
            const IsModOrBroadcaster = Client.HasModPermissions(Channel, UserState);
            if (!IsModOrBroadcaster) return Client.say(Channel, `@${UserState.username} You don't have permission to use this command`);
            Client.TemporaryLink = args[1];
            writeFileSync('./src/Resources/Links.json', JSON.stringify({ Link: args[1] }));
            if (UserState.username == 'gianaa_') Client.say(Channel, `Updated the link, mamma :))`)
            else if (UserState.username == 'd3fau4t') Client.say(Channel, `Updated the link, papa 🙃`)
            else Client.say(Channel, `Updated the link :>`);
        }
    }
})