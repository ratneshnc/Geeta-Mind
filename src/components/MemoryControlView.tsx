import { useState } from 'react';
import {
  Brain,
  Check,
  Edit3,
  EyeOff,
  Plus,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import type {
  LanguagePreference,
  MemoryFact,
  UserPreferences,
} from '../types/gita';

interface MemoryControlViewProps {
  memoryFacts: MemoryFact[];
  prefs: UserPreferences;
  sessionCount: number;
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
  onAddMemoryFact: (content: string, theme: string) => void;
  onUpdateMemoryFact: (id: string, content: string) => void;
  onDeleteMemoryFact: (id: string) => void;
  onClearAllHistory: () => void;
}

export function MemoryControlView({
  memoryFacts,
  prefs,
  sessionCount,
  onUpdatePrefs,
  onAddMemoryFact,
  onUpdateMemoryFact,
  onDeleteMemoryFact,
  onClearAllHistory,
}: MemoryControlViewProps) {
  const [newFact, setNewFact] = useState('');
  const [newTheme, setNewTheme] = useState('Personal Context');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Longitudinal theme pattern detection (FR-5.1)
  const recurringPatterns = memoryFacts.filter((f) => f.occurrences >= 2);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    onAddMemoryFact(newFact.trim(), newTheme);
    setNewFact('');
  };

  const handleStartEdit = (fact: MemoryFact) => {
    setEditingId(fact.id);
    setEditText(fact.content);
  };

  const handleSaveEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateMemoryFact(id, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 space-y-8">
      <header className="space-y-2 border-b border-[#E8E4DC] dark:border-[#292F3A] pb-6">
        <p className="text-xs font-medium text-[#C85A32] dark:text-[#E6B85C]">
          Transparent Personalization · Local-First Privacy
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
          Memory & Privacy Control Center
        </h1>
        <p className="text-sm leading-relaxed text-[#5C6460] dark:text-[#9CA3AF]">
          Everything GitaMind remembers about your context is stored transparently in your browser and sent only when you keep memory active. View, edit, pause, or wipe any detail at any time.
        </p>
      </header>

      {/* Pause Memory Toggle Card */}
      <section className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
            {prefs.memoryEnabled ? (
              <Brain className="w-4 h-4 text-[#C85A32] dark:text-[#E6B85C]" />
            ) : (
              <EyeOff className="w-4 h-4 text-[#5C6460] dark:text-[#9CA3AF]" />
            )}
            <span>
              {prefs.memoryEnabled
                ? 'Longitudinal Memory Active'
                : 'Memory Paused (Incognito Reflection)'}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[#5C6460] dark:text-[#9CA3AF]">
            {prefs.memoryEnabled
              ? 'GitaMind gently surfaces recurring themes across conversations to offer deeper, tailored guidance.'
              : 'No new facts will be saved, and existing memory facts will not be used in your current reflections.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onUpdatePrefs({ memoryEnabled: !prefs.memoryEnabled })}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            prefs.memoryEnabled
              ? 'border border-[#DCD6CA] dark:border-[#343C4A] text-[#1F2421] dark:text-[#F2EFE9] hover:bg-[#F5F1E9] dark:hover:bg-[#232934]'
              : 'bg-[#C85A32] text-white hover:bg-[#B24C27] dark:bg-[#E6B85C] dark:text-[#12151A]'
          }`}
        >
          {prefs.memoryEnabled ? 'Pause Memory' : 'Resume Memory'}
        </button>
      </section>

      {/* Longitudinal Pattern Insights (FR-5.1) */}
      {recurringPatterns.length > 0 && (
        <section className="rounded-xl bg-[#F7F3EC] dark:bg-[#1E232B] border border-[#E8E2D6] dark:border-[#292F3A] p-6 space-y-3">
          <h2 className="font-serif text-base font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
            Recurring Themes Noticed
          </h2>
          <ul className="space-y-2 text-sm text-[#464D49] dark:text-[#C5CAD3]">
            {recurringPatterns.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3">
                <span>{p.content}</span>
                <span className="text-xs text-[#C85A32] dark:text-[#E6B85C] tabular-nums shrink-0">
                  {p.occurrences} conversations
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Transparent Memory Ledger */}
      <section className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
              Transparent Memory Ledger
            </h2>
            <p className="text-xs text-[#5C6460] dark:text-[#9CA3AF] mt-0.5 tabular-nums">
              {memoryFacts.length} remembered context{' '}
              {memoryFacts.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        {/* Add Custom Memory Item */}
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            placeholder="Add context you want GitaMind to remember (e.g., Preparing for a leadership transition)"
            className="flex-1 rounded-lg border border-[#DCD6CA] dark:border-[#343C4A] bg-[#FAF8F5] dark:bg-[#14171D] px-3.5 py-2 text-sm text-[#1F2421] dark:text-[#F2EFE9] placeholder:text-[#8A918D] focus:outline-none focus:ring-2 focus:ring-[#C85A32]/25 dark:focus:ring-[#E6B85C]/25"
          />
          <select
            value={newTheme}
            onChange={(e) => setNewTheme(e.target.value)}
            aria-label="Memory theme category"
            className="rounded-lg border border-[#DCD6CA] dark:border-[#343C4A] bg-[#FAF8F5] dark:bg-[#14171D] px-3 py-2 text-xs text-[#1F2421] dark:text-[#F2EFE9] focus:outline-none"
          >
            <option value="Personal Context">Personal Context</option>
            <option value="Career">Career</option>
            <option value="Relationships">Relationships</option>
            <option value="Preferences">Preferences</option>
          </select>
          <button
            type="submit"
            disabled={!newFact.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#C85A32] hover:bg-[#B24C27] text-white dark:bg-[#E6B85C] dark:hover:bg-[#D7A94D] dark:text-[#12151A] text-xs font-medium disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {/* Ledger Items */}
        {memoryFacts.length === 0 ? (
          <p className="text-sm text-[#5C6460] dark:text-[#9CA3AF] py-6 text-center border-t border-[#F0ECE4] dark:border-[#252B36]">
            No personal context is stored yet. Add a preference above or share a reflection while memory is active.
          </p>
        ) : (
          <ul className="divide-y divide-[#F0ECE4] dark:divide-[#252B36] border-t border-[#F0ECE4] dark:border-[#252B36]">
            {memoryFacts.map((fact) => (
              <li
                key={fact.id}
                className="py-3.5 flex items-start justify-between gap-4"
              >
                {editingId === fact.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 rounded-md border border-[#C85A32] dark:border-[#E6B85C] bg-white dark:bg-[#14171D] px-3 py-1.5 text-sm text-[#1F2421] dark:text-[#F2EFE9] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(fact.id)}
                      aria-label="Save edited memory"
                      className="p-1.5 rounded-md bg-[#2E6B47] text-white cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel edit"
                      className="p-1.5 rounded-md text-[#5C6460] hover:bg-[#EFEBE3] dark:hover:bg-[#252B36] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm text-[#1F2421] dark:text-[#F2EFE9]">
                        {fact.content}
                      </p>
                      <p className="text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                        {fact.theme} · Added{' '}
                        {new Date(fact.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(fact)}
                        aria-label="Edit memory item"
                        className="p-1.5 rounded-md text-[#5C6460] hover:text-[#1F2421] hover:bg-[#F5F1E9] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] dark:hover:bg-[#232934] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMemoryFact(fact.id)}
                        aria-label="Delete memory item"
                        className="p-1.5 rounded-md text-[#5C6460] hover:text-[#B83B23] hover:bg-[#FCECE6] dark:text-[#9CA3AF] dark:hover:text-[#E89B7B] dark:hover:bg-[#3A221B] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reading & Script Preferences */}
      <section className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] p-6 space-y-5">
        <h2 className="font-serif text-lg font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
          Language & Scripture Display
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'हिन्दी (Hindi)' },
              { value: 'hinglish', label: 'Hinglish' },
            ] as { value: LanguagePreference; label: string }[]
          ).map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => onUpdatePrefs({ language: lang.value })}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                prefs.language === lang.value
                  ? 'bg-[#C85A32] text-white dark:bg-[#E6B85C] dark:text-[#12151A]'
                  : 'border border-[#DCD6CA] dark:border-[#343C4A] text-[#464D49] dark:text-[#C5CAD3] hover:bg-[#FAF8F5] dark:hover:bg-[#232934]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1">
          <label className="inline-flex items-center gap-2.5 text-sm text-[#1F2421] dark:text-[#E5E3DD] cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.showDevanagari}
              onChange={(e) =>
                onUpdatePrefs({ showDevanagari: e.target.checked })
              }
              className="h-4 w-4 rounded accent-[#C85A32] dark:accent-[#E6B85C] cursor-pointer"
            />
            <span>Show Sanskrit Devanagari open by default</span>
          </label>
          <label className="inline-flex items-center gap-2.5 text-sm text-[#1F2421] dark:text-[#E5E3DD] cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.showTransliteration}
              onChange={(e) =>
                onUpdatePrefs({ showTransliteration: e.target.checked })
              }
              className="h-4 w-4 rounded accent-[#C85A32] dark:accent-[#E6B85C] cursor-pointer"
            />
            <span>Show IAST Transliteration</span>
          </label>
        </div>
      </section>

      {/* Danger Zone: Clear All History */}
      <section className="rounded-xl bg-[#FDF5F1] dark:bg-[#231B19] border border-[#EED5C9] dark:border-[#422D27] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#9A3F20] dark:text-[#E89B7B]">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Clear All History & Memory</span>
          </div>
          <p className="text-xs text-[#6B4539] dark:text-[#C9A89C] tabular-nums">
            Permanently deletes {sessionCount} past reflection sessions, {memoryFacts.length} memory facts, and local journal entries.
          </p>
        </div>

        {!confirmClearOpen ? (
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="px-4 py-2 rounded-lg border border-[#D98873] text-[#9A3F20] hover:bg-[#F8E4DC] dark:border-[#6E3B30] dark:text-[#F09A82] dark:hover:bg-[#3A221B] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Clear All History
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmClearOpen(false)}
              className="px-3 py-2 text-xs font-medium text-[#5C6460] dark:text-[#9CA3AF] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClearAllHistory();
                setConfirmClearOpen(false);
              }}
              className="px-4 py-2 rounded-lg bg-[#B83B23] hover:bg-[#992E19] text-white text-xs font-medium whitespace-nowrap cursor-pointer"
            >
              Confirm Wipe
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
