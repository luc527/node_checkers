DO $$ BEGIN
    CREATE TYPE color AS enum('white', 'black');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
    CREATE TYPE end_result AS enum('playing', 'white won', 'black won', 'draw');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists player (
  id            serial,
  name          text not null unique,
  password_hash text not null,
  
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  
  primary key (id)
);

create table if not exists friend_request (
  from_id    bigint references player (id),
  to_id      bigint references player (id),
  created_at timestamp not null default current_timestamp,

  primary key (from_id, to_id)
);

create table if not exists friends_with (
  player1_id   bigint references player (id),
  player2_id   bigint references player (id),
  created_at timestamp not null default current_timestamp,

  primary key (player1_id, player2_id)
);

create table if not exists machine_game (
  player_id   bigint references player (id),
  game_uuid uuid,

  player_color color,

  started_at timestamp not null default current_timestamp,
  ended_at   timestamp null,
  end_result end_result,

  primary key (player_id, game_uuid)
);

create table if not exists human_game (
  white_id  bigint references player (id),
  black_id  bigint references player (id),
  game_uuid uuid,

  started_at timestamp not null default current_timestamp,
  ended_at   timestamp null,
  end_result end_result,

  primary key (white_id, black_id, game_uuid)
);
