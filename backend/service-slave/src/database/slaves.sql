CREATE TABLE IF NOT EXISTS slaves (
  id VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  iteration INT UNSIGNED NOT NULL,
  market VARCHAR(100) NOT NULL,
  symbol VARCHAR(50) NOT NULL,

  account_balance DECIMAL(20,10) NOT NULL,
  account_risk DECIMAL(5,4) UNSIGNED NOT NULL,
  stop_loss DECIMAL(5,4) UNSIGNED NOT NULL,
  contract_size INT UNSIGNED NOT NULL,

  description VARCHAR(255) NOT NULL,
  executed BOOLEAN NOT NULL,
  finished BOOLEAN NOT NULL,

  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,

  rule_labels JSON NOT NULL,
  rule_values JSON NOT NULL,

  PRIMARY KEY (id)
) ENGINE=InnoDB;
