import axios, { AxiosError } from 'axios';
import { remove } from 'remove-accents';
import { readFileSync } from 'fs';
import { ChatUserstate } from 'tmi.js';
import { GetChannel, GetGames, GetUser } from '../Typings/TwitchAPI';
import { DictionaryAPI } from '../Typings/DictionaryAPI';
import { commandsData } from '../Typings/Bhotianaa';

export const twitchHeaders = {
  'Client-Id': process.env['clientId'],
  'Authorization': process.env['auth'],
  'Content-Type': 'application/json'
}

const dictionaryHeaders = {
  'app_id': process.env['OD_ID'],
  'app_key': process.env['OD_KEY']
};

export const define = async (word: string): Promise<string> => {

  if (word == undefined || word == null || word.length == 0) return "This command is used for defining words. Usage: !define <word>";

  const wordId = remove(word);
  let data = '';

  try {
    const res = await axios.get(`https://od-api.oxforddictionaries.com/api/v2/entries/en-gb/${wordId}?fields=definitions&strictMatch=false`, { headers: dictionaryHeaders });
    data = res.data.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0];
  } catch (err) {
    try {
      const resp = await axios.get<DictionaryAPI[]>(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordId}`);
      data = `${word}: ${resp.data[0].meanings[0].definitions[0].definition}`;
    } catch (error) {
      data = `Oh no, I don't know the definition of ${word}, Mamma help D:`;
    }
  }
  return data;
}

export const uptime = async (channel: string): Promise<string> => {
  try {
    const { data } = await axios.get<string>(`https://decapi.me/twitch/uptime?channel=${channel}`);
    return data;
  } catch (err) {
    return 'An error occurred while executing this command'
  }
}

export const setgame = async (gameName: string, broadcaster_id: string): Promise<string> => {
  try {
    const res = await axios.get<GetGames>(`https://api.twitch.tv/helix/games?name=${gameName}`, { headers: twitchHeaders });
    const datas: string = res.data.data[0].id;
    const game: string = res.data.data[0].name;
    await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`, { 'game_id': datas }, { headers: twitchHeaders });
    return game;
  } catch (error) {
    const err = error as AxiosError<{ message: string; error: string; status: number }>;
    return err.response?.data.message || "An error occurred while executing this command";
  }
}

export const shoutout = async (username: string): Promise<string> => {
  try {
    const getUserData = await axios.get<GetUser>(`https://api.twitch.tv/helix/users?login=${username}`, { headers: twitchHeaders });
    const { data } = await axios.get<GetChannel>(`https://api.twitch.tv/helix/channels?broadcaster_id=${getUserData.data.data[0].id}`, { headers: twitchHeaders });
    return data.data[0].game_name;
  } catch (error) {
    const err = error as AxiosError<{ message: string; error: string; status: number }>;
    return err.response?.data.message || "An error occurred while executing this command";
  }
}

export const setTitle = async (title: string, broadcaster_id: string): Promise<string> => {
  try {
    await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`, { "title": title }, { headers: twitchHeaders });
    return title;
  } catch (error) {
    const err = error as AxiosError<{ message: string; error: string; status: number }>;
    return err.response?.data.message || "An error occurred while executing this command";
  }
}

export const followage = (username: string, broadcaster: string): string => {
  // let data = '';
  // await axios.get(`https://decapi.me/twitch/followage/${broadcaster}/${username.replace("@", "")}`)
  //   .then(res => data = res.data)
  //   .catch(err => console.error(err))
  // return data;
  return '[Deprecated] Helix API Endpoint: EventSub channel.follow (v1)'
}

export const ToTitleCase = (word: string): string => word.replace(/\b[a-z]/g, char => char.toUpperCase());

const cmd: commandsData = JSON.parse(readFileSync("./src/Resources/Commands.json", "utf-8"));

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

export const announceText = async (text: string, color?: "primary" | "blue" | "green" | "orange" | "purple") => {
  try {
    const sendingData = {
      message: text,
      color: color || "primary"
    };

    const { data } = await axios.post(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=518259240&moderator_id=836876180`, sendingData, { headers: twitchHeaders });
    return data;
  } catch (err) {
    return err;
  }
}