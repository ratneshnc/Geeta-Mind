import { HeartHandshake, Phone, ShieldAlert } from 'lucide-react';
import type { CrisisResponsePayload } from '../types/gita';

interface CrisisCardProps {
  crisis: CrisisResponsePayload;
}

export function CrisisCard({ crisis }: CrisisCardProps) {
  return (
    <section
      role="alert"
      aria-live="assertive"
      className="w-full rounded-xl bg-[#FFFDFB] dark:bg-[#1E1919] border border-[#D98873] dark:border-[#6E3B30] overflow-hidden"
    >
      <div className="px-6 py-5 bg-[#FDF1EC] dark:bg-[#2D1E1B] border-b border-[#EBC7BC] dark:border-[#57322A]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#9C351E] dark:text-[#F09A82] mb-2">
          <HeartHandshake className="w-4 h-4 shrink-0" />
          <span>Immediate Support & Care</span>
        </div>
        <h2 className="font-serif text-xl font-semibold text-[#1F2421] dark:text-[#F8F4F0] mb-2">
          {crisis.headline}
        </h2>
        <p className="text-[15px] leading-relaxed text-[#382C28] dark:text-[#E5D7D2]">
          {crisis.empatheticMessage}
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {crisis.helplines.map((line) => (
            <div
              key={line.name}
              className="rounded-lg border border-[#E8E0D8] dark:border-[#3A2E2B] bg-[#FAF8F5] dark:bg-[#171414] p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold text-[#1F2421] dark:text-[#F2EFE9]">
                  {line.name}
                </p>
                <p className="text-xs text-[#5C6460] dark:text-[#A39B97] mt-0.5">
                  {line.region} · {line.availability}
                </p>
                <p className="text-xs leading-relaxed text-[#464D49] dark:text-[#C9C1BD] mt-2">
                  {line.description}
                </p>
              </div>
              <a
                href={line.telHref}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#B83B23] hover:bg-[#992E19] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="tabular-nums">Call {line.number}</span>
              </a>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#EBE4DC] dark:border-[#332927] flex items-start gap-2.5 text-xs leading-relaxed text-[#5C6460] dark:text-[#B0A8A4]">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#9C351E] dark:text-[#E89B7B]" />
          <p>{crisis.disclaimer}</p>
        </div>
      </div>
    </section>
  );
}
