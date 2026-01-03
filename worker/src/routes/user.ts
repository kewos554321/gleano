import { Hono } from 'hono';
import type { CEFRLevel, UserSettings } from '@gleano/shared';

interface Env {
  DB: D1Database;
}

interface UpdateSettingsBody {
  nativeLanguage?: string;
  targetLanguage?: string;
  level?: CEFRLevel;
}

const app = new Hono<{ Bindings: Env }>();

// Get user settings
app.get('/:userId', async (c) => {
  const userId = c.req.param('userId');

  try {
    const result = await c.env.DB.prepare(
      'SELECT id, native_language, target_language, level FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<{
        id: string;
        native_language: string;
        target_language: string;
        level: number;
      }>();

    if (!result) {
      // Create default user
      const defaultSettings: UserSettings = {
        id: userId,
        nativeLanguage: 'zh-TW',
        targetLanguage: 'en',
        level: 3,
      };

      await c.env.DB.prepare(
        `INSERT INTO users (id, native_language, target_language, level)
         VALUES (?, ?, ?, ?)`
      )
        .bind(userId, 'zh-TW', 'en', 3)
        .run();

      return c.json({ success: true, data: defaultSettings });
    }

    const settings: UserSettings = {
      id: result.id,
      nativeLanguage: result.native_language,
      targetLanguage: result.target_language,
      level: result.level as CEFRLevel,
    };

    return c.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Update user settings
app.put('/:userId', async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json<UpdateSettingsBody>();

  try {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.nativeLanguage) {
      updates.push('native_language = ?');
      values.push(body.nativeLanguage);
    }
    if (body.targetLanguage) {
      updates.push('target_language = ?');
      values.push(body.targetLanguage);
    }
    if (body.level) {
      updates.push('level = ?');
      values.push(body.level);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No updates provided' }, 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
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
