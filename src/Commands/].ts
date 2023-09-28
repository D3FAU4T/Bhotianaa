import { Command } from "../Core/Client";

export default new Command({
    Name: ']',
    Description: 'Unsets the Big Word and stops it\'s repeation',
    Run: ({ Channel }, Client) => {
        Client.UnsetBigWord();
        Client.say(Channel, '[INFO]: Big Word trigger removed.');
    }
})