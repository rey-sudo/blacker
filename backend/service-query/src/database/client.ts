import { RedisWrapper } from "../common/redisClient.js";
import { DatabaseWrap } from "../utils/mysql.js";

export const database = new DatabaseWrap();

export const redisClient = new RedisWrapper();