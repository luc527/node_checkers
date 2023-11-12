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

create table if not exists "user" (
  id            serial,
  name          text not null unique,
  password_hash text not null,

  avatar_path text null,
  
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  
  primary key (id)
);

create table if not exists friend_request (
  from_id    bigint references "user" (id),
  to_id      bigint references "user" (id),
  created_at timestamp not null default current_timestamp,

  primary key (from_id, to_id)
);

create table if not exists friends_with (
  user1_id   bigint references "user" (id),
  user2_id   bigint references "user" (id),
  created_at timestamp not null default current_timestamp,

  primary key (user1_id, user2_id)
);

create table if not exists machine_game (
  user_id   bigint references "user" (id),
  game_uuid uuid,

  user_color color,

  started_at timestamp not null default current_timestamp,
  ended_at   timestamp null,
  end_result end_result,

  primary key (user_id, game_uuid)
);

create table if not exists human_game (
  white_id  bigint references "user" (id),
  black_id  bigint references "user" (id),
  game_uuid uuid,

  started_at timestamp not null default current_timestamp,
  ended_at   timestamp null,
  end_result end_result,

  primary key (white_id, black_id, game_uuid)
);
