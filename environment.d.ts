declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production';
            PORT: string;
            CSRF_SECRET: string;
            TWITCH_CLIENT_ID: string;
            TWITCH_CLIENT_SECRET: string;
            TWITCH_USERNAME: string;
            TWITCH_AUTH_URL: string;
            TWITCH_CHANNEL: string;
            TWITCH_CHANNEL_ID: string;
            DISCORD_WEBHOOK_URL: string;
        }
    }
}

export {};