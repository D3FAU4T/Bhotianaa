import { z } from "zod";
import { Auth } from "twitch";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import type { TokenEnv, Command, DynamicCommand, Timer } from '../Typings/Bhotianaa';
import type { ChatCompletion } from "openai/resources/chat/completions";

interface Operation {
    readonly result: number;
    readonly expression: string;
}

export const findMathExpression = (nums: readonly number[], exprs: readonly string[], target: number): string | null => {
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

export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
};

export const revalidateTokens = async () => {
    const envFile = Bun.file("./src/Config/tokens.json");
    const env: TokenEnv = await envFile.json();

    let isValid = await Auth.validate(env.broadcaster.access_token);

    if (!isValid) {
        console.warn("Broadcaster access token is invalid or expired. Fetching a new one...");
        const newToken = await Auth.refreshTokenFlow({
            clientId: Bun.env.TWITCH_CLIENT_ID,
            clientSecret: Bun.env.TWITCH_CLIENT_SECRET,
            refreshToken: env.broadcaster.refresh_token,
        });

        if ('error' in newToken) {
            throw new Error(`Failed to refresh broadcaster access token: ${newToken.error} - ${newToken.message}`);
        }

        env.broadcaster = newToken;

        await envFile.write(JSON.stringify(env));
    }

    isValid = await Auth.validate(env.app);

    if (!isValid) {
        console.warn("App access token is invalid or expired. Fetching a new one...");
        const newToken = await Auth.clientCredentialGrantFlow({
            clientId: Bun.env.TWITCH_CLIENT_ID,
            clientSecret: Bun.env.TWITCH_CLIENT_SECRET,
        });

        if ('error' in newToken) {
            throw new Error(`Failed to refresh app access token: ${newToken.error} - ${newToken.message}`);
        }

        env.app = newToken.access_token;

        await envFile.write(JSON.stringify(env));
    }

    return env;
}

export const loadSystemCommands = async () => {
    const systemCommands = new Map<string, Command>();
    const commandsDir = "./src/Commands";
    const allFiles = await readdir(commandsDir);
    const importPromises = allFiles
        .filter(file => file.endsWith(".ts"))
        .map(file => import(join(process.cwd(), commandsDir, file)));

    const commandModules = await Promise.all(importPromises);

    for (const module of commandModules) {
        const command: Command = module.default;
        systemCommands.set(command.name, command);
        if (command.aliases)
            for (const alias of command.aliases)
                systemCommands.set(alias, command);
    }

    return systemCommands;
}

export const loadDynamicCommands = async () => {
    const dynamicCommands = new Map<string, DynamicCommand>();
    const file = Bun.file("./src/Config/dynamic-commands.json");
    const commands: DynamicCommand[] = await file.json();

    for (const command of commands) {
        dynamicCommands.set(command.name, command);
        if (command.aliases)
            for (const alias of command.aliases)
                dynamicCommands.set(alias, command);
    }

    return dynamicCommands;
}

export const loadTimers = async () => {
    const file = Bun.file("./src/Config/timers.json");
    const timers: Timer[] = await file.json();
    return timers;
}

export const getChatterRole = (badges: string[]) => {
    if (badges.includes('broadcaster'))
        return 'broadcaster';

    if (badges.includes('lead_moderator'))
        return 'lead_moderator';

    if (badges.includes('moderator'))
        return 'moderator';

    if (badges.includes('subscriber'))
        return 'subscriber';

    if (badges.includes('vip'))
        return 'vip';

    return 'viewer';
}

interface ToolDefinition<T extends z.ZodRawShape> {
    name: string;
    description: string;
    parameters: T;
    implementation: (args: z.infer<z.ZodObject<T>>) => any | Promise<any>;
}

export const tool = <T extends z.ZodRawShape>(def: ToolDefinition<T>) => {
    const schema = z.object(def.parameters);

    const rawJsonSchema = schema.toJSONSchema();

    const { $schema, ...parameters } = rawJsonSchema;

    return {
        name: def.name,
        openAiSchema: {
            type: "function",
            function: {
                name: def.name,
                description: def.description,
                parameters,
            }
        },

        execute: async (argsString: string) => {
            const parsedArgs = JSON.parse(argsString);
            const validArgs = schema.parse(parsedArgs);
            return await def.implementation(validArgs);
        }
    }
}

type AiOpts = {
    model: string;
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    tools?: ReturnType<typeof tool>[];
    max_tokens?: number;
}

export const act = async (opts: AiOpts) => {
    const url = "http://192.168.0.199:8000/v1/chat/completions";

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: opts.model,
            messages: opts.messages,
            tools: opts.tools?.map(tool => tool.openAiSchema),
            tool_choice: "auto",
            max_output_tokens: opts.max_tokens ?? 50
        })
    });

    if (!res.ok) {
        console.error(`API Error: ${res.status} ${res.statusText}`);
        return;
    }

    const data = await res.json() as ChatCompletion;
    
    if (data.choices[0]) {
        const message = data.choices[0].message;

        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                // @ts-ignore
                const toolName = toolCall.function.name;
                // @ts-ignore
                const toolArgs = toolCall.function.arguments;

                const toolToExecute = opts.tools?.find(t => t.name === toolName);

                if (toolToExecute) {
                    await toolToExecute.execute(toolArgs);
                    return;
                }
                
                else
                    console.warn(`Tool "${toolName}" not found in provided tools.`);                
            }
        }

        else
            return message;
    }
}

export const checkUpdates = async (): Promise<void> => {
    try {
        console.log('🔍 Checking for updates...');

        const fetchProc = Bun.spawn(['git', 'fetch']);
        await fetchProc.exited;

        if (fetchProc.exitCode !== 0) {
            console.warn('⚠️ Failed to fetch updates from git remote.');
            return;
        }

        const statusProc = Bun.spawn(['git', 'rev-list', '--count', 'HEAD..origin/main']);
        const text = await new Response(statusProc.stdout).text();
        await statusProc.exited;

        const behindCount = parseInt(text.trim());

        if (!isNaN(behindCount) && behindCount > 0) {
            console.log(`\n📢 \x1b[32mUPDATE AVAILABLE\x1b[0m: You are behind by ${behindCount} commits.`);
            console.log(`   👉 Run \x1b[36mbun run update\x1b[0m or \x1b[36m./Update.ps1\x1b[0m to update.\n`);
        } else {
            console.log('✅ Bot is up to date.');
        }

    } catch (error) {
        console.error('Failed to check for updates:', error);
    }
};