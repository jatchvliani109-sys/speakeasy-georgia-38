import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";
import BusinessShell, { BizCard, BizButton } from "./BusinessShell";
import {
  BusinessDocument,
  DOC_TYPE_ICONS,
  DOC_TYPE_LABELS,
  DocType,
  DocsProfile,
  Highlight,
  callDocs,
  deleteDocument,
  hasResume,
  highlightText,
  listDocuments,
  loadDocsProfile,
  saveDocument,
  updateDocument,
} from "./lib/docs";
import { pullBusinessFromSupabase, type BusinessState } from "./lib/state";

type View =
  | { kind: "home" }
  | { kind: "library" }
  | { kind: "tool"; tool: DocType }
  | { kind: "doc"; doc: BusinessDocument };

export default function DocumentHelper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DocsProfile | null>(null);
  const [state, setState] = useState<BusinessState | null>(null);
  const [resumeReady, setResumeReady] = useState(false);
  const [docs, setDocs] = useState<BusinessDocument[]>([]);
  const [view, setView] = useState<View>({ kind: "home" });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await pullBusinessFromSupabase(user.id);
      if (cancelled) return;
      setState(s);
      const [p, has, list] = await Promise.all([
        loadDocsProfile(user.id, s),
        hasResume(user.id),
        listDocuments(user.id),
      ]);
      if (cancelled) return;
      setProfile(p);
      setResumeReady(has);
      setDocs(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshDocs = async () => {
    if (!user) return;
    const list = await listDocuments(user.id);
    setDocs(list);
  };

  if (!user || !profile) {
    return (
      <BusinessShell>
        <div className="ka text-[#5B6473]">იტვირთება...</div>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell back={{ to: "/path/business/home", label: "უკან Business-ზე" }}>
      <header className="mb-5">
        <p className="ka text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
          ბიზნეს ინგლისური
        </p>
        <h1 className="ka text-2xl font-bold text-[#1E2A44] mt-1">დოკუმენტების ასისტენტი</h1>
        <p className="ka text-sm text-[#5B6473] mt-1">
          რეალური პროფესიული დოკუმენტები — შენი მონაცემებით, წამიერად.
        </p>
      </header>

      {view.kind === "home" && (
        <HomeView
          docs={docs}
          onTool={(t) => setView({ kind: "tool", tool: t })}
          onLibrary={() => setView({ kind: "library" })}
          onOpenDoc={(d) => setView({ kind: "doc", doc: d })}
        />
      )}

      {view.kind === "library" && (
        <LibraryView
          docs={docs}
          onBack={() => setView({ kind: "home" })}
          onOpen={(d) => setView({ kind: "doc", doc: d })}
          onDelete={async (id) => {
            await deleteDocument(id);
            await refreshDocs();
          }}
        />
      )}

      {view.kind === "tool" && (
        <ToolView
          tool={view.tool}
          profile={profile}
          resumeReady={resumeReady}
          onBack={() => setView({ kind: "home" })}
          onSaved={async (doc) => {
            await refreshDocs();
            setView({ kind: "doc", doc });
          }}
          onUploadResume={() => navigate("/path/business/resume")}
        />
      )}

      {view.kind === "doc" && (
        <DocView
          doc={view.doc}
          onBack={() => setView({ kind: "library" })}
          onUpdated={async (updated) => {
            await refreshDocs();
            setView({ kind: "doc", doc: updated });
          }}
        />
      )}
    </BusinessShell>
  );
}

/* ============================ HOME ============================ */

function HomeView({
  docs,
  onTool,
  onLibrary,
  onOpenDoc,
}: {
  docs: BusinessDocument[];
  onTool: (t: DocType) => void;
  onLibrary: () => void;
  onOpenDoc: (d: BusinessDocument) => void;
}) {
  const tools: { id: DocType; title: string; subtitle: string; icon: string }[] = [
    { id: "email", title: "პროფესიული იმეილი", subtitle: "აღწერე რა გინდა გადასცე — მიიღე გაპრიალებული იმეილი.", icon: "✉️" },
    { id: "email_fix", title: "გაასწორე ჩემი ელ-ფოსტა", subtitle: "ჩასვი შენი იმეილი — მიიღე გაუმჯობესებული ვერსია + ახსნა.", icon: "🛠" },
    { id: "cover_letter", title: "სამოტივაციო წერილი", subtitle: "შენი რეზიუმე + სამუშაო პოზიცია → მორგებული წერილი.", icon: "📝" },
    { id: "resume_improve", title: "რეზიუმეს გაუმჯობესება", subtitle: "კონკრეტული რჩევები — სუსტი ფრაზები, keywords, ტონი.", icon: "📄" },
    { id: "bio", title: "პროფესიული ბიო", subtitle: "მოკლე, საშუალო, სრული — LinkedIn-ისთვის და სხვა.", icon: "👤" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => onTool(t.id)}
            className="text-left bg-white border border-[#E7E2D5] rounded-2xl p-4 hover:border-[#1E2A44]/40 hover:shadow-md transition-all"
          >
            <div className="text-2xl mb-2">{t.icon}</div>
            <p className="ka font-semibold text-sm text-[#1E2A44]">{t.title}</p>
            <p className="ka text-[11px] text-[#5B6473] mt-1 leading-relaxed">{t.subtitle}</p>
          </button>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold">
            ჩემი დოკუმენტები
          </p>
          {docs.length > 3 && (
            <button onClick={onLibrary} className="ka text-[11px] text-[#1E2A44] underline underline-offset-2">
              ყველა ({docs.length}) →
            </button>
          )}
        </div>
        {docs.length === 0 ? (
          <BizCard className="bg-[#FAF7F0] border-dashed">
            <p className="ka text-xs text-[#5B6473]">
              ჯერ არ შეგიქმნია დოკუმენტი. აირჩიე ერთ-ერთი ხელსაწყო ზემოთ.
            </p>
          </BizCard>
        ) : (
          <div className="space-y-2">
            {docs.slice(0, 3).map((d) => (
              <DocRow key={d.id} doc={d} onClick={() => onOpenDoc(d)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function DocRow({ doc, onClick }: { doc: BusinessDocument; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-[#E7E2D5] rounded-xl p-3 hover:border-[#1E2A44]/40 transition-all flex items-center gap-3"
    >
      <div className="text-xl shrink-0">{DOC_TYPE_ICONS[doc.doc_type]}</div>
      <div className="flex-1 min-w-0">
        <p className="ka text-sm font-semibold text-[#1E2A44] truncate">{doc.title}</p>
        <p className="ka text-[11px] text-[#5B6473] mt-0.5">
          {DOC_TYPE_LABELS[doc.doc_type]} · {new Date(doc.created_at).toLocaleDateString("ka-GE")}
        </p>
      </div>
      <span className="text-[#5B6473]">→</span>
    </button>
  );
}

/* ============================ LIBRARY ============================ */

function LibraryView({
  docs,
  onBack,
  onOpen,
  onDelete,
}: {
  docs: BusinessDocument[];
  onBack: () => void;
  onOpen: (d: BusinessDocument) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<DocType | "all">("all");
  const filtered = filter === "all" ? docs : docs.filter((d) => d.doc_type === filter);
  const grouped = useMemo(() => {
    const map: Record<DocType, BusinessDocument[]> = {
      email: [],
      email_fix: [],
      cover_letter: [],
      resume_improve: [],
      bio: [],
    };
    filtered.forEach((d) => map[d.doc_type]?.push(d));
    return map;
  }, [filtered]);

  return (
    <>
      <button onClick={onBack} className="ka text-xs text-[#5B6473] hover:text-[#1E2A44] mb-3">
        ← უკან
      </button>
      <h2 className="ka text-xl font-bold text-[#1E2A44] mb-3">ჩემი დოკუმენტები</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "email", "email_fix", "cover_letter", "resume_improve", "bio"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`ka text-xs px-3 py-1.5 rounded-full border ${
              filter === f
                ? "bg-[#1E2A44] text-[#F7F1E3] border-[#1E2A44]"
                : "bg-white text-[#1E2A44] border-[#E7E2D5] hover:border-[#1E2A44]/40"
            }`}
          >
            {f === "all" ? "ყველა" : DOC_TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <BizCard className="bg-[#FAF7F0] border-dashed">
          <p className="ka text-xs text-[#5B6473]">დოკუმენტი არ მოიძებნა.</p>
        </BizCard>
      ) : filter === "all" ? (
        <div className="space-y-5">
          {(Object.keys(grouped) as DocType[]).map((t) =>
            grouped[t].length ? (
              <section key={t}>
                <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
                  {DOC_TYPE_LABELS[t]}
                </p>
                <div className="space-y-2">
                  {grouped[t].map((d) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <DocRow doc={d} onClick={() => onOpen(d)} />
                      <button
                        onClick={async () => {
                          if (confirm("წავშალო ეს დოკუმენტი?")) await onDelete(d.id);
                        }}
                        className="text-[#5B6473] hover:text-red-600 text-xs px-2"
                        aria-label="წაშლა"
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <DocRow doc={d} onClick={() => onOpen(d)} />
              <button
                onClick={async () => {
                  if (confirm("წავშალო ეს დოკუმენტი?")) await onDelete(d.id);
                }}
                className="text-[#5B6473] hover:text-red-600 text-xs px-2"
                aria-label="წაშლა"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================ TOOL FLOWS ============================ */

function ToolView({
  tool,
  profile,
  resumeReady,
  onBack,
  onSaved,
  onUploadResume,
}: {
  tool: DocType;
  profile: DocsProfile;
  resumeReady: boolean;
  onBack: () => void;
  onSaved: (doc: BusinessDocument) => void;
  onUploadResume: () => void;
}) {
  const Common = (
    <button onClick={onBack} className="ka text-xs text-[#5B6473] hover:text-[#1E2A44] mb-3">
      ← უკან
    </button>
  );

  if (tool === "email")
    return (
      <>
        {Common}
        <EmailFlow profile={profile} onSaved={onSaved} />
      </>
    );
  if (tool === "cover_letter")
    return (
      <>
        {Common}
        <CoverLetterFlow profile={profile} resumeReady={resumeReady} onSaved={onSaved} onUploadResume={onUploadResume} />
      </>
    );
  if (tool === "resume_improve")
    return (
      <>
        {Common}
        <ResumeImproveFlow profile={profile} resumeReady={resumeReady} onSaved={onSaved} onUploadResume={onUploadResume} />
      </>
    );
  return (
    <>
      {Common}
      <BioFlow profile={profile} onSaved={onSaved} />
    </>
  );
}

/* ---------- Email ---------- */
function EmailFlow({ profile, onSaved }: { profile: DocsProfile; onSaved: (d: BusinessDocument) => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState("");
  const [recipient, setRecipient] = useState("");
  const [relationship, setRelationship] = useState("colleague");
  const [outcome, setOutcome] = useState("");
  const [tone, setTone] = useState("balanced professional");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await callDocs({
        action: "email_write",
        profile,
        intent,
        recipient,
        relationship,
        outcome,
        tone,
      });
      const doc = await saveDocument(user.id, {
        doc_type: "email",
        title: r.title || "პროფესიული იმეილი",
        content: r.content || "",
        meta: { subject: r.subject || "" },
        inputs: { intent, recipient, relationship, outcome, tone },
        highlights: r.highlights || [],
      });
      onSaved(doc);
    } catch (e: any) {
      toast({ title: "შეცდომა", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="ka text-xl font-bold text-[#1E2A44] mb-1">პროფესიული იმეილი</h2>
      <p className="ka text-xs text-[#5B6473] mb-4">3 მოკლე კითხვა → დასრულებული იმეილი.</p>

      <ProgressDots total={4} current={step} />

      {step === 0 && (
        <BizCard className="mt-4">
          <Label>რის გადაცემა გინდა? (ქართულად ან მარტივი ინგლისურით)</Label>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={4}
            placeholder="მაგ. მინდა მენეჯერს ვუთხრა რომ პროექტი ერთი კვირით გადადება..."
            className="w-full mt-2 rounded-xl border border-[#E7E2D5] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#1E2A44]"
          />
          <div className="flex justify-end mt-3">
            <BizButton onClick={() => setStep(1)} disabled={!intent.trim()}>
              შემდეგი →
            </BizButton>
          </div>
        </BizCard>
      )}

      {step === 1 && (
        <BizCard className="mt-4">
          <Label>ვის უგზავნი?</Label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="მაგ. ჩემს მენეჯერს, კლიენტს, HR-ს..."
            className="w-full mt-2 rounded-xl border border-[#E7E2D5] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#1E2A44]"
          />
          <Label className="mt-4">ურთიერთობა</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { id: "colleague", label: "კოლეგა" },
              { id: "manager", label: "მენეჯერი" },
              { id: "client", label: "კლიენტი" },
              { id: "stranger", label: "უცნობი / პირველად" },
            ].map((o) => (
              <Chip key={o.id} active={relationship === o.id} onClick={() => setRelationship(o.id)}>
                {o.label}
              </Chip>
            ))}
          </div>
          <Footer onBack={() => setStep(0)} onNext={() => setStep(2)} disabled={!recipient.trim()} />
        </BizCard>
      )}

      {step === 2 && (
        <BizCard className="mt-4">
          <Label>როგორი შედეგი გინდა?</Label>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={3}
            placeholder="მაგ. დასტური ან თანხმობა გადადებაზე, შეხვედრის დანიშვნა..."
            className="w-full mt-2 rounded-xl border border-[#E7E2D5] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#1E2A44]"
          />
          <Label className="mt-4">ტონი</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { id: "balanced professional", label: "დაბალანსებული პროფესიული" },
              { id: "formal", label: "ფორმალური" },
              { id: "friendly", label: "მეგობრული" },
              { id: "direct", label: "პირდაპირი" },
            ].map((o) => (
              <Chip key={o.id} active={tone === o.id} onClick={() => setTone(o.id)}>
                {o.label}
              </Chip>
            ))}
          </div>
          <Footer onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!outcome.trim()} />
        </BizCard>
      )}

      {step === 3 && (
        <BizCard className="mt-4">
          <p className="ka text-sm text-[#1E2A44] font-semibold">მზად ხართ?</p>
          <p className="ka text-xs text-[#5B6473] mt-1">
            AI გენერირებს იმეილს თქვენი მონაცემებითა და კონტექსტით.
          </p>
          <div className="flex justify-between mt-4">
            <BizButton variant="ghost" onClick={() => setStep(2)}>
              ← უკან
            </BizButton>
            <BizButton onClick={generate} disabled={loading}>
              {loading ? "გენერირება..." : "შექმნა ✨"}
            </BizButton>
          </div>
        </BizCard>
      )}
    </div>
  );
}

/* ---------- Cover Letter ---------- */
function CoverLetterFlow({
  profile,
  resumeReady,
  onSaved,
  onUploadResume,
}: {
  profile: DocsProfile;
  resumeReady: boolean;
  onSaved: (d: BusinessDocument) => void;
  onUploadResume: () => void;
}) {
  const { user } = useAuth();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!resumeReady) {
    return (
      <BizCard className="bg-[#FFFBEA] border-[#F2E6B0]">
        <p className="ka text-sm font-semibold text-[#1E2A44]">ჯერ ატვირთე რეზიუმე</p>
        <p className="ka text-xs text-[#5B6473] mt-1">
          სამოტივაციო წერილს ვამზადებთ შენი გამოცდილების მიხედვით.
        </p>
        <div className="mt-3">
          <BizButton onClick={onUploadResume}>რეზიუმეს ატვირთვა →</BizButton>
        </div>
      </BizCard>
    );
  }

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await callDocs({
        action: "cover_letter",
        profile,
        jobTitle,
        jobDescription,
      });
      const doc = await saveDocument(user.id, {
        doc_type: "cover_letter",
        title: r.title || `სამოტივაციო — ${jobTitle}`,
        content: r.content || "",
        meta: { emphasized: r.emphasized || [] },
        inputs: { jobTitle, jobDescription },
        highlights: r.highlights || [],
      });
      onSaved(doc);
    } catch (e: any) {
      toast({ title: "შეცდომა", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="ka text-xl font-bold text-[#1E2A44] mb-1">სამოტივაციო წერილი</h2>
      <p className="ka text-xs text-[#5B6473] mb-4">შენი რეზიუმე უკვე გვაქვს. შეიყვანე პოზიცია.</p>
      <BizCard>
        <Label>სამუშაო პოზიცია *</Label>
        <input
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Product Manager"
          className="w-full mt-2 rounded-xl border border-[#E7E2D5] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#1E2A44]"
        />
        <Label className="mt-4">სამუშაოს აღწერა (არასავალდებულო)</Label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={6}
          placeholder="ჩასვი ვაკანსიის ტექსტი — წერილი უფრო კარგად მოერგება..."
          className="w-full mt-2 rounded-xl border border-[#E7E2D5] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#1E2A44]"
        />
        <div className="flex justify-end mt-4">
          <BizButton onClick={generate} disabled={loading || !jobTitle.trim()}>
            {loading ? "გენერირება..." : "შექმნა ✨"}
          </BizButton>
        </div>
      </BizCard>
    </div>
  );
}

/* ---------- Resume Improve ---------- */
function ResumeImproveFlow({
  profile,
  resumeReady,
  onSaved,
  onUploadResume,
}: {
  profile: DocsProfile;
  resumeReady: boolean;
  onSaved: (d: BusinessDocument) => void;
  onUploadResume: () => void;
}) {
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState(profile.rawResumeText || "");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await callDocs({
        action: "resume_improve",
        profile,
        resumeText,
        jobDescription,
      });
      const formatted = formatResumeImprove(r);
      const doc = await saveDocument(user.id, {
        doc_type: "resume_improve",
        title: r.title || "რეზიუმეს გაუმჯობესება",
        content: formatted,
        meta: {
          toneAssessmentKa: r.toneAssessmentKa,
          missingKeywords: r.missingKeywords,
          suggestions: r.suggestions,
          summary: r.content,
        },
        inputs: { jobDescription },
        highlights: [],
      });
      onSaved(doc);
    } catch (e: any) {
      toast({ title: "შეცდომა", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="ka text-xl font-bold text-[#1E2A44] mb-1">რეზიუმეს გაუმჯობესება</h2>
      <p className="ka text-xs text-[#5B6473] mb-4">კონკრეტული რჩევები და "before/after" მაგალითები.</p>
      <BizCard>
        {resumeReady ? (
          <p className="ka text-[11px] text-[#5B6473] mb-3">
            შენი ატვირთული რეზიუმე უკვე ჩატვირთულია. შეგიძლია შეცვალო ან დაამატო ტექსტი ქვემოთ.
          </p>
        ) : (
          <button
            onClick={onUploadResume}
            className="ka text-xs text-[#1E2A44] underline underline-offset-2 mb-3"
          >
            ან ატვირთე რეზიუმე →
          </button>
        )}
        <Label>რეზიუმეს ტექსტი</Label>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={8}
          placeholder="ჩასვი რეზიუმეს ტექსტი..."
          className="w-full mt-2 rounded-xl border border-[#E7E2D5] bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#1E2A44]"
        />
        <Label className="mt-4">სამიზნე პოზიცია (არასავალდებულო)</Label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={4}
          placeholder="ვაკანსიის აღწერა — keywords უფრო ზუსტი იქნება..."
          className="w-full mt-2 rounded-xl border border-[#E7E2D5] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#1E2A44]"
        />
        <div className="flex justify-end mt-4">
          <BizButton onClick={generate} disabled={loading || !resumeText.trim()}>
            {loading ? "ანალიზი..." : "ანალიზის დაწყება ✨"}
          </BizButton>
        </div>
      </BizCard>
    </div>
  );
}

function formatResumeImprove(r: any): string {
  const lines: string[] = [];
  if (r.content) lines.push(r.content, "");
  if (r.toneAssessmentKa) lines.push(`📊 ტონი: ${r.toneAssessmentKa}`, "");
  if (r.missingKeywords?.length) {
    lines.push("🔑 Keywords რომელიც აკლია:");
    lines.push(r.missingKeywords.map((k: string) => `  • ${k}`).join("\n"));
    lines.push("");
  }
  if (r.suggestions?.length) {
    lines.push("✏️ რეკომენდაციები:");
    r.suggestions.forEach((s: any, i: number) => {
      lines.push(`\n${i + 1}. ${s.sectionKa || ""}`);
      if (s.issueKa) lines.push(`   პრობლემა: ${s.issueKa}`);
      if (s.before) lines.push(`   ❌ Before: ${s.before}`);
      if (s.after) lines.push(`   ✅ After: ${s.after}`);
      if (s.whyKa) lines.push(`   რატომ: ${s.whyKa}`);
    });
  }
  return lines.join("\n");
}

/* ---------- Bio ---------- */
function BioFlow({ profile, onSaved }: { profile: DocsProfile; onSaved: (d: BusinessDocument) => void }) {
  const { user } = useAuth();
  const [purpose, setPurpose] = useState("LinkedIn");
  const [tone, setTone] = useState("confident, warm, professional");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await callDocs({ action: "bio_write", profile, purpose, tone });
      const formatted = `📌 SHORT\n${r.short || ""}\n\n📌 MEDIUM\n${r.medium || ""}\n\n📌 FULL\n${r.full || ""}`;
      const doc = await saveDocument(user.id, {
        doc_type: "bio",
        title: r.title || `პროფესიული ბიო — ${purpose}`,
        content: formatted,
        meta: { short: r.short, medium: r.medium, full: r.full, purpose, tone },
        inputs: { purpose, tone },
        highlights: r.highlights || [],
      });
      onSaved(doc);
    } catch (e: any) {
      toast({ title: "შეცდომა", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="ka text-xl font-bold text-[#1E2A44] mb-1">პროფესიული ბიო</h2>
      <p className="ka text-xs text-[#5B6473] mb-4">სამი ვერსია: short, medium, full.</p>
      <BizCard>
        <Label>სად გამოიყენებ?</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {["LinkedIn", "Portfolio", "Email signature", "University application"].map((p) => (
            <Chip key={p} active={purpose === p} onClick={() => setPurpose(p)}>
              {p}
            </Chip>
          ))}
        </div>
        <Label className="mt-4">ტონი</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { id: "confident, warm, professional", label: "თავდაჯერებული + თბილი" },
            { id: "formal academic", label: "ფორმალური აკადემიური" },
            { id: "modern startup", label: "თანამედროვე startup" },
            { id: "creative", label: "კრეატიული" },
          ].map((o) => (
            <Chip key={o.id} active={tone === o.id} onClick={() => setTone(o.id)}>
              {o.label}
            </Chip>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <BizButton onClick={generate} disabled={loading}>
            {loading ? "გენერირება..." : "შექმნა ✨"}
          </BizButton>
        </div>
      </BizCard>
    </div>
  );
}

/* ============================ DOC VIEW ============================ */

function DocView({
  doc,
  onBack,
  onUpdated,
}: {
  doc: BusinessDocument;
  onBack: () => void;
  onUpdated: (d: BusinessDocument) => void;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(doc.content);
  const [editTitle, setEditTitle] = useState(doc.title);

  const copy = () => {
    navigator.clipboard.writeText(doc.content);
    toast({ title: "კოპირებულია", description: "დოკუმენტი მზადაა Paste-ისთვის." });
  };

  const adjust = async (adjustment: string) => {
    setAdjusting(true);
    try {
      const r = await callDocs({
        action: "adjust",
        docType: doc.doc_type,
        content: doc.content,
        adjustment,
      });
      const newHighlights = (r.highlights?.length ? r.highlights : doc.highlights) as Highlight[];
      await updateDocument(doc.id, { content: r.content, highlights: newHighlights });
      onUpdated({ ...doc, content: r.content, highlights: newHighlights });
      toast({ title: "განახლდა" });
    } catch (e: any) {
      toast({ title: "შეცდომა", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setAdjusting(false);
    }
  };

  const saveEdit = async () => {
    await updateDocument(doc.id, { title: editTitle, content: editContent });
    onUpdated({ ...doc, title: editTitle, content: editContent });
    setEditing(false);
    toast({ title: "შენახულია" });
  };

  const isResumeImprove = doc.doc_type === "resume_improve";
  const subject = (doc.meta as any)?.subject;

  return (
    <>
      <button onClick={onBack} className="ka text-xs text-[#5B6473] hover:text-[#1E2A44] mb-3">
        ← ჩემი დოკუმენტები
      </button>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          {editing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xl font-bold text-[#1E2A44] bg-transparent border-b border-[#E7E2D5] focus:outline-none focus:border-[#1E2A44]"
            />
          ) : (
            <h2 className="ka text-xl font-bold text-[#1E2A44] truncate">{doc.title}</h2>
          )}
          <p className="ka text-[11px] text-[#5B6473] mt-1">
            {DOC_TYPE_LABELS[doc.doc_type]} · {new Date(doc.created_at).toLocaleString("ka-GE")}
          </p>
        </div>
        <button
          onClick={copy}
          className="ka shrink-0 text-xs font-semibold bg-[#1E2A44] text-[#F7F1E3] px-3 py-2 rounded-xl hover:bg-[#15203A]"
        >
          📋 კოპირება
        </button>
      </div>

      {subject && !editing && (
        <p className="ka text-xs text-[#5B6473] mb-2">
          <span className="font-semibold text-[#1E2A44]">Subject:</span> {subject}
        </p>
      )}

      {/* Document */}
      <article className="bg-white border border-[#E7E2D5] rounded-2xl p-6 shadow-[0_1px_2px_rgba(30,42,68,0.04),0_8px_24px_-12px_rgba(30,42,68,0.12)]">
        {editing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={20}
            className="w-full text-sm font-serif leading-relaxed text-[#1E2A44] bg-transparent focus:outline-none resize-none"
          />
        ) : (
          <div
            className={`text-sm leading-relaxed text-[#1E2A44] ${isResumeImprove ? "whitespace-pre-wrap font-mono text-xs" : "font-serif whitespace-pre-wrap"}`}
            dangerouslySetInnerHTML={{ __html: highlightText(doc.content, doc.highlights || []) }}
          />
        )}
      </article>

      {/* Bio versions quick pick */}
      {doc.doc_type === "bio" && !editing && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {(["short", "medium", "full"] as const).map((v) => {
            const text = (doc.meta as any)?.[v];
            if (!text) return null;
            return (
              <button
                key={v}
                onClick={() => {
                  navigator.clipboard.writeText(text);
                  toast({ title: `${v} ვერსია კოპირებულია` });
                }}
                className="ka text-xs px-3 py-1.5 rounded-full border border-[#E7E2D5] hover:border-[#1E2A44]/40 text-[#1E2A44]"
              >
                📋 {v}
              </button>
            );
          })}
        </div>
      )}

      {/* Highlights legend */}
      {doc.highlights?.length > 0 && !editing && (
        <BizCard className="mt-4 bg-[#FAF7F0]">
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2">
            ✨ მონიშნული ფრაზები
          </p>
          <ul className="space-y-2">
            {doc.highlights.map((h, i) => (
              <li key={i} className="text-xs">
                <span className="font-semibold text-[#1E2A44]">"{h.phrase}"</span>
                <span className="ka text-[#5B6473]"> — {h.whyKa}</span>
              </li>
            ))}
          </ul>
        </BizCard>
      )}

      {/* Adjustments */}
      {!editing && (
        <section className="mt-5">
          <p className="ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold mb-2 px-1">
            შესწორებები
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "make it shorter", label: "უფრო მოკლე" },
              { id: "make it more formal", label: "უფრო ფორმალური" },
              { id: "make it more friendly", label: "უფრო მეგობრული" },
              { id: "make it more direct", label: "უფრო პირდაპირი" },
              { id: "emphasize different skills and experience", label: "სხვა აქცენტი" },
            ].map((o) => (
              <button
                key={o.id}
                disabled={adjusting}
                onClick={() => adjust(o.id)}
                className="ka text-xs px-3 py-1.5 rounded-full border border-[#E7E2D5] bg-white hover:border-[#1E2A44]/40 text-[#1E2A44] disabled:opacity-50"
              >
                {o.label}
              </button>
            ))}
          </div>
          {adjusting && <p className="ka text-[11px] text-[#5B6473] mt-2">ვამუშავებ...</p>}
        </section>
      )}

      <div className="mt-5 flex gap-2">
        {editing ? (
          <>
            <BizButton onClick={saveEdit}>შენახვა</BizButton>
            <BizButton
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setEditContent(doc.content);
                setEditTitle(doc.title);
              }}
            >
              გაუქმება
            </BizButton>
          </>
        ) : (
          <BizButton variant="outline" onClick={() => setEditing(true)}>
            ✏️ რედაქტირება
          </BizButton>
        )}
      </div>
    </>
  );
}

/* ============================ UI bits ============================ */

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`ka text-[11px] uppercase tracking-wider text-[#5B6473] font-semibold ${className}`}>{children}</p>;
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`ka text-xs px-3 py-2 rounded-xl border text-left ${
        active
          ? "bg-[#1E2A44] text-[#F7F1E3] border-[#1E2A44]"
          : "bg-white text-[#1E2A44] border-[#E7E2D5] hover:border-[#1E2A44]/40"
      }`}
    >
      {children}
    </button>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full ${i <= current ? "bg-[#1E2A44]" : "bg-[#E7E2D5]"}`}
        />
      ))}
    </div>
  );
}

function Footer({ onBack, onNext, disabled }: { onBack: () => void; onNext: () => void; disabled?: boolean }) {
  return (
    <div className="flex justify-between mt-4">
      <BizButton variant="ghost" onClick={onBack}>
        ← უკან
      </BizButton>
      <BizButton onClick={onNext} disabled={disabled}>
        შემდეგი →
      </BizButton>
    </div>
  );
}
