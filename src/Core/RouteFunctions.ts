import path from 'node:path';
import { CSRF, type BunRequest } from 'bun';
import { Auth } from 'twitch';
import { EventEmitter } from 'node:events';
import type { TwitchAuth } from '../Typings/TwitchAPI';

export const events = new EventEmitter();

const getTokenFile = () => Bun.file(path.resolve('src', 'Config', 'tokens.json'));

export interface TokenStore {
    broadcaster: (TwitchAuth & { user_id?: string }) | null;
    bot: (TwitchAuth & { user_id?: string }) | null;
    app: string | null;
    conduit_id?: string;
}

const normalizeTokens = (value: unknown): TokenStore => {
    const obj = (value && typeof value === 'object') ? (value as Record<string, unknown>) : {};
    return {
        broadcaster: (obj.broadcaster as TokenStore['broadcaster']) ?? null,
        bot: (obj.bot as TokenStore['bot']) ?? null,
        app: (obj.app as TokenStore['app']) ?? null,
        conduit_id: (obj.conduit_id as string) || undefined
    };
};

export const readTokensSafe = async (): Promise<TokenStore> => {
    const file = getTokenFile();
    if (!await file.exists()) return { broadcaster: null, bot: null, app: null };
    try {
        const text = (await file.text()).trim();
        if (!text) return { broadcaster: null, bot: null, app: null };
        const data = JSON.parse(text);
        return normalizeTokens(data);
    } catch (e) {
        console.error('Error reading tokens file:', e);
        return { broadcaster: null, bot: null, app: null };
    }
};

const saveTokens = async (tokens: TokenStore) => {
    const file = getTokenFile();
    await Bun.write(file, JSON.stringify(tokens, null, 4));
};

// -- Authentication Routes --

export const handleLogin = async (req: BunRequest<'/auth/login/:type'>) => {
    const { type } = req.params;
    if (type !== 'broadcaster' && type !== 'bot') {
        return new Response('Invalid login type. Use /auth/login/broadcaster or /auth/login/bot', { status: 400 });
    }

    if (!Bun.env.TWITCH_CLIENT_ID || !Bun.env.CSRF_SECRET) {
        return new Response('Missing environment variables', { status: 500 });
    }

    const state = CSRF.generate(Bun.env.CSRF_SECRET);

    const scopesFile = await Bun.file(path.resolve('src', 'Config', 'scopes.json')).json() as { broadcaster: string[], app: string[] };
    const scopeList = type === 'broadcaster' ? scopesFile.broadcaster : scopesFile.app;

    const params = new URLSearchParams({
        client_id: Bun.env.TWITCH_CLIENT_ID,
        redirect_uri: new URL('/auth/callback', req.url).toString(),
        response_type: 'code',
        scope: scopeList.join(' '),
        state
    });

    const headers = new Headers();
    headers.append('Set-Cookie', `auth_type=${type}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    headers.append('Location', `https://id.twitch.tv/oauth2/authorize?${params.toString()}`);

    return new Response(null, { status: 302, headers });
};

export const handleDisconnect = async (req: BunRequest<'/auth/disconnect/:type'>) => {
    const { type } = req.params;
    if (type !== 'broadcaster' && type !== 'bot') {
        return new Response('Invalid disconnect type. Use /auth/disconnect/broadcaster or /auth/disconnect/bot', { status: 400 });
    }

    const tokens = await readTokensSafe();
    tokens[type] = null;
    await saveTokens(tokens);

    events.emit('auth:update'); // Notify app to reload

    return new Response(`${type === 'broadcaster' ? 'Broadcaster' : 'Bot'} disconnected successfully.`);
};

export const handleCallback = async (req: BunRequest<'/auth/callback'>) => {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const type = req.cookies.get('auth_type') as 'broadcaster' | 'bot' | undefined;

    if (!code) return new Response('No code provided', { status: 400 });
    if (!type || (type !== 'broadcaster' && type !== 'bot')) return new Response('Invalid or expired session (missing auth_type cookie)', { status: 400 });

    const redirectUri = new URL('/auth/callback', req.url).toString();

    const tokenResponse = await Auth.authorizationCodeGrantFlow({
        clientId: Bun.env.TWITCH_CLIENT_ID!,
        clientSecret: Bun.env.TWITCH_CLIENT_SECRET!,
        code,
        redirectUri
    });

    if ('error' in tokenResponse) {
        return Response.json(tokenResponse, { status: 400 });
    }

    const tokens = tokenResponse as TwitchAuth;
    const currentTokens = await readTokensSafe();

    const validation = await Auth.validate(tokens.access_token);
    if (validation && validation.user_id) {
        currentTokens[type] = { ...tokens, user_id: validation.user_id };
    } else {
        currentTokens[type] = { ...tokens };
    }

    await saveTokens(currentTokens);

    events.emit('auth:update');

    return Response.redirect('/');
};
