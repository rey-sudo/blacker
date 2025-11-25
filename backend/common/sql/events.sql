CREATE TABLE IF NOT EXISTS events (
  id CHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  data MEDIUMTEXT NOT NULL,
  agent_id VARCHAR(200) DEFAULT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  spec_version INT UNSIGNED NOT NULL,
  
  PRIMARY KEY (id),
  INDEX idx_published (published),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB; 


