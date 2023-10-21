import cors from 'cors';
import express from 'express';
import WebSocket from 'ws';
import { Bhotianaa } from "./src/Core/Client";
import { ClientMessageFormat, ClientPong, CustomWebSocket, ServerEventNames } from './src/Typings/WebSocket';

const app = express();

app.set('views', './src/views');
app.set('view engine', 'pug');
app.use(express.json());
app.use(cors());
app.get('/:channel/shoutout', (_req, res) => res.render('shoutout'));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const botServer = app.listen(3000);
const wss = new WebSocket.Server({ server: botServer });

wss.on('connection', (ws: CustomWebSocket) => {
    const messageCreator = (eventName: ServerEventNames, message: string) => JSON.stringify({
        Server: [
            eventName,
            { message }
        ]
    });

    ws.send(messageCreator('Hai bhai', 'Requesting Channel name'));

    ws.on('message', res => {
        let message: ClientMessageFormat | ClientPong = JSON.parse(res.toString());
        if ( 'Pong' in message && message.Pong === 'Sim bhai, estou aqui!') return;
        else if ( 'Client' in message && message.Client[0] == 'Ola bhai') {
            ws.channel = message.Client[1].channel;
            ws.send(messageCreator('GG bhai', 'Successfully added the channel, await for information'));
        }
    });

    setInterval(() => ws.send(JSON.stringify({ Ping: "Kya tum yahaan pe ho bhai?" })), 25000)
})

const client = new Bhotianaa("gianaa_");
client.Start();