/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Brain,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { CrisisCard } from './components/CrisisCard';
import { GuidanceCard } from './components/GuidanceCard';
import { MemoryControlView } from './components/MemoryControlView';
import { OnboardingBanner } from './components/OnboardingBanner';
import { PipelineStatus } from './components/PipelineStatus';
import { PurportDrawer } from './components/PurportDrawer';
import { ScriptureVaultView } from './components/ScriptureVaultView';
import type { GitaChapterInfo } from './data/vedabaseCorpus';
import {
  fetchDailyShloka,
  fetchVersesIndex,
  storage,
  streamGuidance,
} from './services/api';
import type {
  ChatMessage,
  ConversationSession,
  DailyShlokaData,
  JournalEntry,
  LanguagePreference,
  MemoryFact,
  PipelineStepEvent,
  UserPreferences,
  VedabaseVerse,
} from './types/gita';

type ActiveView = 'sanctuary' | 'vault' | 'memory';

interface StarterPrompt {
  category: string;
  label: string;
  prompt: string;
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    category: 'Workplace',
    label: 'Dealing with an unfair boss',
    prompt:
      'My manager took credit for a project I spent months building, and I feel angry and unmotivated to keep giving my best.',
  },
  {
    category: 'Anxiety',
    label: 'Overthinking future outcomes',
    prompt:
      'I cannot stop overthinking whether my upcoming career move and exams will go wrong, and it is paralyzing my daily focus.',
  },
  {
    category: 'Relationships',
    label: 'Setting boundaries without guilt',
    prompt:
      'I want to set honest boundaries with a family member who constantly criticizes my choices, without feeling guilty or causing a huge fight.',
  },
  {
    category: 'Ethics',
    label: 'Choosing between loyalty and truth',
    prompt:
      'A close colleague at work cut corners on a deliverable and expects me to stay silent out of loyalty. How should I handle this ethically?',
  },
];

// Minimal Web Speech Recognition typing
interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export default function App() {
  // Persisted state
  const [prefs, setPrefs] = useState<UserPreferences>(() => storage.loadPrefs());
  const [sessions, setSessions] = useState<ConversationSession[]>(() =>
    storage.loadSessions()
  );
  const [savedVerseIds, setSavedVerseIds] = useState<string[]>(() =>
    storage.loadSavedVerseIds()
  );
  const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>(() =>
    storage.loadMemory()
  );
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() =>
    storage.loadJournal()
  );

  // Navigation & layout state
  const [activeView, setActiveView] = useState<ActiveView>('sanctuary');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Purport drawer state
  const [drawerVerse, setDrawerVerse] = useState<VedabaseVerse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Server data
  const [chapters, setChapters] = useState<GitaChapterInfo[]>([]);
  const [verses, setVerses] = useState<VedabaseVerse[]>([]);
  const [dailyShloka, setDailyShloka] = useState<DailyShlokaData | null>(null);

  // Conversation / streaming state
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStepEvent | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const speechRef = useRef<BrowserSpeechRecognition | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    storage.savePrefs(prefs);
  }, [prefs]);

  // Persist user data
  useEffect(() => {
    storage.saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    storage.saveSavedVerseIds(savedVerseIds);
  }, [savedVerseIds]);

  useEffect(() => {
    storage.saveMemory(memoryFacts);
  }, [memoryFacts]);

  useEffect(() => {
    storage.saveJournal(journalEntries);
  }, [journalEntries]);

  // Initial load of Vedabase verified index & Daily Shloka
  useEffect(() => {
    fetchVersesIndex()
      .then((data) => {
        setChapters(data.chapters);
        setVerses(data.verses);
      })
      .catch(() => {
        // Handled silently on initial hydrate
      });

    fetchDailyShloka()
      .then((data) => setDailyShloka(data))
      .catch(() => {
        // Optional widget
      });
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  // Auto-scroll when messages update or streaming starts
  useEffect(() => {
    if (activeView === 'sanctuary' && (activeSession?.messages.length || isStreaming)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeSession?.messages.length, isStreaming, pipelineStep?.step, activeView]);

  const updatePrefs = (patch: Partial<UserPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  };

  const handleOpenPurport = (verse: VedabaseVerse) => {
    setDrawerVerse(verse);
    setDrawerOpen(true);
  };

  const handleToggleSaveVerse = (verseId: string) => {
    setSavedVerseIds((prev) =>
      prev.includes(verseId)
        ? prev.filter((id) => id !== verseId)
        : [verseId, ...prev]
    );
  };

  const isVerseSaved = (verseId: string) => savedVerseIds.includes(verseId);

  const handleNewSession = () => {
    setActiveSessionId(null);
    setActiveView('sanctuary');
    setErrorMsg(null);
    setMobileNavOpen(false);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening && speechRef.current) {
      speechRef.current.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMsg('Voice dictation is not supported in this browser. Please type your reflection.');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = prefs.language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    speechRef.current = recognition;
    setErrorMsg(null);
    setIsListening(true);
    recognition.start();
  };

  const submitQuery = async (overrideText?: string) => {
    const query = (overrideText ?? inputText).trim();
    if (!query || isStreaming) return;

    setErrorMsg(null);
    setInputText('');
    setActiveView('sanctuary');

    const nowIso = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      createdAt: nowIso,
      userText: query,
    };

    // Determine target session
    let targetSessionId = activeSessionId;
    let recentHistory: { role: 'user' | 'assistant'; summary: string }[] = [];

    if (!targetSessionId) {
      targetSessionId = `sess-${Date.now()}`;
      const shortTitle =
        query.length > 54 ? `${query.slice(0, 54).trim()}…` : query;
      const newSession: ConversationSession = {
        id: targetSessionId,
        title: shortTitle,
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [userMsg],
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(targetSessionId);
    } else {
      const existing = sessions.find((s) => s.id === targetSessionId);
      if (existing) {
        recentHistory = existing.messages.slice(-4).map((m) => ({
          role: m.role,
          summary:
            m.role === 'user'
              ? m.userText ?? ''
              : m.guidance?.understandingYourProblem ?? 'Guidance shared',
        }));
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, updatedAt: nowIso, messages: [...s.messages, userMsg] }
            : s
        )
      );
    }

    setIsStreaming(true);
    setPipelineStep({
      step: 1,
      label: 'Understanding your situation...',
      detail: 'Analyzing emotional context and core dilemma',
    });

    try {
      const result = await streamGuidance({
        query,
        language: prefs.language,
        memoryFacts: memoryFacts.map((m) => m.content),
        memoryEnabled: prefs.memoryEnabled,
        recentHistory,
        onStep: (stepEvent) => setPipelineStep(stepEvent),
      });

      const assistantMsg: ChatMessage =
        result.kind === 'crisis'
          ? {
              id: `msg-a-${Date.now()}`,
              role: 'assistant',
              createdAt: new Date().toISOString(),
              crisis: result,
            }
          : {
              id: `msg-a-${Date.now()}`,
              role: 'assistant',
              createdAt: new Date().toISOString(),
              guidance: result,
              feedback: null,
              bookmarked: false,
            };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? {
                ...s,
                domain:
                  result.kind === 'guidance'
                    ? result.analysis.domain
                    : s.domain,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, assistantMsg],
              }
            : s
        )
      );

      // Update opt-in longitudinal memory if extracted
      if (
        result.kind === 'guidance' &&
        prefs.memoryEnabled &&
        result.extractedMemory
      ) {
        const extracted = result.extractedMemory;
        const theme = result.analysis.domain;
        setMemoryFacts((prev) => {
          const similarIdx = prev.findIndex(
            (f) =>
              f.theme === theme &&
              f.content.toLowerCase().slice(0, 24) ===
                extracted.toLowerCase().slice(0, 24)
          );
          if (similarIdx >= 0) {
            return prev.map((f, idx) =>
              idx === similarIdx
                ? { ...f, occurrences: f.occurrences + 1 }
                : f
            );
          }
          return [
            {
              id: `mem-${Date.now()}`,
              content: extracted,
              theme,
              occurrences: 1,
              createdAt: new Date().toISOString(),
              sourceSessionId: targetSessionId ?? undefined,
            },
            ...prev,
          ];
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not complete guidance request. Please try again.'
      );
    } finally {
      setIsStreaming(false);
      setPipelineStep(null);
    }
  };

  const handleToggleActionItem = (messageId: string, actionId: string) => {
    if (!activeSessionId) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) => {
            if (m.id !== messageId || !m.guidance) return m;
            return {
              ...m,
              guidance: {
                ...m.guidance,
                whatYouShouldDo: m.guidance.whatYouShouldDo.map((a) =>
                  a.id === actionId ? { ...a, completed: !a.completed } : a
                ),
              },
            };
          }),
        };
      })
    );
  };

  const handleToggleBookmarkMessage = (messageId: string) => {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m
        ),
      }))
    );
  };

  const handleFeedback = (messageId: string, rating: 'up' | 'down') => {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === messageId
            ? { ...m, feedback: m.feedback === rating ? null : rating }
            : m
        ),
      }))
    );
  };

  const handleReplyToReflect = (question: string) => {
    setInputText(`Reflecting on "${question}" — `);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSaveToJournal = (entry: {
    question: string;
    verseRef?: string;
    note: string;
    tags: string[];
  }) => {
    const newEntry: JournalEntry = {
      id: `jrn-${Date.now()}`,
      question: entry.question,
      verseRef: entry.verseRef,
      note: entry.note,
      tags: entry.tags,
      createdAt: new Date().toISOString(),
    };
    setJournalEntries((prev) => [newEntry, ...prev]);
  };

  const handleReflectOnVerse = (verse: VedabaseVerse) => {
    setActiveView('sanctuary');
    setActiveSessionId(null);
    setInputText(
      `How can I apply Bhagavad-gītā ${verse.chapter_no}.${verse.verse_no} ("${verse.themes[0] ?? 'its teaching'}") to a challenge I'm facing right now? `
    );
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const bookmarkedMessages = useMemo(() => {
    const list: {
      sessionId: string;
      sessionTitle: string;
      message: ChatMessage;
    }[] = [];
    for (const s of sessions) {
      for (const m of s.messages) {
        if (m.bookmarked && m.guidance) {
          list.push({ sessionId: s.id, sessionTitle: s.title, message: m });
        }
      }
    }
    return list;
  }, [sessions]);

  const handleClearAllHistory = () => {
    storage.clearAllUserData();
    setSessions([]);
    setMemoryFacts([]);
    setJournalEntries([]);
    setActiveSessionId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuery();
    }
  };

  // Sidebar Content (shared between desktop collapsible panel and mobile slide-over)
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand + Collapse */}
      <div className="px-4 py-4 border-b border-[#E8E4DC] dark:border-[#292F3A] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleNewSession}
          className="font-serif text-lg font-semibold tracking-tight text-[#1F2421] dark:text-[#F2EFE9] whitespace-nowrap cursor-pointer"
        >
          GitaMind
        </button>

        <button
          type="button"
          onClick={() => {
            if (mobileNavOpen) {
              setMobileNavOpen(false);
            } else {
              setSidebarCollapsed(true);
            }
          }}
          aria-label="Collapse sidebar"
          className="p-1.5 rounded-md text-[#5C6460] hover:text-[#1F2421] hover:bg-[#EFEBE3] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] dark:hover:bg-[#232934] transition-colors cursor-pointer"
        >
          {mobileNavOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Primary New Session CTA */}
      <div className="p-3.5">
        <button
          type="button"
          onClick={handleNewSession}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#C85A32] hover:bg-[#B24C27] text-white dark:bg-[#E6B85C] dark:hover:bg-[#D7A94D] dark:text-[#12151A] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Reflection</span>
        </button>
      </div>

      {/* Primary Navigation */}
      <nav aria-label="Primary workspace navigation" className="px-2.5 space-y-1">
        {(
          [
            { id: 'sanctuary', label: 'Sanctuary', icon: MessageSquare },
            { id: 'vault', label: 'Scripture & Vault', icon: BookOpen },
            { id: 'memory', label: 'Memory & Privacy', icon: Brain },
          ] as { id: ActiveView; label: string; icon: typeof MessageSquare }[]
        ).map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveView(item.id);
                setMobileNavOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#EFEAE0] text-[#1F2421] dark:bg-[#222833] dark:text-[#F2EFE9]'
                  : 'text-[#5C6460] hover:text-[#1F2421] hover:bg-[#F5F1E9] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] dark:hover:bg-[#1D222C]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Past Reflections History */}
      <div className="flex-1 overflow-y-auto px-2.5 pt-5 pb-3">
        <p className="px-3 text-[11px] font-medium text-[#7A827D] dark:text-[#7E8794] mb-2">
          Past Reflections
        </p>

        {sessions.length === 0 ? (
          <p className="px-3 text-xs text-[#8A918D] dark:text-[#6B7380] leading-relaxed">
            Your reflections will appear here automatically.
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((sess) => {
              const selected =
                activeView === 'sanctuary' && activeSessionId === sess.id;
              return (
                <li key={sess.id} className="group relative flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSessionId(sess.id);
                      setActiveView('sanctuary');
                      setMobileNavOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 pr-8 rounded-lg transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#EFEAE0] text-[#1F2421] dark:bg-[#222833] dark:text-[#F2EFE9]'
                        : 'text-[#464D49] hover:bg-[#F5F1E9] dark:text-[#B9BFC9] dark:hover:bg-[#1D222C]'
                    }`}
                  >
                    <p className="text-xs font-medium truncate">{sess.title}</p>
                    <p className="text-[11px] text-[#7A827D] dark:text-[#7E8794] truncate mt-0.5">
                      {sess.domain ? `${sess.domain} · ` : ''}
                      {new Date(sess.updatedAt).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(sess.id)}
                    aria-label="Delete reflection"
                    className="absolute right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#7A827D] hover:text-[#B83B23] hover:bg-[#FCECE6] dark:hover:bg-[#3A221B] transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-3 border-t border-[#E8E4DC] dark:border-[#292F3A] flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => updatePrefs({ darkMode: !prefs.darkMode })}
          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#5C6460] hover:text-[#1F2421] hover:bg-[#EFEBE3] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] dark:hover:bg-[#232934] transition-colors whitespace-nowrap cursor-pointer"
        >
          {prefs.darkMode ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#E6B85C]" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5" />
              <span>Night Mode</span>
            </>
          )}
        </button>

        <span
          className="text-[11px] text-[#7A827D] dark:text-[#7E8794] truncate"
          title="Current response language"
        >
          {prefs.language === 'en'
            ? 'EN'
            : prefs.language === 'hi'
            ? 'हिन्दी'
            : 'Hinglish'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#FAF8F5] dark:bg-[#12151A] text-[#1F2421] dark:text-[#F2EFE9]">
      {/* Desktop Left Collapsible Sidebar (260px) */}
      {!sidebarCollapsed && (
        <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-[#F5F2EB] dark:bg-[#151920] border-r border-[#E8E4DC] dark:border-[#292F3A]">
          {renderSidebarContent()}
        </aside>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 w-[272px] max-w-[85vw] bg-[#F5F2EB] dark:bg-[#151920] border-r border-[#E8E4DC] dark:border-[#292F3A] h-full">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Center Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Clean Minimal Workspace Header */}
        <header className="h-14 shrink-0 px-4 sm:px-6 border-b border-[#E8E4DC] dark:border-[#292F3A] bg-[#FAF8F5]/90 dark:bg-[#12151A]/90 backdrop-blur-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 -ml-1 rounded-lg text-[#5C6460] hover:bg-[#EFEBE3] dark:text-[#9CA3AF] dark:hover:bg-[#232934] cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expand sidebar"
                className="hidden lg:inline-flex p-2 -ml-1 rounded-lg text-[#5C6460] hover:text-[#1F2421] hover:bg-[#EFEBE3] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] dark:hover:bg-[#232934] cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            <span className="font-serif text-base font-medium text-[#1F2421] dark:text-[#F2EFE9] truncate">
              {activeView === 'sanctuary'
                ? activeSession?.title || 'The Sanctuary'
                : activeView === 'vault'
                ? 'Scripture Explorer & Vault'
                : 'Memory & Privacy'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#5C6460] dark:text-[#9CA3AF] shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2E6B47] dark:text-[#78C496]" />
              <span>Vedabase.io Grounded</span>
            </span>
            <button
              type="button"
              onClick={() => updatePrefs({ darkMode: !prefs.darkMode })}
              aria-label="Toggle color theme"
              className="lg:hidden p-2 rounded-lg hover:bg-[#EFEBE3] dark:hover:bg-[#232934] cursor-pointer"
            >
              {prefs.darkMode ? (
                <Sun className="w-4 h-4 text-[#E6B85C]" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto">
          {activeView === 'vault' ? (
            <ScriptureVaultView
              chapters={chapters}
              verses={verses}
              savedVerseIds={savedVerseIds}
              bookmarkedMessages={bookmarkedMessages}
              journalEntries={journalEntries}
              onToggleSaveVerse={handleToggleSaveVerse}
              onOpenPurport={handleOpenPurport}
              onReflectOnVerse={handleReflectOnVerse}
              onOpenSession={(sid) => {
                setActiveSessionId(sid);
                setActiveView('sanctuary');
              }}
              onDeleteJournalEntry={(id) =>
                setJournalEntries((prev) => prev.filter((e) => e.id !== id))
              }
            />
          ) : activeView === 'memory' ? (
            <MemoryControlView
              memoryFacts={memoryFacts}
              prefs={prefs}
              sessionCount={sessions.length}
              onUpdatePrefs={updatePrefs}
              onAddMemoryFact={(content, theme) =>
                setMemoryFacts((prev) => [
                  {
                    id: `mem-${Date.now()}`,
                    content,
                    theme,
                    occurrences: 1,
                    createdAt: new Date().toISOString(),
                  },
                  ...prev,
                ])
              }
              onUpdateMemoryFact={(id, content) =>
                setMemoryFacts((prev) =>
                  prev.map((f) => (f.id === id ? { ...f, content } : f))
                )
              }
              onDeleteMemoryFact={(id) =>
                setMemoryFacts((prev) => prev.filter((f) => f.id !== id))
              }
              onClearAllHistory={handleClearAllHistory}
            />
          ) : (
            /* Screen 2: The Sanctuary (Max-width 760px Center Stage) */
            <div className="max-w-[760px] mx-auto px-4 sm:px-6 pt-7 pb-10">
              {/* Empty State (Prompt Launchpad) */}
              {!activeSession && !isStreaming ? (
                <div>
                  {!prefs.onboardingCompleted && (
                    <OnboardingBanner
                      prefs={prefs}
                      onUpdatePrefs={updatePrefs}
                      onDismiss={() =>
                        updatePrefs({ onboardingCompleted: true })
                      }
                    />
                  )}

                  <div className="mb-8 space-y-2.5">
                    <p className="text-xs font-medium text-[#C85A32] dark:text-[#E6B85C]">
                      Bhagavad-gītā Personal Guidance Companion
                    </p>
                    <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1F2421] dark:text-[#F2EFE9] leading-tight">
                      What dilemma is weighing on your mind today?
                    </h1>
                    <p className="text-[15px] leading-relaxed text-[#5C6460] dark:text-[#9CA3AF] max-w-2xl">
                      Share a workplace challenge, difficult decision, or emotional knot. GitaMind verifies an authentic shloka from Vedabase.io and turns it into clear, practical next steps.
                    </p>
                  </div>

                  {/* Contextual Starter Buttons */}
                  <section aria-label="Starter dilemmas" className="mb-9">
                    <p className="text-xs font-medium text-[#5C6460] dark:text-[#9CA3AF] mb-3">
                      Begin with a common dilemma
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {STARTER_PROMPTS.map((starter) => (
                        <button
                          key={starter.label}
                          type="button"
                          onClick={() => submitQuery(starter.prompt)}
                          className="text-left rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] hover:border-[#C85A32]/60 dark:hover:border-[#E6B85C]/60 px-4 py-3.5 transition-colors group cursor-pointer"
                        >
                          <span className="text-xs font-medium text-[#C85A32] dark:text-[#E6B85C]">
                            {starter.category}
                          </span>
                          <p className="text-sm font-medium text-[#1F2421] dark:text-[#F2EFE9] mt-0.5 group-hover:text-[#C85A32] dark:group-hover:text-[#E6B85C] transition-colors">
                            {starter.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Optional Non-Intrusive Daily Shloka Widget */}
                  {dailyShloka && (
                    <section
                      aria-label="Daily shloka reflection"
                      className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-6 space-y-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                        <span>
                          Daily Shloka · {dailyShloka.dateLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenPurport(dailyShloka.verse)}
                          className="font-serif font-semibold text-[#C85A32] dark:text-[#E6B85C] hover:underline underline-offset-4 cursor-pointer"
                        >
                          BG {dailyShloka.verse.chapter_no}.
                          {dailyShloka.verse.verse_no} · Read Purport →
                        </button>
                      </div>

                      <blockquote className="font-serif text-[16px] leading-relaxed text-[#1F2421] dark:text-[#F2EFE9]">
                        “{dailyShloka.verse.translation}”
                      </blockquote>

                      <div className="pt-3 border-t border-[#F0ECE4] dark:border-[#252B36] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs italic font-serif text-[#5C6460] dark:text-[#A8B0BC]">
                          1-minute reflection: {dailyShloka.modernPrompt}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            submitQuery(
                              `I'd like to reflect on today's shloka (BG ${dailyShloka.verse.chapter_no}.${dailyShloka.verse.verse_no}): ${dailyShloka.modernPrompt}`
                            )
                          }
                          className="text-xs font-medium text-[#C85A32] dark:text-[#E6B85C] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Reflect Now
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                /* Active Conversational Thread */
                <div className="space-y-6">
                  {activeSession?.messages.map((msg) =>
                    msg.role === 'user' ? (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-xl bg-[#EFEAE0] dark:bg-[#232833] border border-[#E3DDD1] dark:border-[#313847] px-5 py-3.5 text-[15px] leading-relaxed text-[#1F2421] dark:text-[#F2EFE9]">
                          {msg.userText}
                        </div>
                      </div>
                    ) : msg.crisis ? (
                      <CrisisCard key={msg.id} crisis={msg.crisis} />
                    ) : (
                      <GuidanceCard
                        key={msg.id}
                        message={msg}
                        prefs={prefs}
                        isVerseSaved={isVerseSaved}
                        onToggleSaveVerse={handleToggleSaveVerse}
                        onToggleBookmarkMessage={handleToggleBookmarkMessage}
                        onToggleActionItem={handleToggleActionItem}
                        onOpenPurport={handleOpenPurport}
                        onReplyToReflect={handleReplyToReflect}
                        onSaveToJournal={handleSaveToJournal}
                        onFeedback={handleFeedback}
                      />
                    )
                  )}

                  {isStreaming && pipelineStep && (
                    <PipelineStatus activeStep={pipelineStep} />
                  )}

                  {errorMsg && (
                    <div
                      role="alert"
                      className="rounded-xl bg-[#FDF1EC] dark:bg-[#2D1E1B] border border-[#EBC7BC] dark:border-[#57322A] px-5 py-4 flex items-start gap-3 text-sm text-[#9C351E] dark:text-[#F09A82]"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Unable to generate guidance</p>
                        <p className="text-xs mt-0.5 opacity-90">{errorMsg}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setErrorMsg(null)}
                        aria-label="Dismiss error"
                        className="p-1 hover:bg-black/5 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Bottom Prompt Composer (Visible in Sanctuary view) */}
        {activeView === 'sanctuary' && (
          <div className="shrink-0 border-t border-[#E8E4DC] dark:border-[#292F3A] bg-[#FAF8F5] dark:bg-[#12151A] px-4 sm:px-6 py-3.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitQuery();
              }}
              className="max-w-[760px] mx-auto"
            >
              <div className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#DDD7CB] dark:border-[#2E3543] focus-within:border-[#C85A32] dark:focus-within:border-[#E6B85C] transition-colors p-2.5">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  disabled={isStreaming}
                  placeholder="What dilemma or situation is weighing on your mind today?"
                  className="w-full resize-none bg-transparent px-2.5 py-1 text-[15px] leading-relaxed text-[#1F2421] dark:text-[#F2EFE9] placeholder:text-[#8A918D] focus:outline-none disabled:opacity-60"
                />

                <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-[#F2EFE8] dark:border-[#252B36] px-1">
                  {/* Language Quick Selector + Voice Input */}
                  <div className="flex items-center gap-1.5">
                    <div
                      role="group"
                      aria-label="Response language"
                      className="inline-flex items-center rounded-md bg-[#F4F0E8] dark:bg-[#14171D] p-0.5"
                    >
                      {(
                        [
                          { id: 'en', label: 'EN' },
                          { id: 'hi', label: 'हिन्दी' },
                          { id: 'hinglish', label: 'Hinglish' },
                        ] as { id: LanguagePreference; label: string }[]
                      ).map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => updatePrefs({ language: lang.id })}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                            prefs.language === lang.id
                              ? 'bg-white dark:bg-[#272E3B] text-[#1F2421] dark:text-[#F2EFE9]'
                              : 'text-[#5C6460] dark:text-[#9CA3AF] hover:text-[#1F2421] dark:hover:text-[#F2EFE9]'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleVoiceToggle}
                      title={isListening ? 'Stop voice input' : 'Speak your dilemma'}
                      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        isListening
                          ? 'bg-[#FCECE6] text-[#B83B23] dark:bg-[#3A221B] dark:text-[#F09A82]'
                          : 'text-[#5C6460] hover:text-[#1F2421] hover:bg-[#F4F0E8] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] dark:hover:bg-[#232934]'
                      }`}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isStreaming}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C85A32] hover:bg-[#B24C27] text-white dark:bg-[#E6B85C] dark:hover:bg-[#D7A94D] dark:text-[#12151A] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Reflect</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[#7A827D] dark:text-[#7E8794] text-center mt-2">
                Grounded strictly in Vedabase.io · Not a substitute for professional medical or mental health care.
              </p>
            </form>
          </div>
        )}
      </div>

      {/* Collapsible Right Context Drawer (Full Vedabase Purport Reader) */}
      <PurportDrawer
        verse={drawerVerse}
        isOpen={drawerOpen}
        isSaved={drawerVerse ? isVerseSaved(drawerVerse.id) : false}
        onClose={() => setDrawerOpen(false)}
        onSelectVerse={(v) => setDrawerVerse(v)}
        onToggleSave={handleToggleSaveVerse}
      />
    </div>
  );
}
