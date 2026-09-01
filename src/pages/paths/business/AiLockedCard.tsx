import { Link } from "react-router-dom";
import { Lock, Sparkles, ArrowRight } from "lucide-react";

/**
 * Shown in place of an AI feature when the user has no access.
 *
 * Deliberately VISIBLE rather than hidden: you cannot want what you cannot see,
 * and this is the strongest upgrade prompt in the app. It names what the feature
 * does, so the value is concrete rather than abstract.
 *
 * Two different states, because they need different messages:
 *   - free, never trialled  -> offer the free trial
 *   - free, trial finished  -> offer premium
 */
export default function AiLockedCard({
  title,
  description,
  trialAvailable,
}: {
  title: string;
  description: string;
  /** True if the 7-day gift has not been used yet. */
  trialAvailable?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E2DF] bg-white p-6 text-center">
      <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-[#5C1A2E]/8 text-[#5C1A2E]">
        <Lock size={20} strokeWidth={2} />
      </span>

      <h3 className="ka text-base font-bold text-[#5C1A2E] mt-4">{title}</h3>
      <p className="ka text-sm text-[#4A4A4A] mt-2 leading-relaxed max-w-sm mx-auto">
        {description}
      </p>

      <div className="mt-5 rounded-xl bg-[#F8F5F0] border border-[#E4E2DF] p-4 text-left">
        <p className="ka text-[11px] uppercase tracking-wider text-[#4A4A4A] font-semibold flex items-center gap-1.5">
          <Sparkles size={12} strokeWidth={2.25} className="text-[#C9A84C]" />
          პრემიუმში შედის
        </p>
        <ul className="mt-2 space-y-1.5">
          {[
            "კვირაში 7 AI სესია",
            "გასაუბრების სიმულაცია და შეფასება",
            "რეზიუმე, სამოტივაციო წერილი, ბიო",
            "ულიმიტო ლექსიკის სესიები",
          ].map((t) => (
            <li key={t} className="ka text-[13px] text-[#1C1C1E] flex items-start gap-2">
              <span className="text-[#C9A84C] mt-0.5">•</span>
              {t}
            </li>
          ))}
        </ul>

        {/* The trial and premium give DIFFERENT amounts. Without this the CTA
            reads as "premium, free for a week", which would set up a
            disappointment on the fourth AI session. */}
        {trialAvailable && (
          <p className="ka text-[11px] text-[#4A4A4A] mt-3 pt-3 border-t border-[#E4E2DF] leading-relaxed">
            უფასო კვირაში <b className="text-[#5C1A2E]">3 AI სესიაა</b> ჯამში —
            რომ ნახო, როგორ მუშაობს. პრემიუმში კი <b className="text-[#5C1A2E]">7 ყოველ კვირას</b>.
          </p>
        )}
      </div>

      <Link
        to="/path/business/premium"
        className="ka mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#5C1A2E] text-[#F8F5F0] text-sm font-bold hover:bg-[#6B1F36] transition-colors"
      >
        {trialAvailable ? "7 დღით პრემიუმის უფასოდ დატესტვა" : "პრემიუმის ნახვა"}
        <ArrowRight size={16} strokeWidth={2.25} />
      </Link>

      <p className="ka text-[11px] text-[#8A8A8A] mt-3">
        ლექსიკის სესიები უფასო ვერსიაშიც რჩება
      </p>
    </div>
  );
}
