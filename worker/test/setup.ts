import { env } from 'cloudflare:test';
import { beforeAll } from 'vitest';

beforeAll(async () => {
  // Initialize database schema
  await env.DB.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, native_language TEXT NOT NULL DEFAULT 'zh-TW', target_language TEXT NOT NULL DEFAULT 'en', level INTEGER NOT NULL DEFAULT 3, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  await env.DB.exec(`CREATE TABLE IF NOT EXISTS learned_items (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('word', 'phrase', 'sentence')), content TEXT NOT NULL, translation TEXT, language TEXT NOT NULL, source_url TEXT, source_title TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))`);

  await env.DB.exec(`CREATE TABLE IF NOT EXISTS favorites (user_id TEXT NOT NULL, item_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, item_id), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (item_id) REFERENCES learned_items(id))`);

  await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_learned_items_user_id ON learned_items(user_id)`);
  await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_learned_items_type ON learned_items(type)`);
  await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`);
});
