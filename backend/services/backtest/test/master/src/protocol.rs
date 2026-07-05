use std::collections::HashSet;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    Hello(Hello),
    Command(Command),
    Ack(Ack),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Hello {
    pub role: Role,
    pub id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Admin,
    Slave,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Command {
    pub id: String,
    pub target: Target,
    pub command: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Target {
    Broadcast,
    Slave(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Ack {
    pub id: String,
    pub status: AckStatus,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AckStatus {
    Ok,
    Error,
}

pub struct PendingCommand {
    pub targets: HashSet<String>,
    pub received: HashSet<String>,
}