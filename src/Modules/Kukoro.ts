import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { ChatUserstate } from 'tmi.js';
import { Bhotianaa } from '../Core/Client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { GameTypes, KukoroData, kukoroData } from '../Typings/Kukoro';

export class Kukoro {

    public Bot: Bhotianaa;
    public Database: KukoroData;
    public TwitchChannel: string;
    private Websocket: WebSocket.Server<typeof WebSocket, typeof IncomingMessage>;
    private static DatabasePath = "./src/Config/Kukoro.json";

    constructor(Bot: Bhotianaa, Websocket: WebSocket.Server<typeof WebSocket, typeof IncomingMessage>) {
        this.Bot = Bot;
        this.Websocket = Websocket;
        this.TwitchChannel = '#gianaa_';
        this.Database = this.LoadAndVerifyFiles();
        this.Bot.on('message', this.DungeonCommandHandler.bind(this));
        this.Bot.on('message', this.OtherKukoroCommandsHandler.bind(this));
    }

    public ResetDatabase(Games: GameTypes[]): KukoroData {
        for (const category of Games) {
            if (category === 'Sniper') {
                this.Database.Kukoro.Sniper.Active = false;
                this.Database.Kukoro.Sniper.FollowMode = false;
                this.Database.Kukoro.Sniper.Follower = 'Yo Mamma'
            } else if (category === 'OneTwoThree') {
                this.Database.Kukoro.OneTwoThree.Active = false;
                this.Database.Kukoro.OneTwoThree.Status = "none";
            }
            else if (category === 'Dungeon') {
                this.Database.Kukoro.Dungeon.Active = false;
                Object.keys(this.Database.Kukoro.Dungeon.Categories).forEach(element => this.Database.Kukoro.Dungeon.Categories[element] = []);
            }
        }

        this.SaveChanges();
        return this.Database;
    }

    private LoadAndVerifyFiles(): KukoroData {
        Kukoro.FileCheckerAndCreator(Kukoro.DatabasePath, JSON.stringify(kukoroData, null, 4));
        return JSON.parse(readFileSync(Kukoro.DatabasePath, 'utf-8')) as KukoroData;
    }

    public SaveChanges(Data?: KukoroData): void {
        writeFileSync(Kukoro.DatabasePath, JSON.stringify(Data || this.Database, null, 4));
    }

    public AnnounceAndSendSocket(data: KukoroData, messages?: string | string[]): void {
        this.Websocket.clients.forEach((client) => client.send(`{ "Server": [ "GG", { "message": ${JSON.stringify(data)} } ] }`));
        if (typeof messages === 'string') this.Bot.say(this.TwitchChannel, messages);
        else if (typeof messages === 'object') for (const message of messages) this.Bot.say(this.TwitchChannel, message);
    }

    private static FileCheckerAndCreator(FilePath: string, FileBody: string | NodeJS.ArrayBufferView, Overwrite?: boolean): boolean {
        if (Overwrite === undefined) Overwrite = false;
        if (FilePath.startsWith('./')) FilePath = FilePath.slice(2);
        const PathArray = FilePath.split('/');
        let Path = './';
        let modified = false;
        for (const DirOrFile of PathArray) {
            Path += DirOrFile + DirOrFile.includes('.') ? '' : '/';
            if (DirOrFile.includes('.')) {
                if (!existsSync(Path)) { writeFileSync(Path, FileBody); modified = true; }
                else {
                    if (Overwrite) {
                        writeFileSync(Path, FileBody);
                        modified = true;
                    }
                }
            } else {
                if (!existsSync(Path)) { mkdirSync(Path); modified = true; }
                else {
                    if (Overwrite) {
                        writeFileSync(Path, FileBody);
                        modified = true;
                    }
                }
            }
        }

        return modified;
    }

    private DungeonCommandHandler(Channel: string, UserState: ChatUserstate, Message: string, Self: boolean): void {
        if (this.Database.KukoroModuleToggle === false || Self || !Message.startsWith("!") || Message.includes('-') || Message.startsWith('/')) return;
        this.TwitchChannel = Channel;
        const args = Message.toLowerCase().replace(/\@/g, "").slice(1).split(' ');
        const command = args.shift();

        let isMod = UserState.mod || UserState['user-type'] === 'mod';
        let isBroadcaster = Channel.slice(1) === UserState.username;
        let isModUp = isMod || isBroadcaster;

        if (command == 'follow' && this.Database.Kukoro.Sniper.Active == true) {
            this.Database.Kukoro.Sniper.FollowMode = true;
            this.Database.Kukoro.Sniper.Follower = args[0].toLowerCase();
            this.SaveChanges();
            this.AnnounceAndSendSocket(this.Database, `I'm now following ${args[0]}`);
        }

        else if (command == 'rickrolled' && this.Database.Kukoro.Dungeon.Active === true) {
            this.Database = this.ResetDatabase(['Dungeon', 'Sniper', 'OneTwoThree']);
            this.AnnounceAndSendSocket(this.Database, `All categories are reset.`);
        }

        else if (command == 'newcategory' && isModUp) {
            this.Database.Kukoro.Dungeon.Categories[args[0]] = [];
            this.SaveChanges();
            if (UserState.username == 'gianaa_') this.Bot.say(Channel, `Mamma, I made a new cateogry: ${args[0]}`);
            else if (UserState.username == 'd3fau4t') this.Bot.say(Channel, `Papa Papa, look we have a new enemy: ${args[0]}`);
            else this.Bot.say(Channel, `Added new category: ${args[0]}`);
            this.AnnounceAndSendSocket(this.Database);
        }

        else if (command == 'join') {
            if (args[0] == 'dungeon') {
                this.Database = this.ResetDatabase(['Sniper', 'OneTwoThree']);
                this.Database.Kukoro.Dungeon.Active = true;
                // console.log('LOG JOIN DUNGEON: ', resources)
                this.SaveChanges();
                this.AnnounceAndSendSocket(this.Database, ["!kukoro", "!w !kukoro"]);
            }
            else if (args[0] == 'sniper') {
                this.Database = this.ResetDatabase(['Dungeon', 'OneTwoThree']);
                this.Database.Kukoro.Sniper.Active = true;
                this.Database.Kukoro.Sniper.FollowMode = true;
                this.SaveChanges();
                this.AnnounceAndSendSocket(this.Database, ["!kukoro", "!w !kukoro"]);
            }
            else if (args[0] == '123') {
                this.Database = this.ResetDatabase(['Dungeon', 'Sniper']);
                this.Database.Kukoro.OneTwoThree.Active = true;
                this.SaveChanges();
                this.AnnounceAndSendSocket(this.Database, "!kukoro");
            }
        }
        else if (command == 'reset') {
            this.Database = this.ResetDatabase(['Dungeon', 'Sniper', 'OneTwoThree']);
            this.AnnounceAndSendSocket(this.Database, "All categories are reset.");
        }
        else if (command == 'followon') {
            this.Database.Kukoro.Sniper.FollowMode = true;
            this.SaveChanges();
            this.AnnounceAndSendSocket(this.Database, `Follow mode turned on. I'm now following ${this.Database.Kukoro.Sniper.Follower}!`);
        }

        else if (command == 'followoff') {
            this.Database.Kukoro.Sniper.FollowMode = false;
            this.SaveChanges();
            this.AnnounceAndSendSocket(this.Database, `Follow mode turned off.`);
        }

        else if (command == 'hidebots') {
            this.AnnounceAndSendSocket(this.Database, ["!hide", "!w !hide"]);
        }

        else if (command == 'ability' && this.Database.Kukoro.Dungeon.Active) {
            if (typeof (this.Database.Kukoro.Dungeon.Categories[args[0]]) == 'undefined') return;
            if (args[1]) {
                if (this.Database.Kukoro.Dungeon.Categories[args[0]].includes(args[1])) return this.AnnounceAndSendSocket(this.Database, `Uncle ${args[1]} is already in the category ${args[0]}`);
                this.Database.Kukoro.Dungeon.Categories[args[0]].push(args[1]);
                this.SaveChanges();
                this.AnnounceAndSendSocket(this.Database, `Uncle ${args[1]} added to the ${args[0]} category`);
            } else {
                if (typeof (UserState.username) === 'undefined') return;
                if (this.Database.Kukoro.Dungeon.Categories[args[0]].includes(UserState.username)) return this.AnnounceAndSendSocket(this.Database, `Uncle ${UserState.username}, you're already in the category ${args[0]}`);
                this.Database.Kukoro.Dungeon.Categories[args[0]].push(UserState.username);
                this.SaveChanges();
                this.AnnounceAndSendSocket(this.Database, `Uncle ${UserState.username} added to the ${args[0]} category`);
            }
        }
        else if (command == 'categories') {
            let categories = Object.keys(this.Database.Kukoro.Dungeon.Categories).join(', ');
            this.AnnounceAndSendSocket(this.Database, `Categories: ${categories}`);
        }
        else if (typeof (command) != 'undefined' && this.Database.Kukoro.Dungeon.Categories[command] && this.Database.Kukoro.Dungeon.Active) {
            if (this.Database.Kukoro.Dungeon.Categories[command].length == 0) this.AnnounceAndSendSocket(this.Database, `The category ${command} is empty right now.`);
            else this.AnnounceAndSendSocket(this.Database, `The category ${command} has ${this.Database.Kukoro.Dungeon.Categories[command].length} members: ${this.Database.Kukoro.Dungeon.Categories[command].join(', ')}`);
        }

        else if (command == 'botsinfo' && this.Database.Kukoro.Dungeon.Active) this.AnnounceAndSendSocket(this.Database, ["!getinfo", "!getinfo @streamlabs"]);

        else return undefined
    }

    private OtherKukoroCommandsHandler(_Channel: string, UserState: ChatUserstate, Message: string, Self: boolean): void {
        if (this.Database.KukoroModuleToggle === false) return;
        if (this.Database.Kukoro.Sniper.Active && this.Database.Kukoro.Sniper.FollowMode && UserState.username == this.Database.Kukoro.Sniper.Follower) {
            if (Message.toLowerCase() == '!kukoro') return;
            else if (Message.toLowerCase() == "!club") this.AnnounceAndSendSocket(this.Database, "!club");
            else if (Message.toLowerCase() == "!park") this.AnnounceAndSendSocket(this.Database, "!park");
            else if (Message.toLowerCase() == "!plaza") this.AnnounceAndSendSocket(this.Database, "!plaza");
            else if (Message.toLowerCase() == "!dock") this.AnnounceAndSendSocket(this.Database, "!dock");
        }
    
        if (Self || Message.startsWith("/") || Message.includes("-") || Message.toLowerCase().startsWith("!w") || UserState.username != 'gianaa_') return;
    
        if (this.Database.Kukoro.OneTwoThree.Active && Message.includes('[KUKORO] <<< YOU CAN MOVE! >>>')) {
            this.Database.Kukoro.OneTwoThree.Status = "Walking";
            this.SaveChanges();
            this.AnnounceAndSendSocket(this.Database, "!go");
        }
        else if (this.Database.Kukoro.OneTwoThree.Active && Message.includes('[KUKORO] <<< STOP! >>>')) {
            this.Database.Kukoro.OneTwoThree.Status = "Halted";
            this.SaveChanges();
            this.AnnounceAndSendSocket(this.Database, "!stop");
        }
        else if (Message.includes('[KUKORO] RAID IS OVER >>>')) {
            this.Database = this.ResetDatabase(['Dungeon']);
            this.AnnounceAndSendSocket(this.Database, "All categories are now reset.");
        }
        else if (Message.includes("[KUKORO] GAME OVER >>>")) {
            this.Database = this.ResetDatabase(['Dungeon', 'Sniper', 'OneTwoThree']);
            this.AnnounceAndSendSocket(this.Database, "All categories are now reset.");
        }
        else if (Message.includes("[KUKORO] New objective") && Message.toLowerCase().includes('Sniper')) {
            const matches = Message.match(/\b([A-Z_0-9]+)’s\b/g);
            if (matches) matches.length > 1 ? this.Database.Kukoro.Sniper.Follower = matches[1].slice(0, -2).toLowerCase() : this.Database.Kukoro.Sniper.Follower = matches[0].slice(0, -2).toLowerCase();
            const matches1 = Message.match(/([A-Z_0-9]+)\./g);
            if (matches1) matches1.length > 1 ? this.Database.Kukoro.Sniper.Follower = matches1[1].slice(0, -1).toLowerCase() : this.Database.Kukoro.Sniper.Follower = matches1[0].slice(0, -1).toLowerCase();
            this.SaveChanges();
            this.AnnounceAndSendSocket(this.Database, `I'm now following ${this.Database.Kukoro.Sniper.Follower}`);
        }

        else return undefined;
    }
}

//[KUKORO] STREAMLABS (Lv. 13, Crit. 16%, Dodge 11%) > [You will run away from combat if you get under 25% hp in front of any boss] and [Level +2 all your team if you die by any boss].
//[KUKORO] New objective #1/3: The Sniper is tracking radiation particles on SPECTRODANNY71’s clothing.
//[KUKORO] RAID IS OVER >>> NOTSOCLEAR and STREAMLABS leveled up for the next raid.
//[KUKORO] New objective #1/3: The Sniper is tracking radiation particles on MATANXD1’s clothing.
// [KUKORO] New objective #2/3: The Sniper is analyzing DNA to find PRATEEK_N.
// PARK PLAZA PARK DOCK
// [KUKORO] GAME OVER >>> 