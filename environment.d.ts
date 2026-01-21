declare global {
    namespace NodeJS {
        interface ProcessEnv {
            
            // Production
            NODE_ENV: 'development' | 'production';
            PORT: string;
            CSRF_SECRET: string;
            TWITCH_CLIENT_ID: string;
            TWITCH_CLIENT_SECRET: string;
            DISCORD_WEBHOOK_URL: string;

            // Dev only
            DEV_CHANNEL?: string;
        }
    }
}

export {};