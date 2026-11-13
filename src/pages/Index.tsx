import { useEffect, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowDown,
  BookOpen,
  Target,
  TrendingUp,
  Mail,
  Briefcase,
  Users,
  GraduationCap,
  Instagram,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import DemoSession from "@/components/demo/DemoSession";
import HeroDeck from "@/components/landing/HeroDeck";
import InkThread from "@/components/landing/InkThread";
import WordMarquee from "@/components/landing/WordMarquee";
import MatchBoard from "@/components/landing/MatchBoard";
import ValueDeck from "@/components/landing/ValueDeck";
import ModuleStack from "@/components/landing/ModuleStack";
import ScrollTiki from "@/components/landing/ScrollTiki";
import { FloatChips, HeroBackdrop } from "@/components/landing/HeroField";
import { RevealHeading, SplitWords } from "@/components/landing/Reveal";
import Wordmark from "@/components/Wordmark";
import SEO from "@/components/SEO";
import { track } from "@/lib/track";
import {
  easeOutCubic,
  progress,
  useMagnetic,
  useReducedMotion,
  useRevealClass,
  useScrollFrame,
  useScrollProgress,
  useScrolledPast,
} from "@/lib/motion";

/* ─────────────── data ─────────────── */
const valueCards = [
  {
    icon: BookOpen,
    // The leading number counts up when the card is dealt.
    count: 980,
    title: "ბიზნეს სიტყვა, ქართულად ახსნილი",
    body:
      "ყოველი სიტყვა ქართული ახსნით, აუდიო გამოთქმით და რეალური სამუშაო მაგალითებით.",
  },
  {
    icon: Target,
    title: "დღეში ხუთი წუთი",
    body:
      "მოკლე ყოველდღიური სესიები, რომლებიც სიტყვებს პერიოდულად გახსენებს რომ ნასწავლი არ დაგავიწყდეს.",
  },
  {
    icon: TrendingUp,
    title: "ხშირად დაშვებული შეცდომები",
    body:
      "შეცდომები, რომლებიც ხშირად გვხვდება ინტეგრირებულია ლექსიკის სესიებში.",
  },
];

// Only features that actually exist. The previous version advertised an email
// module (deleted) and a meetings module (never built), and understated the
// vocabulary at 500 when the bank holds 980.
const modules = [
  {
    icon: GraduationCap,
    title: "ბიზნეს ლექსიკა",
    body: "980 სიტყვა და ფრაზა აუდიოთი, ქართული ახსნებით, ყოველდღიური სესიებით. უფასო ვერსიაშიც.",
  },
  {
    icon: Briefcase,
    title: "გასაუბრების სიმულაცია",
    body: "ივარჯიშე რეალურ გასაუბრებაზე AI-სთან და მიიღე დეტალური შეფასება.",
  },
  {
    icon: Mail,
    title: "დოკუმენტები",
    body: "რეზიუმე, სამოტივაციო წერილი და ბიო, შენი გამოცდილებით, პროფესიონალური ინგლისურით.",
  },
  {
    icon: Users,
    title: "თვითპრეზენტაცია",
    body: "მოამზადე შენი „tell me about yourself“ გასაუბრებისთვის ან ქსელური შეხვედრებისთვის.",
  },
];

/* ─────────────── page ─────────────── */
/** lucide-react has no TikTok icon; this matches the Instagram glyph's weight. */
function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.7a5.66 5.66 0 0 0-.77-.05 5.68 5.68 0 1 0 5.68 5.68V8.99a7.35 7.35 0 0 0 4.29 1.37V7.27a4.29 4.29 0 0 1-3.23-1.45z" />
    </svg>
  );
}

const Index = () => {
  const { user, loading } = useAuth();

  // Top of the funnel. Fires for anonymous visitors too, that is the point:
  // the biggest drop-off is between landing and signup, and no table can see it.
  useEffect(() => {
    track("landing_viewed");
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        ...
      </div>
    );

  if (user) return <Navigate to="/dashboard" replace />;

  // The page itself is its own component so its motion hooks mount together
  // with the elements they attach to (they would miss them during "loading").
  return <Landing />;
};

function Landing() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const deckWrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const heroCtaRef = useRef<HTMLAnchorElement>(null);
  const finalCtaRef = useRef<HTMLAnchorElement>(null);
  const ctaCardRef = useRef<HTMLDivElement>(null);
  const ctaStationRef = useRef<HTMLDivElement>(null);
  const tikiTrackRef = useRef<HTMLDivElement>(null);

  useScrollProgress(progressRef);
  useMagnetic(heroCtaRef);
  useMagnetic(finalCtaRef);
  // the hero writes itself in as soon as the page opens
  useRevealClass(heroTextRef, { immediate: true });
  // Once the hero's buttons have scrolled away, the sign-up button follows
  // along in the header, so it is always one tap away.
  const pastHero = useScrolledPast(520);

  // Scroll-driven movement that belongs to the page itself:
  //  - leaving the hero, the text drifts down and fades while the deck rises
  //    faster (depth);
  //  - the closing card rises and straightens as it arrives, hinged at its
  //    bottom-left corner. (It used to grow from its centre too, which pulled
  //    Tiki, who walks along its bottom edge, backwards for a moment.)
  const ctaTop = useRef(0);
  useScrollFrame(
    {
      read: () => {
        const st = ctaStationRef.current;
        if (st) ctaTop.current = st.getBoundingClientRect().top;
      },
      write: (f) => {
        if (f.y < f.vh * 1.3) {
          const text = heroTextRef.current;
          const deck = deckWrapRef.current;
          if (text) {
            text.style.transform = `translate3d(0, ${(f.y * 0.16).toFixed(1)}px, 0)`;
            text.style.opacity = Math.max(0, 1 - f.y / (f.vh * 0.85)).toFixed(3);
          }
          if (deck) {
            deck.style.transform = `translate3d(0, ${(-f.y * 0.14).toFixed(1)}px, 0) rotate(${(f.y * 0.012).toFixed(2)}deg)`;
          }
        }
        const card = ctaCardRef.current;
        if (card) {
          const e = easeOutCubic(progress(f.vh - ctaTop.current, 0, f.vh * 0.6));
          card.style.transform = `translate3d(0, ${(56 * (1 - e)).toFixed(1)}px, 0) rotate(${(-3 * (1 - e)).toFixed(2)}deg)`;
        }
      },
    },
    !reduced,
  );

  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      <SEO
        title="SpeakBusy, ბიზნეს ინგლისური ქართველი პროფესიონალებისთვის"
        description="ბიზნეს ინგლისური ქართველი პროფესიონალებისთვის, 980 სიტყვა ქართული ახსნებით და აუდიოთი, გასაუბრების სიმულაცია და დოკუმენტების მომზადება. დაიწყე უფასოდ."
        path="/"
      />
      {/* ═══════════════ NAV ═══════════════ */}
      <header className="sticky top-0 z-40 bg-cream border-b border-rule/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center text-ink hover:opacity-75 transition-opacity">
            <Wordmark size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/auth?mode=login"
              className={`press items-center gap-1.5 h-10 px-4 sm:px-5 rounded-lg border border-rule/20 text-sm font-semibold text-ink hover:bg-rule/10 hover:border-rule/35 transition-colors ka ${
                pastHero ? "hidden sm:inline-flex" : "inline-flex"
              }`}
            >
              შესვლა
            </Link>
            <Link
              to="/auth?mode=signup"
              aria-hidden={!pastHero}
              tabIndex={pastHero ? 0 : -1}
              className={`press inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-cta text-cta-fg text-sm font-bold hover:bg-cta-hover ka transition-[opacity,transform,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                pastHero ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none absolute sm:static"
              }`}
            >
              დაიწყე ახლავე უფასოდ
            </Link>
          </div>
        </div>
        {/* how far down the page you are */}
        <div
          ref={progressRef}
          aria-hidden
          className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-cta-line origin-left"
          style={{ transform: "scaleX(0)" }}
        />
      </header>

      <main className="flex-1">
        {/* Everything inside this wrapper sits on top of the ink thread. */}
        <div ref={rootRef} className="relative">
          <InkThread rootRef={rootRef} />

          {/* ═══════════════ HERO ═══════════════ */}
          <section ref={heroRef} className="relative z-[1] overflow-hidden">
            <HeroBackdrop heroRef={heroRef} />
            {/* Padding kept tight so the demo still starts within the first
                screenful on a phone. The demo is the advert; the hero only has
                to say who this is for. */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pt-16 sm:pb-24 relative z-10 grid gap-12 lg:gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] items-center">
              <div ref={heroTextRef} className="min-w-0 will-change-transform">
                {/* The headline is the line that made people click the ad. A
                    visitor who arrives on a different thought than the one they
                    clicked has to be re-convinced, and they will not wait. */}
                <h1
                  aria-label="ბიზნეს ინგლისური ქართველი პროფესიონალებისთვის."
                  className="text-[1.5rem] min-[400px]:text-[1.8rem] sm:text-[2.6rem] md:text-5xl lg:text-[2.7rem] xl:text-[3.3rem] font-extrabold leading-[1.16] tracking-tight ka max-w-3xl text-ink"
                >
                  <SplitWords text="ბიზნეს ინგლისური" />{" "}
                  <span className="text-sand-ink">
                    <SplitWords text="ქართველი" start={2} />{" "}
                    {/* "პროფესიონალებისთვის." is 20 characters with no break
                        opportunity, so the type size is chosen so that one word
                        fits a 360px phone. */}
                    <span className="relative inline-block">
                      <SplitWords text="პროფესიონალებისთვის." start={3} />
                      <svg
                        aria-hidden
                        viewBox="0 0 300 20"
                        preserveAspectRatio="none"
                        className="draw-line pointer-events-none absolute left-0 -bottom-[0.22em] h-[0.34em] w-[96%] text-cta-line"
                        style={{ ["--d" as string]: "750ms" }}
                      >
                        <path
                          pathLength={1}
                          d="M4 13 C 60 5, 130 3, 190 8 S 268 16, 296 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3.2}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </span>
                  </span>
                </h1>

                {/* Three ways in, in order of weight: create an account, try it
                    without one, or log back in. The try-first path stays because
                    nobody registers to find out what a product is: 250 visitors
                    from the first ad, 8 reached the signup form, 0 finished. */}
                <div className="fade-up mt-10" style={{ ["--d" as string]: "420ms" }}>
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-start xl:items-center gap-3">
                    <Link
                      ref={heroCtaRef}
                      to="/auth?mode=signup"
                      className="press group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-16 px-8 sm:px-10 rounded-2xl bg-cta text-cta-fg text-base sm:text-lg font-bold whitespace-nowrap hover:bg-cta-hover shadow-[0_18px_36px_-14px_hsl(var(--cta)/0.55)] ka"
                    >
                      <span>დაიწყე ახლავე უფასოდ</span>
                      <ArrowRight className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                    <a
                      href="#demo"
                      className="press group w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 sm:h-16 px-6 rounded-2xl border border-rule/25 text-ink text-base font-semibold hover:bg-rule/5 hover:border-rule/45 transition-colors ka"
                    >
                      <span>გამოსცადე რეგისტრაციის გარეშე</span>
                      <ArrowDown className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-y-0.5" />
                    </a>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <p className="ka text-sm text-ink-muted">12 კითხვა, ორი წუთი. ანგარიში არ სჭირდება.</p>
                    <Link
                      to="/auth?mode=login"
                      className="text-sm font-semibold text-ink hover:opacity-75 transition-opacity ka underline underline-offset-4 decoration-rule/35"
                    >
                      უკვე გაქვს ანგარიში? შედი
                    </Link>
                  </div>
                </div>
              </div>

              {/* the moving part: paper flashcards turning English ⇄ Georgian,
                  with word chips floating around them. The outer box is where
                  the ink thread starts, so it is never transformed. */}
              <div data-thread className="relative min-w-0 pb-8 lg:pb-0">
                <div ref={deckWrapRef} className="will-change-transform">
                  <div className="relative mx-auto w-fit">
                    <FloatChips heroRef={heroRef} />
                    <HeroDeck pointerArea={heroRef} />
                  </div>
                </div>
              </div>
            </div>

            <a
              href="#demo"
              aria-label="დემოზე გადასვლა"
              className="scroll-cue hidden sm:flex absolute left-1/2 -translate-x-1/2 bottom-6 z-10 h-9 w-9 items-center justify-center rounded-full border border-rule/20 text-ink-muted hover:text-ink"
            >
              <ArrowDown className="w-4 h-4" />
            </a>
          </section>

          {/* ═══════════════ DEMO ═══════════════ */}
          {/* The product IS the advert. This is the first thing under the fold. */}
          <section id="demo" className="relative z-[1] pt-8 pb-16 sm:pb-24 scroll-mt-16">
            <div className="max-w-xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-8">
                <div data-thread className="station inline-block rounded-2xl px-5 py-2">
                  <RevealHeading
                    text="სცადე ახლავე"
                    className="text-3xl sm:text-4xl font-extrabold tracking-tight ka text-ink"
                  />
                  <p className="ka mt-2 text-sm text-ink-muted">ნამდვილი სესია, ისეთივე როგორიც აპლიკაციაშია.</p>
                </div>
              </div>

              <div data-thread>
                <DemoSession />
              </div>

              <p
                data-thread
                className="station mt-10 rounded-2xl px-3 py-2 text-center text-base sm:text-lg text-ink-muted leading-relaxed ka"
              >
                980 სიტყვა და ფრაზა, რომლებიც სამსახურში ყოველდღე ხმარებაშია.
                ქართული ახსნებით, აუდიოთი და რეალური მაგალითებით.
              </p>
            </div>
          </section>

          {/* ═══════════════ WORDS IN MOTION ═══════════════ */}
          <div className="relative z-[1] overflow-x-clip py-6 sm:py-10">
            <WordMarquee />
          </div>

          {/* ═══════════════ WHY ═══════════════ */}
          <section className="relative z-[1] py-16 sm:py-24">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10 sm:mb-12">
                <div data-thread className="station inline-block rounded-2xl px-5 py-2">
                  <RevealHeading
                    text="რატომ SpeakBusy?"
                    className="text-3xl sm:text-5xl font-extrabold tracking-tight ka text-ink"
                  />
                </div>
              </div>

              {/* the matching exercise, played by the scroll */}
              <div className="mb-16 sm:mb-24">
                <MatchBoard />
              </div>

              {/* the reasons, dealt out of a deck */}
              <ValueDeck items={valueCards} />
            </div>
          </section>

          {/* ═══════════════ MODULES ═══════════════ */}
          <section className="relative z-[1] py-16 sm:py-24">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10 sm:mb-14">
                <div data-thread className="station inline-block rounded-2xl px-5 py-2">
                  <RevealHeading
                    text="რას ისწავლი?"
                    className="text-3xl sm:text-5xl font-extrabold tracking-tight ka text-ink"
                  />
                </div>
              </div>
              <ModuleStack items={modules} />
            </div>
          </section>

          {/* ═══════════════ FINAL CTA ═══════════════ */}
          <section className="relative z-[1] px-4 sm:px-6 lg:px-8 pt-8 pb-20 sm:pb-28">
            <div ref={ctaStationRef} data-thread className="max-w-4xl mx-auto">
              <div
                ref={ctaCardRef}
                className="paper-card relative overflow-hidden rounded-[32px] px-6 sm:px-14 pt-14 sm:pt-20 pb-4 text-center will-change-transform origin-bottom-left"
              >
                <RevealHeading
                  text="მზად ხარ პროფესიონალურ ინგლისურს დაეუფლო?"
                  className="text-3xl sm:text-5xl font-extrabold tracking-tight ka leading-tight text-paper-ink"
                />
                <p className="mt-5 text-base sm:text-lg text-paper-ink-muted ka leading-relaxed max-w-2xl mx-auto">
                  შეუერთდი ქართველ პროფესიონალებს, რომლებიც უკვე სწავლობენ SpeakBusy-ით.
                </p>
                <div className="mt-10">
                  <Link
                    ref={finalCtaRef}
                    to="/auth?mode=signup"
                    className="press group inline-flex items-center gap-2.5 h-16 px-7 sm:px-10 rounded-2xl bg-cta text-cta-fg text-base sm:text-lg font-bold whitespace-nowrap hover:bg-cta-hover shadow-[0_18px_36px_-14px_hsl(var(--cta)/0.55)] ka"
                  >
                    დაიწყე ახლავე უფასოდ
                    <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
                {/* Tiki walks in along the bottom of the card and naps */}
                <div ref={tikiTrackRef} className="mt-8 border-b border-paper-edge/30">
                  <ScrollTiki trackRef={tikiTrackRef} size={74} />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer className="bg-panel text-on-dark-subtle">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Feedback invitation. Placed above the legal row because it is an
                invitation, not fine print, and social is where a Georgian
                audience will actually reply. */}
            <div className="text-center pb-9 border-b border-white/10">
              <p className="ka text-[15px] font-bold text-on-dark">
                გვითხარი, რას ფიქრობ
              </p>
              <p className="ka text-[13px] text-on-dark-subtle mt-1.5 leading-relaxed max-w-md mx-auto">
                SpeakBusy ჯერ ახალია და შენი აზრი მნიშვნელოვანია. მოგვწერე
                სოციალურ ქსელებში ან ელფოსტაზე.
              </p>
              <div className="flex items-center justify-center gap-3 mt-5">
                <a
                  href="https://www.instagram.com/speakbusy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SpeakBusy Instagram-ზე"
                  className="press inline-flex items-center gap-2 h-11 px-5 rounded-full border border-white/15 text-on-dark text-sm font-semibold hover:bg-card/5 hover:border-paper/50 transition-colors"
                >
                  <Instagram size={16} strokeWidth={2} />
                  Instagram
                </a>
                <a
                  href="https://www.tiktok.com/@speakbusy"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SpeakBusy TikTok-ზე"
                  className="press inline-flex items-center gap-2 h-11 px-5 rounded-full border border-white/15 text-on-dark text-sm font-semibold hover:bg-card/5 hover:border-paper/50 transition-colors"
                >
                  <TikTokIcon />
                  TikTok
                </a>
              </div>
              <Link
                to="/contact"
                className="ka inline-block mt-4 mr-4 text-[13px] text-on-dark-subtle hover:text-paper transition-colors underline underline-offset-4"
              >
                დაგვიკავშირდით
              </Link>
              <a
                href="mailto:speakbusy@gmail.com"
                className="ka inline-block mt-4 text-[13px] text-on-dark-subtle hover:text-paper transition-colors underline underline-offset-4"
              >
                speakbusy@gmail.com
              </a>
            </div>

            {/* Pricing, publicly visible. The premium page sits behind login, so
                a visitor deciding whether to sign up would otherwise never see
                a price. Business identification and contact details live in the
                Terms and Privacy pages, both linked below and publicly reachable. */}
            <div className="pt-8 pb-8 border-b border-white/10 text-center">
              <p className="ka text-[13px] text-on-dark-subtle leading-relaxed max-w-lg mx-auto">
                უფასო ვერსია, 0 ₾, დღიური ლიმიტით და რეკლამების გარეშე.
                პრემიუმი, <b className="text-paper">13.99 ₾ თვეში</b>.
                პირველი 7 დღე უფასოა, ბარათის მითითების გარეშე.
                <br />
                გამოწერა ავტომატურად განახლდება ყოველთვიურად, სანამ არ გააუქმებ.
                გაუქმება შესაძლებელია ნებისმიერ დროს, უშუალოდ აპლიკაციიდან.
              </p>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-on-dark">
                <Wordmark size="md" />
              </div>
              <div className="flex items-center gap-4 text-xs ka tracking-wide">
                <Link to="/contact" className="hover:text-on-dark transition-colors">
                  დაგვიკავშირდით
                </Link>
                <Link to="/privacy" className="hover:text-on-dark transition-colors">
                  კონფიდენციალობის პოლიტიკა
                </Link>
                <Link to="/terms" className="hover:text-on-dark transition-colors">
                  წესები და პირობები
                </Link>
              </div>
              <p className="text-xs ka tracking-wide">
                © 2026 SpeakBusy. ყველა უფლება დაცულია.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}


export default Index;
