import { Type } from '@google/genai';
import {
  VEDABASE_CORPUS,
  VERIFIED_VEDABASE_MAP,
} from '../data/vedabaseCorpus';
import type {
  CrisisHelpline,
  CrisisResponsePayload,
  GuidanceDomain,
  GuidanceResponsePayload,
  LanguagePreference,
  PipelineStepEvent,
  ProblemAnalysis,
  VedabaseVerse,
} from '../types/gita';
import { getGeminiClient, withRetry } from './geminiClient';

const VALIDATION_CONFIDENCE_THRESHOLD = 0.72;

const CRISIS_HELPLINES: CrisisHelpline[] = [
  {
    name: 'Tele-MANAS (India Mental Health Helpline)',
    number: '14416 / 1-800-891-4416',
    telHref: 'tel:14416',
    region: 'India · 24/7 Free & Confidential',
    availability: '24/7 in 20+ languages',
    description:
      'Government of India national mental health counseling and crisis intervention.',
  },
  {
    name: 'National Emergency Number (India)',
    number: '112',
    telHref: 'tel:112',
    region: 'India · Immediate Emergency',
    availability: '24/7',
    description: 'Immediate medical, police, or emergency safety response.',
  },
  {
    name: 'KIRAN Mental Health Rehabilitation',
    number: '1800-599-0019',
    telHref: 'tel:18005990019',
    region: 'India · Toll-Free',
    availability: '24/7',
    description: 'Emotional support for acute anxiety, depression, and distress.',
  },
  {
    name: '988 Suicide & Crisis Lifeline (US / Canada)',
    number: '988',
    telHref: 'tel:988',
    region: 'US & Canada · Call or Text',
    availability: '24/7',
    description: 'Free, confidential support from trained crisis counselors.',
  },
];

// Deterministic high-signal crisis patterns (FR-4.3)
const CRISIS_PATTERNS = [
  /\b(kill(ing)?\s*myself|end(ing)?\s*my\s*life|hurt(ing)?\s*myself|want\s*to\s*die|suicid(e|al)|self[\s-]*harm|cut(ting)?\s*myself|overdose|no\s*reason\s*to\s*live|better\s*off\s*dead)\b/i,
  /\b(marna\s*chahta|marna\s*chahti|jeena\s*nahi|khudkushi|aatmahatya|zindagi\s*khatam)\b/i,
  /(आत्महत्या|मरना चाहता|मरना चाहती|जीना नहीं चाहता|खुद को नुकसान)/i,
  /\b(being\s*physically\s*abused|domestic\s*violence|he\s*hits\s*me|she\s*hits\s*me|medical\s*emergency|chest\s*pain\s*can'?t\s*breathe)\b/i,
];

function detectDeterministicCrisis(input: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(input));
}

function buildCrisisPayload(language: LanguagePreference): CrisisResponsePayload {
  if (language === 'hi') {
    return {
      kind: 'crisis',
      headline: 'आप अकेले नहीं हैं — अभी सुरक्षित और वास्तविक सहायता उपलब्ध है',
      empatheticMessage:
        'आप जो महसूस कर रहे हैं वह बहुत भारी है, और इस क्षण में आपका सुरक्षित रहना सबसे अधिक महत्वपूर्ण है। कृपया किसी प्रशिक्षित परामर्शदाता या किसी विश्वसनीय व्यक्ति से तुरंत बात करें।',
      disclaimer:
        'GitaMind AI एक दार्शनिक चिंतन साथी है — यह पेशेवर चिकित्सा, मानसिक स्वास्थ्य उपचार, या आपातकालीन सहायता का विकल्प नहीं है।',
      helplines: CRISIS_HELPLINES,
    };
  }
  if (language === 'hinglish') {
    return {
      kind: 'crisis',
      headline: 'Aap akele nahi hain — abhi safe aur immediate support available hai',
      empatheticMessage:
        'Jo aap abhi mehsoos kar rahe hain woh bahut bhari hai, aur is waqt aapki safety sabse zyada important hai. Please ek trained counselor ya kisi trusted insaan se abhi baat karein.',
      disclaimer:
        'GitaMind AI ek reflective companion hai — yeh professional therapy, medical care, ya emergency help ka substitute nahi hai.',
      helplines: CRISIS_HELPLINES,
    };
  }
  return {
    kind: 'crisis',
    headline:
      'You do not have to carry this alone — immediate human support is available',
    empatheticMessage:
      'What you are going through sounds deeply painful, and your safety right now matters more than anything else. Please reach out to a trained counselor or someone you trust right away.',
    disclaimer:
      'GitaMind AI is a scripture-grounded reflection companion and is not a substitute for professional therapy, medical treatment, or emergency crisis care.',
    helplines: CRISIS_HELPLINES,
  };
}

// --- Hybrid Dense Vector + BM25 Index ---
let corpusEmbeddingsCache: Map<string, number[]> | null = null;
let embeddingWarmupStarted = false;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function buildVerseSearchDocument(v: VedabaseVerse): string {
  return [
    `BG ${v.chapter_no}.${v.verse_no} ${v.chapter_title}`,
    v.translation,
    v.purport,
    `Themes: ${v.themes.join(', ')}`,
    `Domains: ${v.domains.join(', ')}`,
    `Emotions: ${v.emotions.join(', ')}`,
    `Keywords: ${v.keywords.join(', ')}`,
  ].join(' | ');
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s.`));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Non-blocking warm-up so embeddings never delay a user's first query
export function warmupCorpusEmbeddings(): void {
  if (embeddingWarmupStarted || corpusEmbeddingsCache) return;
  embeddingWarmupStarted = true;
  (async () => {
    try {
      const ai = getGeminiClient();
      const documents = VEDABASE_CORPUS.map(buildVerseSearchDocument);
      const result = await withTimeout(
        ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: documents,
        }),
        12000,
        'Corpus embedding warmup'
      );
      const vectors = result.embeddings;
      if (vectors && vectors.length === VEDABASE_CORPUS.length) {
        const map = new Map<string, number[]>();
        VEDABASE_CORPUS.forEach((verse, idx) => {
          const vals = vectors[idx]?.values;
          if (vals && vals.length > 0) {
            map.set(verse.id, vals);
          }
        });
        if (map.size === VEDABASE_CORPUS.length) {
          corpusEmbeddingsCache = map;
        }
      }
    } catch {
      // BM25 lexical + metadata index handles retrieval seamlessly while cold
    }
  })();
}

function computeBm25Score(queryTokens: string[], verse: VedabaseVerse): number {
  const docText = buildVerseSearchDocument(verse).toLowerCase();
  const docTokens = tokenize(docText);
  if (docTokens.length === 0 || queryTokens.length === 0) return 0;

  const freqMap = new Map<string, number>();
  for (const t of docTokens) {
    freqMap.set(t, (freqMap.get(t) ?? 0) + 1);
  }

  const k1 = 1.5;
  const b = 0.75;
  const avgdl = 110;
  const dl = docTokens.length;

  let score = 0;
  const uniqueQuery = Array.from(new Set(queryTokens));
  for (const qt of uniqueQuery) {
    const tf = freqMap.get(qt) ?? 0;
    if (tf > 0) {
      score += (tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * dl) / avgdl));
    }
    if (verse.keywords.some((kw) => kw.toLowerCase().includes(qt))) {
      score += 1.35;
    }
    if (verse.themes.some((th) => th.toLowerCase().includes(qt))) {
      score += 1.05;
    }
  }
  return Math.min(1, score / Math.max(4.2, uniqueQuery.length * 1.05));
}

interface RetrievalCandidate {
  verse: VedabaseVerse;
  confidence: number;
  denseScore: number;
  bm25Score: number;
}

async function retrieveVerifiedVerses(
  userQuery: string,
  analysis: ProblemAnalysis,
  isApplicableLifeDilemma: boolean
): Promise<RetrievalCandidate[]> {
  const combinedQuery = `${analysis.philosophicalQuery}. Core dilemma: ${analysis.coreDilemma}. Domain: ${analysis.domain}. Emotion: ${analysis.emotionalState}. User situation: ${userQuery}`;
  const queryTokens = tokenize(combinedQuery);

  // Trigger non-blocking warmup if not started yet
  warmupCorpusEmbeddings();

  let queryEmbedding: number[] | null = null;
  if (corpusEmbeddingsCache) {
    try {
      const ai = getGeminiClient();
      const qEmbed = await withTimeout(
        ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: [combinedQuery],
        }),
        3500,
        'Query embedding'
      );
      queryEmbedding = qEmbed.embeddings?.[0]?.values ?? null;
    } catch {
      queryEmbedding = null;
    }
  }

  const scored: RetrievalCandidate[] = VEDABASE_CORPUS.map((verse) => {
    const bm25Score = computeBm25Score(queryTokens, verse);
    let denseScore = 0;
    if (queryEmbedding && corpusEmbeddingsCache) {
      const vVec = corpusEmbeddingsCache.get(verse.id);
      if (vVec) {
        denseScore = Math.max(0, cosineSimilarity(queryEmbedding, vVec));
      }
    }

    const domainBonus = verse.domains.includes(analysis.domain) ? 0.08 : 0;
    const emotionBonus = verse.emotions.some((e) =>
      analysis.emotionalState.toLowerCase().includes(e.toLowerCase())
    )
      ? 0.07
      : 0;

    let confidence: number;
    if (queryEmbedding && denseScore > 0) {
      confidence = Math.min(
        0.99,
        denseScore * 0.72 + bm25Score * 0.23 + domainBonus + emotionBonus
      );
    } else {
      confidence = Math.min(0.96, 0.56 + bm25Score * 0.34 + domainBonus + emotionBonus);
    }

    if (!isApplicableLifeDilemma) {
      confidence = Math.min(confidence, 0.54);
    }

    return {
      verse,
      confidence: Number(confidence.toFixed(3)),
      denseScore: Number(denseScore.toFixed(3)),
      bm25Score: Number(bm25Score.toFixed(3)),
    };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  return scored.slice(0, 3);
}

// Step 5: Deterministic Verse Validator (Guardrail)
function deterministicValidateCandidate(
  candidate: RetrievalCandidate | undefined
): { valid: boolean; verifiedVerse: VedabaseVerse | null; confidence: number } {
  if (!candidate) {
    return { valid: false, verifiedVerse: null, confidence: 0 };
  }
  const canonicalRecord = VERIFIED_VEDABASE_MAP.get(candidate.verse.id);
  if (!canonicalRecord) {
    return { valid: false, verifiedVerse: null, confidence: 0 };
  }
  const textMatches =
    canonicalRecord.sanskrit_devanagari === candidate.verse.sanskrit_devanagari &&
    canonicalRecord.translation === candidate.verse.translation &&
    canonicalRecord.canonical_url ===
      `https://vedabase.io/en/library/bg/${canonicalRecord.chapter_no}/${canonicalRecord.verse_no}/`;

  if (!textMatches || candidate.confidence < VALIDATION_CONFIDENCE_THRESHOLD) {
    return {
      valid: false,
      verifiedVerse: null,
      confidence: candidate.confidence,
    };
  }

  return {
    valid: true,
    verifiedVerse: canonicalRecord,
    confidence: candidate.confidence,
  };
}

export interface RunPipelineInput {
  query: string;
  language: LanguagePreference;
  memoryFacts: string[];
  memoryEnabled: boolean;
  recentHistory: { role: 'user' | 'assistant'; summary: string }[];
  onStep: (event: PipelineStepEvent) => void;
}

export async function runGitaMindPipeline(
  input: RunPipelineInput
): Promise<GuidanceResponsePayload | CrisisResponsePayload> {
  const { query, language, memoryFacts, memoryEnabled, recentHistory, onStep } = input;
  const trimmed = query.trim();

  // Step 1: Query Intake + Fast Deterministic Crisis Check
  onStep({
    step: 1,
    label: 'Understanding your situation...',
    detail: 'Analyzing emotional context and core dilemma',
  });

  if (detectDeterministicCrisis(trimmed)) {
    return buildCrisisPayload(language);
  }

  const ai = getGeminiClient();

  const historyBlock =
    recentHistory.length > 0
      ? `Recent conversation context:\n${recentHistory
          .slice(-4)
          .map((h) => `- ${h.role}: ${h.summary}`)
          .join('\n')}`
      : '';

  const memoryBlock =
    memoryEnabled && memoryFacts.length > 0
      ? `User's opt-in remembered personal context:\n${memoryFacts
          .slice(0, 8)
          .map((m) => `- ${m}`)
          .join('\n')}`
      : '';

  // Steps 2 & 3: Problem & Emotion Analyzer + Philosophical Query Rewriter
  const analyzerPrompt = `Analyze the user's message for GitaMind AI (a Bhagavad Gita personal guidance companion).
${historyBlock}
${memoryBlock}

User message: "${trimmed}"

Tasks:
1. Safety check: Set isCrisis=true ONLY if the user expresses suicidal thoughts, self-harm intent, severe acute clinical crisis, active physical abuse/danger, or medical emergency.
2. Relevance check: Set isLifeOrEthicalDilemma=true if the user is sharing a personal, emotional, professional, relational, ethical, purpose, mindset, or spiritual question/dilemma that Bhagavad Gita teachings meaningfully illuminate. Set isLifeOrEthicalDilemma=false ONLY for purely technical/trivia/factual requests unrelated to human dilemmas (e.g., "write python code", "pasta recipe", "weather today", "capital of France").
3. Classify domain into exactly one of: "Career", "Relationships", "Ethics", "Self-Mastery".
4. Identify emotionalState (concise 1-2 word label).
5. Identify coreDilemma (concise phrase).
6. Rewrite into a Gita-aligned philosophicalQuery containing Bhagavad Gita concepts (detachment from fruits of labor, karma yoga, equanimity, sthitaprajna, austerity of speech, svadharma, steadying the restless mind, forgiveness, discernment).
7. If memoryEnabled is true and the user revealed durable personal context worth remembering gently, extract 1 concise sentence in extractedMemoryFact; otherwise empty string.`;

  const analysisRes = await withRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: analyzerPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCrisis: { type: Type.BOOLEAN },
              crisisReason: { type: Type.STRING },
              isLifeOrEthicalDilemma: { type: Type.BOOLEAN },
              domain: {
                type: Type.STRING,
                enum: ['Career', 'Relationships', 'Ethics', 'Self-Mastery'],
              },
              emotionalState: { type: Type.STRING },
              coreDilemma: { type: Type.STRING },
              philosophicalQuery: { type: Type.STRING },
              extractedMemoryFact: { type: Type.STRING },
            },
            required: [
              'isCrisis',
              'isLifeOrEthicalDilemma',
              'domain',
              'emotionalState',
              'coreDilemma',
              'philosophicalQuery',
            ],
          },
        },
      }),
      20000,
      'Situation analysis'
    )
  );

  const parsedAnalysis = JSON.parse((analysisRes.text ?? '{}').trim()) as {
    isCrisis?: boolean;
    crisisReason?: string;
    isLifeOrEthicalDilemma?: boolean;
    domain?: GuidanceDomain;
    emotionalState?: string;
    coreDilemma?: string;
    philosophicalQuery?: string;
    extractedMemoryFact?: string;
  };

  if (parsedAnalysis.isCrisis) {
    return buildCrisisPayload(language);
  }

  const analysis: ProblemAnalysis = {
    domain: parsedAnalysis.domain ?? 'Self-Mastery',
    emotionalState: parsedAnalysis.emotionalState || 'Reflection',
    coreDilemma: parsedAnalysis.coreDilemma || 'Seeking clarity in action',
    philosophicalQuery: parsedAnalysis.philosophicalQuery || trimmed,
    isCrisis: false,
  };

  // Step 4: Hybrid Vedabase Retrieval
  onStep({
    step: 2,
    label: 'Searching Vedabase.io for relevant teachings...',
    detail: `Querying hybrid vector & Sanskrit index for ${analysis.domain}`,
  });

  const candidates = await retrieveVerifiedVerses(
    trimmed,
    analysis,
    parsedAnalysis.isLifeOrEthicalDilemma !== false
  );

  // Step 5: Deterministic Verse Validator (Guardrail) across retrieved candidates
  onStep({
    step: 3,
    label: 'Verifying chapter & verse authenticity...',
    detail: candidates[0]
      ? `Cross-checking BG ${candidates[0].verse.chapter_no}.${candidates[0].verse.verse_no} against Vedabase.io index`
      : 'Validating against verified Vedabase index',
  });

  const validatedCandidates = candidates
    .map((c) => ({ candidate: c, check: deterministicValidateCandidate(c) }))
    .filter((entry) => entry.check.valid && entry.check.verifiedVerse !== null);

  const primaryValidation = deterministicValidateCandidate(candidates[0]);
  const hasVerifiedCandidates = validatedCandidates.length > 0;

  // Steps 6, 7, 8, 9: Wisdom Mapper + Structured 7-Part Response Generator + Citation Linker + Reflection Agent
  onStep({
    step: 4,
    label: 'Crafting practical steps...',
    detail:
      hasVerifiedCandidates && validatedCandidates[0].check.verifiedVerse
        ? `Applying BG ${validatedCandidates[0].check.verifiedVerse.chapter_no}.${validatedCandidates[0].check.verifiedVerse.verse_no} to your context`
        : 'Preparing grounded practical guidance',
  });

  const languageDirective =
    language === 'hi'
      ? 'Write ALL generated fields (understandingYourProblem, purportExcerpt, wisdomApplied, whatYouShouldDo, whatYouShouldAvoid, reflectionQuestion) in natural, warm, clear Hindi (Devanagari script). Keep verse references like BG 2.47 clean.'
      : language === 'hinglish'
      ? 'Write ALL generated fields in warm, relatable, modern Hinglish (Hindi in natural Roman script blended cleanly with English, as spoken by young urban Indians).'
      : 'Write ALL generated fields in clear, warm, grounded modern English—editorial, concise, practical, and completely non-preachy.';

  const systemInstruction = `You are GitaMind AI, a calm, scripture-grounded personal guidance companion.
CORE RULES (NON-NEGOTIABLE):
1. ZERO HALLUCINATION: You NEVER invent, alter, or cite any Bhagavad Gita verse number or shloka that was not explicitly provided in the VERIFIED VEDABASE CANDIDATES below.
2. ANTI-PASSIVITY GUARDRAIL (FR-4.2): Never encourage fatalism, tolerating mistreatment/abuse, silencing legitimate boundaries, or abandoning responsibility. Frame detachment (nishkama karma) as engaged, courageous action free from anxious paralysis—never apathy.
3. NON-PREACHY TONE: Be deeply empathetic, pragmatic, and grounded in modern life (workplaces, exams, relationships, family, personal ethics). Avoid religious dogma or moralizing clichés.
4. LANGUAGE: ${languageDirective}`;

  let synthesisPrompt: string;
  if (hasVerifiedCandidates) {
    const candidatesBlock = validatedCandidates
      .map(({ check }) => {
        const v = check.verifiedVerse!;
        return `[ID: "${v.id}"] BG ${v.chapter_no}.${v.verse_no} (${v.chapter_title})
  Translation: "${v.translation}"
  Purport: "${v.purport}"`;
      })
      .join('\n\n');

    synthesisPrompt = `User situation: "${trimmed}"
Detected Domain: ${analysis.domain}
Detected Emotion: ${analysis.emotionalState}
Core Dilemma: ${analysis.coreDilemma}
${memoryBlock}
${historyBlock}

VERIFIED VEDABASE CANDIDATES (CHOOSE EXACTLY ONE ID FROM THIS LIST):
${candidatesBlock}

Tasks:
- selectedVerseId: Pick the SINGLE best-fitting ID from the VERIFIED VEDABASE CANDIDATES above (must match the exact string ID, e.g. "${validatedCandidates[0].check.verifiedVerse!.id}").
- understandingYourProblem: 2–3 empathetic, objective sentences mirroring their exact dilemma so they feel truly heard.
- purportExcerpt: A concise 2–3 sentence distillation faithfully capturing the core insight of the chosen verse's Purport above.
- wisdomApplied: 1–2 crisp paragraphs bridging the chosen verse directly to their specific real-world constraints and choices, honoring the Anti-Passivity Guardrail.
- whatYouShouldDo: 3 to 4 concrete, realistic, immediately actionable steps tailored to their exact situation.
- whatYouShouldAvoid: 2 to 3 specific reactive traps or destructive mindsets to steer clear of.
- reflectionQuestion: 1 open-ended, deeply thoughtful Socratic self-inquiry question.
- tags: 2 to 3 concise theme tags (1–2 words each).`;
  } else {
    synthesisPrompt = `User message: "${trimmed}"
Detected Domain: ${analysis.domain}
Core Dilemma: ${analysis.coreDilemma}

IMPORTANT GUARDRAIL (FR-4.1 UNVERIFIED VERSE FALLBACK):
No Bhagavad Gita verse passed deterministic validation (confidence ${primaryValidation.confidence} < ${VALIDATION_CONFIDENCE_THRESHOLD}).
Do NOT quote, cite, or attribute any Bhagavad Gita verse or chapter number.
- selectedVerseId: empty string ""
- understandingYourProblem: 2 sentences acknowledging what they asked objectively.
- purportExcerpt: empty string ""
- wisdomApplied: 1–2 concise paragraphs of clearly unattributed, pragmatic reasoning addressing their query thoughtfully.
- whatYouShouldDo: 3 realistic practical steps.
- whatYouShouldAvoid: 2 common pitfalls to avoid.
- reflectionQuestion: 1 thoughtful clarifying question inviting them to share any deeper personal dilemma if relevant.
- tags: 2 concise topic tags.`;
  }

  const synthesisRes = await withRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: synthesisPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              selectedVerseId: { type: Type.STRING },
              understandingYourProblem: { type: Type.STRING },
              purportExcerpt: { type: Type.STRING },
              wisdomApplied: { type: Type.STRING },
              whatYouShouldDo: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              whatYouShouldAvoid: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              reflectionQuestion: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'selectedVerseId',
              'understandingYourProblem',
              'wisdomApplied',
              'whatYouShouldDo',
              'whatYouShouldAvoid',
              'reflectionQuestion',
              'tags',
            ],
          },
        },
      }),
      35000,
      'Guidance synthesis'
    )
  );

  const synth = JSON.parse((synthesisRes.text ?? '{}').trim()) as {
    selectedVerseId?: string;
    understandingYourProblem: string;
    purportExcerpt?: string;
    wisdomApplied: string;
    whatYouShouldDo: string[];
    whatYouShouldAvoid: string[];
    reflectionQuestion: string;
    tags: string[];
  };

  // Final deterministic post-check: chosen verse MUST be one of our validated Vedabase candidates!
  const chosenEntry = hasVerifiedCandidates
    ? validatedCandidates.find(
        (entry) => entry.check.verifiedVerse?.id === synth.selectedVerseId
      ) ?? validatedCandidates[0]
    : null;

  const finalVerifiedVerse = chosenEntry?.check.verifiedVerse ?? null;
  const finalConfidence = chosenEntry?.check.confidence ?? primaryValidation.confidence;
  const isVerified = Boolean(finalVerifiedVerse);

  const unverifiedNotice = !isVerified
    ? language === 'hi'
      ? 'मैं Vedabase में इस विशिष्ट बारीकी को सीधे संबोधित करने वाला कोई प्रमाणित भगवद्गीता श्लोक सत्यापित नहीं कर सका। नीचे बिना किसी शास्त्र-उद्धरण के व्यावहारिक तर्क प्रस्तुत है।'
      : language === 'hinglish'
      ? 'Main Vedabase mein is specific nuance ko directly address karne wala koi Bhagavad Gita verse verify nahi kar saka. Neeche alag se unattributed practical reasoning di gayi hai.'
      : 'I could not verify a specific Bhagavad Gita verse directly addressing this nuance in Vedabase. Below is clearly separated, unattributed practical reasoning.'
    : undefined;

  return {
    kind: 'guidance',
    verified: isVerified,
    confidenceScore: finalConfidence,
    analysis: {
      domain: analysis.domain,
      emotionalState: analysis.emotionalState,
      coreDilemma: analysis.coreDilemma,
    },
    understandingYourProblem: synth.understandingYourProblem,
    verse: finalVerifiedVerse,
    purportExcerpt: isVerified ? synth.purportExcerpt || null : null,
    unverifiedNotice,
    wisdomApplied: synth.wisdomApplied,
    whatYouShouldDo: (synth.whatYouShouldDo || []).slice(0, 5).map((text, idx) => ({
      id: `act-${Date.now()}-${idx}`,
      text,
      completed: false,
    })),
    whatYouShouldAvoid: (synth.whatYouShouldAvoid || []).slice(0, 3),
    reflectionQuestion: synth.reflectionQuestion,
    tags: (synth.tags || [analysis.domain]).slice(0, 3),
    extractedMemory:
      memoryEnabled && parsedAnalysis.extractedMemoryFact?.trim()
        ? parsedAnalysis.extractedMemoryFact.trim()
        : null,
  };
}
