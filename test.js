const axios = require('axios');

const headers = {
  'Client-Id': "l8h8cvom7ne5gqoraf5kbggre15oc6",
  'Authorization': "Bearer cu3tmpzdu7hdm33m2n1ko3nlg6qeey",
  'Content-Type': 'application/json'
}

async function func() {
  try {
    const res = await axios.get(`https://api.twitch.tv/helix/games?name=Words On Stream`, { headers });
    console.log(res.data);
  } catch (err) {
    console.log(err.response.data);
    console.log(err.message)
  }
}

func()