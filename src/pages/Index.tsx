import { Link, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowRight, Play, Mail, UserCheck, Target, Zap, Globe, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

/* ─────────────── geometric decorative shapes ─────────────── */
const Dots = ({ className = "" }: { className?: string }) => (
  <svg className={`absolute pointer-events-none ${className}`} width="120" height="120" viewBox="0 0 120 120" fill="none">
    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="2" fill="currentColor" opacity="0.15" />
    </pattern>
    <rect width="120" height="120" fill="url(#dots)" />
  </svg>
);

const CircleRing = ({ className = "" }: { className?: string }) => (
  <div className={`absolute rounded-full border border-current opacity-10 pointer-events-none ${className}`} />
);

const GoldLine = ({ className = "" }: { className?: string }) => (
  <div className={`absolute h-px bg-[#C9A84C] pointer-events-none ${className}`} />
);

/* ─────────────── value cards data ─────────────── */
const valueCards = [
  {
    icon: Mail,
    title: "სტრუქტურირებული სწავლება",
    body: "მოდულები ელ-ფოსტებში, გასაუბრებებში, შეხვედრებსა და ლექსიკაში. ყველაფერი ბიზნეს კონტექსტში.",
  },
  {
    icon: UserCheck,
    title: "პერსონალიზებული გეგმა",
    body: "პლატფორმა ადაპტირდება შენს დონეზე, მიზნებსა და პროფესიაზე.",
  },
  {
    icon: Target,
    title: "რეალური შედეგები",
    body: "ისწავლე ის ინგლისური, რომელიც სამსახურში, გასაუბრებებზე და კლიენტებთან გამოგადგება.",
  },
];

/* ─────────────── why bullet data ─────────────── */
const whyBullets = [
  "AI-powered პერსონალიზებული სწავლება",
  "ქართულენოვანი მხარდაჭერა",
  "ბიზნეს ინგლისური — არა ზოგადი ინგლისური",
];

/* ─────────────── wave divider component ─────────────── */
const WaveDivider = ({
  fill,
  flip = false,
  className = "",
}: {
  fill: string;
  flip?: boolean;
  className?: string;
}) => (
  <div className={`relative w-full overflow-hidden leading-[0] ${className}`} style={{ transform: flip ? "rotate(180deg)" : undefined }}>
    <svg
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className="relative block w-full h-16 sm:h-24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z"
        fill={fill}
      />
    </svg>
  </div>
);

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
    <Layout showLogout={false} fullWidth>
      {/* ═══════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#1C1C1E] text-white">
        {/* decorative geometry */}
        <CircleRing className="w-[500px] h-[500px] -top-40 -right-40" />
        <CircleRing className="w-[300px] h-[300px] top-1/2 -left-20" />
        <Dots className="top-8 right-8 text-white opacity-40" />
        <Dots className="bottom-12 left-12 text-white opacity-30" />
        <GoldLine className="top-24 left-0 w-24" />
        <GoldLine className="bottom-32 right-0 w-16" />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-[#C9A84C] opacity-60" />
        <div className="absolute bottom-1/4 left-1/3 w-3 h-3 rounded-full bg-[#C9A84C] opacity-40" />

        <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 sm:pt-28 sm:pb-36 relative z-10">
          {/* eyebrow */}
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#C9A84C]" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#C9A84C] ka">
              SpeakBusy
            </span>
            <span className="h-px w-8 bg-[#C9A84C]" />
          </div>

          {/* headline */}
          <h1 className="text-[2.2rem] sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight ka max-w-3xl">
            ისწავლე ბიზნეს ინგლისური.
            <span className="block mt-2 text-[#C9A84C]">გახსენი ახალი შესაძლებლობები.</span>
          </h1>

          {/* subheadline */}
          <p className="mt-6 text-base sm:text-lg text-[#B8B0A8] leading-relaxed max-w-xl ka">
            SpeakBusy — ქართველი პროფესიონალებისთვის შექმნილი AI-powered ბიზნეს ინგლისურის პლატფორმა
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              to="/auth"
              className="group inline-flex items-center justify-center gap-2.5 h-13 px-8 rounded-xl bg-[#5C1A2E] text-white text-sm font-semibold tracking-wide ka hover:bg-[#6E2038] transition-smooth shadow-soft"
            >
              უფასოდ დაიწყე
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 h-13 px-6 rounded-xl text-sm font-semibold ka text-white/90 hover:text-white hover:bg-white/5 transition-smooth"
            >
              <Play className="w-4 h-4 fill-current" />
              როგორ მუშაობს?
            </a>
          </div>
        </div>
      </section>

      {/* wave: dark → cream */}
      <WaveDivider fill="#1C1C1E" flip />

      {/* ═══════════════════════════════════════════════════════
          VALUE CARDS
      ═══════════════════════════════════════════════════════ */}
      <section className="relative bg-[#F8F5F0] py-4 pb-20 sm:pb-28">
        <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#C9A84C] ka">
              რას გთავაზობთ
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#1C1C1E] ka tracking-tight">
              ყველაფერი, რაც ბიზნეს ინგლისურისთვის გჭირდება
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {valueCards.map((card, i) => (
              <article
                key={card.title}
                className="group relative flex flex-col rounded-2xl bg-white border border-[#E0D8D0] p-7 sm:p-8 transition-all hover:border-[#1C1C1E]/20 hover:shadow-card ka"
              >
                {/* number + icon row */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[#5C1A2E] flex items-center justify-center text-white">
                    <card.icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#6B6B6B] tabular-nums">
                    0{i + 1}
                  </span>
                </div>

                <h3 className="font-bold text-[#1C1C1E] text-lg tracking-tight ka">
                  {card.title}
                </h3>
                <p className="text-[13px] sm:text-sm text-[#4A4A4A] leading-relaxed mt-3 ka">
                  {card.body}
                </p>

                {/* subtle gold accent line at bottom */}
                <div className="mt-auto pt-6">
                  <div className="h-px w-12 bg-[#C9A84C] group-hover:w-full transition-all duration-500" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* wave: cream → burgundy */}
      <WaveDivider fill="#F8F5F0" />

      {/* ═══════════════════════════════════════════════════════
          WHY SPEAKBUSY  (social proof)
      ═══════════════════════════════════════════════════════ */}
      <section className="relative bg-[#5C1A2E] text-white py-20 sm:py-28 overflow-hidden">
        <CircleRing className="w-[400px] h-[400px] -top-32 -left-32 border-white/10" />
        <CircleRing className="w-[250px] h-[250px] bottom-0 right-0 border-white/10" />
        <Dots className="top-12 right-12 text-white opacity-20" />
        <GoldLine className="top-1/2 left-0 w-20 opacity-40" />

        <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* left: title + bullets */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#C9A84C] ka">
                რატომ SpeakBusy?
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight ka leading-snug">
                ბიზნეს ინგლისური, რომელიც მუშაობს
              </h2>

              <ul className="mt-8 space-y-5">
                {whyBullets.map((text) => (
                  <li key={text} className="flex items-start gap-3 ka">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
                      <Zap className="w-3 h-3 text-[#C9A84C]" />
                    </span>
                    <span className="text-[15px] text-white/90 leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* right: stats / visual block */}
            <div className="relative">
              <div className="rounded-2xl bg-[#1C1C1E]/60 border border-white/10 p-8 sm:p-10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-[#C9A84C]/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <span className="text-sm font-semibold text-white/80 ka">შექმნილი ქართველი პროფესიონალებისთვის</span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-extrabold text-[#C9A84C]">4+</div>
                    <div className="text-[13px] text-white/60 mt-1 ka">სწავლების მოდული</div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-[#C9A84C]">AI</div>
                    <div className="text-[13px] text-white/60 mt-1 ka">პერსონალიზებული გეგმა</div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-[#C9A84C]">24/7</div>
                    <div className="text-[13px] text-white/60 mt-1 ka">სწავლება შენს ტემპში</div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-[#C9A84C]">100%</div>
                    <div className="text-[13px] text-white/60 mt-1 ka">ბიზნეს კონტექსტში</div>
                  </div>
                </div>
              </div>

              {/* floating accent square */}
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 hidden lg:block" />
              <div className="absolute -bottom-3 -left-3 w-10 h-10 rounded-lg bg-white/5 border border-white/10 hidden lg:block" />
            </div>
          </div>
        </div>
      </section>

      {/* wave: burgundy → cream */}
      <WaveDivider fill="#5C1A2E" flip />

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS  (anchor section)
      ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative bg-[#F8F5F0] py-20 sm:py-28">
        <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#C9A84C] ka">
              როგორ მუშაობს?
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#1C1C1E] ka tracking-tight">
              სამი ნაბიჯი სამოქმედოდ
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* connecting line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-[#E0D8D0]" />

            {[
              {
                step: "01",
                title: "დარეგისტრირდი და გაიარე ტესტი",
                desc: "შექმენი ანგარიში და გაიარე მოკლე დონის დადგენის ტესტი — 5 წუთში გაიგებ საიდან დაიწყო.",
              },
              {
                step: "02",
                title: "მიიღე პერსონალიზებული გეგმა",
                desc: "AI შექმნის შენს მიზნებზე მორგებულ სწავლების გეგმას — ელ-ფოსტები, შეხვედრები, გასაუბრებები, ლექსიკა.",
              },
              {
                step: "03",
                title: "ისწავლე და განვითარდი",
                desc: "სწავლე შენს ტემპში, თვალყური ადევნე პროგრესს და ნახე რეალური შედეგები პირველივე კვირაში.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center ka">
                <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 rounded-full bg-white border border-[#E0D8D0] shadow-card mb-6 mx-auto">
                  <span className="text-lg font-extrabold text-[#5C1A2E]">{item.step}</span>
                </div>
                <h3 className="font-bold text-[#1C1C1E] text-lg tracking-tight">{item.title}</h3>
                <p className="text-[13px] sm:text-sm text-[#4A4A4A] leading-relaxed mt-3 max-w-xs mx-auto">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* wave: cream → dark */}
      <WaveDivider fill="#F8F5F0" />

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="relative bg-[#1C1C1E] text-white py-20 sm:py-28 overflow-hidden">
        <CircleRing className="w-[600px] h-[600px] -top-60 -right-60 border-white/5" />
        <CircleRing className="w-[350px] h-[350px] -bottom-20 -left-20 border-white/5" />
        <Dots className="top-16 left-16 text-white opacity-20" />
        <GoldLine className="bottom-20 left-1/3 w-32 opacity-30" />

        <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight ka leading-snug">
            მზად ხარ კარიერა ინგლისურით გააუმჯობესო?
          </h2>
          <p className="mt-4 text-[15px] sm:text-base text-[#B8B0A8] max-w-lg mx-auto ka leading-relaxed">
            შეუერთდი ქართველ პროფესიონალებს, რომლებიც უკვე სწავლობენ SpeakBusy-ზე.
          </p>

          <div className="mt-10">
            <Link
              to="/auth"
              className="group inline-flex items-center justify-center gap-2.5 h-14 px-10 rounded-xl bg-[#5C1A2E] text-white text-sm font-semibold tracking-wide ka hover:bg-[#6E2038] transition-smooth shadow-soft"
            >
              დაიწყე ახლავე
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="bg-[#1C1C1E] border-t border-white/10">
        <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[#6B6B6B] text-sm ka">© 2025 SpeakBusy. ყველა უფლება დაცულია.</span>
          <span className="text-[#6B6B6B] text-sm ka">ქართველი პროფესიონალებისთვის შექმნილი</span>
        </div>
      </footer>
    </Layout>
  );
};

export default Index;
