import express from 'express';
import morgan from 'morgan';
import connect from './connect.js';
import 'dotenv/config'

const app = express();

app.use(morgan('dev'));
app.use('/static', express.static('static'));

app.get('/', async (req, res) => {
    const knex = connect();
    res.json(await knex('user').select('*'));
});

const port = process.env.WEB_PORT || 80;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});