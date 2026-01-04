import { Hono } from 'hono';
import type { CEFRLevel, LearningGoal, AnalysisFilter } from '@gleano/shared';
import { analyzeWithGemini } from '../services/ai';

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  GEMINI_API_KEY: string;
}

interface AnalyzeRequestBody {
  transcript: string;
  userId: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: CEFRLevel;
  sourceUrl?: string;
  sourceTitle?: string;
  learningGoal?: LearningGoal;
  customDifficulty?: number;
  filter?: AnalysisFilter;
}

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  try {
    const body = await c.req.json<AnalyzeRequestBody>();

    const {
      transcript,
      userId,
      nativeLanguage,
      targetLanguage,
      level,
      sourceUrl,
      sourceTitle,
      learningGoal,
      customDifficulty,
      filter,
    } = body;

    if (!transcript || transcript.trim().length === 0) {
      return c.json({ success: false, error: 'Transcript is required' }, 400);
    }

    if (!c.env.GEMINI_API_KEY) {
      return c.json({ success: false, error: 'API key not configured' }, 500);
    }

    // Create cache key
    const cacheKey = `analysis:${userId}:${transcript.slice(0, 100)}`;

    // Check cache
    const cached = await c.env.CACHE.get(cacheKey, 'json');
    if (cached) {
      return c.json({ success: true, data: cached, cached: true });
    }

    // Ensure user exists in database
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO users (id, native_language, target_language, level)
       VALUES (?, ?, ?, ?)`
    )
      .bind(userId, nativeLanguage, targetLanguage, level)
      .run();

    // Analyze with Gemini
    const result = await analyzeWithGemini(
      transcript,
      nativeLanguage,
      targetLanguage,
      level,
      c.env.GEMINI_API_KEY,
      {
        learningGoal,
        customDifficulty,
        filter,
      }
    );

    // Store learned items in database
    const insertStmt = c.env.DB.prepare(
      `INSERT INTO learned_items (user_id, type, content, translation, language, source_url, source_title)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const batch: D1PreparedStatement[] = [];

    for (const word of result.words) {
      batch.push(
        insertStmt.bind(
          userId,
          'word',
          word.word,
          word.meaning,
          targetLanguage,
          sourceUrl || '',
          sourceTitle || ''
        )
      );
    }

    for (const phrase of result.phrases) {
      batch.push(
        insertStmt.bind(
          userId,
          'phrase',
          phrase.phrase,
          phrase.meaning,
          targetLanguage,
          sourceUrl || '',
          sourceTitle || ''
        )
      );
    }

    for (const sentence of result.sentences) {
      batch.push(
        insertStmt.bind(
          userId,
          'sentence',
          sentence.sentence,
          sentence.translation,
          targetLanguage,
          sourceUrl || '',
          sourceTitle || ''
        )
      );
    }

    if (batch.length > 0) {
      await c.env.DB.batch(batch);
    }

    // Cache result for 15 minutes
    await c.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 900 });

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Analysis error:', error);
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
