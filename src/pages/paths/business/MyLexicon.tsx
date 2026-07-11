import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Briefcase, ChevronDown, Library, Mail, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import {
  loadProgress,
  progressToWord,
  sourceLabelKa,
  upsertProgress,
  type ProgressRow,
} from "./lib/vocabEngine";

// ---------- Phrases tab types ----------
type Vocab = { en: string; ka: string; exampleEn?: string; exampleKa?: string };
type SessionRow = {
  id: string;
  kind: "email" | "interview" | "meeting";
  title_raw: string;
  completed_at: string | null;
  session_data: any;
};

const TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow-up",
  request: "Request",
  introduction: "გაცნობის წერილი",
  complaint: "Complaint",
  update: "Update",
  thank_you: "Thank you",
  apology: "Apology",
  meeting_invite: "Meeting invite",
  proposal: "Proposal",
  reminder: "Reminder",
};

const KA_MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];

function formatKaDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${KA_MONTHS[d.getMonth()]}`;
}

// ---------- Words tab labels ----------
const LABELS = [
  { id: "easy", dot: "#5A8A6A", label: "ადვილი" },
  { id: "okay", dot: "#1C1C1E", label: "საშუალო" },
  { id: "difficult", dot: "#A52A1B", label: "რთული" },
] as const;

type TabKey = "phrases" | "words";

export default function MyLexicon() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const initialTab: TabKey = params.get("tab") === "words" ? "words" : "phrases";
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (params.get("tab") !== tab) {
      const next = new URLSearchParams(params);
      next.set("tab", tab);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <BusinessShell seo={{ title: "ჩემი ლექსიკონი — SpeakBusy", description: "შენი პერსონალური ბიზნეს ლექსიკონი — სიტყვები და ფრაზები ერთ ადგილას.", path: "/path/business/lexicon" }} back={{ to: "/path/business/home", label: "SpeakBusy" }}>
      <header className="mb-4">
        <p className="ka text-[11px] uppercase tracking-wider text-[#1C1C1E] font-semibold">
          ბიზნეს ლექსიკონი
        </p>
        <h1 className="ka text-2xl font-bold text-[#5C1A2E] mt-1">ჩემი ლექსიკონი</h1>
        <p className="ka text-sm text-[#4A4A4A] mt-1">
          ფრაზები სესიებიდან და სიტყვები, რომლებიც შენ უკვე ისწავლე — ერთ ადგილას.
        </p>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-[#F0EBE3] rounded-xl mb-4">
        <TabBtn active={tab === "phrases"} onClick={() => setTab("phrases")}>
          ფრაზები
        </TabBtn>
        <TabBtn active={tab === "words"} onClick={() => setTab("words")}>
          სიტყვები
        </TabBtn>
      </div>

      {tab === "phrases" ? <PhrasesTab /> : <WordsTab />}
    </BusinessShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`ka text-sm font-semibold py-2 rounded-lg transition ${
        active
          ? "bg-[#5C1A2E] text-[#F0EBE3] shadow-sm"
          : "text-[#4A4A4A] hover:text-[#5C1A2E]"
      }`}
    >
      {children}
    </button>
  );
}

// =================================================================
// PHRASES TAB
// =================================================================
function PhrasesTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [emails, interviews, meetings] = await Promise.all([
        supabase
          .from("business_email_sessions")
          .select("id, email_type, completed_at, session_data")
          .eq("user_id", user.id)
          .eq("completed", true)
          .order("completed_at", { ascending: false }),
        supabase
          .from("business_interview_sessions")
          .select("id, role_title, completed_at, session_data")
          .eq("user_id", user.id)
          .eq("completed", true)
          .order("completed_at", { ascending: false }),
        supabase
          .from("business_meeting_sessions")
          .select("id, meeting_type, completed_at, session_data")
          .eq("user_id", user.id)
          .eq("completed", true)
          .order("completed_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const list: SessionRow[] = [
        ...(emails.data || []).map((r: any) => ({
          id: r.id, kind: "email" as const, title_raw: r.email_type,
          completed_at: r.completed_at, session_data: r.session_data,
        })),
        ...(interviews.data || []).map((r: any) => ({
          id: r.id, kind: "interview" as const, title_raw: r.role_title,
          completed_at: r.completed_at, session_data: r.session_data,
        })),
        ...(meetings.data || []).map((r: any) => ({
          id: r.id, kind: "meeting" as const, title_raw: r.meeting_type,
          completed_at: r.completed_at, session_data: r.session_data,
        })),
      ].sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));
      setRows(list);
      if (list.length) setOpen({ [list[0].id]: true });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const totalPhrases = useMemo(
    () => rows.reduce((acc, r) => acc + (r.session_data?.vocabulary?.length || 0), 0),
    [rows],
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows
      .map((r) => {
        const v: Vocab[] = r.session_data?.vocabulary || [];
        const m = v.filter(
          (it) =>
            it.en?.toLowerCase().includes(q) ||
            it.ka?.toLowerCase().includes(q) ||
            it.exampleEn?.toLowerCase().includes(q),
        );
        return { ...r, _matched: m };
      })
      .filter((r) => (r as any)._matched.length > 0);
  }, [rows, q]);

  useEffect(() => {
    if (!q) return;
    const next: Record<string, boolean> = {};
    filtered.forEach((r) => (next[r.id] = true));
    setOpen(next);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <BizCard className="mb-3 bg-gradient-to-br from-[#5C1A2E] to-[#4A1525] text-[#F0EBE3] border-transparent">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ka text-[11px] uppercase tracking-wider text-[#E5D4A8] font-semibold">
              სულ {totalPhrases} ფრაზა შენახულია
            </p>
            <p className="ka text-[11px] text-[#F0EBE3]/70 mt-1">
              {rows.length} სესია დასრულებული
            </p>
          </div>
          <div className="text-4xl font-bold leading-none">{totalPhrases}</div>
        </div>
      </BizCard>

      <SearchInput value={query} onChange={setQuery} placeholder="ძებნა ფრაზებში..." />

      {loading ? (
        <BizCard><p className="ka text-sm text-[#4A4A4A]">იტვირთება...</p></BizCard>
      ) : rows.length === 0 ? (
        <BizCard className="text-center py-10">
          <div className="mx-auto w-12 h-12 rounded-md bg-[#F0EBE3] border border-[#E0D8D0] grid place-items-center text-[#5C1A2E]"><Library size={22} strokeWidth={2} /></div>
          <h3 className="ka text-lg font-bold text-[#5C1A2E] mt-3">ფრაზები ცარიელია</h3>
          <p className="ka text-sm text-[#4A4A4A] mt-2 max-w-sm mx-auto">
            დაასრულე შენი პირველი სესია და შენახული ფრაზები აქ გამოჩნდება.
          </p>
          <div className="mt-5">
            <Link to="/path/business/module/emails">
              <BizButton>დაიწყე პირველი სესია →</BizButton>
            </Link>
          </div>
        </BizCard>
      ) : filtered.length === 0 ? (
        <BizCard className="text-center py-8">
          <p className="ka text-sm text-[#4A4A4A]">"{query}"-ის შესაბამისი ფრაზა ვერ მოიძებნა.</p>
        </BizCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const vocab: Vocab[] = (r as any)._matched || r.session_data?.vocabulary || [];
            const isOpen = !!open[r.id];
            const isInterview = r.kind === "interview";
            const isMeeting = r.kind === "meeting";
            const title = isInterview
              ? (r.session_data?.briefing?.roleTitleKa || r.title_raw)
              : isMeeting
                ? (r.session_data?.briefing?.meetingTypeKa || r.title_raw)
                : (TYPE_LABELS[r.title_raw] || r.session_data?.dailyFocusKa || r.title_raw);
            const sectionLabel = isInterview ? "გასაუბრება" : isMeeting ? "შეხვედრა" : "იმეილები";
            const KindIcon = isInterview ? Briefcase : isMeeting ? Users : Mail;
            const date = formatKaDate(r.completed_at);
            return (
              <div key={r.id} className="bg-white border border-[#E0D8D0] rounded-lg overflow-hidden transition">
                <button
                  onClick={() => setOpen((p) => ({ ...p, [r.id]: !p[r.id] }))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F0EBE3] transition"
                >
                  <span className="shrink-0 w-9 h-9 rounded-md bg-[#5C1A2E]/5 border border-[#E0D8D0] text-[#5C1A2E] grid place-items-center">
                    <KindIcon size={16} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="ka text-sm font-semibold text-[#5C1A2E] break-words line-clamp-2">
                      {sectionLabel} — {title}
                    </p>
                    <p className="ka text-[11px] text-[#4A4A4A] mt-0.5">
                      {date} · {vocab.length} ფრაზა
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    strokeWidth={2.25}
                    className={`shrink-0 text-[#4A4A4A] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-2 border-t border-[#F0EBE3]">
                    {vocab.length === 0 ? (
                      <p className="ka text-xs text-[#4A4A4A] py-2">ფრაზები ვერ მოიძებნა.</p>
                    ) : (
                      vocab.map((v, i) => (
                        <div key={i} className="p-3 rounded-lg bg-[#F8F5F0] border border-[#E0D8D0]">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-bold text-[#5C1A2E]">{v.en}</p>
                          </div>
                          <p className="ka text-xs text-[#4A4A4A] mt-0.5">{v.ka}</p>
                          {v.exampleEn && (
                            <p className="text-xs text-[#1C1C1E] mt-2 italic">"{v.exampleEn}"</p>
                          )}
                          {v.exampleKa && (
                            <p className="ka text-[11px] text-[#4A4A4A]">{v.exampleKa}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// =================================================================
// WORDS TAB
// =================================================================
type WordFilter = "all" | "learned" | "learning" | "fresh" | "difficult";
const WORD_FILTERS: { id: WordFilter; label: string }[] = [
  { id: "all", label: "ყველა" },
  { id: "learned", label: "✓ ვიცი" },
  { id: "learning", label: "ვსწავლობ" },
  { id: "fresh", label: "ახალი" },
  { id: "difficult", label: "რთული" },
];

function WordsTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WordFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const p = await loadProgress(user.id);
      if (cancelled) return;
      // Only words the learner has actually ANSWERED in a session — this is
      // the airtight test. Legacy/ingested/planned-but-unseen rows always have
      // zero answers, so they can never leak in here regardless of origin.
      const encountered = p.filter(
        (r) =>
          r.correct_count + r.wrong_count > 0 &&
          r.last_seen_at !== null &&
          (r.source === "core" || r.source === "field"),
      );
      setRows(encountered);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const setLabel = async (row: ProgressRow, label: string | null) => {
    if (!user) return;
    const updated = { ...row, manual_label: label };
    setRows((rs) => rs.map((r) => (r.word_key === row.word_key ? updated : r)));
    await upsertProgress(user.id, [updated]);
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "difficult") {
      list = list.filter((r) => r.manual_label === "difficult" || r.wrong_count > r.correct_count);
    } else if (filter === "learned") {
      list = list.filter((r) => r.confidence >= 4 || r.manual_label === "easy");
    } else if (filter === "learning") {
      list = list.filter((r) => r.confidence >= 2 && r.confidence <= 3 && r.manual_label !== "easy");
    } else if (filter === "fresh") {
      list = list.filter((r) => r.confidence <= 1 && r.manual_label !== "easy");
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const w = progressToWord(r);
        if (!w) return false;
        return w.en.toLowerCase().includes(q) || w.ka.toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => a.confidence - b.confidence);
  }, [rows, filter, query]);

  const counts = useMemo(() => {
    const difficult = rows.filter((r) => r.manual_label === "difficult" || r.wrong_count > r.correct_count).length;
    const learned = rows.filter((r) => r.confidence >= 4 || r.manual_label === "easy").length;
    const learning = rows.filter((r) => r.confidence >= 2 && r.confidence <= 3 && r.manual_label !== "easy").length;
    const fresh = rows.filter((r) => r.confidence <= 1 && r.manual_label !== "easy").length;
    return { total: rows.length, difficult, learned, learning, fresh };
  }, [rows]);

  return (
    <>
      <BizCard className="mb-3 bg-gradient-to-br from-[#5C1A2E] to-[#4A1525] text-[#F0EBE3] border-transparent">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ka text-[11px] uppercase tracking-wider text-[#E5D4A8] font-semibold">
              სულ {counts.total} სიტყვა შესწავლილია
            </p>
            <p className="ka text-[11px] text-[#F0EBE3]/70 mt-1">
              {counts.learned} ვიცი · {counts.learning} ვსწავლობ · {counts.fresh} ახალი
            </p>
          </div>
          <div className="text-4xl font-bold leading-none">{counts.total}</div>
        </div>
      </BizCard>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {WORD_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`ka shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition border
              ${filter === f.id
                ? "bg-[#5C1A2E] text-[#F0EBE3] border-[#5C1A2E]"
                : "bg-white text-[#5C1A2E] border-[#E0D8D0] hover:bg-[#F8F5F0]"}`}
          >
            {f.label}
            {f.id !== "all" && (
              <span className="ml-1 opacity-70">
                {f.id === "learned" ? counts.learned : f.id === "learning" ? counts.learning : f.id === "fresh" ? counts.fresh : counts.difficult}
              </span>
            )}
          </button>
        ))}
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder="ძებნა სიტყვებში..." />

      {loading ? (
        <BizCard><p className="ka text-sm text-[#4A4A4A]">იტვირთება...</p></BizCard>
      ) : rows.length === 0 ? (
        <BizCard className="text-center py-10">
          <div className="mx-auto w-12 h-12 rounded-md bg-[#F0EBE3] border border-[#E0D8D0] grid place-items-center text-[#5C1A2E]"><BookOpen size={22} strokeWidth={2} /></div>
          <h3 className="ka text-lg font-bold text-[#5C1A2E] mt-3">ჯერ არ გისწავლია სიტყვა</h3>
          <p className="ka text-sm text-[#4A4A4A] mt-2 max-w-sm mx-auto">
            დაასრულე ლექსიკის სესია — სიტყვები აქ ავტომატურად გამოჩნდება.
          </p>
          <div className="mt-5">
            <Link to="/path/business/module/vocabulary">
              <BizButton>დაიწყე სესია →</BizButton>
            </Link>
          </div>
        </BizCard>
      ) : filtered.length === 0 ? (
        <BizCard className="text-center py-8">
          <p className="ka text-sm text-[#4A4A4A]">შესაბამისი სიტყვა ვერ მოიძებნა.</p>
        </BizCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const w = progressToWord(r);
            if (!w) return null;
            return (
              <div key={r.word_key} className="bg-white border border-[#E0D8D0] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#5C1A2E]">{w.en}</h3>
                      <ReadAloudButton text={w.en} storageKey={w.key} size="sm" />
                    </div>
                    <p className="ka text-xs text-[#4A4A4A] mt-0.5">{w.ka}</p>
                    {w.pronunciation && (
                      <p className="ka text-[10px] text-[#1C1C1E] font-mono mt-0.5">[{w.pronunciation}]</p>
                    )}
                  </div>
                  <ConfidenceDot c={r.confidence} />
                </div>
                {w.explanationKa && (
                  <p className="ka text-xs text-[#1C1C1E] mt-2">{w.explanationKa}</p>
                )}
                {w.exampleEn && (
                  <p className="text-xs text-[#5C1A2E] italic mt-2">"{w.exampleEn}"</p>
                )}
                <div className="mt-3 pt-3 border-t border-[#F0EBE3] flex items-center justify-between gap-2">
                  <p className="ka text-[10px] text-[#4A4A4A]">
                    წყარო: {sourceLabelKa(r.source)}
                  </p>
                  <div className="flex gap-1">
                    {LABELS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLabel(r, r.manual_label === l.id ? null : l.id)}
                        title={l.label}
                        className={`w-7 h-7 grid place-items-center rounded-md border transition
                          ${r.manual_label === l.id ? "border-[#5C1A2E] bg-[#F0EBE3]" : "border-transparent hover:border-[#E0D8D0]"}`}
                      >
                        <span className="block w-2.5 h-2.5 rounded-full" style={{ background: l.dot }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// =================================================================
// Shared bits
// =================================================================
function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-4">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ka w-full pl-9 pr-3 py-3 rounded-xl bg-white border border-[#E0D8D0] text-sm text-[#5C1A2E] placeholder:text-[#6B6B6B] outline-none focus:border-[#5C1A2E] transition"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4A4A]"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ConfidenceDot({ c }: { c: number }) {
  const colors = ["#E0D8D0", "#E5D4A8", "#C9A84C", "#86EFAC", "#7AA88A", "#5A8A6A"];
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-2 h-2 rounded-full" style={{ background: colors[Math.min(5, c)] }} />
      <span className="text-[10px] text-[#4A4A4A] font-mono">{c}/5</span>
    </div>
  );
}
