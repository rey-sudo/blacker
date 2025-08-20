create table if not exists slaves(
  id VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  symbol_info JSON NOT NULL,
  executed BOOLEAN NOT NULL,
  finished BOOLEAN NOT NULL,
  leverage INT UNSIGNED NOT NULL,
  stop_loss DECIMAL(3,2) UNSIGNED NOT NULL,
  order_amount INT UNSIGNED NOT NULL,
  margin_type VARCHAR(50) NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  R0 BOOLEAN NOT NULL,
  R1 BOOLEAN NOT NULL,
  R2 BOOLEAN NOT NULL,
  R3 BOOLEAN NOT NULL,
  primary key(id)
) ENGINE=InnoDB;

--description iteration rules[] 

