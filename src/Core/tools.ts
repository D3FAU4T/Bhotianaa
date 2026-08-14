import { z } from "zod";
import { tool } from "./Functions";
import { Helix } from "twitch";
import { client, config } from "../../index";

const change_title = tool({
    name: "change_stream_title",
    description: "Changes the stream title on Twitch.",
    parameters: {
        title: z.string().describe("The new stream title.")
    },
    implementation: async ({ title }) => {
        if (!config.env.broadcaster?.access_token) {
            await client.say(`Broadcaster is not logged in.`);
            return;
        }

        const result = await Helix.Channel.patch(
            Bun.env.BROADCASTER_USER_ID,
            { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken: config.env.broadcaster.access_token },
            { title },
        );

        if (result.is_success)
            await client.say(`Title changed to ${title}`);
        else
            await client.say(`Failed to change title: ${String(result.error)}`);
    }
});

const change_game = tool({
    name: "change_stream_game",
    description: "Changes the stream game on Twitch.",
    parameters: {
        gameName: z.string().describe("The new stream game (case-sensitive).")
    },

    implementation: async ({ gameName }) => {
        if (!config.env.broadcaster?.access_token) {
            await client.say(`Broadcaster is not logged in.`);
            return;
        }

        const game = await Helix.Games.get(
            { name: gameName },
            { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken: config.env.app }
        );

        if (game.is_success && game.data[0]) {
            const result = await Helix.Channel.patch(
                Bun.env.BROADCASTER_USER_ID,
                { clientId: Bun.env.TWITCH_CLIENT_ID, accessToken: config.env.broadcaster.access_token },
                { game_id: game.data[0].id },
            );

            if (result.is_success)
                await client.say(`Game changed to ${game.data[0].name}`);
            else
                await client.say(`Failed to change game: ${String(result.error)}`);
        }

        else
            await client.say(`Game not found: ${gameName}`);
    }
});

const define_word = tool({
    name: "define_word",
    description: "Fetches the definition of a word from the dictionary.",
    parameters: {
        word: z.string().describe("The word to define.")
    },
    implementation: async ({ word }) => {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

        if (!res.ok) {
            await client.say(`The server is unreachable. Please try again later.`);
            return;
        }

        const data = await res.json();

        if (Array.isArray(data) && data[0] && data[0].meanings[0] && data[0].meanings[0].definitions[0])
            await client.say(`${word}: ${data[0].meanings[0].definitions[0].definition}`);

        else
            await client.say(`No definition found for ${word}`);
    }
});

export default [change_title, change_game];