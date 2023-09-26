/* Libraries required */
import { ChatUserstate, Client } from 'tmi.js';
import { readFileSync, writeFileSync } from 'fs';
import axios from 'axios';
import express from 'express';
import WebSocket from 'ws';
import cors from 'cors'
import { kukoroData, messageHandlerExclamation, messageHandlerWithoutExclamation, reset } from './src/Modules/kukoro';
import { 
  define, uptime, setgame,
  shoutout, setTitle, followage, cmds,
  ToTitleCase, announceText
} from './src/Modules/Stream';

interface ownWebSocket extends WebSocket {
  channel?: string;
}

/* Twitch authentication and login */
const client = new Client({
  options: { debug: true },
  connection: { reconnect: true, secure: true },
  identity: {
    username: "bhotianaa_",
    password: process.env['password']
  },
  channels: ['gianaa_']
});

client.connect().catch(console.error);

/* 24/7 online code */
const app = express();
app.set('views', './views');
app.set('view engine', 'pug');
app.use(express.json())
app.use(cors())
app.get("/", (_req, res) => res.send("Hoyaaaa"))
app.get('/:channel/shoutout', (_req, res) => {
  res.render('shoutout');
});

app.post("/message", (req, res) => {
  client.say(req.body.channel, req.body.message)
  res.send({
    "message": "Message sent to channel successfully"
  })
})

app.get('/kukoro', (_req, res) => {
  let data: kukoroData = JSON.parse(readFileSync('./src/Resources/Kukoro.json', 'utf-8'));
  res.send(data)
})

app.post('/game', (req, res) => {
  let data: kukoroData = JSON.parse(readFileSync('./src/Resources/Kukoro.json', 'utf-8'));
  let game: string = req.body.game;
  let returningData: kukoroData;;
  if (game == 'dungeon') {
    data.kukoroModuleToggle = true;
    data.kukoro.dungeon.active = true;
    writeFileSync('./src/Resources/Kukoro.json', JSON.stringify(data, null, 2))
    returningData = reset(['sniper', 'oneTwoThree']);
    client.say("#gianaa_", `!kukoro`);
    client.say("#gianaa_", `!w !kukoro`);
    websocketData(returningData);
  } else if (game == 'sniper') {
    data.kukoroModuleToggle = true;
    data.kukoro.sniper.active = true;
    data.kukoro.sniper.followMode = true;
    writeFileSync('./src/Resources/Kukoro.json', JSON.stringify(data, null, 2));
    returningData = reset(['oneTwoThree', 'dungeon']);
    websocketData(returningData);
    client.say("#gianaa_", `!kukoro`);
  } else if (game == 'oneTwoThree') {
    data.kukoro.oneTwoThree.active = true;
    writeFileSync('./src/Resources/Kukoro.json', JSON.stringify(data, null, 2))
    returningData = reset(['dungeon', 'sniper']);
    client.say("#gianaa_", `!kukoro`);
    websocketData(returningData);
  } else if (game == 'idle') {
    returningData = reset(['dungeon', 'sniper', 'oneTwoThree']);
    client.say("#gianaa_", "All settings are now reset!");
    websocketData(returningData);
  }
  res.send("Game changed successfully")
})

const botServer = app.listen(6969);
const wssDemo = new WebSocket.Server({ server: botServer });
wssDemo.on('connection', onConnection);

let links: { [channel: string]: string } = JSON.parse(readFileSync("./src/Resources/Links.json", 'utf-8'));

let BigWords: { [channel: string]: string[] } = {};
let bwlastmessage: { [channel: string]: string } = {};
let countCodeActive: { [channel: string]: boolean } = { "#gianaa_": false };
let msgcount: { [channel: string]: number } = { "#gianaa_": 0 };
let twitchMessage: { [channel: string]: string } = {};
let twitchUserstate: { [channel: string]: ChatUserstate } = {};
let plus: { [channel: string]: string } = { "#gianaa_": "-" };
let pluslastmessage: { [channel: string]: string } = {};

/* Simple command and response handler */
client.on("message", async (channel, userstate, message, self) => {
  
  let kukoroModuleToggle: kukoroData = JSON.parse(readFileSync('./src/Resources/Kukoro.json', 'utf-8'));

  /* Kukoro Module */
  if (kukoroModuleToggle.kukoroModuleToggle == true) { // Extension toggle switch

    let data_wex = await messageHandlerWithoutExclamation(channel, userstate, message, self) // Commands handler
    if (data_wex != undefined) { // To prevent crash
      data_wex.messages.forEach(msg => client.say(channel, msg)) // Send returned messages to chat
      websocketData(data_wex.websocket) // Send returned Settings to websocket
    }
    let data_ex = await messageHandlerExclamation(channel, userstate, message, self) // Commands handler
    if (data_ex != undefined) { // To prevent crash
      data_ex.messages.forEach(msg => client.say(channel, msg)) // Send returned messages to chat
      websocketData(data_ex.websocket) // Send returned Settings to websocket
    }
  }
  /* Kukoro module */

  if (self) return;
  const args = message.toLowerCase().substring(1).split(' ');

  if (message.toLowerCase()) {
    msgcount[channel] += 1
    twitchMessage[channel] = message
    twitchUserstate[channel] = userstate
  }
  if (message == ']' || message == '[' || message == ')') countCodeActive[channel] = false;

  if (countCodeActive[channel] == true && msgcount[channel] == 7) {
    if (bwlastmessage[channel] === `${BigWords[channel].join(' ')}`) {
      client.say(channel, `Nerdge letters --> ${BigWords[channel].join(' ')}ㅤ`);
      bwlastmessage[channel] = `${BigWords[channel].join(' ')}ㅤ`;
      msgcount[channel] = 0;
    } else {
      client.say(channel, `Nerdge letters --> ${BigWords[channel].join(' ')}`);
      bwlastmessage[channel] = `${BigWords[channel].join(' ')}`;
      msgcount[channel] = 0;
    }
  }

  if (message.toLowerCase().includes('/') || !message.endsWith(plus[channel])) return;
  const repeatArgs = message.replace(new RegExp(plus[channel], 'g'), '').split(' ');

  if (pluslastmessage[channel] === repeatArgs[0]) {
    client.say(channel, ToTitleCase(repeatArgs[0]));
    pluslastmessage[channel] = ToTitleCase(repeatArgs[0])
  } else {
    client.say(channel, repeatArgs[0]);
    pluslastmessage[channel] = repeatArgs[0]
  }
});

// Shoutout command
client.on('message', async (channel, userstate, message, self) => {
  if (self || !message.startsWith('!')) return;
  const args: string[] = message.replace(/@/g, '').substring(1).split(' ');
  const argsR: string[] = message.slice(1).split(' ');
  const command = args.shift()?.toLowerCase();
  const commandUseless = argsR.shift()?.toLowerCase();

  let isMod = userstate.mod || userstate['user-type'] === 'mod';
  let isBroadcaster = channel.slice(1) === userstate.username;
  let isModUp = isMod || isBroadcaster;

  if (command === 'link' || command === 'mirror') {
    if (!args.length) client.say(channel, links[channel]); else {
      if (userstate.username == 'gianaa_' || userstate.username == 'd3fau4t') {
        links[channel] = args.join(' ');
        writeFileSync("./src/Resources/Links.json", JSON.stringify(links))
        if (userstate.username == 'gianaa_') client.say(channel, `Updated the link, mamma ☺️`)
        else if (userstate.username == 'd3fau4t') client.say(channel, `Updated the link, pappa 🙃`)
        else client.say(channel, `Updated the link`)
      }
    }
  }
  else if (command == 'bonk') !args.length ? client.say(channel, `/me BOP Take that, ${userstate.username}! Punch`) : client.say(channel, `/me BOP Take that, ${args[0]}! Punch`)

  else if (command === 'bw') {
    countCodeActive[channel] = true;
    BigWords[channel] = args.join(' ').toUpperCase().replace(/\p{Emoji}/gu, '').split('');
    const data = await announceText(BigWords[channel].join(' '), 'blue');
    if (!data) client.say(channel, `Nerdge letters --> ${BigWords[channel].join(' ')}ㅤ`);
    msgcount[channel] = 0;
    bwlastmessage[channel] = `${BigWords[channel].join(' ')}`;
  } else if (command == 'live' && channel == '#gianaa_') {
    axios.get("https://d3fau4tbot-discord.lampadati-hurrican.repl.co/live/gianaa_")
      .then(res => client.say(channel, `${res.data}`))
      .catch(err => console.error(err));
  } else if (command == 'define') client.say(channel, await define(args[0]))
    
  else if (command == 'so') {
    if (!isModUp || !args[0]) return;

    axios
      .get(`https://streamgood.gg/shoutout/api?channel=${args[0]}&mode=random&last_game=true&max_length=60&filter_long_videos=true`)
      .then(res => {
        if (res.data === "") return;
        wssDemo.clients.forEach((client: ownWebSocket) => {
          if (client.hasOwnProperty("channel")) {
            if (client.channel === channel.slice(1)) {
              client.send(`{ "Server": ["Mostrar bhai", ${JSON.stringify(res.data)} ] }`)
            }
          }
        })
      })
      .catch(err => {
        console.error(err.response.data.errors)
      })

    let gameName = await shoutout(args[0])
    !gameName.length ? client.say(channel, `This is ${args[0]}. ${args[0]} joined my stream today. Be like ${args[0]} Okayge Check them out on https://www.twitch.tv/${args[0]} !`) : client.say(channel, `Everybody look at ${args[0]} on https://www.twitch.tv/${args[0]}. Look at them now! Pepega They were last seen playing ${gameName}!`)
  }

  else if (command == 'settitle') {
    if (!isModUp) return;
    let data = await setTitle(argsR.join(' '), "518259240");
    if (userstate.username == 'gianaa_') client.say(channel, `Mamma, updated the title to: ${data}`)
    else if (userstate.username == 'd3fau4t') client.say(channel, `Papai, new title: ${data}`)
    else client.say(channel, `Title updated to: ${data}`)

  }
  else if (command == 'setgame') {
    let game = await setgame(argsR.join(' ').toLowerCase(), "518259240")
    if (userstate.username == 'gianaa_') client.say(channel, `Mamma, changed the game to ${game}`)
    else if (userstate.username == 'd3fau4t') client.say(channel, `Papai, Mamma is playing new game: ${game} VoHiYo`)
    else client.say(channel, `Game updated to: ${game}`)

  } else if (command == 'followage') {
    if (!argsR.length) {
      if (userstate.username == 'gianaa_') return client.say(channel, `Mamma, you cannot follow yourself! :|`)
      let data = await followage(userstate.username as string, "gianaa_")
      client.say(channel, `${userstate.username} has been following my mamma for ${data}`)
    } else {
      if (argsR.join(' ').replace("@", "") == 'gianaa_') return client.say(channel, `My mamma has been following my mamma for... wait wtf, my mamma cannot follow herself UHMDude`)
      let data = await followage(argsR.join(' '), "gianaa_")
      client.say(channel, `${argsR.join(' ').replace("@", "")} has been following my mamma for ${data}.`)
    }
  } else if (command == 'uptime') {
    let data = await uptime("gianaa_")
    if (data == 'gianaa_ is offline') client.say(channel, `Shhh, my mamma is sleeping, do not disturb her`)
    else client.say(channel, `My mamma has been live for ${data} blobDance`)
  } else if (command == 'death') {
    let data = JSON.parse(readFileSync("./src/Resources/metadata.json", 'utf-8'));
    if (argsR[0] == 'reset') data.counters['fall guys'] = 0;
    else data.counters['fall guys'] += 1;
    writeFileSync("./src/Resources/metadata.json", JSON.stringify(data, null, 2));
    if (data.counters['fall guys'] == 0) client.say(channel, `The times my mamma died is... no my mamma never died UHMDude`);
    else client.say(channel, `WHO KILLED MY MAMMA??? She died ${data.counters['fall guys']} times 🔪🔪`)
  }
});

client.on("message", (channel, userstate, message, self) => {
  let ans = cmds(channel, userstate, message, self)
  if (ans === undefined) return;
  client.say(channel, ans)
});

function onConnection(ws: ownWebSocket, _req: any) {
  ws.send(`{ "Server": ["Hai bhai", {"message" : "Requesting Channel name"}]}`);
  ws.on('message', async function(res) {
    let message = await JSON.parse(res.toString());
    if (message.Pong === 'Sim bhai, estou aqui!') return;
    if (message.Client[0] == 'Ola bhai') {
      ws.channel = message.Client[1].channel;
      ws.send(`{ "Server": ["GG bhai", {"message" : "Successfully added the channel, await for information"} ] }`);
    } else if (message.Client[0] == "Handshake") {
      let kukoroData = readFileSync('./src/Resources/Kukoro.json', 'utf-8')
      let settingsData = `{ "Server": [ "GG", { "message": ${kukoroData} } ] }`
      ws.send(settingsData)
    } else if (message.Client[0] == 'fetchData') {
      let kukoroData = readFileSync('./src/Resources/Kukoro.json', 'utf-8')
      let settingsData = `{ "Server": [ "GG", { "message": ${kukoroData} } ] }`; 
      ws.send(settingsData)

      
    } else if (message.Client[0] == 'updateToggleData') {     

      
      let kukoroData = JSON.parse(readFileSync('./src/Resources/Kukoro.json', 'utf-8'));
      if (message.Client[1].message == 'true') kukoroData.kukoroModuleToggle = true 
      else kukoroData.kukoroModuleToggle = false;      
      writeFileSync('./src/Resources/Kukoro.json', JSON.stringify(kukoroData, null, 2)); 
      let mode; // Could be this undefined Better log on client side O_o
      if (kukoroData.kukoroModuleToggle == true) mode = "Kukoro Module turned on"
      else {
        mode = "Kukoro Module turned off";
        reset(['oneTwoThree', 'dungeon', 'sniper'])
      }
      ws.send(`{ "Server": [ "console", { "message": ${mode} } ] }`)
      client.say("#gianaa_", `${mode}`)      

      
    } else if (message.Client[0] == 'sendMessageAsBot') {
      client.say(`${message.Client[1].channel}`, `${message.Client[1].message}`)
      ws.send(`{ "Server": [ "console", { "message": "Message sent to the channel successfully" } ] }`)
    }
  });
  setInterval(() => ws.send(`{ "Ping" : "Kya tum yahaan pe ho bhai?" }`), 25000);
}

function websocketData(data: any): void {
  let toSend =  JSON.stringify(data);
  wssDemo.clients.forEach((client) => client.send(`{ "Server": [ "GG", { "message": ${toSend} } ] }`))
}
