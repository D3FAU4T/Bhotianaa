import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from '../Typings/Bhotianaa';

export default <ICommand>{
    name: ']',
    description: 'Unsets the Big Word and stops its repetition',
    execute(context: CommandContext, client: Bhotianaa): void {
        client.unsetBigWord();
        client.twitch.say(context.channel, 'Big Word trigger removed PepeHands');
    }
};