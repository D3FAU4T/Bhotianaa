import WebSocket from "ws";

export interface CustomWebSocket extends WebSocket {
    channel?: string;
}

export interface ClientPong {
    Pong: "Sim bhai, estou aqui!"
};

export interface ServerPing {
    Ping: "Kya tum yahaan pe ho bhai?"
};

export type ServerEventNames = "Hai bhai" | "GG bhai" | "GG" | "console";
type ClientEventNames = "Ola bhai" | "Handshake" | "fetchData" | "updateToggleData" | "sendMessageAsBot";

interface ServerMessageFormat {
    Server: [
        ServerEventNames,
        { message: string }
    ]
}

export interface ClientMessageFormat {
    Client: [
        ClientEventNames,
        { channel: string; message?: string }
    ]
}

