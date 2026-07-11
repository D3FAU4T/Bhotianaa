declare global {
    namespace NodeJS {
        interface ProcessEnv {
            
            // Production
            NODE_ENV: 'development' | 'production';
            PORT: string;
            CSRF_SECRET: string;

            TWITCH_CLIENT_ID: string;
            TWITCH_CLIENT_SECRET: string;

            BROADCASTER_USER_ID: string;
            BOT_USER_ID: string;

            DISCORD_WEBHOOK_URL: string;

            // Spotify
            SPOTIFY_CLIENT_ID: string;
            SPOTIFY_CLIENT_SECRET: string;

            // Dev only
            DEV_CHANNEL?: string;
        }
    }
}

export {};