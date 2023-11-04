import cors from 'cors';
import express from 'express';
import WebSocket from 'ws';
import { Bhotianaa } from "./src/Core/Client";
import { ClientMessageFormat, ClientPong, CustomWebSocket, ServerEventNames } from './src/Typings/WebSocket';
import { Kukoro } from './src/Modules/Kukoro';
import { readFileSync, writeFileSync } from 'fs';
import { KukoroData } from './src/Typings/Kukoro';

const app = express();
const client = new Bhotianaa("gianaa_");

app.set('views', './src/views');
app.set('view engine', 'pug');
app.use(express.json());
app.use(cors());
app.get('/:channel/shoutout', (_req, res) => res.render('shoutout'));

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

app.post("/message", (req, res) => {
    client.say(req.body.channel, req.body.message);
    res.send({
        "message": "Message sent to channel successfully"
    });
});

const botServer = app.listen(3000);
const wss = new WebSocket.Server({ server: botServer });
const kukoroPath = './src/Config/Kukoro.json';
const kukoro = new Kukoro(client, wss);

app.get('/kukoro', (_req, res) => {
    res.send(JSON.parse(readFileSync(kukoroPath, 'utf-8')));
})

app.post('/game', (req, res) => {
    let data: KukoroData = JSON.parse(readFileSync(kukoroPath, 'utf-8'));
    let game: string = req.body.game;
    let returningData: KukoroData;;
    if (game == 'Dungeon') {
        data.KukoroModuleToggle = true;
        data.Kukoro.Dungeon.Active = true;
        kukoro.SaveChanges(data);
        returningData = kukoro.ResetDatabase(['Sniper', 'OneTwoThree']);
        kukoro.AnnounceAndSendSocket(returningData, ['!kukoro', '!w !kukoro']);
    } else if (game == 'Sniper') {
        data.KukoroModuleToggle = true;
        data.Kukoro.Sniper.Active = true;
        data.Kukoro.Sniper.FollowMode = true;
        kukoro.SaveChanges(data);
        returningData = kukoro.ResetDatabase(['OneTwoThree', 'Dungeon']);
        kukoro.AnnounceAndSendSocket(returningData, '!kukoro');
    } else if (game == 'OneTwoThree') {
        data.Kukoro.OneTwoThree.Active = true;
        kukoro.SaveChanges(data);
        returningData = kukoro.ResetDatabase(['Dungeon', 'Sniper']);
        kukoro.AnnounceAndSendSocket(returningData, '!kukoro');
    } else if (game == 'idle') {
        returningData = kukoro.ResetDatabase(['Dungeon', 'Sniper', 'OneTwoThree']);
        kukoro.AnnounceAndSendSocket(returningData, "All settings are now reset!");
    }
    res.send("Game changed successfully")
});

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
        else if ('Client' in message && message.Client[0] == "Handshake") {
            let kukoroData = readFileSync(kukoroPath, 'utf-8')
            ws.send(`{ "Server": [ "GG", { "message": ${kukoroData} } ] }`)
        } else if ('Client' in message && message.Client[0] == 'fetchData') {
            let kukoroData = readFileSync(kukoroPath, 'utf-8')
            ws.send(`{ "Server": [ "GG", { "message": ${kukoroData} } ] }`)
        } else if ('Client' in message && message.Client[0] == 'updateToggleData') {
            let kukoroData = JSON.parse(readFileSync(kukoroPath, 'utf-8'));
            if (message.Client[1].message == 'true') kukoroData.KukoroModuleToggle = true
            else kukoroData.KukoroModuleToggle = false;
            writeFileSync(kukoroPath, JSON.stringify(kukoroData, null, 2));
            let mode; // Could be this undefined Better log on client side O_o
            if (kukoroData.KukoroModuleToggle == true) mode = "Kukoro Module turned on"
            else {
                mode = "Kukoro Module turned off";
                kukoro.ResetDatabase(['OneTwoThree', 'Dungeon', 'Sniper'])
            }
            ws.send(`{ "Server": [ "console", { "message": ${mode} } ] }`)
            client.say("#gianaa_", `${mode}`)


        } else if ('Client' in message && message.Client[0] == 'sendMessageAsBot') {
            client.say(`${message.Client[1].channel}`, `${message.Client[1].message}`)
            ws.send(`{ "Server": [ "console", { "message": "Message sent to the channel successfully" } ] }`)
        }
    });

    setInterval(() => ws.send(JSON.stringify({ Ping: "Kya tum yahaan pe ho bhai?" })), 25000)
})

client.Start();