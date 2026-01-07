import path from 'node:path';
import { serve } from 'bun';
import type { TwitchAuth } from './src/Typings/TwitchAPI';
import type { whoamiData } from './src/Typings/Bhotianaa';
import {
    handleAuth,
    handleAuthCallback,
    handleAuthRegister,
    handleAuthValidate,
    handleClips,
    handleDefine,
    handleShoutout,
    handleTwitchAnnouncements,
    handleTwitchChannelsGet,
    handleTwitchChannelsPatch,
    handleTwitchGames,
    handleTwitchUsers,
    handleUptime,
    handleWhoami
} from './src/Core/RouteFunctions';

import dashboardView from './src/Views/dashboard.html';
import clipsView from './src/Views/clips.html';
import { fetchStreamInfo } from './src/Core/Functions';

const tokenFile = Bun.file(path.resolve('src', 'Config', 'tokens.json'));

let twitchClient: InstanceType<typeof import('./src/Core/Client').default> | null = null;

export const server = serve({
    port: Bun.env.PORT,
    development: Bun.env.NODE_ENV === 'development',
    routes: {
        '/': dashboardView,
        '/auth/:authtype': handleAuth,
        '/auth/callback': handleAuthCallback,
        '/auth/register': handleAuthRegister,
        '/auth/validate': handleAuthValidate,
        "/define/:word": handleDefine,
        "/whoami": handleWhoami,
        "/twitch/users": handleTwitchUsers,
        "/twitch/shoutout": handleShoutout,
        "/twitch/channels": {
            GET: handleTwitchChannelsGet,
            PATCH: handleTwitchChannelsPatch
        },
        "/twitch/games": handleTwitchGames,
        "/twitch/announcements": handleTwitchAnnouncements,
        "/uptime/:channel": handleUptime,
        "/clips/:channel": handleClips,
        "/clips": clipsView
    },

    websocket: {
        data: {} as { room: 'clips' | 'chat' | 'commands', heartbeatInterval?: Timer },
        async open(ws) {
            if (ws.data.room === 'chat')
                ws.subscribe('chat');
            else if (ws.data.room === 'commands') {
                ws.subscribe('commands');
                // Send stream info on connection
                const streamInfo = await fetchStreamInfo();
                ws.send(JSON.stringify({ type: 'streamInfo', data: streamInfo }));
            }
            else
                ws.subscribe('clips');

            // Start heartbeat
            ws.data.heartbeatInterval = setInterval(
                () => ws.send('6'),
                30000
            );
        },
        async message(ws, message) {
            const messageStr = message.toString();

            // Handle heartbeat
            if (messageStr === '9') return;

            const data = JSON.parse(messageStr);

            if (ws.data.room === 'chat') {
                if (twitchClient && data.message) {
                    const channel = Bun.env.TWITCH_CHANNEL;
                    twitchClient.twitch.say(channel, data.message);
                }
            }

            else if (ws.data.room === 'commands') {
                if (!twitchClient) {
                    ws.send(JSON.stringify({ error: 'Bot not connected' }));
                    return;
                }

                if (data.action === 'getAll') {
                    const commands: Record<string, any> = {};
                    for (const [name, command] of twitchClient.dynamicCommands.entries())
                        commands[name] = command;

                    ws.send(JSON.stringify({ type: 'allCommands', commands }));
                }

                else if (data.action === 'create') {
                    const { name, response, createdBy } = data;
                    const success = await twitchClient.addDynamicCommand(name, response, createdBy);
                    if (success) {
                        const commands: Record<string, any> = {};
                        for (const [n, command] of twitchClient.dynamicCommands.entries())
                            commands[n] = command;

                        server.publish('commands', JSON.stringify({ type: 'allCommands', commands }));
                    }

                    else ws.send(JSON.stringify({ error: 'Command already exists' }));
                }

                else if (data.action === 'delete') {
                    const { name } = data;
                    const success = await twitchClient.removeDynamicCommand(name);
                    if (success) {
                        const commands: Record<string, any> = {};
                        for (const [n, command] of twitchClient.dynamicCommands.entries())
                            commands[n] = command;
                        server.publish('commands', JSON.stringify({ type: 'allCommands', commands }));
                    }

                    else ws.send(JSON.stringify({ error: 'Command not found' }));
                }

                else if (data.action === 'update') {
                    const { name, response } = data;
                    const success = await twitchClient.updateDynamicCommand(name, response);
                    if (success) {
                        const commands: Record<string, any> = {};
                        for (const [n, command] of twitchClient.dynamicCommands.entries())
                            commands[n] = command;
                        server.publish('commands', JSON.stringify({ type: 'allCommands', commands }));
                    }

                    else ws.send(JSON.stringify({ error: 'Command not found' }));
                }

                else if (data.action === 'getSystemCommands') {
                    const commands: Record<string, any> = {};
                    for (const [name, command] of twitchClient.commands.entries()) {
                        commands[name] = {
                            name: command.name,
                            description: command.description,
                            aliases: command.aliases || [],
                            moderatorOnly: command.moderatorOnly || false
                        };
                    }
                    ws.send(JSON.stringify({ type: 'systemCommands', commands }));
                }

                else if (data.action === 'getAllTimers') {
                    const timers: Record<string, any> = {};
                    for (const [name, timer] of twitchClient.timers.entries())
                        timers[name] = timer;
                    ws.send(JSON.stringify({ type: 'allTimers', timers }));
                }

                else if (data.action === 'createTimer') {
                    const { name, message, interval } = data;
                    const success = await twitchClient.addTimer(name, message, parseInt(interval));
                    if (!success) {
                        ws.send(JSON.stringify({ error: 'Failed to create timer' }));
                    }
                }

                else if (data.action === 'deleteTimer') {
                    const { name } = data;
                    const success = await twitchClient.removeTimer(name);
                    if (!success) {
                        ws.send(JSON.stringify({ error: 'Failed to delete timer' }));
                    }
                }

                else if (data.action === 'updateTimer') {
                    const { name, message, interval } = data;
                    const success = await twitchClient.updateTimer(name, message, parseInt(interval));
                    if (!success) {
                        ws.send(JSON.stringify({ error: 'Failed to update timer' }));
                    }
                }

                else if (data.action === 'toggleTimer') {
                    const { name } = data;
                    const success = await twitchClient.toggleTimer(name);
                    if (!success) {
                        ws.send(JSON.stringify({ error: 'Failed to toggle timer' }));
                    }
                }
            }
        },
        close(ws, code, reason) {
            // Clear heartbeat interval
            if (ws.data.heartbeatInterval)
                clearInterval(ws.data.heartbeatInterval);

            if (ws.data.room === 'chat')
                ws.unsubscribe('chat');
            else if (ws.data.room === 'commands')
                ws.unsubscribe('commands');
            else
                ws.unsubscribe('clips');
        }
    },

    fetch(req, server) {
        const url = new URL(req.url);

        // Handle WebSocket upgrades
        if (url.pathname === '/socket/clips') {
            if (server.upgrade(req, { data: { room: 'clips' } })) return;
            else return new Response('Upgrade Required', { status: 426 });
        }

        else if (url.pathname === '/socket/chat') {
            if (server.upgrade(req, { data: { room: 'chat' } })) return;
            else return new Response('Upgrade Required', { status: 426 });
        }

        else if (url.pathname === '/socket/commands') {
            if (server.upgrade(req, { data: { room: 'commands' } })) return;
            else return new Response('Upgrade Required', { status: 426 });
        }

        return new Response('Not Found', { status: 404 });
    },

    // Global error handler - handles all uncaught errors from routes
    error(error) {
        console.error('Server error:', error);

        return Response.json({
            error: "Internal Server Error",
            message: Bun.env.NODE_ENV === 'development' ? error.message : "Something went wrong"
        }, {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
});

console.log(`Local server running on ${server.url}\nTo terminate the app, press Ctrl+C\n`);

if (!await tokenFile.exists() || !(await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>).app)
    console.warn(`⚠️  No app tokens found. Please authenticate first by visiting ${server.url}auth/app ❗ USING BOT ACCOUNT ❗`);

else {
    let tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (!tokens.broadcaster) {
        console.warn(`⚠️  No broadcaster tokens found. Please authenticate first by visiting ${server.url}auth/broadcaster ❗ USING BROADCASTER ACCOUNT ❗`);
    }

    else {
        const whoamiFile = Bun.file(path.resolve('src', 'Config', 'whoami.json'));

        await fetch(server.url + 'auth/validate');

        // Refresh whoami data to ensure we have the latest user info
        await fetch(server.url + '/whoami');

        // Read the updated tokens after validation
        tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

        // Get the app user's login name for the bot
        const whoamiData = await whoamiFile.json() as whoamiData;
        const botUsername = whoamiData.app.login;

        setInterval(() => fetch(server.url + '/auth/validate'), 3600000); // Validate tokens every hour
        twitchClient = new (await import('./src/Core/Client')).default(tokens.app!.access_token, botUsername);
        await twitchClient.connect();
    }
}