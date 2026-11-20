import { GoogleGenAI } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets.'
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 1
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : String(err);
      // Do not retry auth, invalid request, quota, or timeout errors
      if (
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 404 ||
        status === 429 ||
        message.includes('timed out')
      ) {
        throw err;
      }
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 400 * Math.pow(2, attempt))
        );
      }
    }
  }
  throw lastError;
}
