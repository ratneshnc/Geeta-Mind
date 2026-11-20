import { useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  ExternalLink,
  MessageSquare,
  Search,
  Trash2,
} from 'lucide-react';
import type { GitaChapterInfo } from '../data/vedabaseCorpus';
import type {
  ChatMessage,
  JournalEntry,
  VedabaseVerse,
} from '../types/gita';

const LOTUS_ARTWORK = '/src/assets/images/sanctuary_manuscript_motif_1795078074956.jpg';

type VaultTab = 'explorer' | 'saved-verses' | 'saved-guidance' | 'journal';

interface ScriptureVaultViewProps {
  chapters: GitaChapterInfo[];
  verses: VedabaseVerse[];
  savedVerseIds: string[];
  bookmarkedMessages: { sessionId: string; sessionTitle: string; message: ChatMessage }[];
  journalEntries: JournalEntry[];
  onToggleSaveVerse: (verseId: string) => void;
  onOpenPurport: (verse: VedabaseVerse) => void;
  onReflectOnVerse: (verse: VedabaseVerse) => void;
  onOpenSession: (sessionId: string) => void;
  onDeleteJournalEntry: (entryId: string) => void;
}

const THEME_FILTERS = [
  'All',
  'Karma Yoga',
  'Anxiety',
  'Anger',
  'Boundaries',
  'Decision Making',
  'Leadership',
  'Burnout',
  'Letting Go',
  'Forgiveness',
];

export function ScriptureVaultView({
  chapters,
  verses,
  savedVerseIds,
  bookmarkedMessages,
  journalEntries,
  onToggleSaveVerse,
  onOpenPurport,
  onReflectOnVerse,
  onOpenSession,
  onDeleteJournalEntry,
}: ScriptureVaultViewProps) {
  const [activeTab, setActiveTab] = useState<VaultTab>('explorer');
  const [selectedChapter, setSelectedChapter] = useState<number | 'all'>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [imgError, setImgError] = useState(false);

  const savedSet = useMemo(() => new Set(savedVerseIds), [savedVerseIds]);

  const filteredVerses = useMemo(() => {
    const base =
      activeTab === 'saved-verses'
        ? verses.filter((v) => savedSet.has(v.id))
        : verses;

    return base.filter((v) => {
      if (selectedChapter !== 'all' && v.chapter_no !== selectedChapter) {
        return false;
      }
      if (selectedTheme !== 'All') {
        const tLower = selectedTheme.toLowerCase();
        const matchesTheme =
          v.themes.some((t) => t.toLowerCase().includes(tLower)) ||
          v.emotions.some((e) => e.toLowerCase().includes(tLower)) ||
          v.domains.some((d) => d.toLowerCase().includes(tLower)) ||
          v.keywords.some((k) => k.toLowerCase().includes(tLower));
        if (!matchesTheme) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const haystack = `${v.id} ${v.chapter_title} ${v.translation} ${v.transliteration} ${v.purport} ${v.themes.join(' ')} ${v.keywords.join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [verses, activeTab, savedSet, selectedChapter, selectedTheme, searchQuery]);

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 space-y-8">
      {/* Editorial Header with Archival Manuscript Artwork */}
      <header className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch">
        <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#C85A32] dark:text-[#E6B85C] mb-1.5">
              Vedabase.io Verified Index · Chapters 1–18
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
              Scripture Explorer & Vault
            </h1>
            <p className="text-sm leading-relaxed text-[#5C6460] dark:text-[#9CA3AF] mt-2">
              Browse verified shlokas from Bhagavad-gītā As It Is by chapter or life theme, revisit bookmarked teachings, and review your reflection journal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C6460] dark:text-[#9CA3AF] tabular-nums">
            <span>{verses.length} verified shlokas indexed</span>
            <span aria-hidden="true">·</span>
            <span>{savedVerseIds.length} saved verses</span>
            <span aria-hidden="true">·</span>
            <span>{journalEntries.length} journal notes</span>
          </div>
        </div>
        <div className="md:col-span-5 min-h-[160px] bg-[#EFE9DD] dark:bg-[#202630]">
          {!imgError ? (
            <img
              src={LOTUS_ARTWORK}
              alt="Minimalist lotus botanical line drawing on warm parchment paper"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#EFE8DB] to-[#E2D8C5] dark:from-[#1D232C] dark:to-[#272F3C]" />
          )}
        </div>
      </header>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E4DC] dark:border-[#292F3A] pb-3">
        <div
          role="tablist"
          aria-label="Vault views"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#EFEBE3] dark:bg-[#1B2028]"
        >
          {(
            [
              { id: 'explorer', label: 'All Chapters' },
              { id: 'saved-verses', label: `Saved Verses (${savedVerseIds.length})` },
              {
                id: 'saved-guidance',
                label: `Saved Guidance (${bookmarkedMessages.length})`,
              },
              { id: 'journal', label: `Journal (${journalEntries.length})` },
            ] as { id: VaultTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#272E3B] text-[#1F2421] dark:text-[#F2EFE9] shadow-xs'
                  : 'text-[#5C6460] dark:text-[#9CA3AF] hover:text-[#1F2421] dark:hover:text-[#F2EFE9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(activeTab === 'explorer' || activeTab === 'saved-verses') && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#7D8580] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search verse, Sanskrit, or theme..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-[#1A1E25] border border-[#E2DDD3] dark:border-[#2C3340] text-[#1F2421] dark:text-[#F2EFE9] placeholder:text-[#8A918D] focus:outline-none focus:ring-2 focus:ring-[#C85A32]/25 dark:focus:ring-[#E6B85C]/25"
            />
          </div>
        )}
      </div>

      {/* Filters for Explorer & Saved Verses */}
      {(activeTab === 'explorer' || activeTab === 'saved-verses') && (
        <div className="space-y-4">
          {/* Chapter Selector (1-18) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedChapter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedChapter === 'all'
                  ? 'bg-[#C85A32] text-white dark:bg-[#E6B85C] dark:text-[#12151A]'
                  : 'bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] text-[#5C6460] dark:text-[#9CA3AF] hover:text-[#1F2421] dark:hover:text-[#F2EFE9]'
              }`}
            >
              All 18 Chapters
            </button>
            {chapters.map((ch) => (
              <button
                key={ch.chapter_no}
                type="button"
                onClick={() => setSelectedChapter(ch.chapter_no)}
                title={`Chapter ${ch.chapter_no}: ${ch.title}`}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedChapter === ch.chapter_no
                    ? 'bg-[#C85A32] text-white dark:bg-[#E6B85C] dark:text-[#12151A]'
                    : 'bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] text-[#5C6460] dark:text-[#9CA3AF] hover:text-[#1F2421] dark:hover:text-[#F2EFE9]'
                }`}
              >
                Ch. {ch.chapter_no}
              </button>
            ))}
          </div>

          {/* Theme Filter Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {THEME_FILTERS.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setSelectedTheme(theme)}
                className={`px-3 py-1 rounded-md text-xs transition-colors whitespace-nowrap cursor-pointer ${
                  selectedTheme === theme
                    ? 'bg-[#1F2421] text-white dark:bg-[#F2EFE9] dark:text-[#12151A] font-medium'
                    : 'text-[#5C6460] dark:text-[#9CA3AF] hover:bg-[#EFEBE3] dark:hover:bg-[#232934]'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>

          {/* Selected Chapter Summary Banner */}
          {selectedChapter !== 'all' && (
            <div className="py-3 px-4 rounded-lg bg-[#F5F1E9] dark:bg-[#191E26] border border-[#E8E2D6] dark:border-[#292F3A]">
              {(() => {
                const ch = chapters.find((c) => c.chapter_no === selectedChapter);
                if (!ch) return null;
                return (
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-serif text-base font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
                      Chapter {ch.chapter_no}: {ch.title}
                    </h2>
                    <span className="text-xs italic font-serif text-[#C85A32] dark:text-[#E6B85C]">
                      {ch.sanskrit_name}
                    </span>
                    <p className="w-full text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                      {ch.summary}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Verses List */}
          {filteredVerses.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-10 text-center space-y-2">
              <p className="font-serif text-lg text-[#1F2421] dark:text-[#F2EFE9]">
                No matching verses found
              </p>
              <p className="text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                Try clearing your chapter or theme filter to explore more teachings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVerses.map((v) => {
                const isSaved = savedSet.has(v.id);
                return (
                  <article
                    key={v.id}
                    className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-5 sm:p-6 space-y-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-2 text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                        <span className="font-serif text-base font-semibold text-[#C85A32] dark:text-[#E6B85C]">
                          BG {v.chapter_no}.{v.verse_no}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{v.chapter_title}</span>
                        <span aria-hidden="true">·</span>
                        <span>{v.themes.slice(0, 3).join(' / ')}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleSaveVerse(v.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C6460] hover:text-[#1F2421] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] cursor-pointer"
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${
                            isSaved
                              ? 'fill-[#C85A32] text-[#C85A32] dark:fill-[#E6B85C] dark:text-[#E6B85C]'
                              : ''
                          }`}
                        />
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>

                    <p className="font-sanskrit text-[15px] text-[#3B413D] dark:text-[#C9CED7] whitespace-pre-line">
                      {v.sanskrit_devanagari}
                    </p>

                    <p className="font-serif text-[16px] leading-relaxed text-[#1F2421] dark:text-[#F2EFE9]">
                      “{v.translation}”
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F0ECE4] dark:border-[#252B36]">
                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => onOpenPurport(v)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C85A32] dark:text-[#E6B85C] hover:underline underline-offset-4 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read Full Purport</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onReflectOnVerse(v)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#464D49] dark:text-[#C5CAD3] hover:text-[#1F2421] dark:hover:text-white cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Apply to My Situation</span>
                        </button>
                      </div>

                      <a
                        href={v.canonical_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#5C6460] dark:text-[#9CA3AF] hover:text-[#C85A32] dark:hover:text-[#E6B85C]"
                      >
                        <span>Vedabase.io</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Saved Guidance Cards Tab */}
      {activeTab === 'saved-guidance' && (
        <div className="space-y-4">
          {bookmarkedMessages.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-10 text-center space-y-2">
              <p className="font-serif text-lg text-[#1F2421] dark:text-[#F2EFE9]">
                No saved guidance cards yet
              </p>
              <p className="text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                Click “Save Guidance” on any structured response in the Sanctuary to keep it here for quick reference.
              </p>
            </div>
          ) : (
            bookmarkedMessages.map(({ sessionId, sessionTitle, message }) => (
              <article
                key={message.id}
                className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#C85A32] dark:text-[#E6B85C]">
                      {message.guidance?.verse
                        ? `BG ${message.guidance.verse.chapter_no}.${message.guidance.verse.verse_no}`
                        : 'Practical Guidance'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{message.guidance?.analysis.domain}</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenSession(sessionId)}
                    className="text-xs font-medium text-[#C85A32] dark:text-[#E6B85C] hover:underline underline-offset-4 cursor-pointer"
                  >
                    Open Reflection →
                  </button>
                </div>
                <h3 className="font-serif text-base font-medium text-[#1F2421] dark:text-[#F2EFE9]">
                  {sessionTitle}
                </h3>
                <p className="text-sm leading-relaxed text-[#464D49] dark:text-[#C5CAD3]">
                  {message.guidance?.understandingYourProblem}
                </p>
              </article>
            ))
          )}
        </div>
      )}

      {/* Reflection Journal Tab */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {journalEntries.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-10 text-center space-y-2">
              <p className="font-serif text-lg text-[#1F2421] dark:text-[#F2EFE9]">
                Your reflection journal is empty
              </p>
              <p className="text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                Use “Save to Journal” at the bottom of any guidance card to record your honest answers to the Gita’s reflection prompts.
              </p>
            </div>
          ) : (
            journalEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                  <div className="flex items-center gap-2">
                    {entry.verseRef && (
                      <>
                        <span className="font-semibold text-[#C85A32] dark:text-[#E6B85C]">
                          {entry.verseRef}
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                    {entry.tags.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{entry.tags.join(' / ')}</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteJournalEntry(entry.id)}
                    aria-label="Delete journal entry"
                    className="p-1.5 rounded-md text-[#7D8580] hover:text-[#B83B23] hover:bg-[#FCECE6] dark:hover:bg-[#3A221B] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="font-serif italic text-sm text-[#5C6460] dark:text-[#A8B0BC]">
                  Prompt: {entry.question}
                </p>
                <p className="text-sm leading-relaxed text-[#1F2421] dark:text-[#F2EFE9] whitespace-pre-line">
                  {entry.note}
                </p>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
