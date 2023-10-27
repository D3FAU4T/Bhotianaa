import glob from "glob";
import axios, { AxiosError } from "axios";
import { appendFileSync, readFileSync } from "fs";
import { ChatUserstate, Client } from "tmi.js";
import { promisify } from "util";
import { remove } from "remove-accents";
import { AnnounceColors, CommandsInterface, LogErrorPath } from "../Typings/Core";
import { GetChannel, GetGames, GetUser, StreamGoodClips, StreamGoodClipsError, TwitchAPIStandardError } from "../Typings/TwitchAPI";
import { DictionaryAPI, OxfordDictionaryAPI } from "../Typings/DictionaryAPI";

const globPromise = promisify(glob);

export class Command {
    constructor(Options: CommandsInterface) {
        Object.assign(this, Options);
    }
}

export class Bhotianaa extends Client {

    public BigWord: string | null;
    public TemporaryLink: string | null;

    private BigWordActive: boolean;
    private BigWordMessageCount: number;
    public CustomCommands: Map<string, CommandsInterface>;

    private static readonly TwitchHeaders = Bhotianaa.MakeHeader(false);
    private static readonly TwitchStreamerHeaders = Bhotianaa.MakeHeader(true);
    private static readonly DictionaryHeaders = {
        'app_id': process.env['OD_ID'],
        'app_key': process.env['OD_KEY']
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

        this.TemporaryLink = (JSON.parse(readFileSync('./src/Resources/Links.json', 'utf-8')) as { Link: string; }).Link;
    }

    private static MakeHeader(StreamerMode: boolean) {
        return {
            'Client-Id': process.env['clientId'],
            'Authorization': StreamerMode ? process.env['authStreamer'] : process.env['auth'],
            'Content-Type': 'application/json'
        }
    }

    public async Start(): Promise<void> {
        await this.LoadCustomCommands().catch(console.error);
        await this.connect().catch(console.error);

        this.on('message', (channel, userstate, message, self) => {
            if (self || message.startsWith('/')) return;

            if (this.BigWordActive) this.BigWordMessageCount++;
            if (this.BigWordActive && this.BigWordMessageCount === 7) {
                this.say(channel, `Nerdge letters --> ${this.BigWord}`);
                this.BigWordMessageCount = 0;
            }

            // Commands Handler
            if (message.startsWith('!')) {
                const [CommandName, ...CommandArgs] = message.split(' ');
                const Command = this.CustomCommands.get(CommandName.slice(1).toLowerCase());

                if (Command) Command.Run({ Channel: channel, Message: message, UserState: userstate }, this);
            }

            else if (message === ']') this.CustomCommands.get(']')?.Run({ Channel: channel, Message: message, UserState: userstate }, this);

            if (message.endsWith('-')) this.say(channel, message.slice(0, -1));
        });
    }

    public async ImportFile<T>(filePath: string): Promise<T> {
        return await require(filePath).default as T;
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

            axios.post(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=518259240&moderator_id=836876180`, DataToPost, { headers: Bhotianaa.TwitchHeaders });
            return true;
        } catch (error) {
            const err = error as AxiosError<TwitchAPIStandardError>;
            appendFileSync(LogErrorPath, `${err.response?.data}\n\n`);
            console.error(err.response?.data);
            return false;
        }
    }

    public async GetRandomClip(ChannelName: string): Promise<StreamGoodClips | StreamGoodClipsError | null> {
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

    public async GetUserData(Username: string): Promise<GetUser | null> {
        try {
            const { data } = await axios.get<GetUser>(`https://api.twitch.tv/helix/users?login=${Username}`, { headers: Bhotianaa.TwitchStreamerHeaders });
            return data;
        } catch (error) {
            const err = error as AxiosError<TwitchAPIStandardError>;
            appendFileSync(LogErrorPath, `${err.response?.data}\n\n`);
            console.error(err.response?.data);
            return null;
        }
    }

    public async GetChannelData(BroadcasterID: string | number): Promise<GetChannel | null> {
        try {
            const { data } = await axios.get<GetChannel>(`https://api.twitch.tv/helix/channels?broadcaster_id=${BroadcasterID}`, { headers: Bhotianaa.TwitchStreamerHeaders });
            return data;
        } catch (error) {
            const err = error as AxiosError<TwitchAPIStandardError>;
            appendFileSync(LogErrorPath, `${err.response?.data}\n\n`);
            console.error(err.response?.data);
            return null;
        }
    }

    public async GetUptime(ChannelName: string): Promise<string> {
        try {
            const { data } = await axios.get<string>(`https://decapi.me/twitch/uptime?channel=${ChannelName.replace(/\#/g, '')}`);
            return data;
        } catch (err) {
            return 'An error occurred while executing this command'
        }
    }

    public async GetGame(GameName: string): Promise<GetGames | null> {
        try {
            const { data } = await axios.get<GetGames>(`https://api.twitch.tv/helix/games?name=${GameName}`, { headers: Bhotianaa.TwitchHeaders });
            return data;
        } catch (error) {
            const err = error as AxiosError<TwitchAPIStandardError>;
            appendFileSync(LogErrorPath, `${err.response?.data}\n\n`);
            console.error(err.response?.data);
            return null;
        }
    }

    public SetGame(BroadcasterID: string | number, GameID: string | number): boolean {
        try {
            axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${BroadcasterID}`, { 'game_id': `${GameID}` }, { headers: Bhotianaa.TwitchStreamerHeaders });
            return true;
        } catch (error) {
            const err = error as AxiosError<TwitchAPIStandardError>;
            appendFileSync(LogErrorPath, `${err.response?.data}\n\n`);
            console.error(err.response?.data);
            return false;
        }
    }

    public SetTitle(BroadcasterID: string | number, Title: string): boolean {
        try {
            axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${BroadcasterID}`, { "title": Title }, { headers: Bhotianaa.TwitchStreamerHeaders });
            return true;
        } catch (error) {
            const err = error as AxiosError<TwitchAPIStandardError>;
            appendFileSync(LogErrorPath, `${err.response?.data}\n\n`);
            console.error(err.response?.data);
            return false;
        }
    }

    public async DefineWord(Word: string): Promise<string> {
        if (Word == undefined || Word == null || Word.length == 0) return "This command is used for defining words. Usage: !define <word>";

        const WordId = remove(Word);
        let data = '';

        try {
            const res = await axios.get<OxfordDictionaryAPI>(`https://od-api.oxforddictionaries.com/api/v2/entries/en-gb/${WordId}?fields=definitions&strictMatch=false`, { headers: Bhotianaa.DictionaryHeaders });
            data = res.data.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0];
        } catch (err) {
            try {
                const resp = await axios.get<DictionaryAPI[]>(`https://api.dictionaryapi.dev/api/v2/entries/en/${WordId}`);
                data = `${Word}: ${resp.data[0].meanings[0].definitions[0].definition}`;
            } catch (error) {
                data = `Oh no, I don't know the definition of ${Word}, Mamma help D:`;
            }
        }
        return data;
    }

    public SetLink(Link: string): void {
        this.TemporaryLink = Link;
    }
}