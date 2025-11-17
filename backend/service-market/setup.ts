import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

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
  database: 'postgres',
});

async function createDatabase() {
  try {
    await client.connect();
    console.log('Conectado a PostgreSQL');

    const result = await client.query(`CREATE DATABASE ${DATABASE_NAME}`);
    console.log(`Base de datos "${DATABASE_NAME}" creada exitosamente`);
  } catch (error: any) {
    if (error.code === '42P04') { 
      console.log(`La base de datos "${DATABASE_NAME}" ya existe`);
    } else {
      console.error('Error creando la base de datos:', error.message);
    }
  } finally {
    await client.end();
    console.log('Conexión cerrada');
  }
}

createDatabase();
