interface Operation {
    readonly result: number;
    readonly expression: string;
}

export function findMathExpression(nums: readonly number[], exprs: readonly string[], target: number): string | null {
    const Epsilon = 1e-6;

    if (nums.length === 1) {
        const firstNum = nums[0];
        const firstExpr = exprs[0];

        if (firstNum !== undefined && firstExpr !== undefined && Math.abs(firstNum - target) < Epsilon) {
            return firstExpr;
        }
        return null;
    }

    // Try every unordered pair i, j (i < j)
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            const a = nums[i];
            const b = nums[j];
            const ea = exprs[i];
            const eb = exprs[j];

            if (a === undefined || b === undefined || ea === undefined || eb === undefined)
                continue;

            // Build the list of remaining numbers/expressions
            const restNums: number[] = nums.filter((_, idx) => idx !== i && idx !== j);
            const restExprs: string[] = exprs.filter((_, idx) => idx !== i && idx !== j);

            // All 4 basic operations
            const ops: Operation[] = [
                { result: a + b, expression: `(${ea}+${eb})` },
                { result: a - b, expression: `(${ea}-${eb})` },
                { result: b - a, expression: `(${eb}-${ea})` },
                { result: a * b, expression: `(${ea}*${eb})` },
            ];

            // Division, avoid div by zero
            if (Math.abs(b) > Epsilon) {
                ops.push({ result: a / b, expression: `(${ea}/${eb})` });
            }
            if (Math.abs(a) > Epsilon) {
                ops.push({ result: b / a, expression: `(${eb}/${ea})` });
            }

            for (const { result, expression } of ops) {
                const nextNums: readonly number[] = [result, ...restNums];
                const nextExprs: readonly string[] = [expression, ...restExprs];
                const sol = findMathExpression(nextNums, nextExprs, target);
                if (sol) return sol;
            }
        }
    }
    return null;
}

// Helper function to fetch stream info
export const fetchStreamInfo = async () => {
    try {
        const { readTokensSafe } = await import('./RouteFunctions');
        const tokens = await readTokensSafe();

        if (!tokens.broadcaster?.access_token || !tokens.broadcaster?.user_id) {
            return {
                title: 'Offline (Auth Missing)',
                gameName: 'Not Playing',
                gameArt: '',
                channelName: 'Unknown'
            };
        }

        const channelId = tokens.broadcaster.user_id;

        // Get channel info
        const channelResponse = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${channelId}`, {
            headers: {
                'Authorization': `Bearer ${tokens.broadcaster.access_token}`,
                'Client-Id': Bun.env.TWITCH_CLIENT_ID!
            }
        });

        const channelData = await channelResponse.json();

        if (!channelData.data || channelData.data.length === 0) {
            return {
                title: 'Stream Offline',
                gameName: 'Not Playing',
                gameArt: '',
                channelName: 'Channel'
            };
        }

        const channel = channelData.data[0];

        // Check if stream is live
        const streamResponse = await fetch(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
            headers: {
                'Authorization': `Bearer ${tokens.broadcaster.access_token}`,
                'Client-Id': Bun.env.TWITCH_CLIENT_ID!
            }
        });
        const streamData = await streamResponse.json();
        const isLive = streamData.data && streamData.data.length > 0;

        // Get game artwork if game_id exists
        let gameArt = '';
        if (channel?.game_id) {
            const gameResponse = await fetch(`https://api.twitch.tv/helix/games?id=${channel.game_id}`, {
                headers: {
                    'Authorization': `Bearer ${tokens.broadcaster.access_token}`,
                    'Client-Id': Bun.env.TWITCH_CLIENT_ID!
                }
            });
            const gameData = await gameResponse.json();
            if (gameData.data && gameData.data.length > 0) {
                gameArt = gameData.data[0].box_art_url.replace('{width}', '285').replace('{height}', '380');
            }
        }

        return {
            title: isLive ? channel?.title : 'Offline',
            gameName: isLive ? channel?.game_name : 'Offline',
            gameArt: gameArt,
            channelName: channel?.broadcaster_name || 'Unknown',
            isLive
        };
    } catch (error) {
        console.error('Error fetching stream info:', error);
        return {
            title: 'Error',
            gameName: 'Error',
            gameArt: '',
            channelName: 'Error'
        };
    }
};