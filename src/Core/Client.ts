import EventSubWebSocket from './EventSubWebSocket';
import TwitchAPI from './TwitchAPI';
import { server } from '../..';
import type { ChatUserstate } from '../Typings/EventSub.d';
import type { BotState, ICommand, DynamicCommand, Timer } from '../Typings/Bhotianaa';
import type { ChatMessageEvent, EventSubNotification } from '../Typings/EventSub.d';

export default class {
    public eventSub: EventSubWebSocket;
    public twitch: TwitchAPI;
    public commands: Map<string, ICommand>;
    public dynamicCommands: Map<string, DynamicCommand>;
    public timers: Map<string, Timer>;
    private runningTimers: Map<string, ReturnType<typeof setInterval>>;
    public state: BotState;
    private _broadcasterUserId: string;
    private _botUserId: string;

    public get broadcasterId(): string {
        return this._broadcasterUserId;
    }

    public get botId(): string {
        return this._botUserId;
    }

    constructor(broadcasterUserId: string, botUserId: string) {
        this._broadcasterUserId = broadcasterUserId;
        this._botUserId = botUserId;

        this.eventSub = new EventSubWebSocket();
        this.twitch = new TwitchAPI(broadcasterUserId, botUserId);

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
    }

    private setupEventHandlers(): void {
        this.eventSub.on('channel.chat.message', async (notification: EventSubNotification) => {
            const event = notification.event as ChatMessageEvent;
            const channel = `#${event.broadcaster_user_login}`;
            const message = event.message.text;
            const userstate = this.createUserstate(event);

            server.publish('chat', JSON.stringify({ channel, userstate, message }));

            if (event.chatter_user_id === this._botUserId || message.startsWith('/')) return;

            const msg = message.toLowerCase();

            // Handle big word tracking
            if (this.state.bigWordActive) {
                this.state.bigWordMessageCount++;
                if (this.state.bigWordMessageCount === 7) {
                    this.state.bigWord ? await this.twitch.say(this.state.bigWord) : null;
                    this.state.bigWordMessageCount = 0;
                }
            }

            // Handle commands
            if (msg.startsWith('!'))
                return await this.handleCommand(channel, userstate, message);

            // Handle special messages - BW end trigger
            if (msg === ']') {
                this.unsetBigWord();
                await this.twitch.say('Big Word trigger removed PepeHands');
                return;
            }

            if (msg.includes('bhotiana'))
                return await this.twitch.say(`@${userstate.user_login} What!? 👀`);

            // Handle message ending with ',' (repeat without comma)
            if (msg.endsWith(',')) {
                const msgToRepeat = msg.slice(0, -1);
                if (msgToRepeat.length)
                    await this.twitch.say(msgToRepeat);
            }
        });

        // Handle Channel Points Redemptions
        this.eventSub.on('channel.channel_points_custom_reward_redemption.add', (notification) => {
            console.log('💎 Channel Point Redemption:', JSON.stringify(notification.event, null, 2));
        });
    }

    private createUserstate(event: ChatMessageEvent): ChatUserstate {
        const isModerator = event.badges.some(b => b.set_id === 'moderator' || b.set_id === 'broadcaster');
        const isSubscriber = event.badges.some(b => b.set_id === 'subscriber');
        const isBroadcaster = event.badges.some(b => b.set_id === 'broadcaster');

        return {
            user_id: event.chatter_user_id,
            user_login: event.chatter_user_login,
            user_name: event.chatter_user_name,
            color: event.color,
            badges: event.badges,
            isModerator,
            isSubscriber,
            isBroadcaster
        };
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
            if (command.moderatorOnly && !this.hasModPermissions(userstate))
                return;

            if (command.streamerOnly && Bun.env.DEV_CHANNEL) {
                await this.twitch.say(`@${userstate.user_name} ⚠️ This command is disabled in Developer Mode.`);
                return;
            }

            try {
                await command.execute({ channel, userstate, message, args }, this);
            }

            catch (error) {
                console.error(`Error executing command ${commandName}:`, error);

                if (error instanceof Error) {
                    if (Bun.env.NODE_ENV === 'development')
                        await this.twitch.say(`[DEV ERROR]: ${commandName} - ${error.message}`);
                    else
                        await this.twitch.say(`[ERROR]: Command ${commandName} failed to execute.`);
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

    public hasModPermissions(userstate: ChatUserstate): boolean {
        return userstate.isModerator || userstate.isBroadcaster;
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

            await this.eventSub.connect();
            this.setupEventHandlers();
            await this.subscribeToEvents();

            console.log('🤖 Bot connected to Twitch EventSub!');
        }

        catch (error) {
            console.error('🔥 Failed to connect bot:', error);
            throw error;
        }
    }

    private async subscribeToEvents(): Promise<void> {
        const sessionId = this.eventSub.getSessionId();
        if (!sessionId) {
            throw new Error('No EventSub session ID available');
        }

        try {
            // Updated: Assign this session to the Conduit first
            const conduitResponse = await fetch(`${server.url}api/conduit/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });

            if (!conduitResponse.ok) {
                const errText = await conduitResponse.text();
                console.error('Failed to update conduit shard:', errText);
                throw new Error(`Conduit Update Failed: ${errText}`);
            }

            console.log('🔗 Conduit Shard Assigned. Subscribing using Conduit...');

            let subscriptionBroadcasterId = this._broadcasterUserId;

            if (Bun.env.DEV_CHANNEL) {
                try {
                    const { readTokensSafe } = await import('./RouteFunctions');
                    const tokens = await readTokensSafe();
                    if (tokens.app?.access_token) {
                        const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${Bun.env.DEV_CHANNEL}`, {
                            headers: {
                                'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
                                'Authorization': `Bearer ${tokens.app.access_token}`
                            }
                        });
                        if (userRes.ok) {
                            const userData = await userRes.json() as { data: { id: string }[] };
                            if (userData.data?.[0]?.id) {
                                subscriptionBroadcasterId = userData.data[0].id;
                                // CRITICAL: Update the client's broadcaster ID and re-instantiate TwitchAPI
                                // This ensures replies and frontend widgets target the DEV_CHANNEL
                                this._broadcasterUserId = subscriptionBroadcasterId;
                                this.twitch = new TwitchAPI(this._broadcasterUserId, this._botUserId);
                                console.log(`🔧 DEVELOPER MODE: Subscribing to chat of ${Bun.env.DEV_CHANNEL} (ID: ${subscriptionBroadcasterId})`);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Check Dev Channel Error:', e);
                }
            }

            const response = await fetch(`${server.url}api/eventsub/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'channel.chat.message',
                    version: '1',
                    condition: {
                        broadcaster_user_id: subscriptionBroadcasterId,
                        user_id: this._botUserId
                    }
                })
            });

            if (!response.ok) {
                if (response.status === 409)
                    console.log('✅ Subscription already exists (Conduit persistent)');

                else {
                    let errorDetails;
                    try { errorDetails = await response.json() }
                    catch { errorDetails = await response.text() }
                    console.error('Failed to subscribe to channel.chat.message:', errorDetails);
                }
            }

            else console.log('✅ Subscribed to channel.chat.message');

            // Subscribe to Channel Points Redemptions
            console.log('🔗 Subscribing to channel.channel_points_custom_reward_redemption.add...');
            const redemptionResponse = await fetch(`${server.url}api/eventsub/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'channel.channel_points_custom_reward_redemption.add',
                    version: '1',
                    condition: {
                        broadcaster_user_id: subscriptionBroadcasterId
                        // bot not needed in condition for this event type
                    }
                })
            });

            if (!redemptionResponse.ok) {
                if (redemptionResponse.status === 409)
                    console.log('✅ Subscription (Redemptions) already exists');

                else {
                    let text = await redemptionResponse.text();
                    console.error('Failed to subscribe to Redemptions:', text);
                }
            }

            else console.log('✅ Subscribed to channel.channel_points_custom_reward_redemption.add');
        }

        catch (error) {
            console.error('Error subscribing to events:', error);
            // Critical: Close the socket to prevent infinite reconnect loop if subscription fails
            this.eventSub.close();
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

        response = response.replace(/\{user\}/g, userstate.user_login);
        response = response.replace(/\{channel\}/g, channel.slice(1));

        // If args are provided, replace {1}, {2}, etc.
        args.forEach((arg, index) => {
            response = response.replace(new RegExp(`\\{${index + 1}\\}`, 'g'), arg);
        });

        await this.twitch.say(response);
    }

    public async loadDynamicCommands(): Promise<void> {
        try {
            const dynamicCommandsFile = Bun.file('./src/Config/dynamic-commands.json');

            if (await dynamicCommandsFile.exists()) {
                const commandsData = await dynamicCommandsFile.json() as Record<string, DynamicCommand>;

                for (const [name, command] of Object.entries(commandsData))
                    this.dynamicCommands.set(name, command);

                console.log(`📝 Loaded ${this.dynamicCommands.size} dynamic commands`);
            }

            else console.log('📝 No dynamic-commands.json found, starting with 0 dynamic commands');
        }

        catch (error) {
            console.warn('Could not load dynamic commands:', error);
        }
    }

    public async saveDynamicCommands(): Promise<void> {
        try {
            const commandsData: Record<string, DynamicCommand> = {};

            for (const [name, command] of this.dynamicCommands.entries())
                commandsData[name] = command;

            await Bun.write('./src/Config/dynamic-commands.json', JSON.stringify(commandsData, null, 2));
        }

        catch (error) {
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
            for (const [n, cmd] of this.dynamicCommands.entries())
                commands[n] = cmd;

            server.publish('commands', JSON.stringify({ type: 'allCommands', commands }));

            return true;
        }

        catch (error) {
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
            for (const [n, cmd] of this.dynamicCommands.entries())
                commands[n] = cmd;

            server.publish('commands', JSON.stringify({ type: 'allCommands', commands }));

            return true;
        }

        catch (error) {
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
            for (const [n, cmd] of this.dynamicCommands.entries())
                commands[n] = cmd;

            server.publish('commands', JSON.stringify({ type: 'allCommands', commands }));

            return true;
        }

        catch (error) {
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
                    if (timer.enabled)
                        this.startTimer(timer);
                }

                console.log(`⏱️ Loaded ${this.timers.size} timers`);
            }

            else console.log('⏱️ No timers.json found, starting with 0 timers');
        }

        catch (error) {
            console.warn('Could not load timers:', error);
        }
    }

    public async saveTimers(): Promise<void> {
        try {
            const timersData: Record<string, Timer> = {};

            for (const [name, timer] of this.timers.entries())
                timersData[name] = timer;

            await Bun.write('./src/Config/timers.json', JSON.stringify(timersData, null, 2));
        }

        catch (error) {
            console.error('Could not save timers:', error);
            throw error;
        }
    }

    private startTimer(timer: Timer): void {
        this.stopTimer(timer.name);

        const intervalMs = timer.interval * 60 * 1000;
        const intervalId = setInterval(() => {
            this.twitch.say(timer.message);
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

        if (this.timers.has(name))
            return false;

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
        }

        catch (error) {
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
        }

        catch (error) {
            console.error('Error removing timer:', error);
            return false;
        }
    }

    public async toggleTimer(name: string): Promise<boolean> {
        const timer = this.timers.get(name);
        if (!timer) return false;

        try {
            timer.enabled = !timer.enabled;
            if (timer.enabled)
                this.startTimer(timer);

            else
                this.stopTimer(name);

            await this.saveTimers();
            this.broadcastTimers();
            return true;
        }

        catch (error) {
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

            if (timer.enabled)
                this.startTimer(timer);

            await this.saveTimers();
            this.broadcastTimers();
            return true;
        }

        catch (error) {
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

    public stop(): void {
        console.log('🛑 Stopping bot instance...');

        // Stop all timers
        for (const [name, interval] of this.runningTimers) {
            clearInterval(interval);
        }
        this.runningTimers.clear();

        // Close EventSub connection
        if (this.eventSub) {
            this.eventSub.close();
        }
    }
}