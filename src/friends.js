import connect from "./connect.js";

export async function sendRequest(from, to) {
    const knex = connect();

    const users = await knex('player')
        .select('id')
        .whereIn('id', [from, to]);

    if (users.length != 2) {
        throw new Error('User not found');
    }

    const existing = await knex('friend_request')
        .select('from_id', 'to_id')
        .where  (b => b.where('from_id', from).andWhere('to_id', to))
        .orWhere(b => b.where('to_id', from).andWhere('from_id', to));

    // No need to throw an error
    if (existing.length != 0) {
        return;
    }

    await knex('friend_request')
        .insert({
            from_id: from,
            to_id: to,
        })
        .onConflict(['from_id', 'to_id'])
        .ignore();
}


export async function requests(userId) {
    const knex = connect();
    const requests = await knex({r: 'friend_request'})
        .whereIn(userId, [knex.ref('r.from_id'), knex.ref('r.to_id')])
        .join({f: 'player'}, 'f.id', 'r.from_id')
        .join({t: 'player'}, 't.id', 'r.to_id')
        .select(
            'r.from_id',
            'r.to_id',
            'r.created_at',
            'f.name as from_name',
            't.name as to_name',
        );
    return requests;
}


function deleteRequest(knex, from, to) {
    return knex('friend_request')
        .where('from_id', from)
        .andWhere('to_id', to)
        .del();
}


export async function cancelRequest(from, to) {
    const knex = connect();
    await deleteRequest(knex, from, to);
}


export async function acceptRequest(from, to) {
    // FIXME should be transaction
    const knex = connect();
    await Promise.all([
        deleteRequest(knex, from, to),
        knex('friends_with').insert({player1_id: from, player2_id: to}),
        knex('friends_with').insert({player1_id: to, player2_id: from}),
    ]);
}


export async function rejectRequest(from, to) {
    const knex = connect();
    await deleteRequest(knex, from, to);
}


export async function ofUser(user, limit, offset=0) {
    const knex = connect();
    return await knex({f: 'friends_with'})
        .where('f.player1_id', user)
        .join({u: 'player'}, 'u.id', 'f.player2_id')
        .select('u.id', 'u.name', 'f.created_at')
        .limit(limit)
        .offset(offset);
}


export async function remove(user1, user2) {
    const knex = connect();
    return await knex('friends_with')
        .where  (b => b.where('player1_id', user1).andWhere('player2_id', user2))
        .orWhere(b => b.where('player1_id', user2).andWhere('player2_id', user1))
        .del();
}