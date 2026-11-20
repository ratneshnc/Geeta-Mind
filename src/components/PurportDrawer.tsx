import { useEffect, useState } from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';
import { fetchVerseDetail } from '../services/api';
import type { VedabaseVerse } from '../types/gita';

interface PurportDrawerProps {
  verse: VedabaseVerse | null;
  isOpen: boolean;
  isSaved: boolean;
  onClose: () => void;
  onSelectVerse: (verse: VedabaseVerse) => void;
  onToggleSave: (verseId: string) => void;
}

export function PurportDrawer({
  verse,
  isOpen,
  isSaved,
  onClose,
  onSelectVerse,
  onToggleSave,
}: PurportDrawerProps) {
  const [previousVerse, setPreviousVerse] = useState<VedabaseVerse | null>(null);
  const [nextVerse, setNextVerse] = useState<VedabaseVerse | null>(null);
  const [loadingAdjacent, setLoadingAdjacent] = useState(false);

  useEffect(() => {
    if (!isOpen || !verse) return;
    let cancelled = false;
    setLoadingAdjacent(true);
    fetchVerseDetail(verse.chapter_no, verse.verse_no)
      .then((detail) => {
        if (!cancelled) {
          setPreviousVerse(detail.previous);
          setNextVerse(detail.next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviousVerse(null);
          setNextVerse(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAdjacent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, verse]);

  if (!isOpen || !verse) return null;

  return (
    <aside
      aria-label="Full Vedabase purport reader"
      className="fixed inset-y-0 right-0 z-40 w-full max-w-[380px] xl:static xl:w-[360px] xl:shrink-0 bg-white dark:bg-[#171B22] border-l border-[#E8E4DC] dark:border-[#292F3A] flex flex-col h-full shadow-xl xl:shadow-none"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E8E4DC] dark:border-[#292F3A] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#2E6B47] dark:text-[#78C496]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Vedabase.io Reader</span>
          </div>
          <h2 className="font-serif text-lg font-semibold text-[#1F2421] dark:text-[#F2EFE9] truncate">
            BG {verse.chapter_no}.{verse.verse_no}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onToggleSave(verse.id)}
            aria-label={isSaved ? 'Remove verse bookmark' : 'Bookmark verse'}
            className="p-2 rounded-lg text-[#5C6460] hover:text-[#C85A32] hover:bg-[#F5F1E9] dark:text-[#9CA3AF] dark:hover:text-[#E6B85C] dark:hover:bg-[#232934] transition-colors cursor-pointer"
          >
            <Bookmark
              className={`w-4 h-4 ${
                isSaved
                  ? 'fill-[#C85A32] text-[#C85A32] dark:fill-[#E6B85C] dark:text-[#E6B85C]'
                  : ''
              }`}
            />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close purport reader"
            className="p-2 rounded-lg text-[#5C6460] hover:text-[#1F2421] hover:bg-[#F5F1E9] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] dark:hover:bg-[#232934] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        <div>
          <p className="text-xs text-[#5C6460] dark:text-[#9CA3AF] mb-3">
            Chapter {verse.chapter_no} · {verse.chapter_title}
          </p>

          <div className="rounded-lg bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8E2D6] dark:border-[#292F3A] p-4 space-y-3">
            <p className="font-sanskrit text-base text-[#1F2421] dark:text-[#F2EFE9] whitespace-pre-line">
              {verse.sanskrit_devanagari}
            </p>
            <p className="font-serif italic text-[13px] leading-relaxed text-[#5C6460] dark:text-[#9CA3AF] whitespace-pre-line">
              {verse.transliteration}
            </p>
          </div>
        </div>

        {/* Translation */}
        <section>
          <h3 className="text-xs font-semibold tracking-wide text-[#5C6460] dark:text-[#9CA3AF] mb-2">
            Translation
          </h3>
          <p className="font-serif text-[15.5px] leading-relaxed text-[#1F2421] dark:text-[#F2EFE9]">
            {verse.translation}
          </p>
        </section>

        {/* Word-for-Word Synonyms */}
        <section className="pt-4 border-t border-[#E8E4DC] dark:border-[#292F3A]">
          <h3 className="text-xs font-semibold tracking-wide text-[#5C6460] dark:text-[#9CA3AF] mb-3">
            Word-for-Word Synonyms
          </h3>
          <dl className="space-y-2 text-xs leading-relaxed">
            {verse.synonyms.map((syn, index) => (
              <div
                key={`${syn.sanskrit}-${index}`}
                className="flex items-baseline justify-between gap-3 py-1 border-b border-[#F0ECE4] dark:border-[#232833] last:border-b-0"
              >
                <dt className="font-serif italic font-medium text-[#C85A32] dark:text-[#E6B85C] shrink-0">
                  {syn.sanskrit}
                </dt>
                <dd className="text-right text-[#464D49] dark:text-[#C5CAD3]">
                  {syn.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Full Purport */}
        <section className="pt-4 border-t border-[#E8E4DC] dark:border-[#292F3A]">
          <h3 className="text-xs font-semibold tracking-wide text-[#5C6460] dark:text-[#9CA3AF] mb-2.5">
            Purport
          </h3>
          <p className="text-sm leading-[1.75] text-[#2C322E] dark:text-[#D9DCDF] whitespace-pre-line">
            {verse.purport}
          </p>
        </section>

        {/* Themes & Canonical Link */}
        <section className="pt-4 border-t border-[#E8E4DC] dark:border-[#292F3A] space-y-3">
          <div className="text-xs text-[#5C6460] dark:text-[#9CA3AF]">
            <span>Themes: </span>
            <span className="text-[#1F2421] dark:text-[#E5E3DD]">
              {verse.themes.join(' · ')}
            </span>
          </div>
          <a
            href={verse.canonical_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C85A32] dark:text-[#E6B85C] hover:underline underline-offset-4"
          >
            <span>Open Official Page on Vedabase.io</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </section>
      </div>

      {/* Adjacent Verses Footer */}
      <div className="px-4 py-3 border-t border-[#E8E4DC] dark:border-[#292F3A] bg-[#FAF8F5] dark:bg-[#14171D] flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!previousVerse || loadingAdjacent}
          onClick={() => previousVerse && onSelectVerse(previousVerse)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#464D49] dark:text-[#C5CAD3] hover:bg-[#EDE8DF] dark:hover:bg-[#232934] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>
            {previousVerse
              ? `BG ${previousVerse.chapter_no}.${previousVerse.verse_no}`
              : 'Start'}
          </span>
        </button>

        <span className="text-[11px] text-[#5C6460] dark:text-[#9CA3AF]">
          Adjacent Verses
        </span>

        <button
          type="button"
          disabled={!nextVerse || loadingAdjacent}
          onClick={() => nextVerse && onSelectVerse(nextVerse)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#464D49] dark:text-[#C5CAD3] hover:bg-[#EDE8DF] dark:hover:bg-[#232934] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
        >
          <span>
            {nextVerse ? `BG ${nextVerse.chapter_no}.${nextVerse.verse_no}` : 'End'}
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
