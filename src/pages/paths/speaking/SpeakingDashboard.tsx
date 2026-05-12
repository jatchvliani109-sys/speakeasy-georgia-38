import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PathSwitcher from "@/components/PathSwitcher";
import { Button } from "@/components/ui/button";

type Card = {
  to: string;
  emoji: string;
  title_ka: string;
  desc_ka: string;
  cta_ka: string;
};

const CARDS: Card[] = [
  {
    to: "/path/speaking/daily",
    emoji: "💬",
    title_ka: "დღევანდელი საუბრის გაკვეთილი",
    desc_ka: "ივარჯიშე თემაზე, ისწავლე ფრაზები და მიიღე შეცდომების გასწორება.",
    cta_ka: "გაკვეთილის დაწყება",
  },
  {
    to: "/path/speaking/pronunciation",
    emoji: "🔊",
    title_ka: "გამოთქმის პრაქტიკა",
    desc_ka: "მოუსმინე სიტყვებს და ივარჯიშე სწორად წარმოთქმაში.",
    cta_ka: "გამოთქმის დაწყება",
  },
  {
    to: "/path/speaking/roleplay",
    emoji: "🎭",
    title_ka: "როლური საუბარი",
    desc_ka: "ივარჯიშე რეალურ სიტუაციებში, მაგალითად კაფეში, სკოლაში ან გასაუბრებაზე.",
    cta_ka: "როლური პრაქტიკა",
  },
  {
    to: "/path/speaking/progress",
    emoji: "📈",
    title_ka: "ჩემი საუბრის პროგრესი",
    desc_ka: "ნახე რამდენი ფრაზა, გაკვეთილი და როლური სიტუაცია ივარჯიშე.",
    cta_ka: "პროგრესის ნახვა",
  },
];

export default function SpeakingDashboard() {
  return (
    <Layout>
      <div className="py-2 space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold ka text-purple-600">🎙️ საუბრის გაუმჯობესება</p>
            <h1 className="text-2xl font-extrabold mt-1 ka">საუბრის გაუმჯობესება</h1>
            <p className="text-sm text-muted-foreground ka mt-1">
              ივარჯიშე ინგლისურად საუბარში, გამოთქმაში და თავდაჯერებულობაში.
            </p>
          </div>
          <PathSwitcher />
        </div>

        {/* Coach hero card */}
        <div className="p-5 rounded-3xl border-2 border-purple-400/40 bg-gradient-to-br from-purple-500/15 via-blue-500/10 to-teal-400/10 shadow-card">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🦉</div>
            <div className="min-w-0">
              <div className="text-xs font-semibold ka text-purple-600">შენი AI საუბრის მწვრთნელი</div>
              <div className="font-bold ka">დაიწყე ყოველდღიური ვარჯიშით</div>
            </div>
          </div>
          <Button asChild variant="hero" size="xl" className="w-full ka mt-4">
            <Link to="/path/speaking/daily">💬 დღევანდელი გაკვეთილის დაწყება</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARDS.map((c) => (
            <div
              key={c.to}
              className="p-5 rounded-2xl bg-card border border-border shadow-card flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{c.emoji}</div>
                <div className="min-w-0">
                  <div className="font-bold ka">{c.title_ka}</div>
                  <div className="text-xs text-muted-foreground ka mt-1">{c.desc_ka}</div>
                </div>
              </div>
              <Button asChild variant="soft" size="lg" className="w-full ka mt-auto">
                <Link to={c.to}>{c.cta_ka}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
