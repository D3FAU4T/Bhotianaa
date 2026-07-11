import type { Client, Helix } from "twitch";
import type { TwitchAuth } from "./TwitchAPI";
import type { EventSubNotification } from "twitch/src/types/EventSub";

type Unwrapped = Awaited<ReturnType<typeof Helix.Games.get>>;
type ExtractData<T> = T extends { is_success: true; data: infer D } ? D : never;

type MessageQueue = {
    userName: string;
    message: string;
    timestamp: number;
}

export interface BotState {
    link: string | null;
    timers: Map<string, NodeJS.Timeout>;
    streamInfo: {
        game: ExtractData<Unwrapped>[0] | null;
        startedAt: string | null;
    };
    commands: {
        system: Map<string, Command>;
        dynamic: Map<string, DynamicCommand>;
    };
    env: TokenEnv;
    wos: {
        enabled: boolean;
        word: string | null;
        msgCount: number;
        msgQueue: MessageQueue[];
    }
}

const TwitchRoles = [
    "broadcaster",
    "lead_moderator",
    "moderator",
    "subscriber",
    "vip",
    "viewer"
] as const;

export type TwitchRole = (typeof TwitchRoles)[number];

export type Command = {
    name: string;
    description: string;
    aliases: string[] | null;
    roles: TwitchRole[];
    execute(
        notification: EventSubNotification<"channel.chat.message">,
        client: Client,
        sharedContext: BotState
    ): Promise<void> | void;
}

export type DynamicCommand = Pick<Command, "name" | "aliases" | "roles"> & {
    response: string;
    createdBy: string;
    createdAt: string;    
};

export interface DynamicCommand {
    name: string;
    response: string;
    createdBy: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Timer {
    name: string;
    message: string;
    intervalMs: number; // in minutes
    enabled: boolean;
}

export interface TokenEnv {
    broadcaster: TwitchAuth;
    app: string;
}