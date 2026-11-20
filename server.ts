import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GITA_CHAPTERS,
  VEDABASE_CORPUS,
  getAdjacentVerses,
  getVerifiedVerse,
} from './src/data/vedabaseCorpus';
import {
  runGitaMindPipeline,
  warmupCorpusEmbeddings,
} from './src/server/ragPipeline';
import type { LanguagePreference } from './src/types/gita';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DAILY_PROMPTS: Record<string, string> = {
  '2.47': 'Where today are you pouring energy into worrying about an outcome instead of refining the craft in front of you?',
  '2.48': 'What single task today can you approach with quiet steadiness, whether it brings applause or critique?',
  '2.14': 'Which temporary discomfort in your week feels permanent right now—and how would poise change your next move?',
  '6.5': 'What is one concrete way you can speak to yourself like a steady friend rather than a harsh critic today?',
  '17.15': 'Before your next difficult conversation, how can you make your words both unmistakably truthful and genuinely constructive?',
  '12.15': 'Whose approval or mood are you letting steer your peace of mind today?',
  '3.35': 'Where are you comparing your imperfect authentic path against someone else’s highlight reel?',
  '18.63': 'What decision have you been postponing that becomes clearer once you deliberate calmly and own your choice?',
};

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 1. Scripture Explorer: Full verified Vedabase corpus + chapter list
  app.get('/api/verses', (_req, res) => {
    res.json({
      chapters: GITA_CHAPTERS,
      verses: VEDABASE_CORPUS,
    });
  });

  // 2. Right Context Drawer: Single verified verse + adjacent verses
  app.get('/api/verses/:chapter/:verse', (req, res) => {
    const chapter = Number(req.params.chapter);
    const verse = Number(req.params.verse);
    if (!Number.isInteger(chapter) || !Number.isInteger(verse)) {
      res.status(400).json({ error: 'Invalid chapter or verse number.' });
      return;
    }
    const record = getVerifiedVerse(chapter, verse);
    if (!record) {
      res.status(404).json({ error: 'Verse not found in verified Vedabase index.' });
      return;
    }
    const adjacent = getAdjacentVerses(chapter, verse);
    res.json({
      verse: record,
      previous: adjacent.previous,
      next: adjacent.next,
    });
  });

  // 3. Daily Shloka Widget
  app.get('/api/daily-shloka', (_req, res) => {
    const today = new Date();
    const dayIndex =
      today.getFullYear() * 366 + (today.getMonth() + 1) * 31 + today.getDate();
    const featuredIds = Object.keys(DAILY_PROMPTS);
    const selectedId = featuredIds[dayIndex % featuredIds.length];
    const verse =
      VEDABASE_CORPUS.find((v) => v.id === selectedId) ?? VEDABASE_CORPUS[3];

    const dateLabel = today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    res.json({
      dateLabel,
      verse,
      modernPrompt:
        DAILY_PROMPTS[verse.id] ??
        'How does this teaching illuminate one concrete choice before you today?',
    });
  });

  // 4. Streaming 9-Step Agentic RAG Pipeline (SSE)
  app.post('/api/guidance/stream', async (req, res) => {
    const {
      query,
      language = 'en',
      memoryFacts = [],
      memoryEnabled = true,
      recentHistory = [],
    } = req.body as {
      query?: string;
      language?: LanguagePreference;
      memoryFacts?: string[];
      memoryEnabled?: boolean;
      recentHistory?: { role: 'user' | 'assistant'; summary: string }[];
    };

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Please share a situation or question to reflect on.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (eventName: string, payload: unknown) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const result = await runGitaMindPipeline({
        query: query.trim(),
        language,
        memoryFacts: Array.isArray(memoryFacts) ? memoryFacts : [],
        memoryEnabled: Boolean(memoryEnabled),
        recentHistory: Array.isArray(recentHistory) ? recentHistory : [],
        onStep: (stepEvent) => {
          sendEvent('step', stepEvent);
        },
      });

      sendEvent('result', result);
      res.end();
    } catch (err) {
      console.error('[GitaMind Pipeline Error]:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach the guidance engine right now. Please try again.';
      sendEvent('error', { message });
      res.end();
    }
  });

  // Serve Vite middleware in dev or static dist/ in production
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (!isProd || !fs.existsSync(distPath)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GitaMind AI server listening on http://0.0.0.0:${PORT}`);
    warmupCorpusEmbeddings();
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
