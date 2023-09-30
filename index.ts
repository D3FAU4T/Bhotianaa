import express from 'express';
import { Bhotianaa } from "./src/Core/Client";

const app = express();

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(3000, () => {
    console.log('Listening on port 3000!');
});

const client = new Bhotianaa("gianaa_");
client.Start();