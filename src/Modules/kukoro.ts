import { readFileSync, writeFileSync } from 'fs';
import { ChatUserstate } from 'tmi.js';

export interface kukoroData {
  kukoroModuleToggle: boolean,
  kukoro: {
    dungeon: {
      active: boolean,
      types: string[],
      categories: {
        [key: string]: string[],
      }
    },
    sniper: {
      active: boolean,
      followMode: boolean,
      follower: string
    },
    oneTwoThree: {
      active: boolean,
      status: string
    }
  }
}

export interface messageHandler {
  messages: string[],
  websocket: kukoroData
}

let resources: kukoroData = JSON.parse(readFileSync("./Resources/Kukoro.json", 'utf-8'));

// with exclamation
// It works like a twitch message handler, except it returns message with settings
export async function messageHandlerExclamation(channel: string, userstate: ChatUserstate, message: string, self: boolean): Promise<messageHandler | undefined> {
  if (self || !message.startsWith("!") || message.includes('-') || message.startsWith('/')) return;
  const args = message.toLowerCase().replaceAll("@", "").slice(1).split(' ');
  const command = args.shift();

  let isMod = userstate.mod || userstate['user-type'] === 'mod';
  let isBroadcaster = channel.slice(1) === userstate.username;
  let isModUp = isMod || isBroadcaster;

  if (command == 'follow' && resources.kukoro.sniper.active == true) {
    resources.kukoro.sniper.followMode = true;
    resources.kukoro.sniper.follower = args[0].toLowerCase();
    writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
    return { "messages": [`I'm now following ${args[0]}`], "websocket": resources }
  }

  else if (command == 'rickrolled' && resources.kukoro.dungeon.active === true) {
    resources = reset(['sniper', 'oneTwoThree', 'dungeon'])
    return { "messages": [`All categories reseted`], "websocket": resources }
  }

  else if (command == 'newcategory' && isModUp) {
    resources.kukoro.dungeon.categories[args[0]] = [];
    resources.kukoro.dungeon.types.push(args[0])
    writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
    if (userstate.username == 'gianaa_') return { "messages": [`Mamma, I made a new cateogry: ${args[0]}`], "websocket": resources }
    else if (userstate.username == 'd3fau4t') return { "messages": [`Papa Papa, look we have a new enemy: ${args[0]}`], "websocket": resources }
    else return { "messages": [`Added new category: ${args[0]}`], "websocket": resources }
  }

  else if (command == 'join') {
    if (args[0] == 'dungeon') {
      resources = reset(['sniper', 'oneTwoThree'])
      resources.kukoro.dungeon.active = true;
      // console.log('LOG JOIN DUNGEON: ', resources)
      writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
      return { "messages": ["!kukoro", "!w !kukoro"], "websocket": resources }
    }
    else if (args[0] == 'sniper') {
      resources = reset(['dungeon', 'oneTwoThree'])
      resources.kukoro.sniper.active = true;
      resources.kukoro.sniper.followMode = true;
      writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
      return { "messages": ["!kukoro", "!w !kukoro"], "websocket": resources }
    }
    else if (args[0] == '123') {
      resources = reset(['dungeon', 'sniper'])
      resources.kukoro.oneTwoThree.active = true;
      writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
      return { "messages": ["!kukoro"], "websocket": resources }
    }
  }
  else if (command == 'reset') {
    resources = reset(['oneTwoThree', 'sniper', 'dungeon'])
    return { "messages": [`All settings resetted.`], "websocket": resources }
  }
  else if (command == 'followon') {
    resources.kukoro.sniper.followMode = true;
    writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
    return { "messages": [`Follow mode turned on. I'm following ${resources.kukoro.sniper.follower}!`], "websocket": resources }
  }

  else if (command == 'followoff') {
    resources.kukoro.sniper.followMode = false;
    writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
    return { "messages": [`Follow mode turned off.`], "websocket": resources }
  }

  else if (command == 'hidebots') return { "messages": ["!hide", "!w !hide"], "websocket": resources }

  else if (command == 'ability' && resources.kukoro.dungeon.active == true) {
    if (typeof (resources.kukoro.dungeon.categories[args[0]]) == 'undefined') return;
    if (args[1]) {
      if (resources.kukoro.dungeon.categories[args[0]].includes(args[1])) return { "messages": [`Uncle ${args[1]} is already in the category ${args[0]}`], "websocket": resources }
      resources.kukoro.dungeon.categories[args[0]].push(args[1])
      writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
      return { "messages": [`Uncle ${args[1]} added to the ${args[0]} category`], "websocket": resources }
    } else {
      if (typeof(userstate.username) === 'undefined') return;
      if (resources.kukoro.dungeon.categories[args[0]].includes(userstate.username)) return { "messages": [`Uncle ${userstate.username}, you're already in the category ${args[0]}`], "websocket": resources }
      resources.kukoro.dungeon.categories[args[0]].push(userstate.username)
      writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
      return { "messages": [`Uncle ${userstate.username} added to the ${args[0]} category`], "websocket": resources }
    }
  }
  else if (command == 'categories') return { "messages": [`${resources.kukoro.dungeon.types.join(', ')}`], "websocket": resources }
  else if (typeof (command) != 'undefined' && resources.kukoro.dungeon.categories[command] && resources.kukoro.dungeon.active == true) {
    if (resources.kukoro.dungeon.categories[command].length == 0) return { "messages": [`The category ${command} is empty right now.`], "websocket": resources }
    return { "messages": [resources.kukoro.dungeon.categories[command].join(', ')], "websocket": resources }
  }

  else if (command == 'botsinfo' && resources.kukoro.dungeon.active == true) return { "messages": ["!getinfo", "!getinfo @streamlabs"], "websocket": resources }

  else return undefined
}

export async function messageHandlerWithoutExclamation(_channel: string, userstate: ChatUserstate, message: string, self: boolean): Promise<messageHandler | undefined> {

  if (resources.kukoro.sniper.active == true && resources.kukoro.sniper.followMode == true && userstate.username == resources.kukoro.sniper.follower) {
    if (message.toLowerCase() == '!kukoro') return;
    if (message.toLowerCase() == "!club") return { "messages": ["!club"], "websocket": resources }
    if (message.toLowerCase() == "!park") return { "messages": ["!park"], "websocket": resources }
    if (message.toLowerCase() == "!plaza") return { "messages": ["!plaza"], "websocket": resources }
    if (message.toLowerCase() == "!dock") return { "messages": ["!dock"], "websocket": resources }
  }

  if (self || message.startsWith("/") || message.includes("-") || message.toLowerCase().startsWith("!w") || userstate.username != 'gianaa_') return;

  if (resources.kukoro.oneTwoThree.active == true && message.includes('[KUKORO] <<< YOU CAN MOVE! >>>')) {
    resources.kukoro.oneTwoThree.status = "Walking";
    writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
    return { "messages": ["!go"], "websocket": resources }
  }
  else if (resources.kukoro.oneTwoThree.active == true && message.includes('[KUKORO] <<< STOP! >>>')) {
    resources.kukoro.oneTwoThree.status = "Halted";
    writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
    return { "messages": ["!stop"], "websocket": resources }
  }
  else if (message.includes('[KUKORO] RAID IS OVER >>>')) {
    resources = reset(['dungeon'])
    return { "messages": [`All categories reseted`], "websocket": resources }
  }
  else if (message.includes("[KUKORO] GAME OVER >>>")) {
    resources = reset(['sniper', 'oneTwoThree', 'dungeon'])
    return { "messages": [`Settings reseted`], "websocket": resources }
  }
  else if (message.includes("[KUKORO] New objective") && message.toLowerCase().includes('sniper')) {
    let partMsg = message.split(' ');

    partMsg.forEach(part => {
      if (part === part.toUpperCase()) {
        if (part.includes('/') || part.includes('[') || part == 'DNA') return;
        resources.kukoro.sniper.follower = part.replaceAll('.', '').toLowerCase();
        writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
        return { "messages": [`I'm now following ${resources.kukoro.sniper.follower}`], "websocket": resources }
      }
    });

    partMsg.forEach(word => {
      if (word.includes("’")) {
        resources.kukoro.sniper.follower = word.toLowerCase().slice(0, -2)
        writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
        return { "messages": [`I'm now following ${resources.kukoro.sniper.follower}`], "websocket": resources }
      }
    });
  }
  else return undefined;

}

export function reset(game: string[]): kukoroData {
  let resources: kukoroData = JSON.parse(readFileSync("./Resources/Kukoro.json", 'utf-8'))
  game.forEach(category => {
    if (category == 'sniper') {
      resources.kukoro.sniper.active = false;
      resources.kukoro.sniper.followMode = false;
      resources.kukoro.sniper.follower = 'Yo Mamma'
    } else if (category == 'oneTwoThree') {
      resources.kukoro.oneTwoThree.active = false;
      resources.kukoro.oneTwoThree.status = "none";
    }
    else if (category == 'dungeon') {
      resources.kukoro.dungeon.active = false;
      Object.keys(resources.kukoro.dungeon.categories).forEach(element => resources.kukoro.dungeon.categories[element] = []);
    }
  })
  writeFileSync("./Resources/Kukoro.json", JSON.stringify(resources, null, 2))
  return resources;
}

function ToTitleCase(str: string): string {
  return str.replace(/\S+/g,
    function (txt) { return txt[0].toUpperCase() + txt.substring(1).toLowerCase(); });
}

//[KUKORO] STREAMLABS (Lv. 13, Crit. 16%, Dodge 11%) > [You will run away from combat if you get under 25% hp in front of any boss] and [Level +2 all your team if you die by any boss].
//[KUKORO] New objective #1/3: The sniper is tracking radiation particles on SPECTRODANNY71’s clothing.
//[KUKORO] RAID IS OVER >>> NOTSOCLEAR and STREAMLABS leveled up for the next raid.
//[KUKORO] New objective #1/3: The sniper is tracking radiation particles on MATANXD1’s clothing.
// [KUKORO] New objective #2/3: The sniper is analyzing DNA to find PRATEEK_N.
// PARK PLAZA PARK DOCK
// [KUKORO] GAME OVER >>> 