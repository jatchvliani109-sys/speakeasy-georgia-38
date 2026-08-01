import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Mail,
  Briefcase,
  Users,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import Wordmark from "@/components/Wordmark";
import SEO from "@/components/SEO";

/* ─────────────── decorative shapes ─────────────── */
const Dots = ({ className = "" }: { className?: string }) => (
  <svg
    className={`absolute pointer-events-none ${className}`}
    width="140"
    height="140"
    viewBox="0 0 140 140"
    fill="none"
    aria-hidden
  >
    <pattern id="dots-bg" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.8" fill="currentColor" opacity="0.25" />
    </pattern>
    <rect width="140" height="140" fill="url(#dots-bg)" />
  </svg>
);

const CircleRing = ({ className = "" }: { className?: string }) => (
  <div
    className={`absolute rounded-full border border-current opacity-10 pointer-events-none ${className}`}
    aria-hidden
  />
);

const GoldLine = ({ className = "" }: { className?: string }) => (
  <div className={`absolute h-px bg-[#C9A84C] pointer-events-none ${className}`} aria-hidden />
);

/* ─────────────── curved divider ─────────────── */
const WaveDivider = ({
  fill,
  flip = false,
  className = "",
}: {
  fill: string;
  flip?: boolean;
  className?: string;
}) => (
  <div
    className={`relative w-full overflow-hidden leading-[0] ${className}`}
    style={{ transform: flip ? "rotate(180deg)" : undefined }}
    aria-hidden
  >
    <svg
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className="relative block w-full h-16 sm:h-24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z" fill={fill} />
    </svg>
  </div>
);

/* ─────────────── data ─────────────── */
const valueCards = [
  {
    icon: BookOpen,
    title: "დღეში 5 წუთი",
    body: "მოკლე სესია ახალი სიტყვებით. ყოველ დღე.",
  },
  {
    icon: Users,
    title: "რეალურ სიტუაციებში",
    body: "შეხვედრები, იმეილები, გასაუბრება — ცოცხალი დიალოგებით.",
  },
  {
    icon: TrendingUp,
    title: "\"Streak\" გამოტოვების გარეშე",
    body: "ყოველდღიური \"Streak\", რომელიც მოტივაციას ინარჩუნებს.",
  },
];

const modules = [
  {
    icon: GraduationCap,
    title: "900+ სიტყვა",
    body: "ყოველდღიური სესიები აუდიოთი და ქართული ახსნებით.",
  },
  {
    icon: Users,
    title: "სცენარები",
    body: "რეალური სამუშაო სიტუაციები ცოცხალი დიალოგებით.",
  },
  {
    icon: Briefcase,
    title: "გასაუბრების სიმულატორი",
    body: "კითხვები შენს რეზიუმეზე და რეალურ ვაკანსიაზე.",
  },
  {
    icon: Mail,
    title: "დოკუმენტების ასისტენტი",
    body: "იმეილი, სამოტივაციო, რეზიუმე, ბიო — შენი მონაცემებით.",
  },
  {
    icon: MessageSquare,
    title: "შენი წარდგენა",
    body: "პროფესიონალური თვითწარდგენა — შენი გემოვნებით, ინგლისურად.",
  },
  {
    icon: TrendingUp,
    title: "ყოველდღიური გაუმჯობესება",
    body: "პროგრესი, რომელიც ჩანს და მოტივაცია, რომელიც რჩება.",
  },
];

/* ─────────────── page ─────────────── */
const Index = () => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        ...
      </div>
    );

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F2] text-[#1C1C1E]">
      <SEO
        title="SpeakBusy — ბიზნეს ინგლისური ქართველი პროფესიონალებისთვის"
        description="ისწავლე ბიზნეს ინგლისური დღეში 5 წუთში — სიტყვები აუდიოთი და ქართული ახსნებით. უფასოდ."
        path="/"
      />
      {/* ═══════════════ NAV ═══════════════ */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#F5F4F2]/85 border-b border-[#E4E2DF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center text-[#5C1A2E] hover:opacity-80 transition-opacity">
            <Wordmark size="md" />
          </Link>
          <Link
            to="/auth?mode=login"
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg border border-[#1C1C1E]/15 text-sm font-semibold text-[#1C1C1E] hover:bg-[#1C1C1E] hover:text-[#F5F4F2] transition-colors ka"
          >
            შესვლა
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative overflow-hidden bg-[#1C1C1E] text-white">
          <CircleRing className="w-[520px] h-[520px] -top-40 -right-40" />
          <CircleRing className="w-[320px] h-[320px] top-1/2 -left-24" />
          <Dots className="top-10 right-10 text-white opacity-40" />
          <Dots className="bottom-14 left-10 text-white opacity-25" />
          <GoldLine className="top-28 left-0 w-28" />
          <GoldLine className="bottom-36 right-0 w-20" />
          <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-[#C9A84C] opacity-60" aria-hidden />
          <div className="absolute bottom-1/4 left-1/3 w-3 h-3 rounded-full bg-[#C9A84C] opacity-40" aria-hidden />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 sm:pt-28 sm:pb-36 relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <span className="h-px w-8 bg-[#C9A84C]" />
              <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#C9A84C] ka">
                SpeakBusy
              </span>
            </div>

            <h1 className="text-[2.2rem] sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight ka max-w-3xl">
              ისწავლე ბიზნეს ინგლისური
              <span className="block mt-2 text-[#C9A84C]">დღეში 5 წუთში.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#A3A3A0] leading-relaxed max-w-2xl ka">
              ყოველდღიური სიტყვები აუდიოთი და ქართული ახსნებით. უფასოდ.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                to="/auth?mode=signup"
                className="group inline-flex items-center gap-2 h-14 px-8 rounded-xl bg-[#C9A84C] text-[#1C1C1E] text-base font-bold hover:bg-[#D4B560] transition-colors ka"
              >
                უფასოდ დაიწყე
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/auth?mode=login"
                className="text-sm font-semibold text-[#A3A3A0] hover:text-white transition-colors ka underline-offset-4 hover:underline"
              >
                უკვე გაქვს ანგარიში? შედი
              </Link>
            </div>
          </div>

          <WaveDivider fill="#F5F4F2" />
        </section>

        {/* ═══════════════ VALUE CARDS ═══════════════ */}
        <section className="bg-[#F5F4F2] py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#5C1A2E] mb-3">
                <span className="h-px w-6 bg-[#232323]" />
                Why SpeakBusy
                <span className="h-px w-6 bg-[#232323]" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight ka text-[#1C1C1E]">
                მარტივი. ყოველდღიური. შენი.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {valueCards.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="group relative bg-white border border-[#E4E2DF] rounded-2xl p-8 hover:border-[#5C1A2E]/40 hover:shadow-[0_8px_30px_-12px_rgba(92,26,46,0.25)] transition-all"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#232323] text-[#C9A84C] mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold ka text-[#1C1C1E] mb-2">{title}</h3>
                  <p className="text-sm text-[#4A4A4A] leading-relaxed ka">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* curved transition into modules */}
        <WaveDivider fill="#F5F4F2" flip className="bg-white" />

        {/* ═══════════════ MODULES ═══════════════ */}
        <section className="bg-white py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#C9A84C] mb-3">
                <span className="h-px w-6 bg-[#C9A84C]" />
                Modules
                <span className="h-px w-6 bg-[#C9A84C]" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight ka text-[#1C1C1E]">
                რას მიიღებ
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="relative bg-[#F5F4F2] border border-[#E4E2DF] rounded-2xl p-6 hover:bg-white hover:border-[#5C1A2E]/40 hover:shadow-[0_8px_30px_-12px_rgba(92,26,46,0.2)] transition-all"
                >
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#1C1C1E] text-[#C9A84C] mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold ka text-[#1C1C1E] mb-1.5">{title}</h3>
                  <p className="text-sm text-[#4A4A4A] leading-relaxed ka">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* curved transition into CTA */}
        <WaveDivider fill="#FFFFFF" flip className="bg-[#232323]" />

        {/* ═══════════════ FINAL CTA ═══════════════ */}
        <section className="relative bg-[#232323] text-white overflow-hidden">
          <CircleRing className="w-[400px] h-[400px] -top-32 -left-32 text-white" />
          <CircleRing className="w-[300px] h-[300px] -bottom-20 -right-20 text-white" />
          <GoldLine className="top-16 right-10 w-24" />
          <Dots className="bottom-10 right-20 text-white opacity-20" />

          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center relative z-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight ka leading-tight">
              დაიწყე დღეს. უფასოდ.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-[#D6D4D1] ka leading-relaxed">
              დღეში 5 წუთი — შენი ბიზნეს ინგლისურისთვის.
            </p>
            <div className="mt-10">
              <Link
                to="/auth?mode=signup"
                className="group inline-flex items-center gap-2 h-14 px-8 rounded-xl bg-[#C9A84C] text-[#1C1C1E] text-base font-bold hover:bg-[#D4B560] transition-colors ka"
              >
                დაიწყე ახლავე — უფასოა
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer className="bg-[#1C1C1E] text-[#A3A3A0]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[#F5F4F2]">
              <Wordmark size="md" />
            </div>
            <div className="flex items-center gap-4 text-xs ka tracking-wide">
              <Link to="/privacy" className="hover:text-[#F5F4F2] transition-colors">
                კონფიდენციალურობა
              </Link>
              <Link to="/terms" className="hover:text-[#F5F4F2] transition-colors">
                მომსახურების პირობები
              </Link>
            </div>
            <p className="text-xs ka tracking-wide">
              © 2026 SpeakBusy. ყველა უფლება დაცულია.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
