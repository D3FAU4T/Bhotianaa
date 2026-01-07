import { Client } from 'tmi.js';
import type { ChatUserstate } from 'tmi.js';
import type { BotState, ICommand, DynamicCommand, Timer } from '../Typings/Bhotianaa';
import { server } from '../..';

export default class {
    public twitch: Client;
    public commands: Map<string, ICommand>;
    public dynamicCommands: Map<string, DynamicCommand>;
    public timers: Map<string, Timer>;
    private runningTimers: Map<string, ReturnType<typeof setInterval>>;
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
        this.dynamicCommands = new Map();
        this.timers = new Map();
        this.runningTimers = new Map();
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
            server.publish('chat', JSON.stringify({ channel, userstate, message }));

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
                this.unsetBigWord();
                await this.twitch.say(channel, 'Big Word trigger removed PepeHands');
                return;
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

        // Check for hard-coded commands first (direct name match)
        let command = this.commands.get(commandName);

        // If no direct match, check for aliases
        if (!command) {
            for (const [, cmd] of this.commands) {
                if (cmd.aliases && cmd.aliases.includes(commandName)) {
                    command = cmd;
                    break;
                }
            }
        }

        if (command) {
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
            return;
        }

        // Check for dynamic commands
        const dynamicCommand = this.dynamicCommands.get(commandName);

        if (dynamicCommand) {
            try {
                await this.executeDynamicCommand(channel, userstate, args, dynamicCommand);
            }

            catch (error) {
                console.error(`Error executing dynamic command ${commandName}:`, error);
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
            await this.loadDynamicCommands();
            await this.loadTimers();

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

    // Dynamic command methods
    private async executeDynamicCommand(channel: string, userstate: ChatUserstate, args: string[], dynamicCommand: DynamicCommand): Promise<void> {
        let response = dynamicCommand.response;

        // Simple variable substitution
        response = response.replace(/\{user\}/g, userstate.username || 'Unknown');
        response = response.replace(/\{channel\}/g, channel.slice(1)); // Remove # from channel name

        // If args are provided, replace {1}, {2}, etc.
        args.forEach((arg, index) => {
            response = response.replace(new RegExp(`\\{${index + 1}\\}`, 'g'), arg);
        });

        await this.twitch.say(channel, response);
    }

    public async loadDynamicCommands(): Promise<void> {
        try {
            const dynamicCommandsFile = Bun.file('./src/Config/dynamic-commands.json');
            if (await dynamicCommandsFile.exists()) {
                const commandsData = await dynamicCommandsFile.json() as Record<string, DynamicCommand>;

                for (const [name, command] of Object.entries(commandsData)) {
                    this.dynamicCommands.set(name, command);
                }

                console.log(`📝 Loaded ${this.dynamicCommands.size} dynamic commands`);
            } else {
                console.log('📝 No dynamic-commands.json found, starting with 0 dynamic commands');
            }
        } catch (error) {
            console.warn('Could not load dynamic commands:', error);
        }
    }

    public async saveDynamicCommands(): Promise<void> {
        try {
            const commandsData: Record<string, DynamicCommand> = {};

            for (const [name, command] of this.dynamicCommands.entries()) {
                commandsData[name] = command;
            }

            await Bun.write('./src/Config/dynamic-commands.json', JSON.stringify(commandsData, null, 2));
        } catch (error) {
            console.error('Could not save dynamic commands:', error);
            throw error;
        }
    }

    public async addDynamicCommand(name: string, response: string, createdBy: string): Promise<boolean> {
        try {
            const command: DynamicCommand = {
                name,
                response,
                createdBy,
                createdAt: new Date().toISOString()
            };

            this.dynamicCommands.set(name, command);
            await this.saveDynamicCommands();

            // Publish update to all connected clients
            const commands: Record<string, any> = {};
            for (const [n, cmd] of this.dynamicCommands.entries()) {
                commands[n] = cmd;
            }
            server.publish('commands', JSON.stringify({ type: 'allCommands', commands }));

            return true;
        } catch (error) {
            console.error('Error adding dynamic command:', error);
            return false;
        }
    }

    public async removeDynamicCommand(name: string): Promise<boolean> {
        try {
            if (!this.dynamicCommands.has(name)) {
                return false;
            }

            this.dynamicCommands.delete(name);
            await this.saveDynamicCommands();

            // Publish update to all connected clients
            const commands: Record<string, any> = {};
            for (const [n, cmd] of this.dynamicCommands.entries()) {
                commands[n] = cmd;
            }
            server.publish('commands', JSON.stringify({ type: 'allCommands', commands }));

            return true;
        } catch (error) {
            console.error('Error removing dynamic command:', error);
            return false;
        }
    }

    public async updateDynamicCommand(name: string, response: string): Promise<boolean> {
        try {
            const existingCommand = this.dynamicCommands.get(name);
            if (!existingCommand) {
                return false;
            }

            // Preserve original metadata, only update response
            const updatedCommand: DynamicCommand = {
                ...existingCommand,
                response,
                updatedAt: new Date().toISOString()
            };

            this.dynamicCommands.set(name, updatedCommand);
            await this.saveDynamicCommands();

            // Publish update to all connected clients
            const commands: Record<string, any> = {};
            for (const [n, cmd] of this.dynamicCommands.entries()) {
                commands[n] = cmd;
            }
            server.publish('commands', JSON.stringify({ type: 'allCommands', commands }));

            return true;
        } catch (error) {
            console.error('Error updating dynamic command:', error);
            return false;
        }
    }

    // Timer methods
    public async loadTimers(): Promise<void> {
        try {
            const timersFile = Bun.file('./src/Config/timers.json');
            if (await timersFile.exists()) {
                const timersData = await timersFile.json() as Record<string, Timer>;

                for (const [name, timer] of Object.entries(timersData)) {
                    this.timers.set(name, timer);
                    if (timer.enabled) {
                        this.startTimer(timer);
                    }
                }

                console.log(`⏱️ Loaded ${this.timers.size} timers`);
            } else {
                console.log('⏱️ No timers.json found, starting with 0 timers');
            }
        } catch (error) {
            console.warn('Could not load timers:', error);
        }
    }

    public async saveTimers(): Promise<void> {
        try {
            const timersData: Record<string, Timer> = {};

            for (const [name, timer] of this.timers.entries()) {
                timersData[name] = timer;
            }

            await Bun.write('./src/Config/timers.json', JSON.stringify(timersData, null, 2));
        } catch (error) {
            console.error('Could not save timers:', error);
            throw error;
        }
    }

    private startTimer(timer: Timer): void {
        this.stopTimer(timer.name); // Ensure no duplicate intervals

        const intervalMs = timer.interval * 60 * 1000;
        const intervalId = setInterval(() => {
            const channel = Bun.env.TWITCH_CHANNEL;
            this.twitch.say(channel, timer.message);
        }, intervalMs);

        this.runningTimers.set(timer.name, intervalId);
    }

    private stopTimer(name: string): void {
        const intervalId = this.runningTimers.get(name);
        if (intervalId) {
            clearInterval(intervalId);
            this.runningTimers.delete(name);
        }
    }

    public async addTimer(name: string, message: string, interval: number): Promise<boolean> {
        // Validate interval: minimum 1 minute, maximum 1440 minutes (24 hours)
        const validInterval = Math.max(1, Math.min(1440, Math.floor(interval)));

        if (this.timers.has(name)) {
            return false; // Timer already exists
        }

        try {
            const timer: Timer = {
                name,
                message,
                interval: validInterval,
                enabled: true
            };

            this.timers.set(name, timer);
            this.startTimer(timer);
            await this.saveTimers();
            this.broadcastTimers();
            return true;
        } catch (error) {
            console.error('Error adding timer:', error);
            return false;
        }
    }

    public async removeTimer(name: string): Promise<boolean> {
        try {
            this.stopTimer(name);
            const deleted = this.timers.delete(name);
            if (deleted) {
                await this.saveTimers();
                this.broadcastTimers();
            }
            return deleted;
        } catch (error) {
            console.error('Error removing timer:', error);
            return false;
        }
    }

    public async toggleTimer(name: string): Promise<boolean> {
        const timer = this.timers.get(name);
        if (!timer) return false;

        try {
            timer.enabled = !timer.enabled;
            if (timer.enabled) {
                this.startTimer(timer);
            } else {
                this.stopTimer(name);
            }
            await this.saveTimers();
            this.broadcastTimers();
            return true;
        } catch (error) {
            console.error('Error toggling timer:', error);
            return false;
        }
    }

    public async updateTimer(name: string, message: string, interval: number): Promise<boolean> {
        const timer = this.timers.get(name);
        if (!timer) return false;

        // Validate interval: minimum 1 minute, maximum 1440 minutes (24 hours)
        const validInterval = Math.max(1, Math.min(1440, Math.floor(interval)));

        try {
            timer.message = message;
            timer.interval = validInterval;

            if (timer.enabled) {
                // Restart to apply new interval
                this.startTimer(timer);
            }

            await this.saveTimers();
            this.broadcastTimers();
            return true;
        } catch (error) {
            console.error('Error updating timer:', error);
            return false;
        }
    }

    private broadcastTimers(): void {
        const timers: Record<string, Timer> = {};
        for (const [n, t] of this.timers.entries()) {
            timers[n] = t;
        }
        server.publish('commands', JSON.stringify({ type: 'allTimers', timers }));
    }
}