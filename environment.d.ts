declare global {
    namespace NodeJS {
        interface ProcessEnv {
            password: string;
            OD_ID: string;
            OD_KEY: string;
            clientId: string;
            auth: string;
        }
    }
}

export {};