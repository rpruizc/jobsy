import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

// SQLite path is configurable so production can point it at a Fly volume
// (e.g. DB_PATH=/data/jobsy.db). Defaults to a local file for development.
const DB_PATH = process.env.DB_PATH ?? "data/jobsy.db";
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,            -- sha256 of the cookie token
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Timestamps are stored as RFC3339/ISO-8601 UTC (e.g. 2026-06-08T00:00:00Z)
  -- so they compare directly against bluedoor's first_seen_at and are valid
  -- values for its first_seen_after filter.
  CREATE TABLE IF NOT EXISTS saved_searches (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    params_json    TEXT NOT NULL,
    last_viewed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- Single-use invite codes. We store only the SHA-256 of the code (like a
  -- password), so a DB leak never exposes a usable invite.
  CREATE TABLE IF NOT EXISTS invites (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code_hash  TEXT NOT NULL UNIQUE,
    note       TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    used_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    used_at    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_searches(user_id);
`);
