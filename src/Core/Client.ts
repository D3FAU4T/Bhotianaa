import { Client } from 'tmi.js';
import type { ChatUserstate } from 'tmi.js';
import type { BotState, ICommand } from '../Typings/Bhotianaa';

class Bhotianaa {
    public twitch: Client;
    public commands: Map<string, ICommand>;
    public state: BotState;

    constructor(password: string) {
        this.twitch = new Client({
            options: {
                debug: Bun.env.NODE_ENV === 'development',
                clientId: Bun.env.TWITCH_CLIENT_ID,
            },
            identity: {
                username: Bun.env.TWITCH_USERNAME,
                password: `oauth:${password}`,
            },
            channels: Bun.env.TWITCH_CHANNELS?.split(',') || ['gianaa_']
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

            // Handle big word tracking
            if (this.state.bigWordActive) {
                this.state.bigWordMessageCount++;
                if (this.state.bigWordMessageCount === 7) {
                    this.state.bigWord ? this.twitch.say(channel, this.state.bigWord) : null;
                    this.state.bigWordMessageCount = 0;
                }
            }

            // Handle commands
            if (message.startsWith('!'))
                return await this.handleCommand(channel, userstate, message);

            // Handle special messages
            if (message === ']') {
                const bracketCommand = this.commands.get(']')!;
                return await bracketCommand.execute(
                    { channel, userstate, message, args: [] },
                    this
                );
            }

            // Handle message ending with ',' (repeat without comma)
            if (message.endsWith(',')) {
                const msgToRepeat = message.slice(0, -1);
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
        if (command.moderatorOnly && !this.hasModPermissions(channel, userstate)) {
            return;
        }

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
        } catch (error) {
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
        } catch (error) {
            console.error('Error loading commands:', error);
        }
    }

    public async connect(): Promise<void> {
        await this.initializeState();
        await this.loadCommands();
        await this.twitch.connect();
        console.log('🤖 Bot connected to Twitch!');
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

export default Bhotianaa;