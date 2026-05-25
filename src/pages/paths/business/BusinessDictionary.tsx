import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";

type Vocab = { en: string; ka: string; exampleEn?: string; exampleKa?: string };
type SessionRow = {
  id: string;
  kind: "email" | "interview" | "meeting";
  email_type: string;
  scenario_key: string;
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

export default function BusinessDictionary() {
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
          .select("id, email_type, scenario_key, completed_at, session_data")
          .eq("user_id", user.id)
          .eq("completed", true)
          .order("completed_at", { ascending: false }),
        supabase
          .from("business_interview_sessions")
          .select("id, role_title, scenario_key, completed_at, session_data")
          .eq("user_id", user.id)
          .eq("completed", true)
          .order("completed_at", { ascending: false }),
        supabase
          .from("business_meeting_sessions")
          .select("id, meeting_type, scenario_key, completed_at, session_data")
          .eq("user_id", user.id)
          .eq("completed", true)
          .order("completed_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const emailRows: SessionRow[] = (emails.data || []).map((r: any) => ({
        id: r.id,
        kind: "email",
        email_type: r.email_type,
        scenario_key: r.scenario_key,
        completed_at: r.completed_at,
        session_data: r.session_data,
      }));
      const interviewRows: SessionRow[] = (interviews.data || []).map((r: any) => ({
        id: r.id,
        kind: "interview",
        email_type: r.role_title,
        scenario_key: r.scenario_key,
        completed_at: r.completed_at,
        session_data: r.session_data,
      }));
      const meetingRows: SessionRow[] = (meetings.data || []).map((r: any) => ({
        id: r.id,
        kind: "meeting",
        email_type: r.meeting_type,
        scenario_key: r.scenario_key,
        completed_at: r.completed_at,
        session_data: r.session_data,
      }));
      const list = [...emailRows, ...interviewRows, ...meetingRows].sort((a, b) =>
        (b.completed_at || "").localeCompare(a.completed_at || ""),
      );
      setRows(list);
      if (list.length) setOpen({ [list[0].id]: true });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const totalWords = useMemo(
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

  // When searching, auto-expand matching sections
  useEffect(() => {
    if (!q) return;
    const next: Record<string, boolean> = {};
    filtered.forEach((r) => (next[r.id] = true));
    setOpen(next);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "ბიზნეს ინგლისური" }}>
      <header className="mb-4">
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          ბიზნეს ლექსიკონი
        </p>
        <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">პერსონალური ფრაზების ბანკი</h1>
        <p className="ka text-sm text-[#5B6473] mt-1">
          ყველაფერი, რაც დასრულებული სესიებიდან შეინახე — ერთ ადგილას.
        </p>
      </header>

      {/* Total counter */}
      <BizCard className="mb-3 bg-gradient-to-br from-[#1E2A44] to-[#15203A] text-[#F7F1E3] border-transparent">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ka text-[11px] uppercase tracking-wider text-[#F2D680] font-semibold">
              სულ შესწავლილი სიტყვები
            </p>
            <p className="ka text-[11px] text-[#F7F1E3]/70 mt-1">
              {rows.length} სესია დასრულებული
            </p>
          </div>
          <div className="text-4xl font-bold leading-none">{totalWords}</div>
        </div>
      </BizCard>

      {/* Search */}
      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ძებნა ფრაზებში ან ქართულ თარგმანში..."
          className="ka w-full pl-9 pr-3 py-3 rounded-xl bg-white border border-[#E7E2D5] text-sm text-[#1E2A44] placeholder:text-[#9CA3AF] outline-none focus:border-[#1E2A44] transition"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6473]"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
      </div>

      {/* Body */}
      {loading ? (
        <BizCard>
          <p className="ka text-sm text-[#5B6473]">იტვირთება...</p>
        </BizCard>
      ) : rows.length === 0 ? (
        <BizCard className="text-center py-10">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#FAF7F0] border border-[#E7E2D5] grid place-items-center text-2xl">
            📖
          </div>
          <h3 className="ka text-lg font-bold text-[#1E2A44] mt-3">ლექსიკონი ცარიელია</h3>
          <p className="ka text-sm text-[#5B6473] mt-2 max-w-sm mx-auto">
            დაასრულე შენი პირველი სესია და შენახული ფრაზები აქ გამოჩნდება ავტომატურად.
          </p>
          <div className="mt-5">
            <Link to="/path/business/module/emails">
              <BizButton>დაიწყე პირველი სესია →</BizButton>
            </Link>
          </div>
        </BizCard>
      ) : filtered.length === 0 ? (
        <BizCard className="text-center py-8">
          <p className="ka text-sm text-[#5B6473]">"{query}"-ის შესაბამისი ფრაზა ვერ მოიძებნა.</p>
        </BizCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const vocab: Vocab[] = (r as any)._matched || r.session_data?.vocabulary || [];
            const isOpen = !!open[r.id];
            const isInterview = r.kind === "interview";
            const title = isInterview
              ? (r.session_data?.briefing?.roleTitleKa || r.email_type)
              : (TYPE_LABELS[r.email_type] || r.session_data?.dailyFocusKa || r.email_type);
            const sectionLabel = isInterview ? "გასაუბრება" : "იმეილები";
            const icon = isInterview ? "🤝" : "📨";
            const date = formatKaDate(r.completed_at);
            return (
              <div
                key={r.id}
                className="bg-white border border-[#E7E2D5] rounded-2xl overflow-hidden transition"
              >
                <button
                  onClick={() => setOpen((p) => ({ ...p, [r.id]: !p[r.id] }))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAF7F0] transition"
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-[#1E2A44]/5 grid place-items-center text-base">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="ka text-sm font-semibold text-[#1E2A44] truncate">
                      {sectionLabel} — {title}
                    </p>
                    <p className="ka text-[11px] text-[#5B6473] mt-0.5">
                      {date} · {vocab.length} ფრაზა
                    </p>
                  </div>

                  <svg
                    className={`shrink-0 w-4 h-4 text-[#5B6473] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-2 border-t border-[#F0EBDD]">
                    {vocab.length === 0 ? (
                      <p className="ka text-xs text-[#5B6473] py-2">ფრაზები ვერ მოიძებნა.</p>
                    ) : (
                      vocab.map((v, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E7E2D5]"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-bold text-[#1E2A44]">{v.en}</p>
                          </div>
                          <p className="ka text-xs text-[#5B6473] mt-0.5">{v.ka}</p>
                          {v.exampleEn && (
                            <p className="text-xs text-[#374151] mt-2 italic">"{v.exampleEn}"</p>
                          )}
                          {v.exampleKa && (
                            <p className="ka text-[11px] text-[#5B6473]">{v.exampleKa}</p>
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
    </BusinessShell>
  );
}
