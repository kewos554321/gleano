import { Hono } from 'hono';
import type { LearnedItem } from '@gleano/shared';

interface Env {
  DB: D1Database;
}

interface DBLearnedItem {
  id: number;
  user_id: string;
  type: 'word' | 'phrase' | 'sentence';
  content: string;
  translation: string | null;
  language: string;
  source_url: string | null;
  source_title: string | null;
  created_at: string;
}

const app = new Hono<{ Bindings: Env }>();

// Get learning history
app.get('/:userId', async (c) => {
  const userId = c.req.param('userId');
  const type = c.req.query('type'); // 'word' | 'phrase' | 'sentence'
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    let query = `
      SELECT id, user_id, type, content, translation, language, source_url, source_title, created_at
      FROM learned_items
      WHERE user_id = ?
    `;
    const params: (string | number)[] = [userId];

    if (type && ['word', 'phrase', 'sentence'].includes(type)) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const results = await c.env.DB.prepare(query)
      .bind(...params)
      .all<DBLearnedItem>();

    const items: LearnedItem[] = (results.results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      content: row.content,
      translation: row.translation || '',
      language: row.language,
      sourceUrl: row.source_url || '',
      sourceTitle: row.source_title || '',
      createdAt: row.created_at,
    }));

    return c.json({ success: true, data: items });
  } catch (error) {
    console.error('Get history error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Add to favorites
app.post('/:userId/favorites/:itemId', async (c) => {
  const userId = c.req.param('userId');
  const itemId = parseInt(c.req.param('itemId'));

  try {
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO favorites (user_id, item_id) VALUES (?, ?)'
    )
      .bind(userId, itemId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Add favorite error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Remove from favorites
app.delete('/:userId/favorites/:itemId', async (c) => {
  const userId = c.req.param('userId');
  const itemId = parseInt(c.req.param('itemId'));

  try {
    await c.env.DB.prepare(
      'DELETE FROM favorites WHERE user_id = ? AND item_id = ?'
    )
      .bind(userId, itemId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Remove favorite error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Get favorites
app.get('/:userId/favorites', async (c) => {
  const userId = c.req.param('userId');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const results = await c.env.DB.prepare(
      `SELECT li.id, li.user_id, li.type, li.content, li.translation,
              li.language, li.source_url, li.source_title, li.created_at
       FROM learned_items li
       JOIN favorites f ON li.id = f.item_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(userId, limit, offset)
      .all<DBLearnedItem>();

    const items: LearnedItem[] = (results.results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      content: row.content,
      translation: row.translation || '',
      language: row.language,
      sourceUrl: row.source_url || '',
      sourceTitle: row.source_title || '',
      createdAt: row.created_at,
    }));

    return c.json({ success: true, data: items });
  } catch (error) {
    console.error('Get favorites error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
