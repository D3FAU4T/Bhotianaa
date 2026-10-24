import path from 'node:path';
import type { SpotifyAuth } from '../Typings/Bhotianaa';
import { readTokensSafe, events } from './RouteFunctions';

const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export const SPOTIFY_SCOPES = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-email',
    'user-read-private',
];

const getTokenFile = () => Bun.file(path.resolve('src', 'Config', 'tokens.json'));

const getBasicAuthHeader = () => {
    const clientId = Bun.env.SPOTIFY_CLIENT_ID;
    const clientSecret = Bun.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
    }
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
};

export const getSpotifyAuthUrl = (): string => {
    const clientId = Bun.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
        throw new Error('Missing SPOTIFY_CLIENT_ID');
    }

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: 'http://127.0.0.1:3000/auth/spotify/callback',
        scope: SPOTIFY_SCOPES.join(' '),
        show_dialog: 'true',
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

export const exchangeSpotifyCode = async (code: string, redirectUri: string): Promise<SpotifyAuth> => {
    const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: getBasicAuthHeader(),
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        }),
    });

    if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Spotify token exchange failed (${res.status}): ${errorData}`);
    }

    const data = await res.json() as {
        access_token: string;
        token_type: string;
        scope: string;
        expires_in: number;
        refresh_token: string;
    };

    let user: SpotifyAuth['user'];
    try {
        const profileRes = await fetch(`${SPOTIFY_API_BASE}/me`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (profileRes.ok) {
            const profile = await profileRes.json() as { id: string; display_name?: string; email?: string };
            user = {
                id: profile.id,
                display_name: profile.display_name || profile.id,
                email: profile.email,
            };
        }
    } catch (e) {
        console.warn('Could not fetch Spotify user profile:', e);
    }

    const spotifyAuth: SpotifyAuth = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
        token_type: data.token_type || 'Bearer',
        scope: data.scope,
        user,
    };

    const tokens = await readTokensSafe();
    tokens.spotify = spotifyAuth;
    await Bun.write(getTokenFile(), JSON.stringify(tokens, null, 4));
    events.emit('auth:update');

    return spotifyAuth;
};

export const getValidSpotifyToken = async (): Promise<string | null> => {
    const tokens = await readTokensSafe();
    const spotify = tokens.spotify;
    if (!spotify?.refresh_token) {
        return null;
    }

    if (spotify.access_token && spotify.expires_at && Date.now() < spotify.expires_at - 60000) {
        return spotify.access_token;
    }

    try {
        const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: getBasicAuthHeader(),
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: spotify.refresh_token,
            }),
        });

        if (!res.ok) {
            console.error('Failed to refresh Spotify access token:', await res.text());
            return null;
        }

        const data = await res.json() as {
            access_token: string;
            token_type: string;
            scope?: string;
            expires_in: number;
            refresh_token?: string;
        };

        spotify.access_token = data.access_token;
        spotify.expires_at = Date.now() + data.expires_in * 1000;
        if (data.refresh_token) spotify.refresh_token = data.refresh_token;
        if (data.scope) spotify.scope = data.scope;

        tokens.spotify = spotify;
        await Bun.write(getTokenFile(), JSON.stringify(tokens, null, 4));
        return spotify.access_token;
    } catch (e) {
        console.error('Error while refreshing Spotify token:', e);
        return null;
    }
};

export const disconnectSpotify = async (): Promise<void> => {
    const tokens = await readTokensSafe();
    tokens.spotify = null;
    await Bun.write(getTokenFile(), JSON.stringify(tokens, null, 4));
    events.emit('auth:update');
};

export interface TrackInfo {
    uri: string;
    id: string;
    name: string;
    artists: string[];
    durationMs: number;
    url: string;
    album: string;
    albumArt?: string;
}

export const searchSpotifyTrack = async (query: string): Promise<TrackInfo | null> => {
    const token = await getValidSpotifyToken();
    if (!token) throw new Error('Spotify is not connected.');

    const urlMatch = query.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
    const uriMatch = query.match(/spotify:track:([a-zA-Z0-9]+)/);
    const trackId = urlMatch?.[1] || uriMatch?.[1];

    if (trackId) {
        const res = await fetch(`${SPOTIFY_API_BASE}/tracks/${trackId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const track = await res.json() as any;
            return {
                uri: track.uri,
                id: track.id,
                name: track.name,
                artists: track.artists.map((a: any) => a.name),
                durationMs: track.duration_ms,
                url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
                album: track.album?.name || '',
                albumArt: track.album?.images?.[0]?.url,
            };
        }
    }

    const res = await fetch(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const data = await res.json() as any;
    const item = data.tracks?.items?.[0];
    if (!item) return null;

    return {
        uri: item.uri,
        id: item.id,
        name: item.name,
        artists: item.artists.map((a: any) => a.name),
        durationMs: item.duration_ms,
        url: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
        album: item.album?.name || '',
        albumArt: item.album?.images?.[0]?.url,
    };
};

export interface SongRequest {
    id: string;
    track: TrackInfo;
    requestedBy: string;
    requestedByUserId: string;
    requestedAt: number;
}

const songRequests: SongRequest[] = [];
const wrongSongUris = new Set<string>();
let wrongSongWatcherTimer: NodeJS.Timeout | null = null;

const checkAndSkipWrongSong = async () => {
    if (wrongSongUris.size === 0) {
        if (wrongSongWatcherTimer) {
            clearInterval(wrongSongWatcherTimer);
            wrongSongWatcherTimer = null;
        }
        return;
    }

    try {
        const current = await getCurrentlyPlaying();
        if (current?.isPlaying && current.track) {
            if (wrongSongUris.has(current.track.uri) || wrongSongUris.has(current.track.id)) {
                wrongSongUris.delete(current.track.uri);
                wrongSongUris.delete(current.track.id);
                console.log(`[Spotify] Skipping wrong song: "${current.track.name}"`);
                await skipSpotifyTrack();
                if (wrongSongUris.size === 0 && wrongSongWatcherTimer) {
                    clearInterval(wrongSongWatcherTimer);
                    wrongSongWatcherTimer = null;
                }
            }
        }
    } catch {
        // Ignore polling errors
    }
};

export const addTrackToQueue = async (
    track: TrackInfo,
    user: { name: string; id: string }
): Promise<{ success: boolean; message?: string }> => {
    const token = await getValidSpotifyToken();
    if (!token) throw new Error('Spotify is not connected.');

    wrongSongUris.delete(track.uri);
    wrongSongUris.delete(track.id);

    const queueRes = await fetch(`${SPOTIFY_API_BASE}/me/player/queue?uri=${encodeURIComponent(track.uri)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!queueRes.ok) {
        if (queueRes.status === 404 || queueRes.status === 403) {
            const devicesRes = await fetch(`${SPOTIFY_API_BASE}/me/player/devices`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (devicesRes.ok) {
                const { devices } = await devicesRes.json() as { devices: any[] };
                const device = devices?.find(d => d.is_active) || devices?.[0];

                if (device) {
                    const retryRes = await fetch(
                        `${SPOTIFY_API_BASE}/me/player/queue?uri=${encodeURIComponent(track.uri)}&device_id=${device.id}`,
                        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
                    );

                    if (!retryRes.ok) {
                        const playRes = await fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${device.id}`, {
                            method: 'PUT',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uris: [track.uri] }),
                        });
                        if (!playRes.ok) {
                            return { success: false, message: 'Could not queue track to Spotify device.' };
                        }
                    }
                } else {
                    return { success: false, message: 'No active Spotify device found. Please open Spotify.' };
                }
            }
        } else {
            return { success: false, message: `Spotify error (${queueRes.status})` };
        }
    }

    // Check if player is paused or inactive: resume playback without interrupting existing songs
    try {
        const stateRes = await fetch(`${SPOTIFY_API_BASE}/me/player`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (stateRes.status === 200) {
            const state = await stateRes.json() as any;
            if (!state.is_playing) {
                await fetch(`${SPOTIFY_API_BASE}/me/player/play`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
        }
    } catch (e) {
        console.warn('Playback check error:', e);
    }

    songRequests.push({
        id: `${track.id}-${Date.now()}`,
        track,
        requestedBy: user.name,
        requestedByUserId: user.id,
        requestedAt: Date.now(),
    });
    if (songRequests.length > 100) songRequests.shift();

    return { success: true };
};

export const markWrongSong = async (
    user: { name: string; id: string; isMod?: boolean },
    query?: string
): Promise<TrackInfo | null> => {
    let idx = -1;
    if (query) {
        const q = query.toLowerCase();
        idx = songRequests.findLastIndex(r =>
            (user.isMod || r.requestedByUserId === user.id || r.requestedBy.toLowerCase() === user.name.toLowerCase()) &&
            (r.track.name.toLowerCase().includes(q) || r.track.artists.some(a => a.toLowerCase().includes(q)))
        );
    } else {
        idx = songRequests.findLastIndex(r =>
            user.isMod || r.requestedByUserId === user.id || r.requestedBy.toLowerCase() === user.name.toLowerCase()
        );
    }

    if (idx === -1) return null;

    const [removed] = songRequests.splice(idx, 1);
    if (!removed) return null;

    const track = removed.track;
    wrongSongUris.add(track.uri);
    wrongSongUris.add(track.id);

    // If it's playing right now, skip it immediately!
    try {
        const current = await getCurrentlyPlaying();
        if (current?.isPlaying && current.track && (current.track.uri === track.uri || current.track.id === track.id)) {
            wrongSongUris.delete(track.uri);
            wrongSongUris.delete(track.id);
            await skipSpotifyTrack();
            return track;
        }
    } catch {}

    // Otherwise, ensure watcher runs so when queue reaches it, it skips
    if (!wrongSongWatcherTimer) {
        wrongSongWatcherTimer = setInterval(checkAndSkipWrongSong, 1500);
    }

    return track;
};

export const skipSpotifyTrack = async (): Promise<{ success: boolean; message?: string; track?: TrackInfo | null }> => {
    const token = await getValidSpotifyToken();
    if (!token) throw new Error('Spotify is not connected.');

    const current = await getCurrentlyPlaying().catch(() => null);
    const trackToSkip = current?.track || null;

    const res = await fetch(`${SPOTIFY_API_BASE}/me/player/next`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 204 || res.status === 200) {
        return { success: true, track: trackToSkip };
    }

    return { success: false, message: 'No active playback device found to skip.' };
};

export interface CurrentPlaybackInfo {
    isPlaying: boolean;
    track: TrackInfo | null;
    progressMs: number;
    requestedBy?: string;
}

export const getCurrentlyPlaying = async (): Promise<CurrentPlaybackInfo | null> => {
    const token = await getValidSpotifyToken();
    if (!token) throw new Error('Spotify is not connected.');

    const res = await fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 204 || !res.ok) return null;

    const data = await res.json() as any;
    if (!data?.item) return null;

    const item = data.item;
    const track: TrackInfo = {
        uri: item.uri,
        id: item.id,
        name: item.name,
        artists: item.artists ? item.artists.map((a: any) => a.name) : [],
        durationMs: item.duration_ms || 0,
        url: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
        album: item.album?.name || '',
        albumArt: item.album?.images?.[0]?.url,
    };

    const matchedReq = songRequests.find(r => r.track.uri === track.uri || r.track.id === track.id);

    return {
        isPlaying: data.is_playing ?? false,
        track,
        progressMs: data.progress_ms || 0,
        requestedBy: matchedReq?.requestedBy,
    };
};

export const getSpotifyQueue = async (): Promise<{ currentlyPlaying: TrackInfo | null; queue: (TrackInfo & { requestedBy?: string })[] }> => {
    const token = await getValidSpotifyToken();
    if (!token) throw new Error('Spotify is not connected.');

    const res = await fetch(`${SPOTIFY_API_BASE}/me/player/queue`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        const current = await getCurrentlyPlaying().catch(() => null);
        return {
            currentlyPlaying: current?.track || null,
            queue: songRequests.map(r => ({ ...r.track, requestedBy: r.requestedBy })),
        };
    }

    const data = await res.json() as any;
    let currentlyPlaying: TrackInfo | null = null;
    if (data.currently_playing) {
        const item = data.currently_playing;
        currentlyPlaying = {
            uri: item.uri,
            id: item.id,
            name: item.name,
            artists: item.artists ? item.artists.map((a: any) => a.name) : [],
            durationMs: item.duration_ms || 0,
            url: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
            album: item.album?.name || '',
            albumArt: item.album?.images?.[0]?.url,
        };
    }

    const queue: (TrackInfo & { requestedBy?: string })[] = [];
    if (Array.isArray(data.queue)) {
        for (const item of data.queue) {
            const track: TrackInfo = {
                uri: item.uri,
                id: item.id,
                name: item.name,
                artists: item.artists ? item.artists.map((a: any) => a.name) : [],
                durationMs: item.duration_ms || 0,
                url: item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`,
                album: item.album?.name || '',
                albumArt: item.album?.images?.[0]?.url,
            };
            const req = songRequests.find(r => r.track.uri === track.uri || r.track.id === track.id);
            queue.push({
                ...track,
                requestedBy: req?.requestedBy,
            });
        }
    }

    return { currentlyPlaying, queue };
};
