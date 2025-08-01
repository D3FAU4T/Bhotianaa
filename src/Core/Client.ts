import { Client } from 'tmi.js';
import type { ChatUserstate } from 'tmi.js';
import type { BotState, ICommand } from '../Typings/Bhotianaa';

export default class {
    public twitch: Client;
    public commands: Map<string, ICommand>;
    public state: BotState;

    constructor(accessToken: string, username?: string) {
        const botUsername = username || Bun.env.TWITCH_USERNAME;
        
        this.twitch = new Client({
            options: {
                debug: Bun.env.NODE_ENV === 'development',
                clientId: Bun.env.TWITCH_CLIENT_ID,
            },
            identity: {
                username: botUsername,
                password: `oauth:${accessToken}`,
            },
            channels: [Bun.env.TWITCH_CHANNEL]
        });

        this.commands = new Map();
        this.state = {
            bigWord: null,
            bigWordActive: false,
            bigWordMessageCount: 0,
            temporaryLink: null
        };

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.twitch.on('message', async (channel, userstate, message, self) => {
            if (self || message.startsWith('/')) return;
            const msg = message.toLowerCase();

            // Handle big word tracking
            if (this.state.bigWordActive) {
                this.state.bigWordMessageCount++;
                if (this.state.bigWordMessageCount === 7) {
                    this.state.bigWord ? this.twitch.say(channel, this.state.bigWord) : null;
                    this.state.bigWordMessageCount = 0;
                }
            }

            // Handle commands
            if (msg.startsWith('!'))
                return await this.handleCommand(channel, userstate, message);

            // Handle special messages - BW end trigger
            if (msg === ']') {
                const bracketCommand = this.commands.get(']')!;
                return await bracketCommand.execute(
                    { channel, userstate, message, args: [] },
                    this
                );
            }

            if (msg.includes('bhotiana'))
                return await this.twitch.say(channel, `@${userstate.username} What!? 👀`);

            // Handle message ending with ',' (repeat without comma)
            if (msg.endsWith(',')) {
                const msgToRepeat = msg.slice(0, -1);
                if (msgToRepeat.length)
                    this.twitch.say(channel, msgToRepeat);
            }
        });
    }

    private async handleCommand(channel: string, userstate: ChatUserstate, message: string): Promise<void> {
        const args = message.slice(1).split(' ');
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = this.commands.get(commandName);
        if (!command) return;

        // Check moderator permissions
        if (command.moderatorOnly && !this.hasModPermissions(channel, userstate))
            return;

        // Execute command
        try {
            await command.execute({ channel, userstate, message, args }, this);
        }

        catch (error) {
            console.error(`Error executing command ${commandName}:`, error);

            // Provide user feedback for command errors
            if (error instanceof Error) {
                if (Bun.env.NODE_ENV === 'development')
                    await this.twitch.say(channel, `[DEV ERROR]: ${commandName} - ${error.message}`);
                
                else
                    await this.twitch.say(channel, `[ERROR]: Command ${commandName} failed to execute.`);
            }
        }
    }

    public hasModPermissions(channel: string, userstate: ChatUserstate): boolean {
        return userstate.mod ||
            userstate['user-type'] === 'mod' ||
            userstate.username === channel.slice(1);
    }

    public async initializeState(): Promise<void> {
        // Load temporary link from config
        try {
            const linkFile = Bun.file('./src/Config/Links.json');
            if (await linkFile.exists()) {
                const linkData = await linkFile.json() as { Link: string };
                this.state.temporaryLink = linkData.Link;
            }
        }
        
        catch (error) {
            console.warn('Could not load temporary link from config:', error);
        }
    }

    public async loadCommands(): Promise<void> {
        const commandsPath = import.meta.dir + '/../Commands';
        const glob = new Bun.Glob('*.{ts,js}');

        try {
            for await (const file of glob.scan(commandsPath)) {
                const commandModule = await import(`../Commands/${file}`);
                const command = commandModule.default as ICommand;

                if (command && command.name && typeof command.execute === 'function') {
                    this.commands.set(command.name, command);
                }
            }
        }
        
        catch (error) {
            console.error('Error loading commands:', error);
        }
    }

    public async connect(): Promise<void> {
        try {
            await this.initializeState();
            await this.loadCommands();
            
            // Add error event handlers
            this.twitch.on('disconnected', (reason) => {
                console.error('🔥 Bot disconnected:', reason);
            });
            
            this.twitch.on('notice', (channel, msgid, message) => {
                console.error('🔥 Notice:', msgid, message);
            });
            
            await this.twitch.connect();
            console.log('🤖 Bot connected to Twitch!');
        }
        
        catch (error) {
            console.error('🔥 Failed to connect bot:', error);
            throw error;
        }
    }

    // Bot utility methods
    public setBigWord(word: string): string | null {
        this.state.bigWordActive = true;
        this.state.bigWord = word.replace(/\p{Emoji}/gu, '').toUpperCase().split('').join(' ');
        this.state.bigWordMessageCount = 0;
        return this.state.bigWord;
    }

    public unsetBigWord(): void {
        this.state.bigWordActive = false;
        this.state.bigWord = null;
        this.state.bigWordMessageCount = 0;
    }

    public setLink(link: string): void {
        this.state.temporaryLink = link;
    }
}