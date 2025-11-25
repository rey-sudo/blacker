CREATE TABLE IF NOT EXISTS media (
  id VARCHAR(100) PRIMARY KEY,
  media_group_id VARCHAR(100) NOT NULL, 
  agent_id VARCHAR(100) NOT NULL,
  product_id varchar(100) NOT NULL,
  mime_type VARCHAR(50) NOT NULL, 
  position INT NOT NULL,
  alt_text VARCHAR(255),
  resolutions JSON NOT NULL, 
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  schema_v INT UNSIGNED NOT NULL,
  INDEX idx_product_id (product_id)
);
