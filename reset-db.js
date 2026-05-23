
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetDatabase() {
  try {
    const dbPath = path.join(__dirname, 'server', 'agent_memory.sqlite');
    console.log(`Connecting to database at: ${dbPath}`);
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('Clearing file metadata and vector embeddings...');
    
    // Clear the core indexing tables
    await db.run('DELETE FROM embeddings');
    await db.run('DELETE FROM files');
    await db.run('DELETE FROM logs');
    await db.run('DELETE FROM reorganization_suggestions');
    
    // Optional: reset the auto-increment counters
    await db.run("DELETE FROM sqlite_sequence WHERE name IN ('embeddings', 'files', 'reorganization_suggestions')");

    console.log('✅ Database successfully cleared (Google Login tokens were preserved).');
    console.log('You can now restart your server to begin a fresh re-indexing.');
    
    await db.close();
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
  }
}

resetDatabase();
