import type { TwitchUser } from "./TwitchAPI";
import type { ChatUserstate } from "./EventSub.d";

export interface BotState {
    bigWord: string | null;
    bigWordActive: boolean;
    bigWordMessageCount: number;
    temporaryLink: string | null;
}

export interface CommandContext {
    channel: string;
    userstate: ChatUserstate;
    message: string;
    args: string[];
}

export interface ICommand {
    name: string;
    description: string;
    aliases?: string[];
    moderatorOnly?: boolean;
    streamerOnly?: boolean;
    execute(context: CommandContext, client: any): Promise<void> | void;
}

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
    interval: number; // in minutes
    enabled: boolean;
}