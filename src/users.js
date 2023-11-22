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

export async function search(loggedUser, search, limit, offset=0) {
    const knex = connect();

    const query = knex({p: 'player'})
        .leftJoin({r1: 'friend_request'}, function() { this.on('r1.from_id', loggedUser).andOn('r1.to_id', 'p.id') })
        .leftJoin({r2: 'friend_request'}, function() { this.on('r2.from_id', 'p.id').andOn('r1.to_id', loggedUser)})
        .select(
            'p.id',
            'p.name',
            'p.created_at',
            'p.updated_at',
            'r1.created_at as request_sent_at',
            'r2.created_at as request_received_at',
        )
        .limit(limit)
        .offset(offset)
        .orderBy('p.name');

    if (search) {
        query.whereLike('name', `%${search}%`);
    }

    return await query;
}

export async function findById(id) {
    const knex = connect();
    const rows = await knex('player')
        .select('id', 'name')
        .where('id', id);
    return rows.length == 0 ? null : rows[0];
}

export async function findByName(name) {
    const knex = connect();
    const rows = await knex('player')
        .select('id', 'name')
        .where('name', name);
    return rows.length == 0 ? null : rows[0];
}