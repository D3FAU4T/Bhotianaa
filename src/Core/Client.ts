import glob from "glob";
import axios, { AxiosError } from "axios";
import { appendFileSync } from "fs";
import { ChatUserstate, Client } from "tmi.js";
import { promisify } from "util";
import { AnnounceColors, CommandsInterface, LogErrorPath } from "../Typings/Core";
import { StreamGoodClips, StreamGoodClipsError, TwitchAPIStandardError } from "../Typings/TwitchAPI";

const globPromise = promisify(glob);

export class Command {
    constructor(Options: CommandsInterface) {
        Object.assign(this, Options);
    }
}

export class Bhotianaa extends Client {

    public BigWord: string | null;
    private BigWordActive: boolean;
    private BigWordMessageCount: number;
    private CustomCommands: Map<string, CommandsInterface>;

    private static readonly TwitchHeaders = {
        'Client-Id': process.env['clientId'],
        'Authorization': process.env['auth'],
        'Content-Type': 'application/json'
    };

    constructor(ChannelName: string) {
        super({
            options: { clientId: process.env['clientId'], debug: true },
            connection: { reconnect: true },
            identity: {
                username: 'bhotianaa_',
                password: process.env['password']
            },
            channels: [ChannelName]
        });

        this.BigWord = null;
        this.BigWordActive = false;
        this.BigWordMessageCount = 0;
        this.CustomCommands = new Map();
    }

    public async Start(): Promise<void> {
        await this.LoadCustomCommands().catch(console.error);
        await this.connect().catch(console.error);

        this.on('message', (channel, userstate, message, self) => {
            if (message.startsWith('/')) return;

            if (!self) {
                if (this.BigWordActive) this.BigWordMessageCount++;
    
                if (this.BigWordActive && this.BigWordMessageCount === 7) {
                    this.say(channel, `Nerdge letters --> ${this.BigWord}`);
                    this.BigWordMessageCount = 0;
                }
            }            

            // Commands Handler
            if (message.startsWith('!')) {
                const [CommandName, ...CommandArgs] = message.split(' ');
                const Command = this.CustomCommands.get(CommandName.slice(1).toLowerCase());

                if (Command) Command.Run({ Channel: channel, Message: message, Self: self, UserState: userstate }, this);
            }
        });
    }

    public async ImportFile<T>(FilePath: string) {
        return await require(FilePath) as T;
    }

    public async LoadCustomCommands(): Promise<void> {
        const CommandFiles = await globPromise(`${__dirname}/../Commands/*{.ts,.js}`);

        CommandFiles.forEach(async FilePath => {
            const Command = await this.ImportFile<CommandsInterface>(FilePath);
            this.CustomCommands.set(Command.Name, Command);
        });
    }

    public SetBigWord(Word: string): string | null {
        this.BigWordActive = true;
        this.BigWord = Word.replace(/\p{Emoji}/gu, '').toUpperCase().split('').join(' ');
        const IsAnnounced = this.Announce(`Nerdge letters --> ${this.BigWord}`, 'blue');
        this.BigWordMessageCount = 0;
        if (!IsAnnounced) return `Nerdge letters --> ${this.BigWord}`;
        else return null;
    }

    public UnsetBigWord(): void {
        this.BigWordActive = false;
        this.BigWord = null;
        this.BigWordMessageCount = 0;
    }

    public Announce(Text: string, color?: AnnounceColors): boolean {
        try {
            const DataToPost = {
                message: Text,
                color: color || 'primary'
            };

            axios.post(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=518259240&moderator_id=518259240`, DataToPost, { headers: Bhotianaa.TwitchHeaders });
            return true;
        } catch (error) {
            const err = error as AxiosError<TwitchAPIStandardError>;
            appendFileSync(LogErrorPath, `${err.response?.data}\n\n`);
            console.error(err.response?.data);
            return false;
        }
    }

    public async FetchRandomClip(ChannelName: string): Promise<StreamGoodClips | StreamGoodClipsError | null> {
        try {
            const { data } = await axios.get<StreamGoodClips | StreamGoodClipsError>(`https://streamgood.gg/shoutout/api?channel=${ChannelName}&mode=random&last_game=true&max_length=60&filter_long_videos=true`);
            return data;
        } catch (error) {
            const err = error as AxiosError;
            appendFileSync(LogErrorPath, `${err.response?.data}\n\n`);
            console.error(err.response?.data);
            return null;
        }
    }

    public HasModPermissions(Channel: string, UserState: ChatUserstate): boolean {
        return UserState.mod || UserState["user-type"] === 'mod' || UserState.username === Channel.slice(1);
    }
}