import connect from "./connect.js";

const knex = connect();

const users = await knex('player').select('id').where('id', '!=', 1).limit(50);

for (const {id} of users) {
    console.log({id})
    await knex('friend_request').insert({
        from_id: id,
        to_id: 1,
    })
    .onConflict()
    .ignore();
}