import connect from './connect.js';
import bcrypt from 'bcryptjs'

export default class Users {

    static async signUp(username, password) {
        const knex = await connect();

        const exists = (await knex('player')
            .where('name', username)
            .select('id')
        ).length > 0;
        if (exists) return {
            ok: false,
            error: 'User already exists',
        }

        await knex('player').insert({
            name: username,
            password_hash: await bcrypt.hash(password, 10),
        });
        return {ok: true};
    }

    static async login(username, password) {
        const knex = await connect();

        const rows = await knex('player').where('name', username).select('*');
        if (rows.length != 1) return {
            ok: false,
            error: 'User not found',
        };

        const user = rows[0];

        const correct = await bcrypt.compare(password, user.password_hash);
        if (!correct) return {
            ok: false,
            error: 'Incorrect password',
        };

        return {
            ok: true,
            user,
        };
    }
}