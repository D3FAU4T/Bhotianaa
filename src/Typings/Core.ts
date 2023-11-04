import WebSocket from "ws";
import { ChatUserstate } from "tmi.js";
import { Bhotianaa } from "../Core/Client";
import { IncomingMessage } from "http";

type RunOptions = {
  Channel: string;
  UserState: ChatUserstate;
  Message: string;
}

export interface CommandsInterface {
  Name: string;
  Description: string;
  Run: (Options: RunOptions, Client: Bhotianaa) => void;
}

export interface CommandsInterfaceDefault {
  Name: string;
  Description: string;
  Run: (Options: RunOptions, Client: Bhotianaa) => void;
}

export type AnnounceColors = 'blue' | 'green' | 'orange' | 'purple' | 'primary'

export const LogErrorPath = './src/Logs/Error.log';

export interface BotOptions {
  WebSocket: WebSocket.Server<typeof WebSocket, typeof IncomingMessage> | null
}