import { ChatUserstate } from "tmi.js";
import { Bhotianaa } from "../Core/Client";

type RunOptions = {
  Channel: string;
  UserState: ChatUserstate;
  Message: string;
  Self: boolean;
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