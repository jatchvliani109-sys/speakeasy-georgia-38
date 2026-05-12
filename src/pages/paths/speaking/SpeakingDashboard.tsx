import { Link } from "react-router-dom";
import PathSwitcher from "@/components/PathSwitcher";
import SpeakingShell, { SoundBars } from "./components/SpeakingShell";
import { Mic, Headphones, Drama, LineChart, Sparkles, ArrowRight } from "lucide-react";

type Card = {
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
  title_ka: string;
  desc_ka: string;
  cta_ka: string;
  accent: "purple" | "blue" | "teal" | "indigo";
};

const CARDS: Card[] = [
  {
    to: "/path/speaking/daily",
    Icon: Mic,
    title_ka: "დღევანდელი საუბრის გაკვეთილი",
    desc_ka: "ივარჯიშე თემაზე, ისწავლე ფრაზები და მიიღე შეცდომების გასწორება.",
    cta_ka: "გაკვეთილის დაწყება",
    accent: "purple",
  },
  {
    to: "/path/speaking/pronunciation",
    Icon: Headphones,
    title_ka: "გამოთქმის პრაქტიკა",
    desc_ka: "მოუსმინე სიტყვებს და ივარჯიშე სწორად წარმოთქმაში.",
    cta_ka: "გამოთქმის დაწყება",
    accent: "teal",
  },
  {
    to: "/path/speaking/roleplay",
    Icon: Drama,
    title_ka: "როლური საუბარი",
    desc_ka: "ივარჯიშე რეალურ სიტუაციებში — კაფე, სკოლა, გასაუბრება.",
    cta_ka: "როლური პრაქტიკა",
    accent: "indigo",
  },
  {
    to: "/path/speaking/progress",
    Icon: LineChart,
    title_ka: "ჩემი საუბრის პროგრესი",
    desc_ka: "ნახე რამდენი ფრაზა, გაკვეთილი და სცენარი ივარჯიშე.",
    cta_ka: "პროგრესის ნახვა",
    accent: "blue",
  },
];

const ACCENT: Record<Card["accent"], string> = {
  purple: "from-purple-500/30 to-purple-500/0 text-purple-200",
  blue: "from-blue-500/30 to-blue-500/0 text-blue-200",
  teal: "from-teal-400/30 to-teal-400/0 text-teal-200",
  indigo: "from-indigo-500/30 to-indigo-500/0 text-indigo-200",
};

export default function SpeakingDashboard() {
  return (
    <SpeakingShell>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold ka text-purple-200/90 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Speaking Coach
            </p>
            <h1 className="text-2xl font-extrabold mt-1 ka sp-text">საუბრის გაუმჯობესება</h1>
            <p className="text-sm sp-text-muted ka mt-1">
              ივარჯიშე ინგლისურად საუბარში, გამოთქმაში და თავდაჯერებულობაში.
            </p>
          </div>
          <PathSwitcher />
        </div>

        {/* Coach hero */}
        <div className="sp-card-glow p-5 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full bg-purple-500/20 blur-2xl" />
          <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-teal-400/15 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Mic className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold ka text-purple-200/90">შენი AI საუბრის მწვრთნელი</div>
              <div className="font-bold ka sp-text">დაიწყე ყოველდღიური ვარჯიშით</div>
            </div>
            <SoundBars />
          </div>
          <Link
            to="/path/speaking/daily"
            className="sp-btn-primary mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl h-14 px-6 text-base font-bold ka transition-smooth"
          >
            💬 დღევანდელი გაკვეთილის დაწყება
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARDS.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="sp-card p-5 flex flex-col gap-3 transition-smooth hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-15px_hsl(265_90%_50%_/_0.6)]"
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ACCENT[c.accent]} flex items-center justify-center border border-white/10`}>
                  <c.Icon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold ka sp-text">{c.title_ka}</div>
                  <div className="text-xs sp-text-muted ka mt-1">{c.desc_ka}</div>
                </div>
              </div>
              <div
                className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl h-11 px-4 text-sm font-semibold ka ${
                  c.accent === "teal" ? "sp-btn-teal" : "sp-btn-primary"
                }`}
              >
                {c.cta_ka}
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SpeakingShell>
  );
}
