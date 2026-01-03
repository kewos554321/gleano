import { Hono } from 'hono';
import { cors } from 'hono/cors';
import analyzeRoutes from './routes/analyze';
import userRoutes from './routes/user';
import historyRoutes from './routes/history';

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  GEMINI_API_KEY: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow extension origins
app.use(
  '*',
  cors({
    origin: [
      'chrome-extension://*',
      'moz-extension://*',
      'http://localhost:*',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  })
);

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Gleano API',
    version: '1.0.0',
    status: 'ok',
  });
});

// API routes
app.route('/api/analyze', analyzeRoutes);
app.route('/api/user', userRoutes);
app.route('/api/history', historyRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      success: false,
      error: c.env.ENVIRONMENT === 'development' ? err.message : 'Internal Server Error',
    },
    500
  );
});

export default app;
