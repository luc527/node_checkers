import connect from "./connect.js";

export async function saveMachineGame(gameId, playerId, playerColor, heuristic, timeLimit) {
    const knex = connect();
    await knex('machine_game').insert({
        game_uuid: gameId,
        heuristic: heuristic,
        time_limit_ms: timeLimit,
        player_id: playerId,
        player_color: playerColor,
    });
}

export async function saveHumanGame(gameId, whiteId, blackId, whiteToken, blackToken) {
    const knex = connect();
    await knex('human_game').insert({
        game_uuid: gameId,
        white_id: whiteId,
        black_id: blackId,
        white_token: whiteToken,
        black_token: blackToken,
    });
}

function machineGamesQuery(knex, userId, page=1, perPage=15) {
    return knex('machine_game')
        .where('player_id', userId)
        .select(
            'game_uuid',
            'player_color',
            'heuristic',
            'game_result',
            'time_limit_ms',
            'started_at',
            'ended_at'
        )
        .limit(perPage)
        .offset((page - 1) * perPage)
        .orderBy('started_at', 'desc');
}

export function findMachineGames(userId, page=1, perPage=15) {
    const knex = connect();
    return machineGamesQuery(knex, userId, page, perPage);
}

export function findEndedMachineGames(userId, page=1, perPage=15) {
    const knex = connect();
    const query = machineGamesQuery(knex, userId, page, perPage);
    return query.where('game_result', '!=', 'playing');
}

function humanGamesQuery(knex, userId, page, perPage) {
    return knex({hg: 'human_game'})
        .join({wu: 'player'}, 'wu.id', 'hg.white_id')
        .join({bu: 'player'}, 'bu.id', 'hg.black_id')
        .whereIn(userId, [knex.ref('hg.white_id'), knex.ref('hg.black_id')])
        .select(
            'hg.game_uuid',
            'hg.game_result',
            'hg.started_at',
            'hg.ended_at',
            'hg.white_token',
            'hg.black_token',
            'hg.white_id',
            'hg.black_id',
            'wu.name as white_name',
            'bu.name as black_name',
        )
        .limit(perPage)
        .offset((page - 1) * perPage)
        .orderBy('hg.started_at', 'desc');
}

export function findHumanGames(userId, page=1, perPage=15) {
    const knex = connect();
    return humanGamesQuery(knex, userId, page, perPage)
}

export function findEndedHumanGames(userId, page=1, perPage=15) {
    const knex = connect();
    const query = humanGamesQuery(knex, userId, page, perPage);
    return query.where('hg.game_result', '!=', 'playing');
}

export function updateGame(mode, gameId, result, date) {
    const knex = connect();
    const table = mode == 'human' ? 'human_game' : 'machine_game';
    return knex(table)
        .where('game_uuid', gameId)
        .update({
            ended_at: date,
            game_result: result,
        });
}

export async function findMachineGame(uuid) {
    const knex = connect();
    const rows = await knex('machine_game')
        .where('game_uuid', uuid)
        .select(
            'game_uuid',
            'started_at',
            'ended_at',
            'game_result',
            'player_color',
            'heuristic',
            'time_limit_ms',
        );
    return rows.length == 1 ? rows[0] : null;
}

export async function findHumanGame(uuid) {
    const knex = connect();
    const rows = await knex({hg: 'human_game'})
        .join({wu: 'player'}, 'wu.id', 'hg.white_id')
        .join({bu: 'player'}, 'bu.id', 'hg.black_id')
        .where('hg.game_uuid', uuid)
        .select(
            'hg.game_uuid',
            'hg.game_result',
            'hg.started_at',
            'hg.ended_at',
            'hg.white_token',
            'hg.black_token',
            'hg.white_id',
            'hg.black_id',
            'wu.name as white_name',
            'bu.name as black_name',
        );
    return rows.length == 1 ? rows[0] : null;
}