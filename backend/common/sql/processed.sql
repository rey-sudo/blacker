create table if not exists processed(
  id varchar(100) not null,
  seq bigint not null,
  type varchar(100) not null,
  processed boolean default false,
  created_at BIGINT UNSIGNED NOT NULL,
  primary key(id),
  index idx_id_processed (id,processed)
) ENGINE=InnoDB;

