export type LanguagePreference = 'en' | 'hi' | 'hinglish';

export type GuidanceDomain = 'Career' | 'Relationships' | 'Ethics' | 'Self-Mastery';

export interface WordSynonym {
  sanskrit: string;
  meaning: string;
}

export interface VedabaseVerse {
  id: string; // e.g. "2.47"
  chapter_no: number;
  chapter_title: string;
  verse_no: number;
  sanskrit_devanagari: string;
  transliteration: string;
  synonyms: WordSynonym[];
  translation: string;
  purport: string;
  canonical_url: string;
  themes: string[];
  domains: GuidanceDomain[];
  emotions: string[];
  keywords: string[];
}

export interface ProblemAnalysis {
  domain: GuidanceDomain;
  emotionalState: string;
  coreDilemma: string;
  philosophicalQuery: string;
  isCrisis: boolean;
  crisisReason?: string;
}

export interface PipelineStepEvent {
  step: 1 | 2 | 3 | 4;
  label: string;
  detail?: string;
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface CrisisHelpline {
  name: string;
  number: string;
  telHref: string;
  region: string;
  availability: string;
  description: string;
}

export interface CrisisResponsePayload {
  kind: 'crisis';
  headline: string;
  empatheticMessage: string;
  disclaimer: string;
  helplines: CrisisHelpline[];
}

export interface GuidanceResponsePayload {
  kind: 'guidance';
  verified: boolean;
  confidenceScore: number;
  analysis: {
    domain: GuidanceDomain;
    emotionalState: string;
    coreDilemma: string;
  };
  understandingYourProblem: string;
  verse: VedabaseVerse | null;
  purportExcerpt: string | null;
  unverifiedNotice?: string;
  wisdomApplied: string;
  whatYouShouldDo: ActionItem[];
  whatYouShouldAvoid: string[];
  reflectionQuestion: string;
  tags: string[];
  extractedMemory?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  createdAt: string;
  userText?: string;
  guidance?: GuidanceResponsePayload;
  crisis?: CrisisResponsePayload;
  feedback?: 'up' | 'down' | null;
  bookmarked?: boolean;
}

export interface ConversationSession {
  id: string;
  title: string;
  domain?: GuidanceDomain;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface MemoryFact {
  id: string;
  content: string;
  theme: string;
  occurrences: number;
  createdAt: string;
  sourceSessionId?: string;
}

export interface JournalEntry {
  id: string;
  question: string;
  verseRef?: string;
  note: string;
  createdAt: string;
  tags: string[];
}

export interface UserPreferences {
  language: LanguagePreference;
  showDevanagari: boolean;
  showTransliteration: boolean;
  darkMode: boolean;
  memoryEnabled: boolean;
  onboardingCompleted: boolean;
}

export interface DailyShlokaData {
  dateLabel: string;
  verse: VedabaseVerse;
  modernPrompt: string;
}
