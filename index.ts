import { CSRF } from 'bun';
import { Client } from 'tmi.js';
import type { TwitchAuth } from './src/Typings/TwitchAPI';
import type { Scopes } from './src/Typings/Bhotianaa';

const tokenFile = Bun.file('./src/Config/tokens.json');

const server = Bun.serve({
    port: Bun.env.PORT,
    development: Bun.env.NODE_ENV === 'development',
    routes: {
        '/': () => new Response('Hello World!'),
        '/auth/:authtype': async (req: Bun.BunRequest<'/auth/:authtype'>) => {
            const { authtype } = req.params;

            if (authtype !== 'app' && authtype !== 'broadcaster')
                return new Response(`Invalid auth type. Use "app" or "broadcaster" after 'http://localhost:${Bun.env.PORT}/auth/'.`, { status: 400 });

            const scopes: Scopes = await Bun.file(process.cwd() + `/src/Config/scopes.json`).json();
            const expiresInMs = 1000 * 60 * 20; // 20 minutes
            const state = CSRF.generate(Bun.env.CSRF_SECRET, {
                expiresIn: expiresInMs
            });

            const expires = new Date(Date.now() + expiresInMs).toUTCString();

            return Response.redirect(`${Bun.env.TWITCH_AUTH_URL}?client_id=${Bun.env.TWITCH_CLIENT_ID}&redirect_uri=http://localhost:${Bun.env.PORT}/auth/callback&response_type=code&scope=${encodeURIComponent(scopes[authtype].join(' '))}&state=${state}`, {
                headers: {
                    "Set-Cookie": `csrf=${state}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}, auth_type=${authtype}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`,
                }
            });
        },
        '/auth/callback': async (req: Bun.BunRequest<'/auth/callback'>) => {
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
        },
        '/auth/register': async (req: Bun.BunRequest<'/auth/register'>) => {
            const url = new URL(req.url);
            const code = url.searchParams.get('code')!;
            const grant_type = url.searchParams.get('grant_type')!;
            const userType = url.searchParams.get('user_type') as 'app' | 'broadcaster';
            const forwardResponse = req.headers.get('Auth-User-Type') === 'app';

            const generateToken = await fetch('https://id.twitch.tv/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    code,
                    grant_type,
                    client_id: Bun.env.TWITCH_CLIENT_ID,
                    client_secret: Bun.env.TWITCH_CLIENT_SECRET,
                    redirect_uri: `http://localhost:${Bun.env.PORT}/auth/callback`
                }),
            });

            if (!generateToken.ok) {
                const error = await generateToken.json();
                return Response.json(error, { status: generateToken.status });
            }

            const tokenResponse = await generateToken.json() as TwitchAuth;

            const doesTokenFileExists = await tokenFile.exists();
            let tokens: Record<'app' | 'broadcaster', TwitchAuth | null> = {
                "app": null,
                "broadcaster": null
            };

            if (doesTokenFileExists) {
                tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;
            }

            tokens[userType] = tokenResponse;

            await tokenFile.write(JSON.stringify(tokens, null, 2));

            if (forwardResponse)
                return Response.json(tokenResponse);
            else
                return new Response(`You may close this window now.`);
        }
    }
});

console.log(`Local server running on http://localhost:${server.port}\nTo terminate the app, press Ctrl+C\n`);

if (!await tokenFile.exists())
    console.warn(`⚠️  No app tokens found. Please authenticate first by visiting http://localhost:${Bun.env.PORT}/auth/app ❗ USING BOT ACCOUNT ❗ and restart the app.`);

else {
    let tokens = await tokenFile.json() as Record<'app' | 'broadcaster', TwitchAuth | null>;

    if (!tokens.broadcaster) {
        console.warn(`⚠️  No broadcaster tokens found. Please authenticate first by visiting http://localhost:${Bun.env.PORT}/auth/broadcaster ❗ USING BROADCASTER ACCOUNT ❗ and restart the app.`);
    }

    else {
        const appValidationResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: {
                'Authorization': `Bearer ${tokens.app!.access_token}`
            }
        });

        if (!appValidationResponse.ok) {
            console.warn(`⚠️  App token expired. Re-authenticating...`);
            const response = await fetch(`/auth/register?code=${tokens.app?.refresh_token}&grant_type=refresh_token&user_type=app`, {
                headers: {
                    'Auth-User-Type': 'app'
                }
            });

            const data = await response.json() as TwitchAuth;
            tokens.app = data;
            console.log(`✅  App token refreshed successfully.`);
        }

        const broadcasterValidationResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: {
                'Authorization': `Bearer ${tokens.broadcaster!.access_token}`
            }
        });

        if (!broadcasterValidationResponse.ok) {
            console.warn(`⚠️  Broadcaster token expired. Re-authenticating...`);
            const response = await fetch(`/auth/register?code=${tokens.broadcaster?.refresh_token}&grant_type=refresh_token&user_type=broadcaster`, {
                headers: {
                    'Auth-User-Type': 'app'
                }
            });

            const data = await response.json() as TwitchAuth;
            tokens.broadcaster = data;
            console.log(`✅  Broadcaster token refreshed successfully.`);
        }

        const twitchClient = new Client({
            options: {
                debug: Bun.env.NODE_ENV === 'development',
                clientId: Bun.env.TWITCH_CLIENT_ID,
            },
            identity: {
                username: Bun.env.TWITCH_USERNAME,
                password: `oauth:${tokens.app!.access_token}`,
            },
            channels: ['d3fau4t']
        });

        twitchClient.connect().catch(console.error);

        twitchClient.on('connected', () => {
            twitchClient.say('d3fau4t', `Test`);
        });
    }
}