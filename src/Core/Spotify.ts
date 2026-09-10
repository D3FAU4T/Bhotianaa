import path from 'node:path';
import type { SpotifyAuth } from '../Typings/Bhotianaa';
import { readTokensSafe, events } from './RouteFunctions';

const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export const SPOTIFY_SCOPES = [
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-email',
    'user-read-private',
];

const PLAYLIST_NAME = 'Twitch Song Requests';
const PLAYLIST_DESC = 'Live Twitch song requests managed by Bhotianaa';

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

    const redirectUri = 'http://127.0.0.1:3000/auth/spotify/callback';

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
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

    // Fetch user profile
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
    if (!spotify || !spotify.refresh_token) {
        return null;
    }

    // If token is still valid for at least 60 seconds
    if (spotify.access_token && spotify.expires_at && Date.now() < spotify.expires_at - 60000) {
        return spotify.access_token;
    }

    // Refresh token
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
        if (data.refresh_token) {
            spotify.refresh_token = data.refresh_token;
        }
        if (data.scope) {
            spotify.scope = data.scope;
        }

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
    if (!token) {
        throw new Error('Spotify is not connected.');
    }

    let trackId: string | null = null;

    // Check if query is a Spotify track URL
    const urlMatch = query.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
    if (urlMatch && urlMatch[1]) {
        trackId = urlMatch[1];
    }

    // Check if query is a Spotify track URI
    const uriMatch = query.match(/spotify:track:([a-zA-Z0-9]+)/);
    if (uriMatch && uriMatch[1]) {
        trackId = uriMatch[1];
    }

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

    // Search query via Spotify Web API
    const searchParams = new URLSearchParams({
        q: query,
        type: 'track',
        limit: '1',
    });

    const res = await fetch(`${SPOTIFY_API_BASE}/search?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        console.error('Spotify search failed:', await res.text());
        return null;
    }

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

// ── Dedicated Playlist Management ──────────────────────────

export const getOrCreatePlaylist = async (): Promise<string> => {
    const token = await getValidSpotifyToken();
    if (!token) {
        throw new Error('Spotify is not connected.');
    }

    const tokens = await readTokensSafe();
    const existingPlaylistId = tokens.spotify?.playlist_id;

    if (existingPlaylistId) {
        // Validate that this playlist still exists on Spotify
        const checkRes = await fetch(`${SPOTIFY_API_BASE}/playlists/${existingPlaylistId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (checkRes.ok) {
            return existingPlaylistId;
        }
    }

    // Search existing user playlists for one with our name
    try {
        const playlistsRes = await fetch(`${SPOTIFY_API_BASE}/me/playlists?limit=50`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (playlistsRes.ok) {
            const listData = await playlistsRes.json() as { items: any[] };
            const found = listData.items?.find((p: any) => p.name === PLAYLIST_NAME);
            if (found && found.id) {
                if (tokens.spotify) {
                    tokens.spotify.playlist_id = found.id;
                    await Bun.write(getTokenFile(), JSON.stringify(tokens, null, 4));
                }
                return found.id;
            }
        }
    } catch (e) {
        console.warn('Error fetching playlists list:', e);
    }

    // Get user id to create playlist
    const meRes = await fetch(`${SPOTIFY_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) {
        throw new Error('Failed to fetch Spotify user profile to create playlist.');
    }
    const me = await meRes.json() as { id: string };

    // Create the playlist
    const createRes = await fetch(`${SPOTIFY_API_BASE}/users/${me.id}/playlists`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: PLAYLIST_NAME,
            description: PLAYLIST_DESC,
            public: false,
        }),
    });

    if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`Failed to create playlist on Spotify: ${err}`);
    }

    const createdPlaylist = await createRes.json() as { id: string };
    if (tokens.spotify) {
        tokens.spotify.playlist_id = createdPlaylist.id;
        await Bun.write(getTokenFile(), JSON.stringify(tokens, null, 4));
    }

    return createdPlaylist.id;
};

// ── In-Memory Request Mapping ───────────────────────────────

export interface SongRequest {
    id: string;
    track: TrackInfo;
    requestedBy: string;
    requestedByUserId: string;
    requestedAt: number;
}

const songRequests: SongRequest[] = [];

export const addSongRequest = (track: TrackInfo, user: { name: string; id: string }): SongRequest => {
    const req: SongRequest = {
        id: `${track.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        track,
        requestedBy: user.name,
        requestedByUserId: user.id,
        requestedAt: Date.now(),
    };
    songRequests.push(req);
    if (songRequests.length > 100) {
        songRequests.shift();
    }
    return req;
};

export const getSongRequests = (): SongRequest[] => {
    return [...songRequests];
};

export const removeSongRequest = (
    user: { name: string; id: string; isMod?: boolean },
    query?: string
): SongRequest | null => {
    if (query) {
        const queryLower = query.toLowerCase();
        const idx = songRequests.findLastIndex((r) => {
            const matchesUser = user.isMod ||
                (user.id && r.requestedByUserId === user.id) ||
                (user.name && r.requestedBy && r.requestedBy.toLowerCase() === user.name.toLowerCase());
            const matchesQuery = r.track.name.toLowerCase().includes(queryLower) ||
                                r.track.artists.some(a => a.toLowerCase().includes(queryLower)) ||
                                r.requestedBy.toLowerCase().includes(queryLower);
            return matchesUser && matchesQuery;
        });

        if (idx !== -1) {
            const [removed] = songRequests.splice(idx, 1);
            return removed ?? null;
        }
    }

    const idx = songRequests.findLastIndex((r) =>
        (user.id && r.requestedByUserId === user.id) ||
        (user.name && r.requestedBy && r.requestedBy.toLowerCase() === user.name.toLowerCase())
    );

    if (idx !== -1) {
        const [removed] = songRequests.splice(idx, 1);
        return removed ?? null;
    }

    return null;
};

// ── Add Track to Playlist & Play ────────────────────────────

export const addTrackToPlaylistAndPlay = async (
    track: TrackInfo,
    user: { name: string; id: string }
): Promise<{ success: boolean; message?: string }> => {
    const token = await getValidSpotifyToken();
    if (!token) {
        throw new Error('Spotify is not connected.');
    }

    const playlistId = await getOrCreatePlaylist();

    // 1. Fetch current playlist items
    let existingItems: any[] = [];
    try {
        const playlistTracksRes = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=100`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (playlistTracksRes.ok) {
            const data = await playlistTracksRes.json() as { items: any[] };
            existingItems = data.items || [];
        }
    } catch (e) {
        console.warn('Error fetching current playlist tracks:', e);
    }

    // 2. Fetch player state
    let currentPlayingTrackUri: string | null = null;
    let isCurrentlyPlayingPlaylist = false;
    let isPlaying = false;
    let activeDeviceId: string | null = null;

    try {
        const playerRes = await fetch(`${SPOTIFY_API_BASE}/me/player`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (playerRes.status === 200) {
            const state = await playerRes.json() as any;
            isPlaying = state.is_playing ?? false;
            isCurrentlyPlayingPlaylist = state.context?.uri === `spotify:playlist:${playlistId}`;
            currentPlayingTrackUri = state.item?.uri || null;
            activeDeviceId = state.device?.id || null;
        }
    } catch (e) {
        console.warn('Error fetching player state:', e);
    }

    // If no active device found in player response, query devices
    if (!activeDeviceId) {
        try {
            const devicesRes = await fetch(`${SPOTIFY_API_BASE}/me/player/devices`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (devicesRes.ok) {
                const devicesData = await devicesRes.json() as { devices: any[] };
                const device = devicesData.devices?.find(d => d.is_active) || devicesData.devices?.[0];
                if (device) activeDeviceId = device.id;
            }
        } catch {}
    }

    // 3. Prevent Duplicate Songs:
    // If track is currently playing
    if (currentPlayingTrackUri === track.uri) {
        return { success: false, message: `"${track.name}" is already currently playing!` };
    }

    // Check if duplicate in upcoming tracks
    let playingIndex = -1;
    if (currentPlayingTrackUri && isCurrentlyPlayingPlaylist) {
        playingIndex = existingItems.findIndex(it => it.track?.uri === currentPlayingTrackUri);
    }

    if (isCurrentlyPlayingPlaylist && playingIndex !== -1) {
        const upcomingItems = existingItems.slice(playingIndex);
        const isDuplicate = upcomingItems.some(it => it.track?.uri === track.uri || it.track?.id === track.id);
        if (isDuplicate) {
            return { success: false, message: `"${track.name}" is already in the queue!` };
        }

        // Prune finished tracks before playingIndex from playlist
        if (playingIndex > 0) {
            const finishedTracks = existingItems.slice(0, playingIndex);
            const deleteUris = finishedTracks.map(it => ({ uri: it.track.uri })).filter(t => Boolean(t.uri));
            if (deleteUris.length > 0) {
                fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ tracks: deleteUris }),
                }).catch(() => {});
            }
        }

        // Append to playlist
        const addRes = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: [track.uri] }),
        });

        if (!addRes.ok) {
            const err = await addRes.text();
            console.error('Failed to add track to Spotify playlist:', err);
            return { success: false, message: `Failed to add track to playlist: ${addRes.status}` };
        }

        // If paused on playlist, resume
        if (!isPlaying && activeDeviceId) {
            await fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${activeDeviceId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
        }
    } else {
        // Not currently playing our playlist! (e.g. stopped, or moved to recommended songs / radio)
        // Replace playlist with this new track to cleanly reset finished tracks
        const replaceRes = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: [track.uri] }),
        });

        if (!replaceRes.ok) {
            await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uris: [track.uri] }),
            });
        }

        // Immediately switch playback back from recommended songs to our playlist!
        if (activeDeviceId) {
            await fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${activeDeviceId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    context_uri: `spotify:playlist:${playlistId}`,
                }),
            });
        }
    }

    // 4. Track in memory
    addSongRequest(track, user);

    // 5. Ensure repeat=off so it doesn't loop
    if (activeDeviceId) {
        fetch(`${SPOTIFY_API_BASE}/me/player/repeat?state=off&device_id=${activeDeviceId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
    }

    return { success: true };
};

// ── Remove Track from Playlist & Player ─────────────────────

export const removeTrackFromPlaylist = async (
    user: { name: string; id: string; isMod?: boolean },
    query?: string
): Promise<TrackInfo | null> => {
    const token = await getValidSpotifyToken();
    if (!token) {
        throw new Error('Spotify is not connected.');
    }

    const playlistId = await getOrCreatePlaylist();

    // 1. Check internal song requests
    const internalRemoved = removeSongRequest(user, query);
    let trackToRemove: TrackInfo | null = internalRemoved ? internalRemoved.track : null;

    // 2. If not found in internal requests and query / mod provided, check Spotify playlist
    if (!trackToRemove) {
        try {
            const playlistTracksRes = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (playlistTracksRes.ok) {
                const listData = await playlistTracksRes.json() as { items: any[] };
                const queryLower = query ? query.toLowerCase() : '';

                if (queryLower) {
                    const matchedItem = listData.items?.find((it: any) => {
                        const tr = it.track;
                        if (!tr) return false;
                        return tr.name.toLowerCase().includes(queryLower) ||
                            tr.artists?.some((a: any) => a.name.toLowerCase().includes(queryLower));
                    });

                    if (matchedItem?.track) {
                        const tr = matchedItem.track;
                        trackToRemove = {
                            uri: tr.uri,
                            id: tr.id,
                            name: tr.name,
                            artists: tr.artists ? tr.artists.map((a: any) => a.name) : [],
                            durationMs: tr.duration_ms || 0,
                            url: tr.external_urls?.spotify || `https://open.spotify.com/track/${tr.id}`,
                            album: tr.album?.name || '',
                            albumArt: tr.album?.images?.[0]?.url,
                        };
                    }
                } else if (user.isMod && listData.items?.length > 0) {
                    const lastItem = listData.items[listData.items.length - 1];
                    if (lastItem?.track) {
                        const tr = lastItem.track;
                        trackToRemove = {
                            uri: tr.uri,
                            id: tr.id,
                            name: tr.name,
                            artists: tr.artists ? tr.artists.map((a: any) => a.name) : [],
                            durationMs: tr.duration_ms || 0,
                            url: tr.external_urls?.spotify || `https://open.spotify.com/track/${tr.id}`,
                            album: tr.album?.name || '',
                            albumArt: tr.album?.images?.[0]?.url,
                        };
                    }
                }
            }
        } catch (e) {
            console.warn('Error fetching playlist tracks in remove:', e);
        }
    }

    if (!trackToRemove) {
        return null;
    }

    // 3. Delete track from the Spotify Playlist natively!
    try {
        await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tracks: [{ uri: trackToRemove.uri }],
            }),
        });
    } catch (e) {
        console.error('Failed to delete track from playlist:', e);
    }

    // 4. If the removed track is currently playing, skip immediately
    try {
        const current = await getCurrentlyPlaying();
        if (current?.track && (current.track.uri === trackToRemove.uri || current.track.id === trackToRemove.id)) {
            await fetch(`${SPOTIFY_API_BASE}/me/player/next`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
        }
    } catch {}

    return trackToRemove;
};

// ── Skip, Currently Playing, and Queue ──────────────────────

export const skipSpotifyTrack = async (): Promise<{ success: boolean; message?: string; track?: TrackInfo | null }> => {
    const token = await getValidSpotifyToken();
    if (!token) {
        throw new Error('Spotify is not connected.');
    }

    const playlistId = await getOrCreatePlaylist().catch(() => null);
    const current = await getCurrentlyPlaying().catch(() => null);
    const trackToSkip = current?.track || null;

    // Remove the skipped track from the Spotify playlist
    if (trackToSkip && playlistId) {
        fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tracks: [{ uri: trackToSkip.uri }],
            }),
        }).catch((e) => console.warn('Failed to remove skipped track from playlist:', e));

        removeSongRequest({ name: '', id: '', isMod: true }, trackToSkip.name);
    }

    const res = await fetch(`${SPOTIFY_API_BASE}/me/player/next`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 204 || res.status === 200) {
        return { success: true, track: trackToSkip };
    }

    if (res.status === 404 || res.status === 403) {
        return { success: false, message: 'No active playback device found to skip.' };
    }

    const errorText = await res.text();
    return { success: false, message: `Failed to skip track (${res.status}): ${errorText}` };
};

export interface CurrentPlaybackInfo {
    isPlaying: boolean;
    track: TrackInfo | null;
    progressMs: number;
    requestedBy?: string;
}

export const getCurrentlyPlaying = async (): Promise<CurrentPlaybackInfo | null> => {
    const token = await getValidSpotifyToken();
    if (!token) {
        throw new Error('Spotify is not connected.');
    }

    const res = await fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 204 || !res.ok) {
        return null;
    }

    const data = await res.json() as any;
    if (!data || !data.item) {
        return null;
    }

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
    if (!token) {
        throw new Error('Spotify is not connected.');
    }

    const current = await getCurrentlyPlaying().catch(() => null);
    const currentlyPlaying = current?.track || null;

    // Fetch tracks from our dedicated Spotify Playlist
    try {
        const playlistId = await getOrCreatePlaylist();
        const res = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=50`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
            const data = await res.json() as { items: any[] };
            const allTracks: (TrackInfo & { requestedBy?: string })[] = [];

            for (const item of data.items || []) {
                if (!item.track) continue;
                const tr = item.track;
                const trackInfo: TrackInfo = {
                    uri: tr.uri,
                    id: tr.id,
                    name: tr.name,
                    artists: tr.artists ? tr.artists.map((a: any) => a.name) : [],
                    durationMs: tr.duration_ms || 0,
                    url: tr.external_urls?.spotify || `https://open.spotify.com/track/${tr.id}`,
                    album: tr.album?.name || '',
                    albumArt: tr.album?.images?.[0]?.url,
                };
                const req = songRequests.find(r => r.track.uri === trackInfo.uri || r.track.id === trackInfo.id);
                allTracks.push({
                    ...trackInfo,
                    requestedBy: req?.requestedBy,
                });
            }

            // If a track is currently playing from playlist, queue is tracks after it
            if (currentlyPlaying) {
                const currentIdx = allTracks.findIndex(t => t.uri === currentlyPlaying.uri || t.id === currentlyPlaying.id);
                if (currentIdx !== -1) {
                    return {
                        currentlyPlaying,
                        queue: allTracks.slice(currentIdx + 1),
                    };
                }
            }

            return {
                currentlyPlaying,
                queue: allTracks,
            };
        }
    } catch (e) {
        console.warn('Error fetching playlist queue, falling back to internal list:', e);
    }

    return {
        currentlyPlaying,
        queue: songRequests.map(r => ({ ...r.track, requestedBy: r.requestedBy })),
    };
};
