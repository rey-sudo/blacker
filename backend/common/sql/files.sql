CREATE TABLE IF NOT EXISTS files (
  id VARCHAR(100) PRIMARY KEY,            
  media_group_id VARCHAR(100) NOT NULL,    
  agent_id VARCHAR(100) NOT NULL,  
  mime_type VARCHAR(50),          
  position INT NOT NULL, 
  filename TEXT NOT NULL,
  media_path TEXT NOT NULL,          
  status ENUM('pending', 'processing', 'ready', 'failed', 'deleted') DEFAULT 'pending',
  created_at BIGINT NOT NULL,

  INDEX idx_group_agent (media_group_id, agent_id),
  INDEX idx_status (status)
);
