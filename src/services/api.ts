import type { GitaChapterInfo } from '../data/vedabaseCorpus';
import type {
  ConversationSession,
  CrisisResponsePayload,
  DailyShlokaData,
  GuidanceResponsePayload,
  JournalEntry,
  LanguagePreference,
  MemoryFact,
  PipelineStepEvent,
  UserPreferences,
  VedabaseVerse,
} from '../types/gita';

export interface VersesIndexResponse {
  chapters: GitaChapterInfo[];
  verses: VedabaseVerse[];
}

export interface VerseDetailResponse {
  verse: VedabaseVerse;
  previous: VedabaseVerse | null;
  next: VedabaseVerse | null;
}

export async function fetchVersesIndex(): Promise<VersesIndexResponse> {
  const res = await fetch('/api/verses');
  if (!res.ok) {
    throw new Error('Could not load Vedabase scripture index.');
  }
  return res.json();
}

export async function fetchVerseDetail(
  chapter: number,
  verse: number
): Promise<VerseDetailResponse> {
  const res = await fetch(`/api/verses/${chapter}/${verse}`);
  if (!res.ok) {
    throw new Error('Could not load verse purport details.');
  }
  return res.json();
}

export async function fetchDailyShloka(): Promise<DailyShlokaData> {
  const res = await fetch('/api/daily-shloka');
  if (!res.ok) {
    throw new Error('Could not load daily shloka.');
  }
  return res.json();
}

export interface StreamGuidanceParams {
  query: string;
  language: LanguagePreference;
  memoryFacts: string[];
  memoryEnabled: boolean;
  recentHistory: { role: 'user' | 'assistant'; summary: string }[];
  onStep: (step: PipelineStepEvent) => void;
}

export async function streamGuidance(
  params: StreamGuidanceParams
): Promise<GuidanceResponsePayload | CrisisResponsePayload> {
  const res = await fetch('/api/guidance/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      language: params.language,
      memoryFacts: params.memoryFacts,
      memoryEnabled: params.memoryEnabled,
      recentHistory: params.recentHistory,
    }),
  });

  if (!res.ok || !res.body) {
    let errMsg = 'Unable to connect to the guidance service.';
    try {
      const json = await res.json();
      if (json?.error) errMsg = json.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: GuidanceResponsePayload | CrisisResponsePayload | null = null;
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      let eventName = 'message';
      let dataStr = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataStr += line.slice(5).trim();
        }
      }

      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        if (eventName === 'step') {
          params.onStep(parsed as PipelineStepEvent);
        } else if (eventName === 'result') {
          finalResult = parsed as GuidanceResponsePayload | CrisisResponsePayload;
        } else if (eventName === 'error') {
          streamError = parsed?.message || 'Pipeline encountered an error.';
        }
      } catch {
        // Ignore partial frames
      }
    }
  }

  if (streamError) {
    throw new Error(streamError);
  }
  if (!finalResult) {
    throw new Error('No response was returned from the guidance pipeline.');
  }
  return finalResult;
}

// --- Local Persistence Helpers (Privacy-first, user-controlled) ---

const KEYS = {
  SESSIONS: 'gitamind_sessions_v1',
  SAVED_VERSES: 'gitamind_saved_verses_v1',
  MEMORY: 'gitamind_memory_v1',
  JOURNAL: 'gitamind_journal_v1',
  PREFS: 'gitamind_prefs_v1',
};

export const DEFAULT_PREFS: UserPreferences = {
  language: 'en',
  showDevanagari: true,
  showTransliteration: true,
  darkMode: false,
  memoryEnabled: true,
  onboardingCompleted: false,
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota issues
  }
}

export const storage = {
  loadSessions: () => safeRead<ConversationSession[]>(KEYS.SESSIONS, []),
  saveSessions: (sessions: ConversationSession[]) => safeWrite(KEYS.SESSIONS, sessions),

  loadSavedVerseIds: () => safeRead<string[]>(KEYS.SAVED_VERSES, ['2.47', '6.5', '17.15']),
  saveSavedVerseIds: (ids: string[]) => safeWrite(KEYS.SAVED_VERSES, ids),

  loadMemory: () => safeRead<MemoryFact[]>(KEYS.MEMORY, []),
  saveMemory: (facts: MemoryFact[]) => safeWrite(KEYS.MEMORY, facts),

  loadJournal: () => safeRead<JournalEntry[]>(KEYS.JOURNAL, []),
  saveJournal: (entries: JournalEntry[]) => safeWrite(KEYS.JOURNAL, entries),

  loadPrefs: () => ({ ...DEFAULT_PREFS, ...safeRead<Partial<UserPreferences>>(KEYS.PREFS, {}) }),
  savePrefs: (prefs: UserPreferences) => safeWrite(KEYS.PREFS, prefs),

  clearAllUserData: () => {
    localStorage.removeItem(KEYS.SESSIONS);
    localStorage.removeItem(KEYS.MEMORY);
    localStorage.removeItem(KEYS.JOURNAL);
  },
};
