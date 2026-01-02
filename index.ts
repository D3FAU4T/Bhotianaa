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
    handleRoot,
    handleShoutout,
    handleTwitchAnnouncements,
    handleTwitchChannelsGet,
    handleTwitchChannelsPatch,
    handleTwitchGames,
    handleTwitchUsers,
    handleUptime,
    handleWhoami
} from './src/Core/RouteFunctions';

const tokenFile = Bun.file(path.resolve('src', 'Config', 'tokens.json'));

export const server = serve({
    port: Bun.env.PORT,
    development: Bun.env.NODE_ENV === 'development',
    routes: {
        '/': handleRoot,

        // Initial authentication route <app | broadcaster>
        '/auth/:authtype': handleAuth,

        // Twitch OAuth callback handler
        '/auth/callback': handleAuthCallback,

        // Register OAuth code as tokens or Refresh existing tokens
        '/auth/register': handleAuthRegister,

        '/auth/validate': handleAuthValidate,

        // Dictionary API Routes
        "/define/:word": handleDefine,

        // Self user data
        "/whoami": handleWhoami,

        // Get Twitch Users Information
        "/twitch/users": handleTwitchUsers,

        "/twitch/shoutout": handleShoutout,

        "/twitch/channels": {
            // Get Twitch Channel Information
            GET: handleTwitchChannelsGet,

            // Update Twitch Channel Information
            PATCH: handleTwitchChannelsPatch
        },

        // Get Twitch Game Information
        "/twitch/games": handleTwitchGames,

        "/twitch/announcements": handleTwitchAnnouncements,

        // External API Routes
        "/uptime/:channel": handleUptime,

        "/clips/:channel": handleClips
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
        const twitchClient = new (await import('./src/Core/Client')).default(tokens.app!.access_token, botUsername);
        await twitchClient.connect();
    }
}