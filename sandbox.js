import connect from "./connect.js";
import bcrypt from 'bcryptjs'

const knex = connect();

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

for (let i = 0; i < 100; i++) {
    let name = '';
    for (let j = 0; j < 7; j++) {
        const r = Math.trunc(Math.random() * letters.length);
        name += letters[r];
    }
    console.log(i, name);
    await knex('player').insert({
        name,
        password_hash: await bcrypt.hash('hello', 10),
    });
}

console.log(await knex('player').select('*'));