import express from 'express'
import morgan from 'morgan'
import knex from 'knex'

const app = express()

app.use(morgan('dev'))
app.use('/static', express.static('static'))

// TODO knexfile, env etc.
// TODO typescript...

app.get('/', async (req, res) => {
    // TODO FIX 'Unable to acquire a connection'
    const pg = knex({
        client: 'pg',
        host: 'host.docker.internal',
        port: '5432',
        database: 'checkers_db',
        password: 'root',
    });
    await pg('user').select('*');
})

const port = 80
app.listen(port, () => {
    console.log(`Listening on ${port}`)
})