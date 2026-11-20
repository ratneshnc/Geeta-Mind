import { Check } from 'lucide-react';
import type { PipelineStepEvent } from '../types/gita';

const PIPELINE_STEPS: { step: 1 | 2 | 3 | 4; label: string }[] = [
  { step: 1, label: 'Understanding your situation...' },
  { step: 2, label: 'Searching Vedabase.io for relevant teachings...' },
  { step: 3, label: 'Verifying chapter & verse authenticity...' },
  { step: 4, label: 'Crafting practical steps...' },
];

interface PipelineStatusProps {
  activeStep: PipelineStepEvent;
}

export function PipelineStatus({ activeStep }: PipelineStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full rounded-xl bg-white dark:bg-[#1A1E25] border border-[#E8E4DC] dark:border-[#292F3A] px-6 py-5"
    >
      <p className="text-xs font-medium text-[#5C6460] dark:text-[#9CA3AF] mb-4">
        Grounding guidance in Vedabase.io
      </p>
      <ol className="space-y-3">
        {PIPELINE_STEPS.map((item) => {
          const isCompleted = activeStep.step > item.step;
          const isCurrent = activeStep.step === item.step;

          return (
            <li key={item.step} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium shrink-0 transition-colors ${
                  isCompleted
                    ? 'bg-[#2E6B47] text-white dark:bg-[#5CA378] dark:text-[#12151A]'
                    : isCurrent
                    ? 'border border-[#C85A32] text-[#C85A32] dark:border-[#E6B85C] dark:text-[#E6B85C]'
                    : 'border border-[#DCD6CA] text-[#8E9490] dark:border-[#343C4A] dark:text-[#666E7C]'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="tabular-nums">{item.step}</span>
                )}
              </span>

              <div className="min-w-0">
                <p
                  className={`text-sm transition-colors ${
                    isCurrent
                      ? 'font-medium text-[#1F2421] dark:text-[#F2EFE9]'
                      : isCompleted
                      ? 'text-[#5C6460] dark:text-[#9CA3AF]'
                      : 'text-[#9A9F9C] dark:text-[#5F6673]'
                  }`}
                >
                  {item.label}
                </p>
                {isCurrent && activeStep.detail && (
                  <p className="text-xs text-[#737A76] dark:text-[#8E95A3] mt-0.5">
                    {activeStep.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
