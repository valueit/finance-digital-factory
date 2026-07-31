import { initializeDatabase } from './schema.js';
import { getDbPath } from './connection.js';

initializeDatabase();
console.log(`Database initialized at ${getDbPath()}`);
