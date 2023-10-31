-- PostgreSQL

create table user (
  id            serial,
  username      text not null unique,
  password_hash text not null,

  avatar_path text null,
  
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  
  primary key (id),
);

create table friend_request (
  from_id    bigint references user (id),
  to_id      bigint references user (id),
  created_at timestamp not null default current_timestamp,

  primary key (from_id, to_id),
);

create table friends_with (
  user1_id   bigint references user (id),
  user2_id   bigint references user (id),
  created_at timestamp not null default current_timestamp,

  primary key (user1_id, user2_id),
);

create table machine_games (
  user_id   bigint references user (id),
  game_uuid uuid,

  user_color enum('white', 'black'),

  started_at timestamp not null default current_timestamp,
  ended_at   timestamp null,
  end_result enum('playing', 'white won', 'black won', 'draw'),

  primary key (user_id, game_uuid),
);

create table human_games (
  white_id  bigint references user (id),
  black_id  bigint references user (id),
  game_uuid uuid,

  started_at timestamp not null default current_timestamp,
  ended_at   timestamp null,
  end_result enum('playing', 'white won', 'black won', 'draw'),

  primary key (white_id, black_id, game_uuid),
);
