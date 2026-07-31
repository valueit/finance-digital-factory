import { resetDemoData } from './schema.js';
import { getDbPath } from './connection.js';

resetDemoData();
console.log(`Demo data reset at ${getDbPath()}`);
