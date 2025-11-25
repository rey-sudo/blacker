import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

const {
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_NAME,
} = process.env;

const client = new Client({
  host: DATABASE_HOST,
  port: DATABASE_PORT ? parseInt(DATABASE_PORT) : 5432,
  user: DATABASE_USER,
  password: DATABASE_PASSWORD,
  database: "",
});

async function createDatabase() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    const dbs = await client.query(`SELECT datname FROM pg_database;`);
    console.log(
      "Databases:",
      dbs.rows.map((r) => r.datname)
    );

    const result = await client.query(`CREATE DATABASE ${DATABASE_NAME}`);
    console.log(`Database "${DATABASE_NAME}" created successfully`);
  } catch (error: any) {
    if (error.code === "42P04") {
      console.log(`The database "${DATABASE_NAME}" already exists`);
    } else {
      console.error("Error creating the database:", error.message);
    }
  } finally {
    await client.end();
    console.log("Connection closed");
  }
}

createDatabase();
