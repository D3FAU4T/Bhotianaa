import type { TwitchUser } from "./TwitchAPI";

export interface Scopes {
    broadcaster: string[];
    app: string[];
}

interface whoamiBase extends TwitchUser {
    token: string;
}

export interface whoamiData {
    app: whoamiBase;
    broadcaster: whoamiBase;
}

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
    execute(context: CommandContext, client: Bhotianaa): Promise<void> | void;
}

export interface DynamicCommand {
    name: string;
    response: string;
    createdBy: string;
    createdAt: string;
}