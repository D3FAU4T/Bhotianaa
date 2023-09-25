import axios from 'axios';
import { remove } from 'remove-accents';
import { readFileSync } from 'fs';
import { ChatUserstate } from 'tmi.js';

export interface commandsData {
  [channelName: string]: {
    commands: {
      [commandName: string]: {
        value: string,
        useParser: boolean;
      }
    },
    messages: {
      [messageName: string]: {
        value: string,
        useParser: boolean;
      }
    },
    Includes: {
      [messageName: string]: string;
    }
  }
}

export const define = async (word: string): Promise<string> => {
  if (word == undefined || word == null || word.length == 0) return "This command is used for defining words";
  const dictionaryHeaders = {
    'app_id': process.env['OD_ID'],
    'app_key': process.env['OD_KEY']
  };
  const wordId = remove(word);
  let data = '';
  try {
    const res = await axios.get(`https://od-api.oxforddictionaries.com/api/v2/entries/en-gb/${wordId}?fields=definitions&strictMatch=false`, { headers: dictionaryHeaders });
    data = res.data.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0];
  } catch (err) {
    try {
      const resp = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordId}`);
      data = `${word}: ${resp.data[0].meanings[0].definitions[0].definition}`;
    } catch (error) {
      data = `Oh no, I don't know the definition of ${word}, Mamma halp D:`;
    }
  }
  return data;
}

export const uptime = async (channel: string): Promise<string> => {
  let data = '';
  try {
    const res = await axios.get(`https://decapi.me/twitch/uptime?channel=${channel}`);
    data = res.data;
  } catch (err) {
    data = 'An error occurred while executing this command'
  }
  return data;
}

export const setgame = async (gameName: string, broadcaster_id: string, header: object): Promise<string> => {
  let data = "";
  const res = await axios.get(`https://api.twitch.tv/helix/games?name=${gameName}`, { 'headers': header })
  const datas: string = res.data.data[0].id;
  const game: string = res.data.data[0].name;
  await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`, { 'game_id': datas }, { 'headers': header })
    .then(() => data = game)
    .catch(err => data = err.response.data.message)
  return data;
}

export const shoutout = async (username: string, headers: object): Promise<string> => {
  let data = '';
  await axios.get(`https://api.twitch.tv/helix/users?login=${username}`, { 'headers': headers })
    .then(async response => {
      await axios.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${response.data.data[0].id}`, { 'headers': headers })
        .then(res => data = res.data.data[0].game_name)
    })
    .catch(err => console.error(err))
  return data;
}

export const setTitle = async (title: string, broadcaster_id: string, headers: object): Promise<string> => {
  let sentence = '';
  const data = { "title": title }
  await axios
    .patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`, data, { 'headers': headers })
    .then(() => sentence = title)
    .catch(err => console.error(err))
  return sentence;
}

export const followage = async (username: string, broadcaster: string): Promise<string> => {
  let data = '';
  await axios.get(`https://decapi.me/twitch/followage/${broadcaster}/${username.replace("@", "")}`)
    .then(res => data = res.data)
    .catch(err => console.error(err))
  return data;
}

export const ToTitleCase = (word: string): string => word.replace(/\b[a-z]/g, char => char.toUpperCase());

const cmd: commandsData = {};
const json: commandsData = JSON.parse(readFileSync("./Resources/Commands.json", "utf-8"));
Object.assign(cmd, json)

export const cmds = (channel: string, userstate: ChatUserstate, message: string, self: boolean): string | undefined => {
  if (self || message.startsWith("/") || userstate.username == 'd3fau4tbot') return;
  const args = message.toLowerCase().substring(1).split(' ');
  const command = args.shift();

  if (cmd[channel].messages[message] && cmd[channel].messages[message].useParser === true) {
    let ans = (cmd[channel].messages[message].value).replace(/\${username}/g, userstate.username as string).replace(/\${target}/g, args[0]).replace(/\${channel}/g, channel.substring(1)).replace(/\${message}/g, message)
    return ans;
  } else if (cmd[channel].messages[message] && cmd[channel].messages[message].useParser === false) return cmd[channel].messages[message].value;

  if (!message.startsWith("!") || typeof (command) == 'undefined') return;
  if (cmd[channel].commands[command] && cmd[channel].commands[command].useParser === true) {
    let ans = (cmd[channel].commands[command].value).replace(/\${username}/g, userstate.username as string).replace(/\${target}/g, args[0]).replace(/\${channel}/g, channel.substring(1)).replace(/\${message}/g, message)
    return ans;
  } else if (cmd[channel].commands[command] && cmd[channel].commands[command].useParser === false) return cmd[channel].commands[command].value
}

export const announceText = async (text: string, color?: "primary" | "blue" | "green" | "orange" | "purple", headers: any) => {
  try {
    
    const sendingData = {
      message: text,
      color: color || "primary"
    };
    
    const { data } = await axios.post(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=518259240&moderator_id=836876180`, sendingData, { headers: headers });
    return data;
  } catch (err) {
    return err;
  }
}