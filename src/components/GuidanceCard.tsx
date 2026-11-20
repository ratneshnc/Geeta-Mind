import { useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  MessageSquarePlus,
  NotebookPen,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import type {
  ChatMessage,
  UserPreferences,
  VedabaseVerse,
} from '../types/gita';

interface GuidanceCardProps {
  message: ChatMessage;
  prefs: UserPreferences;
  isVerseSaved: (verseId: string) => boolean;
  onToggleSaveVerse: (verseId: string) => void;
  onToggleBookmarkMessage: (messageId: string) => void;
  onToggleActionItem: (messageId: string, actionId: string) => void;
  onOpenPurport: (verse: VedabaseVerse) => void;
  onReplyToReflect: (question: string) => void;
  onSaveToJournal: (entry: {
    question: string;
    verseRef?: string;
    note: string;
    tags: string[];
  }) => void;
  onFeedback: (messageId: string, rating: 'up' | 'down') => void;
}

export function GuidanceCard({
  message,
  prefs,
  isVerseSaved,
  onToggleSaveVerse,
  onToggleBookmarkMessage,
  onToggleActionItem,
  onOpenPurport,
  onReplyToReflect,
  onSaveToJournal,
  onFeedback,
}: GuidanceCardProps) {
  const guidance = message.guidance;
  const [sanskritOpen, setSanskritOpen] = useState(
    prefs.showDevanagari || prefs.showTransliteration
  );
  const [copied, setCopied] = useState(false);
  const [journalComposerOpen, setJournalComposerOpen] = useState(false);
  const [journalNote, setJournalNote] = useState('');
  const [journalSavedToast, setJournalSavedToast] = useState(false);

  if (!guidance) return null;

  const verse = guidance.verse;
  const verseRef = verse ? `BG ${verse.chapter_no}.${verse.verse_no}` : undefined;

  const handleCopyCitation = async () => {
    const text = verse
      ? `Bhagavad-gītā ${verse.chapter_no}.${verse.verse_no} — "${verse.translation}"\nVerified source: ${verse.canonical_url}`
      : `${guidance.understandingYourProblem}\n\n${guidance.wisdomApplied}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored silently
    }
  };

  const handleSaveJournalSubmit = () => {
    onSaveToJournal({
      question: guidance.reflectionQuestion,
      verseRef,
      note: journalNote.trim() || 'Saved reflection prompt for later contemplation.',
      tags: guidance.tags,
    });
    setJournalNote('');
    setJournalComposerOpen(false);
    setJournalSavedToast(true);
    setTimeout(() => setJournalSavedToast(false), 2600);
  };

  const completedCount = guidance.whatYouShouldDo.filter((a) => a.completed).length;

  return (
    <article
      aria-label="GitaMind structured guidance response"
      className="w-full rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] overflow-hidden transition-colors"
    >
      {/* 1. Empathy Header: Understanding Your Problem */}
      <div className="px-6 py-5 bg-[#F6F2EA] dark:bg-[#20252E] border-b border-[#E8E4DC] dark:border-[#292F3A]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 text-xs text-[#5C6460] dark:text-[#9CA3AF]">
            <span className="font-medium text-[#C85A32] dark:text-[#E6B85C]">
              1. Understanding Your Problem
            </span>
            <span aria-hidden="true">·</span>
            <span>{guidance.analysis.domain}</span>
            <span aria-hidden="true">·</span>
            <span>{guidance.analysis.emotionalState}</span>
          </div>
          <button
            type="button"
            onClick={() => onToggleBookmarkMessage(message.id)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C6460] hover:text-[#1F2421] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title={message.bookmarked ? 'Remove from saved guidance' : 'Save guidance card'}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${
                message.bookmarked
                  ? 'fill-[#C85A32] text-[#C85A32] dark:fill-[#E6B85C] dark:text-[#E6B85C]'
                  : ''
              }`}
            />
            <span>{message.bookmarked ? 'Saved' : 'Save Guidance'}</span>
          </button>
        </div>
        <p className="text-[15px] leading-relaxed text-[#1F2421] dark:text-[#F2EFE9]">
          {guidance.understandingYourProblem}
        </p>
      </div>

      {/* Main Content Flow — Separated by generous whitespace & hairline rules (No nested card-soup) */}
      <div className="px-6 py-6 space-y-7">
        {/* 2. Relevant Bhagavad Gita Teaching OR FR-4.1 Unverified Fallback */}
        <section aria-labelledby={`teaching-${message.id}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3
              id={`teaching-${message.id}`}
              className="text-xs font-sans font-semibold tracking-wide text-[#5C6460] dark:text-[#9CA3AF]"
            >
              2. Relevant Bhagavad Gita Teaching
            </h3>

            {guidance.verified && verse ? (
              <div className="flex items-center gap-3 text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                <span
                  className="inline-flex items-center gap-1.5 font-medium text-[#2E6B47] dark:text-[#78C496]"
                  title="Text verified against Vedabase.io"
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Verified on Vedabase.io</span>
                </span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onToggleSaveVerse(verse.id)}
                  className="inline-flex items-center gap-1 hover:text-[#C85A32] dark:hover:text-[#E6B85C] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      isVerseSaved(verse.id)
                        ? 'fill-[#C85A32] text-[#C85A32] dark:fill-[#E6B85C] dark:text-[#E6B85C]'
                        : ''
                    }`}
                  />
                  <span>{isVerseSaved(verse.id) ? 'Verse Saved' : 'Save Verse'}</span>
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9A5B13] dark:text-[#E6B85C]">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Unattributed Practical Guidance</span>
              </span>
            )}
          </div>

          {guidance.verified && verse ? (
            <div className="rounded-lg bg-[#FAF7F1] dark:bg-[#151920] border border-[#E8E2D6] dark:border-[#292F3A] px-5 py-5">
              {/* Editorial top accent rule (avoids cliché border-l-4) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#E8E2D6] dark:border-[#292F3A]">
                <div className="flex flex-wrap items-baseline gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPurport(verse)}
                    className="font-serif text-base font-semibold text-[#C85A32] dark:text-[#E6B85C] hover:underline underline-offset-4 cursor-pointer"
                  >
                    Bhagavad-gītā {verse.chapter_no}.{verse.verse_no}
                  </button>
                  <span className="text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                    — {verse.chapter_title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSanskritOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#5C6460] hover:text-[#1F2421] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  aria-expanded={sanskritOpen}
                >
                  <span>{sanskritOpen ? 'Hide Sanskrit' : 'Show Sanskrit'}</span>
                  {sanskritOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {sanskritOpen && (
                <div className="mb-4 pb-4 border-b border-[#E8E2D6]/70 dark:border-[#292F3A]/80 space-y-2.5">
                  <p className="font-sanskrit text-[17px] text-[#1F2421] dark:text-[#F2EFE9] whitespace-pre-line">
                    {verse.sanskrit_devanagari}
                  </p>
                  <p className="font-serif italic text-[13.5px] leading-relaxed text-[#5C6460] dark:text-[#9CA3AF] whitespace-pre-line">
                    {verse.transliteration}
                  </p>
                </div>
              )}

              <blockquote className="font-serif text-[17px] leading-[1.7] text-[#1F2421] dark:text-[#F2EFE9] mb-4">
                “{verse.translation}”
              </blockquote>

              {guidance.purportExcerpt && (
                <p className="text-sm leading-relaxed text-[#464D49] dark:text-[#C5CAD3] mb-4">
                  <span className="font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
                    Purport Insight:{' '}
                  </span>
                  {guidance.purportExcerpt}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenPurport(verse)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C85A32] hover:text-[#A84723] dark:text-[#E6B85C] dark:hover:text-[#F0CB7D] transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read Full Purport & Synonyms →</span>
                </button>
                <span className="text-xs text-[#5C6460] dark:text-[#9CA3AF] tabular-nums">
                  Chapter {verse.chapter_no} · Verse {verse.verse_no}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-[#FDF8EF] dark:bg-[#231F18] border border-[#EADBC2] dark:border-[#433928] px-5 py-4 text-sm leading-relaxed text-[#6B4A1B] dark:text-[#E6C993]">
              {guidance.unverifiedNotice ||
                'I could not verify a specific Bhagavad Gita verse directly addressing this nuance in Vedabase. Below is clearly separated, unattributed practical reasoning.'}
            </div>
          )}
        </section>

        {/* 3. Wisdom Applied to Your Situation */}
        <section aria-labelledby={`wisdom-${message.id}`}>
          <h3
            id={`wisdom-${message.id}`}
            className="text-xs font-sans font-semibold tracking-wide text-[#5C6460] dark:text-[#9CA3AF] mb-2.5"
          >
            3. Wisdom Applied to Your Situation
          </h3>
          <div className="text-[15.5px] leading-[1.75] text-[#1F2421] dark:text-[#E8E6E1] space-y-3 whitespace-pre-line">
            {guidance.wisdomApplied}
          </div>
        </section>

        {/* 4 & 5. Action Split-Grid (What You Should Do / What You Should Avoid) */}
        <section
          aria-label="Actionable steps and pitfalls to avoid"
          className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch"
        >
          {/* Left: Sage Green Tint — Interactive Checkboxes */}
          <div className="rounded-lg bg-[#F2F7F3] dark:bg-[#17221C] border border-[#D6E5DA] dark:border-[#273B30] p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <h3 className="text-xs font-sans font-semibold tracking-wide text-[#24573A] dark:text-[#86C99E]">
                4. What You Should Do
              </h3>
              <span className="text-xs text-[#3C6E50] dark:text-[#7BB590] tabular-nums">
                {completedCount}/{guidance.whatYouShouldDo.length} committed
              </span>
            </div>
            <ul className="space-y-2.5 flex-1">
              {guidance.whatYouShouldDo.map((item) => (
                <li key={item.id}>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => onToggleActionItem(message.id, item.id)}
                      className="mt-1 h-4 w-4 rounded border-[#8EB69B] text-[#2B6644] focus:ring-[#2B6644] accent-[#2B6644] shrink-0 cursor-pointer"
                    />
                    <span
                      className={`text-sm leading-relaxed transition-colors ${
                        item.completed
                          ? 'line-through text-[#5C7365] dark:text-[#738A7C]'
                          : 'text-[#1F2C24] dark:text-[#DFEDE4] group-hover:text-[#111C15] dark:group-hover:text-white'
                      }`}
                    >
                      {item.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Soft Amber/Coral Tint — Reactive Traps */}
          <div className="rounded-lg bg-[#FDF5F1] dark:bg-[#251B18] border border-[#F0D8CC] dark:border-[#422D27] p-5 flex flex-col">
            <h3 className="text-xs font-sans font-semibold tracking-wide text-[#9A3F20] dark:text-[#E89B7B] mb-3.5">
              5. What You Should Avoid
            </h3>
            <ul className="space-y-3 flex-1">
              {guidance.whatYouShouldAvoid.map((avoidItem, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-[#3B241C] dark:text-[#F0D8CE]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 text-xs font-semibold text-[#C85A32] dark:text-[#E89B7B] shrink-0"
                  >
                    ×
                  </span>
                  <span>{avoidItem}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. Reflection from the Gita */}
        <section
          aria-labelledby={`reflect-${message.id}`}
          className="rounded-lg bg-[#FAF8F5] dark:bg-[#151920] border border-[#E8E4DC] dark:border-[#292F3A] p-5"
        >
          <h3
            id={`reflect-${message.id}`}
            className="text-xs font-sans font-semibold tracking-wide text-[#5C6460] dark:text-[#9CA3AF] mb-2"
          >
            6. Reflection from the Gita
          </h3>
          <p className="font-serif italic text-[16.5px] leading-relaxed text-[#1F2421] dark:text-[#F2EFE9] mb-4">
            {guidance.reflectionQuestion}
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onReplyToReflect(guidance.reflectionQuestion)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#C85A32] hover:bg-[#B24C27] text-white dark:bg-[#E6B85C] dark:hover:bg-[#D7A94D] dark:text-[#12151A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Reply to Reflect</span>
            </button>
            <button
              type="button"
              onClick={() => setJournalComposerOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[#DCD6CA] dark:border-[#343C4A] text-[#1F2421] dark:text-[#E5E3DD] hover:bg-[#F1ECE2] dark:hover:bg-[#232934] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <NotebookPen className="w-3.5 h-3.5" />
              <span>{journalComposerOpen ? 'Close Note' : 'Save to Journal'}</span>
            </button>
            {journalSavedToast && (
              <span className="text-xs font-medium text-[#2E6B47] dark:text-[#78C496]">
                Saved to Reflection Journal
              </span>
            )}
          </div>

          {journalComposerOpen && (
            <div className="mt-4 pt-4 border-t border-[#E8E4DC] dark:border-[#292F3A] space-y-3">
              <textarea
                value={journalNote}
                onChange={(e) => setJournalNote(e.target.value)}
                rows={3}
                placeholder="Write a brief personal reflection in response to this question..."
                className="w-full rounded-lg border border-[#DCD6CA] dark:border-[#343C4A] bg-white dark:bg-[#1A1E25] px-3.5 py-2.5 text-sm text-[#1F2421] dark:text-[#F2EFE9] placeholder:text-[#8A918D] focus:outline-none focus:ring-2 focus:ring-[#C85A32]/30 dark:focus:ring-[#E6B85C]/30"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setJournalComposerOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#5C6460] hover:text-[#1F2421] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveJournalSubmit}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#1F2421] text-white hover:bg-[#323A35] dark:bg-[#F2EFE9] dark:text-[#12151A] dark:hover:bg-white cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 7. Citation Footer */}
      <footer className="px-6 py-3.5 bg-[#FAF8F5] dark:bg-[#161A20] border-t border-[#E8E4DC] dark:border-[#292F3A] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5C6460] dark:text-[#9CA3AF]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-[#1F2421] dark:text-[#E5E3DD]">
            7. Source:
          </span>
          {verse ? (
            <a
              href={verse.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#C85A32] dark:text-[#E6B85C] hover:underline underline-offset-4 font-medium"
            >
              <span>vedabase.io/en/library/bg/{verse.chapter_no}/{verse.verse_no}/</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span>Unattributed practical reasoning (no scripture cited)</span>
          )}
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={handleCopyCitation}
            className="inline-flex items-center gap-1 hover:text-[#1F2421] dark:hover:text-[#F2EFE9] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#2E6B47]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Citation'}</span>
          </button>
        </div>

        {/* Relevance Feedback */}
        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline">Was this verse relevant?</span>
          <button
            type="button"
            onClick={() => onFeedback(message.id, 'up')}
            aria-label="Mark verse as relevant"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              message.feedback === 'up'
                ? 'bg-[#E5F2EA] text-[#24573A] dark:bg-[#1E3327] dark:text-[#86C99E]'
                : 'hover:bg-[#EBE6DD] dark:hover:bg-[#252B36]'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onFeedback(message.id, 'down')}
            aria-label="Mark verse as not relevant"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              message.feedback === 'down'
                ? 'bg-[#FCECE6] text-[#9A3F20] dark:bg-[#3A221B] dark:text-[#E89B7B]'
                : 'hover:bg-[#EBE6DD] dark:hover:bg-[#252B36]'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>
    </article>
  );
}
