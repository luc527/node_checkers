import connect from './connect.js';
import bcrypt from 'bcryptjs'


export async function signUp(username, password) {
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

export async function login(username, password) {
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

export async function search(search='', limit=20, offset=0) {
    const knex = connect();

    const query = knex('player')
        .select('id', 'name', 'created_at', 'updated_at')
        .limit(limit)
        .offset(offset)
        .orderBy('name');

    if (search) {
        query.whereLike('name', `%${search}%`);
    }

    return await query;
}