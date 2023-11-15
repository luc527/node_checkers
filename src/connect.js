import knex from 'knex'

let _knex = null;

/**
 * @returns {Knex}
 */
export default function() {
  if (!_knex) {
    _knex = knex({
      client: 'pg',
      connection: {
        host: process.env.PG_HOST || 'host.docker.internal',
        port: process.env.PG_PORT || 5432,
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASS || 'root',
        database: process.env.PG_DATABASE || 'checkers_db',
      },
      pool: {
        min: 0,
        max: 20,
      }
    });
  }
  return _knex;
}
