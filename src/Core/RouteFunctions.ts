import path from 'node:path';
import { CSRF, type BunRequest } from 'bun';
import type { TwitchAuth, TwitchGame, TwitchUser } from '../Typings/TwitchAPI';

const getTokenFile = () => Bun.file(path.resolve('src', 'Config', 'tokens.json'));

export interface TokenStore {
    broadcaster: (TwitchAuth & { user_id?: string }) | null;
    bot: (TwitchAuth & { user_id?: string }) | null;
    app: TwitchAuth | null;
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
        // console.log('📖 Read tokens:', JSON.stringify(data, null, 0)); // Debug logging
        return normalizeTokens(data);
    } catch (e) {
        console.error('Error reading tokens file:', e);
        return { broadcaster: null, bot: null, app: null }; // Should we return nulls or throw? returning nulls wipes data if we save later.
    }
};

const saveTokens = async (tokens: TokenStore) => {
    const file = getTokenFile();
    // console.log('💾 Saving tokens:', JSON.stringify(tokens, null, 0)); // Debug logging
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
    const scopeList = type === 'broadcaster' ? scopesFile.broadcaster : scopesFile.app; // 'app' in scopes.json seems to be for bot user

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

export const handleCallback = async (req: BunRequest<'/auth/callback'>) => {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const type = req.cookies.get('auth_type') as 'broadcaster' | 'bot' | undefined;

    if (!code) return new Response('No code provided', { status: 400 });
    if (!type || (type !== 'broadcaster' && type !== 'bot')) return new Response('Invalid or expired session (missing auth_type cookie)', { status: 400 });

    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: Bun.env.TWITCH_CLIENT_ID!,
            client_secret: Bun.env.TWITCH_CLIENT_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: new URL('/auth/callback', req.url).toString()
        })
    });

    if (!tokenResponse.ok) {
        return Response.json(await tokenResponse.json(), { status: tokenResponse.status });
    }

    const tokens = await tokenResponse.json() as TwitchAuth;
    // Re-read tokens immediately before saving to avoid overwriting recent changes
    const currentTokens = await readTokensSafe();

    // Fetch User ID
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.access_token}`
        }
    });

    if (userResponse.ok) {
        const userData = await userResponse.json() as { data: TwitchUser[] };
        if (userData.data.length > 0) {
            currentTokens[type] = { ...tokens, user_id: userData.data[0]?.id };
        } else {
            currentTokens[type] = { ...tokens };
        }
    } else {
        currentTokens[type] = { ...tokens };
    }

    await saveTokens(currentTokens);
    return new Response(`${type === 'broadcaster' ? 'Broadcaster' : 'Bot'} authentication successful! You can close this window.`);
};

export const getAppToken = async (): Promise<TwitchAuth | null> => {
    const tokens = await readTokensSafe();

    // Check if valid
    if (tokens.app?.access_token) {
        const validate = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: { 'Authorization': `Bearer ${tokens.app.access_token}` }
        });
        if (validate.ok) return tokens.app;
    }

    // Generate new
    console.log('🔄 Generating new App Token...');
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: Bun.env.TWITCH_CLIENT_ID!,
            client_secret: Bun.env.TWITCH_CLIENT_SECRET!,
            grant_type: 'client_credentials'
        })
    });

    if (!response.ok) {
        console.error('Failed to generate App Token:', await response.text());
        return null;
    }

    const newTokens = await response.json() as TwitchAuth;
    // Read fresh to avoid overwrite
    const freshTokens = await readTokensSafe();
    freshTokens.app = newTokens;
    await saveTokens(freshTokens);
    return newTokens;
};

// -- Conduit Helpers --

export const getConduit = async (): Promise<string | null> => {
    const tokens = await readTokensSafe();
    if (tokens.conduit_id) return tokens.conduit_id;

    const appToken = await getAppToken();
    if (!appToken) return null;

    console.log('🌐 Creating Twitch Conduit...');
    const response = await fetch('https://api.twitch.tv/helix/eventsub/conduits', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${appToken.access_token}`,
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shard_count: 1 })
    });

    if (!response.ok) {
        console.error('Failed to create conduit:', await response.text());
        return null;
    }

    const data = await response.json() as { data: { id: string }[] };
    const conduitId = data.data[0]!.id;

    const freshTokens = await readTokensSafe();
    freshTokens.conduit_id = conduitId;
    await saveTokens(freshTokens);

    return conduitId;
};

export const updateConduitShard = async (req: BunRequest<'/api/conduit/update'>) => {
    const { session_id } = await req.json() as { session_id: string };
    if (!session_id) return new Response('Missing session_id', { status: 400 });

    const conduitId = await getConduit();
    if (!conduitId) return new Response('Failed to get/create conduit', { status: 500 });

    const appToken = await getAppToken();
    if (!appToken) return new Response('No App Token', { status: 500 });

    console.log(`🔗 Assigning Shard 0 to Session: ${session_id}`);
    const response = await fetch('https://api.twitch.tv/helix/eventsub/conduits/shards', {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${appToken.access_token}`,
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            conduit_id: conduitId,
            shards: [{
                id: "0",
                transport: {
                    method: 'websocket',
                    session_id: session_id
                }
            }]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        console.error('Failed to update conduit shard:', err);
        return new Response(err, { status: response.status });
    }

    return new Response('Conduit Shard Updated');
};


export const handleValidate = async (req: BunRequest<'/auth/validate'>) => {
    // Read tokens fresh
    const tokens = await readTokensSafe();
    let changed = false;

    const refreshUserToken = async (type: 'broadcaster' | 'bot') => {
        const t = tokens[type];
        if (!t) return;

        const validate = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: { 'Authorization': `Bearer ${t.access_token}` }
        });

        if (!validate.ok) {
            console.log(`🔄 Refreshing ${type} Token...`);
            const refresh = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: Bun.env.TWITCH_CLIENT_ID!,
                    client_secret: Bun.env.TWITCH_CLIENT_SECRET!,
                    refresh_token: t.refresh_token,
                    grant_type: 'refresh_token'
                })
            });

            if (refresh.ok) {
                const refreshed = await refresh.json() as TwitchAuth;
                // Re-read fresh tokens before updating in case of mutations elsewhere
                const fresh = await readTokensSafe();
                if (fresh[type]) {
                    fresh[type] = { ...fresh[type]!, ...refreshed }; // Preserve user_id
                    tokens[type] = fresh[type]; // Update local ref too
                    changed = true;
                }
            } else {
                console.error(`Failed to refresh ${type} token`);
            }
        }
    };

    await refreshUserToken('broadcaster');
    await refreshUserToken('bot');

    // App Token check
    if (!tokens.app) {
        await getAppToken(); // handling save internally
        // re-read strictly not needed if object ref matches but better safe
    } else {
        const validate = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: { 'Authorization': `Bearer ${tokens.app.access_token}` }
        });
        if (!validate.ok) {
            await getAppToken();
        }
    }

    if (changed) await saveTokens(tokens);

    return Response.json(await readTokensSafe());
};

// -- Other Routes --

export const handleDefine = async (req: BunRequest<'/define/:word'>) => {
    const { word } = req.params;
    if (!word) return new Response('Word required', { status: 400 });
    return Response.redirect(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
};

export const handleWhoami = async () => {
    const tokens = await readTokensSafe();
    return Response.json({
        broadcaster: tokens.broadcaster ? { id: tokens.broadcaster.user_id, login: 'fetched_via_api_if_cached' } : null,
        bot: tokens.bot ? { id: tokens.bot.user_id } : null,
        app: tokens.app ? { generated: true } : null
    });
};

export const handleTwitchUsers = async (req: BunRequest<'/twitch/users'>) => {
    const tokens = await readTokensSafe();
    if (!tokens.broadcaster?.access_token) return new Response('Unauthorized', { status: 401 });
    const url = new URL(req.url);
    return fetch(`https://api.twitch.tv/helix/users?${url.searchParams}`, {
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.broadcaster.access_token}`
        }
    });
};

export const handleShoutout = async (req: BunRequest<"/twitch/shoutout">) => {
    const url = new URL(req.url);
    const toId = url.searchParams.get("to_id");
    const tokens = await readTokensSafe();

    // Need Broadcaster ID (from channel) and Bot Token (moderator action)
    if (!toId || !tokens.broadcaster?.user_id || !tokens.bot?.access_token || !tokens.bot?.user_id) {
        return new Response('Invalid request or unauthorized', { status: 400 });
    }

    // Shoutout requires Moderator token. We use the Bot's token.
    return fetch(
        `https://api.twitch.tv/helix/chat/shoutouts?from_broadcaster_id=${tokens.broadcaster.user_id}&to_broadcaster_id=${toId}&moderator_id=${tokens.bot.user_id}`, {
        method: "POST",
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.bot.access_token}`,
            'Content-Type': 'application/json'
        },
    });
};

export const handleTwitchChannelsGet = async (req: BunRequest<'/twitch/channels'>) => {
    const tokens = await readTokensSafe();
    if (!tokens.broadcaster?.access_token) return new Response('Unauthorized', { status: 401 });

    const url = new URL(req.url);
    return fetch(`https://api.twitch.tv/helix/channels?${url.searchParams}`, {
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.broadcaster.access_token}`
        }
    });
};

export const handleTwitchChannelsPatch = async (req: BunRequest<'/twitch/channels'>) => {
    const tokens = await readTokensSafe();
    if (!tokens.broadcaster?.access_token || !tokens.broadcaster?.user_id) {
        return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();

    return fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${tokens.broadcaster.user_id}`, {
        method: 'PATCH',
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.broadcaster.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
};

export const handleTwitchGames = async (req: BunRequest<'/twitch/games'>) => {
    const appToken = await getAppToken();
    if (!appToken) return new Response('Server Error', { status: 500 });

    const url = new URL(req.url);
    return fetch(`https://api.twitch.tv/helix/games?${url.searchParams}`, {
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${appToken.access_token}`
        }
    });
};

export const handleTwitchAnnouncements = async (req: BunRequest<'/twitch/announcements'>) => {
    const tokens = await readTokensSafe();
    // Need Broadcaster ID (target channel) and Bot Token (moderator action)
    if (!tokens.broadcaster?.user_id || !tokens.bot?.access_token || !tokens.bot?.user_id) {
        return new Response('Unauthorized - Missing Broadcaster ID or Bot Token', { status: 401 });
    }

    const body = await req.json();

    return fetch(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${tokens.broadcaster.user_id}&moderator_id=${tokens.bot.user_id}`, {
        method: 'POST',
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.bot.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
};

export const handleUptime = async (req: BunRequest<'/uptime/:channel'>) => {
    const { channel } = req.params;
    return Response.redirect(`https://decapi.me/twitch/uptime?channel=${channel.replace(/\#/g, '')}`);
};

export const handleClips = async (req: BunRequest<'/clips/:channel'>) => {
    const { channel } = req.params;
    return Response.redirect(`https://streamgood.gg/shoutout/api?channel=${channel}&mode=random&last_game=true&max_length=60&filter_long_videos=true`)
};

export const handleChatSend = async (req: BunRequest<'/api/chat/send'>) => {
    const tokens = await readTokensSafe();

    // For Chat Bot Badge, we MUST use App Access Token
    if (!tokens.app?.access_token) return new Response('No App Token', { status: 500 });
    // We still need the Bot User ID for sender_id
    if (!tokens.bot?.user_id) return new Response('No Bot User ID', { status: 500 });

    const body = await req.json() as {
        broadcaster_id: string;
        message: string;
    };

    return fetch('https://api.twitch.tv/helix/chat/messages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokens.app.access_token}`,
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            broadcaster_id: body.broadcaster_id,
            sender_id: tokens.bot.user_id,
            message: body.message
        })
    });
};

export const handleEventSubSubscribe = async (req: BunRequest<'/api/eventsub/subscribe'>) => {
    try {
        const body = await req.json() as any;
        const appToken = await getAppToken();
        if (!appToken) return Response.json({ error: 'No App Token' }, { status: 500 });

        const conduitId = await getConduit();
        if (!conduitId) return Response.json({ error: 'No Conduit ID' }, { status: 500 });

        // Update transport to use conduit
        body.transport = {
            method: 'conduit',
            conduit_id: conduitId
        };

        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appToken.access_token}`,
                'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return Response.json(data, { status: response.status });
    } catch (e: any) {
        console.error('EventSub Subscribe Error:', e);
        return Response.json({ error: e.message }, { status: 500 });
    }
};
