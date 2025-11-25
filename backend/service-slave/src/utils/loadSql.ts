import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadSql(filename: string): string {
  const fullPath = path.join(__dirname, '../database', filename);
  return readFileSync(fullPath, 'utf-8');
}