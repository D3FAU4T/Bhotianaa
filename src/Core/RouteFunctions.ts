import path from 'node:path';
import { CSRF, type BunRequest } from 'bun';
import type { TwitchAuth, TwitchGame, TwitchUser } from '../Typings/TwitchAPI';
import type { Scopes } from '../Typings/Bhotianaa';
import type { dictionaryAPI } from '../Typings/definitions';

const tokenFile = Bun.file(path.resolve('src', 'Config', 'tokens.json'));

export const handleRoot = () => new Response('Hello World!');

// Initial authentication route <app | broadcaster>
export const handleAuth = async (req: BunRequest<'/auth/:authtype'>) => {
    const { authtype } = req.params;
    if (authtype !== 'app' && authtype !== 'broadcaster')
        return new Response(`Invalid auth type. Use "app" or "broadcaster" after '${req.url}'`, { status: 400 });

    // Check for required environment variables
    const requiredEnvVars = [
        'TWITCH_CLIENT_ID',
        'CSRF_SECRET',
        'TWITCH_AUTH_URL'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !Bun.env[envVar]);

    if (missingEnvVars.length > 0) {
        return new Response(
            `Missing required environment variables: ${missingEnvVars.join(', ')}\n\n` +
            `Please create a .env.development.local file with the required variables.\n` +
            `See .env.example for reference.`,
            {
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            }
        );
    }

    let scopes: Scopes;
    try {
        scopes = await Bun.file(path.resolve('src', 'Config', 'scopes.json')).json();
    } catch (error) {
        return new Response(
            `Failed to load scopes.json: ${error}\n\n` +
            `Please ensure the file src/Config/scopes.json exists and is valid JSON.`,
            {
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            }
        );
    }

    const expiresInMs = 1000 * 60 * 20; // 20 minutes
    let state: string;

    try {
        state = CSRF.generate(Bun.env.CSRF_SECRET, {
            expiresIn: expiresInMs
        });
    } catch (error) {
        return new Response(
            `Failed to generate CSRF token: ${error}\n\n` +
            `Please check your CSRF_SECRET environment variable.`,
            {
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            }
        );
    }

    const expires = new Date(Date.now() + expiresInMs).toUTCString();

    const headers = new Headers();
    headers.append('Set-Cookie', `csrf=${state}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`);
    headers.append('Set-Cookie', `auth_type=${authtype}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`);

    const redirect_uri = [
        `client_id=${Bun.env.TWITCH_CLIENT_ID}`,
        `redirect_uri=${req.url.replace(authtype, 'callback')}`,
        `response_type=code`,
        `scope=${encodeURIComponent(scopes[authtype].join(' '))}`,
        `state=${state}`
    ];

    console.log(`🔗 Redirecting to Twitch OAuth for ${authtype} authentication...`);

    const redirectUrl = Bun.env.TWITCH_AUTH_URL + '?' + redirect_uri.join('&');
    console.log(`🔗 Redirect URL: ${redirectUrl}`);

    return Response.redirect(
        redirectUrl,
        {
            status: 302,
            headers
        }
    );
};

// Twitch OAuth callback handler
export const handleAuthCallback = async (req: BunRequest<'/auth/callback'>) => {
    const url = new URL(req.url);

    const authType = req.cookies.get('auth_type') as 'app' | 'broadcaster';

    // Security checks
    const state = url.searchParams.get('state');
    const csrfCookie = req.cookies.get('csrf');

    if (!csrfCookie)
        return new Response('Security issue: CSRF token not found', { status: 404 });

    if (state !== csrfCookie)
        return new Response('Security issue: CSRF token mismatch', { status: 404 });

    const isValid = CSRF.verify(csrfCookie, { secret: Bun.env.CSRF_SECRET });

    if (!isValid)
        return new Response('Security issue: Invalid CSRF token', { status: 404 });

    // Proceed with the OAuth flow
    const code = url.searchParams.get('code');

    if (!code) {
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        return Response.json({ error, errorDescription }, { status: 404 });
    }

    return Response.redirect(`/auth/register?code=${code}&grant_type=authorization_code&user_type=${authType}`);
};

// Register OAuth code as tokens or Refresh existing tokens
export const handleAuthRegister = async (req: BunRequest<'/auth/register'>) => {
    const url = new URL(req.url);
    const code = url.searchParams.get('code')!;
    const grant_type = url.searchParams.get('grant_type')! as 'authorization_code' | 'refresh_token';
    const userType = url.searchParams.get('user_type') as 'app' | 'broadcaster';
    const forwardResponse = req.headers.get('Auth-User-Type') === 'app';

    const generateToken = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: grant_type === 'refresh_token' ? new URLSearchParams({
            grant_type,
            client_id: Bun.env.TWITCH_CLIENT_ID,
            client_secret: Bun.env.TWITCH_CLIENT_SECRET,
            redirect_uri: req.url.replace(/register\?.+/g, 'callback'),
            refresh_token: encodeURIComponent(code),
        }) : new URLSearchParams({
            code,
            grant_type,
            client_id: Bun.env.TWITCH_CLIENT_ID,
            client_secret: Bun.env.TWITCH_CLIENT_SECRET,
            redirect_uri: req.url.replace(/register\?.+/g, 'callback'),
        }),
    });

    if (!generateToken.ok) {
        const error = await generateToken.json();
        return Response.json(error, { status: generateToken.status });
    }

    const tokenResponse = await generateToken.json() as TwitchAuth;

    const isTokenFilePresent = await tokenFile.exists();
    let tokens: Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (isTokenFilePresent)
        tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    else tokens = {
        app: null,
        broadcaster: null
    };

    tokens[userType] = tokenResponse;

    await tokenFile.write(JSON.stringify(tokens, null, 4));

    if (grant_type === 'authorization_code')
        console.log(`✅  ${userType.charAt(0).toUpperCase() + userType.slice(1)} token saved successfully.\nPlease restart the app to continue the next phase.`);

    if (forwardResponse)
        return Response.json(tokenResponse);
    else
        return new Response(`You may close this window now.`);
};

export const handleAuthValidate = async (req: BunRequest<'/auth/validate'>) => {
    if (!await tokenFile.exists())
        return Response.json({ error: "No tokens found. Please authenticate first." }, { status: 404 });

    const tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (!tokens.app || !tokens.broadcaster) {
        return Response.json({ error: "Incomplete tokens. Please authenticate both app and broadcaster." }, { status: 401 });
    }

    const appValidationResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: { 'Authorization': `Bearer ${tokens.app.access_token}` }
    });

    const broadcasterValidationResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: { 'Authorization': `Bearer ${tokens.broadcaster.access_token}` }
    });

    let toForward: TwitchAuth | null = null;

    if (!appValidationResponse.ok) {
        console.warn(`⚠️  App token expired. Re-authenticating...`);
        const response = await fetch(`${req.url.replace('/auth/validate', '')}/auth/register?code=${tokens.app.refresh_token}&grant_type=refresh_token&user_type=app`, {
            headers: { 'Auth-User-Type': 'app' }
        });

        toForward = tokens.app = await response.json() as TwitchAuth;
        console.log(`✅  App token refreshed successfully.`);
    }

    if (!broadcasterValidationResponse.ok) {
        console.warn(`⚠️  Broadcaster token expired. Re-authenticating...`);
        const response = await fetch(`${req.url.replace('/auth/validate', '')}/auth/register?code=${tokens.broadcaster.refresh_token}&grant_type=refresh_token&user_type=broadcaster`, {
            headers: { 'Auth-User-Type': 'app' }
        });

        toForward = tokens.broadcaster = await response.json() as TwitchAuth;
        console.log(`✅  Broadcaster token refreshed successfully.`);
    }

    await tokenFile.write(JSON.stringify(tokens, null, 4));
    return Response.json(toForward);
};

// Dictionary API Routes
export const handleDefine = async (req: BunRequest<'/define/:word'>) => {
    const { word } = req.params;

    if (!word || word.length === 0)
        return Response.json({
            error: "Word parameter is required",
            example: "Use /define/hello"
        }, { status: 400 });

    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

    if (!response.ok)
        return Response.json(await response.json(), { status: response.status });

    const data = await response.json() as dictionaryAPI[];
    return Response.json(data);
};

// Self user data
export const handleWhoami = async () => {
    if (!await tokenFile.exists())
        return Response.json({ error: "No tokens found. Please authenticate first." }, { status: 404 });

    const tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (!tokens.broadcaster?.access_token)
        return Response.json({ error: "No broadcaster token available, please authenticate first." }, { status: 401 });

    if (!tokens.app?.access_token)
        return Response.json({ error: "No app token available, please authenticate first." }, { status: 401 });

    const [appUserResponse, broadcasterUserResponse] = await Promise.allSettled([
        fetch(`https://api.twitch.tv/helix/users`, {
            headers: {
                'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
                'Authorization': `Bearer ${tokens.app.access_token}`,
                'Content-Type': 'application/json'
            }
        }),
        fetch(`https://api.twitch.tv/helix/users`, {
            headers: {
                'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
                'Authorization': `Bearer ${tokens.broadcaster.access_token}`,
                'Content-Type': 'application/json'
            }
        })
    ]);

    if (appUserResponse.status !== 'fulfilled' || broadcasterUserResponse.status !== 'fulfilled') {
        return Response.json({ error: "Failed to fetch user information" }, { status: 500 });
    }

    const appUserData = appUserResponse.value.ok ? (await appUserResponse.value.json() as { data: TwitchUser[] }) : null;
    const broadcasterUserData = broadcasterUserResponse.value.ok ? (await broadcasterUserResponse.value.json() as { data: TwitchUser[] }) : null;

    if (!appUserData || !broadcasterUserData) {
        return Response.json({ error: "Failed to fetch user information" }, { status: 500 });
    }

    const data = {
        app: {
            ...appUserData.data[0],
            token: tokens.app.access_token
        },
        broadcaster: {
            ...broadcasterUserData.data[0],
            token: tokens.broadcaster.access_token
        }
    }

    await Bun.write(
        path.resolve('src', 'Config', 'whoami.json'),
        JSON.stringify(data, null, 4)
    );

    return Response.json(data);
};

// Get Twitch Users Information
export const handleTwitchUsers = async (req: BunRequest<'/twitch/users'>) => {
    const url = new URL(req.url);

    const validParams = ['login', 'id'];
    const combinedParams = new URLSearchParams();

    for (const [key, value] of url.searchParams.entries()) {
        if (validParams.includes(key))
            combinedParams.append(key, value);
    }

    const tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (!tokens.broadcaster?.access_token) {
        return Response.json({ error: "No broadcaster token available" }, { status: 401 });
    }

    const response = await fetch(`https://api.twitch.tv/helix/users?${combinedParams.toString()}`, {
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.broadcaster.access_token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        return Response.json({ error: "Twitch API error", status: response.status }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
};

export const handleShoutout = async (req: BunRequest<"/shoutout">) => {
    const url = new URL(req.url);
    const fromId = url.searchParams.get("from_id");
    const toId = url.searchParams.get("to_id");

    if (!fromId || !toId) {
        return Response.json({ error: "from_id and to_id parameters are required" }, { status: 400 });
    }

    const tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    const response = await fetch("https://api.twitch.tv/helix/chat/shoutouts", {
        method: "POST",
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.broadcaster?.access_token}`,
            'Content-Type': 'application/json'
        },
        body: new URLSearchParams({
            from_broadcaster_id: fromId,
            to_broadcaster_id: toId,
            moderator_id: fromId
        })
    });

    if (!response.ok) {
        return Response.json({ error: "Twitch API error", status: response.status }, { status: response.status });
    }

    else return new Response('Done');
};

// Get Twitch Channel Information
export const handleTwitchChannelsGet = async (req: BunRequest<'/twitch/channels'>) => {
    const url = new URL(req.url);
    const broadcasterIds = url.searchParams.getAll('broadcaster_id');

    if (broadcasterIds.length === 0) {
        return Response.json({ error: "broadcaster_id query parameter is required" }, { status: 400 });
    }

    const tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (!tokens.broadcaster?.access_token) {
        return Response.json({ error: "No broadcaster token available" }, { status: 401 });
    }

    const response = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterIds.join('&broadcaster_id=')}`, {
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.broadcaster.access_token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        return Response.json(await response.json(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
};

// Update Twitch Channel Information
export const handleTwitchChannelsPatch = async (req: BunRequest<'/twitch/channels'>) => {
    const url = new URL(req.url);
    const broadcasterId = url.searchParams.get('broadcaster_id');

    if (!broadcasterId) {
        return Response.json({ error: "broadcaster_id query parameter is required" }, { status: 400 });
    }

    const body = await req.json() as Record<string, any>;

    // Valid parameters according to Twitch API documentation
    const validParams = ['game_id', 'broadcaster_language', 'title', 'delay', 'tags'];
    const filteredBody: Record<string, any> = {};

    // Check if any invalid parameters are provided
    const invalidParams = Object.keys(body).filter(key => !validParams.includes(key));
    if (invalidParams.length > 0)
        return Response.json({
            error: "Invalid parameters provided",
            invalid_params: invalidParams,
            valid_params: validParams
        }, { status: 400 });

    // Filter only valid parameters
    for (const [key, value] of Object.entries(body)) {
        if (validParams.includes(key))
            filteredBody[key] = value;
    }

    // Ensure at least one parameter is provided
    if (Object.keys(filteredBody).length === 0)
        return Response.json({
            error: "At least one valid parameter is required",
            valid_params: validParams
        }, { status: 400 });

    const tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (!tokens.broadcaster?.access_token)
        return Response.json({ error: "No broadcaster token available" }, { status: 401 });

    const response = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, {
        method: 'PATCH',
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.broadcaster.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filteredBody)
    });

    if (!response.ok) {
        const error = await response.json();
        return Response.json(error, { status: response.status });
    }

    return Response.json({ success: true });
};

// Get Twitch Game Information
export const handleTwitchGames = async (req: BunRequest<'/twitch/games'>) => {
    const url = new URL(req.url);

    const validParams = ['name', 'id', 'igdb_id'];
    const combinedParams = new URLSearchParams();

    for (const [key, value] of url.searchParams.entries()) {
        if (validParams.includes(key))
            combinedParams.append(key, value);
    }

    const params = combinedParams.toString();

    if (combinedParams.toString().length === 0)
        return Response.json({
            error: "Specify at least one valid parameter",
            example: "Use /twitch/games?name=game1&id=1234&igdb_id=5678"
        }, { status: 400 });

    const tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (!tokens.app?.access_token) {
        return Response.json({ error: "No app token available" }, { status: 401 });
    }

    const response = await fetch(`https://api.twitch.tv/helix/games?${params}`, {
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.app.access_token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        return Response.json({ error: "Twitch API error", status: response.status }, { status: response.status });
    }

    const data = await response.json() as { data: TwitchGame[] };
    const gameCacheFile = Bun.file(path.resolve('src', 'Cache', 'games.json'));

    if (await gameCacheFile.exists()) {
        const existingData = await gameCacheFile.json() as TwitchGame[];
        const newGames = data.data.filter(game => !existingData.some(existing => existing.id === game.id));

        if (newGames.length > 0) {
            existingData.push(...newGames);
            await gameCacheFile.write(JSON.stringify(existingData));
        }
    }

    else await gameCacheFile.write(JSON.stringify(data.data));
    return Response.json(data);
};

export const handleTwitchAnnouncements = async (req: BunRequest<'/twitch/announcements'>) => {
    if (req.method !== 'POST')
        return Response.json({ error: "Method not allowed" }, { status: 405 });

    const body = await req.json() as {
        message: string;
        color?: 'primary' | 'blue' | 'green' | 'orange' | 'purple';
        broadcaster_id: string;
        moderator_id: string;
    };

    const tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (!tokens.app?.access_token) {
        return Response.json({ error: "No app token available" }, { status: 401 });
    }

    const response = await fetch(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${body.broadcaster_id}&moderator_id=${body.moderator_id}`, {
        method: 'POST',
        headers: {
            'Client-Id': Bun.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${tokens.app.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...body,
            broadcaster_id: Bun.env.TWITCH_CHANNEL_ID ?
                Bun.env.TWITCH_CHANNEL_ID : body.broadcaster_id,
        })
    });

    if (!response.ok)
        return Response.json(await response.json(), { status: response.status });

    return Response.json({ success: true });
};

// External API Routes
export const handleUptime = async (req: BunRequest<'/uptime/:channel'>) => {
    const { channel } = req.params;
    const cleanChannel = channel.replace(/\#/g, '');

    const response = await fetch(`https://decapi.me/twitch/uptime?channel=${cleanChannel}`);

    if (!response.ok) {
        return Response.json({ error: "DecAPI error", status: response.status }, { status: response.status });
    }

    return new Response(await response.text());
};

export const handleClips = async (req: BunRequest<'/clips/:channel'>) => {
    const { channel } = req.params;

    const response = await fetch(`https://streamgood.gg/shoutout/api?channel=${channel}&mode=random&last_game=true&max_length=60&filter_long_videos=true`);

    if (!response.ok) {
        return Response.json(await response.json(), { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
};