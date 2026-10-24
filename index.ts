import { Client, Helix } from "twitch";
import { serve } from "bun";
import { subscribe } from "./src/Core/SubscribingEvents";
import {
    getChatterRole,
    loadDynamicCommands,
    loadSystemCommands,
    revalidateTokens,
    loadTimers,
    checkUpdates,
} from "./src/Core/Functions";

import {
    readTokensSafe,
    handleLogin,
    handleDisconnect,
    handleCallback,
    handleSpotifyLogin,
    handleSpotifyCallback,
    handleSpotifyDisconnect,
    events,
} from "./src/Core/RouteFunctions";

import type { BotState, DynamicCommand, Timer } from "./src/Typings/Bhotianaa";

import dashboardView from "./src/Views/dashboard.html";
import clipsView from "./src/Views/clips.html";

export const config: BotState = {
    timers: new Map<string, NodeJS.Timeout>(),
    streamInfo: {
        game: null,
        startedAt: null,
    },
    commands: {
        system: await loadSystemCommands(),
        dynamic: await loadDynamicCommands(),
    },
    link: null,
    env: await revalidateTokens(),
    wos: {
        enabled: false,
        word: null,
        msgCount: 0,
        msgQueue: [],
    },
};

// Revalidate every hour
setInterval(
    async () => {
        config.env = await revalidateTokens();
    },
    1000 * 60 * 60,
);

export const client = new Client({
    clientId: Bun.env.TWITCH_CLIENT_ID,
    accessToken: config.env?.app,
    broadcasterUserId: Bun.env.BROADCASTER_USER_ID,
    userId: Bun.env.BOT_USER_ID,
});

await subscribe(client);

// Helper to fetch stream info via Helix
export const fetchStreamInfo = async () => {
    try {
        const creds = {
            clientId: Bun.env.TWITCH_CLIENT_ID!,
            accessToken: config.env.app,
        };
        const channelId = Bun.env.BROADCASTER_USER_ID;

        const channelRes = await Helix.Channel.get(channelId, creds);
        if (!channelRes.is_success || !channelRes.data[0]) {
            return {
                title: "Offline",
                gameName: "Not Playing",
                gameArt: "",
                channelName: "Channel",
            };
        }

        const channel = channelRes.data[0];
        const streamRes = await Helix.Stream.get(
            { user_id: [channelId] },
            creds,
        );
        const isLive =
            streamRes.is_success && streamRes.data && streamRes.data.length > 0;

        let gameArt = "";
        if (channel.game_id) {
            const gameRes = await Helix.Games.get(
                { id: [channel.game_id] },
                creds,
            );
            if (gameRes.is_success && gameRes.data && gameRes.data[0]) {
                gameArt = gameRes.data[0].box_art_url
                    .replace("{width}", "285")
                    .replace("{height}", "380");
            }
        }

        return {
            title: isLive ? channel.title : "Offline",
            gameName: channel.game_name || "Offline",
            gameArt: gameArt,
            channelName: channel.broadcaster_name || "Unknown",
            isLive,
        };
    } catch (e) {
        console.error("Error fetching stream info:", e);
        return {
            title: "Error",
            gameName: "Error",
            gameArt: "",
            channelName: "Error",
        };
    }
};

// Dynamic Command Helpers for WebSocket API
const getUniqueDynamicCommands = () => {
    const unique = Array.from(new Set(config.commands.dynamic.values()));
    const commands: Record<string, any> = {};
    for (const cmd of unique) {
        commands[cmd.name] = cmd;
    }
    return commands;
};

// Timer Helpers
export const startTimer = (timer: Timer) => {
    stopTimer(timer.name);
    const intervalId = setInterval(async () => {
        try {
            await client.say(timer.message);
        } catch (e) {
            console.error(`Failed to execute timer !${timer.name}:`, e);
        }
    }, timer.intervalMs);
    config.timers.set(timer.name, intervalId);
};

export const stopTimer = (name: string) => {
    const intervalId = config.timers.get(name);
    if (intervalId) {
        clearInterval(intervalId);
        config.timers.delete(name);
    }
};

const saveTimers = async (timersArray: Timer[]) => {
    const file = Bun.file("./src/Config/timers.json");
    await file.write(JSON.stringify(timersArray, null, 2));
};

const getFrontendTimers = (timersArray: Timer[]) => {
    const timersRecord: Record<string, any> = {};
    for (const t of timersArray) {
        timersRecord[t.name] = {
            name: t.name,
            message: t.message,
            enabled: t.enabled,
            interval: t.intervalMs / (60 * 1000),
        };
    }
    return timersRecord;
};

// Initialize Timers
for (const timer of await loadTimers()) {
    if (timer.enabled) {
        startTimer(timer);
    }
}

// Client Chat Message handler
client.on("channel.chat.message", async (notification) => {
    const message = notification.event.message.text;
    if (process.env.NODE_ENV === "development") console.log(message);

    // Broadcast message to WebSocket chat room
    server.publish(
        "chat",
        JSON.stringify({
            message_id: notification.event.message_id,
            color: notification.event.color,
            chatter_user_name: notification.event.chatter_user_name,
            chatter_user_login: notification.event.chatter_user_login,
            badges: notification.event.badges,
            message: {
                text: message,
            },
        }),
    );

    if (notification.event.chatter_user_id === Bun.env.BOT_USER_ID) return;

    if (config.wos.enabled) {
        config.wos.msgCount++;

        if (config.wos.msgCount >= 7) {
            config.wos.msgCount = 0;
            if (config.wos.word) await client.say(config.wos.word);
        }
    }

    if (message.endsWith(",")) {
        const trimmedMessage = message.slice(0, -1);
        await client.say(trimmedMessage);
        return;
    }

    if (!message.startsWith("!")) return;

    const badges = notification.event.badges.map((badge) => badge.set_id);
    const args = message.slice(1).split(" ");
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const cmdSys = config.commands.system.get(commandName);
    const cmdDyn = config.commands.dynamic.get(commandName);

    const viewerType = getChatterRole(badges);

    if (cmdSys) {
        if (cmdSys.roles.includes(viewerType))
            cmdSys.execute(notification, client, config);
        else
            await client.reply(
                notification.event.message_id,
                `You do not have permission to use this command.`,
            );
    }

    if (cmdDyn) {
        if (cmdDyn.roles.includes(viewerType))
            await client.say(cmdDyn.response);
        else
            await client.reply(
                notification.event.message_id,
                `You do not have permission to use this command.`,
            );
    }
});

// Stream Online handler
client.on("stream.online", async (notification) => {
    config.streamInfo.startedAt = notification.event.started_at;

    const accessToken = config.env.broadcaster?.access_token || config.env.app;
    const result = await Helix.Channel.get(Bun.env.BROADCASTER_USER_ID, {
        clientId: Bun.env.TWITCH_CLIENT_ID,
        accessToken,
    });

    if (!result.is_success || !result.data[0]) return;

    const data = result.data[0];

    // Words On Stream
    if (data.game_id === "512821")
        config.wos = {
            enabled: true,
            msgCount: 0,
            msgQueue: [],
            word: null,
        };

    config.streamInfo.game = {
        id: data.game_id,
        name: data.game_name,
        igdb_id: null,
        box_art_url: "",
    };

    const payload = {
        content: `@everyone My Mamma is live on twitch and streaming ${data.game_name}`,
        embeds: [
            {
                title: "Streaming time!",
                description: `${data.title}`,
                url: "https://twitch.tv/gianaa_",
                color: 11342935,
                thumbnail: {
                    url: "https://assets.stickpng.com/images/580b57fcd9996e24bc43c540.png",
                },
                image: {
                    url: "https://cdn.discordapp.com/attachments/1005205775150481428/1223977843558453258/3.png",
                },
                author: {
                    name: "Gianaa_",
                    icon_url:
                        "https://cdn.discordapp.com/avatars/748141473513603164/e94ba01ce421ec5d483ad9ec8c209e34.webp?size=128",
                },
                footer: {
                    text: "Yay! I created the Embed",
                    icon_url:
                        "https://images-ext-1.discordapp.net/external/xeu1afV92cXfj9ICm7f0Ll52ughrWfj4RR5MHv0S_Kg/https/cdn.discordapp.com/icons/1005194560303013920/581e47ff8e43bd2680c160bf1c21fa33.webp",
                },
                fields: [
                    {
                        name: "Game",
                        value: `${data.game_name}`,
                        inline: true,
                    },
                    { name: "Viewers Count", value: 3, inline: true },
                ],
            },
        ],
    };

    const discordNotification = await fetch(Bun.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!discordNotification.ok) {
        console.error(
            `Failed to send Discord notification: ${discordNotification.status} ${discordNotification.statusText}`,
        );
        return;
    }
});

// Reward Redemption handler
client.on(
    "channel.channel_points_custom_reward_redemption.add",
    async (notification) => {
        if (
            notification.event.reward.id ===
            "fde52afc-7bc1-48ff-9c00-e72a7b2d022d"
        ) {
            const winEmote = "gianaaHi";
            const loseEmote = "gianaaBomb";
            const neutralEmotes = [
                "GlitchCat",
                "PixelBob",
                "LUL",
                "PinkMercy",
                "HSWP",
                "TehePelo",
                "Kappa",
            ];

            const emotePool = [winEmote, loseEmote, ...neutralEmotes];
            const selectedEmote =
                emotePool[Math.floor(Math.random() * emotePool.length)];

            try {
                const pointsFile = Bun.file("./src/Config/points.json");
                let pointsData: Record<string, number> = {};

                if (await pointsFile.exists())
                    pointsData = await pointsFile.json();

                const userId = notification.event.user_id;
                const currentPoints = pointsData[userId] || 0;
                let resultMessage = "";

                if (selectedEmote === winEmote) {
                    pointsData[userId] = currentPoints + 10;
                    resultMessage = `@${notification.event.user_login} ${selectedEmote} You won! +10 points! New balance: ${pointsData[userId]} points`;
                } else if (selectedEmote === loseEmote) {
                    const lostPoints = currentPoints;
                    pointsData[userId] = 0;
                    resultMessage = `@${notification.event.user_login} ${selectedEmote} Oh no! You lost all ${lostPoints} points! Better luck next time!`;
                } else
                    resultMessage = `@${notification.event.user_login} ${selectedEmote} Neutral! No points gained or lost.`;

                await Bun.write(
                    "./src/Config/points.json",
                    JSON.stringify(pointsData, null, 2),
                );
                await client.say(resultMessage);
            } catch (error) {
                console.error("Error processing gamble:", error);
                await client.say(
                    `@${notification.event.user_login} Sorry, something went wrong with the gamble!`,
                );
            }
        }
    },
);

// Connect Twitch Client
client.connect().catch(console.error);

// HTTP / WS Server
export const server = serve({
    port: Bun.env.PORT || 3000,
    development: Bun.env.NODE_ENV === "development",
    routes: {
        "/": dashboardView,
        "/clips": clipsView,
        "/whoami": async () => {
            const tokens = await readTokensSafe();
            return Response.json({
                broadcaster: tokens.broadcaster
                    ? { id: tokens.broadcaster.user_id }
                    : null,
                bot: null,
                spotify: tokens.spotify
                    ? {
                          id: tokens.spotify.user?.id || "Connected",
                          name:
                              tokens.spotify.user?.display_name ||
                              tokens.spotify.user?.id ||
                              "Connected",
                      }
                    : null,
            });
        },
        "/auth/login/:type": handleLogin,
        "/auth/disconnect/:type": { POST: handleDisconnect },
        "/auth/callback": handleCallback,
        "/auth/spotify/login": handleSpotifyLogin,
        "/auth/spotify/callback": handleSpotifyCallback,
        "/auth/spotify/disconnect": { POST: handleSpotifyDisconnect },
    },

    websocket: {
        data: {} as {
            room: "clips" | "chat" | "commands" | "timers";
            heartbeatInterval?: NodeJS.Timeout;
        },
        async open(ws) {
            ws.subscribe(ws.data.room);

            if (ws.data.room === "commands") {
                ws.send(
                    JSON.stringify({
                        type: "allCommands",
                        commands: getUniqueDynamicCommands(),
                    }),
                );

                const sysCommands: Record<string, any> = {};
                for (const cmd of Array.from(
                    new Set(config.commands.system.values()),
                )) {
                    sysCommands[cmd.name] = {
                        name: cmd.name,
                        description: cmd.description,
                        aliases: cmd.aliases || [],
                        moderatorOnly:
                            cmd.roles.includes("moderator") ||
                            cmd.roles.includes("lead_moderator") ||
                            cmd.roles.includes("broadcaster"),
                    };
                }
                ws.send(
                    JSON.stringify({
                        type: "systemCommands",
                        commands: sysCommands,
                    }),
                );

                const streamInfo = await fetchStreamInfo();
                ws.send(
                    JSON.stringify({ type: "streamInfo", data: streamInfo }),
                );
            } else if (ws.data.room === "timers") {
                const timers = await loadTimers();
                ws.send(
                    JSON.stringify({
                        type: "allTimers",
                        timers: getFrontendTimers(timers),
                    }),
                );
            }

            ws.data.heartbeatInterval = setInterval(() => ws.send("6"), 30000);
        },
        async message(ws, message) {
            const messageStr = message.toString();
            if (messageStr === "9") return;

            const data = JSON.parse(messageStr);

            if (ws.data.room === "chat") {
                if (data.message) {
                    if (data.replyParentMessageId) {
                        await client.reply(
                            data.replyParentMessageId,
                            data.message,
                        );
                    } else {
                        await client.say(data.message);
                    }
                }
            } else if (ws.data.room === "commands") {
                if (data.action === "getDynamicCommands") {
                    ws.send(
                        JSON.stringify({
                            type: "allCommands",
                            commands: getUniqueDynamicCommands(),
                        }),
                    );
                } else if (data.action === "getSystemCommands") {
                    const sysCommands: Record<string, any> = {};
                    for (const cmd of Array.from(
                        new Set(config.commands.system.values()),
                    )) {
                        sysCommands[cmd.name] = {
                            name: cmd.name,
                            description: cmd.description,
                            aliases: cmd.aliases || [],
                            moderatorOnly:
                                cmd.roles.includes("moderator") ||
                                cmd.roles.includes("lead_moderator") ||
                                cmd.roles.includes("broadcaster"),
                        };
                    }
                    ws.send(
                        JSON.stringify({
                            type: "systemCommands",
                            commands: sysCommands,
                        }),
                    );
                } else if (data.action === "create") {
                    const { name, response, createdBy, aliases, roles } = data;
                    if (
                        config.commands.dynamic.has(name) ||
                        config.commands.system.has(name)
                    ) {
                        ws.send(
                            JSON.stringify({ error: "Command already exists" }),
                        );
                        return;
                    }
                    const newCommand: DynamicCommand = {
                        name,
                        response,
                        roles: roles || [
                            "broadcaster",
                            "moderator",
                            "lead_moderator",
                            "subscriber",
                            "vip",
                            "viewer",
                        ],
                        aliases: aliases || null,
                        createdBy,
                        createdAt: new Date().toISOString(),
                    };
                    config.commands.dynamic.set(name, newCommand);
                    for (const alias of newCommand.aliases ?? [])
                        config.commands.dynamic.set(alias, newCommand);

                    const file = Bun.file("./src/Config/dynamic-commands.json");
                    const commands: DynamicCommand[] = await file.json();
                    commands.push(newCommand);
                    await file.write(JSON.stringify(commands, null, 2));

                    server.publish(
                        "commands",
                        JSON.stringify({
                            type: "allCommands",
                            commands: getUniqueDynamicCommands(),
                        }),
                    );
                } else if (data.action === "update") {
                    const { name, response, aliases, roles } = data;
                    const command = config.commands.dynamic.get(name);
                    if (!command) {
                        ws.send(JSON.stringify({ error: "Command not found" }));
                        return;
                    }
                    // Delete old aliases from memory
                    for (const alias of command.aliases ?? [])
                        config.commands.dynamic.delete(alias);

                    command.response = response;
                    command.aliases = aliases || null;
                    command.roles = roles || [
                        "broadcaster",
                        "moderator",
                        "lead_moderator",
                        "subscriber",
                        "vip",
                        "viewer",
                    ];

                    config.commands.dynamic.set(command.name, command);
                    for (const alias of command.aliases ?? [])
                        config.commands.dynamic.set(alias, command);

                    const file = Bun.file("./src/Config/dynamic-commands.json");
                    const commands: DynamicCommand[] = await file.json();
                    const commandIndex = commands.findIndex(
                        (c) => c.name === command.name,
                    );
                    if (commandIndex !== -1) {
                        commands[commandIndex] = command;
                        await file.write(JSON.stringify(commands, null, 2));
                    }
                    server.publish(
                        "commands",
                        JSON.stringify({
                            type: "allCommands",
                            commands: getUniqueDynamicCommands(),
                        }),
                    );
                } else if (data.action === "delete") {
                    const { name } = data;
                    const command = config.commands.dynamic.get(name);
                    if (!command) {
                        ws.send(JSON.stringify({ error: "Command not found" }));
                        return;
                    }
                    config.commands.dynamic.delete(command.name);
                    for (const alias of command.aliases ?? [])
                        config.commands.dynamic.delete(alias);

                    const file = Bun.file("./src/Config/dynamic-commands.json");
                    const commands: DynamicCommand[] = await file.json();
                    const updatedCommands = commands.filter(
                        (c) => c.name !== command.name,
                    );
                    await file.write(JSON.stringify(updatedCommands, null, 2));

                    server.publish(
                        "commands",
                        JSON.stringify({
                            type: "allCommands",
                            commands: getUniqueDynamicCommands(),
                        }),
                    );
                }
            } else if (ws.data.room === "timers") {
                if (data.action === "getAll") {
                    const timers = await loadTimers();
                    ws.send(
                        JSON.stringify({
                            type: "allTimers",
                            timers: getFrontendTimers(timers),
                        }),
                    );
                } else if (data.action === "create") {
                    const { name, message, interval } = data;
                    const intervalMs = interval * 60 * 1000;
                    const timers = await loadTimers();
                    if (timers.some((t) => t.name === name)) {
                        ws.send(
                            JSON.stringify({ error: "Timer already exists" }),
                        );
                        return;
                    }
                    const newTimer: Timer = {
                        name,
                        message,
                        enabled: true,
                        intervalMs,
                    };
                    timers.push(newTimer);
                    await saveTimers(timers);
                    startTimer(newTimer);
                    server.publish(
                        "timers",
                        JSON.stringify({
                            type: "allTimers",
                            timers: getFrontendTimers(timers),
                        }),
                    );
                } else if (data.action === "update") {
                    const { name, message, interval } = data;
                    const intervalMs = interval * 60 * 1000;
                    const timers = await loadTimers();
                    const timer = timers.find((t) => t.name === name);
                    if (!timer) {
                        ws.send(JSON.stringify({ error: "Timer not found" }));
                        return;
                    }
                    timer.message = message;
                    timer.intervalMs = intervalMs;
                    await saveTimers(timers);
                    if (timer.enabled) {
                        startTimer(timer);
                    }
                    server.publish(
                        "timers",
                        JSON.stringify({
                            type: "allTimers",
                            timers: getFrontendTimers(timers),
                        }),
                    );
                } else if (data.action === "toggle") {
                    const { name } = data;
                    const timers = await loadTimers();
                    const timer = timers.find((t) => t.name === name);
                    if (!timer) {
                        ws.send(JSON.stringify({ error: "Timer not found" }));
                        return;
                    }
                    timer.enabled = !timer.enabled;
                    await saveTimers(timers);
                    if (timer.enabled) {
                        startTimer(timer);
                    } else {
                        stopTimer(name);
                    }
                    server.publish(
                        "timers",
                        JSON.stringify({
                            type: "allTimers",
                            timers: getFrontendTimers(timers),
                        }),
                    );
                } else if (data.action === "delete") {
                    const { name } = data;
                    const timers = await loadTimers();
                    const updated = timers.filter((t) => t.name !== name);
                    await saveTimers(updated);
                    stopTimer(name);
                    server.publish(
                        "timers",
                        JSON.stringify({
                            type: "allTimers",
                            timers: getFrontendTimers(updated),
                        }),
                    );
                }
            }
        },
        close(ws, _code, _reason) {
            if (ws.data.heartbeatInterval)
                clearInterval(ws.data.heartbeatInterval);

            ws.unsubscribe(ws.data.room);
        },
    },

    fetch(req, server) {
        const url = new URL(req.url);

        // Handle WebSocket upgrades
        if (url.pathname === "/socket/clips") {
            if (server.upgrade(req, { data: { room: "clips" } })) return;
            return new Response("Upgrade Required", { status: 426 });
        } else if (url.pathname === "/socket/chat") {
            if (server.upgrade(req, { data: { room: "chat" } })) return;
            return new Response("Upgrade Required", { status: 426 });
        } else if (url.pathname === "/socket/commands") {
            if (server.upgrade(req, { data: { room: "commands" } })) return;
            return new Response("Upgrade Required", { status: 426 });
        } else if (url.pathname === "/socket/timers") {
            if (server.upgrade(req, { data: { room: "timers" } })) return;
            return new Response("Upgrade Required", { status: 426 });
        }

        // Static File Server Fallback
        let filePath = "";
        if (url.pathname.startsWith("/src/")) {
            filePath = "." + url.pathname;
        } else if (url.pathname === "/globals.css") {
            filePath = "./src/Views/globals.css";
        }

        if (filePath) {
            const file = Bun.file(filePath);
            return new Response(file);
        }

        return new Response("Not Found", { status: 404 });
    },

    error(error) {
        console.error("Server error:", error);

        return Response.json(
            {
                error: "Internal Server Error",
                message:
                    Bun.env.NODE_ENV === "development"
                        ? error.message
                        : "Something went wrong",
            },
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
    },
});

// React Auth event connection refresh
events.on("auth:update", async () => {
    console.log("🔄 Auth updated! Reloading config...");
    config.env = await revalidateTokens();
    if (client && config.env) {
        // @ts-ignore
        client.options.accessToken = config.env.app;
    }
});

console.log(
    `Local server running on ${server.url}\nTo terminate the app, press Ctrl+C\n`,
);

// Run update checks on startup
await checkUpdates().catch(console.error);
