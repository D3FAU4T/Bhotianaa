const axios = require('axios');

const headers = {
  'Client-Id': process.env['clientId'],
  'Authorization': process.env['auth'],
  'Content-Type': 'application/json'
}

async function func() {
const res = await axios.get(`https://api.twitch.tv/helix/games?name=Words On Stream`, { 'headers': headers })
console.log(res.data)
}

func()