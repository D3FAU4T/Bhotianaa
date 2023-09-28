import axios, { AxiosError } from "axios";
import { Client  } from "tmi.js";
import { AnnounceColors, CommandsInterface, LogErrorPath } from "../Typings/Core";
import { TwitchAPIStandardError } from "../Typings/TwitchAPI";
import { appendFileSync } from "fs";

export class Command {
    constructor(Options: CommandsInterface) {
        Object.assign(this, Options);
    }
}

export class Bhotianaa extends Client {

    public BigWord: string | null;
    private BigWordActive: boolean;
    private BigWordMessageCount: number;
    private CustomCommands: Map<string, Command>;

    private static readonly TwitchHeaders = {
        'Client-Id': process.env['clientId'],
        'Authorization': process.env['auth'],
        'Content-Type': 'application/json'
    };

    constructor() {
        super({
            options: { clientId: process.env['clientId'], debug: true },
            connection: { reconnect: true },
            identity: {
                username: 'bhotianaa_',
                password: process.env['password']
            }
        });

        this.BigWord = null;
        this.BigWordActive = false;
        this.BigWordMessageCount = 0;
        this.CustomCommands = new Map();
    }

    public Start(): void {
        this.connect().catch(console.error);

        this.on('message', (channel, userstate, message, self) => {
            if (self || message.startsWith('/')) return;
            this.BigWordMessageCount++;

            if (this.BigWordActive && this.BigWordMessageCount === 7) {
                this.say(channel, `Nerdge letters --> ${this.BigWord}`);
                this.BigWordMessageCount = 0;
            }
        });
    }

    public LoadCustomCommands(): void {

    }

    public SetBigWord(Word: string): void {
        this.BigWordActive = true;
        this.BigWord = Word.replace(/\p{Emoji}/gu, '').toUpperCase().split('').join(' ');
        this.Announce(`Nerdge letters --> ${this.BigWord}`, 'blue');
        this.BigWordMessageCount = 0;
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
}