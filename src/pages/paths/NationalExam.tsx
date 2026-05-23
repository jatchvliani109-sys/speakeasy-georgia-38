import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileText, Brain, ClipboardCheck, Trophy } from "lucide-react";
import PathSwitcher from "@/components/PathSwitcher";
import ExamShell from "./exam/ExamShell";

const MODULES = [
  { title: "გრამატიკა", desc: "სტრუქტურა და წესები", Icon: BookOpen },
  { title: "კითხვა და გააზრება", desc: "ტექსტი და ანალიზი", Icon: FileText },
  { title: "ლექსიკა", desc: "სიტყვის მარაგი", Icon: Brain },
  { title: "ტესტები", desc: "სიმულაცია გამოცდისთვის", Icon: ClipboardCheck },
  { title: "ჩემი შედეგები", desc: "პროგრესი და ანალიტიკა", Icon: Trophy },
];

export default function NationalExamDashboard() {
  return (
    <ExamShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        <header className="flex items-end justify-between gap-3">
          <div>
            <div className="ex-eyebrow ka">აბიტურიენტი</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold ka ex-text leading-tight mt-2">
              ეროვნული გამოცდები
            </h1>
            <p className="text-sm ex-text-muted ka mt-1">
              სერიოზული მომზადება — გრამატიკა, ტექსტი, ლექსიკა და ტესტები.
            </p>
          </div>
          <PathSwitcher />
        </header>

        <section className="ex-card-hero p-6 sm:p-7">
          <div className="text-[10px] font-semibold tracking-[0.22em] uppercase opacity-80">
            Exam Prep
          </div>
          <h2 className="ka text-xl sm:text-2xl font-extrabold mt-2 leading-snug">
            დაიწყე მომზადება ეროვნულისთვის
          </h2>
          <p className="ka text-sm mt-2 opacity-85 leading-relaxed max-w-md">
            სტრუქტურირებული გზა გრამატიკიდან სრულ სიმულირებამდე. მალე — სრული პროგრამა.
          </p>
          <button
            disabled
            className="mt-5 inline-flex items-center gap-2 rounded-xl h-11 px-5 text-sm font-bold ka bg-[hsl(35_40%_97%)] text-[hsl(348_55%_28%)] opacity-90 cursor-not-allowed"
          >
            მალე ხელმისაწვდომი
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        <section>
          <h3 className="text-xs font-bold ka ex-text-muted uppercase tracking-wider mb-3">
            მოდულები
          </h3>
          <div className="grid gap-3">
            {MODULES.map((m) => (
              <div key={m.title} className="ex-card p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl ex-chip flex items-center justify-center shrink-0">
                  <m.Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold ka ex-text text-sm">{m.title}</div>
                  <div className="text-[11px] ex-text-muted ka mt-0.5">{m.desc}</div>
                </div>
                <span className="text-[10px] font-semibold ka ex-text-soft uppercase tracking-wider">
                  მალე
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ExamShell>
  );
}
