import { useState } from 'react';
import { BookCheck, Compass, HeartHandshake, X } from 'lucide-react';
import type { LanguagePreference, UserPreferences } from '../types/gita';

const DAWN_ARTWORK = '/src/assets/images/tranquil_dawn_horizon_1795078075961.jpg';

interface OnboardingBannerProps {
  prefs: UserPreferences;
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
  onDismiss: () => void;
}

const LANGUAGES: { value: LanguagePreference; label: string; sub: string }[] = [
  { value: 'en', label: 'English', sub: 'Clear modern prose' },
  { value: 'hi', label: 'हिन्दी (Hindi)', sub: 'Devanagari script' },
  { value: 'hinglish', label: 'Hinglish', sub: 'Conversational blend' },
];

export function OnboardingBanner({
  prefs,
  onUpdatePrefs,
  onDismiss,
}: OnboardingBannerProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [imgError, setImgError] = useState(false);

  return (
    <section
      aria-label="Welcome and ethical framing"
      className="rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] overflow-hidden mb-8"
    >
      {/* Editorial Artwork Strip */}
      <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-[#EFEAE0] dark:bg-[#202630]">
        {!imgError ? (
          <img
            src={DAWN_ARTWORK}
            alt="Minimalist watercolor landscape of golden dawn light over calm water"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center opacity-90 dark:opacity-55"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#EFE8DB] via-[#F7F1E5] to-[#E6DEC9] dark:from-[#1B2028] dark:to-[#242B36]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 px-6 py-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-white/85">
              Welcome to GitaMind · Step {step} of 2
            </p>
            <h2 className="font-serif text-xl sm:text-2xl font-medium text-white mt-0.5">
              {step === 1
                ? 'Scripture-grounded clarity, without dogma'
                : 'Choose your language & script view'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss welcome guide"
            className="p-1.5 rounded-lg text-white/85 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {step === 1 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
                  <BookCheck className="w-4 h-4 text-[#C85A32] dark:text-[#E6B85C] shrink-0" />
                  <span>Verified in Vedabase.io</span>
                </div>
                <p className="text-xs leading-relaxed text-[#5C6460] dark:text-[#9CA3AF]">
                  Every shloka, translation, and purport is deterministically checked against Vedabase.io — zero fabricated verses.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
                  <Compass className="w-4 h-4 text-[#C85A32] dark:text-[#E6B85C] shrink-0" />
                  <span>Practical, Not Preachy</span>
                </div>
                <p className="text-xs leading-relaxed text-[#5C6460] dark:text-[#9CA3AF]">
                  Translates Karma Yoga and Sthitaprajña into realistic actions for work, boundaries, and tough choices.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
                  <HeartHandshake className="w-4 h-4 text-[#C85A32] dark:text-[#E6B85C] shrink-0" />
                  <span>Clear Ethical Boundaries</span>
                </div>
                <p className="text-xs leading-relaxed text-[#5C6460] dark:text-[#9CA3AF]">
                  A reflection companion — not a replacement for licensed medical, legal, or mental health professionals.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E8E4DC] dark:border-[#292F3A]">
              <p className="text-xs text-[#5C6460] dark:text-[#9CA3AF]">
                No account required. You can start asking immediately below.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="px-3.5 py-2 text-xs font-medium text-[#5C6460] hover:text-[#1F2421] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#C85A32] hover:bg-[#B24C27] text-white dark:bg-[#E6B85C] dark:hover:bg-[#D7A94D] dark:text-[#12151A] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Set Language & Script →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#5C6460] dark:text-[#9CA3AF] mb-2.5">
                Guidance Language
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {LANGUAGES.map((lang) => {
                  const active = prefs.language === lang.value;
                  return (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => onUpdatePrefs({ language: lang.value })}
                      className={`text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'border-[#C85A32] bg-[#FAF4EE] dark:border-[#E6B85C] dark:bg-[#23211B]'
                          : 'border-[#E8E4DC] dark:border-[#292F3A] hover:bg-[#FAF8F5] dark:hover:bg-[#212630]'
                      }`}
                    >
                      <p className="text-sm font-medium text-[#1F2421] dark:text-[#F2EFE9]">
                        {lang.label}
                      </p>
                      <p className="text-xs text-[#5C6460] dark:text-[#9CA3AF] mt-0.5">
                        {lang.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
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
                <span>Expand Sanskrit Devanagari by default</span>
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
                <span>Include IAST Transliteration</span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#E8E4DC] dark:border-[#292F3A]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 text-xs font-medium text-[#5C6460] hover:text-[#1F2421] dark:text-[#9CA3AF] dark:hover:text-[#F2EFE9] cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[#C85A32] hover:bg-[#B24C27] text-white dark:bg-[#E6B85C] dark:hover:bg-[#D7A94D] dark:text-[#12151A] transition-colors whitespace-nowrap cursor-pointer"
              >
                Enter Sanctuary
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
