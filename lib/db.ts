import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_updates INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }
  return _db;
}

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  email_updates: number;
  created_at: string;
  updated_at: string;
}

export const db = {
  findUserByEmail(email: string): DbUser | undefined {
    return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as DbUser | undefined;
  },

  findUserById(id: string): DbUser | undefined {
    return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
  },

  createUser(id: string, email: string, passwordHash: string, emailUpdates: boolean): DbUser {
    const now = new Date().toISOString();
    getDb().prepare(
      "INSERT INTO users (id, email, password_hash, email_updates, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, email, passwordHash, emailUpdates ? 1 : 0, now, now);
    return this.findUserById(id)!;
  },
};
