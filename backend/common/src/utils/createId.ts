import { v7 as uuidv7 } from "uuid";

export function generateId(prefix?: string): string {
  const id = uuidv7();
  return prefix ? `${prefix}-${id}` : id;
}
