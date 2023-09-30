import { Command } from "../Core/Client";

export default new Command({
    Name: 'setgame',
    Description: 'Sets the game of the stream',
    Run: async ({ Message, Channel, UserState }, Client) => {
        const [CommandName, ...CommandArgs] = Message.split(' ');
        const GameData = await Client.GetGame(CommandArgs.join(' '));
        if (GameData === null) return Client.say(Channel, `[ERROR]: Failed to get the game information. Check error logs.`);        
        const IsSet = Client.SetGame(518259240, GameData.data[0].id);
        if (!IsSet) return Client.say(Channel, `[ERROR]: Failed to set the game. Check error logs.`);
        else {
            if (UserState.username === 'd3fau4t') Client.say(Channel, `Papa, Mamma is playing a new game: ${GameData.data[0].name}`);
            else if (UserState.username === 'gianaa_') Client.say(Channel, `Mamma, I updated the game: ${GameData.data[0].name}`);
            else Client.say(Channel, `New game: ${GameData.data[0].name}`);
        }
    }
})