import { Command } from "../Core/Client";

export default new Command({
    Name: 'bw',
    Description: 'Sets the big word',
    Run: (Options, Client) => {
        Options.Message
    }
})